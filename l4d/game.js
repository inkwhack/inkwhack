 'use strict';



const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');



const ui=Object.fromEntries(['health','intro','pause','death','result','announcement','sound','stamina','objective','wave','ammo','weapon-state','weapon-name','zoey-dialogue','scrap','partner','heat','noise','resonance','context','run-info','ending-label','ending-title','bill-card','zoey-card','bill-hp','zoey-hp','bill-state','zoey-state','partner-health','bill-revive','zoey-revive','bill-temp','zoey-temp','chloe-card','chloe-hp','chloe-state','chloe-health','chloe-revive','chloe-temp'].map(id=>[id,document.getElementById(id)]));



let autoUseItems=true;



let controlledIndex=0,viewZoom=1,cameraMeanY=null,cameraReady=false,controllerIndex=1;



// Temporarily use standard gameplay, camera and controls on every device.

// Keep the mobile implementation dormant until it can be repaired.

const mobileMode=false;



const touchPulses={};



const touchInput={move:0,angle:null,fire:false,crouch:false};



function clearTouchInput(){for(const key of Object.keys(touchPulses))delete touchPulses[key];touchInput.move=0;touchInput.ladderUse=false;touchInput.angle=null;touchInput.fire=false;touchInput.crouch=false;for(const key of ['jump','sprint','shove','use','reload','heal','grenade'])touchInput[key]=false;document.querySelectorAll('.touch-stick').forEach(t=>t.classList.remove('active'));const drawer=document.getElementById('portrait-items');if(drawer)drawer.hidden=true;document.getElementById('portrait-health')?.setAttribute('aria-expanded','false');document.querySelectorAll('.stick-thumb').forEach(t=>t.style.transform='translate(-50%,-50%)');document.querySelectorAll('[data-touch]').forEach(b=>{b.classList.remove('held');if(b.dataset.touch==='crouch')b.setAttribute('aria-pressed','false');});}







let W=innerWidth,H=innerHeight,dpr=1,state='intro',last=0,time=0,camera=650,shake=0,run=null,player=null,zombies=[],bullets=[],particles=[],casings=[],kills=0,heads=0,announceClock=0,accumulator=0,padId=null,joinDown=false,frameCount=0,fps=60,fpsClock=0,hitFlash=0,pendingFlashlightToggle=false;



const world=DW.WORLD,keys=DeadwalkInput.keyboard.keys,mouse=DeadwalkInput.mouse;



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



function portraitMode(){return mobileMode&&H>W;}

function portraitTarget(zoom){const near=run.players.filter(p=>!p.dead&&Math.abs(p.x-player.x)<=175&&Math.abs(p.y-player.y)<55),bias=near.length?near.reduce((sum,p)=>sum+p.x-player.x,0)/near.length:0;return player.x+clamp(bias+Math.cos(player.angle)*18+clamp(player.vx/230,-1,1)*12,-W*.23/zoom,W*.29/zoom);}

function portraitAnchor(){return Math.max(195,Math.min(H*.58,H-252));}

function resize(){const wasPortrait=portraitMode();W=innerWidth;H=innerHeight;document.body.classList.toggle('portrait-mobile',portraitMode());if(wasPortrait!==portraitMode()){cameraReady=false;clearTouchInput();}dpr=Math.min(devicePixelRatio||1,mobileMode?1.5:2);canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}



addEventListener('resize',resize);resize();



function cameraActors(){if(run?.lift.escapeScene){const e=run.lift.escapeScene.elapsed,team=run.players.filter(p=>!p.dead),tx=team.reduce((n,p)=>n+p.x,0)/Math.max(1,team.length),ty=team.reduce((n,p)=>n+p.y,0)/Math.max(1,team.length),t=e<1?1-e:e>3?(e-3)/2:0,k=clamp(t,0,1);return [{x:DW.SEWER_LADDER.x+(tx-DW.SEWER_LADDER.x)*k,y:1000+(ty-1000)*k}];}if(portraitMode()&&player)return [player];const living=run?.players.filter(p=>!p.dead)||[],pile=run?.zombies.filter(z=>z.hp>0&&(z.pileLevel!=null||z.pileClimbing||z.pileFalling||z.climbing&&['hunter','smoker','boomer'].includes(z.role))&&living.some(p=>Math.abs(p.x-z.x)<600))||[];const tanks=(run?.zombies||[]).filter(z=>{if(z.role!=='tank'||z.hp<=0)return false;const distance=living.length?Math.min(...living.map(p=>Math.abs(p.x-z.x))):Infinity;z.cameraTracked=distance<(z.cameraTracked?1650:1400);return z.cameraTracked;}).map(z=>({x:z.x,y:z.y-90}));const roofAttackers=(run?.zombies||[]).filter(z=>z.roofSmoker&&z.hp>0&&(z.tongue||z.grabbing)).map(z=>({x:z.x,y:z.y-75}));return [...living,...pile,...tanks,...roofAttackers];}



function verticalOffset(){if(portraitMode())return portraitAnchor()-(cameraMeanY??player?.y??world.ground)*viewZoom;const mean=cameraMeanY??player?.y??world.ground,blend=clamp((1-viewZoom)/.2,0,1),anchor=H*.66*(1-blend)+((210+H-155)/2+40*viewZoom)*blend;return anchor-mean*viewZoom;}



function aim(){if(run?.secretVisit&&!run.secretVisit.cutaway){const room=secretRoomLayout(),bx=room.billX;return DW.aimAt(player,player.x+(mouse.x-bx)/room.scale,player.y+(mouse.y-room.floor)/room.scale);}if(run?.lift.phase==='riding'){const cw=Math.min(640,W-40),ch=Math.max(160,H-400),scale=Math.min(ch*.74/80,cw/190);return DW.aimAt(player,run.lift.x+(mouse.x-W/2)/scale,660+(mouse.y-(H-192))/scale);}return DW.aimAt(player,mouse.x/viewZoom+camera,(mouse.y-verticalOffset())/viewZoom);}



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



const deagleSounds=typeof Audio==='undefined'?[]:Array.from({length:8},()=>{const clip=new Audio('game_sounds/weapons/magnum/gunfire/magnum_shoot.wav');clip.preload='auto';return clip;});

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



const turretSounds=typeof Audio==='undefined'?[]:Array.from({length:16},()=>{const clip=new Audio('game_sounds/weapons/50cal/50cal_shoot.wav');clip.preload='auto';return clip;});

let turretSoundIndex=0;

let deagleSoundIndex=0,pistolSoundIndex=0,smgSoundIndex=0,rifleSoundIndex=0;



function stopPistolSounds(){stopWeaponHandlingSounds();stopInfectedAudio();stopHordeAudio();for(const clip of [...deagleSounds,...pistolSounds,...smgSounds,...rifleSounds,...turretSounds,...footstepSounds,...shoveSounds]){clip.pause();clip.currentTime=0;}}



function weaponSound(weapon,shooter=1,x=player?.x){if(!sound)return;const local=shooter===(player?.id||1),distance=Math.abs((x??player?.x??0)-(player?.x??0)),gain=local?1:.38*Math.max(0,1-distance/1000);if(gain<=0)return;let clip,volume;if(weapon==='deagle'&&deagleSounds.length){clip=deagleSounds[deagleSoundIndex++%deagleSounds.length];volume=.50;}else if(weapon==='pistol'&&pistolSounds.length){clip=pistolSounds[pistolSoundIndex++%pistolSounds.length];volume=.30;}else if(weapon==='smg'&&smgSounds.length){clip=smgSounds[smgSoundIndex++%smgSounds.length];volume=.55;}else if(weapon==='turret'&&turretSounds.length){clip=turretSounds[turretSoundIndex++%turretSounds.length];volume=.45;}else if(weapon==='rifle'&&rifleSounds.length){clip=rifleSounds[rifleSoundIndex++%rifleSounds.length];volume=.45;}if(clip){clip.volume=volume*gain;clip.currentTime=0;clip.play().catch(()=>{if(sound&&state==='playing')gunSound();});}else gunSound();}



function gunSound(){if(!sound||!audio)return;const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();source.buffer=noiseBuffer;filter.type='lowpass';filter.frequency.value=1800;gain.gain.value=.14;source.connect(filter);filter.connect(gain);gain.connect(audio.destination);source.start();tone(80,.07,.035)}



function reset(map='no-mercy',retry=false){playDefibrillatorSound({type:'defibCancel'});if(secretJokeClip){secretJokeClip.pause();secretJokeClip=null;}const checkpoint=retry&&run?.checkpoint;controllerHealActor=null;clearTimeout(witchNoticeTimer);document.getElementById('witch-notification').hidden=true;closeVoiceMenu(false);clearTouchInput();stopGameOverSound();nextBillReply=0;stopDialogue();stopPistolSounds();stopWitchCry();stopZoeyScream();run=new DW.Run(Date.now(),true,typeof map==='string'?map:'no-mercy',document.getElementById('difficulty').value,document.getElementById('game-mode').value);if(checkpoint)run.restoreCheckpoint(checkpoint);run.autoUseItems=autoUseItems;run.autoPickup=mobileMode;run.enemyTimeScale=mobileMode?.65:1;run.disableGunHeat=true;run.lightVisibility=(observer,target)=>DeadwalkLighting.visibleTo(run,observer,target);controlledIndex=Math.max(0,run.players.findIndex(p=>!p.dead&&!p.ai));controllerIndex=1;viewZoom=1;cameraMeanY=null;cameraReady=false;player=run.players[controlledIndex];state='playing';mouse.down=false;keys.clear();pendingFlashlightToggle=false;nextZoeyRun=0;casings=[];camera=650;accumulator=0;joinDown=false;for(const id of ['intro','death','pause'])ui[id].classList.add('hidden');sync();consumeEvents()}



for(const selector of ['.mode-select','.difficulty-select:not(.mode-select)'])for(const select of document.querySelectorAll(selector))select.onchange=()=>{for(const other of document.querySelectorAll(selector))other.value=select.value;};



document.getElementById('start').onclick=()=>{initAudio();reset()};document.getElementById('restart').onclick=()=>reset(run?.map||'no-mercy',run?.status==='dead');document.getElementById('resume').onclick=()=>togglePause();



function togglePause(){closeVoiceMenu(false);if(state==='playing'){for(const p of run.players)run.cancelDefibrillator(p);playDefibrillatorSound({type:'defibCancel'});controllerHealActor=null;state='paused';document.getElementById('touch-controls').hidden=true;clearTouchInput();stopDialogue();stopPistolSounds();stopWitchCry();stopZoeyScream();mouse.down=false;ui.pause.classList.remove('hidden')}else if(state==='paused'){state='playing';document.getElementById('touch-controls').hidden=!mobileMode;accumulator=0;ui.pause.classList.add('hidden')}}



// Consume game controls during play so Ctrl+D (crouch + right) does not bookmark the page.



const gameControlKeys=new Set(['KeyX','KeyA','KeyD','KeyW','KeyC','KeyR','KeyF','KeyE','KeyH','KeyT','KeyQ','KeyG','KeyL','Tab','Digit4','Digit5','Digit6','Space','ArrowLeft','ArrowRight','ArrowUp','ControlLeft','ControlRight','ShiftLeft','ShiftRight']);



function toggleSound(){sound=!sound;if(!sound){playDefibrillatorSound({type:'defibCancel'});stopGameOverSound();stopDialogue();stopPistolSounds();stopWitchCry();stopZoeyScream();}ui.sound.textContent=sound?'M SOUND ON':'M SOUND OFF';DeadwalkInput.refreshMenuActions();initAudio();}



addEventListener('keydown',e=>{if(!DeadwalkInput.owns(e.target))return;if(state==='playing'&&(gameControlKeys.has(e.code)||Object.keys(DeadwalkInput.keyboard.read()).some(a=>DeadwalkInput.matches(a,e.code))))e.preventDefault();if(state==='playing')keys.add(e.code);if(DeadwalkInput.matches('VOICE',e.code)&&!e.repeat&&state==='playing'){e.preventDefault();openVoiceMenu(player,'keyboard');}if(DeadwalkInput.matches('SWITCH_CHARACTER',e.code)&&!e.repeat&&state==='playing')switchCharacter();if(state==='playing'&&!e.repeat&&['PILLS','ADRENALINE','KIT'].some(a=>DeadwalkInput.matches(a,e.code)))run.quickUseHealth(player,['PILLS','ADRENALINE','KIT'].find(a=>DeadwalkInput.matches(a,e.code)).toLowerCase());if(state==='playing'&&DeadwalkInput.matches('FLASHLIGHT',e.code)&&!e.repeat)pendingFlashlightToggle=true;if(DeadwalkInput.matches('PAUSE',e.code)&&!e.repeat)togglePause();if(DeadwalkInput.matches('SOUND',e.code)&&!e.repeat)toggleSound()});



addEventListener('keyup',e=>{keys.delete(e.code);if(DeadwalkInput.matches('VOICE',e.code)&&voiceMenuSource==='keyboard')closeVoiceMenu(true);});canvas.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;mouse.x=e.clientX;mouse.y=e.clientY;controllerAimActive=false});canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;if(voiceMenuActor)return;if(e.button===1&&state==='playing'){e.preventDefault();pendingFlashlightToggle=true;}else if(e.button===0){if(trySecretClick(e.clientX,e.clientY)){e.preventDefault();initAudio();return;}mouse.down=true;initAudio()}});canvas.addEventListener('mousedown',e=>{if(e.button===1&&state==='playing')e.preventDefault();});canvas.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault();});addEventListener('pointerup',e=>{if(e.button===0)mouse.down=false;});addEventListener('blur',()=>{closeVoiceMenu(false);keys.clear();mouse.down=false;if(state==='playing')togglePause()});canvas.addEventListener('contextmenu',e=>e.preventDefault());



