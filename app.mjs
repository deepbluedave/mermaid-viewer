import { emptyModel, copy, items, object, shapes, textWidth, resizeNode, moveSelection, movableIds, expandZones, reparent, deleteSelection, nextId, arrange, toMermaid, validateModel, History, depth,ensureNodeSpacing,ensureLabelFit,separateSelection,dropSelection,dropParents,diagramFontSize,objectColors,containers,isContainer,containingParent,setNodeContainer,descendants,zonePadding,MAX_ZONE_PADDING,fitZonesToContents } from './core.mjs?v=whole-words';
import {resizeObject,resizeNodeTo,alignmentGuides} from './editing.mjs?v=whole-words';
import { initializeMermaid, importMermaid, layoutModel, mergeSource } from './mermaid-adapter.mjs?v=whole-words';
import { AvoidLib } from './vendor/libavoid/dist/index.js';
import { DiagramRouter, sidePoint } from './routing.mjs?v=whole-words';
import { createScene, svgElement, exportSvg } from './scene.mjs?v=whole-words';
import {waypointConflicts,waypointInsertionIndex,translateWaypoints,MAX_WAYPOINTS} from './waypoints.mjs?v=whole-words';
import {layoutEdgeLabels,manualLabelPosition} from './labels.mjs?v=whole-words';
import {attachmentKey,reorderAttachment,resetAttachmentOrder,pruneAttachmentOrders} from './attachments.mjs?v=whole-words';
import {createEditingControls} from './controls.mjs';
const $=id=>document.getElementById(id);
const canvas=$('canvas'),world=$('world'),viewport=$('viewport'),editor=$('editor'),properties=$('properties');
let model=emptyModel(),selection=new Set(),tool='select',gesture=null,busy=true,sourceDirty=false,spaceHeld=false,router=null,routes=new Map(),frame=null,dirty=false;
let pendingPropertyEdit=null,pendingFontSize=null;
let editingControls=null,controlEdit=null,propertyHost=properties;
let propertiesNeedRefresh=false;
let drawnView='';
let connectSource=null,hoverId=null,dropTarget=null;
let paletteStart=null,blockedPaletteClick=null;
let activeWaypoint=null,waypointEdge=null;
let activeLabel=null;
const collapsedZones=new Set();
let inspectedId=null;
let panelsSuspended=false,hierarchyNeedsRefresh=false;
const history=new History();
function error(err) { $('error-message').textContent=err.message||String(err);$('error-banner').hidden=false;status('Action could not be completed.'); }
function status(message) { $('status').textContent=message; }
function loading(value,message='Updating diagram…') {busy=value;$('loading').hidden=!value;$('loading').textContent=message;document.querySelectorAll('button,select,input,textarea').forEach(b=>b.disabled=value);if(!value)updateControls();}
function syncSource(force=false) {if(force||!sourceDirty){editor.value=toMermaid(model);sourceDirty=false;} $('source-state').textContent=sourceDirty?'Unapplied draft':'In sync';$('btn-discard').disabled=!sourceDirty;}
function updateView() {
  const v=model.settings.view;world.setAttribute('transform',`translate(${v.x},${v.y}) scale(${v.scale})`);$('zoom-text').textContent=`${Math.round(v.scale*100)}%`;
  const unit=20*v.scale,major=Math.max(1,2**Math.ceil(Math.log2(10/unit))),spacing=unit*major;
  viewport.style.backgroundSize=`${spacing}px ${spacing}px`;
  viewport.style.backgroundPosition=`${v.x-spacing/2}px ${v.y-spacing/2}px`;
  for(const handle of world.querySelectorAll('[data-resize]')){const n=object(model,handle.dataset.resize),side=handle.dataset.handle,size=8/v.scale;if(!n)continue;const x=side.includes('e')?1:side.includes('w')?0:.5,y=side.includes('s')?1:side.includes('n')?0:.5;handle.setAttribute('x',n.x+n.width*x-size/2);handle.setAttribute('y',n.y+n.height*y-size/2);handle.setAttribute('width',size);handle.setAttribute('height',size);}
  for(const handle of world.querySelectorAll('.waypoint-handle'))handle.setAttribute('r',7/v.scale);
  for(const handle of world.querySelectorAll('.route-segment-handle')){handle.querySelector('circle').setAttribute('r',6/v.scale);handle.querySelector('path').setAttribute('d',`M${-3/v.scale},0 H${3/v.scale} M0,${-3/v.scale} V${3/v.scale}`);}
  for(const handle of world.querySelectorAll('[data-reconnect]'))handle.setAttribute('r',6/v.scale);
  const viewKey=`${v.x},${v.y},${v.scale}`;
  if(viewKey!==drawnView){drawnView=viewKey;editingControls?.viewChanged();}else editingControls?.position();
}
function updateControls() {
  $('btn-undo').disabled=busy||!history.past.length;$('btn-redo').disabled=busy||!history.future.length;
  $('btn-delete').disabled=busy||!selection.size;$('btn-discard').disabled=busy||!sourceDirty;
  $('btn-delete').textContent=activeWaypoint?'Delete waypoint':'Delete';
  $('btn-delete').title=activeWaypoint?'Delete waypoint':'Delete selected objects';$('btn-delete').setAttribute('aria-label',$('btn-delete').title);
  $('direction').value=model.settings.direction;$('layout-mode').value=model.settings.layout;$('snap-grid').checked=model.settings.grid;
  $('alignment-guides').checked=model.settings.guides!==false;if(pendingFontSize===null)$('font-size').value=diagramFontSize(model);
  $('counts').textContent=`${model.nodes.length} nodes · ${model.edges.length} edges · ${model.zones.length} zones${dirty?' · Unsaved changes':''}`;
  const selected=selectedObject(),geometry=properties.querySelector('.geometry');if(selected&&geometry)geometry.textContent=`Position ${Math.round(selected.x)}, ${Math.round(selected.y)} · Size ${Math.round(selected.width)} × ${Math.round(selected.height)}`;
  if(selected&&!model.edges.includes(selected))for(const dimension of ['width','height']){const input=$(`property-${dimension}`);if(input&&!(pendingPropertyEdit?.id===selected.id&&pendingPropertyEdit.field===dimension))input.value=Math.round(selected[dimension]);}
  if(controlEdit&&selected){
    if(controlEdit.command==='label'&&$('property-label'))$('property-label').value=selected.label;
    if(controlEdit.command==='color'){const colors=objectColors(model,selected);for(const [name,value]of[['background-color',colors.background],['font-color',colors.font]]){const input=$(`property-${name}`);if(input){input.value=value;input.parentElement.querySelector('[type=color]').value=value;}}}
    if(controlEdit.command==='padding')for(const [side,value]of Object.entries(zonePadding(selected))){const input=$(`property-padding-${side}`);if(input)input.value=value;}
  }
  if(selection.size>1){const selected=items(model).filter(n=>selection.has(n.id)),roots=selected.filter(n=>!selected.some(other=>other.id!==n.id&&descendants(model,other.id).has(n.id)));for(const b of properties.querySelectorAll('[data-arrange-minimum]'))b.disabled=busy||roots.length<Number(b.dataset.arrangeMinimum);}
  document.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===tool)));
  viewport.dataset.tool=tool;
  if(selected&&model.edges.includes(selected))for(const panel of properties.querySelectorAll('.attachment-order')){
    const end=panel.dataset.attachmentEnd,key=attachmentKey(selected.id,end),group=[...router.groups.values()].find(g=>g.entries.some(e=>e.key===key));if(!group)continue;
    const index=group.entries.findIndex(e=>e.key===key),buttons=panel.querySelectorAll('.attachment-order-buttons button');
    buttons[0].disabled=busy||Boolean(gesture)||index===0;buttons[1].disabled=busy||Boolean(gesture)||index===group.entries.length-1;
    panel.querySelector(`#btn-reset-${end}-attachment-order`).disabled=busy||Boolean(gesture)||!group.manual;
  }
  $('canvas-help').textContent={select:'Drag into or out of containers · Select a connection to edit its route',pan:'Drag to pan · Scroll to zoom · V returns to selection',node:'Click to add a node · Nodes keep a 24-unit gap · Escape cancels',connect:connectSource?'Choose the target node · Escape cancels':'Click a source, then a target · Or drag from a handle',zone:'Click to add a zone · Drag nodes and zones into it',waypoint:'Click to place a waypoint · Adding one uses orthogonal routing · Escape cancels'}[tool];
  editingControls?.render();
}
function draw({inspect=true,reroute=true}={}) {
  if(inspect)flushPropertyEdit();
  if(!router)return;
  if(activeWaypoint&&(!selection.has(activeWaypoint.edgeId)||selection.size!==1||!object(model,activeWaypoint.edgeId)?.waypoints?.[activeWaypoint.index]))activeWaypoint=null;
  if(activeLabel&&(!selection.has(activeLabel)||selection.size!==1||!object(model,activeLabel)?.label))activeLabel=null;
  if(reroute)routes=router.route(model,{freezeOrder:Boolean(gesture&&['move','resize','waypoint'].includes(gesture.type))});
  world.replaceChildren(createScene(model,routes,selection,{tool,connectSource,hoverId,dropTarget,activeWaypoint}));updateView();updateControls();if(inspect&&!panelsSuspended){renderProperties();renderHierarchy();}
}
function safeDraw(options) {try{draw(options)}catch(e){error(e)}}
function commit(before,message,{forceSource=false,inspect=true}={}) {
  if(history.record(before,model)){dirty=true;syncSource(forceSource);status(message);}
  safeDraw({inspect});
}
function mutate(message,fn,{inspect=true,axis=null,spacing=true}={}) {
  if(busy||gesture)return;
  if(editingControls&&!editingControls.beforeAction())return;
  flushPropertyEdit();
  const before=copy(model),previousSelection=new Set(selection);
  try {fn();if(spacing){const changed=new Set(model.nodes.filter(n=>{const old=before.nodes.find(o=>o.id===n.id);return !old||['x','y','width','height'].some(k=>old[k]!==n[k]);}).map(n=>n.id));ensureNodeSpacing(model,{preferredIds:changed,axis});}expandZones(model);translateWaypoints(before,model);validateModel(model);router.route(model);commit(before,message,{inspect});if(!inspect)renderHierarchy();}
  catch(e){model=before;selection=previousSelection;safeDraw();error(e);}
}
function setTool(value){if(editingControls&&!editingControls.beforeAction())return;if(gesture)cancelGesture();flushPropertyEdit();connectSource=null;hoverId=null;activeWaypoint=null;activeLabel=null;waypointEdge=null;tool=value;if(value==='connect')selection.clear();safeDraw({reroute:false});viewport.focus();}
function select(id,extend=false){if(editingControls&&!editingControls.beforeAction())return;flushPropertyEdit();activeWaypoint=null;activeLabel=null;if(extend){selection.has(id)?selection.delete(id):selection.add(id);}else selection=new Set(id?[id]:[]);for(const selected of selection){let parent=object(model,selected)?.parentId;while(parent){collapsedZones.delete(parent);parent=object(model,parent)?.parentId;}}safeDraw({reroute:false});}
function queuePropertyEdit(edit){if(pendingPropertyEdit&&(pendingPropertyEdit.id!==edit.id||(pendingPropertyEdit.field||'label')!==(edit.field||'label')))flushPropertyEdit();pendingPropertyEdit={...pendingPropertyEdit,...edit};}
function flushFontSize(){
  if(pendingFontSize===null||busy||gesture)return;const value=Number(pendingFontSize);pendingFontSize=null;
  if(!Number.isInteger(value)||value<10||value>48){updateControls();error(new Error('Choose a diagram font size between 10 and 48.'));return;}
  if(value!==diagramFontSize(model))mutate('Diagram font size updated.',()=>{model.settings.fontSize=value;for(const n of model.nodes)resizeNode(n,value);});
}
function applyPropertyValue(id,field,value){
  const current=object(model,id);if(['width','height'].includes(field)){const size=Number(value);if(!Number.isFinite(size)||size<=0)throw new Error('Enter a positive size.');resizeNodeTo(model,id,field==='width'?size:current.width,field==='height'?size:current.height);}
  else if(field.startsWith('padding-')){const size=Number(value);if(!String(value).trim()||!Number.isFinite(size)||size<0||size>MAX_ZONE_PADDING)throw new Error(`Enter padding between 0 and ${MAX_ZONE_PADDING}.`);current.padding={...zonePadding(current),[field.slice(8)]:size};}
  else current[field]=value;
  if(field==='label'){if(model.nodes.includes(current))resizeNode(current,diagramFontSize(model));if(model.zones.includes(current))current.width=Math.max(current.width,textWidth(value,diagramFontSize(model))+32);}
}
function previewPropertyEdit(edit){
  if(busy||gesture)return;queuePropertyEdit(edit);const pending=pendingPropertyEdit,field=pending.field||'label';if(!pending.before){pending.before=copy(model);pending.dirtyBefore=dirty;}
  if(['backgroundColor','fontColor'].includes(field)&&!/^#[\da-f]{6}$/i.test(pending.value))return;
  const last=copy(model);try{applyPropertyValue(pending.id,field,pending.value);if(field==='label')ensureNodeSpacing(model,{preferredIds:descendants(model,pending.id)});expandZones(model);validateModel(model);safeDraw({inspect:false});dirty=JSON.stringify(model)!==JSON.stringify(pending.before)||pending.dirtyBefore;syncSource();updateControls();renderHierarchy();}catch(e){model=last;safeDraw({inspect:false});error(e);}
}
function flushPropertyEdit({font=true}={}){
  if(font)flushFontSize();if(!pendingPropertyEdit||busy||gesture)return;
  const edit=pendingPropertyEdit;pendingPropertyEdit=null;const {id,value,field='label'}=edit,item=object(model,id);if(!item)return;
  const caption={backgroundColor:'Background color',fontColor:'Font color'}[field]||field[0].toUpperCase()+field.slice(1);
  if(edit.before){try{if(item[field]!==value)applyPropertyValue(id,field,value);expandZones(model);validateModel(model);dirty=edit.dirtyBefore;commit(edit.before,`${caption} updated.`,{inspect:false});renderHierarchy();}catch(e){model=edit.before;dirty=edit.dirtyBefore;syncSource();safeDraw();error(e);}return;}
  if((item[field]||'')===value)return;mutate(`${caption} updated.`,()=>applyPropertyValue(id,field,value),{inspect:false});
}
// Commit property typing before a canvas/toolbar action can replace its input.
document.addEventListener('pointerdown',event=>{panelsSuspended=true;try{if(!event.target.closest(`#property-${pendingPropertyEdit?.field||'label'}`))flushPropertyEdit({font:event.target.id!=='font-size'});}finally{panelsSuspended=false;}},true);
document.addEventListener('click',()=>{if(hierarchyNeedsRefresh){hierarchyNeedsRefresh=false;renderHierarchy();}if(propertiesNeedRefresh){propertiesNeedRefresh=false;renderProperties();}});
function selectedObject(){return selection.size===1?object(model,[...selection][0]):null;}
function arrangeSelection(command,ids=selection){mutate('Selection arranged; contents moved together.',()=>arrange(model,ids,command),{spacing:false});}
function beginControlDraft(command,target){
  flushPropertyEdit();controlEdit={command,target,before:copy(model),dirtyBefore:dirty,sourceBefore:editor.value,sourceDirtyBefore:sourceDirty};
}
function previewControlDraft(values){
  if(!controlEdit)return {error:'This edit is no longer active.',field:Object.keys(values)[0]};
  for(const [field,value]of Object.entries(values)){
    if(['backgroundColor','fontColor'].includes(field)&&!/^#[\da-f]{6}$/i.test(value.trim()))return{error:'Enter a color such as #38bdf8.',field};
    if(field.startsWith('padding-')&&(!value.trim()||!Number.isFinite(Number(value))||Number(value)<0||Number(value)>MAX_ZONE_PADDING))return{error:`Enter padding between 0 and ${MAX_ZONE_PADDING}.`,field};
    if(field==='fontSize'&&(!value.trim()||!Number.isInteger(Number(value))||Number(value)<10||Number(value)>48))return{error:'Enter a whole text size between 10 and 48.',field};
  }
  const last=model,view={...model.settings.view};model=copy(controlEdit.before);model.settings.view=view;
  try{
    for(const [field,value]of Object.entries(values)){
      if(field==='fontSize'){model.settings.fontSize=Number(value);for(const n of model.nodes)resizeNode(n,Number(value));}
      else applyPropertyValue(controlEdit.target.id,field,field.endsWith('Color')?value.trim():value);
    }
    if(controlEdit.command==='label'||controlEdit.command==='font')ensureNodeSpacing(model,{preferredIds:controlEdit.target.id?descendants(model,controlEdit.target.id):new Set(model.nodes.map(n=>n.id))});
    expandZones(model);translateWaypoints(controlEdit.before,model);validateModel(model);router.route(model);
    dirty=JSON.stringify(model)!==JSON.stringify(controlEdit.before)||controlEdit.dirtyBefore;syncSource();safeDraw({inspect:false});return{};
  }catch(e){model=last;safeDraw({inspect:false});return{error:e.message,field:Object.keys(values)[0]};}
}
function finishControlDraft(){
  if(!controlEdit)return;const edit=controlEdit;controlEdit=null;dirty=edit.dirtyBefore;
  commit(edit.before,`${{label:'Label',padding:'Padding',color:'Color',font:'Text size'}[edit.command]} updated.`,{inspect:false});
  hierarchyNeedsRefresh=true;propertiesNeedRefresh=true;
}
function cancelControlDraft(){
  if(!controlEdit)return;const edit=controlEdit,view={...model.settings.view};controlEdit=null;model=edit.before;model.settings.view=view;dirty=edit.dirtyBefore;
  sourceDirty=edit.sourceDirtyBefore;editor.value=edit.sourceBefore;syncSource();safeDraw();status('Edit cancelled.');
}
function executeControl(command,target,value){
  const id=target.id,ids=new Set(target.ids||[]),n=object(model,id);
  switch(command){
    case 'set-shape':mutate('Node shape updated.',()=>{object(model,id).shape=value;resizeNode(object(model,id),diagramFontSize(model));});break;
    case 'set-style':mutate('Line style updated.',()=>object(model,id).style=value);break;
    case 'set-arrows':mutate('Arrow direction updated.',()=>object(model,id).direction=value);break;
    case 'fit-label':mutate('Node fitted to label.',()=>{delete object(model,id).manualSize;resizeNode(object(model,id),diagramFontSize(model));});break;
    case 'container':mutate(n.container?'Node containment removed; children retained.':'Node containment enabled.',()=>setNodeContainer(model,id,!n.container));break;
    case 'connect':setTool('connect');connectSource=id;selection=new Set([id]);safeDraw({reroute:false});status('Choose the target object. Escape cancels.');break;
    case 'waypoint':if(target.point){mutate('Waypoint added.',()=>{const edge=object(model,id),index=waypointInsertionIndex(routes.get(id),edge.waypoints,target.point);insertWaypoint(edge,target.point,index);activeWaypoint={edgeId:id,index};});}else{setTool('waypoint');waypointEdge=id;status('Click the canvas to place a waypoint.');}break;
    case 'remove-waypoint':mutate('Waypoint removed.',()=>{object(model,id).waypoints.splice(target.index,1);activeWaypoint=null;});break;
    case 'reset-route':mutate('Manual waypoints cleared. Attachment sides retained.',()=>{delete object(model,id).waypoints;activeWaypoint=null;});break;
    case 'reset-label':mutate('Automatic label placement restored.',()=>{delete object(model,id).labelPosition;activeLabel=null;});break;
    case 'fit-zone':mutate('Zones fitted to contents; children kept in place.',()=>fitZonesToContents(model,ids),{spacing:false});break;
    case 'arrange':arrangeSelection(value,ids);break;
    case 'set-side':mutate('Attachment side updated.',()=>object(model,id)[target.end+'Side']=value||null);break;
    case 'order':mutate('Attachment order updated.',()=>reorderAttachment(model,router.groups,id,target.end,value));break;
    case 'reset-side-order':{const key=attachmentKey(id,target.end),g=[...router.groups.values()].find(g=>g.entries.some(e=>e.key===key));if(g)mutate('Automatic order restored for this side.',()=>resetAttachmentOrder(model,g.n.id,g.side));break;}
    case 'delete':mutate('Selection deleted.',()=>{deleteSelection(model,ids);selection=new Set([...selection].filter(id=>object(model,id)));activeWaypoint=null;activeLabel=null;});break;
    case 'node':if(target.point)addNode(target.point);else setTool('node');break;
    case 'zone':if(target.point)addZone(target.point);else setTool('zone');break;
    case 'fit-diagram':fit();break;
    case 'tool':setTool(value);break;
    case 'details':renderProperties();break;
    case 'new':newDiagram();break;
    case 'open':$('file-input').click();break;
    case 'save':saveProject();break;
    case 'export-svg':case 'export-png':case 'export-mermaid':$('export-format').value=command.slice(7);exportDiagram();break;
    case 'source':case 'hierarchy':showPanel(command);break;
    case 'set-flow':mutate('Flow direction set. Use Auto layout to rearrange.',()=>model.settings.direction=value);break;
    case 'set-layout':mutate('Layout preference set. Use Auto layout to rearrange.',()=>model.settings.layout=value);break;
    case 'auto-layout':$('btn-layout').click();break;
  }
}
function field(label,control){const wrap=document.createElement('div');wrap.className='property-field';const caption=document.createElement('label');const id=label==='Parent'?'property-parent-zone':`property-${label.toLowerCase().replace(/\W/g,'-')}`;control.id=id;control.disabled=busy;caption.htmlFor=id;caption.textContent=label;wrap.append(caption,control);propertyHost.append(wrap);return control;}
function propertyGroup(name){const section=document.createElement('section');section.className='property-group';section.dataset.group=name;const heading=document.createElement('h3');heading.textContent=name;section.append(heading);properties.append(section);propertyHost=section;return section;}
function selectControl(label,value,options,onChange){const input=document.createElement('select');for(const [key,text]of options){const option=document.createElement('option');option.value=key;option.textContent=text;input.append(option);}input.value=value||'';field(label,input);input.addEventListener('change',()=>onChange(input.value));return input;}
function renderProperties(){
  propertiesNeedRefresh=false;
  propertyHost=properties;
  const focused=properties.contains(document.activeElement)?document.activeElement:null,focusState=focused?{id:focused.id,start:focused.selectionStart,end:focused.selectionEnd}:null;
  const previousId=inspectedId;
  const currentId=selectedObject()?.id||null;if(currentId!==inspectedId){properties.closest('.properties-panel').scrollTop=0;inspectedId=currentId;}
  properties.replaceChildren();$('selection-count').textContent=selection.size?`${selection.size} selected`:'No selection';
  if(!selection.size){const p=document.createElement('p');p.className='empty-properties';p.textContent='Select a node, edge, or zone to edit its properties.';properties.append(p);return;}
  if(selection.size>1){
    const p=document.createElement('p');p.className='empty-properties';p.textContent='Align zones and nodes as whole groups. Their contents move together; membership stays the same.';properties.append(p);
    const selected=items(model).filter(n=>selection.has(n.id)),roots=selected.filter(n=>!selected.some(other=>other.id!==n.id&&descendants(model,other.id).has(n.id))),row=document.createElement('div');row.className='arrange-buttons';
    for(const [command,label]of[['top','Align top'],['left','Align left'],['distribute-x','Space across'],['distribute-y','Space down']]){const b=document.createElement('button');b.id=`btn-align-${command}`;b.textContent=label;b.dataset.arrangeMinimum=command.startsWith('distribute')?3:2;b.disabled=roots.length<Number(b.dataset.arrangeMinimum);b.addEventListener('click',()=>arrangeSelection(command));row.append(b);}properties.append(row);
    if(selected.some(n=>model.zones.includes(n))){const b=document.createElement('button');b.id='btn-fit-zone';b.textContent='Fit selected zones to contents';b.addEventListener('click',()=>mutate('Selected zones fitted to contents.',()=>fitZonesToContents(model,selection),{spacing:false}));properties.append(b);}
    const hint=document.createElement('p');hint.className='small-note';hint.textContent='Use Align and Distribute in the selection bar for more options. Clearance is resolved along the other axis to keep the alignment.';properties.append(hint);return;
  }
  const n=selectedObject();if(!n)return;const id=n.id;
  const identity=document.createElement('div');identity.className='object-id';identity.textContent=`${model.edges.includes(n)?'Edge':model.zones.includes(n)?'Zone':'Node'} · ${id}`;properties.append(identity);
  const target={id,ids:[id]};propertyGroup('Label');
  const label=document.createElement('textarea');label.value=n.label;field('Label',label);
  label.addEventListener('input',()=>previewPropertyEdit({id,value:label.value}));
  label.addEventListener('change',()=>{queuePropertyEdit({id,value:label.value});flushPropertyEdit();});label.addEventListener('blur',flushPropertyEdit);
  if(model.edges.includes(n)){
    propertyGroup('Connection label');
    const position=document.createElement('p');position.className='small-note';position.textContent=n.labelPosition?'Manual label · follows the connection':'Automatic label placement';propertyHost.append(position);
    const reset=document.createElement('button');reset.id='btn-reset-label-position';reset.textContent='Reset label position';reset.disabled=!n.labelPosition;reset.addEventListener('click',()=>executeControl('reset-label',target));propertyHost.append(reset);
    const hint=document.createElement('p');hint.className='small-note';hint.textContent='Drag the label, or click it and use arrow keys. A dotted leader appears when the label is away from its connection. Manual placement allows overlaps.';propertyHost.append(hint);
  }
  propertyGroup('Context');
  for(const name of ['description','notes']){const input=document.createElement('textarea');input.value=n[name]||'';input.rows=name==='notes'?4:2;field(name[0].toUpperCase()+name.slice(1),input);input.addEventListener('input',()=>queuePropertyEdit({id,field:name,value:input.value}));input.addEventListener('change',()=>{queuePropertyEdit({id,field:name,value:input.value});flushPropertyEdit();});input.addEventListener('blur',flushPropertyEdit);}
  const hint=document.createElement('p');hint.className='small-note';hint.textContent='Descriptions and notes are retained in project files.';propertyHost.append(hint);
  if(model.edges.includes(n)) {
    propertyGroup('Structure');
    const endpoints=items(model).map(o=>[o.id,`${o.label.replace(/\n/g,' ')} (${o.id})`]);
    selectControl('Source',n.source,endpoints,value=>mutate('Connection source updated.',()=>{const e=object(model,id);e.source=value;e.sourceSide=null;pruneAttachmentOrders(model);}));
    selectControl('Target',n.target,endpoints,value=>mutate('Connection target updated.',()=>{const e=object(model,id);e.target=value;e.targetSide=null;pruneAttachmentOrders(model);}));
    propertyGroup('Appearance');
    const arrows=selectControl('Direction',n.direction,[['forward','One arrow'],['none','No arrows'],['both','Two arrows']],value=>executeControl('set-arrows',target,value));arrows.previousElementSibling.textContent='Arrows';
    selectControl('Line style',n.style,[['normal','Normal'],['dashed','Dashed'],['thick','Thick']],value=>executeControl('set-style',target,value));
    propertyGroup('Connection route');
    selectControl('Routing',n.routing,[['orthogonal','Orthogonal'],['straight','Straight']],value=>{if(value==='straight'&&n.waypoints?.length){error(new Error('Reset route before choosing Straight to remove manual waypoints.'));$('property-routing').value=n.routing;return;}mutate('Routing updated.',()=>object(model,id).routing=value);});
    const sides=[['','Automatic'],['north','Top'],['south','Bottom'],['west','Left'],['east','Right']];
    selectControl('Source attachment',n.sourceSide,sides,value=>executeControl('set-side',{...target,end:'source'},value));
    selectControl('Target attachment',n.targetSide,sides,value=>executeControl('set-side',{...target,end:'target'},value));
    for(const end of ['source','target'])renderAttachmentOrder(n,end);
    const orderHint=document.createElement('p');orderHint.className='small-note';orderHint.textContent='Move an attachment in the stack to set the order for that whole side. Spacing stays automatic. New connections join at the end; Reset releases all attachments on that side.';propertyHost.append(orderHint);
    const hint=document.createElement('p');hint.className='small-note';hint.textContent='Forced sides stay fixed. Drag a + on the connection to add a waypoint. Waypoints stay put when one endpoint moves and travel when both move together.';propertyHost.append(hint);
    const add=document.createElement('button');add.id='btn-add-waypoint';add.textContent='Add waypoint';add.disabled=(n.waypoints||[]).length>=MAX_WAYPOINTS;add.addEventListener('click',()=>executeControl('waypoint',target));propertyHost.append(add);
    for(const [index,p]of(n.waypoints||[]).entries()){
      const row=document.createElement('div');row.className='waypoint-row';const pick=document.createElement('button');pick.textContent=`Waypoint ${index+1} · ${Math.round(p.x)}, ${Math.round(p.y)}`;pick.addEventListener('click',()=>{activeWaypoint={edgeId:id,index};safeDraw({reroute:false});viewport.focus();});
      const remove=document.createElement('button');remove.textContent='×';remove.setAttribute('aria-label',`Remove waypoint ${index+1}`);remove.addEventListener('click',()=>executeControl('remove-waypoint',{...target,index}));row.append(pick,remove);propertyHost.append(row);
    }
    const conflicts=waypointConflicts(model,n);if(conflicts.length){const warning=document.createElement('p');warning.className='waypoint-warning';warning.textContent=conflicts.map(c=>`Waypoint ${c.index+1} is blocked by ${c.node.label}.`).join(' ')+' Move the point or node; the route currently skips blocked points.';propertyHost.append(warning);}
    const reset=document.createElement('button');reset.id='btn-reset-route';reset.textContent='Reset route';reset.disabled=!n.waypoints?.length;reset.addEventListener('click',()=>executeControl('reset-route',target));propertyHost.append(reset);
  }else{
    propertyGroup('Appearance');
    if(model.nodes.includes(n))selectControl('Shape',n.shape,shapes.map(s=>[s,{rectangle:'Rectangle',rounded:'Rounded rectangle',diamond:'Diamond',circle:'Circle',cylinder:'Database cylinder'}[s]]),value=>executeControl('set-shape',target,value));
    for(const [name,key,value]of[['Background color','backgroundColor',objectColors(model,n).background],['Font color','fontColor',objectColors(model,n).font]]){
      const hex=document.createElement('input');hex.type='text';hex.value=value;hex.maxLength=7;hex.spellcheck=false;field(name,hex);if(key==='fontColor')hex.previousElementSibling.textContent='Text color';const row=hex.parentElement;row.classList.add('color-field');
      const picker=document.createElement('input');picker.type='color';picker.value=value;picker.disabled=busy;picker.setAttribute('aria-label',`${name} picker`);row.append(picker);
      const queue=()=>{if(/^#[\da-f]{6}$/i.test(hex.value.trim()))picker.value=hex.value.trim();queuePropertyEdit({id,field:key,value:hex.value.trim()});};hex.addEventListener('input',()=>{queue();previewPropertyEdit({id,field:key,value:hex.value.trim()});});hex.addEventListener('change',()=>{queue();flushPropertyEdit();});hex.addEventListener('blur',flushPropertyEdit);
      picker.addEventListener('input',()=>{hex.value=picker.value;queue();previewPropertyEdit({id,field:key,value:picker.value});});picker.addEventListener('change',()=>{hex.value=picker.value;queue();flushPropertyEdit();});picker.addEventListener('blur',flushPropertyEdit);
    }
    propertyGroup('Structure');
    if(model.nodes.includes(n)){const toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=Boolean(n.container);field('Container node',toggle);toggle.addEventListener('change',()=>executeControl('container',target));}
    const excluded=movableIds(model,new Set([id]));
    selectControl('Parent',n.parentId,[['','Top level'],...items(model).filter(z=>!excluded.has(z.id)).map(z=>[z.id,`${model.zones.includes(z)?'Zone':'Node'} · ${z.label}`])],value=>{mutate('Parent updated.',()=>reparent(model,id,value));selectAndReveal(id);});
    propertyGroup('Geometry');
    for(const dimension of ['width','height']) {
      const input=document.createElement('input');input.type='number';input.min=model.nodes.includes(n)?1:dimension==='width'?160:100;input.step=1;input.value=Math.round(n[dimension]);field(dimension==='width'?'Width':'Height',input);
      input.addEventListener('input',()=>{queuePropertyEdit({id,field:dimension,value:input.value});});input.addEventListener('change',()=>{queuePropertyEdit({id,field:dimension,value:input.value});flushPropertyEdit();});input.addEventListener('blur',flushPropertyEdit);
    }
    if(model.nodes.includes(n)){const fitLabel=document.createElement('button');fitLabel.textContent='Fit to label';fitLabel.addEventListener('click',()=>executeControl('fit-label',target));propertyHost.append(fitLabel);}
    else{
      const fit=document.createElement('button');fit.id='btn-fit-zone';fit.textContent='Fit to contents';fit.addEventListener('click',()=>executeControl('fit-zone',target));propertyHost.append(fit);
      const caption=document.createElement('strong');caption.className='connections-heading';caption.textContent='Content padding';propertyHost.append(caption);
      const grid=document.createElement('div');grid.className='zone-padding';const padding=zonePadding(n);
      for(const [side,label]of[['top','Below title'],['right','Right'],['bottom','Bottom'],['left','Left']]){const input=document.createElement('input');input.type='number';input.min=0;input.max=MAX_ZONE_PADDING;input.step=1;input.value=padding[side];field(`Padding ${side}`,input);input.previousElementSibling.textContent=label;grid.append(input.parentElement);const queue=()=>queuePropertyEdit({id,field:`padding-${side}`,value:input.value});input.addEventListener('input',queue);input.addEventListener('change',()=>{queue();flushPropertyEdit();});input.addEventListener('blur',flushPropertyEdit);}propertyHost.append(grid);
      const hint=document.createElement('p');hint.className='small-note';hint.textContent='Frames grow when contents need room. Manual size stays until you resize or fit; fitting keeps children in place and includes nested zone frames.';propertyHost.append(hint);
    }
    const geometry=document.createElement('div');geometry.className='geometry';geometry.textContent=`Position ${Math.round(n.x)}, ${Math.round(n.y)} · Size ${Math.round(n.width)} × ${Math.round(n.height)}`;propertyHost.append(geometry);
    const connections=model.edges.filter(e=>e.source===id||e.target===id);if(connections.length){propertyGroup('Connections');for(const e of connections){const b=document.createElement('button');b.className='flow-row';b.textContent=`${e.source===id?'→':'←'} ${object(model,e.source===id?e.target:e.source)?.label}${e.label?' · '+e.label:''}`;b.addEventListener('click',()=>selectAndReveal(e.id));propertyHost.append(b);}}
  }
  for(const name of ['Label','Appearance','Geometry','Structure','Connection route','Connection label','Context','Connections']){const group=[...properties.children].find(el=>el.dataset.group===name);if(group)properties.append(group);}
  propertyHost=properties;
  if(focusState&&currentId===previousId){const input=$(focusState.id);if(input){input.focus({preventScroll:true});if(focusState.start!=null&&input.setSelectionRange)input.setSelectionRange(focusState.start,focusState.end);}}
}
function renderAttachmentOrder(edge,end){
  const key=attachmentKey(edge.id,end),group=[...router.groups.values()].find(g=>g.entries.some(e=>e.key===key));if(!group)return;
  const index=group.entries.findIndex(e=>e.key===key),horizontal=['north','south'].includes(group.side),sideName={north:'Top',south:'Bottom',west:'Left',east:'Right'}[group.side];
  const panel=document.createElement('div');panel.className='attachment-order';panel.dataset.attachmentEnd=end;
  const caption=document.createElement('p');caption.className='small-note';caption.textContent=`${end==='source'?'Source':'Target'} order · ${sideName} · ${index+1} of ${group.entries.length} · ${group.manual?'Manual':'Automatic'}`;panel.append(caption);
  const row=document.createElement('div');row.className='attachment-order-buttons';
  for(const [delta,direction]of[[-1,horizontal?'left':'up'],[1,horizontal?'right':'down']]){
    const button=document.createElement('button');button.id=`btn-${end}-attachment-${direction}`;button.textContent=`Move ${direction}`;button.disabled=index+delta<0||index+delta>=group.entries.length;button.addEventListener('click',()=>executeControl('order',{id:edge.id,ids:[edge.id],end},delta));row.append(button);
  }
  const reset=document.createElement('button');reset.id=`btn-reset-${end}-attachment-order`;reset.textContent='Reset side order';reset.disabled=!group.manual;reset.addEventListener('click',()=>executeControl('reset-side-order',{id:edge.id,ids:[edge.id],end}));
  panel.append(row,reset);propertyHost.append(panel);
}
function selectAndReveal(id,extend=false){select(id,extend);const n=object(model,id);if(!n)return;const bounds=model.edges.includes(n)?routes.get(id):[{x:n.x,y:n.y},{x:n.x+n.width,y:n.y+n.height}];if(!bounds?.length)return;const x=(Math.min(...bounds.map(p=>p.x))+Math.max(...bounds.map(p=>p.x)))/2,y=(Math.min(...bounds.map(p=>p.y))+Math.max(...bounds.map(p=>p.y)))/2,v=model.settings.view;const sx=x*v.scale+v.x,sy=y*v.scale+v.y;if(sx<40||sx>viewport.clientWidth-40||sy<40||sy>viewport.clientHeight-40){v.x=viewport.clientWidth/2-x*v.scale;v.y=viewport.clientHeight/2-y*v.scale;updateView();}}
function renderHierarchy(){
  if(panelsSuspended){hierarchyNeedsRefresh=true;return;}hierarchyNeedsRefresh=false;
  const host=$('hierarchy-tree');host.replaceChildren();
  const emit=(parent,level)=>{for(const n of items(model).filter(n=>n.parentId===parent)){
    const zone=model.zones.includes(n),container=isContainer(model,n),row=document.createElement('div');row.className='tree-row';row.style.paddingLeft=`${level*15}px`;row.dataset.treeId=n.id;
    if(container){const toggle=document.createElement('button');toggle.className='tree-toggle';toggle.textContent=collapsedZones.has(n.id)?'▸':'▾';toggle.setAttribute('aria-label',`${collapsedZones.has(n.id)?'Expand':'Collapse'} ${n.label}`);toggle.setAttribute('aria-expanded',String(!collapsedZones.has(n.id)));toggle.addEventListener('click',()=>{collapsedZones.has(n.id)?collapsedZones.delete(n.id):collapsedZones.add(n.id);renderHierarchy();});row.append(toggle);}else{const spacer=document.createElement('span');spacer.className='tree-spacer';row.append(spacer);}
    const b=document.createElement('button');b.className=`tree-object${selection.has(n.id)?' active':''}`;b.setAttribute('aria-label',`Select ${n.label}`);b.setAttribute('aria-pressed',String(selection.has(n.id)));b.textContent=`${zone?'▧':{rectangle:'□',rounded:'▢',diamond:'◇',circle:'○',cylinder:'▱'}[n.shape]} ${n.label||n.id}`;b.title=n.description||n.label;b.addEventListener('click',e=>selectAndReveal(n.id,e.shiftKey));row.append(b);host.append(row);if(container&&!collapsedZones.has(n.id))emit(n.id,level+1);
  }};emit(null,0);
  if(!items(model).length){const p=document.createElement('p');p.className='empty-properties';p.textContent='Add a zone or node to begin. Drag objects into zones or container nodes to build the hierarchy.';host.append(p);}
  const flows=$('hierarchy-flows');flows.replaceChildren();for(const e of model.edges){const b=document.createElement('button');b.className=`flow-row${selection.has(e.id)?' active':''}`;b.textContent=`${object(model,e.source)?.label} ${e.direction==='both'?'↔':e.direction==='none'?'—':'→'} ${object(model,e.target)?.label}${e.label?' · '+e.label:''}`;b.title=b.textContent;b.addEventListener('click',()=>selectAndReveal(e.id));flows.append(b);}
  $('hierarchy-count').textContent=`${items(model).length} objects`;if(!model.edges.length)flows.textContent='No connections yet.';
}
function diagramPoint(event){const b=canvas.getBoundingClientRect(),v=model.settings.view;return{x:(event.clientX-b.left-v.x)/v.scale,y:(event.clientY-b.top-v.y)/v.scale};}
function canvasPoint(event){const b=canvas.getBoundingClientRect();return{x:event.clientX-b.left,y:event.clientY-b.top};}
function snap(value){return model.settings.grid?Math.round(value/20)*20:value;}
function parentZoneAt(point){return containingParent(model,{x:point.x,y:point.y,width:0,height:0});}
function placementParent(point,adoptNode){return adoptNode?containingParent(model,{...point,width:0,height:0},new Set(),items(model),{allowNodes:true}):parentZoneAt(point);}
function addNode(point,{adoptNode=false}={}){mutate('Node added.',()=>{const parent=placementParent(point,adoptNode),node={id:nextId(model,'Node'),label:'New node',shape:'rectangle',parentId:null,x:point.x-60,y:point.y-27,width:120,height:54};resizeNode(node,diagramFontSize(model));node.x=snap(node.x);node.y=snap(node.y);model.nodes.push(node);dropSelection(model,new Set([node.id]),undefined,new Map([[node.id,parent]]),{expand:false});selection=new Set([node.id]);});setTool('select');}
function addZone(point,{centred=false,adoptNode=false}={}){mutate('Zone added.',()=>{const parent=placementParent(point,adoptNode),zone={id:nextId(model,'Zone'),label:'New zone',parentId:null,x:snap(point.x-(centred?140:0)),y:snap(point.y-(centred?90:0)),width:280,height:180};model.zones.push(zone);dropSelection(model,new Set([zone.id]),undefined,new Map([[zone.id,parent]]),{expand:false});selection=new Set([zone.id]);});setTool('select');}
function capture(event,data){gesture={...data,pointerId:event.pointerId,clientX:event.clientX,clientY:event.clientY,start:diagramPoint(event),before:copy(model),selectionBefore:new Set(selection),waypointBefore:activeWaypoint,labelBefore:activeLabel,moved:false};viewport.setPointerCapture(event.pointerId);viewport.classList.add('gesturing');viewport.dataset.gesture=data.type;event.preventDefault();}
function insertWaypoint(edge,point,index){if((edge.waypoints||[]).length>=MAX_WAYPOINTS)throw new Error(`A connection can have at most ${MAX_WAYPOINTS} waypoints.`);edge.waypoints||=[];edge.waypoints.splice(index,0,{x:snap(point.x),y:snap(point.y)});edge.routing='orthogonal';}
function placementPoint(event){const b=canvas.getBoundingClientRect(),hit=document.elementFromPoint(event.clientX,event.clientY);return event.clientX>=b.left&&event.clientX<=b.right&&event.clientY>=b.top&&event.clientY<=b.bottom&&!hit?.closest('.zoom-toolbar');}
document.querySelectorAll('[data-tool="node"],[data-tool="zone"]').forEach(button=>{
  button.addEventListener('pointerdown',event=>{if(!busy&&!gesture&&event.isPrimary&&event.button===0)paletteStart={pointerId:event.pointerId,tool:button.dataset.tool,x:event.clientX,y:event.clientY};});
});
document.addEventListener('pointermove',event=>{
  if(!paletteStart||paletteStart.pointerId!==event.pointerId||Math.hypot(event.clientX-paletteStart.x,event.clientY-paletteStart.y)<4)return;
  const start=paletteStart;paletteStart=null;if(busy||gesture)return;flushPropertyEdit();blockedPaletteClick=start.tool;
  capture(event,{type:'place',placementTool:start.tool});gesture.clientX=start.x;gesture.clientY=start.y;moveGesture(event);
});
document.addEventListener('pointerup',()=>{paletteStart=null;setTimeout(()=>{blockedPaletteClick=null;},0);});
document.addEventListener('pointercancel',()=>{paletteStart=null;blockedPaletteClick=null;});
document.addEventListener('click',event=>{if(blockedPaletteClick&&event.target.closest('[data-tool]')?.dataset.tool===blockedPaletteClick){event.preventDefault();event.stopImmediatePropagation();}blockedPaletteClick=null;},true);
function addConnection(source,target,sourceSide=null,targetSide=null){let edge;mutate('Connection added.',()=>{edge={id:nextId(model,'Edge'),source,target,label:'',direction:'forward',style:'normal',routing:'orthogonal',sourceSide,targetSide};model.edges.push(edge);selection=new Set([edge.id]);});connectSource=null;if(edge&&model.edges.includes(edge))setTool('select');else safeDraw({reroute:false});}
function beginPointer(event){
  if(busy||gesture||!event.isPrimary||event.button!==0||event.target.closest('.zoom-toolbar'))return;
  if(editingControls&&!editingControls.beforeAction())return;
  $('error-banner').hidden=true;
  const point=diagramPoint(event),target=event.target;
  if(tool==='pan'||spaceHeld){capture(event,{type:'pan',view:{...model.settings.view}});return;}
  if(tool==='waypoint'){
    const id=waypointEdge,edge=object(model,id);if(!edge||!model.edges.includes(edge)){setTool('select');return;}
    const index=waypointInsertionIndex(routes.get(id),edge.waypoints,point);tool='select';waypointEdge=null;
    mutate('Waypoint added.',()=>{insertWaypoint(edge,point,index);activeWaypoint={edgeId:id,index};});viewport.focus();return;
  }
  if(tool==='node'){addNode(point);return;}if(tool==='zone'){addZone(point);return;}
  const label=tool==='select'?target.closest('.edge-label'):null;if(label){const id=label.dataset.objectId,anchor=layoutEdgeLabels(model,routes).get(id).anchor;select(id);activeLabel=id;capture(event,{type:'label',id,anchor});viewport.focus();return;}
  const waypoint=tool==='select'?target.closest('[data-waypoint]'):null;if(waypoint){const id=waypoint.dataset.waypoint,index=Number(waypoint.dataset.waypointIndex);select(id);activeWaypoint={edgeId:id,index};safeDraw({reroute:false});capture(event,{type:'waypoint',id,index,insert:false});viewport.focus();return;}
  const segment=target.closest('[data-route-segment]');if(segment){const id=segment.dataset.routeSegment,edge=object(model,id);if((edge.waypoints||[]).length>=MAX_WAYPOINTS){error(new Error(`A connection can have at most ${MAX_WAYPOINTS} waypoints.`));return;}capture(event,{type:'waypoint',id,index:waypointInsertionIndex(routes.get(id),edge.waypoints,point),insert:true});viewport.focus();return;}
  const reconnect=target.closest('[data-reconnect]');if(reconnect){capture(event,{type:'connect',edgeId:reconnect.dataset.reconnect,end:reconnect.dataset.end});return;}
  const handle=target.closest('[data-connect]');if(handle){if(tool==='connect'&&connectSource){addConnection(connectSource,handle.dataset.connect,null,handle.dataset.side);return;}capture(event,{type:'connect',source:handle.dataset.connect,side:handle.dataset.side});return;}
  const resize=target.closest('[data-resize]');if(resize){capture(event,{type:'resize',id:resize.dataset.resize,handle:resize.dataset.handle});return;}
  const hit=target.closest('[data-object-id]'),id=hit?.dataset.objectId,item=id?object(model,id):null;
  if(tool==='connect'){if(item&&!model.edges.includes(item)){if(connectSource)addConnection(connectSource,id);else{connectSource=id;selection=new Set([id]);safeDraw({reroute:false});status('Source chosen. Click the target to connect; Escape cancels.');}}else{connectSource=null;selection.clear();safeDraw({reroute:false});}viewport.focus();return;}
  if(item){
    if(event.shiftKey&&model.zones.includes(item)&&!target.closest('[data-zone-header]')){capture(event,{type:'marquee',extend:new Set(selection),zoneId:id});viewport.focus();return;}
    if(event.shiftKey){select(id,true);if(!selection.has(id))return;}else if(!selection.has(id))select(id);
    if(model.edges.includes(item)){activeWaypoint=null;activeLabel=null;safeDraw({reroute:false});viewport.focus();return;}
    capture(event,{type:'move',id,selected:new Set(selection)});viewport.focus();return;
  }
  if(event.shiftKey){capture(event,{type:'marquee',extend:new Set(selection)});}else{selection.clear();safeDraw({reroute:false});capture(event,{type:'pan',view:{...model.settings.view}});}
  viewport.focus();
}
viewport.addEventListener('pointerdown',beginPointer);
function moveGesture(event){
  if(!gesture||gesture.pointerId!==event.pointerId)return;
  const g=gesture,point=diagramPoint(event);g.last={clientX:event.clientX,clientY:event.clientY};
  if(!g.moved&&Math.hypot(event.clientX-g.clientX,event.clientY-g.clientY)<(g.type==='connect'&&g.edgeId?4:3))return;g.moved=true;
  if(g.type==='pan'){const v=model.settings.view;v.x=g.view.x+event.clientX-g.clientX;v.y=g.view.y+event.clientY-g.clientY;updateView();return;}
  if(g.type==='label'){
    model=copy(g.before);object(model,g.id).labelPosition=manualLabelPosition(routes.get(g.id),{x:snap(g.anchor.x+point.x-g.start.x),y:snap(g.anchor.y+point.y-g.start.y)});
    safeDraw({inspect:false,reroute:false});return;
  }
  if(g.type==='waypoint'){
    model=copy(g.before);const edge=object(model,g.id);if(g.insert)insertWaypoint(edge,point,g.index);else{const old=edge.waypoints[g.index];edge.waypoints[g.index]={x:snap(old.x+point.x-g.start.x),y:snap(old.y+point.y-g.start.y)};}
    activeWaypoint={edgeId:g.id,index:g.index};safeDraw({inspect:false});return;
  }
  if(g.type==='place'){
    world.querySelector('.placement-preview')?.remove();
    world.querySelectorAll('.drop-target').forEach(n=>n.classList.remove('drop-target'));dropTarget=null;
    if(placementPoint(event)){const zone=g.placementTool==='zone',preview={label:'New node',shape:'rectangle',x:point.x-60,y:point.y-27,width:120,height:54};if(!zone)resizeNode(preview,diagramFontSize(model));const width=zone?280:preview.width,height=zone?180:preview.height;dropTarget=placementParent(point,true);world.querySelectorAll('.diagram-zone,.diagram-node').forEach(n=>{if(n.dataset.objectId===dropTarget)n.classList.add('drop-target');});world.append(svgElement('rect',{class:'placement-preview editor-only',x:snap(point.x-width/2),y:snap(point.y-height/2),width,height,rx:zone?4:3}));}
    return;
  }
  if(g.type==='move'||g.type==='resize'){
    model=copy(g.before);
    if(g.type==='move'){const primary=object(model,g.id);const dx=snap(primary.x+point.x-g.start.x)-primary.x,dy=snap(primary.y+point.y-g.start.y)-primary.y;moveSelection(model,g.selected,dx,dy,{expand:false});g.dropParents=dropParents(model,g.selected,items(g.before));dropTarget=g.dropParents.get(g.id)||null;dropSelection(model,g.selected,items(g.before),g.dropParents,{expand:false});separateSelection(model,g.selected);}
    else{const n=object(model,g.id),x=n.x+(g.handle.includes('e')?n.width:0),y=n.y+(g.handle.includes('s')?n.height:0);resizeObject(model,g.id,g.handle,snap(x+point.x-g.start.x)-x,snap(y+point.y-g.start.y)-y);}
    if(g.type==='move')translateWaypoints(g.before,model);
    safeDraw({inspect:false});
    if(model.settings.guides!==false){const layer=svgElement('g',{class:'alignment-guides editor-only'});for(const line of alignmentGuides(model,g.type==='move'?g.selected:new Set([g.id])))layer.append(svgElement('line',line.axis==='x'?{x1:line.value,x2:line.value,y1:line.start,y2:line.end}:{y1:line.value,y2:line.value,x1:line.start,x2:line.end}));world.append(layer);}
  }else if(g.type==='marquee'){
    const x=Math.min(g.start.x,point.x),y=Math.min(g.start.y,point.y),w=Math.abs(g.start.x-point.x),h=Math.abs(g.start.y-point.y);
    selection=new Set(g.extend);for(const n of items(model))if(n.x>=x&&n.y>=y&&n.x+n.width<=x+w&&n.y+n.height<=y+h)selection.add(n.id);
    safeDraw({inspect:false,reroute:false});world.append(svgElement('rect',{class:'marquee editor-only',x,y,width:w,height:h}));
  }else if(g.type==='connect'){
    safeDraw({inspect:false,reroute:false});let start;
    if(g.edgeId){const edge=object(model,g.edgeId),path=routes.get(g.edgeId);start=g.end==='source'?path.at(-1):path[0];}
    else{const node=object(model,g.source);start=g.side?sidePoint(node,g.side):{x:node.x+node.width/2,y:node.y+node.height/2};}
    world.append(svgElement('path',{class:'connection-preview editor-only',d:`M${start.x},${start.y} L${point.x},${point.y}`}));
  }
}
viewport.addEventListener('pointermove',event=>{
  if(!gesture){if(tool==='connect'&&!busy){const id=event.target.closest('[data-connect]')?.dataset.connect||event.target.closest('[data-object-id]')?.dataset.objectId,next=items(model).some(n=>n.id===id)?id:null;if(hoverId!==next){hoverId=next;safeDraw({inspect:false,reroute:false});}world.querySelector('.connection-preview')?.remove();if(connectSource){const node=object(model,connectSource),p=diagramPoint(event);world.append(svgElement('path',{class:'connection-preview editor-only',d:`M${node.x+node.width/2},${node.y+node.height/2} L${p.x},${p.y}`}));}}return;}if(gesture.pointerId!==event.pointerId)return;event.preventDefault();
  if(frame)cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{frame=null;moveGesture(event)});
});
function releaseCapture(){const g=gesture;gesture=null;dropTarget=null;if(g&&viewport.hasPointerCapture(g.pointerId))viewport.releasePointerCapture(g.pointerId);viewport.classList.remove('gesturing');delete viewport.dataset.gesture;}
function finishGesture(event){
  if(!gesture||gesture.pointerId!==event.pointerId)return;
  if(frame){cancelAnimationFrame(frame);frame=null;}moveGesture(event);
  const g=gesture;
  if(g.type==='place'){
    const valid=placementPoint(event),point=diagramPoint(event);releaseCapture();world.querySelector('.placement-preview')?.remove();
    if(valid){if(g.placementTool==='node')addNode(point,{adoptNode:true});else addZone(point,{centred:true,adoptNode:true});}
    else{safeDraw({reroute:false});status('Placement cancelled: drop onto the canvas.');}
    return;
  }
  if(g.type==='connect'&&g.moved){
    const hit=document.elementFromPoint(event.clientX,event.clientY),handle=hit?.closest('[data-connect]'),objectHit=hit?.closest('[data-object-id]');
    const target=handle?.dataset.connect||objectHit?.dataset.objectId;const side=handle?.dataset.side||null;
    if(target&&items(model).some(n=>n.id===target)){
      if(g.edgeId){const edge=object(model,g.edgeId);edge[g.end]=target;edge[g.end+'Side']=side;pruneAttachmentOrders(model);selection=new Set([edge.id]);}
      else{const edge={id:nextId(model,'Edge'),source:g.source,target,label:'',direction:'forward',style:'normal',routing:'orthogonal',sourceSide:g.side,targetSide:side};model.edges.push(edge);selection=new Set([edge.id]);}
      releaseCapture();connectSource=null;if(!g.edgeId){tool='select';hoverId=null;}commit(g.before,g.edgeId?'Connection reattached.':'Connection added.');return;
    }
    status('Connection cancelled: drop onto a node or its handle.');
  }
  if(g.type==='connect'&&!g.moved&&!g.edgeId){connectSource=g.source;selection=new Set([g.source]);}
  if(g.type==='move'&&g.moved){dropSelection(model,g.selected,items(g.before),g.dropParents);translateWaypoints(g.before,model);}
  releaseCapture();
  if(g.type==='connect'&&g.edgeId&&!g.moved){safeDraw({reroute:false});editingControls?.openAttachment(g.edgeId,g.end);return;}
  if(g.type==='marquee'&&!g.moved&&g.zoneId)select(g.zoneId,true);
  if(['move','resize','waypoint','label'].includes(g.type)&&g.moved)commit(g.before,g.type==='move'?'Selection moved.':g.type==='resize'?'Object resized.':g.type==='label'?'Label position updated.':'Waypoint updated.');else safeDraw({reroute:false});
}
viewport.addEventListener('pointerup',finishGesture);
function cancelGesture(){if(!gesture)return;if(frame){cancelAnimationFrame(frame);frame=null;}const g=gesture;model=g.before;selection=g.selectionBefore;activeWaypoint=g.waypointBefore;activeLabel=g.labelBefore;releaseCapture();safeDraw();status('Gesture cancelled.');}
viewport.addEventListener('pointercancel',cancelGesture);viewport.addEventListener('lostpointercapture',()=>{if(gesture)cancelGesture();});window.addEventListener('blur',()=>{spaceHeld=false;paletteStart=null;cancelGesture();});
viewport.addEventListener('dblclick',event=>{if(busy||tool!=='select'||event.target.closest('[data-waypoint],[data-route-segment],[data-reconnect]'))return;const id=event.target.closest('[data-object-id]')?.dataset.objectId;if(id){select(id);editingControls?.editLabel(id);}});
function zoomAt(scale,point={x:viewport.clientWidth/2,y:viewport.clientHeight/2}){const v=model.settings.view,next=Math.max(.02,Math.min(8,scale)),ratio=next/v.scale;v.x=point.x-(point.x-v.x)*ratio;v.y=point.y-(point.y-v.y)*ratio;v.scale=next;updateView();}
viewport.addEventListener('wheel',event=>{if(event.target.closest('.zoom-toolbar'))return;event.preventDefault();if(gesture||busy)return;zoomAt(model.settings.view.scale*Math.exp(-event.deltaY*.0015),canvasPoint(event));},{passive:false});
function fit(){if(!items(model).length)return;const scene=world.querySelector('#diagram-scene');if(!scene)return;const b=scene.getBBox(),padding=54;const scale=Math.max(.02,Math.min(1.25,(viewport.clientWidth-2*padding)/Math.max(1,b.width),(viewport.clientHeight-2*padding)/Math.max(1,b.height)));model.settings.view={x:(viewport.clientWidth-b.width*scale)/2-b.x*scale,y:(viewport.clientHeight-b.height*scale)/2-b.y*scale,scale};updateView();}
function deleteSelected(){if(activeWaypoint&&selection.has(activeWaypoint.edgeId)){mutate('Waypoint removed.',()=>{object(model,activeWaypoint.edgeId)?.waypoints?.splice(activeWaypoint.index,1);activeWaypoint=null;});return;}mutate('Selection deleted.',()=>{deleteSelection(model,selection);selection.clear();});}
function undo(redo=false){if(busy||gesture||(editingControls&&!editingControls.beforeAction()))return;flushPropertyEdit();const view={...model.settings.view};const next=redo?history.redo(model):history.undo(model);if(!next)return;model=next;model.settings.view=view;activeWaypoint=null;activeLabel=null;selection=new Set([...selection].filter(id=>object(model,id)));dirty=true;syncSource();safeDraw();status(redo?'Edit redone.':'Edit undone.');}
async function runAsync(message,fn,{forceSource=false}={}){if(busy||gesture||(editingControls&&!editingControls.beforeAction()))return false;flushPropertyEdit();const before=copy(model),oldSelection=new Set(selection);loading(true,message);try{await fn();validateModel(model);router.route(model);commit(before,message,{forceSource});if(forceSource)syncSource(true);$('error-banner').hidden=true;return true;}catch(e){model=before;selection=oldSelection;safeDraw();error(e);return false;}finally{loading(false);}}
async function applySource(){flushPropertyEdit();const draft=editor.value;if(!draft.trim()){error(new Error('Enter a Mermaid flowchart, or choose New for an empty diagram.'));return;}let fresh=false;const applied=await runAsync('Source applied.',async()=>{const parsed=await importMermaid(draft,{layout:model.settings.layout}),ids=new Set(items(model).map(n=>n.id));fresh=!items(parsed).some(n=>ids.has(n.id));model=mergeSource(model,parsed);selection=new Set([...selection].filter(id=>object(model,id)));},{forceSource:true});if(applied&&fresh)fit();}
function newDiagram(){if(busy||(editingControls&&!editingControls.beforeAction()))return;if(gesture)cancelGesture();flushPropertyEdit();const before=copy(model);model=emptyModel();selection.clear();activeWaypoint=null;activeLabel=null;waypointEdge=null;collapsedZones.clear();connectSource=null;hoverId=null;tool='select';commit(before,'New diagram. Add nodes and zones, or paste Mermaid.',{forceSource:true});syncSource(true);$('error-banner').hidden=true;viewport.focus();}
async function loadExample(name){if(!name)return;const loaded=await runAsync('Example loaded.',async()=>{const response=await fetch(`./diagrams/${name}.mmd`);if(!response.ok)throw new Error('The local example could not be loaded.');model=await importMermaid(await response.text());selection.clear();},{forceSource:true});if(loaded)fit();$('example').value='';}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function saveProject(){if(busy||gesture||(editingControls&&!editingControls.beforeAction()))return;flushPropertyEdit();try{validateModel(model);download(new Blob([JSON.stringify(model,null,2)],{type:'application/json'}),'diagram.mermaid-project.json');dirty=false;updateControls();status('Project downloaded with its editable layout.');}catch(e){error(e)}}
async function exportDiagram(){if(busy||gesture||(editingControls&&!editingControls.beforeAction()))return;flushPropertyEdit();try{
  const type=$('export-format').value;
  if(type==='mermaid'){download(new Blob([toMermaid(model)],{type:'text/plain;charset=utf-8'}),'diagram.mmd');status('Mermaid source exported. Manual positions are saved in project files.');return;}
  const svg=exportSvg(model,routes),blob=new Blob([svg.text],{type:'image/svg+xml;charset=utf-8'});
  if(type==='svg'){download(blob,'diagram.svg');status('SVG exported with the current arrangement.');return;}
  const url=URL.createObjectURL(blob);try{const image=new Image();image.src=url;await image.decode();const output=document.createElement('canvas'),factor=Math.min(2,16000/Math.max(svg.width,svg.height));output.width=Math.ceil(svg.width*factor);output.height=Math.ceil(svg.height*factor);const context=output.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,output.width,output.height);context.drawImage(image,0,0,output.width,output.height);const png=await new Promise(resolve=>output.toBlob(resolve,'image/png'));if(!png)throw new Error('PNG generation failed.');download(png,'diagram.png');status('PNG exported with the current arrangement.');}finally{URL.revokeObjectURL(url);}
}catch(e){error(e)}}
$('file-input').addEventListener('change',async event=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;let repaired=false;const project=file.name.endsWith('.json'),opened=await runAsync('File opened.',async()=>{const text=await file.text();if(project){model=validateModel(JSON.parse(text));const before=JSON.stringify(model.nodes);ensureLabelFit(model);ensureNodeSpacing(model);expandZones(model);repaired=JSON.stringify(model.nodes)!==before;}else{editor.value=text;sourceDirty=true;model=await importMermaid(text);}selection.clear();connectSource=null;hoverId=null;},{forceSource:true});if(opened){if(project){dirty=repaired;updateControls();if(repaired)status('Project opened. Labels were fitted and the 24-unit gap checked; save to retain the adjustments.');}else fit();}});
editor.addEventListener('input',()=>{sourceDirty=true;syncSource();status('Source draft edited. Apply it when ready.');});
$('btn-apply').addEventListener('click',applySource);$('btn-discard').addEventListener('click',()=>{syncSource(true);status('Source draft discarded.');});
$('btn-new').addEventListener('click',newDiagram);$('btn-open').addEventListener('click',()=>$('file-input').click());$('btn-save').addEventListener('click',saveProject);$('btn-export').addEventListener('click',exportDiagram);
function showPanel(name){const same=!$('source-panel').hidden&&!$(name==='source'?'source-content':'hierarchy-content').hidden;$('source-panel').hidden=same;$('source-content').hidden=name!=='source';$('hierarchy-content').hidden=name!=='hierarchy';$('btn-source').setAttribute('aria-expanded',String(!same&&name==='source'));$('btn-hierarchy').setAttribute('aria-expanded',String(!same&&name==='hierarchy'));}
$('btn-source').addEventListener('click',()=>showPanel('source'));$('btn-hierarchy').addEventListener('click',()=>showPanel('hierarchy'));
$('example').addEventListener('change',()=>loadExample($('example').value));
$('btn-layout').addEventListener('click',async()=>{if(await runAsync('Automatic layout applied.',()=>layoutModel(model)))fit();});
$('direction').addEventListener('change',()=>mutate('Flow direction set. Use Auto layout to rearrange.',()=>model.settings.direction=$('direction').value));
$('layout-mode').addEventListener('change',()=>mutate('Layout preference set. Use Auto layout to rearrange.',()=>model.settings.layout=$('layout-mode').value));
$('snap-grid').addEventListener('change',()=>mutate('Grid snapping updated.',()=>model.settings.grid=$('snap-grid').checked));
$('alignment-guides').addEventListener('change',()=>mutate('Alignment guides updated.',()=>model.settings.guides=$('alignment-guides').checked));
$('font-size').addEventListener('input',()=>{pendingFontSize=$('font-size').value;});$('font-size').addEventListener('change',()=>{pendingFontSize=$('font-size').value;flushFontSize();});$('font-size').addEventListener('blur',flushFontSize);
$('btn-undo').addEventListener('click',()=>undo());$('btn-redo').addEventListener('click',()=>undo(true));$('btn-delete').addEventListener('click',deleteSelected);
$('alignment').addEventListener('change',()=>{const value=$('alignment').value;$('alignment').value='';if(value)arrangeSelection(value);});
$('btn-fit').addEventListener('click',fit);$('btn-zoom-in').addEventListener('click',()=>zoomAt(model.settings.view.scale*1.25));$('btn-zoom-out').addEventListener('click',()=>zoomAt(model.settings.view.scale/1.25));
$('dismiss-error').addEventListener('click',()=>$('error-banner').hidden=true);
document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
document.addEventListener('keydown',event=>{
  const editing=event.target.matches('input,textarea,select');const mod=event.metaKey||event.ctrlKey;
  if(mod&&event.key.toLowerCase()==='s'){event.preventDefault();saveProject();return;}
  if(event.key==='Escape'){paletteStart=null;if(gesture)cancelGesture();else if(connectSource){connectSource=null;selection.clear();safeDraw({reroute:false});status('Connection cancelled. Choose a source.');}else{selection.clear();setTool('select');}return;}
  if(editing||busy)return;
  if(mod&&event.key.toLowerCase()==='z'){event.preventDefault();undo(event.shiftKey);return;}
  if(mod&&event.key.toLowerCase()==='y'){event.preventDefault();undo(true);return;}
  if(mod&&event.key.toLowerCase()==='a'){event.preventDefault();selection=new Set(items(model).map(n=>n.id));safeDraw({reroute:false});return;}
  if(event.code==='Space'&&(event.target===viewport||event.target.closest('#canvas'))){event.preventDefault();spaceHeld=true;return;}
  if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();deleteSelected();return;}
  if(event.key.startsWith('Arrow')&&activeLabel){event.preventDefault();const id=activeLabel,step=event.shiftKey?50:model.settings.grid?20:10;mutate('Connection label nudged.',()=>{const anchor=layoutEdgeLabels(model,routes).get(id)?.anchor;if(!anchor)return;object(model,id).labelPosition=manualLabelPosition(routes.get(id),{x:snap(anchor.x+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0)),y:snap(anchor.y+(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0))});});return;}
  if(event.key.startsWith('Arrow')&&activeWaypoint){event.preventDefault();const {edgeId,index}=activeWaypoint,step=event.shiftKey?50:model.settings.grid?20:10;mutate('Waypoint nudged.',()=>{const point=object(model,edgeId)?.waypoints?.[index];if(!point)return;point.x+=event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0;point.y+=event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0;});return;}
  if(event.key.startsWith('Arrow')&&selection.size){event.preventDefault();const step=event.shiftKey?50:model.settings.grid?20:10,reference=copy(containers(model));mutate('Selection nudged.',()=>{moveSelection(model,selection,event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0,event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0,{expand:false});const parents=dropParents(model,selection,reference);dropSelection(model,selection,reference,parents,{expand:false});separateSelection(model,selection);});return;}
  if(!mod&&{v:'select',h:'pan',n:'node',c:'connect',z:'zone'}[event.key.toLowerCase()])setTool({v:'select',h:'pan',n:'node',c:'connect',z:'zone'}[event.key.toLowerCase()]);
});
document.addEventListener('keyup',event=>{if(event.code==='Space')spaceHeld=false;});
new ResizeObserver(()=>updateView()).observe(viewport);
editingControls=createEditingControls({
  state:()=>({model,selection,activeWaypoint,tool,gesture,busy,routes,groups:router?.groups||new Map()}),
  execute:executeControl,select,diagramPoint,cancelGesture,beginPointer,
  flushProperties:flushPropertyEdit,
  activateWaypoint(id,index){select(id);activeWaypoint={edgeId:id,index};safeDraw({reroute:false});},
  activateLabel(id){select(id);activeLabel=id;safeDraw({reroute:false});},
  beginDraft:beginControlDraft,previewDraft:previewControlDraft,finishDraft:finishControlDraft,cancelDraft:cancelControlDraft
});
async function start(){try{initializeMermaid();await AvoidLib.load(new URL('./vendor/libavoid/dist/libavoid.wasm',import.meta.url).href);router=new DiagramRouter(AvoidLib.getInstance());const response=await fetch('./diagrams/zones-and-subzones.mmd');if(!response.ok)throw new Error('The starter diagram could not be loaded.');model=await importMermaid(await response.text());syncSource(true);draw();loading(false);fit();status('Ready. Import, arrange, and evolve your diagram.');}catch(e){loading(false);error(e);}}
loading(true,'Starting local engines…');start();
