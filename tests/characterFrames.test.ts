import {describe,expect,it} from 'vitest';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {
  getFrameLayout,configureCharacterTexture,setCharacterMirror,
} from '../src/game/characterFrames';

describe('original side and rear 4×2 sprite atlases',()=>{
  it('extracts eight complete 256×256 frames from each full-color RGBA PNG',()=>{
    for(const filename of ['cat_side_original_hq.png','cat_rear_original_hq.png']){
      const png=readFileSync(resolve(process.cwd(),'public/assets/character',filename));
      const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
      expect(getFrameLayout(width,height,4,2)).toEqual({
        columns:4,rows:2,frameWidth:256,frameHeight:256,
      });
    }
  });
  it('rejects incomplete or mismatched frame grids',()=>{
    expect(()=>getFrameLayout(322,160,4,2)).toThrow();
    expect(()=>getFrameLayout(0,160,4,2)).toThrow();
    expect(()=>getFrameLayout(384,96,4,2)).not.toThrow();
  });
  it('does not use mipmaps or sample outside isolated transparent frames',()=>{
    const texture=new THREE.CanvasTexture({width:256,height:256} as HTMLCanvasElement);
    configureCharacterTexture(texture);
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(texture.generateMipmaps).toBe(false);
    expect(texture.minFilter).toBe(THREE.LinearFilter);
    expect(texture.magFilter).toBe(THREE.LinearFilter);
    expect(texture.wrapS).toBe(THREE.ClampToEdgeWrapping);
    expect(texture.wrapT).toBe(THREE.ClampToEdgeWrapping);
    setCharacterMirror(texture,true);
    expect(texture.repeat.x).toBe(-1);
    expect(texture.offset.x).toBe(1);
    setCharacterMirror(texture,false);
    expect(texture.repeat.x).toBe(1);
    expect(texture.offset.x).toBe(0);
  });
  it('keeps the decoded artwork pixels unchanged',()=>{
    const source=readFileSync(resolve(process.cwd(),'src/game/characterFrames.ts'),'utf8');
    expect(source).not.toMatch(/getImageData|putImageData|quantize|posterize|createRearBoostFrames/);
    expect(source).toContain('ctx.drawImage(');
    expect(source).toContain('configureCharacterTexture(texture)');
  });
});
