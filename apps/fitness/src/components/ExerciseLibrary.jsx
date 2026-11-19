import { useState } from 'react';
import { BookMarked, Search, Trash2 } from 'lucide-react';
import { BottomSheet, CollapsibleCard } from '@summit/core';
import { TYPE_META, cycleExerciseType } from '../lib/exercises';
import { duplicatePairs, mergeEntries, similarEntries } from '../lib/library';

const inputClass = 'w-full min-h-[48px] pl-11 pr-4 rounded-xl bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 text-base text-black dark:text-white outline-none focus:ring-2 focus:ring-focus-ring';

// The exercise library: one entry per drill. Workouts pick from it (so the same
// drill is never added twice), and old spellings are kept as aliases so history
// stays together. Nothing here rewrites a saved log.
export default function ExerciseLibrary({ w }) {
  const { library, updateLibrary, templates, updateTemplates, statsLogs } = w;
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [mergeInto, setMergeInto] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const entry = library.find(e => e.id === openId) || null;
  const names = (e) => new Set([e.name, ...(e.aliases || [])]);
  const usage = (e) => {
    const ns = names(e);
    return {
      workouts: templates.filter(t => t.exercises.some(x => ns.has(x.name))).length,
      logs: statsLogs.filter(l => l.exercise === e.name).length,
    };
  };
  const q = query.trim().toLowerCase();
  const rows = library
    .filter(e => !q || e.name.toLowerCase().includes(q) || (e.aliases || []).some(a => a.toLowerCase().includes(q)))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  const pairs = duplicatePairs(library);

  const close = () => { setOpenId(null); setMergeInto(null); setConfirmDelete(false); };

  // Folding one entry into another points any workout that used the old name at the
  // surviving one. History is untouched: the old name becomes an alias.
  const merge = (fromId, intoId) => {
    const from = library.find(e => e.id === fromId);
    const into = library.find(e => e.id === intoId);
    if (!from || !into) return;
    const fromNames = names(from);
    updateTemplates(templates.map(t => ({
      ...t,
      exercises: t.exercises.map(x => (fromNames.has(x.name) ? { ...x, name: into.name, type: into.type } : x)),
    })));
    updateLibrary(mergeEntries(library, fromId, intoId));
    close();
  };

  const candidates = entry ? similarEntries(library.filter(e => e.id !== entry.id), entry.name, 6) : [];
  const others = entry ? library.filter(e => e.id !== entry.id).sort((a, b) => a.name.localeCompare(b.name)) : [];

  return (
    <>
      <CollapsibleCard title="Exercise library" icon={BookMarked} iconColor="text-primary" badge={library.length ? `${library.length}` : null}>
        <div className="space-y-3">
          <p className="text-base text-black dark:text-white">
            Every drill once. Workouts pick from here, and old spellings stay as aliases so your history is never split.
          </p>
          {pairs.length > 0 && (
            <div className="rounded-xl border border-warning p-3 space-y-2">
              <p className="text-base font-bold text-black dark:text-white">Possible duplicates ({pairs.length})</p>
              {pairs.slice(0, 5).map(([a, b]) => (
                <div key={`${a.id}-${b.id}`} className="flex items-center gap-2">
                  <span className="flex-1 min-w-0 text-base text-black dark:text-white">{a.name} <span className="font-bold">/</span> {b.name}</span>
                  <button onClick={() => { setOpenId(b.id); setMergeInto(a.id); }}
                    className="min-h-[44px] px-3 rounded-xl bg-gray-100 dark:bg-violet-400/10 text-sm font-bold text-black dark:text-white flex-shrink-0">
                    Review
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="relative block">
            <Search className="w-5 h-5 text-black dark:text-white absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search exercises"
              aria-label="Search the exercise library" className={inputClass} />
          </label>
          <div className="rounded-2xl border border-gray-200 dark:border-violet-400/15 divide-y divide-gray-100 dark:divide-violet-400/15 overflow-hidden">
            {rows.length === 0 && <div className="px-4 py-3 text-base text-black dark:text-white">No exercise matches.</div>}
            {rows.map(e => {
              const u = usage(e);
              const meta = TYPE_META[e.type] || TYPE_META.weight;
              const Icon = meta.icon;
              return (
                <button key={e.id} onClick={() => setOpenId(e.id)} aria-label={`Open ${e.name}`}
                  className="w-full flex items-center gap-3 px-4 py-2.5 min-h-[56px] text-left">
                  <Icon className={`w-5 h-5 flex-shrink-0 ${meta.iconText}`} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-base font-semibold text-black dark:text-white truncate">{e.name}</span>
                    <span className="block text-sm text-black dark:text-white">
                      {u.workouts} workout{u.workouts === 1 ? '' : 's'} · {u.logs} log{u.logs === 1 ? '' : 's'}
                      {(e.aliases || []).length > 0 ? ` · ${(e.aliases || []).length} old name${(e.aliases || []).length === 1 ? '' : 's'}` : ''}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </CollapsibleCard>

      <BottomSheet open={Boolean(entry)} onClose={close} title={entry ? entry.name : ''}>
        {entry && (
          <div className="space-y-4 pb-2">
            <button
              onClick={() => updateLibrary(library.map(e => (e.id === entry.id ? { ...e, type: cycleExerciseType(e.type) } : e)))}
              className="min-h-[48px] px-4 rounded-xl bg-gray-100 dark:bg-violet-400/10 text-base font-semibold text-black dark:text-white flex items-center gap-2"
              title="Tap to change type"
            >
              {(() => { const Icon = (TYPE_META[entry.type] || TYPE_META.weight).icon; return <Icon className="w-5 h-5" />; })()}
              {(TYPE_META[entry.type] || TYPE_META.weight).label} — tap to change
            </button>

            <div>
              <div className="text-base font-bold text-black dark:text-white mb-1">Also known as</div>
              {(entry.aliases || []).length === 0
                ? <p className="text-base text-black dark:text-white">No other spellings.</p>
                : (entry.aliases || []).map(a => (
                  <p key={a} className="text-base text-black dark:text-white break-words">{a.replace(/\t/g, ' · ')}</p>
                ))}
            </div>

            <div>
              <div className="text-base font-bold text-black dark:text-white mb-1">Merge into another exercise</div>
              <p className="text-sm text-black dark:text-white mb-2">
                Use this when two entries are the same drill. This one’s name becomes an alias of the one you pick, and its history counts under it.
              </p>
              {candidates.length > 0 && !mergeInto && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {candidates.map(c => (
                    <button key={c.id} onClick={() => setMergeInto(c.id)}
                      className="min-h-[44px] px-3 rounded-xl border-2 border-warning text-sm font-bold text-black dark:text-white">
                      Looks like “{c.name}”
                    </button>
                  ))}
                </div>
              )}
              <select
                value={mergeInto || ''}
                onChange={e => setMergeInto(e.target.value || null)}
                aria-label="Merge into"
                className="w-full min-h-[48px] px-3 rounded-xl bg-gray-100 dark:bg-violet-400/10 text-base text-black dark:text-white"
              >
                <option value="">Choose an exercise…</option>
                {others.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              {mergeInto && (
                <button onClick={() => merge(entry.id, mergeInto)}
                  className="w-full min-h-[52px] mt-2 rounded-xl bg-primary text-on-primary text-base font-bold">
                  Merge “{entry.name}” into “{library.find(e => e.id === mergeInto)?.name}”
                </button>
              )}
            </div>

            {usage(entry).workouts === 0 && usage(entry).logs === 0 && (
              <button
                onClick={() => (confirmDelete ? (updateLibrary(library.filter(e => e.id !== entry.id)), close()) : setConfirmDelete(true))}
                className="w-full min-h-[48px] rounded-xl bg-gray-100 dark:bg-violet-400/10 text-base font-semibold text-black dark:text-white flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5 text-danger" /> {confirmDelete ? 'Tap again to delete' : 'Delete (not used anywhere)'}
              </button>
            )}
          </div>
        )}
      </BottomSheet>
    </>
  );
}
