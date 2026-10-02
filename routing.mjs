// Adapter only: route finding is performed by libavoid, never by application code.
import { items } from './core.mjs?v=appearance-final';
const sides = { north:{dir:1}, south:{dir:2}, west:{dir:4}, east:{dir:8} };
const edgeSpacing=12;
export function sidePoint(n, side, fraction=.5) {
  const horizontal=side==='north'||side==='south',positive=side==='east'||side==='south';
  const w=n.width,h=n.height,t=Math.max(0,Math.min(1,fraction)),offset=2*t-1;
  let x=horizontal?w*t:(positive?w:0),y=horizontal?(positive?h:0):h*t;
  // Intersect the chosen horizontal/vertical attachment with the visible outline.
  if(n.shape==='circle') {
    const radius=Math.sqrt(Math.max(0,1-offset*offset));
    if(horizontal)y=h/2+(positive?1:-1)*h/2*radius;else x=w/2+(positive?1:-1)*w/2*radius;
  } else if(n.shape==='diamond') {
    if(horizontal)y=h/2+(positive?1:-1)*h/2*(1-Math.abs(offset));else x=w/2+(positive?1:-1)*w/2*(1-Math.abs(offset));
  } else if(n.shape==='cylinder') {
    const ry=10;
    if(horizontal)y=positive?h-ry+ry*Math.sqrt(Math.max(0,1-offset*offset)):ry-ry*Math.sqrt(Math.max(0,1-offset*offset));
    else if(y<ry||y>h-ry){const dy=y<ry?(y-ry)/ry:(y-h+ry)/ry;x=w/2+(positive?1:-1)*w/2*Math.sqrt(Math.max(0,1-dy*dy));}
  } else if(n.shape) {
    const radius=Math.min(n.shape==='rounded'?14:3,w/2,h/2),position=horizontal?x:y,length=horizontal?w:h;
    const corner=position<radius?radius-position:position>length-radius?position-length+radius:0;
    const inset=corner?radius-Math.sqrt(Math.max(0,radius*radius-corner*corner)):0;
    if(horizontal)y=positive?h-inset:inset;else x=positive?w-inset:inset;
  }
  return {x:n.x+x,y:n.y+y};
}
function straightEndpoint(n,point,other) {
  if(!n.shape)return point;
  const at=t=>({x:point.x+(other.x-point.x)*t,y:point.y+(other.y-point.y)*t});
  const inside=p=>{
    if(p.y<=n.y||p.y>=n.y+n.height)return false;
    const fraction=(p.y-n.y)/n.height,left=sidePoint(n,'west',fraction),right=sidePoint(n,'east',fraction);
    return p.x>left.x&&p.x<right.x;
  };
  // A diagonal from an offset pin can briefly enter a curved shape. Trim that
  // straight segment at its exit from the outline, preserving its direction.
  if(!inside(at(1e-6))||inside(other))return point;
  let low=0,high=1;for(let i=0;i<40;i++){const mid=(low+high)/2;if(inside(at(mid)))low=mid;else high=mid;}
  return at(high);
}
function facingSide(a,b) {const dx=b.x+b.width/2-a.x-a.width/2,dy=b.y+b.height/2-a.y-a.height/2;return Math.abs(dx)>Math.abs(dy)?dx>=0?'east':'west':dy>=0?'south':'north';}
function connectionAttachments(model,objects) {
  const groups=new Map(),attachments=new Map();let classId=1;
  for(const edge of model.edges) {
    const ends={};attachments.set(edge.id,ends);
    for(const end of ['source','target']) {
      const n=objects.get(edge[end]),other=objects.get(edge[end==='source'?'target':'source']);
      const side=edge[`${end}Side`]||(n.id===other.id?end==='source'?'east':'north':facingSide(n,other));
      const key=JSON.stringify([n.id,side]);if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push({n,other,side,edgeId:edge.id,end,classId:classId++,ends});
    }
  }
  for(const group of groups.values()) {
    const horizontal=group[0].side==='north'||group[0].side==='south',axis=horizontal?'x':'y',dimension=horizontal?'width':'height';
    // Order pins towards their opposite ends to avoid needless crossings at the node.
    group.sort((a,b)=>(a.other[axis]+a.other[dimension]/2)-(b.other[axis]+b.other[dimension]/2)||a.edgeId.localeCompare(b.edgeId)||a.end.localeCompare(b.end));
    const length=group[0].n[dimension],spacing=group.length>1?Math.min(edgeSpacing,length*.6/(group.length-1)):0;
    group.forEach((entry,index)=>{const fraction=.5+(index-(group.length-1)/2)*spacing/length;entry.ends[entry.end]={side:entry.side,classId:entry.classId,point:sidePoint(entry.n,entry.side,fraction)};});
  }
  return attachments;
}
export class DiagramRouter {
  constructor(avoid) { this.avoid=avoid; this.router=null; this.routes=new Map(); }
  dispose() { if(this.router) this.router.delete(); this.router=null; }
  route(model) {
    this.dispose(); const a=this.avoid; const router=this.router=new a.Router(3);
    router.setRoutingParameter(a.RoutingParameter.shapeBufferDistance,8);
    router.setRoutingParameter(a.RoutingParameter.idealNudgingDistance,edgeSpacing);
    router.setRoutingOption(a.RoutingOption.nudgeSharedPathsWithCommonEndPoint,true);
    // Give each connection its own fixed outline pin; libavoid separates the remaining segments.
    router.setRoutingOption(a.RoutingOption.nudgeOrthogonalSegmentsConnectedToShapes,false);
    const shapes=new Map(), objects=new Map(items(model).map(n=>[n.id,n])),attachments=connectionAttachments(model,objects);
    function rectangle(n) {const p=new a.Point(n.x,n.y),q=new a.Point(n.x+n.width,n.y+n.height);const rect=new a.Rectangle(p,q);p.delete();q.delete();return rect;}
    for(const n of model.nodes) {
      const poly=rectangle(n),shape=new a.ShapeRef(router,poly);poly.delete();shapes.set(n.id,shape);
    }
    // Zones, including their titles, are traversable containers. Only nodes are obstacles.
    const connections=new Map();
    function endpoint(id,attachment) {
      const n=objects.get(id),shape=shapes.get(id),{point,side,classId}=attachment;
      if(shape){new a.ShapeConnectionPin(shape,classId,point.x-n.x,point.y-n.y,false,0,sides[side].dir);return new a.ConnEnd(shape,classId);}
      const p=new a.Point(point.x,point.y),end=new a.ConnEnd(p);p.delete();return end;
    }
    for(const e of model.edges) {
      if(e.routing==='straight' && e.source!==e.target) continue;
      const ports=attachments.get(e.id),src=endpoint(e.source,ports.source),dst=endpoint(e.target,ports.target);
      const conn=new a.ConnRef(router,src,dst);src.delete();dst.delete();conn.setRoutingType(a.ConnType.ConnType_Orthogonal);
      if(e.source===e.target){const n=objects.get(e.source),ordinal=model.edges.filter(other=>other.source===e.source&&other.target===e.target).indexOf(e),distance=40+ordinal*24;const p=new a.Point(n.x+n.width+distance,n.y-distance),check=new a.Checkpoint(p),checks=new a.CheckpointVector();checks.push_back(check);conn.setRoutingCheckpoints(checks);checks.delete();check.delete();p.delete();}
      connections.set(e.id,conn);
    }
    router.processTransaction(); this.routes=new Map();
    for(const e of model.edges) {
      let points;
      if(e.routing==='straight' && e.source!==e.target) {
        const ports=attachments.get(e.id),source=ports.source.point,target=ports.target.point;
        points=[straightEndpoint(objects.get(e.source),source,target),straightEndpoint(objects.get(e.target),target,source)];
      } else {
        const line=connections.get(e.id).displayRoute();points=[];
        for(let i=0;i<line.size();i++){const p=line.at(i);points.push({x:p.x,y:p.y});p.delete();}line.delete();
      }
      if(points.length<2 || points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))) throw new Error(`The routing engine could not route ${e.id}.`);
      this.routes.set(e.id,points);
    }
    return this.routes;
  }
}
export function labelAnchor(points) {
  let best={length:-1,point:points[0]};
  for(let i=1;i<points.length;i++) {
    const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.y-a.y);
    // Prefer a horizontal segment so a normal text label sits naturally on it.
    const score=length+(Math.abs(b.y-a.y)<.01?30:0);
    if(score>best.length) best={length:score,point:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};
  }
  return best.point;
}
