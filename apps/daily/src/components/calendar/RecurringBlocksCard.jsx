import { useState } from 'react';
import { Repeat, Plus, Pencil, Trash2, X } from 'lucide-react';
import { CollapsibleCard } from '@summit/core';
import {
  BLOCK_COLORS, BLOCK_COLOR_PRESETS, DAYS, formatDuration, formatTime, groupBlockDays, normalizeBlockDays,
} from '../../lib/calendar';

const DEFAULT_RECURRING_BLOCK = { name: '', color: 'slate', days: {} };

// Recurring background blocks — repeating commitments that aren't tasks,
// workouts, meals or events (work hours, uni hours, commute) — drawn as a
// lighter band behind the Week and Day views on the days you pick. Each picked
// day carries its own time/duration (Mon–Thu 8–16, a Friday that ends at 15).
// The builder's state lives here; the blocks themselves are saved by the parent.
export default function RecurringBlocksCard({ recurringBlocks, saveRecurringBlocks, showToast }) {
  const [blockBuilder, setBlockBuilder] = useState(DEFAULT_RECURRING_BLOCK);
  const [blockBuilderOpen, setBlockBuilderOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState(null);

  // Toggling a day on copies another already-picked day's time/duration (most
  // days share the same hours) rather than resetting to a default every time.
  const toggleBuilderDay = (day) => setBlockBuilder(p => {
    const next = { ...p.days };
    if (next[day]) {
      delete next[day];
    } else {
      const existing = Object.values(p.days)[0];
      next[day] = existing ? { ...existing } : { time: '09:00', duration: 60 };
    }
    return { ...p, days: next };
  });
  const setBuilderDayField = (day, field, value) => setBlockBuilder(p => ({
    ...p, days: { ...p.days, [day]: { ...p.days[day], [field]: value } }
  }));
  const startEditBlock = (b) => {
    setBlockBuilder({ name: b.name, color: b.color, days: normalizeBlockDays(b) });
    setEditingBlockId(b.id);
    setBlockBuilderOpen(true);
  };
  const closeBlockBuilder = () => {
    setBlockBuilder(DEFAULT_RECURRING_BLOCK);
    setEditingBlockId(null);
    setBlockBuilderOpen(false);
  };
  const saveBlock = () => {
    if (!blockBuilder.name.trim() || Object.keys(blockBuilder.days).length === 0) return;
    const clean = { name: blockBuilder.name.trim(), color: blockBuilder.color, days: blockBuilder.days };
    if (editingBlockId) {
      saveRecurringBlocks(recurringBlocks.map(b => (b.id === editingBlockId ? { ...b, ...clean } : b)));
      showToast('Block updated');
    } else {
      saveRecurringBlocks([...recurringBlocks, { id: Date.now(), ...clean }]);
      showToast('Block added');
    }
    closeBlockBuilder();
  };
  const deleteBlock = (id) => {
    saveRecurringBlocks(recurringBlocks.filter(b => b.id !== id));
    if (editingBlockId === id) closeBlockBuilder();
  };

  return (
    <CollapsibleCard
      title="Recurring blocks"
      icon={Repeat}
      iconColor="text-primary"
      badge={recurringBlocks.length > 0 ? `${recurringBlocks.length}` : null}
      actions={
        <button
          onClick={() => (blockBuilderOpen ? closeBlockBuilder() : setBlockBuilderOpen(true))}
          className="flex items-center gap-1 text-[11px] font-medium text-primary bg-primary-soft px-2.5 py-1 rounded-lg active:bg-primary-soft"
        >
          {blockBuilderOpen ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {blockBuilderOpen ? 'Cancel' : 'New'}
        </button>
      }
    >
      <p className="text-xs text-black dark:text-white mb-3">
        Repeating commitments that aren't tasks, workouts, or meals — work hours, uni hours, commute — shown as a lighter band on the days you pick. Life happens, so each day gets its own time — edit them all here.
      </p>

      {blockBuilderOpen && (
        <div className="bg-gray-50 dark:bg-violet-400/5 rounded-xl p-3 mb-3 space-y-2.5">
          <input
            value={blockBuilder.name}
            onChange={(e) => setBlockBuilder(p => ({ ...p, name: e.target.value }))}
            placeholder="Name (e.g. Work hours, Commute)"
            className="w-full bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 rounded-lg px-3 py-2 text-sm text-black dark:text-white outline-none focus:border-focus-ring"
          />

          <div className="flex flex-wrap gap-1.5">
            {BLOCK_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setBlockBuilder(p => ({ ...p, color: c }))}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${BLOCK_COLOR_PRESETS[c].chip} ${blockBuilder.color === c ? 'border-current' : 'border-transparent opacity-50'}`}
              >
                {BLOCK_COLOR_PRESETS[c].label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {DAYS.map(day => (
              <button
                key={day}
                onClick={() => toggleBuilderDay(day)}
                className={`text-[11px] font-medium w-11 h-7 rounded-full ${blockBuilder.days[day] ? 'bg-primary text-on-primary' : 'bg-white dark:bg-[#211b34] text-black dark:text-on-primary border border-gray-200 dark:border-violet-400/15'}`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>

          {Object.keys(blockBuilder.days).length > 0 && (
            <div className="space-y-1.5">
              {DAYS.filter(d => blockBuilder.days[d]).map(day => (
                <div key={day} className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-black dark:text-white w-9 flex-shrink-0">{day.slice(0, 3)}</span>
                  <input
                    type="time"
                    value={blockBuilder.days[day].time}
                    onChange={(e) => setBuilderDayField(day, 'time', e.target.value)}
                    className="flex-1 min-w-0 bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 rounded-lg px-2 py-1.5 text-xs text-black dark:text-white outline-none focus:border-focus-ring"
                  />
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={blockBuilder.days[day].duration}
                    onChange={(e) => setBuilderDayField(day, 'duration', Math.max(5, Number(e.target.value) || 5))}
                    className="w-16 flex-shrink-0 bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 rounded-lg px-2 py-1.5 text-xs text-black dark:text-white outline-none focus:border-focus-ring"
                  />
                  <span className="text-[11px] text-black dark:text-white flex-shrink-0">min</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={saveBlock}
            disabled={!blockBuilder.name.trim() || Object.keys(blockBuilder.days).length === 0}
            className="w-full h-10 bg-primary text-on-primary rounded-lg text-sm font-semibold disabled:opacity-40 active:bg-primary-hover"
          >
            {editingBlockId ? 'Save changes' : 'Add block'}
          </button>
        </div>
      )}

      {recurringBlocks.length === 0 ? (
        <p className="text-xs text-black dark:text-white text-center py-2">No recurring blocks yet — add one above.</p>
      ) : (
        <div className="space-y-2">
          {recurringBlocks.map(b => {
            const preset = BLOCK_COLOR_PRESETS[b.color] || BLOCK_COLOR_PRESETS.slate;
            const groups = groupBlockDays(normalizeBlockDays(b));
            return (
              <div key={b.id} className="border border-gray-200 dark:border-violet-400/15 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${preset.chip}`}>{b.name}</span>
                  <button onClick={() => startEditBlock(b)} className="ml-auto text-black dark:text-white active:text-primary p-1" aria-label={`Edit ${b.name}`}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteBlock(b.id)} className="text-black dark:text-white active:text-danger p-1" aria-label={`Delete ${b.name}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-0.5">
                  {groups.map(g => (
                    <div key={g.key} className="text-[11px] text-black dark:text-white">
                      <span className="font-medium">{g.dayNames.map(d => d.slice(0, 3)).join(' ')}</span>
                      {' · '}{formatTime(g.time)} · {formatDuration(g.duration)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CollapsibleCard>
  );
}
