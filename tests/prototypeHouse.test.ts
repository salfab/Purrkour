import * as THREE from 'three';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {PrototypeHouseArt,PROTOTYPE_HOUSE,isVolumeHousePreview} from '../src/game/PrototypeHouseArt';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

describe('painted volume house study',()=>{
  it('requires the explicit volume preview',()=>{
    expect(isVolumeHousePreview('')).toBe(false);
    expect(isVolumeHousePreview('?housePreview=sprites')).toBe(false);
    expect(isVolumeHousePreview('?housePreview=volume&artShot=48')).toBe(true);
  });

  it('has actual depth and a raised roof, stays outside the track and shares resources on recreation',async()=>{
    vi.spyOn(THREE.TextureLoader.prototype,'loadAsync').mockImplementation(async()=>new THREE.Texture());
    const dataset:Record<string,string>={};
    vi.stubGlobal('document',{
      documentElement:{dataset},
      createElement:()=>({width:0,height:0,getContext:()=>({fillStyle:'',fillRect:()=>{}})}),
    });
    const kit=new PrototypeHouseArt();
    const parent=new THREE.Group();
    const first=kit.add(parent,66,1.8);
    const second=kit.add(parent,66,1.8);
    const other=kit.add(parent,90,1.8,1,2);
    await vi.waitFor(()=>expect(dataset.volumeHouseReady).toBe('true'));
    const bounds=new THREE.Box3().setFromObject(first);
    expect(bounds.max.x).toBeLessThan(-2.5-1.05);
    expect(bounds.min.x).toBeLessThan(-PROTOTYPE_HOUSE.front-PROTOTYPE_HOUSE.depth+.01);
    expect(bounds.min.y).toBeCloseTo(0);
    expect(bounds.max.y).toBeGreaterThan(PROTOTYPE_HOUSE.height+1);
    expect(bounds.max.z-bounds.min.z).toBeGreaterThan(PROTOTYPE_HOUSE.width);
    const firstMeshes=first.children.filter((obj):obj is THREE.Mesh=>obj instanceof THREE.Mesh);
    const secondMeshes=second.children.filter((obj):obj is THREE.Mesh=>obj instanceof THREE.Mesh);
    const ends=firstMeshes.filter(mesh=>mesh.name==='end-facade');
    const otherEnds=other.children.filter((obj):obj is THREE.Mesh=>obj instanceof THREE.Mesh&&obj.name==='end-facade');
    expect(ends).toHaveLength(2);
    expect(otherEnds).toHaveLength(2);
    expect(ends[0]!.material).toBe(ends[1]!.material);
    expect(otherEnds[0]!.material).toBe(otherEnds[1]!.material);
    expect(otherEnds[0]!.material).not.toBe(ends[0]!.material);
    const unique=new Set<THREE.BufferGeometry>();
    let triangles=0;
    firstMeshes.forEach((mesh,i)=>{
      unique.add(mesh.geometry);
      expect(secondMeshes[i]!.geometry).toBe(mesh.geometry);
      expect(secondMeshes[i]!.material).toBe(mesh.material);
      expect(mesh.userData.sharedHouseSpriteGeometry).toBe(true);
      triangles+=(mesh.geometry.index?.count??mesh.geometry.getAttribute('position').count)/3;
    });
    expect(triangles).toBeLessThan(250);
    const disposed=Array.from(unique,g=>vi.spyOn(g,'dispose'));
    kit.dispose();
    disposed.forEach(spy=>expect(spy).toHaveBeenCalledOnce());
  });
});
