import {describe,expect,it} from 'vitest';
import {gapEdgesInRange,panoramaPan,panoramaSize} from '../src/game/backdropMath';

describe('Scenic backdrop / visual geometry',()=>{
  it('keeps original image proportions when the lower portion is cropped',()=>{
    const size=panoramaSize(1200,400,.8,32);
    expect(size.height).toBe(32);
    expect(size.width/size.height).toBeCloseTo(1200/(400*.8));
  });
  it('pans smoothly and stays within a modest width, not a repeating fast scroll',()=>{
    const positions=Array.from({length:200},(_,i)=>panoramaPan(i*10));
    expect(positions.every(x=>Math.abs(x)<=8.5)).toBe(true);
    expect(Math.max(...positions.slice(1).map((x,i)=>Math.abs(x-positions[i]!)))).toBeLessThan(.6);
  });
  it('finds both exact gap lips in successive 12-metre chunks',()=>{
    expect(gapEdgesInRange(60,72,68.5,70.8,100)).toEqual([68.5,70.8]);
    expect(gapEdgesInRange(160,172,68.5,70.8,100)).toEqual([168.5,170.8]);
    expect(gapEdgesInRange(72,84,68.5,70.8,100)).toEqual([]);
  });
});
