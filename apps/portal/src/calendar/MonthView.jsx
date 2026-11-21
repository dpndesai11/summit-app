import { EVENT_COLORS, dayMarkers, monthGrid, toISODate } from './calendar';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_CHIPS = 2;

// How full the busyness bar is: a quiet day is a short bar, six or more items fill it.
const barWidth = (total) => Math.min(100, 28 + total * 12);

// A conventional month grid, Monday-start. Each cell is a button: the date
// (today a bold filled circle, the selected day in a thick ring), a wash of colour
// by what the day holds (workout pink, your events purple, tasks blue), and a bar
// along the bottom that is longer on busier days and split by category. From `md`
// up the cell also lists up to two event titles. Days outside the month sit on a
// sunken background rather than faded text. Tapping a day selects it; the agenda
// for it is shown beside/below the grid.
export default function MonthView({ date, selectedISO, todayISO, data, onSelect }) {
  const days = monthGrid(date);
  const month = date.getMonth();

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-violet-400/15 bg-surface-raised">
      <div className="grid grid-cols-7 text-center border-b border-gray-200 dark:border-violet-400/15">
        {WEEKDAYS.map(d => (
          <div key={d} className="py-2 text-xs font-semibold text-black dark:text-white">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-border">
        {days.map(d => {
          const iso = toISODate(d);
          const m = dayMarkers(data, iso);
          const inMonth = d.getMonth() === month;
          const isToday = iso === todayISO;
          const isSelected = iso === selectedISO;
          const total = m.events.length + m.workouts + m.meals + m.tasks;
          // Meals are planned every day, so they count in the bar but never decide whether there is one.
          const notable = m.events.length + m.workouts + m.tasks;
          // Bar segments in a fixed order, sized by how many of each there are.
          const segments = [
            { cls: 'bg-primary', n: m.events.length },
            { cls: 'bg-[#d6006e]', n: m.workouts },
            { cls: 'bg-blue-600', n: m.tasks },
            { cls: 'bg-emerald-700', n: m.meals },
          ].filter(s => s.n > 0);
          const wash = !inMonth ? 'bg-surface-sunken'
            : m.workouts ? 'bg-pink-50 dark:bg-pink-500/10'
            : m.events.length ? 'bg-primary-soft'
            : m.tasks ? 'bg-blue-50 dark:bg-blue-500/10'
            : 'bg-surface-raised';
          const label = `${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}${total ? `, ${total} item${total === 1 ? '' : 's'}` : ''}`;
          return (
            <button
              key={iso}
              onClick={() => onSelect(iso)}
              aria-label={label}
              aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
              className={`relative flex flex-col items-center md:items-stretch gap-1 min-h-[72px] md:min-h-[112px] p-1 md:p-1.5 pb-2 text-left ${wash} ${
                isSelected ? 'ring-[3px] ring-inset ring-primary z-10' : ''
              }`}
            >
              <span className={`text-sm w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 ${
                isToday ? 'bg-primary text-on-primary text-base font-extrabold shadow-sm' : 'font-semibold text-black dark:text-white'
              }`}>
                {d.getDate()}
              </span>

              {/* Desktop: event titles, then the recurring workout/meal/task markers. */}
              <span className="hidden md:flex flex-col gap-0.5 min-w-0">
                {m.events.slice(0, MAX_CHIPS).map(e => (
                  <span key={e.id} className={`block truncate rounded px-1 py-0.5 text-[11px] font-medium ${EVENT_COLORS[e.color].fill}`}>
                    {e.title}
                  </span>
                ))}
                {m.events.length > MAX_CHIPS && (
                  <span className="text-[11px] font-medium text-black dark:text-white px-1">+{m.events.length - MAX_CHIPS} more</span>
                )}
              </span>

              {/* The busyness bar: longer on busier days, split by category. */}
              {notable > 0 && (
                <span
                  aria-hidden="true"
                  className="mt-auto h-1.5 rounded-full overflow-hidden flex"
                  style={{ width: `${barWidth(notable)}%` }}
                >
                  {segments.map(s => <span key={s.cls} className={s.cls} style={{ flexGrow: s.n }} />)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
