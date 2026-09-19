import { Check } from 'lucide-react';
import { dayList } from '../lib/model';
import { weekDates } from '../lib/stats';

// This week at a glance: what's planned, what's already logged, and today.
// Text is plain black/white (max contrast) — state is shown with shape and
// the violet accent instead: filled = something logged, ring = today,
// dots = planned workouts still to do.
export default function WeekStrip({ plan, strengthLogs, cardioLogs, onSelectDay }) {
  const week = weekDates();
  const activeDates = new Set([...strengthLogs, ...cardioLogs].map(l => l.date));

  return (
    <div className="bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15 p-3">
      <div className="flex justify-between">
        {week.map(({ day, iso, isToday, isFuture }) => {
          const planned = dayList(plan[day]).length;
          const done = activeDates.has(iso);
          return (
            <button
              key={day}
              onClick={() => onSelectDay?.(day)}
              aria-label={`${day}${isToday ? ' (today)' : ''}: ${done ? 'logged' : planned ? `${planned} planned` : 'rest'}`}
              className="flex flex-col items-center gap-1.5 flex-1 min-w-0 py-1"
            >
              <span className={`text-xs ${isToday ? 'font-bold' : 'font-medium'} text-black dark:text-white`}>{day[0]}</span>
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  done ? 'bg-violet-600 text-white' : 'border-2 border-gray-200 dark:border-violet-400/25'
                } ${isToday ? 'ring-2 ring-violet-600 ring-offset-2 ring-offset-white dark:ring-offset-[#211b34]' : ''}`}
              >
                {done && <Check className="w-4 h-4" />}
              </span>
              <span className="flex gap-0.5 h-1.5">
                {!done && !isFuture && planned === 0 ? null : (
                  Array.from({ length: Math.min(planned, 3) }).map((_, i) => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full ${done ? 'bg-violet-600' : 'bg-violet-400'}`} />
                  ))
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
