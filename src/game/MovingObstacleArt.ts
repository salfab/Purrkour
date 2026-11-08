import * as THREE from 'three';
import type {MovingObstacle} from './movingObstacles';
import {movingObstacleNearby,movingObstacleX} from './movingObstacles';
import {groundHeight} from './core';
import {routePoint} from './routeGeometry';
import type {RouteChoice} from './routeChoices';

/** Low-cost warm, illustrative obstacles with no external texture downloads. */
export class MovingObstacleArt{
  private readonly materials:THREE.Material[]=[];
  private readonly textures:THREE.Texture[]=[];
  private readonly birdFrames:readonly THREE.SpriteMaterial[];
  private readonly alert:THREE.SpriteMaterial;
  private readonly wood:THREE.MeshLambertMaterial;
  private readonly woodTrim:THREE.MeshLambertMaterial;
  private readonly wheels:THREE.MeshLambertMaterial;
  private readonly oranges:THREE.MeshLambertMaterial;
  private readonly leaves:THREE.MeshLambertMaterial;

  constructor(){
    this.birdFrames=[this.drawBird(false),this.drawBird(true)];
    this.alert=this.createSpriteMaterial(this.paint(96,c=>{
      c.fillStyle='#fff6da';c.strokeStyle='#805943';c.lineWidth=5;
      c.beginPath();c.arc(48,48,37,0,Math.PI*2);c.fill();c.stroke();
      c.fillStyle='#e48d38';c.font='bold 57px sans-serif';
      c.textAlign='center';c.textBaseline='middle';c.fillText('!',48,51);
    }));
    const material=(hex:string)=>{
      const m=new THREE.MeshLambertMaterial({color:hex,flatShading:true});
      this.materials.push(m);return m;
    };
    this.wood=material('#b77c4b');
    this.woodTrim=material('#e4ab69');
    this.wheels=material('#4b535a');
    this.oranges=material('#f6ae40');
    this.leaves=material('#619e72');
  }

  private paint(size:number,paint:(c:CanvasRenderingContext2D)=>void):THREE.CanvasTexture{
    const canvas=document.createElement('canvas');
    canvas.width=size;canvas.height=size;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('Purrkour requires Canvas2D for obstacles');
    ctx.clearRect(0,0,size,size);
    paint(ctx);
    const texture=new THREE.CanvasTexture(canvas);
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.generateMipmaps=false;
    texture.minFilter=THREE.LinearFilter;
    texture.magFilter=THREE.LinearFilter;
    this.textures.push(texture);
    return texture;
  }

  private createSpriteMaterial(tex:THREE.Texture):THREE.SpriteMaterial{
    const m=new THREE.SpriteMaterial({
      map:tex,transparent:true,alphaTest:.04,depthWrite:false,
    });
    this.materials.push(m);
    return m;
  }

  private drawBird(wingsUp:boolean):THREE.SpriteMaterial{
    const tex=this.paint(160,c=>{
      c.lineJoin='round';c.lineCap='round';
      // Plump lavender-gray pigeons with a soft white outline.
      c.fillStyle='#d8dce4';c.strokeStyle='#75869d';c.lineWidth=4;
      if(wingsUp){
        c.beginPath();c.moveTo(75,91);c.quadraticCurveTo(37,40,51,16);
        c.quadraticCurveTo(79,34,91,83);c.closePath();c.fill();c.stroke();
        c.beginPath();c.moveTo(93,91);c.quadraticCurveTo(134,31,121,15);
        c.quadraticCurveTo(96,33,83,82);c.closePath();c.fill();c.stroke();
      }else{
        c.beginPath();c.moveTo(67,84);c.quadraticCurveTo(16,69,13,94);
        c.quadraticCurveTo(37,111,79,97);c.closePath();c.fill();c.stroke();
        c.beginPath();c.moveTo(92,83);c.quadraticCurveTo(149,68,153,94);
        c.quadraticCurveTo(124,113,82,97);c.closePath();c.fill();c.stroke();
      }
      c.fillStyle='#b7bfcf';c.beginPath();c.ellipse(81,94,29,28,0,0,Math.PI*2);c.fill();c.stroke();
      c.fillStyle='#e9dfe3';c.beginPath();c.ellipse(93,70,18,22,0,0,Math.PI*2);c.fill();c.stroke();
      c.fillStyle='#222f42';c.beginPath();c.arc(99,67,3.5,0,Math.PI*2);c.fill();
      c.fillStyle='#f4b958';c.beginPath();c.moveTo(106,77);c.lineTo(129,82);c.lineTo(106,87);c.closePath();c.fill();
      c.strokeStyle='#cf8d66';c.lineWidth=3;
      c.beginPath();c.moveTo(71,118);c.lineTo(68,131);c.moveTo(85,118);c.lineTo(87,130);c.stroke();
    });
    return this.createSpriteMaterial(tex);
  }

