import * as THREE from 'three';

/** Use one RGBA GPU texture per pose, never sample adjacent atlas frames. */
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

export interface RgbaPixels{
  readonly width:number;
  readonly height:number;
  readonly data:Uint8ClampedArray;
}

/**
 * Rear illustration contains saturated red/pink flecks below the feet.
 * Remove ONLY such near-primary-red pixels within the bottom 20%, preserving
 * orange fur and pale pink pads.
 */
export function cleanRearFootArtifacts(pixels:RgbaPixels):number{
  let removed=0;
  for(let y=Math.floor(pixels.height*.8);y<pixels.height;y++){
    for(let x=0;x<pixels.width;x++){
      const i=(y*pixels.width+x)*4;
      const r=pixels.data[i]??0;
      const g=pixels.data[i+1]??0;
      const b=pixels.data[i+2]??0;
      const alpha=pixels.data[i+3]??0;
      if(alpha>0&&r>175&&g<105&&(b<115||(b>g*1.65&&b<195))){
        pixels.data[i+3]=0;
        removed++;
      }
    }
  }
  return removed;
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

/** Build independent transparent frames once when the PNG or WebP loads. */
export function isolateCharacterFrames(
  image:HTMLImageElement,
  columns:number,
  rows:number,
  kind:'side'|'rear',
):THREE.CanvasTexture[]{
  const layout=getFrameLayout(image.naturalWidth,image.naturalHeight,columns,rows);
  const output:THREE.CanvasTexture[]=[];
  for(let index=0;index<columns*rows;index++){
    const col=index%columns,row=Math.floor(index/columns);
    const canvas=document.createElement('canvas');
    canvas.width=layout.frameWidth;
    canvas.height=layout.frameHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:kind==='rear'});
    if(!ctx)throw new Error('Canvas2D not supported');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(image,
      col*layout.frameWidth,row*layout.frameHeight,
      layout.frameWidth,layout.frameHeight,
      0,0,layout.frameWidth,layout.frameHeight,
    );
    if(kind==='rear'){
      const pixels=ctx.getImageData(0,0,layout.frameWidth,layout.frameHeight);
      cleanRearFootArtifacts(pixels);
      ctx.putImageData(pixels,0,0);
    }
    const texture=new THREE.CanvasTexture(canvas);
    configureCharacterTexture(texture);
    output.push(texture);
  }
  return output;
}

/**
 * Four DISTINCT boost poses from the cleaned rear sheet, one per running
 * animation frame. Paint two subtle yellow side accents per side, avoiding
 * the scattered road particles that obscured the boost pose on mobile.
 *
 * These are created just once when the atlas loads; no canvas allocations
 * during gameplay and no new compressed binary assets.
 */
export function createRearBoostFrames(
  cleanFrames:readonly THREE.CanvasTexture[],
):THREE.CanvasTexture[]{
  return cleanFrames.map((frame,index)=>{
    const original=frame.image as HTMLCanvasElement;
    const canvas=document.createElement('canvas');
    canvas.width=original.width;
    canvas.height=original.height;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('Canvas2D required for boost frames');
    const scale=canvas.width/96;
    ctx.save();ctx.scale(scale,scale);
    // Restrained hand-drawn boost lines beside the rear silhouette.
    // Two tapered strokes per side are much clearer than scattered sparks.
    const shift=index%2===0?-2:2;
    ctx.lineCap='round';
    for(const side of [-1,1]){
      const anchor=side<0?16:80;
      const direction=side<0?-1:1;
      for(let i=0;i<2;i++){
        const y=63+i*15+shift;
        const endX=anchor+direction*(8+i*3);
        ctx.strokeStyle=i===0?'rgba(255,242,157,.90)':'rgba(255,198,76,.85)';
        ctx.lineWidth=i===0?2.8:2.1;
        ctx.beginPath();
        ctx.moveTo(anchor,y);
        ctx.quadraticCurveTo(anchor+direction*5,y-3,endX,y+2);
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.drawImage(original,0,0,canvas.width,canvas.height);
    const texture=new THREE.CanvasTexture(canvas);
    configureCharacterTexture(texture);
    return texture;
  });
}

/** Mirroring only ever changes UVs inside this one isolated frame. */
export function setCharacterMirror(texture:THREE.CanvasTexture,mirrored:boolean):void{
  texture.repeat.x=mirrored?-1:1;
  texture.offset.x=mirrored?1:0;
}
