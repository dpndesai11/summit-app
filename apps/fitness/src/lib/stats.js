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

// ---------------------------------------------------------------------------
// Progress: weekly totals and per-exercise history (feeds the Progress charts)
// ---------------------------------------------------------------------------

// The Monday (as YYYY-MM-DD) of the week containing an ISO date.
export const mondayOf = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - (dt.getDay() === 0 ? 6 : dt.getDay() - 1));
  return toISO(dt);
};

// The last `weeks` Monday-start weeks (oldest first, zero weeks included, so a
// deload week shows as a low bar rather than vanishing): kilograms lifted,
// cardio minutes, and days with anything logged.
export const weeklyAggregates = (strengthLogs, cardioLogs, weeks = 10, today = new Date()) => {
  const [y, m, d] = mondayOf(toISO(today)).split('-').map(Number);
  const list = [];
  for (let i = weeks - 1; i >= 0; i--) {
    list.push({ weekStart: toISO(new Date(y, m - 1, d - 7 * i)), volume: 0, cardioMin: 0, days: new Set() });
  }
  const byWeek = Object.fromEntries(list.map(w => [w.weekStart, w]));
  strengthLogs.forEach(l => {
    const wk = byWeek[mondayOf(l.date)];
    if (!wk) return;
    wk.volume += logVolume(l);
    wk.days.add(l.date);
  });
  cardioLogs.forEach(l => {
    const wk = byWeek[mondayOf(l.date)];
    if (!wk) return;
    wk.cardioMin += Number(l.duration) || 0;
    wk.days.add(l.date);
  });
  return list.map(({ days, ...wk }) => ({ ...wk, activeDays: days.size }));
};

const bestOfLog = (log) => {
  const type = logType(log);
  return expandLogSets(log).reduce((m, s) => Math.max(m, setMetric(s, type)), 0);
};

// One point per date for an exercise: the best weight (or reps / seconds) that
// day. `isPR` is true only when a day beat everything before it — the very first
// day is a starting point, not a record.
export const exerciseSeries = (exercise, strengthLogs) => {
  const logs = strengthLogs.filter(l => l.exercise === exercise);
  if (logs.length === 0) return [];
  const type = logType(logs[0]);
  const timed = type === 'bodyweight' && logs.some(l => expandLogSets(l).some(s => Number(s.seconds) > 0 && !(Number(s.reps) > 0)));
  const unit = type !== 'bodyweight' ? 'kg' : timed ? 's' : 'reps';
  const byDate = {};
  logs.forEach(l => {
    const best = bestOfLog(l);
    if (best > 0) byDate[l.date] = Math.max(byDate[l.date] || 0, best);
  });
  let runningBest = 0;
  return Object.keys(byDate).sort().map((date, i) => {
    const value = byDate[date];
    const isPR = i > 0 && value > runningBest;
    runningBest = Math.max(runningBest, value);
    return { date, value, type, unit, isPR };
  });
};

// Should this logged entry wear a "PR" badge? Only if it beat every earlier day —
// never for the first time you logged the exercise.
export const prBadgeFor = (log, strengthLogs) => {
  const mine = bestOfLog(log);
  if (mine <= 0) return false;
  let hasEarlier = false;
  let earlierBest = 0;
  strengthLogs.forEach(l => {
    if (l.exercise === log.exercise && l.date < log.date) {
      hasEarlier = true;
      earlierBest = Math.max(earlierBest, bestOfLog(l));
    }
  });
  return hasEarlier && mine > earlierBest;
};

// Every exercise you've logged, most recently trained first, with what the
// Progress list shows (latest, best, how many days, how many real PRs).
export const exerciseSummaries = (strengthLogs) => {
  const names = [...new Set(strengthLogs.map(l => l.exercise))];
  return names
    .map(exercise => {
      const series = exerciseSeries(exercise, strengthLogs);
      if (series.length === 0) return null;
      const last = series[series.length - 1];
      return {
        exercise,
        type: last.type,
        unit: last.unit,
        series,
        latest: last.value,
        latestDate: last.date,
        best: Math.max(...series.map(p => p.value)),
        sessions: series.length,
        prCount: series.filter(p => p.isPR).length,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.latestDate.localeCompare(a.latestDate) || a.exercise.localeCompare(b.exercise));
};
