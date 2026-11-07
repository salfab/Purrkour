/**
 * First experimental fork. Two lanes are chosen using the existing steering
 * control, so no new tap, swipe gesture, or pause screen is necessary.
 */
export type RouteChoice = 'fish' | 'acro';
export type RouteStage = 'approach' | 'turn' | 'active' | 'rejoin' | null;

export const ROUTE_FORK = {
  announceZ: 229,
  chooseZ: 250,
  endZ: 400,
  turnSeconds: .95,
  portalZ: 262,
  exitZ: 272,
} as const;

export function routeFromWorldX(worldX:number):RouteChoice {
  // Camera faces +Z: world positive X is SCREEN LEFT.
  return worldX>=0?'fish':'acro';
}

export function activeRoute(distance:number,choice:RouteChoice|null):RouteChoice|null {
  return distance>=ROUTE_FORK.chooseZ && distance<ROUTE_FORK.endZ?choice:null;
}

export function forkStage(distance:number,choice:RouteChoice|null,elapsed:number,chosenAt:number|null):RouteStage {
  if(distance>=ROUTE_FORK.announceZ && distance<ROUTE_FORK.chooseZ && choice===null)return 'approach';
  if(choice===null)return null;
  if(distance>405&&distance<435)return 'rejoin';
  if(distance>=435)return null;
  if(distance<273||(chosenAt!==null && elapsed-chosenAt<ROUTE_FORK.turnSeconds))return 'turn';
  return 'active';
}

export function turnEnvelope(elapsed:number,chosenAt:number|null):number {
  if(chosenAt===null)return 0;
  const t=Math.max(0,Math.min(1,(elapsed-chosenAt)/ROUTE_FORK.turnSeconds));
  return Math.sin(Math.PI*t);
}
