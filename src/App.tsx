import { useEffect, useRef, useState } from 'react';
import { WORLD, type Snapshot } from './game/core';
import { PurrkourGame } from './game/PurrkourGame';

const initial: Snapshot = {
  mode:'menu',distance:0,altitude:0,score:0,fish:0,bank:0,
  speed:WORLD.speedStart,boost:0,bounces:0,best:0,bestScore:0,failure:null,
  routeChoice:null,routeStage:null,
  instinct:0,rush:0,rushCount:0,comboMultiplier:1,comboChain:0,
  rewardFeedback:'none',lastComboBonus:0,stumble:0,cartBounces:0,
  descentActive:false,descentGates:0,descentPerfect:false,descentFeedback:false,
  districtIndex:0,districtName:'Vieille ville',
  nextDistrictName:'Quartier du marché',districtRemaining:325,districtWithin:0,
};

export function App() {
  const canvas=useRef<HTMLCanvasElement>(null);
  const game=useRef<PurrkourGame|null>(null);
  const [status,setStatus]=useState<Snapshot>(initial);
  const [error,setError]=useState<string|null>(null);
  const [pitch,setPitch]=useState<number>(WORLD.cameraPitch);
  const [muted,setMuted]=useState<boolean>(false);

  useEffect(()=>{
    const element=canvas.current;
    if(!element)return;
    let instance:PurrkourGame|null=null;
    try{
      instance=new PurrkourGame(element,setStatus);
      game.current=instance;
    }catch(cause:unknown){
      setError(cause instanceof Error?cause.message:'WebGL indisponible sur cet appareil.');
    }
    return()=>{
      instance?.dispose();
      if(game.current===instance)game.current=null;
    };
  },[]);

  const running=status.mode==='running';
  return <main className="game">
    <canvas ref={canvas} className="stage" aria-label="Jeu Purrkour, parcours 3D" />
    <header className="hud">
      <div className="hud-stats">
        <div className="chip"><small>DISTANCE</small><strong>{status.distance} m</strong><span> ↕ {status.altitude.toFixed(1)} m</span>
          <span className="district-hud">{status.districtName} · {status.districtRemaining} m</span>
        </div>
        <div className="chip"><small>SCORE</small><strong>{status.score}</strong><span> 🐟 {status.fish}</span></div>
        <div className={status.stumble>0||status.boost>0?'chip chip--boost':'chip'}>
          {status.stumble>0
            ?'🐾 OUPS ! RALENTI '+status.stumble.toFixed(1)+' s'
            :status.boost>0
              ?'⚡ BOOST '+status.boost.toFixed(1)+' s'
              :'VITESSE '+status.speed.toFixed(1)+' m/s ↗'}
        </div>
      </div>
      <div className="hud-buttons">
        <button type="button" className="icon-btn" aria-label={muted?'Activer la musique':'Couper la musique'} onClick={()=>setMuted(game.current?.toggleMusic()??true)}>{muted?'🔇':'🔊'}</button>
        <button type="button" className="icon-btn" aria-label="Changer l'angle de caméra" onClick={()=>setPitch(game.current?.cycleCamera()??pitch)}>📷 {pitch}°</button>
        <button type="button" className="icon-btn" aria-label="Mettre le jeu en pause" disabled={!running} onClick={()=>game.current?.pause()}>Ⅱ</button>
      </div>
    </header>
    {running&&status.districtIndex>0&&status.districtWithin<20&&(
      <div className="district-arrival" aria-live="polite">
        <strong>✦ {status.districtName}</strong>
        <span>NOUVEAU QUARTIER DÉCOUVERT !</span>
      </div>
    )}
    {running&&status.rush>0&&(
      <div className="rush-screen" aria-hidden="true">
        <div className="rush-screen__left"/>
        <div className="rush-screen__right"/>
        <div className="rush-screen__footer">⚡ PURR RUSH · ×2 POINTS · AIMANT 🐟</div>
      </div>
    )}
    {running&&<div className={status.rush>0?'instinct-bar instinct-bar--rush':'instinct-bar'}
      aria-label={status.rush>0?'Purr Rush actif':'Jauge d’instinct'}>
      <div className="instinct-bar__label">
        <span>{status.rush>0?'⚡ PURR RUSH !':'✨ INSTINCT'}</span>
        <span>{status.rush>0?status.rush.toFixed(1)+' s':status.instinct+' / 100'}</span>
      </div>
      <progress max={100} value={status.rush>0?100:status.instinct}
        aria-label="Charge de l’instinct" />
      {status.comboChain>0&&<div className="instinct-bar__combo">
        🐾 COMBO ×{status.comboMultiplier}
      </div>}
    </div>}
    {running&&status.rewardFeedback!=='none'&&(
      <div className={status.rewardFeedback==='perfect'?'reward-flash reward-flash--perfect':'reward-flash reward-flash--rush'}>
        {status.rewardFeedback==='perfect'
          ?'✨ PURRFECT ! +'+status.lastComboBonus
          :'⚡ PURR RUSH !'}
      </div>
    )}
    {running&&status.descentActive&&(
      <div className="descent-hud" aria-live="polite">
        <strong>↘ DESCENTE · {status.descentGates}/3 PORTES</strong>
        <small>SUIS LES ARCHES · RESTE AU SOL</small>
      </div>
    )}
    {running&&status.descentFeedback&&(
      <div className="descent-flash">{status.descentPerfect?'✨ DESCENTE PARFAITE !':'✨ PORTE FRANCHIE !'}</div>
    )}
    {running&&status.routeStage!==null&&(status.routeStage!=='active'||status.distance<282)&&(
      <div className={`route-choice route-choice--${status.routeStage}`} aria-live="polite">
        {status.routeStage==='approach'?<>
          <strong>CHOISIS TON CHEMIN</strong>
          <div className="route-choice__options">
            <span>← 🐟 POISSONS</span>
            <span>⭐ ACROBATIES →</span>
          </div>
          <small>GLISSE À GAUCHE OU À DROITE</small>
        </>:<>
          <strong>{status.routeChoice==='fish'?'🐟 ROUTE DES POISSONS':'⭐ ROUTE DES ACROBATIES'}</strong>
          {status.routeStage==='turn'&&<small>COURT DÉTOUR…</small>}{status.routeStage==='rejoin'&&<small>LES ROUTES SE REJOIGNENT</small>}
        </>}
      </div>
    )}
    {running&&status.distance<42&&<div className="touch-tip" aria-hidden="true">
      <strong>↔ GLISSE LE POUCE POUR DIRIGER</strong>
      <span>↑ RELÂCHE POUR SAUTER</span>
    </div>}
    {status.mode==='paused'&&<section className="pause-screen" aria-label="Jeu en pause"
      style={{backgroundImage:`url(${import.meta.env.BASE_URL}assets/ui/pawsed-v1.png)`}}>
      <div className="pause-content">
        <div className="pause-eyebrow">🐾 &nbsp; PETITE PAUSE SUR LES TOITS</div>
        <h1>PAWSED</h1>
        <p>Une petite pause avant de repartir à l’aventure.</p>
        <button type="button" className="pause-resume" onClick={()=>game.current?.resume()}>▶ &nbsp; Reprendre</button>
        <button type="button" className="pause-restart" onClick={()=>game.current?.start()}>Recommencer</button>
      </div>
    </section>}
    {status.mode==='menu'&&!error&&<section className="pause-screen splash-screen" aria-label="Accueil Purrkour"
      style={{backgroundImage:`url(${import.meta.env.BASE_URL}assets/ui/pawsed-v1.png)`}}>
      <div className="pause-content splash-content">
        <div className="pause-eyebrow">🐾 &nbsp; UNE AVENTURE SUR LES TOITS</div>
        <h1>Purrkour</h1>
        <p>Un petit chat, de grands sauts et mille poissons.</p>
        <button type="button" className="pause-resume" onClick={()=>game.current?.start()}>▶ &nbsp; Commencer le run</button>
        <small>VERSION 0.19.1</small>
      </div>
    </section>}
    {(status.mode==='over'||!!error)&&<section className="overlay">
      <div className="dialog">
        <div className="eyebrow">PURRKOUR · V0.19.1 · MOBILE FIRST</div>
        <h1>Purrkour 🐈</h1>
        {error&&<p className="error">Impossible de démarrer le jeu : {error}</p>}
        {!error&&status.mode==='over'&&<>
          <h2>Encore un saut !</h2>
          <p>{status.failure==='crate'?'Oups ! Une caisse de côté.':'Oups ! Le chat est tombé dans un fossé.'}</p>
          <div className="stats">
            <div><span>Distance</span><b>{status.distance} m</b></div>
            <div><span>Score</span><b>{status.score}</b></div>
            <div><span>Poissons gagnés</span><b>+{status.fish} 🐟</b></div>
            <div><span>Réserve totale</span><b>{status.bank} 🐟</b></div>
            <div><span>Rebonds</span><b>{status.bounces}</b></div>
            <div><span>Rebonds sur chariot</span><b>{status.cartBounces}</b></div>
            <div><span>Purr Rush</span><b>{status.rushCount}</b></div>
            <div><span>Combo</span><b>×{status.comboMultiplier}</b></div>
            <div><span>Record</span><b>{status.best} m</b></div>
          </div>
          <button type="button" onClick={()=>game.current?.start()}>Rejouer</button>
        </>}
        <p>Prototype mobile v0.19.1 · Maisons illustrées en volume.</p>
      </div>
    </section>}
  </main>;
}