function inputs(){const kb=DeadwalkInput.keyboard.read();const lightToggle=pendingFlashlightToggle;pendingFlashlightToggle=false;const p1={secretHit:run?.secretVisit&&!mobileMode&&!controllerAimActive?secretShotHits(mouse.x,mouse.y):undefined,move:(kb.RIGHT?1:0)-(kb.LEFT?1:0),angle:aim(),fire:mouse.down,jump:kb.JUMP,reload:kb.RELOAD,shove:kb.SHOVE,use:kb.INTERACT,heal:kb.HEAL,build:kb.BUILD,grenade:kb.GRENADE,flashlight:lightToggle,crouch:kb.CROUCH};const pad=activePad;if(mobileMode){if(touchInput.move)p1.move=touchInput.move;p1.angle=touchInput.angle!==null?touchInput.angle:player.angle;p1.fire=p1.fire||touchInput.fire;p1.crouch=p1.crouch||touchInput.crouch;for(const key of ['jump','sprint','shove','use','reload','heal','grenade']){p1[key]=p1[key]||!!touchInput[key]||!!touchPulses[key];delete touchPulses[key];}p1.use=p1.use||!!touchInput.ladderUse;}



const routed=run.players.map(()=>({}));routed[controlledIndex]=p1;if(voiceMenuActor){p1.fire=false;p1.angle=player.angle;}if(controllerHealActor!==null){const index=run.players.findIndex(p=>p.id===controllerHealActor);controllerHealActor=null;if(index>=0&&controllerContext()==='GAMEPLAY')routed[index].heal=true;}if(!pad)return routed;



const target=controllerSettings.mode==='companion'?controllerIndex:controlledIndex;



const actor=run.players[target];if(!actor||actor.dead)return routed;



if(controllerSettings.mode==='companion')actor.ai=false;



const actions=DeadwalkInput.gameplay(actor.angle);

let angle=target===controlledIndex&&!controllerAimActive?p1.angle:actor.angle;

if(actions.angle!==null&&actions.angle!==undefined){angle=actions.angle;if(target===controlledIndex)controllerAimActive=true;}

const input=target===controlledIndex?p1:routed[target];

Object.assign(input,{move:actions.move||input.move||0,angle,fire:actions.fire||!!input.fire,jump:actions.jump||!!input.jump,use:actions.use||!!input.use,reload:!!input.reload||(DeadwalkInput.snapshot.context==='GAMEPLAY'&&DeadwalkInput.snapshot.held('RELOAD'))||(DeadwalkInput.snapshot.context==='GAMEPLAY'&&DeadwalkInput.snapshot.pressed('INTERACT')&&!run.context(actor)),shove:actions.shove||!!input.shove,heal:!!input.heal,grenade:actions.grenade||!!input.grenade,crouch:actions.crouch||!!input.crouch,flashlight:!!input.flashlight||(DeadwalkInput.snapshot.context==='GAMEPLAY'&&DeadwalkInput.snapshot.pressed('FLASHLIGHT'))});

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



let controllerHealActor=null;

let controllerSettings={...controllerDefaults},activePad=null,controllerAimActive=false,menuStickDirection=0,menuStickNext=0,menuScrollLast=0;



try{const saved=JSON.parse(localStorage.getItem('deadwalk-controller')||'{}');for(const key of Object.keys(controllerDefaults)){if(key==='mode'?['player','companion'].includes(saved[key]):Object.hasOwn(shortcutOptions,saved[key]))controllerSettings[key]=saved[key];}}catch{}



function controllerActor(){return run?.players[controllerSettings.mode==='companion'?controllerIndex:controlledIndex];}



function controllerShortcut(action){const actor=controllerActor();if(!actor||actor.dead||actor.down||actor.grab)return;



if(action==='voiceMenu'){openVoiceMenu(actor,'controller');return;}



if(['boost','pills','adrenaline','kit'].includes(action)){run.quickUseHealth(actor,action==='boost'?(actor.healthItems.pills?'pills':actor.healthItems.adrenaline?'adrenaline':'pills'):action);return;}



const kind={voice:'idle',scream:'dying',pain:'hurt',thanks:'revived',niceShot:'niceShot'}[action];



if(kind){initAudio();speakDialogue({type:DW.survivorName(actor)+'Line',kind});}}



function setupControllerSettings(){for(const host of document.querySelectorAll('.controller-settings')){



const title=document.createElement('summary');title.textContent='CONTROLLER / D-PAD SETTINGS';host.append(title);



const help=document.createElement('p');help.textContent='Xbox controllers on PC and Steam Deck use the same controls. Connect your controller and press a button to detect it. Keyboard and mouse stay available; move the mouse or right stick to switch aiming. X pickup / interact (reload when nothing is nearby) · Y weapons · A jump · LT shove · RT shoot · sticks move / aim. L1 / LB switch character · R1 / RB grenade · B use health · left stick click flashlight · right stick click crouch · View switch character · Menu pause. Menus: left stick or D-pad up/down select, left/right change, right stick scroll, A opens a choice / confirms, B cancels / goes back. Assign Voice command menu to a D-pad direction: hold it, select with the right stick, then release to speak.';host.append(help);



for(const key of Object.keys(controllerDefaults)){const label=document.createElement('label');label.textContent=key==='mode'?'Controller plays': 'D-pad '+key;const select=document.createElement('select');select.dataset.controller=key;select.setAttribute('aria-label',label.textContent);const options=key==='mode'?{player:'Selected character',companion:'Companion (local co-op)'}:shortcutOptions;for(const [value,text] of Object.entries(options)){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}select.value=controllerSettings[key];select.onchange=()=>{controllerSettings[key]=select.value;for(const other of document.querySelectorAll('[data-controller="'+key+'"]'))other.value=select.value;if(run&&key==='mode'){const companion=run.players[controllerIndex];if(companion&&controllerIndex!==controlledIndex)companion.ai=select.value==='companion'?false:true;}try{localStorage.setItem('deadwalk-controller',JSON.stringify(controllerSettings));}catch{}};label.append(select);host.append(label);}



}}



setupControllerSettings();

DeadwalkLighting.settings();



let controllerChoice=null;

const controllerChoiceBox=document.createElement('div');controllerChoiceBox.id='controller-choice';controllerChoiceBox.hidden=true;controllerChoiceBox.setAttribute('role','dialog');controllerChoiceBox.setAttribute('aria-modal','true');controllerChoiceBox.setAttribute('aria-label','Choose menu option');document.body.append(controllerChoiceBox);

function renderControllerChoice(){const {select,index}=controllerChoice;controllerChoiceBox.replaceChildren();const title=document.createElement('h2');title.textContent=select.closest('label')?.childNodes[0]?.textContent.trim()||select.getAttribute('aria-label')||'Choose option';controllerChoiceBox.append(title);Array.from(select.options).forEach((option,i)=>{const button=document.createElement('button');button.textContent=option.textContent;button.classList.toggle('selected',i===index);button.onclick=()=>{controllerChoice.index=i;closeControllerChoice(true);};controllerChoiceBox.append(button);});const hint=document.createElement('p');hint.textContent='Left stick / D-pad: choose · A: confirm · B: cancel';controllerChoiceBox.append(hint);controllerChoiceBox.querySelector('.selected')?.focus();}

function openControllerChoice(select){controllerChoice={select,index:select.selectedIndex};controllerChoiceBox.hidden=false;renderControllerChoice();}

function closeControllerChoice(confirm=false){if(!controllerChoice)return;const {select,index}=controllerChoice;controllerChoice=null;controllerChoiceBox.hidden=true;select.focus();if(confirm){select.selectedIndex=index;select.dispatchEvent(new Event('change'));}}

addEventListener('keydown',e=>{if(!controllerChoice)return;if(['Escape','Enter','ArrowUp','ArrowDown'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();if(e.code==='Escape')closeControllerChoice(false);else if(e.code==='Enter')closeControllerChoice(true);else{controllerChoice.index=(controllerChoice.index+(e.code==='ArrowUp'?-1:1)+controllerChoice.select.options.length)%controllerChoice.select.options.length;renderControllerChoice();}}},true);



function controllerContext(){if(controllerChoice)return 'DIALOG';if(voiceMenuActor)return 'VOICE_MENU';if(DeadwalkInput.controlsOpen)return 'CONTROLS';return state==='playing'?'GAMEPLAY':state==='paused'?'PAUSED':state==='intro'?'MENU':'GAME_OVER';}

function cancelController(source){if(controllerChoice){closeControllerChoice(false);return;}if(voiceMenuActor){closeVoiceMenu(false);return;}if(DeadwalkInput.controlsOpen){DeadwalkInput.closeControls();return;}if(state==='playing'){if(DeadwalkInput.deckLayout){mouse.down=false;return;}const actor=activePad?controllerActor():player;if(actor)controllerHealActor=actor.id;return;}const overlay=document.getElementById(state==='intro'?'intro':state==='paused'?'pause':'death'),open=Array.from(overlay.querySelectorAll('details[open]')).pop();if(open){open.open=false;open.querySelector('summary')?.focus();return;}if(state==='paused'){togglePause();return;}document.getElementById(state==='intro'?'game-mode':'restart-mode')?.focus();}

function pollController(){const sample=DeadwalkInput.poll(),pad=sample.pad;activePad=pad;const status=document.getElementById('controller-status');status.hidden=!pad;if(pad){status.firstChild.textContent=sample.mapping==='unknown'&&DeadwalkInput.settings.layout==='auto'?'Controller detected · unknown mapping ':'Controller connected ';status.querySelector('span').textContent=sample.mapping==='unknown'&&DeadwalkInput.settings.layout==='auto'?'Choose Force standard layout only for a compatible controller.':'Active input: '+(DeadwalkInput.device==='gamepad'?'controller':'keyboard / mouse')+' · both available';}

if(!pad){closeControllerChoice(false);if(voiceMenuSource==='controller')closeVoiceMenu(false);if(padId!==null&&run&&controllerIndex!==controlledIndex&&run.players[controllerIndex])run.players[controllerIndex].ai=true;padId=null;controllerAimActive=false;controllerHealActor=null;menuStickDirection=0;menuStickNext=0;menuScrollLast=0;return;}

padId=pad.index;if(!DeadwalkInput.owns()||sample.mapping!=='standard'&&DeadwalkInput.settings.layout!=='standard')return;

if(run&&controllerSettings.mode==='companion'&&(controllerIndex===controlledIndex||run.players[controllerIndex]?.dead))controllerIndex=run.players.findIndex((p,i)=>i!==controlledIndex&&!p.dead);

const pressed=action=>sample.pressed(action);

if(pressed('CANCEL')){DeadwalkInput.back('gamepad');return;}

if(DeadwalkInput.capturing)return;

if(sample.context==='CONTROLLER_DEBUG'){DeadwalkInput.scrollDebug(sample.right.y*650/60+(pressed('NAV_DOWN')?100:0)-(pressed('NAV_UP')?100:0));if(pressed('CONFIRM'))DeadwalkInput.setDebug(false);return;}

if(pressed('PAUSE')){if(DeadwalkInput.controlsOpen){DeadwalkInput.closeControls();return;}if(controllerChoice){closeControllerChoice(false);return;}if(voiceMenuActor){closeVoiceMenu(false);return;}initAudio();if(state==='intro')reset();else if(state==='playing'||state==='paused')togglePause();else reset();return;}

if(state!=='playing'){const overlay=document.getElementById(DeadwalkInput.controlsOpen?'controls-menu':state==='intro'?'intro':state==='paused'?'pause':'death'),now=performance.now(),scrollDt=Math.min((now-menuScrollLast)/1000||1/60,.05);menuScrollLast=now;const scrollAxis=sample.right.y;if(scrollAxis){const panel=controllerChoice?controllerChoiceBox:overlay.querySelector('.panel');if(panel)panel.scrollTop+=scrollAxis*650*scrollDt;}const controls=Array.from(overlay.querySelectorAll('button,select,summary')).filter(e=>e.getClientRects().length&&!e.disabled);let index=controls.indexOf(document.activeElement);

const sx=sample.left.x,sy=sample.left.y,stick=Math.max(Math.abs(sx),Math.abs(sy))>.45?(Math.abs(sy)>=Math.abs(sx)?(sy<0?'NAV_UP':'NAV_DOWN'):(sx<0?'NAV_LEFT':'NAV_RIGHT')):null,stickPress=stick&&(stick!==menuStickDirection||now>=menuStickNext);if(stickPress)menuStickNext=now+(stick!==menuStickDirection?350:180);menuStickDirection=stick;const nav=action=>pressed(action)||stickPress&&stick===action;

if(controllerChoice){if(nav('NAV_UP')||nav('NAV_LEFT')||nav('NAV_DOWN')||nav('NAV_RIGHT')){controllerChoice.index=(controllerChoice.index+(nav('NAV_UP')||nav('NAV_LEFT')?-1:1)+controllerChoice.select.options.length)%controllerChoice.select.options.length;renderControllerChoice();}if(pressed('CONFIRM'))closeControllerChoice(true);return;}

if(nav('NAV_UP')||nav('NAV_DOWN')){index=(index+(nav('NAV_UP')?-1:1)+controls.length)%controls.length;controls[index]?.focus();controls[index]?.scrollIntoView({block:'nearest'});}else if(index<0){const preferred=document.getElementById(state==='intro'?'game-mode':state==='paused'?'resume':'restart-mode');preferred?.focus();index=controls.indexOf(preferred);}

const focus=document.activeElement;if(pressed('CONFIRM')){initAudio();if(index<0)document.getElementById(state==='intro'?'start':state==='paused'?'resume':'restart').click();else if(focus.tagName==='SELECT')openControllerChoice(focus);else if(focus.tagName==='SUMMARY')focus.parentElement.open=!focus.parentElement.open;else if(focus.tagName==='BUTTON')focus.click();}return;}

menuStickDirection=0;menuStickNext=0;menuScrollLast=0;

if(voiceMenuActor){const right=sample.right;if(right.magnitude>.2){const index=(Math.round((Math.atan2(right.y,right.x)+Math.PI/2)/(Math.PI/4))+8)%8;selectVoiceCommand(index);}if(pressed('CONFIRM')){closeVoiceMenu(true);return;}if(voiceMenuSource==='controller'&&!['NAV_UP','NAV_DOWN','NAV_LEFT','NAV_RIGHT'].some((action,i)=>sample.holdSource(action)&&controllerSettings[['up','down','left','right'][i]]==='voiceMenu'))closeVoiceMenu(true);return;}

if((pressed('SWITCH_CHARACTER')||pressed('VIEW'))&&controllerSettings.mode==='player'){switchCharacter();return;}

if(pressed('NEXT_WEAPON')){const actor=controllerActor();if(actor)run.cycleWeapon(actor,1);return;}

if(DeadwalkInput.dpadMovement)return;

for(const [action,direction] of [['NAV_UP','up'],['NAV_DOWN','down'],['NAV_LEFT','left'],['NAV_RIGHT','right']])if(pressed(action)){controllerShortcut(controllerSettings[direction]);return;}

}

let promptDevice=null;

const originalInstructions=document.querySelector('#intro .instructions').innerHTML,originalFooter=document.querySelector('footer span').textContent;

function updateInputPrompts(){const gamepad=DeadwalkInput.device==='gamepad';if(promptDevice!==DeadwalkInput.device){promptDevice=DeadwalkInput.device;document.querySelector('#intro .instructions').innerHTML=gamepad?'LEFT STICK move · RIGHT STICK aim<br>A jump · X interact / reload when no pickup is nearby · Y weapons<br>LT shove · RT fire · LB character · RB grenade<br>B use health · L3 flashlight · R3 crouch · MENU pause<br>D-PAD health / voice shortcuts<br>Menus: A confirm · B back · D-pad / left stick navigate · right stick scroll':originalInstructions;document.querySelector('footer span').textContent=gamepad?'LEFT STICK MOVE · RIGHT STICK AIM · A JUMP · X INTERACT / RELOAD · Y WEAPONS · LT SHOVE · RT FIRE · LB CHARACTER · RB GRENADE · B HEALTH · MENU PAUSE':originalFooter;const guide=document.querySelector('#intro .instructions');guide.textContent=gamepad?'LEFT STICK move · RIGHT STICK aim · '+[['CONFIRM','jump'],['INTERACT','interact / contextual reload'],['RELOAD','reload'],['NEXT_WEAPON','weapons'],['SHOVE','shove'],['FIRE','fire'],['SWITCH_CHARACTER','character'],['GRENADE','grenade'],['CANCEL','health'],['FLASHLIGHT','flashlight'],['CROUCH','crouch']].map(([a,label])=>DeadwalkInput.buttonLabel(a)+' '+(a==='CANCEL'&&DeadwalkInput.deckLayout?'cancel':label)).join(' · ')+' · MENU pause. Menus: A confirm · B back.':'MOUSE aim / fire · WHEEL weapons · '+[['LEFT','left'],['RIGHT','right'],['JUMP','jump'],['INTERACT','interact'],['RELOAD','reload'],['SHOVE','shove'],['HEAL','health'],['FLASHLIGHT','flashlight'],['SWITCH_CHARACTER','character'],['GRENADE','grenade'],['VOICE','voice menu (hold)'],['PAUSE','pause']].map(([a,label])=>DeadwalkInput.keyLabel(a)+' '+label).join(' · ');document.querySelector('footer span').textContent=guide.textContent;}if(!run)return;if(!gamepad){ui.context.textContent=ui.context.textContent.replace(/HOLD E(?: \/ X)?/g,'HOLD '+DeadwalkInput.keyLabel('INTERACT')).replace(/ E TO /g,' '+DeadwalkInput.keyLabel('INTERACT')+' TO ');for(const name of ['bill','zoey','chloe'])ui[name+'-state'].textContent=ui[name+'-state'].textContent.replace(/HOLD E/g,'HOLD '+DeadwalkInput.keyLabel('INTERACT'));return;}document.getElementById('switch-character').textContent='PLAYING '+player.name.toUpperCase()+' · SWITCH [LB]';ui.context.textContent=ui.context.textContent.replace(/HOLD E(?: \/ X)?/g,'HOLD X').replace(/E \/ X/g,'X').replace(/ E TO /g,' X TO ');ui['weapon-state'].textContent=ui['weapon-state'].textContent.replace(/WHEEL/g,DeadwalkInput.buttonLabel('NEXT_WEAPON')).replace(/LEFT CLICK/g,DeadwalkInput.buttonLabel('FIRE')).replace(/H \/ RT/g,DeadwalkInput.buttonLabel('CANCEL')+' / '+DeadwalkInput.buttonLabel('FIRE')).replace(/L LIGHT/g,DeadwalkInput.buttonLabel('FLASHLIGHT')+' LIGHT').replace(/R TO RELOAD/g,(DeadwalkInput.buttonLabel('RELOAD')==='Unassigned'?DeadwalkInput.buttonLabel('INTERACT'):DeadwalkInput.buttonLabel('RELOAD'))+' TO RELOAD');ui.stamina.textContent='PILLS '+player.healthItems.pills+' · ADREN '+player.healthItems.adrenaline+' · KIT '+player.medicine+' · B: USE';for(const name of ['bill','zoey','chloe'])ui[name+'-state'].textContent=ui[name+'-state'].textContent.replace(/HOLD E/g,'HOLD '+DeadwalkInput.buttonLabel('INTERACT'));ui.context.textContent=ui.context.textContent.replace(/HOLD X/g,'HOLD '+DeadwalkInput.buttonLabel('INTERACT')).replace(/ X TO /g,' '+DeadwalkInput.buttonLabel('INTERACT')+' TO ');ui.stamina.textContent=ui.stamina.textContent.replace('B: USE',DeadwalkInput.buttonLabel('CANCEL')+': USE');document.getElementById('switch-character').textContent='PLAYING '+player.name.toUpperCase()+' · SWITCH ['+DeadwalkInput.buttonLabel('SWITCH_CHARACTER')+']';}

DeadwalkInput.configure({context:controllerContext,cancel:cancelController,safeBack:()=>{if(controllerContext()==='GAMEPLAY')togglePause();else cancelController('rear-button');},sound:toggleSound,bindings:()=>{promptDevice=null;updateInputPrompts();},device:()=>{if(run)updateHud();else updateInputPrompts();},debugOpen:()=>{if(state==='playing')togglePause();}});

DeadwalkInput.setupMenus();

DeadwalkInput.setupControls();



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



function speakDialogue(event){if(event.kind==='defib')stopZoeyScream();if(event.urgent&&dialogueAudio&&(event.kind==='defib'||event.kind==='healOther'||event.kind==='closeDoor'||event.kind==='reviveStart'||event.kind==='hordeTriggered'||event.spotted||zoeyFunClips.includes(dialogueAudio)))stopDialogue();if(!sound||typeof Audio==='undefined'||typeof SOUND_LIBRARY==='undefined'||dialogueAudio&&!dialogueAudio.paused||event.kind!=='reviveStart'&&activeZoeyScream&&!activeZoeyScream.paused)return false;const character=event.type==='chloeLine'?'chloe':event.type==='zoeyLine'?'zoey':'bill',banks=SOUND_LIBRARY.survivors[character],bank=banks?.[event.kind]?.length?banks[event.kind]:banks?.idle,survivor=run.players.find(p=>DW.survivorName(p)===character);if(!bank?.length||!survivor||survivor.dead||survivor.down||survivor.grab)return false;const key=character+event.kind,i=recordedLineIndex[key]||0;recordedLineIndex[key]=i+1;const line=bank[bank===banks.idle?Math.floor(run.rand()*bank.length):i%bank.length],clip=new Audio(line.file);dialogueAudio=clip;clip.volume=.7;survivor.speech=event.spotted?event.text:line.text;survivor.speechTime=6;clip.onloadedmetadata=()=>{if(dialogueAudio===clip)survivor.speechTime=clip.duration;};clip.onended=()=>{if(dialogueAudio!==clip)return;dialogueAudio=null;const partner=character==='zoey'?'bill':'zoey';if(event.kind==='kill')queueBillReply('niceShot',partner);else if(['idle','rooftop','alley','subway','safe','hold','scavenge','revived'].includes(event.kind))queueBillReply(event.kind==='scavenge'?'replySearch':'replyChat',partner);};clip.play().catch(()=>{if(dialogueAudio===clip)dialogueAudio=null;});return true;}



function combatVoice(event,kind){const survivor=run.players.find(p=>p.id===event.player);if(!survivor||run.time<(survivor.brain.nextCombatVoice||0))return;if(speakDialogue({type:DW.survivorName(survivor)+'Line',kind}))survivor.brain.nextCombatVoice=run.time+8;}



function survivorDeathSound(event){if(!sound||typeof SOUND_LIBRARY==='undefined')return;const character=event.player===3?'chloe':event.player===2?'zoey':'bill',kind=event.kind||'death',bank=SOUND_LIBRARY.survivors[character]?.[kind];if(!bank?.length){if(character==='zoey')zoeyScream();return;}const key=character+kind,index=recordedLineIndex[key]||0;recordedLineIndex[key]=index+1;const clip=new Audio(bank[index%bank.length].file);clip.volume=.8;clip.play().catch(()=>{});}



let witchNoticeTimer=null;

function showWitchNotification(event){const notice=document.getElementById('witch-notification'),survivor=run.players.find(p=>p.id===event.player);notice.textContent=`${survivor?.name||'A survivor'} startled the Witch!`;notice.hidden=false;clearTimeout(witchNoticeTimer);witchNoticeTimer=setTimeout(()=>notice.hidden=true,6000);}



function consumeEvents(){for(const e of run.events){if(['defibCharge','defibShock','defibCancel'].includes(e.type)){playDefibrillatorSound(e);if(e.type==='defibShock')shake=Math.max(shake,5);}else if(e.type==='secretRoomEnter'){stopDialogue();mouse.down=false;}else if(e.type==='secretRoomExit'){if(secretJokeClip){secretJokeClip.pause();secretJokeClip=null;}cameraReady=false;}else if(e.type==='secretHostHit'){secretReply='You picked the wrong appointment.';if(secretJokeClip)secretJokeClip.pause();tone(180,.1,.08);}else if(e.type==='secretFireCast'){tone(110,.65,.13);secretReply='She answers with fire!';}else if(e.type==='secretBurnHurt'){if(sound){const clips=['game_sounds/player/survivor/voice/bill/hurtminor08.wav','game_sounds/player/survivor/voice/bill/hurtminor10.wav','game_sounds/player/survivor/voice/bill/deathscream02.wav'];const n=run.secretVisit.burnVoiceIndex||0;run.secretVisit.burnVoiceIndex=n+1;const clip=new Audio(clips[n%clips.length]);clip.volume=.8;infectedAudio.add(clip);clip.onended=()=>infectedAudio.delete(clip);clip.play().catch(()=>infectedAudio.delete(clip));}}else if(e.type==='secretHostDefeated'){secretReply='The frog recommends a less dramatic appointment next time.';}else if(e.type==='secretDoorCutaway'){secretReply='The frog has put up the DO NOT DISTURB sign.';mouse.down=false;}else if(e.type==='secretRoomJoke'){playSecretJoke(e.line,e.cutaway);}else if(e.type==='ledgeRescueVoice'){playLedgeRescueVoice(e.player);}else if(e.type==='rooftopRadioBroadcast'){playRooftopBroadcast(e.kind);}else if(e.type==='liftHatchBreak'){carWhackSound(e);carSmashSound(e);shake=Math.max(shake,4);}else if(e.type==='liftPing'){tone(1350,.18,.16);setTimeout(()=>tone(1800,.3,.12),140);}else if(e.type==='sewerHatchOpen'){if(sound){sewerHatchSound.currentTime=0;sewerHatchSound.volume=.7;sewerHatchSound.play().catch(()=>{});}}else if(e.type==='jukebox'&&e.playing){const j=run.jukeboxes.find(j=>j.id===e.id);if(j)run.message('Jukebox: '+jukeboxTracks[j.track].title);}else if(e.type==='liftDoors'){playLiftDoorSound(e);}else if(e.type==='survivorDeath'||e.type==='survivorScream'){survivorDeathSound(e);}else if(e.type==='zoeyLine'||e.type==='billLine'||e.type==='chloeLine'){speakDialogue(e);}else if(e.type==='carWhack'){carWhackSound(e);shake=Math.max(shake,6);}else if(e.type==='carSmash'){carSmashSound(e);shake=Math.max(shake,6);}else if(e.type==='tankDistantWarning'){distantTankWarning();}else if(e.type==='tankSpawn'){tankWarnings();updateHordeAudio();shake=3;}else if(e.type==='tankImpact'){shake=5;tone(55,.2,.12);}else if(e.type==='tankRock'){tone(85,.18,.09);}else if(e.type==='hordeStart'){hordeSound();const spotter=run.players[1];if(spotter&&run.zombies.filter(z=>z.horde&&run.canSeeEnemy(spotter,z)).length>=3)speakDialogue({type:'zoeyLine',kind:'hordeTriggered',urgent:true});}else if(e.type==='carAlarm'){if(sound&&carAlarmAudio){carAlarmAudio.currentTime=0;carAlarmAudio.play().catch(()=>{});}}else if(e.type==='infectedSound'){infectedSound(e);}else if(e.type==='zoeySafeRoom'){zoeySafeRoom();}else if(e.type==='zoeySearch'){zoeySearch();}else if(e.type==='zoeyFun'){zoeyFun(e);}else if(e.type==='zoeyScream'){zoeyScream();}else if(e.type==='witchCry'){witchCry(e);}else if(e.type==='witchDeath'){witchDeathSound(e);}else if(e.type==='witchAgitated'){witchWarning(e);}else if(e.type==='witchStartled'){showWitchNotification(e);witchWarning(e,true);stopWitchCry();zoeyRun();tone(430,.4,.11);shake=7;}else if(e.type==='witchSlash'){tone(100,.15,.09);shake=8;}else if(e.type==='footstep'){footstepSound(e);}else if(e.type==='pipeBeep'){tone(1250,.065,.085);}else if(e.type==='boomerBurst'){if(run.players.some(p=>p.goo>0))zoeyRun();tone(70,.4,.12);shake=10;}else if(e.type==='explosion'){gunSound();tone(48,.65,.16);shake=16;}else if(e.type==='message'){ui.announcement.textContent=portraitMode()?e.text.replace('Mouse wheel switches weapons.','Tap your weapon to switch.'):e.text;announceClock=5}else if(e.type==='shot'){weaponSound(e.turret?'turret':e.weapon,e.player,e.x);shake=Math.max(shake,1.4);if(casings.length<40)casings.push({x:e.x,y:e.y,vx:-e.facing*(30+Math.random()*50),vy:-90,life:1})}else if(e.type==='warning')tone(170,.45,.055);else if(e.type==='reload'||e.type==='weaponDeploy'){weaponHandlingSound(e);if(e.type==='reload'&&e.stage==='clip_out')combatVoice(e,'reloading');}else if(e.type==='kill'){combatVoice(e,'kill');}else if(e.type==='hit'){hitFlash=.1;tone(e.head?900:540,.025,.014)}else if(e.type==='stomp'){combatVoice(e,'kill');tone(120,.1,.07);shake=Math.max(shake,3);}else if(e.type==='shove'){if(e.burstOffset>0)setTimeout(()=>shoveSound(e),e.burstOffset*1000);else shoveSound(e);}}run.events.length=0;}



function sync(dt=1/60){player=run.players[controlledIndex];window.DeadwalkDev?.sync(run,player,state);zombies=run.zombies;bullets=run.bullets;particles=run.effects;time=run.time;kills=run.kills;heads=run.heads;const live=cameraActors(),xs=live.map(p=>p.x),ys=live.map(p=>p.y),spanX=xs.length?Math.max(...xs)-Math.min(...xs):0,spanY=ys.length?Math.max(...ys)-Math.min(...ys):0,targetZoom=portraitMode()?clamp(W/270,1.4,1.65):clamp(Math.min(1,(W-140)/(spanX+160),Math.max(100,H-365)/(spanY+180)),.12,1),target=portraitMode()?portraitTarget(targetZoom):live.length?(Math.min(...xs)+Math.max(...xs))/2:player.x,mean=ys.length?(Math.min(...ys)+Math.max(...ys))/2:player.y,elapsed=clamp(dt,0,.05),follow=cameraReady?1-Math.exp(-(portraitMode()?8:6)*elapsed):1;



viewZoom+=(targetZoom-viewZoom)*(cameraReady?1-Math.exp(-(targetZoom<viewZoom?8:3)*elapsed):1);cameraMeanY=cameraMeanY===null?mean:cameraMeanY+(mean-cameraMeanY)*follow;if(portraitMode())cameraMeanY=Math.max(cameraMeanY,player.y-(H-238-portraitAnchor())/viewZoom);if(run.level==='rooftop')viewZoom=W/3300;const cameraMin=run.level==='rooftop'?14850:0,cameraMax=run.level==='rooftop'?14850:Math.max(0,69560-W/viewZoom);const targetCamera=clamp(target-W/viewZoom*.5,cameraMin,cameraMax);camera=clamp(camera+(targetCamera-camera)*follow,cameraMin,cameraMax);cameraReady=true;run.spawnView={left:camera,right:camera+W/viewZoom,zoom:viewZoom,portrait:portraitMode()};updateHud();}



function updateMobileHud(){if(!mobileMode)return;const context=run.context(player),use=document.querySelector('[data-touch=use]');use.textContent=context?.kind==='sewerHatch'?'OPEN':context?.kind==='jukebox'?(context.item.playing?'STOP':'PLAY'):context?.kind==='sewerLadder'?'CLIMB':context?.kind==='turret'?'TURRET':context?.kind==='revive'?'RESCUE':context?.kind==='checkpointDoor'?(context.side==='entry'?(context.item.entryOpen?'SECURE':'OPEN'):'CONTINUE'):context?.kind==='safeDoor'?(run.safeDoor.open?'CLOSE':'OPEN'):'USE';use.disabled=!context||!['revive','checkpointDoor','safeDoor','ladder','gate','ammo','turret','jukebox','sewerHatch','rooftopRadio'].includes(context.kind)||player.down||player.dead||!!player.grab;use.hidden=use.disabled;for(const [action,count,label] of [['grenade',player.grenades,'GRENADE'],['pills',player.healthItems.pills,'PILLS'],['adrenaline',player.healthItems.adrenaline,'ADREN'],['kit',player.medicine,'HEAL']]){for(const button of document.querySelectorAll('[data-touch='+action+']')){button.textContent=label+' '+count;button.hidden=!count;button.disabled=!count||player.down||player.dead||!!player.grab||player.healthUseTime>0;}}document.getElementById('switch-character').textContent=player.name.toUpperCase()+' Â· SWITCH';if(player.prompt&&!player.beingHealedBy)ui.context.textContent=context?.kind==='sewerHatch'?'TAP OPEN TO MOVE THE SEWER LID':context?.kind==='revive'?'HOLD RESCUE TO REVIVE':context?.kind==='sewerLadder'?(player.sewerClimbing?'CLIMBING · WEAPON STOWED':'TAP JUMP TO GRAB THE RED LADDER'):['safeDoor','checkpointDoor'].includes(context?.kind)?'TAP '+use.textContent+' TO USE DOOR':'';if(player.sewerClimbing)ui['weapon-state'].textContent='CLIMBING · WEAPON STOWED';else if(!player.down&&!player.dead&&!player.grab&&!player.healthUseTime&&!player.reload)ui['weapon-state'].textContent=player.weapon==='pipebomb'?'GRENADE READY':'AUTO RELOAD Â· LIGHT '+(player.flashlight?'ON':'OFF');updatePortraitHud();updateTurretHud();}



function playLedgeRescueVoice(id){const p=run.players.find(p=>p.id===id);if(p){p.speech=id===1?'Hang on, I gotcha!':"Hold on. I'm gonna get you up!";p.speechTime=3;}if(!sound)return;const files={1:'game_sounds/player/survivor/voice/bill/revivefriendloud05.wav',2:'game_sounds/player/survivor/voice/zoey/revivefriendloud04.wav',3:'game_sounds/player/survivor/voice/chloe/revivefriendloud04.wav'},clip=new Audio(files[id]);clip.volume=.8;infectedAudio.add(clip);clip.onended=()=>infectedAudio.delete(clip);clip.play().catch(()=>infectedAudio.delete(clip));}

const rooftopBroadcastAudio=new Audio();rooftopBroadcastAudio.preload='none';

function playRooftopBroadcast(kind){rooftopBroadcastAudio.pause();rooftopBroadcastAudio.currentTime=0;if(!sound||state!=='playing')return;rooftopBroadcastAudio.src=kind==='answer'?'game_sounds/npc/chopper_pilot/hospital_finale_onmyway_01.wav':'game_sounds/npc/chopper_pilot/hospital_intro_hello_01.wav';rooftopBroadcastAudio.volume=.8;rooftopBroadcastAudio.play().catch(()=>{});}

const sewerHatchSound=new Audio('game_sounds/doors/urb_3b_manhole_open.wav');

const liftDoorSounds={open:new Audio('game_sounds/doors/urb_4b_elevator_open.wav'),close:new Audio('game_sounds/doors/urb_4b_elevator_close.wav')};

function playLiftDoorSound(e){for(const clip of Object.values(liftDoorSounds)){clip.pause();clip.currentTime=0;}if(!sound||state!=='playing')return;const clip=liftDoorSounds[e.open?'open':'close'];clip.volume=.65*clamp(1-Math.abs(e.x-player.x)/900,0,1);if(clip.volume)clip.play().catch(()=>{});}

const jukeboxTracks=[

 {title:'The Saints Will Never Come',file:'game_sounds/music/flu/jukebox/thesaintswillnevercome.wav'},

 {title:'All I Want for Xmas',file:'game_sounds/music/flu/jukebox/all_i_want_for_xmas.wav'},

 {title:'Badman',file:'game_sounds/music/flu/jukebox/badman.wav'},

 {title:'Midnight Ride',file:'game_sounds/music/flu/jukebox/midnightride.wav'},

 {title:'Still Alive',file:'game_sounds/music/flu/jukebox/portal_still_alive.wav'},

 {title:'Re: Your Brains',file:'game_sounds/music/flu/jukebox/re_your_brains.wav'}

];

const jukeboxAudio=new Audio();jukeboxAudio.preload='none';

let jukeboxLastRun=null,jukeboxOwner=null,jukeboxTrack=-1,jukeboxPlayPending=false,jukeboxRetryAt=0;

jukeboxAudio.addEventListener('ended',()=>{if(run!==jukeboxLastRun||!jukeboxOwner?.playing)return;jukeboxOwner.track=(jukeboxOwner.track+1)%jukeboxTracks.length;run.message('Jukebox: '+jukeboxTracks[jukeboxOwner.track].title);});

function updateStoryPropAudio(){

 if(jukeboxLastRun!==run){jukeboxLastRun=run;rooftopBroadcastAudio.pause();sewerHatchSound.pause();jukeboxAudio.pause();jukeboxAudio.currentTime=0;jukeboxOwner=null;jukeboxTrack=-1;jukeboxRetryAt=0;for(const clip of Object.values(liftDoorSounds))clip.pause();}

 const j=run?.jukeboxes.find(j=>j.playing);

 if(!j){jukeboxAudio.pause();if(jukeboxOwner)jukeboxAudio.currentTime=0;jukeboxOwner=null;jukeboxTrack=-1;}

 if(!sound||state!=='playing'){rooftopBroadcastAudio.pause();jukeboxAudio.pause();sewerHatchSound.pause();for(const clip of Object.values(liftDoorSounds))clip.pause();return;}

 if(rooftopBroadcastAudio.paused&&rooftopBroadcastAudio.currentTime>0&&rooftopBroadcastAudio.currentTime<rooftopBroadcastAudio.duration)rooftopBroadcastAudio.play().catch(()=>{});

 if(!j)return;

 if(jukeboxOwner!==j||jukeboxTrack!==j.track){jukeboxAudio.pause();jukeboxOwner=j;jukeboxTrack=j.track;jukeboxAudio.src=jukeboxTracks[j.track].file;jukeboxRetryAt=0;}

 jukeboxAudio.volume=.6*clamp(1-Math.abs(j.x-player.x)/650,0,1)*clamp(1-Math.abs(j.y-player.y)/200,0,1);

 if(jukeboxAudio.paused&&!jukeboxPlayPending&&performance.now()>=jukeboxRetryAt){jukeboxPlayPending=true;jukeboxAudio.play().catch(()=>{jukeboxRetryAt=performance.now()+1000;}).finally(()=>{jukeboxPlayPending=false;});}

}

function update(dt){run.spawnView={left:camera,right:camera+W/viewZoom,zoom:viewZoom,portrait:portraitMode()};run.step(dt,inputs());consumeEvents();sync(dt);updateMobileHud();updateWitchCry();updateBillReply();const zoey=run.players[1];if(dialogueAudio&&zoeyFunClips.includes(dialogueAudio)&&(!zoey||zoey.down||zoey.dead||zoey.grab||run.director.phase==='assault'||run.zombies.some(z=>z.hp>0&&(z.role!=='witch'||z.awake)&&Math.abs(z.x-zoey.x)<450))){stopDialogue();if(zoey){zoey.speech='';zoey.speechTime=0;zoey.brain.nextTalk=Math.min(zoey.brain.nextTalk,run.time);}}for(const c of casings){c.x+=c.vx*dt;c.y+=c.vy*dt;c.vy+=400*dt;c.life-=dt}casings=casings.filter(c=>c.life>0);shake*=Math.exp(-11*dt);announceClock-=dt;hitFlash=Math.max(0,hitFlash-dt);if(announceClock<=0)ui.announcement.textContent='';if(run.status!=='playing'){document.getElementById('auto-use-items').hidden=true;stopDialogue();stopPistolSounds();stopWitchCry();stopZoeyScream();state=run.status;if(state==='dead')playGameOverSound();document.getElementById('restart').textContent=state==='dead'&&run.checkpoint?'RETURN TO CHECKPOINT '+run.checkpoint.roomId:'RESTART';ui['ending-label'].textContent=state==='won'?'SAFE ROOM SECURED':'THE HORDE ENDURES';ui['ending-title'].textContent=state==='won'?'SAFE AT LAST.':'OVERRUN.';ui.result.textContent=`${run.difficulty.toUpperCase()} Â· ${kills} eliminations Â· ${Math.floor(time/60)}m ${Math.floor(time%60)}s Â· seed ${run.seed}`;clearTouchInput();document.getElementById('touch-controls').hidden=true;ui.death.classList.remove('hidden');document.getElementById('touch-controls').hidden=!mobileMode||state!=='playing';document.getElementById('switch-character').style.display='none';if(state==='won'){try{const n=Number(localStorage.getItem('deadwalk-extractions')||0)+1;localStorage.setItem('deadwalk-extractions',String(n));ui.result.textContent+=` Â· ${n} total extractions`}catch{}}}}



document.getElementById('auto-use-items').onclick=()=>{autoUseItems=!autoUseItems;if(run)run.autoUseItems=autoUseItems;updateHud();};



function updateHud(){const autoButton=document.getElementById('auto-use-items');autoButton.hidden=!['playing','paused'].includes(state);autoButton.textContent='AUTO ITEMS: '+(autoUseItems?'ON':'OFF');autoButton.setAttribute('aria-pressed',String(autoUseItems));document.getElementById('touch-controls').hidden=!mobileMode||state!=='playing';canvas.style.filter=player.lastStrike?'grayscale(1)':'';document.getElementById('switch-character').style.display=state==='playing'||state==='paused'?'':'none';document.getElementById('switch-character').textContent='PLAYING '+player.name.toUpperCase()+' Â· SWITCH [TAB]';ui.health.style.width=Math.min(100,player.down?player.incapHp/2:player.hp)+'%';ui.stamina.textContent=`DEFIB ${player.defibrillators} · 4 PILLS ${player.healthItems.pills} Â· 5 ADREN ${player.healthItems.adrenaline} Â· 6 KIT ${player.medicine} Â· H USE`;ui.objective.textContent=run.map==='no-mercy'?(player.x>=DW.HOSPITAL.start&&player.y<900?'HOSPITAL / '+(player.x<10000?'BASEMENT':DW.mercySection(player.x).replace('HOSPITAL ','')):player.y>DW.SEWER.streetY+70?(player.x>=DW.SEWER.extensionStart?DW.mercySection(player.x):'SEWER TUNNEL'):DW.mercySection(player.x)):'CATWALK';if(run.lift.enabled&&player.x>=12500)ui.objective.textContent=run.lift.phase==='idle'?'CALL THE ROOFTOP LIFT':run.lift.phase==='common'?'HOLD OUT · WAVE '+run.lift.wave+' / 4':run.lift.phase==='specials'?'HOLD OUT · SPECIAL INFECTED':run.lift.phase==='arrival'?'UP · ENTER THE OPEN LIFT':run.lift.phase==='rooftop'?'HOSPITAL ROOFTOP':'LIFT · GOING UP';ui.wave.textContent=run.bossActive?'TANK BOSS':run.director.phase.toUpperCase();ui['weapon-name'].textContent=player.defibTarget?'DEFIBRILLATOR':player.healthHeld||player.healthUseTime?player.healthSelected.toUpperCase():DW.WEAPONS[player.weapon].name.toUpperCase();ui.ammo.innerHTML=player.defibTarget?'1 <em>CHARGING</em>':player.healthHeld||player.healthUseTime?String(player.healthSelected==='kit'?player.medicine:player.healthItems[player.healthSelected])+' <em>AVAILABLE</em>':player.weapon==='pipebomb'?player.grenades+' <em>PIPE BOMBS</em>':player.mag+' <em>/ '+(DW.WEAPONS[player.weapon].unlimitedAmmo?'âˆž':player.reserve)+'</em>';ui['weapon-state'].textContent=player.defibTarget?`DEFIBRILLATING · ${Math.max(0,3-player.defibTime).toFixed(1)}s`:player.beingHealedBy?'TEAMMATE HEALING · HOLD STILL':player.healthUseTime?`USING ${player.healthUseKind.toUpperCase()} Â· ${player.healthUseTime.toFixed(1)}s`:player.sewerClimbing?'CLIMBING · WEAPON STOWED':player.healthHeld?'H / LEFT CLICK USE Â· WHEEL BACK TO GUN':player.dead?'DEAD Â· SWITCH TO A TEAMMATE':player.down?'INCAPACITATED Â· NEED REVIVE':player.grab?(run.zombies.some(z=>z.id===player.grab&&['hunter','smoker'].includes(z.role))?'PINNED Â· TEAMMATE RESCUE':'GRABBED Â· SHOVE'):player.carry?'CARRYING Â· DROP TO FIRE':player.reload?`RELOADING ${player.reload.toFixed(1)}s`:player.locked?'OVERHEATED Â· SWITCH GUN OR WAIT':player.mag===0?'EMPTY Â· R TO RELOAD':player.weapon==='pipebomb'?'LEFT CLICK TO THROW Â· 5 SECOND FUSE':player.weaponLasers[player.weapon]?'LASER SIGHT Â· L LIGHT '+(player.flashlight?'ON':'OFF'):'WHEEL WEAPONS Â· L LIGHT '+(player.flashlight?'ON':'OFF');ui.scrap.textContent=run.scrap;ui.heat.style.width=player.heat+'%';ui.heat.style.background=player.locked?'#d57759':'#bacb83';ui.noise.style.width=run.noise+'%';const zone=run.zones.find(z=>player.x>=z.x&&player.x<z.end&&player.y<500);ui.resonance.parentElement.parentElement.style.display=run.map==='no-mercy'?'none':'';ui.resonance.style.width=(zone?.stress||0)+'%';ui.resonance.style.background=zone?.warning?'#df795b':'#bacb83';updateSurvivorHud();const speakers=run.players.filter(p=>p.speechTime>0);ui['zoey-dialogue'].textContent=speakers.map(p=>p.name.toUpperCase()+': '+p.speech).join('\n');ui['zoey-dialogue'].style.whiteSpace='pre-line';ui['zoey-dialogue'].style.display=speakers.length?'block':'none';ui.context.textContent=player.smokerFall?'FALLING · ROOFTOP SMOKER':player.smokerLiftHeight>0&&player.grab?'SMOKER LIFT · CUT THE TONGUE OR SHOOT THE SMOKER':player.beingHealedBy?'BEING HEALED BY '+run.players.find(p=>p.id===player.beingHealedBy)?.name.toUpperCase()+' · HOLD STILL':player.dead?'YOU DIED Â· TEAMMATES CAN KEEP GOING':player.grab?'PINNED Â· TEAMMATE MUST SHOOT OR SHOVE THE SPECIAL OFF':player.down?'INCAPACITATED Â· TEAMMATE: HOLD E TO REVIVE':player.goo>0?`BOOMER GOO Â· ${Math.ceil(player.goo)}s Â· HORDE INCOMING`:player.prompt|| (player.carry?'CARRY EAST â†’ TRUCK Â· E TO DROP':'');ui['run-info'].textContent=`SEED ${run.seed} Â· ${Math.round(fps)} FPS Â· ${run.director.side.toUpperCase()}`;updateInputPrompts();updateTurretHud();}







function updateSurvivorHud(){for(const [i,name] of ['bill','zoey','chloe'].entries()){const p=run.players[i],card=ui[name+'-card'];if(!p){card.style.display='none';continue;}card.style.display='';for(const icon of card.querySelectorAll('[data-item]')){const kind=icon.dataset.item,count=p.dead?0:kind==='pills'?p.healthItems.pills:kind==='kit'?p.medicine:p.grenades,label=kind==='pills'?'Pills':kind==='kit'?'Health kits':'Pipe bombs';icon.hidden=count<=0;icon.title=label+': '+count;icon.setAttribute('aria-label',label+': '+count);icon.querySelector('small').textContent=count>1?count:'';}const state=DW.healthState(p);card.className=`survivor-card ${state.tone}${p.down&&!p.dead?' incapacitated':''}${p.dead?' deceased':''}${p===player?' controlled':''}`;card.setAttribute('aria-label',`${p.name}${p===player?' Â· You are controlling this survivor':''} Â· ${state.label} Â· ${Math.ceil(state.value)} health`);ui[name+'-hp'].textContent=p.dead?'âœ•':`+${Math.ceil(state.value)}`;const bar=i===0?ui.health:i===1?ui['partner-health']:ui['chloe-health'];bar.style.width=Math.min(100,p.down&&!p.ledgeHanging?state.value/2:state.value)+'%';bar.style.background='';ui[name+'-temp'].style.width=(!p.down&&!p.dead&&state.value?p.tempHp/state.value*100:0)+'%';ui[name+'-state'].textContent=p.dead?'DEAD':p.down?p.grab?'INCAPACITATED Â· FREE ME FIRST':'INCAPACITATED Â· HOLD E TO REVIVE':p.grab?'PINNED Â· RESCUE NEEDED':`${p===player?'YOU Â· ':p.ai?'AI Â· ':''}${p.lastStrike?'BLACK & WHITE Â· USE A KIT':state.label}${p.tempHp>0?` Â· TEMP +${Math.ceil(p.tempHp)}`:''}${p.adrenalineTime>0?` Â· SPEED ${Math.ceil(p.adrenalineTime)}s`:''}`;ui[name+'-revive'].style.width=Math.min(100,p.revive/(p.ledgeHanging?6:2.3)*100)+'%';}}







const characterArt={};



// Source rectangles exclude the transparent margins while preserving foot alignment.



const spriteLayout=DW.SPRITES;







function weaponShovePose(a){const t=Math.max(0,Math.min(1,1-(a.shoveAnim||0)/.28)),smooth=v=>v*v*(3-2*v);let angle;if(t<.22)angle=-.58*smooth(t/.22);else if(t<.65)angle=-.58+1.53*smooth((t-.22)/.43);else angle=.95*(1-smooth((t-.65)/.35));return {angle,reach:Math.sin(t*Math.PI)*10,weight:Math.sin(t*Math.PI)};}



for(const name of Object.keys(spriteLayout)){const img=new Image();img.src=`assets/characters/${name}${name==='bill'||name==='zoey'||name==='chloe'?'-pistol':''}.png`;characterArt[name]=img;}



function drawDeagle(ctx,x,y,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.translate(-30,0);ctx.scale(-1,1);ctx.fillStyle='#293034';ctx.fillRect(-30,-5,30,9);ctx.fillStyle='#c4cbce';ctx.fillRect(-30,-6,29,6);ctx.fillStyle='#f0f2ef';ctx.fillRect(-29,-6,27,1);ctx.fillStyle='#757e83';ctx.fillRect(-29,0,24,2);ctx.fillStyle='#151b1e';ctx.fillRect(-9,2,7,13);ctx.strokeStyle='#acb4b7';ctx.lineWidth=1;ctx.strokeRect(-17,3,8,5);ctx.fillStyle='#454e54';for(let i=0;i<5;i++)ctx.fillRect(-10+i*1.4,-5,1,4);ctx.fillStyle='#232a2f';ctx.fillRect(-3,-8,2,2);ctx.fillRect(-29,-8,2,2);ctx.restore();}

function drawArtRig(img,source,height,a,ctxOverride=ctx){const ctx=ctxOverride;const [sx,sy,sw,sh]=source,width=sw/sh*height,pose=a.sewerClimbing?{facing:1,angle:0,armAngle:0,drop:0,bob:Math.sin(a.walkCycle||0)*.7}:a.role?{angle:0,drop:a.role==='hunter'&&a.crouch>0?10:0,bob:a.moving?Math.sin(a.walkCycle||0)*1.2:0}:DW.bodyPose(a);const crouch=a.role?0:a.crouchAmount||0,cut=a.role?.50:a.id===1?.51:.44,kneeCut=.76,hipY=-height*(1-cut)+pose.drop,thigh=height*(kneeCut-cut),calf=height*(1-kneeCut),walk=a.moving&&(!a.role?a.onGround:true)?Math.sin(a.walkCycle||0)*.32:0;



  // Preserve each full leg silhouette; small hip swings avoid tearing the painted anatomy.



  for(let leg=0;leg<2;leg++){const side=leg?1:-1,hipX=side*width*.12,left=-width/2+leg*width/2;ctx.save();ctx.translate(hipX,hipY);if(a.sewerClimbing){const phase=(a.walkCycle||0)+leg*Math.PI,bend=.32+Math.sin(phase)*.4;ctx.rotate(side*bend);ctx.drawImage(img,sx+leg*sw/2,sy+sh*cut,sw/2,sh*(kneeCut-cut),left-hipX,0,width/2,thigh);ctx.translate(side*2,thigh);ctx.rotate(-side*(.65+Math.cos(phase)*.3));ctx.drawImage(img,sx+leg*sw/2,sy+sh*kneeCut,sw/2,sh*(1-kneeCut),left-hipX,0,width/2,calf);}else{ctx.rotate(walk*side*.38);ctx.drawImage(img,sx+leg*sw/2,sy+sh*cut,sw/2,sh*(1-cut),left-hipX,0,width/2,height*(1-cut)-pose.drop);}ctx.restore();}



  if(!a.role){const arms=DW.survivorArms(a)[(a.weapon==='rifle'||a.weapon==='smg')?'rifle':'pistol'],swipe=a.shoveAnim>0?weaponShovePose(a):{angle:0,reach:0,weight:0},scale=height/sh,toLocal=([px,py])=>[(px-sx-sw/2)*scale,(py-sy)*scale-height+pose.drop+pose.bob],points=arms.outline.map(toLocal),pivot=toLocal(arms.pivot);



    const outline=()=>{ctx.moveTo(points[0][0],points[0][1]);for(const p of points.slice(1))ctx.lineTo(p[0],p[1]);ctx.closePath();};



    // Keep the head and coat upright. Only the shoulder/arms/weapon layer aims.



    const bodyOutline=a.id===3?[[260,0],[610,0],[610,220],[570,260],[607,375],[578,560],[372,565],[350,470],[265,470]]:a.id===2?[[190,0],[565,0],[565,225],[510,265],[540,390],[520,630],[280,630],[300,440],[235,340],[190,230]]:[[240,0],[710,0],[710,270],[600,280],[630,420],[610,660],[255,660],[300,440],[300,235]];ctx.save();ctx.beginPath();const bodyPoints=bodyOutline.map(toLocal);ctx.moveTo(...bodyPoints[0]);for(const point of bodyPoints.slice(1))ctx.lineTo(...point);ctx.closePath();ctx.clip();ctx.beginPath();ctx.rect(-width/2,-height+pose.drop+pose.bob,width,height*cut+.5);outline();ctx.clip('evenodd');ctx.drawImage(img,sx,sy,sw,sh*cut,-width/2,-height+pose.drop+pose.bob,width,height*cut);ctx.restore();



    const torsoOutline=a.id===3?[[330,250],[575,260],[607,375],[578,560],[372,565],[385,470],[330,350]]:a.id===2?[[265,250],[510,265],[540,390],[520,630],[280,630],[300,440],[255,340]]:[[345,235],[600,265],[630,420],[610,660],[255,660],[300,440],[315,320]];ctx.save();ctx.beginPath();const torsoPoints=torsoOutline.map(toLocal);ctx.moveTo(...torsoPoints[0]);for(const point of torsoPoints.slice(1))ctx.lineTo(...point);ctx.closePath();ctx.clip();ctx.beginPath();outline();ctx.clip();const shirt=a.id===3?[440,440,100,100]:a.id===2?[340,475,165,100]:[345,480,125,120];const shirtTop=toLocal([a.id===1?255:a.id===2?255:330,235]),shirtBottom=toLocal([a.id===1?630:a.id===2?540:607,a.id===1?660:a.id===2?630:565]);ctx.drawImage(img,...shirt,shirtTop[0],shirtTop[1],shirtBottom[0]-shirtTop[0],shirtBottom[1]-shirtTop[1]);ctx.restore();



    ctx.drawImage(img,sx,sy+sh*(cut-.09),sw,sh*.09,-width/2,-height*(1-cut+.09)+pose.drop+pose.bob,width,height*.09+1);



    ctx.save();if(a.defibTarget||a.healthHeld||a.healthUseTime||a.mountedTurret||a.sewerClimbing)ctx.globalAlpha=0;ctx.translate(pivot[0]+swipe.reach,pivot[1]);ctx.rotate(pose.armAngle*(1-swipe.weight)+swipe.angle);ctx.translate(-pivot[0],-pivot[1]);ctx.save();ctx.beginPath();outline();ctx.clip();ctx.drawImage(img,sx,sy,sw,sh*cut,-width/2,-height+pose.drop+pose.bob,width,height*cut);ctx.restore();if(a.weapon==='deagle'){const muzzle=toLocal(a.id===2?[842,210]:a.id===3?[944,190]:[926,257]);const gunScale=height/sh*5.2;drawDeagle(ctx,muzzle[0],muzzle[1]+gunScale*2,gunScale);}ctx.restore();



    if(a.id===1)drawBillSpeakingFace(ctx,img,source,height,a,pose);



    if(a.sewerClimbing){const colors=a.id===2?['#993b35','#c95f53']:a.id===3?['#374448','#5b696d']:['#435844','#708267'];for(let arm=0;arm<2;arm++){const side=arm?1:-1,phase=(a.walkCycle||0)+arm*Math.PI,handY=-height*.82-Math.sin(phase)*9,elbowY=-height*.61-Math.sin(phase)*5;ctx.lineCap='round';ctx.strokeStyle=colors[0];ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(side*8,-height*.59);ctx.lineTo(side*20,elbowY);ctx.lineTo(side*16,handY+5);ctx.stroke();ctx.strokeStyle=colors[1];ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#c5b397';ctx.beginPath();ctx.ellipse(side*16,handY,3.5,4.5,0,0,Math.PI*2);ctx.fill();}ctx.lineCap='butt';}

    if(a.shoveAnim>0){ctx.save();ctx.globalAlpha=swipe.weight*.35;ctx.strokeStyle='#dbe4a2';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(pivot[0]+swipe.reach,pivot[1],a.weapon==='pistol'?26:34,-.6,.95);ctx.stroke();ctx.restore();}



  }else{ctx.save();ctx.translate(0,hipY+pose.bob);ctx.rotate(pose.angle);ctx.drawImage(img,sx,sy,sw,sh*(cut+.005),-width/2,-height*cut,width,height*(cut+.005));ctx.restore();}



}



// One small reusable silhouette buffer keeps the selected-survivor outline inexpensive.

const controlledGlowMask=document.createElement('canvas'),controlledGlowOutline=document.createElement('canvas');

controlledGlowMask.width=controlledGlowMask.height=controlledGlowOutline.width=controlledGlowOutline.height=256;

function drawControlledGlow(){

  if(!run||!player||player.dead||player.ledgeHanging||!['playing','paused'].includes(state))return false;

  const key=DW.survivorName(player)+(!player.sewerClimbing&&['rifle','smg'].includes(player.weapon)?'-rifle':''),img=characterArt[key];

  if(!img?.complete||!img.naturalWidth)return false;

  const source=spriteLayout[key],[sx,sy,sw,sh,height]=source,width=sw/sh*height;

  const mask=controlledGlowMask.getContext('2d'),outline=controlledGlowOutline.getContext('2d');

  mask.clearRect(0,0,256,256);mask.save();mask.translate(128,180);mask.scale(player.sewerClimbing?1:DW.bodyPose(player).facing,1);

  const pinned=run.zombies.some(z=>z.role==='hunter'&&z.id===player.grab);

  if(player.down||pinned){mask.translate(27,-6);mask.rotate(-Math.PI/2);mask.drawImage(img,sx,sy,sw,sh,-width/2,-height,width,height);}

  else drawArtRig(img,source,height,player,mask);

  mask.restore();mask.globalCompositeOperation='source-in';mask.fillStyle='#ffab32';mask.fillRect(0,0,256,256);mask.globalCompositeOperation='source-over';

  outline.clearRect(0,0,256,256);for(let i=0;i<8;i++){const angle=i*Math.PI/4;outline.drawImage(controlledGlowMask,Math.cos(angle)*.7,Math.sin(angle)*.7);}

  outline.globalCompositeOperation='destination-out';outline.drawImage(controlledGlowMask,0,0);outline.globalCompositeOperation='source-over';

  ctx.save();ctx.translate((player.x-camera)*viewZoom,player.y*viewZoom+verticalOffset());ctx.scale(viewZoom,viewZoom);

  ctx.globalAlpha=.85;ctx.shadowColor='#ff921f';ctx.shadowBlur=2.5*dpr;ctx.drawImage(controlledGlowOutline,-128,-180);ctx.restore();return true;

}



function realisticCharacter(x,y,a){



  const key=a.sewerClimbing?DW.survivorName(a):a.role?(spriteLayout[a.role]?a.role:['infected-worker','infected-office','infected-civilian'][a.tint%3]):DW.survivorName(a)+((a.weapon==='rifle'||a.weapon==='smg')?'-rifle':''),img=characterArt[key];



  if(!img?.complete||!img.naturalWidth)return false;



  const [sx,sy,sw,sh,baseHeight]=spriteLayout[key],height=key==='hunter'&&a.grabbing?48:baseHeight,width=sw/sh*height;const hunterPin=!a.role&&run.zombies.some(z=>z.role==='hunter'&&z.id===a.grab);



  const victim=a.grabbing?run?.players.find(p=>p.grab===a.id):null;



  const target=victim||run?.players.filter(p=>!p.down).sort((p,q)=>Math.abs(p.x-x)-Math.abs(q.x-x))[0];



  const facing=a.sewerClimbing?1:a.role?Math.sign((target?.x??x+1)-x)||1:DW.bodyPose(a).facing;



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



  ctx.textAlign='center';if(!a.hideName)ctx.fillText(a.role?(key.startsWith('infected-')?'':key.toUpperCase()):`${a.name.toUpperCase()}${a.dead?' Â· DEAD':a.down?' Â· DOWN':hunterPin?' Â· PINNED':''}`,0,a.down||hunterPin?-30:-height-9);



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



function drawCarSprite(car){ctx.save();ctx.translate(car.x+62,car.y-24);ctx.rotate((car.spin||0)+(car.wrecked?Math.PI:0));if(car.kind==='van'){DeadwalkEnvironment.surface(ctx,'metal',-62,-25,126,42);rect(-60,-23,94,35,'#6f7667');rect(35,-21,21,20,'#17282c');line(35,-20,55,-20,'#7d8d82',2);line(30,-24,30,15,'#424d42',2);line(-55,10,54,10,'#333f36',3);ellipse(-40,18,10,10,'#0d171b');ellipse(42,18,10,10,'#0d171b');ellipse(-40,18,4,4,'#636b5d');ellipse(42,18,4,4,'#636b5d');rect(56,2,7,4,'#ac9d6a');for(let i=0;i<15;i++)rect((i*17)%118-59,(i*11)%25-5,2,1,'#77513266');ctx.restore();return;}if(tankPropsArt.complete&&tankPropsArt.naturalWidth){if(!car.isAlarm)ctx.filter='sepia(.5) saturate(.65)';ctx.drawImage(tankPropsArt,86,455,1590,413,-78,-24,156,48);ctx.filter='none';for(let i=0;i<22;i++){const px=(i*23%133)-65,py=(i*13%15)+2;rect(px,py,2+i%3,1,'#513b2c65');}line(-29,-17,-13,-13,'#b0bba630',1);line(11,-15,28,-11,'#28373765',1);DeadwalkEnvironment.carDetail(ctx,car,tankPropsArt);if(car.kind==='police'){rect(-33,-1,54,13,'#afb3a185');ctx.fillStyle='#172a29';ctx.font='bold 8px sans-serif';ctx.fillText('POLICE',-28,9);rect(-15,-24,32,4,'#152023');rect(-14,-23,14,3,'#a64946');rect(2,-23,14,3,'#496a95');}}else{rect(-63,-20,126,35,'#726153');ellipse(-42,19,11,11,'#11181c');ellipse(42,19,11,11,'#11181c');}ctx.restore();}



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



 ctx.restore();ctx.fillStyle='#e3a178';ctx.font='bold 13px monospace';ctx.textAlign='center';ctx.fillText(a.dropping?(a.ladderDrop?'TANK · LADDER DROP':'TANK · ROOFTOP DROP'):a.stagger>0?'TANK · STUMBLED':a.falling?'TANK · DROPPING DOWN':a.jumpWindup>0?'TANK · PREPARING TO LEAP':a.jumping?'TANK · LEAPING':a.jumpLand>0?'TANK · LANDING':a.carWindup>0?'TANK · CAR STRIKE!':a.rockWindup>0?(progress<.4?'TANK · PICKING UP ROCK':'TANK · THROWING ROCK'):'TANK',x,y-size-16);rect(x-48,y-size-10,96,4,'#241c1b');rect(x-48,y-size-10,96*Math.max(0,a.hp/15000),4,'#e49a70');



}







function drawWitch(x,y,a){if(!witchArt.complete||!witchArt.naturalWidth)return false;const source=DW.WITCH_SPRITES[a.awake?'awake':'idle'],[sx,sy,sw,sh,h]=source,w=sw/sh*h;ctx.save();ctx.translate(x,y);ctx.scale(a.awake?(a.facing||1):1,1);if(a.climbing)ctx.rotate(Math.sin(a.walkCycle||0)*.08);ellipse(0,0,a.awake?24:21,3,'#050b0d99');if(!a.awake&&a.agitation>0){const rise=clamp(a.agitation,0,1),standing=DW.WITCH_SPRITES.awake,[tx,ty,tw,th,height]=standing;ctx.globalAlpha=1-rise;ctx.drawImage(witchArt,sx,sy,sw,sh,-w/2,-h-rise*12,w,h+rise*12);ctx.globalAlpha=rise;ctx.drawImage(witchArt,tx,ty,tw,th,-tw/th*height/2,-height,tw/th*height,height);ctx.globalAlpha=1;}else ctx.drawImage(witchArt,sx,sy,sw,sh,-w/2,-h+(a.moving?Math.sin(a.walkCycle||0)*1.5:0),w,h);ctx.restore();ctx.fillStyle=a.awake?'#f09587':'#9b9f96';ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillText(a.climbing?'WITCH Â· CLIMBING':a.awake?'WITCH Â· '+(run.players.find(p=>p.id===a.target)?.name.toUpperCase()||'ENRAGED'):a.agitation>.1?'WITCH Â· '+(a.agitation<=.45?'UNSETTLED ':'AGITATED ')+Math.round(a.agitation*100)+'%':'WITCH Â· DO NOT SHOOT',x,y-h-9);if(a.slashFlash>0){line(x,y-40,x+(a.facing||1)*40,y-17,'#edb7a4',3);}return true;}



function characterBody(x,y,a){if(a.role==='tank'){drawTank(x,y,a);return;}if(a.role==='witch'&&drawWitch(x,y,a))return;if(realisticCharacter(x,y,a))return;const z=!!a.role,role=a.role||'survivor',face=z?Math.sign((player?.x||x+1)-x)||1:DW.bodyPose(a).facing;const moving=z?!(a.stagger>0||a.windup>0):Math.abs(a.vx)>1;const walk=Math.sin(time*(role==='runner'?12:z?3.5:10)+ (a.phase||0))*(moving?(z?7:10):1);ctx.save();ctx.translate(x,y);if(!z&&a.down){ellipse(0,-5,23,6,'#5f7068');ellipse(22,-8,8,7,'#b6a58e');line(-20,-5,-34,-3,'#3c4a46',6);ctx.fillStyle='#e3b574';ctx.font='10px monospace';ctx.fillText('REVIVE',-20,-22);ctx.restore();return}ellipse(0,1,19,3,'#101d1b77');const lean=z?(role==='hunter'?18:role==='runner'?10:5):a.carry?-5:a.reload?3:0;const wide=role==='boomer'?25:role==='breacher'?15:z?10:11,torso=z?role==='hunter'?'#353b62':role==='smoker'?'#788f83':role==='boomer'?'#a2a85c':role==='breacher'?'#736e5b':role==='grabber'?'#6b7274':'#687a67':a.id===2?'#ac4b48':'#a1ad85';const skin=z?'#9daa87':'#cab99b';



limb(-5,-23,-7-walk*.4,-12,-8+walk,0,'#33443e',7);limb(5,-23,7+walk*.4,-13,8-walk,0,z?'#3e4b3e':a.id===2?'#485e65':'#50634f',7);line(-8+walk,0,-3+walk,0,'#1e2a27',5);line(8-walk,0,13-walk,0,'#1e2a27',5);



ctx.fillStyle=torso;ctx.beginPath();ctx.moveTo(-wide+lean,-47);ctx.quadraticCurveTo(lean,-54,wide+lean,-45);ctx.lineTo(9,-23);ctx.quadraticCurveTo(0,-20,-9,-24);ctx.closePath();ctx.fill();line(lean,-48,lean+face*2,-55,skin,6);ellipse(lean+face*3,-59,8,10,skin);if(z){line(lean+face*7,-62,lean+face*10,-60,'#dadf9b',2);limb(lean+face*6,-43,face*18,-36,face*(role==='grabber'?37:27),-28+walk*.3,skin,5);limb(lean-face*6,-43,face*11,-32,face*22,-29-walk*.3,torso,5);if(role==='breacher'){ellipse(lean,-55,12,7,'#8b8170');line(-9,-34,10,-32,'#c6a574',3)}if(role==='runner'){line(lean+2,-45,lean+4,-24,'#93634e',3)}if(role==='climber'){line(-8,-39,7,-27,'#b0b093',2)}if(['hunter','smoker','boomer'].includes(role)){if(role==='hunter'){ellipse(lean,-62,12,8,'#303a55');limb(-8,-25,-22,-12,-29,0,'#3b4262',6);limb(8,-25,23,-12,30,0,'#3b4262',6);}if(role==='smoker'){ellipse(-7,-47,10,14,'#a6b682');line(face*11,-57,face*22,-52,'#c08484',3);}if(role==='boomer'){ellipse(0,-31,25,22,'#a2af64');ellipse(8,-35,5,6,'#657449');}ctx.font='bold 10px monospace';ctx.fillStyle=role==='boomer'?'#dae68e':'#e0aaa0';ctx.fillText(role.toUpperCase(),-23,-91);}if(a.windup>0||a.crouch>0||a.aimTime>0||a.burstTimer>0){ctx.strokeStyle='#e2ab70';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-58,15,0,Math.PI*2);ctx.stroke()}if(a.stagger>0){line(-12,-70,-16,-75,'#cfd48d');line(12,-70,16,-74,'#cfd48d')}}else{if(a.id===2){ellipse(lean,-65,9,5,'#44312a');limb(lean-7,-62,lean-13,-48,lean-14,-39,'#44312a',5);line(lean,-47,lean,-27,'#ddd5c9',2);}else ellipse(lean+2,-65,10,5,'#526b4e');line(lean-7,-49,lean-7,-27,'#354c42',5);line(-9,-28,9,-28,'#354c42',4);if(a.carry){limb(-7,-43,-18,-35,-12,-24,skin,5);limb(7,-43,18,-35,12,-24,skin,5);rect(-13,-34,26,20,'#687b75');rect(-8,-30,16,3,'#d8dd8b')}else{ctx.save();ctx.translate(lean,-43);ctx.rotate(a.angle-(a.flash>0?.045:0));const retract=a.reload?Math.sin(a.reload*4)*8:0;limb(-2,2,12,10,25-retract,2,skin,5);rect(0,-5,35,8,'#1a2427');rect(30,-3,13,4,'#82958b');rect(9,4,9,10,'#263335');if(a.flash>0){ctx.fillStyle='#f8e8ac';ctx.beginPath();ctx.moveTo(42,0);ctx.lineTo(58,-7);ctx.lineTo(52,0);ctx.lineTo(59,5);ctx.closePath();ctx.fill()}ctx.restore()}ctx.fillStyle=a.id===2?'#93b9cc':'#d2df93';ctx.font='9px monospace';ctx.fillText(a.id===2?'ZOEY':'P'+a.id,-6,-82);if(a.role==='hunter'&&a.grabbing){const strike=Math.sin(time*16)*8;limb(-6,-31,-14,-20,-11,-9+strike,'#9a9d8b',3);limb(9,-32,18,-21,12,-10-strike,'#9a9d8b',3);}if(a.grab){ctx.strokeStyle='#d98c62';ctx.strokeRect(-19,-75,38,77)}}ctx.restore()}



function drawPipeBomb(x,y,flashing=false,angle=0){ctx.save();ctx.translate(x,y);ctx.rotate(angle);rect(-5,-13,10,26,'#7b8483');rect(-6,-15,12,3,'#c4c8c0');rect(-6,12,12,3,'#c4c8c0');rect(-8,-10,7,10,'#344453');rect(2,-9,6,11,'#b6b7a5');rect(3,-7,3,6,'#58655c');line(-4,-12,-8,-20,'#343a39',2);line(-4,-9,6,2,'#984a3d',1);ellipse(0,-10,2.5,2.5,flashing?'#ff3023':'#792c29');if(flashing){ellipse(0,-10,11,11,'#ff38213d');line(-10,-10,-16,-10,'#ff7663',2);line(10,-10,16,-10,'#ff7663',2);}ctx.restore();}



function drawLaserBox(x,y){rect(x-23,y-27,46,27,'#c2c6bf');rect(x-24,y-30,48,4,'#ededdd');rect(x-21,y-26,42,7,'#28342e');rect(x+23,y-31,5,31,'#858d85');line(x+22,y-29,x+37,y-43,'#c9cbbb',5);line(x-21,y-26,x-21,y-4,'#f1efdf',2);line(x-11,y-14,x+8,y-14,'#222d29',3);line(x+7,y-14,x+15,y-17,'#222d29',2);ctx.strokeStyle='#c7332d';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(x-5,y-15,8,0,Math.PI*2);ctx.stroke();line(x-5,y-25,x-5,y-5,'#c7332d',1);line(x-16,y-15,x+5,y-15,'#c7332d',1);ctx.fillStyle='#f3e8cd';ctx.font='bold 10px monospace';ctx.fillText('LASER SIGHTS Â· E',x-46,y-50);}



function drawFortifications(){if(!run)return;for(const b of run.sandbags){if(b.x<camera-110||b.x>camera+W/viewZoom+110)continue;ellipse(b.x+b.w/2,b.y+1,b.w*.6,4,'#02070bc0');for(let row=0;row<3;row++)for(let col=0;col<3;col++){const x=b.x+col*22+(row%2?5:0),y=b.y-9-row*10;ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(col*3+row+b.x)*.045);const bag=ctx.createLinearGradient(0,-8,0,5);bag.addColorStop(0,'#8b8462');bag.addColorStop(.45,'#686447');bag.addColorStop(1,'#353a2c');ctx.fillStyle=bag;ctx.beginPath();ctx.ellipse(10,-2,12,6,.02,0,Math.PI*2);ctx.fill();line(0,-2,20,-1,'#a49a6b55',.6);line(1,1,20,1,'#262e2488',.7);for(let i=0;i<8;i++)rect((i*7+row*3)%20,-5+i%6,1,1,'#b5a47635');ctx.restore();}}

for(const t of run.turrets){if(t.x<camera-110||t.x>camera+W/viewZoom+110)continue;ellipse(t.x,t.y+1,26,4,'#02070bc0');line(t.x,t.y-42,t.x-24,t.y,'#303e31',5);line(t.x,t.y-42,t.x+26,t.y,'#384936',5);line(t.x,t.y-42,t.x+4,t.y,'#46543c',5);line(t.x-15,t.y-12,t.x+17,t.y-12,'#29372d',3);for(const x of [-24,4,26])ellipse(t.x+x,t.y,5,2,'#4f5b45');rect(t.x-4,t.y-49,8,15,'#657159');ctx.save();ctx.translate(t.x,t.y-49);ctx.rotate(t.angle);DeadwalkEnvironment.surface(ctx,'metal',-20,-9,42,14);rect(-18,-8,37,4,'#697456');rect(-25,-5,6,12,'#212b27');line(-23,5,-15,5,'#818271',2);rect(5,1,24,16,'#46573b');rect(6,3,22,2,'#778163');rect(22,-4,25,7,'#27342b');rect(47,-2,21,3,t.locked?'#a15d3a':'#151e20');line(24,-4,44,-4,'#697567',1);for(let i=0;i<5;i++)rect(26+i*4,-1,2,2,'#080f12');rect(-4,-13,6,4,'#1c2626');rect(39,-8,3,4,'#2d3830');if(t.flash>0){line(68,0,87,0,'#fff0a0',4);ellipse(71,0,5,3,'#fff8c6');}ctx.restore();if(t.playerId||t.heat>0){rect(t.x-25,t.y-83,50,4,'#182420');rect(t.x-25,t.y-83,t.heat*.5,4,t.locked?'#eb683a':'#dca14f');}ctx.font='9px monospace';ctx.fillStyle=t.locked?'#e99362':'#b9bea1';ctx.textAlign='center';ctx.fillText(t.locked?'OVERHEATED':'MOUNTED TURRET',t.x,t.y-94);ctx.textAlign='left';}}

function updateTurretHud(){if(!run||!player)return;const t=run.turrets.find(t=>t.id===player.mountedTurret),near=run.context(player);const interact=mobileMode?'USE':DeadwalkInput.device==='gamepad'?DeadwalkInput.buttonLabel('INTERACT'):DeadwalkInput.keyLabel('INTERACT'),fire=mobileMode?'AIM / FIRE':DeadwalkInput.device==='gamepad'?DeadwalkInput.buttonLabel('FIRE'):'LEFT CLICK';if(t){ui['weapon-name'].textContent='MOUNTED TURRET';ui.ammo.innerHTML='∞ <em>UNLIMITED</em>';ui['weapon-state'].textContent='CONTINUOUS FIRE · NO OVERHEATING';ui.context.textContent='HOLD '+interact+' + '+fire+' · RELEASE '+interact+' TO LEAVE';ui.heat.style.width=t.heat+'%';ui.heat.style.background=t.locked?'#e66c3c':'#dca14f';const weapon=document.getElementById('portrait-weapon');if(weapon)weapon.textContent='TURRET · CONTINUOUS FIRE';}else if(near?.kind==='turret')ui.context.textContent='HOLD '+interact+' · OPERATE TURRET · '+fire+' TO FIRE';}



function drawInteractables(){if(!run)return;for(const z of run.roofSmokerPerches||[])if(z.spawned){rect(z.x-65,z.y,130,14,'#3c514b');rect(z.x-67,z.y-4,134,5,'#8f9a83');line(z.x-50,z.y+14,z.x-50,z.y+85,'#233832',6);line(z.x+50,z.y+14,z.x+50,z.y+85,'#233832',6);}drawDefibrillatorWorld();drawFortifications();for(const zone of run.zones){if(zone.stress>20){rect(zone.x,416,zone.end-zone.x,3,zone.warning?'#dd805b':'#8d9a67');if(zone.warning){ctx.fillStyle='#edac75';ctx.font='bold 12px monospace';ctx.fillText(`SERVICE BREACH ${zone.warning.toFixed(1)}s`,zone.x+70,320)}}}



for(const x of(run.map==='no-mercy'?[]:[925,3070])){line(x-10,420,x-10,660,'#8c9c85',3);line(x+10,420,x+10,660,'#8c9c85',3);for(let y=435;y<660;y+=20)line(x-10,y,x+10,y,'#768a73',3);ctx.fillStyle='#becb8a';ctx.font='9px monospace';ctx.fillText('E / X Â· LADDER',x-40,690)}



for(const g of run.gates){rect(g.x-12,413,24,7,'#c6bf75');if(g.hp>0){rect(g.x-5,345,10,75,'#7d8b77');if(!g.open){for(let y=354;y<410;y+=16)line(g.x-16,y,g.x+16,y,'#858e75',7);rect(g.x-16,337,32*(g.hp/120),3,'#cbd887')}else line(g.x,370,g.x+35,350,'#697969',5)}else{ctx.fillStyle='#a9b67b';ctx.font='10px monospace';ctx.fillText('Q / â†‘ Â· GATE: 2 SCRAP',g.x-65,327)}}



for(const b of run.laserBoxes)if(!b.hidden)drawLaserBox(b.x,b.y);for(const w of run.weaponPickups){if(w.used)continue;if(w.weapon==='deagle'){drawDeagle(ctx,w.x+16,w.y-18,1);ctx.fillStyle='#e9dfb5';ctx.font='10px monospace';ctx.fillText('DESERT EAGLE'+(mobileMode?'':' · E'),w.x-48,w.y-40);continue;}rect(w.x-25,w.y-23,46,6,'#788482');rect(w.x-15,w.y-17,9,10,'#515d56');rect(w.x+18,w.y-22,15,3,'#a7b5a7');line(w.x-24,w.y-19,w.x-32,w.y-13,'#55695d',5);ctx.fillStyle='#ccd89b';ctx.font='10px monospace';ctx.fillText(DW.WEAPONS[w.weapon].name.toUpperCase()+(mobileMode?'':' Â· E'),w.x-48,w.y-40);}for(const g of run.grenadePickups){if(g.used)continue;drawPipeBomb(g.x,g.y-18,true,.3);ctx.fillStyle='#e3ca90';ctx.font='10px monospace';ctx.fillText(mobileMode?'PIPE BOMB':'PIPE BOMB Â· E',g.x-36,g.y-48);}for(const b of run.pipeBombs){drawPipeBomb(b.x,b.y-10,b.flash>0,b.grounded?.45:time*5);ctx.fillStyle='#ffab8c';ctx.font='bold 11px monospace';ctx.fillText(`${Math.max(0,b.fuse).toFixed(1)}s`,b.x-12,b.y-38);}



for(const pile of run.ammoPiles){drawAmmoSupply(pile.x,pile.y);}



for(const c of run.caches){rect(c.x-20,c.y-28,40,28,c.used?'#3b4c43':'#6a7a62');line(c.x-16,c.y-15,c.x+16,c.y-15,'#a9b68c',2);if(!c.used){rect(c.x-3,c.y-24,6,18,'#d7db91');rect(c.x-9,c.y-18,18,5,'#d7db91');ctx.fillStyle='#cad693';ctx.font='10px monospace';ctx.fillText('SUPPLIES',c.x-23,c.y-38)}}



for(const c of run.cells){if(c.done||c.carrier)continue;rect(c.x-13,c.y-25,26,25,'#516963');rect(c.x-9,c.y-21,18,4,'#d4de8b');rect(c.x-7,c.y-31,14,5,'#819c85');ctx.fillStyle='#d5df91';ctx.font='10px monospace';ctx.fillText('POWER CELL',c.x-30,c.y-40)}



if(run.map!=='no-mercy'){rect(3430,602,210,47,'#556b61');rect(3460,565,100,37,'#63766a');rect(3470,570,38,25,'#203c3c');rect(3515,570,35,25,'#203c3c');ellipse(3470,650,17,17,'#162826');ellipse(3600,650,17,17,'#162826');rect(3635,614,7,7,'#d9d89a');ctx.fillStyle='#d3de90';ctx.font='bold 12px monospace';ctx.fillText(`EXTRACTION Â· ${run.delivered}/3`,3460,550);}if(run.lure){const x=run.lure.x,y=floorAt(x)-20;ellipse(x,y,8,11,'#dec78c');ctx.strokeStyle='#ccb97655';ctx.beginPath();ctx.arc(x,y,20+Math.sin(time*8)*6,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#e1cf90';ctx.font='9px monospace';ctx.fillText('BELL',x-12,y-22)}}



function drawMercyLevel(){if(run?.level==='rooftop'){DeadwalkEnvironment.rooftopLevel(ctx,{run,left:camera,right:camera+W/viewZoom,time});return;}



  function label(text,x,y,color='#d6d1af',size=12){ctx.fillStyle=color;ctx.font=`bold ${size}px monospace`;ctx.fillText(text,x,y);}



  function brick(x,y,w,h,color='#483a36'){DeadwalkEnvironment.surface(ctx,'brick',x,y,w,h);}



  function window(x,y){if(DeadwalkEnvironment.windowDetail(ctx,x,y))return;rect(x,y,40,66,'#101d22');DeadwalkEnvironment.surface(ctx,'glass',x+3,y+3,34,60);if((Math.floor(x/110)+Math.floor(y/100))%5===0){line(x+5,y+12,x+33,y+49,'#777463',5);line(x+4,y+15,x+33,y+52,'#2e372e',1);}else if(Math.floor(x)%7<2){line(x+7,y+6,x+18,y+29,'#a5b8ac55',1);line(x+18,y+29,x+8,y+43,'#a5b8ac55',1);}line(x+20,y,x+20,y+66,'#61716d',2);line(x,y+31,x+40,y+31,'#61716d',2);}



  // Apartment building shown as a cutaway, with both stair flights and a broken room.



  brick(0,-60,1940,280);rect(0,220,620,14,'#788079');DeadwalkEnvironment.surface(ctx,'concrete',0,234,620,700);



  for(let x=40;x<580;x+=140){rect(x,190,100,30,'#394549');rect(x+12,178,76,12,'#89918a');line(x+20,180,x+20,167,'#89918a',5);}



  rect(370,102,120,118,'#343538');rect(363,95,134,9,'#777a72');rect(412,128,53,92,'#161f23');rect(417,133,43,87,'#454634');ellipse(398,119,7,4,'#ffe6a1');



  label('SOS',70,202,'#979c8b',32);label('APARTMENTS â†’',400,83);rail(0,355,220,true);



  DeadwalkEnvironment.surface(ctx,'concrete',620,70,1320,620);for(let x=650;x<1900;x+=180){window(x,125);window(x,367);}



  for(const [start,top] of [[620,220],[1260,340]]){drawSlope(start,top,start+320,top+120);label('SLOPE',start+30,top-85);}



  rect(940,340,320,14,'#75796e');rect(1580,460,360,14,'#75796e');rect(1000,287,85,53,'#655c4e');rect(1010,278,65,14,'#84765f');rect(1630,414,105,46,'#65584c');rect(1730,396,62,64,'#535a51');label('DROP THROUGH FLOOR â†“',1735,370,'#d6b583');



  // Jagged edge and exposed joists make the drop clearly one way.



  for(let x=1880;x<1940;x+=15){line(x,470,x+12,494,'#aaa18c',4);}DeadwalkEnvironment.surface(ctx,'asphalt',1940,660,680,400);brick(1940,220,660,440,'#3b3331');for(let x=2010;x<2550;x+=170)window(x,330);



  rect(2060,602,110,58,'#35514a');rect(2050,596,130,9,'#627468');rect(2320,610,78,50,'#574c3c');for(let i=0;i<9;i++)rect(2200+i*25,651,10,4,'#96988a');line(2470,265,2470,635,'#758079',4);label('ALLEY â†’',2160,545);



  // Hotel intersection, discount shop, green awning, wrecked cars and overhead cables.



  brick(2600,230,880,430,'#563b34');for(let x=2640;x<3420;x+=110){window(x,262);window(x,350);}rect(2690,500,240,160,'#19262b');rect(2705,514,210,101,'#57716b');line(2810,515,2810,615,'#94948a',3);rect(2670,486,280,14,'#33574e');ctx.fillStyle='#3c6556';ctx.beginPath();ctx.moveTo(2690,447);ctx.lineTo(2925,447);ctx.lineTo(2970,486);ctx.lineTo(2655,486);ctx.fill();rect(2730,420,170,22,'#c4bea5');label('DISCOUNT',2747,436,'#443e36',17);



  rect(3180,340,64,210,'#181b21');for(const [i,t] of [...'HOTEL'].entries())label(t,3200,374+i*33,'#ed7058',27);



  DeadwalkEnvironment.surface(ctx,'asphalt',2600,660,880,400);for(let x=2640;x<3420;x+=140)rect(x,694,73,4,'#a99859');



  for(let i=0;i<3;i++){ctx.strokeStyle='#11191e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-15+i*9);ctx.quadraticCurveTo(2300,190+i*10,3480,210+i*9);ctx.stroke();}



  brick(3480,230,world.surfaceEnd-3480,430,'#493b35');DeadwalkEnvironment.surface(ctx,'asphalt',3480,660,world.surfaceEnd-3480,400);for(let x=Math.max(3520,3520+Math.floor((camera-3520-150)/130)*130);x<Math.min(world.surfaceEnd-30,camera+W/viewZoom+150);x+=130){window(x,280);window(x,380);rect(x,694,73,4,'#a99859');}label('ABANDONED CITY / HOSPITAL ROUTE',3720,560,'#cbd2bb',14);



  if(run){DeadwalkEnvironment.landmarks(ctx,{run,left:camera,right:camera+W/viewZoom,time});drawCheckpointRooms();drawStoryProps();DeadwalkEnvironment.sewer(ctx,{run,left:camera,right:camera+W/viewZoom,time});DeadwalkEnvironment.hospitalInterior(ctx,{run,left:camera,right:camera+W/viewZoom,time});DeadwalkEnvironment.hospitalRooftop(ctx,{run,left:camera,right:camera+W/viewZoom,time});DeadwalkEnvironment.streetDetail(ctx,{left:camera,right:camera+W/viewZoom,time,floor:x=>run.floor(x)});DeadwalkEnvironment.decorate(ctx,{left:camera,right:camera+W/viewZoom,time,floor:x=>run.floor(x)});}

  for(const car of run?.cars||[]){drawCarSprite(car);if(car.isAlarm){const flash=car.alarm>0&&Math.floor(run.time*5)%2===0;if(flash){rect(car.x+5,car.y-35,9,8,'#f35435');rect(car.x+113,car.y-35,9,8,'#fff0ab');}if(!car.flying)label(car.triggered?(car.alarm>0?'ALARM! HORDE INCOMING':'ALARM DISABLED'):'ALARM CAR · DO NOT SHOOT',car.x-20,car.y-75,car.alarm>0?'#efad6e':'#c4b577',10);}}



  drawRouteBarricade();drawSewerHatch();



  // Rain and scattered papers unify the rooftop and outdoor stretch.



  for(let i=0;i<75;i++){const x=camera+(i*97+time*28)%(W/viewZoom+180)-90,y=(i*43+time*290)%820;if(x<620||x>1940&&x<world.surfaceEnd&&!(x>=DW.SEWER.entry&&x<DW.SEWER.exit))line(x,y,x-4,y+14,'#8eaaa322',1);}



}





function visibleFireBarrels(){return run?.map==='no-mercy'?DW.FIRE_BARRELS.filter(b=>b.x>camera-180&&b.x<camera+W/viewZoom+180):[];}

function drawFireBarrel(b){DeadwalkEnvironment.heatShimmer(ctx,b,time);const fire=DeadwalkEnvironment.fireProfile(b,time);ctx.save();ctx.translate(b.x,b.y);ellipse(2,1,19,3,'#07101150');const metal=ctx.createLinearGradient(-15,0,15,0);metal.addColorStop(0,'#242725');metal.addColorStop(.3,['#66624c','#6e5139','#4f5c55','#735b47'][fire.variant]);metal.addColorStop(.7,'#49382b');metal.addColorStop(1,'#232722');ctx.fillStyle=metal;ctx.fillRect(-14,-39,28,37);ellipse(0,-2,14,3,'#39352b');for(let i=0;i<45;i++){const x=((i*17+7)%27)-13,y=-35+(i*13%30);rect(x,y,1+i%2,1+i%3,i%3?'#8d482d88':'#1b211f88');}for(const y of [-29,-12]){rect(-15,y,30,3,'#222b28');line(-14,y,13,y,'#82765b',1);}ellipse(0,-39,15,4,'#282521');ellipse(0,-39,12,2.8,'#ed9d32');const interior=ctx.createLinearGradient(0,-38,0,-23);interior.addColorStop(0,'#ec8c3860');interior.addColorStop(1,'#de663000');ctx.fillStyle=interior;ctx.fillRect(-11,-38,22,15);for(let i=0;i<5;i++){const x=-10+i*5,sway=(Math.sin(time*3.7+b.phase*5+i)*3+fire.noise*2),height=(14+Math.sin(time*(5.1+i*.21)+b.phase+i*2)*5+(i===2?9:0))*fire.size;ctx.beginPath();ctx.moveTo(x-4,-39);ctx.quadraticCurveTo(x-6+sway,-49,x+sway,-39-height);ctx.quadraticCurveTo(x+1+sway,-47,x+5,-39);const flame=ctx.createLinearGradient(0,-39-height,0,-39);flame.addColorStop(0,'#dc592aaa');flame.addColorStop(.5,'#ff9828ee');flame.addColorStop(1,'#ffe4a2');ctx.fillStyle=flame;ctx.fill();}ellipse(0,-39,14,2,'#261c1688');for(let i=0;i<5;i++){const progress=(time*.24+b.phase+i*.23)%1;ellipse(Math.sin(time+b.phase+i)*7,-58-progress*35,7+progress*9,5+progress*6,`rgba(87,86,78,${(1-progress)*.13})`);}for(let i=0;i<3;i++){const rise=(time*18+b.phase*9+i*13)%32;rect(Math.sin(time*2+i+b.phase)*9,-44-rise,1,1,'#ffcb7970');}ctx.restore();}



function drawSlope(start,top,end,bottom){ctx.save();ctx.beginPath();ctx.moveTo(start,top);ctx.lineTo(end,bottom);ctx.lineTo(end,Math.max(top,bottom)+18);ctx.lineTo(start,Math.max(top,bottom)+18);ctx.closePath();ctx.clip();DeadwalkEnvironment.surface(ctx,'concrete',start,Math.min(top,bottom),end-start,Math.abs(bottom-top)+20);ctx.restore();line(start,top,end,bottom,'#959788',4);line(start,top-62,end,bottom-62,'#798782',3);for(let x=start;x<=end;x+=80){const y=top+(bottom-top)*(x-start)/(end-start);line(x,y-62,x,y,'#4b5b55',3);}}

function drawDarkness(){if(!run||run.lift.escapeScene)return;DeadwalkLighting.render(ctx,{run,time,width:W,height:H,dpr,zoom:viewZoom,left:camera,right:camera+W/viewZoom,offset:verticalOffset()});}



function drawAimCrosshair(){if(run?.lift.escapeScene)return;if(state!=='playing'||!player||player.dead||player.grab||player.sewerClimbing||voiceMenuActor)return;let x=mouse.x,y=mouse.y;if(activePad&&controllerSettings.mode==='player'&&controllerAimActive||mobileMode&&touchInput.angle!==null){const origin=DW.weaponOrigin(player);x=(origin.x+Math.cos(origin.angle)*180-camera)*viewZoom;y=(origin.y+Math.sin(origin.angle)*180)*viewZoom+verticalOffset();}ctx.save();ctx.globalAlpha=player.weaponLasers?.[player.weapon]?.25:.45;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])line(x+dx*3,y+dy*3,x+dx*6,y+dy*6,'#dbe4a2',1);ctx.restore();}



function drawLiftScene(){const l=run.lift;ctx.fillStyle='#091715';ctx.fillRect(0,0,W,H);const cw=Math.min(640,W-40),cx=(W-cw)/2,top=220,bottom=H-180,ch=Math.max(160,bottom-top);DeadwalkEnvironment.liftCabin(ctx,cx,top,cw,ch);DeadwalkEnvironment.liftFloorDisplay(ctx,l,W/2-40,top+ch*.15,80,42,run.time);ctx.fillStyle='#dbe4c7';ctx.font='12px monospace';ctx.textAlign='center';ctx.fillText(l.phase==='riding'?'↑ ROOFTOP':l.phase==='roofOpening'?'FLOOR 24 / ROOFTOP':'FLOOR 1',W/2,top+ch*.15-9);const team=run.players.filter(p=>!p.dead),survivorScale=Math.min(ch*.74/80,cw/190),spacing=cw*.27;team.forEach((p,i)=>{ctx.save();ctx.translate(l.phase==='riding'?W/2+(p.x-l.x)*survivorScale:W/2+(i-(team.length-1)/2)*spacing,bottom-12+(l.phase==='riding'?(p.y-660)*survivorScale:0));ctx.scale(survivorScale,survivorScale);realisticCharacter(0,0,{...p,weapon:p.weapon==='pipebomb'?'pistol':p.weapon,hideName:true,healthHeld:false,healthUseTime:0,mountedTurret:0,sewerClimbing:false,shoveAnim:l.phase==='riding'?p.shoveAnim:0,angle:l.phase==='riding'?p.angle:.25,facing:l.phase==='riding'?p.facing:1,moving:l.phase==='riding'?p.moving:false});ctx.restore();});if(l.phase==='riding'){const hx=W/2,hy=top+5;ctx.fillStyle=l.hatchOpenUntil>run.time?'#081810':'#4a5945';ctx.fillRect(hx-38,hy,76,22);ctx.strokeStyle='#c6cfb1';ctx.strokeRect(hx-38,hy,76,22);ctx.save();ctx.beginPath();ctx.rect(cx,top,cw,ch);ctx.clip();for(const z of run.zombies){ctx.save();ctx.translate(W/2+(z.x-l.x)*survivorScale,bottom-12+(z.y-660)*survivorScale);ctx.scale(survivorScale,survivorScale);ctx.translate(-z.x,-z.y);realisticCharacter(z.x,z.y,{...z,hideName:true});ctx.restore();}for(const b of run.bullets)line(W/2+(b.px-l.x)*survivorScale,bottom-12+(b.py-660)*survivorScale,W/2+(b.x-l.x)*survivorScale,bottom-12+(b.y-660)*survivorScale,'#fff2b9',2);ctx.restore();}if(l.phase==='closing'||l.phase==='roofOpening'){ctx.save();ctx.beginPath();ctx.rect(cx,top,cw,ch);ctx.clip();const cover=1-l.doorProgress;ctx.fillStyle='#8e9b82';ctx.fillRect(cx,top,cw/2*cover,ch);ctx.fillRect(cx+cw-cw/2*cover,top,cw/2*cover,ch);ctx.restore();}ctx.fillStyle='#dbe4c7';ctx.font='bold 16px monospace';ctx.fillText(l.phase==='riding'?'Going up to the rooftop…':l.phase==='roofOpening'?'Rooftop reached':'The team is entering the lift',W/2,bottom+42);ctx.textAlign='left';}



function draw(){document.body.classList.toggle('secret-room-active',!!run?.secretVisit);ctx.setTransform(dpr,0,0,dpr,0,0);if(run?.secretVisit){drawFrogRoom();return;}const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#111d23');sky.addColorStop(.7,'#34423b');sky.addColorStop(1,'#171f20');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);



// Distant industrial skyline moves slower than the playable catwalk.



ctx.save();ctx.translate(-camera*.22,verticalOffset()*.35);for(let i=0;i<24;i++){const x=i*240,y=250+(i*37%100);rect(x,y,190,450,'#1b2b2b');rect(x+25,y-30,60,30,'#1b2b2b');for(let j=0;j<4;j++)rect(x+20+j*40,y+35,15,4,j%3===0?'#697365':'#35443e');line(x+150,y,x+150,y-85,'#243637',4)}ctx.restore();

if(run?.map==='no-mercy')DeadwalkEnvironment.skyline(ctx,{camera,offset:verticalOffset(),width:W,height:H,time});



ctx.save();ctx.translate((Math.random()-.5)*shake,verticalOffset()+(Math.random()-.5)*shake);ctx.scale(viewZoom,viewZoom);ctx.translate(-camera,0);



if(run?.map==='no-mercy'||!run){ctx.beginPath();ctx.rect(run?.level==='rooftop'?14800:0,-1000,run?.level==='rooftop'?3400:world.end,3000);ctx.clip();drawMercyLevel();}else{rect(1030,90,1900,330,'#273333');rect(1030,90,1900,12,'#516056');for(let x=1050;x<2910;x+=120){rect(x,116,4,290,'#35423e');rect(x+19,158,70,99,'#1a292c');rect(x+23,162,62,91,'#293b3b');line(x+54,162,x+54,253,'#44504a',3);line(x+23,206,x+85,206,'#44504a',3);rect(x+24,291,64,83,'#202e2e')}



rect(1780,302,125,118,'#1b292a');rect(1780,302,125,4,'#79856a');rect(1868,356,6,4,'#c9ca8a');ctx.fillStyle='#75806c';ctx.font='12px monospace';ctx.fillText('SECTOR 04 / STORAGE',1510,283);



rail(900,3100,world.deck,true);drawSlope(420,660,900,420);



rect(900,420,2200,14,'#8a927b');rect(900,434,2200,22,'#35483a');for(let x=930;x<3100;x+=160){rect(x,456,12,204,'#3c4d3e');line(x,458,x+140,650,'#3a4b3e',7);line(x+140,458,x,650,'#3a4b3e',7)}



rect(0,660,4200,300,'#202a25');rect(0,660,4200,7,'#5c6a56');for(let x=0;x<4200;x+=67)rect(x,680+(x%43),27,2,'#2a372d');rect(3200,600,90,60,'#465342');rect(3220,603,4,57,'#768063');rect(3430,578,95,82,'#33433a');



ctx.fillStyle='#d7d785';ctx.font='bold 13px monospace';ctx.fillText('DROP â†“',2980,403);for(let x=2970;x<3100;x+=18){ctx.fillStyle=(Math.floor(x/18)%2)?'#d2ce79':'#354238';ctx.beginPath();ctx.moveTo(x,420);ctx.lineTo(x+9,420);ctx.lineTo(x-1,434);ctx.lineTo(x-10,434);ctx.fill()}



}



if(run)DeadwalkEnvironment.contacts(ctx,{run,left:camera,right:camera+W/viewZoom});for(const b of visibleFireBarrels())drawFireBarrel(b);drawInteractables();if(run)for(const h of run.healthPickups)if(!h.used){drawHealthIcon(h.x,h.y-13,h.kind,1);ctx.fillStyle='#d5d2a1';ctx.font='9px monospace';ctx.fillText((h.kind==='kit'?'HEALTH KIT':h.kind.toUpperCase())+(mobileMode?'':' Â· E'),h.x-30,h.y-32);}for(const z of zombies){if(z.tongue){const victim=run.players.find(p=>p.grab===z.id),end=victim?{x:victim.x,y:victim.y-38}:z.tongue;line(z.x,z.y-55,end.x,end.y,'#d69796',4);}if(z.role==='smoker'){ellipse(z.x-12,z.y-65,12+Math.sin(time*4)*3,9,'#a2b48c33');}}const visible=zombies.filter(z=>z.x>camera-60&&z.x<camera+W/viewZoom+60&&(!portraitMode()||z.y*viewZoom+verticalOffset()>-30&&(z.y-(z.role==='tank'?200:100))*viewZoom+verticalOffset()<H+50)).sort((a,b)=>a.y-b.y);if(run)for(const p of run.players)if(p.down||p.grab)character(p.x,p.y,p);for(const z of visible)character(z.x,z.y,z);if(run){for(const p of run.players)if(!p.down&&!p.grab)character(p.x,p.y,p);}else{ctx.fillStyle='#849476';ctx.font='14px monospace';ctx.fillText('THE CATWALK',1000,396)}





// Foreground railing stays translucent so aiming remains readable.



if(run?.map!=='no-mercy'){ctx.globalAlpha=.25;rail(900,2960,world.deck,false);ctx.globalAlpha=1;}



if(run)DeadwalkEnvironment.foreground(ctx,{run,left:camera,right:camera+W/viewZoom});if(run)DeadwalkEnvironment.sewerWaterForeground(ctx,{run,left:camera,right:camera+W/viewZoom,time});for(const b of bullets)line(b.px,b.py,b.x,b.y,'#e9e6a1',2);let particleDrawn=0;for(const p of particles){if(portraitMode()&&(p.x<camera||p.x>camera+W/viewZoom||particleDrawn++>=110))continue;ctx.globalAlpha=clamp(p.life*2,0,1);rect(p.x,p.y,3,3,p.color)}ctx.globalAlpha=1;for(const c of casings)rect(c.x,c.y,4,2,'#c7ab68');ctx.restore();



if(run)for(const rock of run.tankRocks){ctx.save();ctx.translate((rock.x-camera)*viewZoom,rock.y*viewZoom+verticalOffset());ctx.scale(viewZoom,viewZoom);ctx.rotate(rock.spin);drawRockSprite();ctx.restore();}drawDarkness();drawSecretDoor();drawControlledGlow();drawWeaponLasers();if(player?.grab&&run.zombies.some(z=>z.id===player.grab&&z.role==='hunter')){ctx.fillStyle='#a6292928';ctx.fillRect(0,0,W,H);}if(player&&player.hurt>0){ctx.fillStyle='#bd54331c';ctx.fillRect(0,0,W,H)}if(player?.goo>0){ctx.fillStyle='#71932d33';ctx.fillRect(0,0,W,H);for(let i=0;i<12;i++)ellipse((i*193+79)%W,(i*127+41)%H,22+i%4*12,14+i%3*8,'#a9bf4a66');}if(['boarding','closing','riding','roofOpening'].includes(run?.lift.phase)){drawLiftScene();return;}if(state==='playing'){drawAimCrosshair();if(!portraitMode()){ctx.fillStyle='#a8b491';ctx.font='10px monospace';ctx.fillText(`${zombies.length} INFECTED Â· ${kills} ELIMINATED Â· ${heads} HEADSHOTS`,32,H-155)}}}







function frame(now){if(state!=='playing'&&voiceMenuActor)closeVoiceMenu(false);pollController();const elapsed=Math.min((now-last)/1000||0,.1);last=now;frameCount++;fpsClock+=elapsed;if(fpsClock>=1){fps=frameCount/fpsClock;frameCount=0;fpsClock=0}if(state==='playing'){accumulator+=elapsed;let steps=0;while(accumulator>=1/60&&steps++<6&&state==='playing'){update(1/60);accumulator-=1/60}}else accumulator=0;updateStoryPropAudio();draw();window.DeadwalkDev?.draw(ctx,{camera,zoom:viewZoom,width:W,height:H,offset:verticalOffset(),state});requestAnimationFrame(frame)}



requestAnimationFrame(frame);



















































































function drawDefibrillator(x,y,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);rect(-17,-21,34,38,'#af762d');rect(-12,-26,24,7,'#263d3c');rect(-12,-15,24,17,'#142d2c');line(-10,-6,-4,-6,'#74ffc0',1);line(-4,-6,0,-12,'#74ffc0',1);line(0,-12,3,-2,'#74ffc0',1);line(3,-2,6,-6,'#74ffc0',1);line(6,-6,10,-6,'#74ffc0',1);ellipse(9,10,4,4,'#ed853d');for(const dx of [-10,1]){rect(dx,5,9,24,'#bfc8c0');rect(dx+1,9,7,15,'#19312f');rect(dx+2,6,5,3,'#efb057');}line(-7,28,-18,32,'#242d29',2);line(5,28,16,32,'#be443a',2);ctx.restore();}

function drawDefibrillatorWorld(){for(const d of run.defibrillatorPickups){if(d.used)continue;rect(d.x-31,d.y-104,62,87,'#31453e');rect(d.x-28,d.y-101,56,5,'#e2d9a2');drawDefibrillator(d.x,d.y-64,.95);ctx.fillStyle='#abf2c3';ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillText('DEFIBRILLATOR',d.x,d.y-88);ctx.fillText('USE · TAKE',d.x,d.y-21);ctx.textAlign='left';}const shock=run.defibShock;if(shock?.left>0){ctx.save();ctx.globalAlpha=shock.left/.55;ctx.shadowColor='#a5efff';ctx.shadowBlur=18;ellipse(shock.x,shock.y-25,45,25,'#8ce5ff44');for(let i=0;i<5;i++){const a=i*Math.PI*2/5+time*10,sx=shock.x+Math.cos(a)*8,sy=shock.y-25+Math.sin(a)*6;line(sx,sy,sx+Math.cos(a)*18,sy+Math.sin(a)*15,'#efffff',3);line(sx+Math.cos(a)*18,sy+Math.sin(a)*15,sx+Math.cos(a+.35)*38,sy+Math.sin(a+.35)*28,'#8ae7ff',2);}ctx.restore();}}

function drawDefibrillatorAction(x,y,a){if(a.defibTarget){const target=run.players.find(p=>p.id===a.defibTarget),face=target.x>=x?1:-1;drawDefibrillator(x-face*12,y-22,.65);for(const dx of [-9,9]){const hx=target.x+dx,hy=target.y-18;limb(x+face*3,y-38,x+face*15,y-28,hx,hy,a.id===2?'#ac4b48':'#889276',5);rect(hx-6,hy-4,12,7,'#c7d4ca');rect(hx-4,hy-8,8,4,'#263c3b');line(x-face*12,y-17,hx,hy,'#bf5c3e',1);}rect(x-24,y-78,48,4,'#152927');rect(x-24,y-78,48*Math.min(1,a.defibTime/3),4,'#88e7df');}else if(a.defibrillators>0&&!a.dead){drawDefibrillator(x-18,y-43,.4);}}

let defibrillatorAudio=null;

function playDefibrillatorSound(event){if(defibrillatorAudio){defibrillatorAudio.pause();defibrillatorAudio=null;}if(event.type==='defibCancel'||!sound)return;const clip=new Audio(event.type==='defibCharge'?'game_sounds/weapons/defibrillator/defibrillator_use_start.wav':'game_sounds/weapons/defibrillator/defibrillator_use.wav');defibrillatorAudio=clip;clip.volume=.8;clip.onended=()=>{if(defibrillatorAudio===clip)defibrillatorAudio=null;};clip.play().catch(()=>{if(defibrillatorAudio===clip)defibrillatorAudio=null;});}

function drawHealthIcon(x,y,kind,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);if(kind==='pills'){rect(-7,-10,14,23,'#bfc7bf');rect(-8,-15,16,6,'#d7ddd3');for(let i=-6;i<8;i+=3)line(i,-15,i,-10,'#818b83');rect(-6,-6,12,6,'#d0d346');rect(-6,0,12,9,'#27557a');rect(-5,6,10,2,'#b5433b');line(-5,-8,-5,10,'#f4f1dc',1);}else if(kind==='kit'){rect(-14,-10,28,22,'#8b302e');rect(-10,-13,20,3,'#333d37');rect(-9,-5,18,13,'#c3c7b5');rect(-2,-4,4,11,'#a23c36');rect(-6,0,12,4,'#a23c36');line(-12,-8,12,-8,'#c25145');}else{ctx.rotate(-.5);rect(-4,-14,8,25,'#aeb7af');rect(-3,-11,6,9,'#648774');rect(-4,3,8,7,'#d9a139');rect(-3,11,6,5,'#d9a139');line(0,-14,0,-20,'#d5d8d3',1);}ctx.restore();}



function character(x,y,a){if(a.ledgeHanging){ctx.save();ctx.translate(x,y);const side=a.ledgeEdge===15000?1:-1;ctx.scale(side,1);const skin='#c5b397',shirt=a.id===2?'#a84038':a.id===3?'#384b4a':'#516345';ellipse(0,-49,8,10,skin);line(0,-37,0,-15,shirt,17);line(-5,-14,-9,12,'#414f45',7);line(5,-14,8,13,'#414f45',7);line(-8,-36,-15,-58,shirt,6);line(-15,-58,4,-80,skin,5);line(8,-36,15,-58,shirt,6);line(15,-58,14,-80,skin,5);ellipse(4,-80,4,3,skin);ellipse(14,-80,4,3,skin);ctx.scale(side,1);ctx.fillStyle='#ffe4ab';ctx.font='bold 10px monospace';ctx.fillText('HELP! · '+a.name,-24,-95);ctx.restore();return;}characterBody(x,y,a);if(!a.role)drawDefibrillatorAction(x,y,a);if(a.role||a.defibTarget||a.dead||a.down||a.grab||!(a.healthHeld||a.healthUseTime))return;const kind=a.healthUseTime?a.healthUseKind:a.healthSelected,progress=a.healthUseTime?1-a.healthUseTime/a.healthUseDuration:0,face=DW.bodyPose(a).facing;let hx=x+face*18,hy=y-42;if(a.healthUseTime){if(kind==='pills')hy=y-42-Math.sin(progress*Math.PI)*20;else if(kind==='adrenaline'){hx=x+face*9;hy=y-22;}else{hx=x;hy=y-35;}}limb(x+face*2,y-53,x+face*13,y-39,hx,hy,a.id===2?'#ac4b48':'#889276',5);drawHealthIcon(hx,hy,kind,.8);if(a.healthUseTime){rect(x-20,y-83,40,3,'#151e19');rect(x-20,y-83,40*progress,3,'#b7d384');}}







const weaponHandlingAudio=new Set();



function stopWeaponHandlingSounds(){for(const clip of weaponHandlingAudio){clip.pause();clip.currentTime=0;}weaponHandlingAudio.clear();}



function weaponHandlingSound(event){if(event.weapon==='deagle')event={...event,weapon:'pistol'};if(!sound||typeof Audio==='undefined'||!['pistol','smg','rifle'].includes(event.weapon))return;const stage=event.type==='weaponDeploy'?'deploy':event.stage;if(!['deploy','clip_out','clip_in','clip_locked','slideback','slideforward'].includes(stage))return;const clip=new Audio('game_sounds/weapons/'+event.weapon+'/gunother/'+event.weapon+'_'+stage+'_1.wav'),local=event.player===player.id,distance=Math.abs(event.x-player.x);clip.volume=.4*(local?1:.38*Math.max(0,1-distance/1000));if(!clip.volume)return;weaponHandlingAudio.add(clip);clip.onended=()=>weaponHandlingAudio.delete(clip);clip.play().catch(()=>weaponHandlingAudio.delete(clip));}















function switchCharacter(){if(run?.secretVisit)return;closeVoiceMenu(false);if(!run||!['playing','paused'].includes(state)||run.players.length<2)return;let next=controlledIndex;for(let step=1;step<run.players.length;step++){const candidate=(controlledIndex+step)%run.players.length;if(!run.players[candidate].dead){next=candidate;break;}}if(next===controlledIndex)return;clearTouchInput();const previous=player,previousIndex=controlledIndex;if(controllerSettings.mode==='companion'&&padId!==null&&controllerIndex===next)controllerIndex=previousIndex;controlledIndex=next;player=run.players[next];player.ai=false;previous.ai=controllerSettings.mode!=='companion'||padId===null||controllerIndex!==previousIndex;for(const p of run.players)p.prev={};keys.clear();mouse.down=false;pendingFlashlightToggle=false;sync();run.message('You control '+player.name+'. '+previous.name+(previous.ai?' is controlled by AI.':' uses the controller.'));consumeEvents();}



document.getElementById('switch-character').onclick=switchCharacter;







function setupPortraitControls(){

 const host=document.getElementById('touch-controls'),shelf=document.createElement('div');shelf.id='portrait-shelf';shelf.className='portrait-only';shelf.innerHTML='<button id="portrait-weapon" data-touch="gun" aria-label="Switch weapon"></button><button id="portrait-health" aria-expanded="false" aria-controls="portrait-items">ITEMS</button><button data-touch="grenade" aria-label="Throw grenade">GRENADE</button>';host.append(shelf);

 const drawer=document.createElement('div');drawer.id='portrait-items';drawer.className='portrait-only';drawer.hidden=true;drawer.setAttribute('aria-label','Health and equipment');drawer.innerHTML='<button data-touch="kit">MEDKIT</button><button data-touch="pills">PILLS</button><button data-touch="adrenaline">ADRENALINE</button><button data-touch="light">FLASHLIGHT</button><button id="portrait-auto">AUTO HEALTH</button><button id="portrait-items-close">CLOSE</button>';host.append(drawer);const toggle=document.getElementById('portrait-health');toggle.onclick=()=>{drawer.hidden=!drawer.hidden;toggle.setAttribute('aria-expanded',String(!drawer.hidden));};drawer.onclick=()=>{drawer.hidden=true;toggle.setAttribute('aria-expanded','false');};document.getElementById('portrait-auto').onclick=()=>document.getElementById('auto-use-items').click();

 const reload=document.createElement('button');reload.dataset.touch='reload';reload.className='portrait-only portrait-reload';reload.textContent='RELOAD';host.append(reload);const threats=document.createElement('div');threats.id='portrait-threats';threats.className='portrait-only';host.append(threats);

}

function updatePortraitHud(){if(!portraitMode())return;document.getElementById('switch-character').textContent=player.name.toUpperCase()+' · SWITCH';for(const name of ['bill','zoey','chloe'])ui[name+'-state'].textContent=ui[name+'-state'].textContent.replace(/Â/g,'');const unavailable=player.down||player.dead||!!player.grab||player.healthUseTime>0;document.getElementById('portrait-weapon').textContent=player.weapon.toUpperCase()+' '+player.mag+' / '+player.reserve;document.getElementById('portrait-weapon').disabled=unavailable;document.getElementById('portrait-health').textContent='ITEMS · '+(player.medicine+player.healthItems.pills+player.healthItems.adrenaline);document.getElementById('portrait-items').querySelector('[data-touch=light]').textContent='LIGHT '+(player.flashlight?'ON':'OFF');document.getElementById('portrait-auto').textContent='AUTO HEALTH '+(autoUseItems?'ON':'OFF');const reload=document.querySelector('.portrait-reload');reload.hidden=unavailable||player.weapon==='pipebomb'||player.reload>0||player.mag>=DW.WEAPONS[player.weapon].magazine*.5;reload.disabled=unavailable;document.getElementById('portrait-threats').textContent=zombies.filter(z=>z.hp>0).length+' INFECTED'+(run.bossActive?' · TANK':run.hordeActive>0?' · HORDE':'')+'\n'+(run.map==='no-mercy'?DW.mercySection(player.x):'CATWALK');}



if(mobileMode){document.body.classList.add('mobile');setupPortraitControls();for(const [action,path] of [['jump','M15 3a3 3 0 1 1 0 6a3 3 0 0 1 0-6M11 11l5 3 5-2M16 14l-3 6-7 1M13 20l5 5M10 12l-5 5'],['shove','M8 17V8a2 2 0 0 1 4 0v7V5a2 2 0 0 1 4 0v10V7a2 2 0 0 1 4 0v10V11a2 2 0 0 1 4 0v9q0 7-8 7q-4 0-7-5l-5-7q-1-3 2-3l5 6']]){const icon=document.createElement('span');icon.className='portrait-glyph';icon.setAttribute('aria-hidden','true');icon.innerHTML='<svg viewBox="0 0 30 30" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="'+path+'"/></svg>';document.querySelector('.touch-actions [data-touch='+action+']').prepend(icon);}document.getElementById('mobile-pause').textContent='Ⅱ';if(portraitMode()){try{if(!localStorage.getItem('deadwalk-light-quality')){DeadwalkLighting.setQuality('medium');for(const select of document.querySelectorAll('[data-graphics=quality]'))select.value='medium';}}catch{}}



 for(const [id,mode] of [['move-stick','move'],['aim-stick','aim']]){const stick=document.getElementById(id),thumb=stick.querySelector('.stick-thumb');let active=null;



  function updateStick(e){const box=stick.getBoundingClientRect(),radius=box.width*.38,dx=e.clientX-(box.left+box.width/2),dy=e.clientY-(box.top+box.height/2),length=Math.hypot(dx,dy),factor=length>radius?radius/length:1;thumb.style.transform='translate(calc(-50% + '+dx*factor+'px),calc(-50% + '+dy*factor+'px))';if(mode==='move'){touchInput.move=Math.abs(dx)<radius*.15?0:clamp(dx/radius,-1,1);touchInput.ladderUse=portraitMode()&&dy<-radius*.65&&run?.context(player)?.kind==='ladder';}else{touchInput.fire=length>radius*.22;if(touchInput.fire){touchInput.angle=Math.atan2(dy,dx);const origin=DW.weaponOrigin(player,touchInput.angle);mouse.x=(origin.x+Math.cos(touchInput.angle)*250-camera)*viewZoom;mouse.y=(origin.y+Math.sin(touchInput.angle)*250)*viewZoom+verticalOffset();}}}



  stick.addEventListener('pointerdown',e=>{if(state!=='playing'||active!==null)return;e.preventDefault();initAudio();active=e.pointerId;stick.setPointerCapture(active);stick.classList.add('active');updateStick(e);});stick.addEventListener('pointermove',e=>{if(e.pointerId===active){e.preventDefault();updateStick(e);}});function release(e){if(e.pointerId!==active)return;active=null;stick.classList.remove('active');thumb.style.transform='translate(-50%,-50%)';if(mode==='move'){touchInput.move=0;touchInput.ladderUse=false;}else touchInput.fire=false;}for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,release);



 }



 for(const button of document.querySelectorAll('[data-touch]')){const action=button.dataset.touch;let pointer=null;button.addEventListener('pointerdown',e=>{if(state!=='playing'||pointer!==null)return;e.preventDefault();initAudio();pointer=e.pointerId;button.setPointerCapture(pointer);button.classList.add('held');if(['jump','sprint','shove','use','reload','heal','grenade'].includes(action)){touchInput[action]=true;if(action!=='sprint')touchPulses[action]=true;}else if(action==='crouch'){touchInput.crouch=!touchInput.crouch;button.setAttribute('aria-pressed',String(touchInput.crouch));}else if(action==='light')pendingFlashlightToggle=true;else if(action==='gun'){run.cycleWeapon(player,1);touchInput.fire=false;}else if(['pills','adrenaline','kit'].includes(action)){run.quickUseHealth(player,action);touchInput.fire=false;}else if(action==='pause')togglePause();else if(action==='mute'){sound=!sound;if(!sound){playDefibrillatorSound({type:'defibCancel'});stopGameOverSound();stopDialogue();stopPistolSounds();stopWitchCry();stopZoeyScream();}button.textContent=sound?'SOUND ON':'MUTED';}});function release(e){if(e.pointerId!==pointer)return;pointer=null;button.classList.remove('held');if(['jump','sprint','shove','use','reload','heal','grenade'].includes(action))touchInput[action]=false;}for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,release);}



 document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTouchInput();if(state==='playing')togglePause();}});



}







