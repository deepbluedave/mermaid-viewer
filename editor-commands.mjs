import {copy,object,items,nextId,resizeNode,diagramFontSize,moveSelection,reparent,deleteSelection,setNodeContainer,expandZones,ensureNodeSpacing,validateModel} from './core.mjs?v=extensions-10';
import {chooseShape} from './node-shapes.mjs?v=extensions-10';
import {pruneAttachmentOrders} from './attachments.mjs?v=extensions-10';
const common=['label','description','notes','textFormat','fontColor'];
const nodeFields=[...common,'shape','backgroundColor','borderColor','borderWidth','borderStyle','showDescription','icon','iconForm','iconPosition','iconSize'];
const edgeFields=[...common,'source','target','style','direction','routing','sourceSide','targetSide','color','borderWidth','labelBackgroundColor'];
const keys=(value,allowed)=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!allowed.includes(k)))throw new Error('Unsupported operation or property.');};
const finite=(...values)=>{if(!values.every(v=>Number.isFinite(v)&&Math.abs(v)<=1e6))throw new Error('Use finite canvas coordinates.');};
export function applyOperations(original,operations){
 if(!Array.isArray(operations)||!operations.length||operations.length>100)throw new Error('Send between 1 and 100 edit operations.');
 const model=copy(original),affected=[];
 for(const op of operations){
  if(!op||typeof op!=='object')throw new Error('Invalid edit operation.');
  if(['add_node','add_zone'].includes(op.action)){
   keys(op,['action','id','label','shape','x','y','parentId','properties']);
   const node=op.action==='add_node',id=op.id||nextId(model,node?'Node':'Zone');if(object(model,id))throw new Error(`ID ${id} already exists.`);
   const n={id,label:op.label??(node?'New node':'New zone'),parentId:null,x:op.x??0,y:op.y??0,width:node?120:320,height:node?54:220};finite(n.x,n.y);
   if(node){chooseShape(n,op.shape||'rectangle');resizeNode(n,diagramFontSize(model));n.x=op.x??0;n.y=op.y??0;model.nodes.push(n);}else model.zones.push(n);
   if(op.properties){keys(op.properties,nodeFields.filter(k=>k!=='shape'));Object.assign(n,op.properties);if(node)resizeNode(n,diagramFontSize(model));}
   if(op.parentId)reparent(model,id,op.parentId);affected.push(id);
  }else if(op.action==='add_edge'){
   keys(op,['action','id','source','target','label','properties']);const id=op.id||nextId(model,'Edge');if(object(model,id))throw new Error(`ID ${id} already exists.`);
   const edge={id,source:op.source,target:op.target,label:op.label??'',direction:'forward',style:'normal',routing:'orthogonal',sourceSide:null,targetSide:null};
   if(op.properties){keys(op.properties,edgeFields);Object.assign(edge,op.properties);}model.edges.push(edge);affected.push(id);
  }else if(op.action==='update'){
   keys(op,['action','id','properties']);const n=object(model,op.id);if(!n)throw new Error(`Unknown object ${op.id}.`);
   keys(op.properties,model.edges.includes(n)?edgeFields:nodeFields.filter(k=>model.nodes.includes(n)||!['shape','icon','iconForm','iconPosition','iconSize'].includes(k)));
   for(const [key,value]of Object.entries(op.properties)){if(value===null){delete n[key];continue;}if(key==='shape')chooseShape(n,value);else n[key]=value;}
   if(model.nodes.includes(n))resizeNode(n,diagramFontSize(model));affected.push(n.id);
  }else if(op.action==='move'){
   keys(op,['action','ids','dx','dy']);finite(op.dx,op.dy);if(!Array.isArray(op.ids)||!op.ids.length||op.ids.some(id=>!items(model).some(n=>n.id===id)))throw new Error('Choose existing nodes or zones to move.');moveSelection(model,new Set(op.ids),op.dx,op.dy,{expand:false});affected.push(...op.ids);
  }else if(op.action==='reparent'){
   keys(op,['action','id','parentId']);reparent(model,op.id,op.parentId);affected.push(op.id);
  }else if(op.action==='delete'){
   keys(op,['action','ids']);if(!Array.isArray(op.ids)||op.ids.some(id=>!object(model,id)))throw new Error('Choose existing objects to delete.');deleteSelection(model,new Set(op.ids));affected.push(...op.ids);
  }else if(['collapse','container'].includes(op.action)){
   keys(op,['action','id','enabled']);const n=object(model,op.id);if(!n||typeof op.enabled!=='boolean')throw new Error('Choose a container and a Boolean enabled value.');
   if(op.action==='container')setNodeContainer(model,n.id,op.enabled);else{if(!model.zones.includes(n)&&!n.container)throw new Error('Only containers can collapse.');n.collapsed=op.enabled;}affected.push(n.id);
  }else throw new Error(`Unsupported edit action: ${op.action}.`);
 }
 pruneAttachmentOrders(model);validateModel(model);ensureNodeSpacing(model,{preferredIds:new Set(affected)});expandZones(model);
 return{model:validateModel(model),affected:[...new Set(affected)]};
}
