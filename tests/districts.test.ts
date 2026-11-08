import {describe,expect,it} from 'vitest';
import {
  DISTRICT_LENGTH_METRES,DISTRICT_BLEND_METRES,DISTRICTS,
  districtAt,districtBlend,houseProfile,
} from '../src/game/districts';
import {WORLD,makePlayer,simulate,type Controls} from '../src/game/core';

describe('v0.18.1 visual districts',()=>{
  it('shows four distinct chapters every 325 m without changing gameplay distances',()=>{
    expect(DISTRICT_LENGTH_METRES).toBe(325);
    expect(DISTRICTS.map(d=>d.key)).toEqual(['old-town','market','gardens','twilight']);
    for(const [distance,expected] of [
      [0,'old-town'],[324.999,'old-town'],[325,'market'],
      [649.999,'market'],[650,'gardens'],
      [974.999,'gardens'],[975,'twilight'],
      [1299.999,'twilight'],[1300,'old-town'],
    ] as const){
      expect(districtAt(distance).theme.key).toBe(expected);
    }
    expect(districtAt(-9).theme.key).toBe('old-town');
    expect(districtAt(325).within).toBe(0);
    expect(districtAt(500).remaining).toBe(150);
  });
  it('interpolates background gradually and without a discontinuity at borders',()=>{
    expect(DISTRICT_BLEND_METRES).toBe(55);
    expect(districtBlend(0).factor).toBe(0);
    expect(districtBlend(269).factor).toBe(0);
    expect(districtBlend(325-DISTRICT_BLEND_METRES).factor).toBe(0);
    expect(districtBlend(324.999).factor).toBeGreaterThan(.999);
    expect(districtBlend(325).factor).toBe(0);
    expect(districtBlend(325).current.key).toBe('market');
    expect(districtBlend(325-.001).next.key).toBe('market');
    expect(districtBlend(325).current.sky).toBe(districtBlend(325-.001).next.sky);
    for(const boundary of [325,650,975,1300]){
      expect(districtBlend(boundary-.1).factor).toBeGreaterThan(.999);
      expect(districtBlend(boundary).factor).toBe(0);
    }
  });
  it('uses varied repeatable modular houses while keeping all decorative pieces outside the road',()=>{
    const variants=new Set<number>();
    const widths=new Set<number>();
    for(const seed of [0,18,314,927]){
      for(let index=0;index<140;index+=3){
        for(const side of [-1,1] as const){
          const z=index*12+5;
          const a=houseProfile(index,seed,side,z);
          const b=houseProfile(index,seed,side,z);
          expect(a).toEqual(b);
          expect(a.district.key).toBe(districtAt(z).theme.key);
          expect(Math.abs(a.centerX)-a.width/2-.8).toBeGreaterThan(WORLD.trackWidth/2+1);
          expect(a.height).toBeGreaterThan(5.5);
          expect(a.depth).toBeLessThanOrEqual(12);
          variants.add(a.variation);
          widths.add(a.width);
        }
      }
    }
    expect(variants.size).toBe(4);
    expect(widths.size).toBeGreaterThan(1);
  });
  it('leaves steering, running speed and rewards unchanged by district borders',()=>{
    const p=makePlayer(23);
    const controls:Controls={targetX:0,left:false,right:false,jump:false};
    p.z=649.90;p.elapsed=31;
    const speedBefore=p.speed;
    simulate(p,controls,new Set(),1/120);
    expect(p.failure).toBeNull();
    expect(p.routeChoice).toBeNull();
    expect(p.x).toBe(0);
    expect(p.score).toBe(0);
    expect(p.fish).toBe(0);
    expect(p.speed).toBeGreaterThanOrEqual(speedBefore);
  });
});
