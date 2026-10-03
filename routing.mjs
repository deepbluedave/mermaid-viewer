// Adapter only: route finding is performed by libavoid, never by application code.
import { items } from './core.mjs?v=whole-words';
import {waypointConflicts} from './waypoints.mjs?v=whole-words';
import {findJoinRepairs,acceptJoinRepair,sameRoute} from './route-joins.mjs?v=whole-words';
import {attachmentGroups,attachmentCandidates,acceptAttachmentSwap} from './attachments.mjs?v=whole-words';
const sides = { north:{dir:1,opposite:2}, south:{dir:2,opposite:1}, west:{dir:4,opposite:8}, east:{dir:8,opposite:4} };
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
function connectionAttachments(groups) {
  const attachments=new Map();let classId=1;
  for(const group of groups.values()) {
    const dimension=['north','south'].includes(group.side)?'width':'height';
    const length=group.n[dimension],spacing=group.entries.length>1?Math.min(edgeSpacing,length*.6/(group.entries.length-1)):0;
    group.entries.forEach((entry,index)=>{
      const fraction=.5+(index-(group.entries.length-1)/2)*spacing/length,{n,other,side}=entry;
      const inward=(!n.shape||n.container)&&n.id!==other.id&&other.x>=n.x&&other.y>=n.y&&other.x+other.width<=n.x+n.width&&other.y+other.height<=n.y+n.height;
      if(!attachments.has(entry.edgeId))attachments.set(entry.edgeId,{});
      attachments.get(entry.edgeId)[entry.end]={side,classId:classId++,point:sidePoint(n,side,fraction),inward};
    });
  }
  return attachments;
}
export class DiagramRouter {
  constructor(avoid) { this.avoid=avoid; this.router=null; this.routes=new Map();this.groups=new Map();this.orders=new Map();this.cacheKey=null;this.terminalArrivals=new Set(); }
  dispose() { if(this.router) this.router.delete(); this.router=null;this.cacheKey=null; }
  route(model,{freezeOrder=false,optimize=true}={}) {
    const geometry=JSON.stringify({nodes:[...model.nodes,...model.zones].map(n=>[n.id,n.x,n.y,n.width,n.height,n.shape,n.container,n.attachmentOrder]),edges:model.edges.map(e=>[e.id,e.source,e.target,e.routing,e.sourceSide,e.targetSide,e.waypoints]),freezeOrder,optimize});
    if(geometry===this.cacheKey)return this.routes;
    let orders=freezeOrder?this.orders:new Map(),groups=attachmentGroups(model,orders);
    let terminalArrivals=new Set([...groups.values()].filter(g=>g.manual).flatMap(g=>g.entries.filter(e=>e.end==='source').map(e=>e.edgeId)));
    if(freezeOrder)terminalArrivals=new Set([...terminalArrivals,...this.terminalArrivals]);
    let routes=this.routeOnce(model,groups,terminalArrivals);
    // At most four adjacent swaps per settled geometry. Ties retain the baseline.
    if(optimize&&!freezeOrder&&[...routes.values()].reduce((sum,p)=>sum+p.length,0)<=4000){
      const candidates=attachmentCandidates(groups,routes);
      for(const candidate of candidates){
        // Earlier accepted swaps may already have resolved this pair; rebuild its order.
        const current=groups.get(candidate.group.key),a=[...candidate.edges],i=current.entries.findIndex(e=>e.edgeId===a[0]),j=current.entries.findIndex(e=>e.edgeId===a[1]);
        if(Math.abs(i-j)!==1)continue;
        const order=current.entries.map(e=>e.key);[order[i],order[j]]=[order[j],order[i]];
        const proposed=new Map(orders);proposed.set(current.key,order);
        try{
          const nextGroups=attachmentGroups(model,proposed),next=this.routeOnce(model,nextGroups,new Set([...terminalArrivals,...current.entries.filter(e=>candidate.edges.has(e.edgeId)&&e.end==='source').map(e=>e.edgeId)]));
          if(acceptAttachmentSwap(model,routes,next,{...candidate,group:current})){orders=proposed;groups=nextGroups;routes=next;for(const entry of current.entries)if(candidate.edges.has(entry.edgeId)&&entry.end==='source')terminalArrivals.add(entry.edgeId);}
        }catch{/* An optional trial never invalidates the baseline. */}
      }
    }
    this.groups=groups;this.routes=routes;this.cacheKey=geometry;
    if(!freezeOrder){this.orders=new Map([...groups].map(([key,g])=>[key,g.entries.map(e=>e.key)]));this.terminalArrivals=terminalArrivals;}
    return routes;
  }
  routeOnce(model,groups,terminalArrivals=new Set()) {
    this.dispose(); const a=this.avoid; const router=this.router=new a.Router(3);
    router.setRoutingParameter(a.RoutingParameter.shapeBufferDistance,8);
    router.setRoutingParameter(a.RoutingParameter.idealNudgingDistance,edgeSpacing);
    router.setRoutingOption(a.RoutingOption.nudgeSharedPathsWithCommonEndPoint,true);
    // Give each connection its own fixed outline pin; libavoid separates the remaining segments.
    router.setRoutingOption(a.RoutingOption.nudgeOrthogonalSegmentsConnectedToShapes,false);
    const shapes=new Map(), objects=new Map(items(model).map(n=>[n.id,n])),attachments=connectionAttachments(groups);
    function rectangle(n) {const p=new a.Point(n.x,n.y),q=new a.Point(n.x+n.width,n.y+n.height);const rect=new a.Rectangle(p,q);p.delete();q.delete();return rect;}
    for(const n of model.nodes.filter(n=>!n.container)) {
      const poly=rectangle(n),shape=new a.ShapeRef(router,poly);poly.delete();shapes.set(n.id,shape);
    }
    // Container bodies and titles remain traversable. Only leaf nodes and the
    // immediate vicinity of connected outline ports participate as obstacles.
    const connections=new Map(),waypoints=new Map(),reversed=new Set();
    function endpoint(id,attachment) {
      const n=objects.get(id),shape=shapes.get(id),{point,side,classId}=attachment;
      if(shape){new a.ShapeConnectionPin(shape,classId,point.x-n.x,point.y-n.y,false,0,sides[side].dir);return new a.ConnEnd(shape,classId);}
      // The JS binding lacks directional point endpoints. Give each container
      // port a tiny native pin anchor, rather than registering its whole body.
      // Libavoid now controls the border approach exactly as it does for nodes.
      const radius=.01,poly=rectangle({x:point.x-radius,y:point.y-radius,width:radius*2,height:radius*2}),anchor=new a.ShapeRef(router,poly);poly.delete();
      new a.ShapeConnectionPin(anchor,classId,radius,radius,false,0,attachment.inward?sides[side].opposite:sides[side].dir);return new a.ConnEnd(anchor,classId);
    }
    for(const e of model.edges) {
      if(e.routing==='straight' && e.source!==e.target) continue;
      const ports=attachments.get(e.id),src=endpoint(e.source,ports.source),dst=endpoint(e.target,ports.target);
      const blocked=new Set(waypointConflicts(model,e).map(c=>c.index));
      const checkpoints=(e.waypoints||[]).filter((p,index)=>!blocked.has(index));
      waypoints.set(e.id,checkpoints);
      // Route each manual span through libavoid. Native checkpoint simplification
      // can erase a point when consecutive spans double back on the same line.
      // Fixed point endpoints preserve every user point, including those turns.
      const ends=[src,...checkpoints.map(point=>{const p=new a.Point(point.x,point.y),end=new a.ConnEnd(p);p.delete();return end;}),dst],spans=[];
      for(let i=1;i<ends.length;i++){const reverse=i===1&&checkpoints.length&&terminalArrivals.has(e.id);if(reverse)reversed.add(e.id);const conn=new a.ConnRef(router,reverse?ends[i]:ends[i-1],reverse?ends[i-1]:ends[i]);conn.setRoutingType(a.ConnType.ConnType_Orthogonal);spans.push(conn);}
      for(const end of ends)end.delete();
      if(e.source===e.target&&!checkpoints.length){const n=objects.get(e.source),ordinal=model.edges.filter(other=>other.source===e.source&&other.target===e.target).indexOf(e),distance=40+ordinal*24,p=new a.Point(n.x+n.width+distance,n.y-distance),check=new a.Checkpoint(p),checks=new a.CheckpointVector();checks.push_back(check);spans[0].setRoutingCheckpoints(checks);checks.delete();check.delete();p.delete();}
      connections.set(e.id,spans);
    }
    const readRoutes=()=>{
      const routes=new Map(),spanRoutes=new Map();
      for(const e of model.edges) {
        let points;
        if(e.routing==='straight' && e.source!==e.target) {
          const ports=attachments.get(e.id),source=ports.source.point,target=ports.target.point;
          points=[straightEndpoint(objects.get(e.source),source,target),straightEndpoint(objects.get(e.target),target,source)];
        } else {
          points=[];const spans=[];
          for(const [index,conn]of connections.get(e.id).entries()){
            const line=conn.displayRoute(),span=[];
            for(let i=0;i<line.size();i++){const p=line.at(i);span.push({x:p.x,y:p.y});p.delete();}line.delete();
            if(index===0&&reversed.has(e.id))span.reverse();
            for(const point of span){const last=points.at(-1);if(!last||last.x!==point.x||last.y!==point.y)points.push(point);}spans.push(span);
          }
          spanRoutes.set(e.id,spans);
        }
        if(points.length<2 || points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))) throw new Error(`The routing engine could not route ${e.id}.`);
        routes.set(e.id,points);
      }
      return {routes,spanRoutes};
    };
    router.processTransaction();const baseline=readRoutes(),repairs=new Map();this.routes=baseline.routes;
    for(const [id,points]of waypoints){const candidates=findJoinRepairs(points,baseline.spanRoutes.get(id),{terminalArrival:terminalArrivals.has(id)});if(candidates.size)repairs.set(id,candidates);}
    if(!repairs.size)return this.routes;
    // One additional native transaction at most. Candidates never feed a cleanup loop.
    try{
      for(const [id,candidates]of repairs)for(const [index,{point,directions}]of candidates){
        const p=new a.Point(point.x,point.y),checkpoint=new a.Checkpoint(p,index===0&&reversed.has(id)?15:candidates.get(index).arrival||15,index===0&&reversed.has(id)?candidates.get(index).arrival:directions),checks=new a.CheckpointVector();checks.push_back(checkpoint);
        connections.get(id)[index].setRoutingCheckpoints(checks);checks.delete();checkpoint.delete();p.delete();
      }
      router.processTransaction();const candidate=readRoutes();
      const accepted=model.edges.every(edge=>{
        const before=baseline.routes.get(edge.id),after=candidate.routes.get(edge.id),pending=repairs.get(edge.id);
        return pending?acceptJoinRepair(model,edge,{route:before,spans:baseline.spanRoutes.get(edge.id)},{route:after,spans:candidate.spanRoutes.get(edge.id)},pending):sameRoute(before,after);
      });
      if(accepted)this.routes=candidate.routes;
    }catch{
      // The already validated baseline remains usable if a candidate cannot be routed.
      this.routes=baseline.routes;
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
