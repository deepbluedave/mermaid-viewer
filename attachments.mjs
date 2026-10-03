// Attachment choices and comparisons only. libavoid still finds every route.
import {waypointConflicts} from './waypoints.mjs?v=whole-words';
export const attachmentKey=(edgeId,end)=>`${edgeId}:${end}`;
export function attachmentSide(node,other,end,edge){
  if(edge[`${end}Side`])return edge[`${end}Side`];
  if(node.id===other.id)return end==='source'?'east':'north';
  const dx=other.x+other.width/2-node.x-node.width/2,dy=other.y+other.height/2-node.y-node.height/2;
  return Math.abs(dx)>Math.abs(dy)?dx>=0?'east':'west':dy>=0?'south':'north';
}
export function attachmentGroups(model,orders=new Map()){
  const objects=new Map([...model.nodes,...model.zones].map(n=>[n.id,n])),groups=new Map();
  for(const edge of model.edges)for(const end of ['source','target']){
    const n=objects.get(edge[end]),other=objects.get(edge[end==='source'?'target':'source']),side=attachmentSide(n,other,end,edge),key=JSON.stringify([n.id,side]);
    if(!groups.has(key))groups.set(key,{key,n,side,entries:[]});
    groups.get(key).entries.push({n,other,side,edge,edgeId:edge.id,end,key:attachmentKey(edge.id,end)});
  }
  for(const group of groups.values()){
    const horizontal=['north','south'].includes(group.side),axis=horizontal?'x':'y',dimension=horizontal?'width':'height';
    group.entries.sort((a,b)=>(a.other[axis]+a.other[dimension]/2)-(b.other[axis]+b.other[dimension]/2)||a.key.localeCompare(b.key));
    const preference=group.n.attachmentOrder?.[group.side];
    group.manual=Boolean(preference?.some(key=>group.entries.some(e=>e.key===key)));
    const order=group.manual?preference:orders.get(group.key);
    if(order){const ranks=new Map(order.map((key,i)=>[key,i]));group.entries.sort((a,b)=>(ranks.get(a.key)??order.length)-(ranks.get(b.key)??order.length));}
  }
  return groups;
}
export function reorderAttachment(model,groups,edgeId,end,delta){
  const group=[...groups.values()].find(g=>g.entries.some(e=>e.key===attachmentKey(edgeId,end)));
  if(!group)return false;
  const index=group.entries.findIndex(e=>e.key===attachmentKey(edgeId,end)),next=index+delta;
  if(next<0||next>=group.entries.length)return false;
  const order=group.entries.map(e=>e.key);[order[index],order[next]]=[order[next],order[index]];
  const node=[...model.nodes,...model.zones].find(n=>n.id===group.n.id);
  node.attachmentOrder={...node.attachmentOrder,[group.side]:order};return true;
}
export function resetAttachmentOrder(model,nodeId,side){
  const node=[...model.nodes,...model.zones].find(n=>n.id===nodeId);
  if(node?.attachmentOrder){delete node.attachmentOrder[side];if(!Object.keys(node.attachmentOrder).length)delete node.attachmentOrder;}
}
export function pruneAttachmentOrders(model){
  const edges=new Map(model.edges.map(e=>[e.id,e]));
  for(const node of [...model.nodes,...model.zones])if(node.attachmentOrder){
    for(const side of Object.keys(node.attachmentOrder)){
      node.attachmentOrder[side]=node.attachmentOrder[side].filter(key=>{const [id,end]=key.split(':');return edges.get(id)?.[end]===node.id;});
      if(!node.attachmentOrder[side].length)delete node.attachmentOrder[side];
    }
    if(!Object.keys(node.attachmentOrder).length)delete node.attachmentOrder;
  }
}
const epsilon=1e-4,distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const routeLength=points=>points.slice(1).reduce((sum,p,i)=>sum+distance(p,points[i]),0);
export function routeRetraces(points){return points.slice(1,-1).filter((p,i)=>{const a=points[i],b=points[i+2],x=p.x-a.x,y=p.y-a.y,u=b.x-p.x,v=b.y-p.y;return distance(a,p)>epsilon&&distance(p,b)>epsilon&&Math.abs(x*v-y*u)<=epsilon&&x*u+y*v<-epsilon;}).length;}
function segments(points){
  const clean=[];for(const p of points){if(clean.length&&distance(clean.at(-1),p)<=epsilon)continue;while(clean.length>1){const a=clean.at(-2),b=clean.at(-1),x=b.x-a.x,y=b.y-a.y,u=p.x-b.x,v=p.y-b.y;if(Math.abs(x*v-y*u)>epsilon||x*u+y*v<=0)break;clean.pop();}clean.push(p);}
  return clean.slice(1).map((b,i)=>({a:clean[i],b}));
}
export function routeIntersections(first,second){
  const crossings=[],seen=new Set(),contacts=new Set();let overlap=0;
  for(const {a,b}of segments(first))for(const {a:c,b:d}of segments(second)){
    const x=b.x-a.x,y=b.y-a.y,u=d.x-c.x,v=d.y-c.y,den=x*v-y*u;
    if(Math.abs(den)>epsilon){
      const t=((c.x-a.x)*v-(c.y-a.y)*u)/den,s=((c.x-a.x)*y-(c.y-a.y)*x)/den;
      if(t>=-epsilon/distance(a,b)&&t<=1+epsilon/distance(a,b)&&s>=-epsilon/distance(c,d)&&s<=1+epsilon/distance(c,d)){
        const p={x:a.x+t*x,y:a.y+t*y};
        if(![first[0],first.at(-1)].some(q=>distance(p,q)<=epsilon)||![second[0],second.at(-1)].some(q=>distance(p,q)<=epsilon))contacts.add(`${p.x.toFixed(4)},${p.y.toFixed(4)}`);
      }
      if(t>epsilon/distance(a,b)&&t<1-epsilon/distance(a,b)&&s>epsilon/distance(c,d)&&s<1-epsilon/distance(c,d)){
        const p={x:a.x+t*x,y:a.y+t*y},key=`${p.x.toFixed(4)},${p.y.toFixed(4)}`;if(!seen.has(key)){seen.add(key);crossings.push(p);}
      }
    }else if(Math.abs(x*(c.y-a.y)-y*(c.x-a.x))<=epsilon){
      const axis=Math.abs(x)>Math.abs(y)?'x':'y';overlap+=Math.max(0,Math.min(Math.max(a[axis],b[axis]),Math.max(c[axis],d[axis]))-Math.max(Math.min(a[axis],b[axis]),Math.min(c[axis],d[axis])));
    }
  }
  return {crossings,overlap,contacts:contacts.size};
}
function nearby(group,p){
  const n=group.n,reach=Math.min(400,Math.max(240,(group.side==='north'||group.side==='south'?n.width:n.height)*1.5));
  if(group.side==='west')return p.x>=n.x-reach&&p.x<=n.x+epsilon&&p.y>=n.y-24&&p.y<=n.y+n.height+24;
  if(group.side==='east')return p.x>=n.x+n.width-epsilon&&p.x<=n.x+n.width+reach&&p.y>=n.y-24&&p.y<=n.y+n.height+24;
  if(group.side==='north')return p.y>=n.y-reach&&p.y<=n.y+epsilon&&p.x>=n.x-24&&p.x<=n.x+n.width+24;
  return p.y>=n.y+n.height-epsilon&&p.y<=n.y+n.height+reach&&p.x>=n.x-24&&p.x<=n.x+n.width+24;
}
export function attachmentCandidates(groups,routes){
  const candidates=[];
  for(const group of [...groups.values()].sort((a,b)=>a.key.localeCompare(b.key))){
    if(group.manual||group.entries.length<2||group.entries.length>8)continue;
    for(let i=1;i<group.entries.length;i++){
      const a=group.entries[i-1],b=group.entries[i];
      if(a.edgeId===b.edgeId||a.edge.routing!=='orthogonal'||b.edge.routing!=='orthogonal')continue;
      if(!routeIntersections(routes.get(a.edgeId),routes.get(b.edgeId)).crossings.some(p=>nearby(group,p)))continue;
      const order=group.entries.map(e=>e.key);[order[i-1],order[i]]=[order[i],order[i-1]];
      candidates.push({group,order,edges:new Set([a.edgeId,b.edgeId])});
    }
  }
  return candidates.slice(0,4);
}
function segmentHits(a,b,n){
  return Math.abs(a.x-b.x)<=epsilon?a.x>n.x+epsilon&&a.x<n.x+n.width-epsilon&&Math.max(a.y,b.y)>n.y+epsilon&&Math.min(a.y,b.y)<n.y+n.height-epsilon:a.y>n.y+epsilon&&a.y<n.y+n.height-epsilon&&Math.max(a.x,b.x)>n.x+epsilon&&Math.min(a.x,b.x)<n.x+n.width-epsilon;
}
export function acceptAttachmentSwap(model,before,after,candidate){
  let fewer=false,totalBefore=0,totalAfter=0;
  for(const edge of model.edges){
    const old=before.get(edge.id),next=after.get(edge.id);if(!next||next.length<2||next.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return false;
    if(!candidate.edges.has(edge.id)){if(old.length!==next.length||old.some((p,i)=>distance(p,next[i])>epsilon))return false;continue;}
    if(next.some((p,i)=>i&&Math.abs(p.x-next[i-1].x)>epsilon&&Math.abs(p.y-next[i-1].y)>epsilon))return false;
    const blocked=new Set(waypointConflicts(model,edge).map(c=>c.index)),waypoints=(edge.waypoints||[]).filter((_,i)=>!blocked.has(i));
    const minimum=points=>{const fixed=[points[0],...waypoints,points.at(-1)];return fixed.slice(1).reduce((sum,p,i)=>sum+Math.abs(p.x-fixed[i].x)+Math.abs(p.y-fixed[i].y),0);};
    // Moving a pin changes required alignment distance. Compare avoidable detour,
    // and the combined length, rather than rejecting harmless subpixel alignment.
    if(routeLength(next)-minimum(next)>routeLength(old)-minimum(old)+epsilon||routeRetraces(next)>routeRetraces(old))return false;
    totalBefore+=routeLength(old);totalAfter+=routeLength(next);
    // New pins may change terminal coordinates, but never the other endpoint or manual spans.
    const end=candidate.group.entries.find(e=>e.edgeId===edge.id).end;
    if(distance(end==='source'?old.at(-1):old[0],end==='source'?next.at(-1):next[0])>epsilon)return false;
    for(const n of model.nodes.filter(n=>!n.container))for(let i=1;i<next.length;i++){
      if(i===1&&n.id===edge.source||i===next.length-1&&n.id===edge.target)continue;
      if(segmentHits(next[i-1],next[i],{x:n.x-8,y:n.y-8,width:n.width+16,height:n.height+16}))return false;
    }
  }
  if(totalAfter>totalBefore+epsilon)return false;
  for(let i=0;i<model.edges.length;i++)for(let j=i+1;j<model.edges.length;j++){
    const a=model.edges[i].id,b=model.edges[j].id;if(!candidate.edges.has(a)&&!candidate.edges.has(b))continue;
    const old=routeIntersections(before.get(a),before.get(b)),next=routeIntersections(after.get(a),after.get(b));
    if(next.crossings.length>old.crossings.length||next.contacts>old.contacts||next.overlap>old.overlap+epsilon)return false;
    if(next.crossings.length<old.crossings.length)fewer=true;
  }
  const [a,b]=[...candidate.edges],old=routeIntersections(before.get(a),before.get(b)),next=routeIntersections(after.get(a),after.get(b));
  return fewer&&next.crossings.filter(p=>nearby(candidate.group,p)).length<old.crossings.filter(p=>nearby(candidate.group,p)).length;
}
