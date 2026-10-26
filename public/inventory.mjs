import {referenceSearch,referenceMeta,prefixMatch,highlighted} from './reference.mjs?v=colour-swap-20261025';
import {mountBookingWallet} from './booking-wallet.mjs?v=tight-paper-ticket-20261025';
import {tripStoryHTML} from './trip-story.mjs?v=colour-swap-20261025';
import {setupJournal,journalHTML,mountJournal} from './journal.mjs?v=colour-swap-20261025';
let ctx;
const titles={inventory:'Inventory',reference:'Reference library',cover:'The trip',library:'Library',food:'Food',bookings:'Bookings',journal:'Journal'};
export const inventoryPage = page => Object.hasOwn(titles,page);
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const matches=(value,query)=>normalize(query).split(/\s+/).every(word=>normalize(value).includes(word));
// Display groups are derived from source labels; entries keep their original metadata.
const categoryGroups=[
 ['Architecture',/architecture|mies|wright/i],['Art & design',/art|design|abloh|gallery/i],
 ['Bars',/bar|club/i],['Cafés',/café|cafe/i],['Flights',/flight/i],
 ['Food & markets',/food|groceries|market/i],['Hotels',/hotel/i],
 ['Museums',/museum/i],['Music & performance',/music|performance/i],
 ['Pizza',/pizza/i],['Public spaces',/public space/i],['Restaurants',/restaurant/i],
 ['Shops',/shops/i],['Sports',/sport/i],['Tours',/tour/i],
 ['Viewpoints',/viewpoint/i],['Mies',/mies/i],['Wright',/wright/i],['Abloh',/abloh/i]
];
export const displayCategories=label=>categoryGroups.filter(([,pattern])=>pattern.test(label||'')).map(([name])=>name);
export const displayAreas=label=>[...new Set(String(label||'').split(/\s*\/\s*/).map(part=>/^(river|riverwalk)$/i.test(part)?'River':part.trim()).filter(Boolean))];
const current=page=>ctx.state().page===page&&!ctx.state().place;
export function setupInventory(context) {
 ctx=context;
 if(!document.querySelector('[data-reference-style]')){const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./reference.css?v=demo-exact-v140',import.meta.url).href;css.dataset.referenceStyle='';document.head.append(css);}
 setupJournal(context);
 document.addEventListener('input',e=>{
  if(e.target.id==='reference-search'||e.target.id==='booking-search') filterResults();
 });
 document.addEventListener('change',e=>{if(['reference-category','reference-area','booking-type'].includes(e.target.id))filterResults();});
 document.addEventListener('click',e=>{
  if(e.target.closest('[data-clear-search]')) {const input=document.querySelector('.inventory-search input');input.value='';if(input.id!=='reference-search')for(const select of document.querySelectorAll('.inventory-search select'))select.value='';filterResults();input.focus();}
 });
}
function header(page){if(page==='cover')return '';if(page==='reference')return '<h1 class="sr-only">Reference library</h1>';return page==='inventory'?'<h1 class="sr-only">Inventory</h1>':`<div class="inventory-top">${ctx.link({page:'inventory'},'Inventory')}</div><h1>${titles[page]}</h1>`;}
const icon=(content)=>`<svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">${content}</svg>`;
// Tiny toy-like pictograms: plump upright silhouettes with minimal detail.
const icons={
 reference:icon('<g fill="currentColor"><path d="M21 13C17 8 10 6 6 9c-3 2-3 7-2 12l1 13c0 3 2 5 5 5 4 0 8 1 11 4V13Z"/><path d="M27 13c4-5 11-7 15-4 3 2 3 7 2 12l-1 13c0 3-2 5-5 5-4 0-8 1-11 4V13Z"/></g>'),
 cover:icon('<g><path d="M17 15v-4a7 7 0 0 1 14 0v4" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><rect x="4" y="12" width="40" height="31" rx="13" fill="currentColor"/><path d="M17 28q7 9 14 0" fill="none" stroke="var(--icon-paper)" stroke-width="3.5" stroke-linecap="round"/></g>'),
 library:icon('<g><path d="M17 8q7-3 14 0l3 6h3q8 0 8 9v10q0 10-10 10H13Q3 43 3 33V23q0-9 8-9h3l3-6Z" fill="currentColor"/><circle cx="24" cy="28" r="9" fill="var(--icon-paper)"/><circle cx="27" cy="25" r="3.5" fill="currentColor"/></g>'),
 food:icon('<path d="M31 18h4a7 7 0 0 1 0 14h-5" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path d="M6 16q13-3 27 0v13a13.5 13.5 0 0 1-27 0V16Z" fill="currentColor"/><path d="M14 27q6 8 12 0" fill="none" stroke="var(--icon-paper)" stroke-width="3.5" stroke-linecap="round"/><path d="m16 6-1 3m11-5-1 4" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>'),
 bookings:icon('<g><path d="M12 9h24q8 0 8 8v2a5 5 0 0 0 0 10v2q0 8-8 8H12q-8 0-8-8v-2a5 5 0 0 0 0-10v-2q0-8 8-8Z" fill="currentColor"/><path d="M24 15q2 7 9 9-7 2-9 9-2-7-9-9 7-2 9-9Z" fill="var(--icon-paper)"/></g>'),
 journal:icon('<g fill="currentColor"><rect x="16" y="3" width="16" height="9" rx="5"/><path d="M16 16h16v16c0 5-4 10-7 13a1.5 1.5 0 0 1-2 0c-3-3-7-8-7-13V16Z"/></g>')
};
function menu(){return `<nav class="inventory-menu" aria-label="Inventory sections">${[['reference','Reference'],['cover','Trip'],['library','Library'],['bookings','Bookings'],['journal','Journal']].map(([key,title])=>ctx.link({page:key},`${icons[key]}<span>${title}</span>`)).join('')}<button id="theme" type="button">${ctx.themeControl()}</button></nav>`;}
function cover(){return tripStoryHTML;}
function food(){
 const {data,esc,ext,link}=ctx;
 const pdfPizza=[
  ['pequods','Pan pizza · does not match your preference'],
  ['foxhole','Neapolitan · possible match; current window operation needs confirmation'],
  ['paulies','Wood-fired and Detroit-style · avoid the square pizzas'],
  ['burts','Pan pizza · does not match your preference'],
  ['middlebrow','Sourdough pizza · saved source entry'],
  ['ginos','Deep dish · does not match your preference'],
  ['five-squared','Detroit-style squares · does not match your preference'],
  ['pizza-friendly','Sicilian squares · does not match your preference'],
  ['coalfire','Round coal-fired thin pizza · possible non-Neapolitan fallback'],
  ['lous','Deep dish · does not match your preference'],
  ['spacca','Neapolitan · best match and active recommendation'],
  ['zazas','New York-style · does not match your Italian preference'],
  ['max-issy','New York-style · does not match your Italian preference'],
  ['mypi','Deep dish · closed; retained as historical source record'],
  ['bonci','Rectangular Roman al taglio · does not match your preference'],
  ['craft','New York-style · does not match your Italian preference']
 ];
 const cards=pdfPizza.map(([id,status],index)=>{
  const place=data.places.find(item=>item.id===id);if(!place)return'';
  return `<article class="food-pick"><p class="record-kind">${String(index+1).padStart(2,'0')} · ${esc(status)}</p><h2>${esc(place.name)}</h2><p>${esc(place.description)}</p>${place.note?`<p>${esc(place.note)}</p>`:''}<div class="reference-links">${link({place:place.id,fromPage:'food'},'Place details')}${ext(place.url,'Website')}</div></article>`;
 }).join('');
 return `<section class="food-intro"><p>All 16 pizza places featured in Chicago.pdf, in source order. No outside pizza places are included. Inventory inclusion records the PDF; it is not a recommendation. Spacca Napoli is the clear match for your round Italian-pizza preference. Foxhole is the other Neapolitan entry, but its current walk-up operation needs confirmation.</p></section>${cards}`;
}
function search(kind){
 const {data,esc}=ctx;
 const options=values=>[...new Set(values.filter(Boolean))].sort().map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
 return `<form class="inventory-search" role="search" onsubmit="return false"><label for="${kind}-search">${kind==='reference'?'Search the reference library':'Search all bookings'}</label><div class="search-line"><input type="search" id="${kind}-search" placeholder="${kind==='reference'?'Places, addresses, lists…':'Hotels, flights, tours, reservations…'}" autocomplete="off"><button type="button" data-clear-search>Clear</button></div><div class="search-filters">${kind==='reference'?`<select id="reference-category" aria-label="Category"><option value="">All categories</option>${options(data.places.flatMap(p=>displayCategories(p.category)))}</select><select id="reference-area" aria-label="Area"><option value="">All areas</option>${options(data.places.flatMap(p=>displayAreas(p.area)))}</select>`:`<select id="booking-type" aria-label="Booking type"><option value="">All types</option>${options(['Flights','Hotels','Tours','Reservations','Tickets'])}</select>`}</div><p id="result-count" role="status"></p></form><div id="inventory-results"></div>`;
}
function referenceHero(place){
 const {data,esc,ext}=ctx;
 const photo=data.galleries[place.id]?.[0];
 if(!photo)return '';
 let publication='';try{publication=data.references?.publishers?.[new URL(photo.source).hostname.replace(/^www\./,'')]||new URL(photo.source).hostname.replace(/^www\./,'');}catch{}
 return `<figure class="reference-hero"><img src="${esc(photo.url)}" alt="${esc(photo.caption||place.name)}" loading="lazy" decoding="async" data-reference-photos="${esc(JSON.stringify(data.galleries[place.id].slice(1)))}"><figcaption>${esc(photo.caption||place.name)}${photo.source?` · Photograph: ${ext(photo.source,photo.credit||publication||'Source')}`:''}</figcaption></figure>`;
}
function referenceSources(place){
 const {data,esc,ext,citationFor}=ctx;
 const sources=[...(place.sources||[]),...(data.details[place.id]?.sources||[])];
 const unique=[...new Map(sources.filter(s=>{try{return ['http:','https:'].includes(new URL(s.url).protocol);}catch{return false;}}).map(s=>[s.url,s])).values()];
 if(!unique.length)return '';
 return `<section class="reference-sources" aria-label="Sources"><h2>Sources</h2>${unique.map(source=>{
  const c=citationFor(source,data.references);
  const published=c.published==='n.d.'?'':c.published;
  return `<p>${c.author?`${esc(c.author)}, `:''}<cite>${ext(source.url,c.title)}</cite>${c.publication?`, <span class="source-publication">${esc(c.publication)}</span>`:''}${published?`, ${esc(published)}`:''}.</p>`;
 }).join('')}</section>`;
}
function referenceInterior(p){
 const {esc,ext,link,documentURL}=ctx;
 const description=p.id==='home-studio'?'Frank Lloyd Wright’s home and architecture studio in Oak Park. See how he experimented with room layouts, natural light and built-in furniture.':p.description;
 const booking=null;
 const practical=booking?[booking.Tour,booking.Date,booking.Time,booking.Arrive?`Arrive ${booking.Arrive}`:''].filter(Boolean).join(' · ')||p.note:p.note;
 const ticket=null;
 const sources=referenceSources(p);
 return `<div class="reference-interior">${referenceHero(p)}${description?`<section class="reference-section"><h3>The place</h3><p>${esc(description)}</p></section>`:''}${practical?`<section class="reference-section"><h3>${booking?'Your visit':'Before you go'}</h3><p>${esc(practical)}</p></section>`:''}<div class="reference-actions">${link({place:p.id,fromPage:'reference'},'Details')}${ext(p.url,'Website')}${ticket?ext(documentURL(ticket),'Ticket'):''}</div>${sources?`<details class="reference-source-disclosure"><summary>Sources</summary>${sources}</details>`:''}</div>`;
}
function referenceResults(query,category,area){
 const {data,esc,ext,link,originalDocuments}=ctx;
 const entries=data.places.map(p=>({p,m:referenceMeta(p,data)})).filter(({m})=>(!category||m.type===category)&&(!area||m.area===area)&&prefixMatch([m.name,m.subtitle,m.address].join(' '),query));
 document.querySelector('#result-count').textContent=`${entries.length} matching places`;
 document.querySelector('[data-clear-search]').hidden=!query;
 const hi=text=>highlighted(text,query,esc);
 return entries.length?entries.map(({p,m})=>`<details class="reference-entry${m.planned?' is-planned':''}"><summary><span><strong title="${esc(m.name)}">${hi(m.name)}</strong><small title="${esc(m.subtitle)}">${hi(m.subtitle)}</small>${m.address?`<span class="reference-address">${hi(m.address)}</span>`:''}</span></summary>${referenceInterior(p)}</details>`).join(''):'<p class="inventory-empty">No matching entries. Try another search or change the filters.</p>';
}
function bookingRecords(){
 const {data}=ctx,records=new Map();
 for(const p of data.places.filter(p=>p.entity_type==='flight'||'artifact_ids' in p||p.hasPrivateBooking)){
  const type=p.entity_type==='flight'?'Flights':'Hotels';
  records.set(p.id,{id:p.id,type,name:p.name,status:p.booking_status||'Confirmation not supplied',note:p.description,place:p,url:p.url});
 }
 for(const b of data.bookings||[]){
  if(!b.inventory_id||records.has(b.inventory_id)||!['tickets','choices'].includes(b.group))continue;
  const p=data.places.find(p=>p.id===b.inventory_id);if(!p)continue;
  const type=/food|restaurant|pizza|café|cafe/i.test(p.category)?'Reservations':/tour/i.test(p.access+' '+b.title+' '+b.note)?'Tours':'Tickets';
  records.set(p.id,{id:p.id,type,name:b.title,status:'Not booked',note:b.note,place:p,url:b.source||p.url});
 }
 return [...records.values()];
}
function bookingResults(query,type){
 const {esc,ext,link,originalDocuments}=ctx;
 const all=bookingRecords(),records=all.filter(r=>(!type||r.type===type)&&matches(JSON.stringify(r),query));
 document.querySelector('#result-count').textContent=`${records.length} of ${all.length} booking records and plans`;
 return records.length?records.map(r=>`<article class="booking-entry"><p class="record-kind">${r.type} · ${esc(r.status)}</p><h2>${esc(r.name)}</h2><p>${esc(r.note)}</p>${r.place.booking_details?`<dl>${Object.entries(r.place.booking_details).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`:''}<div class="reference-links">${link({place:r.id,...(r.place.artifacts?.length?{page:'document'}:{}),fromPage:'bookings'},r.place.artifacts?.length?'View booking PDF':'View details')}${ext(r.url,'Booking website')}</div>${originalDocuments(r.place)}</article>`).join(''):'<p class="inventory-empty">No matching bookings. Try another search or clear the filter.</p>';
}
function filterResults(){
 const page=ctx.state().page;
 if(page==='reference')document.querySelector('#inventory-results').innerHTML=referenceResults(document.querySelector('#reference-search').value,document.querySelector('#reference-category').value,document.querySelector('#reference-area').value);
 if(page==='bookings')document.querySelector('#inventory-results').innerHTML=bookingResults(document.querySelector('#booking-search').value,document.querySelector('#booking-type').value);
}
export function renderInventoryPage(page) {
 document.title=titles[page]+' · Chicago';
 if(page==='bookings'){mountBookingWallet(ctx.data);return;}
 let content='';
 if(page==='inventory')content=menu();
 if(page==='cover')content=cover();
 if(page==='library')content='<section class="inventory-empty library-empty"><div class="photo-outline" aria-hidden="true"></div><h2>Photo library · public demo</h2><p>A place for the images you’ll bring home.</p><p>Personal photographs are not included in this public copy.</p></section>';
 if(page==='food')content=food();
 if(page==='reference')content=referenceSearch(ctx.data,ctx.esc);

 if(page==='bookings')content=search('booking')+ctx.renderTodos();
 if(page==='journal')content=journalHTML();
 document.querySelector('#main').innerHTML=`<div class="inventory-surface inventory-${page}">${page==='journal'?'':header(page)}${content}</div>`;
 if(['reference','bookings'].includes(page))filterResults();
 if(page==='journal')mountJournal();
}
