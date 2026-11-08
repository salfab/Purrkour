import {describe,expect,it} from 'vitest';
import {PAINTED_STUCCO_PREVIEW,isPaintedStuccoPreview,previewWallFiles}
  from '../src/game/paintedStuccoPreview';
import {DISTRICTS} from '../src/game/districts';

describe('v0.18.5 hand-painted stucco A/B preview',()=>{
  it('is opt-in and keeps the existing game untouched by default',()=>{
    expect(isPaintedStuccoPreview('')).toBe(false);
    expect(isPaintedStuccoPreview('?districtPreview=1')).toBe(false);
    expect(isPaintedStuccoPreview('?facadePreview=stucco')).toBe(true);
    expect(isPaintedStuccoPreview('?facadePreview=stucco&districtPreview=1')).toBe(true);
    expect(isPaintedStuccoPreview('?facadePreview=other')).toBe(false);
  });
  it('maps all four districts to explicit raster textures',()=>{
    const all=new Set<string>();
    for(const district of DISTRICTS){
      const files=previewWallFiles(district.key);
      expect(files).toHaveLength(2);
      for(const filename of files){
        expect(filename).toMatch(/^stucco_(cream|peach|ochre|rose)_painted\.png$/);
        all.add(filename);
      }
    }
    expect(all.size).toBe(4);
    expect(PAINTED_STUCCO_PREVIEW.roof).toBe('roof_terracotta_painted.png');
  });
});
