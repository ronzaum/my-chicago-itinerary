import {DAY_DESIGN} from './trip-core.mjs?v=default-oct31';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arrow='<svg class="wallet-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M6 5h13v13"/></svg>';
const originalURL=doc=>doc?.cloud_url||doc?.external_url||doc?.email_url;
const external=(url,label)=>`<a class="wallet-stub" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span>${esc(label)}</span>${arrow}</a>`;

const shortDate=date=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
export function ticketSummary(p){
 const date=p.booking_date||'2026-10-30', kind=p.demoKind||(p.booking_kind==='admission'?'Museum':'Tour');
 return {date,kind,title:({"robie-house":"Frederick C. Robie House","home-studio":"Frank Lloyd Wright Home and Studio","mca-museum":"Museum of Contemporary Art Chicago"}[p.id]||p.name),dateLabel:kind==='Hotel'||kind==='Flight'?'Private details':shortDate(date),time:kind==='Hotel'?'Accommodation reserved':kind==='Flight'?'Flight details private':'Visit in the itinerary',detail:kind==='Hotel'?'Name, location and room details withheld.':kind==='Flight'?'Carrier, times and booking details withheld.':'Original ticket omitted from the public demo.',label:'About this booking'};
}

export function mountBookingWallet(data){
 if(!document.querySelector('#booking-wallet-style')){const css=document.createElement('link');css.id='booking-wallet-style';css.rel='stylesheet';css.href=new URL('./booking-wallet.css?v=tight-paper-ticket-20261025',import.meta.url).href;document.head.append(css);}
 const byId=new Map(data.places.map(p=>[p.id,p]));
 const confirmed=[{id:'demo-flight-out',name:'Flight to Chicago',demoKind:'Flight'},{id:'demo-stay',name:'Accommodation',demoKind:'Hotel'},...['robie-house','unity-temple','home-studio','art-institute','mca-museum'].map(id=>byId.get(id)).filter(Boolean),{id:'demo-flight-home',name:'Flight home',demoKind:'Flight',booking_date:'2026-11-01'}];
 const card=p=>{
  const summary=ticketSummary(p),b=p.booking_details||{},url=p.cloud_url||originalURL(p.artifacts?.[0])||p.email_url;
  return `<article class="record" data-booking-date="${summary.date}" data-search-name="${esc(p.name)}"><div class="ticket-main"><div class="ticket-meta"><span>${esc(summary.dateLabel)} · ${summary.kind}</span><span>Confirmed</span></div><h2 class="ticket-name">${esc(summary.title)}</h2><p class="booking-time">${esc(summary.time)}</p><p class="booking-detail">${esc(summary.detail)}</p></div><div class="ticket-footer"><button type="button" class="wallet-stub" data-private-document><span>${esc(summary.label)}</span>${arrow}</button></div></article>`;
 };
 const pending=[];

 document.querySelector('#main').innerHTML=`<div class="booking-wallet"><button class="folder" type="button" data-private-document><span>Tickets &amp; confirmations · private</span>${arrow}</button><h1 class="sr-only">Bookings wallet</h1><section class="records" aria-label="Bookings and items to arrange">${confirmed.map(card).join('')}<h2 class="section-label" hidden>Still to do <span>${pending.length} to arrange</span></h2>${pending.map(([date,title,time,note,url])=>`<article class="record unbooked" data-booking-date="${date}"><div class="meta"><span>${date}</span><span>Not booked</span></div><h2>${title}</h2><p class="booking-time">${time}</p><p>${note}</p>${external(url,'Booking options')}</article>`).join('')}<p class="empty" hidden>No bookings match your search.</p></section><p class="foot">Public demo. Booking cards show the original layout; personal documents and details are withheld.</p></div>`;
 const wallet=document.querySelector('.booking-wallet');
 wallet.querySelectorAll('.record').forEach(card=>{
  const id=DAY_DESIGN[card.dataset.bookingDate]?.palette||'14',palette=data.palettes[id],stock=id==='10'?'c3':'c2',band='c1';
  const token=(theme,name)=>palette[theme].match(new RegExp('--'+name+':([^;]+)'))[1];
  if(id==='10')card.style.setProperty('--ticket-title-light',token('dark','c3'));
  for(const theme of ['light','dark'])for(const [role,name] of Object.entries({stock,ink:stock.replace('c','t'),band,bandInk:band.replace('c','t'),data:theme==='light'?'c0':'t2',button:band,buttonInk:band.replace('c','t'),pattern:theme==='dark'?'c4':'c3'}))card.style.setProperty(`--ticket-${role}-${theme}`,role==='data'&&theme==='dark'?token('light',id==='bottle'||id==='10'?'c3':'c2'):token(theme,name));
 });
}
