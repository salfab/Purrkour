import { useEffect, useRef, useState } from 'react';
import { WORLD, type Snapshot } from './game/core';
import { PurrkourGame } from './game/PurrkourGame';

const initial: Snapshot = {
  mode:'menu',distance:0,altitude:0,score:0,fish:0,bank:0,
  speed:WORLD.speedStart,boost:0,bounces:0,best:0,bestScore:0,failure:null,
  routeChoice:null,routeStage:null,
  instinct:0,rush:0,rushCount:0,comboMultiplier:1,comboChain:0,
  rewardFeedback:'none',lastComboBonus:0,
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
        <div className="chip"><small>DISTANCE</small><strong>{status.distance} m</strong><span> ↑ {status.altitude.toFixed(1)} m</span></div>
        <div className="chip"><small>SCORE</small><strong>{status.score}</strong><span> 🐟 {status.fish}</span></div>
        <div className={status.boost>0?'chip chip--boost':'chip'}>
          {status.boost>0?('⚡ BOOST '+status.boost.toFixed(1)+' s'):('VITESSE '+status.speed.toFixed(1)+' m/s ↗')}
        </div>
      </div>
      <div className="hud-buttons">
        <button type="button" className="icon-btn" aria-label={muted?'Activer la musique':'Couper la musique'} onClick={()=>setMuted(game.current?.toggleMusic()??true)}>{muted?'🔇':'🔊'}</button>
        <button type="button" className="icon-btn" aria-label="Changer l'angle de caméra" onClick={()=>setPitch(game.current?.cycleCamera()??pitch)}>📷 {pitch}°</button>
        <button type="button" className="icon-btn" aria-label="Mettre le jeu en pause" disabled={!running} onClick={()=>game.current?.pause()}>Ⅱ</button>
      </div>
    </header>
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
      <div className={status.rewardFeedback==='perfect'?'reward-flash reward-flash--perfect':'reward-flash'}>
        {status.rewardFeedback==='perfect'
          ?'✨ PURRFECT ! +'+status.lastComboBonus
          :'⚡ PURR RUSH !'}
      </div>
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
    {!running&&<section className="overlay">
      <div className="dialog">
        <div className="eyebrow">PURRKOUR · V0.17 · MOBILE FIRST</div>
        <h1>Purrkour 🐈</h1>
        {error&&<p className="error">Impossible de démarrer le jeu : {error}</p>}
        {!error&&status.mode==='menu'&&<>
          <p>Un petit chat kawaii, des toits colorés et toujours plus de vitesse !</p>
          <ul>
            <li>Glisse ton pouce en bas de l'écran pour guider le chat.</li>
            <li>Relâche pour sauter. Les caisses deviennent des trampolines !</li>
            <li>Les poissons remplissent l'Instinct : à 100, Purr Rush attire les poissons bleus !</li>
            <li>Rebond + poisson doré haut + réception réussie = combo PURRFECT.</li>
            <li>Attrape des poissons, puis apprends à rebondir pour saisir les bonus les plus hauts.</li>
            <li>Choisis entre les poissons faciles au sol et les récompenses à risque.</li>
            <li>Vers 250 m, choisis ta route en te plaçant à gauche ou à droite.</li>
            <li>La vitesse augmente naturellement pendant le run.</li>
          </ul>
          <button type="button" onClick={()=>game.current?.start()}>Commencer le run</button>
        </>}
        {!error&&status.mode==='paused'&&<>
          <p>Le petit chat reprend son souffle.</p>
          <button type="button" onClick={()=>game.current?.resume()}>Reprendre</button>
          <button type="button" className="secondary" onClick={()=>game.current?.start()}>Recommencer</button>
        </>}
        {!error&&status.mode==='over'&&<>
          <h2>Encore un saut !</h2>
          <p>{status.failure==='crate'?'Oups ! Une caisse de côté.':'Oups ! Le chat est tombé dans un fossé.'}</p>
          <div className="stats">
            <div><span>Distance</span><b>{status.distance} m</b></div>
            <div><span>Score</span><b>{status.score}</b></div>
            <div><span>Poissons gagnés</span><b>+{status.fish} 🐟</b></div>
            <div><span>Réserve totale</span><b>{status.bank} 🐟</b></div>
            <div><span>Rebonds</span><b>{status.bounces}</b></div>
            <div><span>Purr Rush</span><b>{status.rushCount}</b></div>
            <div><span>Combo</span><b>×{status.comboMultiplier}</b></div>
            <div><span>Record</span><b>{status.best} m</b></div>
          </div>
          <button type="button" onClick={()=>game.current?.start()}>Rejouer</button>
        </>}
        <p>Prototype mobile v0.17 · Instinct félin, Purr Rush et combos.</p>
      </div>
    </section>}
  </main>;
}
