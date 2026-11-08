import * as THREE from 'three';
import {DISTRICTS,type DistrictKey,type HouseProfile} from './districts';

export type HousePreviewMode='off'|'sprites'|'compare';

/**
 * Full painted house sprites are the normal presentation for this art pass.
 * The old procedural 3D houses can still be compared using
 * ?housePreview=off, and ?housePreview=compare alternates both approaches.
 */
export function housePreviewMode(query:string):HousePreviewMode{
  const value=new URLSearchParams(query).get('housePreview');
  if(value==='off'||value==='modular')return 'off';
  return value==='compare'?'compare':'sprites';
}

/**
 * A transparent painted street frontage, shared across the four districts.
 *
 * Each district owns one material / one GPU texture. Houses are actual meshes
 * placed in Three.js world coordinates; their hitboxes remain decorative.
 * A shared plane geometry is explicitly excluded from chunk disposal.
 */
export class IllustratedHouseArt {
  private readonly geometry=new THREE.PlaneGeometry(1,1);
  private readonly materials=new Map<DistrictKey,THREE.MeshBasicMaterial>();
  private readonly plantMaterial=new THREE.SpriteMaterial({transparent:true,depthWrite:false,alphaTest:.055,fog:true,opacity:0});
  private readonly textures:THREE.Texture[]=[];
  private disposed=false;
  private ready=false;

  constructor(private readonly mode:HousePreviewMode){
    if(mode==='off')return;
    for(const district of DISTRICTS){
      this.materials.set(district.key,new THREE.MeshBasicMaterial({
        transparent:true,alphaTest:.055,depthWrite:false,
        depthTest:true,side:THREE.DoubleSide,fog:true,
        toneMapped:false,opacity:0,
      }));
    }
    void this.load();
  }

  get isReady():boolean{return this.ready;}

  useSprite(chunkIndex:number):boolean{
    return this.mode==='sprites'||(this.mode==='compare'&&chunkIndex%2===0);
  }

  private async load():Promise<void>{
    try{
      const loader=new THREE.TextureLoader();
      const base=`${import.meta.env.BASE_URL}assets/illustrated-houses/`;
      {
        const texture=await loader.loadAsync(base+'street-market-v2.png');
        if(this.disposed){texture.dispose();return;}
        texture.colorSpace=THREE.SRGBColorSpace;
        texture.wrapS=THREE.ClampToEdgeWrapping;
        texture.wrapT=THREE.ClampToEdgeWrapping;
        texture.generateMipmaps=true;
        texture.minFilter=THREE.LinearMipmapLinearFilter;
        texture.magFilter=THREE.LinearFilter;
        texture.anisotropy=4;
        texture.needsUpdate=true;
        this.textures.push(texture);
        for(const material of this.materials.values()){
          material.map=texture;
          material.opacity=1;
          material.needsUpdate=true;
        }
      }
      const plant=await loader.loadAsync(base+'olive-pot-v1.png');
      if(this.disposed){plant.dispose();return;}
      plant.colorSpace=THREE.SRGBColorSpace;
      plant.minFilter=THREE.LinearMipmapLinearFilter;
      this.textures.push(plant);
      this.plantMaterial.map=plant;
      this.plantMaterial.opacity=1;
      this.plantMaterial.needsUpdate=true;
      if(this.disposed)return;
      this.ready=true;
      document.documentElement.dataset.houseArtReady='true';
    }catch(error){
      console.warn('Purrkour: illustrated house textures unavailable',error);
      if(!this.disposed)document.documentElement.dataset.houseArtReady='error';
    }
  }

  add(group:THREE.Group,house:HouseProfile,ground:number):void{
    const material=this.materials.get(house.district.key);
    if(!material)return;
    const plane=new THREE.Mesh(this.geometry,material);
    const height=7.6;
    // One painting contains three distinct shopfronts. The overlap is hidden
    // behind neighbouring facades, and the original aspect ratio is retained.
    const width=15.2;
    plane.scale.set(house.variation%2===0?width:-width,height,1);

    // Keep all the real gameplay within ±2.5 m, while visually narrowing
    // the old 3D street. The sprite's alpha silhouette is narrower than its
    // plane, leaving room for fish / crate collision views and corner turns.
    plane.position.set(house.side*5.15,ground-1.65+height/2,house.z);

    // Facades follow the street instead of standing across it like cutouts.
    // warpChunk adds the local road heading on curves.
    plane.rotation.y=house.side*Math.PI/2;
    plane.userData.sharedHouseSpriteGeometry=true;
    group.add(plane);
    // A foreground layer brings the street to life without entering the track.
    if(house.variation%2===0){
      const plant=new THREE.Sprite(this.plantMaterial);
      plant.scale.set(1.55,1.9,1);
      plant.position.set(house.side*4.05,ground-1.8+.95,house.z+2);
      group.add(plant);
    }
  }

  dispose():void{
    this.disposed=true;
    this.geometry.dispose();
    this.materials.forEach(material=>material.dispose());
    this.plantMaterial.dispose();
    this.textures.forEach(texture=>texture.dispose());
  }
}
