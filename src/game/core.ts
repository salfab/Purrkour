/** Pure, deterministic Purrkour gameplay. No browser or Three.js dependencies. */
import {segmentPlan,patternHasCrate,safeLaneX} from './gameplayDirector';
import {ROUTE_FORK,routeFromWorldX,activeRoute,type RouteChoice,type RouteStage} from './routeChoices';
export const WORLD = {
  trackWidth: 5,
  segmentLength: 100,
  gapStart: 68.5,
  gapEnd: 70.8,
  rampPeriod: 70,
  rampStart: 34,
  rampEnd: 50,
  rampRise: 1.35,
  gravity: 18,
  jumpVelocity: 7.4,
  bounceVelocity: 8.6,
  steeringSpeed: 12,
  speedStart: 3.8,
  acceleration: 0.07,
  speedMax: 8.5,
  boostSpeed: 1.7,
  boostDuration: 2.7,
  cameraHeight: 5.6,
  cameraDistance: 9.3,
  cameraPitch: 20,
} as const;

/**
 * Camera faces +Z, so the camera's screen-right direction is world -X.
 * Convert a normalized horizontal touch position to the matching world X.
 */
export function worldXFromScreenRatio(ratio: number): number {
  const clamped = Math.max(0, Math.min(1, ratio));
  return (1 - 2 * clamped) * (WORLD.trackWidth / 2 - .28);
}

export type GameMode = 'menu' | 'running' | 'paused' | 'over';
export type Failure = 'crate' | 'gap' | null;
export interface Player {
  x: number; y: number; z: number; vy: number; grounded: boolean; coyote: number;
  elapsed: number; speed: number; boost: number; anim: number; score: number;
  fish: number; bounces: number; failure: Failure; runSeed:number;
  routeChoice:RouteChoice|null; routeChosenAt:number|null;
}
export interface Controls {
  targetX: number | null; left: boolean; right: boolean; jump: boolean;
}
export interface Crate { id: string; x: number; z: number; width: number; depth: number; height: number; }
export type PickupKind = 'fish' | 'gold' | 'sky' | 'boost';
export interface Pickup {
  id: string; kind: PickupKind; x: number; y: number; z: number;
  points: number; fishes: number; rangeX: number; rangeY: number; rangeZ: number;
}
export interface Snapshot {
  mode: GameMode; distance: number; altitude: number; score: number; fish: number;
  bank: number; speed: number; boost: number; bounces: number; best: number;
  bestScore: number; failure: Failure; routeChoice:RouteChoice|null; routeStage:RouteStage;
}
export function groundHeight(z: number): number {
  const cycle = Math.max(0, Math.floor(Math.max(0, z) / WORLD.rampPeriod));
  const local = Math.max(0, z - cycle * WORLD.rampPeriod);
  const fraction = Math.max(0, Math.min(1, (local - WORLD.rampStart) / (WORLD.rampEnd - WORLD.rampStart)));
  return cycle * WORLD.rampRise + fraction * WORLD.rampRise;
}
export function isGap(z: number): boolean {
  if (z < 0) return false;
  // The 200–300 m segment contains the first fork. Keep its landing area
  // free of chasms while the camera is turning.
  if(Math.floor(z/WORLD.segmentLength)===2)return false;
  const local = z % WORLD.segmentLength;
  return local >= WORLD.gapStart && local <= WORLD.gapEnd;
}
export function cratesNear(start:number,end:number,runSeed=0,route:RouteChoice|null=null):Crate[]{
  const crates:Crate[]=[];
  for(let k=Math.max(0,Math.floor(start/100)-1);k<=Math.floor(end/100)+1;k++){
    const base=k*100;
    for(const placement of segmentPlan(k,runSeed,route).placements){
      if(!patternHasCrate(placement.id))continue;
      const label=placement.slot==='intro'?'a':placement.slot==='choice'?'b':placement.slot==='pressure'?'t':'c';
      crates.push({
        id:label+'-'+k,
        x:placement.x,z:base+placement.at,width:1.2,depth:1.7,height:.85,
      });
    }
  }
  return crates.filter(c=>c.z>=start-2&&c.z<=end+2);
}

