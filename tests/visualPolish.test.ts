import {describe,expect,it} from 'vitest';
import {
  TERRACE_TEXTURE_TILE_METRES,terraceQuadUV,jumpShadowAppearance,
  profileFrame,speedStreakPoint,
} from '../src/game/visualPolish';
import {routePoint} from '../src/game/routeGeometry';

describe('v0.17.5 mobile art pass',()=>{
  it('scales lower-terrain artwork to readable eight-metre tiles',()=>{
    expect(TERRACE_TEXTURE_TILE_METRES).toBe(8);
    expect(terraceQuadUV(0,8,100,108)).toEqual([
      0,12.5,0,13.5,1,12.5,
      0,13.5,1,13.5,1,12.5,
    ]);
    // Continuous world UVs eliminate visual jumps between streamed chunks.
    const one=terraceQuadUV(-10,0,12,24);
    const two=terraceQuadUV(-10,0,24,36);
    expect(one[3]).toBe(two[1]);
    expect(one[9]).toBe(two[1]);
  });

  it('shrinks the shadow on jumps but keeps it present and restores at landing',()=>{
    expect(jumpShadowAppearance(0)).toEqual({scale:1,opacity:.30});
    expect(jumpShadowAppearance(-2)).toEqual({scale:1,opacity:.30});
    const halfway=jumpShadowAppearance(1.3);
    expect(halfway.scale).toBeCloseTo(.875);
    expect(halfway.opacity).toBeCloseTo(.225);
    const high=jumpShadowAppearance(5);
    expect(high.scale).toBeCloseTo(.75);
    expect(high.opacity).toBeCloseTo(.15);
    expect(jumpShadowAppearance(0).scale).toBe(1);
  });

  it('restores the ORIGINAL profile speed art without touching running or jump poses',()=>{
    expect(profileFrame(2,true,100)).toBe(7);
    expect(profileFrame(.01,false,100)).toBe(7);
    expect(profileFrame(0,false,100)).toBe(6);
    expect(profileFrame(0,true,0)).toBe(0);
    expect(profileFrame(0,true,5)).toBe(5);
  });

  it('keeps recycled yellow lines behind either branch, never in front of the runner',()=>{
    for(const route of [null,'fish','acro'] as const){
      for(let i=0;i<10;i++){
        const streak=speedStreakPoint(260,.3,route,5,i,10,()=>0);
        const at=routePoint(260,.3,route);
        expect(Number.isFinite(streak.x)).toBe(true);
        expect(streak.opacity).toBeGreaterThan(0);
        expect(streak.opacity).toBeLessThan(1);
        expect(streak.width).toBeGreaterThan(0);
        expect(Math.hypot(streak.x-at.x,streak.z-at.z)).toBeGreaterThan(.5);
      }
    }
  });
});
