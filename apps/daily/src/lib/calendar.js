import { toISODate, startOfWeek, addDays } from './taskUtils';

// Pure calendar maths for the Planner — date grids, the user's own events
// (one-off and repeating), and merging everything that happens on a date
// (events, workouts, meals, scheduled tasks) into one list. No React, no I/O.

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const SLOTS = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner'];

// --- Time helpers --------------------------------------------------------------
export const timeToMinutes = (hhmm) => {
  const [h, m] = (hhmm || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
export const minutesToTime = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
export const formatHour = (h) => {
  const period = h < 12 || h === 24 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${period}`;
};
export const formatTime = (hhmm) => {
  const mins = timeToMinutes(hhmm);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${String(m).padStart(2, '0')} ${period}`;
};
export const formatDuration = (mins) => {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

// --- Stored-shape normalizers (workouts / meals / recurring blocks) -------------
export const DEFAULT_WORKOUT_TIME = '07:00';
export const DEFAULT_WORKOUT_DURATION = 60;
export const SLOT_DEFAULT_TIMES = { breakfast: '08:00', snack1: '11:00', lunch: '13:00', snack2: '16:00', dinner: '19:00' };
export const SLOT_DEFAULT_DURATIONS = { breakfast: 20, snack1: 10, lunch: 30, snack2: 10, dinner: 45 };
// A newly-scheduled task lands here until dragged elsewhere.
export const DEFAULT_TASK_TIME = '09:00';
export const DEFAULT_TASK_DURATION = 30;

// A time entry may be the current {time, duration} shape or the older plain
// 'HH:MM' string; normalize on read so existing schedules keep their time.
export const normalizeTimeEntry = (v, defaultTime, defaultDuration) => {
  if (v && typeof v === 'object') return { time: v.time || defaultTime, duration: Number(v.duration) > 0 ? Number(v.duration) : defaultDuration };
  if (typeof v === 'string' && v) return { time: v, duration: defaultDuration };
  return { time: defaultTime, duration: defaultDuration };
};

export const dayList = (v) => {
  if (Array.isArray(v)) return v.filter(n => typeof n === 'string' && n && n !== 'Rest Day');
  if (typeof v === 'string' && v && v !== 'Rest Day' && v !== 'None') return [v];
  return [];
};
export const slotList = (v) => {
  if (Array.isArray(v)) return v.filter(n => typeof n === 'string' && n.trim());
  if (typeof v === 'string' && v.trim()) return [v];
  return [];
};

// Recurring blocks: per-day {time, duration}. The first version stored one
// time and an array of day names; read that as the per-day shape too.
export const normalizeBlockDays = (b) => {
  if (b.days && !Array.isArray(b.days) && typeof b.days === 'object') return b.days;
  const days = Array.isArray(b.days) ? b.days : [];
  const time = b.time || '09:00';
  const duration = b.duration > 0 ? b.duration : 60;
  const out = {};
  days.forEach(d => { out[d] = { time, duration }; });
  return out;
};

// --- Date helpers --------------------------------------------------------------
export const parseISO = (iso) => new Date(`${iso}T00:00:00`);
export const weekdayName = (iso) => parseISO(iso).toLocaleDateString('en-US', { weekday: 'long' });
const daysInMonth = (year, month1) => new Date(year, month1, 0).getDate();
// Whole days from a to b (both 'YYYY-MM-DD'), immune to DST shifts.
const daysBetween = (a, b) => {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
};

// The dates a month view shows: Monday-start weeks covering the whole month,
// including the leading/trailing days of the neighbouring months.
export const monthGrid = (date) => {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const start = startOfWeek(first);
  const days = [];
  for (let d = start; d <= last || days.length % 7 !== 0; d = addDays(d, 1)) days.push(d);
  return days;
};
export const weekDays = (date) => {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

export const monthTitle = (date) => date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
export const weekTitle = (date) => {
  const days = weekDays(date);
  const a = days[0], b = days[6];
  const sameMonth = a.getMonth() === b.getMonth();
  const left = a.toLocaleDateString('en-GB', sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' });
  const right = b.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${left} – ${right}`;
};
export const dayTitle = (date) => date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

// --- The user's own events -----------------------------------------------------
// {id, title, date: 'YYYY-MM-DD', time: 'HH:MM' | null (all-day), duration (min),
//  color, repeat: 'none'|'daily'|'weekly'|'monthly', notes}
// Repeats run forever from `date`; editing one changes the whole series.
export const EVENT_COLORS = {
  primary: { label: 'Purple', fill: 'bg-primary text-on-primary', dot: 'bg-primary' },
  blue: { label: 'Blue', fill: 'bg-blue-600 text-white', dot: 'bg-blue-600' },
  teal: { label: 'Teal', fill: 'bg-teal-700 text-white', dot: 'bg-teal-700' },
  amber: { label: 'Amber', fill: 'bg-amber-700 text-white', dot: 'bg-amber-700' },
  rose: { label: 'Rose', fill: 'bg-rose-600 text-white', dot: 'bg-rose-600' },
};
export const EVENT_COLOR_IDS = Object.keys(EVENT_COLORS);
export const REPEATS = [
  { id: 'none', label: 'Does not repeat' },
  { id: 'daily', label: 'Every day' },
  { id: 'weekly', label: 'Every week' },
  { id: 'monthly', label: 'Every month' },
];
export const DEFAULT_EVENT_DURATION = 60;
export const MIN_EVENT_DURATION = 15;

export const normalizeEvent = (raw) => {
  const time = typeof raw.time === 'string' && /^\d{1,2}:\d{2}$/.test(raw.time) ? raw.time : null;
  let duration = Number(raw.duration) > 0 ? Number(raw.duration) : DEFAULT_EVENT_DURATION;
  // Events don't span midnight: a late start is capped at 24:00.
  if (time) duration = Math.max(MIN_EVENT_DURATION, Math.min(duration, 24 * 60 - timeToMinutes(time)));
  return {
    id: raw.id,
    title: String(raw.title ?? '').trim(),
    date: raw.date,
    time,
    duration,
    color: EVENT_COLORS[raw.color] ? raw.color : 'primary',
    repeat: REPEATS.some(r => r.id === raw.repeat) ? raw.repeat : 'none',
    notes: String(raw.notes ?? ''),
  };
};

// Does this event happen on `iso`? Monthly repeats use the start date's
// day-of-month, clamped to the last day of shorter months (31st → 30th/28th).
export const eventOccursOn = (event, iso) => {
  if (!event.date || iso < event.date) return false;
  switch (event.repeat) {
    case 'daily': return true;
    case 'weekly': return daysBetween(event.date, iso) % 7 === 0;
    case 'monthly': {
      const [y, m, d] = iso.split('-').map(Number);
      return d === Math.min(Number(event.date.slice(8, 10)), daysInMonth(y, m));
    }
    default: return iso === event.date;
  }
};

// All-day events first, then by start time, then title.
const byStart = (a, b) => {
  if (a.time === null && b.time !== null) return -1;
  if (a.time !== null && b.time === null) return 1;
  return (a.time ? timeToMinutes(a.time) - timeToMinutes(b.time) : 0) || a.title.localeCompare(b.title);
};
export const eventsOnDate = (events, iso) => (
  (Array.isArray(events) ? events : []).filter(e => eventOccursOn(e, iso)).map(normalizeEvent).sort(byStart)
);

// --- Everything on one date ----------------------------------------------------
// Timed blocks for workouts (recurring by weekday), meals (one per slot) and
// tasks placed on the timeline (keyed by real date). `data` carries the
// stored state; this is the old Home.buildBlocksForDay, made pure.
export const buildBlocksForDay = (data, dayName, iso) => {
  const { templates = [], workoutPlan = {}, workoutTimes = {}, recipes = [], mealPlan = {}, mealTimes = {}, taskTimes = {}, tasks = [] } = data;
  const workoutBlocks = dayList(workoutPlan[dayName])
    .map(name => templates.find(t => t.name === name))
    .filter(Boolean)
    .map(tpl => {
      const entry = normalizeTimeEntry(workoutTimes[dayName]?.[tpl.name], DEFAULT_WORKOUT_TIME, DEFAULT_WORKOUT_DURATION);
      return { kind: 'workout', key: `w::${tpl.name}`, title: tpl.name, time: entry.time, duration: entry.duration, exercises: tpl.exercises || [] };
    });

  // One block per SLOT, not per recipe: a slot has a single time/duration, so
  // several recipes in it (a meal plus a side) are one block listing them all.
  const mealBlocks = SLOTS.flatMap(slot => {
    const names = slotList(mealPlan[dayName]?.[slot]);
    if (names.length === 0) return [];
    const entry = normalizeTimeEntry(mealTimes[dayName]?.[slot], SLOT_DEFAULT_TIMES[slot], SLOT_DEFAULT_DURATIONS[slot]);
    const slotRecipes = names.map(name => recipes.find(r => r.name === name)).filter(Boolean);
    return [{ kind: 'meal', key: `m::${slot}`, title: names.join(' + '), slot, time: entry.time, duration: entry.duration, recipes: slotRecipes }];
  });

  // Tasks only appear once explicitly added to the timeline ("Add to timeline").
  const dayTaskTimes = taskTimes[iso] || {};
  const taskBlocks = Object.keys(dayTaskTimes).map(taskId => {
    const task = tasks.find(t => String(t.id) === String(taskId));
    if (!task) return null;
    const entry = normalizeTimeEntry(dayTaskTimes[taskId], DEFAULT_TASK_TIME, DEFAULT_TASK_DURATION);
    return { kind: 'task', key: `t::${taskId}`, title: task.name, taskId, time: entry.time, duration: entry.duration, task };
  }).filter(Boolean);

  return [...workoutBlocks, ...mealBlocks, ...taskBlocks].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
};

// The merged list for a day's agenda: the user's events (all-day first) and
// then the timed workout/meal/task blocks, all in start order.
export const dayItems = (data, iso) => {
  const events = eventsOnDate(data.events, iso).map(e => ({
    kind: 'event', key: `e::${e.id}`, title: e.title, time: e.time, allDay: e.time === null, duration: e.duration, event: e,
  }));
  const blocks = buildBlocksForDay(data, weekdayName(iso), iso).map(b => ({ ...b, allDay: false }));
  return [...events, ...blocks].sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    return (a.allDay ? 0 : timeToMinutes(a.time) - timeToMinutes(b.time)) || a.title.localeCompare(b.title);
  });
};

// What a month cell needs: the day's events plus counts of the recurring
// workouts/meals and the open tasks due or targeted on that date.
export const dayMarkers = (data, iso) => {
  const { templates = [], workoutPlan = {}, mealPlan = {}, tasks = [] } = data;
  const dayName = weekdayName(iso);
  return {
    events: eventsOnDate(data.events, iso),
    workouts: dayList(workoutPlan[dayName]).filter(n => templates.some(t => t.name === n)).length,
    meals: SLOTS.filter(s => slotList(mealPlan[dayName]?.[s]).length > 0).length,
    tasks: tasks.filter(t => !t.isCompleted && (t.dueDate === iso || t.targetDate === iso)).length,
  };
};

// Step a date by whole months, keeping the day-of-month where it exists and
// clamping to the last day otherwise (31 Jan + 1 month = 28 Feb).
export const addMonths = (date, delta) => {
  const target = new Date(date.getFullYear(), date.getMonth() + delta, 1);
  target.setDate(Math.min(date.getDate(), daysInMonth(target.getFullYear(), target.getMonth() + 1)));
  return target;
};

// Recurring background blocks (work hours, commute, ...): a small fixed colour
// palette so the exact Tailwind classes exist in source for the build to pick
// up — same convention as TYPE_META / SLOT_META. These are category colours,
// deliberately separate from the design system's status colours.
export const BLOCK_COLOR_PRESETS = {
  slate: { label: 'Slate', band: 'bg-slate-400/20 dark:bg-slate-300/10 border-slate-400/40', text: 'text-slate-700 dark:text-slate-300', chip: 'bg-slate-100 dark:bg-slate-400/10 text-slate-700 dark:text-slate-300' },
  blue: { label: 'Blue', band: 'bg-blue-400/20 dark:bg-blue-300/10 border-blue-400/40', text: 'text-blue-700 dark:text-blue-300', chip: 'bg-blue-100 dark:bg-blue-400/10 text-blue-700 dark:text-blue-300' },
  amber: { label: 'Amber', band: 'bg-amber-400/20 dark:bg-amber-300/10 border-amber-400/40', text: 'text-amber-700 dark:text-amber-300', chip: 'bg-amber-100 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300' },
  rose: { label: 'Rose', band: 'bg-rose-400/20 dark:bg-rose-300/10 border-rose-400/40', text: 'text-rose-700 dark:text-rose-300', chip: 'bg-rose-100 dark:bg-rose-400/10 text-rose-700 dark:text-rose-300' },
  teal: { label: 'Teal', band: 'bg-teal-400/20 dark:bg-teal-300/10 border-teal-400/40', text: 'text-teal-700 dark:text-teal-300', chip: 'bg-teal-100 dark:bg-teal-400/10 text-teal-700 dark:text-teal-300' },
};
export const BLOCK_COLORS = Object.keys(BLOCK_COLOR_PRESETS);

// Compact summary: days sharing the exact same time/duration collapse into one
// line (e.g. "Mon Tue Wed Thu · 8:00 AM · 8h") instead of one row each.
export const groupBlockDays = (days) => {
  const groups = [];
  DAYS.forEach(day => {
    const entry = days[day];
    if (!entry) return;
    const key = `${entry.time}|${entry.duration}`;
    let g = groups.find(g => g.key === key);
    if (!g) { g = { key, time: entry.time, duration: entry.duration, dayNames: [] }; groups.push(g); }
    g.dayNames.push(day);
  });
  return groups;
};

// Side-by-side layout for overlapping timed items in one day column: each item
// gets a `lane` (0-based) and `lanes` (how many lanes its overlap cluster
// needs), so it can be drawn lane/lanes of the way across, like Google Calendar.
export const layoutLanes = (timed) => {
  const startOf = (i) => timeToMinutes(i.time);
  const sorted = [...timed].sort((a, b) => startOf(a) - startOf(b) || b.duration - a.duration);
  const out = [];
  let cluster = [];
  let laneEnds = [];
  let clusterEnd = 0;
  const flush = () => {
    cluster.forEach(c => out.push({ ...c, lanes: laneEnds.length }));
    cluster = [];
    laneEnds = [];
    clusterEnd = 0;
  };
  sorted.forEach(item => {
    const s = startOf(item);
    const e = s + item.duration;
    if (cluster.length && s >= clusterEnd) flush();
    let lane = laneEnds.findIndex(end => end <= s);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(e); } else { laneEnds[lane] = e; }
    cluster.push({ ...item, lane });
    clusterEnd = Math.max(clusterEnd, e);
  });
  flush();
  return out;
};

export { toISODate };
