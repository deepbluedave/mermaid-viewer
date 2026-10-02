export const NODE_GAP = 24;
export const overlapsWithGap = (a,b,gap=NODE_GAP) => a.x < b.x+b.width+gap-1e-7 && a.x+a.width+gap > b.x+1e-7 && a.y < b.y+b.height+gap-1e-7 && a.y+a.height+gap > b.y+1e-7;

// Find a nearby free position for an object or a rigid selection. This only
// resolves object placement; libavoid remains responsible for edge routing.
export function clearanceTranslation(moving,fixed,{gap=NODE_GAP,axis=null}={}) {
  if(!moving.length||!fixed.length)return{x:0,y:0};
  const queue=[{x:0,y:0}],seen=new Set(['0,0']);
  const enqueue=(x,y)=>{const key=`${x.toFixed(5)},${y.toFixed(5)}`;if(!seen.has(key)){seen.add(key);queue.push({x,y});}};
  for(let attempts=0;queue.length&&attempts<5000;attempts++) {
    queue.sort((a,b)=>a.x*a.x+a.y*a.y-b.x*b.x-b.y*b.y);
    const delta=queue.shift();let collision=null;
    for(const a of moving){const moved={...a,x:a.x+delta.x,y:a.y+delta.y};const b=fixed.find(b=>overlapsWithGap(moved,b,gap));if(b){collision={a,b};break;}}
    if(!collision)return delta;
    const {a,b}=collision;
    if(axis!=='y'){enqueue(b.x-a.x-a.width-gap,delta.y);enqueue(b.x+b.width+gap-a.x,delta.y);}
    if(axis!=='x'){enqueue(delta.x,b.y-a.y-a.height-gap);enqueue(delta.x,b.y+b.height+gap-a.y);}
  }
  if(axis==='y')return{x:0,y:Math.max(...fixed.map(n=>n.y+n.height))+gap-Math.min(...moving.map(n=>n.y))};
  return{x:Math.max(...fixed.map(n=>n.x+n.width))+gap-Math.min(...moving.map(n=>n.x)),y:0};
}

export function containingZone(zones,item,excluded=new Set(),headerHeight=30) {
  const x=item.x+item.width/2,y=item.y+item.height/2;
  return zones.filter(z=>!excluded.has(z.id)&&x>=z.x&&x<=z.x+z.width&&y>=z.y+headerHeight&&y<=z.y+z.height)
    .sort((a,b)=>a.width*a.height-b.width*b.height)[0]?.id||null;
}
