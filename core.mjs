import {clearanceTranslation,NODE_GAP,containingZone} from './geometry.mjs?v=appearance-final';
export {NODE_GAP} from './geometry.mjs?v=appearance-final';
export const shapes = ['rectangle', 'rounded', 'diamond', 'circle', 'cylinder'];
export const directions = ['TD', 'LR', 'BT', 'RL'];
export const copy = value => structuredClone(value);
export function emptyModel() {
  return { version: 1, nodes: [], zones: [], edges: [], settings: { direction: 'TD', layout: 'adaptive', grid: false, guides: true, fontSize:13, view: { x: 0, y: 0, scale: 1 } } };
}
export const diagramFontSize = model => model.settings.fontSize ?? 13;
export const zoneHeaderHeight = model => Math.max(30,diagramFontSize(model)+16);
export const objectColors = (model,n) => ({background:n.backgroundColor||(model.zones.includes(n)?'#eef2f6':'#ffffff'),font:n.fontColor||(model.zones.includes(n)?'#475569':'#1e293b')});
export function items(model) { return [...model.zones, ...model.nodes]; }
export function object(model, id) { return items(model).find(n => n.id === id) || model.edges.find(e => e.id === id); }
export function labelLines(label, width = 24) {
  return String(label).split('\n').flatMap(line => {
    if (!line) return [''];
    const out = []; let current = '';
    for (const word of line.split(/\s+/)) {
      if (current && current.length + word.length + 1 > width) { out.push(current); current = ''; }
      if (word.length > width) {
        if (current) { out.push(current); current = ''; }
        const chars = Array.from(word);
        while (chars.length > width) out.push(chars.splice(0, width).join(''));
        current = chars.join('');
      } else current += (current ? ' ' : '') + word;
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
      if(textWidth(word,fontSize)>maxWidth){for(const char of Array.from(word)){if(current&&textWidth(current+char,fontSize)>maxWidth){out.push(current);current='';}current+=char;}}
      else current+=(current?' ':'')+word;
    }
    if(current)out.push(current);return out.length?out:[''];
  });
}
export function nodeMetrics(node,fontSize=13) {
  const manual=node.manualSize,wrap=manual&&!['circle','diamond'].includes(node.shape);
  const lines=wrap?wrapText(node.label,Math.max(48,manual.width-32),fontSize):labelLines(node.label);
  const lineHeight=Math.ceil(fontSize*1.35),textW=Math.max(0,...lines.map(l=>textWidth(l,fontSize))),textH=lines.length*lineHeight;
  const w=Math.max(120,textW+32),h=Math.max(54,textH+28);let width=w,height=h;
  if(node.shape==='circle')width=height=Math.hypot(w,h)+12;
  else if(node.shape==='diamond'){width=w*2;height=h*2;}
  else if(node.shape==='cylinder')height+=16;
  if(manual){
    if(node.shape==='circle')width=height=Math.max(width,manual.width,manual.height);
    else if(node.shape==='diamond'){width=Math.max(width,manual.width);height=Math.max(height,manual.height);}
    else{width=Math.max(80,manual.width,textW+32);height=Math.max(node.shape==='cylinder'?56:40,manual.height,textH+28+(node.shape==='cylinder'?16:0));}
  }
  return{lines,lineHeight,width,height};
}
export function resizeNode(node,fontSize=13) {
  const cx = node.x + node.width / 2, cy = node.y + node.height / 2;
  const metrics=nodeMetrics(node,fontSize);node.width=metrics.width;node.height=metrics.height;
  node.x = cx - node.width / 2; node.y = cy - node.height / 2;
}
export function setNodeSize(node,width,height,fontSize=13) {
  node.manualSize={width,height};const metrics=nodeMetrics(node,fontSize);node.width=metrics.width;node.height=metrics.height;
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
  const ids=movableIds(model,selection),zoneRoots=model.zones.filter(z=>selection.has(z.id)&&!ids.has(z.parentId));
  const moving=[...zoneRoots,...model.nodes.filter(n=>ids.has(n.id))],fixed=model.nodes.filter(n=>!ids.has(n.id));
  const delta=clearanceTranslation(moving,fixed);
  for(const n of items(model))if(ids.has(n.id)){n.x+=delta.x;n.y+=delta.y;}
  return delta;
}
export function ensureNodeSpacing(model,{preferredIds=new Set(model.nodes.map(n=>n.id)),axis=null}={}) {
  const fixed=model.nodes.filter(n=>!preferredIds.has(n.id));
  for(const n of model.nodes.filter(n=>preferredIds.has(n.id))){const delta=clearanceTranslation([n],fixed,{axis});n.x+=delta.x;n.y+=delta.y;fixed.push(n);}
  return model;
}
export function dropParents(model,selection,referenceZones=model.zones) {
  const ids=movableIds(model,selection),roots=items(model).filter(n=>selection.has(n.id)&&!ids.has(n.parentId));
  return new Map(roots.map(n=>[n.id,containingZone(referenceZones,n,ids,zoneHeaderHeight(model))]));
}
export function dropSelection(model,selection,referenceZones=model.zones,parents=dropParents(model,selection,referenceZones)) {
  for(const [id,parent]of parents)object(model,id).parentId=parent;
  expandZones(model);
}
export function depth(model, item) {
  let count = 0, parent = item.parentId; const seen = new Set();
  while (parent && !seen.has(parent)) { seen.add(parent); count++; parent = model.zones.find(z => z.id === parent)?.parentId; }
  return count;
}
export function expandZones(model) {
  for (const zone of [...model.zones].sort((a, b) => depth(model, b) - depth(model, a))) {
    zone.width = Math.max(zone.width,160,textWidth(zone.label,diagramFontSize(model))+32);
    zone.height = Math.max(zone.height,100);
    const children = items(model).filter(n => n.parentId === zone.id);
    if (!children.length) continue;
    const x = Math.min(zone.x, ...children.map(n => n.x - 20));
    const y = Math.min(zone.y, ...children.map(n => n.y - Math.max(44,zoneHeaderHeight(model)+14)));
    const right = Math.max(zone.x + zone.width, ...children.map(n => n.x + n.width + 20));
    const bottom = Math.max(zone.y + zone.height, ...children.map(n => n.y + n.height + 20));
    zone.x = x; zone.y = y; zone.width = right - x; zone.height = bottom - y;
  }
}
export function reparent(model, id, parentId) {
  const n = object(model, id); if (!n || model.edges.includes(n)) throw new Error('Choose a node or zone.');
  if (parentId && (!model.zones.some(z => z.id === parentId) || descendants(model, id).has(parentId))) throw new Error('A zone cannot contain itself or its ancestors.');
  parentId ||= null;if(n.parentId===parentId)return;
  const oldParent=model.zones.find(z=>z.id===n.parentId),parent=model.zones.find(z=>z.id===parentId);let oldRoot=oldParent;
  while(oldRoot?.parentId)oldRoot=model.zones.find(z=>z.id===oldRoot.parentId);
  const x=parent?parent.x+24:oldRoot?oldRoot.x+oldRoot.width+NODE_GAP:n.x;
  const y=parent?parent.y+Math.max(48,zoneHeaderHeight(model)+18):n.y;
  n.parentId=parentId;
  moveSelection(model,new Set([id]),x-n.x,y-n.y,{expand:false,spacing:true});expandZones(model);
}
export function deleteSelection(model, selection) {
  const selected = new Set(selection);
  for (const z of [...model.zones].sort((a, b) => depth(model, b) - depth(model, a))) if (selected.has(z.id)) {
    for (const n of items(model)) if (n.parentId === z.id) n.parentId = z.parentId;
  }
  model.zones = model.zones.filter(z => !selected.has(z.id));
  model.nodes = model.nodes.filter(n => !selected.has(n.id));
  model.edges = model.edges.filter(e => !selected.has(e.id) && !selected.has(e.source) && !selected.has(e.target));
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
  const ancestors = n => { const parents = []; let id = n.parentId; while(id){parents.push(id);id=model.zones.find(z=>z.id===id)?.parentId;} parents.push(null);return parents; };
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
  function emit(parentId, indent) {
    for (const z of model.zones.filter(n => n.parentId === parentId)) { source.push(`${indent}subgraph ${z.id}["${encodeLabel(z.label)}"]`); emit(z.id, indent + '  '); source.push(`${indent}end`); }
    for (const n of model.nodes.filter(n => n.parentId === parentId)) {
      const label = `"${encodeLabel(n.label)}"`;
      const wrappers = { rectangle: ['[', ']'], rounded: ['(', ')'], diamond: ['{', '}'], circle: ['((', '))'], cylinder: ['[(', ')]'] }[n.shape];
      source.push(`${indent}${n.id}${wrappers[0]}${label}${wrappers[1]}`);
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
    if (n.parentId && !model.zones.some(z => z.id === n.parentId)) throw new Error('A parent zone is missing.');
    const seen = new Set([n.id]); let parent = n.parentId;
    while (parent) { if (seen.has(parent)) throw new Error('Zone membership contains a cycle.'); seen.add(parent); parent = model.zones.find(z => z.id === parent)?.parentId; }
  }
  for (const n of model.nodes){if (!shapes.includes(n.shape)) throw new Error(`Unsupported node shape: ${n.shape}`);if(n.manualSize!==undefined&&(!n.manualSize||typeof n.manualSize!=='object'||![n.manualSize.width,n.manualSize.height].every(v=>Number.isFinite(v)&&v>0&&v<=1e6)))throw new Error('Invalid manual node size.');}
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
