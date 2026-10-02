const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.STEGA_URL||'http://127.0.0.1:8765/stega/');
 await page.waitForSelector('.gallery-picture');
 const report=await page.evaluate(async()=>{
 const report=[];const secret='photo sharing test passphrase';
 for(const picture of STEGA_GALLERY){
  const response=await fetch(picture.src),blob=await response.blob();
  selectedCoverFile=new File([blob],'gallery.webp',{type:'image/webp'});selectedGalleryId=picture.id;
  document.getElementById('stegSecret').value=secret;
  document.getElementById('stegMessage').value='Meet at the garden 🌿';
  const generated=await generateSecretImage();
  for(const [name,scale,quality] of [['Saved JPG',1,.94],['JPEG 80',1,.8],['Resize 70%',.7,.9],['JPEG 80 + resize 80%',.8,.8]]){
   try{const transformed=await transformedBlob(generated.blob,scale,quality);const decoded=await decodeAnyImage(transformed,secret);report.push({id:picture.id,name,pass:decoded.plain==='Meet at the garden 🌿'});}catch(e){report.push({id:picture.id,name,pass:false,error:e.message});}
  }
 }
 return report;
 });
 const fails=report.filter(r=>!r.pass);console.log(JSON.stringify({total:report.length,failures:fails},null,2));assert.equal(fails.length,0);
 const wrong=await page.evaluate(async()=>{try{await decodeAnyImage(lastGenerated.blob,'wrong password');return false;}catch{return true;}});assert(wrong);
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 console.log('PASS all 30 actual gallery images through JPEG encoding, recompression, resizing and combined processing; wrong-password rejection and mobile layout');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
