import { describe, expect, it } from 'vitest';
import { WORLD, cratesNear, groundHeight, isGap, makePlayer, pickupsNear, simulate, type Controls } from '../src/game/core';

function input(): Controls { return { targetX: null, left: false, right: false, jump: false }; }
describe('Purrkour deterministic gameplay', () => {
  it('creates consistent ground geometry and obstacles', () => {
    expect(groundHeight(34)).toBe(0);
    expect(groundHeight(42)).toBeCloseTo(.675);
    expect(isGap(69)).toBe(true);
    expect(cratesNear(0,100).some(c => c.z === 18)).toBe(true);
    expect(pickupsNear(0,100).some(p => p.kind === 'gold')).toBe(true);
  });
  it('jumps when the player requests a jump', () => {
    const player = makePlayer(); const cmd = input();
    cmd.jump = true; simulate(player,cmd,new Set(),1/120);
    expect(player.grounded).toBe(false); expect(player.vy).toBeGreaterThan(0);
    expect(cmd.jump).toBe(false);
  });
  it('gradually increases speed but clamps the normal maximum', () => {
    const player = makePlayer(); player.elapsed=200;
    simulate(player,input(),new Set(),1/120);
    expect(player.speed).toBe(WORLD.speedMax);
  });
  it('ends a run on a front-facing crate impact', () => {
    const player=makePlayer(); player.x=-1.35; player.z=16.9;
    for(let i=0;i<25&&!player.failure;i++)simulate(player,input(),new Set(),1/120);
    expect(player.failure).toBe('crate');
  });
  it('bounces from the top of a crate', () => {
    const player=makePlayer(); player.x=-1.35; player.z=17.85; player.y=1.1;
    player.vy=-3; player.grounded=false;
    for(let i=0;i<20&&!player.failure&&player.bounces===0;i++)simulate(player,input(),new Set(),1/120);
    expect(player.failure).toBe(null); expect(player.bounces).toBe(1); expect(player.vy).toBe(WORLD.bounceVelocity);
  });
});
