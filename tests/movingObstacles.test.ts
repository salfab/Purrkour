import {describe,expect,it} from 'vitest';
import {
  movingObstaclesNear,movingObstacleX,movingObstacleOverlaps,
  cartBouncePossible,safeLanesAtObstacle,MOVING_RULES,
} from '../src/game/movingObstacles';
import {
  groundHeight,makePlayer,simulate,WORLD,type Controls,
} from '../src/game/core';
import {segmentPlan} from '../src/game/gameplayDirector';
import {ROUTE_FORK} from '../src/game/routeChoices';

function control():Controls{
  return {targetX:null,left:false,right:false,jump:false};
}
describe('v0.18 dynamic nonviolent obstacles',()=>{
  it('introduces pigeons before the descent and fruit carts after it',()=>{
    expect(movingObstaclesNear(0,400,12)).toEqual([]);
    expect(segmentPlan(4,12).placements[1]?.id).toBe('pigeon-crossing');
    expect(segmentPlan(6,12).placements[3]?.id).toBe('rolling-cart');
    const pigeon=movingObstaclesNear(435,447,12)[0];
    const cart=movingObstaclesNear(685,692,12).find(o=>o.kind==='cart');
    expect(pigeon?.kind).toBe('pigeons');
    expect(pigeon?.z).toBe(441);
    expect(cart?.kind).toBe('cart');
    expect(cart?.z).toBe(688);
    expect(pigeon!.z).toBeGreaterThan(ROUTE_FORK.endZ);
  });
  it('is reproducible for each run and keeps a safe lane for every moving hazard',()=>{
    for(const seed of [0,1,17,831]){
      for(let k=4;k<40;k++){
        const a=movingObstaclesNear(k*100,(k+1)*100,seed);
        expect(a).toEqual(movingObstaclesNear(k*100,(k+1)*100,seed));
        for(const obstacle of a){
          expect(safeLanesAtObstacle(obstacle).length).toBeGreaterThanOrEqual(1);
          for(const lane of safeLanesAtObstacle(obstacle)){
            expect(Math.abs(lane)).toBeLessThan(WORLD.trackWidth/2-.25);
            expect(movingObstacleOverlaps(obstacle,lane,obstacle.z)).toBe(false);
          }
        }
      }
    }
  });
  it('crosses the center of the road with predictable advance warning',()=>{
    const bird=movingObstaclesNear(438,444,77)[0]!;
    expect(Math.abs(movingObstacleX(bird,bird.z-8))).toBeCloseTo(2.8);
    expect(movingObstacleX(bird,bird.z)).toBeCloseTo(0);
    expect(Math.abs(movingObstacleX(bird,bird.z+8))).toBeCloseTo(2.8);
  });
  it('loses a combo and points but does NOT die or lose fish after a pigeon collision',()=>{
    const bird=movingObstaclesNear(438,444,77)[0]!;
    const p=makePlayer(77);
    p.z=bird.z-.07;
    p.x=0;p.y=groundHeight(p.z);p.score=90;p.fish=9;
    p.rewards.comboChain=2;p.rewards.instinct=44;
    simulate(p,control(),new Set(),1/120);
    expect(p.failure).toBeNull();
    expect(p.hitMovingObstacles.has(bird.id)).toBe(true);
    expect(p.stumbleRemaining).toBeGreaterThan(1);
    expect(p.rewards.comboChain).toBe(0);
    expect(p.fish).toBe(9);
    expect(p.rewards.instinct).toBe(44);
    const score=p.score;
    for(let i=0;i<10;i++)simulate(p,control(),new Set(),1/120);
    expect(p.score).toBe(score);
  });
  it('can jump above birds without taking a penalty',()=>{
    const bird=movingObstaclesNear(438,444,77)[0]!;
    const p=makePlayer(77);
    p.z=bird.z-.06;p.x=0;
    p.y=groundHeight(p.z)+1.8;p.vy=2;p.grounded=false;
    simulate(p,control(),new Set(),1/120);
    expect(p.failure).toBeNull();
    expect(p.hitMovingObstacles.size).toBe(0);
  });
  it('bounces from the top of a rolling cart, scoring without a side hit',()=>{
    const cart=movingObstaclesNear(685,692,77).find(o=>o.kind==='cart')!;
    const p=makePlayer(77);
    p.z=cart.z-.08;
    p.x=movingObstacleX(cart,cart.z);
    p.y=groundHeight(p.z)+cart.height+.03;
    p.vy=-3;p.grounded=false;
    simulate(p,control(),new Set(),1/120);
    expect(p.failure).toBeNull();
    expect(p.cartBounces).toBe(1);
    expect(p.bounces).toBe(1);
    expect(p.vy).toBe(WORLD.bounceVelocity);
    expect(p.stumbleRemaining).toBe(0);
    expect(p.score).toBeGreaterThanOrEqual(45);
    expect(p.rewards.comboStage).toBe('bounce');
    expect(cartBouncePossible(cart,groundHeight(cart.z)+.2,groundHeight(cart.z),-3,groundHeight(cart.z))).toBe(false);
  });
  it('resets obstacle-hit state in every new run and never modifies fork selection',()=>{
    const first=makePlayer(42);
    first.hitMovingObstacles.add('pigeons-4-choice');
    first.stumbleRemaining=MOVING_RULES.penaltySeconds;
    const fresh=makePlayer(42);
    expect(fresh.hitMovingObstacles.size).toBe(0);
    expect(fresh.stumbleRemaining).toBe(0);
    expect(fresh.routeChoice).toBeNull();
    expect(fresh.cartBounces).toBe(0);
  });
});
