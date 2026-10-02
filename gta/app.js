const editions={ps:[['ps5','PlayStation 5'],['ps4','PlayStation 4'],['ps3','PlayStation 3']],xbox:[['series','Xbox Series X|S'],['one','Xbox One'],['360','Xbox 360']],pc:[['enhanced','PC Enhanced'],['legacy','PC Legacy']]};
let family='ps';
const $=s=>document.querySelector(s), list=$('#cheat-list');
const symbols={RIGHT:'→',LEFT:'←',UP:'↑',DOWN:'↓',TRIANGLE:'△',CIRCLE:'○',SQUARE:'□',X:'×'};
function render(){
const old=['ps3','360'].includes($('#edition').value), query=$('#search').value.trim().toLowerCase(),category=$('#category').value;
const matches=CHEATS.filter(c=>(!old||!c.modern)&&(category==='All categories'||c.category===category)&&[c.name,c.note,c.category,c.pc,c.phone,c.phone.replaceAll('-','')].join(' ').toLowerCase().includes(query));
$('#instructions').textContent=family==='pc'?'PC: open the console with the key below Esc (usually ~), type the command and press Enter. Alternatively, open the in-game phone → Contacts → Spacebar / middle mouse → dial the number.':old?'This original-console edition supports controller combinations only. Phone codes and the newer unlockable vehicles are unavailable.':`${family==='ps'?'PlayStation':'Xbox'}: use the controller sequence, or open the in-game phone → Contacts → ${family==='ps'?'Square':'X'} to bring up the dial pad. Enter the number and press that button again to call.`;
$('#result-count').textContent=`${matches.length} entries · ${$('#edition').selectedOptions[0].textContent}${old?' · controller codes only':''}`;
$('#empty').hidden=!!matches.length;list.replaceChildren();
for(const c of matches){const card=document.createElement('article');card.className='cheat-card';
const tag=document.createElement('span');tag.className='eyebrow';tag.textContent=c.category+(c.modern?' / '+(c.category==='Vehicles'?'UNLOCK REQUIRED':'BONUS'):'');
const title=document.createElement('h3');title.textContent=c.name;
const note=document.createElement('p');note.className='cheat-note';note.textContent=c.note;card.append(tag,title,note);
const code=family==='pc'?c.pc:c[family];
if(code?.length){const block=document.createElement('div');block.className='code-block';const label=document.createElement('small');label.textContent=family==='pc'?'PC COMMAND':'CONTROLLER SEQUENCE';block.append(label);
const seq=document.createElement('div');seq.className='sequence';if(Array.isArray(code))for(const button of code){const k=document.createElement('kbd');k.textContent=family==='ps'?(symbols[button]||button):(['LEFT','RIGHT','UP','DOWN'].includes(button)?symbols[button]:button);k.setAttribute('aria-label',button);seq.append(k);}else{const k=document.createElement('code');k.textContent=code;seq.append(k);}block.append(seq,copyButton(Array.isArray(code)?code.join(', '):code,'Copy code'));card.append(block);}
if(!old){const phone=document.createElement('div');phone.className='phone';const label=document.createElement('div');const small=document.createElement('small');small.textContent=!code?.length?'IN-GAME PHONE ONLY':'IN-GAME PHONE';const number=document.createElement('code');number.textContent=c.phone;label.append(small,number);phone.append(label,copyButton(c.phone,'Copy number'));card.append(phone);}list.append(card);}
}
function copyButton(text,label){const b=document.createElement('button');b.className='copy';b.textContent=label;b.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(text);b.textContent='Copied ✓';setTimeout(()=>b.textContent=label,1800);}catch{$('#copy-status').textContent='Copy unavailable. Select the code and copy it manually.';setTimeout(()=>$('#copy-status').textContent='',4000);}});return b;}
document.querySelectorAll('[data-family]').forEach(b=>b.addEventListener('click',()=>{family=b.dataset.family;document.querySelectorAll('[data-family]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('#edition').replaceChildren(...editions[family].map(([value,text])=>new Option(text,value)));render();}));
['edition','category'].forEach(id=>$('#'+id).addEventListener('change',render));$('#search').addEventListener('input',render);$('#clear').addEventListener('click',()=>{$('#search').value='';$('#category').value='All categories';render();});render();
