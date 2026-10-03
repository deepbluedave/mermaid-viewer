// Select native rerouting candidates; never rewrite a routed polyline or a waypoint.
const epsilon=1e-4;
const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
const samePoint=(a,b)=>distance(a,b)<=epsilon;
export const sameRoute=(a,b)=>a.length===b.length&&a.every((p,i)=>samePoint(p,b[i]));
const length=points=>points.slice(1).reduce((sum,p,i)=>sum+distance(points[i],p),0);
function reverses(a,b,c){const x=b.x-a.x,y=b.y-a.y,u=c.x-b.x,v=c.y-b.y;return distance(a,b)>epsilon&&distance(b,c)>epsilon&&Math.abs(x*v-y*u)<=epsilon&&x*u+y*v<-epsilon;}
function retraces(points){return points.slice(1,-1).flatMap((p,i)=>reverses(points[i],p,points[i+2])?[{point:p,length:Math.min(distance(points[i],p),distance(p,points[i+2]))}]:[]);}

export function findJoinRepairs(waypoints,spans,{terminalArrival=false}={}){
  const repairs=new Map();
  for(let i=0;i<waypoints.length;i++){
    const incoming=spans[i],outgoing=spans[i+1],point=waypoints[i];
    // Coincident points and explicitly doubled-back waypoint sequences keep their routes.
    if(incoming.length<2||outgoing.length<2)continue;
    const previous=incoming.at(-2),next=outgoing[1],following=waypoints[i+1];
    if(!reverses(previous,point,next))continue;
    if(following&&reverses(previous,point,following)){
      // An offset outline pin is not an explicit earlier waypoint. For a reordered
      // terminal span, try arriving sideways rather than retracing at its first point.
      if(i===0&&terminalArrival)repairs.set(0,{point,arrival:Math.abs(next.x-point.x)<=epsilon?12:3,directions:15});
      continue;
    }
    repairs.set(i+1,{point,directions:Math.abs(previous.x-point.x)<=epsilon?12:3});
  }
  return repairs;
}

function direction(a,b){return Math.abs(b.x-a.x)>epsilon?(b.x>a.x?8:4):(b.y>a.y?2:1);}
function crossesInterior(a,b,box){
  if(Math.abs(a.x-b.x)<=epsilon)return a.x>box.x+epsilon&&a.x<box.x+box.width-epsilon&&Math.max(a.y,b.y)>box.y+epsilon&&Math.min(a.y,b.y)<box.y+box.height-epsilon;
  return a.y>box.y+epsilon&&a.y<box.y+box.height-epsilon&&Math.max(a.x,b.x)>box.x+epsilon&&Math.min(a.x,b.x)<box.x+box.width-epsilon;
}

export function acceptJoinRepair(model,edge,before,after,repairs){
  const old=before.route,points=after.route;
  if(points.length<2||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return false;
  if(points.some((p,i)=>i&&Math.abs(p.x-points[i-1].x)>epsilon&&Math.abs(p.y-points[i-1].y)>epsilon))return false;
  if(length(points)>length(old)+epsilon)return false;
  if(before.spans.length!==after.spans.length)return false;
  for(let i=0;i<before.spans.length;i++){
    const a=before.spans[i],b=after.spans[i];
    // Fixed span endpoints preserve every unblocked waypoint in its original order.
    if(!b.length||!samePoint(a[0],b[0])||!samePoint(a.at(-1),b.at(-1)))return false;
    if(!repairs.has(i)&&!sameRoute(a,b))return false;
  }
  for(const [i,{point}]of repairs){
    const incoming=after.spans[i===0?0:i-1],outgoing=after.spans[i===0?1:i];
    if(incoming.length<2||outgoing.length<2||reverses(incoming.at(-2),point,outgoing[1]))return false;
  }
  if(direction(points[0],points[1])!==direction(old[0],old[1])||direction(points.at(-1),points.at(-2))!==direction(old.at(-1),old.at(-2)))return false;
  const oldRetraces=retraces(old),newRetraces=retraces(points);
  if(newRetraces.length>=oldRetraces.length||newRetraces.some(r=>!oldRetraces.some(o=>samePoint(o.point,r.point))))return false;
  if(newRetraces.reduce((sum,r)=>sum+r.length,0)>=oldRetraces.reduce((sum,r)=>sum+r.length,0)-epsilon)return false;
  for(const node of model.nodes.filter(n=>!n.container)){
    const box={x:node.x-8,y:node.y-8,width:node.width+16,height:node.height+16};
    for(let i=1;i<points.length;i++){
      // Only the first/last terminal segment may traverse its endpoint's buffer.
      if(i===1&&node.id===edge.source||i===points.length-1&&node.id===edge.target)continue;
      if(crossesInterior(points[i-1],points[i],box))return false;
    }
  }
  return true;
}
