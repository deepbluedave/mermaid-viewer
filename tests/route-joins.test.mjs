import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AvoidLib} from '../vendor/libavoid/dist/index-node.mjs';
import {DiagramRouter} from '../routing.mjs';
import {emptyModel} from '../core.mjs';
import {waypointConflicts} from '../waypoints.mjs';
import {findJoinRepairs,acceptJoinRepair} from '../route-joins.mjs';

await AvoidLib.load(new URL('../vendor/libavoid/dist/libavoid.wasm',import.meta.url).pathname);
const avoid=AvoidLib.getInstance(),epsilon=1e-4;
const node=(id,x,y,shape='rectangle')=>({id,label:id,shape,x,y,width:120,height:70,parentId:null});
const edge=(id='E',source='A',target='B')=>({id,source,target,label:'',direction:'forward',style:'normal',routing:'orthogonal',sourceSide:'east',targetSide:'west',waypoints:[{x:300,y:535},{x:300,y:85}]});
const length=points=>points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-points[i].x,p.y-points[i].y),0);
const retraces=points=>points.slice(1,-1).filter((b,i)=>{const a=points[i],c=points[i+2];return Math.abs((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x))<epsilon&&(b.x-a.x)*(c.x-b.x)+(b.y-a.y)*(c.y-b.y)<-epsilon;});
function fixture(){const model=emptyModel();model.nodes=[node('A',50,500),node('B',650,56)];model.edges=[edge()];return model;}
function readLine(conn){const line=conn.displayRoute(),points=[];for(let i=0;i<line.size();i++){const p=line.at(i);points.push({x:p.x,y:p.y});p.delete();}line.delete();return points;}
function concatenate(spans){const points=[];for(const span of spans)for(const p of span){const last=points.at(-1);if(!last||p.x!==last.x||p.y!==last.y)points.push(p);}return points;}

// Observe the first native transaction as an independent fallback/reference route.
// Instrumentation changes neither native geometry nor the application's repair logic.
function evaluate(model,{failCandidate=false}={}){
  let refs=[],transactions=0,initial=[];
  const instrumented={...avoid,
    Router:function(flags){refs=[];const native=new avoid.Router(flags),process=native.processTransaction.bind(native);native.processTransaction=()=>{transactions++;if(failCandidate&&transactions===2)throw new Error('Candidate unavailable');process();if(transactions===1)initial=refs.map(readLine);};return native;},
    ConnRef:function(...args){const conn=new avoid.ConnRef(...args);refs.push(conn);return conn;}
  };
  const router=new DiagramRouter(instrumented),before=JSON.stringify(model);
  try{
    const routes=router.route(model,{optimize:false}),baseline=new Map(),spanRoutes=new Map();let offset=0;
    for(const e of model.edges){
      if(e.routing==='straight'&&e.source!==e.target){baseline.set(e.id,routes.get(e.id));continue;}
      const blocked=new Set(waypointConflicts(model,e).map(c=>c.index)),count=(e.waypoints||[]).filter((_,i)=>!blocked.has(i)).length+1,spans=initial.slice(offset,offset+count);offset+=count;spanRoutes.set(e.id,spans);baseline.set(e.id,concatenate(spans));
    }
    assert.equal(JSON.stringify(model),before,'routing must never change the diagram');
    assert.ok(transactions<=2,'only one repair transaction is allowed');
    return {routes,baseline,spanRoutes,transactions};
  }finally{router.dispose();}
}
function visits(points,waypoints){
  let last=-epsilon,distance=0;const segments=[];
  for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],size=Math.hypot(b.x-a.x,b.y-a.y);segments.push({a,b,size,distance});distance+=size;}
  for(const point of waypoints){
    const hits=segments.flatMap(({a,b,size,distance})=>{const t=size?((point.x-a.x)*(b.x-a.x)+(point.y-a.y)*(b.y-a.y))/(size*size):0;return t>=-epsilon&&t<=1+epsilon&&Math.hypot(point.x-a.x-t*(b.x-a.x),point.y-a.y-t*(b.y-a.y))<epsilon?[distance+t*size]:[];}).filter(n=>n>=last-epsilon).sort((a,b)=>a-b);
    assert.ok(hits.length,`visit ${point.x},${point.y} in order`);last=hits[0];
  }
}
function invariantChecks(model,path,baseline,e){
  assert.deepEqual(path[0],baseline[0]);assert.deepEqual(path.at(-1),baseline.at(-1));
  const direction=(a,b)=>[Math.sign(b.x-a.x),Math.sign(b.y-a.y)];
  assert.deepEqual(direction(path[0],path[1]),direction(baseline[0],baseline[1]));assert.deepEqual(direction(path.at(-1),path.at(-2)),direction(baseline.at(-1),baseline.at(-2)));
  assert.ok(length(path)<=length(baseline)+epsilon,'a repair must not lengthen the route');
  for(let i=1;i<path.length;i++)assert.ok(Math.abs(path[i].x-path[i-1].x)<epsilon||Math.abs(path[i].y-path[i-1].y)<epsilon,'orthogonal segments');
  const blocked=new Set(waypointConflicts(model,e).map(c=>c.index));visits(path,(e.waypoints||[]).filter((_,i)=>!blocked.has(i)));
  for(const n of model.nodes.filter(n=>!n.container&&n.id!==e.source&&n.id!==e.target))for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i];
    if(a.x===b.x)assert.ok(!(a.x>n.x-8+epsilon&&a.x<n.x+n.width+8-epsilon&&Math.max(a.y,b.y)>n.y-8+epsilon&&Math.min(a.y,b.y)<n.y+n.height+8-epsilon));
    else assert.ok(!(a.y>n.y-8+epsilon&&a.y<n.y+n.height+8-epsilon&&Math.max(a.x,b.x)>n.x-8+epsilon&&Math.min(a.x,b.x)<n.x+n.width+8-epsilon));
  }
}

