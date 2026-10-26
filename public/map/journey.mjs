import { hasPosition } from './core.mjs';

export const DAY_DESIGNS = {
  '2026-10-30': { label: '30', month: 'October', area: 'IIT → Robie House → West Loop', palette: '10' },
  '2026-10-31': { label: '31', month: 'October', area: 'Unity Temple → West Loop', palette: '14' },
  '2026-11-01': { label: '1', month: 'November', area: 'Lake → journey home', palette: '01' }
};

// An overview of the stop sequence, not street-following navigation. Missing
// coordinates break the line so an unlocated stop is never silently skipped.
export function dayJourney(day, places, points = {}) {
  if (!day) return { steps: [], segments: [], bounds: [] };
  const byId = new Map(places.map(p => [p.id, p]));
  const stops = day.phases?.flatMap(p => p.stops || []) || (day.stops || []).map(([place, title]) => ({ place, title }));
  const point = id => byId.has(id) ? (hasPosition(byId.get(id)) ? byId.get(id) : null) : (hasPosition(points[id] || {}) ? points[id] : null);
  const steps = stops.map((s, i) => ({ ...s, number: i + 1, start: point(s.travel_start || s.place), end: point(s.travel_end || s.place) }));
  const segments = [], bounds = [];
  let previous = null;
  for (const step of steps) {
    for (const p of [step.start, step.end]) if (p) bounds.push([p.lat, p.lng]);
    if (previous && step.start) segments.push({ from: previous, to: step.start, optional: !!step.optional });
    if (step.start && step.end && (step.start.lat !== step.end.lat || step.start.lng !== step.end.lng)) segments.push({ from: step.start, to: step.end, optional: !!step.optional });
    previous = step.end;
  }
  return { steps, segments: segments.filter(s => s.from.lat !== s.to.lat || s.from.lng !== s.to.lng), bounds };
}

export function enrichMetadata(metadata, inventory, points) {
  const places = { ...metadata.places };
  for (const [id, point] of Object.entries(points)) {
    if (!hasPosition(places[id] || {}) && inventory.some(p => p.id === id) && hasPosition(point)) places[id] = { ...places[id], ...point, locationSource: point.locationSource || point.source };
  }
  if (hasPosition(points['oak-beach'] || {})) places.lakefront = { ...places.lakefront, ...points['oak-beach'], locationSource: points['oak-beach'].source };
  return { ...metadata, places };
}
