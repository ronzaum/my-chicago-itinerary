import {mountTripMotion} from './trip-story.mjs?v=colour-swap-20261025';
import { inventoryPage, renderInventoryPage, setupInventory } from './inventory.mjs?v=demo-exact-v140';
import { categoriesFor } from './map/core.mjs?v=colour-swap-20261025';
import { DAY_DESIGN, KEYS, chicagoDate, resolveDay, resolveChoices, effectiveSteps, connectionFor, walkingTimeEstimate, citationFor, directionsURL, bookingTaskFor, addBookingTodo, stopPurpose, bookingPlaceFor, hasBookingDocument, paletteDeclarations } from './trip-core.mjs?v=default-oct31';
const $ = s => document.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL = value => { try { const u = new URL(value, location.href); return ['http:','https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
const ext = (url, label, cls = '') => safeURL(url) ? `<a class="${cls}" ${label==='Open original document'?'aria-label="Open ticket"':''} href="${esc(safeURL(url))}" target="_blank" rel="noopener">${label==='Open original document'?'<svg class="ticket-icon" viewBox="0 0 40 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><g transform="translate(0 .5)"><path d="M10 7V3h25v7M5 10h27v5a4 4 0 0 0 0 8v5H5v-5a4 4 0 0 0 0-8Z"/><path d="M24 11v16" stroke-dasharray="2 3"/></g></svg>':esc(label)}</a>` : '';
const read = (key, fallback = {}) => { try { const value = JSON.parse(localStorage.getItem(key)); return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback; } catch { return fallback; } };
const getString = key => { try { return localStorage.getItem(key); } catch { return null; } };
const save = (key, value) => { try { localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); return true; } catch { announce('This browser cannot save changes. They will last for this visit only.'); return false; } };
let mapController=null,mapGeneration=0,mapAttempt;
let data, byId, state, renderedQuery = location.search, scrollPositions = new Map(), noticeTimer;
const THEME_OVERRIDE = 'chicago-public-demo-theme-schedule-override-v1';
function themePeriod(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
  const hour=Number(parts.hour), date=new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00Z`);
  if(hour<8)date.setUTCDate(date.getUTCDate()-1);
  const scheduled=hour>=8&&hour<18?'light':'dark';
  return {theme:scheduled,key:`${date.toISOString().slice(0,10)}-${scheduled}`};
}
let themeOverride=read(THEME_OVERRIDE);
function currentTheme(now = new Date()) {
  const period=themePeriod(now);
  return themeOverride.period===period.key&&['light','dark'].includes(themeOverride.theme)?themeOverride.theme:period.theme;
}
let theme=currentTheme();
function syncScheduledTheme(){
  const next=currentTheme();
  if(next===theme||!data)return;
  theme=next;palette();mapController?.setTheme(theme);
}
let choices = read(KEYS.choices);
let todos = read(KEYS.todos);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const motion = () => reducedMotion.matches ? 'instant' : 'smooth';
// Consume the greeting even if reduced motion is later switched off. Shell
// renders and visibility changes never re-add this initial-markup class.
const wordmark = $('#home-link');
const finishGreeting = () => wordmark.classList.remove('fresh-wordmark');
wordmark.addEventListener('animationend',finishGreeting,{once:true});
if (reducedMotion.matches || wordmark.getAnimations().some(a => a.playState === 'finished')) finishGreeting();
// Render immediately; animation never owns routing, history or map lifecycle.
const pageAnimations = new Set(), focusPositions = new Map(), disclosures = new Map();
let unmountTripMotion = () => {}, finishViewSwap = () => {};
const motionValue = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
function cancelPageMotion() {
  for (const animation of pageAnimations) animation.cancel();
  pageAnimations.clear();
  finishViewSwap();
}
// Keep native <details>/<summary> semantics. Native keyboard activation produces
// this same click; only the height is animated, and a second click reverses it.
function toggleDisclosure(event) {
  const summary = event.target.closest('summary');
  const details = summary?.parentElement;
  if (!details?.matches('.meal-options, .reference-entry, .sources') || event.defaultPrevented) return;
  const previous = disclosures.get(details);
  const opening = !(previous ? previous.opening : details.open);
  if (reducedMotion.matches || !details.animate) return;
  event.preventDefault();
  const from = details.getBoundingClientRect().height;
  previous?.animation.cancel();
  details.open = true;
  const expanded = details.getBoundingClientRect().height;
  details.open = false;
  const collapsed = details.getBoundingClientRect().height;
  details.open = true;
  details.classList.add('disclosure-moving');
  const animation = details.animate([{height:`${from}px`},{height:`${opening ? expanded : collapsed}px`}],
    {duration:parseFloat(motionValue('--motion-disclosure')), easing:motionValue('--motion-settle')});
  disclosures.set(details,{animation,opening});
  animation.onfinish = () => {
    if (disclosures.get(details)?.animation !== animation) return;
    details.open = opening;
    details.classList.remove('disclosure-moving');
    disclosures.delete(details);
  };
}
function finishDisclosures() {
  for (const [details,{animation,opening}] of disclosures) {
    animation.cancel(); details.open=opening; details.classList.remove('disclosure-moving');
  }
  disclosures.clear();
}
// Slide the two real surfaces together: retaining the live map avoids blank
// canvas snapshots, remounts and camera resets. Only the outgoing view is inert.
function swapViews(outgoing, top) {
  const incoming = state.view === 'map' ? $('#map-view') : $('#main');
  const stage = $('.view-stage'), direction = state.view === 'map' ? 1 : -1;
  stage.classList.add('is-switching');
  incoming.classList.add('view-incoming');
  outgoing.classList.add('view-outgoing');
  outgoing.style.top = `${top - stage.getBoundingClientRect().top}px`;
  outgoing.inert = true;
  outgoing.setAttribute('aria-hidden','true');
  // Cleanup is shared by completion, another navigation and reduced-motion changes.
  const cleanup = () => {
    if (finishViewSwap !== cleanup) return;
    stage.classList.remove('is-switching');
    incoming.classList.remove('view-incoming');
    outgoing.classList.remove('view-outgoing');
    outgoing.style.removeProperty('top');
    outgoing.inert = false;
    outgoing.removeAttribute('aria-hidden');
    if (outgoing.id === 'main' && outgoing.hidden) outgoing.replaceChildren();
    finishViewSwap = () => {};
  };
  finishViewSwap = cleanup;
  const timing = {duration:parseFloat(motionValue('--motion-switch')), easing:motionValue('--motion-settle')};
  const enter = incoming.animate([{transform:`translateX(${direction * 48}px)`},{transform:'translateX(0)'}],timing);
  const leave = outgoing.animate([{transform:'translateX(0)'},{transform:`translateX(${-direction * 48}px)`}],timing);
  for (const animation of [enter,leave]) {
    pageAnimations.add(animation);
    animation.onfinish = () => {pageAnimations.delete(animation);if (animation === enter) cleanup();};
  }
}
function arrive() {
  if (reducedMotion.matches) return;
  const surface = $('#main').hidden ? $('#map-view') : $('#main');
  // Opacity alone on maps/menu/journal avoids moving controls or fixed overlays.
  const still = surface.id === 'map-view' || ['inventory','journal'].includes(state.page);
  const animation = surface.animate([
    {transform:still ? 'none' : 'translateY(12px)'},
    {opacity:1, transform:still ? 'none' : 'translateY(0)'}
  ], {duration:parseFloat(motionValue('--motion-page')), easing:motionValue('--motion-settle')});
  pageAnimations.add(animation);
  animation.onfinish = () => pageAnimations.delete(animation);
}
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) { finishGreeting(); cancelPageMotion(); finishDisclosures(); }
});
const day = () => data.days.find(d => d.date === state.day);
const design = () => DAY_DESIGN[state.day];
const steps = () => effectiveSteps(day(), choices, data.mealChoices, data.places);
const dayName = () => `${design().number} ${design().month}`;
const fullDayName = () => {
  const date = new Date(state.day + 'T12:00:00Z');
  const weekday = new Intl.DateTimeFormat('en-GB', {weekday:'long', timeZone:'UTC'}).format(date);
  const n = Number(design().number), suffix = n === 1 ? 'st' : n === 31 ? 'st' : 'th';
  return `${weekday}, ${n}${suffix} of ${design().month} ${date.getUTCFullYear()}`;
};
const urlFor = (params = {}) => '?' + new URLSearchParams({day:state.day, ...params});
const link = (params, text, cls='') => `<a class="${cls}" href="${esc(urlFor(params))}" data-app-link>${text}</a>`;
const detailParams = step => ({step:step.step_id, ...(step.booking_record ? {place:step.booking_record} : step.place && (step.kind !== 'walk' || step.travel_start === step.travel_end || ['lakefront','heurtley-house'].includes(step.place)) ? {place:step.place} : {})});
function visitType(step) {
  if(step.travel_end === 'ord' || byId.get(step.booking_record)?.entity_type === 'flight') return {key:'flight',name:'flight'};
  if(step.kind==='food' || step.meal) return {key:'food',name:'food'};
  if(step.kind==='hotel') return {key:'hotels',name:'hotel'};
  const place=byId.get(step.place);
  if(step.kind==='walk' && /\bstore\b/i.test(step.title)) return {key:'shops',name:'shop'};
  if(!place || step.kind==='walk' && (!detailParams(step).place || !categoriesFor(place).includes('shops'))) return {key:'walking',name:'walk'};
  const key=categoriesFor(place)[0];
  return {key,name:({hotels:'hotel',coffee:'food',food:'food',shops:'shop',evening:'evening'})[key] || 'visit'};
}
const MOON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M14.5 3a9.2 9.2 0 1 0 6.3 13.2c-7.1 1.7-11.3-5.6-6.3-13.2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="m19 3.5 .7 1.8 1.8.7-1.8.7L19 8.5l-.7-1.8-1.8-.7 1.8-.7Z" fill="currentColor"/></svg>';
const SUN = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><g fill="currentColor"><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="2.8" r="1.4"/><circle cx="12" cy="21.2" r="1.4"/><circle cx="2.8" cy="12" r="1.4"/><circle cx="21.2" cy="12" r="1.4"/><circle cx="5.5" cy="5.5" r="1.4"/><circle cx="18.5" cy="18.5" r="1.4"/><circle cx="5.5" cy="18.5" r="1.4"/><circle cx="18.5" cy="5.5" r="1.4"/></g></svg>';
const MAP_ICON = '<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 5.5 5.5-2 6 2 5.5-2v15l-5.5 2-6-2-5.5 2zM9 3.5v15m6-13v15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="sr-only">Map</span>';
const DIRECTIONS_ICON = '<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19v-7a4 4 0 0 1 4-4h10m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="sr-only">Directions</span>';
const targetPlace = step => {
  if(step.travel_end === 'ord')return {name:'O’Hare International Airport',address:'Chicago, IL'};
  const id=step.kind==='walk' ? step.travel_start || step.place : step.place;
  return byId.get(id) || data.points?.[id] || byId.get(step.place);
};
const directionMode = step => ['train','transit'].includes(step?.travel_spec?.mode) ? 'transit' : step?.travel_spec?.mode==='taxi' ? 'driving' : step ? 'walking' : undefined;
const takeThere = step => { const p=targetPlace(step); return p ? ext(step.directions_url || directionsURL(p,directionMode(step)), step.kind==='walk'&&step.travel_start!==step.travel_end?'Go to walk start':'Take me there', 'primary') : link({view:'map'},'See route','primary'); };
function bookingLink(step) {
 if(!['robie-house','unity-temple','home-studio','art-institute','mca-museum'].includes(step.place))return '';
 return '<button type="button" class="booking-link" data-private-document aria-label="About this ticket"><svg class="ticket-icon" viewBox="0 0 40 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><g transform="translate(0 .5)"><path d="M10 7V3h25v7M5 10h27v5a4 4 0 0 0 0 8v5H5v-5a4 4 0 0 0 0-8Z"/><path d="M24 11v16" stroke-dasharray="2 3"/></g></svg></button>';
}
function timelineCue(step) {
  if(step.overview) return step.overview;
  if(step.synthetic && step.place==='caa-hotel') return 'Architecture stop · Cobb interiors · free lobby';
  if(step.mealChanged) {
    const detail=data.stopDescriptions.meal_details[step.place];
    return [step.meal==='lunch'?'Lunch':'Dinner',detail].filter(Boolean).join(' · ');
  }
  return data.stopDescriptions.steps[step.step_id] || '';
}

function announce(message) {
  clearTimeout(noticeTimer);
  $('#notice').textContent = message;
  $('#notice').hidden = false;
  noticeTimer = setTimeout(() => { $('#notice').hidden = true; }, 6500);
}
function readLocation() {
  const q = new URL(location.href).searchParams;
  return {day:resolveDay(data.days,q.get('day'),getString(KEYS.day)),view:q.get('view') === 'map' ? 'map' : 'day',place:q.get('place'),step:q.get('step'),page:q.get('page'),returnPage:['reference','bookings','cover'].includes(q.get('fromPage'))?q.get('fromPage'):null,returnView:q.get('from')==='map'?'map':'day'};
}
function themeControl(){return `${theme === 'dark' ? SUN : MOON}<span>${theme === 'dark' ? 'Day mode' : 'Night mode'}</span>`;}
function palette() {
  document.documentElement.dataset.referencePalette = design().palette;
  document.documentElement.style.cssText = paletteDeclarations(data.palettes[design().palette],theme);
  const deep = data.palettes[design().palette].inventoryDark || data.palettes[design().palette].light.match(/--c0:([^;]+)/)[1];
  document.documentElement.style.setProperty('--day-deep',deep);
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  $('meta[name="theme-color"]').content = getComputedStyle(document.documentElement).getPropertyValue('--c0').trim();
  const toggle=$('#theme');
  if(toggle){toggle.innerHTML=themeControl();toggle.setAttribute('aria-label',`Switch to ${theme === 'dark' ? 'day' : 'night'} mode`);}
}
function renderShell() {
  palette();
  document.body.classList.toggle('inventory-open',inventoryPage(state.page) && !state.place);
  document.body.classList.toggle('reference-open',state.page==='reference' && !state.place);
  document.body.classList.toggle('journal-open',state.page==='journal' && !state.place);
  for(const a of document.querySelectorAll('[aria-label="Open inventory"]')) {a.href=urlFor(state.page==='inventory'?{view:state.returnView}:{page:'inventory',from:state.view});a.setAttribute('aria-expanded',String(state.page==='inventory'));}
  // Keep date links mounted so keyboard focus and palette transitions survive renders.
  if (!$('#days').children.length) $('#days').innerHTML = data.days.map(d => `<a data-day="${d.date}" data-app-link aria-label="${DAY_DESIGN[d.date].number} ${DAY_DESIGN[d.date].month}">${DAY_DESIGN[d.date].number}</a>`).join('');
  for (const a of $('#days').children) {
    a.href = `?day=${a.dataset.day}&view=${state.view}`;
    if (a.dataset.day === state.day) a.setAttribute('aria-current','date'); else a.removeAttribute('aria-current');
  }
  const isDetail = state.place || state.step || state.page;
  $('#view-switch').hidden = !!isDetail;
  $('#view-switch').dataset.activeView = state.view;
  for (const a of document.querySelectorAll('[data-view]')) {
    a.href = urlFor({view:a.dataset.view});
    a.setAttribute('data-app-link','');
    if (a.dataset.view===state.view) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
  }
  $('#journal-link').href=urlFor({page:'journal'});
  if(state.page==='journal' && !state.place) $('#journal-link').setAttribute('aria-current','page'); else $('#journal-link').removeAttribute('aria-current');
  $('#home-link').href=urlFor(); $('#home-link').setAttribute('data-app-link','');
  $('#app-footer a').href=urlFor({page:'bookings'}); $('#app-footer a').textContent='Tickets & bookings';
  $('#main').hidden = !isDetail && state.view === 'map';
  $('#map-view').hidden = !!isDetail || state.view !== 'map';
  $('#map-view').setAttribute('aria-label',`${fullDayName()} map`);
  document.title = 'Chicago itinerary · ' + dayName();
  save(KEYS.day,state.day);
}
function transfer(step, previous) {
  const connection = previous ? connectionFor(step, previous) : null;
  const usable = connection && !/^Same place/i.test(connection.text);
  const stroll=step.travel_spec?.walk_km_range ? walkingTimeEstimate(...step.travel_spec.walk_km_range)+' stroll' : '';
  if(!usable && !stroll) return '';
  const legs = usable ? connection.railLegs || [] : [];
  const summary = legs.length ? `${legs.length === 1 ? legs[0].line : 'Train'} · ${step.travel_spec?.minutes || connection.text.split(' · ').pop()}` : usable ? connection.text : '';
  const rail = legs.map(leg => `${leg.transfer ? `<span class="rail-transfer">${esc(leg.transfer.replace(/^Walk from /, 'Walk ').replace(' to ', ' → '))}</span>` : ''}<span class="rail-leg">${legs.length > 1 ? `${esc(leg.line)}: ` : ''}${esc(leg.board)} → ${esc(leg.exit)}</span>`).join('');
  return `<div class="transfer"><div class="transfer-heading"><span class="transfer-text">${esc(summary)}</span></div>${rail}${stroll?`<span class="rail-leg">${esc(stroll)}</span>`:''}</div>`;
}

function mealOptions(step) {
  if(step.food_options?.length)return `<details class="meal-options"><summary aria-label="${step.food_options.length} food options"><svg class="nav-icon food-options-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3v5a3 3 0 0 0 6 0V3M8 3v18M19 21V3c-3 2-4 5-4 9h4"/></svg><span>${step.food_options.length}</span></summary><div class="food-map-action row-actions">${link({view:'map',food:step.step_id},MAP_ICON+'<span>Show these food options on map</span>')}</div><p class="food-meta">Convenience = practical fallback, not a recommendation for your taste or design priorities. Cheaper = lower cost.</p>${step.food_options.map(o=>`<div class="meal-choice"><div class="food-choice-copy"><div class="food-line"><strong>${esc(o.title)}</strong>${o.budget?'<span class="food-budget">Cheaper</span>':''}${o.convenience?'<span class="food-budget" title="Practical fallback, not selected for your taste or design priorities">Convenience</span>':''}${o.timing_tag?`<span class="food-budget">${esc(o.timing_tag)}</span>`:''}</div><p class="food-meta">${esc(o.food_type)} · <span class="food-rating">★ ${esc(o.rating)}</span></p></div><div class="food-choice-actions row-actions"><button type="button" aria-label="Details for ${esc(o.title)}" aria-expanded="false" data-food-details><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 11v6m0-10v1"/></svg></button>${o.url?ext('https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(o.title+', '+o.address+', '+o.city+', IL'),'Directions').replace('>Directions</a>',` aria-label="Directions to ${esc(o.title)}">${DIRECTIONS_ICON}</a>`):''}</div><p class="food-expanded-copy" hidden>${esc(o.text)}</p></div>`).join('')}</details>`;
  if(!['breakfast','lunch','dinner'].includes(step.meal))return '';
  const options=data.mealChoices[step.step_id]||[];
  if(!options.length)return '';
  const selected=choices[step.step_id]||options[0].place;
  return `<details class="meal-options"><summary>Food alternatives</summary><fieldset><legend class="sr-only">Choose ${esc(step.meal)}</legend>${options.map(o=>`<label class="meal-choice"><input type="radio" name="${step.step_id}" value="${esc(o.place)}" data-meal="${step.step_id}" ${o.place===selected?'checked':''}><span><strong>${esc(o.label||byId.get(o.place)?.name)}</strong><span>${esc(o.why)}</span><small>${esc(o.note)}</small></span></label>${link({place:o.place},'Details & website','meal-detail')}`).join('')}</fieldset></details>`;
}

function finalFlightStep(){return "";}
function airportSummary(){return "";}
function dayHeader() {
  if(state.day==='2026-11-01') return '';
  return `<h1 class="day-date">${fullDayName()}</h1>${state.day==='2026-11-01'?'':`<p class="day-story">${esc(design().story)}</p>`}`;
}
function stopActions(s,{closed=false}={}) {
  if(s.food_options?.length)return '';
  if(s.purpose==='practical'&&!s.place)return '<div class="row-actions"><button data-private-document>Private details</button></div>'; 
  if(s.step_id==='sunday-airport')return `<div class="row-actions">${ext(s.directions_url,'Directions to Terminal 5').replace('>Directions to Terminal 5</a>',`>${DIRECTIONS_ICON}<span>Terminal 5</span></a>`)}</div>`;
  const p=targetPlace(s),booking=s.step_id?bookingLink(s):'';
  const navigation=closed?'':p?ext(s.directions_url || directionsURL(p,directionMode(s)),'Directions').replace('>Directions</a>',`>${DIRECTIONS_ICON}</a>`):'';
  return `<div class="row-actions${booking?' has-booking':''}">${link({view:'map',...((s.place || s.travel_end)?{pin:s.place || s.travel_end}:{})},MAP_ICON)}${navigation}${booking}</div>`;
}
function stopCard(s,previous=null,inMap=false) {

  const type=visitType(s);
  // The overview carries only the practical cue; full prose stays on the stop page.
  const cue=timelineCue(s);
  return `<article class="timeline-stop" data-purpose="${stopPurpose(s)}" data-type="${type.key}" data-optional="${!!s.optional}" id="stop-${s.step_id}">${inMap?'':transfer(s,previous)}${link({...detailParams(s),...(inMap?{from:'map'}:{})},`<div class="stop-copy"><div class="stop-heading"><h2>${esc(s.place==='lake-towers'?'Mies’s Lake Shore Drive towers':s.title)}</h2></div>${cue||s.optional?`<p class="stop-meta"><span class="stop-cue">${s.optional?'Optional · ':''}${esc(cue)}</span></p>`:''}</div>`,'stop-row')}${stopActions(s)}${mealOptions(s)}</article>`;

}
function departureGoodbye() {
  return `<section class="departure-goodbye cinema-goodbye" aria-label="A playful flight home from Chicago">
<label class="goodbye-pause"><input type="checkbox" aria-label="Pause farewell animation"><span class="pause-symbol" aria-hidden="true">Ⅱ</span><span class="play-symbol" aria-hidden="true">▷</span></label>
<svg class="takeoff-scene" viewBox="0 0 440 340" role="img" aria-label="A smiling blond traveller sits in a white toy plane. It accelerates along a runway, lifts above Chicago into clouds, and rushes off to the right.">
<defs>
<filter id="takeoff-blur" x="-40%" width="180%"><feGaussianBlur stdDeviation="9 0.4"/></filter>
<g id="takeoff-skyline"><path d="M-80 265V210H-45V180H-20V213H0V150H18V120H30V98H45V115H60V150H76V224H92V170H109V148H128V170H143V225H162V174Q176 154 190 174V226H200V174Q214 154 228 174V230H244V199H270V224H282L300 125H325L347 228H370V185H394V215H440V265Z"/><path d="M30 100V75M45 116V72M303 127V99M322 127V98" fill="none" stroke="currentColor" stroke-width="3"/><path d="m300 139 30 30-37 36 45 25m-14-91-28 30 38 36-48 25" fill="none" stroke="var(--c1)" stroke-width="3"/><path d="M162 184h28m10 0h28m-66 10h28m10 0h28m-66 10h28m10 0h28" fill="none" stroke="var(--c1)" stroke-width="3"/></g>
<g id="puffy-cloud"><path d="M-40 12C-63 12-61-15-42-16c-3-24 29-32 39-12 18-19 44-7 41 12 26-2 29 28 6 28Z" fill="#fff"/></g>
</defs>
<g class="takeoff-clouds" opacity=".85"><use href="#puffy-cloud" transform="translate(58 52) scale(.7)"/><use href="#puffy-cloud" transform="translate(288 88) scale(1.1)"/><use href="#puffy-cloud" transform="translate(470 28) scale(.85)"/><use href="#puffy-cloud" transform="translate(600 140) scale(1.25)"/></g>
<g class="takeoff-ground"><g class="city-pan" fill="var(--c0)" color="var(--c0)" opacity=".65"><use href="#takeoff-skyline"/><use href="#takeoff-skyline" x="450"/></g><g class="city-smear" fill="var(--c0)" color="var(--c0)" filter="url(#takeoff-blur)" opacity="0"><use href="#takeoff-skyline"/><use href="#takeoff-skyline" x="450"/></g><path d="M0 268Q160 257 440 268V340H0Z" fill="var(--c0)"/><g class="runway-lines" stroke="#fff" stroke-width="4" stroke-dasharray="35 30" opacity=".5"><path d="M-500 303H950"/></g></g>
<g class="ground-crew" transform="translate(350 267)" stroke="var(--c0)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M-6 15-9 36m17-21 8 21"/><path d="M-13 35h9m14 0h10" stroke="#fff" stroke-width="4"/><path d="M-9-5h18l5 23h-28Z" fill="var(--c3)"/><path d="M-9 0-22-12m31 12 17-16" stroke="#fff" stroke-width="5"/><path d="M-22-12-27-22m53 6 5-13" stroke="#FF143C" stroke-width="4"/><circle cy="-17" r="9" fill="#fff"/><path d="M-10-20q10-16 20 0Z" fill="var(--c3)"/><path d="M-3-16h.1m6 0h.1m-6 5q3 3 6 0"/><g class="crew-go"><path d="M-28-69h56q7 0 7 7v20q0 7-7 7H8L0-25l-2-10h-26q-7 0-7-7v-20q0-7 7-7Z" fill="#fff"/><text x="0" y="-47" text-anchor="middle" fill="var(--c0)" stroke="none" font-size="18" font-family="Trip Puff Open, sans-serif">GO!</text></g></g>
<g class="plane-flight"><g class="toy-plane" stroke="#001F7A" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
<g class="plane-wheels"><path d="M-54 19v17M47 19v17"/><circle cx="-54" cy="37" r="6" fill="#001F7A"/><circle cx="47" cy="37" r="6" fill="#001F7A"/></g>
<path d="m-77-5-25-49 22 3 33 49" fill="#fff"/><path d="M-99-9Q-63-18 24-18L53-31Q69-31 79-13L100-5Q117 8 99 16Q57 29-43 23L-93 10Z" fill="#fff"/>
<path d="m-17 5-31 46 22 1L25 8" fill="#fff"/><path d="m-81 0-27 18 12 6 41-11" fill="#fff"/>
<path d="m58-24 12 0 12 14-26-1Z" fill="#99B2FF"/>
<rect x="-48" y="-10" width="30" height="28" rx="11" fill="#99B2FF"/>
<!-- The traveller is seated inside the cabin window. -->
<path d="M-44 16q9-12 22 0" fill="#144FFF"/><ellipse cx="-33" cy="1" rx="8" ry="10" fill="#E4B39D" stroke-width="1.3"/>
<path d="M-41 0q-5-13 6-13l3-4 3 5q10-1 5 14l-4-8-5 3-4-3Z" fill="#E1BA64" stroke-width="1.3"/>
<path d="M-36 1h.2m6 0h.2m-6 5q3 3 6 0" fill="none" stroke-width="1.4"/>
<rect x="-8" y="-9" width="18" height="20" rx="7" fill="#99B2FF"/><rect x="22" y="-9" width="18" height="20" rx="7" fill="#99B2FF"/>
<path d="M64 16h28" opacity=".3"/><g class="plane-beacon" fill="#FF143C" stroke="none"><circle cx="-6" cy="-19" r="3"/><circle cx="-26" cy="50" r="3"/><circle cx="-97" cy="-49" r="2.5"/></g>
</g></g>
<g class="foreground-clouds"><use href="#puffy-cloud" transform="translate(40 260) scale(1.6)"/><use href="#puffy-cloud" transform="translate(390 218) scale(1.25)"/></g>
<circle class="swirl-cover" cx="220" cy="170" r="1" fill="#EDF2FF"/>
<g class="swirl-wipe" fill="none" stroke="#EDF2FF" stroke-width="22" stroke-linecap="round"><path d="M220 170c0-14 24-14 24 6s-48 36-60 0 32-78 80-48 45 108-24 130-142-42-120-120 140-126 219-41 40 208-84 242-262-88-222-240S300-91 436 58 477 411 254 453"/></g>
</svg>
<div class="cinema-end"><h2>Bye Bye Chicago</h2><p class="cinema-dedication">Dedicated to my three teachers,<br>Frank, Mies &amp; Virgil.</p></div>
</section>
`;
}

function renderDay() {
  const all=steps();
  let html = `<header class="day-head"><h1 class="day-date">${fullDayName()}</h1><p class="day-story">${esc(design().story)}</p></header>`;
  
  html+='<section class="timeline" aria-label="Day timeline">';
  for(let i=0;i<all.length;i++)html+=stopCard(all[i],all[i-1]);
  if(state.day==='2026-11-01') html+=`${finalFlightStep()}`;
  html+='</section>';
  if(state.day==='2026-11-01') html+=departureGoodbye();
  $('#main').innerHTML=html;
}
function sourceLinks(sources) {
  const unique=[...new Map((sources||[]).filter(s=>safeURL(s.url)).map(s=>[s.url,s])).values()];
  return unique.length ? `<details class="sources"><summary>References</summary>${unique.map(s=>{
    const c=citationFor(s,data.references);
    return `<p class="reference">${c.author?`${esc(c.author)}. `:''}<cite>${ext(s.url,c.title)}</cite>. <span>${esc(c.publication)}</span>, ${esc(c.published)}${c.published.endsWith('.')?'':'.'}</p>`;
  }).join('')}<p class="fine">n.d. = publication date not verified. Research checked ${esc(/^\d{4}-\d{2}-\d{2}$/.test(data.checked||'') ? new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(data.checked+'T12:00:00Z')) : data.checked || '16 September 2026')}.</p></details>` : '';
}

function factsSection(title, value) {
  if (!value || Array.isArray(value)&&!value.length) return '';
  return `<section class="fact-section"><h2>${title}</h2>${Array.isArray(value)?`<ul>${value.map(v=>`<li>${esc(v)}</li>`).join('')}</ul>`:`<p>${esc(value)}</p>`}</section>`;
}
function originalDocuments(){return '';}
function renderBookingDocument(p){$('#main').innerHTML=`<section class="booking-document"><h1>${esc(p.name)}</h1><p>Original documents stay private.</p><button type="button" data-private-document>About this booking</button>${link({page:'bookings'},'Back to bookings')}</section>`;}
function renderPDFPages(){}
function renderFlight(p) { renderBookingDocument(p); }
function renderDetail() {
  const all=steps(),s=state.step?all.find(s=>s.step_id===state.step):all.find(s=>s.place===state.place || s.booking_record===state.place);
  const p=state.place?byId.get(state.place):s?.place && (s.kind!=='walk'||s.travel_start===s.travel_end||['lakefront','heurtley-house'].includes(s.place))?byId.get(s.place):null;
  if (p && (p.entity_type==='flight' || state.page==='document')) { renderBookingDocument(p);return; }
  if (!p&&!s) { $('#main').innerHTML=`<section class="detail-head"><h1>Place not found</h1><p>This saved link no longer matches the trip.</p>${link({},'Back to the day')}</section>`; return; }
  const facts = p ? (data.details[p.id] || p.detail || {}) : {};
  const title = p?.name || s?.title;
  const photos = p ? data.galleries[p.id] || (s?.place===p.id?s.photos:[]) || [] : s?.photos || [];
  const sources=[...(facts.sources || []),...(p?.sources || [])];
  if(s?.source && data.sources[s.source])sources.push(data.sources[s.source]);
  document.title = `${title} · ${dayName()}`;
  const mapParams={view:'map',...(p?{pin:p.id}:s?.travel_end?{pin:s.travel_end}:{})};
  let html = `<a class="back-link" href="${esc(urlFor(state.returnPage?{page:state.returnPage}:{view:state.returnView}))}" data-app-link>${state.returnPage?(state.returnPage==='reference'?'Reference library':state.returnPage==='cover'?'The trip':'Bookings'):dayName()+' · '+(state.returnView==='map'?'Map view':'Day view')}</a><header class="detail-head"><p class="eyebrow">${dayName()} · ${esc(p?.category || 'Walking route')}</p><h1>${esc(title)}</h1><p>${esc(p?.address || s?.move || '')}</p></header><div class="detail-actions">${p?ext(directionsURL(p,directionMode(s)),'Take me there','primary'):takeThere(s)}${link(mapParams,'View on map')}${ext(p?.url,'Website')}</div>`;
  if(state.step && s) html+=`<section class="stop-context"><p class="eyebrow">${dayName()} · Visit plan</p><p>${esc(s.action)}</p>${s.detail||s.access?`<details><summary>Access & timing for this stop</summary>${s.access?`<p>${esc(s.access)}</p>`:''}${s.detail?`<p>${esc(s.detail)}</p>`:''}</details>`:''}</section>`;
  if(s?.travel_spec?.note) html+=`<section class="stop-context"><details><summary>Getting there · ${esc(s.travel_spec.route_label || 'Green Line')}${s.travel_spec.minutes?` · ${esc(s.travel_spec.minutes)}`:''}</summary><p>${esc(s.travel_spec.note)}</p><p>${(s.travel_spec.source_urls || []).map((u,i)=>ext(u,`Route source ${i+1}`)).join(' · ')} · ${ext('https://www.transitchicago.com/alerts/','CTA alerts')}</p></details></section>`;
  if(s) html+=mealOptions(s);
  if (photos.length) html+=`<div class="photo-strip" aria-label="Place photographs">${photos.slice(0,3).map((photo,i)=>`<figure><img src="${esc(safeURL(photo.url))}" alt="${esc(photo.caption || title)}" loading="lazy" decoding="async"><figcaption>${esc(photo.caption || title)} · ${ext(photo.source,'Source')}</figcaption></figure>`).join('')}</div>`;
  html += factsSection('What it is', facts.what || p?.description || s?.description || s?.action);
  html += factsSection('History', facts.history);
  html += factsSection('Look for', facts.architecture);
  html += factsSection('On the day', facts.visit?.length ? facts.visit : s?.detail || p?.note);
  if (p?.access) html += `<p class="entry-note">${esc(p.access)}</p>`;
  if(hasBookingDocument(p) && (!state.step || bookingPlaceFor(s,data))) html+=`<section class="fact-section"><h2>Booking</h2><p>${esc(p.booking_status || (p.artifact_ids.length?'Confirmation supplied':'Confirmation not supplied'))}</p>${p.booking_details?`<dl>${Object.entries(p.booking_details).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`:''}${originalDocuments(p)}${link({page:'reference'},'Reference library')}</section>`;
  html+=sourceLinks(sources);
  html+=`<div class="detail-bottom">${link({view:state.returnView},state.returnView==='map'?'Back to map':'Back to timeline')}</div>`;
  $('#main').innerHTML=html;
  $('#main').dataset.purpose=s?stopPurpose(s):'sightseeing';
}
function renderTodos() {
  const items=Object.values(todos).filter(t=>t&&typeof t.id==='string'&&typeof t.title==='string').sort((a,b)=>a.date.localeCompare(b.date));
  return `<section class="booking-todos" aria-label="Booking to-dos"><h2>To-dos</h2>${items.length?items.map(t=>`<article class="todo-item"><label><input type="checkbox" data-todo="${esc(t.id)}" ${t.done?'checked':''}><span>${esc(t.title)}<small>${esc(t.date)}${t.done?' · task complete':''}</small></span></label><p>${esc(t.note)}</p><div class="todo-actions">${ext(t.url,'Booking website')}<button data-remove-todo="${esc(t.id)}">Remove</button></div></article>`).join(''):'<p>Tap Add to to-dos on a stop to add it here.</p>'}<p class="fine">Saved in this browser. Adding or completing a task does not make a reservation.</p></section>`;
}
function renderBookings() {
  const flights=data.places.filter(p=>p.entity_type==='flight');
  const hotels=data.places.filter(p=>p.categories?.includes('hotels') || /hotel/i.test(p.category||''));
  $('#main').innerHTML=`<a class="back-link" href="${esc(urlFor())}" data-app-link>Back to the day</a><header class="detail-head"><p class="eyebrow">KEEP HANDY</p><h1>To-dos & bookings</h1><p>Save tasks here; keep your tickets below.</p></header>${renderTodos()}<section class="bookings-list">${[...flights,...hotels.filter(p=>'artifact_ids' in p)].map(p=>`<article><h2>${esc(p.name)}</h2><p>${esc(p.booking_status || '')}</p>${link({place:p.id,...(p.id==='flight-return'?{day:'2026-11-01'}:{})},p.entity_type==='flight'?'Flight details & reference':'Stay details & reference')}${originalDocuments(p)}</article>`).join('')}</section><details class="day-notes"><summary>Attractions & restaurants still to arrange</summary><p>Choosing a meal does not make a booking.</p><a href="?page=bookings" data-app-link>Open the booking checklist</a></details>`;
}
function showMapUnavailable() {
  $('.phone-app').classList.remove('chapter-expanded');
  const focus=new URL(location.href).searchParams.get('food');
  const steps=effectiveSteps(day(),choices,data.mealChoices,data.places);
  const meals=focus?steps.filter(s=>focus==='true'||s.step_id===focus).flatMap(s=>s.food_options||[]):[];
  const pin=new URL(location.href).searchParams.get('pin');
  const list=focus?meals.map(p=>({name:p.title||p.name,url:p.url})):steps.map(s=>byId.get(s.place)).filter(p=>p&&(!pin||p.id===pin)).map(p=>({name:p.name,url:directionsURL(p)}));
  $('#chapter-map').innerHTML='<div class="loading" role="status"><p>The embedded map is not connected in this preview. Explore these public places in Google Maps.</p>'+list.map(p=>'<p>'+ext(p.url,p.name)+'</p>').join('')+'<p>Accommodation locations and routes are omitted.</p></div>';

}
async function renderMap({retainDay=false} = {}) {
  const generation=++mapGeneration;
  mapAttempt?.abort();
  if (!retainDay) $('#main').replaceChildren();
  if(mapController){mapController.setDay(day(),choices,theme,new URL(location.href).searchParams.get('pin'),new URL(location.href).searchParams.get('food')||false);return}
  const attempt=new AbortController();mapAttempt=attempt;
  const current=()=>generation===mapGeneration&&!attempt.signal.aborted;
  $('#chapter-map').innerHTML='<p class="loading" role="status">Loading Google Maps…</p>';
  let candidate;
  const dispose=()=>candidate?.destroy();
  attempt.signal.addEventListener('abort',dispose,{once:true});
  try {
    const module=await import('./chapter-map.mjs?v=food-v2-20261026');
    const {loadGoogleRuntime,fetchGoogleConfig}=await import('./google-map-runtime.mjs?v=demo-exact-v140');
    // Configuration is intentionally never cached: Retry must recheck trial access.
    const config=await fetchGoogleConfig({signal:attempt.signal});
    if(!current())return;
    const runtime=await loadGoogleRuntime(config.googleMapsKey,{signal:attempt.signal});
    const resources=await module.loadMapResources();
    if(!current())return;
    candidate=module.mountChapterMap($('#chapter-map'),{data,sourceDay:day(),choices,theme,resources,runtime,
      pin:new URL(location.href).searchParams.get('pin'),foodFocus:new URL(location.href).searchParams.get('food')||false,
      onExpand:expanded=>{$('.phone-app').classList.toggle('chapter-expanded',expanded);if(expanded)$('#view-switch').scrollIntoView({block:'start',behavior:'instant'});}});
    await candidate.ready;
    if(!current()){dispose();return}
    mapController=candidate;
    // Authentication can fail after tiles first appear. Only this map's owner
    // may clear it; hidden pages and subsequent attempts cannot be replaced.
    candidate.failure?.then(error=>{
      if(error&&mapController===candidate){dispose();mapController=null;showMapUnavailable()}
    });
  } catch(error) {
    dispose();
    if(current())showMapUnavailable();
  } finally {
    attempt.signal.removeEventListener('abort',dispose);
    if(mapAttempt===attempt)mapAttempt=null;
  }
}

let unmountFarewell = () => {};
function mountFarewell(section) {
  if(!section)return () => {};
  let inView=false;
  const update=()=>section.classList.toggle('is-inview',inView&&!document.hidden);
  const observer=new IntersectionObserver(entries=>{inView=entries[0].intersectionRatio>=.5;update();},{threshold:[0,.5,1]});
  observer.observe(section);
  document.addEventListener('visibilitychange',update);
  return ()=>{observer.disconnect();document.removeEventListener('visibilitychange',update);};
}
function render({retainDay=false} = {}) {
  unmountFarewell();
  cancelPageMotion();
  finishDisclosures();
  unmountTripMotion();
  choices=resolveChoices(data.days,choices,data.mealChoices);
  mapGeneration++;
  mapAttempt?.abort();
  $('.phone-app').classList.remove('chapter-expanded');
  delete $('#main').dataset.purpose;
  renderShell();
  if(state.view!=='map'||state.place||state.step||state.page)mapController?.onHide();
  if(inventoryPage(state.page) && !state.place) renderInventoryPage(state.page);
  else if(state.page==='bookings') renderBookings();
  else if(state.place||state.step)renderDetail();
  else if(state.view==='map')renderMap({retainDay});
  else renderDay();
  renderPDFPages();
  unmountTripMotion = mountTripMotion($('#main .trip-story'));
  unmountFarewell = mountFarewell($('#main .cinema-goodbye'));
}
// Root/default Day links represent the same destination even when one omits
// optional query fields; normalize only the restoration key, never the URL.
function positionKey(query) {
  const q = new URLSearchParams(query);
  q.set('day',state.day);
  if (q.get('view') !== 'map') q.delete('view');
  q.sort();
  return q.toString();
}
function navigate(href,push=true) {
  const destination = new URL(href, location.href);
  // Repeated taps on the current date/view neither queue motion nor duplicate history.
  if (push && destination.search === renderedQuery) return;
  scrollPositions.set(positionKey(renderedQuery),scrollY);
  const active = document.activeElement;
  if (active?.matches('a[href]')) focusPositions.set(positionKey(renderedQuery),active.getAttribute('href'));
  const keepFocus = active?.closest('.appbar, #days, #view-switch');
  const previous = state;
  cancelPageMotion();
  const outgoing = previous.view === 'map' ? $('#map-view') : $('#main');
  const outgoingTop = outgoing.getBoundingClientRect().top;
  if(push)history.pushState(null,'',href);
  state=readLocation();renderedQuery=location.search;
  const switchView = !reducedMotion.matches && previous.day === state.day && previous.view !== state.view
    && !previous.page && !previous.place && !previous.step && !state.page && !state.place && !state.step;
  render({retainDay:switchView && state.view === 'map'});
  window.scrollTo({top:scrollPositions.get(positionKey(renderedQuery)) || 0,behavior:'instant'});
  const saved = focusPositions.get(positionKey(renderedQuery));
  const returnLink = saved && [...document.querySelectorAll($('#main').hidden ? '#map-view a[href]' : '#main a[href]')].find(a => a.getAttribute('href') === saved);
  const target = returnLink || ((!keepFocus || !push) && ($('#main').hidden ? $('#map-view') : $('#main h1') || $('#main')));
  if (target) { if (!target.matches('a[href]')) target.tabIndex=-1; target.focus({preventScroll:true}); }
  if (switchView) swapViews(outgoing,outgoingTop); else arrive();
}
function setupStickyViewSwitch() {
  const dates = document.querySelector('#days');
  const switcher = document.querySelector('#view-switch');
  // The date band's lower edge is also the point where the view switch sticks.
  const observer = new IntersectionObserver(([entry]) => {
    switcher.classList.toggle('is-stuck', entry.boundingClientRect.bottom <= 0);
  }, {threshold: 0});
  observer.observe(dates);
}
async function start() {
  try {
    const response=await fetch('app-data.json?v=meal-focus-20261026');if(!response.ok)throw Error('Trip data unavailable');
    data=await response.json();history.scrollRestoration='manual';byId=new Map(data.places.map(p=>[p.id,p]));state=readLocation();setupInventory({data,esc,ext,link,urlFor,state:()=>state,theme:()=>theme,themeControl,renderTodos,originalDocuments,citationFor});render();setupStickyViewSwitch();window.dispatchEvent(new Event('trip-rendered'));
    document.documentElement.classList.add('motion-ready');
    document.addEventListener('click',toggleDisclosure);
    document.addEventListener('click',e=>{
      if(e.target.closest('[data-retry-map]')){renderMap();return;}
      const bookingButton=e.target.closest('[data-booking-step]');
      if(bookingButton) {
        const step=steps().find(s=>s.step_id===bookingButton.dataset.bookingStep);
        const task=step&&bookingTaskFor(step,state.day,data); if(!task)return;
        if(todos[task.id]) {navigate(urlFor({page:'bookings'}));return;}
        todos=addBookingTodo(todos,task);
        const persisted=save(KEYS.todos,todos);
        bookingButton.textContent='View to-do';bookingButton.setAttribute('aria-label',`View to-do: ${task.title}`);
        if(persisted)announce('Added to your to-dos. Tap View to-do to open it.');
        return;
      }
      const remove=e.target.closest('[data-remove-todo]');
      if(remove){delete todos[remove.dataset.removeTodo];save(KEYS.todos,todos);render();return;}

      const a=e.target.closest('[data-app-link]');
      if(a&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&e.button===0){e.preventDefault();navigate(a.getAttribute('href'));return;}
    });
    document.addEventListener('error',e=>{
      if(e.target.tagName!=='IMG')return;
      const img=e.target,figure=img.closest('figure');
      if(img.hasAttribute('data-reference-photos')){
        const remaining=JSON.parse(img.dataset.referencePhotos||'[]'),next=remaining.shift();
        if(next){img.dataset.referencePhotos=JSON.stringify(remaining);img.src=next.url;img.alt=next.caption||img.alt;figure.querySelector('figcaption').innerHTML=`${esc(next.caption||img.alt)} · Photograph: ${ext(next.source,next.credit||citationFor({url:next.source},data.references).publication||'Source')}`;return;}
      }
      figure?.setAttribute('hidden','');
    },true);
    document.addEventListener('change',e=>{
      if(e.target.dataset.todo){const task=todos[e.target.dataset.todo];if(task){task.done=e.target.checked;save(KEYS.todos,todos);render();}return;}

      const key=e.target.dataset.meal;if(!key)return;
      if(!data.mealChoices[key]?.some(c=>c.place===e.target.value))return;
      choices[key]=e.target.value;choices.__slots={...(choices.__slots||{}),[state.day+':'+steps().find(s=>s.step_id===key).meal]:e.target.value};save(KEYS.choices,choices);
      if(state.view==='map'){history.replaceState(null,'',urlFor({view:'map',pin:e.target.value}));renderedQuery=location.search;}
      const top=scrollY;render();window.scrollTo({top,behavior:'instant'});
      const field=document.querySelector(`[data-meal="${key}"]`);if(field)field.closest('details').open=true;
      announce('Meal choice saved. Your day and map use this place.');
    });
    document.addEventListener('click',e=>{const b=e.target.closest('[data-food-details]');if(!b)return;const p=b.closest('.meal-choice').querySelector('.food-expanded-copy');p.hidden=!p.hidden;b.setAttribute('aria-expanded',String(!p.hidden));});
    function togglePreviewTheme(){theme=theme==='dark'?'light':'dark';themeOverride={theme,period:themePeriod().key};save(THEME_OVERRIDE,themeOverride);save(KEYS.theme,theme);palette();mapController?.setTheme(theme);}
    document.addEventListener('click',e=>{if(e.target.closest('#theme'))togglePreviewTheme();});
    window.addEventListener('preview-toggle-theme',togglePreviewTheme);
    window.addEventListener('popstate',()=>navigate(location.href,false));
    window.addEventListener('storage',e=>{if([KEYS.choices,THEME_OVERRIDE,KEYS.todos].includes(e.key)){choices=read(KEYS.choices);todos=read(KEYS.todos);themeOverride=read(THEME_OVERRIDE);theme=currentTheme();render();}});
    setInterval(syncScheduledTheme,1000);
    document.addEventListener('visibilitychange',syncScheduledTheme);
    window.addEventListener('focus',syncScheduledTheme);
    window.addEventListener('pageshow',syncScheduledTheme);
    syncScheduledTheme();
  } catch(error) {$('#main').innerHTML='<section class="detail-head"><h1>The trip could not load.</h1><p>Try reloading, or <a href="../planning/index.html">open your working plan</a>.</p></section>';console.error(error);}
}
start();
