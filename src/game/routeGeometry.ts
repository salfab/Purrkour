import type {RouteChoice} from './routeChoices';

/**
 * Local runner coordinates remain (lateral, distance).
 * Only a short S-bend is shown after the choice. The selected route then
 * continues DEAD STRAIGHT at a lateral offset, so a narrow phone viewport
 * never has to follow a long, winding racetrack.
 *
 * The unchosen branch is NOT a second persistent road. A 45-degree decorative
 * slip road is generated near the reunion and terminates on the chosen route.
 */
export interface RoutePose {
  readonly x:number;
  readonly z:number;
  readonly yaw:number;
}
export interface WorldPoint extends RoutePose {
  readonly y:number;
}

export const ROUTE_CURVE={
  split:250,
  radius:18,
  maximumAngle:Math.PI/4,
} as const;

const halfArc=ROUTE_CURVE.radius*ROUTE_CURVE.maximumAngle;
export const ROUTE_DETOUR_END=ROUTE_CURVE.split+halfArc*2;
const theta=ROUTE_CURVE.maximumAngle;
const radius=ROUTE_CURVE.radius;
const deltaX=2*radius*(1-Math.cos(theta));
const deltaZ=2*radius*Math.sin(theta);

export const FAKE_MERGE={
  start:391,
  end:410,
  angleRadians:Math.PI/4,
} as const;

function routeSide(choice:RouteChoice):number {
  // Camera looks towards +Z: positive world X appears on SCREEN LEFT.
  return choice==='fish'?1:-1;
}

export function routePose(distance:number,choice:RouteChoice|null):RoutePose {
  const s=Math.max(0,distance);
  if(choice===null||s<=ROUTE_CURVE.split)return {x:0,z:s,yaw:0};
  const sign=routeSide(choice);
  const local=s-ROUTE_CURVE.split;
  if(local<halfArc){
    const angle=local/radius;
    return {
      x:sign*radius*(1-Math.cos(angle)),
      z:ROUTE_CURVE.split+radius*Math.sin(angle),
      yaw:sign*angle,
    };
  }
  if(local<2*halfArc){
    const angle=(local-halfArc)/radius;
    return {
      x:sign*radius*(1-Math.cos(theta)+Math.cos(theta-angle)-Math.cos(theta)),
      z:ROUTE_CURVE.split+radius*(2*Math.sin(theta)-Math.sin(theta-angle)),
      yaw:sign*(theta-angle),
    };
  }
  // After approximately 28 m we are on a completely straight road.
  return {
    x:sign*deltaX,
    z:ROUTE_CURVE.split+deltaZ+s-ROUTE_DETOUR_END,
    yaw:0,
  };
}

export function routePoint(distance:number,lateral:number,choice:RouteChoice|null,y=0):WorldPoint {
  const center=routePose(distance,choice);
  return {
    x:center.x+Math.cos(center.yaw)*lateral,
    y,
    z:center.z-Math.sin(center.yaw)*lateral,
    yaw:center.yaw,
  };
}

export function alternativeBranch(choice:RouteChoice):RouteChoice {
  return choice==='fish'?'acro':'fish';
}

/**
 * A short 45-degree fake side street arriving from the UNCHOSEN side.
 * Only these 19 metres are ever meshed. It ends exactly on our own road.
 */
export function fakeMergePose(distance:number,chosen:RouteChoice):RoutePose {
  const s=Math.max(FAKE_MERGE.start,Math.min(FAKE_MERGE.end,distance));
  const main=routePose(s,chosen);
  const side=routeSide(chosen);
  const slope=Math.tan(FAKE_MERGE.angleRadians);
  return {
    x:main.x-side*(FAKE_MERGE.end-s)*slope,
    z:main.z,
    yaw:Math.atan(side*slope),
  };
}

export function fakeMergePoint(distance:number,lateral:number,chosen:RouteChoice,y=0):WorldPoint {
  const p=fakeMergePose(distance,chosen);
  return {
    x:p.x+Math.cos(p.yaw)*lateral,
    z:p.z-Math.sin(p.yaw)*lateral,
    y,
    yaw:p.yaw,
  };
}

/** How much extra framing the mobile camera needs near the brief S-bend. */
export function turnFraming(distance:number):number {
  const s=distance;
  const start=ROUTE_CURVE.split-17;
  const end=ROUTE_DETOUR_END+19;
  if(s<=start||s>=end)return 0;
  const approach=Math.min(1,Math.max(0,(s-start)/17));
  const release=Math.min(1,Math.max(0,(end-s)/19));
  const smooth=(t:number):number=>t*t*(3-2*t);
  return smooth(approach)*smooth(release);
}
