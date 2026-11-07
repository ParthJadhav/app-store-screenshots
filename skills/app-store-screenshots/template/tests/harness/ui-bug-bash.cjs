// Interaction-focused Chrome bug bash. Uses disposable, mocked project state.
// PLAYWRIGHT_MODULE=/path/to/playwright node scripts/ui-bug-bash.cjs http://localhost:3098
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseURL = (process.argv[2] || 'http://localhost:3098').replace(/\/$/, '');
const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));
const slide = (id, extra={})=>({id,layout:'no-device',label:{en:'LABEL'},headline:{en:id},screenshot:'',...extra});
const rect = {x:100,y:200,width:160,height:90,zIndex:6};
const fixture=(extra={})=>({schemaVersion:2,appName:'UI bug bash',themeId:'clean-light',connectedCanvas:true,device:'watchos',orientation:'portrait',locale:'en',locales:['en','de'],slidesByDevice:{watchos:[slide('First'),slide('Second'),slide('Third')],android:[slide('Android')],iphone:[slide('iPhone')]},...extra});
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const errors=[];let passed=0,failures=0;
  async function open(state=fixture(),viewport={width:1600,height:1000},options={}) {
    const page=await browser.newPage({viewport,...options});let latest=structuredClone(state);
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/api/project',async route=>{if(route.request().method()==='POST')latest=route.request().postDataJSON();await route.fulfill({json:{ok:true,state:latest}})});
    await page.goto(baseURL);await page.getByRole('button',{name:'Export bundle',exact:true}).waitFor();
    return {page,latest:()=>latest};
  }
  async function check(name,run) {
    if(process.env.BUG_BASH_FILTER&&!name.includes(process.env.BUG_BASH_FILTER))return;
    try{await run();passed++;console.log('PASS',name)}catch(error){failures++;console.error('FAIL',name,error.message)}
  }
  try {
    await check('Escape cancels a draft text size without changing the canvas',async()=>{
      const {page,latest}=await open(fixture({slidesByDevice:{watchos:[slide('Text',{textElements:[{id:'t',text:{en:'Overlay'},fontSize:26,transform:rect}]})]}}));
      await page.locator('main [contenteditable=plaintext-only]').last().focus();
      const input=page.getByRole('spinbutton',{name:'Text size in pixels',exact:true});
      await input.fill('100');await input.press('Escape');await pause(800);
      assert.equal(latest().slidesByDevice.watchos[0].textElements[0].fontSize,26);
      await page.close();
    });
    await check('exploring layouts keeps the chosen secondary screenshot',async()=>{
      const {page,latest}=await open(fixture({slidesByDevice:{watchos:[slide('Pair',{layout:'two-devices',screenshot:'/front.png',screenshotSecondary:'/back.png'})]}}));
      const layout=page.locator('aside').last().getByRole('combobox').first();
      await layout.click();await page.getByRole('option',{name:'Hero',exact:true}).click();
      await layout.click();await page.getByRole('option',{name:'Two devices',exact:true}).click();await pause(800);
      assert.equal(latest().slidesByDevice.watchos[0].screenshotSecondary,'/back.png');await page.close();
    });
    await check('keyboard reordering preserves selection, content, and undo',async()=>{
      const {page,latest}=await open();
      await page.getByRole('button',{name:/^Screen 2/}).click();
      const handle=page.getByRole('button',{name:/^Reorder screen 2/});
      await handle.focus();await page.keyboard.press('Space');await pause(100);
      await page.keyboard.press('ArrowUp');await page.getByRole('status').filter({hasText:'over droppable area First'}).waitFor();
      await page.keyboard.press('Space');await pause(900);
      assert.deepEqual(latest().slidesByDevice.watchos.map(s=>s.id),['Second','First','Third']);
      assert.equal(await page.locator('textarea').first().inputValue(),'Second');
      await page.getByRole('button',{name:'Undo',exact:true}).click();await pause(800);
      assert.deepEqual(latest().slidesByDevice.watchos.map(s=>s.id),['First','Second','Third']);await page.close();
    });
    await check('deleting the final slide exposes a usable empty state and can be undone',async()=>{
      const {page,latest}=await open(fixture({slidesByDevice:{watchos:[slide('Only')]}}));
      await page.getByRole('button',{name:'Delete screen 1',exact:true}).click();
      await page.getByText('No screens yet',{exact:true}).waitFor();
      await page.getByRole('button',{name:'Export bundle',exact:true}).click();await page.getByText('No screens to export',{exact:true}).waitFor();
      assert.equal(await page.locator('[inert]').count(),0);
      await page.getByRole('button',{name:'Undo',exact:true}).first().click();
      assert.equal(await page.locator('textarea').first().inputValue(),'Only');
      await page.getByRole('button',{name:'Delete screen 1',exact:true}).click();await pause(600);
      await page.getByRole('button',{name:'Add screen',exact:true}).click();await pause(800);
      assert.equal(latest().slidesByDevice.watchos.length,1);assert.notEqual(latest().slidesByDevice.watchos[0].id,'Only');await page.close();
    });
    await check('custom background drafts, typography reset, and locale edits stay independent',async()=>{
      const {page,latest}=await open();const inspector=page.locator('aside').last();
      await inspector.getByRole('combobox').nth(1).click();await page.getByRole('option',{name:'Custom color',exact:true}).click();
      const hex=page.getByRole('textbox',{name:'Custom background hex color',exact:true});
      await hex.fill('#123456');await page.locator('textarea').first().click();
      await hex.fill('#12');await page.locator('textarea').first().click();assert.equal(await hex.inputValue(),'#123456');
      const slider=page.getByRole('slider',{name:'Headline size',exact:true});await slider.fill('150');
      await page.getByRole('button',{name:'Reset headline to 100%',exact:true}).click();assert.equal(await slider.inputValue(),'100');
      await page.getByRole('combobox',{name:'Locale',exact:true}).click();await page.getByRole('option',{name:'DE',exact:true}).click();
      await page.locator('textarea').first().fill('Deutsch');await pause(800);
      assert.deepEqual(latest().slidesByDevice.watchos[0].headline,{en:'First',de:'Deutsch'});
      assert.equal(latest().slidesByDevice.watchos[0].backgroundColor,'#123456');
      assert.equal(latest().slidesByDevice.watchos[0].typography,undefined);await page.close();
    });
    await check('canvas drag, resize, rotation, layer controls, delete, and undo persist',async()=>{
      const {page,latest}=await open(fixture({slidesByDevice:{watchos:[slide('Canvas')]}}));
      await page.getByRole('button',{name:'Image',exact:true}).click();await pause(700);
      const selected=page.locator('main .rnd-selected');const before={...latest().slidesByDevice.watchos[0].imageElements[0].transform};
      const box=await selected.boundingBox();const scale=box.width/before.width;
      await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+40,box.y+box.height/2+30,{steps:8});await page.mouse.up();await pause(750);
      const moved=latest().slidesByDevice.watchos[0].imageElements[0].transform;
      assert.ok(Math.abs(moved.x-before.x-40/scale)<2);assert.ok(Math.abs(moved.y-before.y-30/scale)<2);
      const handle=await selected.locator('div[style*="cursor: se-resize"]').boundingBox();
      await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+handle.width/2+35,handle.y+handle.height/2+20,{steps:8});await page.mouse.up();await pause(750);
      const resized=latest().slidesByDevice.watchos[0].imageElements[0].transform;
      assert.ok(resized.width>moved.width+10);assert.ok(resized.height>moved.height+5);
      await page.getByRole('slider',{name:'Image rotation',exact:true}).fill('45');
      await page.getByRole('button',{name:'Send to back',exact:true}).click();await pause(750);
      const changed=latest().slidesByDevice.watchos[0];assert.equal(changed.imageElements[0].transform.rotation,45);
      assert.ok(changed.imageElements[0].transform.zIndex<changed.transforms.caption.zIndex);
      await page.getByRole('combobox',{name:'Image fit',exact:true}).click();await page.getByRole('option',{name:'Whole image',exact:true}).click();
      await page.getByRole('combobox',{name:'Edge fade',exact:true}).click();await page.getByRole('option',{name:'From left',exact:true}).click();
      await page.getByRole('slider',{name:'Fade strength',exact:true}).fill('65');await pause(750);
      assert.equal(latest().slidesByDevice.watchos[0].imageElements[0].fit,'contain');assert.deepEqual(latest().slidesByDevice.watchos[0].imageElements[0].fade,{edge:'left',amount:65});
      await page.getByRole('button',{name:'Delete image element',exact:true}).click();await pause(750);
      assert.equal(latest().slidesByDevice.watchos[0].imageElements,undefined);
      await page.getByRole('button',{name:'Undo',exact:true}).click();await pause(750);assert.equal(latest().slidesByDevice.watchos[0].imageElements.length,1);await page.close();
    });
    await check('all devices and layouts render and remain editable in both tablet orientations',async()=>{
      const devices=['iphone','ipad','duo-outer','duo-inner','tvos','watchos','carplay','mac','android','android-7','android-10','feature-graphic','creative-universal'];
      const layouts=['Hero','Device bottom','Device top','Two devices','No device','Split (landscape)'];
      for(const device of devices) {
        const {page,latest}=await open(fixture({device,slidesByDevice:{[device]:[slide('Layout',{layout:device==='feature-graphic'?'feature-graphic':'hero'})]}}));
        // Duo landscape is its own deck: the Orientation menu opens it, so the saved device changes with it.
        for(const orientation of (['android-7','android-10','duo-outer','duo-inner'].includes(device)?['portrait','landscape']:['portrait'])) {
          if(orientation==='landscape'){await page.getByRole('combobox',{name:'Orientation',exact:true}).click();await page.getByRole('option',{name:'Landscape',exact:true}).click();}
          // On iPhone Duo the two-device layout is the folded + open pair.
          for(const layout of (device==='feature-graphic'?['Feature graphic']:layouts.map((l)=>device.startsWith('duo-')&&l==='Two devices'?'Folded + open':l))) {
            await page.getByRole('combobox',{name:'Layout',exact:true}).click();await page.getByRole('option',{name:layout,exact:true}).click();
            const headline=page.getByRole('textbox',{name:device==='feature-graphic'?'Tagline':'Headline',exact:true});
            await headline.fill(`${device} ${orientation} ${layout}`);
            assert.ok((await page.locator('main').innerText()).includes(`${device} ${orientation} ${layout}`),'canvas shows the typed copy');
            await page.getByRole('button',{name:'Zoom in',exact:true}).click();await page.getByRole('button',{name:'Fit active screen',exact:true}).click();
          }
        }
        const duo=device.startsWith('duo-');const saved=duo?`${device}-landscape`:device;
        await pause(700);assert.equal(latest().device,saved);assert.ok(latest().slidesByDevice[saved][0].headline.en.includes(device));
        if(duo)assert.ok(latest().slidesByDevice[device][0].headline.en.includes(`${device} portrait`));
        await page.close();
      }
    });
    await check('Fit active screen recenters a manually panned canvas at default zoom',async()=>{
      const {page}=await open();const scroller=page.locator('main .overflow-auto');await pause(400);
      await scroller.evaluate(el=>el.scrollTo({left:400,behavior:'instant'}));assert.ok(await scroller.evaluate(el=>el.scrollLeft)>100);
      await page.getByRole('button',{name:'Fit active screen',exact:true}).click();await pause(600);
      assert.ok(await scroller.evaluate(el=>el.scrollLeft)<5);await page.close();
    });
    await check('keyboard focus on an image exposes its inspector controls',async()=>{
      const {page}=await open(fixture({slidesByDevice:{watchos:[slide('Image',{imageElements:[{id:'image',src:'',transform:rect}]})]}}));
      await page.locator('main .rnd-editable').last().getByRole('button',{name:'Rotate element',exact:true}).focus();
      assert.equal(await page.getByRole('combobox',{name:'Image fit',exact:true}).count(),1);await page.close();
    });
    await check('responsive widths keep the canvas and inspector usable without page overflow',async()=>{
      const {page,latest}=await open();
      for(const width of [320,390,820,1024,1440]) {
        await page.setViewportSize({width,height:900});await pause(150);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`page overflows at ${width}px`);
        const canvas=page.locator('main');await canvas.scrollIntoViewIfNeeded();
        const box=await canvas.boundingBox();assert.ok(box.width>=280&&box.height>=250,`canvas too small at ${width}px: ${JSON.stringify(box)}`);
        const headline=page.getByRole('textbox',{name:'Headline',exact:true});await headline.fill(`Width ${width}`);
        if(process.env.BUG_BASH_ARTIFACTS)await page.screenshot({path:`${process.env.BUG_BASH_ARTIFACTS}/ui-${width}.png`,fullPage:true});
      }
      await pause(750);assert.equal(latest().slidesByDevice.watchos[0].headline.en,'Width 1440');await page.close();
    });
    await check('touch tablets expose slide actions without requiring hover',async()=>{
      const {page,latest}=await open(fixture(),{width:820,height:1180},{hasTouch:true});
      const duplicate=page.getByRole('button',{name:'Duplicate screen 1',exact:true});
      assert.ok(Number(await duplicate.locator('..').evaluate(el=>getComputedStyle(el).opacity))>0,'slide actions are invisible on touch');
      await duplicate.tap();await pause(750);assert.equal(latest().slidesByDevice.watchos.length,4);await page.close();
    });
    await check('theme and font menus apply every built-in option and preserve content',async()=>{
      const {page}=await open();
      for(const label of ['Theme','Screenshot font']) {
        const menu=page.getByRole('combobox',{name:label,exact:true});await menu.click();
        const names=(await page.getByRole('option').allTextContents()).filter(name=>!name.includes('Import font'));
        await page.keyboard.press('Escape');
        for(const name of names) {
          await menu.click();await page.getByRole('option',{name,exact:true}).click();
          assert.ok((await menu.innerText()).includes(name));
          assert.equal(await page.getByRole('textbox',{name:'Headline',exact:true}).inputValue(),'First');
        }
      }
      await page.close();
    });
    assert.deepEqual(errors,[],'Uncaught browser errors');
    assert.ok(passed+failures>0,'No matching checks');
    assert.equal(failures,0,`${failures} UI checks failed`);
    console.log(`${passed} UI interaction groups passed in Google Chrome.`);
  } finally {await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
