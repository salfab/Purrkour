/** Pure layout rules so panoramic artwork always preserves its source proportions. */
export function panoramaSize(sourceWidth:number,sourceHeight:number,cropHeightFraction=.78,worldHeight=32):{width:number;height:number}{
  if(sourceWidth<=0||sourceHeight<=0||cropHeightFraction<=0||cropHeightFraction>1||worldHeight<=0)
    throw new Error('Invalid panorama dimensions');
  return {width:worldHeight*sourceWidth/(sourceHeight*cropHeightFraction),height:worldHeight};
}

/** Slow bounded drift; the artwork is wider than the mobile viewport, so no stretch is needed. */
export function panoramaPan(distance:number):number{
  const z=Math.max(0,distance);
  return 7*Math.sin(z*.006)+1.5*Math.sin(z*.002);
}

/** Exact gap lip positions in a streaming level interval. */
export function gapEdgesInRange(from:number,to:number,gapStart:number,gapEnd:number,segmentLength:number):number[]{
  const edges:number[]=[];
  for(let cycle=Math.max(0,Math.floor(from/segmentLength)-1);cycle<=Math.floor(to/segmentLength)+1;cycle++){
    for(const edge of [cycle*segmentLength+gapStart,cycle*segmentLength+gapEnd])
      if(edge>=from&&edge<to)edges.push(edge);
  }
  return edges.sort((a,b)=>a-b);
}
