// Actual editor sessions: clicks, typing, downloads, file pickers and touch input.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
let playwright;try{playwright=require('playwright');}catch{playwright=require('/opt/codex/runtimes/cua/lib/node_modules/playwright');}
const base=process.env.DIAGRAM_URL||'http://127.0.0.1:8002';
const directory=path.join(__dirname,'artifacts','themes');fs.mkdirSync(directory,{recursive:true});
const artifact=name=>path.join(directory,name),data=m=>({nodes:m.nodes,zones:m.zones,edges:m.edges}),obj=(m,id)=>[...m.nodes,...m.zones,...m.edges].find(n=>n.id===id);
(async()=>{
  const {themes,contrastRatio,objectColors}=await import('../core.mjs').then(async core=>({...core,...await import('../themes.mjs')}));
  const browser=await playwright.chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
  let page=await browser.newPage({viewport:{width:1800,height:1100},acceptDownloads:true}),serial=0;
  const results=[],errors=[];const watch=p=>p.on('pageerror',e=>errors.push(e.message));watch(page);
  async function ready(){await page.waitForFunction(()=>!document.querySelector('#btn-new').disabled);}
  async function activate(command){
    if(page.viewportSize().width<=850){await page.locator('#btn-project-menu').click();await page.locator(`#editing-overlay [data-command="${command}"]`).click();}
    else await page.locator(`#btn-${command}`).click();
  }
  async function snapshot(file){const event=page.waitForEvent('download');await activate('save');const d=await event,filename=file||artifact(`temp-${++serial}.json`);await d.saveAs(filename);const m=JSON.parse(fs.readFileSync(filename));if(!file)fs.unlinkSync(filename);return m;}
  async function open(file){const event=page.waitForEvent('filechooser');await activate('open');await(await event).setFiles(file);await ready();}
  async function hierarchy(show=true){if((await page.locator('#btn-hierarchy').getAttribute('aria-expanded')==='true')!==show)await activate('hierarchy');}
  async function select(id,extend=false){await hierarchy();await page.locator(`[data-tree-id="${id}"] .tree-object`).click({modifiers:extend?['Shift']:[]});await hierarchy(false);}
  async function color(){await page.locator('#btn-selection-more').click();await page.locator('#editing-overlay [data-command=color]').click();}
  async function picker(){
    if(page.viewportSize().width<=850){await page.locator('#btn-diagram-menu').click();await page.locator('#editing-overlay [data-command=theme]').click();}
    else await page.locator('#btn-theme').click();
  }
  async function theme(id){await picker();await page.locator(`[data-theme="${id}"].theme-card`).click();await page.locator('#btn-theme-close').click();}
  async function paths(){return page.locator('#world').evaluate(el=>({edges:[...el.querySelectorAll('.edge-line')].map(e=>[e.dataset.edgeId,e.getAttribute('d')]),labels:[...el.querySelectorAll('.edge-label')].map(e=>[e.dataset.objectId,e.getAttribute('transform')]),leaders:[...el.querySelectorAll('line.edge-label-leader')].map(e=>['x1','y1','x2','y2'].map(k=>e.getAttribute(k)))}));}
  async function popupFits(){const b=await page.locator('#editing-overlay').boundingBox();assert(b.x>=0&&b.y>=0&&b.x+b.width<=page.viewportSize().width+1&&b.y+b.height<=page.viewportSize().height+1);}
  async function test(name,fn){try{await fn();assert(await page.locator('#error-banner').isHidden());results.push({name,pass:true});console.log('PASS',name);}catch(e){results.push({name,pass:false,error:e.stack});await page.screenshot({path:artifact('failure.png')});fs.writeFileSync(artifact('results.json'),JSON.stringify({results,errors},null,2));await browser.close();throw e;}}
  async function exportFile(format,file){await page.locator('#export-format').selectOption(format);const event=page.waitForEvent('download');await activate('export');await(await event).saveAs(file);}
  const source=`flowchart LR
  subgraph Collect["01 · Moonlight seed library"]
    Ledger[(Seed archive)] --> Sort[Sort seed packets]
  end
  subgraph Grow["02 · Lunar nursery"]
    Plant[Plant the test bed]
    subgraph Climate["Light & moisture"]
      Ready{Sprouts ready?}
      Lamp[Adjust moon lamps]
    end
  end
  subgraph Deliver["03 · Rooftop delivery"]
    Orbit((Orbit check)) --> Launch(Launch seed pods)
  end
  Sort -->|Planting plan| Plant
  Plant -->|Growth check| Ready
  Ready -->|Yes| Orbit
  Ready -.->|More light| Lamp
  Lamp -.->|Try again| Plant
  Launch -.->|Next season| Ledger
`;
  await page.goto(base+'/viewer.html');await ready();
  let seed;
  await test('build a Moonlight seed library from source with five shapes, nested rooms, forward paths and loops',async()=>{
    await activate('new');await activate('source');await page.locator('#editor').fill(source);await page.locator('#btn-apply').click();await ready();await activate('source');await page.locator('#btn-fit').click();
    seed=await snapshot(artifact('moonlight-clean.mermaid-project.json'));assert.equal(seed.nodes.length,7);assert.equal(seed.zones.length,4);assert.equal(new Set(seed.nodes.map(n=>n.shape)).size,5);assert.equal(seed.settings.theme,undefined);
  });
  await test('arrange the stages in reading order by dragging whole zones and retaining nested membership',async()=>{
    for(const [id,x,y]of [['Grow',448,100],['Deliver',1425,100],['Collect',0,100]]){
      await select(id);const m=await snapshot(),n=obj(m,id),box=await page.locator(`.diagram-zone[data-object-id="${id}"]>.zone-header`).boundingBox(),scale=await page.locator('#world').evaluate(el=>el.getScreenCTM().a);
      const px=box.x+box.width/2,py=box.y+box.height/2;await page.mouse.move(px,py);await page.mouse.down();await page.mouse.move(px+(x-n.x)*scale,py+(y-n.y)*scale,{steps:12});await page.mouse.up();const after=await snapshot();assert.equal(obj(after,id).parentId,null);assert.equal(obj(after,'Climate').parentId,'Grow');
    }
    await select('Collect');await select('Grow',true);await select('Deliver',true);await page.locator('#selection-align').click();await page.locator('#editing-overlay [data-command=arrange]').filter({hasText:/^Top$/}).click();
    const m=await snapshot();assert(obj(m,'Collect').x<obj(m,'Grow').x&&obj(m,'Grow').x<obj(m,'Deliver').x);assert.equal(obj(m,'Grow').y,obj(m,'Collect').y);await page.locator('#btn-fit').click();await snapshot(artifact('moonlight-clean.mermaid-project.json'));
  });
  await test('manually place a label with a leader and add a waypoint before exercising themes',async()=>{
    const edge=seed.edges.find(e=>e.source==='Sort'&&e.target==='Plant'),label=page.locator(`.edge-label[data-object-id="${edge.id}"]>rect`),b=await label.boundingBox();
    await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+20,b.y+b.height/2-160,{steps:10});await page.mouse.up();assert(await page.locator(`.manual-label[data-object-id="${edge.id}"] .edge-label-leader`).count());
    await page.locator('#selection-waypoint').click();const routes=await page.locator(`[data-object-id="${edge.id}"] .edge-hit`).evaluate(el=>{const p=el.getPointAtLength(el.getTotalLength()*.5),t=el.getScreenCTM();return{x:p.x*t.a+t.e,y:p.y*t.d+t.f};});await page.mouse.click(routes.x,routes.y);assert(obj(await snapshot(),edge.id).waypoints.length===1);await snapshot(artifact('moonlight-clean.mermaid-project.json'));
  });
  await test('switch every theme repeatedly without changing geometry, routes, labels, manual data or Mermaid source',async()=>{
    const before=await snapshot(),route=await paths(),sourceBefore=await page.locator('#editor').inputValue();
    for(const id of ['blueprint','botanical','paper','clean','paper','botanical']){await theme(id);const after=await snapshot();assert.equal(after.settings.theme,id);assert.deepEqual(data(after),data(before));assert.deepEqual(await paths(),route);assert.equal(await page.locator('#editor').inputValue(),sourceBefore);}
  });
  await test('theme selection is one Undo step and selecting the current theme is a no-op',async()=>{
    await open(artifact('moonlight-clean.mermaid-project.json'));await hierarchy(false);const before=await snapshot();await theme('blueprint');const after=await snapshot();await page.locator('#btn-undo').click();assert.deepEqual(data(await snapshot()),data(before));assert.equal((await snapshot()).settings.theme,undefined);await page.locator('#btn-redo').click();assert.equal((await snapshot()).settings.theme,'blueprint');await theme('blueprint');await page.locator('#btn-undo').click();assert.equal((await snapshot()).settings.theme,undefined);assert.deepEqual(data(await snapshot()),data(after));
  });
  await test('opening and applying an untouched Color popup does not freeze theme colors or add Undo history',async()=>{
    await theme('botanical');await select('Plant');const before=await snapshot();await color();assert.deepEqual(await page.locator('#editing-overlay .color-origin').allTextContents(),['Theme','Theme']);await page.locator('#btn-edit-apply').click();assert.deepEqual(await snapshot(),before);await page.locator('#btn-undo').click();assert.equal((await snapshot()).settings.theme,undefined);await theme('botanical');
  });
  await test('a fill-only override keeps automatic text, updates readable contrast and survives a theme switch',async()=>{
    await select('Plant');await color();await page.locator('#edit-backgroundColor').fill('#172b40');assert.deepEqual(await page.locator('#editing-overlay .color-origin').allTextContents(),['Custom','Theme']);assert.equal(await page.locator('#edit-fontColor').inputValue(),'#ffffff');await page.locator('#btn-edit-apply').click();let m=await snapshot();assert.equal(obj(m,'Plant').backgroundColor,'#172b40');assert.equal(obj(m,'Plant').fontColor,undefined);assert(contrastRatio(objectColors(m,obj(m,'Plant')).font,'#172b40')>=4.5);await theme('paper');m=await snapshot();assert.equal(obj(m,'Plant').backgroundColor,'#172b40');assert.equal(obj(m,'Plant').fontColor,undefined);
  });
  await test('per-color resets preserve the other override; Cancel and Escape restore the original settings',async()=>{
    await select('Plant');await color();await page.locator('#edit-fontColor').fill('#f5e9c8');await page.locator('#btn-edit-apply').click();const before=await snapshot();
    await color();await page.locator('#editing-overlay [data-reset-color=backgroundColor]').click();assert.deepEqual(await page.locator('#editing-overlay .color-origin').allTextContents(),['Theme','Custom']);await page.locator('#btn-edit-cancel').click();assert.deepEqual(await snapshot(),before);
    await color();await page.locator('#editing-overlay [data-reset-color=fontColor]').click();await page.keyboard.press('Escape');assert.deepEqual(await snapshot(),before);
    await color();await page.locator('#editing-overlay [data-reset-color=backgroundColor]').click();await page.locator('#btn-edit-apply').click();let n=obj(await snapshot(),'Plant');assert.equal(n.backgroundColor,undefined);assert.equal(n.fontColor,'#f5e9c8');await page.locator('#btn-undo').click();assert.deepEqual(obj(await snapshot(),'Plant'),obj(before,'Plant'));
    await color();await page.locator('#editing-overlay [data-reset-color=fontColor]').click();await page.locator('#btn-edit-apply').click();n=obj(await snapshot(),'Plant');assert.equal(n.backgroundColor,'#172b40');assert.equal(n.fontColor,undefined);
  });
  await test('invalid color input blocks actions, focuses the invalid field and recovers without corrupting the model',async()=>{
    const before=await snapshot();await color();await page.locator('#edit-backgroundColor').fill('#oops');await page.locator('#btn-edit-apply').click();assert(await page.locator('#edit-error').isVisible());assert.equal(await page.locator('#edit-backgroundColor').getAttribute('aria-invalid'),'true');assert.equal(await page.evaluate(()=>document.activeElement.id),'edit-backgroundColor');await page.keyboard.press('Escape');assert.deepEqual(await snapshot(),before);
  });
  await test('Properties displays the same color provenance and supports independent reset and fill-only edits',async()=>{
    await page.locator('#reset-property-backgroundColor').click();assert.deepEqual(await page.locator('#properties .color-origin').allTextContents(),['Theme','Theme']);await page.locator('#property-background-color').fill('#003322');await page.locator('#property-background-color').press('Tab');assert.deepEqual(await page.locator('#properties .color-origin').allTextContents(),['Custom','Theme']);assert.equal(await page.locator('#property-font-color').inputValue(),'#ffffff');assert.equal(obj(await snapshot(),'Plant').fontColor,undefined);await page.locator('#reset-property-backgroundColor').click();
  });
  await test('custom parent rooms, inherited child shades and zone overrides remain consistent across themes',async()=>{
    await select('Grow');await color();await page.locator('#edit-backgroundColor').fill('#d8eadf');await page.locator('#btn-edit-apply').click();const m=await snapshot(),nested=objectColors(m,obj(m,'Climate')).background;await theme('blueprint');const after=await snapshot();assert.equal(objectColors(after,obj(after,'Climate')).background,nested);await select('Grow');await page.locator('#reset-property-backgroundColor').click();
  });
  await test('move and resize rooms through the UI without changing stable stage colors or adding object color fields',async()=>{
    await select('Deliver');const before=await snapshot(),colorBefore=objectColors(before,obj(before,'Deliver')).background;await page.locator('#viewport').focus();await page.keyboard.press('Shift+ArrowDown');const after=await snapshot();assert.notEqual(obj(after,'Deliver').y,obj(before,'Deliver').y);assert.equal(objectColors(after,obj(after,'Deliver')).background,colorBefore);assert.equal(obj(after,'Deliver').backgroundColor,undefined);await page.locator('#btn-undo').click();
    await page.locator('#property-width').fill(String(obj(before,'Deliver').width+70));await page.locator('#property-width').press('Tab');const resized=await snapshot();assert.equal(objectColors(resized,obj(resized,'Deliver')).background,colorBefore);await page.locator('#btn-undo').click();
  });
  await test('new nodes and zones use the active theme without explicit overrides',async()=>{
    const before=await snapshot();await page.locator('button[data-tool=node]').click();const b=await page.locator('#canvas').boundingBox();await page.mouse.click(b.x+20,b.y+40);let m=await snapshot(),n=m.nodes.find(n=>!before.nodes.some(old=>old.id===n.id));assert(n);assert.equal(n.backgroundColor,undefined);assert.equal(n.fontColor,undefined);assert.equal(objectColors(m,n).background,themes.find(t=>t.id===m.settings.theme).node);await page.locator('#btn-undo').click();await page.locator('button[data-tool=zone]').click();await page.mouse.click(b.x+20,b.y+40);m=await snapshot();const z=m.zones.find(z=>!before.zones.some(old=>old.id===z.id));assert(z);assert.equal(z.backgroundColor,undefined);assert.equal(z.fontColor,undefined);await page.locator('#btn-undo').click();await page.locator('button[data-tool=select]').click();
  });
  await test('source edits retain the active theme and overrides while new source objects inherit defaults',async()=>{
    await select('Ledger');await color();await page.locator('#edit-backgroundColor').fill('#e9dcba');await page.locator('#btn-edit-apply').click();await activate('source');await page.locator('#editor').fill((await page.locator('#editor').inputValue())+'\nSpare[Spare moon lamp]\n');await page.locator('#btn-apply').click();await ready();const m=await snapshot();assert.equal(m.settings.theme,'blueprint');assert.equal(obj(m,'Ledger').backgroundColor,'#e9dcba');assert.equal(obj(m,'Spare').backgroundColor,undefined);await activate('source');await page.locator('#btn-undo').click();await select('Ledger');await page.locator('#reset-property-backgroundColor').click();
  });
  await test('keyboard-only theme selection, focus return and small previews work',async()=>{
    await page.locator('#btn-theme').focus();await page.keyboard.press('Enter');await popupFits();await page.locator('[data-theme=botanical].theme-card').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('[data-theme=botanical].theme-card').getAttribute('aria-pressed'),'true');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'btn-theme');assert.equal((await snapshot()).settings.theme,'botanical');
  });
  await test('save/open restores theme, overrides and default inheritance exactly',async()=>{
    await page.locator('#btn-fit').click();await snapshot(artifact('moonlight-botanical.mermaid-project.json'));const before=await snapshot();await activate('new');assert.equal(await page.locator('#btn-theme').innerText(),'Theme · Clean');await open(artifact('moonlight-botanical.mermaid-project.json'));await hierarchy(false);const after=await snapshot();assert.deepEqual(after,before);
  });
  await test('Auto layout retains the theme, custom colors and manual route/label preferences',async()=>{
    await select('Deliver');await page.locator('#viewport').focus();await page.keyboard.press('Shift+ArrowDown');const before=await snapshot();await page.locator('#btn-layout').click();await ready();const after=await snapshot();assert.notDeepEqual(data(after),data(before));assert.equal(after.settings.theme,before.settings.theme);for(const n of [...before.nodes,...before.zones])for(const key of ['fontColor','backgroundColor'])assert.equal(obj(after,n.id)[key],n[key]);for(const e of before.edges){assert.deepEqual(obj(after,e.id).waypoints,e.waypoints);assert.deepEqual(obj(after,e.id).labelPosition,e.labelPosition);}await page.locator('#btn-undo').click();assert.deepEqual(data(await snapshot()),data(before));await page.locator('#btn-undo').click();
  });
  await test('SVG, PNG and Mermaid exports retain the appropriate theme behavior and exclude editor controls',async()=>{
    await exportFile('svg',artifact('moonlight-botanical.svg'));await exportFile('png',artifact('moonlight-botanical.png'));await exportFile('mermaid',artifact('moonlight.mmd'));
    const svg=fs.readFileSync(artifact('moonlight-botanical.svg'),'utf8'),png=fs.readFileSync(artifact('moonlight-botanical.png'));assert(svg.includes('data-theme="botanical"'));assert(svg.includes('--diagram-ink:#526c60'));assert(!svg.includes('editor-only'));assert.equal(png.subarray(1,4).toString(),'PNG');assert(!fs.readFileSync(artifact('moonlight.mmd'),'utf8').includes('botanical'));
    const image=await browser.newPage();await image.setContent(svg);const ink=await image.locator('.edge-line').first().evaluate(e=>getComputedStyle(e).stroke);assert.equal(ink,'rgb(82, 108, 96)');await image.close();
  });
  await test('invalid saved theme reports a clear error and leaves the open project intact',async()=>{
    const before=await snapshot(),bad=structuredClone(before);bad.settings.theme='unknown';fs.writeFileSync(artifact('invalid-theme.json'),JSON.stringify(bad));await open(artifact('invalid-theme.json'));assert(await page.locator('#error-banner').isVisible());assert((await page.locator('#error-message').innerText()).includes('theme'));await page.locator('#dismiss-error').click();assert.deepEqual(await snapshot(),before);fs.unlinkSync(artifact('invalid-theme.json'));
  });
  await test('desktop diagram and theme chooser screenshots',async()=>{
    await hierarchy(false);await page.locator('#btn-fit').click();await page.screenshot({path:artifact('desktop-botanical.png')});await picker();await page.screenshot({path:artifact('desktop-themes.png')});await page.locator('#btn-theme-close').click();
  });
  await test('mobile touch selection, overrides, resets and theme changes keep the diagram stable',async()=>{
    await page.close();const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,acceptDownloads:true});page=await context.newPage();watch(page);await page.goto(base+'/viewer.html');await ready();await open(artifact('moonlight-botanical.mermaid-project.json'));await page.locator('#btn-fit').tap();const before=await snapshot(),route=await paths();
    await page.locator('#btn-diagram-menu').tap();await page.locator('#editing-overlay [data-command=theme]').tap();await popupFits();await page.locator('[data-theme=paper].theme-card').tap();assert.deepEqual(data(await snapshot()),data(before));assert.deepEqual(await paths(),route);await picker();await page.locator('[data-theme=botanical].theme-card').tap();await page.screenshot({path:artifact('mobile-themes.png')});await page.locator('#btn-theme-close').tap();
    await select('Plant');await page.locator('#btn-selection-more').tap();await page.locator('#editing-overlay [data-command=color]').tap();await popupFits();await page.locator('#edit-backgroundColor').fill('#173d31');await page.locator('#btn-edit-apply').tap();let n=obj(await snapshot(),'Plant');assert.equal(n.backgroundColor,'#173d31');assert.equal(n.fontColor,undefined);
    await page.locator('#btn-selection-more').tap();await page.locator('#editing-overlay [data-command=color]').tap();await popupFits();await page.screenshot({path:artifact('mobile-override.png')});await page.locator('#editing-overlay [data-reset-color=backgroundColor]').tap();await page.locator('#btn-edit-apply').tap();n=obj(await snapshot(),'Plant');assert.equal(n.backgroundColor,undefined);assert.equal(n.fontColor,undefined);
    await page.locator('#btn-undo').tap();assert.equal(obj(await snapshot(),'Plant').backgroundColor,'#173d31');await page.locator('#btn-redo').tap();assert.equal(obj(await snapshot(),'Plant').backgroundColor,undefined);
  });
  await test('theme cards, Color controls and mobile toolbar fit 320–850px widths with 44px touch targets',async()=>{
    for(const width of [320,390,600,850]){await page.setViewportSize({width,height:844});await picker();await popupFits();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);for(const card of await page.locator('.theme-card').all()){const b=await card.boundingBox();assert(b.width>=44&&b.height>=44);}await page.locator('#btn-theme-close').tap();await color();await popupFits();for(const button of await page.locator('#editing-overlay button').all()){const b=await button.boundingBox();assert(b.height>=44);}await page.locator('#btn-edit-cancel').tap();}
    await page.setViewportSize({width:390,height:844});
  });
  await test('mobile save/open and Properties reset keep explicit text overrides independent',async()=>{
    await color();await page.locator('#edit-backgroundColor').fill('#173d31');await page.locator('#edit-fontColor').fill('#fff0cc');await page.locator('#btn-edit-apply').tap();await snapshot(artifact('mobile-custom.mermaid-project.json'));await open(artifact('mobile-custom.mermaid-project.json'));await select('Plant');await page.locator('#btn-selection-more').tap();await page.locator('#editing-overlay [data-command=details]').tap();await page.locator('#reset-property-backgroundColor').tap();let n=obj(await snapshot(),'Plant');assert.equal(n.backgroundColor,undefined);assert.equal(n.fontColor,'#fff0cc');await page.locator('#reset-property-fontColor').tap();await page.locator('#btn-close-properties').tap();n=obj(await snapshot(),'Plant');assert.equal(n.fontColor,undefined);
    await page.locator('#btn-fit').tap();await page.screenshot({path:artifact('mobile-diagram.png')});
  });
  assert.deepEqual(errors,[]);fs.rmSync(artifact('failure.png'),{force:true});fs.writeFileSync(artifact('results.json'),JSON.stringify({passed:results.length,total:results.length,results,errors},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
