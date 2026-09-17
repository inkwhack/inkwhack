 'use strict';

const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');

const ui=Object.fromEntries(['health','intro','pause','death','result','announcement','sound','stamina','objective','wave','ammo','weapon-state','weapon-name','zoey-dialogue','scrap','partner','heat','noise','resonance','context','run-info','ending-label','ending-title','bill-card','zoey-card','bill-hp','zoey-hp','bill-state','zoey-state','partner-health','bill-revive','zoey-revive','bill-temp','zoey-temp','chloe-card','chloe-hp','chloe-state','chloe-health','chloe-revive','chloe-temp'].map(id=>[id,document.getElementById(id)]));

let autoUseItems=true;

let controlledIndex=0,viewZoom=1,cameraMeanY=null,cameraReady=false,controllerIndex=1;

const mobileMode=!/Linux.*x86_64/i.test(navigator.userAgent)&&(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.maxTouchPoints>0&&matchMedia('(pointer:coarse)').matches&&!matchMedia('(any-pointer:fine)').matches));

const touchPulses={};

const touchInput={move:0,angle:null,fire:false,crouch:false};

function clearTouchInput(){for(const key of Object.keys(touchPulses))delete touchPulses[key];touchInput.move=0;touchInput.angle=null;touchInput.fire=false;touchInput.crouch=false;for(const key of ['jump','sprint','shove','use','reload','heal','grenade'])touchInput[key]=false;document.querySelectorAll('.stick-thumb').forEach(t=>t.style.transform='translate(-50%,-50%)');document.querySelectorAll('[data-touch]').forEach(b=>{b.classList.remove('held');if(b.dataset.touch==='crouch')b.setAttribute('aria-pressed','false');});}



let W=innerWidth,H=innerHeight,dpr=1,state='intro',last=0,time=0,camera=650,shake=0,run=null,player=null,zombies=[],bullets=[],particles=[],casings=[],kills=0,heads=0,announceClock=0,accumulator=0,padId=null,joinDown=false,frameCount=0,fps=60,fpsClock=0,hitFlash=0,pendingFlashlightToggle=false;

const world=DW.WORLD,keys=new Set(),mouse={x:W*.65,y:H*.5,down:false};

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),floorAt=x=>run?run.floor(x):DW.mercyFloor(x);

let audio=null,sound=true,noiseBuffer=null,dialogueAudio=null;

const gameOverSound=typeof Audio==='undefined'?null:new Audio('game_sounds/music/undeath/leftfordeath.wav');

let gameOverPlayed=false;

let pendingBillReply=null,nextBillReply=0;

function queueBillReply(kind='replyChat',character='bill'){if(!run||run.time<nextBillReply||state!=='playing'||!sound)return;if(!SOUND_LIBRARY.survivors[character]?.[kind]?.length)kind='replyChat';pendingBillReply={kind,character,at:run.time+.65,expires:run.time+6};for(const p of run.players)p.brain.nextTalk=Math.max(p.brain.nextTalk,run.time+2);}

function updateBillReply(){if(!pendingBillReply)return;const reply=pendingBillReply;if(!sound||state!=='playing'||run.time>reply.expires||run.players.some(p=>p.dead||p.down||p.grab)){pendingBillReply=null;return;}if(run.time<reply.at||dialogueAudio&&!dialogueAudio.paused||activeZoeyScream&&!activeZoeyScream.paused)return;if(reply.kind==='replyChat'&&(run.director.phase==='assault'||run.zombies.some(z=>z.hp>0&&(z.role!=='witch'||z.awake)&&Math.abs(z.x-player.x)<350))){pendingBillReply=null;return;}pendingBillReply=null;nextBillReply=run.time+12;speakDialogue({type:reply.character==='zoey'?'zoeyLine':'billLine',kind:reply.kind});}

function stopGameOverSound(){if(gameOverSound){gameOverSound.pause();gameOverSound.currentTime=0;}gameOverPlayed=false;}

function playGameOverSound(){if(!sound||!gameOverSound||gameOverPlayed)return;gameOverPlayed=true;gameOverSound.volume=.65;gameOverSound.currentTime=0;gameOverSound.play().catch(()=>{});}

function stopDialogue(){pendingBillReply=null;if(dialogueAudio){dialogueAudio.pause();dialogueAudio.currentTime=0;dialogueAudio=null;}}

function resize(){W=innerWidth;H=innerHeight;dpr=Math.min(devicePixelRatio||1,mobileMode?1.5:2);canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}

addEventListener('resize',resize);resize();

function cameraActors(){const living=run?.players.filter(p=>!p.dead)||[],pile=run?.zombies.filter(z=>z.hp>0&&(z.pileLevel!=null||z.pileClimbing||z.pileFalling||z.climbing&&['hunter','smoker','boomer'].includes(z.role))&&living.some(p=>Math.abs(p.x-z.x)<600))||[];const tanks=(run?.zombies||[]).filter(z=>{if(z.role!=='tank'||z.hp<=0)return false;const distance=living.length?Math.min(...living.map(p=>Math.abs(p.x-z.x))):Infinity;z.cameraTracked=distance<(z.cameraTracked?1650:1400);return z.cameraTracked;}).map(z=>({x:z.x,y:z.y-90}));return [...living,...pile,...tanks];}

function verticalOffset(){const mean=cameraMeanY??player?.y??world.ground,blend=clamp((1-viewZoom)/.2,0,1),anchor=H*.66*(1-blend)+((210+H-155)/2+40*viewZoom)*blend;return anchor-mean*viewZoom;}

function aim(){return DW.aimAt(player,mouse.x/viewZoom+camera,(mouse.y-verticalOffset())/viewZoom);}

function initAudio(){if(!audio){try{audio=new(window.AudioContext||window.webkitAudioContext)();noiseBuffer=audio.createBuffer(1,Math.floor(audio.sampleRate*.12),audio.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);}catch{}}if(audio)audio.resume()}

function tone(f,d=.1,volume=.04){if(!sound||!audio)return;const osc=audio.createOscillator(),gain=audio.createGain();osc.type='triangle';osc.frequency.value=f;gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+d)}

const shoveSounds=typeof Audio==='undefined'?[]:[

'game_sounds/player/survivor/swing/swish_weaponswing_swipe3.wav',

'game_sounds/player/survivor/swing/swish_weaponswing_swipe4.wav',

'game_sounds/player/survivor/swing/swish_weaponswing_swipe5.wav',

'game_sounds/player/survivor/swing/swish_weaponswing_swipe6.wav'

].map(file=>{const clip=new Audio(file);clip.preload='auto';return clip;});

let shoveSoundIndex=0;

function shoveSound(event){if(!sound||!shoveSounds.length)return;const actor=run.players.find(p=>p.id===event.player);if(!actor)return;const distance=Math.abs(actor.x-player.x);if(distance>850)return;const clip=shoveSounds[shoveSoundIndex++%shoveSounds.length];clip.currentTime=0;clip.volume=(actor===player?.65:.35)*Math.max(0,1-distance/850);clip.play().catch(()=>{});}

const pistolSounds=typeof Audio==='undefined'?[]:Array.from({length:8},()=>{const clip=new Audio('game_sounds/effects/pistol_fire.wav');clip.preload='auto';clip.volume=.30;return clip;});

const smgSounds=typeof Audio==='undefined'?[]:Array.from({length:16},()=>{const clip=new Audio('game_sounds/effects/smg_fire_1.wav');clip.preload='auto';clip.volume=.45;return clip;});

const rifleSounds=typeof Audio==='undefined'?[]:Array.from({length:16},()=>{const clip=new Audio('game_sounds/weapons/rifle/gunfire/rifle_fire_1.wav');clip.preload='auto';clip.volume=.45;return clip;});

const zoeyRunClips=typeof Audio==='undefined'?[]:[4,9,10,12].map(i=>new Audio(`game_sounds/effects/zoey_run_${String(i).padStart(2,'0')}.wav`));

let zoeyRunIndex=0,nextZoeyRun=0;

function zoeyRun(){const zoey=run.players[1];if(!sound||!zoeyRunClips.length||!zoey||zoey.dead||zoey.down||zoey.grab||zoey.hp<=20||run.time<nextZoeyRun||activeZoeyScream&&!activeZoeyScream.paused)return;stopDialogue();nextZoeyRun=run.time+12;const clip=zoeyRunClips[zoeyRunIndex++%zoeyRunClips.length];dialogueAudio=clip;clip.volume=.75;clip.currentTime=0;zoey.speech='[Urgent run warning]';zoey.speechTime=4;clip.onended=()=>{if(dialogueAudio===clip)dialogueAudio=null;};clip.play().catch(()=>{if(dialogueAudio===clip)dialogueAudio=null;});}

const zoeySafeRoomClip=typeof Audio==='undefined'?null:new Audio('game_sounds/effects/zoey_safe_room_ahead.wav');

function zoeySafeRoom(){if(!sound||!zoeySafeRoomClip||activeZoeyScream&&!activeZoeyScream.paused)return;stopDialogue();dialogueAudio=zoeySafeRoomClip;zoeySafeRoomClip.volume=.7;zoeySafeRoomClip.currentTime=0;const zoey=run.players[1];if(zoey){zoey.speech='[Safe-room approach]';zoey.speechTime=5;}zoeySafeRoomClip.onended=()=>{if(dialogueAudio===zoeySafeRoomClip){dialogueAudio=null;queueBillReply('replyMove');}};zoeySafeRoomClip.play().catch(()=>{if(dialogueAudio===zoeySafeRoomClip)dialogueAudio=null;});}

const zoeySearchClip=typeof Audio==='undefined'?null:new Audio('game_sounds/effects/zoey_search_buildings.wav');

function zoeySearch(){if(!sound||!zoeySearchClip||activeZoeyScream&&!activeZoeyScream.paused)return;stopDialogue();dialogueAudio=zoeySearchClip;zoeySearchClip.volume=.7;zoeySearchClip.currentTime=0;zoeySearchClip.onended=()=>{if(dialogueAudio===zoeySearchClip){dialogueAudio=null;queueBillReply('replySearch');}};zoeySearchClip.play().catch(()=>{if(dialogueAudio===zoeySearchClip)dialogueAudio=null;});}

const zoeyFunClips=typeof Audio==='undefined'?[]:[1,2,3,5,6,7,8,9,10,11].map(i=>{const clip=new Audio(`game_sounds/effects/zoey_fun_${String(i).padStart(2,'0')}.wav`);clip.preload='auto';clip.volume=.7;return clip;});

function zoeyFun(event){if(!sound||!zoeyFunClips.length||dialogueAudio&&!dialogueAudio.paused||activeZoeyScream&&!activeZoeyScream.paused)return;const zoey=run.players[1];if(!zoey||zoey.down||zoey.dead||zoey.grab)return;const clip=zoeyFunClips[event.clip%zoeyFunClips.length];dialogueAudio=clip;clip.currentTime=0;zoey.speech='[Talking]';zoey.speechTime=5;clip.onloadedmetadata=()=>{if(dialogueAudio===clip)zoey.speechTime=clip.duration;};clip.onended=()=>{if(dialogueAudio===clip)dialogueAudio=null;if(zoey.speech==='[Talking]'){zoey.speech='';zoey.speechTime=0;}queueBillReply('replyChat');};clip.play().catch(()=>{if(dialogueAudio===clip)dialogueAudio=null;});}

const zoeyScreams=typeof Audio==='undefined'?[]:Array.from({length:11},(_,i)=>{const clip=new Audio(`game_sounds/effects/zoey_deathscream_${String(i+1).padStart(2,'0')}.wav`);clip.preload='auto';clip.volume=.8;return clip;});

let zoeyScreamIndex=0,activeZoeyScream=null;

function stopZoeyScream(){for(const clip of zoeyScreams){clip.pause();clip.currentTime=0;}activeZoeyScream=null;}

function zoeyScream(){if(!sound||!zoeyScreams.length||activeZoeyScream&&!activeZoeyScream.paused)return;stopDialogue();activeZoeyScream=zoeyScreams[zoeyScreamIndex++%zoeyScreams.length];activeZoeyScream.currentTime=0;activeZoeyScream.play().catch(()=>{});}

const witchCries=typeof Audio==='undefined'?[]:Array.from({length:4},(_,i)=>{const clip=new Audio(`game_sounds/effects/witch_cry_${i+1}.wav`);clip.preload='auto';return clip;});

let witchCryIndex=0,activeWitchCry=null,cryingWitchId=0;

function stopWitchCry(){for(const clip of witchCries){clip.pause();clip.currentTime=0;}activeWitchCry=null;cryingWitchId=0;}

function witchDeathSound(event){stopWitchCry();if(!sound||typeof Audio==='undefined')return;const clip=new Audio('game_sounds/npc/witch/voice/die/female_death_1.wav');clip.volume=.8*Math.max(0,1-Math.hypot(event.x-player.x,event.y-player.y)/850);infectedAudio.add(clip);clip.onended=()=>infectedAudio.delete(clip);clip.play().catch(()=>infectedAudio.delete(clip));}

function witchWarning(event,attack=false){if(!sound||typeof Audio==='undefined')return;stopWitchCry();const clip=new Audio(attack?'game_sounds/npc/witch/voice/attack/female_shriek_1.wav':event.stage<.5?'game_sounds/npc/witch/voice/mad/female_ls_b_surprised01.wav':'game_sounds/npc/witch/voice/mad/female_ls_d_madscream01.wav');clip.volume=.75*Math.max(0,1-Math.hypot(event.x-player.x,event.y-player.y)/850);infectedAudio.add(clip);clip.onended=()=>infectedAudio.delete(clip);clip.play().catch(()=>infectedAudio.delete(clip));}

function witchCry(event){if(!sound||!witchCries.length||activeWitchCry&&!activeWitchCry.paused)return;const witch=run.zombies.find(z=>z.role==='witch'&&z.id===event.witch);if(!witch||witch.awake||witch.hp<=0)return;const distance=Math.min(...run.players.filter(p=>!p.dead).map(p=>Math.hypot(p.x-witch.x,p.y-witch.y)));if(distance>=380)return;activeWitchCry=witchCries[witchCryIndex++%witchCries.length];cryingWitchId=witch.id;activeWitchCry.currentTime=0;activeWitchCry.volume=.65*(1-distance/380);activeWitchCry.play().catch(()=>{});}

function updateWitchCry(){updateHordeAudio();if(!activeWitchCry)return;const witch=run.zombies.find(z=>z.id===cryingWitchId);const live=run.players.filter(p=>!p.dead),distance=witch&&live.length?Math.min(...live.map(p=>Math.hypot(p.x-witch.x,p.y-witch.y))):Infinity;if(!sound||!witch||witch.awake||witch.agitation>.1||witch.hp<=0||distance>=380){stopWitchCry();return;}activeWitchCry.volume=.65*(1-distance/380);}

