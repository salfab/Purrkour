import {describe,expect,it} from 'vitest';
import {housePreviewMode} from '../src/game/IllustratedHouseArt';

describe('opt-in illustrated building preview',()=>{
  it('leaves ordinary gameplay in the existing 3D rendering mode',()=>{
    expect(housePreviewMode('')).toBe('off');
    expect(housePreviewMode('?districtPreview=1')).toBe('off');
    expect(housePreviewMode('?housePreview=unexpected')).toBe('off');
  });
  it('supports illustrated-only and alternating comparisons without code changes',()=>{
    expect(housePreviewMode('?housePreview=sprites')).toBe('sprites');
    expect(housePreviewMode('?housePreview=compare')).toBe('compare');
    expect(housePreviewMode('?districtPreview=1&housePreview=sprites')).toBe('sprites');
    expect(housePreviewMode('?housePreview=compare&artShot=150')).toBe('compare');
  });
});