function drawStoryProps(){

 for(const j of run.jukeboxes){if(j.x<camera-100||j.x>camera+W/viewZoom+100)continue;ctx.save();ctx.translate(j.x,j.y);ctx.fillStyle='#392619';ctx.beginPath();ctx.moveTo(-36,0);ctx.lineTo(-36,-83);ctx.arc(0,-83,36,Math.PI,0);ctx.lineTo(36,0);ctx.closePath();ctx.fill();for(let i=0;i<8;i++)line(-29+i*8,-76,-29+i*8,-5,'#7e512c',2);ctx.strokeStyle=j.playing?'#ffcf61':'#c99545';ctx.lineWidth=7;ctx.shadowColor='#ff9a28';ctx.shadowBlur=j.playing?13:2;ctx.beginPath();ctx.moveTo(-29,-8);ctx.lineTo(-29,-82);ctx.arc(0,-82,29,Math.PI,0);ctx.lineTo(29,-8);ctx.stroke();ctx.shadowBlur=0;rect(-22,-85,44,26,'#121c1c');rect(-33,-62,66,20,'#62675e');for(let i=0;i<4;i++){rect(-28+i*15,-59,12,13,'#d2c9a0');line(-26+i*15,-55,-18+i*15,-55,'#79745b',1);}rect(-18,-37,36,29,'#192522');for(let i=-18;i<19;i+=9){line(i,-37,Math.min(i+25,18),-8,'#879181',1);line(i,-8,Math.min(i+25,18),-37,'#879181',1);}rect(-36,-6,72,6,'#74796c');ctx.fillStyle='#e4c67e';ctx.font='8px monospace';ctx.textAlign='center';ctx.fillText('JUKEBOX',0,-123);if(j.playing){ctx.fillStyle='#ffe19a';ctx.font='16px monospace';ctx.fillText('♪',43,-75-Math.sin(j.beat*4)*5);}ctx.restore();}

 const l=run.lift;if(!l.enabled||l.x<camera-150||l.x>camera+W/viewZoom+150)return;const x=l.x,y=l.y,p=l.doorProgress;rect(x-65,y-147,130,147,'#5e6c66');rect(x-56,y-132,112,132,'#121c20');rect(x-50,y-125,100,120,'#293537');line(x-44,y-110,x+44,y-110,'#6c786f',2);ctx.save();ctx.beginPath();ctx.rect(x-56,y-132,112,132);ctx.clip();for(const side of [-1,1]){const dx=side<0?x-55-p*55:x+p*55;const grad=ctx.createLinearGradient(dx,0,dx+55,0);grad.addColorStop(0,'#707d77');grad.addColorStop(.5,'#a6ada0');grad.addColorStop(1,'#596963');ctx.fillStyle=grad;ctx.fillRect(dx,y-131,55,128);line(dx+side*2+27,y-127,dx+side*2+27,y-8,'#c3c5ad30',1);}ctx.restore();rect(x-61,y-5,122,5,'#b0b4a2');rect(x+72,y-75,13,29,'#818b7c');rect(x+76,y-64,5,5,l.open?'#bcd397':'#cbb274');rect(x-22,y-165,44,15,'#162624');ctx.fillStyle='#d9c98c';ctx.font='10px monospace';ctx.textAlign='center';ctx.fillText('LIFT',x,y-154);ctx.textAlign='left';

}

