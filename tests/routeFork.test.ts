import {describe,it,expect} from 'vitest';
import {ROUTE_FORK,routeFromWorldX,activeRoute,forkStage,turnEnvelope} from '../src/game/routeChoices';
import {segmentPlan} from '../src/game/gameplayDirector';
import {makePlayer,simulate,isGap,cratesNear,pickupsNear,groundHeight,type Controls} from '../src/game/core';

const noSteer=():Controls=>({targetX:null,left:false,right:false,jump:false});

describe('first two-way route fork',()=>{
  it('uses existing screen orientation, without a tap or a release gesture',()=>{
    expect(routeFromWorldX(1.2)).toBe('fish'); // screen left
    expect(routeFromWorldX(-1.2)).toBe('acro'); // screen right
    const left=makePlayer(12);
    left.x=1.2;left.z=ROUTE_FORK.chooseZ-.025;
    simulate(left,noSteer(),new Set(),1/120);
    expect(left.routeChoice).toBe('fish');
    expect(left.routeChosenAt).not.toBeNull();
    const right=makePlayer(12);
    right.x=-1.2;right.z=ROUTE_FORK.chooseZ-.025;
    simulate(right,noSteer(),new Set(),1/120);
    expect(right.routeChoice).toBe('acro');
  });
  it('announces, selects, animates, and eventually exits the route',()=>{
    expect(forkStage(230,null,10,null)).toBe('approach');
    expect(forkStage(251,'fish',11,10.5)).toBe('turn');
    expect(forkStage(270,'fish',13,10.5)).toBe('turn');
    expect(forkStage(285,'fish',15,10.5)).toBe('active');
    expect(forkStage(420,'fish',40,10.5)).toBe('rejoin');
    expect(forkStage(436,'fish',43,10.5)).toBeNull();
    expect(activeRoute(350,'fish')).toBe('fish');
    expect(activeRoute(410,'acro')).toBeNull();
    expect(turnEnvelope(10.5,10.5)).toBeCloseTo(0);
    expect(turnEnvelope(10.975,10.5)).toBeCloseTo(1);
    expect(turnEnvelope(12,10.5)).toBeCloseTo(0);
  });
  it('has no gap or required crate through the immediate decision/turn zone',()=>{
    for(let z=ROUTE_FORK.announceZ;z<ROUTE_FORK.exitZ;z+=.5){
      expect(isGap(z)).toBe(false);
      expect(cratesNear(z,z+1,42).length).toBe(0);
    }
    expect(isGap(68.7)).toBe(true);
    expect(isGap(268.7)).toBe(false);
    expect(groundHeight(268)).toBeGreaterThan(0);
  });
  it('keeps the tutorial fixed but gives the route distinct, deterministic rewards',()=>{
    expect(segmentPlan(0,7,'fish')).toEqual(segmentPlan(0,7,'acro'));
    const fish=segmentPlan(3,17,'fish').placements.map(x=>x.id);
    const acro=segmentPlan(3,17,'acro').placements.map(x=>x.id);
    expect(fish).not.toEqual(acro);
    const fishPickups=pickupsNear(300,400,17,'fish');
    const acroPickups=pickupsNear(300,400,17,'acro');
    expect(fishPickups.some(x=>x.kind==='boost')).toBe(true);
    expect(acroPickups.some(x=>x.kind==='sky')).toBe(true);
    expect(pickupsNear(300,400,17,'fish')).toEqual(fishPickups);
  });
  it('keeps reward fish near the matching crate after the fork',()=>{
    for(const seed of [0,27,998]){
      for(const route of ['fish','acro'] as const){
        const crates=cratesNear(300,400,seed,route);
        const pickups=pickupsNear(300,400,seed,route);
        for(const item of pickups.filter(x=>x.kind==='sky')){
          expect(crates.some(c=>c.x===item.x && item.z>c.z && item.z<c.z+3)).toBe(true);
        }
      }
    }
  });
});
