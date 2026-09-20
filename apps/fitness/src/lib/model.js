// Workout data model: storage keys, defaults and the small normalizers that read
// older saved shapes. Same keys and shapes the merged app used — the Planner's
// calendar reads summit_workout_templates / _weekly_workout_plan / _workout_times,
// so don't change them.

export const STORAGE_KEYS = {
  strengthLogs: 'summit_strength_logs',
  cardioLogs: 'summit_cardio_logs',
  workoutTemplates: 'summit_workout_templates',
  weeklyWorkoutPlan: 'summit_weekly_workout_plan',
  workoutTimes: 'summit_workout_times',
  activeSession: 'summit_active_session',
  cardioRoutes: 'summit_cardio_routes'
};

export const DEFAULT_TEMPLATES = [
  { id: 1, name: 'Lower Deck Alpha', exercises: [
    { name: 'Squat', type: 'weight' }, { name: 'Leg Press', type: 'weight' }, { name: 'Calf Raise', type: 'weight' }
  ]},
  { id: 2, name: 'Upper Deck Prime', exercises: [
    { name: 'Bench Press', type: 'weight' }, { name: 'Lat Pulldown', type: 'weight' },
    { name: 'Shoulder Press', type: 'weight' }, { name: 'Bicep Curl', type: 'weight' }
  ]}
];

export const DEFAULT_PLAN = {
  Monday: ['Lower Deck Alpha'], Tuesday: [], Wednesday: ['Upper Deck Prime'],
  Thursday: [], Friday: ['Lower Deck Alpha'], Saturday: [], Sunday: []
};

export const REST_WEEK = {
  Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
};

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const CARDIO_ACTIVITIES = ['Running', 'Cycling', 'Rowing', 'Swimming', 'Walking', 'Elliptical'];

// Default time-of-day (and duration, in minutes) a newly-assigned workout
// gets on the Dashboard timeline until someone sets real ones. Workouts
// default to early morning, one hour long.
export const DEFAULT_WORKOUT_TIME = '07:00';
export const DEFAULT_WORKOUT_DURATION = 60;

// A workoutTimes entry may be the current shape ({time, duration}) or the
// older plain-string shape (just a time, no duration) — normalize on read
// so existing schedules keep their time and just pick up a default length.
export const normalizeTimeEntry = (v, defaultTime, defaultDuration) => {
  if (v && typeof v === 'object') return { time: v.time || defaultTime, duration: Number(v.duration) > 0 ? Number(v.duration) : defaultDuration };
  if (typeof v === 'string' && v) return { time: v, duration: defaultDuration };
  return { time: defaultTime, duration: defaultDuration };
};

export const toISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const formatSwiss = (iso) => {
  if (!iso) return '—';
  const p = iso.split('-');
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : iso;
};

export const dayList = (v) => {
  if (Array.isArray(v)) return v.filter(n => typeof n === 'string' && n && n !== 'Rest Day');
  if (typeof v === 'string' && v && v !== 'Rest Day' && v !== 'None') return [v];
  return [];
};

export const normalizePlan = (raw) => {
  const plan = {};
  DAYS.forEach(d => { plan[d] = dayList(raw?.[d]); });
  return plan;
};

// "14 Sep" — short date for chart axes and lists.
export const formatShortDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
