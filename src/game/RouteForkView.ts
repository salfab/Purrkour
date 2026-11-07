import * as THREE from 'three';
import {groundHeight,WORLD} from './core';
import {ROUTE_FORK,type RouteChoice} from './routeChoices';
import {
  ROUTE_CURVE,ROUTE_DETOUR_END,FAKE_MERGE,
  routePoint,fakeMergePoint,alternativeBranch,type WorldPoint,
} from './routeGeometry';

type RoadSampler=(distance:number,lateral:number,height:number)=>WorldPoint;

/**
 * Lightweight optical illusion, not a graph:
 *   - two SHORT approach ribbons while the player chooses;
 *   - only ArtWorld renders the chosen playable road;
 *   - one SHORT 45° slip road appears near the reunion.
 *
 * The old v0.12 rendered hundreds of metres of both tracks for no gameplay
 * reason. This version never creates such a mesh.
 */
export class RouteForkView {
  readonly group=new THREE.Group();
  private readonly materials:THREE.Material[]=[];
  private readonly textures:THREE.Texture[]=[];
  private readonly pavement:THREE.MeshLambertMaterial;
  private readonly previews:Record<RouteChoice,THREE.Group>;
  private readonly portals:Record<RouteChoice,THREE.Group>;
  private readonly joins:Record<RouteChoice,THREE.Group>;
  private readonly signs=new Map<RouteChoice,THREE.Sprite>();
  private disposed=false;

  constructor(){
    this.pavement=new THREE.MeshLambertMaterial({color:'#f0caa9',side:THREE.DoubleSide});
    this.materials.push(this.pavement);
    const texture=new THREE.TextureLoader().load(
      `${import.meta.env.BASE_URL}assets/textures/track_pavers.webp`,
      loaded=>{
        if(this.disposed)return;
        loaded.colorSpace=THREE.SRGBColorSpace;
        loaded.wrapS=THREE.RepeatWrapping;
        loaded.wrapT=THREE.RepeatWrapping;
        this.pavement.map=loaded;
        this.pavement.needsUpdate=true;
      },
      undefined,
      ()=>console.warn('Purrkour: fork paving fallback'),
    );
    texture.colorSpace=THREE.SRGBColorSpace;
    this.textures.push(texture);
    this.previews={
      fish:this.buildPreview('fish'),
      acro:this.buildPreview('acro'),
    };
    this.portals={
      fish:this.buildPortal('fish'),
      acro:this.buildPortal('acro'),
    };
    this.joins={
      fish:this.buildJoin('fish'),
      acro:this.buildJoin('acro'),
    };
    this.group.add(
      this.previews.fish,this.previews.acro,
      this.portals.fish,this.portals.acro,
      this.joins.fish,this.joins.acro,
    );
  }

  private material(color:string):THREE.MeshLambertMaterial{
    const m=new THREE.MeshLambertMaterial({color});
    this.materials.push(m);
    return m;
  }

