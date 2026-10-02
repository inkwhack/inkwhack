const {chromium}=require('playwright');
(async()=>{
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8765/gta/'); await page.waitForFunction(()=>document.querySelectorAll('.cheat-card').length===36);await page.screenshot({path:'gta/preview-desktop.png'});
await page.selectOption('#edition','ps3');if(await page.locator('.cheat-card').count()!==31||await page.locator('.phone').count())throw Error('PS3 compatibility');
await page.getByRole('button',{name:'Xbox',exact:true}).click();await page.selectOption('#edition','360');if(await page.locator('.cheat-card').count()!==31)throw Error('360 compatibility');
await page.getByRole('button',{name:'PC',exact:true}).click();await page.fill('#search','black cellphone');if(await page.locator('.cheat-card').count()!==1||await page.locator('.sequence').count())throw Error('phone-only');
await page.fill('#search','');await page.selectOption('#category','Vehicles');if(await page.locator('.cheat-card').count()!==14)throw Error('vehicle count');
await page.getByRole('button',{name:'Reset filters'}).click();if(await page.locator('.cheat-card').count()!==36)throw Error('reset');
for(const family of ['PlayStation','Xbox','PC']){await page.getByRole('button',{name:family,exact:true}).click();for(const opt of await page.locator('#edition option').evaluateAll(x=>x.map(o=>o.value))){await page.selectOption('#edition',opt);const count=await page.locator('.cheat-card').count();if(count!==(['ps3','360'].includes(opt)?31:36))throw Error(opt);}}
await page.getByRole('button',{name:'PlayStation',exact:true}).click();await page.screenshot({path:'assets/project-screenshots/gta.png'});
for(const url of ['gta/','gta/blog/','']){await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:8765/'+url);await page.waitForTimeout(300);if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow '+url);if(url==='gta/')await page.screenshot({path:'gta/preview-mobile.png'});if(url==='gta/blog/')await page.screenshot({path:'gta/preview-blog.png'});}
if(errors.length)throw Error(errors.join('\n'));console.log('PASS: eight editions, search, categories, reset, phone-only exceptions, desktop/mobile pages.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
