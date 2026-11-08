/**
 * Small, deterministic gameplay director.
 *
 * It only chooses from hand-authored patterns. It NEVER invents physics,
 * collisions or obstacle geometry. Given a run seed and segment index, both
 * the renderer and simulation get the exact same plan.
 */
import type {RouteChoice} from './routeChoices';

export type PatternPhase='flow'|'choice'|'tension'|'reward';
export type PatternId=
  | 'fish-lane'
  | 'jump-grab'
  | 'bounce-grab'
  | 'safe-or-skill'
  | 'boost-trail'
  | 'slalom'
  | 'weave'
  | 'recovery-strip'
  | 'pigeon-crossing'
  | 'rolling-cart';

export type SlotId='intro'|'choice'|'pressure'|'reward';
export interface PatternPlacement{
  readonly slot:SlotId;
  readonly phase:PatternPhase;
  readonly id:PatternId;
  readonly at:number;
  readonly x:number;
}
export interface SegmentPlan{
  readonly segment:number;
  readonly tier:number;
  readonly placements:readonly PatternPlacement[];
}

const slots=[
  {slot:'intro',phase:'flow',at:18},
  {slot:'choice',phase:'choice',at:41},
  {slot:'pressure',phase:'tension',at:56},
  {slot:'reward',phase:'reward',at:88},
] as const satisfies readonly {slot:SlotId;phase:PatternPhase;at:number}[];

function hash(seed:number,segment:number,slot:number):number{
  let n=(seed|0)^Math.imul(segment+1,0x9e3779b1)^Math.imul(slot+1,0x85ebca6b);
  n^=n>>>16;
  n=Math.imul(n,0x7feb352d);
  n^=n>>>15;
  n=Math.imul(n,0x846ca68b);
  return (n^(n>>>16))>>>0;
}
function choice<T>(options:readonly T[],seed:number,k:number,slot:number):T{
  if(options.length===0)throw Error('Empty pattern catalog');
  const index=hash(seed,k,slot)%options.length;
  return options[index]!;
}

/**
 * 0–100 m is a fixed tutorial.
 * 100–200 m teaches the first optional bounce.
 * Later segments combine patterns more freely, within a small tier catalog.
 * The gap stays at 68.5–70.8 m in each 100-m segment for this first iteration.
 */
export function segmentPlan(segment:number,runSeed=0,route:RouteChoice|null=null):SegmentPlan{
  const k=Math.max(0,Math.floor(segment));
  const tier=k<1?0:k<3?1:k<5?2:3;
  let ids:readonly [PatternId,PatternId,PatternId,PatternId];
  if(k===0)ids=['jump-grab','jump-grab','slalom','jump-grab'];
  else if(k===1)ids=['jump-grab','bounce-grab','slalom','recovery-strip'];
  else if(k===2){
    // A calm, obstacle-free decision area around z=250.
    ids=['jump-grab','fish-lane','fish-lane',
      route==='fish'?'boost-trail':route==='acro'?'bounce-grab':'recovery-strip'];
  } else if(k===3 && route==='fish'){
    ids=['fish-lane','boost-trail','slalom','recovery-strip'];
  } else if(k===3 && route==='acro'){
    ids=['jump-grab','bounce-grab','weave','bounce-grab'];
  } else if(k===4){
    // First bird crossing after the join, with a safe lane.
    ids=['fish-lane','pigeon-crossing','slalom','recovery-strip'];
  } else if(k===5){
    // Teach a moving bounce after the pigeons.
    ids=['jump-grab','rolling-cart','weave','recovery-strip'];
  } else{
    const intro:readonly PatternId[]=tier>=2
      ? ['fish-lane','jump-grab','safe-or-skill','jump-grab']
      : ['fish-lane','jump-grab','safe-or-skill'];
    const middle:readonly PatternId[]=tier>=3
      ? ['bounce-grab','boost-trail','safe-or-skill','jump-grab','rolling-cart','pigeon-crossing']
      : ['bounce-grab','boost-trail','safe-or-skill','jump-grab'];
    const pressure:readonly PatternId[]=tier>=3
      ? ['slalom','weave','pigeon-crossing','slalom','weave']
      : ['slalom','slalom','weave'];
    const recover:readonly PatternId[]=tier>=3
      ? ['recovery-strip','fish-lane','jump-grab','recovery-strip']
      : ['recovery-strip','fish-lane','recovery-strip'];
    ids=[
      choice(intro,runSeed,k,0),
      choice(middle,runSeed,k,1),
      choice(pressure,runSeed,k,2),
      choice(recover,runSeed,k,3),
    ];
  }
  const placements=slots.map((slot,index):PatternPlacement=>{
    const id=ids[index]!;
    // First two segments are safe to learn and match our tutorial test fixtures.
    const x=k<=2?([-1.35,1.3,0,0][index]??0)
      :([-1.35,0,1.3][hash(runSeed,k,index+9)%3]??0);
    return {...slot,id,x};
  });
  return {segment:k,tier,placements};
}

/** Only one crate may appear in each authored slot, leaving another lane free. */
export function patternHasCrate(id:PatternId):boolean{
  return id==='jump-grab'||id==='bounce-grab'||id==='safe-or-skill'||id==='weave';
}

/** A safe lane is opposite a single crate; no pattern spans the whole track. */
export function safeLaneX(crateX:number):number{
  return crateX<=0?1.65:-1.65;
}
