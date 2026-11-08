import * as THREE from 'three';

/** Replace the procedural fallback with two shared painted collectible maps. */
export class FishArt{
  private readonly textures:THREE.Texture[]=[];
  private disposed=false;

  constructor(private readonly materials:{fish:THREE.SpriteMaterial;gold:THREE.SpriteMaterial;sky:THREE.SpriteMaterial}){
    void this.load();
  }

  private async load():Promise<void>{
    const loader=new THREE.TextureLoader();
    const base=`${import.meta.env.BASE_URL}assets/collectibles/`;
    try{
      await Promise.all(([
        ['fish-blue-v1.png',[this.materials.fish]],
        ['fish-gold-v1.png',[this.materials.gold,this.materials.sky]],
      ] as const).map(async ([filename,materials])=>{
        const texture=await loader.loadAsync(base+filename);
        if(this.disposed){texture.dispose();return;}
        texture.colorSpace=THREE.SRGBColorSpace;
        texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
        // Distant collectibles occupy only a few pixels on phones.
        texture.generateMipmaps=true;
        texture.minFilter=THREE.LinearMipmapLinearFilter;
        texture.magFilter=THREE.LinearFilter;
        this.textures.push(texture);
        for(const material of materials){material.map=texture;material.needsUpdate=true;}
      }));
      if(!this.disposed)document.documentElement.dataset.fishArtReady='true';
    }catch(error){
      if(!this.disposed)document.documentElement.dataset.fishArtReady='error';
      console.warn('Purrkour: illustrated fish unavailable, keeping fallback',error);
    }
  }

  dispose():void{
    this.disposed=true;
    this.textures.forEach(texture=>texture.dispose());
  }
}
