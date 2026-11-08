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
 * Reuses FOUR high-resolution painted 512x768 silhouettes extracted from the
 * original user-approved art. The source is lossless WebP with transparency
 * identical to the original PNG, not regenerated procedurally at runtime.
 *
 * Each district owns one material / one GPU texture. Houses are actual meshes
 * placed in Three.js world coordinates; their hitboxes remain decorative.
 * A shared plane geometry is explicitly excluded from chunk disposal.
 */
export class IllustratedHouseArt {
  private readonly geometry=new THREE.PlaneGeometry(1,1);
  private readonly materials=new Map<DistrictKey,THREE.MeshBasicMaterial>();
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
      await Promise.all(DISTRICTS.map(async district=>{
        const texture=await loader.loadAsync(base+`house_${district.key}.webp`);
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
        const material=this.materials.get(district.key)!;
        material.map=texture;
        material.opacity=1;
        material.needsUpdate=true;
      }));
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
    const height=house.compact?6.50:7.45+(house.variation%2)*.46;
    const width=height*512/768;
    plane.scale.set(house.variation%2===0?width:-width,height,1);

    // Keep all the real gameplay within ±2.5 m, while visually narrowing
    // the old 3D street. The sprite's alpha silhouette is narrower than its
    // plane, leaving room for fish / crate collision views and corner turns.
    plane.position.set(house.side*5.85,ground-1.65+height/2,house.z);

    // The original painting is a FRONT view. Facing it along the road keeps
    // its details visible, while warpChunk handles cosmetic route turns.
    plane.rotation.y=0;
    plane.userData.sharedHouseSpriteGeometry=true;
    group.add(plane);
  }

  dispose():void{
    this.disposed=true;
    this.geometry.dispose();
    this.materials.forEach(material=>material.dispose());
    this.textures.forEach(texture=>texture.dispose());
  }
}
