import * as THREE from 'three';
import { WORLD, groundHeight, makePlayer, simulate, type GameMode, type Player, type Snapshot } from './core';
import { ArtWorld } from './ArtWorld';
import { ThumbControls } from './ThumbControls';

export type UpdateListener = (snapshot: Snapshot) => void;

function storedNumber(key: string): number {
  try { return Math.max(0, Number(localStorage.getItem(key)) || 0); } catch { return 0; }
}
function storeNumber(key: string, value: number): void {
  try { localStorage.setItem(key, String(value)); } catch { /* privacy mode */ }
}

/** Owns the fixed-step simulation and all WebGL resources. React never renders every frame. */
export class PurrkourGame {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera=new THREE.PerspectiveCamera(64,1,.1,180);
  private readonly scene=new THREE.Scene();
  private readonly horizonTexture:THREE.Texture;
  private readonly world=new ArtWorld();
  private readonly controls: ThumbControls;
  private readonly music:HTMLAudioElement;
  private muted=false;
  private readonly resizeObserver: ResizeObserver;
  private readonly onUpdate: UpdateListener;
  private readonly collected=new Set<string>();
  private player: Player=makePlayer();
  private mode: GameMode='menu';
  private best=storedNumber('purrkour-best-v1');
  private bestScore=storedNumber('purrkour-best-score-v4');
  private bank=storedNumber('purrkour-fish-bank-v05');
  private last=0;
  private accumulator=0;
  private hudTimer=0;
  private frameId=0;
  private disposed=false;
  private pitch:number=WORLD.cameraPitch;

  constructor(canvas: HTMLCanvasElement, onUpdate: UpdateListener) {
    this.onUpdate=onUpdate;
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.scene.background=new THREE.Color('#bfe6f5');
    const horizon=new THREE.TextureLoader().load(
      `${import.meta.env.BASE_URL}assets/backgrounds/mediterranean_horizon.avif`,
      texture=>{ texture.colorSpace=THREE.SRGBColorSpace; this.scene.background=texture; },
      undefined,
      ()=>console.warn('Purrkour: horizon image unavailable; using sky color'),
    );
    horizon.colorSpace=THREE.SRGBColorSpace;
    this.horizonTexture=horizon;
    this.scene.fog=new THREE.Fog('#bfe6f5',38,120);
    this.scene.add(new THREE.HemisphereLight('#ffffff','#bc9e91',2.1));
    const sunlight=new THREE.DirectionalLight('#fff3d6',2.4);
    sunlight.position.set(-7,15,-10);this.scene.add(sunlight);
    this.scene.add(this.world.group,this.world.cat);
    this.music=new Audio(`${import.meta.env.BASE_URL}assets/audio/music.mp3`);
    this.music.loop=true;
    this.music.preload='auto';
    this.music.volume=.35;
    try{this.muted=localStorage.getItem('purrkour-music-muted')==='true';}catch{this.muted=false;}
    this.music.muted=this.muted;
    this.controls=new ThumbControls(canvas);
    this.resizeObserver=new ResizeObserver(()=>this.resize(canvas));
    this.resizeObserver.observe(canvas);
    this.resize(canvas);
    document.addEventListener('visibilitychange',this.visibility);
    this.publish();
    this.frameId=requestAnimationFrame(this.frame);
  }
  private visibility = (): void => {
    if(document.visibilityState==='hidden')this.pause();
  };
  private resize(canvas:HTMLCanvasElement):void{
    const bounds=canvas.getBoundingClientRect();
    const width=Math.max(1,bounds.width),height=Math.max(1,bounds.height);
    this.renderer.setSize(width,height,false);
    this.camera.aspect=width/height;
    this.camera.updateProjectionMatrix();
  }
  start():void{
    this.player=makePlayer();this.collected.clear();
    this.accumulator=0;this.hudTimer=0;
    this.mode='running';this.controls.setEnabled(true);
    this.playMusic();
    this.publish();
  }
  pause():void{
    if(this.mode!=='running')return;
    this.mode='paused';this.controls.setEnabled(false);this.music.pause();this.publish();
  }
  resume():void{
    if(this.mode!=='paused')return;
    this.mode='running';this.controls.setEnabled(true);this.playMusic();this.publish();
  }
  get musicMuted():boolean{return this.muted;}
  toggleMusic():boolean{
    this.muted=!this.muted;
    this.music.muted=this.muted;
    try{localStorage.setItem('purrkour-music-muted',String(this.muted));}catch{}
    if(this.muted)this.music.pause();
    else if(this.mode==='running')this.playMusic();
    return this.muted;
  }
  private playMusic():void{
    if(this.muted)return;
    void this.music.play().catch(()=>{/* Playback may require a user gesture. */});
  }
  cycleCamera():number{
    const choices=[14,20,26,32] as const;
    const i=choices.indexOf(this.pitch as typeof choices[number]);
    this.pitch=choices[(i+1)%choices.length]??20;
    return this.pitch;
  }
  private readonly frame=(time:number):void=>{
    if(this.disposed)return;
    const dt=this.last?Math.min(.05,(time-this.last)/1000):0;
    this.last=time;
    if(this.mode==='running'){
      this.accumulator=Math.min(.08,this.accumulator+dt);
      for(let i=0;i<10&&this.accumulator>=1/120;i++){
        simulate(this.player,this.controls.state,this.collected,1/120);
        this.accumulator-=1/120;
        if(this.player.failure){this.end();break;}
      }
      this.hudTimer+=dt;
      if(this.hudTimer>.10){this.hudTimer=0;this.publish();}
    }
    this.world.update(this.player,this.collected);
    const radians=this.pitch*Math.PI/180;
    const y=groundHeight(this.player.z)+WORLD.cameraHeight,z=this.player.z-WORLD.cameraDistance;
    this.camera.position.set(0,y,z);
    this.camera.lookAt(0,y-12*Math.sin(radians),z+12*Math.cos(radians));
    this.renderer.render(this.scene,this.camera);
    this.frameId=requestAnimationFrame(this.frame);
  };
  private end():void{
    if(this.mode!=='running')return;
    this.mode='over';this.controls.setEnabled(false);this.music.pause();
    this.best=Math.max(this.best,Math.floor(this.player.z));
    this.bestScore=Math.max(this.bestScore,this.player.score);
    this.bank+=this.player.fish;
    storeNumber('purrkour-best-v1',this.best);
    storeNumber('purrkour-best-score-v4',this.bestScore);
    storeNumber('purrkour-fish-bank-v05',this.bank);
    this.publish();
  }
  private publish():void{
    this.onUpdate({
      mode:this.mode,distance:Math.floor(this.player.z),altitude:groundHeight(this.player.z),
      speed:this.player.speed,score:this.player.score,fish:this.player.fish,
      bank:this.bank,boost:this.player.boost,bounces:this.player.bounces,
      best:this.best,bestScore:this.bestScore,failure:this.player.failure,
    });
  }
  dispose():void{
    this.disposed=true;cancelAnimationFrame(this.frameId);
    document.removeEventListener('visibilitychange',this.visibility);
    this.resizeObserver.disconnect();this.controls.dispose();
    this.music.pause();this.music.removeAttribute('src');this.music.load();
    this.world.dispose();this.horizonTexture.dispose();this.renderer.dispose();
  }
}
