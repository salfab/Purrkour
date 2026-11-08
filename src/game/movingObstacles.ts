import {segmentPlan} from './gameplayDirector';
import type {RouteChoice} from './routeChoices';

/**
 * v0.18 moving hazards.
 *
 * Movement is a deterministic function of runner progress, rather than wall
 * clock time, so the game and visual scene cannot disagree at low FPS or
 * during a pause. One clear safe lane remains open in every pattern.
 */
export type MovingObstacleKind='pigeons'|'cart';

export interface MovingObstacle{
  readonly id:string;
  readonly kind:MovingObstacleKind;
  readonly z:number;
  readonly x:number;
  readonly direction:-1|1;
  readonly width:number;
  readonly depth:number;
  readonly height:number;
}

export const MOVING_RULES={
  warningDistance:15,
  crossingDistance:16,
  penaltySeconds:1.25,
  penaltyPoints:30,
  slowdownMultiplier:.72,
  cartBounceHeight:1.05,
} as const;

function clamp(value:number,min:number,max:number):number{
  return Math.max(min,Math.min(max,value));
}

function crossingSide(seed:number,segment:number,slot:number):-1|1{
  const scrambled=(Math.imul(seed|0,37)^Math.imul(segment+1,353)^Math.imul(slot+11,17))>>>0;
  return scrambled%2===0?-1:1;
}

export function movingObstaclesNear(
  start:number,end:number,seed=0,route:RouteChoice|null=null,
):MovingObstacle[]{
  const obstacles:MovingObstacle[]=[];
  for(let k=Math.max(0,Math.floor(start/100)-1);k<=Math.floor(end/100)+1;k++){
    const plan=segmentPlan(k,seed,route);
    for(const [index,p] of plan.placements.entries()){
      if(p.id!=='pigeon-crossing'&&p.id!=='rolling-cart')continue;
      const z=k*100+p.at;
      const kind:MovingObstacleKind=p.id==='pigeon-crossing'?'pigeons':'cart';
      obstacles.push({
        id:`${kind}-${k}-${p.slot}`,
        kind,
        x:kind==='cart'?p.x:0,
        z,
        direction:crossingSide(seed,k,index),
        width:kind==='cart'?1.45:1.28,
        depth:kind==='cart'?1.65:1.15,
        height:kind==='cart'?MOVING_RULES.cartBounceHeight:1.25,
      });
    }
  }
  return obstacles.filter(o=>o.z>=start-2&&o.z<=end+2);
}

/** Cross precisely through the middle as the cat arrives, then fly away. */
export function movingObstacleX(obstacle:MovingObstacle,playerDistance:number):number{
  if(obstacle.kind==='pigeons'){
    const progress=clamp((playerDistance-(obstacle.z-MOVING_RULES.crossingDistance/2))
      /MOVING_RULES.crossingDistance,0,1);
    return obstacle.direction*(2.8-progress*5.6);
  }
  // The fruit cart rolls slowly from side to side. It never blocks all lanes.
  const phase=(playerDistance-obstacle.z)*.35+(obstacle.direction===1?0:Math.PI);
  return clamp(obstacle.x+.53*Math.sin(phase),-1.60,1.60);
}

export function movingObstacleNearby(obstacle:MovingObstacle,playerDistance:number):boolean{
  return playerDistance>=obstacle.z-MOVING_RULES.warningDistance
    &&playerDistance<=obstacle.z+obstacle.depth+2;
}

export function movingObstacleOverlaps(
  obstacle:MovingObstacle,
  playerX:number,playerZ:number,
):boolean{
  const x=movingObstacleX(obstacle,playerZ);
  return Math.abs(playerX-x)<obstacle.width/2+.25
    &&Math.abs(playerZ-obstacle.z)<obstacle.depth/2+.30;
}

/** Cart landing qualifies as a crate-style skill bounce, not a side hit. */
export function cartBouncePossible(
  obstacle:MovingObstacle,
  previousY:number,currentY:number,velocityY:number,
  floor:number,
):boolean{
  if(obstacle.kind!=='cart'||velocityY>0)return false;
  const top=floor+obstacle.height;
  return previousY>=top-.12&&currentY<=top+.05;
}

export function safeLanesAtObstacle(obstacle:MovingObstacle):readonly number[]{
  const blocked=movingObstacleX(obstacle,obstacle.z);
  return [-1.75,1.75].filter(x=>Math.abs(x-blocked)>obstacle.width/2+.4);
}
