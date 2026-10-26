import {mergePlaces,normalizeDays} from './map/core.mjs?v=colour-swap-20261025';
import {dayJourney,enrichMetadata} from './map/journey.mjs?v=colour-swap-20261025';
import {effectiveDay,DAY_DESIGN} from './trip-core.mjs?v=default-oct31';
import {directionsURL,listingURL} from './trip-core.mjs?v=default-oct31';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// A small custom family: pill shapes, generous curves and dot details.
const svg=body=>`<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const solid=body=>`<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" stroke="none" aria-hidden="true">${body}</svg>`;
const icons={
 locate:svg('<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>'),
 sites:solid('<path d="M4 22V9a3 3 0 0 1 3-3h2V4a3 3 0 0 1 3-3h5a3 3 0 0 1 3 3v18Z"/>'),
 food:solid('<g transform="rotate(7 12 12)"><path fill-rule="evenodd" d="M3 5Q12-1 21 5L13 22a1.1 1.1 0 0 1-2 0ZM8.7 11a1.3 1.3 0 1 0 2.6 0 1.3 1.3 0 1 0-2.6 0M11.9 15a1.1 1.1 0 1 0 2.2 0 1.1 1.1 0 1 0-2.2 0"/></g>'),
 pizza:svg('<circle cx="12" cy="12" r="9"/><path d="M12 12 19.8 7.5M12 12 8 20.1"/><circle cx="9" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15" r="1" fill="currentColor" stroke="none"/>'),
 train:solid('<path d="M2 17V6a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v4h3V6h5v4a3 3 0 0 1 3 3v4Z"/><circle cx="7" cy="20" r="3"/><circle cx="18" cy="20" r="3"/>'),
 route:solid('<path d="M2 5C2-1 21-1 21 7c0 6-15 5-15 7 0 3 15 1 15 7a2 2 0 0 1-4 0c0-2-15 0-15-7 0-6 15-5 15-7 0-3-11-3-11-2a2 2 0 0 1-4 0Z"/>'),
 full:svg('<path d="M8 3H6a3 3 0 0 0-3 3v2m13-5h2a3 3 0 0 1 3 3v2M3 16v2a3 3 0 0 0 3 3h2m13-5v2a3 3 0 0 1-3 3h-2" stroke-width="1.9"/>'),
 minus:svg('<path d="M6 12h12" stroke-width="2.8"/>'),plus:svg('<path d="M6 12h12M12 6v12" stroke-width="2.8"/>')};

