import * as THREE from 'three';
import {groundHeight,type Player} from './core';
import {rushVisualState,rushTrailPoint} from './rushVisualState';
import {routePoint} from './routeGeometry';

const TRAIL_COUNT=14;

/**
 * Lightweight Purr Rush effect: two pooled aura sprites and fourteen
 * recycled trail sprites. Textures are generated once (96×96 each).
 * No 3D particles, post-processing, or per-frame geometry allocations.
 */
export class RushEffects {
  readonly group=new THREE.Group();
  private readonly aura:THREE.Sprite;
  private readonly pop:THREE.Sprite;
  private readonly trail:THREE.Sprite[]=[];
  private readonly textures:THREE.Texture[]=[];
  private readonly materials:THREE.SpriteMaterial[]=[];

  constructor(){
    const glow=this.radialTexture('#fffde6','#ffc75a');
    const spark=this.radialTexture('#ffffff','#ffd16b');
    this.aura=this.sprite(glow,.65);
    this.pop=this.sprite(glow,.85);
    this.group.add(this.aura,this.pop);
    for(let i=0;i<TRAIL_COUNT;i++){
      const dot=this.sprite(spark,.65);
      this.trail.push(dot);
      this.group.add(dot);
    }
    this.group.visible=false;
  }

  private radialTexture(center:string,edge:string):THREE.CanvasTexture{
    const canvas=document.createElement('canvas');
    canvas.width=96;
    canvas.height=96;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('Purrkour: Canvas2D required for Rush effects');
    const gradient=ctx.createRadialGradient(48,48,3,48,48,47);
    gradient.addColorStop(0,center);
    gradient.addColorStop(.35,edge);
    gradient.addColorStop(.58,'rgba(255,209,112,0.45)');
    gradient.addColorStop(1,'rgba(255,209,112,0)');
    ctx.fillStyle=gradient;
    ctx.fillRect(0,0,96,96);
    const texture=new THREE.CanvasTexture(canvas);
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.minFilter=THREE.LinearFilter;
    texture.magFilter=THREE.LinearFilter;
    this.textures.push(texture);
    return texture;
  }

  private sprite(texture:THREE.Texture,opacity:number):THREE.Sprite{
    const material=new THREE.SpriteMaterial({
      map:texture,
      color:'#ffffff',
      transparent:true,
      opacity,
      depthWrite:false,
      depthTest:false,
      toneMapped:false,
    });
    this.materials.push(material);
    const sprite=new THREE.Sprite(material);
    sprite.renderOrder=2; // kawaii character uses renderOrder=3
    return sprite;
  }

  update(player:Player,isRunning:boolean):void{
    const state=rushVisualState(player.rewards.rushRemaining,player.elapsed);
    this.group.visible=isRunning&&state.visible;
    if(!this.group.visible)return;

    const position=routePoint(player.z,player.x,player.routeChoice);
    this.aura.position.set(position.x,player.y+1.0,position.z+.12);
    const auraSize=2.5+.22*state.pulse;
    this.aura.scale.set(auraSize,auraSize,1);
    (this.aura.material as THREE.SpriteMaterial).opacity=.44+.14*state.pulse;

    this.pop.position.set(position.x,player.y+1.0,position.z+.07);
    const popSize=2.4+3.7*(1-state.burst);
    this.pop.scale.set(popSize,popSize,1);
    (this.pop.material as THREE.SpriteMaterial).opacity=.65*state.burst;

    for(let i=0;i<this.trail.length;i++){
      const p=rushTrailPoint(
        player.z,player.x,player.routeChoice,player.elapsed,
        i,this.trail.length,groundHeight,
      );
      const dot=this.trail[i]!;
      dot.position.set(p.x,p.y,p.z);
      dot.scale.set(p.size,p.size,1);
      (dot.material as THREE.SpriteMaterial).opacity=p.opacity;
    }
  }

  dispose():void{
    for(const material of this.materials)material.dispose();
    for(const texture of this.textures)texture.dispose();
    this.group.clear();
  }
}
