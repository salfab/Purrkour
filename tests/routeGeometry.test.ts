import {describe,it,expect} from 'vitest';
import {ROUTE_CURVE,ROUTE_JOIN_DISTANCE,routePose,routePoint,alternativeBranch} from '../src/game/routeGeometry';
import {ROUTE_FORK} from '../src/game/routeChoices';
import {isGap} from '../src/game/core';

describe('actual spatial Y fork and merge',()=>{
  it('starts at the exact split point, with a continuous tangent',()=>{
    for(const branch of ['fish','acro'] as const){
      expect(routePose(ROUTE_FORK.chooseZ,branch)).toEqual({x:0,z:250,yaw:0});
      const justAfter=routePose(250.01,branch);
      expect(Math.abs(justAfter.x)).toBeLessThan(.001);
      expect(justAfter.z).toBeGreaterThan(250);
    }
  });
  it('rotates a full 90 degrees on each chosen branch',()=>{
    const at=ROUTE_CURVE.split+ROUTE_CURVE.radius*Math.PI/2;
    expect(routePose(at,'fish').yaw).toBeCloseTo(Math.PI/2,6);
    expect(routePose(at,'acro').yaw).toBeCloseTo(-Math.PI/2,6);
    expect(routePose(at,'fish').x).toBeGreaterThan(10);
    expect(routePose(at,'acro').x).toBeLessThan(-10);
  });
  it('rejoins the same global point and tangent in both directions',()=>{
    const a=routePose(ROUTE_JOIN_DISTANCE,'fish');
    const b=routePose(ROUTE_JOIN_DISTANCE,'acro');
    expect(a).toEqual(b);
    expect(a.x).toBeCloseTo(0,5);
    expect(a.yaw).toBeCloseTo(0,5);
    expect(routePose(ROUTE_JOIN_DISTANCE+16,'fish'))
      .toEqual(routePose(ROUTE_JOIN_DISTANCE+16,'acro'));
    expect(alternativeBranch('fish')).toBe('acro');
  });
  it('preserves a constant track width along every curved portion',()=>{
    for(let s=250;s<=ROUTE_JOIN_DISTANCE;s+=2){
      for(const route of ['fish','acro'] as const){
        const a=routePoint(s,-2.5,route),b=routePoint(s,2.5,route);
        expect(Math.hypot(a.x-b.x,a.z-b.z)).toBeCloseTo(5,5);
      }
    }
  });
  it('keeps both curves continuous and mirrored at all distances',()=>{
    for(let s=250;s<ROUTE_JOIN_DISTANCE;s+=.31){
      const a=routePose(s,'fish'),b=routePose(s+.01,'fish');
      const c=routePose(s,'acro');
      expect(Math.hypot(a.x-b.x,a.z-b.z)).toBeCloseTo(.01,3);
      expect(a.x).toBeCloseTo(-c.x,5);
      expect(a.z).toBeCloseTo(c.z,5);
    }
  });
  it('does not force the runner across a gap while the roads are curving',()=>{
    for(let s=250;s<=ROUTE_JOIN_DISTANCE;s+=.25)expect(isGap(s)).toBe(false);
    expect(isGap(468.7)).toBe(true);
  });
});
