import { useState } from 'react';
import { formatShortDate, formatSwiss } from '../lib/model';
import { parseExercise } from '../lib/exercises';
import { buildConsistency, CONSISTENCY_WEEKS } from '../lib/consistency';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const GRID = { gridTemplateColumns: '3rem repeat(7, minmax(0, 1fr))' };

// How a day is drawn. Shape as well as shade tells them apart: strength is solid,
// cardio is outlined, both is solid with a dot.
const SOLID = 'bg-primary text-on-primary';
const OUTLINE = 'bg-primary-soft border-2 border-primary text-black dark:text-white';
const EMPTY = 'bg-gray-100 dark:bg-violet-400/10 text-black dark:text-white';
const FUTURE = 'border border-dashed border-gray-300 dark:border-violet-400/25 text-black dark:text-white';
const cellClass = (d) => (d.isFuture ? FUTURE : d.strength ? SOLID : d.cardio ? OUTLINE : EMPTY);

const Total = ({ value, label }) => (
  <div className="rounded-xl bg-gray-100 dark:bg-violet-400/10 px-2 py-2.5 text-center">
    <div className="text-3xl font-display font-extrabold text-black dark:text-white leading-none">{value}</div>
    <div className="text-xs font-medium text-black dark:text-white mt-1">{label}</div>
  </div>
);

const Key = ({ className, dot, children }) => (
  <span className="flex items-center gap-1.5">
    <span className={`relative w-4 h-4 rounded ${className}`} aria-hidden="true">
      {dot && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-on-primary" />}
    </span>
    {children}
  </span>
);

// The last ten weeks as a calendar: one row per week, one big square per day. Tap a
// day to see what was logged on it.
export default function ConsistencyMap({ strengthLogs, cardioLogs }) {
  const { weeks, activeDays, thisWeek, bestWeek } = buildConsistency(strengthLogs, cardioLogs);
  const [picked, setPicked] = useState(null);

  const lifts = picked ? strengthLogs.filter(l => l.date === picked) : [];
  const runs = picked ? cardioLogs.filter(l => l.date === picked) : [];

  return (
    <div className="space-y-3 md:max-w-xl">
      <div className="grid grid-cols-3 gap-2">
        <Total value={thisWeek} label="days this week" />
        <Total value={bestWeek} label="best week" />
        <Total value={activeDays} label={`days in ${CONSISTENCY_WEEKS} weeks`} />
      </div>

      <div className="space-y-1">
        <div className="grid gap-1" style={GRID} aria-hidden="true">
          <span />
          {WEEKDAYS.map(d => <span key={d} className="text-center text-[11px] font-bold text-black dark:text-white">{d}</span>)}
        </div>
        {weeks.map(week => (
          <div key={week.weekStart} className="grid gap-1 items-center" style={GRID}>
            <span className="text-[11px] font-medium text-black dark:text-white whitespace-nowrap">{formatShortDate(week.weekStart)}</span>
            {week.days.map(d => {
              const what = d.strength && d.cardio ? 'strength and cardio' : d.strength ? 'strength' : d.cardio ? 'cardio' : 'nothing logged';
              return (
                <button
                  key={d.iso}
                  onClick={() => setPicked(p => (p === d.iso ? null : d.iso))}
                  disabled={d.isFuture}
                  aria-label={`${formatSwiss(d.iso)}: ${d.isFuture ? 'not yet' : what}`}
                  aria-pressed={picked === d.iso}
                  className={`relative aspect-square w-full rounded-lg flex items-center justify-center text-sm font-bold tabular-nums ${cellClass(d)} ${
                    picked === d.iso ? 'ring-2 ring-offset-2 ring-black dark:ring-white ring-offset-white dark:ring-offset-[#211b34]'
                      : d.isToday ? 'ring-2 ring-offset-2 ring-primary ring-offset-white dark:ring-offset-[#211b34]' : ''
                  }`}
                >
                  {d.dayOfMonth}
                  {d.strength && d.cardio && !d.isFuture && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-on-primary" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-black dark:text-white">
        <Key className={SOLID}>Strength</Key>
        <Key className={OUTLINE}>Cardio</Key>
        <Key className={SOLID} dot>Both</Key>
        <Key className={EMPTY}>Nothing</Key>
      </div>

      {picked ? (
        <div className="rounded-xl border border-gray-200 dark:border-violet-400/15 p-3" aria-live="polite">
          <div className="text-base font-bold text-black dark:text-white">{formatSwiss(picked)}</div>
          {lifts.length === 0 && runs.length === 0 && <p className="text-sm text-black dark:text-white">Nothing logged.</p>}
          {runs.map(l => (
            <p key={l.id} className="text-sm text-black dark:text-white">
              <span className="font-semibold">{l.activity}</span> · {l.duration} min{l.distance ? ` · ${l.distance} km` : ''}
            </p>
          ))}
          {lifts.length > 0 && (
            <p className="text-sm text-black dark:text-white">
              <span className="font-semibold">{lifts.length} exercise{lifts.length === 1 ? '' : 's'}:</span>{' '}
              {lifts.map(l => parseExercise(l.exercise).label).join(', ')}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-black dark:text-white">Tap a day to see what you did.</p>
      )}
    </div>
  );
}
