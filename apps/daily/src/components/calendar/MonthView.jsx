import { EVENT_COLORS, dayMarkers, monthGrid, toISODate } from '../../lib/calendar';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_CHIPS = 2;
const MAX_DOTS = 4;

// A conventional month grid, Monday-start. Each cell is a button: the date
// (today filled, the selected day ringed), then what's on — coloured dots on a
// phone, up to two event titles from `md` up. Days outside the month sit on a
// sunken background rather than faded text. Tapping a day selects it; the
// agenda for it is shown beside/below the grid.
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
          const dots = [
            ...m.events.map(e => EVENT_COLORS[e.color].dot),
            ...(m.workouts ? ['bg-orange-500'] : []),
            ...(m.meals ? ['bg-green-600'] : []),
            ...(m.tasks ? ['bg-primary'] : []),
          ];
          const total = m.events.length + m.workouts + m.meals + m.tasks;
          const label = `${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}${total ? `, ${total} item${total === 1 ? '' : 's'}` : ''}`;
          return (
            <button
              key={iso}
              onClick={() => onSelect(iso)}
              aria-label={label}
              aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
              className={`relative flex flex-col items-center md:items-stretch gap-1 min-h-[60px] md:min-h-[104px] p-1 md:p-1.5 text-left ${
                inMonth ? 'bg-surface-raised' : 'bg-surface-sunken'
              } ${isSelected ? 'ring-2 ring-inset ring-primary z-10' : ''}`}
            >
              <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0 ${
                isToday ? 'bg-primary text-on-primary' : 'text-black dark:text-white'
              }`}>
                {d.getDate()}
              </span>

              {/* Phone: a row of dots. */}
              <span className="md:hidden flex flex-wrap justify-center gap-0.5 max-w-full">
                {dots.slice(0, MAX_DOTS).map((cls, i) => (
                  <span key={i} className={`w-1.5 h-1.5 rounded-full ${cls}`} />
                ))}
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
                {(m.workouts > 0 || m.meals > 0 || m.tasks > 0) && (
                  <span className="flex items-center gap-1 px-1 pt-0.5">
                    {m.workouts > 0 && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                    {m.meals > 0 && <span className="w-1.5 h-1.5 rounded-full bg-green-600" />}
                    {m.tasks > 0 && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
