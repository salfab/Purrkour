import {routePoint,type WorldPoint} from './routeGeometry';
import type {RouteChoice} from './routeChoices';

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

export interface SpeedStreakPoint extends WorldPoint{
  readonly opacity:number;
  readonly width:number;
  readonly length:number;
}

/** Recycled yellow dashes stay behind the cat on BOTH normal and curved routes. */
export function speedStreakPoint(
  distance:number,lateral:number,route:RouteChoice|null,
  elapsed:number,index:number,count:number,
  ground:(distance:number)=>number,
):SpeedStreakPoint{
  const t=(index+1)/(count+1);
  const z=Math.max(0,distance-.60-(index+1)*.65);
  const side=index%2===0?-1:1;
  const offset=side*(.33+.30*t)+.08*Math.sin(elapsed*14+index);
  const p=routePoint(z,lateral+offset,route,ground(z)+.45+.12*(1-t));
  return {...p,opacity:.85*(1-t),width:.22+.08*t,length:.45+.43*t};
}
