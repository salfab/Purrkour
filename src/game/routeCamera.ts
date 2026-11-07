import * as THREE from 'three';
import type {RouteChoice} from './routeChoices';
import {routePoint,routePose,turnFraming} from './routeGeometry';

/**
 * Camera always follows the center of the PLAYABLE road, never a
 * displacement between two diverging branches. It backs away slightly
 * for the brief detour, then returns to the original mobile composition.
 *
 * For narrow phones the camera measures the next 24 metres of road in
 * projected screen coordinates, and widens its vertical FOV only when
 * necessary. This is intentionally lightweight: 8 tiny projection samples
 * per frame, no raycasts and no scene traversal.
 */
export function frameRouteCamera(
  camera:THREE.PerspectiveCamera,
  distance:number,
  route:RouteChoice|null,
  pitchDegrees:number,
  groundHeight:(distance:number)=>number,
  baseDistance:number,
  baseHeight:number,
):void{
  const bend=route===null?0:turnFraming(distance);
  const position=routePose(distance,route);
  const future=routePose(distance+6,route);
  const cameraYaw=position.yaw+(future.yaw-position.yaw)*.16;
  const distanceBehind=baseDistance+5*bend;
  const height=groundHeight(distance)+baseHeight+1.6*bend;
  const forwardX=Math.sin(cameraYaw);
  const forwardZ=Math.cos(cameraYaw);
  camera.position.set(
    position.x-forwardX*distanceBehind,
    height,
    position.z-forwardZ*distanceBehind,
  );
  const target=routePose(distance+11,route);
  const pitch=pitchDegrees*Math.PI/180;
  camera.lookAt(
    target.x,
    height-13*Math.sin(pitch),
    target.z,
  );

  const defaultFov=64+11*bend;
  camera.fov=defaultFov;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();

  const point=new THREE.Vector3();
  let extent=0;
  for(const ahead of [0,4,9,15,22]){
    const d=distance+ahead;
    for(const lateral of [-2.65,2.65]){
      const p=routePoint(d,lateral,route,groundHeight(d));
      point.set(p.x,p.y,p.z).project(camera);
      if(point.z>=-1&&point.z<=1){
        extent=Math.max(extent,Math.abs(point.x));
      }
    }
  }
  if(extent>.82){
    const baseTan=Math.tan(defaultFov*Math.PI/360);
    const neededFov=2*Math.atan(baseTan*extent/.82)*180/Math.PI;
    camera.fov=Math.min(106,Math.max(defaultFov,neededFov));
    camera.updateProjectionMatrix();
  }
}
