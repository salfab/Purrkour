import * as THREE from 'three';
import {DISTRICTS,type HouseProfile,type DistrictKey} from './districts';

export interface DistrictMaterialSources{
  readonly cream:THREE.MeshLambertMaterial;
  readonly peach:THREE.MeshLambertMaterial;
  readonly roof:THREE.MeshLambertMaterial;
  readonly window:THREE.MeshBasicMaterial;
  readonly banner:THREE.MeshBasicMaterial;
  readonly flower:THREE.SpriteMaterial;
}

/**
 * A few reusable architectural modules, not bespoke heavy 3D models:
 * gabled roofs, market awnings, balconies/vines and warm lanterns.
 *
 * All adornments are attached to the street-facing wall, at least ~2 metres
 * outside the playable road edge. Geometry is generated only once per chunk.
 */
export class DistrictBuildings{
  private readonly materials:THREE.Material[]=[];
  private readonly facade=new Map<DistrictKey,readonly [THREE.MeshLambertMaterial,THREE.MeshLambertMaterial]>();
  private readonly roofs=new Map<DistrictKey,THREE.MeshLambertMaterial>();
  private readonly accents=new Map<DistrictKey,THREE.MeshLambertMaterial>();
  private readonly shutters=new Map<DistrictKey,THREE.MeshLambertMaterial>();
  private readonly trims=new Map<DistrictKey,THREE.MeshLambertMaterial>();
  private readonly leaves=new Map<DistrictKey,THREE.MeshLambertMaterial>();
  private readonly glow=new THREE.MeshBasicMaterial({color:'#ffe9a6',toneMapped:false});

  constructor(private readonly sources:DistrictMaterialSources){
    this.materials.push(this.glow);
    const lambert=(color:string,map?:THREE.Texture|null):THREE.MeshLambertMaterial=>{
      const material=new THREE.MeshLambertMaterial({
        color,map:map??null,side:THREE.DoubleSide,flatShading:false,
      });
      this.materials.push(material);
      return material;
    };
    for(const district of DISTRICTS){
      this.facade.set(district.key,[
        lambert(district.walls[0],sources.cream.map),
        lambert(district.walls[1],sources.peach.map),
      ]);
      this.roofs.set(district.key,lambert(district.roof,sources.roof.map));
      this.accents.set(district.key,lambert(district.accent));
      this.shutters.set(district.key,lambert(district.shutter));
      this.trims.set(district.key,lambert(district.trim));
      this.leaves.set(district.key,lambert(district.foliage));
    }
  }

  /** Use the exact same loaded high-resolution plaster maps as the base city. */
  refreshTextures():void{
    for(const [key,pair] of this.facade){
      pair[0].map=this.sources.cream.map;
      pair[1].map=this.sources.peach.map;
      pair[0].needsUpdate=true;
      pair[1].needsUpdate=true;
      const roof=this.roofs.get(key);
      if(roof){roof.map=this.sources.roof.map;roof.needsUpdate=true;}
    }
  }

  private material(
    palette:Map<DistrictKey,THREE.MeshLambertMaterial>,
    district:DistrictKey,
  ):THREE.MeshLambertMaterial{
    return palette.get(district)??this.sources.cream;
  }

  private box(
    group:THREE.Group,
    x:number,y:number,z:number,w:number,h:number,d:number,
    material:THREE.Material,
  ):THREE.Mesh{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    mesh.position.set(x,y,z);group.add(mesh);
    return mesh;
  }

