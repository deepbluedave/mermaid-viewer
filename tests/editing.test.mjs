import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyModel,copy,nodeMetrics,resizeNode,diagramFontSize,validateModel,expandZones,shapes} from '../core.mjs';
import {resizeObject,resizeNodeTo,alignmentGuides} from '../editing.mjs';
import {overlapsWithGap} from '../geometry.mjs';
const node=(id='A',x=100,y=100)=>({id,label:'Review application',shape:'rectangle',parentId:null,x,y,width:120,height:54});
const model=()=>{const m=emptyModel();m.nodes=[node()];resizeNode(m.nodes[0]);return m;};
test('manual sizing supports every shape, anchors opposite corners and keeps circles round',()=>{
 for(const shape of shapes){const m=model(),n=m.nodes[0];n.shape=shape;resizeNode(n);const before=copy(n);resizeObject(m,n.id,'nw',-110,-80);assert.equal(n.x+n.width,before.x+before.width);assert.equal(n.y+n.height,before.y+before.height);assert.ok(n.width>before.width&&n.height>before.height);assert.ok(n.manualSize);if(shape==='circle')assert.equal(n.width,n.height);assert.deepEqual(validateModel(m),m);}
});
test('side handles preserve the orthogonal centre and numeric circle dimensions stay linked',()=>{
 const m=model(),n=m.nodes[0],before=copy(n);resizeObject(m,n.id,'w',-90,0);assert.equal(n.x+n.width,before.x+before.width);assert.equal(n.y+n.height/2,before.y+before.height/2);n.shape='circle';resizeNode(n);resizeNodeTo(m,n.id,n.width+100,n.height);assert.equal(n.width,n.height);
});
test('growing into a neighbour stops at the minimum gap without moving either anchor or neighbour',()=>{
 const m=model(),n=m.nodes[0];m.nodes.push(node('B',400,n.y));resizeNode(m.nodes[1]);const fixed=copy(m.nodes[1]),x=n.x;resizeObject(m,n.id,'se',1000,0);assert.equal(n.x,x);assert.deepEqual(m.nodes[1],fixed);assert.ok(!overlapsWithGap(n,fixed));assert.ok(Math.abs(n.x+n.width+24-fixed.x)<.001);assert.ok(n.manualSize.width<1000,'accepted dimensions are stored');
});
test('label-fit limits handle tiny sizes, long words, multilingual text and 48px font',()=>{
 for(const shape of shapes){const m=model(),n=m.nodes[0];n.shape=shape;n.label='中文 🚀\nVeryLongUnbrokenWordWithoutSpaces\nMMMMMMMM';resizeNode(n,48);m.settings.fontSize=48;resizeNodeTo(m,n.id,1,1);const metrics=nodeMetrics(n,48);assert.equal(n.width,metrics.width);assert.equal(n.height,metrics.height);assert.ok(n.width>=80&&n.height>=40);assert.ok(metrics.lines.every(line=>!/[\uD800-\uDBFF]$/.test(line)),'Unicode characters stay intact');if(shape==='circle')assert.equal(n.width,n.height);assert.deepEqual(validateModel(m),m);}
});
test('manual width wraps labels and larger fonts grow the required height without losing the chosen width',()=>{
 const m=model(),n=m.nodes[0];n.label='A detailed review of the incident and next steps';resizeNodeTo(m,n.id,200,80);const beforeHeight=n.height;resizeNode(n,28);assert.equal(n.width,200);assert.ok(n.height>beforeHeight);assert.equal(n.manualSize.width,200);assert.ok(nodeMetrics(n,28).lines.length>2);
});
test('zone resizing respects descendants and keeps their positions fixed',()=>{
 const m=model();m.zones=[{id:'Z',label:'Zone',x:0,y:0,width:400,height:300,parentId:null}];m.nodes[0].parentId='Z';const before=copy(m.nodes[0]);resizeObject(m,'Z','se',-350,-250);assert.deepEqual(m.nodes[0],before);const z=m.zones[0];assert.ok(z.x+z.width>=before.x+before.width+20&&z.y+z.height>=before.y+before.height+20);
});
test('alignment guides compare visible sides of nodes and zones without self or parent guides',()=>{
 const m=model();m.nodes=[node('A',100,100),node('B',100,300)];m.zones=[{id:'Z',label:'Zone',x:100,y:500,width:250,height:150,parentId:null},{id:'Parent',label:'Parent',x:100,y:80,width:200,height:140,parentId:null}];m.nodes[0].parentId='Parent';const before=copy(m);const guides=alignmentGuides(m,new Set(['A']));assert.ok(guides.some(g=>g.axis==='x'&&g.value===100&&g.end>650));assert.ok(!guides.some(g=>g.axis==='y'&&g.value===80));assert.deepEqual(m,before);assert.equal(alignmentGuides(m,new Set(['A','B','Z','Parent'])).length,0);
});
test('alignment tolerance is a screen distance and guides stay independent of snap-grid preference',()=>{
 const m=model();m.nodes=[node('A',100.6,100),node('B',100,300)];assert.ok(alignmentGuides(m,new Set(['A']),1).length);assert.equal(alignmentGuides(m,new Set(['A']),2).length,0);m.settings.grid=true;assert.ok(alignmentGuides(m,new Set(['A']),1).length);
});
test('font, colors, manual size and edge context survive validation; legacy files use defaults',()=>{
 const m=model();m.nodes.push(node('B',500,100));m.edges=[{id:'E',source:'A',target:'B',label:'review',direction:'forward',style:'normal',routing:'orthogonal',sourceSide:null,targetSide:null,description:'Incident protocol',notes:'Owner: 中文 🚀'}];m.nodes[0].backgroundColor='#134e4a';m.nodes[0].fontColor='#FFFFFF';resizeNodeTo(m,'A',240,90);m.settings.fontSize=24;assert.deepEqual(validateModel(m),m);delete m.settings.fontSize;delete m.settings.guides;assert.equal(diagramFontSize(validateModel(m)),13);for(const mutate of [n=>n.nodes[0].fontColor='red',n=>n.nodes[0].fontColor=['#ffffff'],n=>n.nodes[0].manualSize=null,n=>n.nodes[0].manualSize=0,n=>n.nodes[0].manualSize.width=0,n=>n.settings.fontSize=49,n=>n.settings.fontSize=12.5,n=>n.settings.guides='yes',n=>n.edges[0].notes=42]){const invalid=copy(m);mutate(invalid);assert.throws(()=>validateModel(invalid));}
});
test('large font zone headers expand their title and child padding',()=>{
 const m=model();m.settings.fontSize=48;m.zones=[{id:'Z',label:'Very wide workshop zone title',x:80,y:60,width:160,height:100,parentId:null}];m.nodes[0].parentId='Z';expandZones(m);assert.ok(m.zones[0].width>600);assert.ok(m.nodes[0].y-m.zones[0].y>=78);
});
