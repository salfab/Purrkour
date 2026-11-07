import * as THREE from 'three';
import {groundHeight,WORLD} from './core';
import {ROUTE_FORK,type RouteChoice} from './routeChoices';
import {ROUTE_CURVE,ROUTE_JOIN_DISTANCE,routePoint,alternativeBranch} from './routeGeometry';

/** Decorative other branch; the chosen branch is rendered by ArtWorld. */
export class RouteForkView {
  readonly group=new THREE.Group();
  private readonly materials:THREE.Material[]=[];
  private readonly textures:THREE.Texture[]=[];
  private readonly branches:Record<RouteChoice,THREE.Group>;
  private readonly markers=new Map<RouteChoice,THREE.Sprite>();
  private disposed=false;

  constructor(){
    const pavement=new THREE.MeshLambertMaterial({color:'#edc9a3',side:THREE.DoubleSide});
    this.materials.push(pavement);
    const image=new THREE.TextureLoader().load(
      `${import.meta.env.BASE_URL}assets/textures/track_pavers.webp`,
      loaded=>{
        if(this.disposed)return;
        loaded.colorSpace=THREE.SRGBColorSpace;
        loaded.wrapS=THREE.RepeatWrapping;
        loaded.wrapT=THREE.RepeatWrapping;
        pavement.map=loaded;
        pavement.needsUpdate=true;
      },
      undefined,()=>console.warn('Purrkour: fork paving fallback'),
    );
    image.colorSpace=THREE.SRGBColorSpace;
    this.textures.push(image);
    this.branches={fish:this.buildRoad('fish',pavement),acro:this.buildRoad('acro',pavement)};
    this.group.add(this.branches.fish,this.branches.acro);
  }
  private material(color:string):THREE.MeshLambertMaterial{
    const m=new THREE.MeshLambertMaterial({color});
    this.materials.push(m);
    return m;
  }
  private box(parent:THREE.Group,x:number,y:number,z:number,w:number,h:number,d:number,mat:THREE.Material):void{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    mesh.position.set(x,y,z);parent.add(mesh);
  }
  private icon(choice:RouteChoice):THREE.CanvasTexture{
    const canvas=document.createElement('canvas');
    canvas.width=256;canvas.height=176;
    const c=canvas.getContext('2d');
    if(c){
      const isFish=choice==='fish';
      c.fillStyle='#334c5b';c.beginPath();c.roundRect(7,7,242,162,27);c.fill();
      c.lineWidth=7;c.strokeStyle='#fff1d7';c.stroke();
      c.fillStyle=isFish?'#64c7bd':'#efb867';
      c.beginPath();c.roundRect(18,18,220,140,18);c.fill();
      c.fillStyle='#fff7e7';
      c.save();c.translate(128,73);
      if(isFish){
        c.beginPath();c.ellipse(-7,0,40,22,0,0,Math.PI*2);c.fill();
        c.beginPath();c.moveTo(25,0);c.lineTo(62,-24);c.lineTo(62,24);c.closePath();c.fill();
        c.fillStyle='#234156';c.beginPath();c.arc(-27,-6,4,0,Math.PI*2);c.fill();
      }else{
        c.beginPath();
        for(let i=0;i<10;i++){
          const a=-Math.PI/2+i*Math.PI/5,r=i%2===0?37:16;
          if(!i)c.moveTo(Math.cos(a)*r,Math.sin(a)*r);
          else c.lineTo(Math.cos(a)*r,Math.sin(a)*r);
        }
        c.closePath();c.fill();
      }
      c.restore();
      c.textAlign='center';c.textBaseline='middle';
      c.fillStyle='#263b49';c.font='bold 23px system-ui';
      c.fillText(isFish?'POISSONS':'ACROBATIES',128,133,208);
    }
    const tex=new THREE.CanvasTexture(canvas);
    tex.colorSpace=THREE.SRGBColorSpace;
    this.textures.push(tex);
    return tex;
  }
  private buildRoad(choice:RouteChoice,pavement:THREE.Material):THREE.Group{
    const group=new THREE.Group();
    const verts:number[]=[],uv:number[]=[];
    const sideVerts:number[]=[],sideUv:number[]=[];
    const half=WORLD.trackWidth/2;
    for(let s=ROUTE_CURVE.split;s<ROUTE_JOIN_DISTANCE;s+=.65){
      const n=Math.min(ROUTE_JOIN_DISTANCE,s+.65);
      const a=routePoint(s,-half,choice,groundHeight(s)-.055);
      const b=routePoint(n,-half,choice,groundHeight(n)-.055);
      const c=routePoint(s,half,choice,groundHeight(s)-.055);
      const d=routePoint(n,half,choice,groundHeight(n)-.055);
      verts.push(a.x,a.y,a.z,b.x,b.y,b.z,c.x,c.y,c.z,
                 b.x,b.y,b.z,d.x,d.y,d.z,c.x,c.y,c.z);
      uv.push(0,s*.45,0,n*.45,2.5,s*.45,0,n*.45,2.5,n*.45,2.5,s*.45);
      // Lower streets support the side houses even on the decorative branch.
      const lower=groundHeight(s)-1.8;
      const lowerNext=groundHeight(n)-1.8;
      for(const [x0,x1] of [[-9.5,-2.7],[2.7,9.5]] as const){
        const e=routePoint(s,x0,choice,lower);
        const f=routePoint(n,x0,choice,lowerNext);
        const g=routePoint(s,x1,choice,lower);
        const h=routePoint(n,x1,choice,lowerNext);
        sideVerts.push(e.x,e.y,e.z,f.x,f.y,f.z,g.x,g.y,g.z,
                       f.x,f.y,f.z,h.x,h.y,h.z,g.x,g.y,g.z);
        sideUv.push(x0*.2,s*.35,x0*.2,n*.35,x1*.2,s*.35,
                    x0*.2,n*.35,x1*.2,n*.35,x1*.2,s*.35);
      }
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geo.computeVertexNormals();
    group.add(new THREE.Mesh(geo,pavement));
    const sideGeometry=new THREE.BufferGeometry();
    sideGeometry.setAttribute('position',new THREE.Float32BufferAttribute(sideVerts,3));
    sideGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(sideUv,2));
    sideGeometry.computeVertexNormals();
    const sidewalk=this.material('#e0bea0');
    group.add(new THREE.Mesh(sideGeometry,sidewalk));
    const retaining=this.material('#c9a080');
    const edging=this.material('#ffe0ae');
    for(let s=ROUTE_CURVE.split+1;s<ROUTE_JOIN_DISTANCE-1;s+=3){
      for(const lane of [-1,1]){
        const point=routePoint(s,lane*(half+.09),choice,groundHeight(s)+.1);
        const curb=new THREE.Mesh(new THREE.BoxGeometry(.18,.22,3),edging);
        curb.position.set(point.x,point.y,point.z);
        curb.rotation.y=point.yaw;
        group.add(curb);
        const wall=new THREE.Mesh(new THREE.BoxGeometry(.16,1.75,3),retaining);
        wall.position.set(point.x,point.y-.95,point.z);
        wall.rotation.y=point.yaw;
        group.add(wall);
      }
    }
    const portalPoint=routePoint(ROUTE_FORK.portalZ,0,choice,groundHeight(ROUTE_FORK.portalZ));
    const portal=new THREE.Group();
    portal.position.set(portalPoint.x,portalPoint.y,portalPoint.z);
    portal.rotation.y=portalPoint.yaw;
    group.add(portal);
    const wood=this.material('#a97654');
    const trim=this.material(choice==='fish'?'#69c5b6':'#f1b65a');
    for(const x of [-1,1]){
      this.box(portal,x,1.2,0,.2,2.4,.3,wood);
      this.box(portal,x,2.35,0,.3,.18,.38,trim);
    }
    this.box(portal,0,2.56,0,2.2,.24,.4,wood);
    this.box(portal,0,2.73,0,2.3,.13,.45,trim);
    const material=new THREE.SpriteMaterial({
      map:this.icon(choice),transparent:true,depthWrite:false,alphaTest:.04,
    });
    this.materials.push(material);
    const sign=new THREE.Sprite(material);
    sign.position.set(0,3.45,-.24);sign.scale.set(2.16,1.48,1);
    portal.add(sign);this.markers.set(choice,sign);
    // A visible house on the side street reinforces the 90-degree turn.
    const houseZ=choice==='fish'?293:299;
    const h=routePoint(houseZ,choice==='fish'?8.1:-8.1,choice,groundHeight(houseZ));
    const house=new THREE.Group();
    house.position.set(h.x,h.y,h.z);house.rotation.y=h.yaw;
    group.add(house);
    this.box(house,0,.95,0,3.5,5.5,8.5,this.material(choice==='fish'?'#f5d8bb':'#ecc1b1'));
    this.box(house,0,3.75,0,3.75,.32,8.7,this.material('#be785a'));
    return group;
  }
  update(chosen:RouteChoice|null,elapsed:number):void{
    this.branches.fish.visible=chosen===null||alternativeBranch(chosen)==='fish';
    this.branches.acro.visible=chosen===null||alternativeBranch(chosen)==='acro';
    for(const [choice,sprite] of this.markers){
      (sprite.material as THREE.SpriteMaterial).opacity=chosen!==null&&choice!==chosen?.70:1;
      sprite.position.y=3.45+.045*Math.sin(elapsed*2.7+(choice==='fish'?0:1));
    }
  }
  dispose():void{
    this.disposed=true;
    this.group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
    this.materials.forEach(m=>m.dispose());
    this.textures.forEach(t=>t.dispose());
  }
}
