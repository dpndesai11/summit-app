import { toISO, logsFor } from './model';

// Pure habit maths — streaks and the heatmap dataset. No React, no I/O.

// Same date-walking approach as Fitness's calcCurrentStreak: counts backward
// from today, but starts from yesterday if today has nothing logged yet, so
// the streak doesn't look broken until a full day has actually passed.
export const calcStreak = (activeDates) => {
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

// The set of dates a given habit was done, from the {[isoDate]: [habitId,...]} log.
export const datesFor = (habitId, habitLogs) => {
  const dates = new Set();
  Object.keys(habitLogs).forEach(iso => {
    if (logsFor(habitLogs, iso).includes(habitId)) dates.add(iso);
  });
  return dates;
};

export const streakFor = (habitId, habitLogs) => calcStreak(datesFor(habitId, habitLogs));

// "Any habit done" streak — counts a day active if at least one habit was
// checked off, regardless of which.
export const anyHabitStreak = (habitLogs) => {
  const dates = new Set(Object.keys(habitLogs).filter(iso => logsFor(habitLogs, iso).length > 0));
  return calcStreak(dates);
};

export const HEATMAP_WEEKS = 10;

// Same 10-week Monday-start grid StreakCalendar (Fitness) builds, but keyed
// on a single habit's done/not-done per day instead of strength/cardio.
export const heatmapWeeks = (habitId, habitLogs, weeks = HEATMAP_WEEKS) => {
  const dates = datesFor(habitId, habitLogs);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay();
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (6 - daysSinceMonday));
  const totalDays = weeks * 7;
  const start = new Date(endOfWeek);
  start.setDate(endOfWeek.getDate() - totalDays + 1);

  return Array.from({ length: weeks }, (_, w) => (
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      const iso = toISO(date);
      return { iso, done: dates.has(iso), isFuture: date > today };
    })
  ));
};
