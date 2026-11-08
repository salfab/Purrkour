import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {describe,it,expect} from 'vitest';

const assets=[
  'public/assets/character/cat_side_original_hq.png',
  'public/assets/character/cat_rear_original_hq.png',
] as const;

describe('restored illustrated 4×2 character atlases',()=>{
  for(const path of assets){
    it(`${path} contains eight transparent 256×256 RGBA frames`,()=>{
      const png=readFileSync(resolve(process.cwd(),path));
      expect(png.subarray(0,8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));
      expect(png.toString('ascii',12,16)).toBe('IHDR');
      expect(png.readUInt32BE(16)).toBe(1024);
      expect(png.readUInt32BE(20)).toBe(512);
      expect(png[25]).toBe(6); // RGBA, not indexed palette with tRNS
      expect(png.length).toBeGreaterThan(100000);
      expect(png.length).toBeLessThan(1000000);
    });

    it(`${path} decodes cleanly when ffmpeg is present`,()=>{
      const check=spawnSync('ffmpeg',[
        '-hide_banner','-loglevel','error',
        '-i',resolve(process.cwd(),path),
        '-frames:v','1','-f','null','-',
      ],{encoding:'utf8'});
      if(check.error && 'code' in check.error && check.error.code==='ENOENT')return;
      expect(check.status,check.stderr).toBe(0);
    });
  }

  it('loads both original sheets with no synthetic image manipulation',()=>{
    const source=readFileSync(resolve(process.cwd(),'src/game/ArtWorld.ts'),'utf8');
    const loader=readFileSync(resolve(process.cwd(),'src/game/characterFrames.ts'),'utf8');
    expect(source).toContain('cat_side_original_hq.png');
    expect(source).toContain('cat_rear_original_hq.png');
    expect(source).toContain('this.rearFrames.length===8');
    expect(source).toContain('rearDisplayFrame(rear,player.boost)');
    expect(loader).not.toContain('cleanRearFootArtifacts');
    expect(loader).not.toContain('createRearBoostFrames');
    expect(loader).toContain('ctx.drawImage(');
    expect(source).toContain("fish:sprite(iconTexture('fish'))");
  });
});