let resources;
export function loadMapResources() {
  return resources ||= Promise.all(['places.json','design-data.json','transit.json'].map(async name=>{
    const response=await fetch(new URL('./map/'+name,import.meta.url));
    if(!response.ok)throw Error('Map data unavailable');return response.json();
  })).catch(error=>{resources=null;throw error});
}
export function chapterRanges(day) {
  const specs={
    '2026-10-30':[['Breakfast & IIT','IIT',1],['Hyde Park','Hyde Park',1],['West Loop evening','West Loop',1]],
    '2026-10-31':[['Oak Park','Oak Park',1],['West Loop shops','Shops',1],['Dinner & packing','Evening',1]]
  };
  if(day.date==='2026-11-01'){
    let start=0;
    return day.phases.map(phase=>{const from=start;start+=phase.stops.length;return {name:phase.title,short:phase.title.split('·')[0].trim(),range:[from,start]};});
  }
  let phase=0,stop=0;
  return specs[day.date].map(([name,short,count])=>{const start=stop;stop+=day.phases.slice(phase,phase+count).reduce((n,p)=>n+p.stops.length,0);phase+=count;return {name,short,range:[start,stop]}});
}
export function mountChapterMap(el,{data,sourceDay,choices,theme,resources:[metadata,design,transit],pin,foodFocus=false,onExpand,runtime}) {
if(!runtime)throw Error('Google Maps runtime is required');
const R=runtime;
const journeyPoints={...design.points,...(data.points||{})};
let night=theme==='dark';
let foodItems=dayFoodItems(sourceDay,foodFocus);
let foodMode=foodFocus;
const events=new AbortController();
let day=normalizeDays([effectiveDay(sourceDay,choices,data.mealChoices,data.places)])[0];
let choiceKey=JSON.stringify(choices);
const places=mergePlaces(data.places,enrichMetadata(metadata,data.places,journeyPoints),[]),byId=new Map(places.map(p=>[p.id,p]));
const pizzaRecords=(data.pizzaMap?.places||[]).map(record=>({record,place:byId.get(record.id),point:journeyPoints[record.id]||data.points?.[record.id]})).filter(item=>item.place&&item.point);
const references=new Map((data.mapReferences||[]).map(record=>[record.id,record]));
const allReferenceItems=[...references.values()].map(record=>({record,place:byId.get(record.id),point:record.location||journeyPoints[record.id]||data.points?.[record.id]})).filter(item=>item.place);
const referenceItems=allReferenceItems.filter(item=>item.point?.lat&&item.point?.lng);
let steps=dayJourney(day,places,journeyPoints).steps;
let chapters=chapterRanges(day);
const palette=()=>data.palettes[DAY_DESIGN[day.date].palette][night?'dark':'light'];
const token=n=>palette().match(new RegExp('--'+n+':([^;]+)'))[1];
const tones=()=>[token('c0'),token('c1'),token('c3')];
const chapterFor=s=>Math.max(0,chapters.findIndex(c=>s.number>c.range[0]&&s.number<=c.range[1]));
const colour=i=>tones()[i%3];
const planned=item=>Boolean(item.record.going||item.chapters?.length);
const markerIcon=(items,active,opacity)=>{
 if(foodMode){const isFood=items.some(item=>item.foodChoice);return R.divIcon({className:`pin food-focus-pin ${isFood?'food-choice-pin':'food-context-pin'}`,html:isFood?`<b style="background:${token('c4')};color:${token('t4')};border:1px solid ${token('c4')}">${items.length>1?items.length:icons.food}</b>`:`<b style="background:${token('c3')};border:1px solid ${token('c3')};width:8px;height:8px;border-radius:50%"></b>`,iconSize:[30,30],iconAnchor:[15,15]});}

 if(items.every(item=>!planned(item)))return R.divIcon({className:`pin reference-dot ${active?'active':''}`,html:`<b style="--reference-colour:${colour(0)}"></b>`,iconSize:[24,24],iconAnchor:[12,12]});
 const chapters=[...new Set(items.flatMap(item=>item.chapters||[]))];
 const colours=chapters.length?chapters.map(colour):[token('c4')];
 const background=night?token('c0'):colours[0];
 const rgb=background.slice(1).match(/../g).map(c=>parseInt(c,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 const ink=token(night?'t0':chapters.length&&chapters[0]%3===1?'t1':chapters.length&&chapters[0]%3===2?'t3':'t0');
 const ring=background;
 const label=items.length>1?items.length:items[0].number||'·';
 const historical=items.every(item=>['historical','removed_reference','temporarily_closed_reference'].includes(item.record.status));
 return R.divIcon({className:`pin ${active?'active':''} ${colours.length>1?'mixed':''} ${historical?'historical':''}`,html:`<b style="--pin-colour:${background};--pin-ink:${ink};--pin-ring:${ring};opacity:1"><span>${label}</span></b>`,iconSize:[30,30],iconAnchor:[15,15]});
};
const control=(key,label,pressed)=>`<button data-control="${key}" aria-label="${label}" title="${label}"${pressed===undefined?'':` aria-pressed="${pressed}"`}>${icons[key]}</button>`;
el.className='chapter-map';
el.innerHTML=`<div class="food-map-bar"></div><div class="map-wrap"><div class="map" id="day-map"></div><div class="map-controls"><div class="utility-controls">${control('locate','My location')}${control('full','Full screen')}${control('minus','Zoom out')}${control('plus','Zoom in')}</div></div><div class="filter-feedback" aria-live="polite"></div></div><div class="modebar" aria-label="Choose chapter"><button data-chapter="-1" aria-pressed="true">Entire day</button>${chapters.map((c,i)=>`<button data-chapter="${i}" aria-pressed="false"><i></i>${c.short}</button>`).join('')}</div><div class="selection" aria-live="polite" hidden></div>`;

 el.querySelector('.map-wrap').append(el.querySelector('.selection'));
 // Keep the chapter choices and fixed booking bar visible above Safari's
 // changing browser chrome. Use measured shell heights, including safe areas.
 const shell=[document.querySelector('.appbar'),document.querySelector('.days'),document.querySelector('#view-switch')];
 shell.push(el.querySelector('.food-map-bar'));
 const modebar=el.querySelector('.modebar');
 const footer=document.querySelector('#app-footer');
 function fitMapHeight(){
   if(el.closest('.chapter-expanded'))return;
   const height=window.visualViewport?.height || window.innerHeight;
   const occupied=[...shell,modebar,footer].reduce((sum,node)=>sum+(node?.getBoundingClientRect().height||0),0);
   el.style.setProperty('--map-viewport-height',`${Math.max(220,Math.min(650,Math.floor(height-occupied-8)))}px`);
 }
 fitMapHeight();
 const map=R.map(el.querySelector('.map'),{zoomControl:false,scrollWheelZoom:false,zoomSnap:.25}).setView([41.89,-87.631],13);
 map.setTheme(theme);
 const rails=R.layerGroup().addTo(map),routes=R.layerGroup().addTo(map),pins=R.layerGroup().addTo(map);
 // Selection is a venue, never an itinerary occurrence. All entry points share it.
 let selected=null,chapter=-1,feedbackTimer,expanded=false;
 const enabled={sites:true,food:true,pizza:true,route:!!day.routePaths,train:false};
 const point=s=>s.kind==='walk'&&s.start&&s.end&&(s.start.lat!==s.end.lat||s.start.lng!==s.end.lng)?s.start:s.end||s.start;
 function fit(focus=steps){const b=focus.flatMap(s=>[s.start,s.end].filter(Boolean).map(p=>[p.lat,p.lng]));if(b.length)map.fitBounds(b,{paddingTopLeft:[25,65],paddingBottomRight:[25,25],maxZoom:15,animate:false});}
 const locationLayer=R.layerGroup().addTo(map);
 let disposed=false,locating=false;
 function locationMessage(message){const feedback=el.querySelector('.filter-feedback');clearTimeout(feedbackTimer);feedback.textContent=message;feedback.classList.add('visible');feedbackTimer=setTimeout(()=>feedback.classList.remove('visible'),7000)}
 function locate(){
   if(locating)return;
   if(!window.isSecureContext){locationMessage('Location needs a secure connection. Open the private website to use it.');return}
   if(!navigator.geolocation){locationMessage('Location is not available in this browser.');return}
   selectVenue(null);
   const button=el.querySelector('[data-control="locate"]');
   locating=true;button.disabled=true;button.setAttribute('aria-busy','true');locationMessage('Finding your location…');
   const finish=()=>{locating=false;button.disabled=false;button.removeAttribute('aria-busy')};
   navigator.geolocation.getCurrentPosition(({coords})=>{
     if(disposed)return;finish();locationLayer.clearLayers();
     const position=[coords.latitude,coords.longitude];
     R.circle(position,{radius:coords.accuracy,color:token('c4'),weight:1,fillColor:token('c5'),fillOpacity:0,interactive:false}).addTo(locationLayer);
     R.marker(position,{icon:R.divIcon({className:'user-location',html:'<b></b>',iconSize:[18,18],iconAnchor:[9,9]}),title:'Your location',zIndexOffset:2000}).addTo(locationLayer);
     map.setView(position,16);locationMessage(`Your location · accurate to about ${Math.round(coords.accuracy)} m`);
   },error=>{if(disposed)return;finish();locationMessage(error.code===1?'Location access is off. Allow location for this site in your browser settings, then try again.':error.code===3?'Finding your location took too long. Tap My location to try again.':'Your location is unavailable. Tap My location to try again.');},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
 }
 const panel=mountPlacePanel(el.querySelector('.selection'),R,()=>selectVenue(null));
 function selectVenue(item){selected=item;panel.select(item);draw();}
 function chapterOpacity(i){return 1;}
 function venueItems(){
   if(foodMode)return uniqueVenues([...steps.filter(s=>point(s)&&!['food','coffee'].includes(s.kind)).map(s=>({record:references.get(s.place),place:byId.get(s.place),point:point(s)})).filter(i=>i.record&&i.place),...foodItems]);
   const candidates=steps.filter(s=>point(s)).map(s=>({record:references.get(s.place),place:byId.get(s.place),point:point(s),chapter:chapterFor(s),number:s.number}));
   candidates.push(...pizzaRecords.map(item=>({...item,record:references.get(item.record.id)})),...referenceItems);
   return uniqueVenues(candidates).filter(({record})=>enabled[record.categories.some(name=>['Food','Coffee','Pizza'].includes(name))?'food':'sites']&&(!record.categories.includes('Pizza')||enabled.pizza));
 }
 function draw(){pins.clearLayers();routes.clearLayers();
 if(enabled.route&&day.routePaths)for(const path of day.routePaths){const ci=path.chapter;R.polyline(path.coordinates,{color:token('c5'),weight:5,opacity:1,interactive:false}).addTo(routes);R.polyline(path.coordinates,{color:foodMode?token('c3'):colour(ci),weight:2.5,dashArray:path.optional?'2 6':null,opacity:1,interactive:false}).addTo(routes);}
 let prev=null;if(enabled.route&&!day.routePaths)for(const s of steps){const ci=chapterFor(s),coords=[];if(prev&&s.start)coords.push([prev.lat,prev.lng]);if(s.start)coords.push([s.start.lat,s.start.lng]);if(s.end)coords.push([s.end.lat,s.end.lng]);prev=s.end;if(coords.length>1){R.polyline(coords,{className:'chapter-route-halo',color:token('c5'),weight:5,opacity:1,interactive:false}).addTo(routes);R.polyline(coords,{className:`chapter-route chapter-${ci}`,color:foodMode?token('c3'):colour(ci),weight:2.5,dashArray:s.optional?'2 6':null,opacity:1,interactive:false}).addTo(routes);}}
 const clusters=[];
 for(const item of venueItems()){
   const xy=map.latLngToLayerPoint([item.point.lat,item.point.lng]);
   const isPlanned=foodMode?!!item.foodChoice:planned(item);
   let cluster=map.getZoom()<18&&clusters.find(g=>g.planned===isPlanned&&g.xy.distanceTo(xy)<32);
   if(!cluster){cluster={xy,planned:isPlanned,items:[]};clusters.push(cluster)}cluster.items.push(item);
 }
 for(const cluster of clusters){
   const items=cluster.items,first=items[0],active=items.some(item=>venueKey(item.record)===selected?.key);
   const centre=[items.reduce((n,item)=>n+item.point.lat,0)/items.length,items.reduce((n,item)=>n+item.point.lng,0)/items.length];
   const opacity=Math.max(...items.map(item=>item.chapters?.some(i=>chapterOpacity(i)===1)||item.chapter===undefined?1:chapterOpacity(item.chapter)));
   R.marker(centre,{icon:markerIcon(items,active,opacity),title:items.length>1?`${items.length} nearby places; tap to zoom in`:first.place.name,zIndexOffset:active?1000:cluster.planned?100:0}).on('click',()=>{
     if(items.length>1){map.fitBounds(items.map(item=>[item.point.lat,item.point.lng]),{maxZoom:Math.min(18,map.getZoom()+2),paddingTopLeft:[45,45],paddingBottomRight:[45,45]});return}
     selectVenue({...first,key:venueKey(first.record)});
   }).addTo(pins);
 }
 }
 map.on('placeclick',event=>{
   const known=allReferenceItems.find(item=>item.record.google?.placeId===event.placeId);
   const record=known?.record||{id:`google:${event.placeId}`,google:{placeId:event.placeId},location:event.location,categories:[]};
   selectVenue({record,place:known?.place||{name:'Google Maps place'},key:venueKey(record)});
 });
 function drawTrains(){rails.clearLayers();if(!enabled.train)return;for(const r of transit.routes)R.geoJSON({type:'MultiLineString',coordinates:r.coordinates},{style:{className:'train-route',color:r.color,weight:1.6,opacity:.65},interactive:false}).addTo(rails);if(map.getZoom()>=14)for(const s of transit.stations)R.circleMarker([s.lat,s.lng],{radius:2.5,weight:1,color:token('c0'),fillColor:night?token('c2'):'#fff',fillOpacity:1}).bindTooltip(esc(s.name)).addTo(rails);}
 function updateFoodBar(){const bar=el.querySelector('.food-map-bar');bar.innerHTML=foodMode?`<span>Food options · ${foodItems.length}</span><a data-app-link href="?day=${day.date}&view=map">Show all places</a>`:`<a data-app-link href="?day=${day.date}&view=map&food=1">${icons.food}<span>All today’s food on map</span></a>`;modebar.hidden=foodMode;}
 function fitFood(){if(foodItems.length)fit(foodItems.map(i=>({start:i.point,end:i.point})));else fit();}
 function refresh(){updateFoodBar();el.querySelectorAll('[data-chapter]').forEach(b=>{const i=+b.dataset.chapter;b.setAttribute('aria-pressed',String(i===chapter));if(i>=0)b.style.setProperty('--chapter',colour(i))});draw();drawTrains();}
 map.on('zoomend',()=>{draw();drawTrains()});
 el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-chapter')){chapter=+b.dataset.chapter;selectVenue(null);refresh();if(chapter<0)fit();else{const section=steps.slice(...chapters[chapter].range);const destinations=section.filter(s=>!byId.get(s.place)?.categories.includes('hotels'));fit(destinations.length?destinations:section);}return}
 const c=b.dataset.control;if(c==='locate')locate();if(c==='plus')map.zoomIn();if(c==='minus')map.zoomOut();
 if(Object.hasOwn(enabled,c)){enabled[c]=!enabled[c];b.setAttribute('aria-pressed',String(enabled[c]));draw();drawTrains();const feedback=el.querySelector('.filter-feedback');feedback.textContent=`${b.title} ${enabled[c]?'on':'off'}`;feedback.classList.add('visible');clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>feedback.classList.remove('visible'),1400)}
 if(c==='full'){expanded=!expanded;onExpand(expanded);fitMapHeight();b.setAttribute('aria-label',expanded?'Exit full screen':'Full screen');b.setAttribute('aria-expanded',String(expanded));requestAnimationFrame(()=>map.invalidateSize())}
 },{signal:events.signal});
 const escape=e=>{if(e.key!=='Escape')return;if(!el.querySelector('.selection').hidden){selectVenue(null);}else if(expanded)el.querySelector('[data-control=full]').click()};
 document.addEventListener('keydown',escape);
 const resize=new ResizeObserver(()=>map.invalidateSize());resize.observe(el.querySelector('.map'));
 const layoutResize=new ResizeObserver(fitMapHeight);
 for(const node of [...shell,modebar,footer])if(node)layoutResize.observe(node);
 window.addEventListener('resize',fitMapHeight,{signal:events.signal});
 window.visualViewport?.addEventListener('resize',fitMapHeight,{signal:events.signal});
 refresh();if(foodMode)fitFood();else fit();
 function focusPin(pin){if(!pin)return;const place=byId.get(pin);const item=allReferenceItems.find(item=>item.record.id===pin)||(place?{record:place,place,point:journeyPoints[pin]}:null);if(!item)return;selectVenue({...item,key:venueKey(item.record)});if(item.point)fit([{start:item.point,end:item.point}]);}
 focusPin(pin);
 return {ready:map.ready,failure:map.failure,onHide(){if(expanded){expanded=false;onExpand(false);fitMapHeight();const b=el.querySelector('[data-control=full]');b.setAttribute('aria-label','Full screen');b.setAttribute('aria-expanded','false')}},setDay(nextSourceDay,nextChoices,nextTheme,nextPin,nextFoodFocus=false){const foodChanged=foodMode!==nextFoodFocus||day.date!==nextSourceDay.date;foodMode=nextFoodFocus;foodItems=dayFoodItems(nextSourceDay,nextFoodFocus);const nextKey=JSON.stringify(nextChoices);if(nextSourceDay.date!==day.date||nextKey!==choiceKey){day=normalizeDays([effectiveDay(nextSourceDay,nextChoices,data.mealChoices,data.places)])[0];choiceKey=nextKey;enabled.route=!!day.routePaths;steps=dayJourney(day,places,journeyPoints).steps;chapters=chapterRanges(day);locationLayer.clearLayers();chapter=-1;selectVenue(null);el.querySelector('.modebar').innerHTML=`<button data-chapter="-1" aria-pressed="true">Entire day</button>${chapters.map((c,i)=>`<button data-chapter="${i}" aria-pressed="false"><i></i>${c.short}</button>`).join('')}`;fitMapHeight();fit();refresh()}if(nextTheme!==(night?'dark':'light'))this.setTheme(nextTheme);if(foodChanged){selectVenue(null);refresh();fitMapHeight();if(foodMode)fitFood();else fit()}focusPin(nextPin);requestAnimationFrame(()=>map.invalidateSize())},setTheme(value){night=value==='dark';map.setTheme(value);refresh()},destroy(){if(disposed)return;disposed=true;panel.destroy();events.abort();clearTimeout(feedbackTimer);resize.disconnect();layoutResize.disconnect();document.removeEventListener('keydown',escape);map.remove();el.replaceChildren();}};

}

