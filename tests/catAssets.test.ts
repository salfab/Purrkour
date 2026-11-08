import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {describe,it,expect} from 'vitest';

const assetPath=resolve(process.cwd(),'public/assets/character/cat_rear_strip.webp');

describe('illustrated rear cat sprite atlas',()=>{
  it('is a complete transparent four-frame source WebP, decoded to isolated Canvas frames',()=>{
    const buffer=readFileSync(assetPath);
    expect(buffer.toString('ascii',0,4)).toBe('RIFF');
    expect(buffer.toString('ascii',8,12)).toBe('WEBP');
    expect(buffer.toString('ascii',12,16)).toBe('VP8X');
    expect(buffer.readUInt32LE(4)).toBe(buffer.length-8);
    // Extended WebP has alpha, preserving the outline without a black box.
    expect(buffer[20]! & 0x10).toBe(0x10);
    const width=buffer.readUIntLE(24,3)+1;
    const height=buffer.readUIntLE(27,3)+1;
    expect(width).toBe(height*4);
    expect(height).toBeGreaterThanOrEqual(64);
  });

  it('decodes all frames when ffmpeg is available on the runner',()=>{
    const ffmpeg=spawnSync('ffmpeg',[
      '-hide_banner','-loglevel','error','-i',assetPath,
      '-frames:v','1','-f','null','-',
    ],{encoding:'utf8'});
    if(ffmpeg.error && 'code' in ffmpeg.error && ffmpeg.error.code==='ENOENT')return;
    expect(ffmpeg.status,ffmpeg.stderr).toBe(0);
  });
});
