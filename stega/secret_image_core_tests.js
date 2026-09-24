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
vm.createContext(context);vm.runInContext(source,context);
const missingIds=[...elements.keys()].filter(id=>id&&!declaredIds.has(id)&&!id.startsWith("input["));
assert.deepEqual(missingIds,[],`JavaScript references missing element IDs: ${missingIds.join(", ")}`);

function photo(w,h){const data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=(y*w+x)*4;data[p]=(x*3+y)%256;data[p+1]=(x+y*2)%256;data[p+2]=(x*2+y*3)%256;data[p+3]=255;}return {width:w,height:h,data};}
function writeBmp(file,img){const stride=Math.ceil(img.width*3/4)*4,size=54+stride*img.height,b=Buffer.alloc(size);b.write("BM");b.writeUInt32LE(size,2);b.writeUInt32LE(54,10);b.writeUInt32LE(40,14);b.writeInt32LE(img.width,18);b.writeInt32LE(img.height,22);b.writeUInt16LE(1,26);b.writeUInt16LE(24,28);b.writeUInt32LE(stride*img.height,34);for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++){const s=(y*img.width+x)*4,d=54+(img.height-1-y)*stride+x*3;b[d]=img.data[s+2];b[d+1]=img.data[s+1];b[d+2]=img.data[s];}fs.writeFileSync(file,b);}
function readBmp(file){const b=fs.readFileSync(file),offset=b.readUInt32LE(10),w=b.readInt32LE(18),h=b.readInt32LE(22),depth=b.readUInt16LE(28);assert.equal(depth,24);const stride=Math.ceil(w*3/4)*4,data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const s=offset+(h-1-y)*stride+x*3,d=(y*w+x)*4;data[d]=b[s+2];data[d+1]=b[s+1];data[d+2]=b[s];data[d+3]=255;}return {width:w,height:h,data};}

