/**
 * Lightweight rear-only jump animation. The side profile art is untouched.
 * The four cleaned rear frames have different paw positions; choose them
 * according to vertical velocity, not running distance.
 */
export type CatRearPhase='run'|'takeoff'|'apex'|'fall'|'land';
export interface CatRearPose{
  readonly phase:CatRearPhase;
  readonly frame:0|1|2|3;
  readonly scaleX:number;
  readonly scaleY:number;
  readonly yOffset:number;
  readonly tilt:number;
}
const normal=(frame:0|1|2|3):CatRearPose=>({
  phase:'run',frame,scaleX:1,scaleY:1,yOffset:0,tilt:0,
});
function smooth01(t:number):number{
  const v=Math.max(0,Math.min(1,t));
  return v*v*(3-2*v);
}

/**
 * Landing age is only used for the first 140 ms after an airborne landing.
 * Airborne phases are driven by actual physics, including auto-bounces.
 */
export function catRearPose(
  grounded:boolean,
  verticalVelocity:number,
  runningAnimation:number,
  landingAge=Number.POSITIVE_INFINITY,
):CatRearPose{
  if(!grounded){
    if(verticalVelocity>2.0){
      return {phase:'takeoff',frame:1,scaleX:.91,scaleY:1.14,yOffset:.1,tilt:-.09};
    }
    if(verticalVelocity>=-2.0){
      return {phase:'apex',frame:2,scaleX:1.11,scaleY:.87,yOffset:.18,tilt:0};
    }
    return {phase:'fall',frame:3,scaleX:.95,scaleY:1.07,yOffset:.07,tilt:.08};
  }
  if(landingAge>=0&&landingAge<.14){
    const recover=smooth01(landingAge/.14);
    return {
      phase:'land',frame:0,
      scaleX:1.16-.16*recover,
      scaleY:.79+.21*recover,
      yOffset:-.15*(1-recover),
      tilt:0,
    };
  }
  return normal((Math.floor(Math.max(0,runningAnimation))%4) as 0|1|2|3);
}