const footstepSounds=typeof Audio==='undefined'?[]:Array.from({length:8},()=>{const clip=new Audio('game_sounds/effects/concrete1.wav');clip.preload='auto';return clip;});

let footstepSoundIndex=0;

function footstepSound(event){if(!sound||!footstepSounds.length)return;const distance=Math.abs(event.x-(player?.x??event.x));if(distance>850)return;const clip=footstepSounds[footstepSoundIndex++%footstepSounds.length];clip.currentTime=0;clip.volume=(event.player===1?.3:.2)*(event.crouch?.4:1)*Math.max(.15,1-distance/900);clip.play().catch(()=>{});}

let pistolSoundIndex=0,smgSoundIndex=0,rifleSoundIndex=0;

function stopPistolSounds(){stopWeaponHandlingSounds();stopInfectedAudio();stopHordeAudio();for(const clip of [...pistolSounds,...smgSounds,...rifleSounds,...footstepSounds,...shoveSounds]){clip.pause();clip.currentTime=0;}}

function weaponSound(weapon,shooter=1,x=player?.x){if(!sound)return;const local=shooter===(player?.id||1),distance=Math.abs((x??player?.x??0)-(player?.x??0)),gain=local?1:.38*Math.max(0,1-distance/1000);if(gain<=0)return;let clip,volume;if(weapon==='pistol'&&pistolSounds.length){clip=pistolSounds[pistolSoundIndex++%pistolSounds.length];volume=.30;}else if(weapon==='smg'&&smgSounds.length){clip=smgSounds[smgSoundIndex++%smgSounds.length];volume=.55;}else if(weapon==='rifle'&&rifleSounds.length){clip=rifleSounds[rifleSoundIndex++%rifleSounds.length];volume=.45;}if(clip){clip.volume=volume*gain;clip.currentTime=0;clip.play().catch(()=>{if(sound&&state==='playing')gunSound();});}else gunSound();}

function gunSound(){if(!sound||!audio)return;const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();source.buffer=noiseBuffer;filter.type='lowpass';filter.frequency.value=1800;gain.gain.value=.14;source.connect(filter);filter.connect(gain);gain.connect(audio.destination);source.start();tone(80,.07,.035)}

function reset(map='no-mercy'){clearTimeout(witchNoticeTimer);document.getElementById('witch-notification').hidden=true;closeVoiceMenu(false);clearTouchInput();stopGameOverSound();nextBillReply=0;stopDialogue();stopPistolSounds();stopWitchCry();stopZoeyScream();run=new DW.Run(Date.now(),true,typeof map==='string'?map:'no-mercy',document.getElementById('difficulty').value,document.getElementById('game-mode').value);run.autoUseItems=autoUseItems;run.autoPickup=mobileMode;run.enemyTimeScale=mobileMode?.65:1;run.disableGunHeat=true;controlledIndex=0;controllerIndex=1;viewZoom=1;cameraMeanY=null;cameraReady=false;player=run.players[0];state='playing';mouse.down=false;keys.clear();pendingFlashlightToggle=false;nextZoeyRun=0;casings=[];camera=650;accumulator=0;joinDown=false;for(const id of ['intro','death','pause'])ui[id].classList.add('hidden');sync();consumeEvents()}

for(const selector of ['.mode-select','.difficulty-select:not(.mode-select)'])for(const select of document.querySelectorAll(selector))select.onchange=()=>{for(const other of document.querySelectorAll(selector))other.value=select.value;};

document.getElementById('start').onclick=()=>{initAudio();reset()};document.getElementById('restart').onclick=reset;document.getElementById('resume').onclick=()=>togglePause();

function togglePause(){closeVoiceMenu(false);if(state==='playing'){state='paused';document.getElementById('touch-controls').hidden=true;clearTouchInput();stopDialogue();stopPistolSounds();stopWitchCry();stopZoeyScream();mouse.down=false;ui.pause.classList.remove('hidden')}else if(state==='paused'){state='playing';document.getElementById('touch-controls').hidden=!mobileMode;accumulator=0;ui.pause.classList.add('hidden')}}

// Consume game controls during play so Ctrl+D (crouch + right) does not bookmark the page.

const gameControlKeys=new Set(['KeyX','KeyA','KeyD','KeyW','KeyC','KeyR','KeyF','KeyE','KeyH','KeyT','KeyQ','KeyG','KeyL','Tab','Digit4','Digit5','Digit6','Space','ArrowLeft','ArrowRight','ArrowUp','ControlLeft','ControlRight','ShiftLeft','ShiftRight']);

addEventListener('keydown',e=>{if(state==='playing'&&gameControlKeys.has(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyX'&&!e.repeat&&state==='playing'){e.preventDefault();openVoiceMenu(player,'keyboard');}if(e.code==='Tab'&&!e.repeat&&state==='playing')switchCharacter();if(state==='playing'&&!e.repeat&&['Digit4','Digit5','Digit6'].includes(e.code))run.quickUseHealth(player,{Digit4:'pills',Digit5:'adrenaline',Digit6:'kit'}[e.code]);if(state==='playing'&&e.code==='KeyL'&&!e.repeat)pendingFlashlightToggle=true;if(e.code==='Escape'&&!e.repeat)togglePause();if(e.code==='KeyM'&&!e.repeat){sound=!sound;if(!sound){stopGameOverSound();stopDialogue();stopPistolSounds();stopWitchCry();stopZoeyScream();}ui.sound.textContent=sound?'M SOUND ON':'M SOUND OFF';initAudio()}});

addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='KeyX'&&voiceMenuSource==='keyboard')closeVoiceMenu(true);});canvas.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;mouse.x=e.clientX;mouse.y=e.clientY;controllerAimActive=false});canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;if(voiceMenuActor)return;if(e.button===1&&state==='playing'){e.preventDefault();pendingFlashlightToggle=true;}else if(e.button===0){mouse.down=true;initAudio()}});canvas.addEventListener('mousedown',e=>{if(e.button===1&&state==='playing')e.preventDefault();});canvas.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault();});addEventListener('pointerup',e=>{if(e.button===0)mouse.down=false;});addEventListener('blur',()=>{closeVoiceMenu(false);keys.clear();mouse.down=false;if(state==='playing')togglePause()});canvas.addEventListener('contextmenu',e=>e.preventDefault());

function inputs(){const lightToggle=pendingFlashlightToggle;pendingFlashlightToggle=false;const p1={move:(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),angle:aim(),fire:mouse.down,jump:keys.has('Space')||keys.has('KeyW')||keys.has('ArrowUp'),reload:keys.has('KeyR'),shove:keys.has('KeyF'),use:keys.has('KeyE'),heal:keys.has('KeyH'),build:keys.has('KeyQ'),grenade:keys.has('KeyG')||keys.has('KeyT'),flashlight:lightToggle,crouch:keys.has('ControlLeft')||keys.has('ControlRight')||keys.has('KeyC')};const pad=activePad;if(mobileMode){if(touchInput.move)p1.move=touchInput.move;p1.angle=touchInput.angle!==null?touchInput.angle:player.angle;p1.fire=p1.fire||touchInput.fire;p1.crouch=p1.crouch||touchInput.crouch;for(const key of ['jump','sprint','shove','use','reload','heal','grenade']){p1[key]=p1[key]||!!touchInput[key]||!!touchPulses[key];delete touchPulses[key];}}

const routed=run.players.map(()=>({}));routed[controlledIndex]=p1;if(voiceMenuActor){p1.fire=false;p1.angle=player.angle;}if(!pad)return routed;

const target=controllerSettings.mode==='companion'?controllerIndex:controlledIndex;

const actor=run.players[target];if(!actor||actor.dead)return routed;

if(controllerSettings.mode==='companion')actor.ai=false;

const b=i=>!!pad.buttons[i]?.pressed||(pad.buttons[i]?.value||0)>.5;

let angle=target===controlledIndex&&!controllerAimActive?p1.angle:actor.angle;const ax=pad.axes[2]||0,ay=pad.axes[3]||0;if(Math.hypot(ax,ay)>.22){angle=Math.atan2(ay,ax);if(target===controlledIndex)controllerAimActive=true;}

const raw=pad.axes[0]||0,move=Math.abs(raw)>.18?Math.sign(raw)*(Math.abs(raw)-.18)/.82:0;

const input=target===controlledIndex?p1:{};

Object.assign(input,{move:move||input.move||0,angle,fire:b(7)||!!input.fire,jump:b(0)||!!input.jump,use:b(2)||!!input.use,reload:!!input.reload,shove:b(6)||!!input.shove,heal:b(1)||!!input.heal,grenade:b(5)||!!input.grenade,crouch:b(11)||!!input.crouch});

if(voiceMenuActor){input.fire=false;input.angle=actor.angle;}routed[target]=input;return routed;}

const voiceCommands=[['Thanks','revived'],['Nice shot','niceShot'],['Move out','replyMove'],['Smoker!','smoker'],['Hunter!','hunter'],['Boomer!','boomer'],['Pain','hurt'],['Scream','dying']];

let voiceMenuActor=null,voiceMenuSource=null,voiceMenuSelection=-1;

const voiceMenu=document.getElementById('voice-menu');

for(const [index,[label]] of voiceCommands.entries()){const button=document.createElement('button');button.textContent=label;button.style.setProperty('--voice-angle',index*45+'deg');button.style.setProperty('--voice-counter-angle',-index*45+'deg');button.onpointerenter=()=>selectVoiceCommand(index);button.onclick=()=>{selectVoiceCommand(index);closeVoiceMenu(true);};voiceMenu.append(button);}

function selectVoiceCommand(index){voiceMenuSelection=index;voiceMenu.querySelectorAll('button').forEach((button,i)=>button.classList.toggle('selected',i===index));}

function openVoiceMenu(actor,source){if(state!=='playing'||!actor||actor.dead||actor.down||actor.grab)return;voiceMenuActor=actor;voiceMenuSource=source;selectVoiceCommand(-1);voiceMenu.hidden=false;voiceMenu.querySelector('small').textContent=source==='controller'?'Right stick selects · release D-pad to speak':'Hover then release X, or click to speak';mouse.down=false;}

function closeVoiceMenu(confirm){const actor=voiceMenuActor,index=voiceMenuSelection;voiceMenuActor=null;voiceMenuSource=null;voiceMenu.hidden=true;selectVoiceCommand(-1);mouse.down=false;if(confirm&&actor&&!actor.dead&&!actor.down&&!actor.grab&&state==='playing'&&index>=0){initAudio();stopDialogue();speakDialogue({type:DW.survivorName(actor)+'Line',kind:voiceCommands[index][1]});}}

// Standard Gamepad API mapping used by Steam Input and Xbox-style controllers.

const controllerDefaults={mode:'player',up:'kit',right:'boost',left:'thanks',down:'scream'};

const shortcutOptions={boost:'Pills / Adrenaline',pills:'Pills',adrenaline:'Adrenaline',kit:'Medkit',voice:'Character voice',voiceMenu:'Voice command menu',scream:'Scream',pain:'Pain',thanks:'Thanks',niceShot:'Nice shot',none:'None'};

let controllerSettings={...controllerDefaults},padPrevious=[],activePad=null,controllerAimActive=false,menuStickDirection=0,menuStickNext=0,menuScrollLast=0;

try{const saved=JSON.parse(localStorage.getItem('deadwalk-controller')||'{}');for(const key of Object.keys(controllerDefaults)){if(key==='mode'?['player','companion'].includes(saved[key]):Object.hasOwn(shortcutOptions,saved[key]))controllerSettings[key]=saved[key];}}catch{}

function controllerActor(){return run?.players[controllerSettings.mode==='companion'?controllerIndex:controlledIndex];}

function controllerShortcut(action){const actor=controllerActor();if(!actor||actor.dead||actor.down||actor.grab)return;

if(action==='voiceMenu'){openVoiceMenu(actor,'controller');return;}

if(['boost','pills','adrenaline','kit'].includes(action)){run.quickUseHealth(actor,action==='boost'?(actor.healthItems.pills?'pills':actor.healthItems.adrenaline?'adrenaline':'pills'):action);return;}

const kind={voice:'idle',scream:'dying',pain:'hurt',thanks:'revived',niceShot:'niceShot'}[action];

if(kind){initAudio();speakDialogue({type:DW.survivorName(actor)+'Line',kind});}}

function setupControllerSettings(){for(const host of document.querySelectorAll('.controller-settings')){

const title=document.createElement('summary');title.textContent='CONTROLLER / D-PAD SETTINGS';host.append(title);

const help=document.createElement('p');help.textContent='Xbox controllers on PC and Steam Deck use the same controls. Connect your controller and press a button to detect it. Keyboard and mouse stay available; move the mouse or right stick to switch aiming. X pickup / interact · Y weapons · A jump · LT shove · RT shoot · sticks move / aim. L1 / LB switch character · R1 / RB grenade · B use health · right stick click crouch · View switch character · Menu pause. Menus: left stick or D-pad up/down select, left/right change, right stick scroll, A opens a choice / confirms, B cancels / goes back. Assign Voice command menu to a D-pad direction: hold it, select with the right stick, then release to speak.';host.append(help);

for(const key of Object.keys(controllerDefaults)){const label=document.createElement('label');label.textContent=key==='mode'?'Controller plays': 'D-pad '+key;const select=document.createElement('select');select.dataset.controller=key;select.setAttribute('aria-label',label.textContent);const options=key==='mode'?{player:'Selected character',companion:'Companion (local co-op)'}:shortcutOptions;for(const [value,text] of Object.entries(options)){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}select.value=controllerSettings[key];select.onchange=()=>{controllerSettings[key]=select.value;for(const other of document.querySelectorAll('[data-controller="'+key+'"]'))other.value=select.value;if(run&&key==='mode'){const companion=run.players[controllerIndex];if(companion&&controllerIndex!==controlledIndex)companion.ai=select.value==='companion'?false:true;}try{localStorage.setItem('deadwalk-controller',JSON.stringify(controllerSettings));}catch{}};label.append(select);host.append(label);}

}}

setupControllerSettings();
DeadwalkLighting.settings();

