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
const zone=(id,x,y,width=280,height=180,parentId=null)=>({id,label:id,x,y,width,height,parentId});
const normals={north:{x:0,y:-1},south:{x:0,y:1},west:{x:-1,y:0},east:{x:1,y:0}};
function approach(points,end,n,side,inward=false){
 const p=end==='source'?points[0]:points.at(-1),q=end==='source'?points[1]:points.at(-2),normal=normals[side],sign=inward?-1:1;
 assert.ok(Math.abs((q.x-p.x)*normal.y-(q.y-p.y)*normal.x)<.001,'approach is perpendicular to '+n.id+' '+side);
 assert.ok(((q.x-p.x)*normal.x+(q.y-p.y)*normal.y)*sign>0,'approach meets the correct side of the border of '+n.id);
}
test('offset zone-to-zone connections meet facing borders normally and reroute after either zone moves',()=>{
 const m=emptyModel();m.zones=[zone('Left',50,80),zone('Right',620,110)];m.edges=[edge('E','Left','Right')];
 for(const move of [()=>{},()=>{m.zones[1].y+=120;},()=>{m.zones[0].x=1100;m.zones[0].y=150;},()=>{m.zones[1].x=1100;m.zones[1].y=650;}]){
  move();const [a,b]=m.zones,p=router.route(m).get('E');orthogonal(p);const dx=b.x+b.width/2-a.x-a.width/2,dy=b.y+b.height/2-a.y-a.height/2,side=Math.abs(dx)>Math.abs(dy)?dx>0?'east':'west':dy>0?'south':'north',opposite={east:'west',west:'east',north:'south',south:'north'}[side];approach(p,'source',a,side);approach(p,'target',b,opposite);
 }
});
test('node-to-zone and zone-to-node connections respect all four explicit attachment sides',()=>{
 for(const sourceSide of Object.keys(normals))for(const targetSide of Object.keys(normals))for(const reverse of [false,true]){
  const m=emptyModel();m.zones=[zone('Z',430,160)];m.nodes=[node('N',50,70)];m.edges=[{...edge('E',reverse?'Z':'N',reverse?'N':'Z'),sourceSide,targetSide}];const p=router.route(m).get('E'),objects=new Map([...m.nodes,...m.zones].map(n=>[n.id,n]));orthogonal(p);approach(p,'source',objects.get(m.edges[0].source),sourceSide);approach(p,'target',objects.get(m.edges[0].target),targetSide);
 }
});
test('zone endpoint constraints preserve leaf obstacle avoidance after moving and resizing endpoints',()=>{
 const m=emptyModel();m.zones=[zone('Z',600,70)];m.nodes=[node('N',20,100),node('Obstacle',310,50)];m.edges=[edge('E','N','Z')];
 for(const modify of [()=>{},()=>{m.zones[0].y=240;m.zones[0].height=220;},()=>{m.nodes[0].y=200;m.zones[0].width=340;}]){modify();const p=router.route(m).get('E');orthogonal(p);avoids(p,m.nodes[1]);approach(p,'source',m.nodes[0],'east');approach(p,'target',m.zones[0],'west');}
});
test('parent nodes in every shape use the same constrained outline approaches as zones',()=>{
 for(const shape of ['rectangle','rounded','circle','diamond','cylinder'])for(const side of Object.keys(normals)){
  const m=emptyModel();m.nodes=[{...node('Parent',20,40),container:true,shape,width:280,height:280},node('Leaf',650,150)];m.edges=[{...edge('E','Parent','Leaf'),sourceSide:side,targetSide:'west'},{...edge('R','Leaf','Parent'),sourceSide:'west',targetSide:side}];
  for(const [id,p]of router.route(m)){orthogonal(p);approach(p,id==='E'?'source':'target',m.nodes[0],side);const end=id==='E'?p[0]:p.at(-1),n=m.nodes[0],dx=(end.x-n.x-n.width/2)/(n.width/2),dy=(end.y-n.y-n.height/2)/(n.height/2);if(shape==='circle')assert.ok(Math.abs(dx*dx+dy*dy-1)<.001);else if(shape==='diamond')assert.ok(Math.abs(Math.abs(dx)+Math.abs(dy)-1)<.001);}
 }
});
test('connections within nested zones approach their containing borders from the interior and loops from outside',()=>{
 const m=emptyModel();m.zones=[zone('Outer',0,0,700,500),zone('Inner',70,80,350,260,'Outer')];m.nodes=[{...node('Child',160,160),parentId:'Inner'}];m.edges=[{...edge('Out','Outer','Inner'),sourceSide:'west',targetSide:'west'},{...edge('In','Child','Inner'),sourceSide:'west',targetSide:'west'},edge('Loop','Outer','Outer')];const paths=router.route(m);for(const p of paths.values())orthogonal(p);
 approach(paths.get('Out'),'source',m.zones[0],'west',true);approach(paths.get('Out'),'target',m.zones[1],'west');approach(paths.get('In'),'target',m.zones[1],'west',true);approach(paths.get('Loop'),'source',m.zones[0],'east');approach(paths.get('Loop'),'target',m.zones[0],'north');assert.ok(paths.get('Loop').length>=4);
});
test('parallel zone connections keep distinct border attachments and correct approaches on every edge',()=>{
 const m=emptyModel();m.zones=[zone('Left',10,40),zone('Right',520,75)];m.edges=[edge('One','Left','Right'),edge('Two','Left','Right'),{...edge('Back','Right','Left'),direction:'both'}];const paths=router.route(m),left=[],right=[];
 for(const e of m.edges){const p=paths.get(e.id);orthogonal(p);const from=m.zones.find(n=>n.id===e.source),to=m.zones.find(n=>n.id===e.target);approach(p,'source',from,from.id==='Left'?'east':'west');approach(p,'target',to,to.id==='Left'?'east':'west');left.push((e.source==='Left'?p[0]:p.at(-1)).y);right.push((e.source==='Right'?p[0]:p.at(-1)).y);}
 for(const pins of [left,right]){pins.sort((a,b)=>a-b);assert.ok(pins[1]-pins[0]>=11.99&&pins[2]-pins[1]>=11.99);}
});
test('connections to a zone leave unrelated routes through its body and title unobstructed',()=>{
 const m=emptyModel();m.nodes=[node('A',0,0),node('B',520,0),node('Outside',720,160)];m.edges=[edge('Crossing','A','B')];const original=router.route(m).get('Crossing');m.zones=[zone('Z',220,20,180,260)];m.edges.push(edge('ZoneEdge','Z','Outside'));assert.deepEqual(router.route(m).get('Crossing'),original,'connected zone body and title stay traversable away from its ports');
});
function visits(points,waypoints){let segment=1;for(const p of waypoints){while(segment<points.length){const a=points[segment-1],b=points[segment],cross=Math.abs((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x));if(cross<.01&&p.x>=Math.min(a.x,b.x)-.01&&p.x<=Math.max(a.x,b.x)+.01&&p.y>=Math.min(a.y,b.y)-.01&&p.y<=Math.max(a.y,b.y)+.01)break;segment++;}assert.ok(segment<points.length,`route visits ${p.x},${p.y} in order`);}}
test('manual waypoints keep ordered corridors and forced sides for every shape and endpoint movement',()=>{
 for(const shape of ['rectangle','rounded','diamond','circle','cylinder'])for(const side of Object.keys(normals)){
  const m=emptyModel();m.nodes=[{...node('A',50,50),shape},node('B',650,80),node('Obstacle',350,0)];m.edges=[{...edge('E','A','B'),sourceSide:side,targetSide:'west',waypoints:[{x:260,y:260},{x:570,y:260}]}];
  for(const move of [()=>{},()=>{m.nodes[0].y+=120;},()=>{m.nodes[1].y+=200;m.nodes[0].width+=30;}]){move();const p=router.route(m).get('E');orthogonal(p);visits(p,m.edges[0].waypoints);approach(p,'source',m.nodes[0],side);approach(p,'target',m.nodes[1],'west');avoids(p,m.nodes[2]);}
 }
});
test('manual checkpoints work for zones, containers, parallel connections and self loops',()=>{
 const m=emptyModel();m.zones=[zone('Z',0,0,300,200)];m.nodes=[{...node('Parent',550,0),container:true,width:250,height:220},{...node('Child',600,100),parentId:'Parent'}];
 m.edges=[{...edge('One','Z','Parent'),sourceSide:'south',targetSide:'south',waypoints:[{x:350,y:350}]},{...edge('Two','Z','Parent'),waypoints:[{x:350,y:450}]},{...edge('Loop','Child','Child'),sourceSide:'east',targetSide:'north',waypoints:[{x:900,y:300},{x:900,y:-80}]}];
 for(const e of m.edges){const p=router.route(m).get(e.id);orthogonal(p);visits(p,e.waypoints);}approach(router.route(m).get('One'),'source',m.zones[0],'south');approach(router.route(m).get('One'),'target',m.nodes[0],'south');
});
test('covered checkpoints remain saved and resume when the blocking node leaves',async()=>{
 const {waypointConflicts}=await import('../waypoints.mjs');const m=emptyModel();m.nodes=[node('A',0,0),node('B',650,0),node('Obstacle',300,250)];m.edges=[{...edge('E','A','B'),waypoints:[{x:340,y:280},{x:540,y:280}]}];const original=structuredClone(m.edges[0].waypoints);
 assert.equal(waypointConflicts(m,m.edges[0]).length,1);const blocked=router.route(m).get('E');orthogonal(blocked);avoids(blocked,m.nodes[2]);visits(blocked,[original[1]]);assert.deepEqual(m.edges[0].waypoints,original);m.nodes[2].y=500;assert.equal(waypointConflicts(m,m.edges[0]).length,0);visits(router.route(m).get('E'),original);
});
test('coincident waypoints and reversed spans preserve their positions without invalid paths',()=>{
 const m=emptyModel();m.nodes=[node('A',0,0),node('B',650,0)];m.edges=[{...edge('E','A','B'),sourceSide:'east',targetSide:'west',waypoints:[{x:300,y:300},{x:300,y:300},{x:300,y:450},{x:300,y:200}]}];const path=router.route(m).get('E');orthogonal(path);visits(path,m.edges[0].waypoints);
});