  private box(
    parent:THREE.Group,width:number,height:number,depth:number,
    x:number,y:number,z:number,material:THREE.Material,
  ):void{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),material);
    mesh.position.set(x,y,z);parent.add(mesh);
  }

  create(obstacle:MovingObstacle):THREE.Group{
    const root=new THREE.Group();
    if(obstacle.kind==='pigeons'){
      const birds=new THREE.Group();
      birds.name='birds';
      root.add(birds);
      for(const offset of [-.43,0,.43]){
        const sprite=new THREE.Sprite(this.birdFrames[0]);
        sprite.scale.set(.94,.94,1);
        sprite.position.set(offset,.88+Math.abs(offset)*.13,-Math.abs(offset)*.17);
        birds.add(sprite);
      }
    }else{
      this.box(root,1.30,.55,1.35,0,.75,0,this.wood);
      this.box(root,1.43,.12,1.49,0,1.07,0,this.woodTrim);
      for(const x of [-.69,.69]){
        for(const z of [-.46,.46]){
          const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.13,12),this.wheels);
          wheel.rotation.z=Math.PI/2;
          wheel.position.set(x,.34,z);
          root.add(wheel);
        }
      }
      for(const [x,z] of [[-.32,-.24],[.05,-.31],[.38,-.12],[-.20,.20],[.23,.27]] as const){
        const fruit=new THREE.Mesh(new THREE.SphereGeometry(.21,8,6),this.oranges);
        fruit.position.set(x,1.27,z);
        root.add(fruit);
        const leaf=new THREE.Mesh(new THREE.ConeGeometry(.08,.16,5),this.leaves);
        leaf.position.set(x,1.49,z);
        root.add(leaf);
      }
    }
    const signal=new THREE.Sprite(this.alert);
    signal.name='warning';
    signal.position.set(0,obstacle.kind==='pigeons'?1.90:2.15,0);
    signal.scale.set(.58,.58,1);
    root.add(signal);
    return root;
  }

  update(
    root:THREE.Group,obstacle:MovingObstacle,
    runnerDistance:number,elapsed:number,route:RouteChoice|null,
  ):void{
    const world=routePoint(obstacle.z,movingObstacleX(obstacle,runnerDistance),route);
    root.position.set(world.x,groundHeight(obstacle.z),world.z);
    root.rotation.y=world.yaw;
    const warning=root.getObjectByName('warning');
    if(warning)warning.visible=movingObstacleNearby(obstacle,runnerDistance)
      &&runnerDistance<obstacle.z+1.5;
    if(obstacle.kind==='pigeons'){
      const birds=root.getObjectByName('birds');
      if(!birds)return;
      birds.position.y=.10*Math.sin(elapsed*13);
      const frame=Math.floor(elapsed*10)%2;
      for(const child of birds.children){
        if(child instanceof THREE.Sprite)child.material=this.birdFrames[frame]!;
      }
    }else{
      root.rotation.z=.04*Math.sin(elapsed*4+obstacle.z);
    }
  }

  dispose():void{
    this.materials.forEach(m=>m.dispose());
    this.textures.forEach(t=>t.dispose());
  }
}
