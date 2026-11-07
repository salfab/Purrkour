import * as THREE from 'three';
import {describe,it,expect} from 'vitest';
import {groundHeight} from '../src/game/core';
import {frameRouteCamera} from '../src/game/routeCamera';
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
