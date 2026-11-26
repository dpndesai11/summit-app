import { toISO } from './model';

export const CONSISTENCY_WEEKS = 10;

// The last `count` Monday-start weeks (oldest first, ending with this week), each
// day marked with what was logged, plus the totals shown above the map.
export const buildConsistency = (strengthLogs, cardioLogs, count = CONSISTENCY_WEEKS, today = new Date()) => {
  const strength = new Set(strengthLogs.map(l => l.date));
  const cardio = new Set(cardioLogs.map(l => l.date));
  const todayISO = toISO(today);
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));

  const weeks = Array.from({ length: count }, (_, w) => {
    const days = Array.from({ length: 7 }, (_, d) => {
      const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - (count - 1 - w) * 7 + d);
      const iso = toISO(date);
      return {
        iso, dayOfMonth: date.getDate(), strength: strength.has(iso), cardio: cardio.has(iso),
        isToday: iso === todayISO, isFuture: iso > todayISO,
      };
    });
    const active = days.filter(x => !x.isFuture && (x.strength || x.cardio)).length;
    return { weekStart: days[0].iso, days, active };
  });

  return {
    weeks,
    activeDays: weeks.reduce((n, w) => n + w.active, 0),
    thisWeek: weeks[weeks.length - 1].active,
    bestWeek: Math.max(...weeks.map(w => w.active)),
  };
};
