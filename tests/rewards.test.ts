import {describe,expect,it} from 'vitest';
import {
  REWARD_RULES,createRewardState,comboMultiplier,tickRewards,
  rewardBounce,rewardPickup,rewardLanding,rewardFailure,
  rewardPickupInReach,
  type RewardActor,type RewardPickup,
} from '../src/game/rewards';
import {
  makePlayer,simulate,groundHeight,worldXFromScreenRatio,
  type Controls,
} from '../src/game/core';
import {routeFromWorldX} from '../src/game/routeChoices';

function actor():RewardActor {
  return {elapsed:0,grounded:true,boost:0,score:0,fish:0,rewards:createRewardState()};
}
const blue:RewardPickup={kind:'fish',points:10,fishes:1};
const gold:RewardPickup={kind:'gold',points:100,fishes:3};
const sky:RewardPickup={kind:'sky',points:180,fishes:5};
const star:RewardPickup={kind:'boost',points:120,fishes:0};

describe('v0.17 instinct and Purr Rush',()=>{
  it('adds the correct instinct for each fish and keeps the real fish currency unmultiplied',()=>{
    const a=actor();
    rewardPickup(a,blue);rewardPickup(a,gold);rewardPickup(a,sky);rewardPickup(a,star);
    expect(a.rewards.instinct).toBe(4+15+30+8);
    expect(a.fish).toBe(9);
    expect(a.boost).toBeGreaterThan(0);
  });
  it('starts only at 100, lasts six seconds, doubles score, and expires deterministically',()=>{
    const a=actor();
    for(let i=0;i<24;i++)rewardPickup(a,blue);
    expect(a.rewards.instinct).toBe(96);
    expect(a.rewards.rushRemaining).toBe(0);
    rewardPickup(a,blue);
    expect(a.rewards.rushRemaining).toBe(REWARD_RULES.rushDuration);
    expect(a.rewards.instinct).toBe(0);
    expect(a.rewards.rushCount).toBe(1);
    const before=a.score;
    rewardPickup(a,blue);
    expect(a.score-before).toBe(20);
    tickRewards(a,3);
    expect(a.rewards.rushRemaining).toBeCloseTo(3);
    tickRewards(a,3.1);
    expect(a.rewards.rushRemaining).toBe(0);
    rewardPickup(a,blue);
    expect(a.rewards.rushCount).toBe(1);
  });
  it('accumulates a new gauge during Rush but never extends the current Rush',()=>{
    const a=actor();
    for(let i=0;i<25;i++)rewardPickup(a,blue);
    for(let i=0;i<25;i++)rewardPickup(a,blue);
    expect(a.rewards.instinct).toBe(100);
    expect(a.rewards.rushCount).toBe(1);
    tickRewards(a,6);
    expect(a.rewards.rushCount).toBe(2);
    expect(a.rewards.rushRemaining).toBe(REWARD_RULES.rushDuration);
    expect(a.rewards.instinct).toBe(0);
  });
  it('magnet attracts blue fish only, not sky gold or boosts',()=>{
    const a=actor();
    const target={x:1.1,y:.4,z:.8,rangeX:.4,rangeY:.5,rangeZ:.52};
    expect(rewardPickupInReach(a,{...blue,...target},0,0,0)).toBe(false);
    a.rewards.rushRemaining=3;
    expect(rewardPickupInReach(a,{...blue,...target},0,0,0)).toBe(true);
    expect(rewardPickupInReach(a,{...sky,...target},0,0,0)).toBe(false);
    expect(rewardPickupInReach(a,{...star,...target},0,0,0)).toBe(false);
  });
  it('starts with a fresh gauge, preserving default steering and branch direction',()=>{
    const p=makePlayer(13);
    expect(p.rewards).toEqual(createRewardState());
    p.rewards.instinct=90;
    const next=makePlayer(14);
    expect(next.rewards.instinct).toBe(0);
    expect(worldXFromScreenRatio(.1)).toBeGreaterThan(0);
    expect(routeFromWorldX(worldXFromScreenRatio(.1))).toBe('fish');
    expect(routeFromWorldX(worldXFromScreenRatio(.9))).toBe('acro');
    const cmd:Controls={targetX:null,left:false,right:false,jump:true};
    simulate(next,cmd,new Set(),1/120);
    expect(next.grounded).toBe(false);
    expect(cmd.jump).toBe(false);
  });
});