test('the saved lunar dispatch repair preserves waypoints, pin spacing, labels and unrelated routes',()=>{
  const model=JSON.parse(readFileSync(new URL('artifacts/f2-lunar-rescue.mermaid-project.json',import.meta.url))),{routes,baseline,transactions}=evaluate(model),path=routes.get('Edge5');
  assert.equal(transactions,2);assert.equal(retraces(baseline.get('Edge5')).length,1);assert.equal(retraces(path).length,0);
  const dispatch=model.edges.find(e=>e.id==='Edge5');invariantChecks(model,path,baseline.get('Edge5'),dispatch);
  for(const e of model.edges)if(e.id!=='Edge5')assert.deepEqual(routes.get(e.id),baseline.get(e.id),'unrelated '+e.id);
});
test('all shapes and forced target sides retain invariants across alignment and pin changes',()=>{
  let improved=0;
  for(const shape of ['rectangle','rounded','circle','diamond','cylinder'])for(const side of ['north','south','west','east'])for(const dy of [-40,-12,-6,-1,0,1,6,12,40]){
    const model=fixture();model.nodes[0].shape=model.nodes[1].shape=shape;model.nodes[1].y=50+dy;model.edges[0].targetSide=side;
    const {routes,baseline}=evaluate(model),path=routes.get('E');invariantChecks(model,path,baseline.get('E'),model.edges[0]);if(retraces(path).length<retraces(baseline.get('E')).length)improved++;
  }
  assert.ok(improved>=80,'exercise repairs rather than only fallback paths');
  for(const count of [2,3,7,12])for(const dy of [-6,0,6]){
    const model=fixture();model.nodes[1].y=50+dy;model.nodes.push(node('C',650,350));for(let i=1;i<count;i++)model.edges.push({...edge('P'+i,'B','C'),sourceSide:'west',waypoints:[]});
    const {routes,baseline}=evaluate(model);invariantChecks(model,routes.get('E'),baseline.get('E'),model.edges[0]);for(const e of model.edges.slice(1))assert.deepEqual(routes.get(e.id),baseline.get(e.id));
  }
});
test('an obstacle detour falls back to the original path, while a clear turn is repaired',()=>{
  for(const y of [50,100,120,200,350,500]){
    const model=fixture();model.nodes.push(node('Obstacle',310,y));const {routes,baseline,transactions}=evaluate(model);assert.equal(transactions,2);assert.deepEqual(routes.get('E'),baseline.get('E'));invariantChecks(model,routes.get('E'),baseline.get('E'),model.edges[0]);
  }
  const model=fixture(),{routes,baseline}=evaluate(model);assert.notDeepEqual(routes.get('E'),baseline.get('E'));assert.equal(retraces(routes.get('E')).length,0);
});
test('deliberate reversals and coincident waypoints retain their exact spans without a repair pass',()=>{
  const model=fixture();model.nodes=[node('A',0,0),node('B',650,0)];model.edges[0].waypoints=[{x:300,y:300},{x:300,y:300},{x:300,y:450},{x:300,y:200}];const {routes,baseline,transactions}=evaluate(model);assert.equal(transactions,1);assert.deepEqual(routes.get('E'),baseline.get('E'));visits(routes.get('E'),model.edges[0].waypoints);assert.ok(retraces(routes.get('E')).length);
});
test('container interiors, self loops and blocked point recovery retain routing guarantees',()=>{
  for(const container of [false,true]){
    const model=fixture(),parent={id:'Z',label:'Z',x:0,y:0,width:800,height:650,parentId:null};if(container)model.nodes.unshift({...parent,shape:'rectangle',container:true});else model.zones.push(parent);for(const n of model.nodes.filter(n=>n.id!=='Z'))n.parentId='Z';model.edges.push({...edge('Parent','A','Z'),targetSide:'north',waypoints:[{x:850,y:400}]});
    const {routes,baseline}=evaluate(model);for(const e of model.edges)invariantChecks(model,routes.get(e.id),baseline.get(e.id),e);
  }
  const model=fixture();model.edges[0].target='A';model.edges[0].targetSide='north';model.edges[0].waypoints=[{x:400,y:700},{x:400,y:450}];let result=evaluate(model);invariantChecks(model,result.routes.get('E'),result.baseline.get('E'),model.edges[0]);
  model.edges[0].target='B';model.edges[0].targetSide='west';model.edges[0].waypoints=edge().waypoints;model.nodes.push(node('Blocker',280,60));result=evaluate(model);assert.equal(waypointConflicts(model,model.edges[0]).length,1);invariantChecks(model,result.routes.get('E'),result.baseline.get('E'),model.edges[0]);model.nodes.at(-1).y=250;result=evaluate(model);assert.equal(waypointConflicts(model,model.edges[0]).length,0);invariantChecks(model,result.routes.get('E'),result.baseline.get('E'),model.edges[0]);
});
test('identical input, edge reordering and moving out/back produce stable routes',()=>{
  const model=JSON.parse(readFileSync(new URL('artifacts/f2-lunar-rescue.mermaid-project.json',import.meta.url))),initial=evaluate(model).routes;
  for(let i=0;i<5;i++)assert.deepEqual(evaluate(model).routes,initial);
  model.edges.reverse();const reordered=evaluate(model).routes;for(const [id,path]of initial)assert.deepEqual(reordered.get(id),path);
  const target=model.nodes.find(n=>n.id==='Node5'),originalY=target.y;for(const delta of [-20,-6,0,6,20,0]){target.y=originalY+delta;const {routes,baseline}=evaluate(model);for(const e of model.edges)invariantChecks(model,routes.get(e.id),baseline.get(e.id),e);}target.y=originalY;assert.deepEqual(evaluate(model).routes,reordered);
});
test('subpixel pointer rounding on another connection cannot veto the dispatch repair',()=>{
  const original=JSON.parse(readFileSync(new URL('artifacts/f2-lunar-rescue.mermaid-project.json',import.meta.url)));
  for(const delta of [1e-7,2e-5,8.031247526e-5,2e-4,.001,-1e-7,-2e-5,-8.031247526e-5,-2e-4,-.001]){
    const model=structuredClone(original),target=model.nodes.find(n=>n.id==='Node5');target.y+=delta;target.x-=2e-13;
    const {routes,baseline}=evaluate(model);assert.equal(retraces(routes.get('Edge5')).length,0,'correct dispatch at delta '+delta);for(const e of model.edges)invariantChecks(model,routes.get(e.id),baseline.get(e.id),e);
  }
});
test('a candidate error falls back cleanly and ordinary edges use only one transaction',()=>{
  const model=fixture(),result=evaluate(model,{failCandidate:true});assert.equal(result.transactions,2);assert.deepEqual(result.routes,result.baseline);
  model.edges[0].waypoints=[];assert.equal(evaluate(model).transactions,1);
});
test('a rejected repair on one edge retains the entire baseline rather than mixing native transactions',()=>{
  const model=fixture();model.nodes.push(node('C',1250,500),node('D',1850,56),node('Obstacle',1510,100));model.edges.push({...edge('Other','C','D'),waypoints:[{x:1500,y:535},{x:1500,y:85}]});
  const {routes,baseline,transactions}=evaluate(model);assert.equal(transactions,2);assert.deepEqual(routes,baseline);assert.equal(retraces(routes.get('E')).length,1);
});
test('acceptance rejects changed pins, untouched spans, diagonals, longer detours and new obstacles',()=>{
  const model=fixture(),e=model.edges[0],result=evaluate(model),old=result.baseline.get('E'),wps=e.waypoints,before={route:old,spans:result.spanRoutes.get('E')},repairs=findJoinRepairs(wps,before.spans);
  const route=result.routes.get('E'),last=route.findIndex(p=>p.x===wps.at(-1).x&&p.y===wps.at(-1).y),after={route,spans:[before.spans[0],before.spans[1],route.slice(last)]};assert.ok(acceptJoinRepair(model,e,before,after,repairs));
  let bad=structuredClone(after);bad.route.at(-1).y++;bad.spans.at(-1).at(-1).y++;assert.equal(acceptJoinRepair(model,e,before,bad,repairs),false);
  bad=structuredClone(after);bad.spans[0].splice(1,0,{x:200,y:535});assert.equal(acceptJoinRepair(model,e,before,bad,repairs),false);
  bad=structuredClone(after);bad.route[3].y++;assert.equal(acceptJoinRepair(model,e,before,bad,repairs),false);
  bad=structuredClone(after);bad.route.splice(3,0,{x:300,y:0},{x:400,y:0},{x:400,y:85});assert.equal(acceptJoinRepair(model,e,before,bad,repairs),false);
  model.nodes.push(node('New obstacle',430,60));assert.equal(acceptJoinRepair(model,e,before,after,repairs),false);
});
