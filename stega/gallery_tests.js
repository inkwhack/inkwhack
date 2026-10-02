/* Offline core tests for index.html.
   Runs the actual application functions with a tiny DOM/canvas shim. */
const fs=require("fs"),vm=require("vm"),assert=require("assert"),path=require("path"),os=require("os"),child=require("child_process");
const html=fs.readFileSync("index.html","utf8");
const source=html.split("<script>")[1].split("</script>")[0];
const declaredIds=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
const elements=new Map();
function element(id=""){
  if(elements.has(id))return elements.get(id);
  const e={id,value:"",textContent:"",innerHTML:"",dataset:{},files:[],checked:false,disabled:false,style:{},className:"",classList:{add(){},remove(){},toggle(){},contains(){return false;}},addEventListener(){},removeAttribute(){},setAttribute(){},click(){}};
  elements.set(id,e);return e;
}
const document={
  getElementById:element,
  querySelectorAll(){return[];},
  querySelector(sel){if(sel.includes('stegMode'))return {value:"social"};if(sel.includes('robustness'))return {value:"strong"};return element(sel);},
  createElement(tag){if(tag!=="canvas")return element(tag);const c={width:0,height:0,_image:null};c.getContext=()=>({fillStyle:"#202020",fillRect(){const out=new Uint8ClampedArray(c.width*c.height*4);for(let i=0;i<out.length;i+=4){out[i]=out[i+1]=out[i+2]=32;out[i+3]=255;}c._image={width:c.width,height:c.height,data:out};},drawImage(src,...args){const input=src._image;if(args.length===2){const dx=args[0],dy=args[1],out=c._image?c._image.data:new Uint8ClampedArray(c.width*c.height*4);for(let y=0;y<input.height;y++)for(let x=0;x<input.width;x++){if(x+dx<0||y+dy<0||x+dx>=c.width||y+dy>=c.height)continue;const sp=(y*input.width+x)*4,dp=((y+dy)*c.width+x+dx)*4;out[dp]=input.data[sp];out[dp+1]=input.data[sp+1];out[dp+2]=input.data[sp+2];out[dp+3]=255;}c._image={width:c.width,height:c.height,data:out};return;}const out=new Uint8ClampedArray(c.width*c.height*4);for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const sx=Math.min(input.width-1,Math.max(0,Math.round((x+.5)*input.width/c.width-.5))),sy=Math.min(input.height-1,Math.max(0,Math.round((y+.5)*input.height/c.height-.5))),sp=(sy*input.width+sx)*4,dp=(y*c.width+x)*4;out[dp]=input.data[sp];out[dp+1]=input.data[sp+1];out[dp+2]=input.data[sp+2];out[dp+3]=255;}c._image={width:c.width,height:c.height,data:out};},getImageData(){return c._image;},putImageData(img){c._image=img;}});return c;}
};
const context={console,require,document,crypto:globalThis.crypto,TextEncoder,TextDecoder,Uint8Array,Uint8ClampedArray,Float64Array,Blob,URL,setTimeout,clearTimeout,Image:function(){}};
context.window=context;
vm.createContext(context);vm.runInContext(fs.readFileSync("gallery-codec.js","utf8"),context);vm.runInContext(source,context);
const missingIds=[...elements.keys()].filter(id=>id&&!declaredIds.has(id)&&!id.startsWith("input["));
assert.deepEqual(missingIds,[],`JavaScript references missing element IDs: ${missingIds.join(", ")}`);

function photo(w,h){const data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=(y*w+x)*4;data[p]=(x*3+y)%256;data[p+1]=(x+y*2)%256;data[p+2]=(x*2+y*3)%256;data[p+3]=255;}return {width:w,height:h,data};}
function writeBmp(file,img){const stride=Math.ceil(img.width*3/4)*4,size=54+stride*img.height,b=Buffer.alloc(size);b.write("BM");b.writeUInt32LE(size,2);b.writeUInt32LE(54,10);b.writeUInt32LE(40,14);b.writeInt32LE(img.width,18);b.writeInt32LE(img.height,22);b.writeUInt16LE(1,26);b.writeUInt16LE(24,28);b.writeUInt32LE(stride*img.height,34);for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++){const s=(y*img.width+x)*4,d=54+(img.height-1-y)*stride+x*3;b[d]=img.data[s+2];b[d+1]=img.data[s+1];b[d+2]=img.data[s];}fs.writeFileSync(file,b);}
function readBmp(file){const b=fs.readFileSync(file),offset=b.readUInt32LE(10),w=b.readInt32LE(18),h=b.readInt32LE(22),depth=b.readUInt16LE(28);assert.equal(depth,24);const stride=Math.ceil(w*3/4)*4,data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const s=offset+(h-1-y)*stride+x*3,d=(y*w+x)*4;data[d]=b[s+2];data[d+1]=b[s+1];data[d+2]=b[s];data[d+3]=255;}return {width:w,height:h,data};}


(async()=>{
 const secret='gallery passphrase for tests',message='A quiet message 🌿 — こんにちは';
 for(let id=1;id<=30;id++){
  const image=photo(320,240),original=image.data.slice();
  const packet=await context.encryptV2(message,secret,1,0);
  await context.embedGallery(image,packet,secret,id);
  const decoded=await context.extractGallery(image,secret);
  assert.equal(decoded.plain,message);assert.equal(decoded.meta.galleryId,id);
  let changes=0;
  for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++)for(let channel=0;channel<4;channel++){
   const i=(y*image.width+x)*4+channel,diff=Math.abs(image.data[i]-original[i]);
   assert(diff<=1,'Changes must be at most one intensity level');
   if(channel===3)assert.equal(diff,0,'Alpha is untouched');
   if(y!==image.height-1&&!context.galleryRegion(id,(x+.5)/image.width,(y+.5)/image.height))assert.equal(diff,0,'Protected subject was changed');
   changes+=diff;
  }
  assert(changes>0);assert(context.galleryCapacity(image,id)>message.length);
  if(id===1){await assert.rejects(context.extractGallery(image,'incorrect password'),/Incorrect passphrase/);}
 }
 assert.equal(await context.extractGallery(photo(320,240),secret),null);
 await assert.rejects(context.embedGallery(photo(320,240),await context.encryptV2('x'.repeat(40000),secret,1,0),secret,1),/cannot hold/);
 assert.throws(()=>context.gallerySlots(photo(320,240),31),/Unknown/);
 console.log('PASS all 30 gallery placements, Unicode AES round trips, protected subject pixels, one-level changes, wrong passwords, capacity and invalid IDs');
 const normal=photo(320,240),packet=await context.encryptV2('Existing image still works',secret,1,0);
 await context.embedLossless(normal,packet,secret);
 assert.equal(await context.extractGallery(normal,secret),null);
 assert.equal((await context.extractLossless(normal,secret)).plain,'Existing image still works');
 console.log('PASS existing lossless format compatibility');
})().catch(e=>{console.error(e);process.exitCode=1;});