let controllerChoice=null;
const controllerChoiceBox=document.createElement('div');controllerChoiceBox.id='controller-choice';controllerChoiceBox.hidden=true;controllerChoiceBox.setAttribute('role','dialog');controllerChoiceBox.setAttribute('aria-modal','true');controllerChoiceBox.setAttribute('aria-label','Choose menu option');document.body.append(controllerChoiceBox);
function renderControllerChoice(){const {select,index}=controllerChoice;controllerChoiceBox.replaceChildren();const title=document.createElement('h2');title.textContent=select.closest('label')?.childNodes[0]?.textContent.trim()||select.getAttribute('aria-label')||'Choose option';controllerChoiceBox.append(title);Array.from(select.options).forEach((option,i)=>{const button=document.createElement('button');button.textContent=option.textContent;button.classList.toggle('selected',i===index);button.onclick=()=>{controllerChoice.index=i;closeControllerChoice(true);};controllerChoiceBox.append(button);});const hint=document.createElement('p');hint.textContent='Left stick / D-pad: choose · A: confirm · B: cancel';controllerChoiceBox.append(hint);controllerChoiceBox.querySelector('.selected')?.focus();}
function openControllerChoice(select){controllerChoice={select,index:select.selectedIndex};controllerChoiceBox.hidden=false;renderControllerChoice();}
function closeControllerChoice(confirm=false){if(!controllerChoice)return;const {select,index}=controllerChoice;controllerChoice=null;controllerChoiceBox.hidden=true;if(confirm){select.selectedIndex=index;select.dispatchEvent(new Event('change'));}select.focus();}
addEventListener('keydown',e=>{if(!controllerChoice)return;if(['Escape','Enter','ArrowUp','ArrowDown'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();if(e.code==='Escape')closeControllerChoice(false);else if(e.code==='Enter')closeControllerChoice(true);else{controllerChoice.index=(controllerChoice.index+(e.code==='ArrowUp'?-1:1)+controllerChoice.select.options.length)%controllerChoice.select.options.length;renderControllerChoice();}}},true);

function pollController(){let pads=[];try{pads=Array.from(navigator.getGamepads?.()||[]).filter(Boolean);}catch{}const pad=pads.find(p=>p.index===padId)||pads[0];activePad=pad||null;document.body.classList.toggle('controller-menu',!!pad&&state!=='playing');if(!pad||state==='playing'){menuStickDirection=0;menuStickNext=0;menuScrollLast=0;}const controllerStatus=document.getElementById('controller-status');if(controllerStatus.hidden===!!pad)controllerStatus.hidden=!pad;

if(!pad){closeControllerChoice(false);if(voiceMenuSource==='controller')closeVoiceMenu(false);if(padId!==null&&run&&controllerIndex!==controlledIndex&&run.players[controllerIndex])run.players[controllerIndex].ai=true;padId=null;padPrevious=[];controllerAimActive=false;return;}

if(padId!==pad.index){padPrevious=[];padId=pad.index;}

if(run&&controllerSettings.mode==='companion'&&(controllerIndex===controlledIndex||run.players[controllerIndex]?.dead)){controllerIndex=run.players.findIndex((p,i)=>i!==controlledIndex&&!p.dead);}

const previous=padPrevious,held=pad.buttons.map(b=>b.pressed||b.value>.5),pressed=i=>held[i]&&!previous[i];padPrevious=held;

if(pressed(9)){if(controllerChoice){closeControllerChoice(false);return;}initAudio();if(state==='intro')reset();else if(state==='playing'||state==='paused')togglePause();else reset();return;}

if(state!=='playing'){if(state==='paused'&&pressed(1)){togglePause();return;}const overlay=document.getElementById(state==='intro'?'intro':state==='paused'?'pause':'death');const menuNow=performance.now(),scrollDt=Math.min((menuNow-menuScrollLast)/1000||1/60,.05);menuScrollLast=menuNow;const scrollAxis=pad.axes[3]||0;if(Math.abs(scrollAxis)>.2){const panel=overlay.querySelector('.panel');if(panel)panel.scrollTop+=Math.sign(scrollAxis)*(Math.abs(scrollAxis)-.2)/.8*650*scrollDt;}const controls=Array.from(overlay.querySelectorAll('button,select,summary')).filter(e=>e.getClientRects().length);let index=controls.indexOf(document.activeElement);

const sx=pad.axes[0]||0,sy=pad.axes[1]||0,stick=Math.max(Math.abs(sx),Math.abs(sy))>.55?(Math.abs(sy)>=Math.abs(sx)?(sy<0?12:13):(sx<0?14:15)):0,now=performance.now();const stickPress=stick&&(stick!==menuStickDirection||now>=menuStickNext);if(stickPress)menuStickNext=now+(stick!==menuStickDirection?350:180);menuStickDirection=stick;const nav=i=>pressed(i)||stickPress&&stick===i;
if(controllerChoice){if(pressed(1)){closeControllerChoice(false);return;}if(nav(12)||nav(14)||nav(13)||nav(15)){controllerChoice.index=(controllerChoice.index+(nav(12)||nav(14)?-1:1)+controllerChoice.select.options.length)%controllerChoice.select.options.length;renderControllerChoice();}if(pressed(0))closeControllerChoice(true);return;}if(pressed(1)){for(const details of overlay.querySelectorAll('details'))details.open=false;document.getElementById(state==='intro'?'game-mode':state==='paused'?'resume':'restart-mode')?.focus();return;}
if(nav(12)||nav(13)){index=(index+(nav(12)?-1:1)+controls.length)%controls.length;controls[index]?.focus();}else if(index<0){const preferred=document.getElementById(state==='intro'?'game-mode':state==='paused'?'resume':'restart-mode');preferred?.focus();index=controls.indexOf(preferred);}

const focus=document.activeElement;

if(pressed(0)){initAudio();if(index<0)document.getElementById(state==='intro'?'start':state==='paused'?'resume':'restart').click();else if(focus.tagName==='SELECT')openControllerChoice(focus);else if(focus.tagName==='SUMMARY'){focus.parentElement.open=!focus.parentElement.open;}else if(focus.tagName==='BUTTON')focus.click();}return;}

if(voiceMenuSource==='controller'){const x=pad.axes[2]||0,y=pad.axes[3]||0;if(Math.hypot(x,y)>.35){const index=(Math.round((Math.atan2(y,x)+Math.PI/2)/(Math.PI/4))+8)%8;selectVoiceCommand(index);}if(![[12,'up'],[13,'down'],[14,'left'],[15,'right']].some(([i,k])=>held[i]&&controllerSettings[k]==='voiceMenu'))closeVoiceMenu(true);}

if((pressed(4)||pressed(8))&&controllerSettings.mode==='player')switchCharacter();

if(pressed(3)){const actor=controllerActor();if(actor)run.cycleWeapon(actor,1);}

for(const [button,direction] of [[12,'up'],[13,'down'],[14,'left'],[15,'right']])if(pressed(button))controllerShortcut(controllerSettings[direction]);

}

canvas.addEventListener('wheel',e=>{e.preventDefault();if(state==='playing'&&e.deltaY){run.cycleWeapon(player,Math.sign(e.deltaY));mouse.down=false;sync();consumeEvents();}},{passive:false});

const recordedLineIndex={},infectedAudio=new Set();

const hordeMusic=typeof Audio==='undefined'?null:new Audio('game_sounds/music/mob/germl1a.wav'),hordeScream=typeof Audio==='undefined'?null:new Audio('game_sounds/npc/mega_mob/mega_mob_incoming.wav'),carAlarmAudio=typeof Audio==='undefined'?null:new Audio('game_sounds/vehicles/car_alarm/car_alarm.wav');

const tankMusic=typeof Audio==='undefined'?null:new Audio('game_sounds/music/tank/tank.wav');if(tankMusic){tankMusic.loop=true;tankMusic.volume=.42;}

function carWhackSound(event){if(!sound)return;const clip=new Audio('game_sounds/physics/metal/metal_box_break2.wav');clip.volume=.8*Math.max(0,1-Math.abs(event.x-player.x)/1200);infectedAudio.add(clip);clip.onended=()=>infectedAudio.delete(clip);clip.play().catch(()=>infectedAudio.delete(clip));}

function carSmashSound(event){if(!sound)return;const clip=new Audio('game_sounds/physics/metal/metal_sheet_impact_hard7.wav');clip.volume=.75*Math.max(0,1-Math.abs(event.x-player.x)/1200);infectedAudio.add(clip);clip.onended=()=>infectedAudio.delete(clip);clip.play().catch(()=>infectedAudio.delete(clip));}

function distantTankWarning(){if(!sound||typeof Audio==='undefined')return;const clip=new Audio('game_sounds/player/tank/voice/yell/hulk_yell_2.wav');clip.volume=.65;infectedAudio.add(clip);clip.onended=()=>infectedAudio.delete(clip);clip.play().catch(()=>infectedAudio.delete(clip));}

function tankWarnings(){if(!sound||typeof SOUND_LIBRARY==='undefined')return;stopDialogue();const lines=run.players.filter(p=>!p.dead&&!p.down).map(p=>({p,line:SOUND_LIBRARY.survivors[DW.survivorName(p)]?.tank?.[0]})).filter(e=>e.line);function next(){if(!sound||!lines.length||state!=='playing')return;const {p,line}=lines.shift(),clip=new Audio(line.file);dialogueAudio=clip;p.speech='TANK!';p.speechTime=5;clip.volume=.85;clip.onended=()=>{if(dialogueAudio!==clip)return;dialogueAudio=null;next();};clip.play().catch(()=>{if(dialogueAudio===clip){dialogueAudio=null;next();}});}next();}

if(hordeMusic){hordeMusic.loop=true;hordeMusic.volume=.32;carAlarmAudio.loop=true;hordeScream.volume=.65;}

function stopHordeAudio(){for(const clip of [hordeMusic,hordeScream,carAlarmAudio,tankMusic])if(clip){clip.pause();clip.currentTime=0;}}

let hordeMusicIndex=0;const mobTracks=['germl1a','germl1b','germl2a','germl2b','germm1a','germm1b','germm2a','germm2b','germs1a','germs1b','germs2a','germs2b','germx1a','germx1b','germx2a','germx2b'];function hordeSound(){if(!sound||!hordeMusic)return;if(hordeMusic.paused){hordeMusic.src='game_sounds/music/mob/'+mobTracks[hordeMusicIndex++%mobTracks.length]+'.wav';}hordeScream.currentTime=0;hordeScream.play().catch(()=>{});if(hordeMusic.paused&&!run.zombies.some(z=>z.role==='tank'&&z.hp>0))hordeMusic.play().catch(()=>{});}

function updateHordeAudio(){if(!hordeMusic)return;if(!sound||state!=='playing'||run.status!=='playing'){stopHordeAudio();return;}const intensity=Math.min(1,run.hordeActive/5);const tankAlive=run.zombies.some(z=>z.role==='tank'&&z.hp>0);if(tankAlive){if(tankMusic.paused)tankMusic.play().catch(()=>{});}else{tankMusic.pause();tankMusic.currentTime=0;}hordeMusic.volume=.32*intensity;if(intensity>0&&!tankAlive){if(hordeMusic.paused&&!run.zombies.some(z=>z.role==='tank'&&z.hp>0))hordeMusic.play().catch(()=>{});}else if(!hordeMusic.paused){hordeMusic.pause();hordeMusic.currentTime=0;}const car=run.alarmCars.find(c=>c.alarm>0);if(car){const listeners=run.players.filter(p=>!p.dead),distance=listeners.length?Math.min(...listeners.map(p=>Math.abs(car.x+62-p.x))):1800;carAlarmAudio.volume=.85*Math.max(0,1-distance/1800)*Math.min(1,car.alarm/.5);if(carAlarmAudio.paused)carAlarmAudio.play().catch(()=>{});}else{carAlarmAudio.pause();carAlarmAudio.currentTime=0;}}

function stopInfectedAudio(){for(const clip of infectedAudio){clip.pause();clip.currentTime=0;}infectedAudio.clear();}

function infectedSound(event){if(!sound||typeof Audio==='undefined'||typeof SOUND_LIBRARY==='undefined'||infectedAudio.size>=8)return;const distance=Math.hypot(event.x-player.x,event.y-player.y);if(distance>=850)return;const bank=SOUND_LIBRARY.infected[event.role]?.[event.action];if(!bank?.length)return;const key=event.role+event.action,i=recordedLineIndex[key]||0;recordedLineIndex[key]=i+1;const clip=new Audio(bank[i%bank.length]);clip.volume=.6*(1-distance/850);infectedAudio.add(clip);clip.onended=()=>infectedAudio.delete(clip);clip.play().catch(()=>infectedAudio.delete(clip));}

// Only imported recordings are voiced; unknown transcript captions are labelled.

function speakDialogue(event){if(event.urgent&&dialogueAudio&&(event.kind==='healOther'||event.kind==='closeDoor'||event.kind==='reviveStart'||event.kind==='hordeTriggered'||zoeyFunClips.includes(dialogueAudio)))stopDialogue();if(!sound||typeof Audio==='undefined'||typeof SOUND_LIBRARY==='undefined'||dialogueAudio&&!dialogueAudio.paused||event.kind!=='reviveStart'&&activeZoeyScream&&!activeZoeyScream.paused)return false;const character=event.type==='chloeLine'?'chloe':event.type==='zoeyLine'?'zoey':'bill',banks=SOUND_LIBRARY.survivors[character],bank=banks?.[event.kind]?.length?banks[event.kind]:banks?.idle,survivor=run.players.find(p=>DW.survivorName(p)===character);if(!bank?.length||!survivor||survivor.dead||survivor.down||survivor.grab)return false;const key=character+event.kind,i=recordedLineIndex[key]||0;recordedLineIndex[key]=i+1;const line=bank[bank===banks.idle?Math.floor(run.rand()*bank.length):i%bank.length],clip=new Audio(line.file);dialogueAudio=clip;clip.volume=.7;survivor.speech=line.text;survivor.speechTime=6;clip.onloadedmetadata=()=>{if(dialogueAudio===clip)survivor.speechTime=clip.duration;};clip.onended=()=>{if(dialogueAudio!==clip)return;dialogueAudio=null;const partner=character==='zoey'?'bill':'zoey';if(event.kind==='kill')queueBillReply('niceShot',partner);else if(['idle','rooftop','alley','subway','safe','hold','scavenge','revived'].includes(event.kind))queueBillReply(event.kind==='scavenge'?'replySearch':'replyChat',partner);};clip.play().catch(()=>{if(dialogueAudio===clip)dialogueAudio=null;});return true;}

function combatVoice(event,kind){const survivor=run.players.find(p=>p.id===event.player);if(!survivor||run.time<(survivor.brain.nextCombatVoice||0))return;if(speakDialogue({type:DW.survivorName(survivor)+'Line',kind}))survivor.brain.nextCombatVoice=run.time+8;}

function survivorDeathSound(event){if(!sound||typeof SOUND_LIBRARY==='undefined')return;const character=event.player===3?'chloe':event.player===2?'zoey':'bill',kind=event.kind||'death',bank=SOUND_LIBRARY.survivors[character]?.[kind];if(!bank?.length){if(character==='zoey')zoeyScream();return;}const key=character+kind,index=recordedLineIndex[key]||0;recordedLineIndex[key]=index+1;const clip=new Audio(bank[index%bank.length].file);clip.volume=.8;clip.play().catch(()=>{});}

let witchNoticeTimer=null;
function showWitchNotification(event){const notice=document.getElementById('witch-notification'),survivor=run.players.find(p=>p.id===event.player);notice.textContent=`${survivor?.name||'A survivor'} startled the Witch!`;notice.hidden=false;clearTimeout(witchNoticeTimer);witchNoticeTimer=setTimeout(()=>notice.hidden=true,6000);}

function consumeEvents(){for(const e of run.events){if(e.type==='survivorDeath'||e.type==='survivorScream'){survivorDeathSound(e);}else if(e.type==='zoeyLine'||e.type==='billLine'||e.type==='chloeLine'){speakDialogue(e);}else if(e.type==='carWhack'){carWhackSound(e);shake=Math.max(shake,6);}else if(e.type==='carSmash'){carSmashSound(e);shake=Math.max(shake,6);}else if(e.type==='tankDistantWarning'){distantTankWarning();}else if(e.type==='tankSpawn'){tankWarnings();updateHordeAudio();shake=3;}else if(e.type==='tankImpact'){shake=5;tone(55,.2,.12);}else if(e.type==='tankRock'){tone(85,.18,.09);}else if(e.type==='hordeStart'){hordeSound();speakDialogue({type:'zoeyLine',kind:'hordeTriggered',urgent:true});}else if(e.type==='carAlarm'){if(sound&&carAlarmAudio){carAlarmAudio.currentTime=0;carAlarmAudio.play().catch(()=>{});}}else if(e.type==='infectedSound'){infectedSound(e);}else if(e.type==='zoeySafeRoom'){zoeySafeRoom();}else if(e.type==='zoeySearch'){zoeySearch();}else if(e.type==='zoeyFun'){zoeyFun(e);}else if(e.type==='zoeyScream'){zoeyScream();}else if(e.type==='witchCry'){witchCry(e);}else if(e.type==='witchDeath'){witchDeathSound(e);}else if(e.type==='witchAgitated'){witchWarning(e);}else if(e.type==='witchStartled'){showWitchNotification(e);witchWarning(e,true);stopWitchCry();zoeyRun();tone(430,.4,.11);shake=7;}else if(e.type==='witchSlash'){tone(100,.15,.09);shake=8;}else if(e.type==='footstep'){footstepSound(e);}else if(e.type==='pipeBeep'){tone(1250,.065,.085);}else if(e.type==='boomerBurst'){if(run.players.some(p=>p.goo>0))zoeyRun();tone(70,.4,.12);shake=10;}else if(e.type==='explosion'){gunSound();tone(48,.65,.16);shake=16;}else if(e.type==='message'){ui.announcement.textContent=e.text;announceClock=5}else if(e.type==='shot'){weaponSound(e.weapon,e.player,e.x);shake=Math.max(shake,1.4);if(casings.length<40)casings.push({x:e.x,y:e.y,vx:-e.facing*(30+Math.random()*50),vy:-90,life:1})}else if(e.type==='warning')tone(170,.45,.055);else if(e.type==='reload'||e.type==='weaponDeploy'){weaponHandlingSound(e);if(e.type==='reload'&&e.stage==='clip_out')combatVoice(e,'reloading');}else if(e.type==='kill'){combatVoice(e,'kill');}else if(e.type==='hit'){hitFlash=.1;tone(e.head?900:540,.025,.014)}else if(e.type==='stomp'){combatVoice(e,'kill');tone(120,.1,.07);shake=Math.max(shake,3);}else if(e.type==='shove')shoveSound(e)}run.events.length=0;}

function sync(dt=1/60){player=run.players[controlledIndex];zombies=run.zombies;bullets=run.bullets;particles=run.effects;time=run.time;kills=run.kills;heads=run.heads;const live=cameraActors(),xs=live.map(p=>p.x),ys=live.map(p=>p.y),spanX=xs.length?Math.max(...xs)-Math.min(...xs):0,spanY=ys.length?Math.max(...ys)-Math.min(...ys):0,targetZoom=clamp(Math.min(1,(W-140)/(spanX+160),Math.max(100,H-365)/(spanY+180)),.12,1),target=live.length?(Math.min(...xs)+Math.max(...xs))/2:player.x,mean=ys.length?(Math.min(...ys)+Math.max(...ys))/2:player.y,elapsed=clamp(dt,0,.05),follow=cameraReady?1-Math.exp(-6*elapsed):1;

viewZoom+=(targetZoom-viewZoom)*(cameraReady?1-Math.exp(-(targetZoom<viewZoom?8:3)*elapsed):1);cameraMeanY=cameraMeanY===null?mean:cameraMeanY+(mean-cameraMeanY)*follow;const targetCamera=clamp(target-W/viewZoom*.5,0,Math.max(0,5800-W/viewZoom));camera=clamp(camera+(targetCamera-camera)*follow,0,Math.max(0,5800-W/viewZoom));cameraReady=true;run.spawnView={left:camera,right:camera+W/viewZoom,zoom:viewZoom};updateHud();}

function updateMobileHud(){if(!mobileMode)return;const context=run.context(player),use=document.querySelector('[data-touch=use]');use.textContent=context?.kind==='revive'?'RESCUE':context?.kind==='safeDoor'?(run.safeDoor.open?'CLOSE':'OPEN'):'USE';use.disabled=!context||!['revive','safeDoor','ladder','gate','ammo'].includes(context.kind)||player.down||player.dead||!!player.grab;use.hidden=use.disabled;for(const [action,count,label] of [['grenade',player.grenades,'GRENADE'],['pills',player.healthItems.pills,'PILLS'],['adrenaline',player.healthItems.adrenaline,'ADREN'],['kit',player.medicine,'HEAL']]){const button=document.querySelector('[data-touch='+action+']');button.textContent=label+' '+count;button.hidden=!count;button.disabled=!count||player.down||player.dead||!!player.grab||player.healthUseTime>0;}document.getElementById('switch-character').textContent=player.name.toUpperCase()+' Â· SWITCH';if(player.prompt&&!player.beingHealedBy)ui.context.textContent=context?.kind==='revive'?'HOLD RESCUE TO REVIVE':context?.kind==='safeDoor'?'TAP '+use.textContent+' TO USE DOOR':'';if(!player.down&&!player.dead&&!player.grab&&!player.healthUseTime&&!player.reload)ui['weapon-state'].textContent=player.weapon==='pipebomb'?'GRENADE READY':'AUTO RELOAD Â· LIGHT '+(player.flashlight?'ON':'OFF');}

function update(dt){run.spawnView={left:camera,right:camera+W/viewZoom,zoom:viewZoom};run.step(dt,inputs());consumeEvents();sync(dt);updateMobileHud();updateWitchCry();updateBillReply();const zoey=run.players[1];if(dialogueAudio&&zoeyFunClips.includes(dialogueAudio)&&(!zoey||zoey.down||zoey.dead||zoey.grab||run.director.phase==='assault'||run.zombies.some(z=>z.hp>0&&(z.role!=='witch'||z.awake)&&Math.abs(z.x-zoey.x)<450))){stopDialogue();if(zoey){zoey.speech='';zoey.speechTime=0;zoey.brain.nextTalk=Math.min(zoey.brain.nextTalk,run.time);}}for(const c of casings){c.x+=c.vx*dt;c.y+=c.vy*dt;c.vy+=400*dt;c.life-=dt}casings=casings.filter(c=>c.life>0);shake*=Math.exp(-11*dt);announceClock-=dt;hitFlash=Math.max(0,hitFlash-dt);if(announceClock<=0)ui.announcement.textContent='';if(run.status!=='playing'){document.getElementById('auto-use-items').hidden=true;stopDialogue();stopPistolSounds();stopWitchCry();stopZoeyScream();state=run.status;if(state==='dead')playGameOverSound();ui['ending-label'].textContent=state==='won'?'SAFE ROOM SECURED':'THE HORDE ENDURES';ui['ending-title'].textContent=state==='won'?'SAFE AT LAST.':'OVERRUN.';ui.result.textContent=`${run.difficulty.toUpperCase()} Â· ${kills} eliminations Â· ${Math.floor(time/60)}m ${Math.floor(time%60)}s Â· seed ${run.seed}`;clearTouchInput();document.getElementById('touch-controls').hidden=true;ui.death.classList.remove('hidden');document.getElementById('touch-controls').hidden=!mobileMode||state!=='playing';document.getElementById('switch-character').style.display='none';if(state==='won'){try{const n=Number(localStorage.getItem('deadwalk-extractions')||0)+1;localStorage.setItem('deadwalk-extractions',String(n));ui.result.textContent+=` Â· ${n} total extractions`}catch{}}}}

document.getElementById('auto-use-items').onclick=()=>{autoUseItems=!autoUseItems;if(run)run.autoUseItems=autoUseItems;updateHud();};

function updateHud(){const autoButton=document.getElementById('auto-use-items');autoButton.hidden=!['playing','paused'].includes(state);autoButton.textContent='AUTO ITEMS: '+(autoUseItems?'ON':'OFF');autoButton.setAttribute('aria-pressed',String(autoUseItems));document.getElementById('touch-controls').hidden=!mobileMode||state!=='playing';canvas.style.filter=player.lastStrike?'grayscale(1)':'';document.getElementById('switch-character').style.display=state==='playing'||state==='paused'?'':'none';document.getElementById('switch-character').textContent='PLAYING '+player.name.toUpperCase()+' Â· SWITCH [TAB]';ui.health.style.width=player.hp+'%';ui.stamina.textContent=`4 PILLS ${player.healthItems.pills} Â· 5 ADREN ${player.healthItems.adrenaline} Â· 6 KIT ${player.medicine} Â· H USE`;ui.objective.textContent=run.map==='no-mercy'?DW.mercySection(player.x):'CATWALK';ui.wave.textContent=run.bossActive?'TANK BOSS':run.director.phase.toUpperCase();ui['weapon-name'].textContent=player.healthHeld||player.healthUseTime?player.healthSelected.toUpperCase():DW.WEAPONS[player.weapon].name.toUpperCase();ui.ammo.innerHTML=player.healthHeld||player.healthUseTime?String(player.healthSelected==='kit'?player.medicine:player.healthItems[player.healthSelected])+' <em>AVAILABLE</em>':player.weapon==='pipebomb'?player.grenades+' <em>PIPE BOMBS</em>':player.mag+' <em>/ '+(DW.WEAPONS[player.weapon].unlimitedAmmo?'âˆž':player.reserve)+'</em>';ui['weapon-state'].textContent=player.beingHealedBy?'TEAMMATE HEALING · HOLD STILL':player.healthUseTime?`USING ${player.healthUseKind.toUpperCase()} Â· ${player.healthUseTime.toFixed(1)}s`:player.healthHeld?'H / LEFT CLICK USE Â· WHEEL BACK TO GUN':player.dead?'DEAD Â· SWITCH TO A TEAMMATE':player.down?'INCAPACITATED Â· NEED REVIVE':player.grab?(run.zombies.some(z=>z.id===player.grab&&['hunter','smoker'].includes(z.role))?'PINNED Â· TEAMMATE RESCUE':'GRABBED Â· SHOVE'):player.carry?'CARRYING Â· DROP TO FIRE':player.reload?`RELOADING ${player.reload.toFixed(1)}s`:player.locked?'OVERHEATED Â· SWITCH GUN OR WAIT':player.mag===0?'EMPTY Â· R TO RELOAD':player.weapon==='pipebomb'?'LEFT CLICK TO THROW Â· 5 SECOND FUSE':player.weaponLasers[player.weapon]?'LASER SIGHT Â· L LIGHT '+(player.flashlight?'ON':'OFF'):'WHEEL WEAPONS Â· L LIGHT '+(player.flashlight?'ON':'OFF');ui.scrap.textContent=run.scrap;ui.heat.style.width=player.heat+'%';ui.heat.style.background=player.locked?'#d57759':'#bacb83';ui.noise.style.width=run.noise+'%';const zone=run.zones.find(z=>player.x>=z.x&&player.x<z.end&&player.y<500);ui.resonance.parentElement.parentElement.style.display=run.map==='no-mercy'?'none':'';ui.resonance.style.width=(zone?.stress||0)+'%';ui.resonance.style.background=zone?.warning?'#df795b':'#bacb83';updateSurvivorHud();const speakers=run.players.filter(p=>p.speechTime>0);ui['zoey-dialogue'].textContent=speakers.map(p=>p.name.toUpperCase()+': '+p.speech).join('\n');ui['zoey-dialogue'].style.whiteSpace='pre-line';ui['zoey-dialogue'].style.display=speakers.length?'block':'none';ui.context.textContent=player.beingHealedBy?'BEING HEALED BY '+run.players.find(p=>p.id===player.beingHealedBy)?.name.toUpperCase()+' · HOLD STILL':player.dead?'YOU DIED Â· TEAMMATES CAN KEEP GOING':player.grab?'PINNED Â· TEAMMATE MUST SHOOT OR SHOVE THE SPECIAL OFF':player.down?'INCAPACITATED Â· TEAMMATE: HOLD E TO REVIVE':player.goo>0?`BOOMER GOO Â· ${Math.ceil(player.goo)}s Â· HORDE INCOMING`:player.prompt|| (player.carry?'CARRY EAST â†’ TRUCK Â· E TO DROP':'');ui['run-info'].textContent=`SEED ${run.seed} Â· ${Math.round(fps)} FPS Â· ${run.director.side.toUpperCase()}`;}



function updateSurvivorHud(){for(const [i,name] of ['bill','zoey','chloe'].entries()){const p=run.players[i],card=ui[name+'-card'];if(!p){card.style.display='none';continue;}card.style.display='';const state=DW.healthState(p);card.className=`survivor-card ${state.tone}${p.down&&!p.dead?' incapacitated':''}${p.dead?' deceased':''}${p===player?' controlled':''}`;card.setAttribute('aria-label',`${p.name}${p===player?' Â· You are controlling this survivor':''} Â· ${state.label} Â· ${Math.ceil(state.value)} health`);ui[name+'-hp'].textContent=p.dead?'âœ•':`+${Math.ceil(state.value)}`;const bar=i===0?ui.health:i===1?ui['partner-health']:ui['chloe-health'];bar.style.width=state.value+'%';bar.style.background='';ui[name+'-temp'].style.width=(!p.down&&!p.dead&&state.value?p.tempHp/state.value*100:0)+'%';ui[name+'-state'].textContent=p.dead?'DEAD':p.down?p.grab?'INCAPACITATED Â· FREE ME FIRST':'INCAPACITATED Â· HOLD E TO REVIVE':p.grab?'PINNED Â· RESCUE NEEDED':`${p===player?'YOU Â· ':p.ai?'AI Â· ':''}${p.lastStrike?'BLACK & WHITE Â· USE A KIT':state.label}${p.tempHp>0?` Â· TEMP +${Math.ceil(p.tempHp)}`:''}${p.adrenalineTime>0?` Â· SPEED ${Math.ceil(p.adrenalineTime)}s`:''}`;ui[name+'-revive'].style.width=Math.min(100,p.revive/2.3*100)+'%';}}



const characterArt={};

// Source rectangles exclude the transparent margins while preserving foot alignment.

const spriteLayout=DW.SPRITES;



function weaponShovePose(a){const t=Math.max(0,Math.min(1,1-(a.shoveAnim||0)/.28)),smooth=v=>v*v*(3-2*v);let angle;if(t<.22)angle=-.58*smooth(t/.22);else if(t<.65)angle=-.58+1.53*smooth((t-.22)/.43);else angle=.95*(1-smooth((t-.65)/.35));return {angle,reach:Math.sin(t*Math.PI)*10,weight:Math.sin(t*Math.PI)};}

for(const name of Object.keys(spriteLayout)){const img=new Image();img.src=`assets/characters/${name}${name==='bill'||name==='zoey'||name==='chloe'?'-pistol':''}.png`;characterArt[name]=img;}

function drawArtRig(img,source,height,a){const [sx,sy,sw,sh]=source,width=sw/sh*height,pose=a.role?{angle:0,drop:a.role==='hunter'&&a.crouch>0?10:0,bob:a.moving?Math.sin(a.walkCycle||0)*1.2:0}:DW.bodyPose(a);const crouch=a.role?0:a.crouchAmount||0,cut=a.role?.50:a.id===1?.51:.44,kneeCut=.76,hipY=-height*(1-cut)+pose.drop,thigh=height*(kneeCut-cut),calf=height*(1-kneeCut),walk=a.moving&&(!a.role?a.onGround:true)?Math.sin(a.walkCycle||0)*.32:0;

  // Preserve each full leg silhouette; small hip swings avoid tearing the painted anatomy.

  for(let leg=0;leg<2;leg++){const side=leg?1:-1,hipX=side*width*.12,left=-width/2+leg*width/2;ctx.save();ctx.translate(hipX,hipY);ctx.rotate(walk*side*.38);ctx.drawImage(img,sx+leg*sw/2,sy+sh*cut,sw/2,sh*(1-cut),left-hipX,0,width/2,height*(1-cut)-pose.drop);ctx.restore();}

  if(!a.role){const arms=DW.survivorArms(a)[(a.weapon==='rifle'||a.weapon==='smg')?'rifle':'pistol'],swipe=a.shoveAnim>0?weaponShovePose(a):{angle:0,reach:0,weight:0},scale=height/sh,toLocal=([px,py])=>[(px-sx-sw/2)*scale,(py-sy)*scale-height+pose.drop+pose.bob],points=arms.outline.map(toLocal),pivot=toLocal(arms.pivot);

    const outline=()=>{ctx.moveTo(points[0][0],points[0][1]);for(const p of points.slice(1))ctx.lineTo(p[0],p[1]);ctx.closePath();};

    // Keep the head and coat upright. Only the shoulder/arms/weapon layer aims.

    const bodyOutline=a.id===3?[[260,0],[610,0],[610,220],[570,260],[607,375],[578,560],[372,565],[350,470],[265,470]]:a.id===2?[[190,0],[565,0],[565,225],[510,265],[540,390],[520,630],[280,630],[300,440],[235,340],[190,230]]:[[240,0],[710,0],[710,270],[600,280],[630,420],[610,660],[255,660],[300,440],[300,235]];ctx.save();ctx.beginPath();const bodyPoints=bodyOutline.map(toLocal);ctx.moveTo(...bodyPoints[0]);for(const point of bodyPoints.slice(1))ctx.lineTo(...point);ctx.closePath();ctx.clip();ctx.beginPath();ctx.rect(-width/2,-height+pose.drop+pose.bob,width,height*cut+.5);outline();ctx.clip('evenodd');ctx.drawImage(img,sx,sy,sw,sh*cut,-width/2,-height+pose.drop+pose.bob,width,height*cut);ctx.restore();

    const torsoOutline=a.id===3?[[330,250],[575,260],[607,375],[578,560],[372,565],[385,470],[330,350]]:a.id===2?[[265,250],[510,265],[540,390],[520,630],[280,630],[300,440],[255,340]]:[[345,235],[600,265],[630,420],[610,660],[255,660],[300,440],[315,320]];ctx.save();ctx.beginPath();const torsoPoints=torsoOutline.map(toLocal);ctx.moveTo(...torsoPoints[0]);for(const point of torsoPoints.slice(1))ctx.lineTo(...point);ctx.closePath();ctx.clip();ctx.beginPath();outline();ctx.clip();const shirt=a.id===3?[440,440,100,100]:a.id===2?[340,475,165,100]:[345,480,125,120];const shirtTop=toLocal([a.id===1?255:a.id===2?255:330,235]),shirtBottom=toLocal([a.id===1?630:a.id===2?540:607,a.id===1?660:a.id===2?630:565]);ctx.drawImage(img,...shirt,shirtTop[0],shirtTop[1],shirtBottom[0]-shirtTop[0],shirtBottom[1]-shirtTop[1]);ctx.restore();

    ctx.drawImage(img,sx,sy+sh*(cut-.09),sw,sh*.09,-width/2,-height*(1-cut+.09)+pose.drop+pose.bob,width,height*.09+1);

    ctx.save();if(a.healthHeld||a.healthUseTime)ctx.globalAlpha=0;ctx.translate(pivot[0]+swipe.reach,pivot[1]);ctx.rotate(pose.armAngle*(1-swipe.weight)+swipe.angle);ctx.translate(-pivot[0],-pivot[1]);ctx.beginPath();outline();ctx.clip();ctx.drawImage(img,sx,sy,sw,sh*cut,-width/2,-height+pose.drop+pose.bob,width,height*cut);ctx.restore();

    if(a.shoveAnim>0){ctx.save();ctx.globalAlpha=swipe.weight*.35;ctx.strokeStyle='#dbe4a2';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(pivot[0]+swipe.reach,pivot[1],a.weapon==='pistol'?26:34,-.6,.95);ctx.stroke();ctx.restore();}

  }else{ctx.save();ctx.translate(0,hipY+pose.bob);ctx.rotate(pose.angle);ctx.drawImage(img,sx,sy,sw,sh*(cut+.005),-width/2,-height*cut,width,height*(cut+.005));ctx.restore();}

}

function realisticCharacter(x,y,a){

  const key=a.role?(spriteLayout[a.role]?a.role:['infected-worker','infected-office','infected-civilian'][a.tint%3]):DW.survivorName(a)+((a.weapon==='rifle'||a.weapon==='smg')?'-rifle':''),img=characterArt[key];

  if(!img?.complete||!img.naturalWidth)return false;

  const [sx,sy,sw,sh,baseHeight]=spriteLayout[key],height=key==='hunter'&&a.grabbing?48:baseHeight,width=sw/sh*height;const hunterPin=!a.role&&run.zombies.some(z=>z.role==='hunter'&&z.id===a.grab);

  const victim=a.grabbing?run?.players.find(p=>p.grab===a.id):null;

  const target=victim||run?.players.filter(p=>!p.down).sort((p,q)=>Math.abs(p.x-x)-Math.abs(q.x-x))[0];

  const facing=a.role?Math.sign((target?.x??x+1)-x)||1:DW.bodyPose(a).facing;

  const moving=a.role?!a.grabbing&&!a.stagger&&!a.crouch&&!a.aimTime:Math.abs(a.vx)>1;

  const bob=0;

  ctx.save();ctx.translate(x,y);ellipse(0,1,key==='boomer'?25:17,3,'#101d1b77');

  ctx.save();ctx.scale(facing,1);

  if(a.down||hunterPin){ctx.translate(27,-6);ctx.rotate(-Math.PI/2);}

  else if(key==='hunter'&&a.grabbing){ctx.translate(-8,-6);ctx.rotate(Math.sin(time*12)*.05);}else if(key==='hunter'&&a.pouncing){ctx.translate(0,-8);ctx.rotate(-.22);}

  else if(a.climbing&&['hunter','smoker','boomer'].includes(a.role))ctx.rotate(-.12+Math.sin(a.walkCycle||0)*.05);else if(a.pileClimbing||a.pileLevel!=null)ctx.rotate((a.pileStumble>0?-.2:.05)*Math.sin(a.walkCycle||0));else if(a.pileFalling||a.pileStumble>0)ctx.rotate(-.23);else if(a.stagger>0)ctx.rotate(-.07);

  if(a.down&&!a.dead){ctx.shadowColor='#ffad32';ctx.shadowBlur=10;}if(a.dead)ctx.globalAlpha=.4;ctx.imageSmoothingEnabled=true;

  if(!a.down&&!hunterPin&&!(a.role==='hunter'&&(a.grabbing||a.pouncing)))drawArtRig(img,spriteLayout[key],height,a);else ctx.drawImage(img,sx,sy,sw,sh,-width/2,-height+bob,width,height);

  if(a.climbing&&['hunter','smoker','boomer'].includes(a.role)){const reach=Math.sin(a.walkCycle||0)*7;limb(-7,-height*.61,3,-height*.76,13,-height*.94+reach,a.role==='hunter'?'#68756f':'#93967e',4);limb(7,-height*.59,18,-height*.74,20,-height*.92-reach,a.role==='hunter'?'#76847b':'#a2a58c',4);}

  ctx.restore();

  if(!a.role&&a.carry){rect(-13,-34,26,22,'#687b75');rect(-8,-30,16,4,'#d8dd8b');}

  if(!a.role&&a.weaponLasers[a.weapon]&&!a.down&&!a.grab){const mount=DW.weaponOrigin(a),mx=mount.x-x,my=mount.y-y;rect(mx-Math.cos(mount.angle)*6-2,my+2,4,2,'#373f3a');ellipse(mx-Math.cos(mount.angle)*4,my+2,1.5,1.5,survivorLaserColor(a));}if(a.flash>0){const muzzle=DW.weaponOrigin(a),mx=muzzle.x-x,my=muzzle.y-y;line(mx,my,mx+Math.cos(muzzle.angle)*12,my+Math.sin(muzzle.angle)*12,'#fff0ac',4);ellipse(mx,my,3,3,'#fff4c1');}

  ctx.font='bold 10px monospace';ctx.fillStyle=a.role?'#e0aaa0':'#f1b1a5';

  ctx.textAlign='center';ctx.fillText(a.role?(key.startsWith('infected-')?'':key.toUpperCase()):`${a.name.toUpperCase()}${a.dead?' Â· DEAD':a.down?' Â· DOWN':hunterPin?' Â· PINNED':''}`,0,a.down||hunterPin?-30:-height-9);

  if(a.crouch>0||a.aimTime>0||a.burstTimer>0){ctx.strokeStyle='#e2ab70';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-height+12,15,0,Math.PI*2);ctx.stroke();}

  if(a.role==='hunter'&&a.grabbing){const strike=Math.sin(time*16)*8;limb(-6,-31,-14,-20,-11,-9+strike,'#9a9d8b',3);limb(9,-32,18,-21,12,-10-strike,'#9a9d8b',3);}if(a.grab){ctx.strokeStyle='#d98c62';if(hunterPin)ctx.strokeRect(-37,-24,75,25);else ctx.strokeRect(-20,-height,40,height);}

  ctx.restore();return true;

}



