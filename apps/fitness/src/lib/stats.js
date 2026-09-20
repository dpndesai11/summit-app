import { toISO } from './model';

// Pure workout maths — streaks, personal bests, log/set helpers. No React, no I/O.

export const calcCurrentStreak = (activeDates) => {
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!activeDates.has(toISO(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (activeDates.has(toISO(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
};

// The number that decides "better" for a set: weight for lifts; reps for
// bodyweight, or seconds for a timed hold (a set logged from the timer has
// reps 0 and a `seconds` field).
export const setMetric = (s, type) => (
  type === 'bodyweight' ? (Number(s.reps) || Number(s.seconds) || 0) : (Number(s.weight) || 0)
);

export const computeAllTimeBests = (strengthLogs) => {
  const bests = {};
  strengthLogs.forEach(log => {
    const type = logType(log);
    expandLogSets(log).forEach(s => {
      const value = setMetric(s, type);
      if (value > 0 && (!bests[log.exercise] || value > bests[log.exercise].value)) {
        bests[log.exercise] = { value, type };
      }
    });
  });
  return bests;
};

export const expandLogSets = (log) => (
  Array.isArray(log.setDetails)
    ? log.setDetails
    : Array.from({ length: Number(log.sets) || 0 }, (_, i) => ({
        setNumber: i + 1, reps: log.reps, weight: log.weight, timestamp: null
      }))
);

export const logSetCount = (log) => (Array.isArray(log.setDetails) ? log.setDetails.length : Number(log.sets) || 0);

export const logVolume = (log) => expandLogSets(log).reduce(
  (a, s) => a + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0
);

export const logType = (log) => (log.type === 'bodyweight' ? 'bodyweight' : 'weight');

export const sessionKey = (s) => `${s.date}::${s.templateName}`;
export const sessionHasProgress = (s) => Object.values(s.exercises).some(ex => ex.sets.length > 0);
export const sessionSetCount = (s) => Object.values(s.exercises).reduce((a, ex) => a + ex.sets.length, 0);

export const groupByDate = (logs) => {
  const map = {};
  logs.forEach(l => { (map[l.date] = map[l.date] || []).push(l); });
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
};

// The most recent set logged for an exercise (last set of its newest entry), or
// null. Used to pre-fill the next session and to show "Last: 60 kg × 8".
export const lastSetFor = (exercise, strengthLogs) => {
  let best = null;
  strengthLogs.forEach((log, idx) => {
    if (log.exercise !== exercise) return;
    const sets = expandLogSets(log);
    if (sets.length === 0) return;
    if (!best || log.date > best.date || (log.date === best.date && idx > best.idx)) {
      best = { date: log.date, idx, set: sets[sets.length - 1] };
    }
  });
  return best ? { ...best.set, date: best.date } : null;
};

// Starting weight/reps for a new set: what you did last time, else 40 kg x 8
// (lifts) or 8 reps (bodyweight).
export const defaultSetInputs = (isBodyweight, last) => (
  isBodyweight
    ? { reps: Number(last?.reps) || 8 }
    : { weight: last ? Number(last.weight) || 0 : 40, reps: Number(last?.reps) || 8 }
);

// How a logged set reads: "60kg × 8", "12 reps", "45s" or "30s/side".
export const formatSetText = (s, isBodyweight) => {
  if (isBodyweight) {
    if (Number(s.seconds) > 0 && !(Number(s.reps) > 0)) return `${s.seconds}s${s.perSide ? '/side' : ''}`;
    return `${s.reps} reps`;
  }
  return `${s.weight}kg × ${s.reps}`;
};

// The Monday-start week containing `today`, one entry per day. Used by the
// Today tab's week strip; `iso` matches the dates stored on logs.
export const weekDates = (today = new Date()) => {
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  const daysSinceMonday = monday.getDay() === 0 ? 6 : monday.getDay() - 1;
  monday.setDate(monday.getDate() - daysSinceMonday);
  const todayISO = toISO(today);
  const names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return names.map((day, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = toISO(d);
    return { day, iso, isToday: iso === todayISO, isFuture: iso > todayISO };
  });
};
