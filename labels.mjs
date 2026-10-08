import { labelLines, textWidth,diagramFontSize,containers,containerTitleBox,zoneTitleMetrics,objectTextWidth,wrapObjectText } from './core.mjs?v=extensions-10';
import { labelAnchor } from './routing.mjs?v=extensions-10';

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
export function zoneTitleBox(z,fontSize=13) {const metrics=zoneTitleMetrics(z,fontSize),width=Math.max(0,...metrics.lines.map(line=>objectTextWidth(z,line,fontSize)))+12;return{x:z.x+(z.width-width)/2,y:z.y+5,width,height:metrics.height-10};}

export function routeFrame(points, fraction) {
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));
  const total=lengths.reduce((sum,n)=>sum+n,0),distance=total*fraction;
  const sample=distance=>{
    for(let i=0;i<lengths.length;i++)if(lengths[i]){
      if(distance<=lengths[i]){const t=distance/lengths[i],a=points[i],b=points[i+1];return{point:{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},tangent:{x:(b.x-a.x)/lengths[i],y:(b.y-a.y)/lengths[i]}};}
      distance-=lengths[i];
    }
    return {point:{...points.at(-1)},tangent:{x:1,y:0}};
  };
  const frame=sample(distance);
  // Use the nearby route direction, rather than a tiny segment's orientation.
  // This prevents a small orthogonal jog from flipping an offset by 90 degrees.
  const a=sample(Math.max(0,distance-64)).point,b=sample(Math.min(total,distance+64)).point,size=Math.hypot(b.x-a.x,b.y-a.y);
  if(size>.001)frame.tangent={x:(b.x-a.x)/size,y:(b.y-a.y)/size};
  return frame;
}
export const routePoint=(points,fraction)=>routeFrame(points,fraction).point;

export function manualLabelPosition(points, center) {
  let length=0,best={distance:Infinity,along:0,point:points[0]};
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b.x-a.x,dy=b.y-a.y,size=Math.hypot(dx,dy);
    const t=size?Math.max(0,Math.min(1,((center.x-a.x)*dx+(center.y-a.y)*dy)/(size*size))):0;
    const point={x:a.x+dx*t,y:a.y+dy*t},distance=Math.hypot(center.x-point.x,center.y-point.y);
    if(distance<best.distance)best={distance,along:length+size*t,point};length+=size;
  }
  const fraction=length?best.along/length:0,{point,tangent}=routeFrame(points,fraction),dx=center.x-point.x,dy=center.y-point.y;
  return {fraction,offsetAlong:dx*tangent.x+dy*tangent.y,offsetNormal:-dx*tangent.y+dy*tangent.x};
}

export function labelLeader(origin, box) {
  const end={x:Math.max(box.x,Math.min(box.x+box.width,origin.x)),y:Math.max(box.y,Math.min(box.y+box.height,origin.y))};
  return Math.hypot(end.x-origin.x,end.y-origin.y)>.01?{start:origin,end}:null;
}

// Label placement changes only text and its optional callout, never a routed edge.
export function layoutEdgeLabels(model,routes) {
  const records=[],groups=new Map(),segments=[],arrowBoxes=[],fontSize=diagramFontSize(model);
  for(const edge of model.edges) {
    const points=routes.get(edge.id);if(!points)continue;
    for(let i=1;i<points.length;i++)segments.push({id:edge.id,a:points[i-1],b:points[i]});
    for(const p of [edge.direction!=='none'?points.at(-1):null,edge.direction==='both'?points[0]:null].filter(Boolean))arrowBoxes.push({x:p.x-11,y:p.y-11,width:22,height:22});
    if(!edge.label)continue;
    const lines=wrapObjectText(edge,fontSize*17,fontSize),width=Math.max(...lines.map(l=>objectTextWidth(edge,l,fontSize)))+14,height=lines.length*Math.ceil(fontSize*1.35)+6;
    const parts=[];
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.y-a.y);if(length<.001)continue;
      const horizontal=Math.abs(a.y-b.y)<.001;parts.push({a,b,length,horizontal,score:length+(horizontal?30:0)});
    }
    parts.sort((a,b)=>b.score-a.score);
    const record={edge,lines,width,height,parts,points,base:labelAnchor(points),horizontal:parts[0]?.horizontal??true,preferredOffset:0};records.push(record);
    if(edge.labelPosition)continue;
    const key=JSON.stringify([...[edge.source,edge.target].sort(),edge.routing]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(record);
  }
  for(const group of groups.values())if(group.length>1){
    const axis=group[0].horizontal?'y':'x',dimension=group[0].horizontal?'height':'width';
    group.sort((a,b)=>a.base[axis]-b.base[axis]||a.edge.id.localeCompare(b.edge.id));
    let position=0;group.forEach((r,i)=>{if(i)position+=(group[i-1][dimension]+r[dimension])/2+8;r.desired=position;});
    const shift=(group[0].base[axis]+group.at(-1).base[axis]-position)/2;
    group.forEach(r=>r.preferredOffset=r.desired+shift-r.base[axis]);
  }
  const occupied=[],titleBoxes=containers(model).map(z=>z.container?containerTitleBox(model,z):zoneTitleBox(z,fontSize)),leafNodes=model.nodes.filter(n=>!n.container),fixed=[...leafNodes,...titleBoxes,...arrowBoxes],result=new Map();
  // Reserve all manual labels first, regardless of edge order. Their positions
  // are authoritative; only automatic labels participate in collision search.
  for(const record of records.filter(r=>r.edge.labelPosition)){
    const {fraction,offsetAlong,offsetNormal}=record.edge.labelPosition,{point:origin,tangent}=routeFrame(record.points,fraction);
    const anchor={x:origin.x+tangent.x*offsetAlong-tangent.y*offsetNormal,y:origin.y+tangent.y*offsetAlong+tangent.x*offsetNormal},box={x:anchor.x-record.width/2,y:anchor.y-record.height/2,width:record.width,height:record.height};
    const chosen={...record,anchor,box,leader:labelLeader(origin,box)};occupied.push(box);result.set(record.edge.id,chosen);
  }
  for(const record of records) {
    if(record.edge.labelPosition)continue;
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
        const leader=labelLeader(origin,box),end=leader?.end;
        if(leader&&[...leafNodes,...titleBoxes,...occupied].some(b=>segmentIntersectsBox(origin,end,b,2)))continue;
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
