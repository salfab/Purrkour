import * as THREE from 'three';
import { WORLD, cratesNear, groundHeight, isGap, pickupsNear, type Pickup, type Player } from './core';

function canvasTexture(size: number, paint: (ctx: CanvasRenderingContext2D, size: number) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas2D is not supported');
  paint(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
}
function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x,y,w,h,r);
}
function stoneTexture(): THREE.CanvasTexture {
  const texture = canvasTexture(256,(ctx,s)=>{
    ctx.fillStyle='#e9c3a8';ctx.fillRect(0,0,s,s);
    for(let row=0;row<4;row++)for(let col=0;col<4;col++){
      const offset=row%2===0?0:-32;
      const x=col*64+offset;const y=row*64;
      ctx.fillStyle=(row+col)%3===0?'#f5d5b4':(row+col)%3===1?'#e5b796':'#efc6a8';
      rounded(ctx,x+2,y+2,60,60,7);ctx.fill();
      ctx.strokeStyle='#bb937d';ctx.lineWidth=1;ctx.stroke();
      ctx.beginPath();ctx.moveTo(x+8,y+8);ctx.lineTo(x+56,y+8);ctx.strokeStyle='#ffe8ca';ctx.stroke();
    }
    ctx.strokeStyle='#a47d6a55';ctx.lineWidth=1;
    for(let i=0;i<16;i++){const x=(i*59)%s;const y=(i*103)%s;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+7,y-3);ctx.stroke();}
  });
  texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.RepeatWrapping;return texture;
}
function plasterTexture(peach: boolean): THREE.CanvasTexture {
  const t=canvasTexture(128,(ctx,s)=>{
    ctx.fillStyle=peach?'#f6d4c1':'#fff0d6';ctx.fillRect(0,0,s,s);
    for(let i=0;i<90;i++){const x=(i*71+13)%s;const y=(i*47+31)%s;ctx.fillStyle=peach?'#cb8c7330':'#caab8d32';ctx.fillRect(x,y,2+i%3,2+i%2);}
    ctx.fillStyle='#fff8eb35';for(let i=0;i<12;i++)ctx.fillRect((i*19)%s,(i*49)%s,40,2);
  });
  t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.RepeatWrapping;return t;
}
function roofTexture(): THREE.CanvasTexture {
  const t=canvasTexture(128,(ctx,s)=>{
    ctx.fillStyle='#c67852';ctx.fillRect(0,0,s,s);
    for(let y=0;y<s;y+=16)for(let x=-(y%32);x<s;x+=32){
      ctx.fillStyle=(x+y)%3===0?'#e39362':'#d88259';
      rounded(ctx,x+1,y+1,31,15,4);ctx.fill();ctx.strokeStyle='#ab5a43';ctx.lineWidth=1.4;ctx.stroke();
    }
  });
  t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.RepeatWrapping;return t;
}
function woodTexture(): THREE.CanvasTexture {
  const t=canvasTexture(128,(ctx,s)=>{
    ctx.fillStyle='#c98551';ctx.fillRect(0,0,s,s);
    for(let x=0;x<s;x+=30){ctx.fillStyle=x%60===0?'#d9955d':'#c47d49';ctx.fillRect(x,0,29,s);ctx.fillStyle='#a96940';ctx.fillRect(x+28,0,2,s);}
    ctx.strokeStyle='#895737';ctx.lineWidth=4;ctx.strokeRect(7,7,114,114);
    ctx.strokeStyle='#edb77b';ctx.lineWidth=3;ctx.strokeRect(14,14,100,100);
    ctx.fillStyle='#fff0cf';ctx.font='bold 60px system-ui';ctx.textAlign='center';ctx.fillText('🐾',64,85);
  });
  return t;
}
function iconTexture(kind: 'fish'|'gold'|'boost'|'flower'|'window'|'banner'): THREE.CanvasTexture {
  return canvasTexture(128,(ctx,s)=>{
    ctx.clearRect(0,0,s,s);
    const c=s/2;
    if(kind==='fish'||kind==='gold'){
      ctx.shadowColor=kind==='gold'?'#ffd345':'#74d5f5';ctx.shadowBlur=kind==='gold'?17:5;
      ctx.fillStyle=kind==='gold'?'#ffc52e':'#54c9f0';
      ctx.strokeStyle=kind==='gold'?'#b06c16':'#237ba3';ctx.lineWidth=5;
      ctx.beginPath();ctx.ellipse(c-11,c,32,23,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.moveTo(c+13,c);ctx.lineTo(c+47,c-24);ctx.lineTo(c+47,c+24);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(c-23,c-7,6,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#30465b';ctx.beginPath();ctx.arc(c-22,c-7,2.8,0,Math.PI*2);ctx.fill();
    } else if(kind==='boost'){
      ctx.fillStyle='#6beeff';ctx.shadowColor='#61efff';ctx.shadowBlur=23;
      ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5;const r=i%2===0?49:23;const x=c+Math.cos(a)*r;const y=c+Math.sin(a)*r;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.fill();
      ctx.strokeStyle='#d8ffff';ctx.lineWidth=4;ctx.stroke();
    } else if(kind==='flower'){
      ctx.fillStyle='#b77755';ctx.fillRect(30,72,70,42);ctx.fillStyle='#7bb774';
      for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(35+i*15,64-(i%2)*13,21,0,Math.PI*2);ctx.fill();}
      ctx.fillStyle='#ffb0c0';for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(45+i*15,53+(i%2)*10,8,0,Math.PI*2);ctx.fill();}
    } else if(kind==='window'){
      ctx.fillStyle='#d0926c';rounded(ctx,23,12,82,107,30);ctx.fill();
      ctx.fillStyle='#76bed0';rounded(ctx,36,24,56,84,23);ctx.fill();ctx.strokeStyle='#fff2d0';ctx.lineWidth=5;ctx.stroke();
      ctx.fillStyle='#b7724f';ctx.fillRect(59,24,9,84);ctx.fillRect(35,62,58,7);
    } else {
      ctx.fillStyle='#b85567';ctx.beginPath();ctx.moveTo(28,8);ctx.lineTo(100,8);ctx.lineTo(100,115);ctx.lineTo(64,93);ctx.lineTo(28,115);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#f8d4a1';ctx.lineWidth=6;ctx.stroke();
      ctx.font='bold 48px system-ui';ctx.textAlign='center';ctx.fillStyle='#ffe8d5';ctx.fillText('🐾',64,73);
    }
  });
}
function catFrame(ctx: CanvasRenderingContext2D, frame: number): void {
  const running=frame<6;
  const flight=frame===6;
  const boost=frame===7;
  const bob=running?Math.sin(frame*Math.PI/3)*3:flight?-10:-4;
  ctx.clearRect(0,0,128,128);
  ctx.save();ctx.translate(0,bob);
  if(boost){ctx.fillStyle='#a5f5ff88';ctx.beginPath();ctx.ellipse(43,80,25,14,0,0,Math.PI*2);ctx.fill();}
  // Curled orange tail
  ctx.lineCap='round';ctx.strokeStyle='#a85d37';ctx.lineWidth=19;ctx.beginPath();ctx.moveTo(36,85);ctx.quadraticCurveTo(8,88,23,57);ctx.stroke();
  ctx.strokeStyle='#f8b563';ctx.lineWidth=14;ctx.stroke();
  // Body and moving paws
  ctx.fillStyle='#ed9b50';ctx.strokeStyle='#7f4b34';ctx.lineWidth=3.4;
  ctx.beginPath();ctx.ellipse(68,82,37,31,-.22,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='#fff4dd';ctx.beginPath();ctx.ellipse(80,91,21,18,0,0,Math.PI*2);ctx.fill();
  for(let i=0;i<2;i++){
    const lift=running?(frame+i)%2===0?7:0:flight?15:9;
    ctx.fillStyle='#fff4dd';ctx.beginPath();ctx.ellipse(51+i*30,103-lift,12,10,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#b97e63';ctx.lineWidth=1;ctx.stroke();
  }
  // Ears and face
  ctx.fillStyle='#f0a45c';ctx.strokeStyle='#754733';ctx.lineWidth=3.3;
  ctx.beginPath();ctx.moveTo(55,43);ctx.lineTo(59,12);ctx.lineTo(80,32);ctx.lineTo(101,11);ctx.lineTo(109,48);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#ffc5be';ctx.beginPath();ctx.moveTo(63,23);ctx.lineTo(65,38);ctx.lineTo(76,35);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(98,22);ctx.lineTo(95,39);ctx.lineTo(86,35);ctx.closePath();ctx.fill();
  ctx.fillStyle='#f4ad63';ctx.beginPath();ctx.ellipse(83,52,35,27,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='#fff6e6';ctx.beginPath();ctx.ellipse(91,63,23,15,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#47332e';ctx.beginPath();ctx.ellipse(77,50,4,7,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(104,50,4,7,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(78,48,1.7,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(105,48,1.7,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#e67f86';ctx.beginPath();ctx.moveTo(89,61);ctx.lineTo(97,61);ctx.lineTo(93,65);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#59443d';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(93,65);ctx.lineTo(91,69);ctx.moveTo(93,65);ctx.lineTo(96,69);ctx.stroke();
  for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(76,63+i*3);ctx.lineTo(58,60+i*3);ctx.stroke();}
  // Collar and bell
  ctx.strokeStyle='#c84d53';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(67,77);ctx.quadraticCurveTo(91,90,112,70);ctx.stroke();
  ctx.fillStyle='#ffcb42';ctx.beginPath();ctx.arc(89,83,8,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#a57432';ctx.lineWidth=2;ctx.stroke();
  if(boost){ctx.fillStyle='#8af5ff';for(let i=0;i<3;i++)ctx.fillRect(4+i*10,73+i*8,20,4);}
  ctx.restore();
}
export class ArtWorld {
  readonly group=new THREE.Group();
  readonly cat=new THREE.Group();
  private readonly textures: THREE.Texture[]=[];
  private readonly materials: THREE.Material[]=[];
  private readonly chunks=new Map<number,THREE.Group>();
  private readonly pickups=new Map<string,{sprite:THREE.Sprite,item:Pickup}>();
  private readonly groundMaterial:THREE.MeshLambertMaterial;
  private readonly edgeMaterial:THREE.MeshLambertMaterial;
  private readonly wallMaterial:THREE.MeshLambertMaterial;
  private readonly peachMaterial:THREE.MeshLambertMaterial;
  private readonly roofMaterial:THREE.MeshLambertMaterial;
  private readonly crateMaterial:THREE.MeshLambertMaterial;
  private readonly pickupMaterials:Record<Pickup['kind'],THREE.SpriteMaterial>;
  private readonly propMaterials:{window:THREE.SpriteMaterial;flower:THREE.SpriteMaterial;banner:THREE.SpriteMaterial};
  private readonly catCanvas:HTMLCanvasElement;
  private readonly catTexture:THREE.CanvasTexture;
  private readonly catSprite:THREE.Sprite;
  private readonly shadow:THREE.Mesh<THREE.CircleGeometry,THREE.MeshBasicMaterial>;
  private lastFrame=-1;
  private readonly chunkLength=12;
  constructor(){
    const tex=(texture:THREE.Texture)=>{this.textures.push(texture);return texture;};
    const mat=(t:THREE.Texture)=>{const m=new THREE.MeshLambertMaterial({map:tex(t),side:THREE.DoubleSide});this.materials.push(m);return m;};
    this.groundMaterial=mat(stoneTexture());
    this.wallMaterial=mat(plasterTexture(false));
    this.peachMaterial=mat(plasterTexture(true));
    this.roofMaterial=mat(roofTexture());
    this.crateMaterial=mat(woodTexture());
    this.edgeMaterial=new THREE.MeshLambertMaterial({color:'#f3d39d'});
    this.materials.push(this.edgeMaterial);
    const sprite=(t:THREE.Texture)=>{const m=new THREE.SpriteMaterial({map:tex(t),transparent:true,alphaTest:.05,depthWrite:false});this.materials.push(m);return m;};
    this.pickupMaterials={fish:sprite(iconTexture('fish')),gold:sprite(iconTexture('gold')),boost:sprite(iconTexture('boost'))};
    this.propMaterials={window:sprite(iconTexture('window')),flower:sprite(iconTexture('flower')),banner:sprite(iconTexture('banner'))};
    this.catCanvas=document.createElement('canvas');
    this.catCanvas.width=128;this.catCanvas.height=128;
    this.catTexture=new THREE.CanvasTexture(this.catCanvas);
    this.catTexture.colorSpace=THREE.SRGBColorSpace;
    this.textures.push(this.catTexture);
    const catMaterial=new THREE.SpriteMaterial({map:this.catTexture,transparent:true,alphaTest:.025,depthWrite:false});
    this.materials.push(catMaterial);
    this.catSprite=new THREE.Sprite(catMaterial);this.catSprite.scale.set(1.9,1.9,1);this.catSprite.position.y=.85;this.catSprite.renderOrder=3;
    const shadowMat=new THREE.MeshBasicMaterial({color:'#493d39',transparent:true,opacity:.26,depthWrite:false});
    this.materials.push(shadowMat);
    this.shadow=new THREE.Mesh(new THREE.CircleGeometry(.38,24),shadowMat);
    this.shadow.rotation.x=-Math.PI/2;this.shadow.position.y=.02;
    this.cat.add(this.shadow,this.catSprite);
    this.drawCat(0);
  }
  private drawCat(index:number):void{
    if(this.lastFrame===index)return;
    this.lastFrame=index;
    const ctx=this.catCanvas.getContext('2d');
    if(!ctx)return;
    catFrame(ctx,index);this.catTexture.needsUpdate=true;
  }
  private box(group:THREE.Group,x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material):void{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    mesh.position.set(x,y,z);group.add(mesh);
  }
  private prop(group:THREE.Group,which:'window'|'flower'|'banner',x:number,y:number,z:number,w:number,h:number):void{
    const s=new THREE.Sprite(this.propMaterials[which]);s.position.set(x,y,z);s.scale.set(w,h,1);group.add(s);
  }
  private createChunk(index:number):THREE.Group{
    const from=index*this.chunkLength;const to=from+this.chunkLength;const group=new THREE.Group();
    const vertices:number[]=[];const uv:number[]=[];
    for(let z=from;z<to;z+=.5){
      const end=Math.min(z+.5,to);
      const bounds=[z,end];
      for(let cycle=Math.floor(z/100);cycle<=Math.floor(end/100);cycle++){
        for(const edge of [cycle*100+WORLD.gapStart,cycle*100+WORLD.gapEnd]){
          if(edge>z&&edge<end)bounds.push(edge);
        }
      }
      bounds.sort((a,b)=>a-b);
      for(let i=0;i<bounds.length-1;i++){
        const near=bounds[i],far=bounds[i+1];
        if(near===undefined||far===undefined||isGap((near+far)/2))continue;
        const a=groundHeight(near),b=groundHeight(far),w=WORLD.trackWidth/2;
        vertices.push(-w,a,near,-w,b,far,w,a,near,-w,b,far,w,b,far,w,a,near);
        uv.push(0,near*.45,0,far*.45,2.5,near*.45,0,far*.45,2.5,far*.45,2.5,near*.45);
      }
    }
    if(vertices.length){
      const geo=new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
      geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
      geo.computeVertexNormals();
      group.add(new THREE.Mesh(geo,this.groundMaterial));
    }
    for(let z=from;z<to;z+=2){
      if(isGap(z+1))continue;
      const y=groundHeight(z+1);
      this.box(group,-2.6,y+.11,z+1,.24,.26,2,this.edgeMaterial);
      this.box(group,2.6,y+.11,z+1,.24,.26,2,this.edgeMaterial);
    }
    for(const c of cratesNear(from,to)){
      if(c.z<from||c.z>=to)continue;
      this.box(group,c.x,groundHeight(c.z)+c.height/2,c.z,c.width,c.height,c.depth,this.crateMaterial);
    }
    for(const p of pickupsNear(from,to)){
      if(p.z<from||p.z>=to)continue;
      const sprite=new THREE.Sprite(this.pickupMaterials[p.kind]);
      const size=p.kind==='gold'?.96:p.kind==='boost'?.85:.7;
      sprite.scale.set(size,size,1);
      sprite.position.set(p.x,p.y,p.z);
      group.add(sprite);this.pickups.set(p.id,{sprite,item:p});
    }
    if(index%3===0){
      const left=index%2===0;const sign=left?-1:1;const z=from+5;
      const floor=groundHeight(z),height=5.8+(index%4)*.65;
      this.box(group,sign*7,floor+height/2-1.8,z,3.7,height,12,left?this.wallMaterial:this.peachMaterial);
      this.box(group,sign*7,floor+height-1.75,z,4,.36,12.25,this.roofMaterial);
      this.prop(group,'window',sign*5.05,floor+2.5,z-1.6,1.5,2);
      this.prop(group,'flower',sign*3.55,floor+.68,z+3.5,1.05,1.05);
      this.prop(group,'banner',sign*5.05,floor+3.2,z+3,1.05,1.7);
    }
    return group;
  }
  update(player:Player,collected:ReadonlySet<string>):void{
    const start=Math.max(0,Math.floor((player.z-15)/this.chunkLength));
    const end=Math.floor((player.z+80)/this.chunkLength);
    for(let i=start;i<=end;i++)if(!this.chunks.has(i)){
      const chunk=this.createChunk(i);this.chunks.set(i,chunk);this.group.add(chunk);
    }
    for(const [i,chunk] of this.chunks){
      if(i>=start&&i<=end)continue;
      chunk.traverse(obj=>{
        if(obj instanceof THREE.Mesh)obj.geometry.dispose();
        if(obj instanceof THREE.Sprite && (obj.material===this.pickupMaterials.fish||obj.material===this.pickupMaterials.gold||obj.material===this.pickupMaterials.boost)){
          for(const [id,p] of this.pickups)if(p.sprite===obj)this.pickups.delete(id);
        }
      });
      this.group.remove(chunk);this.chunks.delete(i);
    }
    for(const {sprite,item} of this.pickups.values()){
      sprite.visible=!collected.has(item.id);
      sprite.position.y=item.y+Math.sin(player.elapsed*4+item.z*.3)*.065;
    }
    this.cat.position.set(player.x,player.y,player.z);
    this.shadow.position.y=groundHeight(player.z)-player.y+.025;
    (this.shadow.material as THREE.MeshBasicMaterial).opacity=player.grounded?.3:Math.max(.08,.3-(player.y-groundHeight(player.z))*.055);
    this.drawCat(player.boost>0?7:!player.grounded?6:Math.floor(player.anim)%6);
  }
  dispose():void{
    for(const chunk of this.chunks.values())chunk.traverse(obj=>{if(obj instanceof THREE.Mesh)obj.geometry.dispose();});
    this.chunks.clear();this.pickups.clear();
    this.shadow.geometry.dispose();
    this.materials.forEach(m=>m.dispose());
    this.textures.forEach(t=>t.dispose());
  }
}
