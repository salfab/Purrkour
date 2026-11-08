import * as THREE from 'three';
import {groundHeight,type Player} from './core';
import {speedStreakPoint} from './visualPolish';

const STREAK_COUNT=10;

/**
 * Yellow speed-streaks from the original profile boost language.
 * One tiny Canvas texture and ten reusable sprites; no runtime allocations.
 * Rear and profile both receive the effect. The sprite itself is provided
 * by the original side atlas or the rear boost variant.
 */
export class SpeedStreakEffects{
  readonly group=new THREE.Group();
  private readonly sprites:THREE.Sprite[]=[];
  private readonly texture:THREE.CanvasTexture;
  private readonly materials:THREE.SpriteMaterial[]=[];

  constructor(){
    const canvas=document.createElement('canvas');
    canvas.width=128;
    canvas.height=64;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('Purrkour: Canvas2D required for boost streaks');
    // Soft golden tapered trail, never a hard rectangular sprite.
    const gradient=ctx.createLinearGradient(0,0,128,0);
    gradient.addColorStop(0,'rgba(255,194,54,0)');
    gradient.addColorStop(.16,'rgba(255,207,82,.48)');
    gradient.addColorStop(.62,'rgba(255,238,132,.98)');
    gradient.addColorStop(1,'rgba(255,247,199,0)');
    ctx.fillStyle=gradient;
    ctx.beginPath();
    ctx.moveTo(1,29);ctx.lineTo(104,19);ctx.quadraticCurveTo(129,26,116,32);
    ctx.lineTo(20,38);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,249,196,.74)';
    ctx.beginPath();ctx.ellipse(68,29,29,2.2,-.08,0,Math.PI*2);ctx.fill();

    this.texture=new THREE.CanvasTexture(canvas);
    this.texture.colorSpace=THREE.SRGBColorSpace;
    this.texture.generateMipmaps=false;
    this.texture.magFilter=THREE.LinearFilter;
    this.texture.minFilter=THREE.LinearFilter;
    for(let i=0;i<STREAK_COUNT;i++){
      const material=new THREE.SpriteMaterial({
        map:this.texture,
        transparent:true,depthWrite:false,depthTest:false,
        toneMapped:false,opacity:.6,
      });
      this.materials.push(material);
      const sprite=new THREE.Sprite(material);
      sprite.renderOrder=2; // character stays above speed lines
      this.sprites.push(sprite);
      this.group.add(sprite);
    }
    this.group.visible=false;
  }

  update(player:Player,playing:boolean):void{
    this.group.visible=playing&&player.boost>0;
    if(!this.group.visible)return;
    for(let i=0;i<this.sprites.length;i++){
      const p=speedStreakPoint(
        player.z,player.x,player.routeChoice,player.elapsed,
        i,this.sprites.length,groundHeight,
      );
      const sprite=this.sprites[i]!;
      sprite.position.set(p.x,p.y,p.z);
      sprite.scale.set(p.length,p.width,1);
      (sprite.material as THREE.SpriteMaterial).opacity=p.opacity;
    }
  }

  dispose():void{
    this.materials.forEach(m=>m.dispose());
    this.texture.dispose();
    this.group.clear();
  }
}
