import * as THREE from 'three';
import { WORLD, cratesNear, groundHeight, isGap, pickupsNear, type Pickup, type Player } from './core';
import { gapEdgesInRange } from './backdropMath';
import {ROUTE_FORK,activeRoute,type RouteChoice} from './routeChoices';
import {routePoint,streamedRoadInterval,fakeMergeOverlapsBuilding} from './routeGeometry';
import {catViewFromLocalX,mirrorProfileForView} from './catView';
import {isolateCharacterFrames,setCharacterMirror,configureCharacterTexture} from './characterFrames';
import {catRearPose,rearDisplayFrame} from './catMotion';
import {terraceQuadUV,trackQuadUV,jumpShadowAppearance,profileFrame} from './visualPolish';
import {movingObstaclesNear,type MovingObstacle} from './movingObstacles';
import {MovingObstacleArt} from './MovingObstacleArt';
import {DistrictBuildings} from './DistrictBuildings';
import {houseProfile,houseProfilesForChunk} from './districts';
import {IllustratedHouseArt,housePreviewMode} from './IllustratedHouseArt';
import {PrototypeHouseArt,isVolumeStreet} from './PrototypeHouseArt';
import {FishArt} from './FishArt';
import {GardenFeatures} from './GardenFeatures';
import {DESCENT,onDescent} from './descent';

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
function terraceTexture(): THREE.CanvasTexture {
  const t = canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#dec3a3';
    ctx.fillRect(0, 0, s, s);
    for (let row = 0; row < 8; row++) {
      for (let col = -1; col <= 8; col++) {
        const x = col * 32 + (row % 2) * 16;
        const y = row * 32;
        ctx.fillStyle = ['#f1d6b4', '#e8c69f', '#dcc09c', '#ead1b0'][(row + col + 20) % 4] ?? '#e8c69f';
        rounded(ctx, x + 1.6, y + 1.6, 29, 29, 3);
        ctx.fill();
        ctx.strokeStyle = '#b39478';
        ctx.lineWidth = .9;
        ctx.stroke();
      }
    }
    // Small variations in the paving, not geometry or dense draw calls.
    for (let i = 0; i < 95; i++) {
      const x = (i * 67 + 23) % s;
      const y = (i * 91 + 47) % s;
      ctx.fillStyle = i % 3 === 0 ? '#93a87b66' : '#fff9e350';
      ctx.fillRect(x, y, i % 3 + 1, 2);
    }
  });
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
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
/** A tiny transparent four-pose rear animation for the centered runner. */
function rearCatFrame(ctx:CanvasRenderingContext2D,frame:number):void{
  ctx.clearRect(0,0,128,128);
  const bob=frame%2===0?2:0;
  const footLift=frame%2===0?7:0;
  const tailSide=frame%4<2?-1:1;
  ctx.save();ctx.translate(0,bob);
  ctx.lineJoin='round';ctx.lineCap='round';
  const outline='#7c4736';
  // Warm furry body from the back, with the original kitty's white socks.
  ctx.fillStyle='#efa35f';ctx.strokeStyle=outline;ctx.lineWidth=3.6;
  ctx.beginPath();ctx.ellipse(64,85,32,29,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  // Tail curves around the silhouette and swings from frame to frame.
  const tailOrigin=64+tailSide*17;
  ctx.strokeStyle=outline;ctx.lineWidth=21;
  ctx.beginPath();ctx.moveTo(tailOrigin,92);ctx.quadraticCurveTo(64+tailSide*49,80,64+tailSide*40,47);ctx.stroke();
  ctx.strokeStyle='#f1a553';ctx.lineWidth=15;
  ctx.beginPath();ctx.moveTo(tailOrigin,92);ctx.quadraticCurveTo(64+tailSide*49,80,64+tailSide*40,47);ctx.stroke();
  ctx.strokeStyle='#fff3e6';ctx.lineWidth=11;
  ctx.beginPath();ctx.moveTo(64+tailSide*41,55);ctx.quadraticCurveTo(64+tailSide*41,51,64+tailSide*40,47);ctx.stroke();
  // Two alternating back paws.
  for(let i=0;i<2;i++){
    const lift=i===frame%2?footLift:0;
    ctx.fillStyle='#fff2df';ctx.strokeStyle='#a66c54';ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(50+i*28,106-lift,12,14,i===0?.18:-.18,0,Math.PI*2);
    ctx.fill();ctx.stroke();
    ctx.fillStyle='#e89c97';
    for(let p=0;p<3;p++){
      ctx.beginPath();ctx.arc(44+i*28+p*5,109-lift,2.2,0,Math.PI*2);ctx.fill();
    }
  }
  // Neck scarf visible behind the ears.
  ctx.fillStyle='#cb5055';ctx.strokeStyle='#8b4443';ctx.lineWidth=2.5;
  ctx.beginPath();ctx.ellipse(64,69,30,9,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  // Orange head, two oversized ears and creamy cheeks.
  ctx.fillStyle='#f4a459';ctx.strokeStyle=outline;ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(34,44);ctx.lineTo(30,14);ctx.quadraticCurveTo(45,14,52,32);
  ctx.lineTo(77,32);ctx.quadraticCurveTo(90,14,98,14);
  ctx.lineTo(95,46);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#ffc6b4';ctx.beginPath();
  ctx.moveTo(35,20);ctx.lineTo(37,34);ctx.lineTo(50,33);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(93,20);ctx.lineTo(91,34);ctx.lineTo(78,33);ctx.closePath();ctx.fill();
  ctx.fillStyle='#f4a65e';ctx.strokeStyle=outline;ctx.lineWidth=3.3;
  ctx.beginPath();ctx.ellipse(64,49,37,31,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='#fff4e3';
  ctx.beginPath();ctx.ellipse(34,63,9,10,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(94,63,9,10,0,0,Math.PI*2);ctx.fill();
  // Tiger stripes, readable even when the sprite is 80px on mobile.
  ctx.strokeStyle='#dc773c';ctx.lineWidth=6;
  for(const dx of [-15,0,15]){
    ctx.beginPath();ctx.moveTo(64+dx,26);ctx.quadraticCurveTo(64+dx*.6,36,64+dx*.7,47);ctx.stroke();
  }
  ctx.strokeStyle='#d67c47';ctx.lineWidth=5;
  ctx.beginPath();ctx.moveTo(55,80);ctx.lineTo(51,93);ctx.moveTo(72,80);ctx.lineTo(76,92);ctx.stroke();
  ctx.restore();
}

export class ArtWorld {
  readonly group=new THREE.Group();
  readonly cat=new THREE.Group();
  private readonly textures: THREE.Texture[]=[];
  private readonly materials: THREE.Material[]=[];
  private readonly chunks=new Map<number,THREE.Group>();
  private readonly pickups=new Map<string,{sprite:THREE.Sprite,item:Pickup}>();
  private readonly movingArt=new MovingObstacleArt();
  private readonly gardenFeatures=new GardenFeatures();
  private readonly movingViews=new Map<string,{object:THREE.Group;obstacle:MovingObstacle}>();
  private readonly groundMaterial:THREE.MeshLambertMaterial;
  private readonly terraceMaterial:THREE.MeshLambertMaterial;
  private readonly edgeMaterial:THREE.MeshLambertMaterial;
  private readonly gapLipMaterial:THREE.MeshLambertMaterial;
  private readonly wallMaterial:THREE.MeshLambertMaterial;
  private readonly peachMaterial:THREE.MeshLambertMaterial;
  private readonly roofMaterial:THREE.MeshLambertMaterial;
  private readonly crateMaterial:THREE.MeshLambertMaterial;
  private readonly gateMaterial:THREE.MeshBasicMaterial;
  private readonly gateAccent:THREE.MeshBasicMaterial;
  private readonly drainMaterial=new THREE.MeshLambertMaterial({color:'#555c60'});
  private readonly drainBars=new THREE.MeshLambertMaterial({color:'#a6a6a0'});
  private readonly pickupMaterials:Record<Pickup['kind'],THREE.SpriteMaterial>;
  private readonly fishArt:FishArt;
  private readonly propMaterials:{window:THREE.SpriteMaterial;flower:THREE.SpriteMaterial;banner:THREE.SpriteMaterial};
  private readonly wallPropMaterials:{window:THREE.MeshBasicMaterial;banner:THREE.MeshBasicMaterial};
  private readonly districtBuildings:DistrictBuildings;
  private readonly illustratedBuildings:IllustratedHouseArt;
  private readonly prototypeHouse:PrototypeHouseArt|null;
  private catAtlasReady=false;
  private catFrames:THREE.CanvasTexture[]=[];
  private rearAtlasReady=false;
  private rearFrames:THREE.CanvasTexture[]=[];
  private readonly catCanvas:HTMLCanvasElement;
  private readonly catTexture:THREE.CanvasTexture;
  private readonly rearCanvas:HTMLCanvasElement;
  private readonly rearTexture:THREE.CanvasTexture;
  private backView=false;
  private lastMirrored=false;
  private wasGrounded=true;
  private lastLandingAt=Number.NEGATIVE_INFINITY;
  private readonly catSprite:THREE.Sprite;
  private readonly cryingFrames:THREE.Texture[]=[];
  private readonly shadow:THREE.Mesh<THREE.CircleGeometry,THREE.MeshBasicMaterial>;
  private lastFrame=-1;
  private readonly chunkLength=12;
  private activeRunSeed=0;
  private activeRoute:RouteChoice|null=null;
  get forkPavementMaterial():THREE.MeshLambertMaterial{return this.groundMaterial;}
  get forkCurbMaterial():THREE.MeshLambertMaterial{return this.edgeMaterial;}
  constructor(){
    const tex=(texture:THREE.Texture)=>{this.textures.push(texture);return texture;};
    const mat=(t:THREE.Texture)=>{const m=new THREE.MeshLambertMaterial({map:tex(t),side:THREE.DoubleSide});this.materials.push(m);return m;};
    this.groundMaterial=mat(stoneTexture());
    this.terraceMaterial=mat(terraceTexture());
    this.wallMaterial=mat(plasterTexture(false));
    this.peachMaterial=mat(plasterTexture(true));
    this.roofMaterial=mat(roofTexture());
    this.crateMaterial=mat(woodTexture());
    // Make the path's paving legible on mobile. The UVs now cover 5.5 metres
    // per painted tile and match the Y preview exactly.
    this.loadPaintedTexture('track_pavers.webp',this.groundMaterial,1,1);
    // Old UV * 3.3/4.2 tiled the lower road into a distracting houndstooth.
    // The mesh now uses continuous 8-metre tiles with no extra repeat.
    this.loadPaintedTexture('terrace_pavers.webp',this.terraceMaterial,1,1);
    this.loadPaintedTexture('stucco_cream_v2.webp',this.wallMaterial,2.1,1.5);
    this.loadPaintedTexture('stucco_peach_v2.webp',this.peachMaterial,2.1,1.5);
    this.edgeMaterial=new THREE.MeshLambertMaterial({color:'#f3d39d'});
    this.gapLipMaterial=new THREE.MeshLambertMaterial({color:'#be9578'});
    this.gateMaterial=new THREE.MeshBasicMaterial({color:'#50d9c7'});
    this.gateAccent=new THREE.MeshBasicMaterial({color:'#fff4c1'});
    this.materials.push(this.edgeMaterial,this.gapLipMaterial,this.gateMaterial,this.gateAccent,this.drainMaterial,this.drainBars);
    const sprite=(t:THREE.Texture)=>{const m=new THREE.SpriteMaterial({map:tex(t),transparent:true,alphaTest:.05,depthWrite:false});this.materials.push(m);return m;};
    this.pickupMaterials={fish:sprite(iconTexture('fish')),gold:sprite(iconTexture('gold')),sky:sprite(iconTexture('gold')),boost:sprite(iconTexture('boost'))};
    this.fishArt=new FishArt(this.pickupMaterials);
    this.propMaterials={window:sprite(iconTexture('window')),flower:sprite(iconTexture('flower')),banner:sprite(iconTexture('banner'))};
    const onWall=(material:THREE.SpriteMaterial):THREE.MeshBasicMaterial=>{
      const m=new THREE.MeshBasicMaterial({
        map:material.map,
        transparent:true,
        alphaTest:.08,
        depthWrite:false,
        side:THREE.DoubleSide,
        polygonOffset:true,
        polygonOffsetFactor:-1,
      });
      this.materials.push(m);
      return m;
    };
    this.wallPropMaterials={window:onWall(this.propMaterials.window),banner:onWall(this.propMaterials.banner)};
    this.districtBuildings=new DistrictBuildings({
      cream:this.wallMaterial,peach:this.peachMaterial,roof:this.roofMaterial,
      window:this.wallPropMaterials.window,banner:this.wallPropMaterials.banner,
      flower:this.propMaterials.flower,
    });
    // Real raster paintings from the original generated hand-painted asset
    // study. They replace only the wall/roof maps; geometry stays unchanged.
    this.districtBuildings.loadPaintedTextures();
    // The complete illustrated house silhouette is opt-in until we validate
    // the actual live Three.js camera (not an ImageGen mock screenshot).
    this.illustratedBuildings=new IllustratedHouseArt(
      housePreviewMode(typeof window==='undefined'?'':window.location.search),
    );
    this.prototypeHouse=isVolumeStreet(typeof window==='undefined'?'':window.location.search)
      ?new PrototypeHouseArt():null;
    this.catCanvas=document.createElement('canvas');
    this.catCanvas.width=128;this.catCanvas.height=128;
    this.catTexture=new THREE.CanvasTexture(this.catCanvas);
    configureCharacterTexture(this.catTexture);
    this.textures.push(this.catTexture);
    this.rearCanvas=document.createElement('canvas');
    this.rearCanvas.width=128;this.rearCanvas.height=128;
    this.rearTexture=new THREE.CanvasTexture(this.rearCanvas);
    configureCharacterTexture(this.rearTexture);
    this.textures.push(this.rearTexture);
    const catMaterial=new THREE.SpriteMaterial({map:this.catTexture,transparent:true,alphaTest:.025,depthWrite:false});
    this.materials.push(catMaterial);
    this.catSprite=new THREE.Sprite(catMaterial);this.catSprite.scale.set(1.9,1.9,1);this.catSprite.position.y=.85;this.catSprite.renderOrder=3;
    const shadowMat=new THREE.MeshBasicMaterial({color:'#493d39',transparent:true,opacity:.26,depthWrite:false});
    this.materials.push(shadowMat);
    this.shadow=new THREE.Mesh(new THREE.CircleGeometry(.38,24),shadowMat);
    this.shadow.rotation.x=-Math.PI/2;this.shadow.position.y=.02;
    this.cat.add(this.shadow,this.catSprite);
    for(const name of ['closed','open']){
      const texture=new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/character/cat-cry-${name}.png`);
      texture.colorSpace=THREE.SRGBColorSpace;texture.generateMipmaps=true;
      texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
      this.cryingFrames.push(texture);this.textures.push(texture);
    }
    // Real hand-drawn kawaii sprites, 4 columns × 2 rows. The canvas cat
    // above is retained exclusively as a graceful fallback while loading.
    const atlas=new THREE.TextureLoader().load(
      `${import.meta.env.BASE_URL}assets/character/cat_side_original_hq.png`,
      loaded=>{
        try{
          this.catFrames=isolateCharacterFrames(loaded.image as HTMLImageElement,4,2);
          this.textures.push(...this.catFrames);
          this.catAtlasReady=this.catFrames.length===8;
          this.lastFrame=-1;
          this.drawCat(0,this.backView,this.lastMirrored);
        }catch(error){
          console.warn('Purrkour: side cat frame fallback',error);
        }
      },
      undefined,
      ()=>console.warn('Purrkour: kawaii cat atlas unavailable; using fallback'),
    );
    atlas.colorSpace=THREE.SRGBColorSpace;
    atlas.generateMipmaps=false;
    atlas.wrapS=THREE.ClampToEdgeWrapping;
    atlas.wrapT=THREE.ClampToEdgeWrapping;
    atlas.magFilter=THREE.LinearFilter;
    atlas.minFilter=THREE.LinearFilter;
    this.textures.push(atlas);

    // Restored original rear PNG (8 true 256×256 frames, including jump and boost).
    // The procedural Canvas rear cat is only a fallback during loading/error.
    const rearAtlas=new THREE.TextureLoader().load(
      `${import.meta.env.BASE_URL}assets/character/cat_rear_original_hq.png`,
      loaded=>{
        try{
          // Preserve original RGBA pixels without repainting or foot cleanup.
          this.rearFrames=isolateCharacterFrames(loaded.image as HTMLImageElement,4,2);
          this.textures.push(...this.rearFrames);
          this.rearAtlasReady=this.rearFrames.length===8;
          this.lastFrame=-1;
          this.drawCat(0,this.backView,this.lastMirrored);
        }catch(error){
          console.warn('Purrkour: rear cat frame fallback',error);
        }
      },
      undefined,
      ()=>console.warn('Purrkour: rear kawaii atlas unavailable; using Canvas fallback'),
    );
    rearAtlas.colorSpace=THREE.SRGBColorSpace;
    rearAtlas.wrapS=THREE.ClampToEdgeWrapping;
    rearAtlas.wrapT=THREE.ClampToEdgeWrapping;
    rearAtlas.generateMipmaps=false;
    rearAtlas.magFilter=THREE.LinearFilter;
    rearAtlas.minFilter=THREE.LinearFilter;
    this.textures.push(rearAtlas);
    this.drawCat(0,true);
  }
  private loadPaintedTexture(filename:string,material:THREE.MeshLambertMaterial,repeatX:number,repeatY:number):void{
    const texture=new THREE.TextureLoader().load(
      `${import.meta.env.BASE_URL}assets/textures/${filename}`,
      loaded=>{
        if(!this.materials.includes(material))return;
        loaded.colorSpace=THREE.SRGBColorSpace;
        loaded.wrapS=THREE.RepeatWrapping;
        loaded.wrapT=THREE.RepeatWrapping;
        loaded.repeat.set(repeatX,repeatY);
        material.map=loaded;
        material.needsUpdate=true;
        this.districtBuildings?.refreshTextures();
      },
      undefined,
      ()=>console.warn('Purrkour: painted material unavailable:',filename),
    );
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.wrapS=THREE.RepeatWrapping;
    texture.wrapT=THREE.RepeatWrapping;
    texture.anisotropy=2;
    this.textures.push(texture);
  }
  private drawCat(index:number,back:boolean,mirrored=false):void{
    if(this.lastFrame===index&&this.backView===back
      &&this.lastMirrored===mirrored)return;
    this.lastFrame=index;
    this.backView=back;
    this.lastMirrored=mirrored;
    const material=this.catSprite.material as THREE.SpriteMaterial;

    if(back){
      this.catSprite.scale.x=1.9;
      if(this.rearAtlasReady){
        const frame=this.rearFrames[index%8];
        if(frame){
          if(material.map!==frame){
            material.map=frame;
            material.needsUpdate=true;
          }
          return;
        }
      }
      const ctx=this.rearCanvas.getContext('2d');
      if(!ctx)return;
      rearCatFrame(ctx,index%4);
      this.rearTexture.needsUpdate=true;
      if(material.map!==this.rearTexture){
        material.map=this.rearTexture;
        material.needsUpdate=true;
      }
      return;
    }

    if(this.catAtlasReady){
      const frame=this.catFrames[index%8];
      if(frame){
        setCharacterMirror(frame,mirrored);
        this.catSprite.scale.x=1.9;
        if(material.map!==frame){
          material.map=frame;
          material.needsUpdate=true;
        }
        return;
      }
    }

    const ctx=this.catCanvas.getContext('2d');
    if(!ctx)return;
    catFrame(ctx,index);
    this.catTexture.needsUpdate=true;
    this.catSprite.scale.x=mirrored?-1.9:1.9;
    if(material.map!==this.catTexture){
      material.map=this.catTexture;
      material.needsUpdate=true;
    }
  }
  private box(group:THREE.Group,x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material):void{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    mesh.position.set(x,y,z);group.add(mesh);
  }
  private addDescentGate(group:THREE.Group,z:number,x:number):void{
    const arch=new THREE.Group();
    arch.position.set(x,groundHeight(z),z);
    for(const side of [-1,1]){
      this.box(arch,side*.86,.65,0,.12,1.3,.12,this.gateMaterial);
      this.box(arch,side*.86,.14,0,.2,.28,.2,this.gateAccent);
    }
    const curve=new THREE.Mesh(
      new THREE.TorusGeometry(.86,.075,6,18,Math.PI),this.gateMaterial,
    );
    curve.position.y=1.28;
    arch.add(curve);
    this.box(arch,0,2.18,0,.43,.13,.13,this.gateAccent);
    group.add(arch);
  }
  private createChunk(index:number,runSeed:number,route:RouteChoice|null):THREE.Group{
    const from=index*this.chunkLength;const to=from+this.chunkLength;const group=new THREE.Group();
    // Exact ownership split: ArtWorld draws the trunk until 250 m and the
    // active route from 288 m onward. The short Y preview owns 250..288
    // before AND after the decision, so no geometry changes under the player.
    const interval=streamedRoadInterval(from,to,route);
    if(interval===null)return group;
    const {start:visualStart,end:visualEnd}=interval;
    const vertices:number[]=[];const uv:number[]=[];
    const terrainVertices:number[]=[];const terrainUv:number[]=[];
    const terrainTop=(z:number)=>groundHeight(z)-1.8;
    const terrainExtent=from>=240&&from<430?9.5:12.5;
    for(let z=visualStart;z<visualEnd;z+=.5){
      const end=Math.min(z+.5,visualEnd);
      // Side streets are continuous even where the elevated runner has gaps.
      // Their top is aligned with the houses' existing -1.8 m foundation.
      for (const [x0,x1] of [[-terrainExtent,-2.7],[2.7,terrainExtent]] as const) {
        const a=terrainTop(z), b=terrainTop(end);
        terrainVertices.push(x0,a,z,x0,b,end,x1,a,z, x0,b,end,x1,b,end,x1,a,z);
        terrainUv.push(...terraceQuadUV(x0,x1,z,end));
      }
      const bounds=[z,end];
      for(let cycle=Math.floor(z/100);cycle<=Math.floor(end/100);cycle++){
        for(const edge of [cycle*100+WORLD.gapStart,cycle*100+WORLD.gapEnd]){
          if(edge>z&&edge<end)bounds.push(edge);
        }
      }
      bounds.sort((a,b)=>a-b);
      for(let i=0;i<bounds.length-1;i++){
        const near=bounds[i],far=bounds[i+1];
        if(near===undefined||far===undefined)continue;
        if(isGap((near+far)/2)){
          // A lower cross-street continues between the two upper sidewalks.
          // The player still falls: only the graphic representation changes.
          const a=terrainTop(near),b=terrainTop(far);
          const x0=-WORLD.trackWidth/2-.2,x1=WORLD.trackWidth/2+.2;
          terrainVertices.push(x0,a,near,x0,b,far,x1,a,near,x0,b,far,x1,b,far,x1,a,near);
          terrainUv.push(...terraceQuadUV(x0,x1,near,far));
          continue;
        }
        const a=groundHeight(near),b=groundHeight(far),w=WORLD.trackWidth/2;
        vertices.push(-w,a,near,-w,b,far,w,a,near,-w,b,far,w,b,far,w,a,near);
        uv.push(...trackQuadUV(-w,w,near,far));
      }
    }
    if(terrainVertices.length){
      const geo=new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.Float32BufferAttribute(terrainVertices,3));
      geo.setAttribute('uv',new THREE.Float32BufferAttribute(terrainUv,2));
      geo.computeVertexNormals();
      group.add(new THREE.Mesh(geo,this.terraceMaterial));
    }
    if(vertices.length){
      const geo=new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
      geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
      geo.computeVertexNormals();
      group.add(new THREE.Mesh(geo,this.groundMaterial));
    }
    // Each lip curves visually down into the lower street rather than ending
    // as a paper-thin horizontal sheet.
    for(const lip of gapEdgesInRange(visualStart,visualEnd,WORLD.gapStart,WORLD.gapEnd,WORLD.segmentLength)){
      if(!isGap(lip))continue;
      const floor=groundHeight(lip);
      const depth=1.8;
      this.box(group,0,floor-depth/2,lip,WORLD.trackWidth,depth,.13,this.gapLipMaterial);
      this.box(group,0,floor+.035,lip,WORLD.trackWidth,.07,.17,this.edgeMaterial);
    }
    for(let z=visualStart;z<visualEnd;z+=2){
      if(isGap(z)||isGap(z+1)||isGap(z+2))continue;
      const y=groundHeight(z+1);
      this.box(group,-2.6,y+.11,z+1,.24,.26,2,this.edgeMaterial);
      this.box(group,2.6,y+.11,z+1,.24,.26,2,this.edgeMaterial);
      // Retaining walls connect the raised runner to the lower streets.
      this.box(group,-2.59,y-.88,z+1,.18,1.75,2,this.terraceMaterial);
      this.box(group,2.59,y-.88,z+1,.18,1.75,2,this.terraceMaterial);
    }
    for(const c of cratesNear(visualStart,visualEnd,runSeed,activeRoute(visualStart+1,route))){
      if(c.z<visualStart||c.z>=visualEnd)continue;
      this.box(group,c.x,groundHeight(c.z)+c.height/2,c.z,c.width,c.height,c.depth,this.crateMaterial);
    }
    for(const gate of DESCENT.gates){
      if(gate.z>=visualStart&&gate.z<visualEnd)this.addDescentGate(group,gate.z,gate.x);
    }
    for(let z=Math.max(700,Math.ceil(visualStart/2)*2);z<Math.min(760,visualEnd);z+=2){
      for(const side of [-1,1]){
        this.box(group,side*2.08,groundHeight(z+1)+.025,z+1,.7,.05,2,this.drainMaterial);
        for(let dz=.2;dz<2;dz+=.4)
          this.box(group,side*2.08,groundHeight(z+dz)+.06,z+dz,.65,.035,.055,this.drainBars);
      }
    }
    for(const p of pickupsNear(visualStart,visualEnd,runSeed,activeRoute(visualStart+1,route))){
      if(p.z<visualStart||p.z>=visualEnd)continue;
      const sprite=new THREE.Sprite(this.pickupMaterials[p.kind]);
      const size=p.kind==='sky'?1.15:p.kind==='gold'?.96:p.kind==='boost'?.85:.7;
      // The illustrated fish images are 2:1; preserve their proportions.
      if(p.kind==='boost')sprite.scale.set(size,size,1);
      else sprite.scale.set(size*1.3,size*.65,1);
      sprite.position.set(p.x,p.y,p.z);
      group.add(sprite);this.pickups.set(p.id,{sprite,item:p});
    }
    for(const obstacle of movingObstaclesNear(
      visualStart,visualEnd,runSeed,activeRoute(visualStart+1,route)
    )){
      if(obstacle.z<visualStart||obstacle.z>=visualEnd)continue;
      const object=this.movingArt.create(obstacle);
      object.position.set(obstacle.x,groundHeight(obstacle.z),obstacle.z);
      group.add(object);
      this.movingViews.set(obstacle.id,{object,obstacle});
    }
    // Illustrated frontages line both sides; the modular comparison keeps
    // its original staggered plots. Leave the fake merge clear in both modes.
    const sprites=this.illustratedBuildings.useSprite(index);
    const houses=sprites && index>=0
      ? ([-1,1] as const).map(side=>houseProfile(index,runSeed,side,index*12+6))
      : houseProfilesForChunk(index,runSeed);
    for(const house of houses){
      if(house.z<visualStart||house.z>=visualEnd)continue;
      // Small courtyards interrupt the row, staggered on opposite sides.
      if(this.prototypeHouse&&(index+(house.side===1?2:0))%7===0)continue;
      if(fakeMergeOverlapsBuilding(
        house.z,this.prototypeHouse?house.side*7.05:sprites?house.side*5.15:house.centerX,route,
        this.prototypeHouse?2.5:sprites ? .3 : house.width/2+.90,
        this.prototypeHouse?5.5:sprites ? 7.6 : house.depth/2+.48,
      ))continue;
      if(this.prototypeHouse){
        if(house.district.key==='gardens'&&index%4===2){
          this.gardenFeatures.add(group,house.z,groundHeight(house.z),house.side,Math.floor(index/4)+(house.side===1?1:0));
          continue;
        }
        this.prototypeHouse.add(group,house.z,groundHeight(house.z),house.side,index+(house.side===1?1:0),house.district.key);
        continue;
      }
      if(sprites){
        this.illustratedBuildings.add(group,house,groundHeight(house.z));
      }else{
        this.districtBuildings.add(group,house,groundHeight(house.z));
      }
    }
    this.warpChunk(group,route);
    return group;
  }

  /** Bend all paved mesh vertices; rotate boxes and facades on each tangent. */
  private warpChunk(group:THREE.Group,route:RouteChoice|null):void{
    if(route===null)return;
    for(const obj of group.children){
      if(obj instanceof THREE.Mesh && obj.geometry.type==='BufferGeometry'
          && obj.position.x===0 && obj.position.z===0){
        const positions=obj.geometry.getAttribute('position');
        for(let i=0;i<positions.count;i++){
          const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
          const point=routePoint(z,x,route);
          positions.setXYZ(i,point.x,y,point.z);
        }
        positions.needsUpdate=true;
        obj.geometry.computeVertexNormals();
      }else{
        const point=routePoint(obj.position.z,obj.position.x,route);
        obj.position.set(point.x,obj.position.y,point.z);
        if(obj instanceof THREE.Mesh||obj instanceof THREE.Group)obj.rotation.y+=point.yaw;
      }
    }
  }
  resetRun(seed:number):void{
    for(const chunk of this.chunks.values()){
      chunk.traverse(obj=>{if(obj instanceof THREE.Mesh && !obj.userData.sharedHouseSpriteGeometry)obj.geometry.dispose();});
      this.group.remove(chunk);
    }
    this.chunks.clear();
    this.pickups.clear();
    this.movingViews.clear();
    this.activeRunSeed=seed;
    this.activeRoute=null;
    this.wasGrounded=true;
    this.lastLandingAt=Number.NEGATIVE_INFINITY;
  }

  /** Reload only future geometry when the player commits to a fork choice. */
  private refreshRoute(route:RouteChoice|null):void{
    if(route===this.activeRoute)return;
    this.activeRoute=route;
    for(const [index,chunk] of this.chunks){
      if(index*this.chunkLength<ROUTE_FORK.chooseZ)continue;
      chunk.traverse(obj=>{
        if(obj instanceof THREE.Mesh && !obj.userData.sharedHouseSpriteGeometry)obj.geometry.dispose();
        if(obj instanceof THREE.Sprite){
          for(const [id,p] of this.pickups)if(p.sprite===obj)this.pickups.delete(id);
        }
      });
      this.group.remove(chunk);
      this.chunks.delete(index);
      for(const [id,v] of this.movingViews){
        if(v.object.parent===chunk)this.movingViews.delete(id);
      }
    }
  }

  /** Cosmetic banking during the non-interactive camera turn. */
  setTurnLean(amount:number):void{
    (this.catSprite.material as THREE.SpriteMaterial).rotation=amount;
  }

  update(player:Player,collected:ReadonlySet<string>,failureAge:number|null=null):void{
    if(player.runSeed!==this.activeRunSeed)this.resetRun(player.runSeed);
    this.refreshRoute(player.routeChoice);
    const start=Math.max(0,Math.floor((player.z-15)/this.chunkLength));
    const end=Math.floor((player.z+80)/this.chunkLength);
    for(let i=start;i<=end;i++)if(!this.chunks.has(i)){
      const chunk=this.createChunk(i,this.activeRunSeed,this.activeRoute);this.chunks.set(i,chunk);this.group.add(chunk);
    }
    for(const [i,chunk] of this.chunks){
      if(i>=start&&i<=end)continue;
      chunk.traverse(obj=>{
        if(obj instanceof THREE.Mesh && !obj.userData.sharedHouseSpriteGeometry)obj.geometry.dispose();
        if(obj instanceof THREE.Sprite && (obj.material===this.pickupMaterials.fish||obj.material===this.pickupMaterials.gold||obj.material===this.pickupMaterials.sky||obj.material===this.pickupMaterials.boost)){
          for(const [id,p] of this.pickups)if(p.sprite===obj)this.pickups.delete(id);
        }
      });
      this.group.remove(chunk);this.chunks.delete(i);
      for(const [id,v] of this.movingViews){
        if(v.object.parent===chunk)this.movingViews.delete(id);
      }
    }
    for(const {sprite,item} of this.pickups.values()){
      sprite.visible=!collected.has(item.id);
      sprite.position.y=item.y+Math.sin(player.elapsed*4+item.z*.3)*.065;
    }
    for(const {object,obstacle} of this.movingViews.values()){
      this.movingArt.update(object,obstacle,player.z,player.elapsed,player.routeChoice);
    }
    const position=routePoint(player.z,player.x,player.routeChoice);
    this.cat.position.set(position.x,player.y,position.z);
    if(failureAge!==null){
      this.cat.position.y=groundHeight(player.z);
      const material=this.catSprite.material as THREE.SpriteMaterial;
      const frame=this.cryingFrames[Math.floor(failureAge/.3)%2===0?1:0];
      if(frame&&material.map!==frame){material.map=frame;material.needsUpdate=true;}
      this.lastFrame=-1;
      this.catSprite.scale.set(1.9,1.9,1);this.catSprite.position.y=.85;
      material.rotation=0;material.color.set('#ffffff');
      this.shadow.position.y=.025;
      return;
    }
    const view=catViewFromLocalX(player.x);
    const shadowHeight=Math.max(0,player.y-groundHeight(player.z));
    const shadowStyle=jumpShadowAppearance(shadowHeight);
    this.shadow.position.y=groundHeight(player.z)-player.y+.025;
    this.shadow.scale.setScalar(shadowStyle.scale);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity=shadowStyle.opacity;
    if(!this.wasGrounded && player.grounded)this.lastLandingAt=player.elapsed;
    this.wasGrounded=player.grounded;
    const rear=catRearPose(
      player.grounded,player.vy,player.anim,player.elapsed-this.lastLandingAt,
    );
    const sideFrame=profileFrame(player.boost,player.grounded,player.anim);
    // The cleaned rear sheet now has separate takeoff/apex/fall/landing
    // animations instead of translating a frozen running pose upwards.
    const frame=view==='rear'?rearDisplayFrame(rear,player.boost):sideFrame;
    // Keep the kawaii sprite's colors; Rush adds a small warm tint only.
    const material=this.catSprite.material as THREE.SpriteMaterial;
    material.color.set(player.rewards.rushRemaining>0?'#fff1bd':'#ffffff');
    this.drawCat(frame,view==='rear',mirrorProfileForView(view));
    const isRear=view==='rear';
    const sliding=player.grounded&&onDescent(player.z);
    this.catSprite.scale.set(
      1.9*(isRear?rear.scaleX:1)*(sliding?1.07:1),
      1.9*(isRear?rear.scaleY:1)*(sliding?.79:1),
      1,
    );
    this.catSprite.position.y=(sliding?.68:.85)+(isRear?rear.yOffset:0);
    material.rotation=player.stumbleRemaining>0
      ?Math.sin(player.elapsed*22)*.13
      :isRear?rear.tilt:0;
  }
  dispose():void{
    this.resetRun(0);
    this.shadow.geometry.dispose();
    this.illustratedBuildings.dispose();
    this.fishArt.dispose();
    this.prototypeHouse?.dispose();
    this.gardenFeatures.dispose();
    this.districtBuildings.dispose();
    this.movingArt.dispose();
    this.materials.forEach(m=>m.dispose());
    this.textures.forEach(t=>t.dispose());
  }
}
