import { labelLines, textWidth,diagramFontSize } from './core.mjs?v=appearance-final';
import { labelAnchor } from './routing.mjs?v=appearance-final';

const overlaps=(a,b,padding=4)=>a.x+a.width>b.x-padding&&a.x<b.x+b.width+padding&&a.y+a.height>b.y-padding&&a.y<b.y+b.height+padding;
function segmentIntersectsBox(a,b,box,padding=0) {
  let low=0,high=1;
  for(const [axis,dimension]of [['x','width'],['y','height']]) {
    const delta=b[axis]-a[axis],min=box[axis]-padding,max=box[axis]+box[dimension]+padding;
    if(Math.abs(delta)<1e-9){if(a[axis]<=min||a[axis]>=max)return false;continue;}
    const t1=(min-a[axis])/delta,t2=(max-a[axis])/delta;
    low=Math.max(low,Math.min(t1,t2));high=Math.min(high,Math.max(t1,t2));if(low>=high)return false;
  }
  return true;
}
export function zoneTitleBox(z,fontSize=13) {const width=textWidth(z.label,fontSize)+12;return{x:z.x+(z.width-width)/2,y:z.y+5,width,height:fontSize+8};}

// Label placement changes only text and its optional callout, never a routed edge.
export function layoutEdgeLabels(model,routes) {
  const records=[],groups=new Map(),segments=[],arrowBoxes=[],fontSize=diagramFontSize(model);
  for(const edge of model.edges) {
    const points=routes.get(edge.id);if(!points)continue;
    for(let i=1;i<points.length;i++)segments.push({id:edge.id,a:points[i-1],b:points[i]});
    for(const p of [edge.direction!=='none'?points.at(-1):null,edge.direction==='both'?points[0]:null].filter(Boolean))arrowBoxes.push({x:p.x-11,y:p.y-11,width:22,height:22});
    if(!edge.label)continue;
    const lines=labelLines(edge.label,28),width=Math.max(...lines.map(l=>textWidth(l,fontSize)))+14,height=lines.length*Math.ceil(fontSize*1.35)+6;
    const parts=[];
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.y-a.y);if(length<.001)continue;
      const horizontal=Math.abs(a.y-b.y)<.001;parts.push({a,b,length,horizontal,score:length+(horizontal?30:0)});
    }
    parts.sort((a,b)=>b.score-a.score);
    const record={edge,lines,width,height,parts,base:labelAnchor(points),horizontal:parts[0]?.horizontal??true,preferredOffset:0};records.push(record);
    const key=JSON.stringify([...[edge.source,edge.target].sort(),edge.routing]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(record);
  }
  for(const group of groups.values())if(group.length>1){
    const axis=group[0].horizontal?'y':'x',dimension=group[0].horizontal?'height':'width';
    group.sort((a,b)=>a.base[axis]-b.base[axis]||a.edge.id.localeCompare(b.edge.id));
    let position=0;group.forEach((r,i)=>{if(i)position+=(group[i-1][dimension]+r[dimension])/2+8;r.desired=position;});
    const shift=(group[0].base[axis]+group.at(-1).base[axis]-position)/2;
    group.forEach(r=>r.preferredOffset=r.desired+shift-r.base[axis]);
  }
  const occupied=[],titleBoxes=model.zones.map(z=>zoneTitleBox(z,fontSize)),fixed=[...model.nodes,...titleBoxes,...arrowBoxes],result=new Map();
  for(const record of records) {
    const {edge,parts,width,height}=record;let chosen;
    const fractions=[.5,.25,.75,.125,.875,.375,.625,.0625,.9375];
    search:for(let ring=-2;ring<8;ring++)for(const part of parts){
      const extent=part.horizontal?height:width,sign=record.preferredOffset<0?-1:1;
      const offsets=ring===-2?[record.preferredOffset]:ring===-1?[0]:[sign*(extent/2+6+ring*(extent+8)),-sign*(extent/2+6+ring*(extent+8))];
      const margin=(part.horizontal?width:height)/2+14,positions=[...fractions];if(part.length>margin*2)positions.push(margin/part.length,1-margin/part.length);
      for(const offset of offsets)for(const t of positions){
        const origin={x:part.a.x+(part.b.x-part.a.x)*t,y:part.a.y+(part.b.y-part.a.y)*t};
        const anchor={x:origin.x+(part.horizontal?0:offset),y:origin.y+(part.horizontal?offset:0)};
        const box={x:anchor.x-width/2,y:anchor.y-height/2,width,height};
        if([...fixed,...occupied].some(b=>overlaps(box,b)))continue;
        if(segments.some(s=>s.id!==edge.id&&segmentIntersectsBox(s.a,s.b,box)))continue;
        const end={x:Math.max(box.x,Math.min(box.x+width,origin.x)),y:Math.max(box.y,Math.min(box.y+height,origin.y))};
        const leader=Math.hypot(end.x-origin.x,end.y-origin.y)>.01?{start:origin,end}:null;
        if(leader&&[...model.nodes,...titleBoxes,...occupied].some(b=>segmentIntersectsBox(origin,end,b,2)))continue;
        chosen={...record,anchor,box,leader};break search;
      }
    }
    if(!chosen){
      const top=Math.min(0,...fixed.map(b=>b.y),...occupied.map(b=>b.y),...segments.flatMap(s=>[s.a.y,s.b.y]));
      const anchor={x:record.base.x,y:top-height/2-8},box={x:anchor.x-width/2,y:anchor.y-height/2,width,height};
      chosen={...record,anchor,box,leader:{start:record.base,end:{x:anchor.x,y:box.y+height}}};
    }
    occupied.push(chosen.box);result.set(edge.id,chosen);
  }
  return result;
}
