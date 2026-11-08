/** Larger painted tiles on the lower terraces: one repeat per ~8 metres. */
export const TERRACE_TEXTURE_TILE_METRES=8;

/** Keep the road and terrace UV coordinates in world metres, even across chunks. */
export function terraceQuadUV(x0:number,x1:number,z0:number,z1:number):number[]{
  const u0=x0/TERRACE_TEXTURE_TILE_METRES;
  const u1=x1/TERRACE_TEXTURE_TILE_METRES;
  const v0=z0/TERRACE_TEXTURE_TILE_METRES;
  const v1=z1/TERRACE_TEXTURE_TILE_METRES;
  return [u0,v0,u0,v1,u1,v0, u0,v1,u1,v1,u1,v0];
}

/** Shadow gets 25% smaller at high jumps, without ever disappearing. */
export function jumpShadowAppearance(heightAboveRoad:number):{scale:number;opacity:number}{
  const height=Math.max(0,heightAboveRoad);
  const progress=Math.min(1,height/2.6);
  return {
    scale:1-.25*progress,
    opacity:.30-.15*progress,
  };
}

/** Keep the hand-painted sprinting profile sprite with its original yellow streaks. */
export function profileFrame(boostRemaining:number,grounded:boolean,animation:number):number{
  if(boostRemaining>0)return 7;
  if(!grounded)return 6;
  return Math.floor(Math.max(0,animation))%6;
}


/**
 * The track and both fork preview ribbons share a single world-scaled UV
 * coordinate system. Enlarged painted paving: one repeat every 5.5 metres.
 * Never restart UV coordinates per 12m streamed chunk.
 */
export const TRACK_TEXTURE_TILE_METRES=5.5;

export function trackRibbonUV(
  leftStart:number,leftEnd:number,rightStart:number,rightEnd:number,
  distanceStart:number,distanceEnd:number,
):number[]{
  const u=(x:number):number=>x/TRACK_TEXTURE_TILE_METRES;
  const v=(z:number):number=>z/TRACK_TEXTURE_TILE_METRES;
  return [
    u(leftStart),v(distanceStart),
    u(leftEnd),v(distanceEnd),
    u(rightStart),v(distanceStart),
    u(leftEnd),v(distanceEnd),
    u(rightEnd),v(distanceEnd),
    u(rightStart),v(distanceStart),
  ];
}

export function trackQuadUV(
  left:number,right:number,distanceStart:number,distanceEnd:number,
):number[]{
  return trackRibbonUV(left,left,right,right,distanceStart,distanceEnd);
}
