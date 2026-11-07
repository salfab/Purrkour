/** Pure, deterministic Purrkour gameplay. No browser or Three.js dependencies. */
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
  fish: number; bounces: number; failure: Failure;
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
  bestScore: number; failure: Failure;
}
export function groundHeight(z: number): number {
  const cycle = Math.max(0, Math.floor(Math.max(0, z) / WORLD.rampPeriod));
  const local = Math.max(0, z - cycle * WORLD.rampPeriod);
  const fraction = Math.max(0, Math.min(1, (local - WORLD.rampStart) / (WORLD.rampEnd - WORLD.rampStart)));
  return cycle * WORLD.rampRise + fraction * WORLD.rampRise;
}
export function isGap(z: number): boolean {
  if (z < 0) return false;
  const local = z % WORLD.segmentLength;
  return local >= WORLD.gapStart && local <= WORLD.gapEnd;
}
export function cratesNear(start: number, end: number): Crate[] {
  const result: Crate[] = [];
  for (let k = Math.max(0, Math.floor(start / 100) - 1); k <= Math.floor(end / 100) + 1; k++) {
    const base = k * 100;
    result.push(
      { id: 'a-' + k, x: -1.35, z: base + 18, width: 1.2, height: .85, depth: 1.7 },
      { id: 'b-' + k, x: 1.30, z: base + 41, width: 1.2, height: .85, depth: 1.7 },
      { id: 'c-' + k, x: 0, z: base + 88, width: 1.2, height: .85, depth: 1.7 },
    );
  }
  return result.filter(c => c.z >= start - 2 && c.z <= end + 2);
}
export function pickupsNear(start: number, end: number): Pickup[] {
  const result: Pickup[] = [];
  for (let k = Math.max(0, Math.floor(start / 100) - 1); k <= Math.floor(end / 100) + 1; k++) {
    const base = k * 100;
    [-1.6, -.8, 0, .8, 1.6].forEach((x, i) => {
      const z = base + 8 + i * .65;
      result.push({ id: 'fish-' + k + '-' + i, kind: 'fish', x, z, y: groundHeight(z) + .38, points: 10, fishes: 1, rangeX: .4, rangeY: .5, rangeZ: .52 });
    });
    for (let i = 0; i < 3; i++) {
      const z = base + 33.6 + i;
      result.push({ id: 'ramp-' + k + '-' + i, kind: 'fish', x: 1.42, z, y: groundHeight(z) + .45, points: 10, fishes: 1, rangeX: .38, rangeY: .5, rangeZ: .5 });
    }
    for (const [name, x, at] of [['a', -1.35, 18], ['b', 1.3, 41], ['c', 0, 88]] as const) {
      // After 100 m, the high fish sits beyond the maximum normal jump height,
      // but within the bounce arc from the crate below it.
      const needsBounce = k >= 1;
      result.push({
        id: (needsBounce ? 'sky-' : 'gold-') + name + '-' + k,
        kind: needsBounce ? 'sky' : 'gold',
        x,
        z: base + at + (needsBounce ? 2 : 1.2),
        y: groundHeight(base + at) + (needsBounce ? 2.95 : 2.4),
        points: needsBounce ? 180 : 100,
        fishes: needsBounce ? 5 : 3,
        rangeX: .58, rangeY: needsBounce ? .46 : .66, rangeZ: .95,
      });
    }
    result.push({ id: 'boost-' + k, kind: 'boost', x: .75, z: base + 28, y: groundHeight(base + 28) + .68, points: 120, fishes: 0, rangeX: .48, rangeY: .56, rangeZ: .54 });
  }
  return result.filter(item => item.z >= start - 2 && item.z <= end + 2);
}
export function makePlayer(): Player {
  return { x: 0, y: 0, z: 0, vy: 0, grounded: true, coyote: .1, elapsed: 0,
    speed: WORLD.speedStart, boost: 0, anim: 0, score: 0, fish: 0, bounces: 0, failure: null };
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
  if (!player.grounded) {
    player.vy -= WORLD.gravity * dt;
    player.y += player.vy * dt;
  }
  const crates = cratesNear(priorZ - 2, player.z + 2).filter(crate =>
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
  for (const item of pickupsNear(player.z - 1.2, player.z + 1.6)) {
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
