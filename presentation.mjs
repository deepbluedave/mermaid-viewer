import {nodeMetrics,diagramFontSize} from './core.mjs?v=extensions-10';
// A presentation is derived; persistent endpoints and expanded geometry never change.
export function presentationModel(model){
  const all=[...model.zones,...model.nodes],lookup=new Map(all.map(n=>[n.id,n]));
  if(!all.some(n=>n.collapsed))return model;
  const representative=id=>{let n=lookup.get(id),result=id,seen=new Set();while(n&&!seen.has(n.id)){seen.add(n.id);if(n.collapsed)result=n.id;n=lookup.get(n.parentId);}return result;};
  const compact=n=>{const proxy={...n,shape:n.shape?'rounded':undefined,container:undefined,manualSize:undefined,_collapsedProxy:true},metrics=nodeMetrics({...proxy,shape:'rounded'},diagramFontSize(model));return{...proxy,width:Math.max(180,metrics.width+24),height:Math.max(64,metrics.height)};};
  const visible=all.filter(n=>representative(n.id)===n.id),ids=new Set(visible.map(n=>n.id));
  const project=n=>n.collapsed?compact(n):{...n};
  const nodes=model.nodes.filter(n=>ids.has(n.id)).map(project),zones=model.zones.filter(n=>ids.has(n.id)).map(project),edges=[];
  for(const e of model.edges){const source=representative(e.source),target=representative(e.target),changed=source!==e.source||target!==e.target;if(source===target&&changed)continue;edges.push(changed?{...e,source,target,sourceSide:source!==e.source?null:e.sourceSide,targetSide:target!==e.target?null:e.targetSide,waypoints:undefined,labelPosition:undefined,_projected:true}:{...e});}
  return{...model,nodes,zones,edges};
}
