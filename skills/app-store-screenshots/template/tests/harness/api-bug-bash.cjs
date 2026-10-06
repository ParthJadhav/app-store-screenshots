// Run only against a disposable template copy; this writes projects and assets.
// node scripts/api-bug-bash.cjs http://localhost:3098
const assert = require('node:assert/strict');
const sharp = require('sharp');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {randomBytes} = require('node:crypto');
const base = (process.argv[2] || 'http://localhost:3098').replace(/\/$/, '');
const projectURL = base + '/api/project';
const post = (route, data, headers = {}) => fetch(base + route, {
  method: 'POST', headers: {'content-type': 'application/json', ...headers}, body: JSON.stringify(data),
});
let passed = 0;
async function check(name, run) { await run(); console.log('PASS', name); passed++; }
(async () => {
  const initial = await fetch(projectURL);
  assert.equal(initial.status, 200);
  const {state: original} = await initial.json();
  assert.ok(original, 'Start with a disposable template project');
  try {
    await check('invalid project shapes are rejected without replacing the file', async () => {
      const slide = {id:'a', layout:'no-device', screenshot:'', label:{en:'Test'}, headline:{en:'Test'}};
      const rect = {x:0,y:0,width:10,height:10};
      const invalid = [null, [], {}, {...original,schemaVersion:999}, {...original,connectedCanvas:'false'},
        {...original,slidesByDevice:{typo:[]}}, {...original,locales:['en','en']},
        ...[{headline:{en:[]}}, {transforms:{caption:{...rect,width:-1}}}, {textElements:[null]},
          {imageElements:[{id:'x',src:'a',transform:rect},{id:'x',src:'b',transform:rect}]}]
          .map(patch => ({...original, slidesByDevice:{watchos:[{...slide,...patch}]}}))];
      for (const state of invalid) assert.equal((await post('/api/project',state)).status,400);
      assert.deepEqual((await (await fetch(projectURL)).json()).state, original);
    });
    await check('every write route requires exact JSON content type and same origin', async () => {
      for (const route of ['/api/project','/api/upload','/api/upload-font']) {
        for (const type of ['text/plain','application/json-invalid']) assert.equal((await post(route,{}, {'content-type':type})).status,415);
        for (const origin of ['null','https://evil.example','http://localhost:9999']) assert.equal((await post(route,{}, {origin})).status,403);
        assert.equal((await post(route,{}, {'sec-fetch-site':'cross-site'})).status,403);
      }
      for (const host of ['localhost','127.0.0.1']) {
        const url = new URL(projectURL); url.hostname = host;
        const response = await fetch(url, {method:'POST',headers:{'content-type':'application/json',origin:url.origin,'sec-fetch-site':'same-origin'},body:JSON.stringify(original)});
        assert.equal(response.status,200,host);
      }
    });
    await check('concurrent stale project writes conflict and preserve the winning state', async () => {
      const revision = (await fetch(projectURL)).headers.get('etag');
      assert.ok(revision);
      const candidates = ['tab A','tab B'].map(appName=>({...original,appName}));
      const responses = await Promise.all(candidates.map(data=>post('/api/project',data,{'if-match':revision})));
      assert.deepEqual(responses.map(r=>r.status).sort(),[200,412]);
      const winning = responses.findIndex(r=>r.status===200);
      const current = await fetch(projectURL);
      assert.deepEqual((await current.json()).state,candidates[winning]);
      assert.equal(current.headers.get('etag'),responses[winning].headers.get('etag'));
      assert.equal((await post('/api/project',original,{'if-match':revision})).status,412);
      assert.equal((await post('/api/project',original,{'if-match':current.headers.get('etag')})).status,200);
    });
    await check('truncated, forged, malformed base64 and wrong-type uploads are rejected', async () => {
      for (const data of [null, {}, {dataUrl:'data:image/png;base64,iVBORw0KGgo='}, {dataUrl:'data:image/jpeg;base64,/9j/'},
        {dataUrl:'data:image/png;base64,iVBORw0K!Ggo='}, {dataUrl:'data:text/html;base64,SGk='}]) {
        assert.equal((await post('/api/upload',data)).status,400);
      }
      for (const data of [null,{}, {data:'d09GMg=='},{data:'T1RUTw=='},{data:'AAEAAA=='},{data:'d09GRg=='}]) {
        assert.equal((await post('/api/upload-font',data)).status,400);
      }
    });
    await check('real PNG/JPEG uploads round-trip; identical concurrent uploads stay intact', async () => {
      for (const format of ['png','jpeg']) {
        // Always a new hash, so restarting next start cannot mask missing
        // runtime asset serving by indexing files from a previous test run.
        const bytes = await sharp({create:{width:24,height:30,channels:3,background:'#'+randomBytes(3).toString('hex')}})[format]().toBuffer();
        const responses = await Promise.all(Array.from({length:4},()=>post('/api/upload',{dataUrl:`data:image/${format};base64,${bytes.toString('base64')}`})));
        let path;
        for (const response of responses) {
          assert.equal(response.status,200); const result = await response.json();
          if (path) assert.equal(result.path,path); path = result.path;
          const saved = await fetch(base+path); assert.equal(saved.status,200);
          assert.deepEqual(Buffer.from(await saved.arrayBuffer()),bytes);
        }
        assert.equal((await post('/api/upload',{dataUrl:`data:image/${format==='png'?'jpeg':'png'};base64,${bytes.toString('base64')}`})).status,400);
      }
    });
    await check('oversized request bodies are rejected including chunked bodies', async () => {
      const chunk = new Uint8Array(1024*1024).fill(32);
      for (const [route, megabytes] of [['/api/upload',13], ['/api/upload-font',24], ['/api/project',65]]) {
        const response = await fetch(base+route,{method:'POST',headers:{'content-type':'application/json'},duplex:'half',
          body:new ReadableStream({start(controller){for(let i=0;i<megabytes;i++)controller.enqueue(chunk);controller.close();}})});
        assert.equal(response.status,413,route);
      }
    });
    await check('valid WOFF2 uploads persist and truncated copies are rejected', async () => {
      const html = await (await fetch(base)).text();
      const fontPath = html.match(/\/_next\/static\/media\/[^"\s<>]+\.woff2/)?.[0];
      assert.ok(fontPath,'Expected bundled Next font');
      const bytes = Buffer.from(await (await fetch(base+fontPath)).arrayBuffer());
      // WOFF2's header version is metadata, independent of the glyph stream.
      randomBytes(4).copy(bytes,24);
      const response = await post('/api/upload-font',{data:bytes.toString('base64')});
      assert.equal(response.status,200); const {font}=await response.json();
      assert.equal(font.format,'woff2');
      assert.deepEqual(Buffer.from(await (await fetch(base+font.src)).arrayBuffer()),bytes);
      assert.equal((await post('/api/upload-font',{data:bytes.subarray(0,64).toString('base64')})).status,400);
    });
    await check('runtime asset routes reject missing files and traversal paths', async () => {
      for (const prefix of ['/screenshots/uploaded/','/fonts/imported/']) {
        for (const name of ['not-a-hash.png','0000000000000000.woff2','..%2f..%2fapp-store-screenshots.json']) {
          assert.ok([400,404].includes((await fetch(base+prefix+name)).status));
        }
      }
    });
    await check('documented migration handles null overlays and duplicate element IDs', async () => {
      const sharedPath = path.join(__dirname,'../../../migrate-project.cjs');
      const fixturePath = path.join(__dirname,'migration-fixture.cjs');
      const shared = await fs.readFile(sharedPath,'utf8').catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
      const fixture = await fs.readFile(fixturePath,'utf8');
      if (shared !== null) assert.equal(fixture, shared, 'migration-fixture.cjs must match migrate-project.cjs');
      const source = shared ?? fixture;
      const temporary = await fs.mkdtemp(path.join(os.tmpdir(),'screenshot-migration-'));
      const transform = {x:10,y:20,width:0,height:40};
      try {
        const old = {...original, schemaVersion:1, connectedCanvas:undefined, slidesByDevice:{watchos:[{
          id:'legacy', layout:'hero', label:'Label', headline:'Old headline', screenshot:'/old.png',
          textElements:[null,{id:'same',text:'Hello',transform},{id:'same',text:{en:'Copy',de:42},transform,fontSize:-3}],
          imageElements:[null,{id:'same',src:'/a.png',transform},{id:'same',src:'/b.png',transform}],
        }]}};
        await fs.writeFile(path.join(temporary,'app-store-screenshots.json'),JSON.stringify(old));
        execFileSync(process.execPath,['-e',source],{cwd:temporary,env:{...process.env,BACKUP_DIR:temporary}});
        const migrated=JSON.parse(await fs.readFile(path.join(temporary,'app-store-screenshots.json'),'utf8'));
        assert.equal(migrated.connectedCanvas,false);assert.equal(migrated.schemaVersion,2);
        const slide=migrated.slidesByDevice.watchos[0];
        assert.deepEqual(slide.headline,{en:'Old headline'});assert.equal(slide.screenshot,'/old.png');
        assert.equal(slide.textElements.length,2);assert.equal(slide.imageElements.length,2);
        assert.equal(new Set(slide.textElements.map(e=>e.id)).size,2);
        assert.equal(new Set(slide.imageElements.map(e=>e.id)).size,2);
        assert.equal((await post('/api/project',migrated)).status,200);
      } finally { await fs.rm(temporary,{recursive:true,force:true}); }
    });
    console.log(`${passed} API regression groups passed.`);
  } finally {
    assert.equal((await post('/api/project',original)).status,200,'Could not restore disposable project');
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
