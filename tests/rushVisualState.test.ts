import {describe,expect,it} from 'vitest';
import {
  rushVisualState,rushTrailPoint,rushScreenEffectsVisible,
} from '../src/game/rushVisualState';
import {REWARD_RULES,createRewardState} from '../src/game/rewards';
import {routePoint} from '../src/game/routeGeometry';

describe('Purr Rush visual feedback',()=>{
  it('is hidden before a rush and ends precisely when its timer expires',()=>{
    expect(rushVisualState(0,10)).toEqual({visible:false,age:0,burst:0,pulse:0});
    expect(rushVisualState(-.1,10).visible).toBe(false);
    expect(rushVisualState(REWARD_RULES.rushDuration,10).visible).toBe(true);
    expect(rushVisualState(.001,10).visible).toBe(true);
  });
  it('has a short activation flash and persistent aura for the entire Rush',()=>{
    const start=rushVisualState(6,20);
    const halfway=rushVisualState(3,23);
    const end=rushVisualState(.1,26);
    expect(start.burst).toBe(1);
    expect(halfway.burst).toBe(0);
    expect(end.visible).toBe(true);
    expect(end.burst).toBe(0);
    expect(halfway.pulse).toBeGreaterThanOrEqual(.7);
    expect(halfway.pulse).toBeLessThanOrEqual(1);
  });
  it('never draws the screen effect during pause, after failure, or without Rush',()=>{
    const rewards=createRewardState();
    rewards.rushRemaining=3;
    expect(rushScreenEffectsVisible('running',rewards)).toBe(true);
    expect(rushScreenEffectsVisible('paused',rewards)).toBe(false);
    expect(rushScreenEffectsVisible('over',rewards)).toBe(false);
    rewards.rushRemaining=0;
    expect(rushScreenEffectsVisible('running',rewards)).toBe(false);
  });
  it('trails follow the curved chosen branch rather than the original Z axis',()=>{
    const floor=()=>0;
    for(const route of ['fish','acro'] as const){
      const distance=262;
      const p=rushTrailPoint(distance,1.25,route,10,3,14,floor);
      const corresponding=routePoint(distance-.35-4*.48,1.25,route);
      expect(Math.abs(p.x-corresponding.x)).toBeLessThan(.2);
      expect(Math.abs(p.z-corresponding.z)).toBeLessThan(.2);
      expect(p.opacity).toBeGreaterThan(0);
      expect(p.opacity).toBeLessThan(1);
      expect(p.size).toBeLessThan(.5);
    }
  });
});
