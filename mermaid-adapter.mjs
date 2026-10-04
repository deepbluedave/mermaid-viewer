import {pruneAttachmentOrders} from './attachments.mjs?v=whole-words';
import { emptyModel, resizeNode, expandZones, validateModel, configureTextMeasure, textWidth,ensureNodeSpacing,diagramFontSize,copy,shapes,ensureLayoutSpacing } from './core.mjs?v=whole-words';
let renderCount = 0;
const shapeTypes = { square:'rectangle', rect:'rectangle', round:'rounded', rounded:'rounded', diamond:'diamond', circle:'circle', cylinder:'cylinder' };
export function initializeMermaid() {
  const context = document.createElement('canvas').getContext('2d');
  configureTextMeasure((text,size)=>{context.font=`${size}px system-ui, sans-serif`;return context.measureText(text).width;});
  mermaid.initialize({ startOnLoad:false, securityLevel:'strict', maxEdges:1000, maxTextSize:200000,
    theme:'base', themeVariables:{ primaryColor:'#ffffff', primaryTextColor:'#1e293b', primaryBorderColor:'#64748b', lineColor:'#64748b', clusterBkg:'#eef2f6', clusterBorder:'#94a3b8', edgeLabelBackground:'#ffffff' },
    fontFamily:'system-ui, sans-serif', flowchart:{ useMaxWidth:false, htmlLabels:true, curve:'basis',nodeSpacing:48,rankSpacing:64 } });
}
function rejectUnsupported(source) {
  const code = source.replace(/^\s*%%[^\n]*$/gm, '');
  if (/%%\s*\{/.test(source)) throw new Error('Mermaid configuration directives are not editable. Remove the directive before importing.');
  const front = /^---\s*\n([\s\S]*?)\n---\s*\n/.exec(code);
  if (front && front[1].split('\n').some(line => line.trim() && !/^\s*(config\s*:|layout\s*:\s*(elk(?:\.mrtree)?|dagre)\s*)$/.test(line))) throw new Error('Only layout configuration is supported in frontmatter. Remove other configuration before importing.');
  const body = front ? code.slice(front[0].length) : code;
  if (!/^\s*(flowchart|graph)\s+(TD|TB|BT|LR|RL)\b/.test(body)) throw new Error('Import a flowchart or graph with a direction (TD, LR, BT, or RL). Other diagram types are not editable in this version.');
  const statements = body.replace(/"[^"]*"/g,'""').replace(/%%[^\n]*/g,'');
  if (/(?:^|[;\n])\s*(classDef|class|style|linkStyle|click|direction|accTitle|accDescr)\b/.test(statements) || /:::|@\{|<\/?(?!br\b)[a-z][^>]*>/i.test(body)) throw new Error('Custom styles, callbacks, accessibility metadata, HTML (except <br/>), advanced shapes, and per-zone directions are not supported. Remove these features before importing.');
}
function textLabel(text) {
  // Mermaid's parsed database retains its entity placeholders; decode exactly once.
  // Decode entity tokens individually so literal angle brackets and quotes stay text.
  const raw = String(text ?? '').replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/ﬂ°°/g, '&#').replace(/ﬂ°/g, '&').replace(/¶ß/g, ';');
  const decoder = document.createElement('textarea');
  const decoded = raw.replace(/&(?:#\d+|#x[\da-f]+|[a-z][\w]*);/gi, entity => { decoder.innerHTML = entity; return decoder.value; });
  return decoded === '\u200b' ? '' : decoded;
}
function svgBox(element, svg) {
  const box = element.getBBox(); const m = svg.getScreenCTM().inverse().multiply(element.getScreenCTM());
  const a = new DOMPoint(box.x,box.y).matrixTransform(m), b = new DOMPoint(box.x+box.width,box.y+box.height).matrixTransform(m);
  return {x:a.x,y:a.y,width:b.x-a.x,height:b.y-a.y};
}
export async function importMermaid(source, { direction, layout = 'adaptive' } = {}) {
  rejectUnsupported(source);
  const original = await mermaid.mermaidAPI.getDiagramFromText(source);
  const db = original.db;
  const vertices = [...db.getVertices().values()].map(v=>({...v}));
  const subgraphs = db.getSubGraphs().map(s=>({...s,nodes:[...s.nodes]}));
  const parsedEdges = db.getEdges().map(e=>({...e}));
  if ([...vertices,...subgraphs,...parsedEdges].some(item=>item.labelType==='markdown')) throw new Error('Markdown-formatted labels are not supported. Use plain text labels before importing.');
  for (const vertex of vertices) {
    if (!shapeTypes[vertex.type || 'square']) throw new Error(`Unsupported node shape on ${vertex.id}: ${vertex.type}. Use rectangle, rounded rectangle, diamond, circle, or cylinder.`);
    if (vertex.link || vertex.icon || vertex.img || vertex.classes?.length || vertex.styles?.length) throw new Error(`Node ${vertex.id} uses unsupported styling, links, or assets.`);
  }
  for (const edge of parsedEdges) if (!['arrow_point','double_arrow_point','arrow_open'].includes(edge.type) || !['normal','dotted','thick'].includes(edge.stroke)) throw new Error(`Connection ${edge.id} uses an unsupported arrowhead or invisible line.`);
  const model = emptyModel(); model.settings.direction = direction || (db.getDirection() === 'TB' ? 'TD' : db.getDirection()); model.settings.layout = layout;
  const parent = new Map(); for (const s of subgraphs) for (const id of s.nodes) parent.set(id,s.id);
  const groupIds = new Set(subgraphs.map(s=>s.id));
  model.zones = subgraphs.map(s=>({id:s.id,label:textLabel(s.title),parentId:parent.get(s.id)||null,x:0,y:0,width:200,height:140}));
  model.nodes = vertices.filter(v=>!groupIds.has(v.id)).map(v=>({id:v.id,label:textLabel(v.text ?? v.id),shape:shapeTypes[v.type || 'square'],parentId:parent.get(v.id)||null,x:0,y:0,width:120,height:54}));
  model.edges = parsedEdges.map(e=>({id:e.id,source:e.start,target:e.end,label:textLabel(e.text),direction:e.type==='double_arrow_point'?'both':e.type==='arrow_open'?'none':'forward',style:e.stroke==='dotted'?'dashed':e.stroke==='thick'?'thick':'normal',routing:'orthogonal',sourceSide:null,targetSide:null}));
  const annotations=[...source.matchAll(/^\s*%% diagram-studio-container (.+)$/gm)].map(match=>{try{return JSON.parse(match[1]);}catch{throw new Error('Invalid node container annotation.');}}),seen=new Set();
  for(const annotation of annotations){const zone=model.zones.find(z=>z.id===annotation.id);if(!zone||seen.has(annotation.id)||!shapes.includes(annotation.shape))throw new Error('Invalid node container annotation.');seen.add(annotation.id);model.zones=model.zones.filter(z=>z!==zone);model.nodes.push({...zone,shape:annotation.shape,container:true});}
  await layoutModel(model);
  return validateModel(model);
}
export async function layoutModel(model) {
  const manualRoutes=new Map(model.edges.filter(e=>e.waypoints).map(e=>[e.id,copy(e.waypoints)]));
  const { toMermaid } = await import('./core.mjs?v=whole-words');
  const source = `---\nconfig:\n  layout: ${model.settings.layout === 'hierarchical' ? 'elk.mrtree' : 'elk'}\n  themeVariables:\n    fontSize: ${diagramFontSize(model)}px\n---\n${toMermaid(model)}`;
  const id = `layout-${++renderCount}`;
  const { svg:markup } = await mermaid.render(id,source);
  const parsed = await mermaid.mermaidAPI.getDiagramFromText(source);
  const graph = parsed.db.getData();
  const host = document.createElement('div'); host.className='measurement-host'; host.innerHTML=markup; document.body.append(host);
  try {
    const svg = host.querySelector('svg');
    const elements = [...svg.querySelectorAll('g.node, g.cluster')];
    for (const n of [...model.nodes,...model.zones]) {
      const data = graph.nodes.find(d=>d.id===n.id); const domId=data?.domId || n.id;
      const element = elements.find(e=>e.id===domId || e.id===`${id}-${domId}`);
      if (!element) throw new Error(`Mermaid did not lay out object ${n.id}.`);
      const shape = element.querySelector('.label-container') || element.querySelector('rect') || element;
      Object.assign(n,svgBox(shape,svg));
      if (model.nodes.includes(n)) resizeNode(n,diagramFontSize(model));
      else { n.width=Math.max(n.width,160,textWidth(n.label,diagramFontSize(model))+32); n.height=Math.max(n.height,100); }
    }
    ensureNodeSpacing(model);expandZones(model);ensureLayoutSpacing(model);
  } finally { host.remove();for(const e of model.edges)if(manualRoutes.has(e.id))e.waypoints=manualRoutes.get(e.id); }
  return model;
}
export function mergeSource(previous, incoming) {
  if(previous.settings.theme!==undefined)incoming.settings.theme=previous.settings.theme;
  incoming.settings.fontSize=diagramFontSize(previous);incoming.settings.guides=previous.settings.guides!==false;
  for (const n of [...incoming.nodes,...incoming.zones]) {
    const old = [...previous.nodes,...previous.zones].find(o=>o.id===n.id);
    if (old) {
      n.description=old.description||'';n.notes=old.notes||'';
      for(const key of ['backgroundColor','fontColor','manualSize','attachmentOrder'])if(old[key]!==undefined)n[key]=copy(old[key]);
      if(incoming.zones.includes(n)&&previous.zones.includes(old)&&old.padding!==undefined)n.padding=copy(old.padding);
      if(n.container&&old.containerSize)n.containerSize=copy(old.containerSize);
      const cx=old.x+old.width/2,cy=old.y+old.height/2;
      if (incoming.zones.includes(n)) Object.assign(n,{x:old.x,y:old.y,width:old.width,height:old.height});
      else { n.x=cx-n.width/2; n.y=cy-n.height/2; }
    }
    if(incoming.nodes.includes(n))resizeNode(n,diagramFontSize(incoming));
  }
  for (const e of incoming.edges) { const old=previous.edges.find(o=>o.id===e.id); if(old) {e.routing=old.routing;e.sourceSide=old.sourceSide;e.targetSide=old.targetSide;e.description=old.description||'';e.notes=old.notes||'';if(e.source===old.source&&e.target===old.target){if(old.waypoints)e.waypoints=copy(old.waypoints);if(old.labelPosition)e.labelPosition=copy(old.labelPosition);}} }
  pruneAttachmentOrders(incoming);
  incoming.settings.grid=previous.settings.grid; incoming.settings.view={...previous.settings.view};
  ensureNodeSpacing(incoming,{preferredIds:new Set(incoming.nodes.filter(n=>!previous.nodes.some(old=>old.id===n.id&&old.width===n.width&&old.height===n.height)).map(n=>n.id))});expandZones(incoming); return incoming;
}
