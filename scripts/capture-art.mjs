import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

const houseStudy=process.argv.includes('--house');
const districtStudy=process.argv.includes('--districts');
const descentStudy=process.argv.includes('--descent');
const directory=houseStudy?'screenshots/volume-house-test':districtStudy?'screenshots/district-houses':descentStudy?'screenshots/descent':'screenshots/illustrated-facade-test';
await mkdir(directory,{recursive:true});
const browser=await chromium.launch({
  headless:true,
  ...(process.env.PURRKOUR_BROWSER_PATH?{executablePath:process.env.PURRKOUR_BROWSER_PATH}:{}),
  args:[
    '--use-gl=angle','--use-angle=swiftshader','--enable-webgl',
    '--disable-dev-shm-usage','--no-sandbox',
  ],
});
const results=[];
const base=process.env.PURRKOUR_CAPTURE_URL || 'http://127.0.0.1:4173/Purrkour/';
const items=descentStudy?[
  {district:'entry',distance:453},
  {district:'first-gate',distance:464},
  {district:'middle',distance:483},
  {district:'exit',distance:510},
]:houseStudy?[
  {district:'approach',distance:48},
  {district:'near',distance:56},
  {district:'passing',distance:66},
]:[
  {district:'old-town',distance:50},
  {district:'market',distance:150},
  {district:'gardens',distance:districtStudy?220:250},
  {district:'twilight',distance:350},
];
try{
  if(houseStudy){
    for(const view of ['corner','front']){
      const page=await browser.newPage({viewport:{width:1080,height:900},deviceScaleFactor:1});
      const issues=[];
      page.on('pageerror',error=>issues.push(String(error)));
      await page.goto(new URL('house-study.html?view='+view,base).href,{waitUntil:'networkidle'});
      await page.waitForFunction(()=>document.documentElement.dataset.volumeHouseReady==='true');
      await page.waitForTimeout(500);
      if(issues.length)throw new Error('House study errors: '+issues.join('; '));
      const file='study-'+view+'.png';
      await page.screenshot({path:directory+'/'+file});
      results.push({study:true,view,file});
      await page.close();
    }
  }
  for(const item of process.argv.includes('--study-only')?[]:items){
    for(const style of houseStudy?['sprites','volume']:districtStudy||descentStudy?['volume']:['sprites','compare']){
      const context=await browser.newContext({
        viewport:{width:390,height:844},
        deviceScaleFactor:2,
        isMobile:true,
        hasTouch:true,
        reducedMotion:'reduce',
      });
      const page=await context.newPage();
      const issues=[];
      page.on('pageerror',error=>{
        const message=String(error);
        issues.push(message);
        console.error('[pageerror]',message);
      });
      page.on('console',message=>{
        if(message.type()==='error'||message.type()==='warning'){
          console.error('[browser '+message.type()+']',message.text());
        }
      });
      page.on('requestfailed',request=>{
        console.error('[requestfailed]',request.url(),request.failure());
      });
      const query=new URLSearchParams({
        districtPreview:descentStudy?'0':'1',
        housePreview:style,
        artShot:String(item.distance),
      });
      const url=base+'?'+query.toString();
      await page.goto(url,{waitUntil:'networkidle',timeout:45000});
      try{
        await page.waitForFunction(
          ()=>document.documentElement.dataset.houseArtReady==='true',
          null,
          {timeout:10000},
        );
        if(style==='volume')await page.waitForFunction(
          ()=>document.documentElement.dataset.volumeHouseReady==='true',null,{timeout:10000},
        );
        if(districtStudy&&item.district!=='market')await page.waitForFunction(
          key=>['front','end',...(key==='old-town'?[]:['endalt'])].every(part=>document.documentElement.dataset['districtArt'+key.replaceAll('-','')+part]==='ready'),
          item.district,{timeout:20000},
        );
      }catch(error){
        const html=await page.evaluate(()=>({
          title:document.title,url:location.href,
          art:document.documentElement.dataset.houseArtReady,
          game:document.querySelector('.game')?.outerHTML.slice(0,400),
          text:document.body.textContent?.slice(0,450),
        }));
        const diagnostic=`debug-${item.district}-${style}.png`;
        await page.screenshot({path:directory+'/'+diagnostic});
        console.error('Art screenshot initialization failed',html,issues);
        throw error;
      }
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
