import {copy,emptyModel,validateModel,items,descendants,separateSelection,ensureLabelFit,expandZones,ensureNodeSpacing} from './core.mjs?v=extensions-10';

const FORMAT='diagram-studio-fragment';
const MAX_TEXT=12_000_000;
const ends=['source','target'];
function pruneOrders(objects,edges){
  const keys=new Set(edges.flatMap(e=>ends.map(end=>`${e.id}:${end}`)));
  for(const n of objects)if(n.attachmentOrder){
    for(const [side,order]of Object.entries(n.attachmentOrder))n.attachmentOrder[side]=order.filter(key=>keys.has(key));
    for(const side of Object.keys(n.attachmentOrder))if(!n.attachmentOrder[side].length)delete n.attachmentOrder[side];
    if(!Object.keys(n.attachmentOrder).length)delete n.attachmentOrder;
  }
}
export function copyFragment(model,selection,documentId){
  validateModel(model);
  const ids=new Set();for(const n of items(model))if(selection.has(n.id))for(const id of descendants(model,n.id))ids.add(id);
  const edgeOnly=!ids.size,edges=copy(model.edges.filter(e=>edgeOnly?selection.has(e.id):ids.has(e.source)&&ids.has(e.target)));
  if(!ids.size&&!edges.length)throw new Error('Select nodes, zones or connections to copy.');
  const nodes=copy(model.nodes.filter(n=>ids.has(n.id))),zones=copy(model.zones.filter(n=>ids.has(n.id)));
  for(const n of [...nodes,...zones])if(!ids.has(n.parentId))n.parentId=null;
  pruneOrders([...nodes,...zones],edges);
  const endpointRefs=edgeOnly?[...new Set(edges.flatMap(e=>[e.source,e.target]))].map(id=>{
    const n=items(model).find(n=>n.id===id);return{id,label:'',shape:'rectangle',parentId:null,x:n.x,y:n.y,width:n.width,height:n.height};
  }):[];
  return JSON.stringify({format:FORMAT,version:1,documentId,nodes,zones,edges,endpointRefs});
}
export function readFragment(text){
  if(typeof text!=='string'||text.length>MAX_TEXT)throw new Error('The clipboard does not contain a supported diagram section.');
  let fragment;try{fragment=JSON.parse(text);}catch{throw new Error('Copy diagram objects before pasting them here.');}
  if(fragment?.format!==FORMAT||fragment.version!==1||typeof fragment.documentId!=='string'||fragment.documentId.length>200||!Array.isArray(fragment.endpointRefs))throw new Error('The clipboard does not contain a supported diagram section.');
  const edgeOnly=Array.isArray(fragment.nodes)&&Array.isArray(fragment.zones)&&!fragment.nodes.length&&!fragment.zones.length;
  if(!edgeOnly&&fragment.endpointRefs.length)throw new Error('Invalid clipboard endpoints.');
  const checked=validateModel({...emptyModel(),nodes:edgeOnly?fragment.endpointRefs:fragment.nodes,zones:fragment.zones,edges:fragment.edges});
  if(!checked.nodes.length&&!checked.zones.length&&!checked.edges.length||edgeOnly&&!checked.edges.length)throw new Error('There are no diagram objects to paste.');
  return{...fragment,nodes:edgeOnly?[]:checked.nodes,zones:checked.zones,edges:checked.edges,edgeOnly};
}
export function fragmentBounds(fragment){
  const objects=[...fragment.nodes,...fragment.zones];if(!objects.length)return null;
  const x=Math.min(...objects.map(n=>n.x)),y=Math.min(...objects.map(n=>n.y));
  return{x,y,width:Math.max(...objects.map(n=>n.x+n.width))-x,height:Math.max(...objects.map(n=>n.y+n.height))-y};
}
// Work on a validated copy so a malformed or oversized paste cannot partly edit
// the destination. IDs and attachment keys are remapped before routing sees it.
export function pasteFragment(destination,fragment,documentId,{dx=36,dy=36,point=null}={}){
  fragment=readFragment(typeof fragment==='string'?fragment:JSON.stringify(fragment));
  const model=validateModel(destination);
  if(fragment.edgeOnly&&(fragment.documentId!==documentId||fragment.edges.some(e=>!items(model).some(n=>n.id===e.source)||!items(model).some(n=>n.id===e.target))))throw new Error('To paste into another diagram, copy the endpoint nodes with the connections.');
  const objects=[...fragment.nodes,...fragment.zones],all=[...objects,...fragment.edges];
  if(items(model).length+objects.length>500||model.edges.length+fragment.edges.length>1000)throw new Error('Pasting would exceed 500 objects or 1000 connections.');
  const used=new Set([...items(model),...model.edges,...all].map(n=>n.id)),mapping=new Map();
  for(const [list,prefix]of[[fragment.nodes,'Node'],[fragment.zones,'Zone'],[fragment.edges,'Edge']])for(const n of list){let i=1;while(used.has(prefix+i))i++;const id=prefix+i;used.add(id);mapping.set(n.id,id);}
  const bounds=fragmentBounds(fragment);if(point&&bounds){dx=point.x-bounds.x-bounds.width/2;dy=point.y-bounds.y-bounds.height/2;}
  if(![dx,dy].every(Number.isFinite))throw new Error('Invalid paste position.');
  for(const n of objects){n.id=mapping.get(n.id);n.parentId=mapping.get(n.parentId)||null;n.x+=dx;n.y+=dy;
    if(n.attachmentOrder)for(const side of Object.keys(n.attachmentOrder))n.attachmentOrder[side]=n.attachmentOrder[side].map(key=>{const[id,end]=key.split(':');return`${mapping.get(id)}:${end}`;});
  }
  for(const e of fragment.edges){e.id=mapping.get(e.id);e.source=mapping.get(e.source)||e.source;e.target=mapping.get(e.target)||e.target;}
  model.nodes.push(...fragment.nodes);model.zones.push(...fragment.zones);model.edges.push(...fragment.edges);
  const selected=new Set(all.map(n=>n.id));
  // Keep the pasted section together when finding room beside existing nodes.
  // An edge-only duplicate retains its existing route and absolute waypoints.
  if(objects.length){const section={...emptyModel(),nodes:fragment.nodes,zones:fragment.zones,edges:fragment.edges,settings:copy(model.settings)};ensureLabelFit(section);ensureNodeSpacing(section);expandZones(section);const delta=separateSelection(model,selected);dx+=delta.x;dy+=delta.y;for(const e of fragment.edges)if(e.waypoints)for(const p of e.waypoints){p.x+=dx;p.y+=dy;}expandZones(model);}
  return{model:validateModel(model),selection:selected,mapping};
}
