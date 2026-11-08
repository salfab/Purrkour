import * as THREE from 'three';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {
  DISTRICTS,BUILDING_ENVELOPE,
  houseProfile,houseProfilesForChunk,houseMinVisibleClearance,
} from '../src/game/districts';
import {fakeMergeOverlapsBuilding} from '../src/game/routeGeometry';
import {DistrictBuildings} from '../src/game/DistrictBuildings';

describe('v0.18.2 city block layout',()=>{
  it('varies frontage silhouettes and increases the number of houses without a solid wall',()=>{
    const all=Array.from({length:200},(_,chunk)=>houseProfilesForChunk(chunk,812))
      .flat();
    const types=new Set(all.map(p=>p.archetype));
    const sizes=new Set(all.map(p=>p.height));
    expect(types).toEqual(new Set(['gable','terrace','stepped','tower','shop']));
    expect(sizes.size).toBeGreaterThan(5);
    expect(all.length).toBeGreaterThan(170);
    expect(all.length).toBeLessThan(275);
    expect(Array.from({length:200},(_,chunk)=>
      houseProfilesForChunk(chunk,812).length).some(n=>n===0)).toBe(true);
    expect(Array.from({length:200},(_,chunk)=>
      houseProfilesForChunk(chunk,812).length).some(n=>n===2)).toBe(true);
  });

  it('provides stable, seeded placement on both sides without overlapping neighbors',()=>{
    for(const seed of [0,10,271,8731]){
      const all=Array.from({length:120},(_,i)=>houseProfilesForChunk(i,seed))
        .flat();
      expect(all).toEqual(Array.from({length:120},(_,i)=>
        houseProfilesForChunk(i,seed)).flat());
      for(const p of all){
        expect(p.z).toBeGreaterThanOrEqual(
          Math.floor(p.z/12)*12 + .1,
        );
        expect(p.z).toBeLessThan(Math.ceil(p.z/12)*12);
        expect(houseMinVisibleClearance(p)).toBeGreaterThan(
          BUILDING_ENVELOPE.minDecorationClearance,
        );
        expect(p.depth).toBeLessThan(10);
      }
      for(const side of [-1,1] as const){
        const same=all.filter(p=>p.side===side).sort((a,b)=>a.z-b.z);
        for(let i=1;i<same.length;i++){
          const left=same[i-1]!;
          const right=same[i]!;
          const gap=right.z-left.z-(left.depth+right.depth)/2;
          expect(gap).toBeGreaterThan(BUILDING_ENVELOPE.minSameSideGap);
        }
      }
    }
  });

  it('keeps the 45 degree decorative merge clear of full house footprints',()=>{
    for(const branch of ['fish','acro'] as const){
      const generated=Array.from({length:15},(_,i)=>
        houseProfilesForChunk(i+24,193)).flat();
      const accepted=generated.filter(p=>!fakeMergeOverlapsBuilding(
        p.z,p.centerX,branch,p.width/2+.90,p.depth/2+.48,
      ));
      expect(accepted.length).toBeGreaterThan(0);
      for(const p of accepted){
        expect(fakeMergeOverlapsBuilding(
          p.z,p.centerX,branch,p.width/2+.90,p.depth/2+.48,
        )).toBe(false);
      }
    }
  });

  it('preserves separate district architecture recipes',()=>{
    for(const [i,district] of DISTRICTS.entries()){
      const members=Array.from({length:22},(_,k)=>{
        const z=i*325+(k*12+6);
        return houseProfile(k+i*45,i+1,-1,z);
      });
      expect(members.every(p=>p.district.key===district.key)).toBe(true);
      expect(new Set(members.map(p=>p.archetype)).size).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('v0.18.2 actual low-poly architecture',()=>{
  afterEach(()=>vi.unstubAllGlobals());

  it('builds real pitched roof surfaces and reuses shared geometries',()=>{
    const context={fillStyle:'',fillRect:()=>{}};
    vi.stubGlobal('document',{
      createElement:(tag:string)=>{
        if(tag!=='canvas')throw Error('unexpected DOM element');
        return {
          width:0,height:0,
          getContext:(type:string)=>type==='2d'?context:null,
        };
      },
    });

    const cream=new THREE.MeshLambertMaterial({color:'#ffffff'});
    const peach=new THREE.MeshLambertMaterial({color:'#fff2df'});
    const roof=new THREE.MeshLambertMaterial({color:'#c67d52'});
    const window=new THREE.MeshBasicMaterial();
    const banner=new THREE.MeshBasicMaterial();
    const flower=new THREE.SpriteMaterial();
    const art=new DistrictBuildings({cream,peach,roof,window,banner,flower});
    let gableFound=false,towerFound=false;
    const reusedBoxes=new Set<THREE.BufferGeometry>();

    for(let i=0;i<110;i++){
      const p=houseProfile(i,33,-1,i*12+6);
      const group=new THREE.Group();
      art.add(group,p,0);
      const meshes=group.children.filter((x):x is THREE.Mesh=>x instanceof THREE.Mesh);
      expect(meshes.length).toBeGreaterThan(4);
      expect(meshes.length).toBeLessThan(58);
      if(p.archetype==='gable'||p.archetype==='stepped'){
        const slopes=meshes.filter(mesh=>
          mesh.geometry instanceof THREE.BufferGeometry
          &&mesh.geometry.getAttribute('position').count===18,
        );
        expect(slopes.length).toBeGreaterThanOrEqual(1);
        for(const slope of slopes){
          slope.geometry.computeBoundingBox();
          expect(slope.geometry.boundingBox?.max.y).toBe(1);
          expect(slope.geometry.boundingBox?.min.y).toBe(0);
        }
        gableFound=true;
      }
      if(p.archetype==='tower'){
        expect(meshes.some(mesh=>mesh.geometry instanceof THREE.ConeGeometry)).toBe(true);
        towerFound=true;
      }
      for(const mesh of meshes){
        if(mesh.geometry instanceof THREE.BoxGeometry)reusedBoxes.add(mesh.geometry);
      }
    }
    expect(gableFound).toBe(true);
    expect(towerFound).toBe(true);
    expect(reusedBoxes.size).toBe(1);
    art.dispose();
    cream.dispose();peach.dispose();roof.dispose();window.dispose();
    banner.dispose();flower.dispose();
  });
});