function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}

function line(x,y,a,b,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(a,b);ctx.stroke()}

function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}

function rail(start,end,y,back){for(let x=start;x<end;x+=80){rect(x,y-77,4,77,back?'#42504a':'#718074');line(x,y-45,Math.min(x+80,end),y-77,back?'#35413d':'#4e5e53');line(x,y-77,Math.min(x+80,end),y-45,back?'#35413d':'#4e5e53')}rect(start,y-78,end-start,4,back?'#526157':'#82907d');rect(start,y-43,end-start,2,'#4b5d50')}

function limb(x,y,kx,ky,ex,ey,color,width){ctx.lineCap='round';line(x,y,kx,ky,color,width);line(kx,ky,ex,ey,color,width*.8);ctx.lineCap='butt'}

const witchArt=new Image();witchArt.src='assets/characters/witch-sheet.png';

const tankArt=new Image();tankArt.src='assets/characters/tank.png';

const tankPropsArt=new Image();tankPropsArt.src='assets/tank-props.png';

const survivorLaserColors={bill:'#70ff76',zoey:'#ff5454',chloe:'#ffab49'};
function survivorLaserColor(p){return survivorLaserColors[DW.survivorName(p)]||survivorLaserColors.bill;}
function drawWeaponLasers(){if(!run)return;ctx.save();ctx.translate(0,verticalOffset());ctx.scale(viewZoom,viewZoom);ctx.translate(-camera,0);ctx.globalCompositeOperation='screen';for(const p of run.players){const ray=run.laserTrace(p);if(!ray)continue;const color=survivorLaserColor(p);ctx.globalAlpha=.55;line(ray.x,ray.y,ray.endX,ray.endY,color,.8);ctx.globalAlpha=.95;ellipse(ray.endX,ray.endY,1.8,1.8,color);ellipse(ray.x,ray.y,1,1,color);}ctx.restore();}

