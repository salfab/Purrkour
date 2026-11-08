import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {describe,it,expect} from 'vitest';

const assetPath=resolve(process.cwd(),'public/assets/character/cat_rear_clean.png');

describe('clean rear cat sprite sheet',()=>{
  it('is a transparent 384×96 PNG, four 96×96 padded frames',()=>{
    const png=readFileSync(assetPath);
    expect(png.subarray(0,8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));
    expect(png.toString('ascii',12,16)).toBe('IHDR');
    const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
    expect(width).toBe(384);
    expect(height).toBe(96);
    expect(width/height).toBe(4);
    expect(png[25]).toBe(3); // PNG palette
    expect(png.includes(Buffer.from('tRNS'))).toBe(true);
    expect(png.length).toBeLessThan(20000);
  });
  it('replaces only the rear artwork, leaving profile and fish untouched',()=>{
    const source=readFileSync(resolve(process.cwd(),'src/game/ArtWorld.ts'),'utf8');
    expect(source).toContain('assets/character/cat_rear_clean.png');
    expect(source).not.toContain('assets/character/cat_rear_strip.webp');
    expect(source).toContain('assets/character/cat_atlas.png');
    expect(source).toContain("fish:sprite(iconTexture('fish'))");
    expect(source).toContain("isolateCharacterFrames(loaded.image as HTMLImageElement,4,1,'rear')");
  });
  it('decodes on CI when ffmpeg is available',()=>{
    const check=spawnSync('ffmpeg',[
      '-hide_banner','-loglevel','error','-i',assetPath,
      '-frames:v','1','-f','null','-',
    ],{encoding:'utf8'});
    if(check.error && 'code' in check.error && check.error.code==='ENOENT')return;
    expect(check.status,check.stderr).toBe(0);
  });
});
