import { useState } from 'react';
import { Flame, Plus } from 'lucide-react';
import { COLOR_PRESETS, COLORS, toISO } from '../lib/model';
import { anyHabitStreak, streakFor } from '../lib/stats';

const card = 'bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15';

// Today: the day's checklist. A `<label>` wrapping a `<button>` double-fires
// its own click (the label forwards the click to the labelable child), so
// every toggle here is a bare `<button>` with the checkbox visual as a child
// `<span>` — same rule as the rest of the codebase.
export default function TodayTab({ w }) {
  const { habits, habitLogs, addHabit, toggleHabitForDate } = w;
  const [draftName, setDraftName] = useState('');
  const [draftColor, setDraftColor] = useState('violet');
  const today = toISO(new Date());
  const active = habits.filter(h => !h.archived);
  const todaysDone = new Set((Array.isArray(habitLogs[today]) ? habitLogs[today] : []));
  const anyStreak = anyHabitStreak(habitLogs);

  const submit = () => {
    if (!draftName.trim()) return;
    addHabit(draftName, draftColor);
    setDraftName('');
  };

  return (
    <div className="space-y-6">
      <div className={`${card} p-4 flex items-center gap-3`}>
        <Flame className="w-6 h-6 text-orange-500 flex-shrink-0" />
        <div>
          <div className="text-2xl font-bold text-black dark:text-white tabular-nums">{anyStreak}</div>
          <div className="text-sm text-black dark:text-white">{anyStreak === 1 ? 'day streak' : 'days streak'} — any habit</div>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-bold text-black dark:text-white mb-2">Today</h2>
        {active.length === 0 ? (
          <div className={`${card} p-5 text-center text-base text-black dark:text-white`}>
            No habits yet — add your first one below.
          </div>
        ) : (
          <div className={`${card} divide-y divide-gray-100 dark:divide-violet-400/15 overflow-hidden`}>
            {active.map(h => {
              const meta = COLOR_PRESETS[h.color];
              const done = todaysDone.has(h.id);
              const streak = streakFor(h.id, habitLogs);
              return (
                <button
                  key={h.id}
                  onClick={() => toggleHabitForDate(h.id, today)}
                  aria-pressed={done}
                  className="w-full flex items-center gap-3 px-4 py-3 min-h-[64px] text-left"
                >
                  <span
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      done ? `${meta.dot} border-transparent` : 'border-gray-300 dark:border-white/20'
                    }`}
                  >
                    {done && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-base font-semibold text-black dark:text-white truncate">{h.name}</span>
                    {streak > 0 && (
                      <span className={`block text-sm font-semibold ${meta.text}`}>{streak} day{streak === 1 ? '' : 's'}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-black dark:text-white mb-2">Add a habit</h2>
        <div className={`${card} p-4 space-y-3`}>
          <input
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="e.g. Drink water"
            className="w-full min-h-[48px] px-4 rounded-xl bg-gray-100 dark:bg-violet-400/10 text-base text-black dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
          />
          <div className="flex items-center gap-2">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setDraftColor(c)}
                aria-label={COLOR_PRESETS[c].label}
                aria-pressed={draftColor === c}
                className={`w-8 h-8 rounded-full ${COLOR_PRESETS[c].dot} flex-shrink-0 ${draftColor === c ? `ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#211b34] ${COLOR_PRESETS[c].ring}` : ''}`}
              />
            ))}
            <button
              onClick={submit}
              disabled={!draftName.trim()}
              className="flex-1 min-h-[44px] rounded-xl bg-violet-600 text-white text-base font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> Add
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
