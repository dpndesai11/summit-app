import { mondayOf } from './stats';
import { toISO } from './model';

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
