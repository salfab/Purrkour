import * as THREE from 'three';
import { WORLD, groundHeight, makePlayer, simulate, type GameMode, type Player, type Snapshot } from './core';
import { ArtWorld } from './ArtWorld';
import { ThumbControls } from './ThumbControls';
import { ScenicBackdrop } from './ScenicBackdrop';
import {RouteForkView} from './RouteForkView';
import {forkStage} from './routeChoices';
import {routePose} from './routeGeometry';
import {cameraBlendFactor,frameRouteCamera} from './routeCamera';
import {comboMultiplier} from './rewards';
import {RushEffects} from './RushEffects';
import {DISTRICTS,districtAt,districtBlend} from './districts';

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
  private readonly desiredCamera=new THREE.PerspectiveCamera(64,1,.1,180);
  private cameraInitialized=false;
  private artShot=false;
  private readonly scene=new THREE.Scene();
  private readonly skyColors=DISTRICTS.map(d=>new THREE.Color(d.sky));
  private readonly fogColors=DISTRICTS.map(d=>new THREE.Color(d.fog));
  private readonly horizonColors=DISTRICTS.map(d=>new THREE.Color(d.panoramaTint));
  private readonly sunColors=DISTRICTS.map(d=>new THREE.Color(d.sunlight));
  private readonly horizonTint=new THREE.Color();
  private readonly sunlight=new THREE.DirectionalLight('#fff3d6',2.4);
  private readonly backdrop=new ScenicBackdrop();
  private readonly world=new ArtWorld();
  private readonly rushEffects=new RushEffects();
  private readonly fork=new RouteForkView({pavement:this.world.forkPavementMaterial,curb:this.world.forkCurbMaterial});
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
    // The sky remains a single color. The illustrated town is an independent
    // world-space panorama, so mobile aspect ratios never stretch the picture.
    this.scene.background=new THREE.Color('#a9d4e8');
    this.scene.fog=new THREE.Fog('#c8dbe0',34,108);
    this.scene.add(new THREE.HemisphereLight('#ffffff','#bc9e91',2.1));
    this.sunlight.position.set(-7,15,-10);this.scene.add(this.sunlight);
    this.scene.add(this.backdrop.group,this.world.group,this.fork.group,
      this.rushEffects.group,this.world.cat);
    this.music=new Audio(`${import.meta.env.BASE_URL}assets/audio/soundtrack_1.mp3`);
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
    // Snapshot mode for automated REAL WebGL screenshots. Never changes
    // ordinary runs or grants any reward. The run is frozen at a chosen
    // distance and only enabled with an explicit query parameter.
    const shot=new URLSearchParams(window.location.search).get('artShot');
    if(shot!==null&&Number.isFinite(Number(shot))){
      const distance=Math.max(0,Math.min(6000,Number(shot)));
      this.player=makePlayer(813);
      this.player.z=distance;
      this.player.y=groundHeight(distance);
      this.player.grounded=true;
      if(distance>=250){
        this.player.routeChoice='fish';
        this.player.routeChosenAt=0;
      }
      this.world.resetRun(this.player.runSeed);
      this.mode='running';
      this.artShot=true;
      this.controls.setEnabled(false);
    }
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
    this.desiredCamera.aspect=width/height;
    this.camera.updateProjectionMatrix();
    this.desiredCamera.updateProjectionMatrix();
  }
  start():void{
    const runSeed=Date.now()|0;
    this.player=makePlayer(runSeed);this.collected.clear();
    this.world.resetRun(runSeed);
    this.cameraInitialized=false;
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
    if(this.mode==='running'&&!this.artShot){
      this.accumulator=Math.min(.08,this.accumulator+dt);
      for(let i=0;i<10&&this.accumulator>=1/120;i++){
        simulate(this.player,this.controls.state,this.collected,1/120);
        this.accumulator-=1/120;
        if(this.player.failure){this.end();break;}
      }
      this.hudTimer+=dt;
      if(this.hudTimer>.10){this.hudTimer=0;this.publish();}
    }
    const blend=districtBlend(this.player.z);
    const currentIndex=DISTRICTS.findIndex(d=>d.key===blend.current.key);
    const nextIndex=(currentIndex+1)%DISTRICTS.length;
    const current=Math.max(0,currentIndex);
    (this.scene.background as THREE.Color)
      .copy(this.skyColors[current]!).lerp(this.skyColors[nextIndex]!,blend.factor);
    (this.scene.fog as THREE.Fog).color
      .copy(this.fogColors[current]!).lerp(this.fogColors[nextIndex]!,blend.factor);
    this.sunlight.color
      .copy(this.sunColors[current]!).lerp(this.sunColors[nextIndex]!,blend.factor);
    this.horizonTint
      .copy(this.horizonColors[current]!).lerp(this.horizonColors[nextIndex]!,blend.factor);
    this.world.update(this.player,this.collected);
    this.rushEffects.update(this.player,this.mode==='running');
    this.fork.update(this.player.routeChoice,this.player.elapsed,this.player.z);
    frameRouteCamera(
      this.desiredCamera,this.player.z,this.player.routeChoice,this.pitch,
      groundHeight,WORLD.cameraDistance,WORLD.cameraHeight,
    );
    if(!this.cameraInitialized){
      this.camera.position.copy(this.desiredCamera.position);
      this.camera.quaternion.copy(this.desiredCamera.quaternion);
      this.camera.fov=this.desiredCamera.fov;
      this.cameraInitialized=true;
    }else{
      const smoothing=cameraBlendFactor(dt);
      this.camera.position.lerp(this.desiredCamera.position,smoothing);
      this.camera.quaternion.slerp(this.desiredCamera.quaternion,smoothing);
      this.camera.fov+=
        (this.desiredCamera.fov-this.camera.fov)*smoothing;
    }
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    this.backdrop.update(
      this.player.z,groundHeight(this.player.z),
      routePose(this.player.z,this.player.routeChoice),
      this.horizonTint,
    );
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
    const district=districtAt(this.player.z);
    this.onUpdate({
      mode:this.mode,distance:Math.floor(this.player.z),altitude:groundHeight(this.player.z),
      speed:this.player.speed,score:this.player.score,fish:this.player.fish,
      bank:this.bank,boost:this.player.boost,bounces:this.player.bounces,
      best:this.best,bestScore:this.bestScore,failure:this.player.failure,
      routeChoice:this.player.routeChoice,routeStage:forkStage(this.player.z,this.player.routeChoice,this.player.elapsed,this.player.routeChosenAt),
      instinct:this.player.rewards.instinct,rush:this.player.rewards.rushRemaining,
      rushCount:this.player.rewards.rushCount,
      comboMultiplier:comboMultiplier(this.player.rewards),
      comboChain:this.player.rewards.comboChain,
      rewardFeedback:this.player.rewards.feedback,
      lastComboBonus:this.player.rewards.lastBonus,
      stumble:this.player.stumbleRemaining,
      cartBounces:this.player.cartBounces,
      districtIndex:district.ordinal,
      districtName:district.theme.name,
      nextDistrictName:district.next.name,
      districtRemaining:Math.ceil(district.remaining),
      districtWithin:Math.floor(district.within),
    });
  }
  dispose():void{
    this.disposed=true;cancelAnimationFrame(this.frameId);
    document.removeEventListener('visibilitychange',this.visibility);
    this.resizeObserver.disconnect();this.controls.dispose();
    this.music.pause();this.music.removeAttribute('src');this.music.load();
    this.world.dispose();this.rushEffects.dispose();this.fork.dispose();this.backdrop.dispose();this.renderer.dispose();
  }
}
