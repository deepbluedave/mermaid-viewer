import {iconData,iconBody} from './icons.mjs?v=icons-3';
import {presentationModel} from './presentation.mjs?v=icons-3';
import {shapeParts,iconFrame} from './node-shapes.mjs?v=icons-3';
import {lineRuns} from './rich-text.mjs?v=icons-3';
import { nodeMetrics,identityText, depth,diagramFontSize,zoneHeaderHeight,objectColors,containerTitleBox,object,zoneTitleMetrics } from './core.mjs?v=icons-3';
import { sidePoint } from './routing.mjs?v=icons-3';
import { layoutEdgeLabels, zoneTitleBox } from './labels.mjs?v=icons-3';
import { bridgedPaths } from './bridges.mjs?v=icons-3';
import {waypointConflicts} from './waypoints.mjs?v=icons-3';
import {diagramTheme} from './themes.mjs?v=icons-3';
const ns='http://www.w3.org/2000/svg';
export const svgElement=(tag,attributes={},text=null)=>{const element=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attributes))if(value!==null&&value!==undefined)element.setAttribute(key,String(value));if(text!==null)element.textContent=text;return element;};
export const sceneStyle=`.diagram-zone>rect{fill:#eef2f6;fill-opacity:.8;stroke:var(--zone-border,#94a3b8);stroke-width:1;stroke-dasharray:3 3}.diagram-zone>.zone-header{fill:#e2e8f0;fill-opacity:.7;stroke:none}.zone-title>.zone-label-backing{fill:#e2e8f0;fill-opacity:.72;stroke:none}.zone-label{fill:#475569;font:12px system-ui,sans-serif}.diagram-node>.node-shape{fill:#fff;stroke:var(--diagram-ink,#64748b);stroke-width:1.3}.diagram-node text{fill:#1e293b;font:13px system-ui,sans-serif}.edge-line{fill:none;stroke:var(--diagram-ink,#64748b);stroke-width:1.5;stroke-linejoin:round;stroke-linecap:round}.edge-label rect{fill:var(--label-fill,#fff);stroke:var(--label-border,#e2e8f0);stroke-width:.7}.edge-label text{fill:var(--label-text,#475569);font:11px system-ui,sans-serif}.node-container-title text{font-family:system-ui,sans-serif}`;
export function createScene(model,routes,selection=new Set(),{controls=true,tool='select',connectSource=null,hoverId=null,connectTarget=null,dropTarget=null,activeWaypoint=null}={}) {
  model=presentationModel(model);
  const fontSize=diagramFontSize(model),headerHeight=zoneHeaderHeight(model);
  const theme=diagramTheme(model);
  const scene=svgElement('g',{id:'diagram-scene','data-theme':theme.id,style:`--diagram-ink:${theme.ink};--zone-border:${theme.zoneBorder};--label-border:${theme.labelBorder};--label-fill:${theme.node};--label-text:${theme.zoneText}`});
  const defs=svgElement('defs');const marker=svgElement('marker',{id:'arrowhead',viewBox:'0 0 10 10',refX:10,refY:5,markerWidth:10,markerHeight:10,markerUnits:'userSpaceOnUse',orient:'auto-start-reverse'});marker.append(svgElement('path',{d:'M0,0 L10,5 L0,10 Z',fill:theme.ink}));defs.append(marker);scene.append(defs);
  const zoneLayer=svgElement('g'),edgeLayer=svgElement('g'),labelLayer=svgElement('g'),zoneTitleLayer=svgElement('g',{class:'zone-titles'}),nodeLayer=svgElement('g'),manualLabelLayer=svgElement('g',{class:'manual-labels'}),controlLayer=svgElement('g',{class:'editor-only'});scene.append(zoneLayer,edgeLayer,labelLayer,zoneTitleLayer,nodeLayer,manualLabelLayer);if(controls)scene.append(controlLayer);
  const edgeLabels=layoutEdgeLabels(model,routes),bridges=bridgedPaths(model.edges,routes);
  for(const z of [...model.zones].sort((a,b)=>depth(model,a)-depth(model,b))) {
    const colors=objectColors(model,z);
    const group=svgElement('g',{class:`diagram-zone${selection.has(z.id)?' selected':''}${connectSource===z.id?' connect-source':''}${connectTarget===z.id?' connect-target':''}${dropTarget===z.id?' drop-target':''}`,'data-object-id':z.id,'data-kind':'zone',tabindex:controls?0:null,role:controls?'graphics-symbol':null,'aria-label':`Zone: ${identityText(z)}`});
    group.append(svgElement('rect',{x:z.x,y:z.y,width:z.width,height:z.height,rx:4,style:`fill:${colors.background};stroke:${z.borderColor||theme.zoneBorder};stroke-width:${z.borderWidth||1};stroke-dasharray:${z.borderStyle==='solid'?'none':z.borderStyle==='dashed'?'5 4':'3 3'}`}));
    group.append(svgElement('rect',{class:'zone-header',x:z.x,y:z.y,width:z.width,height:zoneHeaderHeight(model,z),rx:4,'data-zone-header':z.id,style:`fill:${colors.header}`}));
    zoneLayer.append(group);
    // Titles sit over routes; translucent backing softens a crossing line without rerouting it.
    const title=svgElement('g',{class:'zone-title','data-object-id':z.id,'data-kind':'zone','data-zone-header':z.id});
    const box=zoneTitleBox(z,fontSize);title.append(svgElement('rect',{class:'zone-label-backing',...box,rx:3,style:`fill:${colors.header}`}));
    const metrics=zoneTitleMetrics(z,fontSize),text=svgElement('text',{class:'zone-label','text-anchor':'middle',style:`fill:${colors.font};font-size:${fontSize}px`});appendTextLines(text,z,metrics.lines,i=>({x:z.x+z.width/2,y:box.y+box.height/2-(metrics.lines.length-1)*metrics.lineHeight/2+fontSize*.35+i*metrics.lineHeight}));title.append(text);zoneTitleLayer.append(title);
    if(controls)appendCollapse(controlLayer,z,model.settings.view.scale);
    if(controls&&!z.collapsed&&tool==='select'&&selection.has(z.id))appendResizeHandles(controlLayer,z,model.settings.view.scale);
  }
  for(const e of model.edges) {
    const points=routes.get(e.id);if(!points)continue;
    const d=points.map((p,i)=>`${i?'L':'M'}${p.x},${p.y}`).join(' ');
    const group=svgElement('g',{class:`diagram-edge${selection.has(e.id)?' selected':''}`,'data-object-id':e.id,'data-kind':'edge',tabindex:controls?0:null,role:controls?'graphics-symbol':null,'aria-label':`Connection ${e.source} to ${e.target}${e.label?': '+identityText(e):''}`});
    const bridge=bridges.get(e.id),markerId=e.color?'arrowhead-'+e.id:'arrowhead';
    if(e.color){const m=marker.cloneNode(true);m.id=markerId;m.firstChild.setAttribute('fill',e.color);defs.append(m);}
    for(const jump of bridge.jumps)group.append(svgElement('path',{class:'edge-bridge-halo',d:jump,fill:'none',stroke:'#fff','stroke-width':e.style==='thick'?6:4.5,'pointer-events':'none'}));
    const path=svgElement('path',{class:'edge-line',d:bridge.path,'data-edge-id':e.id,'data-bridge-count':bridge.jumps.length,'marker-end':e.direction!=='none'?`url(#${markerId})`:null,'marker-start':e.direction==='both'?`url(#${markerId})`:null,'stroke-dasharray':e.style==='dashed'?'6 5':null,style:`stroke:${e.color||theme.ink};stroke-width:${e.borderWidth||(e.style==='thick'?3:1.5)}`});group.append(path);
    if(controls)group.append(svgElement('path',{class:'edge-hit editor-only',d}));edgeLayer.append(group);
    if(e.label) {
      const {lines,width,height,anchor,leader,box}=edgeLabels.get(e.id);
      const movingObject=controls&&e.labelPosition&&[...selection].some(id=>{const n=object(model,id);return n&&Number.isFinite(n.x)&&box.x+box.width>n.x&&box.x<n.x+n.width&&box.y+box.height>n.y&&box.y<n.y+n.height;});
      const label=svgElement('g',{class:`edge-label${e.labelPosition?' manual-label':''}${controls&&selection.has(e.id)?' selected':''}`,'data-object-id':e.id,'data-kind':'edge',style:movingObject?'pointer-events:none':null,transform:`translate(${anchor.x},${anchor.y})`});
      if(leader){label.append(svgElement('line',{class:'edge-label-leader',x1:leader.start.x-anchor.x,y1:leader.start.y-anchor.y,x2:leader.end.x-anchor.x,y2:leader.end.y-anchor.y,stroke:theme.ink,'stroke-width':1.4,'vector-effect':'non-scaling-stroke','stroke-dasharray':'2 2'}));label.append(svgElement('circle',{class:'edge-label-leader',cx:leader.start.x-anchor.x,cy:leader.start.y-anchor.y,r:2,fill:theme.ink}));}
      label.append(svgElement('rect',{x:-width/2,y:-height/2,width,height,rx:3,style:e.labelBackgroundColor?`fill:${e.labelBackgroundColor}`:null}));
      const lineHeight=Math.ceil(fontSize*1.35),text=svgElement('text',{'text-anchor':'middle',style:`font-size:${fontSize}px;fill:${e.fontColor||theme.zoneText}`});appendTextLines(text,e,lines,i=>({x:0,y:-(lines.length-1)*lineHeight/2+fontSize*.35+i*lineHeight}));label.append(text);(e.labelPosition?manualLabelLayer:labelLayer).append(label);
    }
    if(controls&&selection.has(e.id))for(const [end,p]of[['source',points[0]],['target',points.at(-1)]]){const handle=svgElement('circle',{class:'connection-handle',cx:p.x,cy:p.y,r:6/(model.settings.view?.scale||1),'data-reconnect':e.id,'data-end':end,tabindex:0,role:'button','aria-label':`${end==='source'?'Source':'Target'} attachment · ${object(model,e[end])?.label||e[end]}`});handle.append(svgElement('title',{},'Click for side and order · Drag to reconnect'));controlLayer.append(handle);}
    if(controls){
      const scale=model.settings.view.scale,conflicts=new Map(waypointConflicts(model,e).map(c=>[c.index,c.node]));
      for(const [index,p]of(e.waypoints||[]).entries())if(selection.has(e.id)||conflicts.has(index)){
        const active=activeWaypoint?.edgeId===e.id&&activeWaypoint.index===index,handle=svgElement('circle',{class:`waypoint-handle${active?' active':''}${conflicts.has(index)?' conflict':''}`,cx:p.x,cy:p.y,r:7/scale,'data-waypoint':e.id,'data-waypoint-index':index,style:selection.has(e.id)?null:'pointer-events:none',tabindex:selection.has(e.id)?0:null,role:selection.has(e.id)?'button':null,'aria-label':`Waypoint ${index+1}${conflicts.has(index)?' blocked by '+conflicts.get(index).label:''}`});handle.append(svgElement('title',{},conflicts.has(index)?`Waypoint blocked by ${conflicts.get(index).label}. Move either object to restore the route.`:'Drag waypoint · Delete removes it'));controlLayer.append(handle);
      }
      if(tool==='select'&&selection.has(e.id))for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i];if(Math.hypot(b.x-a.x,b.y-a.y)*scale<40)continue;
        const p=[.5,.25,.75].map(t=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t})).find(p=>!(e.waypoints||[]).some(w=>Math.hypot(w.x-p.x,w.y-p.y)*scale<18)&&![...edgeLabels.values()].some(l=>p.x>=l.box.x-8/scale&&p.x<=l.box.x+l.box.width+8/scale&&p.y>=l.box.y-8/scale&&p.y<=l.box.y+l.box.height+8/scale));if(!p)continue;
        const handle=svgElement('g',{class:'route-segment-handle','data-route-segment':e.id,'data-segment-index':i-1,transform:`translate(${p.x},${p.y})`,role:'button','aria-label':'Drag to add waypoint'});handle.append(svgElement('circle',{r:6/scale}),svgElement('path',{d:`M${-3/scale},0 H${3/scale} M0,${-3/scale} V${3/scale}`}));controlLayer.append(handle);
      }
    }
  }
  for(const n of [...model.nodes].sort((a,b)=>depth(model,a)-depth(model,b))) {
    const group=svgElement('g',{class:`diagram-node${n.container?' container-node':''}${selection.has(n.id)?' selected':''}${connectSource===n.id?' connect-source':''}${connectTarget===n.id?' connect-target':''}${dropTarget===n.id?' drop-target':''}`,'data-object-id':n.id,'data-kind':'node',transform:`translate(${n.x},${n.y})`,tabindex:controls?0:null,role:controls?'graphics-symbol':null,'aria-label':identityText(n)});
    const w=n.width,h=n.height,colors=objectColors(model,n);
    const parts=shapeParts(n);
    if(!parts.length)group.append(svgElement('rect',{class:'node-hit',width:w,height:h,fill:'transparent',stroke:'none'}));
    for(const part of parts)group.append(svgElement(part.tag,{class:'node-shape',...part.attrs,style:`fill:${colors.background};stroke:${n.borderColor||theme.ink};stroke-width:${n.borderWidth||1.3};stroke-dasharray:${n.borderStyle==='dashed'?'5 4':'none'}${n.container?';fill-opacity:.85':''}`}));
    if(n.shape==='icon'||n.container&&n.shape==='person'){
      const frame=n.container?{x:12,y:9,width:24,height:24}:iconFrame(n),reference=n.icon||'studio:human',glyph=svgElement('svg',{class:'actor-icon',...frame,viewBox:iconData(reference).viewBox,'data-icon':reference,'pointer-events':'none',style:`color:${colors.font}`});glyph.innerHTML=iconBody(reference);group.append(glyph);
    }
    const {lines,lineHeight}=nodeMetrics(n,fontSize),text=svgElement('text',{'text-anchor':'middle',style:`fill:${colors.font};font-size:${fontSize}px`});
    if(n.container){
      const box=containerTitleBox(model,n),title=svgElement('g',{class:'node-container-title','data-object-id':n.id,'data-kind':'node',transform:`translate(${n.x},${n.y})`});
      const clip=svgElement('clipPath',{id:`container-outline-${n.id}`,clipPathUnits:'userSpaceOnUse'});for(const shape of group.querySelectorAll('.node-shape')){const outline=shape.cloneNode(true);outline.removeAttribute('class');outline.removeAttribute('style');outline.setAttribute('fill','#000');outline.setAttribute('stroke','none');clip.append(outline);}defs.append(clip);title.setAttribute('clip-path',`url(#container-outline-${n.id})`);
      title.append(svgElement('rect',{class:'node-title-backing',x:box.x-n.x,y:box.y-n.y,width:box.width,height:box.height,rx:3,style:`fill:${colors.header};fill-opacity:.78;stroke:none`}));
      appendTextLines(text,n,lines,i=>({x:w/2,y:box.y-n.y+box.height/2-(lines.length-1)*lineHeight/2+fontSize*.35+i*lineHeight}));title.append(text);zoneTitleLayer.append(title);
      const next=[...zoneLayer.children].find(g=>{const other=[...model.zones,...model.nodes].find(n=>n.id===g.dataset.objectId);return other&&depth(model,other)>depth(model,n);});zoneLayer.insertBefore(group,next||null);
    }else{appendTextLines(text,n,lines,i=>({x:w/2,y:(n.shape==='icon'?(n.iconPosition==='top'?8+lines.length*lineHeight/2:h-lines.length*lineHeight/2-8):n.shape==='person'?h/2+20:h/2)-(lines.length-1)*lineHeight/2+fontSize*.35+i*lineHeight}));group.append(text);nodeLayer.append(group);}
    if(controls&&(n.container||n.collapsed))appendCollapse(controlLayer,n,model.settings.view.scale);
    if(controls&&!n.collapsed&&tool==='select'&&selection.has(n.id)){controlLayer.append(svgElement('rect',{class:'resize-outline',x:n.x,y:n.y,width:w,height:h}));appendResizeHandles(controlLayer,n,model.settings.view.scale);}
    if(controls&&tool==='connect'&&(hoverId===n.id||connectSource===n.id))for(const side of ['north','south','west','east']){const p=sidePoint(n,side);controlLayer.append(svgElement('circle',{class:'connection-handle',cx:p.x,cy:p.y,r:5,'data-connect':n.id,'data-side':side}));}
  }
  return scene;
}
function appendTextLines(text,n,lines,position){let offset=0;lines.forEach((line,i)=>{const row=svgElement('tspan',position(i)),value=lineRuns(n,line,offset);offset=value.end;if(n.textFormat!=='markdown'){row.textContent=line;text.append(row);return;}for(const run of value.runs)row.append(svgElement('tspan',{'font-weight':run.bold?'700':'400','font-style':run.italic?'italic':'normal'},run.text));text.append(row);});}
function appendCollapse(layer,n,scale){const g=svgElement('g',{class:'collapse-control editor-only',transform:`translate(${n.x+n.width-14},${n.y+14}) scale(${1/scale})`,'data-collapse':n.id,role:'button',tabindex:0,'aria-label':`${n.collapsed?'Expand':'Collapse'} ${identityText(n)}`});g.append(svgElement('circle',{r:9,fill:'#fff',stroke:'#94a3b8'}),svgElement('path',{d:n.collapsed?'M-2,-4 L2,0 L-2,4':'M-4,-2 L0,2 L4,-2',fill:'none',stroke:'#475569','stroke-width':1.5,'pointer-events':'none'}));layer.append(g);}
function appendResizeHandles(layer,n,scale=1){const size=8/scale;for(const [handle,x,y]of[['nw',0,0],['n',.5,0],['ne',1,0],['e',1,.5],['se',1,1],['s',.5,1],['sw',0,1],['w',0,.5]])layer.append(svgElement('rect',{class:'resize-handle',x:n.x+n.width*x-size/2,y:n.y+n.height*y-size/2,width:size,height:size,'vector-effect':'non-scaling-stroke','data-resize':n.id,'data-handle':handle,'aria-label':`Resize ${identityText(n)}: ${handle}`}));}
export function exportSvg(model,routes) {
  const scene=createScene(model,routes,new Set(),{controls:false});
  const host=svgElement('svg',{xmlns:ns});host.classList.add('measurement-host');host.append(scene);document.body.append(host);
  const box=scene.getBBox();host.remove();
  const x=box.x-24,y=box.y-24,width=Math.max(100,box.width+48),height=Math.max(100,box.height+48);
  const svg=svgElement('svg',{xmlns:ns,width,height,viewBox:`${x} ${y} ${width} ${height}`,role:'img','aria-label':'Diagram'});
  svg.append(svgElement('style',{},sceneStyle),svgElement('rect',{x,y,width,height,fill:'#fff'}),scene);
  return {text:new XMLSerializer().serializeToString(svg),width,height};
}
