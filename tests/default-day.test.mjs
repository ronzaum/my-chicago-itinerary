import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveDay} from '../public/trip-core.mjs';
const days=['2026-10-30','2026-10-31','2026-11-01'].map(date=>({date}));
test('opens October 31 even when another day was saved or is today',()=>{assert.equal(resolveDay(days,null,'2026-11-01',new Date('2026-10-30T16:00:00Z')),'2026-10-31');});
test('explicit date navigation remains available',()=>{assert.equal(resolveDay(days,'2026-11-01'), '2026-11-01');});
test('other trips safely fall back to their first day',()=>{assert.equal(resolveDay([{date:'2027-01-01'}],null,null,new Date('2026-10-30T16:00:00Z')),'2027-01-01');});
