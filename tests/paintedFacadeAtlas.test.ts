import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {
  atlasCells,facadeTileIndices,roofTileIndex,
} from '../src/game/paintedFacadeAtlas';
import {
  DISTRICTS,districtLengthForPreview,houseProfilesForChunk,
  houseMinVisibleClearance,BUILDING_ENVELOPE,
} from '../src/game/districts';

describe('v0.18.3 real painted raster assets',()=>{
  it('checks the committed façade atlas PNG and its four exact panels',()=>{
    const png=readFileSync('public/assets/textures/facades_painted_v1.png');
    expect([...png.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
    expect(png.readUInt32BE(16)).toBe(256);
    expect(png.readUInt32BE(20)).toBe(256);
    expect(png[25]).toBe(2); // RGB, no accidental alpha matte
    expect(atlasCells(256,256,2,2)).toEqual([
      {x:0,y:0,width:128,height:128},
      {x:128,y:0,width:128,height:128},
      {x:0,y:128,width:128,height:128},
      {x:128,y:128,width:128,height:128},
    ]);
    expect(()=>atlasCells(255,256,2,2)).toThrow();
  });

  it('checks real transparent painted door and window atlas, rather than SVG decals',()=>{
    const png=readFileSync('public/assets/textures/openings_painted_v1.png');
    expect([...png.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
    expect(png.readUInt32BE(16)).toBe(256);
    expect(png.readUInt32BE(20)).toBe(256);
    expect(png[25]).toBe(6); // truecolor RGBA with alpha
    expect(atlasCells(256,256,2,2).length).toBe(4);
  });

  it('checks that the two roof textures are real raster artwork',()=>{
    const png=readFileSync('public/assets/textures/roofs_painted_v1.png');
    expect([...png.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
    expect(png.readUInt32BE(16)).toBe(256);
    expect(png.readUInt32BE(20)).toBe(128);
    expect(atlasCells(256,128,2,1)).toEqual([
      {x:0,y:0,width:128,height:128},
      {x:128,y:0,width:128,height:128},
    ]);
  });

  it('preserves distinct palettes for each district',()=>{
    expect(facadeTileIndices('old-town')).toEqual([0,1]);
    expect(facadeTileIndices('market')).toEqual([1,2]);
    expect(facadeTileIndices('gardens')).toEqual([0,3]);
    expect(facadeTileIndices('twilight')).toEqual([3,2]);
    expect(DISTRICTS.map(theme=>roofTileIndex(theme.key))).toEqual([0,0,1,1]);
  });

  it('uses 100m only for the opt-in art preview, with normal 325m unchanged',()=>{
    expect(districtLengthForPreview('')).toBe(325);
    expect(districtLengthForPreview('?districtPreview=0')).toBe(325);
    expect(districtLengthForPreview('?districtPreview=1')).toBe(100);
    expect(districtLengthForPreview('?foo=bar&districtPreview=1')).toBe(100);
  });

  it('moves houses closer but retains road clearance and deterministic placement',()=>{
    for(const seed of [0,4,91,2026]){
      for(let index=0;index<180;index++){
        const profiles=houseProfilesForChunk(index,seed);
        expect(profiles).toEqual(houseProfilesForChunk(index,seed));
        for(const house of profiles){
          expect(houseMinVisibleClearance(house)).toBeGreaterThan(
            BUILDING_ENVELOPE.minDecorationClearance,
          );
        }
      }
    }
  });
});
