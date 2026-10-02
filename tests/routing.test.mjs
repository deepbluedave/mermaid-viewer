import test from 'node:test';import assert from 'node:assert/strict';import {AvoidLib} from '../vendor/libavoid/dist/index-node.mjs';import{DiagramRouter}from'../routing.mjs';import{emptyModel}from'../core.mjs';
await AvoidLib.load(new URL('../vendor/libavoid/dist/libavoid.wasm',import.meta.url).pathname);
const router=new DiagramRouter(AvoidLib.getInstance());
const node=(id,x,y)=>({id,x,y,width:120,height:70,label:id,shape:'rectangle',parentId:null});
const edge=(id,source,target)=>({id,source,target,label:'',direction:'forward',style:'normal',routing:'orthogonal',sourceSide:null,targetSide:null});
function orthogonal(points){for(let i=1;i<points.length;i++)assert.ok(Math.abs(points[i].x-points[i-1].x)<.01||Math.abs(points[i].y-points[i-1].y)<.01,'every segment is orthogonal');}
function avoids(points,b){for(let i=1;i<points.length;i++){const a=points[i-1],c=points[i];if(a.x===c.x)assert.ok(!(a.x>b.x+.01&&a.x<b.x+b.width-.01&&Math.max(a.y,c.y)>b.y+.01&&Math.min(a.y,c.y)<b.y+b.height-.01));else assert.ok(!(a.y>b.y+.01&&a.y<b.y+b.height-.01&&Math.max(a.x,c.x)>b.x+.01&&Math.min(a.x,c.x)<b.x+b.width-.01));}}
test('orthogonal routes avoid obstacles before and after a node moves',()=>{const m=emptyModel();m.nodes=[node('A',0,0),node('B',500,0),node('Obstacle',240,-30)];m.edges=[edge('e1','A','B')];const before=router.route(m).get('e1');orthogonal(before);avoids(before,m.nodes[2]);m.nodes[1].y=180;const after=router.route(m).get('e1');orthogonal(after);avoids(after,m.nodes[2]);assert.notDeepEqual(before,after);assert.equal(after.at(-1).x,m.nodes[1].x);});
test('self loops use real outward routing and remain attached after moving',()=>{const m=emptyModel();m.nodes=[node('A',50,50)];m.edges=[edge('loop','A','A')];const before=router.route(m).get('loop');orthogonal(before);assert.ok(before.length>=4);assert.equal(before[0].x,170);assert.equal(before.at(-1).y,50);m.nodes[0].x+=100;const after=router.route(m).get('loop');assert.equal(after[0].x,270);orthogonal(after);});
test('parallel edges get distinct routes, while straight edges stay straight',()=>{const m=emptyModel();m.nodes=[node('A',0,0),node('B',500,200)];m.edges=[edge('one','A','B'),edge('two','A','B'),{...edge('straight','A','B'),routing:'straight'}];const routes=router.route(m);orthogonal(routes.get('one'));orthogonal(routes.get('two'));assert.notDeepEqual(routes.get('one'),routes.get('two'));assert.equal(routes.get('straight').length,2);});
test('nested zones and their titles never change routes, while contained nodes remain obstacles',()=>{
  const m=emptyModel();m.nodes=[node('A',0,0),node('B',520,0)];m.edges=[edge('crossing','A','B')];
  const original=router.route(m).get('crossing');
  m.zones=[{id:'Outer',label:'Outer',x:180,y:20,width:300,height:250,parentId:null},{id:'Inner',label:'Inner',x:220,y:30,width:200,height:150,parentId:'Outer'}];
  assert.deepEqual(router.route(m).get('crossing'),original,'crossing both title bands does not cause a detour');
  m.zones[0].y-=15;m.zones[1].x+=10;
  assert.deepEqual(router.route(m).get('crossing'),original,'moving zones does not introduce an obstacle');
  m.nodes.push({...node('Obstacle',280,20),parentId:'Inner'});
  const detour=router.route(m).get('crossing');orthogonal(detour);avoids(detour,m.nodes[2]);assert.notDeepEqual(detour,original);
  m.zones=[];assert.deepEqual(router.route(m).get('crossing'),detour,'the node alone determines the detour');
});
test('connections explicitly targeting traversable zones remain attached to their borders',()=>{
  const m=emptyModel();m.zones=[{id:'Zone',label:'Zone',x:0,y:0,width:280,height:180,parentId:null}];m.nodes=[node('B',500,150)];
  m.edges=[{...edge('zoneEdge','Zone','B'),sourceSide:'east',targetSide:'west'}];
  const before=router.route(m).get('zoneEdge');orthogonal(before);assert.deepEqual(before[0],{x:280,y:90});assert.deepEqual(before.at(-1),{x:500,y:185});
  m.zones[0].x+=40;m.zones[0].y+=30;
  const after=router.route(m).get('zoneEdge');orthogonal(after);assert.deepEqual(after[0],{x:320,y:120});assert.deepEqual(after.at(-1),before.at(-1));
});
test.after(()=>router.dispose());
test('parallel connections spread their attachments on the actual outline of every node shape',()=>{
 for(const shape of ['rectangle','diamond','circle','cylinder','rounded'])for(const vertical of [false,true]){
  const m=emptyModel();m.nodes=[{...node('A',0,0),shape},{...node('B',vertical?200:500,vertical?500:200),shape}];m.edges=[edge('one','A','B'),edge('two','A','B'),edge('three','B','A')];const routes=router.route(m);
  const sourcePoints=[];
  for(const e of m.edges){const route=routes.get(e.id);orthogonal(route);sourcePoints.push(e.source==='A'?route[0]:route.at(-1));
   for(const [p,n]of [[route[0],m.nodes.find(n=>n.id===e.source)],[route.at(-1),m.nodes.find(n=>n.id===e.target)]]){
    const x=p.x-n.x,y=p.y-n.y,dx=(x-n.width/2)/(n.width/2),dy=(y-n.height/2)/(n.height/2);
    if(shape==='circle')assert.ok(Math.abs(dx*dx+dy*dy-1)<.001,'ellipse equation at arrow tip');
    else if(shape==='diamond')assert.ok(Math.abs(Math.abs(dx)+Math.abs(dy)-1)<.001,'diamond equation at arrow tip');
    else if(shape==='cylinder'&&vertical){const cy=y<n.height/2?10:n.height-10;assert.ok(Math.abs(dx*dx+((y-cy)/10)**2-1)<.001,'cylinder cap equation at arrow tip');}
    else assert.ok(Math.min(x,n.width-x,y,n.height-y)<.001,'flat boundary at arrow tip');
   }
  }
  const axis=vertical?'x':'y',coordinates=sourcePoints.map(p=>p[axis]).sort((a,b)=>a-b);assert.ok(coordinates[1]-coordinates[0]>11.9&&coordinates[2]-coordinates[1]>11.9,'separate attachments for '+shape);
 }
});
test('aligned parallel orthogonal and straight connections remain apart along their complete length',()=>{
 const m=emptyModel();m.nodes=[node('A',0,0),node('B',500,0)];m.edges=[edge('one','A','B'),edge('two','A','B'),{...edge('straight','A','B'),routing:'straight'}];
 const routes=router.route(m),ys=[];for(const e of m.edges){const points=routes.get(e.id);orthogonal(points);assert.ok(points.every(p=>Math.abs(p.y-points[0].y)<.001),'aligned connection is a parallel horizontal line');ys.push(points[0].y);}
 ys.sort((a,b)=>a-b);ys.forEach((y,i)=>assert.ok(Math.abs(y-[23,35,47][i])<.001));
 m.nodes[1].x+=120;const moved=router.route(m);for(const e of m.edges){assert.equal(moved.get(e.id).at(-1).x,620);assert.equal(moved.get(e.id)[0].y,routes.get(e.id)[0].y);}
});
test('incoming and outgoing edges share side space ordered towards their other nodes',()=>{
 const m=emptyModel();m.nodes=[node('A',0,0),node('High',500,-200),node('Middle',500,0),node('Low',500,200)];m.edges=[edge('high','A','High'),{...edge('middle','Middle','A'),sourceSide:'west',targetSide:'east'},edge('low','A','Low')];
 const routes=router.route(m);assert.ok(Math.abs(routes.get('high')[0].y-23)<.001);assert.ok(Math.abs(routes.get('middle').at(-1).y-35)<.001);assert.ok(Math.abs(routes.get('low')[0].y-47)<.001);
 m.edges.reverse();const reordered=router.route(m);assert.deepEqual(reordered.get('high')[0],routes.get('high')[0]);assert.deepEqual(reordered.get('middle').at(-1),routes.get('middle').at(-1));assert.deepEqual(reordered.get('low')[0],routes.get('low')[0]);
});
test('straight connections with offset diamond pins start outside the node interior',()=>{
 const m=emptyModel();m.nodes=[{...node('A',0,0),shape:'diamond',width:240,height:108},{...node('B',500,300),shape:'diamond',width:240,height:108}];
 m.edges=['one','two','three','four','five','six','seven'].map(id=>({...edge(id,'A','B'),routing:'straight'}));
 for(const points of router.route(m).values()){
  assert.equal(points.length,2,'still a single straight segment');
  for(const [n,p,q]of [[m.nodes[0],points[0],points[1]],[m.nodes[1],points[1],points[0]]]){
   const norm=p=>Math.abs((p.x-n.x-n.width/2)/(n.width/2))+Math.abs((p.y-n.y-n.height/2)/(n.height/2));
   assert.ok(Math.abs(norm(p)-1)<.001,'endpoint is on diamond outline');
   assert.ok(norm({x:p.x+(q.x-p.x)*.001,y:p.y+(q.y-p.y)*.001})>1,'segment leaves the outline outwards');
  }
 }
});
test('many connections fit on a short node side and stay attached after resize',()=>{
 const m=emptyModel();m.nodes=[node('A',0,0),node('B',500,0)];m.edges=Array.from({length:12},(_,i)=>edge('e'+i,'A','B'));
 for(const height of [54,100]){m.nodes[0].height=m.nodes[1].height=height;const routes=router.route(m),ys=[];for(const points of routes.values()){orthogonal(points);assert.equal(points[0].x,120);assert.equal(points.at(-1).x,500);assert.ok(points[0].y>=height*.2-.001&&points[0].y<=height*.8+.001);ys.push(points[0].y);}assert.equal(new Set(ys).size,12,'all attachment points are distinct');}
});
