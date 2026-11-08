import * as THREE from 'three';
import {describe,it,expect} from 'vitest';
import {GardenFeatures} from '../src/game/GardenFeatures';

describe('garden courtyards',()=>{
  it('places two different structures clear of the playable track on both sides',()=>{
    const kit=new GardenFeatures();const scene=new THREE.Group();
    for(const side of [-1,1] as const){
      const fountain=kit.add(scene,10,1.8,side,0);
      const pergola=kit.add(scene,30,1.8,side,1);
      expect(fountain.name).toBe('garden-fountain');
      expect(pergola.name).toBe('garden-pergola');
      for(const object of [fountain,pergola]){
        const bounds=new THREE.Box3().setFromObject(object);
        expect(side===1?bounds.min.x:-bounds.max.x).toBeGreaterThan(3.55);
      }
    }
    kit.dispose();
  });
});
