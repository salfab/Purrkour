import {describe,expect,it} from 'vitest';
import {housePreviewMode} from '../src/game/IllustratedHouseArt';

describe('opt-in illustrated building preview',()=>{
  it('uses real painted houses by default but preserves a fallback to modular 3D',()=>{
    expect(housePreviewMode('')).toBe('sprites');
    expect(housePreviewMode('?districtPreview=1')).toBe('sprites');
    expect(housePreviewMode('?housePreview=unexpected')).toBe('sprites');
    expect(housePreviewMode('?housePreview=off')).toBe('off');
    expect(housePreviewMode('?housePreview=modular')).toBe('off');
  });
  it('supports illustrated-only and alternating comparisons without code changes',()=>{
    expect(housePreviewMode('?housePreview=sprites')).toBe('sprites');
    expect(housePreviewMode('?housePreview=compare')).toBe('compare');
    expect(housePreviewMode('?districtPreview=1&housePreview=sprites')).toBe('sprites');
    expect(housePreviewMode('?housePreview=compare&artShot=150')).toBe('compare');
  });
});

