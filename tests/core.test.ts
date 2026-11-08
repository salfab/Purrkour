import { describe, expect, it } from 'vitest';
import { WORLD, cratesNear, groundHeight, isGap, makePlayer, pickupsNear, simulate, worldXFromScreenRatio, type Controls } from '../src/game/core';

function input(): Controls { return { targetX: null, left: false, right: false, jump: false }; }
describe('Purrkour deterministic gameplay', () => {
  it('maps screen-left to screen-left and screen-right to screen-right with the +Z camera', () => {
    expect(worldXFromScreenRatio(0)).toBeGreaterThan(0);
    expect(worldXFromScreenRatio(.5)).toBeCloseTo(0);
    expect(worldXFromScreenRatio(1)).toBeLessThan(0);
    const pointerPlayer=makePlayer();
    const pointerControls=input();
    pointerControls.targetX=worldXFromScreenRatio(.85);
    simulate(pointerPlayer,pointerControls,new Set(),1/120);
    expect(pointerPlayer.x).toBeLessThan(0);
    const keyboardPlayer=makePlayer();
    const keyboardControls=input();
    keyboardControls.right=true;
    simulate(keyboardPlayer,keyboardControls,new Set(),1/120);
    expect(keyboardPlayer.x).toBeLessThan(0);
    keyboardControls.right=false;
    keyboardControls.left=true;
    simulate(keyboardPlayer,keyboardControls,new Set(),1/120);
    expect(keyboardPlayer.x).toBeCloseTo(0);
  });
  it('creates consistent ground geometry and obstacles', () => {
    expect(groundHeight(34)).toBe(0);
    expect(groundHeight(42)).toBeCloseTo(.675);
    expect(isGap(69)).toBe(true);
    expect(cratesNear(0,100).some(c => c.z === 18)).toBe(true);
    expect(pickupsNear(0,100).some(p => p.kind === 'gold')).toBe(true);
    expect(pickupsNear(0,100).some(p => p.kind === 'sky')).toBe(false);
    expect(pickupsNear(100,200).some(p => p.kind === 'sky')).toBe(true);
    expect(pickupsNear(100,200).some(p => p.kind === 'gold')).toBe(true);
    expect(pickupsNear(0,100).some(p => p.id.startsWith('boost-trail'))).toBe(true);
  });
  it('places advanced fish beyond normal jump reach but within a crate bounce arc', () => {
    const sky = pickupsNear(100,200).find(p=>p.kind==='sky' && p.id==='choice-bounce-grab-gold-1');
    const crate = cratesNear(100,200).find(c=>c.id==='b-1');
    expect(sky).toBeDefined();
    expect(crate).toBeDefined();
    if(!sky||!crate)throw new Error('Missing fixture');
    expect(sky.x).toBe(crate.x);
    expect(sky.z).toBeGreaterThan(crate.z);
    const maxNormalJump = WORLD.jumpVelocity**2/(2*WORLD.gravity);
    const maxBounceHeight = crate.height + WORLD.bounceVelocity**2/(2*WORLD.gravity);
    const lowestCollectibleHeight = sky.y - groundHeight(crate.z) - sky.rangeY - .6;
    expect(lowestCollectibleHeight).toBeGreaterThan(maxNormalJump);
    expect(lowestCollectibleHeight).toBeLessThan(maxBounceHeight);
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
  it.each([0,WORLD.boostDuration])('keeps the high fish reachable after a bounce at maximum speed with boost %s',boost=>{
    const player=makePlayer();player.elapsed=200;player.boost=boost;
    const crate=cratesNear(100,200).find(c=>c.id==='b-1')!;
    player.x=crate.x;player.z=crate.z;player.y=groundHeight(crate.z)+crate.height;
    player.grounded=false;player.vy=WORLD.bounceVelocity;
    player.rewards.comboStage='bounce';player.rewards.comboStageUntil=205;
    const collected=new Set<string>();
    for(let i=0;i<80&&!player.failure;i++)simulate(player,input(),collected,1/120);
    expect(collected.has('choice-bounce-grab-gold-1')).toBe(true);
  });
  it('slows the cat on the edge grates while leaving the middle safe',()=>{
    for(const x of [0,2]){
      const p=makePlayer();p.z=705;p.x=x;p.y=groundHeight(p.z);
      simulate(p,input(),new Set(),1/120);
      expect(p.stumbleRemaining>0).toBe(x===2);
      expect(p.failure).toBeNull();
    }
  });
});
