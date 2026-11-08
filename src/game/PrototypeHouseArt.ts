import * as THREE from 'three';
import type {DistrictKey} from './districts';

/** Shared decorative house kit, used by default and in the volume preview. */
export const PROTOTYPE_HOUSE={
  chunk:5,side:-1,front:5.15,width:10.2,height:6.8,depth:3.8,
  roofRise:1.25,awningProjection:1.2,
} as const;

export function isVolumeHousePreview(query:string):boolean{
  return new URLSearchParams(query).get('housePreview')==='volume';
}
export function isVolumeStreet(query:string):boolean{
  const value=new URLSearchParams(query).get('housePreview');
  return value===null||value==='volume';
}

export class PrototypeHouseArt{
  private readonly box=new THREE.BoxGeometry(1,1,1);
  private readonly plane=new THREE.PlaneGeometry(1,1);
  private readonly circle=new THREE.CircleGeometry(1,12);
  private readonly textures:THREE.Texture[]=[];
  private readonly facade=new THREE.MeshBasicMaterial({color:'#ffffff'});
  private readonly facades=[this.facade,new THREE.MeshBasicMaterial(),new THREE.MeshBasicMaterial(),new THREE.MeshBasicMaterial()];
  private readonly endFacades=[new THREE.MeshBasicMaterial(),new THREE.MeshBasicMaterial(),new THREE.MeshBasicMaterial()];
  private readonly marketEndNew=new THREE.MeshBasicMaterial();
  private readonly districts=new Map<DistrictKey,{front:THREE.MeshBasicMaterial;frontAlt:THREE.MeshBasicMaterial;frontThird:THREE.MeshBasicMaterial;end:THREE.MeshBasicMaterial;endAlt:THREE.MeshBasicMaterial|null;endNew:THREE.MeshBasicMaterial;started:boolean}>();
  private readonly wall=new THREE.MeshBasicMaterial({color:'#e8c7b2'});
  private readonly gableBase=new THREE.MeshBasicMaterial();
  private readonly gables={
    market:['#ed9978','#f5c582','#efa09b'].map(color=>new THREE.MeshBasicMaterial({color})),
    'old-town':new THREE.MeshBasicMaterial({color:'#edbb79'}),
    gardens:new THREE.MeshBasicMaterial({color:'#a9c58a'}),
    twilight:new THREE.MeshBasicMaterial({color:'#b981a7'}),
  };
  private readonly atticGlass=new THREE.MeshBasicMaterial({color:'#526e79',side:THREE.DoubleSide});
  private readonly roof=new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide});
  private readonly trim=new THREE.MeshBasicMaterial({color:'#f0d3ad'});
  private readonly wood=new THREE.MeshBasicMaterial({color:'#866449'});
  private readonly cloth=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
  private readonly geometries:THREE.BufferGeometry[]=[this.box,this.plane,this.circle];
  private template:THREE.Group|null=null;
  private disposed=false;

  constructor(){
    for(const key of ['old-town','gardens','twilight'] as const){
      this.districts.set(key,{front:new THREE.MeshBasicMaterial(),frontAlt:new THREE.MeshBasicMaterial(),frontThird:new THREE.MeshBasicMaterial(),end:new THREE.MeshBasicMaterial(),endAlt:key==='old-town'?null:new THREE.MeshBasicMaterial(),endNew:new THREE.MeshBasicMaterial(),started:false});
    }
    void this.load();
  }

  private async load():Promise<void>{
    const base=`${import.meta.env.BASE_URL}assets/`;
    const loader=new THREE.TextureLoader();
    try{
      const sources:readonly [string,THREE.MeshBasicMaterial,boolean][]=[
        ['illustrated-houses/prototype-facade-v1.png',this.facade,false],
        ['illustrated-houses/prototype-facade-v2.png',this.facades[1]!,false],
        ['illustrated-houses/prototype-facade-v3.png',this.facades[2]!,false],
        ['illustrated-houses/district-market-front-new.webp',this.facades[3]!,false],
        ['architecture/stucco_peach_painted.png',this.wall,true],
        ['architecture/stucco_cream_painted.png',this.gableBase,true],
        ['illustrated-houses/prototype-roof-v1.png',this.roof,true],
        ['illustrated-houses/prototype-end-v1.png',this.endFacades[0]!,false],
        ['illustrated-houses/prototype-end-v2.png',this.endFacades[1]!,false],
        ['illustrated-houses/prototype-end-v3.png',this.endFacades[2]!,false],
        ['illustrated-houses/district-market-end-new.webp',this.marketEndNew,false],
      ];
      await Promise.all(sources.map(async ([file,material,tiled])=>{
        const texture=await loader.loadAsync(base+file);
        if(this.disposed){texture.dispose();return;}
        texture.colorSpace=THREE.SRGBColorSpace;
        texture.anisotropy=4;
        if(tiled){
          texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
          texture.repeat.set(material===this.roof ? 2 : 1.5,material===this.roof ? .8 : 2);
        }
        this.textures.push(texture);
        material.map=texture;material.needsUpdate=true;
      }));
      for(const material of [...this.gables.market,this.gables['old-town'],this.gables.gardens,this.gables.twilight]){
        material.map=this.gableBase.map;material.needsUpdate=true;
      }
      for(const district of this.districts.values()){
        if(!district.front.map){district.front.map=this.facade.map;district.front.needsUpdate=true;}
        if(!district.frontAlt.map){district.frontAlt.map=district.front.map;district.frontAlt.needsUpdate=true;}
        if(!district.frontThird.map){district.frontThird.map=district.front.map;district.frontThird.needsUpdate=true;}
        if(!district.end.map){district.end.map=this.endFacades[0]!.map;district.end.needsUpdate=true;}
        if(district.endAlt&&!district.endAlt.map){district.endAlt.map=this.endFacades[0]!.map;district.endAlt.needsUpdate=true;}
        if(!district.endNew.map){district.endNew.map=district.end.map;district.endNew.needsUpdate=true;}
      }
      if(!this.disposed)document.documentElement.dataset.volumeHouseReady='true';
    }catch(error){
      if(!this.disposed)document.documentElement.dataset.volumeHouseReady='error';
      console.warn('Purrkour: prototype house textures unavailable',error);
    }
  }

  private loadDistrict(key:DistrictKey):void{
    const district=this.districts.get(key);
    if(!district||district.started)return;
    district.started=true;
    const loader=new THREE.TextureLoader();
    const parts:Array<[string,THREE.MeshBasicMaterial]>=[['front',district.front],['front-alt',district.frontAlt],['front-new',district.frontThird],['end',district.end],['end-new',district.endNew]];
    if(district.endAlt)parts.push(['end-alt',district.endAlt]);
    for(const [part,material] of parts){
      const extension=part==='front-alt'||part==='front-new'||part==='end-new'?'webp':'png';
      void loader.loadAsync(`${import.meta.env.BASE_URL}assets/illustrated-houses/district-${key}-${part}.${extension}`)
        .then(texture=>{
          if(this.disposed){texture.dispose();return;}
          texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
          this.textures.push(texture);material.map=texture;material.needsUpdate=true;
          document.documentElement.dataset[`districtArt${key.replaceAll('-','')}${part.replaceAll('-','')}`]='ready';
        })
        .catch(error=>console.warn(`Purrkour: ${key} ${part} unavailable`,error));
    }
  }

  private mesh(group:THREE.Group,geometry:THREE.BufferGeometry,material:THREE.Material,
    position:readonly [number,number,number],scale:readonly [number,number,number]):THREE.Mesh{
    const mesh=new THREE.Mesh(geometry,material);
    mesh.position.set(...position);mesh.scale.set(...scale);
    // These assets are owned by this kit, not by a streamed chunk.
    mesh.userData.sharedHouseSpriteGeometry=true;
    group.add(mesh);return mesh;
  }

  private surface(vertices:number[],uv:number[]):THREE.BufferGeometry{
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geometry.computeVertexNormals();this.geometries.push(geometry);return geometry;
  }

  add(parent:THREE.Object3D,z:number,ground:number,side:-1|1=-1,variant=-1,district:DistrictKey='market'):THREE.Group{
    if(this.template){
      const house=this.template.clone();
      this.place(house,z,ground,side,variant,district);
      parent.add(house);return house;
    }
    const {width:w,height:h,depth:d,roofRise:r}=PROTOTYPE_HOUSE;
    const house=new THREE.Group();house.name='painted-volume-house';
    house.position.set(-PROTOTYPE_HOUSE.front,ground-1.8,z);
    house.rotation.y=Math.PI/2;
    parent.add(house);
    this.mesh(house,this.box,this.wall,[0,h/2,-d/2],[w,h,d]);
    this.mesh(house,this.plane,this.facade,[0,h/2,.012],[w,h,1]).name='front-facade';
    this.mesh(house,this.box,this.trim,[0,.1,-d/2],[w+.12,.2,d+.12]);

    // Two genuine pitched surfaces: front eave -> ridge -> rear eave.
    const a=-w/2-.28,b=w/2+.28,front=.4,back=-d-.4,ridge=-d/2;
    const top=h+.12;
    const slopes=this.surface([
      a,top,front,b,top,front,a,top+r,ridge,
      b,top,front,b,top+r,ridge,a,top+r,ridge,
      a,top+r,ridge,b,top+r,ridge,a,top,back,
      b,top+r,ridge,b,top,back,a,top,back,
    ],[0,0,1,0,0,1,1,0,1,1,0,1,0,0,1,0,0,1,1,0,1,1,0,1]);
    this.mesh(house,slopes,this.roof,[0,0,0],[1,1,1]).name='roof-pitched';
    this.mesh(house,this.box,this.wall,[0,top+.1,-d/2],[w+.3,.2,d+.3]).name='roof-flat';
    for(const z of [-d-.1,.1])this.mesh(house,this.box,this.trim,[0,top+.24,z],[w+.35,.24,.18]).name='roof-flat';
    for(const x of [-w/2,w/2])this.mesh(house,this.box,this.trim,[x,top+.24,-d/2],[.18,.24,d]).name='roof-flat';
    // Filled gable ends close the roof instead of leaving two floating sheets.
    for(const x of [-w/2,w/2]){
      const gable=this.surface([
        x,top,0,x,top,-d,x,top+r,ridge,
        x,top,-d,x,top,0,x,top+r,ridge,
      ],[0,0,1,0,.5,1,1,0,0,0,.5,1]);
      this.mesh(house,gable,this.gables.market[0]!,[0,0,0],[1,1,1]).name='gable';
      const side=Math.sign(x);
      const ring=this.mesh(house,this.circle,this.trim,[x+side*.025,top+r*.42,ridge],[.29,.29,1]);
      ring.name='attic-window';
      ring.rotation.y=side*Math.PI/2;
      const glass=this.mesh(house,this.circle,this.atticGlass,[x+side*.03,top+r*.42,ridge],[.19,.19,1]);
      glass.name='attic-window';
      glass.rotation.y=side*Math.PI/2;
    }
    this.mesh(house,this.box,this.trim,[0,h-.05,.09],[w+.24,.24,.32]);
    for(const x of [-w/2,w/2]){
      this.mesh(house,this.box,this.trim,[x,h-.05,-d/2],[.22,.24,d+.2]);
    }
    this.mesh(house,this.box,this.trim,[0,h*.53,.04],[w,.13,.15]).name='floor-trim';
    this.mesh(house,this.box,this.wall,[-w*.3,h+1.05,-d*.6],[.65,2.1,.7]);
    this.mesh(house,this.box,this.trim,[-w*.3,h+2.1,-d*.6],[.82,.16,.86]);

    // Each side has its own matching painted elevation, independently mapped
    // so the front painting is never stretched around a corner.
    for(const side of [-1,1]){
      const end=this.mesh(house,this.plane,this.endFacades[0]!,[side*(w/2+.015),h/2,-d/2],[d,h,1]);
      end.rotation.y=side*Math.PI/2;
      end.name='end-facade';
    }

    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;
    const context=canvas.getContext('2d');
    if(context){
      context.fillStyle='#f9e6c3';context.fillRect(0,0,128,64);
      context.fillStyle='#cf6957';
      for(let i=0;i<128;i+=32)context.fillRect(i,0,16,64);
    }
    const cloth=new THREE.CanvasTexture(canvas);cloth.colorSpace=THREE.SRGBColorSpace;
    this.textures.push(cloth);this.cloth.map=cloth;this.cloth.needsUpdate=true;
    // The shop awning is a sloping surface with thickness at its outer lip.
    const x0=-.55,x1=4.55,y=3.15,p=PROTOTYPE_HOUSE.awningProjection;
    const canopy=this.surface([
      x0,y,.04,x1,y,.04,x0,y-.48,p,
      x1,y,.04,x1,y-.48,p,x0,y-.48,p,
    ],[0,0,1,0,0,1,1,0,1,1,0,1]);
    this.mesh(house,canopy,this.cloth,[0,0,0],[1,1,1]).name='awning';
    this.mesh(house,this.box,this.cloth,[(x0+x1)/2,y-.59,p], [x1-x0,.22,.07]).name='awning';
    for(const x of [x0+.12,x1-.12]){
      this.mesh(house,this.box,this.wood,[x,1.33,p-.1],[.07,2.66,.07]).name='awning';
    }
    this.template=house.clone();
    this.place(house,z,ground,side,variant,district);
    return house;
  }

  private place(house:THREE.Group,z:number,ground:number,side:-1|1,variant:number,district:DistrictKey):void{
    const kind=variant<0?0:variant%3;
    const marketKind=variant<0?0:variant%4;
    this.loadDistrict(district);
    const art=this.districts.get(district);
    house.position.set(side*PROTOTYPE_HOUSE.front,ground-1.8,z);
    house.rotation.y=-side*Math.PI/2;
    house.scale.set(variant<0?1:[.82,.62,.9][kind]!,variant<0?1:[.94,.72,1.12][kind]!,variant<0?1:[1,.86,1.12][kind]!);
    const flat=variant>=0&&kind===1&&district!=='market';
    house.traverse(object=>{
      if(object.name==='roof-flat')object.visible=flat;
      if(object.name==='roof-pitched'||object.name==='gable'||object.name==='attic-window')object.visible=!flat;
      if(object.name==='floor-trim')object.visible=art?kind!==2:marketKind!==3;
      if(object.name==='awning')object.visible=district==='market'&&marketKind!==2&&marketKind!==3;
      if(object instanceof THREE.Mesh&&object.name==='gable')object.material=district==='market'?this.gables.market[marketKind===3?0:marketKind]!:this.gables[district];
      if(object instanceof THREE.Mesh&&object.name==='end-facade')object.material=art
        ?kind===2?art.endNew:kind===1?(art.endAlt??art.end):art.end
        :marketKind===3?this.marketEndNew:this.endFacades[marketKind]!;
      if(object instanceof THREE.Mesh&&object.name==='front-facade')object.material=art
        ?kind===1?art.frontAlt:kind===2?art.frontThird:art.front
        :this.facades[marketKind]!;
    });
  }

  dispose():void{
    this.disposed=true;
    this.geometries.forEach(g=>g.dispose());
    this.textures.forEach(t=>t.dispose());
    this.districts.forEach(d=>{d.front.dispose();d.frontAlt.dispose();d.frontThird.dispose();d.end.dispose();d.endAlt?.dispose();d.endNew.dispose();});
    for(const m of [...this.facades,...this.endFacades,this.marketEndNew,...this.gables.market,this.gables['old-town'],this.gables.gardens,this.gables.twilight,this.gableBase,this.atticGlass,this.wall,this.roof,this.trim,this.wood,this.cloth])m.dispose();
  }
}
