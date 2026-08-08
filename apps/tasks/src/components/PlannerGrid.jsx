import { toISODate, startOfWeek, addDays, getMonthGridDates } from '../lib/taskUtils';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Discrete workload-intensity buckets rather than a continuous inline style,
// so shading stays legible (and pre-themed) in both light and dark mode.
function shadeClass(value, isOutsideMonth) {
  if (isOutsideMonth) return 'bg-gray-50 dark:bg-white/[0.02]';
  if (value <= 0) return 'bg-gray-50 dark:bg-white/5';
  if (value < 1.5) return 'bg-blue-100 dark:bg-blue-500/15';
  if (value < 3) return 'bg-blue-200 dark:bg-blue-500/30';
  return 'bg-blue-300 dark:bg-blue-500/50';
}

export default function PlannerGrid({ mode, getDistributedMilestonesCount, onSelectDay, selectedDate }) {
  const today = new Date();
  const todayISO = toISODate(today);
  const currentMonth = today.getMonth();

  const days = mode === 'week'
    ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(today), i))
    : getMonthGridDates(today);

  return (
    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
      {WEEKDAY_LABELS.map(label => (
        <div key={label} className="text-[10px] font-medium text-gray-400 dark:text-gray-500 text-center pb-1">
          {label}
        </div>
      ))}
      {days.map(day => {
        const dateStr = toISODate(day);
        const value = getDistributedMilestonesCount(dateStr);
        const isToday = dateStr === todayISO;
        const isOutsideMonth = mode === 'month' && day.getMonth() !== currentMonth;
        const isSelected = dateStr === selectedDate;

        return (
          <button
            key={dateStr}
            onClick={() => onSelectDay(dateStr)}
            className={`aspect-square rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-colors ${shadeClass(value, isOutsideMonth)} ${
              isSelected ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-gray-200 dark:border-white/10'
            } ${isToday ? 'ring-2 ring-offset-1 ring-offset-white dark:ring-offset-[#191919] ring-blue-600' : ''}`}
          >
            <span className={`text-xs ${isToday ? 'font-semibold text-blue-600' : isOutsideMonth ? 'text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}>
              {day.getDate()}
            </span>
            {value > 0 && (
              <span className="text-[9px] text-gray-500 dark:text-gray-400">{value}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
