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

export const computeAllTimeBests = (strengthLogs) => {
  const bests = {};
  strengthLogs.forEach(log => {
    const type = logType(log);
    expandLogSets(log).forEach(s => {
      const value = type === 'bodyweight' ? Number(s.reps) || 0 : Number(s.weight) || 0;
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