// Prefer reviewed listing identity so aliases and repeated hotel visits share a pin.
export function venueKey(record) {
 return record.google?.listingCid ? `cid:${record.google.listingCid}` : record.google?.placeId ? `google:${record.google.placeId}` : record.id;
}
export function uniqueVenues(candidates) {
 const venues=new Map();
 for(const item of candidates){
   if(!item.record||!item.place||!item.point)continue;
   const key=venueKey(item.record),existing=venues.get(key);
   if(existing){if(item.chapter!==undefined)existing.chapters.push(item.chapter);continue}
   venues.set(key,{...item,chapters:item.chapter===undefined?[]:[item.chapter]});
 }
 return [...venues.values()];
}

// Each presentation owns its request and status. Hidden compact completions cannot
// erase an expanded error; selection changes abort and discard the entire session.
export function mountPlacePanel(panel,runtime,onClose) {
 let session=null;
 function dispose(){session?.abort.abort();session=null;panel.replaceChildren();panel.hidden=true;panel.classList.remove('place-expanded');}
 function select(item){
   if(item?.key&&item.key===session?.item.key)return;
   dispose();if(!item)return;
   const current={item,abort:new AbortController(),mode:'compact',states:{}};session=current;
   const {place,record}=item;
   panel.hidden=false;
   const toolbar=document.createElement('div');toolbar.className='place-sheet-toolbar';
   const toggle=document.createElement('button');toggle.type='button';toggle.className='expand-place';
   toggle.textContent='More details';toggle.setAttribute('aria-expanded','false');
   const close=document.createElement('button');close.type='button';close.className='close-place';close.textContent='×';close.setAttribute('aria-label','Close place card');
   close.addEventListener('click',onClose);toolbar.append(toggle,close);
   const body=document.createElement('div');body.className='place-sheet-body';
   const google=!!runtime.showPlaceCard&&!!(record.google?.listingUrl||record.google?.placeId);
   for(const mode of ['compact','expanded']){
     const host=document.createElement('div');host.className='google-place-host';host.hidden=mode!=='compact';body.append(host);
     current.states[mode]={host,status:'idle',attempt:0};
   }
   panel.append(toolbar,body);
   if(place.meal_note){const evidence=document.createElement('p');evidence.className='place-meal-note';evidence.textContent=place.meal_note;body.prepend(evidence);}

   const link=()=>`<a href="${esc(listingURL(place,record))}" target="_blank" rel="noopener">Open in Google Maps</a>`;
   function local(host){host.innerHTML=`<article class="place-card"><h2>${esc(place.name)}</h2>${place.address?`<p>${esc(place.address)}</p>`:''}${place.description?`<p>${esc(place.description)}</p>`:''}${record.location?.precision?`<p class="location-note">${esc(record.location.precision)}</p>`:''}<div class="place-links">${link()}${record.location&&!['historical','removed_reference','temporarily_closed_reference'].includes(record.status)?`<a href="${esc(directionsURL(place,'walking',record))}" target="_blank" rel="noopener">Directions</a>`:''}</div></article>`;}
   async function load(mode){
     const state=current.states[mode],attempt=++state.attempt;
     state.status='loading';state.host.dataset.state='loading';state.host.replaceChildren();
     const note=document.createElement('p');note.className='google-place-status';note.textContent='Loading Google place details…';state.host.append(note);
     const requestHost=document.createElement('div');state.host.append(requestHost);
     const valid=()=>session===current&&state.attempt===attempt&&!current.abort.signal.aborted;
     try{
       await runtime.showPlaceCard(requestHost,record,place,{compact:mode==='compact',signal:current.abort.signal});
       if(!valid())return;
       note.remove();state.status='ready';state.host.dataset.state='ready';
     }catch(error){
       if(!valid())return;
       state.status='error';state.host.dataset.state='error';
       // Only controlled stage/code fields are logged, never URLs or provider payloads.
       console.warn('Google place panel failed',{venue:record.id,presentation:mode,stage:error.stage||'component',code:error.code||'unavailable'});
       state.host.innerHTML=`<article class="place-card"><h2>${esc(place.name)}</h2><p>Google details could not load. Try again or open this place in Google Maps.</p><div class="place-links"><button type="button" data-retry-place>Retry</button>${link()}</div></article>`;
       state.host.querySelector('[data-retry-place]').addEventListener('click',()=>load(mode));
     }
   }
   toggle.addEventListener('click',()=>{
     current.mode=current.mode==='compact'?'expanded':'compact';const expanded=current.mode==='expanded';
     panel.classList.toggle('place-expanded',expanded);toggle.setAttribute('aria-expanded',String(expanded));toggle.textContent=expanded?'Show map':'More details';body.scrollTop=0;
     for(const [mode,state] of Object.entries(current.states))state.host.hidden=mode!==current.mode;
     if(google&&current.states[current.mode].status==='idle')load(current.mode);
   });
   if(google)load('compact');else{for(const state of Object.values(current.states)){local(state.host);state.status='ready';state.host.dataset.state='ready';}}
 }
 return {select,destroy:dispose};
}

// Only the selected day's alternatives belong in food focus; repeated meals
// share one venue. Coordinates are sourced address estimates, not entrances.
export function dayFoodItems(sourceDay,scope=false) {
 const options=(sourceDay.phases||[]).flatMap(p=>p.stops||[]).filter(s=>!scope||scope===true||scope==='1'||s.step_id===scope).flatMap(s=>s.food_options||[]);
 const unique=new Map();
 for(const o of options){
  if(!Number.isFinite(o.location?.lat)||!Number.isFinite(o.location?.lng))continue;
  const key=`food:${o.title}:${o.address}`;
  if(unique.has(key))continue;
  const place={id:key,name:o.title,address:`${o.address}, ${o.city||'Chicago'}, IL`,description:`${o.food_type} · ★ ${o.rating}${o.budget?' · Cheaper':''}${o.convenience?' · Convenience':''}${o.timing_tag?' · '+o.timing_tag:''}`,meal_note:o.text,google_maps_url:o.url};
  unique.set(key,{record:{id:key,categories:['Food'],status:'active',location:o.location},place,point:o.location,foodChoice:true});
 }
 return [...unique.values()];
}
