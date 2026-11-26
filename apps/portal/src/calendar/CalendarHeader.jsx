import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

const VIEWS = [['month', 'Month'], ['week', 'Week'], ['day', 'Day']];

// The category colours used across the calendar (month bars, week/day blocks, agenda).
const LEGEND = [
  { label: 'Event', cls: 'bg-primary' },
  { label: 'Workout', cls: 'bg-fitness' },
  { label: 'Meal', cls: 'bg-emerald-700' },
  { label: 'Task', cls: 'bg-blue-600' },
];

// The calendar's controls: the visible period as a big title (with a strip in the
// four category colours) and previous/next, the Month | Week | Day switch, a jump
// back to today, refresh, and a legend that says what each colour means.
export default function CalendarHeader({ view, title, onPrev, onNext, onToday, onView, onRefresh, isRefreshing }) {
  const step = view === 'month' ? 'month' : view === 'week' ? 'week' : 'day';
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-display font-extrabold text-black dark:text-white truncate leading-tight">{title}</h2>
          <div className="flex h-1 w-20 rounded-full overflow-hidden mt-1" aria-hidden="true">
            {LEGEND.map(l => <span key={l.label} className={`flex-1 ${l.cls}`} />)}
          </div>
        </div>
        <button
          onClick={onPrev}
          aria-label={`Previous ${step}`}
          className="w-11 h-11 flex items-center justify-center rounded-xl text-black dark:text-white active:bg-primary-soft"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={onNext}
          aria-label={`Next ${step}`}
          className="w-11 h-11 flex items-center justify-center rounded-xl text-black dark:text-white active:bg-primary-soft"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex flex-1 md:flex-none md:w-72 p-0.5 gap-0.5 bg-surface-sunken rounded-xl" role="group" aria-label="Calendar view">
          {VIEWS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => onView(id)}
              aria-pressed={view === id}
              className={`flex-1 min-h-[40px] rounded-lg text-sm font-medium ${
                view === id ? 'bg-surface-raised text-primary font-semibold shadow-sm' : 'text-black dark:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={onToday}
          className="md:ml-auto min-h-[44px] px-4 rounded-xl text-sm font-semibold text-primary bg-primary-soft active:bg-primary-low"
        >
          Today
        </button>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh data"
          className="w-11 h-11 flex items-center justify-center text-black dark:text-white disabled:opacity-40"
        >
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Colour key">
        {LEGEND.map(l => (
          <li key={l.label} className="flex items-center gap-1.5 text-xs font-medium text-black dark:text-white">
            <span className={`w-2.5 h-2.5 rounded-full ${l.cls}`} aria-hidden="true" /> {l.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
