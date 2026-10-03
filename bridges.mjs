const cross=(a,b)=>a.x*b.y-a.y*b.x;
function drawingPoints(points){
  const result=[];
  for(const point of points){
    const last=result.at(-1);if(last&&last.x===point.x&&last.y===point.y)continue;
    while(result.length>1){
      const a=result.at(-2),b=result.at(-1),v={x:b.x-a.x,y:b.y-a.y},w={x:point.x-b.x,y:point.y-b.y};
      if(cross(v,w)!==0||v.x*w.x+v.y*w.y<=0)break;
      result.pop();
    }
    result.push(point);
  }
  return result;
}
export function bridgedPaths(edges,routes,radius=5) {
  const result=new Map(),previous=[];
  for(const edge of edges) {
    // A waypoint within a straight run is not a junction. Merge that run only
    // for drawing, so crossings there retain their bridge; raw routes stay intact.
    const points=drawingPoints(routes.get(edge.id)||[]),jumps=[];let path=points.length?`M${points[0].x},${points[0].y}`:'';
    for(let i=1;i<points.length;i++) {
      const a=points[i-1],b=points[i],v={x:b.x-a.x,y:b.y-a.y},length=Math.hypot(v.x,v.y),hits=[];
      if(length>3.5)for(const segment of previous) {
        const c=segment.a,w={x:segment.b.x-c.x,y:segment.b.y-c.y},den=cross(v,w),otherLength=Math.hypot(w.x,w.y);
        if(Math.abs(den)<length*otherLength*.2)continue;
        const offset={x:c.x-a.x,y:c.y-a.y},t=cross(offset,w)/den,u=cross(offset,v)/den;
        const fromStart=t*length,fromEnd=(1-t)*length,r=Math.min(radius,fromStart/1.5,fromEnd/1.5);
        if(t>0&&t<1&&u>0&&u<1&&r>=1.75&&!(i===1&&fromStart<radius*2)&&!(i===points.length-1&&fromEnd<radius*2))hits.push({distance:fromStart,radius:r});
      }
      hits.sort((a,b)=>a.distance-b.distance);const distinct=hits.filter((n,j)=>!j||n.distance-hits[j-1].distance>(n.radius+hits[j-1].radius)*1.1);
      const unit={x:v.x/length,y:v.y/length},normal={x:unit.y,y:-unit.x};
      for(const {distance,radius:r} of distinct) {
        const start={x:a.x+unit.x*(distance-r),y:a.y+unit.y*(distance-r)},end={x:a.x+unit.x*(distance+r),y:a.y+unit.y*(distance+r)};
        const c1={x:start.x+normal.x*r*1.33,y:start.y+normal.y*r*1.33},c2={x:end.x+normal.x*r*1.33,y:end.y+normal.y*r*1.33};
        const curve=`C${c1.x},${c1.y} ${c2.x},${c2.y} ${end.x},${end.y}`;
        path+=` L${start.x},${start.y} ${curve}`;jumps.push(`M${start.x},${start.y} ${curve}`);
      }
      path+=` L${b.x},${b.y}`;
    }
    result.set(edge.id,{path,jumps});
    for(let i=1;i<points.length;i++)previous.push({a:points[i-1],b:points[i]});
  }
  return result;
}
