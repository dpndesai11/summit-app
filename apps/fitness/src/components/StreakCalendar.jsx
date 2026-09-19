import { toISO, formatSwiss } from '../lib/model';

export const STREAK_WEEKS = 10;
export default function StreakCalendar({ strengthLogs, cardioLogs }) {
  const activity = {};
  strengthLogs.forEach(l => { activity[l.date] = { ...(activity[l.date] || {}), strength: true }; });
  cardioLogs.forEach(l => { activity[l.date] = { ...(activity[l.date] || {}), cardio: true }; });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay();
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (6 - daysSinceMonday));
  const totalDays = STREAK_WEEKS * 7;
  const start = new Date(endOfWeek);
  start.setDate(endOfWeek.getDate() - totalDays + 1);

  const weeks = Array.from({ length: STREAK_WEEKS }, (_, w) => (
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      const iso = toISO(date);
      return { iso, day: activity[iso], isFuture: date > today };
    })
  ));

  const cellClass = (cell) => {
    if (cell.isFuture) return 'bg-transparent';
    if (!cell.day) return 'bg-gray-100 dark:bg-violet-400/10';
    if (cell.day.strength && cell.day.cardio) return 'bg-violet-600';
    if (cell.day.strength) return 'bg-violet-400';
    return 'bg-violet-200';
  };

  const dayLabels = ['', 'M', '', 'W', '', 'F', ''];

  return (
    <div className="flex gap-1.5 items-start">
      <div className="flex flex-col gap-[3px]">
        {dayLabels.map((l, i) => (
          <div key={i} className="w-3 h-3 text-[8px] leading-3 text-black dark:text-white">{l}</div>
        ))}
      </div>
      <div className="flex gap-[3px] overflow-x-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px] flex-shrink-0">
            {week.map(cell => (
              <div key={cell.iso} title={formatSwiss(cell.iso)} className={`w-3 h-3 rounded-sm ${cellClass(cell)}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
