import {describe,it,expect} from 'vitest';
import {segmentPlan,patternHasCrate,safeLaneX} from '../src/game/gameplayDirector';
import {cratesNear,pickupsNear,WORLD} from '../src/game/core';
import {movingObstaclesNear} from '../src/game/movingObstacles';

describe('Purrkour gameplay director',()=>{
  it('keeps the first 100 metres predictable and introduces bouncing on the second segment',()=>{
    expect(segmentPlan(0,831).placements.map(x=>x.id)).toEqual(['jump-grab','jump-grab','slalom','jump-grab']);
    expect(segmentPlan(1,831).placements[1]?.id).toBe('bounce-grab');
  });
  it('is deterministic for a given seed, and provides varied runs beyond tutorial',()=>{
    for(let k=0;k<25;k++){
      expect(segmentPlan(k,17)).toEqual(segmentPlan(k,17));
    }
    const a=Array.from({length:15},(_,i)=>segmentPlan(i+2,11).placements.map(p=>p.id+':'+p.x).join(','));
    const b=Array.from({length:15},(_,i)=>segmentPlan(i+2,8001).placements.map(p=>p.id+':'+p.x).join(','));
    expect(a).not.toEqual(b);
    expect(new Set(a).size).toBeGreaterThan(3);
  });
  it('keeps each optional crate out of other slots and leaves at least one safe lateral lane',()=>{
    for(const seed of [0,1,999999]){
      for(let segment=0;segment<30;segment++){
        const crates=cratesNear(segment*100,(segment+1)*100,seed);
        expect(crates.length).toBeLessThanOrEqual(4);
        for(const crate of crates){
          const safe=safeLaneX(crate.x);
          expect(Math.abs(safe-crate.x)).toBeGreaterThan(crate.width/2+.28);
          expect(Math.abs(safe)).toBeLessThan(WORLD.trackWidth/2-.25);
          expect(Math.abs((crate.z%100)-69.65)).toBeGreaterThan(4);
        }
        const plan=segmentPlan(segment,seed);
        for(const slot of plan.placements){
          expect(typeof patternHasCrate(slot.id)).toBe('boolean');
        }
      }
    }
  });
  it('places high reward fish above a bounceable crate or cart and keeps a safe ground lane',()=>{
    for(const seed of [0,17,561]){
      for(let segment=1;segment<20;segment++){
        const from=segment*100;
        const crates=cratesNear(from,from+100,seed);
        const carts=movingObstaclesNear(from,from+100,seed).filter(o=>o.kind==='cart');
        const fish=pickupsNear(from,from+100,seed);
        for(const sky of fish.filter(p=>p.kind==='sky')){
          const crate=crates.find(c=>Math.abs(c.x-sky.x)<.01&&sky.z>c.z&&sky.z<c.z+3);
          const cart=carts.find(c=>Math.abs(c.x-sky.x)<.01&&sky.z>c.z&&sky.z<c.z+3);
          expect(crate??cart).toBeDefined();
          expect(fish.some(f=>f.kind==='fish'&&Math.abs(f.x-sky.x)>1.1&&Math.abs(f.z-sky.z)<3)).toBe(true);
        }
      }
    }
  });
});
