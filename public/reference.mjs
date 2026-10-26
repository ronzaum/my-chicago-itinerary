// Reference-only display metadata; itinerary records and source prose stay intact.
const names={
 'home-studio':'Frank Lloyd Wright Home and Studio','robie-house':'Frederick C. Robie House',
 'iit-campus':'Illinois Institute of Technology','federal-center':'Chicago Federal Center',
 'ama-plaza':'AMA Plaza','saint-alfred':'Saint Alfred','mca-museum':'Museum of Contemporary Art Chicago',
 'bean':'Cloud Gate','symphony':'Symphony Center','lyric':'Lyric Opera of Chicago',
 'steadfast':'Steadfast','revival':'The Sterling','360':'360 CHICAGO','skydeck':'Skydeck Chicago',
 'palmer':'Palmer House','pendry':'Carbide & Carbon Building','thursday-pendry':'Carbide & Carbon Building',
 'thursday-ama':'AMA Plaza','thursday-langham':'The Langham, Chicago',
 'wholefoods':'Whole Foods Market','thursday-groceries':'Whole Foods Market'
};
const types={
 'home-studio':'House & studio','unity-temple':'Church','heurtley-house':'House','roberts-house':'House',
 'rookery-light':'Office building','robie-house':'House','crown-hall':'Architecture school',
 'iit-campus':'University campus','federal-center':'Government buildings','lake-towers':'Apartments',
 'ama-plaza':'Office tower','farnsworth-house':'House museum','rsvp-gallery':'Clothing shop','saint-alfred':'Clothing shop',
 'mca-museum':'Art museum','design-museum':'Design museum','art-institute':'Art museum',
 'volume-gallery':'Gallery','monique-meloche':'Gallery','south-loop-loft':'Furniture shop',
 'notre-shop':'Clothing shop','sawada-coffee':'Café','plein-air':'Café','intelligentsia':'Café',
 'marisol-restaurant':'Restaurant','publican-restaurant':'Restaurant','wormhole-lead':'Café',
 'cultural-center':'Cultural center','monadnock-building':'Office building','reliance-building':'Historic building',
 'marina-city':'Residential towers','river-cruise':'Boat tour','bean':'Public sculpture',
 'pritzker':'Pavilion & bridge','606':'Walking trail','lakefront':'Lakeside trail','symphony':'Concert hall',
 'greenmill':'Jazz club','andys':'Jazz club','buddy':'Blues club','rosas':'Blues club',
 'wrigley':'Baseball stadium','soldier':'Football stadium','united':'Arena','shedd':'Aquarium',
 'adler':'Planetarium','oakbeach':'Beach','navypier':'Waterfront pier','lyric':'Opera house',
 'mart':'Public art','mtcc':'Student center','carr':'Chapel','mansueto':'Library','rockefeller':'Chapel',
 'nathan-moore':'House','hills-decaro':'House','marquette':'Office building','palmer':'Hotel',
 'fine-arts':'Arts building','svrn':'Clothing shop','pendry':'Historic building',
 'thursday-pendry':'Historic building','thursday-marina':'Residential towers','thursday-ama':'Office tower',
 'thursday-langham':'Hotel','thursday-wrigley':'Office building','thursday-tribune':'Historic tower',
 'thursday-groceries':'Grocery store','wholefoods':'Grocery store'
};
const canonical=id=>({'thursday-pendry':'pendry','thursday-marina':'marina-city','thursday-ama':'ama-plaza','thursday-langham':'langham-hotel'}[id]||id);
const fold=s=>String(s??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const words=s=>fold(s).match(/[\p{L}\p{N}]+/gu)||[];
export const prefixMatch=(text,query)=>words(query).every(q=>words(text).some(w=>w.startsWith(q)));
export function highlighted(text,query,escape){
 const prefixes=words(query);
 return String(text??'').replace(/[\p{L}\p{N}\p{M}]+|[^\p{L}\p{N}\p{M}]+/gu,token=>{
  const match=prefixes.filter(q=>fold(token).startsWith(q)).sort((a,b)=>b.length-a.length)[0];
  if(!match)return escape(token);
  let end=0;while(end<token.length&&fold(token.slice(0,end)).length<match.length)end++;
  return `<mark>${escape(token.slice(0,end))}</mark>${escape(token.slice(end))}`;
 });
}
export function shortAddress(address){
 const text=String(address||'').replace(/^Mies Campus,\s*/, '').replace(/^Millennium Park,\s*/, '');
 if(/unconfirmed/i.test(text))return 'Address unconfirmed';
 if(/Meeting point/i.test(text))return 'Meeting point varies';
 return text.split(/[,;]/)[0].replace(/\b(Avenue|Street|Boulevard|Drive|Road|Place)\b/g,w=>({Avenue:'Ave',Street:'St',Boulevard:'Blvd',Drive:'Dr',Road:'Rd',Place:'Pl',North:'N',South:'S',East:'E',West:'W'}[w]));
}
export function referenceMeta(p,data){
 const id=canonical(p.id);
 const base=data.places?.find(item=>item.id===id)||p;
 const booked=/^confirmed\b/i.test(base.booking_status||'')||(data.bookings||[]).some(b=>canonical(b.inventory_id)===id&&/^(confirmed|paid)/i.test(b.status||''));
 const planned=data.days.some(d=>d.phases.some(ph=>ph.stops.some(s=>!s.optional&&canonical(s.place)===id)));
 let type=types[p.id]||String(p.category||'Place').split(/\s*\/\s*/)[0];
 type=({Hotels:'Hotel',Flights:'Flight',Pizza:'Pizzeria',Performance:'Theatre',Viewpoint:'Observation deck','Food hall':'Food hall',Tour:'Tour',Architecture:'Historic building',Museum:'Museum','Public space':'Public space'}[type]||type);
 const name=names[p.id]||p.name;
 const area=p.area||base.area||({'thursday-wrigley':'River North','thursday-tribune':'Streeterville','thursday-groceries':'Streeterville'}[p.id])||'';
 return {name,type,area,booked,planned,address:shortAddress(p.address),subtitle:[type,area,booked?'Booked':''].filter(Boolean).join(' · ')};
}
export function referenceSearch(data,esc){
 const opts=values=>[...new Set(values.filter(Boolean))].sort().map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
 const entries=data.places.map(p=>referenceMeta(p,data));
 return `<form class="inventory-search reference-search" role="search" onsubmit="return false"><label class="sr-only" for="reference-search">Search places</label><div class="search-line"><svg class="reference-control-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 15.5 21 21" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M17 9.7c.5 4.2-2.7 7.3-6.8 7.5-4 .2-7.1-2.7-7.2-6.7C2.8 6.3 5.6 3.3 9.6 3c4.3-.3 7 2.6 7.4 6.7Z" fill="none" stroke="currentColor" stroke-width="3.5"/></svg><input type="search" id="reference-search" placeholder="Search places…" autocomplete="off"><button type="button" data-clear-search aria-label="Clear search" hidden>×</button></div><div class="search-filters"><div class="reference-select"><select id="reference-category" aria-label="Category"><option value="">All categories</option>${opts(entries.map(p=>p.type))}</select><svg class="reference-control-icon reference-select-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 8 6.5 8L19 8.5" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="reference-select"><select id="reference-area" aria-label="Area"><option value="">All areas</option>${opts(entries.map(p=>p.area))}</select><svg class="reference-control-icon reference-select-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 8 6.5 8L19 8.5" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div><p id="result-count" class="sr-only" role="status"></p></form><div id="inventory-results"></div>`;
}
