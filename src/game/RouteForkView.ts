import * as THREE from 'three';
import {groundHeight,WORLD} from './core';
import {ROUTE_FORK,type RouteChoice} from './routeChoices';
import {
  ROUTE_CURVE,ROUTE_PREVIEW_END,ROUTE_DETOUR_END,FAKE_MERGE,
  branchRoadEdges,routePoint,fakeMergePoint,type WorldPoint,
} from './routeGeometry';

type RoadSampler=(distance:number,lateral:number,height:number)=>WorldPoint;

/**
 * Lightweight optical illusion, not a graph:
 *   - two stable 38-metre preview branches, including the entire S-bend;
 *   - ArtWorld renders the playable road only after their shared seam;
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
  private readonly previewCurb:THREE.Material;
  private readonly previews:Record<RouteChoice,THREE.Group>;
  private readonly portals:Record<RouteChoice,THREE.Group>;
  private readonly joins:Record<RouteChoice,THREE.Group>;
  private readonly signs=new Map<RouteChoice,THREE.Sprite>();

  constructor(sharedMaterials:{pavement:THREE.MeshLambertMaterial;curb:THREE.Material}){
    // The same material & UV scale is used by ArtWorld's main track.
    // We do NOT own or dispose the shared materials.
    this.pavement=sharedMaterials.pavement;
    this.previewCurb=sharedMaterials.curb;
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
    choice:RouteChoice|null=null,
  ):void{
    const vertices:number[]=[];
    const uv:number[]=[];
    const half=WORLD.trackWidth/2;
    for(let s=start;s<end;s+=.45){
      const next=Math.min(end,s+.45);
      const left=choice===null?{min:-half,max:half}:branchRoadEdges(s,choice,half);
      const right=choice===null?{min:-half,max:half}:branchRoadEdges(next,choice,half);
      const a=sampler(s,left.min,groundHeight(s));
      const b=sampler(next,right.min,groundHeight(next));
      const c=sampler(s,left.max,groundHeight(s));
      const d=sampler(next,right.max,groundHeight(next));
      vertices.push(
        a.x,a.y,a.z,b.x,b.y,b.z,c.x,c.y,c.z,
        b.x,b.y,b.z,d.x,d.y,d.z,c.x,c.y,c.z,
      );
      // Coordinates match ArtWorld: the image is not restarted at the seam.
      const u=(x:number):number=>(x+half)*.5;
      const startLeft=choice===null?-half:branchRoadEdges(s,choice,half).min;
      const startRight=choice===null?half:branchRoadEdges(s,choice,half).max;
      const endLeft=choice===null?-half:branchRoadEdges(next,choice,half).min;
      const endRight=choice===null?half:branchRoadEdges(next,choice,half).max;
      uv.push(
        u(startLeft),s*.45,u(endLeft),next*.45,u(startRight),s*.45,
        u(endLeft),next*.45,u(endRight),next*.45,u(startRight),s*.45,
      );
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geometry.computeVertexNormals();
    group.add(new THREE.Mesh(geometry,this.pavement));

    if(!withCurbs)return;
    const curbMaterial=choice===null?this.material('#f8d9a9'):this.previewCurb;
    // Centers sit on the same 2-metre grid as ArtWorld's bordering chunks.
    for(let s=start+1;s<end-1;s+=2){
      const edges=choice===null
        ? {min:-half,max:half}
        : branchRoadEdges(s,choice,half);
      for(const lateral of [edges.min-.1,edges.max+.1]){
        const pos=sampler(s,lateral,groundHeight(s)+.11);
        const curb=new THREE.Mesh(new THREE.BoxGeometry(.24,.26,2),curbMaterial);
        curb.position.set(pos.x,pos.y,pos.z);
        curb.rotation.y=pos.yaw;
        group.add(curb);
      }
    }
  }

  private buildPreview(choice:RouteChoice):THREE.Group{
    const preview=new THREE.Group();
    const sampler:RoadSampler=(s,x,y)=>routePoint(s,x,choice,y);
    // The Y and the entire S-bend are one permanent mesh, all the way to
    // 288 m. ArtWorld begins exactly at 288, with the same UVs and material.
    this.addRoad(preview,ROUTE_CURVE.split,ROUTE_PREVIEW_END,sampler,true,choice);
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
    const nearby=distance<ROUTE_PREVIEW_END+24;
    for(const mode of ['fish','acro'] as const){
      // Both short previews remain stable through commitment: no mesh swap
      // at 250 m. The camera leaves them behind before they are hidden.
      this.previews[mode].visible=nearby;
      this.portals[mode].visible=distance<ROUTE_PREVIEW_END+12;
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
    this.group.traverse(object=>{
      if(object instanceof THREE.Mesh)object.geometry.dispose();
    });
    this.materials.forEach(material=>material.dispose());
    this.textures.forEach(texture=>texture.dispose());
  }
}
