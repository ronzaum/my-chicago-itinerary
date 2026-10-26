// Keep every day story within the approved shortened Thursday description.
export const DAY_STORY_LIMIT = {words:23, characters:128};
export const DAY_DESIGN = {
  '2026-10-30': { number: '30', month: 'October', title: 'IIT → Robie House → evening', story: 'Head south for boldness and a different side of Chicago. Come back for a quiet evening and easy food near the hotel.', palette: '14' },
  '2026-10-31': { number: '31', month: 'October', title: 'Unity Temple → Wright Home → West Loop', story: 'Ride out to leafy streets and the homes where big ideas began. Back in the city, see where the evening takes you.', palette: '10' },
  '2026-11-01': { number: '1', month: 'November', title: 'Art Institute → MCA → lake → New York', story: 'One more day for art and lake air. Enjoy the shoreline before the journey home.', palette: '01' }
};
export const KEYS = { theme: 'chicago-public-demo-theme-v1', choices: 'chicago-public-demo-choices-v1', day: 'chicago-public-demo-day-v1', todos:'chicago-public-demo-booking-todos-v1' };
// Stop purpose takes precedence over the category of its venue (e.g. hotel breakfast).
export function stopPurpose(step) {
  return step.purpose || (step.meal || step.kind==='food' ? 'meal' : step.kind==='hotel' || step.travel_end==='ord' || step.kind==='flight' ? 'practical' : 'sightseeing');
}
export function hasBookingDocument(place) {
  return !!place && !/cancelled|superseded/i.test(place.booking_status||'') &&
    !!(place.artifacts?.length || place.artifact_ids?.length || place.hasPrivateBooking);
}
export function bookingPlaceFor(step, data) {
  const place=data.places.find(p=>p.id===(step.booking_record||step.place));
  if(!hasBookingDocument(place))return null;
  if(step.booking_action===true)return place;
  if(stopPurpose(step)!=='sightseeing'||step.meal||step.kind==='walk')return null;
  return place.booking_kind==='admission'||place.booking_date ? place : null;
}
// Every application gets a complete role set; no previous day's optional role survives.
export function paletteDeclarations(palette, theme) {
  return palette[theme]+';--view-bg:var(--c5);--selected-day-bg:var(--c1);--meal-bg:var(--c2);'+
    (palette[theme].match(/--(?:view-bg|selected-day-bg|meal-bg):[^;]+/g)||[]).join(';');
}
export function bookingTaskFor(step, date, data) {
  const place=data.places.find(p=>p.id===(step.booking_record || step.place));
  if(!place || hasBookingDocument(place) || stopPurpose(step)!=='sightseeing' || ['crown-hall','mtcc','iit-campus'].includes(place.id) || step.kind==='walk') return null;
  if(step.kind==='food' && /hotel/i.test(place.category || '') && place.id!=='caa-hotel') return null;
  const action=data.bookingActions?.[place.id];
  if(!action || action.mealOnly && !step.meal) return null;
  const task=data.bookings.find(t=>t.id===action.taskId);
  const taskId=task?.id || place.id;
  return {id:`${date}:${taskId}`,date,place:place.id,taskId:task?.id,
    title:action.title || task?.title || `Book ${place.name}`,
    note:action.note || task?.note || '',url:task?.source || place.url,
    label:action.label || 'Booking'};
}
export function addBookingTodo(todos, task) {
  return task && !todos[task.id] ? {...todos,[task.id]:{...task,done:false}} : todos;
}
export function chicagoDate(now = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone:'America/Chicago', year:'numeric',month:'2-digit',day:'2-digit' }).format(now); }
export function resolveDay(days, requested, saved, now = new Date()) {
  return days.find(d => d.date === requested || d.id === requested)?.date || days.find(d => d.date === '2026-10-31')?.date || days.find(d => d.date === chicagoDate(now))?.date || days.find(d => d.date === saved)?.date || days[0]?.date;
}
export function resolveChoices(days, saved = {}, mealChoices = {}) {
  const validObject = saved && typeof saved === 'object' && !Array.isArray(saved);
  const values = validObject ? saved : {};
  const slots = values.__slots && typeof values.__slots === 'object' && !Array.isArray(values.__slots) ? values.__slots : {};
  const resolved = { ...values, __slots:{ ...slots } };
  for (const day of days) for (const phase of day.phases) for (const step of phase.stops) {
    const options = mealChoices[step.step_id] || [];
    const allowed = value => options.some(choice => choice.place === value);
    const semantic = slots[`${day.date}:${step.meal}`];
    if (['lunch','dinner'].includes(step.meal) && allowed(semantic)) resolved[step.step_id] = semantic;
    else if (!allowed(values[step.step_id])) delete resolved[step.step_id];
  }
  return resolved;
}
export function effectiveDay(day, choices = {}, mealChoices = {}, places = []) {
  const byId = new Map(places.map(p => [p.id, p]));
  let previousOriginal, previousEffective;
  const phases = day.phases.map(phase => ({ ...phase, stops:phase.stops.flatMap(original => {
    const choice = ['lunch','dinner'].includes(original.meal) && (mealChoices[original.step_id] || []).find(c => c.place === choices[original.step_id]);
    const selected = choice && byId.get(choice.place);
    let step = { ...original };
    const before = [];
    if (selected && selected.id !== original.place) {
      // The Athletic Association is both a building visit and the default lunch.
      if (original.place === 'caa-hotel' && original.meal === 'lunch') {
        before.push({
          ...original, step_id:`${original.step_id}-caa-visit`, kind:'visit', meal:null,
          title:'Chicago Athletic Association · Drawing Room',
          action:'Visit the public Drawing Room before lunch nearby.',
          detail:'The public lobby can be visited without staying at the hotel. Look at the restored woodwork and fireplaces.',
          optional:false, synthetic:true
        });
      }
      step = {
        ...original, originalPlace:original.originalPlace || original.place,
        place:selected.id, title:`${original.meal === 'lunch' ? 'Lunch' : 'Dinner'} · ${choice.label || selected.name}`,
        description:choice.why, action:choice.why, detail:choice.note, access:selected.access,
        travel_start:selected.id, travel_end:selected.id, mealChanged:true, routeChanged:true,
        connections:{}, walk_distance:'', travel_spec:choice.journey ? {...choice.journey} : {mode:original.travel_spec?.mode}, move:choice.journey?.note || null,
        nextJourney:choice.nextJourney,
        photos:[], photo:null, source:null
      };
      // A different venue must not inherit another restaurant's reservation.
      delete step.booking_record;
      delete step.artifact_ids;
      if ('artifact_ids' in selected) {
        step.booking_record = selected.id;
        step.artifact_ids = selected.artifact_ids;
      }
    }
    if (previousEffective?.mealChanged && original.kind === 'walk' && original.travel_start === previousOriginal?.place) {
      const start = byId.get(previousEffective.place);
      const end = byId.get(original.travel_end);
      const startName = start?.name || previousEffective.title;
      const endName = end?.name || original.travel_end;
      const sameAddress = start?.address && end?.address && start.address.trim().toLowerCase() === end.address.trim().toLowerCase();
      step = {
        ...step, title:`${startName} → ${endName}`,
        action:sameAddress ? `You are already at ${endName}. Any extra neighbourhood walk is optional.` : `Continue on foot from ${startName} to ${endName}.`,
        description:sameAddress ? `Dinner and your next stop are at the same address.` : `Walk from your chosen dinner to ${endName}.`,
        detail:sameAddress ? 'Go upstairs when you are ready, or take an optional walk around the neighbourhood.' : 'Use walking directions for this leg; the changed walk has no verified distance or time estimate.',
        optional:sameAddress ? true : original.optional,
        travel_start:previousEffective.place, routeChanged:true,
        connections:{}, walk_distance:'', travel_spec:{start:previousEffective.place,end:original.travel_end}, move:null
      };
    }
    if (previousEffective?.mealChanged && original.kind !== 'walk') {
      // A changed restaurant invalidates the following venue-specific station route.
      step = {...step, connections:{}, routeChanged:true, move:null,
        travel_spec:{mode:original.travel_spec?.mode,
          note:'Your meal choice changed the starting point. Open Directions for the current route from your location; the original restaurant’s station instructions and estimate do not apply.'}};
      const next=previousEffective.nextJourney;
      if(next?.to===original.place) step={...step,travel_spec:{...next},move:next.note,
        action:next.note,detail:'Return to the hotel after your chosen dinner.'};
    }
    previousOriginal = original;
    previousEffective = step;
    return [...before, step];
  }) }));
  return { ...day, phases };
}
export function effectiveSteps(day, choices, mealChoices, places) {
  return effectiveDay(day, choices, mealChoices, places).phases
    .flatMap(phase => phase.stops.map(step => ({ ...step, phase:phase.title })))
    .map((step, i) => ({ ...step, number:i+1 }));
}
export function connectionFor(step, previous) {
  const spec=step.travel_spec;
  if(spec?.from && spec.from===previous?.travel_end && spec.route_label) {
    return {text:spec.route_label+(spec.minutes?' · '+spec.minutes:''),note:spec.note,long:false,label:'',directions:null,railLegs:spec.rail_legs || []};
  }
  if (step.mealChanged || previous?.mealChanged || step.routeChanged || previous?.routeChanged) return null;
  const connection=step.connections?.[previous?.step_id || 'start'];
  if(!connection)return null;
  if(['train','transit'].includes(spec?.mode))return {...connection,text:[spec.route_label || 'Train',spec.minutes].filter(Boolean).join(' · '),railLegs:spec.rail_legs || []};
  if(/\bwalk\b/i.test(connection.text) && !['taxi','driving'].includes(spec?.mode) && Number.isFinite(connection.km) && connection.km>0) {
    return {...connection,text:`${walkingTimeEstimate(connection.km)} walk`};
  }
  return connection;
}
// A relaxed 3.2–4 km/h, with a small allowance for crossings; stops are extra.
export function walkingTimeEstimate(km, upperKm=km) {
  if(!Number.isFinite(km)||!Number.isFinite(upperKm)||km<=0||upperKm<km)return '';
  const low=Math.max(2,Math.ceil(km*15));
  const high=Math.max(low+2,Math.ceil(upperKm*18.75)+2);
  return `≈${low}–${high} min`;
}
export function directionsURL(place, mode, match) {
  const destination = place.navigationDestination || (place.address ? `${place.name}, ${place.address}` : Number.isFinite(place.lat) && Number.isFinite(place.lng) ? `${place.lat},${place.lng}` : place.name);
  return 'https://www.google.com/maps/dir/?' + new URLSearchParams({api:'1',destination,dir_action:'navigate',...(match?.google?.placeId?{destination_place_id:match.google.placeId}:{}),...(['walking','transit','driving'].includes(mode)?{travelmode:mode}:{})});
}
export function listingURL(place, match) {
  if(match?.google?.listingUrl && /^https:\/\/(?:www\.google\.com\/maps\/|maps\.app\.goo\.gl\/)/.test(match.google.listingUrl)) return match.google.listingUrl;
  return 'https://www.google.com/maps/search/?' + new URLSearchParams({api:'1',query:place.address?`${place.name}, ${place.address}`:place.name,...(match?.google?.placeId?{query_place_id:match.google.placeId}:{})});
}

// Bibliographic dates are publication dates, never a research/check timestamp.
export function citationFor(source, references = {}) {
  let host='';try{host=new URL(source.url).hostname.replace(/^www\./,'');}catch{}
  const record=references.articles?.[source.url] || {};
  return {
    author:source.author || record.author || '',
    title:record.title || source.title || 'Web page',
    publication:source.publication || record.publication || references.publishers?.[host] || host,
    published:source.published || record.published || 'n.d.'
  };
}
