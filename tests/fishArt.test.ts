import * as THREE from 'three';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {FishArt} from '../src/game/FishArt';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

describe('illustrated fish collectibles',()=>{
  it('loads separate blue and gold art, sharing the gold map and cleaning up',async()=>{
    const loaded:THREE.Texture[]=[];
    vi.spyOn(THREE.TextureLoader.prototype,'loadAsync').mockImplementation(async()=>{
      const texture=new THREE.Texture<HTMLImageElement>();loaded.push(texture);return texture;
    });
    const dataset:Record<string,string>={};
    vi.stubGlobal('document',{documentElement:{dataset}});
    const materials={fish:new THREE.SpriteMaterial(),gold:new THREE.SpriteMaterial(),sky:new THREE.SpriteMaterial()};
    const art=new FishArt(materials);
    await vi.waitFor(()=>expect(dataset.fishArtReady).toBe('true'));
    expect(materials.fish.map).not.toBe(materials.gold.map);
    expect(materials.sky.map).toBe(materials.gold.map);
    expect(materials.fish.map?.minFilter).toBe(THREE.LinearMipmapLinearFilter);
    const disposals=loaded.map(texture=>vi.spyOn(texture,'dispose'));
    art.dispose();
    disposals.forEach(dispose=>expect(dispose).toHaveBeenCalledOnce());
    Object.values(materials).forEach(material=>material.dispose());
  });
});
