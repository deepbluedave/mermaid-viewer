import {copy,items,object,movableIds,diagramFontSize,setNodeSize,expandZones,related,descendants,zoneMinimumSize,zoneChildBounds}from'./core.mjs?v=extensions-10';
import{overlapsWithGap}from'./geometry.mjs?v=extensions-10';

export function resizeObject(model,id,handle,dx,dy) {
  const before=copy(object(model,id)),node=model.nodes.some(n=>n.id===id),font=diagramFontSize(model);
  if(!node){
    const minimum=zoneMinimumSize(model,before),fit=zoneChildBounds(model,before);
    let left=before.x,top=before.y,right=before.x+before.width,bottom=before.y+before.height;
    if(handle.includes('w'))left=Math.min(left+dx,right-minimum.width,fit?fit.x:Infinity);
    if(handle.includes('e'))right=Math.max(right+dx,left+minimum.width,fit?fit.x+fit.width:-Infinity);
    if(handle.includes('n'))top=Math.min(top+dy,bottom-minimum.height,fit?fit.y:Infinity);
    if(handle.includes('s'))bottom=Math.max(bottom+dy,top+minimum.height,fit?fit.y+fit.height:-Infinity);
    const next={x:left,y:top,width:right-left,height:bottom-top};if(['x','y','width','height'].some(k=>Math.abs(before[k]-next[k])>1e-7))Object.assign(object(model,id),next);expandZones(model);return object(model,id);
  }
  const candidate=t=>{
    const n=copy(before);let width=before.width+(handle.includes('e')?dx:handle.includes('w')?-dx:0)*t,height=before.height+(handle.includes('s')?dy:handle.includes('n')?-dy:0)*t;
    width=Math.max(1,width);height=Math.max(1,height);
    if(node&&n.shape==='circle'){const dw=width-before.width,dh=height-before.height;const size=handle==='e'||handle==='w'?width:handle==='n'||handle==='s'?height:Math.abs(dw)>=Math.abs(dh)?width:height;width=height=size;}
    if(node)setNodeSize(n,width,height,font);else{n.width=Math.max(160,width);n.height=Math.max(100,height);}
    n.x=handle.includes('w')?before.x+before.width-n.width:handle.includes('e')?before.x:before.x+(before.width-n.width)/2;
    n.y=handle.includes('n')?before.y+before.height-n.height:handle.includes('s')?before.y:before.y+(before.height-n.height)/2;
    return n;
  };
  const current=object(model,id),fixed=model.nodes.filter(n=>!related(model,current,n)),valid=n=>!fixed.some(other=>overlapsWithGap(n,other));let resized=candidate(1);
  if(node&&!valid(resized)){let low=0,high=1;for(let i=0;i<32;i++){const t=(low+high)/2;valid(candidate(t))?low=t:high=t;}resized=candidate(low);}
  Object.assign(object(model,id),resized);expandZones(model);return object(model,id);
}
export function resizeNodeTo(model,id,width,height){const n=object(model,id);return resizeObject(model,id,'se',width-n.width,height-n.height);}

export function alignmentGuides(model,selection,scale=model.settings.view.scale) {
  const moved=movableIds(model,selection),roots=items(model).filter(n=>selection.has(n.id)&&!moved.has(n.parentId)),excluded=new Set(moved);
  for(const n of roots){let parent=n.parentId;while(parent){excluded.add(parent);parent=object(model,parent)?.parentId;}}
  const fixed=items(model).filter(n=>!excluded.has(n.id)),guides=new Map(),tolerance=.75/scale;
  for(const a of roots)for(const b of fixed)for(const [axis,size,other,otherSize]of[['x','width','y','height'],['y','height','x','width']]){
    for(const side of [0,1])for(const targetSide of [0,1]){
      const value=a[axis]+a[size]*side,target=b[axis]+b[size]*targetSide;if(Math.abs(value-target)>tolerance)continue;
      const key=`${axis}:${target.toFixed(3)}`,start=Math.min(a[other],b[other])-8/scale,end=Math.max(a[other]+a[otherSize],b[other]+b[otherSize])+8/scale,old=guides.get(key);
      guides.set(key,{axis,value:target,start:old?Math.min(start,old.start):start,end:old?Math.max(end,old.end):end});
    }
  }
  return [...guides.values()];
}
