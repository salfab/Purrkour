import type {RouteChoice} from './routeChoices';

/**
 * A reversible, arc-length-parametrized route. No graph or persistent branch
 * meshes are needed: both choices are symmetric functions of progress.
 *
 * s=250: fork; first 90° turn (radius 14m)
 * s≈272–306: side street perpendicular to the original runway
 * s≈328–352: short parallel section
 * s≈352–430: approach and return to the shared main road
 * s≈430: the two possible roads have the same position and tangent.
 *
 * X positive = screen LEFT while the camera faces +Z.
 */
export interface RoutePose {
  readonly x:number;
  readonly z:number;
  readonly yaw:number;
}

export interface WorldPoint extends RoutePose {
  readonly y:number;
}

export const ROUTE_CURVE = {
  split:250,
  radius:14,
  sideStreet:34,
  parallelStreet:24,
  returnStreet:34,
} as const;

const QUARTER_LENGTH=Math.PI*ROUTE_CURVE.radius/2;
const s0=ROUTE_CURVE.split;
const s1=s0+QUARTER_LENGTH;
const s2=s1+ROUTE_CURVE.sideStreet;
const s3=s2+QUARTER_LENGTH;
const s4=s3+ROUTE_CURVE.parallelStreet;
const s5=s4+QUARTER_LENGTH;
const s6=s5+ROUTE_CURVE.returnStreet;
const s7=s6+QUARTER_LENGTH;

export const ROUTE_JOIN_DISTANCE=s7;

export function routePose(distance:number,choice:RouteChoice|null):RoutePose {
  const s=Math.max(0,distance);
  if(s<=s0 || choice===null)return {x:0,z:s,yaw:0};
  const direction=choice==='fish'?1:-1;
  const r=ROUTE_CURVE.radius;
  if(s<s1){
    const a=(s-s0)/r;
    return {x:direction*r*(1-Math.cos(a)),z:s0+r*Math.sin(a),yaw:direction*a};
  }
  if(s<s2){
    return {x:direction*(r+s-s1),z:s0+r,yaw:direction*Math.PI/2};
  }
  if(s<s3){
    const a=(s-s2)/r;
    return {
      x:direction*(r+ROUTE_CURVE.sideStreet+r*Math.sin(a)),
      z:s0+r+r*(1-Math.cos(a)),
      yaw:direction*(Math.PI/2-a),
    };
  }
  const xAfterTwoTurns=2*r+ROUTE_CURVE.sideStreet;
  const zAfterTwoTurns=s0+2*r;
  if(s<s4){
    return {x:direction*xAfterTwoTurns,z:zAfterTwoTurns+s-s3,yaw:0};
  }
  const zBeforeReturn=zAfterTwoTurns+ROUTE_CURVE.parallelStreet;
  if(s<s5){
    const a=(s-s4)/r;
    return {
      x:direction*(xAfterTwoTurns-r*(1-Math.cos(a))),
      z:zBeforeReturn+r*Math.sin(a),
      yaw:-direction*a,
    };
  }
  const xReturnStart=r+ROUTE_CURVE.sideStreet;
  if(s<s6){
    return {
      x:direction*(xReturnStart-(s-s5)),
      z:zBeforeReturn+r,
      yaw:-direction*Math.PI/2,
    };
  }
  if(s<s7){
    const a=(s-s6)/r;
    return {
      x:direction*r*(1-Math.sin(a)),
      z:zBeforeReturn+r+r*(1-Math.cos(a)),
      yaw:-direction*(Math.PI/2-a),
    };
  }
  // Both mathematical roads finish at precisely the same place and heading.
  return {x:0,z:s0+4*r+ROUTE_CURVE.parallelStreet+(s-s7),yaw:0};
}

/** Rotate the usual local runner coordinates into the actual world. */
export function routePoint(distance:number,lateral:number,choice:RouteChoice|null,y=0):WorldPoint {
  const pose=routePose(distance,choice);
  return {
    x:pose.x+Math.cos(pose.yaw)*lateral,
    y,
    z:pose.z-Math.sin(pose.yaw)*lateral,
    yaw:pose.yaw,
  };
}

export function alternativeBranch(choice:RouteChoice):RouteChoice {
  return choice==='fish'?'acro':'fish';
}
