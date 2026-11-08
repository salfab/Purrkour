import {REWARD_RULES,type RewardState} from './rewards';
import {routePoint,type WorldPoint} from './routeGeometry';
import type {RouteChoice} from './routeChoices';

export interface RushVisualState {
  readonly visible:boolean;
  readonly age:number;
  readonly burst:number;
  readonly pulse:number;
}

/** Pure visual timings; changes nothing about physics or scoring. */
export function rushVisualState(rushRemaining:number,elapsed:number):RushVisualState{
  if(rushRemaining<=0)return {visible:false,age:0,burst:0,pulse:0};
  const age=Math.max(0,REWARD_RULES.rushDuration-rushRemaining);
  return {
    visible:true,
    age,
    burst:Math.max(0,1-age/.55),
    pulse:.85+.15*Math.sin(elapsed*13),
  };
}

export interface RushTrailPoint extends WorldPoint {
  readonly opacity:number;
  readonly size:number;
}

/** Follow the player's local route: curved branch or ordinary straight track. */
export function rushTrailPoint(
  distance:number,
  lateral:number,
  route:RouteChoice|null,
  elapsed:number,
  index:number,
  count:number,
  floor:(s:number)=>number,
):RushTrailPoint{
  const factor=(index+1)/(count+1);
  const s=Math.max(0,distance-.35-(index+1)*.48);
  const wobble=.16*Math.sin(index*2.38+elapsed*12.8);
  const p=routePoint(s,lateral+wobble,route,floor(s)+.4+factor*.55);
  return {
    ...p,
    opacity:.76*(1-factor),
    size:.14+factor*.28,
  };
}

export function rushScreenEffectsVisible(
  mode:'menu'|'running'|'paused'|'over',
  rewards:Pick<RewardState,'rushRemaining'>,
):boolean{
  return mode==='running'&&rewards.rushRemaining>0;
}
