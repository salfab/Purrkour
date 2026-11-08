import * as THREE from 'three';
import {DISTRICTS,type DistrictKey,type HouseProfile} from './districts';

export type HousePreviewMode='off'|'sprites'|'compare';

/** The original modular 3D buildings remain the default for A/B tests. */
export function housePreviewMode(query:string):HousePreviewMode{
  const value=new URLSearchParams(query).get('housePreview');
  return value==='sprites'||value==='compare'?value:'off';
}

/**
 * Four complete painted 2.5D facades composed once from existing PNG artwork:
 * plaster, painted roof tiles and transparent illustrated window/door atlas.
 * No 3D decor boxes for the experimental houses, no screenshot-as-background,
 * no per-frame canvas or GPU allocation, and no fake playable balconies.
 */
export class IllustratedHouseArt {
  private readonly geometry=new THREE.PlaneGeometry(1,1);
  private readonly materials=new Map<DistrictKey,THREE.MeshBasicMaterial>();
  private readonly textures:THREE.CanvasTexture[]=[];
  private disposed=false;
  private ready=false;

  constructor(private readonly mode:HousePreviewMode){
    if(mode==='off')return;
    for(const district of DISTRICTS){
      this.materials.set(district.key,new THREE.MeshBasicMaterial({
        transparent:true,alphaTest:.04,depthWrite:false,
        side:THREE.DoubleSide,fog:true,opacity:0,
      }));
    }
    void this.load();
  }

  get isReady():boolean{return this.ready;}

  useSprite(chunkIndex:number):boolean{
    return this.mode==='sprites'||(this.mode==='compare'&&chunkIndex%2===0);
  }

