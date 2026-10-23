import { mondayOf } from './stats';
import { REST_WEEK, toISO } from './model';

// Training weeks: a plan of upcoming Monday-start weeks, each tagged Load /
// Deload / Test / Rest with an optional km target and a note. It only labels and
// plans weeks — it never changes templates, weights or the weekly workout plan.

export const WEEK_TYPES = {
  load: { label: 'Load', dot: 'bg-primary', fill: 'fill-primary-mid', hint: 'Building week' },
  deload: { label: 'Deload', dot: 'bg-success', fill: 'fill-success', hint: 'Lighter week to absorb training' },
  test: { label: 'Test', dot: 'bg-blue-600', fill: 'fill-blue-600', hint: 'Time trial / retest week' },
  rest: { label: 'Rest', dot: 'bg-gray-400', fill: 'fill-gray-400', hint: 'Off or very light' },
};
export const WEEK_TYPE_ORDER = ['load', 'deload', 'test', 'rest'];

// Repeating patterns for "add weeks": N load weeks, then a deload, repeated.
export const PATTERNS = [
  { id: '3+1', label: '3 load + deload', load: 3 },
  { id: '2+1', label: '2 load + deload', load: 2 },
  { id: '4+1', label: '4 load + deload', load: 4 },
  { id: 'all', label: 'All load', load: Infinity },
];

const addDays = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  return toISO(new Date(y, m - 1, d + n));
};

export const normalizeWeeks = (raw) => {
  if (!Array.isArray(raw)) return [];
  const byStart = {};
  raw.forEach(w => {
    if (!w || typeof w.weekStart !== 'string') return;
    const weekStart = mondayOf(w.weekStart);
    byStart[weekStart] = {
      weekStart,
      type: WEEK_TYPES[w.type] ? w.type : 'load',
      label: typeof w.label === 'string' ? w.label : '',
      targetKm: Number(w.targetKm) > 0 ? Number(w.targetKm) : null,
      note: typeof w.note === 'string' ? w.note : '',
    };
  });
  return Object.values(byStart).sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));
};

export const weekFor = (weeks, iso) => weeks.find(w => w.weekStart === mondayOf(iso)) || null;

// Insert or replace the week with the same Monday.
export const upsertWeeks = (weeks, incoming) => normalizeWeeks([...weeks, ...incoming]);

export const removeWeek = (weeks, weekStart) => weeks.filter(w => w.weekStart !== weekStart);

// `count` consecutive weeks from the Monday of `startISO`, following a pattern.
export const generateWeeks = (startISO, count, pattern) => {
  const start = mondayOf(startISO);
  const cycle = pattern.load === Infinity ? Infinity : pattern.load + 1;
  return Array.from({ length: count }, (_, i) => ({
    weekStart: addDays(start, i * 7),
    type: cycle !== Infinity && i % cycle === cycle - 1 ? 'deload' : 'load',
    label: `Week ${i + 1}`,
    targetKm: null,
    note: '',
  }));
};

// Kilometres of cardio logged in the week starting `weekStart`.
export const actualKm = (cardioLogs, weekStart) => {
  const end = addDays(weekStart, 6);
  return cardioLogs
    .filter(l => l.date >= weekStart && l.date <= end)
    .reduce((a, l) => a + (Number(l.distance) || 0), 0);
};

// ---------------------------------------------------------------------------
// Per-week plans (summit_week_plans: {[Monday ISO]: {Monday: [...], ...}}) and
// "life happens" adjustments. Plans move together with their weeks so a shifted
// block keeps each week's sessions.
// ---------------------------------------------------------------------------

export const shiftISO = addDays;

// Move every week (and week plan) starting on/after `fromStart` by `days`.
export const shiftFrom = (weeks, plans, fromStart, days) => ({
  weeks: normalizeWeeks(weeks.map(w => (w.weekStart >= fromStart ? { ...w, weekStart: addDays(w.weekStart, days) } : w))),
  plans: Object.fromEntries(Object.entries(plans).map(([k, v]) => [k >= fromStart ? addDays(k, days) : k, v])),
});

// Repeat a week: a copy right after it (same type, target, notes and plan);
// everything later moves back a week.
export const repeatWeek = (weeks, plans, weekStart) => {
  const src = weeks.find(w => w.weekStart === weekStart);
  if (!src) return { weeks, plans };
  const after = addDays(weekStart, 7);
  const shifted = shiftFrom(weeks, plans, after, 7);
  const copy = { ...src, weekStart: after, label: `${src.label || 'Week'} (repeat)` };
  const nextPlans = { ...shifted.plans };
  if (plans[weekStart]) nextPlans[after] = plans[weekStart];
  return { weeks: normalizeWeeks([...shifted.weeks, copy]), plans: nextPlans };
};

// A rest week right after `weekStart`; everything later moves back a week.
export const insertRestWeek = (weeks, plans, weekStart) => {
  const after = addDays(weekStart, 7);
  const shifted = shiftFrom(weeks, plans, after, 7);
  return {
    weeks: normalizeWeeks([...shifted.weeks, { weekStart: after, type: 'rest', label: 'Rest week', targetKm: null, note: '' }]),
    plans: { ...shifted.plans, [after]: { ...REST_WEEK } },
  };
};

// Drop a week and pull everything after it forward a week to close the gap.
export const dropWeek = (weeks, plans, weekStart) => {
  const without = { weeks: weeks.filter(w => w.weekStart !== weekStart), plans: Object.fromEntries(Object.entries(plans).filter(([k]) => k !== weekStart)) };
  return shiftFrom(without.weeks, without.plans, addDays(weekStart, 7), -7);
};

// Push this week and everything after it back by a week (this week becomes empty).
export const pushBack = (weeks, plans, fromStart) => shiftFrom(weeks, plans, fromStart, 7);

// Where "today" sits in the block: before it starts, in week N of M, or after it.
export const blockStatus = (weeks, todayISO) => {
  if (!weeks.length) return null;
  const total = weeks.length;
  const first = weeks[0].weekStart;
  const lastEnd = addDays(weeks[total - 1].weekStart, 6);
  const dayDiff = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);
  if (todayISO < first) return { state: 'before', total, startsInDays: dayDiff(todayISO, first), start: first, progress: 0 };
  if (todayISO > lastEnd) return { state: 'after', total, progress: 1, end: lastEnd };
  const monday = mondayOf(todayISO);
  const found = weeks.findIndex(w => w.weekStart === monday);
  const dayOfWeek = dayDiff(monday, todayISO) + 1; // 1..7
  // A calendar week with no entry (a gap) counts as sitting after the weeks before it.
  const done = found >= 0 ? found : weeks.filter(w => w.weekStart < monday).length;
  const progress = Math.min(1, (done + (found >= 0 ? dayOfWeek / 7 : 0)) / total);
  return {
    state: 'active', index: found >= 0 ? found : Math.min(done, total - 1), total,
    week: found >= 0 ? weeks[found] : null, dayOfWeek, progress, end: lastEnd,
  };
};