(async()=>{
  const secret="correct horse battery staple",message="Secret Image Test — offline AES round trip";
  const lossImage=photo(320,240),packet=await context.encryptV2(message,secret,1,0);
  await context.embedLossless(lossImage,packet,secret);
  const loss=await context.extractLossless(lossImage,secret);
  assert.equal(loss.plain,message);console.log("PASS lossless AES-256-GCM + scattered LSB round trip");

  let wrong=false;try{await context.extractLossless(lossImage,"wrong passphrase");}catch{wrong=true;}assert(wrong);console.log("PASS lossless incorrect-passphrase authentication failure");

  const emoji=await context.encryptText("Emoji mode intact",secret,true);assert.equal(await context.decryptText(emoji,secret),"Emoji mode intact");console.log("PASS existing Emoji/Symbol AES round trip");

  const legacyImage=photo(240,180),legacySalt=crypto.getRandomValues(new Uint8Array(16)),legacyIv=crypto.getRandomValues(new Uint8Array(12)),legacyKey=await context.keyFromSecret(secret,legacySalt),legacyCipher=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv:legacyIv},legacyKey,new TextEncoder().encode("Legacy payload"))),legacyPayload=context.concat(Uint8Array.from([0x53,0x49,0x4d,0x47,0x01]),legacySalt,legacyIv,legacyCipher),legacyFrame=context.concat(Uint8Array.from([(legacyPayload.length>>>24)&255,(legacyPayload.length>>>16)&255,(legacyPayload.length>>>8)&255,legacyPayload.length&255]),legacyPayload),legacyBits=context.bytesToBits(legacyFrame);for(let i=0;i<legacyBits.length;i++)legacyImage.data[Math.floor(i/3)*4+(i%3)]=(legacyImage.data[Math.floor(i/3)*4+(i%3)]&254)|legacyBits[i];assert.equal(await context.decryptLegacy(context.extractLegacyBytes(legacyImage),secret),"Legacy payload");console.log("PASS legacy SIMG v1 decode compatibility");

  const sample=Uint8Array.from([0,1,2,127,128,254,255]),coded=context.hammingEncode(sample);coded[5]^=1;coded[12+8]^=1;const ham=context.hammingDecode(coded,sample.length);assert.deepEqual(Array.from(ham.bytes),Array.from(sample));console.log("PASS Hamming(12,8) single-bit correction");

  const socialImage=photo(1024,768),socialPacket=await context.encryptV2(message,secret,2,1);
  await context.embedSocial(socialImage,socialPacket,secret,"strong");
  const sourceCanvas={width:1024,height:768,_image:socialImage};
  const social=await context.extractSocial(sourceCanvas,secret);
  assert(social&&social.plain===message);console.log("PASS social frequency-domain raw-pixel round trip");
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"secret-image-tests-")),input=path.join(temp,"embedded.bmp");writeBmp(input,socialImage);
  const cases=[...[95,90,85,80,75].map(q=>[`JPEG ${q}`,1,q]),...[100,90,80,70].map(s=>[`Resize ${s}%`,s/100,94]),["JPEG 85 + resize 90%",.9,85],["JPEG 80 + resize 80%",.8,80]];
  console.log("LOCAL PROCESSING SIMULATION (System.Drawing; not actual WhatsApp)");
  for(let i=0;i<cases.length;i++){const [name,scale,quality]=cases[i],output=path.join(temp,`case-${i}.bmp`),run=child.spawnSync("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",path.resolve("simulate_image_transform.ps1"),"-InputBmp",input,"-OutputBmp",output,"-Scale",String(scale),"-Quality",String(quality)],{encoding:"utf8"});let pass=false;if(run.status===0){try{const transformed=readBmp(output),decoded=await context.extractSocial({width:transformed.width,height:transformed.height,_image:transformed},secret);pass=!!decoded&&decoded.plain===message;}catch{}}console.log(`${pass?"PASS":"FAIL"} ${name}`);}
  const placementMessage="Secret Image Test",placementCases=[
    {name:"AUTO",id:0,map:context.analyseSuitabilityMap(photo(1024,768))},
    {name:"SELECTED AREA",id:1,map:(()=>{const m=new Uint8Array(48);for(let y=1;y<5;y++)for(let x=2;x<6;x++)m[y*8+x]=3;for(let x=0;x<8;x++){m[x]=1;m[40+x]=1;}return m;})()},
    {name:"BORDER",id:2,map:context.coarseBorderMap(1),borderWidth:1}
  ],placementTransforms=[["JPEG 95",1,95,0],["JPEG 90",1,90,0],["JPEG 85",1,85,0],["JPEG 80",1,80,0],["Resize 90%",.9,94,0],["Resize 80%",.8,94,0],["Resize 70%",.7,94,0],["JPEG 85 + resize 90%",.9,85,0],["JPEG 80 + resize 80%",.8,80,0]];
  for(const placement of placementCases){const image=photo(1024,768),packet3=await context.encryptV3(placementMessage,secret,1,placement.id,placement.borderWidth||0,0,placement.map),meta3=context.parseV3Header(packet3.header);console.log(`CAPACITY ${placement.name} strong 1024x768: ${context.v3Capacity(image,"strong",meta3)} plaintext bytes`);await context.embedSocialV3(image,packet3,secret,"strong");const raw3=await context.extractSocialV3({width:1024,height:768,_image:image},secret);assert(raw3&&raw3.plain===placementMessage);console.log(`PASS ${placement.name} v3 raw-pixel round trip`);const in3=path.join(temp,`${placement.name.replace(/\W/g,"-")}.bmp`);writeBmp(in3,image);const transforms=placement.name==="BORDER"?placementTransforms.concat([["Edge crop 1%",1,94,.01],["Edge crop 2%",1,94,.02],["Edge crop 5%",1,94,.05]]):placementTransforms;for(let i=0;i<transforms.length;i++){const [name,scale,quality,crop]=transforms[i],output=path.join(temp,`${placement.id}-${i}.bmp`),run=child.spawnSync("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",path.resolve("simulate_image_transform.ps1"),"-InputBmp",in3,"-OutputBmp",output,"-Scale",String(scale),"-Quality",String(quality),"-Crop",String(crop)],{encoding:"utf8"});let pass=false;if(run.status===0){try{const transformed=readBmp(output),decoded=await context.extractSocialV3({width:transformed.width,height:transformed.height,_image:transformed},secret);pass=!!decoded&&decoded.plain===placementMessage;}catch{}}console.log(`${pass?"PASS":"FAIL"} ${placement.name} — ${name}`);}}
  console.log("PASS browser element integration audit");
  console.log("All core assertions passed; robustness PASS/FAIL results are listed above.");
})().catch(e=>{console.error("FAIL",e);process.exitCode=1;});
