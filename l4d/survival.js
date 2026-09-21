/* Gameplay simulation has no dependency on canvas, audio or browser input. */

'use strict';

const DW = (() => {

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  const WORLD={end:18000,surfaceEnd:6500,ground:660,stairStart:420,stairEnd:900,deck:420,ledge:3100};

  const floor=x=>x>=420&&x<900?660-(x-420)*.5:x>=900&&x<3100?420:660;

  const BARRICADE={x:5500,y:660,w:145,h:500};

  const SEWER={enabled:true,entry:5260,exit:10000,extensionStart:6500,deepFloorY:1260,waterY:1220,ladderX:9860,streetY:660,roofY:900,floorY:1040,holeWidth:100};

  const SEWER_SECTIONS=['FLOODED INTAKE','ABANDONED PUMP HOUSE','COLLAPSED DRAIN','RESERVOIR','ROOT CHOKED TUNNEL','OLD STORM GATES','OUTFALL CHAMBER'].map((name,i)=>({number:14+i,name,start:6500+i*500,end:7000+i*500}));

  const SEWER_PLATFORMS=[];

  const SEWER_LADDER={x:9860,top:820,bottom:1260,speed:110,shaftLeft:9780,shaftRight:9930,landingX:9945};

  function sewerRoofHit(ax,ay,bx,by){return segmentBox(ax,ay,bx,by,SEWER.entry+SEWER.holeWidth,SEWER.roofY,SEWER_LADDER.shaftLeft,SEWER.roofY+18)!==null||segmentBox(ax,ay,bx,by,SEWER_LADDER.shaftRight,SEWER.roofY,SEWER.exit,SEWER.roofY+18)!==null;}

  const HOSPITAL={start:9930,end:15000,basementY:820,groundY:660,stairStart:10480,stairEnd:10800};

  const hospitalFloor=x=>x<HOSPITAL.stairStart?HOSPITAL.basementY:x<HOSPITAL.stairEnd?HOSPITAL.basementY-(x-HOSPITAL.stairStart)*.5:HOSPITAL.groundY;

  const hospitalCeiling=x=>hospitalFloor(x)-200;

  const HOSPITAL_VENTS=[10960,11140,11390,11600,11840,12060,12300,12410,12800,13300,13800,14300,14600].map((x,i)=>({id:i+1,x,y:hospitalCeiling(x)+4}));

  const SEWER_ENCOUNTERS=[['hunter',6880],['boomer',7160],['hunter',7670],['boomer',8010],['hunter',8430],['boomer',9090],['hunter',9390],['boomer',9780]];

  const mercyFloor=x=>x<620?220:x<940?220+(x-620)*.375:x<1260?340:x<1580?340+(x-1260)*.375:x<1940?460:660;

  const DARK_ZONES=[];

  const FIRE_BARRELS=[560,1010,1530,2230,3060,3420,4050,4880,5450,5980].map((x,i)=>({x,y:mercyFloor(x),phase:i*1.71}));

  const WITCH_SPRITES={idle:[35,300,525,540,46],awake:[825,15,905,830,80]};

  const MAP_LANDMARKS=[{id:'roof',name:'ROOFTOP WORKSITE',start:0,end:620},{id:'hotel',name:'HOTEL INTERSECTION',start:2600,end:3480},{id:'checkpoint',name:'HOSPITAL CHECKPOINT',start:4340,end:5080},{id:'diner',name:'DINER FORECOURT',start:5080,end:6060},{id:'industrial',name:'INDUSTRIAL LOADING BAY',start:6060,end:6500}];

  const mercySection=x=>x<620?'ROOFTOP':x<940?'SLOPE 1':x<1260?'APARTMENTS':x<1580?'SLOPE 2':x<1940?'BROKEN FLOOR':x<2600?'ALLEY':x<4340?'HOTEL STREET':x<5080?'HOSPITAL CHECKPOINT':x<5500?'BARRICADE APPROACH':x<6060?'SEALED DINER':x<6500?'SEALED LOADING BAY':x>=15000?'HOSPITAL ROOFTOP':x>=14500?'HOSPITAL LIFT LOBBY':x>=14000?'HOSPITAL ICU ATRIUM':x>=13500?'HOSPITAL SURGERY HALL':x>=12500?'HOSPITAL OPEN TREATMENT':x>=12000?'HOSPITAL WARDS':x>=11500?'HOSPITAL RECEPTION':x>=10800?'HOSPITAL CORRIDORS':x>=10480?'HOSPITAL STAIRWELL':x>=10000?'HOSPITAL BASEMENT':SEWER_SECTIONS[Math.min(6,Math.floor((x-6500)/500))].name;

  const PISTOL={name:'Pistol',unlimitedAmmo:true,magazine:15,reserve:90,reload:1.65,interval:.28,bodyDamage:30,headDamage:240,commonBodyDamage:40,commonHeadDamage:80};

  const WEAPONS={pistol:PISTOL,deagle:{name:"Desert Eagle",unlimitedAmmo:true,magazine:8,reserve:90,reload:1.85,interval:.38,bodyDamage:30,headDamage:240,commonBodyDamage:240,commonHeadDamage:240},rifle:{name:'Assault rifle',magazine:30,reserve:90,reload:2.4,interval:.10,bodyDamage:40,headDamage:260,commonBodyDamage:48,commonHeadDamage:80},smg:{name:'SMG',magazine:50,reserve:150,reload:2,interval:.075,bodyDamage:35,headDamage:240,commonBodyDamage:40,commonHeadDamage:80},pipebomb:{name:'Pipe bomb'}};

  const enemyHealth={shambler:240,runner:240,climber:240,grabber:420,breacher:660,hunter:1000,smoker:640,boomer:480,witch:6000,tank:6000};

  const SPECIAL_INFECTED=['tank','witch','hunter','smoker','boomer'];

  const ignoresCrowd=(z,other)=>SPECIAL_INFECTED.includes(z.role)&&!SPECIAL_INFECTED.includes(other.role);

  const roles={shambler:{speed:29},runner:{speed:110},climber:{speed:45},breacher:{speed:33},grabber:{speed:48},hunter:{speed:300},smoker:{speed:245},boomer:{speed:340},witch:{speed:420},tank:{speed:160}};

  function segmentBox(ax,ay,bx,by,left,top,right,bottom){let enter=0,exit=1;for(const [start,delta,min,max] of [[ax,bx-ax,left,right],[ay,by-ay,top,bottom]]){if(Math.abs(delta)<1e-9){if(start<min||start>max)return null;continue;}const a=(min-start)/delta,b=(max-start)/delta;enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));if(enter>exit)return null;}return enter;}

  function segment(ax,ay,bx,by,cx,cy,r){const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy,t=l?clamp(((cx-ax)*dx+(cy-ay)*dy)/l,0,1):0;return (ax+t*dx-cx)**2+(ay+t*dy-cy)**2<=r*r?t:null}

  const healthState=p=>({value:p.dead?0:p.down?p.incapHp:p.hp+(p.tempHp||0),tone:p.dead?'dead':p.down||p.hp+(p.tempHp||0)<40?'red':p.hp+(p.tempHp||0)<50?'orange':'green',label:p.dead?'DEAD':p.down?'INCAPACITATED':p.grab?'PINNED':'STANDING'});

  const SPRITES={chloe:[110,10,845,1490,77],'chloe-rifle':[110,10,890,1490,77],boomer:[100,115,890,1340,79],hunter:[25,175,995,1235,68],smoker:[250,5,680,1500,79],zoey:[85,15,790,1470,77],bill:[185,28,760,1310,77],'infected-worker':[140,25,845,1475,73],'infected-office':[45,35,955,1475,73],'infected-civilian':[110,35,835,1470,73],'bill-rifle':[185,28,915,1310,77],'zoey-rifle':[85,15,915,1500,77]};

  const MUZZLES={chloe:{pistol:[944,190],rifle:[990,216]},bill:{pistol:[926,257],rifle:[1085,360]},zoey:{pistol:[842,210],rifle:[991,270]}};

  const BILL_ARMS={pistol:{pivot:[450,330],outline:[[375,295],[505,290],[623,333],[769,264],[951,214],[963,376],[855,480],[701,477],[635,429],[564,475],[445,466],[371,402]]},rifle:{pivot:[450,355],outline:[[357,340],[474,308],[638,307],[668,268],[793,274],[806,313],[996,291],[1098,343],[1107,383],[1009,411],[866,415],[803,480],[704,520],[602,497],[533,518],[431,536],[356,461]]}};

  const ZOEY_ARMS={pistol:{pivot:[300,295],outline:[[245,265],[330,240],[450,245],[505,275],[628,248],[685,220],[685,180],[845,180],[849,258],[784,268],[772,330],[733,425],[684,433],[612,399],[583,356],[480,370],[370,376],[280,354],[243,313]]},rifle:{pivot:[290,325],outline:[[238,285],[321,240],[350,240],[355,210],[875,193],[897,240],[998,243],[999,275],[859,282],[816,331],[777,359],[741,463],[687,496],[627,476],[582,424],[476,433],[390,471],[314,493],[259,439],[233,344]]}};

  const CHLOE_ARMS={pistol:{pivot:[352,282],outline:[[316,244],[387,233],[475,246],[590,238],[716,223],[785,182],[946,166],[956,222],[882,254],[854,305],[781,362],[711,388],[629,375],[540,337],[466,350],[387,353],[321,321]]},rifle:{pivot:[352,282],outline:[[316,244],[397,230],[419,204],[611,155],[913,150],[997,204],[997,229],[913,260],[893,304],[787,365],[714,393],[649,365],[611,337],[599,366],[524,368],[467,384],[394,371],[322,321]]}};

  const survivorName=p=>p.id===3?'chloe':p.id===2?'zoey':'bill',survivorArms=p=>p.id===3?CHLOE_ARMS:p.id===2?ZOEY_ARMS:BILL_ARMS;

  function bodyPose(p){const cos=Math.cos(p.angle),facing=Math.abs(cos)<.08?(p.facing||1):cos>=0?1:-1,localAngle=facing===1?p.angle:Math.PI-p.angle;const angle=Math.atan2(Math.sin(localAngle),Math.cos(localAngle));return {facing,angle:p.id===1?0:clamp(angle,-.38,.38),armAngle:clamp(angle,-Math.PI/2,Math.PI/2),drop:(p.crouchAmount||0)*15,bob:p.moving&&p.onGround?Math.sin(p.walkCycle||0)*1.3:0};}

  function weaponOrigin(p,angle=p.angle){if(p.sewerClimbing)return {x:p.x,y:p.y-65,angle:-Math.PI/2};if(p.turretOrigin)return {x:p.turretOrigin.x+Math.cos(angle)*64,y:p.turretOrigin.y+Math.sin(angle)*64,angle};const pose=bodyPose({...p,angle}),name=survivorName(p),weapon=(p.weapon==='rifle'||p.weapon==='smg')?'rifle':'pistol',key=name+(weapon==='rifle'?'-rifle':''),[sx,sy,sw,sh,h]=SPRITES[key],[px,py]=MUZZLES[name][weapon],cut=p.id===2?.44:.51,scale=h/sh;

    const [pivotX,pivotY]=survivorArms(p)[weapon].pivot,lx=(px-pivotX)*scale,ly=(py-pivotY)*scale,a=pose.armAngle;return {x:p.x+((pivotX-sx-sw/2)*scale+lx*Math.cos(a)-ly*Math.sin(a))*pose.facing,y:p.y-h+(pivotY-sy)*scale+pose.drop+pose.bob+lx*Math.sin(a)+ly*Math.cos(a),angle:pose.facing===1?a:Math.PI-a};}

  function aimAt(p,x,y){if(p.turretOrigin)return Math.atan2(y-p.turretOrigin.y,x-p.turretOrigin.x);const name=survivorName(p),weapon=['rifle','smg'].includes(p.weapon)?'rifle':'pistol',[sx,sy,sw,sh,h]=SPRITES[name+(weapon==='rifle'?'-rifle':'')],[pivotX,pivotY]=survivorArms(p)[weapon].pivot,scale=h/sh,face=Math.abs(x-p.x)<8?(p.facing||1):Math.sign(x-p.x),pose=bodyPose(p),dx=(x-p.x)*face-(pivotX-sx-sw/2)*scale,dy=y-(p.y-h+(pivotY-sy)*scale+pose.drop+pose.bob),radius=Math.hypot(dx,dy),offset=(MUZZLES[name][weapon][1]-pivotY)*scale,a=Math.atan2(dy,dx)-Math.asin(clamp(offset/Math.max(radius,1),-1,1));return face===1?a:Math.PI-a;}

  function enemyHitboxes(z){if(z.role==='tank')return {head:{x:z.x,y:z.y-105,r:17},body:{x:z.x,y:z.y-65,r:43}};if(z.role==='witch')return {head:{x:z.x+(z.awake?18*(z.facing||1):3),y:z.y-(z.awake?70:34),r:9},body:{x:z.x+(z.awake?11*(z.facing||1):0),y:z.y-(z.awake?43:19),r:z.awake?15:20}};const common=!['hunter','smoker','boomer'].includes(z.role),bob=z.moving?Math.sin(z.walkCycle||0)*1.2:0,headHeight=z.role==='hunter'?(z.grabbing?39:z.crouch>0?46:56):common?65:67;return {head:{x:z.x+(common?4:0),y:z.y-headHeight+bob,r:common?8:9},body:{x:z.x,y:z.y-(z.role==='hunter'&&z.grabbing?23:38),r:z.role==='boomer'?23:15}};}

  function weaponSpread(p){return (.006+p.recoil*.055)*(p.vx?1.6:1)*(p.weaponLasers?.[p.weapon]?.25:1)*(p.crouchAmount>.8?.7:1);}

  // Original dialogue informed by the characters' tone, never copied from game captions.

  const DIALOGUE={zoey:{

    idle:["So, rooftop, creepy stairs, dark subway. Somebody really committed to the horror set.","If a guy with a chainsaw shows up, I'm demanding a different movie.","Okay, Bill. You're the grumpy mentor. That means you have to survive the sequel.","We're all getting out. I already hate this ending."],

    scavenge:["Ammo. Finally, a plot twist I like.","Checking the stash. Cover me, okay?"],

    hold:["I've got your back. Try to keep it attached.","You move. I'll ruin their dramatic entrance."],

    rescue:["Bill! Stay with me. I'm getting you up.","Hey! That's my old guy. Get off him!"],

    hunter:["Hunter! Shoot the hoodie before he auditions for Alien!","Hunter, close! Bill, move!"],

    smoker:["Smoker! That is way too much tongue.","Smoker on the flank! Cut him off!"],

    boomer:["Boomer! Back up. Nobody needs that close-up."],

    horde:["They're coming! Bill, I've got this side!","Okay, okay. Aim for the heads. We can do this."],

    carry:["I'll cover you. And yes, I'm absolutely taking credit for this."],

    revived:["Still here. Still pissed. Thanks, Bill."],

    loss:["Bill? No. Damn it. I'm finishing this for you."],

    rooftop:["Great view. Terrible time to be afraid of heights."],

    alley:["Dark alley. Sure. Let's do every bad horror decision."],

    subway:["Subway's right there. Come on, Bill. We're close."],

    safe:["We're both making it through that door. Got it?"]

  },bill:{

    idle:["Watch your sectors. I'll watch the kid.","Damn city. Every exit comes with teeth.","Head shots. Don't waste the damn ammunition.","Keep pace, Zoey. Nobody gets left on this street."],

    rooftop:["Move to the stairs. I'll take rear security."],

    alley:["Check the alley. Eyes on those windows."],

    subway:["Down those steps. Weapons ready."],

    safe:["Inside, kid. I'll secure the damn door."],

    horde:["Contact front. Pick your targets. Make the bastards pay.","Hold your sector. Zoey, stay where I can cover you."],

    hunter:["Hunter inbound. Put that bastard down."],

    smoker:["Smoker on the flank. Break that line."],

    boomer:["Back off that fat bastard. Give him room."],

    rescue:["Stay with me, kid. We're not losing you here."],

    revived:["Still breathing. That's enough. Move."],

    lowAmmo:["Running low. Make every damn round count."],

    loss:["Zoey... Damn it. I'll finish the mission, kid."]

  }};

  class Run {

    constructor(seed=Date.now(),companion=true,map='catwalk',difficulty='normal',mode=null){this.mode=mode==='romero'||mode===null&&difficulty==='romero'?'romero':'default';this.difficulty=['normal','expert','romero'].includes(difficulty)?difficulty:'normal';this.romero=this.mode==='romero';this.ammoPiles=[...(this.romero?[{x:2040,y:660}]:[]),...(map==='no-mercy'?[{x:14945,y:660}]:[])];this.enemyDamageMultiplier=this.difficulty==='expert'?2:1;this.map=map;this.barricade=map==='no-mercy'?{...BARRICADE}:null;this.sewerHatch=map==='no-mercy'?{x:SEWER.entry+SEWER.holeWidth/2,y:SEWER.streetY,open:false,slide:0}:null;this.accessEnd=this.barricade?this.barricade.x-20:WORLD.end-20;this.autoUseItems=true;this.disableGunHeat=true;this.turrets=(map==='no-mercy'?[2490,3710,5040]:[1450,2750]).map((x,i)=>({id:i+1,x,y:map==='no-mercy'?mercyFloor(x):floor(x),heat:0,locked:false,cooldown:0,flash:0,angle:0,playerId:null}));this.sandbags=this.turrets.map(t=>({x:t.x+52,y:t.y,w:66,h:34}));this.hospitalVents=map==='no-mercy'?HOSPITAL_VENTS.map(v=>({...v,openUntil:0})):[];this.ventAmbush={left:10,pending:null,lastVent:null};this.sewerLadderEncounter={triggered:false,tankId:null};this.sewerPlatforms=map==='no-mercy'?SEWER_PLATFORMS.map(p=>({...p})):[];this.safeRooms=[];this.jukeboxes=map==='no-mercy'?[{id:1,x:3500,y:660,playing:false,beat:0,track:0}]:[];this.lift={x:14750,y:660,enabled:map==='no-mercy',open:false,doorProgress:0,phase:'idle',floor:24,previousFloor:24,floorChangedAt:-1,approachElapsed:0,wave:0,left:0,spawnLeft:0,remaining:0,routes:[12620,13420,14120,14920]};this.checkpoint=null;this.safeDoor={enabled:false,x:WORLD.end+100,y:660,open:false,closed:false};this.seed=seed>>>0;this.randomState=this.seed||1;this.time=0;this.players=[this.makePlayer(1,1040)];this.zombies=[];this.bullets=[];this.effects=[];this.events=[];this.kills=0;this.heads=0;this.noise=0;this.scrap=3;this.delivered=0;this.status='playing';this.id=0;this.lure=null;this.pipeBombs=[];this.laserBoxes=[{x:1750,y:420,hidden:false}];this.weaponPickups=[{x:1640,y:420,weapon:'rifle',used:false},{x:2530,y:420,weapon:'rifle',used:false}];this.grenadePickups=[1380,2100,2820,3400].map(x=>({x,y:floor(x),used:false}));this.zones=[{x:900,end:1600,stress:0,warning:0},{x:1600,end:2300,stress:0,warning:0},{x:2300,end:3100,stress:0,warning:0}];this.gates=[{x:1000,hp:0,open:false},{x:2250,hp:0,open:false}];this.cells=[1200,1950,2700].map(x=>({x:x+this.rand()*100,y:420,carrier:0,done:false}));this.caches=[{x:1120,y:420,used:false},{x:2040+this.rand()*160,y:420,used:false},{x:2880,y:420,used:false}];this.director={phase:'calm',left:this.romero?0:12,round:0,budget:0,spawnTimer:0,pattern:'probe',side:'west',recentDamage:0,lastAttack:0};this.specialTimer=10;this.hordeLeft=0;this.hordeSpawn=0;this.hordeSide=0;this.carHordeLeft=0;this.carHordeTime=0;this.carHordeSpawn=0;this.tankSpawned=false;this.tankRocks=[];this.defibrillatorPickups=[{x:map==='no-mercy'?350:1080,y:map==='no-mercy'?220:420,used:false}];this.healthPickups=[{x:380,kind:'pills'},{x:1080,kind:'adrenaline'},{x:1810,kind:'kit'},{x:2310,kind:'pills'},{x:3000,kind:'adrenaline'},{x:3380,kind:'kit'}].map(h=>({...h,y:map==='no-mercy'?mercyFloor(h.x):floor(h.x),used:false,seen:[]}));this.randomHordeTimer=50;this.hordeActive=0;this.alarmCars=map==='no-mercy'?[{x:2820,y:660,triggered:false,alarm:0,isAlarm:true}]:[];this.cars=map==='no-mercy'?[{x:2640,y:660,triggered:false,alarm:0},...this.alarmCars,...[4340,4740,5650].map(x=>({x,y:660,triggered:false,alarm:0}))]:[];for(const car of this.cars){if(car.isAlarm||car.x===4340)car.kind='police';if(car.x===4340){car.beaconEnabled=false;car.alarmEnabled=false;}if(car.x===4740)car.wrecked=true;else if(car.x===5650||car.x===6550)car.kind='van';}if(companion){const bot=this.makePlayer(2,1090);bot.ai=true;this.players.push(bot);const chloe=this.makePlayer(3,1140);chloe.ai=true;this.players.push(chloe);}if(this.map==='no-mercy'){this.players.forEach((p,i)=>{p.x=180+i*70;p.y=220;p.angle=0;p.facing=1;});this.cells=[];this.gates=[];this.zones=[];this.caches=[320,1130,1840,3030].map(x=>({x,y:mercyFloor(x),used:false}));this.weaponPickups=[{x:260,weapon:'smg'},{x:420,weapon:'smg'},{x:1180,weapon:'rifle'},{x:1760,weapon:'smg'},{x:2820,weapon:'rifle'},{x:3200,weapon:'smg'}].map(w=>({...w,y:mercyFloor(w.x),used:false}));this.grenadePickups=[480,1700,2460,3320].map(x=>({x,y:mercyFloor(x),used:false}));this.laserBoxes=[{x:2950,y:660,hidden:false}];this.caches.push({x:4120,y:660,used:false},{x:4870,y:660,used:false});this.healthPickups.push({x:3950,y:660,kind:'kit',used:false,seen:[]},{x:4600,y:660,kind:'kit',used:false,seen:[]});this.weaponPickups.push({x:4250,y:660,weapon:'smg',used:false});this.caches.push({x:6170,y:660,used:false});this.healthPickups.push({x:6110,y:660,kind:'kit',used:false,seen:[]},{x:10300,y:820,kind:'kit',used:false,seen:[]},{x:11620,y:660,kind:'pills',used:false,seen:[]});this.weaponPickups.push({x:10170,y:820,weapon:"deagle",used:false});this.weaponPickups.push({x:11320,y:660,weapon:'smg',used:false});if(!this.romero){this.addEnemy('witch',8780,SEWER.deepFloorY);for(const [role,x]of SEWER_ENCOUNTERS){const z=this.addEnemy(role,x,SEWER.deepFloorY);if(z){z.sewerEncounter=true;z.sewerWaiting=true;}}}this.message('Open the glowing sewer lid near the barricade and drop below the street.');}else this.message('Recover 3 power cells. Deliver them to the truck east of the drop.');}

    checkpointBlocked(ax,bx,y=660){if(ax===bx)return false;return !!this.barricade&&y<=SEWER.streetY+70&&(ax-this.barricade.x)*(bx-this.barricade.x)<=0||this.safeRooms.some(r=>(!r.entryOpen&&(ax-r.entry)*(bx-r.entry)<=0)||(!r.exitOpen&&(ax-r.exit)*(bx-r.exit)<=0));}

    saveCheckpoint(room){this.zombies=this.zombies.filter(z=>z.x<room.entry-120||z.x>room.exit+120);this.bullets=[];this.effects=[];const omit=new Set(['checkpoint','enemyBins','surroundCounts','spawnView','events']);const data=JSON.parse(JSON.stringify(this,(key,value)=>omit.has(key)?undefined:value instanceof Map?undefined:value instanceof Set?[...value]:value));this.checkpoint={roomId:room.id,map:this.map,difficulty:this.difficulty,mode:this.mode,data};this.message('CHECKPOINT '+room.id+' SAVED. Open the far door to continue.');}

    restoreCheckpoint(checkpoint){if(!checkpoint||checkpoint.map!==this.map||checkpoint.difficulty!==this.difficulty||checkpoint.mode!==this.mode)return false;Object.assign(this,JSON.parse(JSON.stringify(checkpoint.data)));this.checkpoint=JSON.parse(JSON.stringify(checkpoint));this.events=[];this.status='playing';this.bullets=[];this.effects=[];for(const c of this.cars)if(Array.isArray(c.hitPlayers))c.hitPlayers=new Set(c.hitPlayers);for(const p of this.players){p.prev={};p.prompt='';p.panicUntil=0;p.vx=p.vy=0;p.brain.recovery=null;}this.message('Returned to safe-room checkpoint '+checkpoint.roomId+'.');return true;}

    hatchPassable(){return !!this.sewerHatch?.open&&this.sewerHatch.slide>=1;}

    roofFloor(x){return 660;}

    roofJumpStep(p,input,dt){if(this.level!=='rooftop'||p.knockTime||p.onGround||p.dead||p.down||p.ledgeHanging||p.fallingOffRoof)return false;p.x+=(input.move||0)*(input.sprint?340:230)*dt;p.vy+=1000*dt;p.y+=p.vy*dt;const outside=p.x<15000||p.x>18000;if(p.vy>=0&&p.y>=660){if(!outside){p.y=660;p.vy=0;p.onGround=true;}else{const edge=p.x<15000?15000:18000;if(Math.abs(p.x-edge)<=35){p.ledgeHanging=true;p.ledgeEdge=edge;p.x=edge+(edge===15000?-8:8);p.y=850;p.vy=p.vx=0;p.down=true;p.ledgeStartHp=p.hp;p.tempHp=0;p.incapHp=p.hp;p.revive=0;p.reload=0;p.speech='I need help!';p.speechTime=6;this.releaseTurret(p);this.events.push({type:'survivorScream',player:p.id,kind:'dying'});this.message(p.name+' is hanging! Hold USE nearby to pull them up.');}else{p.fallingOffRoof=true;p.fallScreamed=true;p.knockVX=(input.move||Math.sign(p.x-edge))*180;this.events.push({type:'survivorDeath',player:p.id});}}}p.prev={...input};return true;}

    rooftopEncounterStep(dt){if(this.level!=='rooftop')return;const a=this.rooftopEncounter;if(a.phase==='idle'){if(!this.rooftopRadio.broadcastHeard&&this.players.some(p=>!p.ai&&!p.dead&&Math.hypot(p.x-this.rooftopRadio.x,p.y-this.rooftopRadio.y)<360)){this.rooftopRadio.broadcastHeard=true;this.events.push({type:'rooftopRadioBroadcast',kind:'intro'});}return;}if(a.phase==='waves'){a.waveLeft=(a.waveLeft??40)-dt;a.spawnLeft-=dt;if(a.remaining>0&&a.spawnLeft<=0){const count=a.wave<=2?46:12,i=count-a.remaining,role=a.wave<=2?(i%8===7?'boomer':'runner'):(i%4<2?'boomer':i%4===2?'hunter':'smoker'),focus=this.players.find(p=>!p.ai&&!p.dead&&!p.down)||this.players.find(p=>!p.dead),side=i%2?-1:1,x=clamp(focus.x+side*(430+this.rand()*180),15100,17900),z=this.addEnemy(role,x,this.roofFloor(x)-150);if(z){z.roofWave=a.wave;z.dropping=true;z.dropFloor=this.roofFloor(x);z.horde=role==='runner';a.remaining--;a.spawnLeft=a.wave<=2?.35:1.1;}}if(a.remaining===0&&(a.waveLeft<=0||!this.zombies.some(z=>z.hp>0&&z.roofWave===a.wave))){a.breakLeft=(a.breakLeft??4)-dt;if(a.breakLeft<=0){a.breakLeft=4;a.wave++;if(a.wave<=2){a.waveLeft=40;a.remaining=46;a.spawnLeft=0;this.events.push({type:'hordeStart'});this.message(a.wave<=2?'ROOFTOP HORDE — wave 2 / 2!':'SPECIAL INFECTED — wave '+(a.wave-2)+' / 2! Watch the Boomers!');}else{const p=this.players.find(p=>!p.dead&&!p.down),x=clamp(p.x+500,15350,17750),z=this.addEnemy('tank',x,this.roofFloor(x)-300);if(!z){a.wave=2;return;}for(const old of this.zombies)if(old!==z)this.release(old);this.zombies=[z];z.rooftopTank=true;z.speed=300;z.dropping=true;z.dropFloor=this.roofFloor(x);z.jumpCooldown=8;z.rockCooldown=6;a.phase='tank';a.tankId=z.id;this.tankSpawned=true;this.bossEncounter=true;this.events.push({type:'tankSpawn',x,y:z.y});this.message('ROOFTOP TANK! Keep away from the broken roof edges!');}}}}else if(a.phase==='tank'&&!this.zombies.some(z=>z.hp>0&&z.id===a.tankId)){a.phase='complete';this.message('Rooftop cleared — reach the damaged helicopter pad.');}}

    routeStart(){return this.level==='rooftop'?15020:20;}

    enterRooftop(){if(this.level==='rooftop')return true;this.level='rooftop';for(const key of ['zombies','bullets','effects','tankRocks','pipeBombs','cars','alarmCars','cells','gates','zones','caches','healthPickups','defibrillatorPickups','weaponPickups','grenadePickups','laserBoxes','turrets','sandbags','safeRooms','hospitalVents','jukeboxes','ammoPiles'])this[key]=[];this.sewerHatch=null;this.barricade=null;this.checkpoint=null;this.lure=null;this.hordeLeft=this.carHordeLeft=this.hordeActive=this.hordeRemaining=0;this.carHordeTime=0;this.tankSpawned=false;this.bossEncounter=false;this.ventAmbush.pending=null;this.director={phase:'calm',left:12,round:0,budget:0,spawnTimer:0,pattern:'probe',side:'west',recentDamage:0,lastAttack:0};this.events=[];this.rooftopEncounter={phase:'idle',wave:0,remaining:0,spawnLeft:0};this.rooftopRadio={x:17140,y:660,broadcastHeard:false};this.turrets=[{id:10,x:15770,y:660,heat:0,locked:false,cooldown:0,flash:0,angle:0,playerId:null}];this.sandbags=[{x:15822,y:660,w:95,h:34}];this.ammoPiles=[15680,17195,17450].map(x=>({x,y:this.roofFloor(x)-(x===17195?48:0)}));this.weaponPickups=[{x:15530,weapon:'rifle'},{x:16600,weapon:'smg'},{x:17270,weapon:'rifle'}].map(w=>({...w,y:this.roofFloor(w.x)-(w.x===17270?48:0),used:false}));this.grenadePickups=[15480,15870,16480,17020,17650].map(x=>({x,y:this.roofFloor(x),used:false}));this.healthPickups=[{x:15610,kind:'kit'},{x:17200,kind:'pills'}].map(h=>({...h,y:this.roofFloor(h.x),used:false,seen:[]}));for(const [i,p] of this.players.entries()){p.x=15300+i*75;p.y=660;p.vx=p.vy=0;p.onGround=true;p.grab=0;p.sewerClimbing=false;p.sewerLadderFinished=true;p.carry=null;p.brain.mode='cover';p.brain.nextDecision=this.time+5;p.speech='';p.speechTime=0;}return true;}

    routeEnd(y=660,x=this.players.find(p=>!p.ai&&!p.dead)?.x??0){if(this.level==='rooftop')return WORLD.end-20;if(this.map==='no-mercy'&&(x>=HOSPITAL.start&&y<900||x>=SEWER.exit))return this.lift.phase==='rooftop'?WORLD.end-20:HOSPITAL.end-20;return this.map==='no-mercy'&&SEWER.enabled&&y>SEWER.streetY+70?SEWER.exit-20:this.accessEnd;}

    spawnLevel(){return this.players.find(p=>!p.ai&&!p.dead&&!p.down)?.y??660;}

    floor(x,y=660){if(this.level==='rooftop')return this.roofFloor(x);if(this.map==='no-mercy'&&x>=HOSPITAL.start&&(y<900||x>=SEWER.exit))return hospitalFloor(x);if(this.map==='no-mercy'&&SEWER.enabled&&x>=SEWER.entry&&x<SEWER.exit&&(y>SEWER.streetY+70||this.hatchPassable()&&x<SEWER.entry+SEWER.holeWidth))return x>=SEWER.extensionStart?SEWER.deepFloorY:SEWER.floorY;return this.map==='no-mercy'?mercyFloor(x):floor(x)}

    rand(){let x=this.randomState;x^=x<<13;x^=x>>>17;x^=x<<5;this.randomState=x>>>0;return this.randomState/4294967296}

    makePlayer(id,x){return {id,name:id===3?'Chloe':id===2?'Zoey':'Bill',weapon:'pistol',inventory:['pistol'],weaponLasers:{},ammoByWeapon:{pistol:{mag:15,reserve:90}},grenades:0,x,y:floor(x),vx:0,vy:0,hp:100,incapCount:0,lastStrike:false,onGround:true,angle:id===1?Math.PI:0,facing:id===1?-1:1,mag:PISTOL.magazine,reserve:PISTOL.reserve,reload:0,heat:0,locked:false,heatByWeapon:{},shot:0,flash:0,recoil:0,medicine:1,defibrillators:0,defibTarget:null,defibTime:0,tempHp:0,adrenalineTime:0,healthItems:{pills:0,adrenaline:0},healthSelected:'kit',healthHeld:false,healthUseTime:0,stamina:100,down:false,dead:false,incapHp:200,revive:0,grab:0,shove:0,shoveCount:0,shoveCooldown:0,shoveAnim:0,hurt:0,carry:null,ladder:0,nextScream:0,flashlight:true,crouchAmount:0,walkCycle:0,moving:false,brain:{nextFun:20,lastFun:-1,nextDecision:6,mode:'cover',target:0,nextTalk:12,line:0,lastCarry:false,lastDown:false,lastHunter:false},speech:'',speechTime:0,prev:{},prompt:'',goo:0}}

    join(){if(this.players[1]?.ai){this.players[1].ai=false;this.message('Controller took over Zoey.');return this.players[1]}if(this.players.length===1&&this.status==='playing'){const p=this.makePlayer(2,clamp(this.players[0].x+45,20,this.accessEnd));p.y=this.players[0].y;this.players.push(p);this.message('Zoey joined. Cover the carrier. Stay together for the shared camera.');return p}return this.players[1]}

    message(text){this.events.push({type:'message',text});}

    fx(x,y,n,color){for(let i=0;i<n&&this.effects.length<220;i++){const a=this.rand()*6.28,s=30+this.rand()*160;this.effects.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.25+this.rand()*.35,color})}}

    selectHealth(p,kind){if(p.beingHealedBy||p.healingOther)return false;if(p.dead||p.down||p.grab||p.carry||p.healthUseTime>0)return false;p.healthSelected=kind;p.healthHeld=true;return true;}

    quickUseHealth(p,kind){if(!this.selectHealth(p,kind)){this.message('Cannot use health items while down, pinned, carrying or already using one.');return false;}if(this.useHealth(p))return true;p.healthHeld=false;const count=kind==='kit'?p.medicine:p.healthItems[kind];this.message(!count?'No '+(kind==='kit'?'health kits':kind==='pills'?'pain pills':'adrenaline shots')+' carried. Pick one up first.':kind==='pills'?'Health is already full. Pills add temporary health up to 100.':'Health is already full.');return false;}

    useHealth(p){const kind=p.healthSelected||'kit';if(p.dead||p.down||p.grab||p.carry||p.healthUseTime>0)return false;const count=kind==='kit'?p.medicine:p.healthItems[kind];if(!count||(kind==='kit'?p.hp>=100&&!p.lastStrike:kind==='pills'?p.hp+p.tempHp>=100:false))return false;p.healthUseKind=kind;p.healthUseTime=kind==='kit'?3:kind==='pills'?.65:.9;p.healthUseDuration=p.healthUseTime;if(kind==='kit'&&p.id===3)this.events.push({type:'chloeLine',kind:'healOther',urgent:true});return true;}

    autoUseHealth(p){if(p.beingHealedBy||p.healingOther||!this.autoUseItems||p.hp+(p.tempHp||0)>30||p.dead||p.down||p.grab||p.carry||p.healthHeld||p.healthUseTime>0||p.knockTime>0||p.ai&&this.players.some(a=>a!==p&&!a.dead&&(a.down||a.grab||this.zombies.some(z=>z.hp>0&&z.role==='witch'&&z.awake&&z.target===a.id))))return false;const kind=p.healthItems.pills>0?'pills':p.healthItems.adrenaline>0?'adrenaline':null;return kind?this.quickUseHealth(p,kind):false;}

    healthItemStep(p,dt){p.tempHp=Math.max(0,(p.tempHp||0)-dt*.5);p.adrenalineTime=Math.max(0,(p.adrenalineTime||0)-dt);if(p.healthUseTime>0){if(p.dead||p.down||p.grab){p.healthUseTime=0;return;}p.healthUseTime=Math.max(0,p.healthUseTime-dt);if(p.healthUseTime===0){const kind=p.healthUseKind;if(kind==='kit'){p.medicine--;p.hp=Math.max(p.hp,100);p.tempHp=0;p.incapCount=0;p.lastStrike=false;}else{p.healthItems[kind]--;p.tempHp=Math.min(Math.max(0,100-p.hp),p.tempHp+(kind==='pills'?50:25));if(kind==='adrenaline')p.adrenalineTime=15;}p.healthHeld=false;this.events.push({type:'heal',player:p.id,kind});}}}

    botWhackStep(p,dt){
      if(!p.ai)return;
      if(p.dead||p.down||p.grab&&this.zombies.some(z=>z.id===p.grab&&['hunter','smoker'].includes(z.role))||p.carry||p.healthHeld||p.healthUseTime||p.healingOther||p.beingHealedBy||p.knockTime){p.botWhackLeft=0;p.botWhackWait=0;return;}
      if(!p.botWhackLeft){
        if(p.shoveCooldown>0||p.shove>0||!this.zombies.some(z=>z.hp>0&&!['tank','witch'].includes(z.role)&&Math.abs(z.x-p.x)<85&&Math.abs(z.y-p.y)<75&&this.clearLane(p.x,p.y-35,z.x,z.y-35)))return;
        p.botWhackLeft=4-p.shoveCount;p.botWhackWait=0;
      }
      let elapsed=0,budget=dt;
      while(p.botWhackLeft>0&&budget+1e-9>=p.botWhackWait){
        elapsed+=p.botWhackWait;budget=Math.max(0,budget-p.botWhackWait);p.shove=0;
        if(!this.shove(p)){p.botWhackLeft=0;break;}
        this.events[this.events.length-1].burstOffset=elapsed;
        p.botWhackLeft--;p.botWhackWait=.005;
      }
      if(p.botWhackLeft>0)p.botWhackWait=Math.max(0,p.botWhackWait-budget);
    }
    cancelDefibrillator(p){const target=this.players.find(a=>a.id===p.defibTarget);if(target?.defibBy===p.id)target.defibBy=null;if(p.defibTarget)this.events.push({type:'defibCancel',player:p.id});p.defibTarget=null;p.defibTime=0;}
    defibrillatorStep(p,input,dt){

      const ready=!p.dead&&!p.down&&!p.grab&&!p.carry&&!p.healthUseTime&&!p.healthHeld&&!p.beingHealedBy&&!p.healingOther&&!p.knockTime&&p.onGround&&!p.mountedTurret&&p.defibrillators>0;

      const target=this.players.find(a=>a.id===p.defibTarget)||this.context(p)?.item;

      const valid=ready&&input.use&&!input.move&&!input.jump&&target?.dead&&!target.fallScreamed&&!target.fallingOffRoof&&Math.abs(target.x-p.x)<75&&Math.abs(target.y-p.y)<65&&(!target.defibBy||target.defibBy===p.id);

      if(!valid){this.cancelDefibrillator(p);return false;}

      if(!p.defibTarget){p.defibTarget=target.id;p.defibTime=0;target.defibBy=p.id;this.events.push({type:'defibCharge',player:p.id});this.events.push({type:survivorName(p)+'Line',kind:'defib',urgent:true});}

      p.defibTime+=dt;p.vx=p.vy=0;p.moving=false;p.crouchAmount=clamp(p.crouchAmount+dt*7,0,1);p.angle=target.x>=p.x?.35:Math.PI-.35;p.facing=target.x>=p.x?1:-1;p.prompt='HOLD USE · DEFIBRILLATING '+target.name.toUpperCase()+' · '+Math.min(100,Math.floor(p.defibTime/3*100))+'%';p.prev={...input,fire:false};

      if(p.defibTime+1e-9>=3){

        Object.assign(target,{dead:false,down:false,hp:50,tempHp:0,incapHp:200,incapCount:0,lastStrike:false,revive:0,reviveBy:null,defibBy:null,grab:0,healthUseTime:0,healthHeld:false,knockTime:0,goo:0,vx:0,vy:0,onGround:true});target.brain.mode='cover';target.brain.nextDecision=this.time+3;

        p.defibrillators--;this.defibShock={x:target.x,y:target.y,left:.55};this.fx(target.x,target.y-25,22,'#a8f5ff');this.events.push({type:'defibShock',player:p.id,target:target.id,x:target.x,y:target.y});this.message(target.name+' revived with 50 health.');p.defibTarget=null;p.defibTime=0;

      }

      return true;

    }

    needsAmmo(p){return p.inventory.some(w=>!WEAPONS[w].unlimitedAmmo&&(w===p.weapon?p.reserve:p.ammoByWeapon[w]?.reserve)<WEAPONS[w].reserve);}

    refillAmmo(p){for(const w of p.inventory){if(WEAPONS[w].unlimitedAmmo)continue;if(w===p.weapon)p.reserve=WEAPONS[w].reserve;else p.ammoByWeapon[w].reserve=WEAPONS[w].reserve;}this.message('Ammo refilled. This pile never runs out.');}

    cancelBotHeal(p){const healer=p.healingOther?p:this.players.find(a=>a.id===p.beingHealedBy);if(!healer)return;const target=this.players.find(a=>a.id===healer.healingOther);if(target)target.beingHealedBy=0;healer.healingOther=0;healer.healOtherTime=0;}

    botHealStep(dt){for(const bot of this.players){if(bot.healingOther){const target=this.players.find(p=>p.id===bot.healingOther);if(!bot.ai||bot.dead||bot.down||bot.grab||bot.medicine<1||!target||target.dead||target.down||target.grab||Math.abs(target.x-bot.x)>80||Math.abs(target.y-bot.y)>65){this.cancelBotHeal(bot);continue;}bot.healOtherTime-=dt;if(bot.healOtherTime<=0){bot.medicine--;target.hp=100;target.tempHp=0;target.incapCount=0;target.lastStrike=false;this.events.push({type:'heal',player:target.id,kind:'kit',healer:bot.id});this.message(bot.name+' healed '+target.name+'.');this.cancelBotHeal(bot);}continue;}

        if(!bot.ai||bot.dead||bot.down||bot.grab||bot.carry||bot.medicine<1||bot.healthUseTime>0||bot.beingHealedBy)continue;

        const target=this.players.find(p=>p!==bot&&!p.ai&&!p.dead&&!p.down&&!p.grab&&!p.carry&&!p.beingHealedBy&&!p.healthUseTime&&(p.lastStrike||p.hp<=30)&&p.onGround&&bot.onGround&&Math.abs(p.x-bot.x)<75&&Math.abs(p.y-bot.y)<65);if(!target)continue;

        if(this.zombies.some(z=>z.hp>0&&(z.role!=='witch'||z.awake)&&Math.abs(z.x-target.x)<140&&Math.abs(z.y-target.y)<70))continue;

        bot.healingOther=target.id;bot.healOtherTime=3;target.beingHealedBy=bot.id;target.healthHeld=false;bot.vx=target.vx=0;this.events.push({type:survivorName(bot)+'Line',kind:'healOther',urgent:true});this.message(bot.name+' is healing '+target.name+'. Hold still.');

      }}

    weaponReloadStep(p,dt){if(p.reload>0){const duration=WEAPONS[p.weapon].reload,before=1-p.reload/duration;p.reload=Math.max(0,p.reload-dt);const after=1-p.reload/duration;for(const [at,stage] of [[.45,'clip_in'],[.65,'clip_locked'],[.78,'slideback'],[.93,'slideforward']])if(before<at&&after>=at)this.events.push({type:'reload',player:p.id,weapon:p.weapon,x:p.x,stage});if(p.reload===0){const weapon=WEAPONS[p.weapon],n=weapon.unlimitedAmmo?weapon.magazine-p.mag:Math.min(weapon.magazine-p.mag,p.reserve);p.mag+=n;if(!weapon.unlimitedAmmo)p.reserve-=n;this.events.push({type:'ready',player:p.id,weapon:p.weapon})}}}
    reload(p){const weapon=WEAPONS[p.weapon];if(p.weapon==='pipebomb')return;if(!p.dead&&!p.ledgeHanging&&!p.grab&&!p.carry&&!p.healthHeld&&!p.healthUseTime&&!p.reload&&p.mag<weapon.magazine&&(weapon.unlimitedAmmo||p.reserve>0)){p.reload=weapon.reload;this.events.push({type:'reload',player:p.id,weapon:p.weapon,x:p.x,stage:'clip_out'});}}

    availableWeapons(p){return [...p.inventory,...(p.grenades>0?['pipebomb']:[])];}

    switchWeapon(p,weapon){if(p.healthUseTime>0)return false;p.healthHeld=false;if(p.dead||p.ledgeHanging||p.down&&weapon==='pipebomb'||p.grab||p.carry||!this.availableWeapons(p).includes(weapon)||weapon===p.weapon)return false;if(p.weapon!=='pipebomb')p.ammoByWeapon[p.weapon]={mag:p.mag,reserve:p.reserve};p.heatByWeapon=p.heatByWeapon||{};p.heatByWeapon[p.weapon]={heat:p.heat,locked:p.locked};p.weapon=weapon;const temperature=p.heatByWeapon[weapon]||{heat:0,locked:false};p.heat=this.disableGunHeat?0:temperature.heat;p.locked=this.disableGunHeat?false:temperature.locked;p.reload=0;p.recoil=0;if(weapon==='pipebomb'){p.mag=p.grenades;p.reserve=0;}else{p.mag=p.ammoByWeapon[weapon].mag;p.reserve=p.ammoByWeapon[weapon].reserve;}this.events.push({type:'weaponDeploy',player:p.id,weapon,x:p.x});this.message(`Selected ${WEAPONS[weapon].name}.`);return true;}

    autoSwitchEmptyWeapon(p){if(p.weapon==='pistol'||p.weapon==='pipebomb'||WEAPONS[p.weapon].unlimitedAmmo||p.mag>0||p.reserve>0)return false;return this.switchWeapon(p,'pistol');}

    cycleWeapon(p,direction){if(!p.healthUseTime)p.healthHeld=false;const items=this.availableWeapons(p);if(items.length<2||!direction)return false;const index=Math.max(0,items.indexOf(p.weapon));return this.switchWeapon(p,items[(index+Math.sign(direction)+items.length)%items.length]);}

    primaryWeapon(weapon){return !!WEAPONS[weapon]&&!['pistol','deagle','pipebomb'].includes(weapon)&&WEAPONS[weapon].slot!=='secondary';}
    healthCapacity(p,kind){return kind==='kit'?(p.ai?1:3):1;}
    botLoadoutStep(p){if(!p.ai)return;p.medicine=Math.min(1,p.medicine);p.healthItems.pills=Math.min(1,p.healthItems.pills);const primaries=p.inventory.filter(w=>this.primaryWeapon(w)),keep=primaries.includes(p.weapon)?p.weapon:primaries[primaries.length-1];for(const w of primaries)if(w!==keep){p.inventory=p.inventory.filter(item=>item!==w);delete p.ammoByWeapon[w];delete p.heatByWeapon[w];delete p.weaponLasers[w];}}
    botAimPoint(bot,z){
      const brain=bot.brain,serial=brain.aimShot||0,laser=!!bot.weaponLasers?.[bot.weapon];
      if(!brain.aim||brain.aim.target!==z.id||brain.aim.serial!==serial||brain.aim.weapon!==bot.weapon||brain.aim.laser!==laser||this.time>=(brain.aim.until||0)){const baseChance=bot.weapon==='pistol'?.8:bot.weapon==='smg'?.6:.7,headChance=Math.min(1,baseChance*(laser?1.3:1)),roll=this.rand(),region=roll<headChance?'head':roll<.95?'body':'legs';brain.aim={target:z.id,serial,weapon:bot.weapon,laser,region,until:this.time+.6+this.rand()*.3,dx:(this.rand()-.5)*2,dy:(this.rand()-.5)*2};}
      const aim=brain.aim,boxes=enemyHitboxes(z),box=aim.region==='legs'?{x:z.x,y:z.y-12,r:10}:boxes[aim.region],error=aim.region==='head'?box.r*.7:6;
      return {x:box.x+aim.dx*error,y:box.y+aim.dy*error};
    }
    canCollectWeapon(p,weapon){return !!WEAPONS[weapon]&&weapon!=='pipebomb'&&(p.ai?!p.inventory.includes(weapon):weapon!=='smg'||!(p.weapon==='smg'||p.inventory.includes('smg')));}

    collectWeapon(p,weapon){if(!this.canCollectWeapon(p,weapon)||p.ai&&(p.dead||p.down||p.grab||p.carry||p.healthUseTime))return false;if(p.ai&&this.primaryWeapon(weapon)){if(this.primaryWeapon(p.weapon))this.switchWeapon(p,'pistol');for(const old of p.inventory.filter(w=>this.primaryWeapon(w))){p.inventory=p.inventory.filter(w=>w!==old);delete p.ammoByWeapon[old];delete p.heatByWeapon[old];delete p.weaponLasers[old];}}if(!p.inventory.includes(weapon)){p.inventory.push(weapon);p.ammoByWeapon[weapon]={mag:WEAPONS[weapon].magazine,reserve:WEAPONS[weapon].reserve};this.switchWeapon(p,weapon);}else if(p.weapon===weapon)p.reserve=Math.min(360,p.reserve+60);else p.ammoByWeapon[weapon].reserve=Math.min(360,p.ammoByWeapon[weapon].reserve+60);this.message(`${WEAPONS[weapon].name} collected. Mouse wheel switches weapons.`);return true;}

    drop(p){if(p.carry){p.carry.carrier=0;p.carry.x=p.x;p.carry.y=floor(p.x);p.carry=null}}

    die(p){if(p.dead)return;this.cancelDefibrillator(p);this.releaseTurret(p);if(!p.fallScreamed)this.events.push({type:'survivorDeath',player:p.id});p.dead=true;p.down=true;p.hp=0;p.incapHp=0;p.revive=0;p.vx=0;p.reload=0;this.drop(p);for(const z of this.zombies)if(z.id===p.grab)this.release(z);p.grab=0;this.message(`${p.name} died. The remaining survivor can keep going.`);}

    billIncapScream(p){if(p.id!==1||p.dead||!p.down||this.time<(p.nextScream||0))return;p.nextScream=this.time+6;this.events.push({type:'survivorScream',player:p.id});}

    screamIfCritical(p){if(p.id===1){if(p.down&&!p.dead&&p.incapHp>0&&p.incapHp<=30&&this.time>=(p.nextScream||0)){p.nextScream=this.time+10;this.events.push({type:'survivorScream',player:p.id,kind:'dying'});}return;}if(p.id<2||p.dead||this.time<p.nextScream||!(p.down?p.incapHp<=30:p.hp+(p.tempHp||0)<=20))return;p.nextScream=this.time+10;p.speech='';p.speechTime=0;this.events.push({type:p.id===3?'survivorScream':'zoeyScream',player:p.id});}

    enemyDamage(p,n){if(this.romero){if(n<=0)return;this.damage(p,p.down?n:p.hp+(p.tempHp||0));}else this.damage(p,n*this.enemyDamageMultiplier);}

    damage(p,n){if(p.dead)return;if(n>0){this.cancelDefibrillator(p);this.cancelBotHeal(p);p.panicUntil=this.time+2;}if(p.id>=2&&n>0&&this.time>=(p.nextScream||0)){p.nextScream=this.time+4;this.events.push({type:'survivorScream',player:p.id,kind:'hurt'});} if(p.healthUseKind==='kit')p.healthUseTime=0;p.hurt=.25;const reviver=this.players.find(a=>a.id===p.reviveBy);const botReviving=p.down&&!p.grab&&reviver?.ai&&!reviver.down&&!reviver.dead&&!reviver.grab&&reviver.prev.use&&Math.abs(reviver.x-p.x)<75&&Math.abs(reviver.y-p.y)<65;if(!botReviving)p.revive=0;this.director.recentDamage+=n;if(p.down){p.incapHp=Math.max(0,p.incapHp-n);if(p.incapHp>0&&n>0)this.billIncapScream(p);this.screamIfCritical(p);if(p.incapHp<=.000001)this.die(p);return;}const buffered=Math.min(p.tempHp||0,n);p.tempHp=Math.max(0,(p.tempHp||0)-buffered);n-=buffered;p.hp=Math.max(0,p.hp-n);this.screamIfCritical(p);this.fx(p.x,p.y-35,4,'#bca06a');if(p.hp<=.000001){if(p.incapCount>=2){p.tempHp=0;this.die(p);return;}p.incapCount++;this.drop(p);p.hp=0;p.tempHp=0;p.down=true;this.releaseTurret(p);if(this.romero&&!this.romeroFocusTarget())this.romeroFocusId=p.id;p.incapHp=200;p.healthHeld=false;p.healthUseTime=0;p.shoveAnim=0;p.vx=0;p.reload=0;this.billIncapScream(p);this.message(`${p.name} incapacitated! Hold E nearby to revive after freeing them.`);}}

    shove(p){if(p.dead||p.shove>0||p.shoveCooldown>0||p.down||p.grab&&this.zombies.some(z=>z.id===p.grab&&['hunter','smoker'].includes(z.role)))return false;p.shove=p.ai?.005:.4;p.shoveAnim=.28;p.shoveCount++;if(p.shoveCount>=(p.ai?4:5))p.shoveCooldown=p.ai?2:3;for(const car of this.alarmCars)if(Math.abs(car.x+62-p.x)<130&&Math.abs(car.y-p.y)<75&&(!p.ai||this.time<(p.panicUntil||0)))this.triggerCar(car);for(const z of this.zombies){if(z.role==='witch'){if(Math.abs(z.x-p.x)<85&&Math.abs(z.y-p.y)<75)this.provokeWitch(z,p);continue;}if(z.role!=='tank'&&Math.abs(z.x-p.x)<85&&Math.abs(z.y-p.y)<75){z.stagger=this.romero?1.8:1.1;const direction=Math.sign(z.x-p.x||1);if(this.romero){for(let step=0;step<10;step++){const pushed=clamp(z.x+direction*12,Math.min(10,z.x),WORLD.end-10);if(this.checkpointBlocked(z.x,pushed,z.y)||this.floor(pushed)<z.y-26||this.map==='no-mercy'&&this.safeDoor.enabled&&!this.safeDoor.open&&(z.x-this.safeDoor.x)*(pushed-this.safeDoor.x)<=0)break;z.x=pushed;}}else z.x=clamp(z.x+direction*35,this.lift.phase==='riding'?this.lift.x-75:this.routeStart(),this.lift.phase==='riding'?this.lift.x+75:this.routeEnd(z.y,z.x));z.windup=0;this.release(z);for(const a of this.players)if(a.grab===z.id)a.grab=0;this.fx(z.x,z.y-35,3,'#afba88')}}p.grab=0;this.events.push({type:'shove',player:p.id});return true;}

    get enemyLimit(){return this.romero?(this.difficulty==='expert'?160:100):96;}

    addEnemy(role,x,y){if(this.level==='rooftop'&&x<this.routeStart())return null;if(x>this.routeEnd(y,x))return null;if(this.safeRooms.some(r=>x>r.entry&&x<r.exit))return;if(this.romero)role='shambler';if(this.zombies.length>=this.enemyLimit)return;const z={id:++this.id,role,x,y:y??floor(x),vy:0,hp:enemyHealth[role],specialCooldown:role==='hunter'?1:2,tongue:null,pouncing:false,speed:(this.map==='no-mercy'&&!this.romero&&['shambler','runner','climber','grabber','breacher'].includes(role)?260:roles[role].speed)*(.9+this.rand()*.2),phase:this.rand()*6.28,attack:.4,windup:0,stagger:0,grabbing:0,tint:Math.floor(this.rand()*3),awake:false,target:0,slashes:0};if(role==='witch'){z.restX=x;z.restY=z.y;}this.zombies.push(z);return z}

    build(p){const g=this.gates.find(g=>Math.abs(p.x-g.x)<70&&Math.abs(p.y-420)<50);if(!g){this.message('Stand near a striped gate socket to build or repair.');return}if(this.scrap<2){this.message('Gate needs 2 scrap. A lure costs 1.');return}this.scrap-=2;g.hp=120;g.open=false;this.noise=clamp(this.noise+8,0,100);this.message('Gate secured. E / X opens it. Breachers target gates.');}

    lureAt(p){if(this.scrap<1||p.down)return;this.scrap--;this.lure={x:clamp(p.x+Math.cos(p.angle)*240,20,this.accessEnd),life:12};this.noise=clamp(this.noise+15,0,100);this.message('Bell deployed. Distant infected follow it for 12 seconds.');}

    context(p){if(this.map==='no-mercy'&&this.level!=='rooftop'&&!p.ai&&Math.abs(p.x-11290)<85&&Math.abs(p.y-660)<60)return {kind:this.secretDoorOpen?'secretFrog':'secretDoor',text:this.secretDoorOpen?'CLICK THE FROG / USE · A VERY NORMAL FROG':'USE · OPEN ROOM 102'};const hanging=this.players.find(a=>a!==p&&a.ledgeHanging&&!a.dead&&Math.abs(p.x-a.ledgeEdge)<85&&Math.abs(p.y-660)<65);if(hanging)return {kind:'revive',item:hanging,text:'HOLD USE · PULL SURVIVOR UP FROM THE LEDGE'};if(this.level==='rooftop'&&this.rooftopEncounter.phase==='idle'&&Math.abs(p.x-this.rooftopRadio.x)<65&&Math.abs(p.y-this.rooftopRadio.y)<65)return {kind:'rooftopRadio',item:this.rooftopRadio,text:'USE · ACTIVATE ROOFTOP RADIO / START THE FIGHT'};if(this.map==='no-mercy'&&SEWER.ladderX!==null&&SEWER.enabled&&p.x<SEWER.exit&&Math.abs(p.x-SEWER.ladderX)<70&&p.y>SEWER.streetY+12)return {kind:'sewerLadder',item:SEWER.ladderX,text:p.sewerClimbing?'CLIMBING · WEAPON STOWED':this.sewerLadderBlocked()?'TANK BLOCKING THE LADDER':'JUMP ONTO THE RED LADDER'};const near=(x,y,r=65)=>Math.abs(p.x-x)<r&&Math.abs(p.y-y)<65;for(const room of this.safeRooms){if(near(room.entry,room.y,85)||p.x>room.entry&&p.x<room.exit&&!room.secured)return {kind:'checkpointDoor',item:room,side:'entry',text:room.entryOpen?'USE · CLOSE ENTRANCE / SAVE CHECKPOINT':'USE · OPEN SAFE-ROOM ENTRANCE'};if(near(room.exit,room.y,85)||room.secured&&p.x>room.entry&&p.x<room.exit)return {kind:'checkpointDoor',item:room,side:'exit',text:room.secured?'USE · OPEN EXIT / CONTINUE':'GET THE TEAM INSIDE AND CLOSE THE ENTRANCE FIRST'};}

      const mounted=this.turrets.find(t=>t.playerId===p.id);if(mounted)return {kind:'turret',item:mounted,text:mounted.locked?'TURRET OVERHEATED · RELEASE USE TO LEAVE':'HOLD USE + FIRE · TURRET · RELEASE USE TO LEAVE'};const pile=this.ammoPiles.find(a=>near(a.x,a.y));if(pile&&this.needsAmmo(p))return {kind:'ammo',item:pile,text:'E / X · REFILL AMMO (UNLIMITED PILE)'};

      const corpse=this.players.find(a=>a!==p&&a.dead&&!a.fallScreamed&&!a.fallingOffRoof&&near(a.x,a.y,75)&&(!a.defibBy||a.defibBy===p.id));if(corpse&&p.defibrillators>0&&!p.carry&&!p.healthHeld&&!p.healthUseTime)return {kind:'defibrillate',item:corpse,text:'HOLD USE · DEFIBRILLATE '+corpse.name.toUpperCase()};const defib=this.defibrillatorPickups.find(d=>!d.used&&near(d.x,d.y));if(defib&&!p.ai&&!p.carry&&p.defibrillators<1)return {kind:'defibPickup',item:defib,text:'USE · TAKE WALL DEFIBRILLATOR'};const friend=this.players.find(a=>a!==p&&a.down&&!a.dead&&!a.grab&&near(a.x,a.y,75));if(friend)return {kind:'revive',item:friend,text:'HOLD E / X Â· REVIVE'};

      const hatch=this.sewerHatch;if(hatch&&!hatch.open&&near(hatch.x,hatch.y,80))return {kind:'sewerHatch',item:hatch,text:'E / X · OPEN SEWER LID'};

      const turret=this.turrets.find(t=>!t.playerId&&near(t.x-18,t.y,52));if(turret&&!p.carry&&!p.healthHeld&&!p.healthUseTime&&!p.beingHealedBy&&!p.healingOther&&p.onGround)return {kind:'turret',item:turret,text:'HOLD USE · OPERATE TURRET · UNLIMITED AMMO'};if(this.map==='no-mercy'&&this.safeDoor.enabled&&(near(this.safeDoor.x,this.safeDoor.y,90)||this.safeDoor.open&&p.x>this.safeDoor.x&&Math.abs(p.y-this.safeDoor.y)<65))return {kind:'safeDoor',text:this.safeDoor.open?'E / X Â· CLOSE SAFE ROOM DOOR':'E / X Â· OPEN SAFE ROOM DOOR'};

      if(this.lift.enabled&&near(this.lift.x-105,this.lift.y,65)&&this.lift.phase==='idle')return {kind:'liftCall',text:'E / X · CALL LIFT TO ROOFTOP'};if(this.lift.phase==='arrival'&&near(this.lift.x,this.lift.y,105))return {kind:'liftEntry',text:'UP / JUMP · ENTER OPEN LIFT'};const jukebox=this.jukeboxes.find(j=>near(j.x,j.y,62));if(jukebox)return {kind:'jukebox',item:jukebox,text:jukebox.playing?'E / X · STOP JUKEBOX':'E / X · PLAY JUKEBOX'};

      if(near(3550,660,130)&&p.carry)return {kind:'deposit',text:'E / X Â· DELIVER CELL'};

      const health=this.healthPickups.find(h=>!h.used&&near(h.x,h.y)&&(h.kind==='kit'?p.medicine<this.healthCapacity(p,h.kind):p.healthItems[h.kind]<1));if(health)return {kind:'health',item:health,text:'E / X Â· PICK UP '+(health.kind==='kit'?'HEALTH KIT':health.kind==='pills'?'PAIN PILLS':'ADRENALINE')};const cache=this.caches.find(c=>!c.used&&near(c.x,c.y));if(cache)return {kind:'cache',item:cache,text:'E / X Â· SEARCH: AMMO + MEDICINE + SCRAP'};

      if(!p.carry){const cell=this.cells.find(c=>!c.done&&!c.carrier&&near(c.x,c.y));if(cell)return {kind:'cell',item:cell,text:'E / X Â· CARRY CELL (DROP TO SHOOT)'};}

      const laser=this.laserBoxes.find(b=>near(b.x,b.y));if(laser&&!p.carry&&p.weapon!=='pipebomb')return {kind:'laser',item:laser,text:p.weaponLasers[p.weapon]?'LASER SIGHT ALREADY FITTED':'E / X Â· FIT LASER SIGHT TO HELD GUN'};

      const weapon=this.weaponPickups.find(w=>!w.used&&this.canCollectWeapon(p,w.weapon)&&near(w.x,w.y));if(weapon)return {kind:'weapon',item:weapon,text:'E / X Â· PICK UP '+WEAPONS[weapon.weapon].name.toUpperCase()};

      const grenade=this.grenadePickups.find(g=>!g.used&&near(g.x,g.y));if(grenade&&p.grenades<1)return {kind:'grenade',item:grenade,text:'E / X Â· PICK UP PIPE BOMB'};

      const gate=this.gates.find(g=>g.hp>0&&near(g.x,420));if(gate)return {kind:'gate',item:gate,text:'E / X Â· '+(gate.open?'CLOSE':'OPEN')+' GATE'};

      const ladder=(this.map==='no-mercy'?[]:[925,3070]).find(x=>Math.abs(p.x-x)<90);if(ladder!==undefined)return {kind:'ladder',item:ladder,text:'HOLD E / X Â· '+(p.y>500?'CLIMB TO CATWALK':'DESCEND TO GROUND')};

      if(p.carry)return {kind:'drop',text:'E / X Â· DROP CELL'};

      return null;

    }

    stompStep(p,oldX,oldY,wasGrounded){if(this.romero&&this.time-(p.lastJumpPress??-100)>.18)return false;if(wasGrounded||p.vy<=0||p.grab||p.carry||p.healthUseTime>0)return false;let victim=null,first=Infinity;for(const z of this.zombies){if(z.hp<=0||!['shambler','runner','climber','grabber','breacher'].includes(z.role))continue;const head=enemyHitboxes(z).head,top=head.y-head.r;if(oldY>top+2||p.y<top)continue;const t=clamp((top-oldY)/Math.max(p.y-oldY,.001),0,1),x=oldX+(p.x-oldX)*t;if(Math.abs(x-head.x)>head.r+8||t>=first)continue;victim=z;first=t;}if(!victim)return false;const head=enemyHitboxes(victim).head;victim.hp=0;this.release(victim);this.kills++;p.y=head.y-head.r;p.vy=-320;p.onGround=false;this.fx(head.x,head.y,12,'#b5c68b');this.events.push({type:'stomp',player:p.id,x:head.x,y:head.y});return true;}

    autoPickups(p){if(!this.autoPickup||p.dead||p.down||p.grab||p.carry||p.beingHealedBy||p.healingOther)return;const near=item=>Math.abs(p.x-item.x)<45&&Math.abs(p.y-item.y)<55;for(const [kind,items] of [['ammo',this.ammoPiles],['health',this.healthPickups],['cache',this.caches],['weapon',this.weaponPickups],['grenade',this.grenadePickups],['laser',this.laserBoxes]])for(const item of items){if(item.used||!near(item))continue;if(kind==='ammo'&&!this.needsAmmo(p))continue;if(kind==='health'&&(item.kind==='kit'?p.medicine>=this.healthCapacity(p,item.kind):p.healthItems[item.kind]>=1))continue;if(kind==='weapon'&&!this.canCollectWeapon(p,item.weapon))continue;if(kind==='grenade'&&p.grenades>=1)continue;if(kind==='laser'&&(p.weapon==='pipebomb'||p.weaponLasers[p.weapon]))continue;this.interact(p,{use:true,auto:true},0,{kind,item});}}

    interact(p,input,dt,pickup=null){if(p.dead||p.down||p.grab){p.prompt='';return;}const c=pickup||this.context(p);p.prompt=c?.text||'';if(!input.use){p.ladderLatched=false;p.ladder=0;return}if(!c){p.ladder=0;return}const pressed=input.auto||!p.prev.use;if(c.kind==='secretDoor'||c.kind==='secretFrog'){if(pressed&&!p.ai&&!input.auto){if(c.kind==='secretDoor'){this.secretDoorOpen=true;this.events.push({type:'liftDoors',open:true,x:11290});}else this.enterFrogRoom(p);}return;}if(c.kind==='revive'){if(c.item.ledgeHanging){const other=this.players.find(a=>a.id===c.item.reviveBy);if(other&&other!==p&&!other.dead&&!other.down&&other.prev.use&&Math.abs(other.x-c.item.ledgeEdge)<85)return;if(c.item.revive===0&&this.time>=(c.item.ledgeVoiceAt??-1)){c.item.ledgeVoiceAt=this.time+8;this.events.push({type:'ledgeRescueVoice',player:p.id});}}if(!c.item.ledgeHanging&&p.id===1&&(pressed||c.item.revive===0)&&this.time>=(p.brain.nextReviveVoice||0)){p.brain.nextReviveVoice=this.time+8;p.brain.nextTalk=Math.max(p.brain.nextTalk,this.time+8);this.events.push({type:'billLine',kind:'reviveStart',urgent:true});}c.item.reviveBy=p.id;c.item.revive+=dt;if(c.item.revive+1e-9>=(c.item.ledgeHanging?6:2.3)){const wasHanging=!!c.item.ledgeHanging,rescuedHp=wasHanging?Math.max(.1,Math.min(30,c.item.ledgeStartHp*.5,c.item.hp*.5)):30;if(c.item.ledgeHanging){c.item.ledgeHanging=false;c.item.x=c.item.ledgeEdge+(c.item.ledgeEdge===15000?70:-70);c.item.y=660;c.item.vx=c.item.vy=0;c.item.onGround=true;}c.item.down=false;c.item.tempHp=0;c.item.hp=rescuedHp;c.item.revive=0;c.item.reviveBy=null;c.item.incapHp=100;c.item.lastStrike=this.romero||c.item.incapCount>=2;if(this.romero)c.item.incapCount=2;this.message(c.item.lastStrike?c.item.name+' is black and white! Use a health kit before another knockdown.':'Survivor back on their feet.');c.item.brain.nextTalk=Math.min(c.item.brain.nextTalk,this.time);this.characterTalk(c.item,'revived');}return}

      if(c.kind==='sewerLadder')return;if(c.kind==='turret')return;if(c.kind==='ladder'){if(p.ladderLatched)return;p.ladder+=dt;if(p.ladder>1.2){p.x=c.item;p.y=p.y>500?420:660;p.vy=0;p.ladder=0;p.ladderLatched=true;}return}

      if(c.kind==='defibrillate')return;if(!pressed)return;if(c.kind==='defibPickup'){c.item.used=true;p.defibrillators++;this.message('Defibrillator collected. Hold USE beside a dead teammate for 3 seconds.');return;}

      if(c.kind==='sewerHatch'){if(p.ai||input.auto||c.item.open)return;c.item.open=true;this.events.push({type:'sewerHatchOpen',x:c.item.x,y:c.item.y});this.message('Sewer lid moved aside. Drop down and take the route under the barricade.');return;}

      if(c.kind==='rooftopRadio'){if(p.ai||input.auto||this.rooftopEncounter.phase!=='idle')return;Object.assign(this.rooftopEncounter,{phase:'waves',wave:1,remaining:46,spawnLeft:0,waveLeft:40});this.events.push({type:'hordeStart'});this.events.push({type:'rooftopRadioBroadcast',kind:'answer'});this.message('Radio activated! ROOFTOP HORDE — wave 1 / 2!');return;}

      if(c.kind==='liftCall'){if(p.ai||input.auto)return;const l=this.lift;l.phase='common';l.wave=1;l.remaining=24;l.spawnLeft=0;l.left=16;l.approachElapsed=0;this.events.push({type:'hordeStart'});this.message('Lift called! Hold the hospital — wave 1 / 4.');return;}if(c.kind==='jukebox'){if(p.ai||input.auto)return;c.item.playing=!c.item.playing;if(!c.item.playing)c.item.track=(c.item.track+1)%6;c.item.beat=0;this.events.push({type:'jukebox',id:c.item.id,playing:c.item.playing});this.message(c.item.playing?'Jukebox playing. Use again to stop.':'Jukebox stopped.');return;}

      if(c.kind==='checkpointDoor'){if(p.ai)return;const room=c.item;if(c.side==='entry'){if(!room.entryOpen){room.entryOpen=true;}else if(this.players.filter(a=>!a.dead).every(a=>!a.down&&!a.grab&&a.x>room.entry+24&&a.x<room.exit-24)){room.entryOpen=false;room.secured=true;this.saveCheckpoint(room);}else this.message('Bring every living survivor inside before securing the checkpoint.');}else if(room.secured){room.exitOpen=!room.exitOpen;}else this.message('Close the entrance with the team inside to save this checkpoint.');return;}

      if(c.kind==='safeDoor'){if(this.safeDoor.open){if(this.players.filter(a=>!a.dead).every(a=>!a.down&&!a.grab&&a.x>this.safeDoor.x+20)){this.safeDoor.open=false;this.safeDoor.closed=true;this.status='won';this.message('Safe room secured. You made it through the apartments.');}else this.message('Get every living survivor inside before closing the door.');}else this.safeDoor.open=true;}

      if(c.kind==='deposit'){p.carry.done=true;p.carry.carrier=0;p.carry=null;this.delivered++;this.message(`${this.delivered}/3 cells delivered. ${this.delivered===3?'Everyone to the truck!':'Go back for the remaining cells.'}`)}

      if(c.kind==='ammo'){this.refillAmmo(p);return;}

      if(c.kind==='cache'){c.item.used=true;if(p.weapon!=='pipebomb')p.reserve=Math.min(360,p.reserve+96);else for(const ammo of Object.values(p.ammoByWeapon))ammo.reserve=Math.min(360,ammo.reserve+96);p.medicine=Math.min(this.healthCapacity(p,'kit'),p.medicine+1);this.scrap+=2;this.message('Cache searched: 96 rounds, 1 medicine, 2 shared scrap.')}

      if(c.kind==='cell'){p.carry=c.item;c.item.carrier=p.id;this.message('Hands occupied. Drop the cell to fire. The truck is at the far east.');}

      if(c.kind==='laser'&&!p.weaponLasers[p.weapon]){p.weaponLasers[p.weapon]=true;this.message(`${WEAPONS[p.weapon].name}: laser sight fitted. Spread reduced by 75%.`);}

      if(c.kind==='weapon'&&this.collectWeapon(p,c.item.weapon))c.item.used=true;

      if(c.kind==='health'){if((c.item.kind==='kit'?p.medicine:p.healthItems[c.item.kind])>=this.healthCapacity(p,c.item.kind))return;c.item.used=true;if(c.item.kind==='kit')p.medicine++;else p.healthItems[c.item.kind]++;p.healthSelected=c.item.kind;this.message(input.auto?'Health item collected. Tap its shortcut to use it.':'Health item collected. 4 PILLS Â· 5 ADRENALINE Â· 6 KIT Â· H USE');}if(c.kind==='grenade'&&p.grenades<1){c.item.used=true;p.grenades++;this.message(input.auto?'Pipe bomb collected. Tap GRENADE to throw.':'Pipe bomb collected. G / T / RB throws toward your aim.');}

      if(c.kind==='drop')this.drop(p);if(c.kind==='gate')c.item.open=!c.item.open;

    }

    // Story owns the lift trigger; the doors are staged in the hotel facade.

    setLiftDoors(open){if(!this.lift.enabled||this.lift.open===!!open)return false;this.lift.open=!!open;this.events.push({type:'liftDoors',open:this.lift.open,x:this.lift.x,y:this.lift.y});return true;}

    storyPropsStep(dt){if(this.sewerHatch?.open)this.sewerHatch.slide=clamp(this.sewerHatch.slide+dt/.9,0,1);const l=this.lift;if(l.enabled)l.doorProgress=clamp(l.doorProgress+(l.open?1:-1)*dt/1.4,0,1);for(const j of this.jukeboxes)if(j.playing)j.beat+=dt;}

    sewerLadderBlocked(){return this.zombies.some(z=>z.id===this.sewerLadderEncounter.tankId&&z.hp>0);}

    sewerLadderStep(p,input,dt){if(this.map!=='no-mercy')return false;const l=SEWER_LADDER,jump=!!input.jump&&!p.prev.jump;if(!p.sewerClimbing){if(this.sewerLadderBlocked()||p.carry||p.healthUseTime||p.healthHeld||p.grab||p.down||p.dead||this.time<(p.ladderRegrabAt||0)||Math.abs(p.x-l.x)>32||p.y<=l.top+30||p.y>l.bottom+5||!(jump&&p.onGround||!p.onGround&&p.vy<0&&this.time-(p.lastJumpPress??-10)<.5)||this.players.some(a=>a!==p&&a.sewerClimbing&&Math.abs(a.y-p.y)<90))return false;p.sewerClimbing=true;p.sewerLadderFinished=false;p.y-=12;p.reload=p.flash=p.shoveAnim=0;this.releaseTurret(p);}else if(jump||input.crouch&&!p.prev.crouch){p.sewerClimbing=false;p.vy=30;p.ladderRegrabAt=this.time+.6;return false;}if(input.flashlight&&!p.prev.flashlight)p.flashlight=!p.flashlight;p.x=l.x;p.vx=p.vy=0;p.onGround=false;p.crouchAmount=0;p.angle=-Math.PI/2;p.facing=1;const above=this.players.filter(a=>a!==p&&a.sewerClimbing&&a.y<p.y).reduce((y,a)=>Math.max(y,a.y),-Infinity),ny=Math.max(l.top,p.y-l.speed*dt,above+90),distance=Math.max(0,p.y-ny);p.y-=distance;p.moving=distance>0;p.walkCycle+=distance*.09;p.prompt='CLIMBING · WEAPON STOWED';if(!this.romero&&!this.sewerLadderEncounter.triggered&&p.y<=(l.top+l.bottom)/2)this.spawnLadderTank();if(p.y<=l.top&&!this.sewerLadderBlocked()){p.x=l.landingX;p.y=l.top;p.sewerClimbing=false;p.sewerLadderFinished=true;p.onGround=true;p.prompt='HOSPITAL SERVICE LANDING';}return true;}

    spawnLadderTank(){if(this.romero||this.sewerLadderEncounter.triggered)return null;const l=SEWER_LADDER,tank=this.addEnemy('tank',l.x,l.top);if(!tank)return null;this.sewerLadderEncounter={triggered:true,tankId:tank.id};tank.dropping=true;tank.ladderDrop=true;tank.speed*=1.1;tank.hp=12000;tank.dropDelay=.65;tank.dropFloor=l.bottom;tank.rockCooldown=3;tank.jumpCooldown=1.5;tank.growlTime=4;this.tankSpawned=true;this.bossEncounter=true;this.events.push({type:'tankDistantWarning'},{type:'tankSpawn',x:tank.x,y:tank.y});this.message('TANK ABOVE! He is dropping down the ladder!');return tank;}

    fallOffSewerLadder(p){if(!p.sewerClimbing||p.dead)return;p.sewerClimbing=false;p.vx=0;p.vy=60;p.knockVX=-180-(p.id-1)*40;p.knockTime=.65;p.onGround=false;p.reload=0;p.ladderRegrabAt=this.time+1.5;p.prompt='KNOCKED OFF THE LADDER!';this.events.push({type:'tankImpact',x:p.x,y:p.y});}

    releaseTurret(p){const t=this.turrets.find(t=>t.playerId===p.id);if(t)t.playerId=null;p.mountedTurret=null;p.turretOrigin=null;}

    turretStep(dt){for(const t of this.turrets){t.heat=0;t.locked=false;t.cooldown=Math.max(0,t.cooldown-dt);t.flash=Math.max(0,t.flash-dt);if(t.locked&&t.heat<=35)t.locked=false;const p=this.players.find(p=>p.id===t.playerId);if(t.playerId&&(!p||p.dead||p.down||p.grab||p.knockTime||p.beingHealedBy||p.healingOther||Math.abs(p.x-(t.x-18))>60||Math.abs(p.y-t.y)>10)){if(p)this.releaseTurret(p);else t.playerId=null;}}}

    mountTurret(p,input){if(p.mountedTurret&&(!input.use||p.ai||p.carry||p.healthHeld||p.healthUseTime||p.dead||p.down||p.grab||p.knockTime||p.beingHealedBy||p.healingOther))this.releaseTurret(p);if(!input.use||p.ai||p.dead||p.down||p.grab||p.knockTime||p.carry||p.healthHeld||p.healthUseTime||p.beingHealedBy||p.healingOther)return null;const c=this.context(p);if(c?.kind!=='turret')return null;const t=c.item;if(t.playerId&&t.playerId!==p.id)return null;t.playerId=p.id;p.mountedTurret=t.id;p.turretOrigin={x:t.x,y:t.y-49};p.x=t.x-18;p.y=t.y;p.vx=p.vy=0;p.onGround=true;let a=Number.isFinite(input.angle)?input.angle:p.angle;a=Math.atan2(Math.sin(a),Math.cos(a));t.angle=clamp(a,-1.1,1.1);p.angle=t.angle;p.facing=1;return t;}

    shootTurret(p){const t=this.turrets.find(t=>t.id===p.mountedTurret&&t.playerId===p.id);if(!t||t.locked||t.cooldown>0||p.dead||p.down||p.grab)return false;t.cooldown=.085;t.heat=0;t.locked=false;t.flash=.04;const x=t.x+Math.cos(t.angle)*64,y=t.y-49+Math.sin(t.angle)*64;this.bullets.push({turret:true,weapon:'rifle',player:p.id,x,y,px:x,py:y,vx:Math.cos(t.angle)*1900,vy:Math.sin(t.angle)*1900,life:.8});this.noise=clamp(this.noise+3,0,100);this.events.push({type:'shot',turret:true,weapon:'rifle',player:p.id,x,y,facing:1});return true;}

    sandbagFloor(x,y=660){let f=this.floor(x,y);if(y>SEWER.streetY+70){for(const b of this.sewerPlatforms){const d=Math.min(x-(b.x-30),b.x+b.w+30-x);if(d>0)f=Math.min(f,SEWER.deepFloorY-(SEWER.deepFloorY-b.y)*Math.min(1,d/70));}return f;}for(const b of this.sandbags){const d=Math.min(x-(b.x-22),b.x+b.w+22-x);if(d>0)f=Math.min(f,b.y-b.h*Math.min(1,d/22));}return f;}

    shoot(p){if(p.sewerClimbing)return false;if(!this.botAlarmSafe(p))return false;if(p.healingOther)return false;if(p.weapon==='pipebomb')return false;const weapon=WEAPONS[p.weapon];if(p.shoveAnim>0||p.healthHeld||p.healthUseTime>0||p.dead||p.ledgeHanging||p.grab||p.carry||p.reload||(!this.disableGunHeat&&p.locked)||p.mag<=0||p.shot>0)return false;const spread=weaponSpread(p)+(p.ai?.018:0),a=p.angle+(this.rand()-.5)*spread;p.mag--;if(p.ai)p.brain.aimShot=(p.brain.aimShot||0)+1;if(this.disableGunHeat){p.heat=0;p.locked=false;}else{p.heat=Math.min(100,p.heat+6);if(p.heat>=100){p.locked=true;this.message(`Player ${p.id}: barrel overheated. Let it cool.`)}}p.recoil=Math.min(1,p.recoil+.12);p.shot=weapon.interval;p.flash=.035;const muzzle=weaponOrigin(p),x=muzzle.x,y=muzzle.y;const direction=muzzle.angle+(a-p.angle);this.bullets.push({weapon:p.weapon,player:p.id,x,y,px:x,py:y,vx:Math.cos(direction)*1500,vy:Math.sin(direction)*1500,life:1.1,bodyDamage:weapon.bodyDamage,headDamage:weapon.headDamage,commonBodyDamage:weapon.commonBodyDamage,commonHeadDamage:weapon.commonHeadDamage});this.noise=clamp(this.noise+1.9,0,100);const zone=this.zones.find(z=>p.x>=z.x&&p.x<z.end&&p.y<500);if(zone)zone.stress=clamp(zone.stress+3.5,0,100);this.events.push({type:'shot',player:p.id,weapon:p.weapon,x,y,facing:Math.cos(direction)>0?1:-1});this.autoSwitchEmptyWeapon(p);return true}

    botLobbySupplies(p){if(!p.ai||p.dead||p.down||p.grab||p.carry||p.healthHeld||p.healthUseTime||p.beingHealedBy||p.healingOther||p.knockTime||p.x<14500||p.x>=15000||Math.abs(p.y-660)>55)return;const pile=this.ammoPiles.find(a=>a.x>=14500&&a.x<15000&&Math.abs(p.x-a.x)<=85&&Math.abs(p.y-a.y)<55);if(pile&&this.needsAmmo(p))this.refillAmmo(p);const primary=p.inventory.find(w=>this.primaryWeapon(w)&&(w===p.weapon?p.mag+p.reserve:(p.ammoByWeapon[w]?.mag||0)+(p.ammoByWeapon[w]?.reserve||0))>0);if(primary&&p.weapon!==primary)this.switchWeapon(p,primary);if(primary&&p.mag===0)this.reload(p);}
    stepPlayer(p,input,dt){if(!p.fallingOffRoof&&!p.fallScreamed&&!p.ledgeHanging&&!(this.level==='rooftop'&&(p.knockTime>0||!p.onGround)))p.x=clamp(p.x,this.routeStart(),this.routeEnd(p.y,p.x));input=input||{};this.botLoadoutStep(p);this.botLobbySupplies(p);if(this.smokerFallStep(p,input,dt))return;if(this.defibrillatorStep(p,input,dt))return;const turret=this.mountTurret(p,input);if(turret)input={...input,move:0,jump:false,crouch:false,angle:turret.angle};if(p.healingOther){p.vx=0;p.moving=false;p.prev={};return;}if(p.beingHealedBy){p.vx=p.vy=0;p.moving=false;input={fire:input.fire,shove:input.shove,reload:input.reload,angle:input.angle,flashlight:input.flashlight};}this.healthItemStep(p,dt);this.autoUseHealth(p);p.moving=false;p.speechTime=Math.max(0,p.speechTime-dt);if(!p.speechTime)p.speech='';const wantsCrouch=!!input.crouch&&!p.down&&!p.dead&&!p.grab&&p.onGround;p.crouchAmount=clamp(p.crouchAmount+(wantsCrouch?1:-1)*dt*7,0,1);p.angle=Number.isFinite(input.angle)?input.angle:p.angle;if(Math.abs(Math.cos(p.angle))>=.08)p.facing=Math.cos(p.angle)>=0?1:-1;p.goo=Math.max(0,p.goo-dt);p.flash=Math.max(0,p.flash-dt);p.hurt=Math.max(0,p.hurt-dt);p.shot-=dt;p.shove=Math.max(0,p.shove-dt);p.shoveAnim=Math.max(0,p.shoveAnim-dt);if(p.shoveCooldown>0){p.shoveCooldown=Math.max(0,p.shoveCooldown-dt);if(p.shoveCooldown===0)p.shoveCount=0;}p.recoil=Math.max(0,p.recoil-dt*.9);if(this.disableGunHeat){p.heat=0;p.locked=false;p.heatByWeapon={};}else{p.heat=Math.max(0,p.heat-dt*12);if(p.heat<35)p.locked=false;for(const [weapon,temperature] of Object.entries(p.heatByWeapon||{}))if(weapon!==p.weapon){temperature.heat=Math.max(0,temperature.heat-dt*12);if(temperature.heat<35)temperature.locked=false;}}

      if(p.fallingOffRoof){p.x+=p.knockVX*dt;p.vy+=1000*dt;p.y+=p.vy*dt;if(p.y>this.roofFloor(clamp(p.x,15000,18000))+520){p.fallingOffRoof=false;this.die(p);}p.prev={...input};return;}if(p.dead){p.vx=0;p.prev={...input};return;}if(p.ledgeHanging){p.hp=Math.max(0,p.hp-2*dt);p.incapHp=p.hp;if(p.hp<=0||!this.players.some(a=>a!==p&&!a.dead&&!a.down&&!a.ledgeHanging&&!a.fallingOffRoof)){p.ledgeHanging=false;p.down=false;p.fallingOffRoof=true;p.fallScreamed=true;p.knockVX=0;p.vy=0;this.events.push({type:'survivorDeath',player:p.id});}p.prev={...input};return;}if(this.roofJumpStep(p,input,dt))return;if(p.knockTime>0){this.knockStep(p,dt);p.prev={...input};return;}if(p.down){p.vx=0;p.incapHp=Math.max(0,p.incapHp-dt);this.screamIfCritical(p);if(p.incapHp<=.000001)this.die(p);if(!p.dead&&!p.grab){if(p.weapon==='pipebomb')this.switchWeapon(p,'pistol');this.autoSwitchEmptyWeapon(p);if(p.mag===0||input.reload&&!p.prev.reload)this.reload(p);this.weaponReloadStep(p,dt);if(input.fire)this.shoot(p);}p.prev={...input};return;}

      if(p.grab&&!this.zombies.some(z=>z.id===p.grab&&z.grabbing>0))p.grab=0;

      if(p.grab&&this.zombies.some(z=>z.id===p.grab&&['hunter','smoker'].includes(z.role))){p.vx=0;p.prev={...input};return;}if(this.sewerLadderStep(p,input,dt)){p.prev={...input};return;}if(p.ai&&p.onGround&&input.move&&(this.sewerPlatforms.some(b=>p.y>b.y+3&&Math.abs((input.move>0?b.x:b.x+b.w)-p.x)<34)||this.sandbags.some(b=>Math.abs(b.x+b.w/2-p.x)<110&&Math.abs(b.y-p.y)<65)))input.jump=!p.prev.jump;const edge=k=>input[k]&&!p.prev[k];if(edge('jump'))p.lastJumpPress=this.time;if(edge('flashlight'))p.flashlight=!p.flashlight;this.autoSwitchEmptyWeapon(p);if(p.mag===0||edge('reload'))this.reload(p);if(p.ai)this.botWhackStep(p,dt);else if(edge('shove'))this.shove(p);if(edge('build'))this.build(p);if(edge('lure'))this.lureAt(p);if(edge('grenade'))this.throwPipeBomb(p,input.grenadeAngle);if(edge('heal')||p.healthHeld&&edge('fire'))this.useHealth(p);

      this.weaponReloadStep(p,dt);

      if(!p.beingHealedBy){let speed=p.carry?125:input.fire?150:230;p.stamina=100;if(p.grab)speed=0;

      if(p.adrenalineTime>0)speed*=1.5;if(wantsCrouch)speed=95;if(p.healthUseTime>0)speed=55;if(this.romero)speed*=.7;if(p.x>=SEWER.extensionStart&&p.y>SEWER.waterY)speed*=.65;const beforeX=p.x,beforeCycle=p.walkCycle;p.vx=(input.move||0)*speed;let nx=clamp(p.x+p.vx*dt,this.routeStart(),this.routeEnd(p.y,p.x));

      // Ground actors cannot teleport onto the underside of a deck. Use a service ladder.

      if(this.map==='no-mercy'&&this.hatchPassable()&&nx>=SEWER.entry&&nx<SEWER.entry+150&&p.y<SEWER.roofY+78)nx=Math.min(nx,SEWER.entry+SEWER.holeWidth-16);if(this.map==='no-mercy'&&p.y>SEWER.streetY+70&&nx<SEWER.entry+16)nx=SEWER.entry+16;const oldFloor=this.floor(p.x,p.y),newFloor=this.floor(nx,p.y);if(newFloor< p.y-26&&p.onGround&&(this.map==='no-mercy'||!(p.y>500&&p.x>=900&&p.x<3100)))nx=p.x;

      if((this.checkpointBlocked(p.x,nx,p.y)||this.map==='no-mercy'&&this.safeDoor.enabled&&!this.safeDoor.open&&(p.x-this.safeDoor.x)*(nx-this.safeDoor.x)<=0)&&nx!==p.x)nx=p.x;

      for(const g of this.gates)if(g.hp>0&&!g.open&&p.y<480&&(p.x-g.x)*(nx-g.x)<=0&&Math.abs(p.x-nx)>0)nx=p.x;

      // Crowds occupy space. Shooting or shoving opens a route; walking through is not free.

      for(const z of this.zombies)if(z.hp>0&&!(this.pipeBombs.length&&!['witch','tank','hunter','smoker','boomer'].includes(z.role))&&(z.role!=='witch'||z.awake)&&z.stagger<=0&&!(z.role==='tank'&&z.jumping&&z.y<p.y-85)&&Math.abs(z.y-p.y)<48&&Math.abs(nx-z.x)<19&&Math.sign(nx-p.x)===Math.sign(z.x-p.x)){nx=p.x;break}

      for(const b of this.sewerPlatforms)if(nx>b.x-8&&nx<b.x+b.w+8&&p.y>b.y+3&&p.y>SEWER.streetY+70)nx=p.x;

      if(p.onGround&&this.sandbags.some(b=>nx>b.x-12&&nx<b.x+b.w+12&&p.y>b.y-b.h+3&&Math.abs(p.y-b.y)<65))nx=p.x;p.x=nx;p.vx=dt>0?(p.x-beforeX)/dt:0;p.moving=Math.abs(p.x-beforeX)>.001;if(p.moving)p.walkCycle+=Math.abs(p.x-beforeX)*.04;if(edge('jump')&&p.onGround&&!p.grab){p.vy=this.level==='rooftop'&&this.zombies.some(z=>z.role==='tank'&&z.hp>0&&Math.abs(z.x-p.x)<350)?-720:-440;p.onGround=false}if(p.onGround&&!edge('jump')&&Math.abs(p.y-oldFloor)<3&&Math.abs(this.floor(p.x,p.y)-oldFloor)<=26){p.y=this.floor(p.x,p.y);p.vy=0;}const oldY=p.y,wasGrounded=p.onGround;p.vy+=1000*dt;p.y+=p.vy*dt;if(this.map==='no-mercy'&&p.x>=HOSPITAL.start&&p.x<HOSPITAL.end&&p.y<900&&p.vy<0&&p.y<hospitalCeiling(p.x)+95){p.y=hospitalCeiling(p.x)+95;p.vy=0;}if(this.map==='no-mercy'&&p.x>SEWER.entry+SEWER.holeWidth&&p.x<SEWER.exit&&p.y>SEWER.streetY+70&&p.vy<0&&p.y<SEWER.roofY+95&&(p.x<SEWER_LADDER.shaftLeft||p.x>SEWER_LADDER.shaftRight)){p.y=SEWER.roofY+95;p.vy=0;}this.stompStep(p,beforeX,oldY,wasGrounded);const under=this.map!=='no-mercy'&&p.y>500&&p.x>=900&&p.x<3100;let f=under?660:this.floor(p.x,p.y);for(const b of this.sewerPlatforms)if(p.x>=b.x-8&&p.x<=b.x+b.w+8&&oldY<=b.y+3&&p.y>=b.y&&p.vy>=0)f=Math.min(f,b.y);for(const b of this.sandbags){const top=b.y-b.h;if(p.x>=b.x-12&&p.x<=b.x+b.w+12&&oldY<=top+3&&p.y>=top&&p.vy>=0)f=Math.min(f,top);}for(const car of this.cars){const top=car.y-45;if(!car.flying&&p.x>=car.x-15&&p.x<=car.x+140&&oldY<=top+3&&p.y>=top&&p.vy>=0)f=Math.min(f,top);}if(p.y>=f){p.y=f;p.vy=0;p.onGround=true}else p.onGround=false;

      const grounded=p.onGround||p.vy>=0&&f-p.y>=0&&f-p.y<=26;

      if(p.moving&&grounded&&!edge('jump')&&Math.floor(p.walkCycle/Math.PI)>Math.floor(beforeCycle/Math.PI))this.events.push({type:'footstep',player:p.id,x:p.x,y:p.y,crouch:wantsCrouch});}

      this.autoPickups(p);this.interact(p,input,dt);if(input.fire&&!p.healthHeld&&!p.healthUseTime){if(p.mountedTurret)this.shootTurret(p);else if(p.weapon==='pipebomb'){if(!p.prev.fire)this.throwPipeBomb(p);}else this.shoot(p);}if(p.carry){p.carry.x=p.x;p.carry.y=p.y}p.prev={...input};

    }

    distantSpawn(side='east',offset=0,strictSide=false){const level=this.spawnLevel(),maxX=this.routeEnd(level),minX=this.map==='no-mercy'&&this.players.some(p=>!p.ai&&!p.dead&&p.x>=HOSPITAL.start&&p.y<900)?HOSPITAL.start+35:level>SEWER.streetY+70?SEWER.entry+20:20;if(!this.romero&&this.spawnView?.portrait){const view=this.spawnView,margin=Math.max(42,72/(view.zoom||1)),west=view.left-margin-offset,east=view.right+margin+offset,candidates=side==='west'?[west,east]:[east,west];return candidates.find(x=>x>=minX&&x<=maxX&&this.players.every(p=>p.dead||Math.abs(p.x-x)>=75))??null;}if(this.romero){const view=this.spawnView;if(!view||!Number.isFinite(view.left)||!Number.isFinite(view.right))return null;const margin=Math.max(42,60/(view.zoom||1)),west=view.left-margin-offset,east=view.right+margin+offset;const candidates=side==='west'?[west,east]:[east,west];return candidates.find(x=>x>=(level>SEWER.streetY+70?minX:-1100)&&x<=maxX&&(x<=view.left-margin||x>=view.right+margin)&&this.players.every(p=>p.dead||Math.abs(p.x-x)>=100))??null;}const live=this.players.filter(p=>!p.down&&!p.dead);if(!live.length)return null;const left=Math.min(...live.map(p=>p.x)),right=Math.max(...live.map(p=>p.x));if(this.map==='no-mercy'){const west=left>=1200?left-650-offset:20+offset,east=right<=maxX-650?right+650+offset:maxX-offset;const options=side==='west'?[west,east]:[east,west];return (strictSide&&left>=200&&right<=maxX-180?options.slice(0,1):options).find(x=>x>=minX&&x<=maxX&&live.every(p=>Math.abs(p.x-x)>=180))??null;}const west=left-900-offset,east=right+900+offset;const options=side==='west'?[west,east]:[east,west];return options.find(x=>x>=minX&&x<=maxX)??null;}

    spawnGroup(count,side,chooseRole,horde=false){if(this.bossActive)return 0;if(this.romero)return this.spawnRomeroPacks(count,side);let spawned=0;for(let i=0;i<count&&this.zombies.length<this.enemyLimit;i++){if(this.map==='no-mercy'&&this.zombies.filter(z=>z.hp>0&&!['witch','tank','hunter','smoker','boomer'].includes(z.role)).length>=(this.romero?this.enemyLimit:horde?48:24))break;const spawnSide=this.romero?side:this.map==='no-mercy'?((this.commonSpawnSide||0)%2?'east':'west'):side;let x=null;for(let attempt=0;attempt<(this.romero?440:12);attempt++){const candidate=this.distantSpawn(spawnSide,this.romero?attempt*10:this.map==='no-mercy'?attempt*40:i*15+this.rand()*12,this.map==='no-mercy');if(candidate===null)continue;if(this.map!=='no-mercy'||!this.zombies.some(z=>z.hp>0&&Math.abs(z.x-candidate)<(this.romero?9:36)&&Math.abs(z.y-mercyFloor(candidate))<60)){x=candidate;break;}}if(x===null)break;const role=chooseRole(),focus=this.players.find(p=>!p.down),y=this.map==='no-mercy'?this.floor(x,this.spawnLevel()):focus?.y>500?660:floor(x),z=this.addEnemy(role,x,y);if(z){if(this.map==='no-mercy')this.commonSpawnSide=(this.commonSpawnSide||0)+1;z.horde=horde;if(horde&&!['witch','tank','hunter','smoker','boomer'].includes(role))z.speed=310+this.rand()*35;spawned++;}}return spawned;}

    spawnRomeroPacks(count,side){let spawned=0,pack=0;const size=this.difficulty==='expert'?8:6;for(let i=0;i<count&&this.zombies.length<this.enemyLimit;i++){if(i%size===0)pack=this.romeroPackId=(this.romeroPackId||0)+1;let x=null;for(let attempt=0;attempt<260;attempt++){const candidate=this.distantSpawn(side,attempt*24,true);if(candidate===null)continue;const y=this.floor(candidate,this.spawnLevel());if(!this.zombies.some(z=>z.hp>0&&Math.abs(z.y-y)<65&&Math.abs(z.x-candidate)<(z.romeroPack===pack?23:190))){x=candidate;break;}}if(x===null)break;const z=this.addEnemy('shambler',x,this.floor(x,this.spawnLevel()));if(z){z.romeroPack=pack;spawned++;}}return spawned;}

    throwPipeBomb(p,angle=p.angle){if(p.sewerClimbing)return false;if(p.down||p.grab||p.carry||!p.grenades||this.pipeBombs.length>=3)return false;p.grenades--;if(p.weapon==='pipebomb'){p.mag=p.grenades;if(!p.grenades)this.switchWeapon(p,'pistol');}if(p.ai)this.nextBotGrenade=this.time+8;const facing=Math.cos(angle)>=0?1:-1;this.pipeBombs.push({owner:p.id,x:p.x,y:p.y-43,vx:facing*360,vy:-260+Math.sin(angle)*120,fuse:this.romero?20:5,beep:0,flash:0,grounded:false});this.message(this.romero?'PIPE BOMB! Twenty seconds. Walkers follow the beeping.':'PIPE BOMB! Five seconds. The horde follows the beeping.');return true;}

    pipeBombStep(dt){for(const b of this.pipeBombs){b.fuse-=dt;b.flash=Math.max(0,b.flash-dt);b.beep-=dt;if(b.beep<=0){b.beep=b.fuse<1?.12:b.fuse<2?.22:.55;b.flash=.13;this.events.push({type:'pipeBeep',x:b.x});}if(!b.grounded){const nx=clamp(b.x+b.vx*dt,this.routeStart(),this.routeEnd(b.y,b.x));for(const g of this.gates)if(g.hp>0&&!g.open&&(b.x-g.x)*(nx-g.x)<0&&b.y>340&&b.y<420)b.vx*=-.35;b.x=clamp(b.x+b.vx*dt,this.routeStart(),this.routeEnd(b.y,b.x));b.vy+=700*dt;b.y+=b.vy*dt;const f=this.map==='no-mercy'?this.floor(b.x,b.y):b.y>434&&b.x>=900&&b.x<3100?660:floor(b.x);if(b.y>=f-5&&b.vy>0){b.y=f-5;b.vy=0;b.vx=0;b.grounded=true;}}if(b.fuse<=.000001){this.fx(b.x,b.y,90,'#ffc46b');for(const z of this.zombies)if(z.hp>0&&Math.hypot(z.x-b.x,z.y-30-b.y)<340){if(z.role==='witch'){if(!this.clearLane(b.x,b.y-10,z.x,z.y-25))continue;this.provokeWitch(z,this.players.find(p=>p.id===(b.owner??1)));z.hp-=1000;if(z.hp>0)continue;}if(z.role==='tank'){if(!this.clearLane(b.x,b.y-10,z.x,z.y-65))continue;z.hp-=1000;if(z.hp>0){z.stagger=1.25;z.rockWindup=0;z.jumpWindup=0;z.carWindup=0;z.carTarget=null;z.punchFlash=0;z.throwFollow=0;z.attack=Math.max(z.attack,1.6);z.rockCooldown=Math.max(z.rockCooldown||0,2);z.jumpCooldown=Math.max(z.jumpCooldown||0,2);this.message('TANK STUMBLED! Move past him!');continue;}}z.hp=0;if(z.role==='witch')this.witchDeath(z);this.release(z);this.kills++;if(z.role==='boomer')this.explodeBoomer(z);}for(const car of this.alarmCars)if(Math.hypot(car.x+62-b.x,car.y-30-b.y)<340)this.triggerCar(car);this.events.push({type:'explosion',x:b.x,y:b.y});this.message('PIPE BOMB DETONATED!');}}this.pipeBombs=this.pipeBombs.filter(b=>b.fuse>.000001);this.zombies=this.zombies.filter(z=>z.hp>0);}

    roofSmokerStep(){if(this.map!=='no-mercy'||this.romero||this.level==='rooftop')return;this.roofSmokerPerches=this.roofSmokerPerches||[1700].map(x=>({x,y:mercyFloor(x)-400,spawned:false}));for(const perch of this.roofSmokerPerches){if(perch.spawned||!this.players.some(p=>!p.ai&&!p.dead&&p.x>=1000&&p.y<=730&&Math.abs(p.x-perch.x)<850))continue;const z=this.addEnemy('smoker',perch.x,perch.y);if(z){z.roofSmoker=true;z.perchY=perch.y;z.specialCooldown=2;perch.spawned=true;}}}
    smokerFallStep(p,input,dt){if(!p.smokerFall)return false;if(p.dead){p.smokerFall=false;return false;}p.vx=0;p.vy+=1000*dt;p.y+=p.vy*dt;p.onGround=false;p.prev={...input,fire:false};if(p.y>=p.smokerFallFloor){p.y=p.smokerFallFloor;p.vy=0;p.onGround=true;p.smokerFall=false;if(p.smokerFallIncap&&!p.down){this.drop(p);this.releaseTurret(p);Object.assign(p,{down:true,hp:0,tempHp:0,incapHp:200,revive:0,incapCount:Math.min(2,p.incapCount+1),reload:0});this.events.push({type:'tankImpact',x:p.x,y:p.y});this.message(p.name+' incapacitated by the rooftop Smoker fall!');}p.smokerLiftHeight=0;}return true;}
    release(z){for(const p of this.players)if(p.grab===z.id){p.grab=0;if(z.roofSmoker&&(p.smokerLiftHeight||0)>0&&!p.dead){p.smokerFall=true;p.smokerFallFloor=this.floor(p.x,p.smokerGroundY);p.smokerFallIncap=p.smokerLiftHeight>=110;p.vy=0;p.onGround=false;}}z.grabbing=0;z.tongue=null;z.pouncing=false;z.aimTime=0;z.specialCooldown=z.role==='smoker'?5:2.5;}

    latch(z,p){if(p.grab||p.down||p.dead)return;this.drop(p);this.releaseTurret(p);this.cancelDefibrillator(p);p.grab=z.id;p.reload=0;if(z.roofSmoker){p.smokerGroundY=p.y;p.smokerLiftHeight=0;z.hoistTime=0;z.roofAlertAt=this.time+.85;}z.grabbing=Infinity;z.victim=p.id;this.events.push({type:'infectedSound',role:z.role,action:'hit',x:z.x,y:z.y});this.message(z.role==='hunter'?'HUNTER PIN! Your teammate must shoot or shove it off.':'SMOKER TONGUE! Your teammate can shoot the tongue or rescue you.');}

    canSeeEnemy(observer,z){if(this.map!=='no-mercy')return true;if(observer.dead||observer.ledgeHanging||observer.grab||z.hp<=0)return false;if(observer.ai&&z.roofSmoker&&(!z.roofAlertAt||this.time<z.roofAlertAt))return false;const o=weaponOrigin(observer),tx=z.x,ty=z.y-40,d=Math.hypot(tx-o.x,ty-o.y);if(d>1400)return false;if(!this.clearLane(o.x,o.y,tx,ty))return false;if(z.roofSmoker&&this.players.some(p=>p.grab===z.id))return true;if(this.time<(observer.panicUntil||0)&&d<170)return true;if(this.lightVisibility)return this.lightVisibility(observer,z);const delta=Math.abs(Math.atan2(Math.sin(Math.atan2(ty-o.y,tx-o.x)-o.angle),Math.cos(Math.atan2(ty-o.y,tx-o.x)-o.angle)));if(delta>.85||d>900)return false;return observer.flashlight&&!observer.carry&&observer.weapon!=='pipebomb'&&d<450&&delta<.28||FIRE_BARRELS.some(b=>Math.hypot(tx-b.x,ty-(b.y-49))<140&&this.clearLane(b.x,b.y-49,tx,ty));}

    botKnowsEnemy(bot,z){if(!z||z.hp<=0)return false;if(z.roofSmoker&&(!z.roofAlertAt||this.time<z.roofAlertAt))return false;const seen=bot.brain.seen||(bot.brain.seen={});if(this.canSeeEnemy(bot,z)){const first=!seen[z.id];seen[z.id]=this.time+1.1;if(first&&['hunter','smoker','boomer'].includes(z.role)&&this.time>=(this.nextSpotCall?.[z.role]||0)){this.nextSpotCall=this.nextSpotCall||{};this.nextSpotCall[z.role]=this.time+3;bot.speech=z.role.toUpperCase()+'!';bot.speechTime=4;bot.brain.nextTalk=this.time+4;this.events.push({type:survivorName(bot)+'Line',kind:z.role,urgent:true,text:bot.speech,spotted:true});}return true;}return (seen[z.id]||0)>this.time;}

    botAlarmSafe(p,angle=p.angle){if(!p.ai||this.time<(p.panicUntil||0))return true;const o=weaponOrigin(p,angle),ex=o.x+Math.cos(angle)*1600,ey=o.y+Math.sin(angle)*1600;return !this.alarmCars.some(c=>!c.triggered&&!c.flying&&(segmentBox(o.x,o.y,ex,ey,c.x-90,c.y-95,c.x+215,c.y+12)!==null));}

    clearLane(ax,ay,bx,by){if(this.checkpointBlocked(ax,bx,Math.min(ay,by)))return false;if(this.map==='no-mercy'){if(sewerRoofHit(ax,ay,bx,by))return false;for(let i=1;i<40;i++){const t=i/40;const x=ax+(bx-ax)*t,y=ay+(by-ay)*t;if(y>=this.floor(x,y)||x>=SEWER.exit&&x<HOSPITAL.end&&y<=hospitalCeiling(x))return false;}return this.safeDoor.open||!((ax-this.safeDoor.x)*(bx-this.safeDoor.x)<0);} if(this.gates.some(g=>g.hp>0&&!g.open&&(ax-g.x)*(bx-g.x)<0&&ay<480&&by<480))return false;return !((ay<420&&by>434||by<420&&ay>434)&&Math.max(ax,bx)>=900&&Math.min(ax,bx)<=3100);}

    specialEnemy(z,dt){if(!['hunter','smoker','boomer'].includes(z.role))return false;z.specialCooldown=Math.max(0,z.specialCooldown-dt);

      if(z.grabbing){const p=this.players.find(p=>p.grab===z.id);if(!p||p.dead){this.release(z);return true}if(z.role==='hunter'){z.x=p.x;z.y=p.y;this.enemyDamage(p,26*dt);}else if(z.roofSmoker){z.hoistTime=(z.hoistTime||0)+dt;if(z.hoistTime>.1){const dx=z.x-p.x,nx=p.x+Math.sign(dx)*Math.min(Math.max(0,Math.abs(dx)-45),600*dt);if(this.clearLane(p.x,p.y-38,nx,p.y-38))p.x=nx;const target=z.y+20;p.y=Math.max(target,p.y-600*dt);p.smokerLiftHeight=Math.max(p.smokerLiftHeight||0,p.smokerGroundY-p.y);p.onGround=false;p.vy=0;}this.enemyDamage(p,9*dt);}else{const dx=z.x-p.x;if(Math.abs(dx)>65){const nx=p.x+Math.sign(dx)*Math.min(Math.abs(dx)-65,90*dt);if(this.clearLane(p.x,p.y-38,nx,z.y-38)&&Math.abs(p.y-z.y)<65)p.x=nx;}this.enemyDamage(p,9*dt);}return true;}

      const p=this.players.filter(p=>!p.dead&&(z.role==='boomer'||!p.down&&!p.grab)).sort((a,b)=>Math.hypot(a.x-z.x,a.y-z.y)-Math.hypot(b.x-z.x,b.y-z.y))[0];if(!p)return !!z.roofSmoker;

      if(z.dropping){if(z.windowSpawned)z.x-=95*dt;z.vy+=1000*dt;z.y+=z.vy*dt;if(z.y>=z.dropFloor){z.y=z.dropFloor;z.vy=0;z.dropping=false;}return true;}

      if(z.pouncing){z.leapTime=(z.leapTime||0)+dt;const prey=this.players.find(a=>a.id===z.leapTarget&&!a.dead&&!a.down&&!a.grab);if(prey&&z.leapTime<.45){const desired=clamp((prey.x+(prey.vx||0)*.12-z.x)/Math.max(.12,.58-z.leapTime),-1500,1500);z.leapVX+=(desired-z.leapVX)*Math.min(1,dt*8);}const ox=z.x,oy=z.y;z.x=clamp(z.x+z.leapVX*dt,10,this.routeEnd(z.y,z.x));z.vy+=2000*dt;z.y+=z.vy*dt;for(const a of this.players)if(z.vy>0&&!a.dead&&!a.down&&!a.grab&&segment(ox,oy-30,z.x,z.y-30,a.x,a.y-30,38)!==null&&this.clearLane(z.x,z.y-30,a.x,a.y-30)){z.pouncing=false;z.x=a.x;z.y=a.y;z.vy=0;this.latch(z,a);return true;}const f=this.map==='no-mercy'?this.floor(z.x,z.y):z.y>500&&z.x>=900&&z.x<3100?660:floor(z.x);if(z.y>=f&&z.vy>0){z.y=f;z.vy=0;z.pouncing=false;z.specialCooldown=1.2;}return true;}

      if(z.stagger>0){if(z.role==='smoker'&&(z.tongue||z.aimTime>0))z.specialCooldown=Math.max(z.specialCooldown,5);z.windup=0;z.aimTime=0;z.tongue=null;return true;}

      if(!z.roofSmoker&&['hunter','smoker','boomer'].includes(z.role)){if(z.climbing){z.moving=true;z.walkCycle=(z.walkCycle||0)+dt*10;z.vy=0;z.y=Math.max(z.climbY,z.y-(z.role==='hunter'?280:z.role==='smoker'?240:210)*dt);if(z.y<=z.climbY){z.x=z.climbX;z.climbing=false;}return true;}const dx=(this.pipeBombs.at(-1)?.x??p.x)-z.x,nx=clamp(z.x+Math.sign(dx)*Math.min(Math.abs(dx),z.speed*dt),10,this.routeEnd(z.y,z.x)),next=this.floor(nx,z.y);if(next<z.y-26&&this.floor(z.x,z.y)-next>30){if((this.checkpointBlocked(z.x,nx,z.y)||this.map==='no-mercy'&&this.safeDoor.enabled&&!this.safeDoor.open&&(z.x-this.safeDoor.x)*(nx-this.safeDoor.x)<=0))return true;z.climbing=true;z.climbX=nx;z.climbY=next;z.facing=Math.sign(dx)||1;z.crouch=0;z.burstTimer=0;z.vy=0;return true;}}

      if(z.role==='boomer'){const distance=Math.hypot(p.x-z.x,p.y-z.y),lane=this.clearLane(z.x,z.y-35,p.x,p.y-35);if(z.burstTimer>0){if(distance>155||!lane){z.burstTimer=0;}else{z.burstTimer=Math.max(0,z.burstTimer-dt);if(z.burstTimer<=.000001)this.explodeBoomer(z);return true;}}else if(distance<=110&&lane){z.burstTimer=.55;this.events.push({type:'infectedSound',role:z.role,action:'attack',x:z.x,y:z.y});this.message('BOOMER ABOUT TO BURST! Back away!');return true;}}

      if(z.role==='hunter'&&Math.abs(p.y-z.y)<65&&Math.abs(p.x-z.x)<700&&this.clearLane(z.x,z.y-35,p.x,p.y-35)&&!z.specialCooldown){if(!z.crouch)z.crouch=.14;z.crouch-=dt;if(z.crouch<=0){z.crouch=0;z.pouncing=true;this.events.push({type:'infectedSound',role:z.role,action:'attack',x:z.x,y:z.y});z.vy=-580;z.leapTarget=p.id;z.leapTime=0;z.leapVX=clamp((p.x+(p.vx||0)*.2-z.x)/.58,-1500,1500);this.events.push({type:'warning'});}return true;}

      if(z.role==='smoker'){if(z.tongue){const t=z.tongue,ox=t.x,oy=t.y;t.x+=t.vx*dt;t.y+=t.vy*dt;t.left-=dt;for(const a of this.players)if(!a.down&&!a.grab&&segment(ox,oy,t.x,t.y,a.x,a.y-38,19)!==null&&this.clearLane(z.x,z.y-55,a.x,a.y-38)){this.latch(z,a);return true;}if(t.left<=0||!this.clearLane(z.x,z.y-55,t.x,t.y)){z.tongue=null;}return true;}if(Math.hypot(p.x-z.x,p.y-z.y)<1700&&Math.abs(p.y-z.y)<(z.roofSmoker?520:65)&&this.clearLane(z.x,z.y-55,p.x,p.y-38)&&!z.specialCooldown){if(!z.aimTime)z.aimTime=.8;z.aimTime-=dt;if(z.aimTime<=0){z.aimTime=0;z.specialCooldown=5;this.events.push({type:'infectedSound',role:z.role,action:'attack',x:z.x,y:z.y});const a=Math.atan2(p.y-38-(z.y-55),p.x-z.x);z.tongue={x:z.x,y:z.y-55,vx:Math.cos(a)*1100,vy:Math.sin(a)*1100,left:1700/1100+.05};this.events.push({type:'warning'});}return true;}}

      return !!z.roofSmoker;

    }

    explodeBoomer(z){if(z.exploded)return;z.exploded=true;this.events.push({type:'infectedSound',role:'boomer',action:'death',x:z.x,y:z.y});z.hp=0;z.burstTimer=0;this.events.push({type:'boomerBurst',x:z.x,y:z.y});this.fx(z.x,z.y-32,50,'#b5ce45');let coated=false;for(const p of this.players)if(!p.dead&&Math.hypot(p.x-z.x,p.y-z.y)<155&&this.clearLane(z.x,z.y-35,p.x,p.y-35)){p.goo=14;coated=true;}if(coated){this.events.push({type:'warning'});if(this.map==='no-mercy'&&!this.romero&&['common','specials'].includes(this.lift.phase))this.startLiftBoomHorde();else this.startHorde('boomer',24);this.message('BOOMER GOO! A horde is rushing the coated survivors!');}else this.message('Boomer burst safely out of range.');}

    liftEventActive(){return ['common','specials','arrival','boarding','closing','riding','roofOpening'].includes(this.lift.phase);}

    liftEnemy(role,route){const l=this.lift;if(this.zombies.length>=this.enemyLimit){const oldest=this.zombies.find(z=>z.liftEncounter&&!['hunter','smoker','boomer'].includes(z.role));if(oldest)this.zombies=this.zombies.filter(z=>z!==oldest);}const x=l.routes[route]+(this.rand()-.5)*85,z=this.addEnemy(role,x,660);if(z){z.liftEncounter=true;z.liftRoute=route;z.horde=!['hunter','smoker','boomer'].includes(z.role);if(z.horde&&!this.romero)z.speed=280+this.rand()*35;}return z;}

    liftWindowStep(dt){const l=this.lift;if(this.map!=='no-mercy'||this.level==='rooftop'||!['idle','common','specials'].includes(l.phase)||!this.players.some(p=>!p.dead&&!p.down&&p.x>14350&&p.x<15000&&Math.abs(p.y-660)<80))return;l.windowLeft=(l.windowLeft??3)-dt;if(l.windowLeft>0)return;const cap=l.phase==='idle'?4:6;if(this.zombies.filter(z=>z.hp>0&&z.windowSpawned).length>=cap){l.windowLeft=1;return;}const z=this.addEnemy('runner',14952+(this.rand()-.5)*16,584);if(!z){l.windowLeft=1;return;}z.windowSpawned=true;z.dropping=true;z.dropFloor=660;z.vy=-150;z.facing=-1;l.windowLeft=5+this.rand()*3;l.windowLastJump=this.time;this.events.push({type:'infectedSound',role:z.role,action:'attack',x:z.x,y:z.y});}

    setLiftFloor(n){const l=this.lift;n=clamp(n,1,24);if(n!==l.floor){l.previousFloor=l.floor;l.floor=n;l.floorChangedAt=this.time;}}

    liftEncounterStep(dt,inputs=[]){const l=this.lift;if(!l.enabled||l.phase==='idle'||l.phase==='rooftop')return false;

      if(l.phase==='common'||l.phase==='specials'){l.approachElapsed+=dt;this.setLiftFloor(24-Math.floor(l.approachElapsed/4));}if(l.phase==='common'){l.spawnLeft-=dt;if(l.remaining>0&&l.spawnLeft<=0){if(this.liftEnemy('runner',(24-l.remaining)%4)){l.remaining--;l.spawnLeft=.3;}}l.left-=dt;if(l.remaining===0){if(l.left<=0){if(l.wave<4){l.wave++;l.remaining=24;l.left=16;this.events.push({type:'hordeStart'});this.message('Hold the hospital — wave '+l.wave+' / 4.');}else{l.phase='specials';l.left=28;l.spawnLeft=0;l.remaining=9;this.message('Hunters and Smokers! Watch the treatment rooms for Boomers.');}}}return false;}

      if(l.phase==='specials'){l.left-=dt;l.spawnLeft-=dt;if(l.remaining>0&&l.spawnLeft<=0){const i=9-l.remaining,role=i<6?(i%2?'smoker':'hunter'):'boomer',route=i<6?i%4:Math.floor(this.rand()*4);if(this.liftEnemy(role,route)){l.remaining--;l.spawnLeft=i<6?1.3:2.8;}}if(l.left<=0&&l.remaining===0){l.phase='arrival';this.startLiftTankEscape();this.setLiftFloor(1);l.open=true;this.events.push({type:'liftPing'},{type:'liftDoors',open:true,x:l.x});this.message('PING! Floor 1 — press UP at the open lift to enter.');}return false;}

      if(l.phase==='arrival'){if(l.doorProgress===1&&this.players.some((p,i)=>!p.ai&&!p.dead&&!p.down&&!p.grab&&Math.abs(p.x-l.x)<105&&Math.abs(p.y-l.y)<55&&inputs[i]?.jump&&!p.prev.jump)){l.phase='boarding';l.left=2;for(const [i,p]of this.players.filter(p=>p.ai&&!p.dead).entries()){this.cancelBotHeal(p);this.releaseTurret(p);if(p.grab){const z=this.zombies.find(z=>z.id===p.grab);if(z)this.release(z);}p.x=l.x-30+i*45;p.y=l.y;p.vx=p.vy=0;p.sewerClimbing=false;p.onGround=true;p.prev={};}this.message('Survivors entering the lift.');return true;}return false;}

      if(l.phase==='riding'){l.left-=dt;this.setLiftFloor(1+Math.floor(clamp(24-l.left,0,23)));l.hunterTimer-=dt;if(!this.romero&&l.huntersRemaining>0&&l.hunterTimer<=0){const z=this.addEnemy('hunter',l.x+(this.rand()-.5)*90,550);if(z){z.liftHunter=true;z.dropping=true;z.dropFloor=660;l.huntersRemaining--;l.hunterTimer=.8+this.rand()*1.2;l.hatchOpenUntil=this.time+2;this.events.push({type:'liftHatchBreak',x:l.x,y:550});this.events.push({type:'infectedSound',role:'hunter',action:'attack',x:z.x,y:z.y});}}this.players.forEach((p,i)=>{const input=p.ai?{...this.botInput(p),move:0}:inputs[i];this.stepPlayer(p,input,dt);p.x=clamp(p.x,l.x-75,l.x+75);});this.pipeBombStep(dt);for(const z of this.zombies){this.enemyStep(z,dt);z.x=clamp(z.x,l.x-75,l.x+75);}this.bulletsStep(dt);if(this.players.every(p=>p.dead||p.down)&&!this.players.some(p=>p.ledgeHanging||p.fallingOffRoof)){this.status='dead';this.message('Overrun inside the lift.');return true;}if(l.left<=0){l.phase='roofOpening';this.setLiftFloor(24);l.left=1.5;l.open=true;this.players.filter(p=>!p.dead).forEach((p,i)=>{p.x=15205+i*45;p.y=660;});this.zombies=[];this.bullets=[];this.pipeBombs=[];this.events.push({type:'liftPing'},{type:'liftDoors',open:true,x:15250});this.message('Rooftop reached.');}return true;}

      if(['boarding','closing','roofOpening'].includes(l.phase)){for(const [i,p]of this.players.filter(p=>!p.dead).entries()){this.cancelBotHeal(p);this.releaseTurret(p);if(p.grab){const z=this.zombies.find(z=>z.id===p.grab);if(z)this.release(z);}p.sewerClimbing=false;p.vx=p.vy=0;p.onGround=true;p.x+=((l.phase==='roofOpening'?15250:l.x)-45+i*45-p.x)*Math.min(1,dt*4);p.y=660;p.prev={};}l.left-=dt;if(l.phase==='boarding'&&l.left<=0){l.phase='closing';l.left=1.5;l.open=false;this.events.push({type:'liftDoors',open:false,x:l.x});}else if(l.phase==='closing'&&l.left<=0){l.phase='riding';l.left=24;l.hunterTimer=5+this.rand()*5;l.huntersRemaining=this.romero?0:3+Math.floor(this.rand()*3);l.hunterCount=l.huntersRemaining;l.hatchOpenUntil=0;this.zombies=[];this.bullets=[];this.pipeBombs=[];this.message('Going up… Keep watch on the ceiling hatch!');}else if(l.phase==='riding'&&l.left<=0){l.phase='roofOpening';this.setLiftFloor(24);l.left=1.5;l.open=true;this.players.filter(p=>!p.dead).forEach((p,i)=>{p.x=15205+i*45;p.y=660;});this.zombies=[];this.bullets=[];this.tankRocks=[];this.pipeBombs=[];this.events.push({type:'liftPing'},{type:'liftDoors',open:true,x:15250});this.message('Rooftop reached.');}else if(l.phase==='roofOpening'&&l.left<=0){l.phase='rooftop';this.enterRooftop();this.message('Leave the lift — you are on the hospital rooftop.');}return true;}return false;

    }

    liftVentStep(dt){const l=this.lift,a=l.ventDrops||(l.ventDrops={left:5,pending:null,total:0,lastVent:null});const cancel=()=>{if(a.pending){const v=this.hospitalVents.find(v=>v.id===a.pending.vent);if(v)v.openUntil=0;a.pending=null;}};if(this.romero||!['common','specials'].includes(l.phase)||a.total>=6){cancel();return;}const people=this.players.filter(p=>!p.ai&&!p.dead&&!p.down&&p.x>=12500&&p.x<14900&&Math.abs(p.y-660)<65),near=v=>people.some(p=>Math.abs(p.x-v.x)<=350);if(!people.length){cancel();return;}const active=this.zombies.filter(z=>z.hp>0&&z.liftVentBoomer).length;if(a.pending){a.pending.left-=dt;if(a.pending.left>0)return;const v=this.hospitalVents.find(v=>v.id===a.pending.vent);a.pending=null;a.left=6+this.rand()*4;if(!v||!near(v)||active>=2)return;const z=this.addEnemy('boomer',v.x,v.y+80);if(z){z.liftVentBoomer=true;z.ventSpawned=true;z.ventId=v.id;z.liftEncounter=true;z.dropping=true;z.dropFloor=660;a.total++;this.events.push({type:'infectedSound',role:'boomer',action:'attack',x:z.x,y:z.y});}return;}if(active>=2)return;a.left-=dt;if(a.left>0)return;let vents=this.hospitalVents.filter(v=>v.x>=12500&&near(v));const fresh=vents.filter(v=>v.id!==a.lastVent);if(fresh.length)vents=fresh;if(!vents.length){a.left=1;return;}const v=vents[Math.floor(this.rand()*vents.length)];a.lastVent=v.id;a.pending={vent:v.id,left:1};v.openUntil=this.time+2;this.events.push({type:'warning'});this.message('Boomer rattling in the vent above!');}
    hospitalVentStep(dt){this.liftVentStep(dt);if(this.map!=='no-mercy'||this.romero||this.bossActive||this.liftEventActive()||this.lift.phase==='rooftop')return;const living=this.players.filter(p=>!p.dead&&!p.down&&!p.sewerClimbing&&p.x>=HOSPITAL.stairEnd&&p.y>=hospitalFloor(p.x)-65&&p.y<=hospitalFloor(p.x)+5),a=this.ventAmbush;if(!living.length){if(a.pending){const v=this.hospitalVents.find(v=>v.id===a.pending.vent);if(v)v.openUntil=0;a.pending=null;}return;}const active=this.zombies.filter(z=>z.hp>0&&z.ventSpawned).length;if(a.pending){a.pending.left-=dt;if(a.pending.left>0)return;const v=this.hospitalVents.find(v=>v.id===a.pending.vent),role=a.pending.role;a.pending=null;a.left=10+this.rand()*10;if(!v||active>=3||!living.some(p=>Math.abs(p.x-v.x)<650))return;const z=this.addEnemy(role,v.x,v.y+80);if(z){z.ventSpawned=true;z.ventId=v.id;z.dropping=true;z.dropFloor=hospitalFloor(v.x);this.events.push({type:'infectedSound',role,action:'attack',x:z.x,y:z.y});}return;}if(active>=3)return;a.left-=dt;if(a.left>0)return;let vents=this.hospitalVents.filter(v=>v.x<12500&&living.some(p=>Math.abs(p.x-v.x)>=110&&Math.abs(p.x-v.x)<=500));const fresh=vents.filter(v=>v.id!==a.lastVent);if(fresh.length)vents=fresh;if(!vents.length){a.left=2;return;}const v=vents[Math.floor(this.rand()*vents.length)],role=this.rand()<.5?'hunter':'boomer';a.lastVent=v.id;a.pending={vent:v.id,role,left:1};v.openUntil=this.time+2;this.events.push({type:'warning'});this.message('Something is rattling in the ceiling vent!');}

    specialDirector(dt){if(this.liftEventActive()||this.lift.phase==='rooftop')return;if(this.romero||this.bossActive)return;this.specialTimer-=dt;if(this.specialTimer<=0){const role=['hunter','smoker','boomer'][Math.floor(this.rand()*3)],p=this.players.find(p=>!p.down),side=this.rand()<.5?'west':'east',x=this.distantSpawn(side,this.rand()*180);if(p&&x!==null&&!this.zombies.some(z=>z.role===role&&!z.sewerWaiting)){const y=this.map==='no-mercy'?this.floor(x,this.spawnLevel()):p.y>500?660:floor(x),z=this.addEnemy(role,x,role==='boomer'?y-220:y);if(z&&role==='boomer'){z.dropping=true;z.dropFloor=y;}this.message('Something moves beyond the light.');}this.specialTimer=14+this.rand()*13;}if(this.hordeLeft){this.hordeSpawn-=dt;if(this.hordeSpawn<=0&&this.zombies.length<96){const count=Math.min(this.hordeLeft,12),spawned=this.spawnGroup(count,(this.hordeSide++%2===0?'west':'east'),()=> 'runner',true);this.hordeLeft-=spawned;this.hordeSpawn=2.2;}}}

    laserTrace(p,maxRange=950,flashlight=false){if(p.sewerClimbing&&!flashlight)return null;if(p.mountedTurret&&!flashlight)return null;if(!flashlight&&!p.weaponLasers?.[p.weapon]||p.down||p.dead||p.grab||p.carry||p.weapon==='pipebomb')return null;const origin=weaponOrigin(p),dx=Math.cos(origin.angle),dy=Math.sin(origin.angle);let distance=maxRange,target=null;for(const z of this.zombies){if(z.hp<=0)continue;const boxes=enemyHitboxes(z);for(const box of [boxes.head,boxes.body]){const t=segment(origin.x,origin.y,origin.x+dx*maxRange,origin.y+dy*maxRange,box.x,box.y,box.r);if(t!==null&&t*maxRange<distance){distance=t*maxRange;target=z.id;}}}for(let d=0;d<=distance;d+=4){const x=origin.x+dx*d,y=origin.y+dy*d;if(x<0||x>69560||(this.map==='no-mercy'?y>=this.floor(x,y)||this.level!=='rooftop'&&x>=SEWER.exit&&y<=hospitalCeiling(x)||x>SEWER.entry+SEWER.holeWidth&&x<SEWER.exit&&(x<SEWER_LADDER.shaftLeft||x>SEWER_LADDER.shaftRight)&&y>=SEWER.roofY&&y<=SEWER.roofY+18||!this.safeDoor.open&&Math.abs(x-this.safeDoor.x)<5&&y>650:y>=660||(!(x>=900&&x<3100)&&y>=floor(x))||(x>=900&&x<3100&&y>=420&&y<=434))||this.gates.some(g=>g.hp>0&&!g.open&&Math.abs(x-g.x)<5&&y>=340&&y<=420)){distance=d;target=null;break;}}return {x:origin.x,y:origin.y,endX:origin.x+dx*distance,endY:origin.y+dy*distance,target};}

    characterTalk(p,kind='idle'){if(this.time<p.brain.nextTalk||p.dead||p.down||p.grab)return false;const bank=DIALOGUE[p.id===1?'bill':'zoey'],options=bank[kind]||bank.idle;p.speech=options[p.brain.line++%options.length];p.speechTime=6;p.brain.nextTalk=this.time+(p.id===2?12:16);this.events.push({type:survivorName(p)+'Line',kind,urgent:['rescue','hunter','smoker','boomer','horde','loss'].includes(kind),text:p.speech});return true;}

    zoeyTalk(bot,kind='idle'){return this.characterTalk(bot,kind);}

    spotHealthItems(){for(const h of this.healthPickups){if(h.used||h.announced||h.kind!=='pills')continue;const p=this.players.find(p=>!p.dead&&!p.down&&!p.grab&&Math.abs(p.x-h.x)<260&&Math.abs(p.y-h.y)<65&&this.time>=p.brain.nextTalk);if(p){h.announced=true;p.speech='Pills here!';p.speechTime=4;p.brain.nextTalk=this.time+12;this.events.push({type:survivorName(p)+'Line',kind:'pills',text:p.speech});}}}

    dialogueStep(){const bill=this.players[0],zoey=this.players[1];if(this.map==='no-mercy'&&this.safeDoor.open&&this.players.filter(p=>!p.dead).every(p=>p.x>this.safeDoor.x+20)&&!bill.dead&&!bill.down&&!bill.grab&&this.time>=(this.nextDoorReminder||0)){this.nextDoorReminder=this.time+12;bill.brain.nextTalk=this.time+12;this.events.push({type:'billLine',kind:'closeDoor',urgent:true});}if(!zoey)return;if(this.map==='no-mercy'&&!zoey.brain.safeRoomCalled&&!zoey.dead&&!zoey.down&&!zoey.grab&&zoey.hp>20&&this.players.some(p=>!p.dead&&!p.down&&p.x>=this.safeDoor.x-260&&p.x<this.safeDoor.x)){zoey.brain.safeRoomCalled=true;zoey.brain.nextTalk=Math.max(zoey.brain.nextTalk,this.time+12);this.events.push({type:'zoeySafeRoom'});}if(this.map==='no-mercy'&&!zoey.brain.searchedBuildings&&!zoey.dead&&!zoey.down&&!zoey.grab&&zoey.hp>20&&this.players.some(p=>!p.dead&&!p.down&&p.x>=940&&p.x<1260)){zoey.brain.searchedBuildings=true;zoey.brain.nextTalk=Math.max(zoey.brain.nextTalk,this.time+12);zoey.speech="Let's search these buildings.";zoey.speechTime=5;this.events.push({type:'zoeySearch'});}if(this.time>=zoey.brain.nextFun&&!zoey.dead&&!zoey.down&&!zoey.grab&&zoey.hp>20&&this.director.phase!=='assault'&&!this.players.some(p=>p.down||p.grab)&&!this.zombies.some(z=>z.hp>0&&(z.role!=='witch'||z.awake)&&Math.abs(z.x-zoey.x)<450)){let clip=Math.floor(this.rand()*10);if(clip===zoey.brain.lastFun)clip=(clip+1)%10;zoey.brain.lastFun=clip;zoey.brain.nextFun=this.time+30+this.rand()*20;zoey.brain.nextTalk=Math.max(zoey.brain.nextTalk,this.time+12);this.events.push({type:'zoeyFun',clip});}const assault=this.director.phase==='assault'&&this.zombies.filter(z=>z.horde&&this.canSeeEnemy(zoey,z)).length>=3;if(assault&&!zoey.brain.noticedHorde)this.zoeyTalk(zoey,'horde');zoey.brain.noticedHorde=assault;const special=this.zombies.find(z=>['hunter','smoker','boomer'].includes(z.role)&&this.canSeeEnemy(zoey,z)&&Math.abs(z.x-zoey.x)<650);if(special&&!zoey.ai&&zoey.brain.noticedSpecial!==special.id){if(this.zoeyTalk(zoey,special.role))zoey.brain.noticedSpecial=special.id;}for(const p of this.players){const friend=p===bill?zoey:bill;if(friend.dead&&!p.brain.noticedLoss){p.brain.noticedLoss=true;p.brain.nextTalk=Math.min(p.brain.nextTalk,this.time);this.characterTalk(p,'loss');}else if(friend.down&&!p.brain.noticedIncap){p.brain.noticedIncap=true;this.characterTalk(p,'rescue');}else if(!friend.down)p.brain.noticedIncap=false;}

      if(this.time>=bill.brain.nextTalk){let kind='idle';if(!WEAPONS[bill.weapon].unlimitedAmmo&&bill.mag+bill.reserve<20)kind='lowAmmo';else if(this.director.phase==='assault'&&this.zombies.filter(z=>z.horde&&this.canSeeEnemy(bill,z)).length>=3)kind='horde';else{const threat=this.zombies.find(z=>['hunter','smoker','boomer'].includes(z.role)&&this.canSeeEnemy(bill,z)&&Math.abs(z.x-bill.x)<650);if(threat)kind=threat.role;else if(this.map==='no-mercy'){const area=mercySection(bill.x);kind=area==='ROOFTOP'?'rooftop':area==='ALLEY'?'alley':area==='SUBWAY SLOPE'?'subway':area==='SAFE ROOM'?'safe':'idle';}}this.characterTalk(bill,kind);}

    }

    followRouteTarget(bot,leader){if(this.hatchPassable()&&bot.x<SEWER.entry&&bot.y<=SEWER.streetY+70&&leader.y>SEWER.streetY+70)return this.sewerHatch.x;return this.map==='no-mercy'&&bot.x<1940&&bot.y<550&&leader.x>=1940&&leader.y>550?1980:leader.x;}

    botPipeBomb(bot,leader){if(!bot.grenades||bot.dead||bot.down||bot.grab||bot.carry||bot.healthHeld||bot.healthUseTime>0||bot.prev.grenade||this.pipeBombs.length||this.time<(this.nextBotGrenade||0))return {};const commons=this.zombies.filter(z=>this.botKnowsEnemy(bot,z)&&z.hp>0&&['shambler','runner','climber','grabber','breacher'].includes(z.role)&&Math.abs(z.y-bot.y)<90&&Math.abs(z.x-bot.x)<420),rescue=leader.down||leader.grab,nearTeam=commons.filter(z=>this.players.some(p=>!p.dead&&Math.abs(p.y-z.y)<90&&Math.abs(p.x-z.x)<280)),tank=this.zombies.find(z=>this.botKnowsEnemy(bot,z)&&z.hp>0&&z.role==='tank'&&z.stagger<=0&&Math.abs(z.y-bot.y)<90&&Math.abs(z.x-bot.x)<220);if(!(commons.length>=(rescue?4:6)&&nearTeam.length>=3)&&!tank)return {};const left=commons.filter(z=>z.x<bot.x),right=commons.filter(z=>z.x>=bot.x),group=right.length>=left.length?right:left,target=tank?.x??group.reduce((sum,z)=>sum+z.x,0)/group.length,facing=Math.sign(target-bot.x)||bot.facing||1,landing=bot.x+facing*230;if(!this.clearLane(bot.x,bot.y-45,landing,bot.y-45)||this.zombies.some(z=>z.hp>0&&z.role==='witch'&&!z.awake&&Math.abs(z.x-landing)<410&&Math.abs(z.y-bot.y)<110)||this.alarmCars.some(c=>!c.triggered&&Math.abs(c.x+62-landing)<400&&Math.abs(c.y-bot.y)<110))return {};return {grenade:true,grenadeAngle:facing>0?0:Math.PI};}

    scoutTarget(bot,leader){const direction=leader.followDirection??leader.facing??1,followers=this.players.filter(p=>p.ai&&!p.dead&&!p.down).sort((a,b)=>direction*(b.x-a.x)||a.id-b.id),slot=Math.max(0,followers.indexOf(bot));for(let attempt=0;attempt<(this.romero?48:12);attempt++){const x=clamp(leader.x-direction*(85+slot*150+this.rand()*70),this.routeStart(),this.routeEnd(bot.y,bot.x));if(this.players.some(p=>p!==bot&&!p.dead&&Math.abs(p.x-x)<80)||this.zombies.some(z=>z.hp>0&&z.role==='witch'&&!z.awake&&Math.abs(z.x-x)<180)||this.map==='no-mercy'&&this.safeDoor.enabled&&!this.safeDoor.open&&(bot.x-this.safeDoor.x)*(x-this.safeDoor.x)<=0)continue;let safe=true;for(let i=0;i<=12;i++)if(Math.abs(this.floor(bot.x+(x-bot.x)*i/12)-bot.y)>26){safe=false;break;}if(safe)return x;}return bot.x;}

    botInput(bot){this.botLobbySupplies(bot);if(this.lift.escapeStarted&&this.lift.phase==='arrival'&&!bot.dead&&!bot.down&&!bot.grab){const dx=this.lift.x-bot.x;return {move:Math.abs(dx)>35?Math.sign(dx):0,sprint:true,angle:bot.angle};}if(bot.ai&&!bot.dead&&!bot.down&&!bot.grab&&!bot.carry&&!bot.healthHeld&&!bot.healthUseTime&&!bot.beingHealedBy&&!bot.healingOther&&!this.players.some(p=>!p.dead&&(p.down||p.grab))&&bot.x>=14400&&bot.x<15000&&Math.abs(bot.y-660)<55&&this.needsAmmo(bot)){const pile=this.ammoPiles.find(a=>a.x>=14500&&a.x<15000);if(pile&&Math.abs(pile.x-bot.x)<650)return {move:Math.abs(pile.x-bot.x)>70?Math.sign(pile.x-bot.x):0,use:true,sprint:true,angle:bot.angle};}if(bot.down&&!bot.dead){const z=this.zombies.filter(z=>z.hp>0&&(z.role!=='witch'||z.awake)&&this.botKnowsEnemy(bot,z)).sort((a,b)=>Math.hypot(a.x-bot.x,a.y-bot.y)-Math.hypot(b.x-bot.x,b.y-bot.y))[0],point=z?this.botAimPoint(bot,z):null,angle=point?aimAt(bot,point.x,point.y):bot.angle;return {angle,fire:!!point&&!bot.grab&&this.botAlarmSafe(bot,angle)&&this.clearLane(weaponOrigin(bot,angle).x,weaponOrigin(bot,angle).y,point.x,point.y),reload:bot.mag===0};}const hanging=this.players.find(p=>p.ledgeHanging&&!p.dead&&Math.abs(p.ledgeEdge-bot.x)<500);if(hanging&&!bot.down&&!bot.dead&&!bot.grab){const target=hanging.ledgeEdge+(hanging.ledgeEdge===15000?45:-45);return {move:Math.abs(target-bot.x)>20?Math.sign(target-bot.x):0,use:Math.abs(bot.x-hanging.ledgeEdge)<80,angle:bot.angle};}if(this.hatchPassable()&&!bot.dead&&!bot.down&&!bot.grab&&bot.x<SEWER.entry&&bot.y<=SEWER.streetY+70&&this.players.some(p=>!p.ai&&!p.dead&&p.y>SEWER.streetY+70)){const dx=this.sewerHatch.x-bot.x;return {move:Math.abs(dx)>6?Math.sign(dx):0,angle:bot.angle};}const gather=this.safeRooms.find(r=>r.entryOpen&&!r.secured&&this.players.some(p=>!p.ai&&!p.dead&&!p.down&&p.x>r.entry+24&&p.x<r.exit-24));if(gather&&!bot.dead&&!bot.down&&!bot.grab&&!this.players.some(p=>p.down||p.grab)){const target=gather.entry+90+(bot.id-1)*65;return {move:Math.abs(target-bot.x)>12?Math.sign(target-bot.x):0,angle:bot.angle,sprint:true};}if(this.map==='no-mercy'&&!bot.dead&&!bot.down&&!bot.grab&&!this.sewerLadderBlocked()&&!bot.sewerLadderFinished&&bot.x<SEWER.exit&&(bot.sewerClimbing||this.players.some(p=>p!==bot&&!p.ai&&!p.dead&&(p.sewerClimbing||p.sewerLadderFinished)))){const dx=SEWER_LADDER.x-bot.x;return {move:Math.abs(dx)>24?Math.sign(dx):0,jump:!bot.sewerClimbing&&bot.onGround&&Math.abs(dx)<=32&&!bot.prev.jump,angle:-Math.PI/2};}if(!bot.dead&&!bot.down&&!bot.grab&&!bot.carry&&bot.medicine>0&&!bot.healthUseTime&&!this.players.some(p=>!p.dead&&(p.down||p.grab))){const patient=this.players.find(p=>!p.ai&&!p.dead&&!p.down&&!p.grab&&!p.carry&&!p.healthUseTime&&(p.lastStrike||p.hp<=30));if(patient&&!this.zombies.some(z=>z.hp>0&&(z.role!=='witch'||z.awake)&&Math.abs(z.x-patient.x)<140&&Math.abs(z.y-patient.y)<70)){const dx=this.followRouteTarget(bot,patient)-bot.x;if(Math.abs(dx)>60||Math.abs(patient.y-bot.y)>65)return {move:Math.abs(dx)>8?Math.sign(dx):0};}}const others=this.players.filter(p=>p!==bot),emergency=others.filter(p=>!p.dead&&(p.down||p.grab||this.zombies.some(z=>z.hp>0&&z.role==='witch'&&z.awake&&z.target===p.id))).sort((a,b)=>(bot.id===2?Number(b.id===1)-Number(a.id===1):0)||Math.abs(a.x-bot.x)-Math.abs(b.x-bot.x)),player=emergency[0]||others.find(p=>!p.ai&&!p.dead)||others.find(p=>!p.dead&&!p.down)||others[0],cell=this.cells.filter(c=>!c.done&&!c.carrier).sort((a,b)=>Math.abs(a.x-bot.x)-Math.abs(b.x-bot.x))[0];bot.brain.followLeaderId=player.id;const leader=!player.dead?player:this.map==='no-mercy'?{x:this.safeDoor.x+120,y:780,down:false}:bot.carry||!cell?{x:3550,y:660,down:false}:cell;if(bot.down||bot.dead)return {};const witchThreat=this.zombies.find(z=>z.role==='witch'&&z.hp>0&&z.awake&&z.target===player.id);if(!player.dead&&(player.grab||player.down||witchThreat)){if(bot.carry)this.drop(bot);bot.healthUseTime=0;bot.healthHeld=false;bot.brain.mode='rescue';const attacker=this.zombies.find(z=>z.id===player.grab&&z.hp>0)||witchThreat,dx=attacker?.roofSmoker?player.x-bot.x:this.followRouteTarget(bot,player)-bot.x,head=attacker&&this.botKnowsEnemy(bot,attacker)?this.botAimPoint(bot,attacker):null,rescueAngle=head?aimAt(bot,head.x,head.y):aimAt(bot,player.x,player.y-40),origin=weaponOrigin(bot,rescueAngle),near=Math.abs(dx)<70&&Math.abs(player.y-bot.y)<65;if(!bot.brain.lastDown){bot.brain.nextTalk=this.time;this.zoeyTalk(bot,'rescue');}bot.brain.lastDown=true;return {move:Math.abs(dx)>(Math.abs(player.y-bot.y)>65?8:45)?Math.sign(dx):0,angle:rescueAngle,fire:!!head&&this.botAlarmSafe(bot,rescueAngle)&&this.clearLane(origin.x,origin.y,head.x,head.y),shove:bot.shoveCooldown<=0&&!!attacker&&attacker.role!=='witch'&&Math.abs(attacker.x-bot.x)<80&&Math.abs(attacker.y-bot.y)<65&&bot.shove<=0&&!bot.prev.shove,use:player.down&&!player.grab&&!attacker&&near,reload:bot.mag<3&&!bot.reload,sprint:Math.abs(dx)>110&&!near,crouch:false,heal:false,...this.botPipeBomb(bot,player)};}const turret=this.turrets.find(t=>t.playerId===player.id&&player.mountedTurret===t.id),turretCover=!!turret&&!bot.grab&&Math.abs(bot.y-player.y)<65&&!bot.carry,coverDirection=turret?-Math.sign(Math.cos(turret.angle)||1):-1,coverBots=this.players.filter(p=>p.ai&&!p.dead&&!p.down&&!p.grab).sort((a,b)=>a.id-b.id),coverSlot=Math.max(0,coverBots.indexOf(bot));const rescue=this.zombies.find(z=>z.id===leader.grab&&this.botKnowsEnemy(bot,z)),threat=rescue||this.zombies.filter(z=>this.botKnowsEnemy(bot,z)&&z.hp>0&&(z.role!=='witch'||z.awake)&&(z.role==='tank'||z.roofSmoker?Math.abs(z.y-bot.y)<450&&Math.abs(z.x-bot.x)<1700:Math.abs(z.y-bot.y)<100&&Math.abs(z.x-bot.x)<700)).sort((a,b)=>(turretCover?Number((b.x-player.x)*coverDirection>0||Math.abs(b.x-bot.x)<110)-Number((a.x-player.x)*coverDirection>0||Math.abs(a.x-bot.x)<110):0)||(b.role==='witch')-(a.role==='witch')||(b.role==='tank')-(a.role==='tank')||(a.role==='boomer')-(b.role==='boomer')||Math.abs(a.x-bot.x)-Math.abs(b.x-bot.x))[0];let target=rescue?(rescue.role==='hunter'?leader.x:rescue.x):leader.x;const brain=bot.brain;if(!turretCover&&brain.mode==='turret-cover'){brain.mode='cover';brain.nextDecision=0;}let task=null;const hunterNear=this.zombies.some(z=>z.role==='hunter'&&this.botKnowsEnemy(bot,z)&&Math.abs(z.x-bot.x)<650);if(!player.dead&&(player.down||player.grab)&&!brain.lastDown){brain.nextTalk=Math.min(brain.nextTalk,this.time);this.zoeyTalk(bot,'rescue');}else if(hunterNear&&!brain.lastHunter)this.zoeyTalk(bot,'hunter');else if(player.carry&&!brain.lastCarry)this.zoeyTalk(bot,'carry');brain.lastDown=!!(player.down||player.grab);brain.lastHunter=hunterNear;brain.lastCarry=!!player.carry;if(!player.dead&&!player.down&&!player.grab&&Math.abs(bot.y-player.y)<65){if(this.time>=brain.nextDecision){brain.nextDecision=this.time+5+this.rand()*3;const phase=(Math.floor(this.time/6)+bot.id-2)%3;task=[...this.caches.filter(c=>!c.used),...this.weaponPickups.filter(w=>!w.used&&this.canCollectWeapon(bot,w.weapon)),...this.grenadePickups.filter(g=>!g.used&&bot.grenades<1),...this.healthPickups.filter(h=>!h.used&&(h.kind==='kit'?bot.medicine<this.healthCapacity(bot,h.kind):bot.healthItems[h.kind]<1))].filter(t=>Math.abs(t.y-bot.y)<65&&Math.abs(t.x-player.x)<420&&!others.some(p=>p.ai&&!p.dead&&!p.down&&p.brain.mode==='scavenge'&&p.brain.target===t.x)).sort((a,b)=>(!bot.inventory.some(w=>this.primaryWeapon(w))?Number(!!b.weapon&&this.primaryWeapon(b.weapon))-Number(!!a.weapon&&this.primaryWeapon(a.weapon)):0)||Math.abs(a.x-bot.x)-Math.abs(b.x-bot.x))[0];if(!threat&&task&&(phase===1||task.weapon&&this.primaryWeapon(task.weapon)&&!bot.inventory.some(w=>this.primaryWeapon(w)))){brain.mode='scavenge';brain.target=task.x;this.zoeyTalk(bot,'scavenge');}else{brain.mode='patrol';brain.target=this.scoutTarget(bot,player);brain.scoutFacing=this.rand()<.5?-1:1;this.zoeyTalk(bot,'idle');}}if(brain.mode==='scavenge'&&!threat&&Math.abs(brain.target-player.x)<460)target=brain.target;else if(brain.mode==='hold'&&Math.abs(bot.x-player.x)<430)target=brain.target;else if(brain.mode==='patrol'&&!threat&&Math.abs(brain.target-player.x)<430)target=brain.target;else if(threat&&!rescue)target=clamp(threat.x-Math.sign(threat.x-bot.x||1)*240,this.routeStart(),this.routeEnd(bot.y,bot.x));}else brain.mode='cover';let use=!player.dead&&leader.down&&Math.abs(bot.x-leader.x)<70&&Math.abs(bot.y-leader.y)<65;

      if(this.map==='no-mercy'){if(bot.x>=HOSPITAL.stairStart&&bot.x<HOSPITAL.stairEnd&&leader.x>=HOSPITAL.start||Math.abs(bot.y-leader.y)>65||player.x>=1880&&bot.x<1980||player.x>69160){target=player.dead?this.safeDoor.x+120:this.followRouteTarget(bot,leader);brain.mode='cover';}if(bot.x>3850&&this.safeDoor.enabled&&!this.safeDoor.open)use=!bot.prev.use;}

      if(this.map!=='no-mercy'&&Math.abs(bot.y-leader.y)>150&&!rescue){target=bot.x<2000?925:3070;if(Math.abs(bot.x-target)<65)use=true;}

      if(player.dead){const context=this.context(bot);if(context&&['cell','deposit','cache','grenade','weapon'].includes(context.kind))use=!bot.prev.use;}const formation=!turretCover&&!threat&&!player.dead&&!leader.down&&!leader.grab&&Math.abs(bot.y-leader.y)<65&&brain.mode!=='scavenge'&&(Math.abs(leader.vx)>1||Math.abs(bot.x-leader.x)>360||brain.mode!=='patrol')&&(this.map!=='no-mercy'||leader.x<1880||bot.x>=1980&&leader.x<69160);if(formation){if(Math.abs(leader.vx)>1)leader.followDirection=Math.sign(leader.vx);const direction=leader.followDirection??leader.facing??1,followers=this.players.filter(p=>p.ai&&!p.dead&&!p.down).sort((a,b)=>direction*(b.x-a.x)||a.id-b.id),slot=Math.max(0,followers.indexOf(bot));target=clamp(leader.x-direction*(110+slot*100),this.routeStart(),this.routeEnd(leader.y,leader.x));}if(turretCover){target=clamp(turret.x+coverDirection*(220-coverSlot*100),this.routeStart(),this.routeEnd(bot.y,bot.x));brain.mode='turret-cover';brain.target=target;}const dx=target-bot.x,followDistance=turretCover?18:formation?18:brain.mode==='patrol'&&!threat?20:rescue||leader.down||player.dead||brain.mode==='scavenge'?40:Math.abs(bot.y-leader.y)>65?8:90;let move=Math.abs(dx)>followDistance?Math.sign(dx):0;

      if(move&&!rescue&&!leader.down&&!use&&!(brain.mode==='scavenge'&&!bot.inventory.some(w=>this.primaryWeapon(w))&&this.weaponPickups.some(w=>!w.used&&w.x===brain.target&&this.primaryWeapon(w.weapon)))&&this.players.some(p=>p!==bot&&!p.dead&&!p.down&&!p.grab&&Math.abs(p.y-bot.y)<65&&(p.x-bot.x)*move>0&&Math.abs(p.x-bot.x)<80))move=0;

      if(threat?.role==='boomer'&&Math.abs(threat.x-bot.x)<200&&!rescue)move=-Math.sign(threat.x-bot.x);

      const nearby=this.context(bot);if(nearby?.kind==='laser'&&!bot.weaponLasers[bot.weapon]||nearby?.kind==='weapon'||nearby?.kind==='health'||nearby?.kind==='grenade'||brain.mode==='scavenge'&&nearby?.kind==='cache')use=!bot.prev.use;const head=threat?this.botAimPoint(bot,threat):null;const scanning=!move&&!formation&&brain.mode==='patrol'&&!this.zombies.some(z=>z.hp>0&&z.role==='witch'&&!z.awake&&Math.abs(z.x-bot.x)<550),scanAngle=.2+Math.sin(this.time*.65+bot.id*2)*.18;const angle=head?aimAt(bot,head.x,head.y):turretCover?(coverDirection>0?.12:Math.PI-.12):scanning?(brain.scoutFacing>0?scanAngle:Math.PI-scanAngle):((move||bot.facing||1)>0?.12:Math.PI-.12),origin=weaponOrigin(bot,angle);

      const fire=!!threat&&this.botAlarmSafe(bot,angle)&&this.clearLane(origin.x,origin.y,head.x,head.y)&&!this.players.some(p=>p!==bot&&!p.dead&&!p.down&&!p.grab&&segment(origin.x,origin.y,head.x,head.y,p.x,p.y-45+(turretCover&&p.ai?(p.crouchAmount||0)*15:0),17)!==null)&&!(threat.role==='boomer'&&this.players.some(p=>Math.hypot(p.x-threat.x,p.y-threat.y)<180));

      const shove=!!rescue&&Math.abs(rescue.x-bot.x)<80&&Math.abs(rescue.y-bot.y)<65&&bot.shove<=0&&bot.shoveCooldown<=0;

      const gate=this.gates.find(g=>g.hp>0&&!g.open&&Math.abs(bot.x-g.x)<65&&Math.abs(target-bot.x)>90);if(gate)use=true;

      const needsHealing=bot.medicine>0&&(bot.lastStrike||bot.hp+bot.tempHp<45)&&!(this.autoUseItems&&bot.hp+bot.tempHp<=30&&(bot.healthItems.pills>0||bot.healthItems.adrenaline>0));if(!bot.healthUseTime&&needsHealing)bot.healthSelected='kit';

      return {move,angle,fire,crouch:turretCover?coverSlot===0&&Math.abs(dx)<30&&bot.onGround:fire&&!rescue&&!leader.down&&Math.abs(dx)<60&&bot.onGround,reload:bot.mag<3&&!bot.reload,shove:shove&&!bot.prev.shove,use,heal:needsHealing&&!bot.healthUseTime&&(bot.medicine>0||bot.healthItems.pills>0||bot.healthItems.adrenaline>0)&&!bot.prev.heal,sprint:!threat&&Math.abs(dx)>200,...this.botPipeBomb(bot,leader)};

    }

    botRecoveryStep(dt){const humans=this.players.filter(p=>!p.ai&&!p.dead&&!p.down);for(const bot of this.players){const brain=bot.brain;if(!bot.ai||bot.dead||bot.down||bot.grab||bot.carry||bot.knockTime>0||bot.healthUseTime>0||bot.beingHealedBy||bot.healingOther||!humans.length){brain.recovery=null;continue;}const leader=humans.reduce((a,b)=>Math.hypot(b.x-bot.x,b.y-bot.y)<Math.hypot(a.x-bot.x,a.y-bot.y)?b:a);if(Math.hypot(bot.x-leader.x,bot.y-leader.y)<700||this.time<(brain.nextRecovery||0)){brain.recovery=null;continue;}let anchor=brain.recovery;if(!anchor||(Math.abs(bot.x-anchor.x)>25||bot.onGround&&Math.abs(bot.y-anchor.y)>50)){brain.recovery={x:bot.x,y:bot.y,elapsed:0,trying:0};continue;}anchor.elapsed+=dt;if(Math.abs(bot.prev.move||0)>.1)anchor.trying+=dt;if(anchor.elapsed<4||anchor.trying<2.5||!bot.onGround||this.zombies.some(z=>z.hp>0&&(z.role!=='witch'||z.awake)&&Math.hypot(z.x-bot.x,z.y-bot.y)<180))continue;const direction=leader.followDirection??leader.facing??1,offsets=[-direction*(70+bot.id*25),-direction*180,direction*100,-direction*230,direction*180];for(const offset of offsets){const x=clamp(leader.x+offset,this.routeStart(),this.routeEnd(leader.y,leader.x)),y=this.floor(x,leader.y);if(this.checkpointBlocked(bot.x,x,bot.y)||Math.abs(y-leader.y)>35||Math.abs(this.floor(x-18)-y)>24||Math.abs(this.floor(x+18)-y)>24||this.map==='no-mercy'&&this.safeDoor.enabled&&!this.safeDoor.open&&(bot.x-this.safeDoor.x)*(x-this.safeDoor.x)<=0||this.gates.some(g=>g.hp>0&&!g.open&&(bot.x-g.x)*(x-g.x)<=0)||this.cars.some(c=>!c.flying&&x>c.x-20&&x<c.x+145&&Math.abs(c.y-y)<70)||this.players.some(p=>p!==bot&&!p.dead&&Math.abs(p.x-x)<45&&Math.abs(p.y-y)<65)||this.zombies.some(z=>z.hp>0&&Math.abs(z.x-x)<(z.role==='witch'?220:140)&&Math.abs(z.y-y)<100))continue;bot.x=x;bot.y=y;bot.vx=bot.vy=0;bot.onGround=true;bot.prev={};brain.recovery=null;brain.nextRecovery=this.time+12;brain.mode='cover';brain.target=leader.x;this.events.push({type:'botTeleport',player:bot.id,x,y});break;}}}

    spawnTank(x){x=clamp(x,20,this.accessEnd);if(this.romero)return null;if(this.spawnView?.portrait&&x>=this.spawnView.left-100&&x<=this.spawnView.right+100){x=this.distantSpawn('east',100);if(x===null)return null;}if(this.zombies.some(z=>z.role==='tank'&&z.hp>0))return null;const tank=this.addEnemy('tank',x,this.floor(x)-340);if(!tank)return null;tank.dropping=true;tank.dropFloor=this.floor(x);tank.rockCooldown=2;this.tankSpawned=true;this.bossEncounter=true;for(const z of this.zombies)if(z!==tank)this.release(z);this.zombies=[tank,...this.zombies.filter(z=>z!==tank&&z.role==='witch'&&z.hp>0)];this.hordeLeft=this.hordeActive=this.carHordeLeft=this.carHordeTime=0;this.carHordeBoomer=false;for(const p of this.players)if(!p.dead&&!p.down){p.speech='TANK!';p.speechTime=5;}this.events.push({type:'tankSpawn',x,y:tank.y});this.message('TANK! He is dropping from the rooftop!');return tank;}

    knockSurvivor(p,source,damage=45,balanced=false){if(p.dead)return;for(const z of this.zombies)if(z.id===p.grab)this.release(z);if(balanced)this.damage(p,damage);else this.enemyDamage(p,damage);if(p.dead)return;this.drop(p);p.sewerClimbing=false;p.ladderRegrabAt=this.time+1.5;p.knockVX=Math.sign(p.x-source||1)*950;p.knockTime=1.3;p.vy=-430;p.onGround=false;p.reload=0;this.events.push({type:'tankImpact',x:p.x,y:p.y});}

    knockStep(p,dt){if(this.level==='rooftop'){const nx=p.x+p.knockVX*dt;if(nx<15000||nx>18000){p.x=nx;p.fallingOffRoof=true;p.fallScreamed=true;p.knockTime=0;this.releaseTurret(p);this.events.push({type:'survivorDeath',player:p.id});this.message(p.name+' was knocked off the rooftop!');return;}}if(this.level!=='rooftop')p.x=clamp(p.x,this.routeStart(),this.routeEnd(p.y,p.x));const nx=this.level==='rooftop'?p.x+p.knockVX*dt:clamp(p.x+p.knockVX*dt,this.routeStart(),this.routeEnd(p.y,p.x)),blocked=(this.checkpointBlocked(p.x,nx,p.y)||this.map==='no-mercy'&&this.safeDoor.enabled&&!this.safeDoor.open&&(p.x-this.safeDoor.x)*(nx-this.safeDoor.x)<=0);if(!blocked)p.x=nx;else p.knockVX=0;p.knockVX*=Math.exp(-dt*.7);p.vy+=1000*dt;p.y+=p.vy*dt;p.knockTime=Math.max(0,p.knockTime-dt);const ground=this.floor(p.x,p.y);if(p.y>=ground){p.y=ground;p.vy=0;p.onGround=true;p.knockTime=0;}if(p.down){p.incapHp=Math.max(0,p.incapHp-dt);if(p.incapHp<=0)this.die(p);}}

    tankJumpStep(z,dt){

      if(z.jumpWindup>0){z.moving=false;z.jumpWindup=Math.max(0,z.jumpWindup-dt);if(z.jumpWindup===0){z.jumping=true;z.jumpVY=-660;z.jumpVX=(z.jumpTargetX-z.x)/1.1;z.jumpCooldown=z.ladderDrop?4+this.rand()*2:8+this.rand()*4;this.events.push({type:'infectedSound',role:'tank',action:'attack',x:z.x,y:z.y});}return true;}

      if(!z.jumping)return false;z.moving=false;const nx=clamp(z.x+z.jumpVX*dt,this.routeStart(),this.routeEnd(z.y,z.x));if((this.checkpointBlocked(z.x,nx,z.y)||this.map==='no-mercy'&&this.safeDoor.enabled&&!this.safeDoor.open&&(z.x-this.safeDoor.x)*(nx-this.safeDoor.x)<=0))z.jumpVX=0;else z.x=nx;z.jumpVY+=1200*dt;z.y+=z.jumpVY*dt;

      if(z.jumpVY>=0&&z.y>=this.floor(z.x,z.y)){z.y=this.floor(z.x,z.y);z.jumping=false;z.jumpLand=.45;z.attack=Math.max(z.attack,.6);this.events.push({type:'tankImpact',x:z.x,y:z.y});for(const p of this.players)if(z.stagger<=0&&!p.dead&&!p.down&&Math.abs(p.x-z.x)<72&&Math.abs(p.y-z.y)<65&&this.clearLane(z.x,z.y-35,p.x,p.y-35))this.knockSurvivor(p,z.x,30);}return true;

    }

    tankTarget(z){return this.players.filter(p=>!p.dead&&!p.down).sort((a,b)=>Math.hypot(a.x-z.x,a.y-z.y)-Math.hypot(b.x-z.x,b.y-z.y))[0]||null;}

    tankFallStep(z,dt){if(!z.falling&&(z.jumping||z.jumpWindup>0||this.floor(z.x,z.y)<=z.y+26))return false;z.falling=true;z.moving=false;const p=this.tankTarget(z);if(p&&z.stagger<=0){const dx=p.x-z.x,nx=clamp(z.x+Math.sign(dx)*Math.min(Math.abs(dx),z.speed*dt),this.routeStart(),this.routeEnd(z.y,z.x));if(!((this.checkpointBlocked(z.x,nx,z.y)||this.map==='no-mercy'&&this.safeDoor.enabled&&!this.safeDoor.open&&(z.x-this.safeDoor.x)*(nx-this.safeDoor.x)<=0))&&this.floor(nx,z.y)>=z.y-26)z.x=nx;z.facing=Math.sign(dx)||z.facing||1;}z.vy+=1000*dt;z.y+=z.vy*dt;if(z.y>=this.floor(z.x,z.y)){z.y=this.floor(z.x,z.y);z.vy=0;z.falling=false;z.jumpLand=.2;this.events.push({type:'tankImpact',x:z.x,y:z.y});}return true;}

    startLiftTankEscape(){if(this.romero||this.lift.escapeStarted)return;this.lift.escapeStarted=true;this.lift.escapeScene={elapsed:0,duration:5};for(let i=0;i<3;i++){const z=this.addEnemy('tank',SEWER_LADDER.x,SEWER_LADDER.top+85+i*65);if(z){z.liftEscapeTank=true;z.escapeSlot=i;z.escapeClimbing=true;z.speed=650;z.hp=12000;z.facing=1;z.attack=1;}}this.events.push({type:'tankDistantWarning'});this.message('TANKS AT THE SEWER LADDER! Everyone into the lift — NOW!');}
    liftEscapeTankStep(z,dt){z.punchFlash=Math.max(0,(z.punchFlash||0)-dt);z.jumping=false;z.jumpWindup=0;z.rockWindup=0;z.moving=false;if(z.escapeClimbing){z.y=Math.max(SEWER_LADDER.top,z.y-260*dt);if(z.y<=SEWER_LADDER.top){z.escapeClimbing=false;z.x=SEWER_LADDER.landingX+(z.escapeSlot||0)*65;z.y=this.floor(z.x,SEWER_LADDER.top);}z.moving=true;return;}const living=this.players.filter(p=>!p.dead&&!p.down),preferred=living[(z.escapeSlot||0)%Math.max(1,living.length)],near=this.tankTarget(z),p=near&&Math.abs(near.x-z.x)<78&&Math.abs(near.y-z.y)<85?near:preferred;z.target=p?.id||0;if(!p||z.stagger>0)return;const dx=p.x-z.x;z.facing=Math.sign(dx)||1;if(Math.abs(dx)<78&&Math.abs(p.y-z.y)<85){if(z.attack<=0){z.attack=1.5;z.punchFlash=.3;this.knockSurvivor(p,z.x);this.events.push({type:'infectedSound',role:'tank',action:'attack',x:z.x,y:z.y});this.events.push({type:'tankImpact',x:z.x,y:z.y});}return;}const nx=clamp(z.x+Math.sign(dx)*Math.min(Math.abs(dx),z.speed*dt),HOSPITAL.start,this.routeEnd(z.y,z.x));if(this.checkpointBlocked(z.x,nx,z.y))return;z.x=nx;z.y=this.floor(nx,z.y);z.vy=0;z.moving=true;const old=z.walkCycle||0;z.walkCycle=old+z.speed*dt*.035;if(Math.floor(z.walkCycle/Math.PI)>Math.floor(old/Math.PI))this.events.push({type:'infectedSound',role:'tank',action:'footstep',x:z.x,y:z.y});}
    tankStep(z,dt){if(z.liftEscapeTank){this.liftEscapeTankStep(z,dt);return;}z.moving=false;z.turnTime=Math.max(0,(z.turnTime||0)-dt);z.jumpCooldown=Math.max(0,(z.jumpCooldown??(8+this.rand()*4))-dt);z.jumpLand=Math.max(0,(z.jumpLand||0)-dt);z.punchFlash=Math.max(0,(z.punchFlash||0)-dt);z.throwFollow=Math.max(0,(z.throwFollow||0)-dt);z.growlTime=(z.growlTime||0)-dt;if(z.growlTime<=0){z.growlTime=5+this.rand()*3;this.events.push({type:'infectedSound',role:'tank',action:'growl',x:z.x,y:z.y});}if(z.dropping){if(z.ladderDrop&&z.dropDelay>0){z.dropDelay=Math.max(0,z.dropDelay-dt);return;}const oldY=z.y;z.vy+=1000*dt;z.y+=z.vy*dt;if(z.ladderDrop)for(const p of this.players)if(p.sewerClimbing&&Math.abs(p.x-z.x)<55&&oldY<=p.y+15&&z.y>=p.y-77)this.fallOffSewerLadder(p);if(z.y>=z.dropFloor){z.y=z.dropFloor;z.vy=0;z.dropping=false;this.events.push({type:'tankImpact',x:z.x,y:z.y});}return;}const standing=this.tankTarget(z);if(z.target!==standing?.id){const previous=this.players.find(p=>p.id===z.target);z.target=standing?.id||0;z.rockWindup=0;z.jumpWindup=0;if(z.jumping&&standing&&previous&&(previous.down||previous.dead))z.jumpVX=clamp((standing.x-z.x)*1.2,-420,420);}if(!standing){z.rockWindup=0;z.jumpWindup=0;}if(this.tankFallStep(z,dt)||this.tankJumpStep(z,dt)||z.jumpLand>0||z.stagger>0)return;const p=this.tankTarget(z);if(!p)return;const dx=p.x-z.x,facing=Math.sign(dx)||z.facing||1;if(z.facing&&facing!==z.facing){z.turnFrom=z.facing;z.turnTime=.26;}z.facing=facing;z.rockCooldown=Math.max(0,(z.rockCooldown||0)-dt);if(this.tankCarStrike(z,p,dt))return;if(z.rockWindup>0){z.rockWindup-=dt;if(z.rockWindup<=0){const origin={x:z.x+z.facing*35,y:z.y-100},flight=Math.max(.45,Math.abs(dx)/650);this.tankRocks.push({x:origin.x,y:origin.y,vx:(p.x-origin.x)/flight,vy:(p.y-35-origin.y)/flight-400*flight,life:3,spin:0});z.rockCooldown=4+this.rand()*3;z.throwFollow=.4;this.events.push({type:'infectedSound',role:'tank',action:'attack',x:z.x,y:z.y});this.events.push({type:'tankRock',x:z.x,y:z.y});}return;}if(Math.abs(dx)<78&&Math.abs(p.y-z.y)<85&&this.clearLane(z.x,z.y-40,p.x,p.y-40)){if(z.attack<=0){z.attack=1.5;z.punchFlash=.3;this.events.push({type:'infectedSound',role:'tank',action:'attack',x:z.x,y:z.y});this.knockSurvivor(p,z.x);}return;}if((!z.ladderDrop||z.jumpCooldown>0)&&Math.abs(dx)>110&&Math.abs(dx)<1300&&z.rockCooldown<=0&&(Math.abs(dx)>450||this.rand()<dt*.2)&&this.clearLane(z.x,z.y-100,p.x,p.y-35)){z.rockWindup=1.2;this.events.push({type:'infectedSound',role:'tank',action:'rock',x:z.x,y:z.y});return;}if(z.jumpCooldown<=0&&Math.abs(dx)>(z.ladderDrop?180:260)&&Math.abs(dx)<=(z.ladderDrop?700:650)&&Math.abs(p.y-z.y)<100&&this.clearLane(z.x,z.y-100,p.x,p.y-35)){z.jumpWindup=.6;z.jumpTargetX=clamp(z.x+clamp(dx+(this.rand()-.5)*200,-420,420),this.routeStart(),this.routeEnd(z.y,z.x));this.events.push({type:'infectedSound',role:'tank',action:'growl',x:z.x,y:z.y});return;}const nx=clamp(z.x+Math.sign(dx)*z.speed*dt,this.routeStart(),this.routeEnd(z.y,z.x));if(this.clearLane(z.x,z.y-100,nx,this.floor(nx,z.y)>z.y+26?z.y-100:this.floor(nx,z.y)-100)){z.x=nx;if(this.floor(nx,z.y)>z.y+26){z.falling=true;z.vy=0;z.rockWindup=0;}else z.y=this.floor(nx,z.y);z.moving=true;const cycle=z.walkCycle||0;z.walkCycle=cycle+z.speed*dt*.035;if(Math.floor(z.walkCycle/Math.PI)>Math.floor(cycle/Math.PI))this.events.push({type:'infectedSound',role:'tank',action:'footstep',x:z.x,y:z.y});}z.punchFlash=Math.max(0,(z.punchFlash||0)-dt);}

    get bossActive(){return !this.romero&&this.zombies.some(z=>z.role==='tank'&&z.hp>0);}

    bossAftermath(){if(!this.bossEncounter||this.bossActive||this.bossAftermathDone)return;this.bossAftermathDone=true;this.director.left=8;this.specialTimer=20;this.message('TANK DEFEATED! Specials closing in from both sides.');const living=this.players.filter(p=>!p.dead);if(!living.length)return;const center=living.reduce((sum,p)=>sum+p.x,0)/living.length;for(const [i,role] of ['hunter','smoker','boomer','hunter','smoker'].entries()){const direction=i%2?-1:1,x=this.spawnView?.portrait?this.distantSpawn(direction<0?'west':'east',i*55):clamp(center+direction*(550+i*55),20,this.safeDoor.x-100);if(x!==null)this.addEnemy(role,x,this.floor(x));}}

    tankCarStrike(z,p,dt){z.carCooldown=Math.max(0,(z.carCooldown||0)-dt);const car=this.cars.find(c=>c===z.carTarget);

      if(z.carWindup>0){if(!car||car.launched||Math.abs(car.x+62-z.x)>155){z.carWindup=0;z.carTarget=null;return false;}z.carWindup-=dt;z.moving=false;if(z.carWindup<=0){const direction=this.rand()<.5?-1:1;car.launched=true;car.flying=true;car.vx=direction*(280+this.rand()*240);car.vy=-(360+this.rand()*160);car.spin=0;car.hitPlayers=new Set();z.punchFlash=.3;z.carCooldown=8;z.carTarget=null;this.events.push({type:'carWhack',x:car.x,y:car.y});this.fx(car.x+62,car.y-30,20,'#bcb5a1');if(car.isAlarm)this.triggerCar(car);}return true;}

      if(z.carCooldown>0||z.rockWindup>0||z.jumping)return false;

      const nearby=this.cars.find(c=>!c.launched&&Math.abs(c.x+62-z.x)<135&&Math.abs(c.y-z.y)<45&&Math.abs(p.y-z.y)<90&&Math.abs(p.x-(c.x+62))>110);

      if(!nearby)return false;z.carTarget=nearby;z.carWindup=.85;z.facing=Math.sign(nearby.x+62-z.x)||z.facing;this.message('TANK IS SWINGING AT A CAR! Get clear!');this.events.push({type:'infectedSound',role:'tank',action:'attack',x:z.x,y:z.y});return true;

    }

    carsStep(dt){dt*=this.enemyTimeScale??1;for(const car of this.cars){if(!car.flying)continue;const ox=car.x+62,oy=car.y-30;car.vy+=650*dt;car.x+=car.vx*dt;car.y+=car.vy*dt;car.spin=(car.spin||0)+Math.sign(car.vx)*dt*1.2;

        if(Math.abs(car.vx)>140)for(const p of this.players){if(p.dead||p.down||car.hitPlayers.has(p.id))continue;if(segmentBox(ox,oy,car.x+62,car.y-30,p.x-78,p.y-75,p.x+78,p.y+15)!==null){car.hitPlayers.add(p.id);this.knockSurvivor(p,ox,p.hp+(p.tempHp||0),true);this.events.push({type:'carSmash',x:p.x,y:p.y});}}

        const blocked=car.x<10||car.x>this.accessEnd-145||this.map==='no-mercy'&&this.safeDoor.enabled&&!this.safeDoor.open&&(ox-this.safeDoor.x)*(car.x+62-this.safeDoor.x)<=0;if(blocked){car.x=clamp(car.x,10,this.accessEnd-145);if(this.safeDoor.enabled&&car.x+62>this.safeDoor.x)car.x=this.safeDoor.x-125;car.vx=0;car.vy=Math.max(0,car.vy);}

        const floor=this.floor(clamp(car.x+62,10,this.accessEnd));if(car.y>=floor){car.y=floor;if(!car.landed){car.landed=true;this.events.push({type:'carSmash',x:car.x,y:car.y});this.fx(car.x+62,car.y-20,20,'#9e9584');}car.vy=0;car.vx*=Math.exp(-dt*4);car.spin*=Math.exp(-dt*5);if(Math.abs(car.vx)<20){car.vx=0;car.flying=false;car.spin=0;}}

      }}

    tankEncounterStep(dt){if(this.level==='rooftop')return;if(this.romero)return;if(this.map==='no-mercy'&&!this.tankSpawned&&!this.sewerTankWarningPlayed&&this.players.some(p=>!p.dead&&!p.down&&p.x>=SEWER.extensionStart&&p.x<SEWER.extensionStart+500&&p.y>SEWER.floorY)){this.sewerTankWarningPlayed=true;this.events.push({type:'tankDistantWarning'});}if(this.map==='no-mercy'&&!this.tankSpawned&&!this.tankWarningPlayed&&this.players.some(p=>!p.dead&&!p.down&&p.x>=1580&&p.x<1940&&Math.abs(p.y-460)<40)){this.tankWarningPlayed=true;this.events.push({type:'tankDistantWarning'});}for(const rock of this.tankRocks){const ox=rock.x,oy=rock.y;rock.vy+=800*dt;rock.x+=rock.vx*dt;rock.y+=rock.vy*dt;rock.spin+=dt*5;rock.life-=dt;for(const p of this.players)if(!p.dead&&!p.down&&segment(ox,oy,rock.x,rock.y,p.x,p.y-35,32)!==null){this.knockSurvivor(p,ox,35);rock.life=0;break;}if(rock.life>0&&!this.clearLane(ox,oy,rock.x,rock.y)){rock.life=0;this.fx(rock.x,rock.y,12,'#aaa18b');}}this.tankRocks=this.tankRocks.filter(r=>r.life>0);}

    startHorde(reason='random',count=36){if(this.bossActive)return;this.hordeLeft=Math.min(96,this.hordeLeft+count);this.hordeSpawn=0;this.hordeActive=45;this.noise=100;this.randomHordeTimer=65+this.rand()*35;this.events.push({type:'hordeStart',reason});this.message(reason==='car'?'CAR ALARM! Horde incoming from both directions!':'HORDE INCOMING! Watch both directions!');}

    triggerCar(car){if(car.alarmEnabled===false||car.triggered)return false;car.triggered=true;car.alarm=10;this.events.push({type:'carAlarm',x:car.x,y:car.y});this.startHorde('car',0);this.carHordeLeft=this.bossActive?0:80;this.carHordeBoomer=true;this.carHordeTime=this.bossActive?0:30;this.carHordeSpawn=0;this.hordeActive=this.bossActive?0:35;return true;}

    startLiftBoomHorde(){const a=this.lift.bileHorde||(this.lift.bileHorde={ground:0,vents:0,left:0,time:0});a.ground=Math.min(72,a.ground+40);a.vents=Math.min(8,a.vents+4);a.left=0;a.time=18;this.hordeActive=Math.max(this.hordeActive,20);this.noise=100;this.events.push({type:'hordeStart',reason:'boomer'});}
    liftBoomHordeStep(dt){const a=this.lift.bileHorde;if(!a)return;if(!['common','specials'].includes(this.lift.phase)){a.ground=a.vents=0;return;}a.time-=dt;if(a.time<=0){a.ground=a.vents=0;return;}a.left-=dt;if(a.left>0)return;const people=this.players.filter(p=>!p.dead&&p.x>=12500&&p.x<15000&&Math.abs(p.y-660)<85),coated=people.filter(p=>p.goo>0),focus=coated.length?coated:people;if(!focus.length)return;const center=focus.reduce((sum,p)=>sum+p.x,0)/focus.length;let room=48-this.zombies.filter(z=>z.hp>0&&z.liftBileHorde).length;const spawn=(x,y,vent)=>{if(room<=0)return false;const z=this.addEnemy('runner',x,y);if(!z)return false;z.liftBileHorde=true;z.liftEncounter=true;z.horde=true;z.speed=350+this.rand()*25;if(vent){z.liftBileVent=true;z.ventSpawned=true;z.ventId=vent.id;z.dropping=true;z.dropFloor=660;vent.openUntil=this.time+2;}room--;return true;};for(let i=0;i<4;i++)for(const direction of [-1,1])if(a.ground>0){const x=clamp(center+direction*(400+i*26+this.rand()*60),12520,14975);if(spawn(x,660))a.ground--;}if(a.vents>0){const vents=this.hospitalVents.filter(v=>v.x>=13800&&Math.abs(v.x-center)<600);if(vents.length){const v=vents[Math.floor(this.rand()*vents.length)];if(spawn(v.x,v.y+80,v))a.vents--;}}a.left=.7;}
    hordeStep(dt){this.liftBoomHordeStep(dt);if(this.level==='rooftop')return;if(this.carHordeTime>0){if(this.carHordeBoomer&&this.spawnGroup(1,this.hordeSide%2?'east':'west',()=>'boomer',true))this.carHordeBoomer=false;this.carHordeTime=Math.max(0,this.carHordeTime-dt);this.carHordeSpawn-=dt;if(this.carHordeSpawn<=0&&this.carHordeLeft>0){const spawned=this.spawnGroup(Math.min(8,this.carHordeLeft),this.hordeSide++%2?'east':'west',()=>'runner',true);this.carHordeLeft-=spawned;this.carHordeSpawn+=3;}if(this.carHordeTime===0)this.carHordeLeft=0;}for(const car of this.alarmCars)car.alarm=Math.max(0,car.alarm-dt);this.hordeActive=Math.max(0,this.hordeActive-dt);}

    transition(phase,left){this.director.phase=phase;this.director.left=left;}

    directorStep(dt){if(this.liftEventActive()||this.lift.phase==='rooftop')return;if(this.bossActive)return;const d=this.director;if(this.map==='no-mercy'){d.phase='calm';d.budget=0;d.left-=dt;if(d.left<=0){if(this.romero){const count=this.romeroOpeningSpawned?(this.difficulty==='expert'?8:6):(this.difficulty==='expert'?16:12);this.spawnGroup(count,'west',()=> 'shambler',false);this.spawnGroup(count,'east',()=> 'shambler',false);this.romeroOpeningSpawned=true;}else this.spawnGroup(2,'west',()=> 'shambler',false);d.left=this.romero?(this.difficulty==='expert'?7:9):8;}return;}d.left-=dt;d.recentDamage=Math.max(0,d.recentDamage-dt*2);const live=this.players.filter(p=>!p.down);const health=live.reduce((s,p)=>s+p.hp,0)/Math.max(1,live.length),ammo=live.reduce((s,p)=>s+p.mag+p.reserve,0)/Math.max(1,live.length);const meanX=live.reduce((s,p)=>s+p.x,0)/Math.max(1,live.length);

      if(d.phase==='calm'&&d.left<=0){d.round++;d.pattern=['probe','rush','migration','breach'][Math.floor(this.rand()*4)];d.side=this.rand()<.5?'west':'east';if(meanX>2500)d.side='east';d.budget=clamp(Math.round(32+d.round*3+this.noise*.2+live.length*3-(health<40?6:0)-(ammo<40?4:0)),28,64);this.transition('warning',6);this.message(`Steel rattles to the ${d.side.toUpperCase()}. ${d.pattern==='rush'?'Rapid footsteps.':d.pattern==='breach'?'Heavy impacts.':'Something is coming.'}`);this.events.push({type:'warning'});}

      else if(d.phase==='warning'&&d.left<=0){this.transition('assault',32);this.hordeActive=40;this.events.push({type:'hordeStart',reason:'director'});d.spawnTimer=0;d.lastAttack=this.time;}

      else if(d.phase==='assault'){d.spawnTimer-=dt;if(d.budget>0&&d.spawnTimer<=0&&this.zombies.length<96){const side=d.pattern==='migration'&&this.rand()<.3?(d.side==='west'?'east':'west'):d.side;const count=Math.min(d.budget,10+Math.floor(this.rand()*5));const spawned=this.spawnGroup(count,side,()=>{const r=this.rand();if(d.pattern==='rush'&&r<.45)return 'runner';if(d.pattern==='breach'&&r<.2)return 'breacher';if(r<.12)return 'climber';if(r<.2&&d.round>1)return 'grabber';return 'shambler';},true);d.budget-=spawned;d.spawnTimer=3;}

        if((d.budget<=0&&this.zombies.length<4)||d.left<=0){d.budget=0;this.transition('recovery',health<50||d.recentDamage>20?22:14);this.message('The rush is thinning. Reload, search, move.');}}

      else if(d.phase==='recovery'&&d.left<=0)this.transition('calm',7+this.rand()*8);

    }

    romeroFocusTarget(){if(!this.romero)return null;const focus=this.players.find(p=>p.id===this.romeroFocusId&&!p.dead);if(focus)return focus;const down=this.players.find(p=>p.down&&!p.dead);this.romeroFocusId=down?.id||0;return down||null;}

    surroundTarget(z,p,bomb){

      // Local approach slots let rear attackers pass the front rank in this side-on world.

      const clear=()=>{z.surroundSide=0;z.surroundVictim=0;return null;};

      if(bomb||p.id==null||this.lure&&!z.horde&&!this.romeroFocusTarget()||Math.abs(p.x-z.x)>240||Math.abs(p.y-z.y)>45||z.climbing||z.descending||z.pileLevel!=null||z.pileFalling)return clear();

      const incoming=Math.sign(z.x-p.x)||1,offset=22+(z.id%3)*5;

      const reachable=side=>{const x=p.x+side*offset;return x>=10&&x<WORLD.end-10&&Math.abs(this.floor(x)-p.y)<=24&&(this.map!=='no-mercy'||this.safeDoor.open||(z.x-this.safeDoor.x)*(x-this.safeDoor.x)>0)&&!this.gates.some(g=>g.hp>0&&!g.open&&z.y<480&&(z.x-g.x)*(x-g.x)<=0);};

      const counts=this.surroundCounts?.get(p.id)||[0,0];if(!this.surroundCounts)this.surroundCounts=new Map();this.surroundCounts.set(p.id,counts);

      if(z.surroundVictim!==p.id||!z.surroundSide||!reachable(z.surroundSide)){let side=counts[0]===counts[1]?incoming:counts[0]<counts[1]?-1:1;if(!reachable(side))side=-side;if(!reachable(side))return clear();z.surroundSide=side;z.surroundVictim=p.id;counts[side<0?0:1]++;}

      return p.x+z.surroundSide*offset;

    }

    ledgeLeapStep(z,dt){if(z.sewerClimbing){z.y=Math.max(SEWER_LADDER.top,z.y-170*dt);z.moving=true;if(z.y<=SEWER_LADDER.top){z.x=SEWER_LADDER.landingX;z.sewerClimbing=false;z.vy=0;}return true;}

      if(z.ledgeLeaping){let nx=clamp(z.x+z.ledgeVX*dt,10,WORLD.end-10);if(this.map==='no-mercy'&&z.x>=SEWER.entry-32&&z.x<SEWER.entry+150&&z.y<SEWER.roofY+78)nx=Math.min(nx,SEWER.entry+SEWER.holeWidth-16);if(this.map!=='no-mercy'||this.safeDoor.open||(z.x-this.safeDoor.x)*(nx-this.safeDoor.x)>0)z.x=nx;z.vy+=1000*dt;z.y+=z.vy*dt;z.moving=true;const ground=this.floor(z.x,z.y);if(z.vy>0&&z.y>=ground){z.y=ground;z.vy=0;z.ledgeLeaping=false;z.ledgeVX=0;}return true;}

      if(z.grabbing||z.grab||z.climbing||z.dropping||z.pouncing||z.stagger>0)return false;

      const edge=this.map==='no-mercy'&&z.x>=SEWER.entry-32?SEWER.entry:this.map==='no-mercy'?1940:3100;

      const target=this.pipeBombs.at(-1)||this.romeroFocusTarget()||this.players.filter(p=>!p.dead).sort((a,b)=>Math.hypot(a.x-z.x,a.y-z.y)-Math.hypot(b.x-z.x,b.y-z.y))[0];

      if(this.map==='no-mercy'&&target&&target.x>=SEWER.exit&&target.y<850&&z.x>=SEWER.exit-85&&z.x<SEWER.exit&&z.y>850){z.sewerClimbing=true;z.x=SEWER.ladderX;z.vy=0;z.windup=0;return true;}if(!target||target.x<edge||target.y<550||z.x<edge-32||z.x>=edge||Math.abs(z.y-this.floor(z.x,z.y))>3)return false;

      z.ledgeLeaping=true;z.ledgeVX=150+(z.id%7)*22;z.vy=-90-(z.id%4)*18;z.windup=0;z.moving=true;return true;

    }

    commonTarget(z,live){if(z.windup>0&&z.attackVictim){const locked=live.find(p=>p.id===z.attackVictim);if(locked)return locked;}const distance=p=>Math.abs(p.x-z.x)+Math.abs(p.y-z.y)*2,nearest=live.reduce((a,b)=>!a||distance(b)<distance(a)?b:a,null);if(!nearest)return null;const reachable=live.filter(p=>Math.abs(p.x-z.x)<48&&Math.abs(p.y-z.y)<60&&this.clearLane(z.x,z.y-35,p.x,p.y-35)),local=live.filter(p=>distance(p)<=distance(nearest)+160&&Math.abs(p.y-z.y)<85&&this.clearLane(z.x,z.y-35,p.x,p.y-35));let candidates=reachable.length?reachable:local;if(!candidates.length)candidates=[nearest];const standing=candidates.filter(p=>!p.down);if(standing.length)candidates=standing;const previous=candidates.find(p=>p.id===z.target);if(previous&&this.time<(z.nextTargetCheck||0))return previous;const pressure=p=>{let count=0;const nearby=this.enemyBins?[...Array(7)].flatMap((_,i)=>this.enemyBins.get(Math.floor(p.x/80)-3+i)||[]):this.zombies;for(const other of nearby)if(other!==z&&other.hp>0&&other.target===p.id&&Math.abs(other.x-p.x)<240&&!['tank','witch','hunter','smoker','boomer'].includes(other.role))count++;return count;};const chosen=candidates.reduce((a,b)=>!a||distance(b)+pressure(b)*28-(b.id===z.target?12:0)<distance(a)+pressure(a)*28-(a.id===z.target?12:0)?b:a,null);z.nextTargetCheck=this.time+.65+(z.id%4)*.1;z.target=chosen.id;return chosen;}

    enemyStep(z,dt){const ox=z.x,oy=z.y,ladderExit=z.sewerClimbing&&Math.abs(z.x-SEWER_LADDER.x)<2&&oy<=SEWER_LADDER.top+4;if(z.sewerWaiting){if(z.hp>=enemyHealth[z.role]&&!this.players.some(p=>!p.dead&&p.y>SEWER.streetY+70&&Math.hypot(p.x-z.x,p.y-z.y)<=600))return;z.sewerWaiting=false;}this.enemyMoveStep(z,dt);if(this.map==='no-mercy'){const throughSide=!z.liftEscapeTank&&!ladderExit&&ox<HOSPITAL.start&&z.x>=HOSPITAL.start,throughFloor=!z.liftEscapeTank&&oy>=900&&z.y<900&&z.x>=HOSPITAL.start;if(throughSide||throughFloor){z.x=ox;z.y=oy;z.vy=0;z.climbing=false;z.pouncing=false;z.moving=false;}if(z.x>=HOSPITAL.start&&z.x<HOSPITAL.end&&z.y<900&&!z.dropping&&z.y<hospitalCeiling(z.x)+80){z.y=hospitalCeiling(z.x)+80;z.vy=Math.max(0,z.vy);}}if(this.barricade&&z.x>this.routeEnd(z.y,z.x)){z.x=this.routeEnd(z.y,z.x);z.vx=0;}}

    enemyMoveStep(z,dt){if(this.romero){z.speed=18;z.horde=false;}dt*=this.enemyTimeScale??1;z.pileStumble=Math.max(0,(z.pileStumble||0)-dt);z.attack-=dt;z.stagger=Math.max(0,z.stagger-dt);if(z.hp<=0)return;if(z.liftBileVent&&z.dropping){z.vy+=1000*dt;z.y+=z.vy*dt;if(z.y>=z.dropFloor){z.y=z.dropFloor;z.vy=0;z.dropping=false;}return;}if(z.role==='tank'){this.tankStep(z,dt);return;}if(z.role==='witch'){this.witchStep(z,dt);return;}if(this.ledgeLeapStep(z,dt))return;if(this.specialEnemy(z,dt))return;if(!this.romero&&this.hordeActive>0&&!['tank','witch','hunter','smoker','boomer'].includes(z.role)){z.horde=true;z.speed=Math.max(z.speed,310+(z.id%8)*5);}const focus=this.romeroFocusTarget(),bomb=focus?null:this.pipeBombs.at(-1);const alive=this.players.filter(p=>!p.dead),coated=alive.filter(p=>p.goo>0),live=coated.length?coated:alive;let p=focus||(this.romero?live.reduce((a,b)=>!a||Math.abs(b.x-z.x)+Math.abs(b.y-z.y)<Math.abs(a.x-z.x)+Math.abs(a.y-z.y)?b:a,null):this.commonTarget(z,live));if(!p)return;if(this.romero){z.target=p.id;z.rushing=!bomb&&Math.hypot(p.x-z.x,p.y-z.y)<=160;z.speed=z.rushing?300:18;}if(bomb){p={x:bomb.x,y:bomb.y+5};z.windup=0;z.grabbing=0;for(const a of this.players)if(a.grab===z.id)a.grab=0;}

      if(z.grabbing>0){const victim=this.players.find(a=>a.grab===z.id);z.grabbing-=dt;if(z.grabbing<=0){if(victim)victim.grab=0;z.attack=2}else if(victim)this.enemyDamage(victim,dt*5);return}

      if(z.windup>0){z.windup-=dt;if(z.windup<=0&&Math.abs(p.x-z.x)<50&&Math.abs(p.y-z.y)<65&&this.clearLane(z.x,z.y-35,p.x,p.y-35)){if(z.role==='grabber'&&!p.down&&!this.players.some(a=>a.grab)){p.grab=z.id;z.grabbing=3;this.message('Grabbed! F / LB shoves free; partner can shoot or shove.')}else this.enemyDamage(p,z.role==='runner'&&this.difficulty==='expert'?12:8);z.attack=1.2}return}

      if(z.stagger>0)return;if(this.map==='no-mercy'){this.mercyEnemy(z,p,bomb,dt);return;}if(z.descending){z.y+=dt*240;z.vy=0;if(z.y>=660){z.y=660;z.descending=false;}return;}if(bomb&&p.y>500&&z.y<500&&z.x>=900&&z.x<3100){const ladder=p.x<2000?925:3070;if(Math.abs(z.x-ladder)<24){z.descending=true;return;}}if(z.climbing){z.y-=dt*(bomb?235:z.role==='climber'?180:95);z.vy=0;if(z.y<=420){z.y=420;z.x=z.climbing===3130?3070:925;z.climbing=0}return}const useLure=bomb||!focus&&this.lure&&!z.horde&&!live.some(a=>a.goo>0)&&Math.abs(p.x-z.x)>150;if(!bomb&&(p.goo>0||z.horde)){const coated=live.filter(a=>a.goo>0);if(coated.length)p=coated.reduce((a,b)=>Math.abs(a.x-z.x)<Math.abs(b.x-z.x)?a:b); }const flank=this.surroundTarget(z,p,bomb);let target=flank??(bomb?bomb.x+(z.id%7-3)*4:useLure&&!p.goo&&!z.horde?this.lure.x:p.x);

      if((!useLure||bomb)&&p.y<500&&z.y>500&&z.x>=3000){target=z.x>=3100?3130:3070;if(Math.abs(z.x-target)<24){z.climbing=3130;return}}

      if((!useLure||bomb)&&p.y<500&&z.y>500&&z.x>=900&&z.x<3000){target=925;if(Math.abs(z.x-target)<24){z.climbing=925;return}}

      if(bomb&&p.y>500&&z.y<500&&z.x>=900&&z.x<3100)target=p.x<2000?925:3070;const dx=target-z.x;let nx=clamp(z.x+Math.sign(dx)*(this.romero?z.speed:bomb?Math.max(z.speed,335):z.speed)*dt,10,this.accessEnd);if(Math.abs(dx)<(bomb?3:flank!==null?2:23))nx=z.x;

      const g=this.gates.find(g=>g.hp>0&&!g.open&&z.y<480&&(z.x-g.x)*(nx-g.x)<=0);if(g){nx=z.x;if(z.attack<=0){g.hp=Math.max(0,g.hp-(z.role==='breacher'?30:7));z.attack=1;this.fx(g.x,390,4,'#9f9d76');if(!g.hp)this.message('Gate breached. Your firing lane is open.')}}

      if(floor(nx)<z.y-25&&!(z.y>500&&z.x>=900&&z.x<3100))nx=z.x;

      // Only the actor's immediate bucket neighbours participate in crowd spacing.

      if(this.enemyBins&&!bomb&&flank===null){const k=Math.floor(z.x/80);let checked=0;for(let n=k-1;n<=k+1&&checked<12;n++){for(const other of this.enemyBins.get(n)||[]){if(other===z||other.hp<=0||ignoresCrowd(z,other)||z.horde&&other.role==='witch')continue;if(++checked>12)break;if(Math.abs(other.y-z.y)<35&&Math.abs(other.x-nx)<9&&Math.sign(target-z.x)===Math.sign(other.x-z.x)){nx=z.x;break}}}}

      z.moving=Math.abs(nx-z.x)>.001;if(z.moving)z.walkCycle=(z.walkCycle||0)+Math.abs(nx-z.x)*.10;if(Math.abs(z.y-this.sandbagFloor(z.x))<3&&Math.abs(this.sandbagFloor(nx)-this.sandbagFloor(z.x))<=24){z.y=this.sandbagFloor(nx);z.vy=0;}z.x=nx;z.vy+=1000*dt;z.y+=z.vy*dt;const f=this.map==='no-mercy'?this.sandbagFloor(z.x):z.y>500&&z.x>=900&&z.x<3100?660:this.sandbagFloor(z.x);if(z.y>=f){z.y=f;z.vy=0}

      if(!useLure&&(flank===null||Math.sign(z.x-p.x)===z.surroundSide)&&Math.abs(p.x-z.x)<38&&Math.abs(p.y-z.y)<60&&z.attack<=0)z.windup=this.romero?.22:z.role==='grabber'?.65:z.role==='runner'?.32:.5;

    }

    hordePileStep(z,p,bomb,dt){

      const common=!['witch','tank','hunter','smoker','boomer'].includes(z.role),active=z.horde&&common&&!bomb&&p.x<1940&&p.y<=480&&z.x>=1940&&z.x<2110;

      const release=()=>{z.pileLevel=null;z.pileClimbing=false;z.pileFalling=true;z.pileStumble=.6;};

      if(z.pileFalling){z.moving=true;z.x=Math.max(1950,z.x+dt*35);z.vy+=1000*dt;z.y+=z.vy*dt;if(z.y>=660){z.y=660;z.vy=0;z.pileFalling=false;}return true;}

      if(active&&z.pileLevel==null&&!z.pileClimbing&&z.x>1990)return false;

      if(!active){if(z.pileLevel!=null||z.pileClimbing){release();return true;}return false;}

      const members=this.zombies.filter(a=>a!==z&&a.hp>0&&a.horde&&a.pileLevel!=null&&a.stagger<=0&&Math.abs(a.x-1958)<35).sort((a,b)=>a.pileLevel-b.pileLevel),settled=a=>Math.abs(a.y-(660-a.pileLevel*48))<3;

      if(z.pileLevel!=null){if(z.pileLevel>0&&!members.some(a=>a.pileLevel===z.pileLevel-1&&settled(a))){release();return true;}const targetX=1958+(z.pileLevel%2?6:-6),targetY=660-z.pileLevel*48;z.x+=clamp(targetX-z.x,-z.speed*dt,z.speed*dt);z.y=Math.max(targetY,z.y-105*dt);z.vy=0;z.pileClimbing=z.y>targetY+2;z.moving=z.pileClimbing;z.walkCycle=(z.walkCycle||0)+dt*8;return true;}

      const missing=[0,1,2,3].find(level=>!members.some(a=>a.pileLevel===level));

      if(missing!==undefined&&(missing===0||members.some(a=>a.pileLevel===missing-1&&settled(a)))){z.pileLevel=missing;z.pileClimbing=missing>0;z.vy=0;return true;}

      const full=[0,1,2,3].every(level=>members.some(a=>a.pileLevel===level&&settled(a)));

      if(!full){if(z.pileClimbing&&z.y<640){release();return true;}z.moving=false;z.pileClimbing=false;return false;}

      z.pileClimbing=true;z.moving=true;z.vy=0;z.x+=clamp(1950-z.x,-z.speed*dt,z.speed*dt);z.walkCycle=(z.walkCycle||0)+dt*10;z.pileGrip=(z.pileGrip||0)-dt;if(z.pileGrip<=0){z.pileGrip=.85+this.rand()*.5;z.pileStumble=.18;}z.y=z.pileStumble>0?Math.min(660,z.y+35*dt):Math.max(460,z.y-125*dt);

      if(z.y<=460){z.x=1920;z.y=460;z.pileClimbing=false;z.pileStumble=.55;z.pileGrip=0;}return true;

    }

    mercyEnemy(z,p,bomb,dt){if(this.hordePileStep(z,p,bomb,dt))return;const flank=this.surroundTarget(z,p,bomb),target=flank??(bomb?bomb.x+(z.id%7-3)*4:this.lure&&!z.horde&&!this.romeroFocusTarget()?this.lure.x:p.x),dx=target-z.x,onStairs=z.x>=620&&z.x<940||z.x>=1260&&z.x<1580||z.x>=68840&&z.x<69160,rushing=z.horde||!!bomb,speed=this.romero?z.speed:rushing&&onStairs?Math.max(370,z.speed):bomb?Math.max(335,z.speed):z.speed;let nx=clamp(z.x+Math.sign(dx)*Math.min(Math.abs(dx),speed*dt),this.romero?Math.min(10,z.x):10,this.routeEnd(z.y,z.x));if(Math.abs(dx)<(bomb?3:flank!==null?2:20))nx=z.x;if(this.checkpointBlocked(z.x,nx,z.y)||!this.safeDoor.open&&(z.x-this.safeDoor.x)*(nx-this.safeDoor.x)<=0)nx=z.x;const f=this.sandbagFloor(nx,z.y);if(f<z.y-26&&z.y>=this.floor(z.x,z.y)-2){if(this.floor(z.x,z.y)-f>30)nx=z.x;}for(const other of bomb||flank!==null?[]:this.zombies){if(other===z||other.hp<=0||ignoresCrowd(z,other)||z.horde&&other.role==='witch'||Math.abs(other.y-z.y)>=65||(other.x-z.x)*Math.sign(dx)<=0)continue;const packGap=this.romero&&!bomb&&!z.rushing&&!this.romeroFocusTarget()&&z.romeroPack&&other.romeroPack&&z.romeroPack!==other.romeroPack;const gap=packGap?190:this.romero?24:z.horde&&!(p.x<1940&&p.y<=480&&z.x>=1940&&z.x<2110)&&!['tank','hunter','smoker','boomer','witch'].includes(other.role)?34+(z.id%4)*3:10;if(Math.sign(dx)>0)nx=Math.max(z.x,Math.min(nx,other.x-gap));else nx=Math.min(z.x,Math.max(nx,other.x+gap));}z.moving=Math.abs(nx-z.x)>.001;if(z.moving)z.walkCycle=(z.walkCycle||0)+Math.abs(nx-z.x)*.1;const oldFloor=this.sandbagFloor(z.x,z.y);z.x=nx;if(Math.abs(z.y-oldFloor)<3&&Math.abs(this.sandbagFloor(nx,z.y)-oldFloor)<=24){z.y=this.sandbagFloor(nx,z.y);z.vy=0;}else{z.vy+=1000*dt;z.y+=z.vy*dt;}if(z.y>=this.sandbagFloor(z.x,z.y)){z.y=this.sandbagFloor(z.x,z.y);z.vy=0;}if(!bomb&&(flank===null||Math.sign(z.x-p.x)===z.surroundSide)&&Math.abs(p.x-z.x)<38&&Math.abs(p.y-z.y)<60&&z.attack<=0){z.attackVictim=p.id;z.windup=this.romero?.22:z.role==='runner'?.32:.5;}}

    witchDeath(z){if(z.deathSoundPlayed)return;z.deathSoundPlayed=true;this.events.push({type:'witchDeath',x:z.x,y:z.y});}

    provokeWitch(z,player){if(z.awake||z.hp<=0||!player||player.dead)return;z.awake=true;z.agitation=1;z.target=player.id;z.attack=.15;z.slashes=0;this.message(`WITCH STARTLED! She is chasing ${player.name}!`);this.events.push({type:'witchStartled',player:player.id,x:z.x,y:z.y});}

    witchStep(z,dt){z.moving=false;if(!z.awake){z.x=z.restX??z.x;z.y=z.restY??z.y;const contact=this.players.find(p=>!p.dead&&!p.down&&Math.abs(p.x-z.x)<30&&Math.abs(p.y-z.y)<65);if(contact){this.provokeWitch(z,contact);return;}const lit=this.players.slice().sort((a,b)=>Math.hypot(a.x-z.x,a.y-z.y)-Math.hypot(b.x-z.x,b.y-z.y)).find(p=>{if(!p.flashlight||p.dead||p.down||p.grab||p.carry||p.weapon==='pipebomb')return false;const ray=this.laserTrace(p,550,true);if(!ray)return false;const origin=weaponOrigin(p),dx=z.x-origin.x,dy=z.y-40-origin.y,along=dx*Math.cos(origin.angle)+dy*Math.sin(origin.angle),side=Math.abs(-dx*Math.sin(origin.angle)+dy*Math.cos(origin.angle));return along>0&&along<550&&side<10+along*.24&&Math.hypot(ray.endX-ray.x,ray.endY-ray.y)>=along-32&&this.clearLane(origin.x,origin.y,z.x,z.y-40);});const before=z.agitation||0,closeLight=lit&&Math.hypot(lit.x-z.x,lit.y-z.y)<=180,limit=closeLight?1:lit?.45:0;z.agitation=before<limit?Math.min(limit,before+dt/(closeLight?4:6)):Math.max(limit,before-dt/2.5);if(lit)z.facing=Math.sign(lit.x-z.x)||1;for(const threshold of [.2,.65])if(before<threshold&&z.agitation>=threshold)this.events.push({type:'witchAgitated',witch:z.id,x:z.x,y:z.y,stage:threshold});if(closeLight&&z.agitation>=1){this.provokeWitch(z,lit);return;}const nearby=this.players.find(p=>!p.dead&&Math.hypot(p.x-z.x,p.y-z.y)<380);z.cryTimer=(z.cryTimer||0)-dt;if(nearby&&z.cryTimer<=0&&z.agitation<.1){z.cryTimer=6.2;this.events.push({type:'witchCry',witch:z.id,x:z.x,y:z.y});}return;}

      const p=this.players.find(p=>p.id===z.target);if(!p||p.dead){z.fleeing=true;z.x=clamp(z.x+(z.x<2100?-1:1)*z.speed*dt,10,this.routeEnd(z.y,z.x));z.moving=true;return;}if(z.stagger>0)return;

      if(z.climbing){z.moving=true;z.walkCycle=(z.walkCycle||0)+dt*9;z.vy=0;z.y=Math.max(z.climbY,z.y-240*dt);if(z.y<=z.climbY){z.y=z.climbY;z.x=z.climbX;z.climbing=false;}return;}

      const dx=p.x-z.x,old=z.x;z.facing=Math.sign(dx)||z.facing||1;let nx=clamp(z.x+Math.sign(dx)*Math.min(Math.abs(dx),z.speed*dt),10,this.routeEnd(z.y,z.x));

      if(this.map==='no-mercy'){if(this.checkpointBlocked(z.x,nx,z.y)||!this.safeDoor.open&&(z.x-this.safeDoor.x)*(nx-this.safeDoor.x)<=0)nx=z.x;const next=this.floor(nx,z.y);if(next<z.y-26&&this.floor(z.x,z.y)-next>30){z.climbing=true;z.climbX=nx;z.climbY=next;z.vy=0;return;}}else{const next=floor(nx);if(next<z.y-26&&floor(z.x)-next>30){z.climbing=true;z.climbX=nx;z.climbY=next;z.vy=0;return;}for(const g of this.gates)if(g.hp>0&&!g.open&&(z.x-g.x)*(nx-g.x)<=0){nx=z.x;if(z.attack<=0){g.hp=Math.max(0,g.hp-80);z.attack=.5;}}}

      z.x=nx;z.moving=Math.abs(z.x-old)>.001;if(z.moving)z.walkCycle=(z.walkCycle||0)+Math.abs(z.x-old)*.055;z.vy+=1000*dt;z.y+=z.vy*dt;const f=this.floor(z.x,z.y);if(z.y>=f){z.y=f;z.vy=0;}

      if(Math.abs(p.x-z.x)<48&&Math.abs(p.y-z.y)<65&&this.clearLane(z.x,z.y-35,p.x,p.y-35)&&z.attack<=0){z.attack=.85;z.slashFlash=.2;if(!p.down){this.enemyDamage(p,p.hp+(p.tempHp||0));z.slashes=0;this.message(`${p.name} incapacitated by the Witch! Kill her before she finishes them!`);}else{z.slashes++;this.enemyDamage(p,20);if(z.slashes>=5&&!p.dead)this.die(p);}this.events.push({type:'witchSlash',player:p.id,x:p.x,y:p.y});}

      z.slashFlash=Math.max(0,(z.slashFlash||0)-dt);

    }

    bulletsStep(dt){const bins=new Map();for(const z of this.zombies){const k=Math.floor(z.x/100);if(!bins.has(k))bins.set(k,[]);bins.get(k).push(z)}

      for(const b of this.bullets){b.px=b.x;b.py=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(this.checkpointBlocked(b.px,b.x,Math.min(b.py,b.y))){b.life=0;continue;}for(const z of this.zombies){if(z.role!=='smoker'||!z.tongue)continue;const v=this.players.find(p=>p.grab===z.id),end=v?{x:v.x,y:v.y-38}:z.tongue;const dx=end.x-z.x,dy=end.y-(z.y-55),count=Math.ceil(Math.hypot(dx,dy)/8);for(let i=0;i<=count;i++){if(segment(b.px,b.py,b.x,b.y,z.x+dx*i/Math.max(1,count),z.y-55+dy*i/Math.max(1,count),5)!==null){this.release(z);b.life=0;break}}}if(b.life<=0)continue;let target=null,first=2,head=false;for(let k=Math.floor(Math.min(b.px,b.x)/100)-1;k<=Math.floor(Math.max(b.px,b.x)/100)+1;k++){for(const z of bins.get(k)||[]){if(z.hp<=0)continue;const boxes=enemyHitboxes(z),h=segment(b.px,b.py,b.x,b.y,boxes.head.x,boxes.head.y,boxes.head.r),body=this.romero||b.weapon==="deagle"?segmentBox(b.px,b.py,b.x,b.y,z.x-15,z.y-56,z.x+15,z.y):(()=>{const torso=segment(b.px,b.py,b.x,b.y,boxes.body.x,boxes.body.y,boxes.body.r),legs=segment(b.px,b.py,b.x,b.y,z.x,z.y-12,z.role==='tank'?23:12);return torso===null?legs:legs===null?torso:Math.min(torso,legs);})();const t=h!==null&& (body===null||h<=body)?h:body;if(t!==null&&t<first){target=z;first=t;head=t===h}}}let carHit=null;for(const car of this.alarmCars){const hits=[segmentBox(b.px,b.py,b.x,b.y,car.x,car.y-40,car.x+125,car.y-12),segmentBox(b.px,b.py,b.x,b.y,car.x+30,car.y-61,car.x+95,car.y-36)].filter(t=>t!==null),t=hits.length?Math.min(...hits):null;if(t!==null&&t<first){first=t;carHit=car;}}if(carHit){this.triggerCar(carHit);b.life=0;continue;}if(target){if(target.role==='witch')this.provokeWitch(target,this.players.find(p=>p.id===(b.player??1)));if(target.grabbing&&['hunter','smoker'].includes(target.role))this.release(target);const common=!['witch','tank','hunter','smoker','boomer'].includes(target.role),commonDamage=head?b.commonHeadDamage:b.commonBodyDamage;target.hp-=b.weapon==='deagle'&&common?target.hp:b.turret?(target.role==='tank'?350:target.hp):this.romero?(head?enemyHealth[target.role]/(b.weapon==='smg'?4:b.weapon==='rifle'?2:5):0):common&&commonDamage!=null?commonDamage*enemyHealth[target.role]/240:head?(b.headDamage??PISTOL.headDamage):(b.bodyDamage??PISTOL.bodyDamage);target.stagger=['witch','tank'].includes(target.role)?0:.18;if(this.romero&&!head){const pushed=clamp(target.x+(Math.sign(b.vx)||1)*12,10,WORLD.end-10);if(this.floor(pushed)>=target.y-26&&(this.map!=='no-mercy'||this.safeDoor.open||(target.x-this.safeDoor.x)*(pushed-this.safeDoor.x)>0))target.x=pushed;target.windup=0;target.attack=Math.max(target.attack,.2);}b.life=0;this.fx(target.x,target.y-(head?56:32),head?8:4,head?'#cfdb86':'#9b554c');this.events.push({type:'hit',head});if(target.hp<=.000001){if(target.role==='witch')this.witchDeath(target);if(['hunter','smoker'].includes(target.role))this.events.push({type:'infectedSound',role:target.role,action:'death',x:target.x,y:target.y});if(target.role==='boomer')this.explodeBoomer(target);this.events.push({type:'kill',player:b.player??1,role:target.role,head});this.kills++;if(head)this.heads++;for(const p of this.players)if(p.grab===target.id)p.grab=0;this.fx(target.x,target.y-30,6,'#53665b');}}const onDeck=b.x>=900&&b.x<3100;const terrain=this.map==='no-mercy'?b.y>=this.floor(b.x,b.y)||b.x>=SEWER.exit&&b.x<HOSPITAL.end&&b.y<=hospitalCeiling(b.x)||sewerRoofHit(b.px,b.py,b.x,b.y)||!this.safeDoor.open&&(b.px-this.safeDoor.x)*(b.x-this.safeDoor.x)<0:onDeck?(b.y>=660||(b.py<=420&&b.y>=420)):b.y>=floor(b.x);if(b.x<0||b.x>WORLD.end||terrain)b.life=0;}

      this.bullets=this.bullets.filter(b=>b.life>0);for(const z of this.zombies)if(z.hp<=0&&z.grabbing)this.release(z);this.zombies=this.zombies.filter(z=>z.hp>0);

    }

    survivorSpacingStep(dt){const active=this.players.filter(p=>!p.dead&&!p.down&&!p.grab&&p.onGround&&!p.knockTime&&!p.beingHealedBy&&!p.healingOther);const shift=(p,amount)=>{const nx=clamp(p.x+amount,this.routeStart(),this.routeEnd(p.y,p.x));if(Math.abs(this.floor(nx,p.y)-p.y)>26||(this.checkpointBlocked(p.x,nx,p.y)||this.map==='no-mercy'&&this.safeDoor.enabled&&!this.safeDoor.open&&(p.x-this.safeDoor.x)*(nx-this.safeDoor.x)<=0)||this.zombies.some(z=>z.hp>0&&(z.role!=='witch'||z.awake)&&z.stagger<=0&&Math.abs(z.y-p.y)<48&&Math.abs(nx-z.x)<19))return false;const moved=nx-p.x;p.x=nx;p.y=this.floor(nx,p.y);if(Math.abs(moved)>.01){p.moving=true;p.walkCycle+=Math.abs(moved)*.04;}return true;};for(let pass=0;pass<2;pass++)for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){const a=active[i],b=active[j],gap=Math.abs(b.x-a.x);if(Math.abs(a.y-b.y)>65||gap>=72||(!a.ai&&!b.ai)||a.prev.use||b.prev.use||[a,b].some(p=>p.ai&&p.brain.mode==='scavenge'&&!p.inventory.some(w=>this.primaryWeapon(w))&&this.weaponPickups.some(w=>!w.used&&w.x===p.brain.target&&this.primaryWeapon(w.weapon))))continue;const direction=Math.sign(b.x-a.x)||Math.sign(b.id-a.id),amount=Math.min(72-gap,dt*180);if(a.ai&&b.ai){const first=shift(a,-direction*amount/2),second=shift(b,direction*amount/2);if(!first&&second)shift(b,direction*amount/2);else if(first&&!second)shift(a,-direction*amount/2);}else shift(a.ai?a:b,(a.ai?-direction:direction)*amount);}}

    enterFrogRoom(p){if(this.secretVisit||p.ai||p.dead||p.down||p.grab||!this.secretDoorOpen||Math.abs(p.x-11290)>100||Math.abs(p.y-660)>60)return false;this.secretVisit={player:p.id,elapsed:0,voiceLeft:0,line:0,returnX:p.x,returnY:p.y,host:this.secretHostState||(this.secretHostState={hp:50000,maxHp:50000,marks:[],dead:false}),blood:[]};this.secretVisit.combat=this.secretVisit.host.dead;p.hp=300;p.tempHp=0;this.message('Frog room HP boost: +200% · 300 HP.');p.x=-400;p.y=660;p.vx=p.vy=0;p.onGround=true;this.releaseTurret(p);this.events.push({type:'secretRoomEnter'});return true;}

    exitFrogRoom(p,automatic=false){const v=this.secretVisit;if(!v||p.id!==v.player||!automatic&&(v.cutaway||p.x<=-220))return false;p.x=v.returnX;p.y=v.returnY;p.vx=p.vy=0;p.moving=false;p.prev={};this.secretVisit=null;this.events.push({type:'secretRoomExit'});return true;}

    secretRoomCombatStep(p,input,dt){const v=this.secretVisit;p.shot=Math.max(0,p.shot-dt);p.flash=Math.max(0,p.flash-dt);v.shotFlash=Math.max(0,(v.shotFlash||0)-dt);v.host.hitFlash=Math.max(0,(v.host.hitFlash||0)-dt);if(p.dead){v.deadLeft=(v.deadLeft??3)-dt;if(v.deadLeft<=0)this.exitFrogRoom(p,true);return;}if(!v.cutaway){if((input.reload||p.mag===0)&&!p.reload)this.reload(p);if(p.reload>0){p.reload=Math.max(0,p.reload-dt);if(!p.reload){const w=WEAPONS[p.weapon],n=Math.min(w.magazine-p.mag,p.reserve);p.mag+=n;p.reserve-=n;}}if(input.fire&&p.mag>0&&!p.reload&&p.shot<=0&&p.weapon!=='pipebomb'){const w=WEAPONS[p.weapon];p.angle=Number.isFinite(input.angle)?input.angle:p.angle;if(this.shoot(p)){this.bullets=this.bullets.filter(b=>b.player!==p.id);v.shotFlash=.1;v.shotAngle=p.angle;v.shotHit=input.secretHit!==false;if(v.shotHit&&!v.host.dead){v.host.hp=Math.max(0,v.host.hp-w.bodyDamage);v.host.hitFlash=.2;v.host.marks.push({x:(this.rand()-.5)*.13,y:.34+this.rand()*.4});if(v.host.marks.length>80)v.host.marks.shift();v.combat=true;v.castLeft=v.castLeft??1.3;this.events.push({type:'secretHostHit'});if(v.host.hp<=0){v.host.dead=true;v.burning=false;this.events.push({type:'secretHostDefeated'});}}}}}

      if(!v.combat||v.host.dead||p.dead)return;if(!v.burning){v.castLeft-=dt;if(v.castLeft<=0){v.burning=true;v.burnVoiceLeft=0;this.events.push({type:'secretFireCast',player:p.id});}return;}v.burnVoiceLeft-=dt;if(v.burnVoiceLeft<=0){v.burnVoiceLeft=2;this.events.push({type:'secretBurnHurt',player:p.id});}p.hurt=.25;p.hp=Math.max(0,p.hp-16*dt);p.tempHp=0;if(p.hp<=.000001){v.burning=false;this.die(p);}}

    secretRoomStep(dt,inputs){const v=this.secretVisit,p=this.players.find(p=>p.id===v.player);v.elapsed+=dt;v.voiceLeft-=dt;if(!v.combat&&v.elapsed>=48&&!v.cutaway){v.cutaway=true;v.line=0;v.voiceLeft=0;this.events.push({type:'secretDoorCutaway'});}if(!v.combat&&v.elapsed>=108){this.exitFrogRoom(p,true);return;}const input=inputs[this.players.indexOf(p)]||{};if(input.jump&&!p.prev.jump){this.exitFrogRoom(p,true);return;}this.secretRoomCombatStep(p,input,dt);if(!this.secretVisit)return;p.x=clamp(p.x+(p.dead?0:input.move||0)*160*dt,-520,-100);p.moving=!!input.move;p.vx=(input.move||0)*160;p.walkCycle+=Math.abs(p.vx)*dt*.04;p.angle=Number.isFinite(input.angle)?input.angle:0;!v.combat&&v.voiceLeft<=0&&(this.events.push({type:'secretRoomJoke',line:v.line++,cutaway:!!v.cutaway}),v.voiceLeft=v.cutaway?4:v.line%2===0?4:7);if(!v.cutaway&&p.x>-220&&((input.use&&!p.prev.use)||(input.shove&&!p.prev.shove)))this.exitFrogRoom(p);else p.prev={...input}; }

    step(dt,inputs=[]){if(this.secretVisit){if(this.status==='playing')this.secretRoomStep(dt,inputs);return;}if(this.status!=='playing')return;this.time+=dt;if(this.defibShock)this.defibShock.left=Math.max(0,this.defibShock.left-dt);if(this.lift.escapeScene){const scene=this.lift.escapeScene;scene.elapsed+=dt;if(scene.elapsed>=scene.duration){this.lift.escapeScene=null;this.events.push({type:'liftEscapeReturn'});this.message('RUN TO THE LIFT! Press UP / JUMP inside the open doors!');}return;}this.storyPropsStep(dt);this.liftWindowStep(dt);if(this.liftEncounterStep(dt,inputs))return;this.rooftopEncounterStep(dt);this.turretStep(dt);this.botHealStep(dt);this.noise=Math.max(0,this.noise-dt*2.5);this.players.forEach((p,i)=>this.stepPlayer(p,p.ai?this.botInput(p):inputs[i],dt));this.botRecoveryStep(dt);this.survivorSpacingStep(dt);for(const p of this.players)if(p.down&&!this.players.some(a=>a!==p&&!a.down&&!a.dead&&!a.grab&&a.prev.use&&Math.abs(a.x-p.x)<75&&(p.ledgeHanging||Math.abs(a.y-p.y)<65)))p.revive=p.ledgeHanging?0:Math.max(0,p.revive-dt*2);

      this.tankEncounterStep(dt);this.carsStep(dt);this.hordeStep(dt);this.spotHealthItems();this.dialogueStep();this.pipeBombStep(dt);this.directorStep(dt);this.specialDirector(dt);this.roofSmokerStep();this.hospitalVentStep(dt);for(const zone of this.zones){zone.stress=Math.max(0,zone.stress-dt*5);if(zone.stress>=90&&!zone.warning){zone.warning=3;this.message('RESONANCE BREACH: service access opens in 3 seconds. Leave the ringing span!');this.events.push({type:'warning'})}if(zone.warning){zone.warning-=dt;if(zone.warning<=0){zone.warning=0;zone.stress=25;this.spawnGroup(8,this.rand()<.5?'west':'east',()=> 'climber',true);this.fx((zone.x+zone.end)/2,420,15,'#ded094')}}}

      if(this.lure){this.lure.life-=dt;if(this.lure.life<=0)this.lure=null}this.surroundCounts=new Map();for(const z of this.zombies){if(z.hp<=0||!z.surroundSide)continue;const p=this.players.find(p=>p.id===z.surroundVictim&&!p.dead);if(!p||Math.abs(p.x-z.x)>240||Math.abs(p.y-z.y)>45)continue;const counts=this.surroundCounts.get(p.id)||[0,0];counts[z.surroundSide<0?0:1]++;this.surroundCounts.set(p.id,counts);}this.enemyBins=new Map();for(const z of this.zombies){const k=Math.floor(z.x/80);if(!this.enemyBins.has(k))this.enemyBins.set(k,[]);this.enemyBins.get(k).push(z)}for(const z of this.zombies)this.enemyStep(z,dt);this.bulletsStep(dt);this.bossAftermath();for(const fx of this.effects){fx.x+=fx.vx*dt;fx.y+=fx.vy*dt;fx.vy+=350*dt;fx.life-=dt}this.effects=this.effects.filter(fx=>fx.life>0);

      if(this.players.every(p=>p.dead||p.down)){this.status='dead';this.message('Overrun. No survivor can revive the team.');}

      if(this.status==='playing'&&this.map!=='no-mercy'&&this.delivered===3&&this.players.some(p=>!p.dead)&&this.players.filter(p=>!p.dead).every(p=>!p.down&&Math.abs(p.x-3550)<160&&p.y>600)){this.status='won';this.message('Power recovered. The surviving team made it out.');}

    }

  }

  return {Run,WORLD,BARRICADE,SEWER,SEWER_SECTIONS,SEWER_PLATFORMS,SEWER_ENCOUNTERS,SEWER_LADDER,HOSPITAL,HOSPITAL_VENTS,hospitalFloor,hospitalCeiling,MAP_LANDMARKS,floor,mercyFloor,mercySection,segment,roles,PISTOL,WEAPONS,enemyHealth,healthState,SPRITES,bodyPose,weaponOrigin,enemyHitboxes,weaponSpread,DIALOGUE,BILL_ARMS,ZOEY_ARMS,CHLOE_ARMS,survivorName,survivorArms,aimAt,DARK_ZONES,FIRE_BARRELS,WITCH_SPRITES};

})();

if(typeof module!=='undefined')module.exports=DW;







































