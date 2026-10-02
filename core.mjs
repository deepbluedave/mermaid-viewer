import {clearanceTranslation,NODE_GAP,containingZone} from './geometry.mjs?v=whole-words';
export {NODE_GAP} from './geometry.mjs?v=whole-words';
export const shapes = ['rectangle', 'rounded', 'diamond', 'circle', 'cylinder'];
export const directions = ['TD', 'LR', 'BT', 'RL'];
export const copy = value => structuredClone(value);
export function emptyModel() {
  return { version: 1, nodes: [], zones: [], edges: [], settings: { direction: 'TD', layout: 'adaptive', grid: false, guides: true, fontSize:13, view: { x: 0, y: 0, scale: 1 } } };
}
export const diagramFontSize = model => model.settings.fontSize ?? 13;
export const zoneHeaderHeight = model => Math.max(30,diagramFontSize(model)+16);
export function darkenColor(hex,amount=.08){return '#'+hex.slice(1).match(/../g).map(channel=>Math.round(parseInt(channel,16)*(1-amount)).toString(16).padStart(2,'0')).join('');}
export function objectColors(model,n,seen=new Set()) {
  const zone=model.zones.includes(n),parent=object(model,n.parentId);seen.add(n.id);
  const inherited=zone&&parent&&!seen.has(parent.id)?objectColors(model,parent,seen):null;
  const background=n.backgroundColor||(zone?(inherited?darkenColor(inherited.background,.055):'#eef2f6'):'#ffffff');
  return{background,font:n.fontColor||(zone?(inherited?.font||'#475569'):'#1e293b'),header:darkenColor(background,.09)};
}
export function items(model) { return [...model.zones, ...model.nodes]; }
export function object(model, id) { return items(model).find(n => n.id === id) || model.edges.find(e => e.id === id); }
export function labelLines(label, width = 24) {
  return String(label).split('\n').flatMap(line => {
    if (!line) return [''];
    const out = []; let current = '';
    for (const word of line.split(/\s+/)) {
      if (current && current.length + word.length + 1 > width) { out.push(current); current = ''; }
      current += (current ? ' ' : '') + word;
    }
    if (current) out.push(current);
    return out.length ? out : [''];
  });
}
let measureText = (text, size) => Array.from(text).reduce((w,c)=>w+(/[\u2E80-\uFFFF]|\p{Extended_Pictographic}/u.test(c)?size:size*.6),0);
export function configureTextMeasure(measure) { measureText = measure; }
export const textWidth = (text, size = 13) => measureText(String(text),size);
export function wrapText(text,maxWidth,fontSize=13) {
  return String(text).split('\n').flatMap(line=>{
    if(!line)return [''];const out=[];let current='';
    for(const word of line.split(/\s+/)){
      if(current&&textWidth(current+' '+word,fontSize)>maxWidth){out.push(current);current='';}
      current+=(current?' ':'')+word;
    }
    if(current)out.push(current);return out.length?out:[''];
  });
}
function shapeTextCandidates(label,fontSize,requestedWidth) {
  const paragraphs=String(label).split('\n'),words=paragraphs.flatMap(line=>line.split(/\s+/)).filter(Boolean),natural=Math.max(fontSize,...paragraphs.map(line=>textWidth(line,fontSize)));
  const widths=new Set([natural,Math.max(fontSize,requestedWidth),...words.slice(0,32).map(word=>textWidth(word,fontSize))]);
  for(let i=0;i<=16;i++)widths.add(fontSize*Math.pow(natural/fontSize,i/16));
  const candidates=new Map();for(const width of widths){const lines=wrapText(label,Math.max(fontSize,width),fontSize);candidates.set(lines.join('\n'),{lines,textW:Math.max(0,...lines.map(line=>textWidth(line,fontSize))),textH:lines.length*Math.ceil(fontSize*1.35)});}
  return[...candidates.values()];
}
export function nodeMetrics(node,fontSize=13) {
  if(node.container){const width=Math.max(minimumTitleWidth(node,fontSize),node.width,node.manualSize?.width||0),height=Math.max(100,node.height,node.manualSize?.height||0),n={...node,width,height};if(node.shape==='circle')n.width=n.height=Math.max(width,height);return{...containerTitleMetrics(n,fontSize),width:n.width,height:n.height};}
  const manual=node.manualSize,lineHeight=Math.ceil(fontSize*1.35);
  if(manual&&['circle','diamond'].includes(node.shape)){
    const w=Math.max(80,manual.width),h=Math.max(60,manual.height),diameter=Math.max(w,h);
    const candidates=shapeTextCandidates(node.label,fontSize,node.shape==='circle'?diameter*.72-24:w*.6-24).map(c=>{
      if(node.shape==='circle'){const required=Math.max(80,Math.hypot(c.textW+24,c.textH+24)+8);return{...c,width:Math.max(diameter,required),height:Math.max(diameter,required),growth:required/diameter};}
      const width=Math.max(w,(c.textW+24)/.7),height=Math.max(h,(c.textH+20)/(.94-(c.textW+24)/width));return{...c,width,height,growth:Math.max(width/w,height/h)};
    });
    const fits=candidates.filter(c=>c.growth<=1+1e-7),narrow=node.shape==='diamond'?candidates.filter(c=>c.width<=w+1e-7):[],options=narrow.length?narrow:candidates,best=(fits.length?fits.sort((a,b)=>a.lines.length-b.lines.length||a.growth-b.growth):options.sort((a,b)=>a.growth-b.growth||a.lines.length-b.lines.length))[0];return{lines:best.lines,lineHeight,width:best.width,height:best.height};
  }
  const lines=manual?wrapText(node.label,Math.max(48,manual.width-32),fontSize):labelLines(node.label),textW=Math.max(0,...lines.map(l=>textWidth(l,fontSize))),textH=lines.length*lineHeight;
  const w=Math.max(120,textW+32),h=Math.max(54,textH+28);let width=w,height=h;
  if(node.shape==='circle')width=height=Math.hypot(w,h)+12;
  else if(node.shape==='diamond'){width=w*2;height=h*2;}
  else if(node.shape==='cylinder')height+=16;
  if(manual){width=Math.max(80,manual.width,textW+32);height=Math.max(node.shape==='cylinder'?56:40,manual.height,textH+28+(node.shape==='cylinder'?16:0));}
  return{lines,lineHeight,width,height};
}
export const containers=model=>items(model).filter(n=>model.zones.includes(n)||n.container);
export const isContainer=(model,n)=>Boolean(n&&(model.zones.includes(n)||n.container));
export function isAncestor(model,id,childId){let parent=object(model,childId)?.parentId;const seen=new Set();while(parent&&!seen.has(parent)){if(parent===id)return true;seen.add(parent);parent=object(model,parent)?.parentId;}return false;}
export const related=(model,a,b)=>a.id===b.id||isAncestor(model,a.id,b.id)||isAncestor(model,b.id,a.id);
const insetRatio=n=>n.shape==='circle'?.2:n.shape==='diamond'?.26:0;
function minimumTitleWidth(n,fontSize){const wordWidth=Math.max(0,...String(n.label).split(/\s+/).map(word=>textWidth(word,fontSize)));return Math.max(160,(wordWidth+32)/(1-2*insetRatio(n)));}
export function containerTitleMetrics(n,fontSize=13){const ratio=insetRatio(n),lines=wrapText(n.label,Math.max(fontSize,n.width*(1-2*ratio)-32),fontSize),lineHeight=Math.ceil(fontSize*1.35);return{lines,lineHeight,height:Math.max(30,lines.length*lineHeight+14)};}
export function containerTitleBox(model,n){const ratio=insetRatio(n),height=model.zones.includes(n)?zoneHeaderHeight(model):containerTitleMetrics(n,diagramFontSize(model)).height;return{x:n.x+n.width*ratio,y:n.y+n.height*ratio+(n.shape==='cylinder'?12:0),width:n.width*(1-2*ratio),height};}
export function containerContentBox(model,n){const ratio=insetRatio(n),title=containerTitleBox(model,n),bottom=n.shape==='cylinder'?30:20;return{x:n.x+n.width*ratio+20,y:title.y+title.height+14,width:Math.max(1,n.width*(1-2*ratio)-40),height:Math.max(1,n.y+n.height*(1-ratio)-bottom-title.y-title.height-14)};}
function insideNode(n,x,y){
  const dx=(x-n.x-n.width/2)/(n.width/2),dy=(y-n.y-n.height/2)/(n.height/2);
  if(Math.abs(dx)>1||Math.abs(dy)>1)return false;
  if(n.shape==='circle')return dx*dx+dy*dy<=1;
  if(n.shape==='diamond')return Math.abs(dx)+Math.abs(dy)<=1;
  if(n.shape==='cylinder'&&(y<n.y+10||y>n.y+n.height-10)){const cy=y<n.y+10?n.y+10:n.y+n.height-10;return dx*dx+((y-cy)/10)**2<=1;}
  return true;
}
export function containingParent(model,item,excluded=new Set(),reference=containers(model),{allowNodes=false}={}){
  const x=item.x+item.width/2,y=item.y+item.height/2;
  return reference.filter(n=>{if(excluded.has(n.id))return false;if(!n.shape)return x>=n.x&&x<=n.x+n.width&&y>=n.y+zoneHeaderHeight(model)&&y<=n.y+n.height;if(!n.container)return allowNodes&&insideNode(n,x,y);const b=containerContentBox(model,n);return x>=b.x&&x<=b.x+b.width&&y>=b.y&&y<=b.y+b.height;}).sort((a,b)=>depth(model,b)-depth(model,a)||a.width*a.height-b.width*b.height)[0]?.id||null;
}
export function setNodeContainer(model,id,enabled,{expand=true,centred=false}={}){
  const n=object(model,id);if(!model.nodes.includes(n))throw new Error('Choose a node.');
  if(enabled){const cx=n.x+n.width/2,cy=n.y+n.height/2;if(!n.container&&n.manualSize)n.containerSize=copy(n.manualSize);n.container=true;n.width=Math.max(n.width,320);n.height=Math.max(n.height,240);if(n.shape==='circle')n.width=n.height=Math.max(n.width,n.height);if(n.manualSize)n.manualSize={width:n.width,height:n.height};if(centred){n.x=cx-n.width/2;n.y=cy-n.height/2;}}
  else{for(const child of items(model).filter(c=>c.parentId===id))child.parentId=n.parentId;delete n.container;if(n.containerSize)n.manualSize=copy(n.containerSize);else delete n.manualSize;delete n.containerSize;resizeNode(n,diagramFontSize(model));}
  if(expand)expandZones(model);
}
function collapseEmptyParents(model,ids){for(const id of ids){const n=model.nodes.find(n=>n.id===id);if(n?.container&&!items(model).some(child=>child.parentId===id))setNodeContainer(model,id,false,{expand:false});}}
export function resizeNode(node,fontSize=13) {
  const cx = node.x + node.width / 2, cy = node.y + node.height / 2;
  const metrics=nodeMetrics(node,fontSize);node.width=metrics.width;node.height=metrics.height;
  node.x = cx - node.width / 2; node.y = cy - node.height / 2;
}
// Grow legacy project geometry only when its labels no longer fit. Retain
// centres, manual size preferences and any existing extra room.
export function ensureLabelFit(model){
  for(const node of model.nodes){
    const metrics=nodeMetrics(node,diagramFontSize(model));
    const textW=Math.max(0,...metrics.lines.map(line=>textWidth(line,diagramFontSize(model)))),textH=metrics.lines.length*metrics.lineHeight;
    const fits=node.container?textW+32<=node.width*(1-2*insetRatio(node))+1e-7:node.shape==='circle'?Math.hypot(textW+24,textH+24)+8<=Math.min(node.width,node.height)+1e-7:node.shape==='diamond'?(textW+24)/node.width+(textH+20)/node.height<=.94+1e-7:textW+32<=node.width+1e-7&&textH+28+(node.shape==='cylinder'?16:0)<=node.height+1e-7;
    if(fits)continue;
    const width=Math.max(node.width,metrics.width),height=Math.max(node.height,metrics.height),diameter=Math.max(width,height);
    const nextWidth=node.shape==='circle'?diameter:width,nextHeight=node.shape==='circle'?diameter:height;
    node.x-=(nextWidth-node.width)/2;node.y-=(nextHeight-node.height)/2;node.width=nextWidth;node.height=nextHeight;
  }
}
export function setNodeSize(node,width,height,fontSize=13) {
  node.manualSize={width,height};if(node.container){node.width=width;node.height=height;}const metrics=nodeMetrics(node,fontSize);node.width=metrics.width;node.height=metrics.height;
}
export function descendants(model, id) {
  const result = new Set([id]); let changed = true;
  while (changed) { changed = false; for (const n of items(model)) if (result.has(n.parentId) && !result.has(n.id)) { result.add(n.id); changed = true; } }
  return result;
}
export function movableIds(model, selection) {
  const ids = new Set(); for (const id of selection) if (object(model, id) && !model.edges.some(e => e.id === id)) for (const child of descendants(model, id)) ids.add(child);
  return ids;
}
export function moveSelection(model, selection, dx, dy, {expand=true,spacing=false}={}) {
  const ids = movableIds(model, selection);
  for (const n of items(model)) if (ids.has(n.id)) { n.x += dx; n.y += dy; }
  if(spacing)separateSelection(model,selection);
  if(expand)expandZones(model);
}
export function separateSelection(model,selection) {
  const ids=movableIds(model,selection),roots=items(model).filter(n=>selection.has(n.id)&&!ids.has(n.parentId));
  const moving=[...roots.filter(n=>isContainer(model,n)),...model.nodes.filter(n=>ids.has(n.id)&&!roots.some(root=>root.id!==n.id&&isAncestor(model,root.id,n.id)))],fixed=model.nodes.filter(n=>!ids.has(n.id)&&!roots.some(root=>related(model,root,n)));
  const delta=clearanceTranslation(moving,fixed);for(const n of items(model))if(ids.has(n.id)){n.x+=delta.x;n.y+=delta.y;}return delta;
}
export function ensureNodeSpacing(model,{preferredIds=new Set(model.nodes.map(n=>n.id)),axis=null}={}) {
  const fixed=model.nodes.filter(n=>!preferredIds.has(n.id));
  for(const n of model.nodes.filter(n=>preferredIds.has(n.id))){const delta=clearanceTranslation([n],fixed.filter(other=>!related(model,n,other)),{axis});moveSelection(model,new Set([n.id]),delta.x,delta.y,{expand:false});fixed.push(n);}return model;
}
export function ensureLayoutSpacing(model){
  expandZones(model);const parents=[...containers(model).sort((a,b)=>depth(model,b)-depth(model,a)).map(n=>n.id),null];
  for(const parent of parents){const fixed=[];for(const n of items(model).filter(n=>n.parentId===parent).sort((a,b)=>Number(isContainer(model,b))-Number(isContainer(model,a)))){const delta=clearanceTranslation([n],fixed,{axis:['LR','RL'].includes(model.settings.direction)?'x':'y'});moveSelection(model,new Set([n.id]),delta.x,delta.y,{expand:false});fixed.push(n);}expandZones(model);}return model;
}
export function dropParents(model,selection,referenceZones=items(model)) {
  const ids=movableIds(model,selection),roots=items(model).filter(n=>selection.has(n.id)&&!ids.has(n.parentId));return new Map(roots.map(n=>[n.id,containingParent(model,n,ids,referenceZones,{allowNodes:true})]));
}
export function dropSelection(model,selection,referenceZones=items(model),parents=dropParents(model,selection,referenceZones),{expand=true}={}) {
  const previous=new Set();
  for(const [id,parent]of parents){const n=object(model,id);if(!n||model.edges.includes(n)||parent&&(!object(model,parent)||model.edges.includes(object(model,parent))||descendants(model,id).has(parent)))throw new Error('Invalid drop parent.');previous.add(n.parentId);}
  for(const [id,parent]of parents){const n=object(model,parent);if(n&&model.nodes.includes(n)&&!n.container)setNodeContainer(model,parent,true,{expand:false,centred:true});object(model,id).parentId=parent;}
  collapseEmptyParents(model,previous);
  if(expand)expandZones(model);
}
export function depth(model, item) {
  let count = 0, parent = item.parentId; const seen = new Set();
  while (parent && !seen.has(parent)) { seen.add(parent); count++; parent = object(model,parent)?.parentId; }
  return count;
}
export function expandZones(model) {
  for(const n of [...containers(model)].sort((a,b)=>depth(model,b)-depth(model,a))){
    const zone=model.zones.includes(n),ratio=insetRatio(n),font=diagramFontSize(model),minimumWidth=Math.max(160,zone?textWidth(n.label,font)+32:minimumTitleWidth(n,font));if(n.width<minimumWidth-1e-7)n.width=minimumWidth;n.height=Math.max(n.height,100);
    if(n.shape==='circle')n.width=n.height=Math.max(n.width,n.height);
    const title=containerTitleBox(model,n),minimum=(title.height+60+(n.shape==='cylinder'?12:0))/(1-2*ratio);n.height=Math.max(n.height,minimum);if(n.shape==='circle')n.width=n.height=Math.max(n.width,n.height);
    const box=containerContentBox(model,n),children=items(model).filter(c=>c.parentId===n.id);if(!children.length||children.every(c=>c.x>=box.x-1e-7&&c.y>=box.y-1e-7&&c.x+c.width<=box.x+box.width+1e-7&&c.y+c.height<=box.y+box.height+1e-7))continue;
    const left=Math.min(box.x,...children.map(c=>c.x)),top=Math.min(box.y,...children.map(c=>c.y)),right=Math.max(box.x+box.width,...children.map(c=>c.x+c.width)),bottom=Math.max(box.y+box.height,...children.map(c=>c.y+c.height));
    const header=containerTitleBox(model,n).height+(n.shape==='cylinder'?12:0),bottomPad=n.shape==='cylinder'?30:20;
    let width=(right-left+40)/(1-2*ratio),height=(bottom-top+header+14+bottomPad)/(1-2*ratio);if(n.shape==='circle')width=height=Math.max(width,height);
    n.x=left-20-width*ratio;n.y=top-header-14-height*ratio;n.width=width;n.height=height;
  }
}
export function reparent(model,id,parentId){
  const n=object(model,id);if(!n||model.edges.includes(n))throw new Error('Choose a node or zone.');parentId||=null;
  const parent=object(model,parentId);if(parentId&&(!parent||model.edges.includes(parent)||descendants(model,id).has(parentId)))throw new Error('A container cannot contain itself or its ancestors.');if(n.parentId===parentId)return;
  const previousParent=n.parentId;let oldRoot=object(model,n.parentId);while(oldRoot?.parentId)oldRoot=object(model,oldRoot.parentId);
  if(parent&&model.nodes.includes(parent)&&!parent.container)setNodeContainer(model,parent.id,true);
  const box=parent?containerContentBox(model,parent):null,x=box?box.x+4:oldRoot?oldRoot.x+oldRoot.width+NODE_GAP:n.x,y=box?box.y+4:n.y;n.parentId=parentId;
  moveSelection(model,new Set([id]),x-n.x,y-n.y,{expand:false,spacing:true});collapseEmptyParents(model,new Set([previousParent]));expandZones(model);
}
export function deleteSelection(model, selection) {
  const selected = new Set(selection);
  const previousParents=new Set(items(model).filter(n=>selected.has(n.id)).map(n=>n.parentId));
  for (const z of [...containers(model)].sort((a, b) => depth(model, b) - depth(model, a))) if (selected.has(z.id)) {
    for (const n of items(model)) if (n.parentId === z.id) n.parentId = z.parentId;
  }
  model.zones = model.zones.filter(z => !selected.has(z.id));
  model.nodes = model.nodes.filter(n => !selected.has(n.id));
  model.edges = model.edges.filter(e => !selected.has(e.id) && !selected.has(e.source) && !selected.has(e.target));
  collapseEmptyParents(model,previousParents);
}
export function nextId(model, prefix) {
  const used = new Set([...items(model), ...model.edges].map(n => n.id)); let i = 1;
  while (used.has(prefix + i)) i++;
  return prefix + i;
}
export function groupSelection(model, selection, label = 'New zone') {
  const selected = items(model).filter(n => selection.has(n.id));
  const roots = selected.filter(n => !selected.some(other => other.id !== n.id && descendants(model, other.id).has(n.id)));
  if (!roots.length) throw new Error('Select nodes or zones to group.');
  const ancestors = n => { const parents = []; let id = n.parentId; while(id){parents.push(id);id=object(model,id)?.parentId;} parents.push(null);return parents; };
  const parentId = ancestors(roots[0]).find(id=>roots.every(n=>ancestors(n).includes(id)));
  const x = Math.min(...roots.map(n => n.x)) - 24, y = Math.min(...roots.map(n => n.y)) - 48;
  const zone = { id: nextId(model, 'Zone'), label, parentId, x, y,
    width: Math.max(180, Math.max(...roots.map(n => n.x + n.width)) + 24 - x),
    height: Math.max(120, Math.max(...roots.map(n => n.y + n.height)) + 24 - y) };
  model.zones.push(zone); for (const n of roots) n.parentId = zone.id; expandZones(model); return zone;
}
export function arrange(model, selection, command) {
  const selected = items(model).filter(n => selection.has(n.id));
  const roots = selected.filter(n => !selected.some(o => o.id !== n.id && descendants(model, o.id).has(n.id)));
  if (roots.length < (command.startsWith('distribute') ? 3 : 2)) throw new Error(command.startsWith('distribute') ? 'Select at least three objects to distribute.' : 'Select at least two objects to align.');
  const left = Math.min(...roots.map(n => n.x)), right = Math.max(...roots.map(n => n.x + n.width));
  const top = Math.min(...roots.map(n => n.y)), bottom = Math.max(...roots.map(n => n.y + n.height));
  if (command.startsWith('distribute')) {
    const horizontal = command === 'distribute-x', axis = horizontal ? 'x' : 'y', size = horizontal ? 'width' : 'height';
    const sorted = roots.sort((a, b) => a[axis] - b[axis]);
    const extent = sorted.at(-1)[axis] + sorted.at(-1)[size] - sorted[0][axis];
    const gap = Math.max(NODE_GAP,(extent - sorted.reduce((sum, n) => sum + n[size], 0)) / (sorted.length - 1));
    let position = sorted[0][axis];
    for (const n of sorted) { const diff = position - n[axis]; moveSelection(model, new Set([n.id]), horizontal ? diff : 0, horizontal ? 0 : diff); position += n[size] + gap; }
  } else for (const n of roots) {
    let dx = 0, dy = 0;
    if (command === 'left') dx = left - n.x;
    if (command === 'center-x') dx = (left + right - n.width) / 2 - n.x;
    if (command === 'right') dx = right - n.x - n.width;
    if (command === 'top') dy = top - n.y;
    if (command === 'center-y') dy = (top + bottom - n.height) / 2 - n.y;
    if (command === 'bottom') dy = bottom - n.y - n.height;
    moveSelection(model, new Set([n.id]), dx, dy);
  }
}
const encodeLabel = text => String(text).replace(/[&"#<>ﬂ°¶ß]/g, c => ({ '&': '#38;', '"': '#quot;', '#': '#35;', '<': '#60;', '>': '#62;' }[c] || `#${c.codePointAt(0)};`)).replace(/\n/g, '<br/>') || '#8203;';
export function toMermaid(model) {
  const source = [`flowchart ${model.settings.direction}`];
  for(const n of model.nodes.filter(n=>n.container))source.push('  %% diagram-studio-container '+JSON.stringify({id:n.id,shape:n.shape}));
  function emit(parentId,indent){
    for(const n of items(model).filter(n=>n.parentId===parentId)){
      if(isContainer(model,n)){source.push(`${indent}subgraph ${n.id}["${encodeLabel(n.label)}"]`);emit(n.id,indent+'  ');source.push(`${indent}end`);continue;}
      const label=`"${encodeLabel(n.label)}"`,wrappers={rectangle:['[',']'],rounded:['(',')'],diamond:['{','}'],circle:['((', '))'],cylinder:['[(',')]']}[n.shape];source.push(`${indent}${n.id}${wrappers[0]}${label}${wrappers[1]}`);
    }
  }
  emit(null, '  ');
  for (const e of model.edges) {
    const link = { normal: {forward:'-->', both:'<-->', none:'---'}, dashed: {forward:'-.->', both:'<-.->', none:'-.-'}, thick: {forward:'==>', both:'<==>', none:'==='} }[e.style][e.direction];
    source.push(`  ${e.source} ${e.id}@${link}${e.label ? `|"${encodeLabel(e.label)}"|` : ''} ${e.target}`);
  }
  return source.join('\n') + '\n';
}
export function validateModel(input) {
  if (!input || input.version !== 1 || !Array.isArray(input.nodes) || !Array.isArray(input.zones) || !Array.isArray(input.edges)) throw new Error('Not a supported version 1 diagram project.');
  const model = copy(input); const ids = new Set();
  if (items(model).length > 500 || model.edges.length > 1000) throw new Error('This project exceeds 500 objects or 1000 connections.');
  for (const n of [...items(model), ...model.edges]) {
    if (!/^[A-Za-z_][\w-]*$/.test(n.id) || ids.has(n.id)) throw new Error('Object IDs must be unique Mermaid identifiers.');
    ids.add(n.id);
    if (typeof n.label !== 'string' || n.label.length > 10000) throw new Error('Invalid object label.');
    for(const field of ['description','notes'])if(n[field]!==undefined&&(typeof n[field]!=='string'||n[field].length>(field==='notes'?100000:20000)))throw new Error(`Invalid object ${field}.`);
  }
  for (const n of items(model)) {
    for(const field of ['backgroundColor','fontColor'])if(n[field]!==undefined&&(typeof n[field]!=='string'||!/^#[\da-f]{6}$/i.test(n[field])))throw new Error('Use a six-digit hex color, such as #3b82f6.');
    for (const field of ['x', 'y', 'width', 'height']) if (!Number.isFinite(n[field]) || Math.abs(n[field]) > 1e6) throw new Error('Invalid object geometry.');
    if (n.width <= 0 || n.height <= 0) throw new Error('Object sizes must be positive.');
    n.parentId ||= null;
    if(n.parentId&&!isContainer(model,object(model,n.parentId)))throw new Error('A parent container is missing or is not enabled.');
    const seen = new Set([n.id]); let parent = n.parentId;
    while (parent) { if (seen.has(parent)) throw new Error('Containment contains a cycle.'); seen.add(parent); parent = object(model,parent)?.parentId; }
  }
  for (const n of model.nodes){if(n.container!==undefined&&typeof n.container!=='boolean')throw new Error('Invalid node container setting.');if (!shapes.includes(n.shape)) throw new Error(`Unsupported node shape: ${n.shape}`);for(const key of ['manualSize','containerSize'])if(n[key]!==undefined&&(!n[key]||typeof n[key]!=='object'||![n[key].width,n[key].height].every(v=>Number.isFinite(v)&&v>0&&v<=1e6)))throw new Error('Invalid manual node size.');}
  for (const e of model.edges) {
    if (!items(model).some(n => n.id === e.source) || !items(model).some(n => n.id === e.target)) throw new Error('An edge endpoint is missing.');
    if (!['normal', 'dashed', 'thick'].includes(e.style) || !['forward', 'both', 'none'].includes(e.direction) || !['orthogonal', 'straight'].includes(e.routing)) throw new Error('Unsupported edge style.');
    for (const side of [e.sourceSide, e.targetSide]) if (side && !['north','south','east','west'].includes(side)) throw new Error('Invalid attachment side.');
  }
  if (!directions.includes(model.settings?.direction) || !['adaptive','hierarchical'].includes(model.settings.layout) || typeof model.settings.grid !== 'boolean') throw new Error('Invalid layout settings.');
  if(model.settings.fontSize!==undefined&&(!Number.isInteger(model.settings.fontSize)||model.settings.fontSize<10||model.settings.fontSize>48))throw new Error('Choose a diagram font size between 10 and 48.');
  if(model.settings.guides!==undefined&&typeof model.settings.guides!=='boolean')throw new Error('Invalid alignment guide setting.');
  const view = model.settings.view;
  if (!view || ![view.x,view.y,view.scale].every(Number.isFinite) || view.scale < .02 || view.scale > 8) throw new Error('Invalid canvas view.');
  return model;
}
export class History {
  constructor() { this.past = []; this.future = []; }
  record(before, after) { if (JSON.stringify(before) === JSON.stringify(after)) return false; this.past.push(copy(before)); if (this.past.length > 100) this.past.shift(); this.future = []; return true; }
  undo(current) { if (!this.past.length) return null; this.future.push(copy(current)); return this.past.pop(); }
  redo(current) { if (!this.future.length) return null; this.past.push(copy(current)); return this.future.pop(); }
}
