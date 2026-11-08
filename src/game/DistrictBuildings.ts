import * as THREE from 'three';
import {
  DISTRICTS,type HouseProfile,type DistrictKey,
  type HouseArchetype,
} from './districts';

export interface DistrictMaterialSources{
  readonly cream:THREE.MeshLambertMaterial;
  readonly peach:THREE.MeshLambertMaterial;
  readonly roof:THREE.MeshLambertMaterial;
  readonly window:THREE.MeshBasicMaterial;
  readonly banner:THREE.MeshBasicMaterial;
  readonly flower:THREE.SpriteMaterial;
}

/**
 * Mobile-first architectural kit, not preexisting boxes with new textures.
 *
 * - Five independently shaped building masses (gable, terrace, stepped,
 *   tower, shop)
 * - Genuine two-sided sloped roofs and compact hipped tower roofs, no floating
 *   horizontal roof slats
 * - Shared geometry and materials; only instance transforms are allocated
 *   for each generated building
 * - District-specific facade modules. Neither collision nor Griffe is
 *   advertised by these purely decorative, out-of-reach elements.
 */
export class DistrictBuildings{
  private readonly materials:THREE.Material[]=[];
  private readonly textures:THREE.Texture[]=[];
  private readonly facade=new Map<DistrictKey,readonly [THREE.MeshLambertMaterial,THREE.MeshLambertMaterial]>();
  private readonly roofs=new Map<DistrictKey,THREE.MeshLambertMaterial>();
  private readonly accents=new Map<DistrictKey,THREE.MeshLambertMaterial>();
  private readonly shutters=new Map<DistrictKey,THREE.MeshLambertMaterial>();
  private readonly trims=new Map<DistrictKey,THREE.MeshLambertMaterial>();
  private readonly leaves=new Map<DistrictKey,THREE.MeshLambertMaterial>();
  private readonly doors=new Map<DistrictKey,THREE.MeshLambertMaterial>();
  private readonly glow=new THREE.MeshBasicMaterial({color:'#ffe2a1',toneMapped:false});
  private readonly boxGeometry=new THREE.BoxGeometry(1,1,1);
  private readonly leafGeometry=new THREE.IcosahedronGeometry(1,0);
  private readonly hipRoofGeometry=new THREE.ConeGeometry(.77,1,4);
  private readonly gableGeometry=this.makeGableGeometry();
  private readonly awningGeometry=this.makeAwningGeometry();
  private readonly shadeTexture=this.makeStripedTexture();
  private readonly awningMaterial=new THREE.MeshLambertMaterial({
    map:this.shadeTexture,side:THREE.DoubleSide,transparent:false,
  });

  constructor(private readonly sources:DistrictMaterialSources){
    this.materials.push(this.glow,this.awningMaterial);
    const lambert=(color:string,map?:THREE.Texture|null):THREE.MeshLambertMaterial=>{
      const m=new THREE.MeshLambertMaterial({
        color,map:map??null,side:THREE.DoubleSide,
      });
      this.materials.push(m);
      return m;
    };
    for(const d of DISTRICTS){
      this.facade.set(d.key,[
        lambert(d.walls[0],sources.cream.map),
        lambert(d.walls[1],sources.peach.map),
      ]);
      this.roofs.set(d.key,lambert(d.roof,sources.roof.map));
      this.accents.set(d.key,lambert(d.accent));
      this.shutters.set(d.key,lambert(d.shutter));
      this.trims.set(d.key,lambert(d.trim));
      this.leaves.set(d.key,lambert(d.foliage));
      this.doors.set(d.key,lambert(d.key==='twilight'?'#544d79':'#658f92'));
    }
  }

  /** Four slopes meeting at a real ridge, plus two filled triangular gables. */
  private makeGableGeometry():THREE.BufferGeometry{
    // Normalized x[-.5,.5], y[0,1], z[-.5,.5].
    const positions=[
      -.5,0,-.5, -.5,0,.5, 0,1,-.5,
      -.5,0,.5, 0,1,.5, 0,1,-.5,
      0,1,-.5, 0,1,.5, .5,0,-.5,
      0,1,.5, .5,0,.5, .5,0,-.5,
      -.5,0,-.5, 0,1,-.5, .5,0,-.5,
      .5,0,.5, 0,1,.5, -.5,0,.5,
    ];
    const uv:number[]=[];
    for(let face=0;face<6;face++)uv.push(0,0,0,1,1,0);
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    g.computeVertexNormals();
    return g;
  }

