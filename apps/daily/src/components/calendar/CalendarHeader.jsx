import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

const VIEWS = [['month', 'Month'], ['week', 'Week'], ['day', 'Day']];

// The calendar's controls: the visible period as a title with previous/next,
// the Month | Week | Day switch, a jump back to today, and refresh.
export default function CalendarHeader({ view, title, onPrev, onNext, onToday, onView, onRefresh, isRefreshing }) {
  const step = view === 'month' ? 'month' : view === 'week' ? 'week' : 'day';
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        <h2 className="flex-1 min-w-0 text-xl font-bold text-black dark:text-white truncate">{title}</h2>
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
    </div>
  );
}
