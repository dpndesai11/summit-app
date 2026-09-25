import { useState } from 'react';
import { Activity, ChevronDown, ChevronRight, Dumbbell, Download, Flame, Search, Timer, Trash2, Trophy } from 'lucide-react';
import { CollapsibleCard } from '@summit/core';
import { formatSwiss, toISO } from '../lib/model';
import { parseExercise } from '../lib/exercises';
import { downloadFitnessCsv } from '../lib/exportCsv';
import {
  exerciseSummaries, expandLogSets, groupByDate, logSetCount, logType, prBadgeFor, weeklyAggregates,
} from '../lib/stats';
import EditableSetRow from '../components/EditableSetRow';
import ExerciseSheet from '../components/ExerciseSheet';
import Sparkline from '../components/Sparkline';
import StatCard from '../components/StatCard';
import StreakCalendar, { STREAK_WEEKS } from '../components/StreakCalendar';
import WeeklyBars from '../components/WeeklyBars';

const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const card = 'bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15';

// Progress: lifetime numbers, a weekly chart, a trend line for every exercise
// you've logged, the consistency heatmap, and the full editable log history.
export default function ProgressTab({ w }) {
  const {
    strengthLogs, cardioLogs, expandedLogId, setExpandedLogId, updateStrengthLogs, updateCardioLogs,
    updateLogSet, deleteLogSet, totalVolume, totalCardioMin, currentStreak,
  } = w;
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState(null);

  const weeks = weeklyAggregates(strengthLogs, cardioLogs, 10);
  const summaries = exerciseSummaries(strengthLogs);
  const q = query.trim().toLowerCase();
  const filtered = q ? summaries.filter(s => parseExercise(s.exercise).label.toLowerCase().includes(q)) : summaries;
  const visible = showAll || q ? filtered : filtered.slice(0, 6);
  const selectedSummary = summaries.find(s => s.exercise === selected) || null;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <StatCard icon={Dumbbell} label="Lifted" value={`${(totalVolume / 1000).toFixed(1)}t`} sub="lifetime" />
        <StatCard icon={Timer} label="Cardio" value={`${totalCardioMin}m`} sub="lifetime" />
        <StatCard icon={Flame} label="Streak" value={currentStreak} sub={currentStreak === 1 ? 'day' : 'days'} />
      </div>

      <button
        onClick={() => downloadFitnessCsv(strengthLogs, cardioLogs, `summit-fitness-${toISO(new Date())}.csv`)}
        disabled={strengthLogs.length === 0 && cardioLogs.length === 0}
        className="w-full min-h-[48px] rounded-xl text-base font-semibold text-black dark:text-white bg-gray-100 dark:bg-violet-400/10 disabled:opacity-40 flex items-center justify-center gap-2"
      >
        <Download className="w-5 h-5" /> Export CSV
      </button>

      <section>
        <h2 className="text-lg font-bold text-black dark:text-white mb-2">Last 10 weeks</h2>
        <WeeklyBars weeks={weeks} />
      </section>

      <section>
        <h2 className="text-lg font-bold text-black dark:text-white mb-2">Exercises</h2>
        {summaries.length === 0 ? (
          <div className={`${card} p-5 text-center text-base text-black dark:text-white`}>
            Complete a workout and your lifts show up here with a trend line.
          </div>
        ) : (
          <>
            <label className="relative block mb-2">
              <Search className="w-5 h-5 text-black dark:text-white absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search exercises"
                aria-label="Search exercises"
                className="w-full min-h-[48px] pl-11 pr-4 rounded-xl bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 text-base text-black dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
              />
            </label>
            <div className={`${card} divide-y divide-gray-100 dark:divide-violet-400/15 overflow-hidden`}>
              {visible.map(s => {
                const label = parseExercise(s.exercise).label;
                return (
                  <button
                    key={s.exercise}
                    onClick={() => setSelected(s.exercise)}
                    aria-label={`${label} trend`}
                    className="w-full flex items-center gap-3 px-4 py-3 min-h-[64px] text-left"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-base font-semibold text-black dark:text-white truncate">{label}</span>
                      <span className="block text-sm text-black dark:text-white">
                        {fmt(s.latest)}{s.unit} latest · best {fmt(s.best)}{s.unit}
                        {s.prCount > 0 ? ` · ${s.prCount} PR${s.prCount === 1 ? '' : 's'}` : ''}
                      </span>
                    </span>
                    <Sparkline values={s.series.map(p => p.value)} />
                    <ChevronRight className="w-5 h-5 text-black dark:text-white flex-shrink-0" />
                  </button>
                );
              })}
              {visible.length === 0 && (
                <div className="px-4 py-4 text-base text-black dark:text-white">No exercise matches “{query}”.</div>
              )}
            </div>
            {!q && filtered.length > 6 && (
              <button
                onClick={() => setShowAll(v => !v)}
                className="w-full min-h-[48px] mt-2 rounded-xl text-base font-semibold text-black dark:text-white bg-gray-100 dark:bg-violet-400/10"
              >
                {showAll ? 'Show fewer' : `Show all ${filtered.length}`}
              </button>
            )}
          </>
        )}
      </section>

      <CollapsibleCard title="Consistency" badge={`last ${STREAK_WEEKS} weeks`}>
        <StreakCalendar strengthLogs={strengthLogs} cardioLogs={cardioLogs} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-black dark:text-white">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-violet-400/20 inline-block" /> None</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-violet-200 inline-block" /> Cardio</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-violet-400 inline-block" /> Strength</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-violet-600 inline-block" /> Both</span>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Strength log" icon={Dumbbell} iconColor="text-violet-600" badge={strengthLogs.length > 0 ? `${strengthLogs.length}` : null}>
        {strengthLogs.length === 0 ? (
          <p className="text-base text-black dark:text-white text-center py-2">No lifts logged yet.</p>
        ) : (
          <div className="space-y-4">
            {groupByDate(strengthLogs).map(([date, logs]) => (
              <div key={date}>
                <div className="text-sm font-bold text-black dark:text-white mb-1.5">{formatSwiss(date)}</div>
                <div className="space-y-1.5">
                  {logs.map(l => {
                    const sets = expandLogSets(l);
                    const expanded = expandedLogId === l.id;
                    const type = logType(l);
                    const isPR = prBadgeFor(l, strengthLogs);
                    return (
                      <div key={l.id} className="bg-gray-50 dark:bg-violet-400/5 rounded-xl px-3 py-2">
                        <button
                          onClick={() => setExpandedLogId(expanded ? null : l.id)}
                          aria-expanded={expanded}
                          className="w-full flex items-center justify-between gap-2 min-h-[40px]"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="text-base font-semibold text-black dark:text-white truncate">{parseExercise(l.exercise).label}</span>
                            {isPR && (
                              <span className="text-sm font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-400/20 text-black dark:text-white flex items-center gap-1 flex-shrink-0">
                                <Trophy className="w-3.5 h-3.5 text-amber-500" /> PR
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-base text-black dark:text-white tabular-nums">{logSetCount(l)} sets</span>
                            <ChevronDown className={`w-5 h-5 text-black dark:text-white transition-transform ${expanded ? 'rotate-180' : ''}`} />
                          </span>
                        </button>
                        <div className={`grid transition-[grid-template-rows] duration-250 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                          <div className="overflow-hidden">
                            <div className="mt-2 space-y-1.5">
                              {sets.map((s, i) => (
                                <EditableSetRow
                                  key={i}
                                  set={s}
                                  type={type}
                                  onChange={updated => updateLogSet(l.id, i, updated)}
                                  onDelete={() => deleteLogSet(l.id, i)}
                                />
                              ))}
                              <button
                                onClick={() => updateStrengthLogs(strengthLogs.filter(x => x.id !== l.id))}
                                className="w-full min-h-[44px] text-base font-semibold text-black dark:text-white flex items-center justify-center gap-2"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" /> Delete this entry
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleCard>

      <CollapsibleCard title="Cardio log" icon={Activity} iconColor="text-violet-600" badge={cardioLogs.length > 0 ? `${cardioLogs.length}` : null}>
        {cardioLogs.length === 0 ? (
          <p className="text-base text-black dark:text-white text-center py-2">No cardio logged yet.</p>
        ) : (
          <div className="space-y-4">
            {groupByDate(cardioLogs).map(([date, logs]) => (
              <div key={date}>
                <div className="text-sm font-bold text-black dark:text-white mb-1.5">{formatSwiss(date)}</div>
                <div className="space-y-1.5">
                  {logs.map(l => (
                    <div key={l.id} className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-violet-400/5 rounded-xl px-3 min-h-[48px]">
                      <span className="text-base font-semibold text-black dark:text-white">{l.activity}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-base text-black dark:text-white tabular-nums">
                          {l.duration}min{l.distance ? ` · ${l.distance}km` : ''}
                        </span>
                        <button onClick={() => updateCardioLogs(cardioLogs.filter(x => x.id !== l.id))}
                          aria-label={`Delete ${l.activity} on ${formatSwiss(date)}`}
                          className="w-10 h-10 flex items-center justify-center text-black dark:text-white active:text-red-500">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleCard>

      <ExerciseSheet summary={selectedSummary} onClose={() => setSelected(null)} />
    </div>
  );
}