  private image(name:string):Promise<HTMLImageElement>{
    return new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(new Error('Missing house atlas: '+name));
      img.src=`${import.meta.env.BASE_URL}assets/textures/${name}`;
    });
  }

  private async load():Promise<void>{
    try{
      const [walls,openings,roofs]=await Promise.all([
        this.image('facades_painted_v1.png'),
        this.image('openings_painted_v1.png'),
        this.image('roofs_painted_v1.png'),
      ]);
      if(this.disposed)return;
      if(walls.width!==256||walls.height!==256
          ||openings.width!==256||openings.height!==256
          ||roofs.width!==256||roofs.height!==128){
        throw new Error('Incorrect painted source atlas dimensions');
      }
      for(const district of DISTRICTS){
        const material=this.materials.get(district.key)!;
        const canvas=this.paint(district.key,walls,openings,roofs);
        const texture=new THREE.CanvasTexture(canvas);
        texture.colorSpace=THREE.SRGBColorSpace;
        texture.generateMipmaps=true;
        texture.minFilter=THREE.LinearMipmapLinearFilter;
        texture.magFilter=THREE.LinearFilter;
        texture.anisotropy=2;
        this.textures.push(texture);
        material.map=texture;
        material.opacity=1;
        material.needsUpdate=true;
      }
      this.ready=true;
      // Enables the screenshot workflow to wait for artwork, not a guessed timer.
      document.documentElement.dataset.houseArtReady='true';
    }catch(error){
      console.warn('Purrkour illustrated facades unavailable',error);
      document.documentElement.dataset.houseArtReady='error';
    }
  }

  /** Painted canvas is a real transparency-masked complete building sprite. */
  private paint(
    key:DistrictKey,walls:HTMLImageElement,
    openings:HTMLImageElement,roofs:HTMLImageElement,
  ):HTMLCanvasElement{
    const canvas=document.createElement('canvas');
    canvas.width=512;canvas.height=768;
    const c=canvas.getContext('2d');
    if(!c)throw new Error('Canvas2D unavailable');
    c.imageSmoothingEnabled=true;
    c.imageSmoothingQuality='high';
    const district=DISTRICTS.find(d=>d.key===key)!;
    const market=key==='market',gardens=key==='gardens',dusk=key==='twilight';
    const left=dusk?98:62,right=dusk?414:450;
    const top=market?182:gardens?147:170;
    const rise=dusk?103:market?45:gardens?50:94;

    const shape=(points:readonly (readonly [number,number])[]):void=>{
      c.beginPath();
      points.forEach(([x,y],i)=>i===0?c.moveTo(x,y):c.lineTo(x,y));
      c.closePath();
    };
    // Full shaded plaster silhouette; no opaque background outside the house.
    const index=market?2:dusk?3:gardens?0:1;
    c.save();
    c.beginPath();c.rect(left,top,right-left,585);c.clip();
    c.drawImage(walls,(index%2)*128,Math.floor(index/2)*128,128,128,
      left,top,right-left,585);
    const sideShade=c.createLinearGradient(left,0,right,0);
    sideShade.addColorStop(0,'rgba(61,44,63,.18)');
    sideShade.addColorStop(.28,'rgba(255,242,220,.03)');
    sideShade.addColorStop(.78,'rgba(255,236,208,.02)');
    sideShade.addColorStop(1,'rgba(63,49,68,.22)');
    c.fillStyle=sideShade;
    c.fillRect(left,top,right-left,585);
    c.restore();

    // Roof is one joined polygon with transparent edges and real painted tiles.
    c.save();
    shape([[left-18,top+9],[256,top-rise],[right+18,top+9],
      [right+12,top+21],[left-12,top+21]]);
    c.clip();
    c.drawImage(roofs,((gardens||dusk)?1:0)*128,0,128,128,
      left-18,top-rise-4,right-left+36,rise+30);
    c.restore();
    c.strokeStyle='#b67958';c.lineWidth=7;
    c.beginPath();c.moveTo(left-18,top+10);c.lineTo(256,top-rise);
    c.lineTo(right+18,top+10);c.stroke();
    c.fillStyle=district.trim;
    c.fillRect(left-8,top+19,right-left+16,9);
    c.fillRect(left-4,727,right-left+8,29);
    c.strokeStyle='rgba(89,67,63,.23)';c.lineWidth=4;
    c.beginPath();c.moveTo(left,470);c.lineTo(right,470);c.stroke();

    // Original PNG window and door art, with their own painted stone frames.
    const opening=(i:number,x:number,y:number,w:number,h:number):void=>{
      c.drawImage(openings,(i%2)*128,Math.floor(i/2)*128,128,128,x,y,w,h);
    };
    opening(dusk?3:2,195,510,122,236);
    opening(gardens?0:1,left+28,253,134,171);
    opening(market?1:0,right-161,254,134,170);
    if(dusk)opening(0,206,181,100,125);

    if(market){
      // One continuous striped canopy instead of detached 3D slats.
      const y=471;
      c.save();
      shape([[left-20,y],[right+20,y],[right+42,y+71],[left-42,y+71]]);
      c.clip();
      c.fillStyle='#ffedd1';c.fillRect(left-42,y,right-left+84,71);
      for(let x=left-42;x<=right+42;x+=40){
        c.fillStyle=((x-left+42)/40)%2===0?'#d77e7c':'#85bbb9';
        c.fillRect(x,y,20,71);
      }
      c.restore();
    }
    if(gardens){
      // Painted flower balcony is not an interactive Griffe ledge yet.
      c.fillStyle='#f2d7ad';c.fillRect(114,451,285,17);
      c.fillStyle='#586d71';c.fillRect(116,387,9,64);
      c.fillRect(389,387,9,64);
      c.fillRect(117,388,281,8);
      for(let x=135;x<385;x+=27)c.fillRect(x,391,7,61);
      this.flowers(c,district.foliage,166,390,10);
      this.flowers(c,district.foliage,340,398,8);
    }else{
      this.flowers(c,district.foliage,144,429,8);
      this.flowers(c,district.foliage,359,425,7);
    }
    if(dusk){
      for(const x of [120,393]){
        const g=c.createRadialGradient(x,475,3,x,475,48);
        g.addColorStop(0,'rgba(255,228,142,.75)');
        g.addColorStop(1,'rgba(255,228,142,0)');
        c.fillStyle=g;c.fillRect(x-49,426,98,98);
        c.fillStyle='#f9d69a';c.fillRect(x-11,466,22,28);
        c.strokeStyle='#69555b';c.lineWidth=4;c.strokeRect(x-11,466,22,28);
      }
    }
    return canvas;
  }

  private flowers(c:CanvasRenderingContext2D,green:string,x:number,y:number,count:number):void{
    for(let i=0;i<count;i++){
      const dx=Math.sin(i*2.41)*37,dy=Math.cos(i*1.65)*17;
      c.fillStyle=green;c.beginPath();
      c.ellipse(x+dx,y+dy+8,14,8,i*.47,0,Math.PI*2);c.fill();
      c.fillStyle=i%2===0?'#f3b4cb':'#e978ad';c.beginPath();
      c.arc(x+dx+5,y+dy,8,0,Math.PI*2);c.fill();
      c.fillStyle='#ffdf99';c.beginPath();c.arc(x+dx+6,y+dy,2.1,0,Math.PI*2);c.fill();
    }
  }

  add(group:THREE.Group,house:HouseProfile,ground:number):void{
    const material=this.materials.get(house.district.key);
    if(!material)return;
    const plane=new THREE.Mesh(this.geometry,material);
    const height=house.compact?6.35:7.55+(house.variation%2)*.55;
    const width=height*512/768;
    plane.scale.set(house.variation%2===0?width:-width,height,1);
    // Close enough to frame the street, always well beyond 2.5m road edge.
    plane.position.set(house.side*5.7,ground-1.8+height/2,house.z);
    plane.rotation.y=house.side<0?Math.PI/2:-Math.PI/2;
    group.add(plane);
  }

  dispose():void{
    this.disposed=true;
    this.geometry.dispose();
    this.materials.forEach(material=>material.dispose());
    this.textures.forEach(texture=>texture.dispose());
  }
}