  /** A real canopy surface extends in X and Z. It is not a fence or a slat. */
  private makeAwningGeometry():THREE.BufferGeometry{
    const p=[
      0,0,-.5, 1,-.25,-.5, 0,0,.5,
      1,-.25,-.5, 1,-.25,.5, 0,0,.5,
    ];
    const uv=[0,0,1,0,0,1,1,0,1,1,0,1];
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    g.computeVertexNormals();return g;
  }

  /** A shared small painted cloth texture with stripes along the street. */
  private makeStripedTexture():THREE.CanvasTexture{
    const canvas=document.createElement('canvas');
    canvas.width=128;canvas.height=64;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('Canvas 2D required for district awnings');
    ctx.fillStyle='#fef1d7';ctx.fillRect(0,0,128,64);
    for(let x=0;x<128;x+=32){
      ctx.fillStyle=(x/32)%2===0?'#d88776':'#9bbdc0';
      ctx.fillRect(x,0,16,64);
    }
    const t=new THREE.CanvasTexture(canvas);
    t.colorSpace=THREE.SRGBColorSpace;
    t.generateMipmaps=false;
    t.minFilter=THREE.LinearFilter;
    t.magFilter=THREE.LinearFilter;
    this.textures.push(t);return t;
  }

  /** Reuse already-loaded painting from the project; do not duplicate GPU maps. */
  refreshTextures():void{
    for(const [key,pair] of this.facade){
      pair[0].map=this.sources.cream.map;
      pair[1].map=this.sources.peach.map;
      pair[0].needsUpdate=true;
      pair[1].needsUpdate=true;
      const roof=this.roofs.get(key);
      if(roof){roof.map=this.sources.roof.map;roof.needsUpdate=true;}
    }
  }

  private material(
    palette:Map<DistrictKey,THREE.MeshLambertMaterial>,key:DistrictKey,
  ):THREE.MeshLambertMaterial{
    return palette.get(key)??this.sources.cream;
  }

  private box(
    group:THREE.Group,x:number,y:number,z:number,
    width:number,height:number,depth:number,material:THREE.Material,
  ):THREE.Mesh{
    const mesh=new THREE.Mesh(this.boxGeometry,material);
    mesh.scale.set(width,height,depth);
    mesh.position.set(x,y,z);
    group.add(mesh);return mesh;
  }

  private roof(
    group:THREE.Group,
    p:HouseProfile,x:number,top:number,z:number,
    w:number,d:number,kind:'gable'|'flat'|'hip',
  ):void{
    const key=p.district.key;
    const tiles=this.material(this.roofs,key);
    const trim=this.material(this.trims,key);
    if(kind==='gable'){
      const roof=new THREE.Mesh(this.gableGeometry,tiles);
      const rise=Math.min(1.08,.54+w*.085);
      roof.scale.set(w+.52,rise,d+.4);
      roof.position.set(x,top-.05,z);
      group.add(roof);
      // Simple eaves at the SAME roof edge, not separate tilted beams.
      for(const side of [-1,1]){
        this.box(group,x+side*(w/2+.25),top-.04,z,.11,.10,d+.42,trim);
      }
    }else if(kind==='hip'){
      this.box(group,x,top+.04,z,w+.25,.12,d+.25,trim);
      const roof=new THREE.Mesh(this.hipRoofGeometry,tiles);
      roof.scale.set(w*.74,1.10,d*.70);
      roof.position.set(x,top+.62,z);
      roof.rotation.y=Math.PI/4;
      group.add(roof);
    }else{
      // Flat roof, raised parapet follows the actual perimeter.
      this.box(group,x,top+.07,z,w+.22,.15,d+.22,tiles);
      this.box(group,x-w/2,top+.30,z,.17,.39,d+.22,trim);
      this.box(group,x+w/2,top+.30,z,.17,.39,d+.22,trim);
      this.box(group,x,top+.30,z-d/2,.13,.39,w*.08+0.17,trim);
      // Rear parapet is small and never becomes a levitating slat.
    }
  }

