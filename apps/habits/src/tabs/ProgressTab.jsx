import { Archive, Flame, Trash2 } from 'lucide-react';
import { CollapsibleCard } from '@summit/core';
import { COLOR_PRESETS } from '../lib/model';
import { streakFor } from '../lib/stats';
import StreakCalendar, { HEATMAP_WEEKS } from '../components/StreakCalendar';

const card = 'bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15';

// Progress: every habit (active and archived), each with its own streak and
// consistency heatmap, collapsed by default like every CollapsibleCard in
// Summit.
export default function ProgressTab({ w }) {
  const { habits, habitLogs, archiveHabit, deleteHabit } = w;
  const active = habits.filter(h => !h.archived);
  const archived = habits.filter(h => h.archived);

  const renderHabit = (h) => {
    const meta = COLOR_PRESETS[h.color];
    const streak = streakFor(h.id, habitLogs);
    return (
      <CollapsibleCard
        key={h.id}
        title={h.name}
        badge={`last ${HEATMAP_WEEKS} weeks`}
        actions={
          <div className="flex items-center gap-1">
            {!h.archived && (
              <button
                onClick={() => archiveHabit(h.id)}
                aria-label={`Archive ${h.name}`}
                className="w-9 h-9 flex items-center justify-center text-black dark:text-white active:text-violet-600"
              >
                <Archive className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => deleteHabit(h.id)}
              aria-label={`Delete ${h.name}`}
              className="w-9 h-9 flex items-center justify-center text-black dark:text-white active:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        }
      >
        <div className="flex items-center gap-2 mb-3">
          <Flame className={`w-5 h-5 ${meta.text}`} />
          <span className="text-lg font-bold text-black dark:text-white tabular-nums">{streak}</span>
          <span className="text-base text-black dark:text-white">{streak === 1 ? 'day' : 'days'}</span>
        </div>
        <StreakCalendar habitId={h.id} habitLogs={habitLogs} colorClass={meta.dot} />
      </CollapsibleCard>
    );
  };

  if (habits.length === 0) {
    return (
      <div className={`${card} p-5 text-center text-base text-black dark:text-white`}>
        Add a habit on Today and its streak and history show up here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {active.map(renderHabit)}
      {archived.length > 0 && (
        <>
          <h2 className="text-lg font-bold text-black dark:text-white pt-2">Archived</h2>
          {archived.map(renderHabit)}
        </>
      )}
    </div>
  );
}
