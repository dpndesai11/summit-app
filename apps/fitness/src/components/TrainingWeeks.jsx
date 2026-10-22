import { useState } from 'react';
import { CalendarRange, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { BottomSheet, CollapsibleCard } from '@summit/core';
import { formatShortDate, toISO } from '../lib/model';
import { mondayOf } from '../lib/stats';
import {
  PATTERNS, WEEK_TYPES, WEEK_TYPE_ORDER, actualKm, generateWeeks, removeWeek, upsertWeeks, weekFor,
} from '../lib/training';

const fmtKm = (v) => (Number.isInteger(v) ? String(v) : (Math.round(v * 10) / 10).toString());
const field = 'w-full min-h-[48px] px-3 rounded-xl bg-gray-100 dark:bg-violet-400/10 text-base text-black dark:text-white outline-none focus:ring-2 focus:ring-focus-ring';
const weekRange = (weekStart) => {
  const [y, m, d] = weekStart.split('-').map(Number);
  return `${formatShortDate(weekStart)} – ${formatShortDate(toISO(new Date(y, m - 1, d + 6)))}`;
};

export function TypeBadge({ type }) {
  const meta = WEEK_TYPES[type];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-black dark:text-white">
      <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} /> {meta.label}
    </span>
  );
}

// Edit one week: its type, name, km target and a free-text note.
function WeekSheet({ week, onSave, onDelete, onClose }) {
  const [draft, setDraft] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Re-seed the form whenever a different week opens.
  const [seenKey, setSeenKey] = useState(null);
  if (week && seenKey !== week.weekStart) {
    setSeenKey(week.weekStart);
    setDraft({ ...week, targetKm: week.targetKm ?? '' });
    setConfirmDelete(false);
  }
  const close = () => { setSeenKey(null); onClose(); };
  if (!week || !draft) return <BottomSheet open={false} onClose={onClose} title="" />;
  const set = (patch) => setDraft(d => ({ ...d, ...patch }));

  return (
    <BottomSheet open onClose={close} title={weekRange(week.weekStart)}>
      <div className="space-y-4 pb-2">
        <div>
          <div className="text-base font-bold text-black dark:text-white mb-2">Week type</div>
          <div className="grid grid-cols-2 gap-2">
            {WEEK_TYPE_ORDER.map(t => (
              <button
                key={t}
                onClick={() => set({ type: t })}
                aria-pressed={draft.type === t}
                className={`min-h-[52px] px-3 rounded-xl text-left border-2 ${draft.type === t ? 'border-primary bg-primary-soft' : 'border-gray-200 dark:border-violet-400/15'}`}
              >
                <TypeBadge type={t} />
                <span className="block text-sm text-black dark:text-white">{WEEK_TYPES[t].hint}</span>
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="block text-base font-bold text-black dark:text-white mb-1">Name</span>
          <input className={field} value={draft.label} onChange={e => set({ label: e.target.value })} placeholder="e.g. Week 3" />
        </label>
        <label className="block">
          <span className="block text-base font-bold text-black dark:text-white mb-1">Running target (km)</span>
          <input className={field} type="number" inputMode="decimal" min="0" step="0.5" value={draft.targetKm} onChange={e => set({ targetKm: e.target.value })} placeholder="Optional" />
        </label>
        <label className="block">
          <span className="block text-base font-bold text-black dark:text-white mb-1">Plan / notes</span>
          <textarea className={`${field} py-2`} rows={6} value={draft.note} onChange={e => set({ note: e.target.value })} placeholder="Sessions, pace, anything to remember" />
        </label>
        <button onClick={() => { onSave({ ...draft, targetKm: draft.targetKm === '' ? null : Number(draft.targetKm) }); close(); }}
          className="w-full min-h-[52px] rounded-xl bg-primary text-on-primary text-base font-bold">
          Save week
        </button>
        <button
          onClick={() => (confirmDelete ? (onDelete(week.weekStart), close()) : setConfirmDelete(true))}
          className="w-full min-h-[48px] rounded-xl bg-gray-100 dark:bg-violet-400/10 text-base font-semibold text-black dark:text-white flex items-center justify-center gap-2"
        >
          <Trash2 className="w-5 h-5 text-danger" /> {confirmDelete ? 'Tap again to remove this week' : 'Remove week'}
        </button>
      </div>
    </BottomSheet>
  );
}

// Add a run of weeks following a load/deload pattern.
function AddWeeksSheet({ open, weeks, onAdd, onClose }) {
  const [start, setStart] = useState(() => mondayOf(toISO(new Date())));
  const [count, setCount] = useState(8);
  const [patternId, setPatternId] = useState('3+1');
  const pattern = PATTERNS.find(p => p.id === patternId);
  const generated = start ? generateWeeks(start, count, pattern) : [];
  const overlap = generated.filter(g => weeks.some(w => w.weekStart === g.weekStart)).length;

  return (
    <BottomSheet open={open} onClose={onClose} title="Plan weeks ahead">
      <div className="space-y-4 pb-2">
        <label className="block">
          <span className="block text-base font-bold text-black dark:text-white mb-1">Starting week (any day in it)</span>
          <input className={field} type="date" value={start} onChange={e => setStart(e.target.value)} />
        </label>
        <div>
          <span className="block text-base font-bold text-black dark:text-white mb-1">How many weeks</span>
          <div className="flex gap-2">
            {[4, 6, 8, 12].map(n => (
              <button key={n} onClick={() => setCount(n)} aria-pressed={count === n}
                className={`flex-1 min-h-[48px] rounded-xl text-base font-semibold text-black dark:text-white ${count === n ? 'bg-primary-soft border-2 border-primary' : 'bg-gray-100 dark:bg-violet-400/10'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="block text-base font-bold text-black dark:text-white mb-1">Pattern</span>
          <div className="grid grid-cols-2 gap-2">
            {PATTERNS.map(p => (
              <button key={p.id} onClick={() => setPatternId(p.id)} aria-pressed={patternId === p.id}
                className={`min-h-[48px] rounded-xl text-base font-semibold text-black dark:text-white ${patternId === p.id ? 'bg-primary-soft border-2 border-primary' : 'bg-gray-100 dark:bg-violet-400/10'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Preview">
          {generated.map(g => (
            <span key={g.weekStart} className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-violet-400/10"><TypeBadge type={g.type} /></span>
          ))}
        </div>
        {overlap > 0 && (
          <p className="text-base text-black dark:text-white">{overlap} of these weeks already exist and will be replaced (their targets and notes are lost).</p>
        )}
        <button onClick={() => { onAdd(generated); onClose(); }} disabled={!start}
          className="w-full min-h-[52px] rounded-xl bg-primary text-on-primary text-base font-bold disabled:opacity-40">
          Add {count} weeks
        </button>
      </div>
    </BottomSheet>
  );
}

// Reference notes for a block (goals, rules, nutrition...), each section its own
// collapsed card.
function BlockNotes({ block }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-base font-bold text-black dark:text-white">{block.name}</div>
        <div className="text-sm text-black dark:text-white">{formatShortDate(block.start)} – {formatShortDate(block.end)}</div>
        {block.summary && <p className="text-base text-black dark:text-white mt-1">{block.summary}</p>}
      </div>
      {(block.sections || []).map(sec => (
        <CollapsibleCard key={sec.title} title={sec.title}>
          <p className="text-base text-black dark:text-white whitespace-pre-line">{sec.body}</p>
        </CollapsibleCard>
      ))}
    </div>
  );
}

// "Training weeks" card on the Plan tab: the week list with type, km target vs
// actual, tap to edit, plus the block's reference notes.
export default function TrainingWeeks({ w }) {
  const { trainingWeeks, trainingBlocks, cardioLogs, updateTrainingWeeks, todayISO } = w;
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const current = weekFor(trainingWeeks, todayISO);
  const thisMonday = mondayOf(todayISO);

  return (
    <>
      <CollapsibleCard
        title="Training weeks"
        icon={CalendarRange}
        iconColor="text-primary"
        badge={current ? WEEK_TYPES[current.type].label : trainingWeeks.length ? `${trainingWeeks.length}` : null}
      >
        <div className="space-y-2">
          {trainingWeeks.length === 0 && (
            <p className="text-base text-black dark:text-white">Plan weeks ahead and mark which are load, deload or test weeks.</p>
          )}
          {trainingWeeks.map(wk => {
            const km = actualKm(cardioLogs, wk.weekStart);
            const isCurrent = wk.weekStart === thisMonday;
            const past = wk.weekStart < thisMonday;
            return (
              <button
                key={wk.weekStart}
                onClick={() => setEditing(wk)}
                aria-label={`${wk.label || weekRange(wk.weekStart)}, ${WEEK_TYPES[wk.type].label} week`}
                className={`w-full text-left rounded-xl px-3 py-2 min-h-[64px] flex items-center gap-3 ${isCurrent ? 'border-2 border-primary bg-primary-soft' : 'border border-gray-200 dark:border-violet-400/15'}`}
              >
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2 flex-wrap">
                    <TypeBadge type={wk.type} />
                    <span className="text-base font-semibold text-black dark:text-white">{wk.label}</span>
                    {isCurrent && <span className="text-sm font-bold text-black dark:text-white">· this week</span>}
                  </span>
                  <span className="block text-sm text-black dark:text-white">{weekRange(wk.weekStart)}</span>
                  {(wk.targetKm || km > 0) && (
                    <span className="block text-sm text-black dark:text-white tabular-nums">
                      {wk.targetKm ? `${fmtKm(km)} / ${fmtKm(wk.targetKm)} km` : `${fmtKm(km)} km`}
                      {past && wk.targetKm && km >= wk.targetKm * 0.9 ? ' · hit' : ''}
                    </span>
                  )}
                </span>
                <ChevronRight className="w-5 h-5 text-black dark:text-white flex-shrink-0" />
              </button>
            );
          })}
          <button onClick={() => setAdding(true)}
            className="w-full min-h-[48px] rounded-xl border-2 border-dashed border-border-strong text-base font-semibold text-black dark:text-white flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> Plan weeks ahead
          </button>
        </div>
        {trainingBlocks.length > 0 && (
          <div className="mt-4 space-y-4">
            {trainingBlocks.map(b => <BlockNotes key={b.id} block={b} />)}
          </div>
        )}
      </CollapsibleCard>

      <WeekSheet
        week={editing}
        onClose={() => setEditing(null)}
        onSave={(next) => updateTrainingWeeks(upsertWeeks(trainingWeeks, [next]))}
        onDelete={(weekStart) => updateTrainingWeeks(removeWeek(trainingWeeks, weekStart))}
      />
      <AddWeeksSheet
        open={adding}
        weeks={trainingWeeks}
        onAdd={(generated) => updateTrainingWeeks(upsertWeeks(trainingWeeks, generated))}
        onClose={() => setAdding(false)}
      />
    </>
  );
}