export function pickupsNear(start:number,end:number,runSeed=0,route:RouteChoice|null=null):Pickup[]{
  const result:Pickup[]=[];
  for(let k=Math.max(0,Math.floor(start/100)-1);k<=Math.floor(end/100)+1;k++){
    const base=k*100;
    const add=(id:string,kind:PickupKind,x:number,localZ:number,height:number,points:number,fishes:number,rx=.4,ry=.5,rz=.52):void=>{
      const z=base+localZ;
      result.push({id:id+'-'+k,kind,x,z,y:groundHeight(z)+height,points,fishes,rangeX:rx,rangeY:ry,rangeZ:rz});
    };
    const fishLine=(label:string,positions:readonly number[],at:number,spacing:number,height=.4):void=>{
      positions.forEach((x,i)=>add(label+'-'+i,'fish',x,at+i*spacing,height,10,1));
    };
    // Every segment starts with a gentle visual/collection cue.
    fishLine('opening',[-1.6,-.8,0,.8,1.6],8,.65);
    const plan=segmentPlan(k,runSeed,route);
    const beforeGap=plan.placements.find(p=>p.slot==='pressure');
    for(const p of plan.placements){
      const {id,at,x,slot}=p;
      const prefix=slot+'-'+id;
      if(id==='fish-lane'){
        fishLine(prefix,[x-.55,x-.28,x,x+.28,x+.55].map(v=>Math.max(-1.65,Math.min(1.65,v))),at,.85);
      }else if(id==='recovery-strip'){
        fishLine(prefix,[-1.4,-.9,-.4,.4,.9,1.4],at,1.05);
      }else if(id==='slalom'){
        const dir=k%2===0?1:-1;
        fishLine(prefix,[-1.45,-.55,.55,1.45].map(v=>dir*v),at-1.8,.82);
      }else if(id==='boost-trail'){
        add(prefix+'-star','boost',x,at,.7,120,0,.46,.56,.55);
        fishLine(prefix+'-trail',[x,x*.72,x*.4,0,-x*.4],at+1.05,.65,.55);
      }else if(id==='weave'){
        const sx=safeLaneX(x);
        fishLine(prefix+'-safe',[sx,sx,sx],at-2.5,1,.42);
        fishLine(prefix+'-exit',[-.65,0,.65],at+3,.82,.42);
      }else{
        const bounce=id==='bounce-grab';
        const premium=bounce?180:100;
        add(prefix+'-gold',bounce?'sky':'gold',x,at+(bounce?2:1.2),bounce?2.95:2.36,premium,bounce?5:3,.58,bounce?.46:.66,.98);
        // A separate safe reward route prevents forcing the hard bounce.
        const safe=safeLaneX(x);
        fishLine(prefix+'-safe',[safe,safe,safe],at+1.2,.68,.4);
        if(bounce){
          [2.15,1.77,1.38,.96].forEach((height,i)=>{
            add(prefix+'-arc-'+i,'fish',x,at+3.1+i*.72,height,18,1,.36,.50,.54);
          });
        }
      }
    }
    // Preserve the original easy star during the tutorial; later cycles
    // have explicitly selected boost patterns rather than guaranteed boosts.
    if(k===0){
      add('speed-boost','boost',.75,28,.68,120,0,.48,.56,.54);
      fishLine('boost-trail',[.75,.3,-.15,-.60,-1.05],29,.65);
      fishLine('ramp-fish',[1.42,1.42,.75,.75],33.4,.92);
    }else if(beforeGap?.id!=='weave'){
      fishLine('gap-approach',[1.3,1.3],61.5,1,.45);
    }
  }
  return result.filter(item=>item.z>=start-2&&item.z<=end+2);
}
export function makePlayer(runSeed=0): Player {
  return { x: 0, y: 0, z: 0, vy: 0, grounded: true, coyote: .1, elapsed: 0,
    speed: WORLD.speedStart, boost: 0, anim: 0, score: 0, fish: 0, bounces: 0, failure: null,runSeed,
    routeChoice:null,routeChosenAt:null };
}
export function simulate(player: Player, controls: Controls, collected: Set<string>, dt: number): void {
  if (player.failure) return;
  player.elapsed += dt;
  player.boost = Math.max(0, player.boost - dt);
  player.speed = Math.min(WORLD.speedMax, WORLD.speedStart + WORLD.acceleration * player.elapsed) + (player.boost > 0 ? WORLD.boostSpeed : 0);
  player.anim += dt * (5.5 + 1.15 * player.speed);
  player.coyote = player.grounded ? .11 : Math.max(0, player.coyote - dt);
  if (controls.jump && (player.grounded || player.coyote > 0)) {
    player.vy = WORLD.jumpVelocity;
    player.grounded = false;
    player.coyote = 0;
  }
  controls.jump = false;
  if (controls.targetX !== null) {
    const delta = controls.targetX - player.x;
    player.x += Math.max(-WORLD.steeringSpeed * dt, Math.min(WORLD.steeringSpeed * dt, delta));
  } else {
    player.x += (Number(controls.left) - Number(controls.right)) * WORLD.steeringSpeed * .55 * dt;
  }
  player.x = Math.max(-WORLD.trackWidth / 2 + .25, Math.min(WORLD.trackWidth / 2 - .25, player.x));
  const priorZ = player.z;
  const priorY = player.y;
  player.z += player.speed * dt;
  if(player.routeChoice===null && priorZ<ROUTE_FORK.chooseZ && player.z>=ROUTE_FORK.chooseZ){
    player.routeChoice=routeFromWorldX(player.x);
    player.routeChosenAt=player.elapsed;
  }
  const route=activeRoute(player.z,player.routeChoice);
  if (!player.grounded) {
    player.vy -= WORLD.gravity * dt;
    player.y += player.vy * dt;
  }
  const crates = cratesNear(priorZ - 2, player.z + 2, player.runSeed,route).filter(crate =>
    Math.abs(player.x - crate.x) < crate.width / 2 + .28 &&
    Math.abs(player.z - crate.z) < crate.depth / 2 + .3);
  let bounced = false;
  if (!player.grounded && player.vy <= 0) {
    for (const crate of crates) {
      const top = groundHeight(crate.z) + crate.height;
      if (priorY >= top - .12 && player.y <= top + .05) {
        player.y = top;
        player.vy = WORLD.bounceVelocity;
        player.coyote = 0;
        player.bounces++;
        player.score += 35;
        bounced = true;
        break;
      }
    }
  }
  if (!bounced) {
    const floor = groundHeight(player.z);
    if (player.grounded) {
      if (isGap(player.z)) {
        player.grounded = false;
        player.vy = 0;
      } else {
        player.y = floor;
      }
    } else if (player.vy <= 0 && !isGap(player.z) && player.y <= floor + .05) {
      if (player.y < floor - .18) player.failure = 'gap';
      else { player.y = floor; player.vy = 0; player.grounded = true; }
    }
    if (!player.grounded && isGap(player.z) && player.y < floor - .58) player.failure = 'gap';
    for (const crate of crates) {
      if (player.y < groundHeight(crate.z) + crate.height - .18) {
        player.failure = 'crate';
        break;
      }
    }
  }
  if (player.failure) return;
  for (const item of pickupsNear(player.z - 1.2, player.z + 1.6, player.runSeed,route)) {
    if (collected.has(item.id)) continue;
    if (Math.abs(player.x - item.x) < item.rangeX &&
        Math.abs(player.z - item.z) < item.rangeZ &&
        Math.abs(player.y + .6 - item.y) < item.rangeY) {
      collected.add(item.id);
      player.score += item.kind === 'boost' ? item.points : item.points * (player.boost > 0 ? 2 : 1);
      player.fish += item.fishes;
      if (item.kind === 'boost') player.boost = Math.min(5.5, player.boost + WORLD.boostDuration);
    }
  }
}
