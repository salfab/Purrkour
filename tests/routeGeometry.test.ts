import {describe,it,expect} from 'vitest';
import {
  ROUTE_CURVE,ROUTE_DETOUR_END,FAKE_MERGE,
  routePose,routePoint,fakeMergePose,fakeMergePoint,alternativeBranch,turnFraming,
  ROUTE_PREVIEW_END,branchRoadEdges,
} from '../src/game/routeGeometry';
import {ROUTE_FORK} from '../src/game/routeChoices';
import {isGap} from '../src/game/core';

describe('short lateral detour and fake 45-degree merge',()=>{
  it('keeps one 288m stitch boundary and non-overlapping Y halves',()=>{
    expect(ROUTE_PREVIEW_END).toBe(288);
    expect(ROUTE_PREVIEW_END).toBeGreaterThan(ROUTE_DETOUR_END);
    for(const distance of [250,252,260,270,ROUTE_DETOUR_END,288]){
      const fish=branchRoadEdges(distance,'fish');
      const acro=branchRoadEdges(distance,'acro');
      expect(fish.min).toBeCloseTo(-acro.max,6);
      expect(fish.max).toBeCloseTo(-acro.min,6);
      expect(fish.min).toBeLessThanOrEqual(fish.max);
      expect(acro.min).toBeLessThanOrEqual(acro.max);
    }
    expect(branchRoadEdges(250,'fish')).toEqual({min:0,max:2.5});
    expect(branchRoadEdges(250,'acro')).toEqual({min:-2.5,max:0});
    expect(branchRoadEdges(ROUTE_PREVIEW_END,'fish')).toEqual({min:-2.5,max:2.5});
  });
  it('starts smoothly at the original split position',()=>{
    for(const branch of ['fish','acro'] as const){
      expect(routePose(ROUTE_FORK.chooseZ,branch)).toEqual({x:0,z:250,yaw:0});
      const next=routePose(250.01,branch);
      expect(Math.abs(next.x)).toBeLessThan(.001);
      expect(next.z).toBeGreaterThan(250);
    }
  });
  it('has one brief bend, then travels straight for the rest of the run',()=>{
    const halfway=ROUTE_CURVE.split+ROUTE_CURVE.radius*ROUTE_CURVE.maximumAngle;
    expect(routePose(halfway,'fish').yaw).toBeCloseTo(Math.PI/4,6);
    expect(routePose(halfway,'acro').yaw).toBeCloseTo(-Math.PI/4,6);
    for(const branch of ['fish','acro'] as const){
      const after=routePose(ROUTE_DETOUR_END,branch);
      expect(after.yaw).toBe(0);
      for(const distance of [295,340,400,600,900]){
        const point=routePose(distance,branch);
        expect(point.x).toBeCloseTo(after.x,6);
        expect(point.z-after.z).toBeCloseTo(distance-ROUTE_DETOUR_END,6);
        expect(point.yaw).toBe(0);
      }
    }
  });
  it('has a continuous centreline and keeps exactly 5m of track width',()=>{
    for(const branch of ['fish','acro'] as const){
      for(let s=250;s<ROUTE_DETOUR_END;s+=.22){
        const a=routePose(s,branch),b=routePose(s+.01,branch);
        expect(Math.hypot(a.x-b.x,a.z-b.z)).toBeCloseTo(.01,3);
        const left=routePoint(s,-2.5,branch),right=routePoint(s,2.5,branch);
        expect(Math.hypot(left.x-right.x,left.z-right.z)).toBeCloseTo(5,5);
      }
    }
  });
  it('does not construct a second full branch for the fake merge',()=>{
    expect(FAKE_MERGE.end-FAKE_MERGE.start).toBeLessThan(22);
    for(const chosen of ['fish','acro'] as const){
      const start=fakeMergePose(FAKE_MERGE.start,chosen);
      const finish=fakeMergePose(FAKE_MERGE.end,chosen);
      const main=routePose(FAKE_MERGE.end,chosen);
      expect(finish.x).toBeCloseTo(main.x,6);
      expect(finish.z).toBeCloseTo(main.z,6);
      expect(Math.abs(start.x-main.x)).toBeGreaterThan(10);
      expect(Math.abs(start.yaw)).toBeCloseTo(Math.PI/4,6);
      const left=fakeMergePoint(400,-2.5,chosen);
      const right=fakeMergePoint(400,2.5,chosen);
      expect(Math.hypot(left.x-right.x,left.z-right.z)).toBeCloseTo(5,5);
      expect(alternativeBranch(chosen)).not.toBe(chosen);
    }
  });
  it('temporarily expands the camera composition around the detour',()=>{
    expect(turnFraming(210)).toBe(0);
    expect(turnFraming(260)).toBeCloseTo(1,6);
    expect(turnFraming(320)).toBe(0);
  });
  it('keeps the detour free of gameplay gaps',()=>{
    for(let s=250;s<=ROUTE_DETOUR_END;s+=.25)expect(isGap(s)).toBe(false);
    expect(isGap(468.7)).toBe(true);
  });
});
