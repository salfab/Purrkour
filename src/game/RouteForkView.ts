import * as THREE from 'three';
import {groundHeight} from './core';
import {ROUTE_FORK,type RouteChoice} from './routeChoices';

/**
 * Small Y-shaped, non-colliding visual fork. Only the camera turn is simulated
 * in v0.11: the runner's collision corridor stays in local +Z coordinates.
 * We can upgrade the curve to genuine world-space branches later.
 */
export class RouteForkView {
  readonly group=new THREE.Group();
  private readonly materials:THREE.Material[]=[];
  private readonly textures:THREE.Texture[]=[];
  private readonly markers=new Map<RouteChoice,THREE.Sprite>();

  constructor(){
    this.createPortal('fish',1.22,'#68cdb7');
    this.createPortal('acro',-1.22,'#efb65d');
    this.createLane('fish',1,'#59bcae');
    this.createLane('acro',-1,'#f2bb66');
  }

  private colorMaterial(color:string):THREE.MeshLambertMaterial{
    const material=new THREE.MeshLambertMaterial({color});
    this.materials.push(material);
    return material;
  }
  private box(x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material):void {
    const object=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    object.position.set(x,y,z);
    this.group.add(object);
  }

  private signTexture(choice:RouteChoice):THREE.CanvasTexture {
    const c=document.createElement('canvas');
    c.width=256;c.height=176;
    const ctx=c.getContext('2d');
    if(ctx){
      const accent=choice==='fish'?'#60c9ba':'#f9ba60';
      ctx.fillStyle='#304f5d';
      ctx.beginPath();ctx.roundRect(8,8,240,160,30);ctx.fill();
      ctx.strokeStyle='#fff5da';ctx.lineWidth=7;ctx.stroke();
      ctx.fillStyle=accent;
      ctx.beginPath();ctx.roundRect(18,18,220,140,22);ctx.fill();
      ctx.save();ctx.translate(128,73);
      if(choice==='fish'){
        ctx.fillStyle='#fff6e7';
        ctx.beginPath();ctx.ellipse(-5,0,40,22,0,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.moveTo(27,0);ctx.lineTo(61,-24);ctx.lineTo(61,24);ctx.closePath();ctx.fill();
        ctx.fillStyle='#253c4d';ctx.beginPath();ctx.arc(-23,-6,4,0,Math.PI*2);ctx.fill();
      }else{
        ctx.fillStyle='#fff9e8';
        ctx.beginPath();
        for(let i=0;i<10;i++){
          const a=-Math.PI/2+i*Math.PI/5;
          const radius=i%2===0?37:16;
          if(i===0)ctx.moveTo(Math.cos(a)*radius,Math.sin(a)*radius);
          else ctx.lineTo(Math.cos(a)*radius,Math.sin(a)*radius);
        }
        ctx.closePath();ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle='#283c4c';ctx.font='bold 23px system-ui,sans-serif';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(choice==='fish'?'POISSONS':'ACROBATIES',128,132,206);
    }
    const texture=new THREE.CanvasTexture(c);
    texture.colorSpace=THREE.SRGBColorSpace;
    this.textures.push(texture);
    return texture;
  }

  private createPortal(choice:RouteChoice,x:number,color:string):void{
    const y=groundHeight(ROUTE_FORK.portalZ);
    const z=ROUTE_FORK.portalZ;
    const wood=this.colorMaterial('#ad795b');
    const trim=this.colorMaterial(color);
    for(const offset of [-.89,.89]){
      this.box(x+offset,y+1.23,z,.19,2.46,.28,wood);
      this.box(x+offset,y+2.34,z,.31,.20,.36,trim);
    }
    this.box(x,y+2.5,z,2.08,.25,.4,wood);
    this.box(x,y+2.7,z,2.28,.16,.45,trim);

    const signMaterial=new THREE.SpriteMaterial({
      map:this.signTexture(choice),transparent:true,depthWrite:false,alphaTest:.04,
    });
    this.materials.push(signMaterial);
    const sign=new THREE.Sprite(signMaterial);
    sign.position.set(x,y+3.33,z-.27);
    sign.scale.set(2.08,1.43,1);
    this.group.add(sign);
    this.markers.set(choice,sign);
  }

  private createLane(choice:RouteChoice,side:number,color:string):void {
    const vertices:number[]=[];
    const zStart=234,zEnd=260;
    const halfWidth=.38;
    for(let z=zStart;z<zEnd;z+=.8){
      const next=Math.min(zEnd,z+.8);
      const center=(distance:number):number=>{
        const t=Math.max(0,Math.min(1,(distance-zStart)/(ROUTE_FORK.portalZ-zStart)));
        const ease=t*t*(3-2*t);
        return side*(.26+.94*ease);
      };
      const a=center(z),b=center(next);
      const ya=groundHeight(z)+.045;
      const yb=groundHeight(next)+.045;
      vertices.push(
        a-halfWidth,ya,z,b-halfWidth,yb,next,a+halfWidth,ya,z,
        b-halfWidth,yb,next,b+halfWidth,yb,next,a+halfWidth,ya,z,
      );
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    geo.computeVertexNormals();
    const material=new THREE.MeshBasicMaterial({
      color,transparent:true,opacity:.43,side:THREE.DoubleSide,depthWrite:false,
    });
    this.materials.push(material);
    const ribbon=new THREE.Mesh(geo,material);
    ribbon.renderOrder=1;
    this.group.add(ribbon);

    // A bright centerline gives the illusion of two diverging approaches.
    const markers=[236,240,244,248,252];
    const markMaterial=this.colorMaterial(choice==='fish'?'#d4fff2':'#fff0c8');
    for(const z of markers){
      const t=Math.max(0,Math.min(1,(z-zStart)/(ROUTE_FORK.portalZ-zStart)));
      const x=side*(.26+.94*t*t*(3-2*t));
      this.box(x,groundHeight(z)+.067,z,.08,.035,.57,markMaterial);
    }
  }

  update(choice:RouteChoice|null,elapsed:number):void{
    for(const [mode,sprite] of this.markers){
      const size=choice===null?1:choice===mode?1.13:.9;
      sprite.scale.set(2.08*size,1.43*size,1);
      (sprite.material as THREE.SpriteMaterial).opacity=choice!==null && choice!==mode?.38:1;
      sprite.position.y=groundHeight(ROUTE_FORK.portalZ)+3.33+Math.sin(elapsed*2.8+(mode==='fish'?0:1))*.055;
    }
  }

  dispose():void{
    this.group.traverse(object=>{
      if(object instanceof THREE.Mesh)object.geometry.dispose();
    });
    this.materials.forEach(x=>x.dispose());
    this.textures.forEach(x=>x.dispose());
  }
}
