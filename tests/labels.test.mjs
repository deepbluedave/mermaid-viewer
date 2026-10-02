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
