/**
 * Visual districts are independent from the deterministic obstacle director.
 * During art prototyping each district lasts 325 m; production can use 500
 * or 1000 by changing ONLY this constant. No new collision or physics rules.
 */
/**
 * Experimental art-preview mode only: use ?districtPreview=1 to see all four
 * neighborhoods every 100m without changing the normal 325m progression.
 * No gameplay rules or obstacles are modified by this setting.
 */
export function districtLengthForPreview(query:string):number{
  return new URLSearchParams(query).get('districtPreview')==='1'?100:325;
}
export const DISTRICT_LENGTH_METRES=districtLengthForPreview(
  typeof window!=='undefined'?window.location.search:'',
);
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
/**
 * Architectural silhouettes are meaningful geometry, not merely wall colors.
 * Every facade is a combination of one of four low-poly masses, one true
 * roof profile, and district-specific decorative modules.
 */
export type HouseArchetype='gable'|'terrace'|'stepped'|'tower'|'shop';
export interface HouseProfile{
  readonly district:DistrictTheme;
  readonly side:-1|1;
  readonly z:number;
  readonly centerX:number;
  readonly width:number;
  readonly height:number;
  readonly depth:number;
  readonly variation:number;
  readonly archetype:HouseArchetype;
  readonly compact:boolean;
}

/** Seeded integer mixer: never depend on Math.random() or frame timings. */
function houseHash(index:number,seed:number,salt:number):number{
  let n=(Math.imul(index+17,0x45d9f3b)
    ^Math.imul((seed|0)+13,0x119de1f3)
    ^Math.imul(salt+3,0x27d4eb2d))>>>0;
  n^=n>>>16;
  n=Math.imul(n,0x7feb352d);
  return (n^(n>>>15))>>>0;
}

const styles:Readonly<Record<DistrictKey,readonly HouseArchetype[]>>={
  'old-town':['gable','gable','stepped','tower','terrace'],
  'market':['shop','shop','terrace','stepped','gable'],
  'gardens':['terrace','stepped','terrace','gable','tower'],
  'twilight':['tower','terrace','stepped','gable','tower'],
};

export const BUILDING_ENVELOPE={
  // Track ends at 2.5m, decoration must start beyond x=3.55m.
  roadHalfWidth:2.5,
  minDecorationClearance:1.05,
  maxProjection:1.02,
  minSameSideGap:1.1,
} as const;

export function houseProfile(
  chunkIndex:number,
  runSeed:number,
  side:-1|1,
  distance:number,
  compact=false,
):HouseProfile{
  const visual=districtAt(distance);
  const n=houseHash(chunkIndex,runSeed,side);
  const variation=n%4;
  const archetypes=styles[visual.theme.key];
  const archetype=compact?'shop':archetypes[houseHash(chunkIndex,runSeed,side+49)%archetypes.length]!;
  const width=compact?2.75+(n%2)*.25:3.05+(n%4)*.24;
  const height=compact?4.45+(n%3)*.38:5.55+(n%4)*.9;
  const depth=compact?6.9+(n%3)*.2:7.6+(n%4)*.72;
  // The decoration is outside the road even on the narrowest frontage.
  const centerX=side*(compact?6.40:6.50+(n%3)*.23);
  return {
    district:visual.theme,side,z:distance,centerX,
    width,height,depth,variation,archetype,compact,
  };
}

/**
 * More organic rhythm than one identical building every three chunks:
 * approximately one facade per 12-m segment, with occasional paired shops
 * or courtyards. Primary houses alternate sides, so they are at least 24 m
 * apart on each side. A secondary building is deliberately narrower.
 */
export function houseProfilesForChunk(chunkIndex:number,runSeed:number):readonly HouseProfile[]{
  if(chunkIndex<0)return [];
  const from=chunkIndex*12;
  const n=houseHash(chunkIndex,runSeed,179);
  const primarySide: -1|1=chunkIndex%2===0?-1:1;
  const z=from+6+((houseHash(chunkIndex,runSeed,31)%5)-2)*.32;
  // Occasional open courts and cross-streets create visual breathing room.
  const primary=n%11===0?[]:[houseProfile(chunkIndex,runSeed,primarySide,z)];
  const secondary=n%5===0
    ?[houseProfile(chunkIndex,runSeed,primarySide===-1?1:-1,from+6,true)]
    :[];
  return [...primary,...secondary];
}

export function houseInnerEdge(house:HouseProfile):number{
  return Math.abs(house.centerX)-house.width/2;
}

/** Conservatively bound the facade + awnings/planters toward the running lane. */
export function houseMinVisibleClearance(house:HouseProfile):number{
  return houseInnerEdge(house)-BUILDING_ENVELOPE.maxProjection
    -BUILDING_ENVELOPE.roadHalfWidth;
}
