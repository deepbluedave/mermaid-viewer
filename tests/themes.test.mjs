import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyModel,copy,objectColors,darkenColor,validateModel,History,toMermaid,moveSelection} from '../core.mjs';
import {themes,diagramTheme,zoneThemeColor,contrastRatio} from '../themes.mjs';
import {mergeSource} from '../mermaid-adapter.mjs';

function fixture(){
  const m=emptyModel();
  m.zones=[{id:'Grow',label:'Grow',parentId:null,x:0,y:0,width:300,height:300},{id:'Fly',label:'Fly',parentId:null,x:400,y:0,width:300,height:300},{id:'Weather',label:'Weather',parentId:'Fly',x:420,y:70,width:260,height:200}];
  m.nodes=[{id:'Seed',label:'Seed',shape:'rectangle',parentId:'Grow',x:60,y:100,width:120,height:54},{id:'Drone',label:'Drone',shape:'rounded',parentId:'Weather',x:470,y:140,width:120,height:54}];
  m.edges=[{id:'Flight',label:'Dispatch',source:'Seed',target:'Drone',style:'dashed',direction:'forward',routing:'orthogonal',sourceSide:'east',targetSide:'west',waypoints:[{x:350,y:130}],labelPosition:{fraction:.5,offsetAlong:0,offsetNormal:40}}];
  return m;
}
test('legacy projects resolve Clean without adding settings or materializing colors',()=>{
  const m=fixture(),before=copy(m);assert.equal(diagramTheme(m).id,'clean');
  assert.deepEqual(objectColors(m,m.nodes[0]),{background:'#ffffff',font:'#1e293b',header:'#e8e8e8'});
  assert.deepEqual(objectColors(m,m.zones[0]),{background:'#eef2f6',font:'#475569',header:darkenColor('#eef2f6',.09)});
  assert.deepEqual(validateModel(m),before);assert.deepEqual(m,before);
});
test('all named themes supply quiet node fills and related stage fills',()=>{
  for(const theme of themes){const m=fixture();m.settings.theme=theme.id;assert.equal(objectColors(m,m.nodes[0]).background,theme.node);assert(theme.zones.includes(objectColors(m,m.zones[0]).background));assert.equal(diagramTheme(validateModel(m)).id,theme.id);}
});
test('theme IDs reject malformed or unknown saved settings',()=>{
  for(const value of ['unknown','Clean','',null,{},[],0]){const m=fixture();m.settings.theme=value;assert.throws(()=>validateModel(m),/theme/);}
});
test('stage colors stay stable under array reorder, label edits, movement and deletion of another stage',()=>{
  for(const theme of themes){const m=fixture();m.settings.theme=theme.id;const color=objectColors(m,m.zones[1]).background;moveSelection(m,new Set(['Fly']),60,40);m.zones.reverse();m.zones.find(n=>n.id==='Fly').label='Revised dispatch';m.zones=m.zones.filter(n=>n.id!=='Grow');assert.equal(objectColors(m,m.zones.find(n=>n.id==='Fly')).background,color);assert.equal(zoneThemeColor(theme,'Fly'),color);}
});
test('nested zones shade their parent and custom child fills survive every theme',()=>{
  const m=fixture();for(const theme of themes){m.settings.theme=theme.id;assert.equal(objectColors(m,m.zones[2]).background,darkenColor(objectColors(m,m.zones[1]).background,.055));}
  m.zones[1].backgroundColor='#dbeafe';m.zones[2].backgroundColor='#edcbaa';for(const theme of themes){m.settings.theme=theme.id;assert.equal(objectColors(m,m.zones[2]).background,'#edcbaa');}
  delete m.zones[2].backgroundColor;assert.equal(objectColors(m,m.zones[2]).background,darkenColor('#dbeafe',.055));
});
test('custom fill and text overrides stay independent through theme changes and resets',()=>{
  const m=fixture(),n=m.nodes[0];n.backgroundColor='#112233';
  for(const theme of themes){m.settings.theme=theme.id;assert.equal(objectColors(m,n).background,'#112233');assert(contrastRatio(objectColors(m,n).font,'#112233')>=4.5);assert.equal(n.fontColor,undefined);}
  n.fontColor='#fedcba';delete n.backgroundColor;assert.equal(objectColors(m,n).font,'#fedcba');assert.equal(objectColors(m,n).background,diagramTheme(m).node);
  delete n.fontColor;assert.equal(objectColors(m,n).font,diagramTheme(m).nodeText);
});
test('automatic text meets 4.5:1 on actual node and title backgrounds across light, dark and mid-tone custom fills',()=>{
  const m=fixture();for(const theme of themes)for(const kind of ['node','zone','container'])for(let channel=0;channel<256;channel+=5){
    m.settings.theme=theme.id;const n=kind==='zone'?m.zones[0]:m.nodes[0];n.container=kind==='container';n.backgroundColor='#'+channel.toString(16).padStart(2,'0').repeat(3);
    const c=objectColors(m,n);assert(contrastRatio(c.font,kind==='node'?c.background:c.header)>=4.5,`${theme.id} ${kind} ${channel}`);
  }
});
test('theme labels and arrows have readable contrast on theme fills',()=>{
  for(const t of themes){assert(contrastRatio(t.zoneText,t.node)>=4.5);for(const bg of [t.node,...t.zones])assert(contrastRatio(t.ink,bg)>=3,`${t.id} line contrast`);}
});
test('deep nested titles remain readable while honoring explicit text overrides',()=>{
  for(const theme of themes){const m=fixture();m.settings.theme=theme.id;for(let i=0;i<18;i++){m.zones.push({id:`Nest${i}`,parentId:i?`Nest${i-1}`:'Fly'});const c=objectColors(m,m.zones.at(-1));assert(contrastRatio(c.font,c.header)>=4.5);}
    m.zones[0].fontColor='#ffee00';assert.equal(objectColors(m,m.zones[0]).font,'#ffee00');
  }
});
test('theme selection roundtrips JSON with exact geometry, paths, manual metadata and color provenance',()=>{
  const m=fixture();m.settings.theme='botanical';m.nodes[0].fontColor='#aabbcc';const saved=validateModel(JSON.parse(JSON.stringify(m)));assert.deepEqual(saved,m);assert.equal(saved.nodes[1].backgroundColor,undefined);assert.equal(saved.nodes[1].fontColor,undefined);
});
test('one history step restores theme selection and manual overrides together',()=>{
  const m=fixture(),h=new History(),before=copy(m);m.settings.theme='paper';m.nodes[0].backgroundColor='#000000';h.record(before,m);assert.deepEqual(h.undo(m),before);assert.deepEqual(h.redo(before),m);
});
test('applying Mermaid edits retains theme and matching-ID overrides, including automatic new nodes',()=>{
  const previous=fixture(),incoming=fixture();previous.settings.theme='blueprint';previous.nodes[0].backgroundColor='#adbeef';incoming.nodes.push({id:'New',label:'New',shape:'rectangle',parentId:null,x:900,y:100,width:120,height:54});
  const merged=mergeSource(previous,incoming);assert.equal(merged.settings.theme,'blueprint');assert.equal(merged.nodes[0].backgroundColor,'#adbeef');assert.equal(objectColors(merged,merged.nodes.at(-1)).background,diagramTheme(merged).node);assert.equal(merged.nodes.at(-1).backgroundColor,undefined);
});
test('themes and custom appearance do not leak into exported Mermaid structure',()=>{
  const m=fixture(),source=toMermaid(m);m.settings.theme='paper';m.nodes[0].backgroundColor='#010203';assert.equal(toMermaid(m),source);
});