  private window(
    group:THREE.Group,profile:HouseProfile,inner:number,y:number,z:number,
    width:number,height:number,material:THREE.Material,
  ):void{
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);
    plane.position.set(inner-profile.side*.047,y,z);
    plane.rotation.y=profile.side<0?Math.PI/2:-Math.PI/2;
    group.add(plane);
  }

  add(group:THREE.Group,profile:HouseProfile,floor:number):void{
    const {district,side,z,centerX,width,height,depth,variation}=profile;
    const id=district.key;
    const walls=this.facade.get(id);
    const body=walls?.[variation%2]??this.sources.cream;
    const roof=this.material(this.roofs,id);
    const accent=this.material(this.accents,id);
    const shutters=this.material(this.shutters,id);
    const trim=this.material(this.trims,id);
    const greenery=this.material(this.leaves,id);
    const base=floor-1.8;
    const top=base+height;
    const inner=side*(Math.abs(centerX)-width/2);

    this.box(group,centerX,base+height/2,z,width,height,depth,body);
    this.box(group,centerX,top+.12,z,width+.30,.24,depth+.4,roof);
    this.box(group,centerX,top-.23,z,width+.16,.21,depth+.22,trim);

    // Two clearly visible shuttered openings on the road-facing elevation.
    for(const [i,offset] of [-2.15,1.7].entries()){
      const wy=base+2.8+(i===1&&height>7?.5:0);
      this.window(group,profile,inner,wy,z+offset,1.1,1.52,this.sources.window);
      for(const shift of [-.64,.64]){
        this.box(group,inner-side*.085,wy,z+offset+shift,
          .13,1.38,.19,shutters);
      }
    }

    if(id==='old-town'){
      // Modest pitched roof and carved stucco cornice.
      for(const sign of [-1,1]){
        const tile=this.box(
          group,centerX+sign*width*.255,top+.29,z,
          width*.59,.14,depth+.43,roof,
        );
        tile.rotation.z=sign*.26;
      }
      this.box(group,inner-side*.12,base+1.23,z+2.2,.19,.15,2.25,accent);
    }else if(id==='market'){
      // Red/yellow cloth awnings are instantly legible at runner speed.
      for(let i=0;i<6;i++){
        const shade=i%2===0?accent:trim;
        const stripe=this.box(
          group,inner-side*.72,base+3.72-(i%2)*.045,
          z+(i-2.5)*.59,
          1.38,.10,.58,shade,
        );
        stripe.rotation.z=-side*.10;
      }
      this.box(group,inner-side*.17,base+3.83,z,.16,.18,3.85,accent);
      this.window(group,profile,inner,base+5.1,z+3.35,.86,1.12,this.sources.banner);
      for(const offset of [-1.35,1.4]){
        this.box(group,inner-side*.32,base+.52,z+offset,.55,.46,.77,accent);
        this.box(group,inner-side*.32,base+.83,z+offset,.59,.14,.79,trim);
      }
    }else if(id==='gardens'){
      // Two balcony ledges + foliage that visually leads toward future Griffe.
      for(const y of [base+3.15,base+5.45]){
        if(y>top-.5)continue;
        this.box(group,inner-side*.41,y,z+.3,.88,.15,3.35,trim);
        for(const off of [-1.2,-.45,.55,1.25]){
          this.box(group,inner-side*.68,y+.36,z+off,.18,.6,.14,accent);
        }
        this.box(group,inner-side*.68,y+.65,z+.3,.16,.14,3.28,accent);
      }
      for(let i=0;i<5;i++){
        const vz=z-3.45+i*1.52;
        const vy=base+1.45+(i%2)*.75;
        this.box(group,inner-side*.09,vy,vz,.14,2.1,.15,greenery);
        const leaf=new THREE.Mesh(new THREE.SphereGeometry(.40,6,4),greenery);
        leaf.position.set(inner-side*.17,vy+.75,vz);
        group.add(leaf);
      }
      const flower=new THREE.Sprite(this.sources.flower);
      flower.position.set(inner-side*.56,base+3.7,z+1.7);
      flower.scale.set(.82,.82,1);group.add(flower);
    }else{
      // Twilight roof silhouette, luminous lanterns and muted blue-violet trim.
      this.box(group,centerX,top+.43,z,width*.76,.54,depth*.79,accent);
      this.box(group,centerX,top+.77,z,width*.37,.17,depth*.4,roof);
      for(const zOffset of [-2.3,2.3]){
        const lantern=this.box(
          group,inner-side*.40,base+3.4,z+zOffset,
          .33,.54,.38,this.glow,
        );
        lantern.renderOrder=1;
        this.box(group,inner-side*.40,base+3.74,z+zOffset,.38,.11,.42,accent);
      }
      this.box(group,inner-side*.16,base+1.07,z,.18,.18,2.45,trim);
    }
  }

  dispose():void{
    this.materials.forEach(material=>material.dispose());
  }
}
