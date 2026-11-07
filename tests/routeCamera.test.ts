import * as THREE from 'three';
import {describe,it,expect} from 'vitest';
import {groundHeight} from '../src/game/core';
import {cameraBlendFactor,frameRouteCamera} from '../src/game/routeCamera';
import {routePoint,turnFraming} from '../src/game/routeGeometry';

describe('portrait mobile camera framing',()=>{
  it('keeps both sides of the track inside the visible viewport throughout the detour',()=>{
    for(const aspect of [.43,.56]){
      for(const pitch of [14,20,26,32]){
        for(const choice of ['fish','acro'] as const){
          for(const distance of [245,250,253,259,265,272,278,284]){
            const camera=new THREE.PerspectiveCamera(64,aspect,.1,180);
            frameRouteCamera(camera,distance,choice,pitch,groundHeight,9.3,5.6);
            for(const ahead of [0,4,9,15,22]){
              for(const lateral of [-2.5,2.5]){
                const d=distance+ahead;
                const pos=routePoint(d,lateral,choice,groundHeight(d));
                const ndc=new THREE.Vector3(pos.x,pos.y,pos.z).project(camera);
                if(ndc.z>=-1&&ndc.z<=1){
                  expect(Math.abs(ndc.x),`road clipped at s=${distance}, fov=${camera.fov}`).toBeLessThan(.93);
                }
              }
            }
            if(turnFraming(distance)===0 && distance>284)expect(camera.fov).toBe(64);
          }
        }
      }
    }
  });
});

describe('soft route camera transition',()=>{
  it('begins zoom anticipation before the fork, even with no chosen branch',()=>{
    const camera=new THREE.PerspectiveCamera(64,.46,.1,180);
    const farAway=new THREE.PerspectiveCamera(64,.46,.1,180);
    const justBefore=new THREE.PerspectiveCamera(64,.46,.1,180);
    const justAfter=new THREE.PerspectiveCamera(64,.46,.1,180);
    frameRouteCamera(farAway,220,null,20,groundHeight,9.3,5.6);
    frameRouteCamera(camera,240,null,20,groundHeight,9.3,5.6);
    frameRouteCamera(justBefore,249.99,null,20,groundHeight,9.3,5.6);
    frameRouteCamera(justAfter,250.01,'fish',20,groundHeight,9.3,5.6);
    expect(camera.position.z).not.toBeCloseTo(farAway.position.z,4);
    // Target angle changes by a fraction of a metre when the branch is picked;
    // the actual camera interpolates it across frames instead of teleporting.
    const desiredDelta=justBefore.position.distanceTo(justAfter.position);
    expect(desiredDelta).toBeLessThan(.85);
    expect(desiredDelta*cameraBlendFactor(1/60)).toBeLessThan(.15);
  });
  it('eases the camera in actual time, independent of rendering frame rate',()=>{
    const delta60=cameraBlendFactor(1/60);
    const delta120=cameraBlendFactor(1/120);
    expect(delta60).toBeGreaterThan(0);
    expect(delta60).toBeLessThan(1);
    expect(1-Math.pow(1-delta120,2)).toBeCloseTo(delta60,8);
    expect(cameraBlendFactor(0)).toBe(0);
  });
});
