import * as THREE from 'three';

/** Original hand-painted 4×2 RGBA spritesheets: 8 independent 256px poses. */
export interface FrameLayout {
  readonly columns:number;
  readonly rows:number;
  readonly frameWidth:number;
  readonly frameHeight:number;
}

export function getFrameLayout(width:number,height:number,columns:number,rows:number):FrameLayout {
  if(!Number.isInteger(width)||!Number.isInteger(height)
    ||!Number.isInteger(columns)||!Number.isInteger(rows)
    ||width<=0||height<=0||columns<=0||rows<=0
    ||width%columns!==0||height%rows!==0){
    throw new Error('Character atlas must have complete equal-sized frames');
  }
  return {columns,rows,frameWidth:width/columns,frameHeight:height/rows};
}

export function configureCharacterTexture(texture:THREE.CanvasTexture):void{
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.generateMipmaps=false;
  texture.minFilter=THREE.LinearFilter;
  texture.magFilter=THREE.LinearFilter;
  texture.wrapS=THREE.ClampToEdgeWrapping;
  texture.wrapT=THREE.ClampToEdgeWrapping;
  texture.anisotropy=1;
}

/**
 * Copy the ORIGINAL RGBA pixels, unchanged, into one GPU texture per frame.
 * Do not apply color-key transparency, remove pixels near the paws, quantize,
 * draw extra speed strokes, or rescale the artwork to a small canvas.
 *
 * Independent textures also avoid color bleeding from neighboring atlas poses.
 */
export function isolateCharacterFrames(
  image:HTMLImageElement,
  columns:number,
  rows:number,
):THREE.CanvasTexture[]{
  const layout=getFrameLayout(image.naturalWidth,image.naturalHeight,columns,rows);
  const output:THREE.CanvasTexture[]=[];
  for(let index=0;index<columns*rows;index++){
    const col=index%columns;
    const row=Math.floor(index/columns);
    const canvas=document.createElement('canvas');
    canvas.width=layout.frameWidth;
    canvas.height=layout.frameHeight;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('Canvas2D not supported');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(
      image,
      col*layout.frameWidth,row*layout.frameHeight,
      layout.frameWidth,layout.frameHeight,
      0,0,layout.frameWidth,layout.frameHeight,
    );
    const texture=new THREE.CanvasTexture(canvas);
    configureCharacterTexture(texture);
    output.push(texture);
  }
  return output;
}

/** Reuse the exact same side art on both edges, mirroring only its UVs. */
export function setCharacterMirror(texture:THREE.CanvasTexture,mirrored:boolean):void{
  texture.repeat.x=mirrored?-1:1;
  texture.offset.x=mirrored?1:0;
}