describe('v0.17 acrobatic combos',()=>{
  it('works end-to-end with real crate collision, sky fish, and landing',()=>{
    const player=makePlayer(18);
    const top=groundHeight(141)+.85;
    player.elapsed=50;
    player.x=1.3;
    player.z=140.94;
    player.y=top+.025;
    player.vy=-3;
    player.grounded=false;
    const collected=new Set<string>();
    const input:Controls={targetX:1.3,left:false,right:false,jump:false};
    for(let frame=0;frame<340 && player.z<155 && !player.failure;frame++){
      simulate(player,input,collected,1/120);
    }
    expect(player.failure).toBeNull();
    expect(player.bounces).toBeGreaterThanOrEqual(1);
    expect(collected.has('choice-bounce-grab-gold-1')).toBe(true);
    expect(player.rewards.comboChain).toBeGreaterThanOrEqual(1);
    expect(player.rewards.lastBonus).toBeGreaterThanOrEqual(150);
  });
  it('requires bounce, high gold while airborne, then a real landing',()=>{
    const a=actor();
    rewardPickup(a,sky);
    rewardLanding(a);
    expect(a.rewards.comboChain).toBe(0);
    rewardBounce(a);
    a.grounded=false;
    rewardPickup(a,blue);
    rewardLanding(a);
    expect(a.rewards.comboChain).toBe(0);
    rewardBounce(a);
    rewardPickup(a,sky);
    expect(a.rewards.comboStage).toBe('gold');
    a.grounded=true;
    rewardLanding(a);
    expect(a.rewards.comboChain).toBe(1);
    expect(comboMultiplier(a.rewards)).toBe(2);
    expect(a.rewards.feedback).toBe('perfect');
    expect(a.rewards.lastBonus).toBe(150);
  });
  it('grants increasing bonuses, capped multiplier and score but NOT fish currency',()=>{
    const a=actor();
    for(let i=0;i<5;i++){
      a.elapsed+=2;
      rewardBounce(a);
      a.grounded=false;
      rewardPickup(a,sky);
      a.grounded=true;
      rewardLanding(a);
    }
    expect(a.rewards.comboChain).toBe(3);
    expect(comboMultiplier(a.rewards)).toBe(4);
    const beforeScore=a.score,beforeFish=a.fish;
    rewardPickup(a,blue);
    // Five sky fish also filled the Rush gauge; ×4 combo and ×2 Rush stack.
    expect(a.rewards.rushRemaining).toBeGreaterThan(0);
    expect(a.score-beforeScore).toBe(80);
    expect(a.fish-beforeFish).toBe(1);
  });
  it('expires an unfinished bounce and the score chain without losing the fish bank',()=>{
    const a=actor();
    rewardBounce(a);
    a.elapsed=REWARD_RULES.skillWindow+.1;
    tickRewards(a,.1);
    expect(a.rewards.comboStage).toBe('idle');
    a.grounded=false;
    rewardPickup(a,sky);
    a.grounded=true;
    rewardLanding(a);
    expect(a.rewards.comboChain).toBe(0);
    a.elapsed=10;
    rewardBounce(a);a.grounded=false;rewardPickup(a,sky);
    a.grounded=true;rewardLanding(a);
    const fish=a.fish;
    a.elapsed+=REWARD_RULES.chainWindow+.1;
    tickRewards(a,.1);
    expect(a.rewards.comboChain).toBe(0);
    expect(a.fish).toBe(fish);
  });
  it('a failed run clears its combo chain, not its existing fish reward',()=>{
    const a=actor();rewardBounce(a);a.grounded=false;
    rewardPickup(a,sky);a.grounded=true;rewardLanding(a);
    const previousFish=a.fish;
    rewardFailure(a);
    expect(a.rewards.comboChain).toBe(0);
    expect(a.fish).toBe(previousFish);
  });
  it('retains boost interactions and prevents infinite chaining from one high fish',()=>{
    const a=actor();
    rewardPickup(a,star);
    a.rewards.rushRemaining=2;
    const before=a.score;
    rewardPickup(a,gold);
    expect(a.score-before).toBe(400);
    rewardBounce(a);
    a.grounded=false;
    rewardPickup(a,sky);
    rewardLanding(a);
    rewardLanding(a);
    expect(a.rewards.comboChain).toBe(1);
  });
});
