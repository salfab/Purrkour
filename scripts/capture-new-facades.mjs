import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

const base=process.env.PURRKOUR_CAPTURE_URL||'http://127.0.0.1:4173/';
const out='screenshots/new-facades';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,
  ...(process.env.PURRKOUR_BROWSER_PATH?{executablePath:process.env.PURRKOUR_BROWSER_PATH}:{}),
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--no-sandbox']});
try{
  for(const district of ['old-town','market','gardens','twilight']){
    for(const view of ['front','corner']){
      const page=await browser.newPage({viewport:{width:960,height:800}});
      const errors=[];page.on('pageerror',e=>errors.push(String(e)));
      const query=new URLSearchParams({district,view,variant:district==='market'?'3':'2'});
      await page.goto(new URL('house-study.html?'+query,base).href,{waitUntil:'networkidle'});
      await page.waitForFunction(()=>document.documentElement.dataset.volumeHouseReady==='true');
      if(district!=='market')await page.waitForFunction(key=>
        ['frontnew','endnew'].every(part=>document.documentElement.dataset['districtArt'+key.replaceAll('-','')+part]==='ready'),district);
      if(errors.length)throw Error(errors.join('\n'));
      await page.screenshot({path:`${out}/${district}-${view}.png`});await page.close();
    }
  }
}finally{await browser.close();}
