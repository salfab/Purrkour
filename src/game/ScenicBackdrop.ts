import * as THREE from 'three';
import {panoramaPan,panoramaSize} from './backdropMath';

/**
 * A painted distant panorama rather than a full-screen WebGL background.
 *
 * - Crop the foreground balcony from the source, without changing aspect ratio.
 * - Feather the four boundaries into the scene's sky color.
 * - Keep the panorama behind the last level chunks and drift it slowly.
 * - Dispose the image and GPU resources when the game is closed.
 */
export class ScenicBackdrop {
  readonly group=new THREE.Group();
  private readonly loader=new THREE.TextureLoader();
  private sourceTexture:THREE.Texture|null=null;
  private canvasTexture:THREE.CanvasTexture|null=null;
  private panorama:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>|null=null;
  private disposed=false;
  private readonly cropHeight=.78;

  constructor(){
    this.loader.load(
      `${import.meta.env.BASE_URL}assets/backgrounds/mediterranean_horizon.avif`,
      (texture)=>{
        if(this.disposed){texture.dispose();return;}
        this.sourceTexture=texture;
        const image=texture.image as (CanvasImageSource & {width:number;height:number})|undefined;
        if(!image || !(image.width>0) || !(image.height>0))return;

        const width=Math.min(1024,image.width);
        const height=Math.max(1,Math.round(width*image.height*this.cropHeight/image.width));
        const canvas=document.createElement('canvas');
        canvas.width=width;canvas.height=height;
        const context=canvas.getContext('2d');
        if(!context)return;

        // drawImage uses identical source and target proportions: cropping is not stretching.
        context.drawImage(image,0,0,image.width,image.height*this.cropHeight,0,0,width,height);
        context.globalCompositeOperation='destination-in';

        const horizontal=context.createLinearGradient(0,0,width,0);
        horizontal.addColorStop(0,'rgba(0,0,0,0)');
        horizontal.addColorStop(.12,'rgba(0,0,0,1)');
        horizontal.addColorStop(.88,'rgba(0,0,0,1)');
        horizontal.addColorStop(1,'rgba(0,0,0,0)');
        context.fillStyle=horizontal;context.fillRect(0,0,width,height);

        const vertical=context.createLinearGradient(0,0,0,height);
        vertical.addColorStop(0,'rgba(0,0,0,0)');
        vertical.addColorStop(.08,'rgba(0,0,0,1)');
        vertical.addColorStop(.65,'rgba(0,0,0,1)');
        vertical.addColorStop(1,'rgba(0,0,0,0)');
        context.fillStyle=vertical;context.fillRect(0,0,width,height);
        context.globalCompositeOperation='source-over';

        const painted=new THREE.CanvasTexture(canvas);
        painted.colorSpace=THREE.SRGBColorSpace;
        painted.minFilter=THREE.LinearMipmapLinearFilter;
        painted.magFilter=THREE.LinearFilter;
        this.canvasTexture=painted;
        const {width:worldWidth,height:worldHeight}=panoramaSize(image.width,image.height,this.cropHeight);
        const material=new THREE.MeshBasicMaterial({
          map:painted,transparent:true,depthWrite:false,side:THREE.DoubleSide,
          toneMapped:false,fog:false,
        });
        this.panorama=new THREE.Mesh(new THREE.PlaneGeometry(worldWidth,worldHeight),material);
        this.panorama.rotation.y=Math.PI;
        this.panorama.renderOrder=-10;
        this.group.add(this.panorama);
      },
      undefined,
      ()=>console.warn('Purrkour: horizon indisponible, ciel uni conservé'),
    );
  }

  update(distance:number,groundHeight:number):void{
    if(!this.panorama)return;
    // 86 metres in front of the cat: behind the streamed rooftop scene.
    this.panorama.position.set(panoramaPan(distance),groundHeight+1.0,distance+87);
  }

  dispose():void{
    this.disposed=true;
    if(this.panorama){
      this.group.remove(this.panorama);
      this.panorama.geometry.dispose();
      this.panorama.material.dispose();
      this.panorama=null;
    }
    this.canvasTexture?.dispose();
    this.sourceTexture?.dispose();
  }
}
