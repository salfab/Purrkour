/**
 * v0.17: immediate reasons to take calculated risks.
 * Pure gameplay, no React / Three.js / browser dependencies.
 */
export const REWARD_RULES={
  instinctTarget:100,
  blueInstinct:4,
  goldInstinct:15,
  skyInstinct:30,
  boostInstinct:8,
  rushDuration:6,
  magnetX:1.4,
  magnetZ:1.35,
  magnetY:.95,
  skillWindow:4.5,
  chainWindow:13,
  maxComboMultiplier:4,
  perfectBonus:150,
  feedbackDuration:1.6,
} as const;

export type RewardPickupKind='fish'|'gold'|'sky'|'boost';
export type ComboStage='idle'|'bounce'|'gold';
export type RewardFeedback='none'|'rush'|'perfect';

export interface RewardState {
  instinct:number;
  rushRemaining:number;
  rushCount:number;
  comboChain:number;
  comboUntil:number;
  comboStage:ComboStage;
  comboStageUntil:number;
  lastBonus:number;
  feedback:RewardFeedback;
  feedbackUntil:number;
}

export interface RewardActor {
  elapsed:number;
  grounded:boolean;
  boost:number;
  score:number;
  fish:number;
  rewards:RewardState;
}

export interface RewardPickup {
  readonly kind:RewardPickupKind;
  readonly points:number;
  readonly fishes:number;
}

export function createRewardState():RewardState {
  return {
    instinct:0,rushRemaining:0,rushCount:0,
    comboChain:0,comboUntil:0,comboStage:'idle',comboStageUntil:0,
    lastBonus:0,feedback:'none',feedbackUntil:0,
  };
}

export function comboMultiplier(rewards:RewardState):number {
  return Math.min(REWARD_RULES.maxComboMultiplier,1+rewards.comboChain);
}

export function tickRewards(actor:RewardActor,dt:number):void {
  const r=actor.rewards;
  r.rushRemaining=Math.max(0,r.rushRemaining-dt);
  if(r.comboStage!=='idle' && actor.elapsed>r.comboStageUntil)r.comboStage='idle';
  if(r.comboChain>0 && actor.elapsed>r.comboUntil){
    r.comboChain=0;
    r.comboStage='idle';
  }
  if(r.feedback!=='none' && actor.elapsed>=r.feedbackUntil)r.feedback='none';
  if(r.rushRemaining===0 && r.instinct>=REWARD_RULES.instinctTarget)activateRush(actor);
}

function activateRush(actor:RewardActor):void {
  const r=actor.rewards;
  r.instinct-=REWARD_RULES.instinctTarget;
  r.rushRemaining=REWARD_RULES.rushDuration;
  r.rushCount++;
  r.feedback='rush';
  r.feedbackUntil=actor.elapsed+REWARD_RULES.feedbackDuration;
}

/** On top-of-crate contact, begin a risk/reward sequence. */
export function rewardBounce(actor:RewardActor):void {
  actor.rewards.comboStage='bounce';
  actor.rewards.comboStageUntil=actor.elapsed+REWARD_RULES.skillWindow;
}

/** Only a gold-in-flight after a crate bounce qualifies for a PURRFECT landing. */
export function rewardLanding(actor:RewardActor):void {
  const r=actor.rewards;
  if(r.comboStage==='gold' && actor.elapsed<=r.comboStageUntil){
    if(actor.elapsed>r.comboUntil)r.comboChain=0;
    r.comboChain=Math.min(REWARD_RULES.maxComboMultiplier-1,r.comboChain+1);
    r.comboUntil=actor.elapsed+REWARD_RULES.chainWindow;
    r.lastBonus=REWARD_RULES.perfectBonus*r.comboChain;
    actor.score+=r.lastBonus;
    r.feedback='perfect';
    r.feedbackUntil=actor.elapsed+REWARD_RULES.feedbackDuration;
  }
  r.comboStage='idle';
}

export function rewardFailure(actor:RewardActor):void {
  actor.rewards.comboStage='idle';
  actor.rewards.comboChain=0;
  actor.rewards.comboUntil=0;
}

/**
 * Score uses the current multipliers BEFORE a collected fish activates Rush.
 * This avoids letting one fish benefit from a boost it has just triggered.
 * Permanent fish currency is never multiplied.
 */
export function rewardPickup(actor:RewardActor,pickup:RewardPickup):void {
  const r=actor.rewards;
  const scoreMultiplier=(actor.boost>0?2:1)
    *(r.rushRemaining>0?2:1)
    *(pickup.kind==='boost'?1:comboMultiplier(r));
  actor.score+=pickup.points*scoreMultiplier;
  actor.fish+=pickup.fishes;
  if(pickup.kind==='boost')actor.boost=Math.min(5.5,actor.boost+2.7);

  const gain=pickup.kind==='fish'?REWARD_RULES.blueInstinct:
    pickup.kind==='sky'?REWARD_RULES.skyInstinct:
    pickup.kind==='gold'?REWARD_RULES.goldInstinct:
    REWARD_RULES.boostInstinct;
  r.instinct=Math.min(REWARD_RULES.instinctTarget,r.instinct+gain);

  if(pickup.kind==='sky' && !actor.grounded
      && r.comboStage==='bounce' && actor.elapsed<=r.comboStageUntil){
    r.comboStage='gold';
  }
  if(r.rushRemaining===0&&r.instinct>=REWARD_RULES.instinctTarget)activateRush(actor);
}

/** The magnetic field only attracts blue fish; premium sky targets still
 * require a deliberate jump/bounce and therefore retain their risk. */
export function rewardPickupInReach(
  actor:RewardActor,
  pickup:RewardPickup & {readonly x:number;readonly y:number;readonly z:number;
    readonly rangeX:number;readonly rangeY:number;readonly rangeZ:number},
  x:number,y:number,z:number,
):boolean {
  const magnet=actor.rewards.rushRemaining>0 && pickup.kind==='fish';
  const reachX=magnet?Math.max(pickup.rangeX,REWARD_RULES.magnetX):pickup.rangeX;
  const reachY=magnet?Math.max(pickup.rangeY,REWARD_RULES.magnetY):pickup.rangeY;
  const reachZ=magnet?Math.max(pickup.rangeZ,REWARD_RULES.magnetZ):pickup.rangeZ;
  return Math.abs(x-pickup.x)<reachX &&
    Math.abs(z-pickup.z)<reachZ &&
    Math.abs(y+.6-pickup.y)<reachY;
}
