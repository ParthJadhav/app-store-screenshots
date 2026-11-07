// Run against a disposable copy: this exercises uploads and /api/project.
// PLAYWRIGHT_MODULE=/path/to/playwright node scripts/bug-bash.cjs http://localhost:3098
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseURL = (process.argv[2] || 'http://localhost:3098').replace(/\/$/, '');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const slide = (id, extra = {}) => ({ id, layout: 'no-device', label: {en: 'LABEL'}, headline: {en: id}, screenshot: '', ...extra });
const fixture = (extra = {}) => ({schemaVersion:2,appName:'Bug bash',themeId:'clean-light',connectedCanvas:true,locales:['en'],locale:'en',device:'watchos',orientation:'portrait',slidesByDevice:{watchos:[slide('first'),slide('second')],android:[slide('android')],iphone:[slide('iphone')]},...extra});
(async () => {
 const browser = await chromium.launch({channel:'chrome', headless:true});
 const errors = [];
 async function open(state=fixture(), save) {
   const page = await browser.newPage({viewport:{width:1600,height:1000}});
   let latest=structuredClone(state);
   page.on('pageerror', error=>errors.push(error.message));
   await page.route('**/api/project',async route=>{
     if(route.request().method()==='POST') {
       const data=route.request().postDataJSON();
       if(save) await save(data);
       latest=data;
     }
     await route.fulfill({json:{ok:true,state:latest}});
   });
   await page.goto(baseURL);
   await page.getByRole('button',{name:'Export bundle',exact:true}).waitFor();
   return {page, latest:()=>latest};
 }
 let passed=0;
 async function check(name, run) {
   if(process.env.BUG_BASH_FILTER && !name.includes(process.env.BUG_BASH_FILTER)) return;
   await run(); passed++; console.log('PASS',name);
 }
 try {
 await check('menu arrows do not navigate slides',async()=>{
   const {page}=await open();
   await page.getByRole('combobox',{name:'Theme',exact:true}).click();
   await page.keyboard.press('ArrowDown');
   assert.match(await page.locator('main').innerText(),/Screen 1/);
   await page.keyboard.press('Escape'); await page.close();
 });
 await check('duplicate selects copy; undo and redo preserve edits',async()=>{
   const {page}=await open();
   await page.getByRole('button',{name:'Duplicate screen 1',exact:true}).click();
   assert.match(await page.locator('main').innerText(),/Screen 2/);
   await page.getByRole('button',{name:'Undo',exact:true}).click();
   assert.equal(await page.getByRole('button',{name:/^Delete screen/}).count(),2);
   await page.getByRole('button',{name:'Redo',exact:true}).click();
   assert.equal(await page.getByRole('button',{name:/^Delete screen/}).count(),3);
   await page.close();
 });
 await check('rapid edits on different decks have separate undo steps',async()=>{
   const {page}=await open();
   await page.locator('textarea').first().fill('watch changed');
   await page.getByRole('tab',{name:'Android',exact:true}).click();
   await page.locator('textarea').first().fill('android changed');
   await page.getByRole('button',{name:'Undo',exact:true}).click();
   assert.equal(await page.locator('textarea').first().inputValue(),'android');
   await page.getByRole('button',{name:'Undo',exact:true}).click();
   assert.equal(await page.locator('textarea').first().inputValue(),'first');
   await page.close();
 });
 await check('editing does not reset a manually panned canvas',async()=>{
   const {page}=await open();
   const scroller=page.locator('main .overflow-auto');
   await scroller.evaluate(el=>el.scrollTo({left:300,behavior:'instant'}));
   const before=await scroller.evaluate(el=>el.scrollLeft);
   assert.ok(before>0);
   await page.locator('textarea').first().fill('edited while panned');
   await pause(400);
   assert.equal(await scroller.evaluate(el=>el.scrollLeft),before);
   await page.close();
 });
 await check('slow autosaves never overlap or overwrite newer state',async()=>{
   let active=0,maxActive=0; const completed=[];
   const {page,latest}=await open(fixture(),async data=>{
     maxActive=Math.max(maxActive,++active);
     await pause(data.appName==='older'?1800:50);
     completed.push(data.appName); active--;
   });
   await pause(800);
   await page.getByRole('textbox',{name:'App name',exact:true}).fill('older');
   await pause(800);
   await page.getByRole('textbox',{name:'App name',exact:true}).fill('newer');
   await pause(2600);
   assert.equal(maxActive,1); assert.equal(latest().appName,'newer');
   assert.equal(completed.at(-1),'newer'); await page.close();
 });
 await check('export locks immediately and through completion, PNG dimensions/locales are correct',async()=>{
   const {page}=await open(fixture({locales:['en','de']}));
   let downloadCount=0; page.on('download',()=>downloadCount++);
   const downloaded=page.waitForEvent('download');
   await page.getByRole('button',{name:'Export bundle',exact:true}).click();
   assert.equal(await page.locator('main').evaluate(el=>!!el.closest('[inert]')),true);
   assert.equal(await page.getByRole('textbox',{name:'App name',exact:true}).isDisabled(),true);
   const download=await downloaded; const file=await download.path();
   const JSZip=require('jszip');
   const zip=await JSZip.loadAsync(await fs.readFile(file));
   const pngs=Object.values(zip.files).filter(f=>f.name.endsWith('.png'));
   assert.equal(pngs.length,24);
   for(const png of pngs) {
     const bytes=await png.async('nodebuffer'); const [,w,h]=png.name.match(/\/(\d+)x(\d+)\//);
     assert.equal(bytes.readUInt32BE(16),Number(w)); assert.equal(bytes.readUInt32BE(20),Number(h));
     assert.equal(bytes[25],2,'stores need opaque 24-bit RGB PNGs, not RGBA');
   }
   await page.getByRole('button',{name:'Export bundle',exact:true}).waitFor();
   assert.equal(await page.locator('[inert]').count(),0); assert.equal(downloadCount,1); await page.close();
 });
 await check('missing referenced image blocks export and recovers controls',async()=>{
   const {page}=await open(fixture({slidesByDevice:{watchos:[slide('broken',{layout:'hero',screenshot:'/missing-bugbash.png'})]}}));
   let downloads=0;page.on('download',()=>downloads++);
   await page.getByRole('button',{name:'Export bundle',exact:true}).click();
   await page.getByText('Export failed',{exact:true}).waitFor();
   assert.match(await page.locator('body').innerText(),/Images could not be loaded/);
   assert.equal(downloads,0); assert.equal(await page.locator('[inert]').count(),0); await page.close();
 });
 await check('latest upload wins; clear cancels pending replacement',async()=>{
   const {page,latest}=await open(fixture({slidesByDevice:{watchos:[slide('upload',{layout:'hero'})]}}));
   const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=10;c.height=10;const x=c.getContext('2d');x.fillStyle='red';x.fillRect(0,0,10,10);return c.toDataURL().split(',')[1]});
   let count=0;
   await page.route('**/api/upload',async route=>{const n=++count;await pause(n===1?1200:100);await route.fulfill({json:{ok:true,path:`/upload-${n}.png`}})});
   const input=page.locator('input[type=file]').last();
   await input.setInputFiles({name:'first.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
   await pause(150);
   await input.setInputFiles({name:'second.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
   await pause(1800);assert.equal(latest().slidesByDevice.watchos[0].screenshot,'/upload-2.png');
   await input.setInputFiles({name:'third.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
   await page.getByRole('button',{name:'Clear screenshot',exact:true}).click();
   await pause(850);assert.equal(latest().slidesByDevice.watchos[0].screenshot,'');await page.close();
 });
 await check('feature graphic background, contrast, and selection match inspector',async()=>{
   const {page}=await open(fixture({device:'feature-graphic',slidesByDevice:{'feature-graphic':[slide('banner one',{layout:'feature-graphic'}),slide('banner two',{layout:'feature-graphic'})]}}));
   const inspector=page.locator('aside').last();
   await inspector.getByRole('combobox').nth(1).click();
   await page.getByRole('option',{name:'Custom color',exact:true}).click();
   await page.getByRole('textbox',{name:'Custom background hex color',exact:true}).fill('#FFFFFF');
   const caption=page.locator('main [contenteditable=plaintext-only]').first();
   // Inverted banners use light text; on a custom white background it must switch to readable text.
   const contrast=await caption.evaluate(el=>{const lum=c=>{const [r,g,b]=c.match(/\d+/g).slice(0,3).map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4;});return 0.2126*r+0.7152*g+0.0722*b;};const [a,b]=[lum(getComputedStyle(el).color),lum('rgb(255,255,255)')].sort((x,y)=>y-x);return (a+0.05)/(b+0.05);});
   assert.ok(contrast>=4.5,`caption contrast ${contrast.toFixed(2)} on white`);
   assert.equal(await caption.evaluate(el=>getComputedStyle(el.parentElement.parentElement.parentElement).backgroundColor),'rgb(255, 255, 255)');
   await page.locator('main [contenteditable=plaintext-only]').nth(1).focus();
   assert.match(await page.locator('main').innerText(),/Screen 2/);
   assert.equal(await page.locator('textarea').first().inputValue(),'banner two');
   await page.close();
 });
 await check('connected overlays split across PNG crops; isolated mode clips them',async()=>{
   const JSZip=require('jszip');
   for(const connectedCanvas of [true,false]) {
     const {page}=await open(fixture({connectedCanvas}));
     const src=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=10;c.height=10;const ctx=c.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(0,0,10,10);return c.toDataURL()});
     await page.close();
     const probe=await open(fixture({connectedCanvas,slidesByDevice:{watchos:[slide('left',{label:{},headline:{},imageElements:[{id:'cross',src,transform:{x:350,y:220,width:144,height:80,zIndex:10}}]}),slide('right',{label:{},headline:{}})]}}));
     const download=probe.page.waitForEvent('download');
     await probe.page.getByRole('button',{name:'Export bundle',exact:true}).click();
     const file=await (await download).path();const zip=await JSZip.loadAsync(await fs.readFile(file));
     const image=await zip.file('ios/watchos/422x514/en/02-no-device.png').async('base64');
     const pixel=await probe.page.evaluate(async data=>{const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();const c=document.createElement('canvas');c.width=422;c.height=514;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return Array.from(ctx.getImageData(25,250,1,1).data)},image);
     assert.equal(pixel[0]===255&&pixel[1]===0&&pixel[2]===0,connectedCanvas);
     await probe.page.close();
   }
 });
 await check('every device exports real images at its advertised sizes',async()=>{
   const JSZip=require('jszip');
   const devices=['iphone','ipad','duo-outer','duo-outer-landscape','duo-inner','duo-inner-landscape','tvos','watchos','carplay','mac','android','android-7','android-10','feature-graphic','creative-universal','creative-header','creative-search'];
   for(const device of devices) {
     const bootstrap=await open();
     const src=await bootstrap.page.evaluate(()=>{const c=document.createElement('canvas');c.width=200;c.height=400;const x=c.getContext('2d');x.fillStyle='#ff00ff';x.fillRect(0,0,200,400);return c.toDataURL()});
     await bootstrap.page.close();
     const {page}=await open(fixture({device,appIcon:src,slidesByDevice:{[device]:[slide('device',{layout:device==='feature-graphic'?'feature-graphic':'hero',screenshot:src})]}}));
     const downloaded=page.waitForEvent('download');
     await page.getByRole('button',{name:'Export bundle',exact:true}).click();
     const file=await (await downloaded).path();const zip=await JSZip.loadAsync(await fs.readFile(file));
     const pngs=Object.values(zip.files).filter(f=>f.name.endsWith('.png'));
     const expected={iphone:4,ipad:2,'duo-outer':1,'duo-outer-landscape':1,'duo-inner':1,'duo-inner-landscape':1,tvos:2,watchos:6,carplay:4,mac:4,android:1,'android-7':1,'android-10':1,'feature-graphic':1,'creative-universal':1,'creative-header':1,'creative-search':2};
     assert.equal(pngs.length,expected[device],device);
     for(const png of pngs) {
       const bytes=await png.async('nodebuffer');const [,w,h]=png.name.match(/\/(\d+)x(\d+)\//);
       assert.equal(bytes.readUInt32BE(16),Number(w));assert.equal(bytes.readUInt32BE(20),Number(h));
     }
     const pixels=await page.evaluate(async data=>{const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();const c=document.createElement('canvas');c.width=50;c.height=50;const x=c.getContext('2d');x.drawImage(image,0,0,50,50);const p=x.getImageData(0,0,50,50).data;let n=0;for(let i=0;i<p.length;i+=4)if(p[i]>230&&p[i+1]<30&&p[i+2]>230)n++;return n},await pngs[0].async('base64'));
     assert.ok(pixels>5,`${device}: screenshot missing from rendered PNG`);
     await page.close();
   }
 });
 await check('malformed generated project does not crash or autosave over disk',async()=>{
   let writes=0;
   const {page}=await open(fixture({locales:'en'}),async()=>{writes++});
   await page.getByText('save failed',{exact:false}).waitFor();
   await pause(800); assert.equal(writes,0); await page.close();
 });
 await check('project API rejects invalid data without overwriting valid state',async()=>{
   const context=await browser.newContext();const request=context.request;
   const original=await request.get(baseURL+'/api/project'); const payload=await original.json();
   assert.equal(original.status(),200);
   for(const body of [null,[],{},fixture({device:'bad'}),fixture({slidesByDevice:{watchos:[null]}})]) {
     const response=await request.post(baseURL+'/api/project',{data:JSON.stringify(body),headers:{'content-type':'application/json'}});
     assert.equal(response.status(),400);
   }
   const after=await request.get(baseURL+'/api/project');assert.deepEqual((await after.json()).state,payload.state);
   const saved=await request.post(baseURL+'/api/project',{data:payload.state});assert.equal(saved.status(),200);
   const roundTrip=await request.get(baseURL+'/api/project');assert.deepEqual((await roundTrip.json()).state,payload.state);
   await context.close();
 });
 await check('out-of-bounds elements export where the editor shows them',async()=>{
   const {page}=await open(fixture({connectedCanvas:false,slidesByDevice:{watchos:[slide('a',{textElements:[{id:'t1',text:{en:'WIDE'},transform:{x:300,y:10,width:300,height:80,zIndex:6}}]})]}}));
   const editorX=await page.locator('main .rnd-editable').last().evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m41);
   const exportX=await page.locator('[aria-hidden] [contenteditable=false]').filter({hasText:'WIDE'}).last().evaluate(el=>parseFloat(el.closest('div[style*="z-index"]').style.left));
   assert.equal(exportX,editorX); await page.close();
 });
 await check('clearing inline copy saves nothing and shows the fallback after blur',async()=>{
   const {page,latest}=await open(fixture({locales:['en','de'],locale:'de',slidesByDevice:{watchos:[slide('a',{headline:{en:'English',de:'Deutsch'}})]}}));
   const headline=page.locator('main [contenteditable=plaintext-only]').nth(1);
   await headline.click(); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('Backspace');
   await page.locator('textarea').first().click(); await pause(900);
   assert.equal(latest().slidesByDevice.watchos[0].headline.de,undefined);
   assert.equal(await headline.textContent(),'English'); await page.close();
 });
 await check('overlay text can be cleared and retyped in a non-default locale',async()=>{
   const {page,latest}=await open(fixture({locales:['en','de'],locale:'de',slidesByDevice:{watchos:[slide('a',{textElements:[{id:'t1',text:{en:'Hello'},transform:{x:10,y:10,width:300,height:80,zIndex:6}}]})]}}));
   await page.locator('main [contenteditable=plaintext-only]').nth(2).focus();
   const text=page.getByRole('textbox',{name:'Overlay text',exact:true});
   assert.equal(await text.inputValue(),''); assert.equal(await text.getAttribute('placeholder'),'Hello');
   await text.fill('Hallo'); await pause(900);
   assert.deepEqual(latest().slidesByDevice.watchos[0].textElements[0].text,{en:'Hello',de:'Hallo'}); await page.close();
 });
 await check('RTL copy gets its own base direction',async()=>{
   const {page}=await open(fixture({locales:['en','he'],locale:'he',slidesByDevice:{watchos:[slide('a',{headline:{en:'Hi',he:'שלום עולם!'}})]}}));
   const headline=page.locator('main [contenteditable=plaintext-only]').nth(1);
   assert.equal(await headline.evaluate(el=>getComputedStyle(el).direction),'rtl');
   assert.equal(await page.locator('main [contenteditable=plaintext-only]').first().evaluate(el=>getComputedStyle(el).direction),'ltr'); await page.close();
 });
 await check('generated feature-graphic decks normalise without an undo step',async()=>{
   const {page,latest}=await open(fixture({device:'feature-graphic',slidesByDevice:{'feature-graphic':[slide('one',{layout:'hero'}),slide('two',{layout:'hero'})]}}));
   await pause(1000);
   assert.equal(await page.getByRole('button',{name:'Undo',exact:true}).isEnabled(),false);
   assert.deepEqual(latest().slidesByDevice['feature-graphic'].map(s=>s.layout),['feature-graphic','feature-graphic']); await page.close();
 });
 await check('feature graphic app icon can be picked and exports',async()=>{
   const JSZip=require('jszip');
   const {page,latest}=await open(fixture({device:'feature-graphic',slidesByDevice:{'feature-graphic':[slide('banner',{layout:'feature-graphic'})]}}));
   const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=64;c.height=64;const x=c.getContext('2d');x.fillStyle='#00ff00';x.fillRect(0,0,64,64);return c.toDataURL().split(',')[1]});
   await page.route('**/api/upload',route=>route.fulfill({json:{ok:true,path:'/bugbash-icon.png'}}));
   await page.locator('aside').last().locator('input[type=file]').setInputFiles({name:'icon.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
   await pause(900); assert.equal(latest().appIcon,'/bugbash-icon.png');
   const downloaded=page.waitForEvent('download');
   await page.route('**/bugbash-icon.png',route=>route.fulfill({body:Buffer.from(png,'base64'),contentType:'image/png'}));
   await page.getByRole('button',{name:'Export bundle',exact:true}).click();
   const zip=await JSZip.loadAsync(await fs.readFile(await (await downloaded).path()));
   const image=await Object.values(zip.files).find(f=>f.name.endsWith('.png')).async('base64');
   const green=await page.evaluate(async data=>{const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);const p=x.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<p.length;i+=4)if(p[i]<30&&p[i+1]>225&&p[i+2]<30)n++;return n},image);
   assert.ok(green>1000,'icon missing from feature graphic export'); await page.close();
 });
 await check('reset all devices keeps project settings and locales',async()=>{
   const {page,latest}=await open(fixture({appName:'Keep me',themeId:'dark-bold',locales:['en','de'],locale:'de',connectedCanvas:false}));
   await page.getByRole('button',{name:/reset/i}).first().click();
   await page.getByRole('button',{name:'Reset all devices',exact:true}).click(); await pause(900);
   const state=latest();
   assert.equal(state.appName,'Keep me'); assert.equal(state.themeId,'dark-bold'); assert.deepEqual(state.locales,['en','de']);
   assert.equal(state.locale,'de'); assert.equal(state.connectedCanvas,false); assert.equal(state.device,'watchos');
   assert.notEqual(state.slidesByDevice.watchos[0].id,'first'); await page.close();
 });
 await check('pasted rich text stays plain on the canvas',async()=>{
   const context=await browser.newContext({viewport:{width:1600,height:1000}});
   await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:new URL(baseURL).origin});
   const page=await context.newPage(); let latest=fixture();
   page.on('pageerror',error=>errors.push(error.message));
   await page.route('**/api/project',async route=>{if(route.request().method()==='POST')latest=route.request().postDataJSON();await route.fulfill({json:{ok:true,state:latest}})});
   await page.goto(baseURL); await page.getByRole('button',{name:'Export bundle',exact:true}).waitFor();
   await page.evaluate(async()=>navigator.clipboard.write([new ClipboardItem({'text/html':new Blob(['<span style="color:red;font-size:80px">Pasted</span>'],{type:'text/html'}),'text/plain':new Blob(['Pasted'],{type:'text/plain'})})]));
   const headline=page.locator('main [contenteditable=plaintext-only]').nth(1);
   await headline.click(); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('ControlOrMeta+V'); await pause(900);
   assert.equal(await headline.evaluate(el=>el.children.length),0); assert.equal(await headline.textContent(),'Pasted');
   assert.equal(latest.slidesByDevice.watchos[0].headline.en,'Pasted'); await context.close();
 });
 await check('export finishes inline when PNG workers fail to load',async()=>{
   const JSZip=require('jszip');
   const context=await browser.newContext({viewport:{width:1600,height:1000}});
   // A worker whose script never loads: it reports an error and never replies.
   await context.addInitScript(()=>{window.Worker=class extends EventTarget{constructor(){super();setTimeout(()=>this.onerror?.(new ErrorEvent('error',{message:'blocked'})),200)}postMessage(){}terminate(){}}});
   const page=await context.newPage(); let latest=fixture();
   page.on('pageerror',error=>errors.push(error.message));
   await page.route('**/api/project',async route=>{if(route.request().method()==='POST')latest=route.request().postDataJSON();await route.fulfill({json:{ok:true,state:latest}})});
   await page.goto(baseURL); await page.getByRole('button',{name:'Export bundle',exact:true}).waitFor();
   const downloaded=page.waitForEvent('download',{timeout:60000});
   await page.getByRole('button',{name:'Export bundle',exact:true}).click();
   const zip=await JSZip.loadAsync(await fs.readFile(await (await downloaded).path()));
   const pngs=Object.values(zip.files).filter(f=>f.name.endsWith('.png'));
   assert.equal(pngs.length,12);
   for(const png of pngs) assert.equal((await png.async('nodebuffer'))[25],2);
   await context.close();
 });
 await check('rejected image uploads keep the previous screenshot instead of bypassing validation',async()=>{
   const {page,latest}=await open(fixture({slidesByDevice:{watchos:[slide('upload',{layout:'hero',screenshot:'/previous.png'})]}}));
   const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=10;return c.toDataURL().split(',')[1]});
   await page.route('**/api/upload',route=>route.fulfill({status:400,json:{ok:false,error:'Rejected image'}}));
   await page.locator('input[type=file]').last().setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
   await page.getByText('Rejected image',{exact:true}).waitFor();
   await pause(800); assert.equal(latest().slidesByDevice.watchos[0].screenshot,'/previous.png');
   await page.close();
 });
 await check('corrupt images and fonts are rejected before upload',async()=>{
   const {page,latest}=await open(fixture({slidesByDevice:{watchos:[slide('upload',{layout:'hero'})]}}));
   let uploads=0;
   await page.route('**/api/upload*',route=>{uploads++;return route.fulfill({status:400,json:{ok:false}})});
   await page.locator('input[type=file]').last().setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgo=','base64')});
   await page.getByText('Image is corrupt or exceeds 64 megapixels',{exact:true}).waitFor();
   await page.locator('input[type=file]').first().setInputFiles({name:'broken.woff2',mimeType:'font/woff2',buffer:Buffer.from('wOF2')});
   await page.getByText('Font import failed',{exact:true}).waitFor();
   assert.equal(uploads,0);assert.equal(latest().slidesByDevice.watchos[0].screenshot,'');
   assert.equal(await page.getByRole('button',{name:'Export bundle',exact:true}).isEnabled(),true);await page.close();
 });
 await check('HTTP 200 with corrupt image bytes blocks export',async()=>{
   const {page}=await open(fixture({slidesByDevice:{watchos:[slide('corrupt',{layout:'hero',screenshot:'/corrupt.png'})]}}));
   await page.route('**/corrupt.png',route=>route.fulfill({contentType:'image/png',body:'not an image'}));
   let downloads=0;page.on('download',()=>downloads++);
   await page.getByRole('button',{name:'Export bundle',exact:true}).click();
   await page.getByText('Export failed',{exact:true}).waitFor();
   assert.equal(downloads,0);assert.equal(await page.locator('[inert]').count(),0);await page.close();
 });
 await check('failed saves can be retried without another edit; dirty edits warn before leaving',async()=>{
   const {page}=await open();
   await pause(800);
   let failing=true,writes=0,latest;
   await page.route('**/api/project',async route=>{
     writes++;latest=route.request().postDataJSON();
     await route.fulfill({status:failing?500:200,json:{ok:!failing,error:failing?'Disk temporarily unavailable':undefined}});
   });
   await page.getByRole('textbox',{name:'App name',exact:true}).fill('Unsaved work');
   const dirty=()=>page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented});
   assert.equal(await dirty(),true);
   await page.getByRole('button',{name:'Retry save',exact:true}).waitFor();
   assert.equal(await dirty(),true); failing=false;
   await page.getByRole('button',{name:'Retry save',exact:true}).click();
   await pause(900);assert.equal(writes,2);assert.equal(latest.appName,'Unsaved work');assert.equal(await dirty(),false);
   await page.close();
 });
 await check('older in-flight save advances the revision for newer queued edits',async()=>{
   const {page}=await open();await pause(800);
   const headers=[];let count=0;
   await page.route('**/api/project',async route=>{
     const n=++count;headers.push(route.request().headers()['if-match']);
     if(n===1)await pause(1600);
     await route.fulfill({headers:{etag:`"revision-${n}"`},json:{ok:true}});
   });
   await page.getByRole('textbox',{name:'App name',exact:true}).fill('older');await pause(800);
   await page.getByRole('textbox',{name:'App name',exact:true}).fill('newer');await pause(2200);
   assert.deepEqual(headers,[undefined,'"revision-1"']);await page.close();
 });
 await check('two real editor tabs cannot silently overwrite each other',async()=>{
   const original=await (await fetch(baseURL+'/api/project')).json();
   const save=state=>fetch(baseURL+'/api/project',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(state)});
   const pages=[];
   try {
     assert.equal((await save(fixture())).status,200);
     for(let i=0;i<2;i++){
       const page=await browser.newPage({viewport:{width:1600,height:1000}});pages.push(page);
       page.on('pageerror',error=>errors.push(error.message));
       await page.goto(baseURL);await page.getByRole('button',{name:'Export bundle',exact:true}).waitFor();await pause(800);
     }
     await pages[0].getByRole('textbox',{name:'App name',exact:true}).fill('Winner');await pause(900);
     await pages[1].getByRole('textbox',{name:'App name',exact:true}).fill('Keep my edits');
     await pages[1].getByText(/Project changed in another tab or on disk/).waitFor();
     assert.equal((await (await fetch(baseURL+'/api/project')).json()).state.appName,'Winner');
     assert.equal(await pages[1].getByRole('textbox',{name:'App name',exact:true}).inputValue(),'Keep my edits');
   } finally {for(const page of pages)await page.close();assert.equal((await save(original.state)).status,200);}
 });
 await check('silent and throwing PNG workers fall back instead of hanging export',async()=>{
   for(const mode of ['silent','throw']) {
     const context=await browser.newContext({viewport:{width:1600,height:1000}});
     await context.addInitScript(mode=>{window.Worker=class extends EventTarget{postMessage(){if(mode==='throw')throw new Error('cannot post')}terminate(){}}},mode);
     const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
     await page.route('**/api/project',route=>route.fulfill({json:{ok:true,state:fixture({slidesByDevice:{watchos:[slide('one')]}})}}));
     await page.goto(baseURL);await page.getByRole('button',{name:'Export bundle',exact:true}).waitFor();
     const downloaded=page.waitForEvent('download',{timeout:45000});
     await page.getByRole('button',{name:'Export bundle',exact:true}).click();await downloaded;
     await page.getByRole('button',{name:'Export bundle',exact:true}).waitFor();assert.equal(await page.locator('[inert]').count(),0);
     await context.close();
   }
 });
 await check('a stalled asset cannot keep the editor loading forever',async()=>{
   const page=await browser.newPage({viewport:{width:1600,height:1000}});
   const state=fixture({slidesByDevice:{watchos:[slide('one',{layout:'hero',screenshot:'/stalled.png'})]}});
   page.on('pageerror',error=>errors.push(error.message));
   await page.route('**/api/project',route=>route.fulfill({json:{ok:true,state}}));
   await page.route('**/stalled.png',()=>{});
   await page.goto(baseURL,{waitUntil:'domcontentloaded'});
   await page.getByRole('button',{name:'Export bundle',exact:true}).waitFor({timeout:20000});
   await page.getByText('Image not found at /stalled.png',{exact:true}).waitFor();await page.close();
 });
 await check('a stalled font load releases export controls with an actionable error',async()=>{
   const page=await browser.newPage({viewport:{width:1600,height:1000}});
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(()=>{
     document.fonts.load=()=>new Promise(()=>{});
     const original=window.setTimeout;
     window.setTimeout=(fn,delay,...args)=>original(fn,delay===15000?250:delay,...args);
   });
   const state=fixture({fontId:'self-hosted',importedFont:{src:'/fonts/imported/0123456789abcdef.woff2',format:'woff2'}});
   await page.route('**/api/project',route=>route.fulfill({json:{ok:true,state}}));
   await page.route('**/fonts/imported/**',route=>route.abort());
   await page.goto(baseURL);
   await page.getByRole('button',{name:'Export bundle',exact:true}).click();
   await page.getByText(/The screenshot font could not be loaded/).waitFor({timeout:5000});
   assert.equal(await page.locator('[inert]').count(),0);await page.close();
 });
 await check('narrow screens retain a usable canvas and scrollable inspector',async()=>{
   const {page}=await open();await page.setViewportSize({width:390,height:844});
   const main=await page.locator('main').boundingBox();assert.ok(main.height>=360);
   assert.equal(await page.locator('main').evaluate(el=>el.parentElement.scrollHeight>el.parentElement.clientHeight),true);
   await page.locator('textarea').first().fill('Mobile edit');assert.equal(await page.locator('textarea').first().inputValue(),'Mobile edit');await page.close();
 });
 await check('encoding failures are handled while a previous screen is still encoding',async()=>{
   const context=await browser.newContext({viewport:{width:1600,height:1000}});
   await context.addInitScript(()=>{
     window.CompressionStream=class{constructor(){throw new Error('encoder unavailable')}};
     window.Worker=class extends EventTarget{postMessage({id}){setTimeout(()=>this.onmessage?.({data:{id,error:'worker failed'}}),id<6?2000:0)}terminate(){}};
   });
   const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
   await page.route('**/api/project',route=>route.fulfill({json:{ok:true,state:fixture()}}));
   await page.goto(baseURL);await page.getByRole('button',{name:'Export bundle',exact:true}).waitFor();
   let downloads=0;page.on('download',()=>downloads++);
   await page.getByRole('button',{name:'Export bundle',exact:true}).click();
   await page.getByText('All 12 renders failed',{exact:true}).waitFor();
   assert.equal(downloads,0);assert.equal(await page.locator('[inert]').count(),0);await context.close();
 });
 await check('newest font import wins when responses arrive out of order',async()=>{
   const {page,latest}=await open();
   const fontURL=await page.locator('link[as=font]').first().getAttribute('href');
   const fontBytes=await (await page.request.get(baseURL+fontURL)).body();
   let count=0;
   await page.route('**/api/upload-font',async route=>{const n=++count;await pause(n===1?1200:100);await route.fulfill({json:{ok:true,font:{src:`/fonts/imported/${n}.woff2`,format:'woff2'}}})});
   await page.locator('input[type=file]').first().setInputFiles({name:'Older.woff2',mimeType:'font/woff2',buffer:fontBytes});await pause(200);
   await page.locator('input[type=file]').first().setInputFiles({name:'Newer.woff2',mimeType:'font/woff2',buffer:fontBytes});await pause(2000);
   assert.equal(count,2);assert.equal(latest().importedFont.name,'Newer');assert.equal(latest().importedFont.src,'/fonts/imported/2.woff2');await page.close();
 });
 await check('real image and font uploads survive reload and export',async()=>{
   const original=await (await fetch(baseURL+'/api/project')).json();
   const save=state=>fetch(baseURL+'/api/project',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(state)});
   const page=await browser.newPage({viewport:{width:1600,height:1000}});
   page.on('pageerror',error=>errors.push(error.message));
   try {
     await save(fixture({slidesByDevice:{watchos:[slide('real upload',{layout:'hero'})]}}));
     await page.goto(baseURL);await page.getByRole('button',{name:'Export bundle',exact:true}).waitFor();
     const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=80;c.height=120;const x=c.getContext('2d');x.fillStyle='#ee00aa';x.fillRect(0,0,80,120);return c.toDataURL().split(',')[1]});
     const uploaded=page.waitForResponse(r=>r.url().endsWith('/api/upload')&&r.request().method()==='POST');
     await page.locator('input[type=file]').last().setInputFiles({name:'real.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
     assert.equal((await uploaded).status(),200);
     const fontURL=await page.locator('link[as=font]').first().getAttribute('href');
     const fontBytes=await (await page.request.get(baseURL+fontURL)).body();
     await page.locator('input[type=file]').first().setInputFiles({name:'Runtimefont.woff2',mimeType:'font/woff2',buffer:fontBytes});
     await page.getByText('Imported Runtimefont',{exact:true}).waitFor();await pause(1000);
     const disk=(await (await fetch(baseURL+'/api/project')).json()).state;
     assert.ok(disk.slidesByDevice.watchos[0].screenshot.startsWith('/screenshots/uploaded/'));
     assert.equal(disk.importedFont.name,'Runtimefont');
     await page.reload();await page.getByRole('button',{name:'Export bundle',exact:true}).waitFor();
     assert.match(await page.getByRole('combobox',{name:'Screenshot font',exact:true}).innerText(),/Runtimefont/);
     const downloaded=page.waitForEvent('download');
     await page.getByRole('button',{name:'Export bundle',exact:true}).click();
     const JSZip=require('jszip');
     const zip=await JSZip.loadAsync(await fs.readFile(await (await downloaded).path()));
     assert.equal(Object.values(zip.files).filter(f=>f.name.endsWith('.png')).length,6);
   } finally {await page.close();await save(original.state);}
 });
 assert.deepEqual(errors,[]);
 assert.ok(passed>0,'No matching checks');
 console.log(`${passed} browser regression checks passed in Google Chrome.`);
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
