import test from 'node:test';
import assert from 'node:assert/strict';
import { AvoidLib } from '../vendor/libavoid/dist/index-node.mjs';
import { DiagramRouter } from '../routing.mjs';
import { layoutEdgeLabels, zoneTitleBox } from '../labels.mjs';
import { emptyModel } from '../core.mjs';
await AvoidLib.load(new URL('../vendor/libavoid/dist/libavoid.wasm',import.meta.url).pathname);
const router=new DiagramRouter(AvoidLib.getInstance());
const node=(id,x,y)=>({id,label:id,x,y,width:120,height:70,shape:'rectangle',parentId:null});
const edge=(id,label)=>({id,label,source:'A',target:'B',direction:'forward',style:'normal',routing:'orthogonal',sourceSide:null,targetSide:null});
const overlap=(a,b)=>a.x+a.width>b.x&&a.x<b.x+b.width&&a.y+a.height>b.y&&a.y<b.y+b.height;
function readable(model,labels){const values=[...labels.values()];for(let i=0;i<values.length;i++){const label=values[i];for(const n of [...model.nodes,...model.zones.map(z=>zoneTitleBox(z,model.settings.fontSize??13))])assert.ok(!overlap(label.box,n),'label avoids '+n.id);for(const other of values.slice(i+1))assert.ok(!overlap(label.box,other.box),'labels '+label.edge.id+' and '+other.edge.id+' stay apart');}}
test('parallel long labels stay separate without moving nodes or changing routes',()=>{
 const m=emptyModel();m.nodes=[node('A',0,0),node('B',400,0)];m.edges=[edge('one','Read configuration'),edge('two','Update configuration'),edge('three','Validate configuration')];
 const routes=router.route(m),before=JSON.stringify({model:m,routes:[...routes]}),labels=layoutEdgeLabels(m,routes);
 assert.equal(labels.size,3);readable(m,labels);assert.ok([...labels.values()].some(l=>l.leader),'off-route labels retain a visible callout');assert.equal(JSON.stringify({model:m,routes:[...routes]}),before);
});
test('labels on short links move clear of nodes and arrowheads',()=>{
 const m=emptyModel();m.nodes=[node('A',0,0),node('B',140,0)];m.edges=[edge('one','A long connection label'),edge('two','Another connection label')];
 const labels=layoutEdgeLabels(m,router.route(m));readable(m,labels);assert.ok([...labels.values()].every(l=>l.leader),'short links use callouts');
});
test('multiline parallel labels avoid zone titles and keep their original text',()=>{
 const m=emptyModel();m.nodes=[node('A',0,0),node('B',500,0)];m.zones=[{id:'Zone',label:'Container title',x:160,y:-40,width:300,height:220,parentId:null}];m.edges=[edge('one','Read configuration\nthen validate'),edge('two','更新配置\n中文标签'),edge('three','Write results')];
 const labels=layoutEdgeLabels(m,router.route(m));readable(m,labels);assert.ok(labels.get('one').lines.length===2);assert.ok(labels.get('two').lines.join('\n').includes('中文标签'));assert.ok([...labels.values()].every(l=>Number.isFinite(l.anchor.x)&&Number.isFinite(l.anchor.y)));
});
test('self-loop and crossing labels remain legible after moving a node',()=>{
 const m=emptyModel();m.nodes=[node('A',0,0),node('B',400,180),node('C',200,70)];m.edges=[edge('one','Read request'),edge('two','Write response'),{...edge('loop','Retry request'),target:'A'}, {...edge('incoming','Another request'),source:'C',target:'A'}];
 for(const y of [180,320]){m.nodes[1].y=y;const labels=layoutEdgeLabels(m,router.route(m));assert.equal(labels.size,4);readable(m,labels);}
});
test.after(()=>router.dispose());
test('manual labels respect exact placement and overlaps without changing routes',async()=>{
 const {manualLabelPosition}=await import('../labels.mjs');const m=emptyModel();m.nodes=[node('A',0,0),node('B',600,0),node('Obstacle',250,120)];m.edges=[edge('E','Docking clearance')];const routes=router.route(m),before=JSON.stringify([...routes]);const center={x:300,y:150};m.edges[0].labelPosition=manualLabelPosition(routes.get('E'),center);const label=layoutEdgeLabels(m,routes).get('E');assert.ok(Math.abs(label.anchor.x-center.x)<.001&&Math.abs(label.anchor.y-center.y)<.001);assert.ok(overlap(label.box,m.nodes[2]),'manual overlap is respected');assert.ok(label.leader,'displaced label has a leader');assert.equal(JSON.stringify([...routes]),before);
});
test('leaders appear only when attachment lies outside the label box and terminate on its border',async()=>{
 const {manualLabelPosition}=await import('../labels.mjs');const m=emptyModel();m.nodes=[node('A',0,0),node('B',600,0)];m.edges=[edge('E','Signal')];const routes=new Map([['E',[{x:120,y:35},{x:600,y:35}]]]);
 for(const [y,leader]of[[35,false],[45,false],[100,true]]){m.edges[0].labelPosition=manualLabelPosition(routes.get('E'),{x:320,y});const label=layoutEdgeLabels(m,routes).get('E');assert.equal(Boolean(label.leader),leader);if(leader){assert.equal(label.leader.start.y,35);assert.equal(label.leader.end.y,label.box.y);assert.ok(label.leader.end.x>=label.box.x&&label.leader.end.x<=label.box.x+label.box.width);}}
});
test('route-following offsets retain separation when a connection lengthens or rotates',async()=>{
 const {manualLabelPosition}=await import('../labels.mjs');const m=emptyModel();m.edges=[edge('E','Navigation beacon')];const first=[{x:0,y:0},{x:400,y:0}];m.edges[0].labelPosition=manualLabelPosition(first,{x:200,y:80});
 for(const [path,expected]of[[[{x:0,y:0},{x:800,y:0}],{x:400,y:80}],[[{x:40,y:50},{x:440,y:50}],{x:240,y:130}],[[{x:0,y:0},{x:0,y:400}],{x:-80,y:200}]]){const label=layoutEdgeLabels(m,new Map([['E',path]])).get('E');assert.deepEqual(label.anchor,expected);assert.ok(label.leader,'route rotation keeps an off-route label off the route');}
});
test('automatic labels avoid manual labels independent of edge ordering',async()=>{
 const {manualLabelPosition}=await import('../labels.mjs');const m=emptyModel();m.nodes=[node('A',0,0),node('B',600,0)];m.edges=[edge('Automatic','Auto beacon'),edge('Manual','Human priority')];const path=[{x:120,y:35},{x:600,y:35}],routes=new Map(m.edges.map(e=>[e.id,path]));m.edges[1].labelPosition=manualLabelPosition(path,{x:360,y:35});for(const edges of [m.edges,[...m.edges].reverse()]){m.edges=edges;const labels=layoutEdgeLabels(m,routes);assert.equal(labels.get('Manual').anchor.x,360);assert.ok(!overlap(labels.get('Manual').box,labels.get('Automatic').box));}
});
test('reset restores collision-aware automatic placement and its leader behavior',async()=>{
 const {manualLabelPosition}=await import('../labels.mjs');const m=emptyModel();m.nodes=[node('A',0,0),node('B',140,0)];m.edges=[edge('E','A very cramped docking clearance')];const routes=router.route(m),automatic=layoutEdgeLabels(m,routes).get('E');assert.ok(automatic.leader);m.edges[0].labelPosition=manualLabelPosition(routes.get('E'),{x:500,y:400});assert.equal(layoutEdgeLabels(m,routes).get('E').anchor.x,500);delete m.edges[0].labelPosition;assert.deepEqual(layoutEdgeLabels(m,routes).get('E'),automatic);
});
test('manual positions validate and persist, including empty-label preferences',async()=>{
 const {validateModel,History,copy}=await import('../core.mjs');const m=emptyModel();m.nodes=[node('A',0,0),node('B',600,0)];m.edges=[{...edge('E',''),labelPosition:{fraction:.4,offsetAlong:0,offsetNormal:80}}];assert.deepEqual(validateModel(JSON.parse(JSON.stringify(m))),m);const history=new History(),before=copy(m);m.edges[0].labelPosition.offsetNormal=150;history.record(before,m);assert.deepEqual(history.undo(m),before);assert.deepEqual(history.redo(before),m);
 for(const position of [null,{}, {fraction:-1,offsetAlong:0,offsetNormal:0},{fraction:2,offsetAlong:0,offsetNormal:0},{fraction:NaN,offsetAlong:0,offsetNormal:0},{fraction:.5,offsetAlong:Infinity,offsetNormal:0},{fraction:.5,offsetAlong:0,offsetNormal:1e7}]){const bad=copy(m);bad.edges[0].labelPosition=position;assert.throws(()=>validateModel(bad),/label position/);}
});
test('projection supports diagonal routes, repeated points, and manual offsets past endpoints',async()=>{
 const {manualLabelPosition}=await import('../labels.mjs');const m=emptyModel();m.edges=[edge('E','Diagonal')];for(const path of [[{x:0,y:0},{x:300,y:300}],[{x:0,y:0},{x:0,y:0},{x:400,y:0}],[{x:0,y:0},{x:0,y:0}]])for(const center of [{x:200,y:60},{x:-80,y:90},{x:600,y:300}]){m.edges[0].labelPosition=manualLabelPosition(path,center);const p=layoutEdgeLabels(m,new Map([['E',path]])).get('E').anchor;assert.ok(Math.abs(p.x-center.x)<.001&&Math.abs(p.y-center.y)<.001);}
});
test('a small orthogonal jog does not flip a manual label sideways',async()=>{
 const {manualLabelPosition}=await import('../labels.mjs');const m=emptyModel();m.edges=[edge('E','Rescue route')];const straight=[{x:0,y:0},{x:400,y:0}];m.edges[0].labelPosition=manualLabelPosition(straight,{x:200,y:80});const jog=[{x:0,y:0},{x:200,y:0},{x:200,y:10},{x:400,y:10}],label=layoutEdgeLabels(m,new Map([['E',jog]])).get('E');assert.ok(Math.abs(label.anchor.x-200)<10,'short jog keeps label near its chosen column');assert.ok(Math.abs(label.anchor.y-85)<1,'label follows the small route movement');assert.ok(label.leader,'leader remains present');
});
