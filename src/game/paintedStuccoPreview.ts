import type {DistrictKey} from './districts';

/** Optional comparison only; the default material set stays on v0.18.4. */
export const PAINTED_STUCCO_PREVIEW={
  queryParameter:'facadePreview',
  queryValue:'stucco',
  roof:'roof_terracotta_painted.png',
} as const;

const wallFiles={
  'old-town':['stucco_cream_painted.png','stucco_peach_painted.png'],
  'market':['stucco_ochre_painted.png','stucco_peach_painted.png'],
  'gardens':['stucco_cream_painted.png','stucco_ochre_painted.png'],
  'twilight':['stucco_rose_painted.png','stucco_cream_painted.png'],
} as const satisfies Record<DistrictKey,readonly [string,string]>;

export function isPaintedStuccoPreview(query:string):boolean{
  return new URLSearchParams(query).get(PAINTED_STUCCO_PREVIEW.queryParameter)
    ===PAINTED_STUCCO_PREVIEW.queryValue;
}

export function previewWallFiles(district:DistrictKey):readonly [string,string]{
  return wallFiles[district];
}
