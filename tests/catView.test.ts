import {describe,expect,it} from 'vitest';
import {catViewFromLocalX,mirrorProfileForView} from '../src/game/catView';

describe('kawaii cat facing the vanishing point',()=>{
  it('uses the rear atlas in the middle',()=>{
    for(const x of [-.48,-.2,0,.2,.48]){
      expect(catViewFromLocalX(x)).toBe('rear');
    }
  });
  it('faces right when standing on the LEFT of the screen',()=>{
    // Positive local X is screen left.
    expect(catViewFromLocalX(1.4)).toBe('screen-left');
    expect(mirrorProfileForView('screen-left')).toBe(false);
  });
  it('faces left using the SAME mirrored sprites on the RIGHT of the screen',()=>{
    expect(catViewFromLocalX(-1.4)).toBe('screen-right');
    expect(mirrorProfileForView('screen-right')).toBe(true);
  });
});