function drawRockSprite(){if(tankPropsArt.complete&&tankPropsArt.naturalWidth)ctx.drawImage(tankPropsArt,385,30,1030,397,-32,-17,64,34);else ellipse(0,0,24,18,'#858074');}

function drawCarSprite(car){ctx.save();ctx.translate(car.x+62,car.y-24);ctx.rotate(car.spin||0);if(tankPropsArt.complete&&tankPropsArt.naturalWidth){if(!car.isAlarm)ctx.filter='sepia(.5) saturate(.65)';ctx.drawImage(tankPropsArt,86,455,1590,413,-78,-24,156,48);ctx.filter='none';for(let i=0;i<22;i++){const px=(i*23%133)-65,py=(i*13%15)+2;rect(px,py,2+i%3,1,'#513b2c65');}line(-29,-17,-13,-13,'#b0bba630',1);line(11,-15,28,-11,'#28373765',1);DeadwalkEnvironment.carDetail(ctx,car,tankPropsArt);}else{rect(-63,-20,126,35,'#726153');ellipse(-42,19,11,11,'#11181c');ellipse(42,19,11,11,'#11181c');}ctx.restore();}

function drawTank(x,y,a){

 const size=135,width=144,walk=a.moving?Math.sin(a.walkCycle||0):0,progress=a.rockWindup>0?clamp(1-a.rockWindup/2.1,0,1):0,reach=a.rockWindup>0?Math.sin(Math.min(1,progress/.4)*Math.PI/2)*(1-clamp((progress-.35)/.3,0,1)):0,lift=clamp((progress-.28)/.42,0,1),throwing=clamp((progress-.72)/.28,0,1),punch=a.punchFlash>0?Math.sin((1-a.punchFlash/.3)*Math.PI):0,leap=a.jumping?1:a.jumpWindup>0?clamp(1-a.jumpWindup/.65,0,1):0,turn=a.turnTime>0?clamp(1-a.turnTime/.26,0,1):1,face=a.turnTime>0?(a.turnFrom||-a.facing)*(1-turn)+(a.facing||1)*turn:a.facing||1;

 if(a.jumping){ctx.save();ctx.globalAlpha=.55;ellipse(x,run.floor(x),38,5,'#060b0dbb');ctx.restore();}ctx.save();ctx.translate(x,y);ctx.scale(face,1);ctx.rotate(a.stagger>0?-.18*Math.sin((1-a.stagger/1.25)*Math.PI):a.moving?.07:0);if(!a.jumping)ellipse(0,0,50,6,'#060b0dbb');

 function part(points,pivot,angle,dy=0){ctx.save();ctx.translate(pivot[0],pivot[1]+dy);ctx.rotate(angle);ctx.translate(-pivot[0],-pivot[1]);ctx.beginPath();for(let i=0;i<points.length;i++){const p=points[i];if(i)ctx.lineTo(p[0],p[1]);else ctx.moveTo(p[0],p[1]);}ctx.closePath();ctx.clip();ctx.drawImage(tankArt,-width/2,-size,width,size);ctx.restore();}

 if(tankArt.complete&&tankArt.naturalWidth){

  part([[-25,-72],[0,-72],[6,-30],[-10,-13],[-34,-18]],[-10,-65],walk*.22-leap*.35,reach*5+leap*6);

  part([[0,-70],[25,-70],[31,-11],[4,-9],[-4,-28]],[12,-64],-walk*.23+leap*.38,reach*5+leap*6);

  part([[-73,-72],[-50,-112],[-23,-111],[-20,-61],[-37,-21],[-63,-17],[-73,-25]],[-33,-105],-walk*.19+reach*.24-lift*.9+leap*2.5,reach*12);

  part([[-51,-115],[-26,-135],[28,-135],[53,-117],[35,-83],[22,-55],[-20,-58],[-40,-85]],[0,-60],walk*.055+reach*.14,reach*16+Math.abs(walk)*3+(a.jumpWindup>0?leap*9:0));

  part([[29,-118],[50,-115],[73,-92],[73,0],[40,0],[26,-30],[21,-63]],[40,-109],walk*.19-leap*2.5+reach*.22-lift*2.15+throwing*.9-punch*1.45-(a.throwFollow>0?.7*a.throwFollow/.4:0),reach*13);

 }else{ellipse(0,-72,49,55,'#8b7a68');ellipse(-44,-46,20,42,'#9d8972');ellipse(44,-46,20,42,'#9d8972');}

 if(a.rockWindup>0&&progress>.24){const rx=38+throwing*45,ry=-15-lift*140+throwing*55;ctx.save();ctx.translate(rx,ry);ctx.rotate(-lift*.6);drawRockSprite();ctx.restore();}

 ctx.restore();ctx.fillStyle='#e3a178';ctx.font='bold 13px monospace';ctx.textAlign='center';ctx.fillText(a.dropping?'TANK · ROOFTOP DROP':a.stagger>0?'TANK · STUMBLED':a.falling?'TANK · DROPPING DOWN':a.jumpWindup>0?'TANK · PREPARING TO LEAP':a.jumping?'TANK · LEAPING':a.jumpLand>0?'TANK · LANDING':a.carWindup>0?'TANK · CAR STRIKE!':a.rockWindup>0?(progress<.4?'TANK · PICKING UP ROCK':'TANK · THROWING ROCK'):'TANK',x,y-size-16);rect(x-48,y-size-10,96,4,'#241c1b');rect(x-48,y-size-10,96*Math.max(0,a.hp/15000),4,'#e49a70');

}



