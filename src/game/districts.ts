/**
 * Visual districts are independent from the deterministic obstacle director.
 * During art prototyping each district lasts 325 m; production can use 500
 * or 1000 by changing ONLY this constant. No new collision or physics rules.
 */
export const DISTRICT_LENGTH_METRES=325;
export const DISTRICT_BLEND_METRES=55;
export type DistrictKey='old-town'|'market'|'gardens'|'twilight';
export interface DistrictTheme {
  readonly key:DistrictKey;
  readonly name:string;
  readonly subtitle:string;
  readonly icon:string;
  readonly walls:readonly [string,string];
  readonly roof:string;
  readonly accent:string;
  readonly shutter:string;
  readonly trim:string;
  readonly foliage:string;
  readonly sky:string;
  readonly fog:string;
  readonly panoramaTint:string;
  readonly sunlight:string;
}
export const DISTRICTS:readonly DistrictTheme[]=[
  {
    key:'old-town',name:'Vieille ville',subtitle:'Les premiers toits',icon:'🏘️',
    walls:['#fffaf1','#ffdfd1'],roof:'#fff0df',accent:'#a66d63',
    shutter:'#7daab5',trim:'#f6ddb9',foliage:'#87b67c',
    sky:'#a9d4e8',fog:'#c8dbe0',panoramaTint:'#ffffff',sunlight:'#fff3d6',
  },
  {
    key:'market',name:'Quartier du marché',subtitle:'Auvents et étals colorés',icon:'🍊',
    walls:['#ffeac9','#f5c6b1'],roof:'#ffe7b3',accent:'#e58b6e',
    shutter:'#7fadb1',trim:'#ffd58b',foliage:'#80ad70',
    sky:'#f4c7ad',fog:'#eacfb5',panoramaTint:'#ffe4d6',sunlight:'#fff0cc',
  },
  {
    key:'gardens',name:'Jardins suspendus',subtitle:'Balcons fleuris',icon:'🌿',
    walls:['#e6f7e4','#f8e4de'],roof:'#f0e8c8',accent:'#78aa91',
    shutter:'#6c9e91',trim:'#cae6b9',foliage:'#5eae7b',
    sky:'#bce5df',fog:'#c6e5d9',panoramaTint:'#e7fff0',sunlight:'#f4ffe6',
  },
  {
    key:'twilight',name:'Toits du crépuscule',subtitle:'Lanternes et étoiles',icon:'🏮',
    walls:['#d1d1ed','#dec7dc'],roof:'#abb3d8',accent:'#a78ebf',
    shutter:'#7b79aa',trim:'#e9c9af',foliage:'#729b8b',
    sky:'#8699c9',fog:'#a5aecb',panoramaTint:'#c1c0e5',sunlight:'#ffd9bf',
  },
] as const;

export interface DistrictLocation {
  readonly ordinal:number;
  readonly theme:DistrictTheme;
  readonly next:DistrictTheme;
  readonly within:number;
  readonly remaining:number;
  readonly start:number;
}

/** Visual chapters repeat with seeded facade variation after the fourth. */
export function districtAt(distance:number):DistrictLocation{
  const d=Math.max(0,distance);
  const ordinal=Math.floor(d/DISTRICT_LENGTH_METRES);
  const theme=DISTRICTS[ordinal%DISTRICTS.length]!;
  const next=DISTRICTS[(ordinal+1)%DISTRICTS.length]!;
  const start=ordinal*DISTRICT_LENGTH_METRES;
  const within=d-start;
  return {ordinal,theme,next,within,remaining:DISTRICT_LENGTH_METRES-within,start};
}
export interface DistrictBlend{
  readonly current:DistrictTheme;
  readonly next:DistrictTheme;
  readonly factor:number;
}
/** Warm up the atmosphere BEFORE the facade boundary; no hard sky cut. */
export function districtBlend(distance:number):DistrictBlend{
  const district=districtAt(distance);
  const progress=Math.max(0,Math.min(1,
    (district.within-(DISTRICT_LENGTH_METRES-DISTRICT_BLEND_METRES))
      /DISTRICT_BLEND_METRES,
  ));
  return {
    current:district.theme,
    next:district.next,
    factor:progress*progress*(3-2*progress),
  };
}
export interface HouseProfile{
  readonly district:DistrictTheme;
  readonly side:-1|1;
  readonly z:number;
  readonly centerX:number;
  readonly width:number;
  readonly height:number;
  readonly depth:number;
  readonly variation:number;
}

/** A stable silhouette without frame-dependent randomness or new topology. */
export function houseProfile(
  chunkIndex:number,
  runSeed:number,
  side:-1|1,
  distance:number,
):HouseProfile{
  const visual=districtAt(distance);
  const n=(Math.imul(chunkIndex+1,0x45d9f3b)
    ^Math.imul((runSeed|0)+13,0x119de1f3)
    ^Math.imul(side+2,0x27d4eb2d))>>>0;
  const variation=n%4;
  return {
    district:visual.theme,
    side,z:distance,centerX:side*7.05,
    width:3.4+.22*(variation%3),
    height:5.9+.8*(variation%4),
    depth:10.8+.45*(variation%3),
    variation,
  };
}