  private facadeWindow(
    group:THREE.Group,p:HouseProfile,inner:number,
    y:number,z:number,width=1.0,height=1.40,
  ):void{
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(width,height),this.sources.window);
    plane.position.set(inner-p.side*.055,y,z);
    plane.rotation.y=p.side===-1?Math.PI/2:-Math.PI/2;
    group.add(plane);
    const shutter=this.material(this.shutters,p.district.key);
    for(const delta of [-width/2-.15,width/2+.15]){
      this.box(group,inner-p.side*.12,y,z+delta,.08,height*.91,.24,shutter);
    }
    const trim=this.material(this.trims,p.district.key);
    this.box(group,inner-p.side*.12,y-height/2-.08,z,.12,.12,width+.38,trim);
  }

  private frontDoor(
    group:THREE.Group,p:HouseProfile,inner:number,
    base:number,z:number,
  ):void{
    const door=this.material(this.doors,p.district.key);
    const frame=this.material(this.trims,p.district.key);
    this.box(group,inner-p.side*.065,base+.91,z,.10,1.81,.98,door);
    for(const offset of [-.55,.55]){
      this.box(group,inner-p.side*.13,base+.98,z+offset,.16,1.97,.15,frame);
    }
    this.box(group,inner-p.side*.13,base+1.98,z,.16,.13,1.23,frame);
    this.box(group,inner-p.side*.15,base+.93,z+.27,.11,.08,.08,frame);
  }

  private leaf(
    group:THREE.Group,x:number,y:number,z:number,size:number,
    material:THREE.Material,
  ):void{
    const mesh=new THREE.Mesh(this.leafGeometry,material);
    mesh.position.set(x,y,z);
    mesh.scale.set(size*.9,size,size*.72);
    group.add(mesh);
  }

  private buildingMass(
    group:THREE.Group,p:HouseProfile,
    x:number,base:number,z:number,w:number,h:number,d:number,
    roof:'gable'|'flat'|'hip',
    colorIndex:number,
  ):void{
    const walls=this.facade.get(p.district.key);
    const wall=walls?.[colorIndex%2]??this.sources.cream;
    this.box(group,x,base+h/2,z,w,h,d,wall);
    this.roof(group,p,x,base+h,z,w,d,roof);
    const trim=this.material(this.trims,p.district.key);
    // A low, painted foundation gives the silhouette a grounded base.
    this.box(group,x,base+.15,z,w+.07,.30,d+.08,trim);
  }

  private awning(
    group:THREE.Group,p:HouseProfile,inner:number,
    y:number,z:number,depth:number,
  ):void{
    const canopy=new THREE.Mesh(this.awningGeometry,this.awningMaterial);
    canopy.position.set(inner-p.side*.06,y,z);
    canopy.scale.set(-p.side*.94,1,depth);
    group.add(canopy);
    const accent=this.material(this.accents,p.district.key);
    this.box(group,inner-p.side*.99,y-.27,z,.13,.14,depth,accent);
  }

  private architecture(
    group:THREE.Group,p:HouseProfile,base:number,
  ):{readonly inner:number;readonly mainTop:number}{
    const {centerX:x,z,width:w,height:h,depth:d,archetype:kind}=p;
    const inside=(width:number,cx:number)=>p.side*(Math.abs(cx)-width/2);
    if(kind==='tower'){
      // A narrow upper tower breaks up the repeated rectangular skyline.
      this.buildingMass(group,p,x,base,z,w,h*.74,d,'flat',p.variation);
      const towerWidth=w*.64;
      const upperX=x+p.side*.34;
      this.buildingMass(
        group,p,upperX,base+h*.74,z-.4,towerWidth,h*.58,d*.60,
        'hip',p.variation+1,
      );
      return {inner:inside(w,x),mainTop:base+h*.74};
    }
    if(kind==='stepped'){
      this.buildingMass(group,p,x,base,z,w,h*.70,d,'flat',p.variation);
      const upperWidth=w*.71;
      const upperX=x+p.side*.45;
      this.buildingMass(
        group,p,upperX,base+h*.70,z-.5,upperWidth,h*.40,d*.62,
        'gable',p.variation+1,
      );
      return {inner:inside(w,x),mainTop:base+h*.70};
    }
    if(kind==='terrace'){
      this.buildingMass(group,p,x,base,z,w,h,d,'flat',p.variation);
      return {inner:inside(w,x),mainTop:base+h};
    }
    if(kind==='shop'){
      this.buildingMass(group,p,x,base,z,w,h,d,'flat',p.variation);
      return {inner:inside(w,x),mainTop:base+h};
    }
    this.buildingMass(group,p,x,base,z,w,h,d,'gable',p.variation);
    return {inner:inside(w,x),mainTop:base+h};
  }

  add(group:THREE.Group,p:HouseProfile,floor:number):void{
    const {district,side,z,width,height,depth,archetype:kind}=p;
    const id=district.key;
    const base=floor-1.8;
    const {inner,mainTop}=this.architecture(group,p,base);
    this.frontDoor(group,p,inner,base,z+depth*.23);
    // Restrict opening sizes/heights to the actual facade mass (not the tower).
    const high=height>6.45 && kind!=='shop';
    const windowY=base+Math.min(3.1,height*.58);
    for(const offset of [-depth*.23,depth*.20]){
      this.facadeWindow(group,p,inner,windowY,z+offset,
        p.compact?.78:1.0,p.compact?1.12:1.37);
    }
    if(high){
      this.facadeWindow(
        group,p,inner,Math.min(mainTop-.85,base+height*.83),
        z-depth*.09,.80,1.08,
      );
    }

    const accent=this.material(this.accents,id);
    const trim=this.material(this.trims,id);
    const foliage=this.material(this.leaves,id);
    if(id==='old-town'){
      // Rounded rhythm from warm stucco cornices and flower ledges.
      this.box(group,inner-side*.16,base+2.09,z+depth*.23,.27,.14,1.38,trim);
      if(p.variation%2===0){
        this.leaf(group,inner-side*.33,base+2.23,z+depth*.38,.33,foliage);
      }
    }else if(id==='market'){
      this.awning(group,p,inner,base+3.25,z,Math.min(depth*.54,3.3));
      if(!p.compact){
        this.box(group,inner-side*.32,base+.47,z-depth*.22,.48,.6,.65,accent);
        this.box(group,inner-side*.32,base+.47,z+depth*.02,.48,.6,.65,accent);
        for(const offset of [-depth*.22,depth*.02]){
          this.leaf(group,inner-side*.32,base+.87,z+offset,.22,foliage);
        }
      }
    }else if(id==='gardens'){
      // Low believable balcony with supporting brackets, never floating
      // bars that look like interactive Griffe indicators.
      const balconyY=Math.min(mainTop-.55,base+3.6);
      this.box(group,inner-side*.38,balconyY,z-depth*.12,.70,.15,depth*.45,trim);
      for(const offset of [-depth*.29,depth*.06]){
        this.box(group,inner-side*.19,balconyY-.27,z+offset,.24,.50,.22,accent);
      }
      this.box(group,inner-side*.67,balconyY+.39,z-depth*.12,.10,.55,depth*.42,accent);
      for(let i=0;i<4;i++){
        const off=z-depth*.27+i*depth*.10;
        this.leaf(group,inner-side*.66,balconyY+.62,off,.32+(i%2)*.08,foliage);
      }
      // Vines cling to the facade rather than floating in front of the roof.
      for(const off of [-depth*.32,depth*.32]){
        this.box(group,inner-side*.09,base+1.63,z+off,.09,2.10,.12,foliage);
        this.leaf(group,inner-side*.19,base+2.4,z+off,.30,foliage);
      }
    }else{
      // Evening windows and readable warm lanterns mounted on the facade.
      for(const off of [-depth*.29,depth*.32]){
        const lantern=this.box(
          group,inner-side*.30,base+3.45,z+off,.33,.54,.34,this.glow,
        );
        lantern.renderOrder=1;
        this.box(group,inner-side*.30,base+3.77,z+off,.34,.10,.36,accent);
      }
      this.box(group,inner-side*.12,base+2.17,z+depth*.23,.20,.16,1.3,trim);
    }
  }

  dispose():void{
    this.materials.forEach(m=>m.dispose());
    this.textures.forEach(t=>t.dispose());
    this.boxGeometry.dispose();
    this.leafGeometry.dispose();
    this.hipRoofGeometry.dispose();
    this.gableGeometry.dispose();
    this.awningGeometry.dispose();
  }
}