function drawWitch(x,y,a){if(!witchArt.complete||!witchArt.naturalWidth)return false;const source=DW.WITCH_SPRITES[a.awake?'awake':'idle'],[sx,sy,sw,sh,h]=source,w=sw/sh*h;ctx.save();ctx.translate(x,y);ctx.scale(a.awake?(a.facing||1):1,1);if(a.climbing)ctx.rotate(Math.sin(a.walkCycle||0)*.08);ellipse(0,0,a.awake?24:21,3,'#050b0d99');if(!a.awake&&a.agitation>0){const rise=clamp(a.agitation,0,1),standing=DW.WITCH_SPRITES.awake,[tx,ty,tw,th,height]=standing;ctx.globalAlpha=1-rise;ctx.drawImage(witchArt,sx,sy,sw,sh,-w/2,-h-rise*12,w,h+rise*12);ctx.globalAlpha=rise;ctx.drawImage(witchArt,tx,ty,tw,th,-tw/th*height/2,-height,tw/th*height,height);ctx.globalAlpha=1;}else ctx.drawImage(witchArt,sx,sy,sw,sh,-w/2,-h+(a.moving?Math.sin(a.walkCycle||0)*1.5:0),w,h);ctx.restore();ctx.fillStyle=a.awake?'#f09587':'#9b9f96';ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillText(a.climbing?'WITCH Â· CLIMBING':a.awake?'WITCH Â· '+(run.players.find(p=>p.id===a.target)?.name.toUpperCase()||'ENRAGED'):a.agitation>.1?'WITCH Â· '+(a.agitation<=.45?'UNSETTLED ':'AGITATED ')+Math.round(a.agitation*100)+'%':'WITCH Â· DO NOT SHOOT',x,y-h-9);if(a.slashFlash>0){line(x,y-40,x+(a.facing||1)*40,y-17,'#edb7a4',3);}return true;}

function characterBody(x,y,a){if(a.role==='tank'){drawTank(x,y,a);return;}if(a.role==='witch'&&drawWitch(x,y,a))return;if(realisticCharacter(x,y,a))return;const z=!!a.role,role=a.role||'survivor',face=z?Math.sign((player?.x||x+1)-x)||1:DW.bodyPose(a).facing;const moving=z?!(a.stagger>0||a.windup>0):Math.abs(a.vx)>1;const walk=Math.sin(time*(role==='runner'?12:z?3.5:10)+ (a.phase||0))*(moving?(z?7:10):1);ctx.save();ctx.translate(x,y);if(!z&&a.down){ellipse(0,-5,23,6,'#5f7068');ellipse(22,-8,8,7,'#b6a58e');line(-20,-5,-34,-3,'#3c4a46',6);ctx.fillStyle='#e3b574';ctx.font='10px monospace';ctx.fillText('REVIVE',-20,-22);ctx.restore();return}ellipse(0,1,19,3,'#101d1b77');const lean=z?(role==='hunter'?18:role==='runner'?10:5):a.carry?-5:a.reload?3:0;const wide=role==='boomer'?25:role==='breacher'?15:z?10:11,torso=z?role==='hunter'?'#353b62':role==='smoker'?'#788f83':role==='boomer'?'#a2a85c':role==='breacher'?'#736e5b':role==='grabber'?'#6b7274':'#687a67':a.id===2?'#ac4b48':'#a1ad85';const skin=z?'#9daa87':'#cab99b';

limb(-5,-23,-7-walk*.4,-12,-8+walk,0,'#33443e',7);limb(5,-23,7+walk*.4,-13,8-walk,0,z?'#3e4b3e':a.id===2?'#485e65':'#50634f',7);line(-8+walk,0,-3+walk,0,'#1e2a27',5);line(8-walk,0,13-walk,0,'#1e2a27',5);

ctx.fillStyle=torso;ctx.beginPath();ctx.moveTo(-wide+lean,-47);ctx.quadraticCurveTo(lean,-54,wide+lean,-45);ctx.lineTo(9,-23);ctx.quadraticCurveTo(0,-20,-9,-24);ctx.closePath();ctx.fill();line(lean,-48,lean+face*2,-55,skin,6);ellipse(lean+face*3,-59,8,10,skin);if(z){line(lean+face*7,-62,lean+face*10,-60,'#dadf9b',2);limb(lean+face*6,-43,face*18,-36,face*(role==='grabber'?37:27),-28+walk*.3,skin,5);limb(lean-face*6,-43,face*11,-32,face*22,-29-walk*.3,torso,5);if(role==='breacher'){ellipse(lean,-55,12,7,'#8b8170');line(-9,-34,10,-32,'#c6a574',3)}if(role==='runner'){line(lean+2,-45,lean+4,-24,'#93634e',3)}if(role==='climber'){line(-8,-39,7,-27,'#b0b093',2)}if(['hunter','smoker','boomer'].includes(role)){if(role==='hunter'){ellipse(lean,-62,12,8,'#303a55');limb(-8,-25,-22,-12,-29,0,'#3b4262',6);limb(8,-25,23,-12,30,0,'#3b4262',6);}if(role==='smoker'){ellipse(-7,-47,10,14,'#a6b682');line(face*11,-57,face*22,-52,'#c08484',3);}if(role==='boomer'){ellipse(0,-31,25,22,'#a2af64');ellipse(8,-35,5,6,'#657449');}ctx.font='bold 10px monospace';ctx.fillStyle=role==='boomer'?'#dae68e':'#e0aaa0';ctx.fillText(role.toUpperCase(),-23,-91);}if(a.windup>0||a.crouch>0||a.aimTime>0||a.burstTimer>0){ctx.strokeStyle='#e2ab70';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-58,15,0,Math.PI*2);ctx.stroke()}if(a.stagger>0){line(-12,-70,-16,-75,'#cfd48d');line(12,-70,16,-74,'#cfd48d')}}else{if(a.id===2){ellipse(lean,-65,9,5,'#44312a');limb(lean-7,-62,lean-13,-48,lean-14,-39,'#44312a',5);line(lean,-47,lean,-27,'#ddd5c9',2);}else ellipse(lean+2,-65,10,5,'#526b4e');line(lean-7,-49,lean-7,-27,'#354c42',5);line(-9,-28,9,-28,'#354c42',4);if(a.carry){limb(-7,-43,-18,-35,-12,-24,skin,5);limb(7,-43,18,-35,12,-24,skin,5);rect(-13,-34,26,20,'#687b75');rect(-8,-30,16,3,'#d8dd8b')}else{ctx.save();ctx.translate(lean,-43);ctx.rotate(a.angle-(a.flash>0?.045:0));const retract=a.reload?Math.sin(a.reload*4)*8:0;limb(-2,2,12,10,25-retract,2,skin,5);rect(0,-5,35,8,'#1a2427');rect(30,-3,13,4,'#82958b');rect(9,4,9,10,'#263335');if(a.flash>0){ctx.fillStyle='#f8e8ac';ctx.beginPath();ctx.moveTo(42,0);ctx.lineTo(58,-7);ctx.lineTo(52,0);ctx.lineTo(59,5);ctx.closePath();ctx.fill()}ctx.restore()}ctx.fillStyle=a.id===2?'#93b9cc':'#d2df93';ctx.font='9px monospace';ctx.fillText(a.id===2?'ZOEY':'P'+a.id,-6,-82);if(a.role==='hunter'&&a.grabbing){const strike=Math.sin(time*16)*8;limb(-6,-31,-14,-20,-11,-9+strike,'#9a9d8b',3);limb(9,-32,18,-21,12,-10-strike,'#9a9d8b',3);}if(a.grab){ctx.strokeStyle='#d98c62';ctx.strokeRect(-19,-75,38,77)}}ctx.restore()}

function drawPipeBomb(x,y,flashing=false,angle=0){ctx.save();ctx.translate(x,y);ctx.rotate(angle);rect(-5,-13,10,26,'#7b8483');rect(-6,-15,12,3,'#c4c8c0');rect(-6,12,12,3,'#c4c8c0');rect(-8,-10,7,10,'#344453');rect(2,-9,6,11,'#b6b7a5');rect(3,-7,3,6,'#58655c');line(-4,-12,-8,-20,'#343a39',2);line(-4,-9,6,2,'#984a3d',1);ellipse(0,-10,2.5,2.5,flashing?'#ff3023':'#792c29');if(flashing){ellipse(0,-10,11,11,'#ff38213d');line(-10,-10,-16,-10,'#ff7663',2);line(10,-10,16,-10,'#ff7663',2);}ctx.restore();}

function drawLaserBox(x,y){rect(x-23,y-27,46,27,'#c2c6bf');rect(x-24,y-30,48,4,'#ededdd');rect(x-21,y-26,42,7,'#28342e');rect(x+23,y-31,5,31,'#858d85');line(x+22,y-29,x+37,y-43,'#c9cbbb',5);line(x-21,y-26,x-21,y-4,'#f1efdf',2);line(x-11,y-14,x+8,y-14,'#222d29',3);line(x+7,y-14,x+15,y-17,'#222d29',2);ctx.strokeStyle='#c7332d';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(x-5,y-15,8,0,Math.PI*2);ctx.stroke();line(x-5,y-25,x-5,y-5,'#c7332d',1);line(x-16,y-15,x+5,y-15,'#c7332d',1);ctx.fillStyle='#f3e8cd';ctx.font='bold 10px monospace';ctx.fillText('LASER SIGHTS Â· E',x-46,y-50);}