  private addRoad(
    group:THREE.Group,
    start:number,
    end:number,
    sampler:RoadSampler,
    withCurbs:boolean,
  ):void{
    const vertices:number[]=[];
    const uv:number[]=[];
    const half=WORLD.trackWidth/2;
    for(let s=start;s<end;s+=.45){
      const next=Math.min(end,s+.45);
      const a=sampler(s,-half,groundHeight(s)-.055);
      const b=sampler(next,-half,groundHeight(next)-.055);
      const c=sampler(s,half,groundHeight(s)-.055);
      const d=sampler(next,half,groundHeight(next)-.055);
      vertices.push(
        a.x,a.y,a.z,b.x,b.y,b.z,c.x,c.y,c.z,
        b.x,b.y,b.z,d.x,d.y,d.z,c.x,c.y,c.z,
      );
      uv.push(
        0,s*.45,0,next*.45,2.5,s*.45,
        0,next*.45,2.5,next*.45,2.5,s*.45,
      );
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geometry.computeVertexNormals();
    group.add(new THREE.Mesh(geometry,this.pavement));

    if(!withCurbs)return;
    const curbMaterial=this.material('#f8d9a9');
    for(let s=start+1;s<end-1;s+=2.1){
      for(const lateral of [-half-.1,half+.1]){
        const pos=sampler(s,lateral,groundHeight(s)+.11);
        const curb=new THREE.Mesh(new THREE.BoxGeometry(.18,.22,2.15),curbMaterial);
        curb.position.set(pos.x,pos.y,pos.z);
        curb.rotation.y=pos.yaw;
        group.add(curb);
      }
    }
  }

  private buildPreview(choice:RouteChoice):THREE.Group{
    const preview=new THREE.Group();
    const sampler:RoadSampler=(s,x,y)=>routePoint(s,x,choice,y);
    // Just 22 metres to make the split readable; the chosen path takes over.
    this.addRoad(
      preview,ROUTE_CURVE.split,Math.min(ROUTE_DETOUR_END,272),sampler,true,
    );
    return preview;
  }

  private buildJoin(chosen:RouteChoice):THREE.Group{
    const join=new THREE.Group();
    const sampler:RoadSampler=(s,x,y)=>fakeMergePoint(s,x,chosen,y);
    // Not connected to anything behind the visible window. It arrives at 45°
    // from the side the player DID NOT choose, and merges exactly at 410 m.
    this.addRoad(join,FAKE_MERGE.start,FAKE_MERGE.end,sampler,true);
    return join;
  }

  private icon(choice:RouteChoice):THREE.CanvasTexture{
    const canvas=document.createElement('canvas');
    canvas.width=256;canvas.height=176;
    const ctx=canvas.getContext('2d');
    if(ctx){
      const isFish=choice==='fish';
      ctx.fillStyle='#314b5a';ctx.beginPath();ctx.roundRect(7,7,242,162,25);ctx.fill();
      ctx.strokeStyle='#fff4dc';ctx.lineWidth=7;ctx.stroke();
      ctx.fillStyle=isFish?'#65c9b7':'#f0b96b';
      ctx.beginPath();ctx.roundRect(18,18,220,140,19);ctx.fill();
      ctx.fillStyle='#fff9ed';
      ctx.save();ctx.translate(128,72);
      if(isFish){
        ctx.beginPath();ctx.ellipse(-7,0,40,22,0,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.moveTo(25,0);ctx.lineTo(62,-24);ctx.lineTo(62,24);ctx.closePath();ctx.fill();
        ctx.fillStyle='#304858';ctx.beginPath();ctx.arc(-26,-6,4,0,Math.PI*2);ctx.fill();
      }else{
        ctx.beginPath();
        for(let i=0;i<10;i++){
          const a=-Math.PI/2+i*Math.PI/5;
          const r=i%2===0?37:16;
          if(i===0)ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);
          else ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
        }
        ctx.closePath();ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle='#263d4f';ctx.font='bold 22px system-ui';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(isFish?'POISSONS':'ACROBATIES',128,132,208);
    }
    const texture=new THREE.CanvasTexture(canvas);
    texture.colorSpace=THREE.SRGBColorSpace;
    this.textures.push(texture);
    return texture;
  }

  private buildPortal(choice:RouteChoice):THREE.Group{
    const z=ROUTE_FORK.portalZ;
    const position=routePoint(z,0,choice,groundHeight(z));
    const group=new THREE.Group();
    group.position.set(position.x,position.y,position.z);
    group.rotation.y=position.yaw;
    const wood=this.material('#a87856');
    const accent=this.material(choice==='fish'?'#69c8b7':'#f0ba69');
    const box=(x:number,y:number,w:number,h:number,d:number,mat:THREE.Material):void=>{
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
      mesh.position.set(x,y,0);
      group.add(mesh);
    };
    for(const x of [-.94,.94]){
      box(x,1.21,.20,2.42,.30,wood);
      box(x,2.35,.31,.19,.36,accent);
    }
    box(0,2.55,2.16,.24,.41,wood);
    box(0,2.71,2.26,.13,.42,accent);
    const spriteMaterial=new THREE.SpriteMaterial({
      map:this.icon(choice),transparent:true,depthWrite:false,alphaTest:.04,
    });
    this.materials.push(spriteMaterial);
    const sign=new THREE.Sprite(spriteMaterial);
    sign.position.set(0,3.37,-.25);
    sign.scale.set(2.10,1.43,1);
    group.add(sign);
    this.signs.set(choice,sign);
    return group;
  }

  update(chosen:RouteChoice|null,elapsed:number,distance:number):void{
    const approaching=distance<ROUTE_DETOUR_END+10;
    for(const mode of ['fish','acro'] as const){
      // ArtWorld takes ownership of selected pavement at the choice point;
      // keep only a very short glimpse of the unchosen dead-end.
      this.previews[mode].visible=approaching&&(chosen===null||mode===alternativeBranch(chosen));
      this.portals[mode].visible=distance<275;
    }
    for(const [mode,sign] of this.signs){
      sign.position.y=3.37+Math.sin(elapsed*2.8+(mode==='fish'?0:1))*.05;
    }
    for(const mode of ['fish','acro'] as const){
      // Each optional join is 19 metres long. No long inactive route exists.
      this.joins[mode].visible=chosen===mode &&
        distance>=FAKE_MERGE.start-60&&distance<FAKE_MERGE.end+10;
    }
  }

  dispose():void{
    this.disposed=true;
    this.group.traverse(object=>{
      if(object instanceof THREE.Mesh)object.geometry.dispose();
    });
    this.materials.forEach(material=>material.dispose());
    this.textures.forEach(texture=>texture.dispose());
  }
}
