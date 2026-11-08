import type {DistrictKey} from './districts';

export interface AtlasCell{
  readonly x:number;
  readonly y:number;
  readonly width:number;
  readonly height:number;
}

/** Exact pixel rectangles; the source illustration is never stretched/cross-sampled. */
export function atlasCells(
  width:number,height:number,columns:number,rows:number,
):readonly AtlasCell[]{
  if(columns<1||rows<1||width%columns!==0||height%rows!==0){
    throw new Error('Invalid Purrkour painted atlas dimensions');
  }
  const cellWidth=width/columns,cellHeight=height/rows;
  return Array.from({length:columns*rows},(_,index)=>({
    x:(index%columns)*cellWidth,
    y:Math.floor(index/columns)*cellHeight,
    width:cellWidth,
    height:cellHeight,
  }));
}

/**
 * Do not make every district the same recolored wall. Each draws from
 * separate sections of the original painted Mediterranean plaster sheet.
 */
export function facadeTileIndices(key:DistrictKey):readonly [number,number]{
  switch(key){
    case 'old-town':return [0,1];
    case 'market':return [1,2];
    case 'gardens':return [0,3];
    case 'twilight':return [3,2];
  }
}

export function roofTileIndex(key:DistrictKey):number{
  return key==='old-town'||key==='market'?0:1;
}
