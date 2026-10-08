export const shapeNames=[['rectangle','Rectangle'],['rounded','Rounded rectangle'],['diamond','Diamond'],['circle','Circle'],['cylinder','Database cylinder'],['stadium','Stadium'],['hexagon','Hexagon'],['document','Document'],['cloud','Cloud'],['person','Person'],['human','Human actor'],['agent','Agent actor'],['icon','Icon']];
export const shapes=shapeNames.map(([id])=>id).filter(id=>!['human','agent'].includes(id));
export {iconNames,localIconPack,fallbackIcon,iconBody} from './icons.mjs?v=icons-3';
export function iconFrame(n){const size=n.container?24:n.iconSize||48;return{x:(n.width-size)/2,y:n.container?9:n.iconPosition==='top'?n.height-size-8:8,width:size,height:size};}
export function chooseShape(n,value){
  n.shape=['human','agent'].includes(value)?'icon':value;
  if(n.shape==='icon'){n.icon=['human','agent'].includes(value)?'studio:'+value:n.icon||'studio:human';n.iconForm||='none';n.iconPosition||='bottom';n.iconSize||=48;}
}
export function shapeParts(n){
  const w=n.width,h=n.height,rect=(rx=3)=>[{tag:'rect',attrs:{width:w,height:h,rx}}];
  if(n.container&&['person','icon'].includes(n.shape))return rect(14);
  switch(n.shape){
    case'diamond':return[{tag:'polygon',attrs:{points:`${w/2},0 ${w},${h/2} ${w/2},${h} 0,${h/2}`}}];
    case'circle':return[{tag:'ellipse',attrs:{cx:w/2,cy:h/2,rx:w/2,ry:h/2}}];
    case'cylinder':return[{tag:'path',attrs:{d:`M0,10 A${w/2},10 0 0 1 ${w},10 V${h-10} A${w/2},10 0 0 1 0,${h-10} Z`}},{tag:'ellipse',attrs:{cx:w/2,cy:10,rx:w/2,ry:10}}];
    case'hexagon':{const cut=Math.min(w*.18,h*.4);return[{tag:'polygon',attrs:{points:`${cut},0 ${w-cut},0 ${w},${h/2} ${w-cut},${h} ${cut},${h} 0,${h/2}`}}];}
    case'document':return[{tag:'path',attrs:{d:`M0,0 H${w} V${h-10} Q${w*.75},${h-20} ${w*.5},${h-10} Q${w*.25},${h} 0,${h-10} Z`}}];
    case'cloud':return[{tag:'path',attrs:{d:`M${w*.2},${h*.2} C${w*.2},${h*.05} ${w*.35},0 ${w*.5},0 C${w*.65},0 ${w*.8},${h*.05} ${w*.8},${h*.2} C${w},${h*.2} ${w},${h*.35} ${w},${h*.5} C${w},${h*.65} ${w},${h*.8} ${w*.8},${h*.8} C${w*.8},${h*.95} ${w*.65},${h} ${w*.5},${h} C${w*.35},${h} ${w*.2},${h*.95} ${w*.2},${h*.8} C0,${h*.8} 0,${h*.65} 0,${h*.5} C0,${h*.35} 0,${h*.2} ${w*.2},${h*.2} Z`}}];
    case'person':{const r=Math.min(18,h*.18);return[{tag:'circle',attrs:{cx:w/2,cy:r,r}},{tag:'rect',attrs:{x:0,y:r*2+4,width:w,height:h-r*2-4,rx:16}}];}
    case'icon':{const f=iconFrame(n);return n.iconForm==='none'?[]:[{tag:'rect',attrs:{...f,rx:n.iconForm==='circle'?f.width/2:n.iconForm==='rounded'?10:1}}];}
    default:return rect(n.shape==='stadium'?Math.min(w,h)/2:n.shape==='rounded'?14:3);
  }
}
// Outline intersections only. Libavoid still chooses every connection route.
const cloudCurves=[[[.2,.2],[.2,.05],[.35,0],[.5,0]],[[.5,0],[.65,0],[.8,.05],[.8,.2]],[[.8,.2],[1,.2],[1,.35],[1,.5]],[[1,.5],[1,.65],[1,.8],[.8,.8]],[[.8,.8],[.8,.95],[.65,1],[.5,1]],[[.5,1],[.35,1],[.2,.95],[.2,.8]],[[.2,.8],[0,.8],[0,.65],[0,.5]],[[0,.5],[0,.35],[0,.2],[.2,.2]]];
const cubic=(points,t)=>[0,1].map(axis=>(1-t)**3*points[0][axis]+3*(1-t)**2*t*points[1][axis]+3*(1-t)*t*t*points[2][axis]+t**3*points[3][axis]);
export function cloudIntersection(side,fraction){const axis=['north','south'].includes(side)?0:1,values=[];
 for(const curve of cloudCurves){const start=curve[0][axis],end=curve[3][axis];if(fraction<Math.min(start,end)-1e-9||fraction>Math.max(start,end)+1e-9)continue;if(start===end){values.push(curve[0][1-axis],curve[3][1-axis]);continue;}let low=0,high=1;for(let i=0;i<36;i++){const mid=(low+high)/2,value=cubic(curve,mid)[axis];if((value<fraction)===(end>start))low=mid;else high=mid;}values.push(cubic(curve,(low+high)/2)[1-axis]);}
 return ['east','south'].includes(side)?Math.max(...values):Math.min(...values);
}
