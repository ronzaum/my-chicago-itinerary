const categoryIcon = body => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
export const CATEGORIES = {
  architecture: {name:'Architecture',icon:categoryIcon('<path d="m3 8 9-5 9 5H3Zm2 2v9m5-9v9m4-9v9m5-9v9M3 21h18"/>')},
  art: {name:'Art & museums',icon:categoryIcon('<rect x="3" y="4" width="18" height="16" rx="1"/><path d="m4 17 5-6 4 4 3-3 4 5"/><circle cx="16" cy="8" r="1"/>')},
  coffee: {name:'Cafés',icon:categoryIcon('<path d="M4 8h12v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8Zm12 1h2a3 3 0 0 1 0 6h-2M7 3v2m6-2v2"/>')},
  food: {name:'Food',icon:categoryIcon('<path d="M5 3v7m3-7v7m3-7v7M5 7h6m-3 3v11M19 3v18m0-18c-4 3-4 7 0 9"/>')},
  shops: {name:'Shops',icon:categoryIcon('<path d="M4 8h16v13H4V8Zm4 0V6a4 4 0 0 1 8 0v2"/>')},
  evening: {name:'Music & evenings',icon:categoryIcon('<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>')},
  hotels: {name:'Hotels',icon:categoryIcon('<path d="M3 5v16m18-9v9M3 17h18M3 9h7v8m0-7h8a3 3 0 0 1 3 3v4"/>')}
};

export function normalizeDays(days) {
  return days.map(day => ({
    ...day,
    stops: Array.isArray(day.stops) ? day.stops : (day.phases || [])
      .flatMap(phase => phase.stops || [])
      .filter(stop => stop.place)
      .map(stop => [stop.place, stop.title, stop.action])
  }));
}

export function categoriesFor(place) {
  if (Array.isArray(place.categories)) {
    // Keep older browser saves and metadata visible under the simplified categories.
    const categories = place.categories.map(c => c === 'outdoors' || c === 'other' ? 'architecture' : c).filter(c => Object.hasOwn(CATEGORIES, c));
    if (categories.length) return [...new Set(categories)];
  }
  const text = `${place.category || ''}`.toLowerCase();
  const output = [];
  if (/architecture|wright|mies|abloh|public space|tour|viewpoint/.test(text)) output.push('architecture');
  if (/museum|gallery|art &|art \/|design/.test(text)) output.push('art');
  if (/café|coffee/.test(text)) output.push('coffee');
  if (/restaurant|food|pizza|market/.test(text)) output.push('food');
  if (/shop/.test(text)) output.push('shops');
  if (/music|performance|bar/.test(text)) output.push('evening');
  if (/hotel/.test(text)) output.push('hotels');
  return output.length ? output : ['architecture'];
}

export function hasPosition(place) {
  return Number.isFinite(place.lat) && Number.isFinite(place.lng) && Math.abs(place.lat) <= 90 && Math.abs(place.lng) <= 180;
}

export function directionsURL(place) {
  const destination = place.address ? `${place.name}, ${place.address}` : (hasPosition(place) ? `${place.lat},${place.lng}` : place.name);
  return 'https://www.google.com/maps/dir/?' + new URLSearchParams({ api: '1', destination, dir_action: 'navigate' });
}

export function chicagoClock(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' }).formatToParts(now).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute), weekday: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(parts.weekday), time: `${parts.hour}:${parts.minute}` };
}

export function openingStatus(place, now = new Date()) {
  if (/closed.*historical|historical.*do not schedule/i.test(place.access || '')) return { key: 'closed', label: 'Closed · historical' };
  if (/exterior only|private home|exterior route/i.test(place.access || '')) return { key: 'unknown', label: 'Exterior visit' };
  const h = place.hours;
  const c = chicagoClock(now);
  if (!h || (h.validThrough && c.date > h.validThrough)) return { key: 'unknown', label: 'Hours unknown' };
  const prior = new Date(`${c.date}T12:00:00Z`); prior.setUTCDate(prior.getUTCDate() - 1);
  const previousDate = prior.toISOString().slice(0, 10);
  const exceptions = h.exceptions || {};
  const today = Object.hasOwn(exceptions, c.date) ? exceptions[c.date] : h.weekly?.[String(c.weekday)];
  const yesterday = Object.hasOwn(exceptions, previousDate) ? exceptions[previousDate] : h.weekly?.[String((c.weekday + 6) % 7)];
  if (today == null) return { key: 'unknown', label: 'Hours unknown' };
  // A dated closure overrides an overnight opening from the previous day.
  const closure = Object.hasOwn(exceptions, c.date) && today.length === 0;
  const open = !closure && (today.some(([start, end]) => c.minutes >= start && c.minutes < end) || (yesterday || []).some(([start, end]) => end > 1440 && c.minutes < end - 1440));
  return { key: open ? 'open' : 'closed', label: open ? 'Open now · published hours' : 'Closed now · published hours' };
}

export function mergePlaces(inventory, metadata, overrides) {
  const all = new Map(inventory.map(p => [p.id, { ...p, ...(metadata.places?.[p.id] || {}) }]));
  for (const record of overrides) {
    if (!record || typeof record.id !== 'string') continue;
    if (record.deleted) { all.delete(record.id); continue; }
    all.set(record.id, { ...(all.get(record.id) || {}), ...record });
  }
  return [...all.values()].map(p => ({ ...p, categories: categoriesFor(p) }));
}

export function isRoutable(place) {
  return !/historical|contact before routing|meeting point varies|meeting point arranged|meeting point supplied/i.test(`${place.access || ''} ${place.address || ''}`);
}
