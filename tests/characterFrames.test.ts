import {describe,expect,it} from 'vitest';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {
  getFrameLayout,cleanRearFootArtifacts,configureCharacterTexture,
  setCharacterMirror,
} from '../src/game/characterFrames';

describe('safe character sprite sampling (front, back, mirror)',()=>{
  it('calculates isolated 4x2 side frames from the PNG resource',()=>{
    const png=readFileSync(resolve(process.cwd(),'public/assets/character/cat_atlas.png'));
    expect(png.toString('ascii',1,4)).toBe('PNG');
    const w=png.readUInt32BE(16);
    const h=png.readUInt32BE(20);
    const layout=getFrameLayout(w,h,4,2);
    expect(layout.frameWidth).toBe(layout.frameHeight);
    expect(layout.columns*layout.rows).toBe(8);
  });
  it('uses exactly 4 complete rear poses; invalid atlas dimensions are rejected',()=>{
    expect(getFrameLayout(384,96,4,1)).toEqual({
      columns:4,rows:1,frameWidth:96,frameHeight:96,
    });
    expect(()=>getFrameLayout(322,160,4,2)).toThrow();
    expect(()=>getFrameLayout(0,160,4,2)).toThrow();
  });
  it('uses no mipmaps and clamps individual transparent frames',()=>{
    const texture=new THREE.CanvasTexture({width:80,height:80} as HTMLCanvasElement);
    configureCharacterTexture(texture);
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
  it('removes red speckles under the rear paws but preserves pads, fur and upper collar',()=>{
    const data=new Uint8ClampedArray(10*10*4);
    const pixel=(x:number,y:number,rgba:readonly number[]):void=>{
      data.set(rgba,(y*10+x)*4);
    };
    pixel(1,9,[255,2,2,255]);      // unwanted bright red noise
    pixel(2,9,[236,8,129,255]);    // magenta noise below paw
    pixel(3,9,[230,155,163,255]);  // legitimate pink pad
    pixel(4,9,[238,158,75,255]);   // orange fur
    pixel(5,2,[220,10,10,255]);    // red collar outside cleanup area
    const changed=cleanRearFootArtifacts({width:10,height:10,data});
    expect(changed).toBe(2);
    for(const [x,y,a] of [[1,9,0],[2,9,0],[3,9,255],[4,9,255],[5,2,255]]){
      expect(data[(y*10+x)*4+3]).toBe(a);
    }
  });
});
