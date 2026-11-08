import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {fileURLToPath} from 'node:url';
import {housePreviewMode} from '../src/game/IllustratedHouseArt';

describe('v0.18.7 real hand-painted transparent facades',()=>{
  const districts=['old-town','market','gardens','twilight'] as const;
  it('commits four true lossless WebP files, not placeholders or CSS gradients',()=>{
    for(const district of districts){
      const path=fileURLToPath(
        new URL(`../public/assets/illustrated-houses/house_${district}.webp`,import.meta.url),
      );
      const buffer=readFileSync(path);
      expect(buffer.byteLength).toBeGreaterThan(100000);
      expect(buffer.toString('ascii',0,4)).toBe('RIFF');
      expect(buffer.toString('ascii',8,12)).toBe('WEBP');
      // VP8L is lossless WebP and retains its RGBA alpha; VP8 is lossy.
      expect(buffer.toString('ascii',12,16)).toBe('VP8L');
      expect(buffer[20]).toBe(0x2f);
    }
  });

  it('shows the original illustrated art without extra opt-in parameters',()=>{
    expect(housePreviewMode('')).toBe('sprites');
    expect(housePreviewMode('?districtPreview=1')).toBe('sprites');
    expect(housePreviewMode('?districtPreview=1&housePreview=off')).toBe('off');
    expect(housePreviewMode('?districtPreview=1&housePreview=compare')).toBe('compare');
  });
});