function drawSewerHatch(){const h=run?.sewerHatch;if(!h||h.x<camera-200||h.x>camera+W/viewZoom+200)return;const x=h.x,y=h.y;ctx.save();ctx.fillStyle='#071114';ctx.beginPath();ctx.ellipse(x,y-1,55,12,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#959c8c';ctx.lineWidth=4;ctx.stroke();const lx=x+145*(h.slide*h.slide*(3-2*h.slide));ctx.shadowColor='#fff';ctx.shadowBlur=h.slide<1?18:7;ctx.strokeStyle=h.slide<1?'#fff':'#d8e1dc';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(h.slide<1?lx:x,y-3,52,11,0,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#5b6258';ctx.beginPath();ctx.ellipse(lx,y-4,48,9,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#879184';ctx.lineWidth=2;ctx.stroke();ctx.save();ctx.beginPath();ctx.ellipse(lx,y-4,45,8,0,0,Math.PI*2);ctx.clip();for(let i=-42;i<44;i+=7)line(lx+i,y-12,lx+i+12,y+4,'#25302d',2);for(let j=-9;j<9;j+=4)line(lx-48,y+j,lx+48,y+j,'#939789',1);ctx.restore();ctx.fillStyle='#d4d8c5';ctx.font='bold 7px monospace';ctx.textAlign='center';ctx.fillText('CITY SEWER',lx,y-3);ctx.font='bold 11px monospace';ctx.fillStyle='#f5f5e7';ctx.fillText(h.slide>=1?'DROP DOWN ↓':h.open?'OPENING SEWER…':'SEWER LID · INTERACT',x,y-32);ctx.restore();}

function drawRouteBarricade(){const b=run?.barricade||DW.BARRICADE;if(b.x<camera-200||b.x>camera+W/viewZoom+200)return;const x=b.x,y=b.y,top=y-b.h;DeadwalkEnvironment.surface(ctx,'metal',x,top,b.w,b.h);rect(x,top,b.w,b.h,'#403b34a0');for(let i=0;i<7;i++){const px=x+i*22;rect(px,top,9,b.h,'#677368');line(px+2,top+5,px+2,y-4,'#a1a28b',2);}for(let i=0;i<12;i++)line(x+10,top+15+i*36,x+b.w-12,top+15+i*36,'#7a523c',3);line(x+8,top+15,x+b.w-8,y-95,'#8b8970',14);line(x+b.w-8,top+15,x+8,y-95,'#8b8970',14);for(const px of [x-6,x+b.w-8]){rect(px,top-12,14,b.h+12,'#777c6e');for(let yy=top+12;yy<y;yy+=55)rect(px+4,yy,5,5,'#c0b89a');}DeadwalkEnvironment.surface(ctx,'concrete',x,y-85,b.w,85);for(let i=0;i<8;i++){rect(x+i*18,y-67,12,18,i%2?'#252b27':'#d8b356');}rect(x+5,y-271,b.w-10,53,'#252d27');rect(x+8,y-268,b.w-16,47,'#b89955');ctx.save();ctx.textAlign='center';ctx.fillStyle='#222c27';ctx.font='bold 16px monospace';ctx.fillText('ROAD CLOSED',x+b.w/2,y-245);ctx.font='bold 11px monospace';ctx.fillText('KEEP OUT',x+b.w/2,y-229);ctx.restore();line(x-8,top-13,x+b.w+8,top-13,'#3e4740',4);for(let i=0;i<9;i++){line(x+i*17,top-20,x+12+i*17,top-7,'#9b9e86',1);line(x+12+i*17,top-20,x+i*17,top-7,'#9b9e86',1);}}

function drawCheckpointRooms(){if(!run)return;for(const r of run.safeRooms){if(r.exit<camera-100||r.entry>camera+W/viewZoom+100)continue;DeadwalkEnvironment.surface(ctx,'concrete',r.entry,510,r.exit-r.entry,150);DeadwalkEnvironment.surface(ctx,'metal',r.entry+28,540,r.exit-r.entry-56,104);rect(r.entry,506,r.exit-r.entry,12,'#1b2b2c');line(r.entry+30,650,r.exit-30,650,'#819078',2);ctx.fillStyle='#c0b88e';ctx.font='bold 12px monospace';ctx.fillText('SAFE ROOM / CHECKPOINT '+r.id,r.entry+54,534);ctx.font='10px monospace';ctx.fillText(r.secured?'CHECKPOINT SAVED / EXIT →':'TEAM INSIDE → CLOSE ENTRANCE',r.entry+42,571);drawSafeRoomDoor({x:r.entry,y:r.y,open:r.entryOpen,closed:r.secured&&!r.entryOpen});drawSafeRoomDoor({x:r.exit,y:r.y,open:r.exitOpen,closed:false});}}

function drawSafeRoomDoor(door){const x=door.x,y=door.y;rect(x-28,y-128,56,128,'#909891');rect(x-22,y-122,44,118,'#141e21');



 // The open leaf swings out beside its frame; it remains a visible red, reinforced door.



 ctx.save();ctx.translate(x-22,y);ctx.scale(door.open?-1:1,1);rect(0,-122,44,118,'#862f2b');ctx.save();ctx.globalAlpha=.23;DeadwalkEnvironment.surface(ctx,'metal',0,-122,44,118);ctx.restore();for(let i=0;i<14;i++)line(4+i*3,-14-i*7,9+i*3,-16-i*7,'#cac2a45c',1);line(3,-119,3,-5,'#b64b40',2);for(let at=-109;at<-55;at+=16)line(4,at,40,at,'#20252a',9);for(let at=7;at<42;at+=10)line(at,-111,at,-60,'#bcc1b6',3);for(let at=-46;at<0;at+=23)line(0,at,44,at,'#93998b',5);rect(5,-56,34,14,'#dbd3b9');ctx.fillStyle='#963a2e';ctx.font='bold 12px monospace';ctx.textAlign='left';ctx.fillText('EXIT',8,-45);rect(33,-36,4,13,'#c1baa4');for(let at=0;at<44;at+=11)rect(at,-122,7,8,'#d0b63f');ctx.restore();for(const at of [-100,-22])rect(x-26,y+at,6,12,'#bac0ad');ctx.save();ctx.fillStyle='#e1ce88';ctx.font='10px monospace';ctx.textAlign='left';ctx.fillText(door.closed?'SAFE ROOM SECURED':door.open?'DOOR OPEN Â· E / USE TO CLOSE':'SAFE ROOM Â· E / USE TO OPEN',x-100,y-147);ctx.restore();}





// A deliberately silly, optional hospital detour. Only the visitor leaves the corridor.

const secretHostArt=new Image();secretHostArt.src='assets/characters/secret-host.png';

const secretHostAngles=Object.fromEntries(['front','left','right'].map(angle=>{const img=new Image();img.src='assets/characters/secret-host-'+angle+'.png';return [angle,img];}));

const secretHostCrops=new Map();

function secretHostFrames(img){if(secretHostCrops.has(img))return secretHostCrops.get(img);const cw=img.naturalWidth/4,frames=Array.from({length:4},(_,i)=>[i*cw,0,cw,img.naturalHeight]);secretHostCrops.set(img,frames);return frames;}

function secretHostPose(elapsed){const phase=elapsed%12;let angle='front',x=.78,walking=false;if(phase<3){angle='left';x=.78-phase/3*.16;walking=true;}else if(phase<6)x=.62;else if(phase<9){angle='right';x=.62+(phase-6)/3*.16;walking=true;}const talking=!!secretReply&&elapsed%7<4;const frame=walking?[0,1,0,2][Math.floor(elapsed*5)%4]:talking?[0,3,0,2][Math.floor(elapsed*3)%4]:Math.floor(elapsed/2)%2?3:0;return {angle,x,frame,walking,talking};}

function drawSecretHost(left,roomW,floorY,height,elapsed){const pose=secretHostPose(elapsed),img=secretHostAngles[pose.angle];if(img?.complete&&img.naturalWidth){const source=secretHostFrames(img)[pose.frame],w=source[2]/source[3]*height;ctx.drawImage(img,...source,left+roomW*pose.x-w/2,floorY-height,w,height);}else if(secretHostArt.complete)ctx.drawImage(secretHostArt,left+roomW*.64,floorY-height,height*2/3,height);}



const secretBillClips=['game_sounds/player/survivor/voice/bill/cough06.wav','game_sounds/player/survivor/voice/bill/downinfront01.wav','game_sounds/player/survivor/voice/bill/generic33.wav','game_sounds/player/survivor/voice/bill/goingtodie20.wav','game_sounds/player/survivor/voice/bill/imwithyou02.wav','game_sounds/player/survivor/voice/bill/leadon02.wav','game_sounds/player/survivor/voice/bill/ledgehangend02.wav'];

const secretCutawayClips=['game_sounds/player/survivor/voice/bill/violenceawe06.wav','game_sounds/player/survivor/voice/bill/violenceawe07.wav','game_sounds/player/survivor/voice/bill/totherescue03.wav'];

const secretCapeArt=new Image();secretCapeArt.src='assets/characters/secret-host-cape.png';

const secretBattleArt=new Image();secretBattleArt.src='assets/characters/secret-host-battle.png';

const secretCapeMoreArt=new Image();secretCapeMoreArt.src='assets/characters/secret-host-cape-more.png';

const secretBillLaugh='game_sounds/player/survivor/voice/bill/laughter04.wav';

const secretReplies=['Welcome. The frog handles all appointments.','Yes, this is covered by your frog insurance.','You wanted the roof? This is the ribbit department.','Please stop coughing on the enchanted furniture.','The frog says you may leave whenever you ribbit.'];

let secretJokeClip=null,secretReply='';

function playSecretJoke(i,cutaway=false){secretReply=secretReplies[i%secretReplies.length];if(secretJokeClip)secretJokeClip.pause();if(!sound)return;secretJokeClip=new Audio(cutaway?(i%2===0?secretBillLaugh:secretCutawayClips[Math.floor(i/2)%3]):i%2===1?secretBillLaugh:secretBillClips[Math.floor(i/2)%secretBillClips.length]);secretJokeClip.volume=.7;secretJokeClip.play().catch(()=>{});}

function trySecretClick(x,y){if(state!=='playing'||player.ai)return false;if(run?.secretVisit){const rw=Math.min(760,W-40),left=(W-rw)/2,fx=left+rw*.39+57,fy=H-110-133;return Math.abs(x-fx)<32&&Math.abs(y-fy)<28&&run.exitFrogRoom(player);}const wx=x/viewZoom+camera,wy=(y-verticalOffset())/viewZoom;if(Math.abs(player.x-11290)>100||Math.abs(player.y-660)>60)return false;if(!run.secretDoorOpen&&wx>=11255&&wx<=11325&&wy>525&&wy<660){run.secretDoorOpen=true;run.events.push({type:'liftDoors',open:true,x:11290});return true;}if(run.secretDoorOpen&&Math.abs(wx-11290)<18&&Math.abs(wy-608)<18)return run.enterFrogRoom(player);return false;}

function drawFrog(x,y,size=1){ctx.save();ctx.translate(x,y);ctx.scale(size,size);ellipse(0,0,10,6,'#82ba55');ellipse(-6,-5,4,4,'#a8d878');ellipse(6,-5,4,4,'#a8d878');ellipse(-6,-6,1.5,2,'#122718');ellipse(6,-6,1.5,2,'#122718');line(-4,2,4,2,'#324a27',1);ellipse(-9,5,5,2,'#668e43');ellipse(9,5,5,2,'#668e43');ctx.restore();}

function drawSecretDoor(){if(!run||run.map!=='no-mercy'||run.level==='rooftop')return;ctx.save();ctx.translate(0,verticalOffset());ctx.scale(viewZoom,viewZoom);ctx.translate(-camera,0);if(run.secretDoorOpen){rect(11255,525,70,135,'#251c30');rect(11255,525,8,135,'#a58d56');rect(11266,620,48,5,'#a38963');rect(11270,625,4,35,'#63523c');rect(11305,625,4,35,'#63523c');ctx.shadowColor='#bbf397';ctx.shadowBlur=8;drawFrog(11290,611);ctx.shadowBlur=0;}ctx.restore();}

function drawFrogRoom(){if(run.secretVisit.cutaway){drawSecretDoorCutaway();return;}const v=run.secretVisit,p=run.players.find(p=>p.id===v.player),elapsed=v.elapsed,floorY=H-110,top=150,roomW=Math.min(760,W-40),left=(W-roomW)/2,ch=Math.max(180,floorY-top);ctx.fillStyle='#130f1a';ctx.fillRect(0,0,W,H);const wall=ctx.createLinearGradient(left,0,left+roomW,0);wall.addColorStop(0,'#44324b');wall.addColorStop(.5,'#302437');wall.addColorStop(1,'#47354d');ctx.fillStyle=wall;ctx.fillRect(left,top,roomW,ch);for(let x=left+30;x<left+roomW;x+=80){line(x,top,x,floorY,'#68506c',2);}rect(left,top-18,roomW,18,'#a29488');rect(left,floorY,roomW,55,'#9a8074');line(left,floorY,left+roomW,floorY,'#d3bb90',4);rect(left,top,8,ch,'#947e74');rect(left+roomW-8,top,8,ch,'#947e74');rect(left+25,top+32,90,140,'#100e1d');ellipse(left+70,top+68,20,20,'#d7d1e7');line(left+70,top+32,left+70,top+172,'#625466',4);line(left+25,top+102,left+115,top+102,'#625466',4);for(const x of [left+roomW*.55,left+roomW*.93]){rect(x,floorY-105,7,105,'#a18b61');ctx.shadowColor='#ffc879';ctx.shadowBlur=20;ellipse(x+3,floorY-112,4,10,'#ffc879');ctx.shadowBlur=0;}const tableX=left+roomW*.39;rect(tableX,floorY-115,115,10,'#ad8a5b');rect(tableX+10,floorY-105,8,105,'#67503b');rect(tableX+98,floorY-105,8,105,'#67503b');drawFrog(tableX+57,floorY-133,2.2);const billScale=Math.min(ch*.72/77,roomW*.48/90),hostH=77*billScale*1.22;if(v.combat){drawSecretBattleHost(left,roomW,floorY,hostH,v);}else if(elapsed>=12&&secretCapeArt.complete&&secretCapeArt.naturalWidth){const frame=Math.min(7,Math.floor((elapsed-12)/4.5)),atlas=frame>=4&&secretCapeMoreArt.complete&&secretCapeMoreArt.naturalWidth?secretCapeMoreArt:secretCapeArt,source=secretHostFrames(atlas)[frame%4],cw=source[2]/source[3]*hostH;ctx.drawImage(atlas,...source,left+roomW*.71-cw/2,floorY-hostH,cw,hostH);}else drawSecretHost(left,roomW,floorY,hostH,elapsed);ctx.save();ctx.translate(left+45+(p.x+520)/420*roomW*.36,floorY);if(v.burning)ctx.rotate(Math.sin(v.elapsed*18)*.025);ctx.scale(billScale,billScale);realisticCharacter(0,0,{...p,hideName:true,healthHeld:false});ctx.restore();ctx.fillStyle='#f3e4bd';ctx.textAlign='center';ctx.font='bold 20px monospace';drawSecretBattleEffects(left,roomW,floorY,ch,billScale,hostH,v,p);ctx.fillText(v.combat?'THE FROG WARNS: BAD IDEA':'THE RIBBIT DEPARTMENT',W/2,45);ctx.font='14px monospace';ctx.fillText('Click the frog or use it nearby to return to Room 102',W/2,120);ctx.fillText(v.combat?(v.host.dead?'The enchantress has been defeated.':p.dead?'The fire was fatal.':v.burning?'BILL IS ON FIRE!':'She is preparing a fire spell…'):secretReply||'The frog has accepted your appointment.',W/2,90);ctx.font='12px monospace';ctx.fillText('A / D to wander · SPACE to return to the hospital',W/2,H-28);ctx.textAlign='left';if(!v.cutaway&&!p.dead){line(mouse.x-6,mouse.y,mouse.x+6,mouse.y,'#e9edd5',1);line(mouse.x,mouse.y-6,mouse.x,mouse.y+6,'#e9edd5',1);}}



function drawSecretDoorCutaway(){ctx.fillStyle='#16221c';ctx.fillRect(0,0,W,H);const zoom=Math.min((H-230)/215,W/350),floorY=H-85;ctx.save();ctx.translate(W/2-11290*zoom,floorY-660*zoom);ctx.scale(zoom,zoom);DeadwalkEnvironment.hospitalInterior(ctx,{run,left:11120,right:11460,time:run.secretVisit.elapsed});drawSecretClearingWindow(11130,511,55,68);rect(11255,525,70,135,'#596953');rect(11270,543,35,51,'#24362e');drawSecretClearingWindow(11270,543,35,51);rect(11310,605,4,8,'#d2cbbc');rect(11268,624,48,5,'#a38963');rect(11272,629,4,31,'#63523c');rect(11306,629,4,31,'#63523c');drawFrog(11290,615,1.1);rect(11272,575,38,16,'#ece6c9');ctx.fillStyle='#314735';ctx.font='4px monospace';ctx.textAlign='center';ctx.fillText('FROG CONSULTATION',11291,582);ctx.fillText('PLEASE WAIT',11291,588);ctx.restore();ctx.textAlign='center';ctx.fillStyle='#e9e5c8';ctx.font='bold 20px monospace';ctx.fillText('ROOM 102',W/2,50);ctx.font='14px monospace';ctx.fillText('Bill seems to be enjoying the frog consultation.',W/2,82);ctx.font='12px monospace';ctx.fillText('SPACE · RETURN TO THE HOSPITAL',W/2,105);ctx.textAlign='left';}



function drawSecretClearingWindow(x,y,w,h){const t=Math.max(0,run.secretVisit.elapsed-48),clear=clamp((t-8)/20,0,1);ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();rect(x,y,w,h,'#392640');line(x,y+h-4,x+w,y+h-4,'#ac8c66',2);const img=secretHostAngles.front,frame=Math.floor(t*2)%4,source=img.complete&&img.naturalWidth?secretHostFrames(img)[frame]:null,hostH=h*.83;if(source){const sw=source[2]/source[3]*hostH;ctx.drawImage(img,...source,x+w*.68-sw/2,y+h-4-hostH,sw,hostH);}const visitor=run.players.find(p=>p.id===run.secretVisit.player);ctx.save();ctx.translate(x+w*.25,y+h-4);const scale=h*.65/77;ctx.scale(scale,scale);realisticCharacter(0,0,{...visitor,hideName:true,weapon:'pistol',moving:false,vx:0,angle:0,facing:1,healthHeld:false});ctx.restore();ctx.globalAlpha=1-clear;rect(x,y,w,h,'#b3b99d');line(x,y,x+w,y+h,'#d6dec7',2);ctx.globalAlpha=.12+.35*(1-clear);rect(x,y,w,h,'#a0b8ad');ctx.globalAlpha=1;line(x+w/2,y,x+w/2,y+h,'#718277',1.2);ctx.restore();}



function billMouthOpening(a){if(a.id!==1||a.role||a.dead||a.down||!sound||state!=='playing')return 0;const clips=[dialogueAudio,secretJokeClip,...infectedAudio];const clip=clips.find(c=>c&&!c.paused&&!c.ended&&c.readyState>=2&&/voice\/bill\//.test(c.src));if(!clip)return 0;const t=clip.currentTime;return Math.max(0,Math.abs(Math.sin(t*17)*Math.sin(t*7.3))-.12);}

function drawBillSpeakingFace(q,img,source,height,a,pose){const open=billMouthOpening(a);if(open<.03)return;const [sx,sy,sw,sh]=source,scale=height/sh,rifle=!a.sewerClimbing&&['rifle','smg'].includes(a.weapon),mouthX=rifle?625:640,mouthY=rifle?213:217,x=(mouthX-sx-sw/2)*scale,y=(mouthY-sy)*scale-height+pose.drop+pose.bob,jaw=3.5*open*scale;q.save();q.drawImage(img,mouthX-30,mouthY+7,42,29,x-30*scale,y+7*scale+jaw,42*scale,29*scale);q.fillStyle='#372622';q.beginPath();q.ellipse(x-3*scale,y+open*3*scale,12*scale,(1.5+open*6)*scale,-.08,0,Math.PI*2);q.fill();q.strokeStyle='#b28b79';q.lineWidth=1.6*scale;q.beginPath();q.ellipse(x-3*scale,y+open*3*scale,12*scale,(1.5+open*6)*scale,-.08,0,Math.PI);q.stroke();q.restore();}



function secretRoomLayout(){const rw=Math.min(760,W-40),left=(W-rw)/2,floor=H-110,ch=Math.max(180,floor-150),scale=Math.min(ch*.72/77,rw*.48/90),height=77*scale*1.22,v=run.secretVisit,p=run.players.find(p=>p.id===v.player),hx=!v.combat&&v.elapsed<12?secretHostPose(v.elapsed).x:.71;return {rw,left,floor,ch,scale,height,billX:left+45+(p.x+520)/420*rw*.36,hostX:left+rw*hx};}

function secretShotHits(x,y){const room=secretRoomLayout();return Math.abs(x-room.hostX)<room.height*.22&&y>room.floor-room.height&&y<room.floor;}



function drawSecretBattleHost(left,rw,floor,height,v){const frame=v.host.dead?3:v.host.hitFlash>0?0:1,img=secretBattleArt.complete&&secretBattleArt.naturalWidth?secretBattleArt:secretHostAngles.front,source=secretHostFrames(img)[frame],width=source[2]/source[3]*height,x=left+rw*.71-width/2;ctx.save();if(v.host.hitFlash>0){ctx.shadowColor='#db80fb';ctx.shadowBlur=12;}ctx.drawImage(img,...source,x,floor-height,width,height);ctx.shadowBlur=0;for(const mark of v.host.marks){const mx=left+rw*.71+mark.x*height,my=floor-height*(1-mark.y);line(mx-3,my-2,mx+3,my+2,'#292326',2);line(mx-2,my+2,mx+2,my+4,'#9b8150',1);}if(v.burning&&!v.host.dead){ctx.strokeStyle='#ffab42';ctx.shadowColor='#ff7626';ctx.shadowBlur=18;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(left+rw*.71,floor-height*.48,height*.24,height*.31,Math.sin(v.elapsed*2)*.15,0,Math.PI*2);ctx.stroke();}ctx.restore();}

function drawSecretBattleEffects(left,rw,floor,ch,scale,height,v,p){if(!v.combat&&!v.shotFlash)return;ctx.save();if(v.shotFlash>0){const bx=secretRoomLayout().billX,muzzle=DW.weaponOrigin(p,v.shotAngle??p.angle),mx=bx+(muzzle.x-p.x)*scale,my=floor+(muzzle.y-p.y)*scale,a=muzzle.angle;line(mx,my,mx+Math.cos(a)*W,my+Math.sin(a)*W,'#f6dc86',2);}if(v.burning){const bx=secretRoomLayout().billX;ctx.shadowColor='#ff7525';ctx.shadowBlur=22;ctx.strokeStyle='#ff9b4299';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(left+rw*.71,floor-height*.48);ctx.quadraticCurveTo(left+rw*.5,floor-height*.6,bx,floor-38*scale);ctx.stroke();for(let i=0;i<19;i++){const t=(v.elapsed*1.8+i*.173)%1,x=bx+Math.sin(i*2.4+v.elapsed*6)*13*scale,y=floor-t*70*scale;ctx.globalAlpha=(1-t)*.85;ellipse(x,y,(3+3*(1-t))*scale,(7+7*(1-t))*scale,i%2?'#ff6c18':'#ffd35e');}ctx.shadowBlur=0;}ctx.globalAlpha=1;ctx.textAlign='center';ctx.font='12px monospace';ctx.fillStyle='#e6d9c2';ctx.fillText(p.name+' HP '+Math.ceil(p.hp)+' · AMMO '+p.mag+' / '+p.reserve,W/2,67);if(v.combat){ctx.fillText('ENCHANTRESS '+Math.ceil(v.host.hp)+' / '+v.host.maxHp,W/2,140);rect(W/2-100,146,200,4,'#211b28');rect(W/2-100,146,200*v.host.hp/v.host.maxHp,4,'#b787d8');}ctx.restore();}


function drawAmmoSupply(x,y){ctx.save();ctx.translate(x,y);const box=(bx,by,w,h,color,label)=>{rect(bx,by,w,h,color);rect(bx,by,w,3,'#e6d5ae');rect(bx,by+h-3,w,3,'#0005');ctx.fillStyle='#302c23';ctx.font='bold 5px monospace';ctx.fillText(label,bx+3,by+9);};ctx.fillStyle='#0007';ctx.beginPath();ctx.ellipse(0,-2,48,5,0,0,Math.PI*2);ctx.fill();box(-38,-15,28,13,'#b5a17b','9MM');box(-8,-17,30,15,'#a44828','AMMO');box(17,-13,24,12,'#ad9b72','5.56');box(-22,-29,27,14,'#8b9dae','ROUNDS');rect(-11,-29,5,14,'#894338');box(3,-31,28,13,'#a9ac8c','BULLETS');rect(5,-27,24,6,'#2a332b');ctx.fillStyle='#d1c85f';ctx.font='bold 5px monospace';ctx.fillText('BULLETS',6,-22);for(let i=0;i<5;i++){const bx=-35+i*4;rect(bx,-5,3,5,'#b18a42');rect(bx,-7,3,2,'#ddd0a0');}for(let i=0;i<3;i++){rect(7+i*10,-5,8,4,'#8f3934');rect(13+i*10,-5,2,4,'#d2c4a4');}ctx.fillStyle='#e3db9b';ctx.font='bold 10px monospace';ctx.fillText('AMMO · REFILL'+(mobileMode?'':' · E'),-48,-43);ctx.restore();}
