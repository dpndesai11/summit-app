import { useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { dayList } from '../lib/model';

// Length of a workout in minutes, with -5 / +5 buttons (no fiddly typing on a
// phone). The number can still be typed; it is committed when the field loses
// focus so typing "45" isn't clamped to 5 on the first keystroke.
function LengthField({ value, onCommit, label }) {
  const [draft, setDraft] = useState(null);
  const shown = draft ?? value;
  // A blank field just reverts; anything else is committed (and clamped upstream).
  const commit = (v) => { if (v !== '') onCommit(v); setDraft(null); };
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={() => commit(Math.max(5, Number(value) - 5))} aria-label={`Shorten ${label}`}
        className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-violet-400/10 flex items-center justify-center text-black dark:text-white">
        <Minus className="w-5 h-5" />
      </button>
      <input
        type="number" inputMode="numeric" min="5" step="5"
        value={shown}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => draft !== null && commit(draft)}
        aria-label={`Length of ${label} in minutes`}
        className="w-16 h-11 text-center text-base font-semibold bg-gray-100 dark:bg-violet-400/10 rounded-xl text-black dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
      />
      <button onClick={() => commit(Number(value) + 5)} aria-label={`Lengthen ${label}`}
        className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-violet-400/10 flex items-center justify-center text-black dark:text-white">
        <Plus className="w-5 h-5" />
      </button>
      <span className="text-base font-medium text-black dark:text-white">min</span>
    </div>
  );
}

// Everything about one day of the weekly plan: which workouts are on it, and
// when each starts and how long it runs (those times are what the Planner's
// calendar uses). Replaces the tiny inline editors that used to sit in every row.
export default function DaySheet({ w, day, onClose }) {
  const {
    templates, plan, getWorkoutTime, getWorkoutDuration, setWorkoutTime, setWorkoutDuration,
    addWorkoutToDay, removeWorkoutFromDay,
  } = w;
  const assigned = day ? dayList(plan[day]) : [];
  const available = templates.filter(t => !assigned.includes(t.name));

  return (
    <BottomSheet open={Boolean(day)} onClose={onClose} title={day || ''}>
      {assigned.length === 0 && (
        <p className="text-base text-black dark:text-white py-2">Rest day — add a workout below.</p>
      )}

      <div className="space-y-3">
        {assigned.map(name => (
          <div key={name} className="rounded-2xl border border-gray-200 dark:border-violet-400/15 p-3">
            <div className="flex items-start justify-between gap-3 mb-3">
              <span className="text-base font-bold text-black dark:text-white">{name}</span>
              <button onClick={() => removeWorkoutFromDay(day, name)} aria-label={`Remove ${name} from ${day}`}
                className="w-10 h-10 -mt-1 -mr-1 flex items-center justify-center text-black dark:text-white active:text-red-500">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <label className="flex items-center gap-2 text-base font-medium text-black dark:text-white">
                Starts
                <input
                  type="time"
                  value={getWorkoutTime(day, name)}
                  onChange={e => setWorkoutTime(day, name, e.target.value)}
                  aria-label={`Start time for ${name} on ${day}`}
                  className="h-11 px-3 text-base font-semibold bg-gray-100 dark:bg-violet-400/10 rounded-xl text-black dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                />
              </label>
              <LengthField
                value={getWorkoutDuration(day, name)}
                label={`${name} on ${day}`}
                onCommit={v => setWorkoutDuration(day, name, v)}
              />
            </div>
          </div>
        ))}
      </div>

      <h3 className="text-base font-bold text-black dark:text-white mt-5 mb-2">Add a workout</h3>
      {available.length === 0 ? (
        <p className="text-base text-black dark:text-white pb-2">Every workout is already on {day}.</p>
      ) : (
        <div className="space-y-2 pb-2">
          {available.map(t => (
            <button
              key={t.id}
              onClick={() => addWorkoutToDay(day, t.name)}
              className="w-full min-h-[48px] flex items-center gap-3 px-4 rounded-xl border border-dashed border-gray-200 dark:border-violet-400/25 text-left text-base font-medium text-black dark:text-white active:bg-violet-50 dark:active:bg-violet-500/10"
            >
              <Plus className="w-5 h-5 text-violet-600 flex-shrink-0" />
              <span className="flex-1 min-w-0 truncate">{t.name}</span>
            </button>
          ))}
        </div>
      )}
    </BottomSheet>
  );
}