function drawInteractables(){if(!run)return;for(const zone of run.zones){if(zone.stress>20){rect(zone.x,416,zone.end-zone.x,3,zone.warning?'#dd805b':'#8d9a67');if(zone.warning){ctx.fillStyle='#edac75';ctx.font='bold 12px monospace';ctx.fillText(`SERVICE BREACH ${zone.warning.toFixed(1)}s`,zone.x+70,320)}}}

for(const x of(run.map==='no-mercy'?[]:[925,3070])){line(x-10,420,x-10,660,'#8c9c85',3);line(x+10,420,x+10,660,'#8c9c85',3);for(let y=435;y<660;y+=20)line(x-10,y,x+10,y,'#768a73',3);ctx.fillStyle='#becb8a';ctx.font='9px monospace';ctx.fillText('E / X Â· LADDER',x-40,690)}

for(const g of run.gates){rect(g.x-12,413,24,7,'#c6bf75');if(g.hp>0){rect(g.x-5,345,10,75,'#7d8b77');if(!g.open){for(let y=354;y<410;y+=16)line(g.x-16,y,g.x+16,y,'#858e75',7);rect(g.x-16,337,32*(g.hp/120),3,'#cbd887')}else line(g.x,370,g.x+35,350,'#697969',5)}else{ctx.fillStyle='#a9b67b';ctx.font='10px monospace';ctx.fillText('Q / â†‘ Â· GATE: 2 SCRAP',g.x-65,327)}}

for(const b of run.laserBoxes)if(!b.hidden)drawLaserBox(b.x,b.y);for(const w of run.weaponPickups){if(w.used)continue;rect(w.x-25,w.y-23,46,6,'#788482');rect(w.x-15,w.y-17,9,10,'#515d56');rect(w.x+18,w.y-22,15,3,'#a7b5a7');line(w.x-24,w.y-19,w.x-32,w.y-13,'#55695d',5);ctx.fillStyle='#ccd89b';ctx.font='10px monospace';ctx.fillText(DW.WEAPONS[w.weapon].name.toUpperCase()+(mobileMode?'':' Â· E'),w.x-48,w.y-40);}for(const g of run.grenadePickups){if(g.used)continue;drawPipeBomb(g.x,g.y-18,true,.3);ctx.fillStyle='#e3ca90';ctx.font='10px monospace';ctx.fillText(mobileMode?'PIPE BOMB':'PIPE BOMB Â· E',g.x-36,g.y-48);}for(const b of run.pipeBombs){drawPipeBomb(b.x,b.y-10,b.flash>0,b.grounded?.45:time*5);ctx.fillStyle='#ffab8c';ctx.font='bold 11px monospace';ctx.fillText(`${Math.max(0,b.fuse).toFixed(1)}s`,b.x-12,b.y-38);}

for(const pile of run.ammoPiles){rect(pile.x-28,pile.y-24,56,24,'#657554');rect(pile.x-30,pile.y-28,60,6,'#a3ad7b');for(let i=0;i<5;i++)rect(pile.x-20+i*9,pile.y-20,5,12,'#d8b56d');ctx.fillStyle='#e3db9b';ctx.font='bold 11px monospace';ctx.fillText('AMMO · UNLIMITED'+(mobileMode?'':' · E'),pile.x-65,pile.y-42);}

for(const c of run.caches){rect(c.x-20,c.y-28,40,28,c.used?'#3b4c43':'#6a7a62');line(c.x-16,c.y-15,c.x+16,c.y-15,'#a9b68c',2);if(!c.used){rect(c.x-3,c.y-24,6,18,'#d7db91');rect(c.x-9,c.y-18,18,5,'#d7db91');ctx.fillStyle='#cad693';ctx.font='10px monospace';ctx.fillText('SUPPLIES',c.x-23,c.y-38)}}

for(const c of run.cells){if(c.done||c.carrier)continue;rect(c.x-13,c.y-25,26,25,'#516963');rect(c.x-9,c.y-21,18,4,'#d4de8b');rect(c.x-7,c.y-31,14,5,'#819c85');ctx.fillStyle='#d5df91';ctx.font='10px monospace';ctx.fillText('POWER CELL',c.x-30,c.y-40)}

if(run.map!=='no-mercy'){rect(3430,602,210,47,'#556b61');rect(3460,565,100,37,'#63766a');rect(3470,570,38,25,'#203c3c');rect(3515,570,35,25,'#203c3c');ellipse(3470,650,17,17,'#162826');ellipse(3600,650,17,17,'#162826');rect(3635,614,7,7,'#d9d89a');ctx.fillStyle='#d3de90';ctx.font='bold 12px monospace';ctx.fillText(`EXTRACTION Â· ${run.delivered}/3`,3460,550);}if(run.lure){const x=run.lure.x,y=floorAt(x)-20;ellipse(x,y,8,11,'#dec78c');ctx.strokeStyle='#ccb97655';ctx.beginPath();ctx.arc(x,y,20+Math.sin(time*8)*6,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#e1cf90';ctx.font='9px monospace';ctx.fillText('BELL',x-12,y-22)}}

function drawMercyLevel(){

  function label(text,x,y,color='#d6d1af',size=12){ctx.fillStyle=color;ctx.font=`bold ${size}px monospace`;ctx.fillText(text,x,y);}

  function brick(x,y,w,h,color='#483a36'){DeadwalkEnvironment.surface(ctx,'brick',x,y,w,h);}

  function window(x,y){if(DeadwalkEnvironment.windowDetail(ctx,x,y))return;rect(x,y,40,66,'#101d22');DeadwalkEnvironment.surface(ctx,'glass',x+3,y+3,34,60);if((Math.floor(x/110)+Math.floor(y/100))%5===0){line(x+5,y+12,x+33,y+49,'#777463',5);line(x+4,y+15,x+33,y+52,'#2e372e',1);}else if(Math.floor(x)%7<2){line(x+7,y+6,x+18,y+29,'#a5b8ac55',1);line(x+18,y+29,x+8,y+43,'#a5b8ac55',1);}line(x+20,y,x+20,y+66,'#61716d',2);line(x,y+31,x+40,y+31,'#61716d',2);}

  // Apartment building shown as a cutaway, with both stair flights and a broken room.

  brick(0,-60,1940,280);rect(0,220,620,14,'#788079');DeadwalkEnvironment.surface(ctx,'concrete',0,234,620,700);

  for(let x=40;x<580;x+=140){rect(x,190,100,30,'#394549');rect(x+12,178,76,12,'#89918a');line(x+20,180,x+20,167,'#89918a',5);}

  rect(370,102,120,118,'#343538');rect(363,95,134,9,'#777a72');rect(412,128,53,92,'#161f23');rect(417,133,43,87,'#454634');ellipse(398,119,7,4,'#ffe6a1');

  label('SOS',70,202,'#979c8b',32);label('APARTMENTS â†’',400,83);rail(0,355,220,true);

  DeadwalkEnvironment.surface(ctx,'concrete',620,70,1320,620);for(let x=650;x<1900;x+=180){window(x,125);window(x,367);}

  for(const [start,top] of [[620,220],[1260,340]]){for(let i=0;i<10;i++){const x=start+i*32,y=top+i*12;DeadwalkEnvironment.surface(ctx,'concrete',x,y,32,18);rect(x,y+3,32,4,'#939487');line(x,y-65,x+32,y-53,'#88918b',3);}label('â†“ STAIRS',start+30,top-85);}

  rect(940,340,320,14,'#75796e');rect(1580,460,360,14,'#75796e');rect(1000,287,85,53,'#655c4e');rect(1010,278,65,14,'#84765f');rect(1630,414,105,46,'#65584c');rect(1730,396,62,64,'#535a51');label('DROP THROUGH FLOOR â†“',1735,370,'#d6b583');

  // Jagged edge and exposed joists make the drop clearly one way.

  for(let x=1880;x<1940;x+=15){line(x,470,x+12,494,'#aaa18c',4);}DeadwalkEnvironment.surface(ctx,'asphalt',1940,660,680,400);brick(1940,220,660,440,'#3b3331');for(let x=2010;x<2550;x+=170)window(x,330);

  rect(2060,602,110,58,'#35514a');rect(2050,596,130,9,'#627468');rect(2320,610,78,50,'#574c3c');for(let i=0;i<9;i++)rect(2200+i*25,651,10,4,'#96988a');line(2470,265,2470,635,'#758079',4);label('ALLEY â†’',2160,545);

  // Hotel intersection, discount shop, green awning, wrecked cars and overhead cables.

  brick(2600,230,880,430,'#563b34');for(let x=2640;x<3420;x+=110){window(x,262);window(x,350);}rect(2690,500,240,160,'#19262b');rect(2705,514,210,101,'#57716b');line(2810,515,2810,615,'#94948a',3);rect(2670,486,280,14,'#33574e');ctx.fillStyle='#3c6556';ctx.beginPath();ctx.moveTo(2690,447);ctx.lineTo(2925,447);ctx.lineTo(2970,486);ctx.lineTo(2655,486);ctx.fill();rect(2730,420,170,22,'#c4bea5');label('DISCOUNT',2747,436,'#443e36',17);

  rect(3180,340,64,210,'#181b21');for(const [i,t] of [...'HOTEL'].entries())label(t,3200,374+i*33,'#ed7058',27);

  DeadwalkEnvironment.surface(ctx,'asphalt',2600,660,880,400);for(let x=2640;x<3420;x+=140)rect(x,694,73,4,'#a99859');

  for(let i=0;i<3;i++){ctx.strokeStyle='#11191e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-15+i*9);ctx.quadraticCurveTo(2300,190+i*10,3480,210+i*9);ctx.stroke();}

  brick(3480,230,1600,430,'#493b35');DeadwalkEnvironment.surface(ctx,'asphalt',3480,660,1600,400);for(let x=3520;x<5050;x+=130){window(x,280);window(x,380);rect(x,694,73,4,'#a99859');}label('WRECKED STREET / CLIMB OVER CARS',3720,560,'#cbd2bb',14);

  ctx.save();ctx.translate(1600,0);

  label('SUBWAY â†’',3310,570,'#cbd2bb',17);rect(3470,490,215,38,'#2c534b');label('SUBWAY',3492,516,'#eee7cd',24);

  DeadwalkEnvironment.surface(ctx,'concrete',3480,550,720,500);for(let i=0;i<10;i++){const x=3480+i*32,y=660+i*12;DeadwalkEnvironment.surface(ctx,'concrete',x,y,32,20);rect(x,y,32,4,'#a3a38c');line(x,y-57,x+32,y-45,'#8a9b94',3);}

  DeadwalkEnvironment.surface(ctx,'pavement',3800,780,400,400);DeadwalkEnvironment.surface(ctx,'metal',3910,565,290,215);for(let x=3930;x<4190;x+=65){rect(x,720,48,45,'#3b4038');rect(x+5,710,38,10,'#7b806b');}rect(4010,650,145,9,'#9a9275');for(let i=0;i<3;i++){rect(4020+i*45,631,24,18,'#a34136');line(4032+i*45,634,4032+i*45,646,'#e6dcc4',3);line(4026+i*45,640,4038+i*45,640,'#e6dcc4',3);}label('SAFE ZONE ENDS HERE',3950,604,'#aaaf8b',11);label('NO BITES. NO EXCUSES.',3950,624,'#b8b09a',10);

  ctx.restore();

  if(run){DeadwalkEnvironment.streetDetail(ctx,{left:camera,right:camera+W/viewZoom,time,floor:x=>run.floor(x)});DeadwalkEnvironment.decorate(ctx,{left:camera,right:camera+W/viewZoom,time,floor:x=>run.floor(x)});}
  for(const car of run?.cars||[]){drawCarSprite(car);if(car.isAlarm){const flash=car.alarm>0&&Math.floor(run.time*5)%2===0;if(flash){rect(car.x+5,car.y-35,9,8,'#f35435');rect(car.x+113,car.y-35,9,8,'#fff0ab');}if(!car.flying)label(car.triggered?(car.alarm>0?'ALARM! HORDE INCOMING':'ALARM DISABLED'):'ALARM CAR · DO NOT SHOOT',car.x-20,car.y-75,car.alarm>0?'#efad6e':'#c4b577',10);}}

  drawSafeRoomDoor(run?.safeDoor||{x:3890,y:780,open:false});

  // Rain and scattered papers unify the rooftop and outdoor stretch.

  for(let i=0;i<75;i++){const x=(i*97+time*28)%3500,y=(i*43+time*290)%740;if(x<620||x>1940)line(x,y,x-4,y+14,'#8eaaa322',1);}

}


function visibleFireBarrels(){return run?.map==='no-mercy'?DW.FIRE_BARRELS.filter(b=>b.x>camera-180&&b.x<camera+W/viewZoom+180):[];}
function drawFireBarrel(b){DeadwalkEnvironment.heatShimmer(ctx,b,time);const fire=DeadwalkEnvironment.fireProfile(b,time);ctx.save();ctx.translate(b.x,b.y);ellipse(2,1,19,3,'#07101150');const metal=ctx.createLinearGradient(-15,0,15,0);metal.addColorStop(0,'#242725');metal.addColorStop(.3,['#66624c','#6e5139','#4f5c55','#735b47'][fire.variant]);metal.addColorStop(.7,'#49382b');metal.addColorStop(1,'#232722');ctx.fillStyle=metal;ctx.fillRect(-14,-39,28,37);ellipse(0,-2,14,3,'#39352b');for(let i=0;i<45;i++){const x=((i*17+7)%27)-13,y=-35+(i*13%30);rect(x,y,1+i%2,1+i%3,i%3?'#8d482d88':'#1b211f88');}for(const y of [-29,-12]){rect(-15,y,30,3,'#222b28');line(-14,y,13,y,'#82765b',1);}ellipse(0,-39,15,4,'#282521');ellipse(0,-39,12,2.8,'#ed9d32');const interior=ctx.createLinearGradient(0,-38,0,-23);interior.addColorStop(0,'#ec8c3860');interior.addColorStop(1,'#de663000');ctx.fillStyle=interior;ctx.fillRect(-11,-38,22,15);for(let i=0;i<5;i++){const x=-10+i*5,sway=(Math.sin(time*3.7+b.phase*5+i)*3+fire.noise*2),height=(14+Math.sin(time*(5.1+i*.21)+b.phase+i*2)*5+(i===2?9:0))*fire.size;ctx.beginPath();ctx.moveTo(x-4,-39);ctx.quadraticCurveTo(x-6+sway,-49,x+sway,-39-height);ctx.quadraticCurveTo(x+1+sway,-47,x+5,-39);const flame=ctx.createLinearGradient(0,-39-height,0,-39);flame.addColorStop(0,'#dc592aaa');flame.addColorStop(.5,'#ff9828ee');flame.addColorStop(1,'#ffe4a2');ctx.fillStyle=flame;ctx.fill();}ellipse(0,-39,14,2,'#261c1688');for(let i=0;i<5;i++){const progress=(time*.24+b.phase+i*.23)%1;ellipse(Math.sin(time+b.phase+i)*7,-58-progress*35,7+progress*9,5+progress*6,`rgba(87,86,78,${(1-progress)*.13})`);}for(let i=0;i<3;i++){const rise=(time*18+b.phase*9+i*13)%32;rect(Math.sin(time*2+i+b.phase)*9,-44-rise,1,1,'#ffcb7970');}ctx.restore();}

function drawDarkness(){if(!run)return;DeadwalkLighting.render(ctx,{run,time,width:W,height:H,dpr,zoom:viewZoom,left:camera,right:camera+W/viewZoom,offset:verticalOffset()});}

function drawAimCrosshair(){if(state!=='playing'||!player||player.dead||player.down||player.grab||voiceMenuActor)return;let x=mouse.x,y=mouse.y;if(activePad&&controllerSettings.mode==='player'&&controllerAimActive||mobileMode&&touchInput.angle!==null){const origin=DW.weaponOrigin(player);x=(origin.x+Math.cos(origin.angle)*180-camera)*viewZoom;y=(origin.y+Math.sin(origin.angle)*180)*viewZoom+verticalOffset();}ctx.save();ctx.globalAlpha=player.weaponLasers?.[player.weapon]?.25:.45;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])line(x+dx*3,y+dy*3,x+dx*6,y+dy*6,'#dbe4a2',1);ctx.restore();}

function draw(){ctx.setTransform(dpr,0,0,dpr,0,0);const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#111d23');sky.addColorStop(.7,'#34423b');sky.addColorStop(1,'#171f20');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);

// Distant industrial skyline moves slower than the playable catwalk.

ctx.save();ctx.translate(-camera*.22,verticalOffset()*.35);for(let i=0;i<24;i++){const x=i*240,y=250+(i*37%100);rect(x,y,190,450,'#1b2b2b');rect(x+25,y-30,60,30,'#1b2b2b');for(let j=0;j<4;j++)rect(x+20+j*40,y+35,15,4,j%3===0?'#697365':'#35443e');line(x+150,y,x+150,y-85,'#243637',4)}ctx.restore();

ctx.save();ctx.translate((Math.random()-.5)*shake,verticalOffset()+(Math.random()-.5)*shake);ctx.scale(viewZoom,viewZoom);ctx.translate(-camera,0);

if(run?.map==='no-mercy'||!run){drawMercyLevel();}else{rect(1030,90,1900,330,'#273333');rect(1030,90,1900,12,'#516056');for(let x=1050;x<2910;x+=120){rect(x,116,4,290,'#35423e');rect(x+19,158,70,99,'#1a292c');rect(x+23,162,62,91,'#293b3b');line(x+54,162,x+54,253,'#44504a',3);line(x+23,206,x+85,206,'#44504a',3);rect(x+24,291,64,83,'#202e2e')}

rect(1780,302,125,118,'#1b292a');rect(1780,302,125,4,'#79856a');rect(1868,356,6,4,'#c9ca8a');ctx.fillStyle='#75806c';ctx.font='12px monospace';ctx.fillText('SECTOR 04 / STORAGE',1510,283);

rail(900,3100,world.deck,true);for(let i=0;i<12;i++){const x=420+i*40,y=660-i*20;rect(x,y,40,660-y,'#2d3b35');rect(x,y,40,5,'#87907a');line(x,y+8,x+40,y+8,'#162724',2);line(x,y-60,x+40,y-80,'#768571',3);line(x,y-60,x,y,'#52664f',3)}

rect(900,420,2200,14,'#8a927b');rect(900,434,2200,22,'#35483a');for(let x=930;x<3100;x+=160){rect(x,456,12,204,'#3c4d3e');line(x,458,x+140,650,'#3a4b3e',7);line(x+140,458,x,650,'#3a4b3e',7)}

rect(0,660,4200,300,'#202a25');rect(0,660,4200,7,'#5c6a56');for(let x=0;x<4200;x+=67)rect(x,680+(x%43),27,2,'#2a372d');rect(3200,600,90,60,'#465342');rect(3220,603,4,57,'#768063');rect(3430,578,95,82,'#33433a');

ctx.fillStyle='#d7d785';ctx.font='bold 13px monospace';ctx.fillText('DROP â†“',2980,403);for(let x=2970;x<3100;x+=18){ctx.fillStyle=(Math.floor(x/18)%2)?'#d2ce79':'#354238';ctx.beginPath();ctx.moveTo(x,420);ctx.lineTo(x+9,420);ctx.lineTo(x-1,434);ctx.lineTo(x-10,434);ctx.fill()}

}

if(run)DeadwalkEnvironment.contacts(ctx,{run,left:camera,right:camera+W/viewZoom});for(const b of visibleFireBarrels())drawFireBarrel(b);drawInteractables();if(run)for(const h of run.healthPickups)if(!h.used){drawHealthIcon(h.x,h.y-13,h.kind,1);ctx.fillStyle='#d5d2a1';ctx.font='9px monospace';ctx.fillText((h.kind==='kit'?'HEALTH KIT':h.kind.toUpperCase())+(mobileMode?'':' Â· E'),h.x-30,h.y-32);}for(const z of zombies){if(z.tongue){const victim=run.players.find(p=>p.grab===z.id),end=victim?{x:victim.x,y:victim.y-38}:z.tongue;line(z.x,z.y-55,end.x,end.y,'#d69796',4);}if(z.role==='smoker'){ellipse(z.x-12,z.y-65,12+Math.sin(time*4)*3,9,'#a2b48c33');}}const visible=zombies.filter(z=>z.x>camera-60&&z.x<camera+W/viewZoom+60).sort((a,b)=>a.y-b.y);if(run)for(const p of run.players)if(p.down||p.grab)character(p.x,p.y,p);for(const z of visible)character(z.x,z.y,z);if(run){for(const p of run.players)if(!p.down&&!p.grab)character(p.x,p.y,p);}else{ctx.fillStyle='#849476';ctx.font='14px monospace';ctx.fillText('THE CATWALK',1000,396)}


// Foreground railing stays translucent so aiming remains readable.

if(run?.map!=='no-mercy'){ctx.globalAlpha=.25;rail(900,2960,world.deck,false);ctx.globalAlpha=1;}

if(run)DeadwalkEnvironment.foreground(ctx,{run,left:camera,right:camera+W/viewZoom});for(const b of bullets)line(b.px,b.py,b.x,b.y,'#e9e6a1',2);for(const p of particles){ctx.globalAlpha=clamp(p.life*2,0,1);rect(p.x,p.y,3,3,p.color)}ctx.globalAlpha=1;for(const c of casings)rect(c.x,c.y,4,2,'#c7ab68');ctx.restore();

if(run)for(const rock of run.tankRocks){ctx.save();ctx.translate((rock.x-camera)*viewZoom,rock.y*viewZoom+verticalOffset());ctx.scale(viewZoom,viewZoom);ctx.rotate(rock.spin);drawRockSprite();ctx.restore();}drawDarkness();drawWeaponLasers();if(player?.grab&&run.zombies.some(z=>z.id===player.grab&&z.role==='hunter')){ctx.fillStyle='#a6292928';ctx.fillRect(0,0,W,H);}if(player&&player.hurt>0){ctx.fillStyle='#bd54331c';ctx.fillRect(0,0,W,H)}if(player?.goo>0){ctx.fillStyle='#71932d33';ctx.fillRect(0,0,W,H);for(let i=0;i<12;i++)ellipse((i*193+79)%W,(i*127+41)%H,22+i%4*12,14+i%3*8,'#a9bf4a66');}if(state==='playing'){drawAimCrosshair();ctx.fillStyle='#a8b491';ctx.font='10px monospace';ctx.fillText(`${zombies.length} INFECTED Â· ${kills} ELIMINATED Â· ${heads} HEADSHOTS`,32,H-155)}}



function frame(now){if(state!=='playing'&&voiceMenuActor)closeVoiceMenu(false);pollController();const elapsed=Math.min((now-last)/1000||0,.1);last=now;frameCount++;fpsClock+=elapsed;if(fpsClock>=1){fps=frameCount/fpsClock;frameCount=0;fpsClock=0}if(state==='playing'){accumulator+=elapsed;let steps=0;while(accumulator>=1/60&&steps++<6&&state==='playing'){update(1/60);accumulator-=1/60}}else accumulator=0;draw();requestAnimationFrame(frame)}

requestAnimationFrame(frame);









































function drawHealthIcon(x,y,kind,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);if(kind==='pills'){rect(-7,-10,14,23,'#bfc7bf');rect(-8,-15,16,6,'#d7ddd3');for(let i=-6;i<8;i+=3)line(i,-15,i,-10,'#818b83');rect(-6,-6,12,6,'#d0d346');rect(-6,0,12,9,'#27557a');rect(-5,6,10,2,'#b5433b');line(-5,-8,-5,10,'#f4f1dc',1);}else if(kind==='kit'){rect(-14,-10,28,22,'#8b302e');rect(-10,-13,20,3,'#333d37');rect(-9,-5,18,13,'#c3c7b5');rect(-2,-4,4,11,'#a23c36');rect(-6,0,12,4,'#a23c36');line(-12,-8,12,-8,'#c25145');}else{ctx.rotate(-.5);rect(-4,-14,8,25,'#aeb7af');rect(-3,-11,6,9,'#648774');rect(-4,3,8,7,'#d9a139');rect(-3,11,6,5,'#d9a139');line(0,-14,0,-20,'#d5d8d3',1);}ctx.restore();}

function character(x,y,a){characterBody(x,y,a);if(a.role||a.dead||a.down||a.grab||!(a.healthHeld||a.healthUseTime))return;const kind=a.healthUseTime?a.healthUseKind:a.healthSelected,progress=a.healthUseTime?1-a.healthUseTime/a.healthUseDuration:0,face=DW.bodyPose(a).facing;let hx=x+face*18,hy=y-42;if(a.healthUseTime){if(kind==='pills')hy=y-42-Math.sin(progress*Math.PI)*20;else if(kind==='adrenaline'){hx=x+face*9;hy=y-22;}else{hx=x;hy=y-35;}}limb(x+face*2,y-53,x+face*13,y-39,hx,hy,a.id===2?'#ac4b48':'#889276',5);drawHealthIcon(hx,hy,kind,.8);if(a.healthUseTime){rect(x-20,y-83,40,3,'#151e19');rect(x-20,y-83,40*progress,3,'#b7d384');}}



const weaponHandlingAudio=new Set();

function stopWeaponHandlingSounds(){for(const clip of weaponHandlingAudio){clip.pause();clip.currentTime=0;}weaponHandlingAudio.clear();}

function weaponHandlingSound(event){if(!sound||typeof Audio==='undefined'||!['pistol','smg','rifle'].includes(event.weapon))return;const stage=event.type==='weaponDeploy'?'deploy':event.stage;if(!['deploy','clip_out','clip_in','clip_locked','slideback','slideforward'].includes(stage))return;const clip=new Audio('game_sounds/weapons/'+event.weapon+'/gunother/'+event.weapon+'_'+stage+'_1.wav'),local=event.player===player.id,distance=Math.abs(event.x-player.x);clip.volume=.4*(local?1:.38*Math.max(0,1-distance/1000));if(!clip.volume)return;weaponHandlingAudio.add(clip);clip.onended=()=>weaponHandlingAudio.delete(clip);clip.play().catch(()=>weaponHandlingAudio.delete(clip));}







function switchCharacter(){closeVoiceMenu(false);if(!run||!['playing','paused'].includes(state)||run.players.length<2)return;let next=controlledIndex;for(let step=1;step<run.players.length;step++){const candidate=(controlledIndex+step)%run.players.length;if(!run.players[candidate].dead){next=candidate;break;}}if(next===controlledIndex)return;clearTouchInput();const previous=player,previousIndex=controlledIndex;if(controllerSettings.mode==='companion'&&padId!==null&&controllerIndex===next)controllerIndex=previousIndex;controlledIndex=next;player=run.players[next];player.ai=false;previous.ai=controllerSettings.mode!=='companion'||padId===null||controllerIndex!==previousIndex;for(const p of run.players)p.prev={};keys.clear();mouse.down=false;pendingFlashlightToggle=false;sync();run.message('You control '+player.name+'. '+previous.name+(previous.ai?' is controlled by AI.':' uses the controller.'));consumeEvents();}

document.getElementById('switch-character').onclick=switchCharacter;



if(mobileMode){document.body.classList.add('mobile');

 for(const [id,mode] of [['move-stick','move'],['aim-stick','aim']]){const stick=document.getElementById(id),thumb=stick.querySelector('.stick-thumb');let active=null;

  function updateStick(e){const box=stick.getBoundingClientRect(),radius=box.width*.38,dx=e.clientX-(box.left+box.width/2),dy=e.clientY-(box.top+box.height/2),length=Math.hypot(dx,dy),factor=length>radius?radius/length:1;thumb.style.transform='translate(calc(-50% + '+dx*factor+'px),calc(-50% + '+dy*factor+'px))';if(mode==='move')touchInput.move=Math.abs(dx)<radius*.15?0:clamp(dx/radius,-1,1);else{touchInput.fire=length>radius*.22;if(touchInput.fire){touchInput.angle=Math.atan2(dy,dx);const origin=DW.weaponOrigin(player,touchInput.angle);mouse.x=(origin.x+Math.cos(touchInput.angle)*250-camera)*viewZoom;mouse.y=(origin.y+Math.sin(touchInput.angle)*250)*viewZoom+verticalOffset();}}}

  stick.addEventListener('pointerdown',e=>{if(state!=='playing'||active!==null)return;e.preventDefault();initAudio();active=e.pointerId;stick.setPointerCapture(active);updateStick(e);});stick.addEventListener('pointermove',e=>{if(e.pointerId===active){e.preventDefault();updateStick(e);}});function release(e){if(e.pointerId!==active)return;active=null;thumb.style.transform='translate(-50%,-50%)';if(mode==='move')touchInput.move=0;else touchInput.fire=false;}for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,release);

 }

 for(const button of document.querySelectorAll('[data-touch]')){const action=button.dataset.touch;let pointer=null;button.addEventListener('pointerdown',e=>{if(state!=='playing'||pointer!==null)return;e.preventDefault();initAudio();pointer=e.pointerId;button.setPointerCapture(pointer);button.classList.add('held');if(['jump','sprint','shove','use','reload','heal','grenade'].includes(action)){touchInput[action]=true;if(action!=='sprint')touchPulses[action]=true;}else if(action==='crouch'){touchInput.crouch=!touchInput.crouch;button.setAttribute('aria-pressed',String(touchInput.crouch));}else if(action==='light')pendingFlashlightToggle=true;else if(action==='gun'){run.cycleWeapon(player,1);touchInput.fire=false;}else if(['pills','adrenaline','kit'].includes(action)){run.quickUseHealth(player,action);touchInput.fire=false;}else if(action==='pause')togglePause();else if(action==='mute'){sound=!sound;if(!sound){stopGameOverSound();stopDialogue();stopPistolSounds();stopWitchCry();stopZoeyScream();}button.textContent=sound?'SOUND ON':'MUTED';}});function release(e){if(e.pointerId!==pointer)return;pointer=null;button.classList.remove('held');if(['jump','sprint','shove','use','reload','heal','grenade'].includes(action))touchInput[action]=false;}for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,release);}

 document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTouchInput();if(state==='playing')togglePause();}});

}



