/**
 * Screen-left is positive local X because the trailing camera looks along +Z.
 * The existing profile sprites face screen-right in their original orientation.
 */
export type CatView='rear'|'screen-left'|'screen-right';

export function catViewFromLocalX(localX:number,centerLimit=.48):CatView {
  if(localX>centerLimit)return 'screen-left';
  if(localX< -centerLimit)return 'screen-right';
  return 'rear';
}

export function mirrorProfileForView(view:CatView):boolean {
  return view==='screen-right';
}
