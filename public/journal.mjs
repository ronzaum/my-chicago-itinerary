import {JournalDrafts,clearJournalDrafts} from './journal-drafts.mjs?v=colour-swap-20261025';
// A reflection remains a recoverable draft until the private service acknowledges it.
const DRAFT_KEY='chicago-public-demo-journal-draft';
let drafts=null,draftReady=null,saveMessage='',lastStatus='Demo journal · saved only in this browser, never sent to Ron.';
let ctx,record={text:'',id:null,payload:null},saving=false,releaseTimer,viewRevision=0,entries=[],nextCursor=null,loading=false;
const current=()=>ctx?.state().page==='journal'&&!ctx.state().place;
const esc=value=>ctx.esc(value);
const dateLabel=value=>new Intl.DateTimeFormat('en-GB',{timeZone:'America/Chicago',dateStyle:'long'}).format(new Date(value));
const timeLabel=value=>new Intl.DateTimeFormat('en-GB',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit'}).format(new Date(value));
function remember(){
 if(!record.text)status('');
 let sessionSaved=false;try{if(record.text)sessionStorage.setItem(DRAFT_KEY,JSON.stringify(record));else sessionStorage.removeItem(DRAFT_KEY);sessionSaved=true;}catch{}
 try{if(record.text&&drafts){drafts.save(record);status('Draft saved on this device. Press Send to save it only in this browser.');}}
 catch{status('Device draft storage is unavailable. Keep this page open and press Send while connected.');}
 if(record.text&&!drafts)status(sessionSaved?'Draft held in this tab. Connecting to enable recovery after closing…':'Draft is only in this open page. Press Send while connected before closing.');
}
async function recoverDrafts(){
 try{
  const owner=await request('local-journal-session');
  if(!owner.owner)throw Error('No verified owner');
  drafts=new JournalDrafts(localStorage,owner.owner);
  // Never let an unverified prior-session draft migrate into a different account.
  let saved=null;try{saved=JSON.parse(sessionStorage.getItem(DRAFT_KEY));}catch{}
  if(!record.text&&saved&&(saved.owner===owner.owner||!saved.owner)&&typeof saved.text==='string')record=saved;
  if(!record.text){const previous=drafts.list()[0];if(previous)record=previous;}
  record.owner=owner.owner;
  if(record.text){remember();const field=current()&&document.querySelector('#journal-text');if(field)field.value=record.text;}
  if(!record.text)status('Demo journal ready. Unsent drafts stay on this device; Send saves only in this browser.');
  lockUI();renderDraftChoices();
 }catch{status('Connect and sign in to recover saved drafts. New text can still be sent when connected.');}
}
function renderDraftChoices(){
 const target=current()&&document.querySelector('#journal-drafts');if(!target||!drafts)return;
 const others=drafts.list().filter(row=>row.id!==record.id);
 target.innerHTML=others.length?'<label>Other unsent drafts <select id="journal-draft-choice"><option value="">Choose a draft…</option>'+others.map(row=>'<option value="'+esc(row.id)+'">'+esc(new Date(row.updatedAt).toLocaleString())+'</option>').join('')+'</select></label>':'';
}

function status(message){lastStatus=message;const target=current()&&document.querySelector('#journal-status');if(target){target.textContent=message;target.hidden=!message;}}
function lockUI(){if(!current())return;const field=document.querySelector('#journal-text'),button=document.querySelector('#journal-form button[type=submit]');if(field)field.readOnly=saving||!!record.payload;if(button){button.disabled=saving;button.textContent=saving?'Sending…':'Send';}}
// A fresh, one-shot fix. Location failure never prevents sending a reflection.
export async function captureLocation(){return {location:null,location_status:'not-collected'};}
export function setupJournal(context){
 ctx=context;
 draftReady=recoverDrafts();
 document.addEventListener('input',event=>{if(event.target.id!=='journal-text'||saving)return;if(record.payload)return;saveMessage='';const oldId=record.id;record.text=event.target.value;if(!record.text){try{drafts?.remove(oldId);}catch{status('Could not remove the saved draft.');}record.id=null;}if(record.payload&&record.payload.body!==record.text){record.id=null;record.payload=null;}if(record.text&&!record.id)record.id=crypto.randomUUID();remember();});
 document.addEventListener('submit',event=>{if(event.target.id==='journal-form'){event.preventDefault();saveReflection();}});
 document.addEventListener('click',event=>{if(event.target.closest('[data-journal-more]'))loadJournal(true);if(event.target.closest('[data-journal-retry]'))loadJournal();});
 document.addEventListener('change',event=>{if(event.target.id!=='journal-draft-choice'||saving||!event.target.value)return;remember();const selected=drafts?.list().find(row=>row.id===event.target.value);if(selected){saveMessage='';record=selected;document.querySelector('#journal-text').value=record.text;lockUI();renderDraftChoices();}});
 document.addEventListener('click',event=>{const a=event.target.closest('a');if(a&&new URL(a.href,location.href).pathname==='/signout-with-chatgpt'){try{clearJournalDrafts(localStorage);sessionStorage.removeItem(DRAFT_KEY);}catch{}}});
 window.addEventListener('online',()=>{if(!drafts)draftReady=recoverDrafts();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&current())loadJournal();});
 window.addEventListener('focus',()=>{if(current())loadJournal();});
 window.addEventListener('pagehide',()=>{entries=[];});
}
const courier=`<svg class="courier-bird" viewBox="0 0 310 280"><path class="speed" d="m13 153 56 10m-42 10 39 8"/><g class="bundle"><path class="note" d="m151 193 71 17-16 48-71-17Z"/><path class="note-line" d="m153 212 45 11m-49 1 32 8"/><foreignObject x="148" y="208" width="54" height="30" transform="rotate(14 148 208)"><div xmlns="http://www.w3.org/1999/xhtml" class="parcel-words"></div></foreignObject></g><path class="tail" d="m119 146-72 3 30-27-14-28 64 31Z"/><ellipse class="body-fill" cx="164" cy="143" rx="64" ry="59"/><circle class="body-fill" cx="205" cy="113" r="44"/><path class="beak" d="m244 113 31 11-30 12Z"/><circle class="eye" cx="217" cy="107" r="6"/><path class="wing-fill flap" d="M157 156C88 149 71 86 91 36c32 7 67 47 80 78 8 21 1 37-14 42Z"/><path fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" d="m171 196 7 10 10-7"/></svg>`;
export function journalHTML(){return `<section class="journal-workspace"><p class="demo-journal-label">Demo journal · this browser only. No location collected. <button type="button" data-clear-demo-journal>Clear demo entries</button></p><form id="journal-form"><label class="sr-only" for="journal-text">Write your reflection</label><div id="journal-drafts"></div><div class="journal-writing"><textarea id="journal-text" placeholder="Type here…" maxlength="20000" aria-label="Write your reflection" spellcheck="false" autocomplete="off" ${saving?'readonly':''}>${esc(record.text)}</textarea></div><button class="journal-send" type="submit" ${saving?'disabled':''}>${saving?'Sending…':'Send'}</button></form><div class="journal-animation" aria-hidden="true"><div class="lifted-text"></div><div class="traveller">${courier}</div></div><p id="journal-status" role="status">${esc(lastStatus)}</p><section id="journal-story" aria-label="Your reflections" hidden></section></section>`;}
export function mountJournal(){viewRevision++;entries=[];nextCursor=null;loading=false;clearTimeout(releaseTimer);loadJournal();draftReady?.then(()=>{lockUI();renderDraftChoices();status(saveMessage||lastStatus);});}
async function request(path,options={}){
 const key='chicago-public-demo-journal-entries-v1';
 if(path.endsWith('journal-session'))return {owner:'public-demo-only'};
 const entries=JSON.parse(localStorage.getItem(key)||'[]');
 if(options.method==='POST'){
  const p=JSON.parse(options.body),created_at=new Date().toISOString();
  entries.unshift({id:p.id,body:p.body,captured_at:p.captured_at,created_at});
  localStorage.setItem(key,JSON.stringify(entries));return {receipt:{id:p.id,created_at}};
 }
 return {locked:false,entries,next_cursor:null};
}
async function saveReflection(){
 if(saving||!record.text.trim())return;
 saving=true;lockUI();status('Sending…');await draftReady;
 const id=record.id||crypto.randomUUID();record.id=id;
 try{
  if(!record.payload){const captured_at=new Date().toISOString(),body=record.text;const location=await captureLocation();record.payload={id,body,captured_at,...location};remember();}
  const payload=record.payload;
  const result=await request('local-journal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(result.receipt?.id!==id||!result.receipt.created_at)throw Error('The save could not be confirmed.');
  // Clear the temporary draft immediately after the receipt; the outgoing animation owns its copy.
  let cleanupFailed=false;
  try{drafts?.accepted(id,result.receipt);}catch{cleanupFailed=true;}
  record={text:'',id:null,payload:null};remember();
  saveMessage=cleanupFailed?'Saved only in this browser. Device draft cleanup failed; retrying that draft uses the same entry ID.':'Saved in this browser. This is a public demo; nothing is sent to Ron.';
  if(current()){await fly(payload.body);status(saveMessage);renderDraftChoices();}
 }catch(error){status('Not saved in this browser yet. Your original entry is retained—press Send to retry when connected.');}
 finally{saving=false;lockUI();if(current())loadJournal();}
}
function fly(body){
 const workspace=document.querySelector('.journal-workspace'),field=document.querySelector('#journal-text');
 if(!workspace||!field)return Promise.resolve();
 const area=workspace.querySelector('.journal-animation').getBoundingClientRect(),box=field.getBoundingClientRect(),lift=workspace.querySelector('.lifted-text'),traveller=workspace.querySelector('.traveller');
 const x=box.left-area.left,y=box.top-area.top,px=x+32,py=y+24;
 workspace.style.setProperty('--pickup-x',px+'px');workspace.style.setProperty('--pickup-y',py+'px');workspace.style.setProperty('--grow-x',(area.width/2-px)+'px');workspace.style.setProperty('--grow-y',(area.height*.42-py)+'px');
 lift.textContent=body;Object.assign(lift.style,{left:x+'px',top:y+'px',width:box.width+'px',height:box.height+'px'});lift.style.setProperty('--text-dx',(px+7-x)+'px');lift.style.setProperty('--text-dy',(py+20-y)+'px');workspace.querySelector('.parcel-words').textContent=body;
 workspace.classList.add('flying');lift.scrollTop=field.scrollTop;
 return new Promise(resolve=>{
  let done=false;
  const finish=()=>{if(done)return;done=true;clearTimeout(timer);traveller.removeEventListener('animationend',end);workspace.classList.remove('flying');field.value='';lift.textContent='';workspace.querySelector('.parcel-words').textContent='';if(field.isConnected&&current())field.focus({preventScroll:true});resolve();};
  const end=event=>{if(event.target===traveller)finish();};
  const timer=setTimeout(finish,2200);traveller.addEventListener('animationend',end);
 });
}
async function loadJournal(more=false){
 if(!current()||loading)return;
 loading=true;const revision=viewRevision;
 try{
  const result=await request('local-journal'+(more&&nextCursor?'?after='+encodeURIComponent(nextCursor):''));
  if(!current()||revision!==viewRevision)return;
  clearTimeout(releaseTimer);
  if(result.locked){
   entries=[];nextCursor=null;document.querySelector('#journal-story').hidden=true;
   const remaining=Date.parse(result.unlock_at)-Date.parse(result.server_time);
   if(Number.isFinite(remaining))releaseTimer=setTimeout(()=>{if(current())loadJournal();},Math.min(2147483000,Math.max(1000,remaining+250)));
   return;
  }
  if(result.locked!==false||!Array.isArray(result.entries))throw Error('Invalid journal response.');
  entries=more?[...entries,...result.entries]:result.entries;nextCursor=result.next_cursor;renderStory();
 }catch{if(current()&&revision===viewRevision&&!saving){const target=document.querySelector('#journal-story');target.hidden=false;target.innerHTML='<p class="journal-connection">Could not connect to your journal. <button data-journal-retry>Try again</button></p>';}}
 finally{if(revision===viewRevision)loading=false;}
}
function renderStory(){
 const story=document.querySelector('#journal-story');if(!story)return;
 let previousDate='';
 story.innerHTML=entries.length?entries.map(entry=>{
  const date=dateLabel(entry.captured_at),heading=date!==previousDate?`<h2>${esc(date)}</h2>`:'';previousDate=date;
  const located=Number.isFinite(entry.latitude)&&Number.isFinite(entry.longitude);
  const location=located?`<a href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(entry.latitude+','+entry.longitude)}" target="_blank" rel="noopener noreferrer">Where I wrote this</a>${Number.isFinite(entry.accuracy)?` <span>· within about ${Math.max(1,Math.round(entry.accuracy))} m</span>`:''}`:'';
  return `${heading}<article class="journal-reflection" data-entry-id="${esc(entry.id)}"><time datetime="${esc(entry.captured_at)}">${esc(timeLabel(entry.captured_at))} · Chicago time</time><p>${esc(entry.body)}</p>${location?`<div class="journal-location">${location}</div>`:''}<div class="journal-images" data-entry-id="${esc(entry.id)}"></div></article>`;
 }).join('')+(nextCursor?'<button class="journal-more" data-journal-more>Read more</button>':''):'<p class="journal-empty">No reflections yet.</p>';
 story.hidden=false;document.querySelector('#journal-form').hidden=false;
}
