import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {AvoidLib} from '../vendor/libavoid/dist/index-node.mjs';import {DiagramRouter} from '../routing.mjs';
import {emptyModel,validateModel,copy,deleteSelection,History,moveSelection} from '../core.mjs';
import {attachmentGroups,reorderAttachment,resetAttachmentOrder,pruneAttachmentOrders,routeIntersections,routeLength,routeRetraces,acceptAttachmentSwap} from '../attachments.mjs';
await AvoidLib.load(new URL('../vendor/libavoid/dist/libavoid.wasm',import.meta.url).pathname);
const avoid=AvoidLib.getInstance();
const lunar=()=>JSON.parse(readFileSync(new URL('artifacts/f2-lunar-rescue.mermaid-project.json',import.meta.url)));
const group=(router,id='Node5',side='west')=>router.groups.get(JSON.stringify([id,side]));
const node=(id,x,y)=>({id,label:id,shape:'rectangle',parentId:null,x,y,width:120,height:70});
const edge=(id,source,target,sourceSide='east',targetSide='west')=>({id,source,target,label:'',routing:'orthogonal',direction:'forward',style:'normal',sourceSide,targetSide});
function visits(points,waypoints){let last=-1e-4,along=0;const seg=[];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.y-a.y);seg.push({a,b,length,along});along+=length;}for(const p of waypoints||[]){const hits=seg.flatMap(({a,b,length,along})=>{const t=length?((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/(length*length):0;return t>=-1e-4&&t<=1+1e-4&&Math.hypot(p.x-a.x-t*(b.x-a.x),p.y-a.y-t*(b.y-a.y))<1e-4?[along+t*length]:[];}).filter(n=>n>=last-1e-4).sort((a,b)=>a-b);assert.ok(hits.length,'ordered waypoint '+JSON.stringify(p));last=hits[0];}}
function withRouter(fn){const r=new DiagramRouter(avoid);try{return fn(r);}finally{r.dispose();}}

test('automatic ordering removes the lunar crossing with no detour, retrace, changed waypoint or unrelated route',()=>withRouter(r=>{
 const m=lunar(),before=JSON.stringify(m),baseline=r.route(m,{optimize:false}),routes=r.route(m);
 assert.equal(routeIntersections(baseline.get('Edge5'),baseline.get('Edge7')).crossings.length,1);
 assert.equal(routeIntersections(routes.get('Edge5'),routes.get('Edge7')).crossings.length,0);
 assert.deepEqual(group(r).entries.map(e=>e.key),['Edge5:target','Edge7:source']);assert.equal(group(r).manual,false);
 assert.ok(routes.get('Edge7')[0].y>routes.get('Edge5').at(-1).y);
 for(const e of m.edges){visits(routes.get(e.id),e.waypoints);assert.ok(routeLength(routes.get(e.id))<=routeLength(baseline.get(e.id))+1e-4);assert.ok(routeRetraces(routes.get(e.id))<=routeRetraces(baseline.get(e.id)));if(!['Edge5','Edge7'].includes(e.id))assert.deepEqual(routes.get(e.id),baseline.get(e.id));}
 assert.equal(JSON.stringify(m),before);
}));
test('repeated reroutes, edge enumeration changes, precision and fresh reopening give stable automatic order',()=>withRouter(r=>{
 const original=lunar(),initial=r.route(original);
 for(let i=0;i<4;i++){assert.deepEqual(r.route(original),initial);r.dispose();assert.deepEqual(r.route(original),initial);}
 const m=copy(original);m.edges.reverse();const reversed=r.route(m);for(const [id,path]of initial)assert.deepEqual(reversed.get(id),path);
 for(const delta of [-1e-7,1e-7,-8e-5,8e-5]){const m=copy(original);m.nodes.find(n=>n.id==='Node5').y+=delta;const paths=r.route(m);assert.ok(paths.get('Edge5').at(-1).y<paths.get('Edge7')[0].y,'stable order at '+delta);assert.equal(routeRetraces(paths.get('Edge7')),0);}
 assert.deepEqual(r.route(JSON.parse(JSON.stringify(original))),initial);
}));
test('drag previews freeze settled order, while drop recomputes and manual choices remain authoritative',()=>withRouter(r=>{
 const m=lunar();r.route(m);const keys=group(r).entries.map(e=>e.key);
 for(const delta of [-25,35,-10]){m.nodes.find(n=>n.id==='Node5').y+=delta;r.route(m,{freezeOrder:true});assert.deepEqual(group(r).entries.map(e=>e.key),keys);}
 r.route(m);assert.deepEqual(group(r).entries.map(e=>e.key),keys);
 assert.equal(reorderAttachment(m,r.groups,'Edge7','source',-1),true);r.route(m);assert.equal(group(r).manual,true);assert.deepEqual(group(r).entries.map(e=>e.key),['Edge7:source','Edge5:target']);
 for(const delta of [-200,400,-200]){m.nodes.find(n=>n.id==='Node5').y+=delta;r.route(m);assert.deepEqual(group(r).entries.map(e=>e.key),['Edge7:source','Edge5:target']);}
 resetAttachmentOrder(m,'Node5','west');r.route(m);assert.equal(group(r).manual,false);assert.deepEqual(group(r).entries.map(e=>e.key),keys);
}));
test('a swap that substitutes an overlap for a crossing is rejected after the endpoint moves',()=>withRouter(r=>{
 const m=lunar();m.nodes.find(n=>n.id==='Node5').y+=18;const baseline=r.route(m,{optimize:false}),automatic=r.route(m);assert.deepEqual(automatic,baseline);
 const before=copy(m);reorderAttachment(m,r.groups,'Edge7','source',1);const manual=r.route(m);assert.equal(group(r).manual,true);assert.ok(routeIntersections(manual.get('Edge5'),manual.get('Edge7')).overlap>0,'ambiguous manual choice is honored');
 m.edges.find(e=>e.id==='Edge7').waypoints[0].y=208;const adjusted=r.route(m);assert.equal(routeIntersections(adjusted.get('Edge5'),adjusted.get('Edge7')).crossings.length,0);assert.equal(routeIntersections(adjusted.get('Edge5'),adjusted.get('Edge7')).overlap,0);assert.equal(routeRetraces(adjusted.get('Edge7')),0);assert.deepEqual(before.edges.find(e=>e.id==='Edge5').waypoints,m.edges.find(e=>e.id==='Edge5').waypoints);
}));
test('manual orders cover every shape and side, incoming/outgoing ends and straight connections',()=>withRouter(r=>{
 for(const shape of ['rectangle','rounded','circle','diamond','cylinder'])for(const side of ['north','south','west','east']){
  const m=emptyModel();m.nodes=[{...node('N',300,300),shape},node('A',0,0),node('B',700,0),node('C',side==='west'?0:side==='east'?700:300,side==='north'?0:side==='south'?700:300)];m.edges=[edge('one','N','A',side),edge('two','B','N','south',side),{...edge('three','N','C',side),routing:'straight'}];m.nodes[0].attachmentOrder={[side]:['three:source','two:target','one:source']};
  for(const size of [70,120]){m.nodes[0].height=size;validateModel(m);const routes=r.route(m),axis=['north','south'].includes(side)?'x':'y',pins=[routes.get('three')[0],routes.get('two').at(-1),routes.get('one')[0]];assert.ok(pins[0][axis]<pins[1][axis]&&pins[1][axis]<pins[2][axis],shape+' '+side);assert.equal(group(r,'N',side).manual,true);}
 }
}));
test('automatic crossing removal works on all four sides of every node shape',()=>withRouter(r=>{
 for(const shape of ['rectangle','rounded','circle','diamond','cylinder'])for(let rotation=0;rotation<4;rotation++){
  const original=lunar(),m={...original,nodes:original.nodes.filter(n=>['Node4','Node5','Node6'].includes(n.id)),zones:[],edges:original.edges.filter(e=>['Edge5','Edge7'].includes(e.id))};
  for(const n of m.nodes){n.parentId=null;if(n.id==='Node5')n.shape=shape;}
  for(let i=0;i<rotation;i++){for(const n of m.nodes){const{x,y,width,height}=n;Object.assign(n,{x:-y-height,y:x,width:height,height:width});}for(const e of m.edges){for(const end of ['source','target'])e[end+'Side']={east:'south',south:'west',west:'north',north:'east'}[e[end+'Side']];for(const p of e.waypoints){const{x,y}=p;p.x=-y;p.y=x;}}}
  const baseline=r.route(m,{optimize:false}),after=r.route(m);assert.equal(routeIntersections(baseline.get('Edge5'),baseline.get('Edge7')).crossings.length,1);assert.equal(routeIntersections(after.get('Edge5'),after.get('Edge7')).crossings.length,0,shape+' rotation '+rotation);for(const e of m.edges)visits(after.get(e.id),e.waypoints);
 }
}));
test('crowded manual sides keep every pin distinct through resizing, new edges append and deletion prunes',()=>withRouter(r=>{
 const m=emptyModel();m.nodes=[node('N',0,0),node('Other',500,0)];m.nodes[0].height=40;m.edges=Array.from({length:12},(_,i)=>edge('E'+i,'N','Other'));m.nodes[0].attachmentOrder={east:m.edges.map(e=>e.id+':source').reverse()};
 for(const h of [40,100]){m.nodes[0].height=h;r.route(m);const keys=group(r,'N','east').entries.map(e=>e.key);assert.deepEqual(keys,m.nodes[0].attachmentOrder.east);assert.equal(new Set([...r.routes.values()].map(p=>p[0].y)).size,12);}
 m.edges.push(edge('New','N','Other'));r.route(m);assert.equal(group(r,'N','east').entries.at(-1).key,'New:source');
 deleteSelection(m,new Set(['E4']));assert.ok(!m.nodes[0].attachmentOrder.east.includes('E4:source'));validateModel(m);r.route(m);assert.equal(group(r,'N','east').entries.length,12);
}));
test('zones, parent nodes and same-side self-loop ends have independently reorderable attachments',()=>withRouter(r=>{
 for(const parentNode of [false,true]){const m=emptyModel(),parent={id:'Z',label:'Z',x:0,y:0,width:300,height:240,parentId:null};if(parentNode)m.nodes.push({...parent,shape:'rounded',container:true});else m.zones.push(parent);m.nodes.push(node('A',600,0),node('B',600,300));m.edges=[edge('One','Z','A'),edge('Back','B','Z','west','east'),edge('Loop','Z','Z','east','east')];const p=parentNode?m.nodes[0]:m.zones[0];p.attachmentOrder={east:['Loop:target','Back:target','Loop:source','One:source']};validateModel(m);r.route(m);assert.deepEqual(group(r,'Z','east').entries.map(e=>e.key),p.attachmentOrder.east);assert.ok(r.routes.get('Loop').length>=4);}
}));
test('order preferences survive project roundtrip, movement, history and inactive sides; reset is side-specific',()=>withRouter(r=>{
 const m=lunar();r.route(m);const before=copy(m);reorderAttachment(m,r.groups,'Edge7','source',-1);const chosen=copy(m),history=new History();history.record(before,chosen);assert.deepEqual(history.undo(chosen),before);assert.deepEqual(history.redo(before),chosen);assert.deepEqual(validateModel(JSON.parse(JSON.stringify(chosen))),chosen);
 const n=m.nodes.find(n=>n.id==='Node5');n.attachmentOrder.east=['Edge7:source'];moveSelection(m,new Set([n.id]),20,10);assert.deepEqual(n.attachmentOrder.west,['Edge7:source','Edge5:target']);m.edges.find(e=>e.id==='Edge7').sourceSide='east';r.route(m);assert.equal(group(r,'Node5','east').manual,true);resetAttachmentOrder(m,n.id,'east');assert.ok(n.attachmentOrder.west);m.edges.find(e=>e.id==='Edge7').sourceSide='west';r.route(m);assert.equal(group(r).entries[0].key,'Edge7:source');
 m.edges.find(e=>e.id==='Edge7').source='Node6';pruneAttachmentOrders(m);assert.deepEqual(n.attachmentOrder.west,['Edge5:target']);validateModel(m);
}));
test('invalid saved orders reject duplicate, unknown, oversized or mismatched end references',()=>{
 for(const preference of [null,[],{left:[]},{west:'E:source'},{west:['Edge7:source','Edge7:source']},{west:['Missing:source']},{west:['Edge5:source']},{west:['Edge7:middle']},{west:Array(2001).fill('Edge7:source')}]){const m=lunar();m.nodes.find(n=>n.id==='Node5').attachmentOrder=preference;assert.throws(()=>validateModel(m),/attachment|ordered/);}
});
test('crossing analysis merges straight-through waypoints, measures overlap and ignores shared ends',()=>{
 assert.equal(routeIntersections([{x:0,y:10},{x:10,y:10},{x:20,y:10}],[{x:10,y:0},{x:10,y:10},{x:10,y:20}]).crossings.length,1);
 assert.equal(routeIntersections([{x:0,y:0},{x:10,y:0}],[{x:0,y:0},{x:0,y:10}]).crossings.length,0);
 assert.equal(routeIntersections([{x:0,y:0},{x:20,y:0}],[{x:10,y:0},{x:30,y:0}]).overlap,10);
});
test('a failed automatic trial retains the complete usable baseline and the trial budget is bounded',()=>{
 let transactions=0,engines=0;const instrumented={...avoid,Router:function(flags){engines++;const index=engines,native=new avoid.Router(flags),process=native.processTransaction.bind(native);native.processTransaction=()=>{transactions++;if(index>1)throw new Error('Optional candidate unavailable');process();};return native;}};
 const r=new DiagramRouter(instrumented),baseline=withRouter(other=>other.route(lunar(),{optimize:false}));try{assert.deepEqual(r.route(lunar()),baseline);assert.ok(transactions<=10);const count=transactions;r.route(lunar());assert.equal(transactions,count,'redraw uses cached geometry');}finally{r.dispose();}
});
test('five independent crossing groups use four trials at most and expose the remaining manual choice',()=>{
 const m=emptyModel(),fixture=lunar();for(let i=0;i<5;i++){
  for(const original of fixture.nodes.filter(n=>['Node4','Node5','Node6'].includes(n.id))){const n=copy(original);n.id+='_'+i;n.parentId=null;n.y+=i*1000;m.nodes.push(n);}
  for(const original of fixture.edges.filter(e=>['Edge5','Edge7'].includes(e.id))){const e=copy(original);e.id+='_'+i;e.source+='_'+i;e.target+='_'+i;for(const p of e.waypoints)p.y+=i*1000;m.edges.push(e);}
 }
 let transactions=0;const instrumented={...avoid,Router:function(flags){const native=new avoid.Router(flags),process=native.processTransaction.bind(native);native.processTransaction=()=>{transactions++;process();};return native;}};const r=new DiagramRouter(instrumented);
 try{const paths=r.route(m);assert.ok(transactions<=10,'baseline plus four two-transaction trials');const unresolved=Array.from({length:5},(_,i)=>i).filter(i=>routeIntersections(paths.get('Edge5_'+i),paths.get('Edge7_'+i)).crossings.length);assert.equal(unresolved.length,1);const count=transactions;assert.deepEqual(r.route(m),paths);assert.equal(transactions,count,'no continuing cleanup loop on redraw');const i=unresolved[0];reorderAttachment(m,r.groups,'Edge7_'+i,'source',1);const manual=r.route(m);assert.equal(routeIntersections(manual.get('Edge5_'+i),manual.get('Edge7_'+i)).crossings.length,0);}
 finally{r.dispose();}
});
test('acceptance rejects detours, new overlaps, diagonals and changes to an unrelated connection',()=>withRouter(r=>{
 const m=lunar(),baseline=r.route(m,{optimize:false}),g=group(r),candidate={group:g,edges:new Set(['Edge5','Edge7'])},after=r.route(m);assert.ok(acceptAttachmentSwap(m,baseline,after,candidate));
 const bad=copy(after);bad.set('Edge1',[{x:0,y:0},{x:1,y:0}]);assert.equal(acceptAttachmentSwap(m,baseline,bad,candidate),false);
 const diagonal=copy(after);const p=diagonal.get('Edge7');p[1]={x:p[1].x+1,y:p[1].y+1};assert.equal(acceptAttachmentSwap(m,baseline,diagonal,candidate),false);
 const longer=copy(after),path=longer.get('Edge7');path.splice(1,0,{x:path[0].x+100,y:path[0].y},{x:path[0].x+100,y:path[0].y+50},{x:path[0].x,y:path[0].y+50});assert.equal(acceptAttachmentSwap(m,baseline,longer,candidate),false);
}));