function drawSafeRoomDoor(door){const x=door.x,y=door.y;rect(x-28,y-128,56,128,'#909891');rect(x-22,y-122,44,118,'#141e21');

 // The open leaf swings out beside its frame; it remains a visible red, reinforced door.

 ctx.save();ctx.translate(x-22,y);ctx.scale(door.open?-1:1,1);rect(0,-122,44,118,'#862f2b');ctx.save();ctx.globalAlpha=.23;DeadwalkEnvironment.surface(ctx,'metal',0,-122,44,118);ctx.restore();for(let i=0;i<14;i++)line(4+i*3,-14-i*7,9+i*3,-16-i*7,'#cac2a45c',1);line(3,-119,3,-5,'#b64b40',2);for(let at=-109;at<-55;at+=16)line(4,at,40,at,'#20252a',9);for(let at=7;at<42;at+=10)line(at,-111,at,-60,'#bcc1b6',3);for(let at=-46;at<0;at+=23)line(0,at,44,at,'#93998b',5);rect(5,-56,34,14,'#dbd3b9');ctx.fillStyle='#963a2e';ctx.font='bold 12px monospace';ctx.textAlign='left';ctx.fillText('EXIT',8,-45);rect(33,-36,4,13,'#c1baa4');for(let at=0;at<44;at+=11)rect(at,-122,7,8,'#d0b63f');ctx.restore();for(const at of [-100,-22])rect(x-26,y+at,6,12,'#bac0ad');ctx.save();ctx.fillStyle='#e1ce88';ctx.font='10px monospace';ctx.textAlign='left';ctx.fillText(door.closed?'SAFE ROOM SECURED':door.open?'DOOR OPEN Â· E / USE TO CLOSE':'SAFE ROOM Â· E / USE TO OPEN',x-100,y-147);ctx.restore();}

