import {describe,expect,it} from 'vitest';
import {catRearPose,rearDisplayFrame} from '../src/game/catMotion';
import {WORLD,makePlayer,simulate,type Controls} from '../src/game/core';

describe('rear-view cat jump and landing animation',()=>{
  it('runs all six original rear walk frames at a pace determined by animation',()=>{
    for(let i=0;i<18;i++){
      const pose=catRearPose(true,0,i);
      expect(pose.phase).toBe('run');
      expect(pose.frame).toBe(i%6);
      expect(pose.scaleX).toBe(1);
      expect(pose.scaleY).toBe(1);
    }
  });
  it('uses the untouched eighth original atlas pose for a grounded speed boost',()=>{
    const pose=catRearPose(true,0,2);
    expect(rearDisplayFrame(pose,1.5)).toBe(7);
    expect(rearDisplayFrame(pose,0)).toBe(2);
    // In flight, jumping remains more important than the speed effect.
    const jumping=catRearPose(false,0,2);
    expect(rearDisplayFrame(jumping,3)).toBe(6);
  });

  it('uses different poses for ascent, apex, and fall, not a stationary translated sprite',()=>{
    const rise=catRearPose(false,WORLD.jumpVelocity,12);
    const apex=catRearPose(false,0,12);
    const fall=catRearPose(false,-WORLD.jumpVelocity,12);
    expect([rise.phase,apex.phase,fall.phase]).toEqual(['takeoff','apex','fall']);
    expect([rise.frame,apex.frame,fall.frame]).toEqual([4,6,5]);
    expect(rise.scaleY).toBeGreaterThan(1);
    expect(apex.scaleY).toBeLessThan(1);
    expect(fall.tilt).not.toBe(0);
  });

  it('temporarily squashes at landing, then returns to running',()=>{
    const contact=catRearPose(true,0,8,.005);
    const recovering=catRearPose(true,0,8,.07);
    const recovered=catRearPose(true,0,8,.2);
    expect(contact.phase).toBe('land');
    expect(contact.scaleY).toBeLessThan(recovering.scaleY);
    expect(contact.scaleX).toBeGreaterThan(recovering.scaleX);
    expect(recovered.phase).toBe('run');
    expect(recovered.scaleY).toBe(1);
  });

  it('tracks the real physics from jump release to apex to fall and landing',()=>{
    const player=makePlayer(7);
    const inputs:Controls={jump:true,targetX:null,left:false,right:false};
    const seen=new Set<string>();
    for(let frame=0;frame<160;frame++){
      simulate(player,inputs,new Set(),1/120);
      const pose=catRearPose(player.grounded,player.vy,player.anim);
      seen.add(pose.phase);
      if(frame>5&&player.grounded)break;
    }
    expect(seen).toContain('takeoff');
    expect(seen).toContain('apex');
    expect(seen).toContain('fall');
    expect(player.failure).toBeNull();
    expect(player.grounded).toBe(true);
  });
});
