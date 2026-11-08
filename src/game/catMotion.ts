/**
 * Rear atlas: 0–5 = six hand-painted run frames,
 * 6 = the original jump illustration, 7 = the original golden boost pose.
 *
 * Keep these original assets; phase animation only adds subtle squash/tilt
 * during flight and landing (no procedural repaint of the kitten).
 */
export type CatRearPhase='run'|'takeoff'|'apex'|'fall'|'land';
export type CatRearFrame=0|1|2|3|4|5|6|7;

export interface CatRearPose{
  readonly phase:CatRearPhase;
  readonly frame:CatRearFrame;
  readonly scaleX:number;
  readonly scaleY:number;
  readonly yOffset:number;
  readonly tilt:number;
}

const runPose=(frame:CatRearFrame):CatRearPose=>({
  phase:'run',frame,scaleX:1,scaleY:1,yOffset:0,tilt:0,
});
function smooth01(t:number):number{
  const v=Math.max(0,Math.min(1,t));
  return v*v*(3-2*v);
}

/** Use the original boost image when running, not synthetic yellow marks. */
export function rearDisplayFrame(pose:CatRearPose,boostRemaining:number):CatRearFrame{
  if(pose.phase==='run'&&boostRemaining>0)return 7;
  return pose.frame;
}

export function catRearPose(
  grounded:boolean,
  verticalVelocity:number,
  runningAnimation:number,
  landingAge=Number.POSITIVE_INFINITY,
):CatRearPose{
  if(!grounded){
    if(verticalVelocity>2.0){
      return {phase:'takeoff',frame:4,scaleX:.94,scaleY:1.08,yOffset:.07,tilt:-.06};
    }
    if(verticalVelocity>=-2.0){
      return {phase:'apex',frame:6,scaleX:1.06,scaleY:.94,yOffset:.12,tilt:0};
    }
    return {phase:'fall',frame:5,scaleX:.97,scaleY:1.04,yOffset:.05,tilt:.06};
  }
  if(landingAge>=0&&landingAge<.14){
    const recover=smooth01(landingAge/.14);
    return {
      phase:'land',frame:0,
      scaleX:1.12-.12*recover,
      scaleY:.83+.17*recover,
      yOffset:-.10*(1-recover),
      tilt:0,
    };
  }
  return runPose((Math.floor(Math.max(0,runningAnimation))%6) as CatRearFrame);
}
