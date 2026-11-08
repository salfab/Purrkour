/** A short, authored change of rhythm after the first fork. */
export const DESCENT={
  start:450,
  end:650,
  drop:15,
  speedBonus:4,
  gates:[
    {z:485,x:-1.3},
    {z:540,x:1.3},
    {z:605,x:0},
  ],
} as const;

export function descentDrop(distance:number):number{
  const t=Math.max(0,Math.min(1,(distance-DESCENT.start)/(DESCENT.end-DESCENT.start)));
  return DESCENT.drop*t*t*(3-2*t);
}

/** Fades the temporary speed gain in and out without a step at either seam. */
export function descentSpeedBonus(distance:number):number{
  const edge=Math.min(distance-DESCENT.start,DESCENT.end-distance);
  return DESCENT.speedBonus*Math.max(0,Math.min(1,edge/8));
}

export function onDescent(distance:number):boolean{
  return distance>=DESCENT.start&&distance<DESCENT.end;
}
