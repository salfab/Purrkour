import {describe,expect,it} from 'vitest';
import {DESCENT,descentDrop,descentSpeedBonus,onDescent} from '../src/game/descent';
import {WORLD,groundHeight,makePlayer,pickupsNear,simulate,type Controls} from '../src/game/core';

const input=():Controls=>({targetX:null,left:false,right:false,jump:false});

describe('first downhill sequence',()=>{
  it('joins the existing road continuously and adds a brief speed pulse',()=>{
    expect(descentDrop(DESCENT.start)).toBe(0);
    expect(descentDrop(DESCENT.end)).toBe(DESCENT.drop);
    expect(groundHeight(DESCENT.start-.001)-groundHeight(DESCENT.start+.001)).toBeCloseTo(0,3);
    expect(groundHeight(DESCENT.end-.001)-groundHeight(DESCENT.end+.001)).toBeCloseTo(0,3);
    expect(groundHeight(DESCENT.end)).toBeLessThan(groundHeight(DESCENT.start)-5);
    expect(descentSpeedBonus(DESCENT.start)).toBe(0);
    expect(descentSpeedBonus(485)).toBe(DESCENT.speedBonus);
    expect(descentSpeedBonus(DESCENT.end)).toBe(0);
    expect(onDescent(485)).toBe(true);
    const player=makePlayer();player.routeChoice='fish';player.z=485;player.y=groundHeight(485);player.elapsed=200;
    simulate(player,input(),new Set(),1/120);
    expect(player.speed).toBeCloseTo(WORLD.speedMax+DESCENT.speedBonus);
    const acrobat=makePlayer();acrobat.routeChoice='acro';acrobat.z=485;
    acrobat.y=groundHeight(485);acrobat.elapsed=200;
    simulate(acrobat,input(),new Set(),1/120);
    expect(acrobat.speed).toBeCloseTo(WORLD.speedMax+DESCENT.speedBonus);
  });

  it('rewards a steered ground-level gate sequence without collecting fish',()=>{
    const player=makePlayer();
    player.routeChoice='fish';player.elapsed=200;
    const collected=new Set(DESCENT.gates.flatMap(gate=>
      pickupsNear(gate.z-2,gate.z+2,0,'fish').map(item=>item.id),
    ));
    for(const gate of DESCENT.gates){
      player.z=gate.z-.04;player.x=gate.x;player.y=groundHeight(player.z);
      player.grounded=true;
      simulate(player,input(),collected,1/120);
    }
    expect(player.descentGates).toBe(3);
    expect(player.descentPerfect).toBe(true);
    expect(player.score).toBe(70+140+210+200);
    expect(player.fish).toBe(0);
    expect(player.rewards.instinct).toBe(24);
  });

  it('breaks the gate chain when the player misses a line',()=>{
    const player=makePlayer();player.routeChoice='fish';player.elapsed=200;
    const collected=new Set<string>();
    for(const [index,gate] of DESCENT.gates.entries()){
      player.z=gate.z-.04;
      player.x=index===1?-1.3:gate.x;
      player.y=groundHeight(player.z);player.grounded=true;
      simulate(player,input(),collected,1/120);
    }
    expect(player.descentGates).toBe(2);
    expect(player.descentPerfect).toBe(false);
    expect(player.score).toBe(140);
    expect(player.failure).toBeNull();
  });
  it.each(['fish','acro'] as const)('can complete the downhill after taking the %s route',route=>{
    const player=makePlayer();player.routeChoice=route;player.z=DESCENT.start;
    player.y=groundHeight(player.z);player.elapsed=50;
    const controls=input();
    const collected=new Set<string>();
    for(let step=0;step<1500&&player.z<DESCENT.end&&!player.failure;step++){
      const next=DESCENT.gates.find(gate=>gate.z>player.z);
      controls.targetX=next?.x??0;
      simulate(player,controls,collected,1/120);
    }
    expect(player.z).toBeGreaterThanOrEqual(DESCENT.end);
    expect(player.failure).toBeNull();
    expect(player.descentGates).toBe(3);
    expect(player.descentPerfect).toBe(true);
  });
});
