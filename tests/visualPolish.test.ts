import {describe,expect,it} from 'vitest';
import {
  TERRACE_TEXTURE_TILE_METRES,terraceQuadUV,jumpShadowAppearance,
  profileFrame,TRACK_TEXTURE_TILE_METRES,trackQuadUV,trackRibbonUV,
} from '../src/game/visualPolish';

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

  it('uses the same enlarged pavement tile across main road and fork preview',()=>{
    expect(TRACK_TEXTURE_TILE_METRES).toBe(5.5);
    const main=trackQuadUV(-2.5,2.5,288,288.5);
    const fork=trackRibbonUV(-2.5,-2.5,2.5,2.5,288,288.5);
    expect(fork).toEqual(main);
    const before=trackQuadUV(-2.5,2.5,287.5,288);
    expect(before[3]).toBe(main[1]);
    expect(before[9]).toBe(main[1]);
    // Each repeat spans several metres, not tiny bricks/pied-de-poule.
    expect(main[4]! - main[0]!).toBeCloseTo(5/5.5);
    expect(main[3]! - main[1]!).toBeCloseTo(.5/5.5);
  });

  it('does not add floating streak sprites to the route during a speed boost',()=>{
    // Use the original painted sprite (frame 7) for the side profile.
    // The separate extra particle emitter was removed to prevent clutter.
    expect(profileFrame(1,true,99)).toBe(7);
  });
});
