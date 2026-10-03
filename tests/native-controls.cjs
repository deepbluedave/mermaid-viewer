// Native user sessions. Run against a local HTTP server; no model injection.
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
let playwright; try { playwright = require('playwright'); } catch { playwright = require('/opt/codex/runtimes/cua/lib/node_modules/playwright'); }
const base = process.env.DIAGRAM_URL || 'http://127.0.0.1:8000';
const directory = path.join(__dirname, 'artifacts', 'controls'); fs.mkdirSync(directory, {recursive:true});
const artifact = name => path.join(directory, name);
const data = m => ({nodes:m.nodes, zones:m.zones, edges:m.edges});
const obj = (m,id) => [...m.nodes,...m.zones,...m.edges].find(n => n.id === id);
(async () => {
  const browser = await playwright.chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined), args:['--no-sandbox']});
  let page = await browser.newPage({viewport:{width:1800,height:1100}, acceptDownloads:true});
  const results = [], errors = []; let serial = 0;
  const watch = p => p.on('pageerror', e => errors.push(e.message)); watch(page);
  async function test(name, fn) {
    try { await fn(); assert(await page.locator('#error-banner').isHidden()); results.push({name,pass:true}); console.log('PASS',name); }
    catch (e) {results.push({name,pass:false,error:e.message}); await page.screenshot({path:artifact('failure.png')}); fs.writeFileSync(artifact('results.json'),JSON.stringify({results,errors},null,2)); throw e;}
  }
  async function ready() {await page.waitForFunction(() => !document.querySelector('#btn-new').disabled);}
  async function global(command) {
    if (page.viewportSize().width <= 850) {await page.locator('#btn-project-menu').click(); await page.locator(`#editing-overlay [data-command="${command}"]`).click();}
    else await page.locator(`#btn-${command}`).click();
  }
  async function snapshot(file) {
    const event = page.waitForEvent('download'); await global('save'); const d = await event;
    const name = file || artifact(`snapshot-${++serial}.json`); await d.saveAs(name); const m = JSON.parse(fs.readFileSync(name)); if(!file)fs.unlinkSync(name); return m;
  }
  async function open(file) {
    const event = page.waitForEvent('filechooser'); await global('open'); await (await event).setFiles(file); await ready();
  }
  async function hierarchy(show = true) {if ((await page.locator('#btn-hierarchy').getAttribute('aria-expanded') === 'true') !== show) await global('hierarchy');}
  async function select(id, extend = false) {
    await hierarchy();
    if (await page.locator(`[data-tree-id="${id}"]`).count()) await page.locator(`[data-tree-id="${id}"] .tree-object`).click({modifiers:extend?['Shift']:[]});
    else {const m = await snapshot(); await page.locator('#hierarchy-flows button').nth(m.edges.findIndex(e => e.id === id)).click();}
    await hierarchy(false);
  }
  async function point(x,y) {return page.locator('#world').evaluate((el,p) => {const t=el.getScreenCTM();return{x:t.a*p.x+t.e,y:t.d*p.y+t.f};},{x,y});}
  async function click(x,y) {const p=await point(x,y);await page.mouse.click(p.x,p.y);}
  async function action(command) {await page.locator('#btn-selection-more').click();if(!await page.locator(`#editing-overlay [data-command="${command}"]`).count()&&await page.locator('#editing-overlay [data-command=connection-actions]').count())await page.locator('#editing-overlay [data-command=connection-actions]').click();await page.locator(`#editing-overlay [data-command="${command}"]`).click();}
  async function label(value) {await action('label');await page.locator('#edit-label').fill(value);await page.locator('#btn-edit-apply').click();}
  async function tool(value) {
    if(page.viewportSize().width<=850){await page.locator('#btn-tool-menu').click();await page.locator(`#editing-overlay [data-command=tool]`).filter({hasText:new RegExp('^'+value+'$','i')}).click();}
    else await page.locator(`[data-tool="${value}"]`).click();
  }
  async function id() {return (await page.locator('#properties .object-id').innerText()).split(' · ')[1];}
  async function field(key,value) {await page.locator('#property-'+key).fill(String(value));await page.locator('#property-'+key).press('Tab');}
  async function node(name,x,y,shape='rectangle') {
    await tool('node');await click(x,y);const identity=await id();await label(name);
    await page.locator('#selection-shape').click();await page.locator('#editing-overlay [data-command=set-shape]').filter({hasText:new RegExp('^'+({rectangle:'Rectangle',rounded:'Rounded rectangle',diamond:'Diamond',circle:'Circle',cylinder:'Database cylinder'}[shape])+'$')}).click();return identity;
  }
  async function zone(name,x,y,w,h) {await tool('zone');await click(x,y);const identity=await id();await label(name);await field('width',w);await field('height',h);return identity;}
  async function color(value) {await action('color');await page.locator('#edit-backgroundColor').fill(value);await page.locator('#btn-edit-apply').click();}
  async function connect(a,b,name,source='east',target='west',style='normal') {
    await select(a);await page.locator('#selection-connect').click();const n=await page.locator(`.diagram-node[data-object-id="${b}"]`).boundingBox();await page.mouse.click(n.x+n.width/2,n.y+n.height/2);const identity=await id();await label(name);
    await page.locator('#selection-attachments').click();await page.locator('#attachment-side').selectOption(source);await page.locator('.attachment-tabs [data-end=target]').click();await page.locator('#attachment-side').selectOption(target);await page.locator('#attachment-close').click();
    await page.locator('#selection-style').click();await page.locator('#editing-overlay [data-command=set-style]').filter({hasText:new RegExp('^'+style+'$','i')}).click();return identity;
  }
  async function drag(locator,dx,dy,cancel=false) {
    const b=await locator.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+dx,b.y+b.height/2+dy,{steps:10});if(cancel)await page.keyboard.press('Escape');await page.mouse.up();
  }
  async function popupFits() {const b=await page.locator('#editing-overlay').boundingBox();assert(b.x>=0&&b.y>=0&&b.x+b.width<=page.viewportSize().width+1&&b.y+b.height<=page.viewportSize().height+1);}
  async function reset() {await open(artifact('floating-orchard.mermaid-project.json'));}
  let seed, flight, orchard, climate, library, pick, launch, storm, charge, landing, pantry, dispatch, radar, atmosphere;
  await page.goto(base+'/viewer.html');await ready();await hierarchy(false);
  await test('UI-01: build the Floating Orchard through tools, selection actions, and popup editors',async()=>{
    await global('new');seed=await zone('01 · Sky harvest',40,60,360,530);flight=await zone('02 · Drone dispatch',480,140,420,510);orchard=await zone('03 · Rooftop pantry',980,110,380,550);
    library=await node('Harvest ledger',160,175,'cylinder');pick=await node('Pick fruit',240,440,'rounded');launch=await node('Launch drones',680,255);climate=await zone('Weather & power',510,365,330,250);
    storm=await node('Storm clear?',590,445,'diamond');charge=await node('Charge pods',780,545,'circle');landing=await node('Landing clear?',1160,300,'diamond');pantry=await node('Rooftop pantry',1160,550,'rounded');
    const m=await snapshot();assert.equal(m.nodes.length,7);assert.equal(m.zones.length,4);assert.equal(obj(m,climate).parentId,flight);assert.equal(obj(m,storm).parentId,climate);assert.equal(obj(m,library).shape,'cylinder');
  });
  await test('UI-02: create forward paths, parallel solid/dotted paths, and a self-loop from the selection bar',async()=>{
    await connect(library,pick,'Ripeness check','south','north');dispatch=await connect(pick,launch,'Dispatch flight plan');atmosphere=await connect(launch,storm,'Atmospheric check','south','north');radar=await connect(launch,storm,'Live radar feed','west','west','dashed');
    await connect(storm,charge,'Recharge','east','north');await connect(charge,charge,'Battery check','east','south','dashed');await connect(launch,landing,'Fresh fruit','east','west');await connect(landing,pantry,'Clear to land','south','north');
    const m=await snapshot();assert.equal(m.edges.length,8);assert.equal(obj(m,radar).style,'dashed');assert.equal(obj(m,radar).sourceSide,'west');assert(m.edges.some(e=>e.source===charge&&e.target===charge));
  });
  await test('UI-09: color, pad, and fit each zone while preserving every child coordinate',async()=>{
    for(const [identity,value]of[[seed,'#e0e7ff'],[flight,'#dcfce7'],[orchard,'#ffedd5'],[climate,'#bbf7d0']]){await select(identity);await color(value);}
    await select(climate);const before=await snapshot();await page.locator('#selection-padding').click();await page.locator('#edit-padding-top').fill('24');await page.locator('#edit-padding-left').fill('28');await page.locator('#btn-edit-apply').click();await page.locator('#selection-fit-zone').click();assert.deepEqual((await snapshot()).nodes,before.nodes);
    for(const identity of[seed,flight,orchard]){await select(identity);await page.locator('#selection-fit-zone').click();}await page.locator('#btn-fit').click();await snapshot(artifact('floating-orchard.mermaid-project.json'));
  });
  await test('UI-03: right-click retains a selected group and selects an unselected object without moving it',async()=>{
    await select(library);await select(pick,true);const before=await snapshot();await page.locator(`.diagram-node[data-object-id="${library}"] .node-shape`).first().click({button:'right'});assert.equal(await page.locator('#editing-overlay [data-command=delete]').innerText(),'Delete selection');await page.keyboard.press('Escape');
    await page.locator(`.diagram-node[data-object-id="${launch}"] .node-shape`).click({button:'right'});assert.equal(await page.locator('#editing-overlay [data-command=delete]').innerText(),'Delete node');await page.keyboard.press('Escape');assert.deepEqual(data(await snapshot()),data(before));
  });
  for(const scale of[.25,1,2])await test(`UI-04: create at the captured world position at ${scale*100}% zoom`,async()=>{
    await global('new');const b=await page.locator('#canvas').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.wheel(0,-Math.log(scale)/.0015);
    await page.waitForTimeout(100);const screen={x:b.x+b.width-16,y:b.y+20};const p=await page.locator('#world').evaluate((el,p)=>{const t=el.getScreenCTM();return{x:(p.x-t.e)/t.a,y:(p.y-t.f)/t.d};},screen);
    for(const command of['node','zone']){await page.mouse.click(screen.x,screen.y,{button:'right'});await popupFits();await page.locator(`#editing-overlay [data-command=${command}]`).click();const m=await snapshot(),n=(command==='node'?m.nodes:m.zones)[0];assert(Math.abs(n.x-(p.x-(command==='node'?60:0)))<.01);assert(Math.abs(n.y-(p.y-(command==='node'?27:0)))<.01);await page.locator('#btn-undo').click();}
  });
  await reset();
  await test('UI-05: Add waypoint here inserts at the click; the bar waits for placement',async()=>{
    await select(dispatch);const p=await point(430,330);await page.mouse.click(p.x,p.y,{button:'right'}); // Empty canvas is not an edge command.
    await page.keyboard.press('Escape');const segment=page.locator(`[data-object-id="${dispatch}"] .edge-hit`);const coords=await segment.evaluate(el=>{const p=el.getPointAtLength(el.getTotalLength()*.25),t=el.getScreenCTM();return{x:p.x*t.a+t.e,y:p.y*t.d+t.f};});
    await page.mouse.click(coords.x,coords.y,{button:'right'});await page.locator('#editing-overlay [data-command=waypoint]').click();assert.equal(obj(await snapshot(),dispatch).waypoints.length,1);
    await select(dispatch);await page.locator('#selection-waypoint').click();assert.equal(await page.locator('#viewport').getAttribute('data-tool'),'waypoint');assert.equal(obj(await snapshot(),dispatch).waypoints.length,1);await click(435,275);assert.equal(obj(await snapshot(),dispatch).waypoints.length,2);
    await action('reset-route');assert(!obj(await snapshot(),dispatch).waypoints);await reset();
  });
  await test('UI-06/07: attachment clicks expose both ends; all side choices and manual order undo correctly',async()=>{
    await select(radar);await page.locator(`[data-reconnect="${radar}"][data-end=source]`).click();assert(await page.locator('#attachment-side').isVisible());assert((await page.locator('#editing-overlay h2').innerText()).includes('Launch drones'));
    for(const side of['north','east','south','west']){await page.locator('#attachment-side').selectOption(side);assert.equal(await page.locator('#attachment-side').inputValue(),side);await popupFits();}
    await page.locator('#attachment-earlier').click();assert((await page.locator('.attachment-summary').innerText()).includes('Manual order'));assert(await page.locator('#attachment-earlier').isDisabled());
    await page.locator('#attachment-later').click();assert(await page.locator('#editing-overlay').isVisible());await page.locator('#attachment-reset').click();assert((await page.locator('.attachment-summary').innerText()).includes('Automatic order'));
    await page.locator('.attachment-tabs [data-end=target]').click();assert((await page.locator('#editing-overlay h2').innerText()).includes('Storm clear?'));await page.locator('#attachment-side').selectOption('east');await page.locator('#attachment-close').click();const changed=await snapshot();assert.equal(obj(changed,radar).targetSide,'east');await page.locator('#btn-undo').click();assert.equal(obj(await snapshot(),radar).targetSide,'west');await reset();
  });
  await test('UI-08: a reconnect drag never opens controls; Escape restores the complete model',async()=>{
    await select(radar);const before=await snapshot();await drag(page.locator(`[data-reconnect="${radar}"][data-end=target]`),60,-50,true);assert.deepEqual(data(await snapshot()),data(before));assert(await page.locator('#editing-overlay').isHidden());
    await select(radar);const pin=await page.locator(`[data-reconnect="${radar}"][data-end=target]`).boundingBox(),dest=await page.locator(`.diagram-node[data-object-id="${landing}"]`).boundingBox();await page.mouse.move(pin.x+pin.width/2,pin.y+pin.height/2);await page.mouse.down();await page.mouse.move(dest.x+dest.width/2,dest.y+dest.height/2,{steps:12});await page.mouse.up();assert.equal(obj(await snapshot(),radar).target,landing);assert(await page.locator('#editing-overlay').isHidden());await reset();
  });
  await test('UI-10: a selected ancestor counts once; group alignment moves each descendant once',async()=>{
    await select(flight);await select(climate,true);await page.locator('#selection-align').waitFor();assert(await page.locator('#selection-align').isDisabled());assert(await page.locator('#selection-distribute').isDisabled());
    await select(seed);await select(flight,true);await select(orchard,true);const before=await snapshot();await page.locator('#selection-align').click();await page.locator('#editing-overlay [data-command=arrange]').filter({hasText:/^Top$/}).click();const after=await snapshot();assert([seed,flight,orchard].every(id=>obj(after,id).y===obj(after,seed).y));
    for(const [parent,child]of[[flight,launch],[climate,charge],[seed,library]])assert.equal(obj(after,child).y-obj(before,child).y,obj(after,parent).y-obj(before,parent).y);
    await page.locator('#btn-undo').click();assert.deepEqual(data(await snapshot()),data(before));await reset();
  });
  await test('UI-11: preview, Apply, click-away, Cancel, and Escape preserve one-edit Undo',async()=>{
    await select(launch);const before=await snapshot();await action('label');await page.locator('#edit-label').fill('Launch an exceptionally large orchard fleet');assert((await page.locator(`.diagram-node[data-object-id="${launch}"]`).textContent()).includes('exceptionally'));
    await page.locator('#btn-edit-cancel').click();assert.deepEqual(data(await snapshot()),data(before));
    await label('Launch orchard fleet');assert.equal(obj(await snapshot(),launch).label,'Launch orchard fleet');await page.locator('#btn-undo').click();assert.deepEqual(data(await snapshot()),data(before));
    await action('color');await page.locator('#edit-backgroundColor').fill('#cffafe');await page.locator('#selection-shape').click();assert(await page.locator('#editing-overlay [data-command=set-shape]').count());await page.keyboard.press('Escape');assert.equal(obj(await snapshot(),launch).backgroundColor,'#cffafe');await page.locator('#btn-undo').click();assert.deepEqual(data(await snapshot()),data(before));
    await select(climate);const initial=await snapshot();await page.locator('#selection-padding').click();await page.locator('#edit-padding-left').fill('300');await page.keyboard.press('Escape');assert.deepEqual(data(await snapshot()),data(initial));await reset();
  });
  await test('UI-11/17: invalid drafts block pointer and keyboard actions; a valid draft saves once',async()=>{
    await select(climate);const view=await page.locator('#world').getAttribute('transform');await page.locator('#selection-padding').click();await page.locator('#edit-padding-left').fill('-5');await page.locator('#btn-fit').click();assert(await page.locator('#edit-error').isVisible());assert.equal(await page.locator('#world').getAttribute('transform'),view);
    let downloads=0;const onDownload=()=>downloads++;page.on('download',onDownload);await page.keyboard.press('Control+s');await page.waitForTimeout(100);assert.equal(downloads,0);assert(await page.locator('#edit-error').isVisible());await page.locator('#edit-padding-left').fill('31.5');const m=await snapshot();assert.equal(obj(m,climate).padding.left,31.5);assert.equal(downloads,1);page.off('download',onDownload);await page.locator('#btn-undo').click();assert.equal(obj(await snapshot(),climate).padding.left,28);await reset();
  });
  await test('click-away commits an edit and preserves hierarchy clicks and Properties input focus',async()=>{
    await select(launch);await hierarchy();await action('label');await page.locator('#edit-label').fill('Fresh orchard fleet');await page.locator(`[data-tree-id="${pantry}"] .tree-object`).click();assert((await page.locator('#selection-name').innerText()).includes('Rooftop pantry'));assert.equal(obj(await snapshot(),launch).label,'Fresh orchard fleet');await hierarchy(false);await reset();
    await select(launch);await action('color');await page.locator('#edit-backgroundColor').fill('#cffafe');assert.equal(await page.locator('#property-background-color').inputValue(),'#cffafe');await page.locator('#property-width').click();assert(await page.locator('#property-width').evaluate(el=>el===document.activeElement));await field('width',200);assert.equal(obj(await snapshot(),launch).width,200);await reset();
  });
  await test('UI-12: label leaders and independent route/label reset commands keep their existing behavior',async()=>{
    await select(dispatch);await page.locator('#selection-waypoint').click();await click(435,330);await drag(page.locator(`.edge-label[data-object-id="${dispatch}"]>rect`),-35,-70);assert.equal(await page.locator(`.edge-label[data-object-id="${dispatch}"] .edge-label-leader`).count(),2);const manual=await snapshot();
    await action('reset-route');const routeReset=await snapshot();assert(!obj(routeReset,dispatch).waypoints);assert.deepEqual(obj(routeReset,dispatch).labelPosition,obj(manual,dispatch).labelPosition);await action('reset-label');assert(!obj(await snapshot(),dispatch).labelPosition);await reset();
  });
  await test('UI-15/16: keyboard menus, focus return, waypoint deletion, and endpoint controls work',async()=>{
    await select(launch);await page.locator('#viewport').focus();await page.keyboard.press('Shift+F10');await page.keyboard.press('Enter');assert(await page.locator('#edit-label').evaluate(el=>el===document.activeElement));await page.locator('#edit-label').fill('Keyboard fleet');await page.keyboard.press('Escape');assert(await page.locator('#viewport').evaluate(el=>el===document.activeElement));
    await page.locator('#btn-selection-more').focus();await page.keyboard.press('Enter');await page.keyboard.press('End');await page.keyboard.press('Escape');assert(await page.locator('#btn-selection-more').evaluate(el=>el===document.activeElement));
    await select(radar);await page.locator(`[data-reconnect="${radar}"][data-end=source]`).focus();await page.keyboard.press('Enter');assert(await page.locator('#attachment-side').evaluate(el=>el===document.activeElement));await page.keyboard.press('Escape');await reset();
  });
  for(const [width,height]of[[1024,768],[1800,1100]])await test(`UI-15: stable bars and menus at every canvas corner at ${width} × ${height}`,async()=>{
    await page.setViewportSize({width,height});await hierarchy(false);await page.locator('#btn-fit').click();const before=await page.locator('#canvas').boundingBox();
    for(const identity of[launch,radar,climate]){await select(identity);assert.equal((await page.locator('#canvas').boundingBox()).y,before.y);}
    const b=await page.locator('#canvas').boundingBox();for(const [x,y]of[[b.x+8,b.y+8],[b.x+b.width-8,b.y+8],[b.x+8,b.y+b.height-130],[b.x+b.width-8,b.y+b.height-130]]){await page.mouse.click(x,y,{button:'right'});await popupFits();await page.keyboard.press('Escape');}
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  });
  await test('UI-17/19: save/open, source edits, auto layout, and exports retain preferences and hide controls',async()=>{
    await reset();await select(dispatch);await page.locator('#selection-waypoint').click();await click(435,330);await label('Dispatch orchard flight');const saved=await snapshot(artifact('edited-orchard.mermaid-project.json'));await open(artifact('edited-orchard.mermaid-project.json'));assert.deepEqual(data(await snapshot()),data(saved));
    await global('source');const source=await page.locator('#editor').inputValue();await page.locator('#editor').fill(source+'\n%% Retain the orchard arrangement\n');await page.locator('#btn-apply').click();await ready();assert.deepEqual(obj(await snapshot(),dispatch).waypoints,obj(saved,dispatch).waypoints);await global('source');
    const before=await snapshot();await page.locator('#btn-layout').click();await ready();await page.locator('#btn-undo').click();assert.deepEqual(data(await snapshot()),data(before));
    for(const format of['svg','png','mermaid']){await page.locator('#export-format').selectOption(format);const event=page.waitForEvent('download');await global('export');await(await event).saveAs(artifact('orchard-export.'+(format==='mermaid'?'mmd':format)));}
    const svg=fs.readFileSync(artifact('orchard-export.svg'),'utf8');assert(!/editing-overlay|selection-bar|data-reconnect|resize-handle|waypoint-handle/.test(svg));assert(fs.statSync(artifact('orchard-export.png')).size>1000);await reset();
  });
  await test('UI-18: deleting a waypoint, connection, node, and zone targets the named object and undoes once',async()=>{
    await select(dispatch);await page.locator('#selection-waypoint').click();await click(435,330);await action('remove-waypoint');assert.equal(obj(await snapshot(),dispatch).waypoints.length,0);await page.locator('#btn-undo').click();assert.equal(obj(await snapshot(),dispatch).waypoints.length,1);await reset();
    for(const identity of[radar,launch,climate]){await select(identity);const before=await snapshot();await action('delete');const after=await snapshot();assert(!obj(after,identity));if(identity===climate){assert(obj(after,charge));assert.equal(obj(after,charge).parentId,flight);}await page.locator('#btn-undo').click();assert.deepEqual(data(await snapshot()),data(before));}
  });
  await test('UI-14: mobile exposes all actions, sheet controls, and no horizontal overflow',async()=>{
    await page.setViewportSize({width:390,height:844});await page.reload();await ready();assert(await page.locator('.properties-panel').isHidden());assert(await page.locator('#source-panel').isHidden());await reset();await page.locator('#btn-fit').click();
    for(const identity of[launch,radar,climate]){await select(identity);await page.locator('#btn-selection-more').click();await popupFits();await page.locator('#editing-overlay [data-command=details]').click();assert(await page.locator('.properties-panel').isVisible());assert((await page.locator('.properties-panel').boundingBox()).height<=844*.8+1);await page.locator('#btn-close-properties').click();}
    await action('details');const name=await page.locator('#selection-name').innerText();await page.keyboard.press('Escape');assert(await page.locator('.properties-panel').isHidden());assert.equal(await page.locator('#selection-name').innerText(),name);
    for(const width of[320,390,600,850]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);const buttons=page.locator('.toolbar button:visible,.selection-bar button:visible');for(const b of await buttons.all()){const box=await b.boundingBox();assert(box.width>=44&&box.height>=44);}}
    await page.setViewportSize({width:390,height:844});
  });
  await test('UI-13: real touch tap, long-press, drag, second touch, and placement tools avoid accidental edits',async()=>{
    await page.close();const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,acceptDownloads:true});page=await context.newPage();watch(page);await page.goto(base+'/viewer.html');await ready();await reset();await page.locator('#btn-fit').tap();await select(launch);
    const before=await snapshot(),client=await context.newCDPSession(page);
    async function touch(type,points){await client.send('Input.dispatchTouchEvent',{type,touchPoints:points});}
    const shape=await page.locator(`.diagram-node[data-object-id="${launch}"]`).boundingBox(),p={x:shape.x+shape.width/2,y:shape.y+shape.height/2,id:1};
    await touch('touchStart',[p]);await page.waitForTimeout(560);await touch('touchEnd',[]);assert(await page.locator('#editing-overlay [data-command=label]').isVisible());await page.keyboard.press('Escape');assert.deepEqual(data(await snapshot()),data(before));
    await touch('touchStart',[p]);await touch('touchMove',[{...p,x:p.x+12}]);await page.waitForTimeout(560);assert(await page.locator('#editing-overlay').isHidden());await touch('touchEnd',[]);assert.notDeepEqual(data(await snapshot()),data(before));await page.locator('#btn-undo').tap();assert.deepEqual(data(await snapshot()),data(before));
    await touch('touchStart',[p]);await touch('touchStart',[p,{x:p.x+45,y:p.y+45,id:2}]);await page.waitForTimeout(560);await touch('touchEnd',[]);assert(await page.locator('#editing-overlay').isHidden());assert.deepEqual(data(await snapshot()),data(before));
    await tool('node');await touch('touchStart',[p]);await page.waitForTimeout(560);await touch('touchEnd',[]);assert(await page.locator('#editing-overlay').isVisible());await page.keyboard.press('Escape');assert.deepEqual(data(await snapshot()),data(before));await tool('select');
    await select(radar);const pin=await page.locator(`[data-reconnect="${radar}"][data-end=source]`).boundingBox();await page.touchscreen.tap(pin.x+pin.width/2,pin.y+pin.height/2);assert(await page.locator('#attachment-side').isVisible());await page.locator('.attachment-tabs [data-end=target]').tap();assert((await page.locator('#editing-overlay h2').innerText()).includes('Storm clear?'));await page.locator('#attachment-close').tap();
    while(Number((await page.locator('#zoom-text').innerText()).replace('%',''))<85)await page.locator('#btn-zoom-in').tap();await select(radar);
    async function hold(locator){const b=await locator.boundingBox();await touch('touchStart',[{x:b.x+b.width/2,y:b.y+b.height/2,id:1}]);await page.waitForTimeout(560);await touch('touchEnd',[]);}
    await hold(page.locator(`[data-reconnect="${radar}"][data-end=source]`));assert(await page.locator('#attachment-side').isVisible());await page.locator('#attachment-close').tap();
    const routeStart=await page.locator(`[data-object-id="${radar}"] .edge-hit`).evaluate(el=>{const p=el.getPointAtLength(0);return{x:p.x,y:p.y};});await action('waypoint');await click(routeStart.x-40,routeStart.y+70);
    await hold(page.locator(`[data-waypoint="${radar}"]`));assert(await page.locator('#editing-overlay [data-command=remove-waypoint]').isVisible());await page.keyboard.press('Escape');
    await hold(page.locator(`.edge-label[data-object-id="${radar}"]>rect`));assert(await page.locator('#editing-overlay [data-command=label]').isVisible());assert.equal(await page.locator('#editing-overlay [data-command]').count(),3);await page.keyboard.press('Escape');
    const canvas=await page.locator('#canvas').boundingBox();await touch('touchStart',[{x:canvas.x+8,y:canvas.y+8,id:1}]);await page.waitForTimeout(560);await touch('touchEnd',[]);assert(await page.locator('#editing-overlay [data-command=node]').isVisible());await page.keyboard.press('Escape');await client.detach();
  });
  await test('finish the user session with mobile and desktop screenshots of the new controls',async()=>{
    await reset();await page.locator('#btn-fit').tap();while(Number((await page.locator('#zoom-text').innerText()).replace('%',''))<100)await page.locator('#btn-zoom-in').tap();await select(launch);await page.screenshot({path:artifact('mobile.png')});await page.locator('#btn-selection-more').tap();await page.screenshot({path:artifact('mobile-menu.png')});await page.keyboard.press('Escape');
    await page.close();page=await browser.newPage({viewport:{width:1800,height:1100},acceptDownloads:true});watch(page);await page.goto(base+'/viewer.html');await ready();await open(artifact('floating-orchard.mermaid-project.json'));await hierarchy(false);await page.locator('#btn-fit').click();await select(radar);await page.locator('#selection-attachments').click();await page.screenshot({path:artifact('desktop-attachments.png')});await page.locator('#attachment-close').click();await select(launch);await page.screenshot({path:artifact('desktop.png')});
  });
  assert.deepEqual(errors,[]);fs.rmSync(artifact('failure.png'),{force:true});fs.writeFileSync(artifact('results.json'),JSON.stringify({passed:results.length,total:results.length,results,errors},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
