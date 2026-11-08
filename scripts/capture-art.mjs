import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

const directory='screenshots/illustrated-facade-test';
await mkdir(directory,{recursive:true});
const browser=await chromium.launch({
  headless:true,
  args:[
    '--use-gl=angle','--use-angle=swiftshader','--enable-webgl',
    '--disable-dev-shm-usage','--no-sandbox',
  ],
});
const results=[];
const items=[
  {district:'old-town',distance:50},
  {district:'market',distance:150},
  {district:'gardens',distance:250},
  {district:'twilight',distance:350},
];
try{
  for(const item of items){
    for(const style of ['sprites','compare']){
      const context=await browser.newContext({
        viewport:{width:390,height:844},
        deviceScaleFactor:2,
        isMobile:true,
        hasTouch:true,
        reducedMotion:'reduce',
      });
      const page=await context.newPage();
      const issues=[];
      page.on('pageerror',error=>issues.push(String(error)));
      const query=new URLSearchParams({
        districtPreview:'1',
        housePreview:style,
        artShot:String(item.distance),
      });
      const url='http://127.0.0.1:4173/Purrkour/?'+query.toString();
      await page.goto(url,{waitUntil:'networkidle',timeout:45000});
      await page.waitForFunction(
        ()=>document.documentElement.dataset.houseArtReady==='true',
        {timeout:30000},
      );
      await page.waitForTimeout(1250);
      const scene=await page.evaluate(()=>{
        const canvas=document.querySelector('canvas');
        if(!canvas)return {ready:false,width:0,height:0,webgl:false};
        return {
          ready:document.documentElement.dataset.houseArtReady==='true',
          width:canvas.width,height:canvas.height,
          webgl:!!(canvas.getContext('webgl2')||canvas.getContext('webgl')),
        };
      });
      if(!scene.webgl||!scene.ready){
        throw new Error('WebGL screenshot not ready: '+JSON.stringify(scene));
      }
      if(issues.length)throw new Error('Browser errors: '+issues.join('; '));
      const filename=item.district+'-'+style+'.png';
      await page.screenshot({
        path:directory+'/'+filename,
        animations:'disabled',
        fullPage:false,
      });
      results.push({...item,style,file:filename,scene});
      await context.close();
    }
  }
  await writeFile(directory+'/manifest.json',JSON.stringify(results,null,2));
  console.log('Captured real Three.js rendered frames:');
  console.log(results.map(r=>r.file).join('\n'));
}finally{
  await browser.close();
}
