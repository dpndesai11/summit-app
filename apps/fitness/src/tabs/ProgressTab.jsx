import { Dumbbell, Flame, Timer, Trash2, ChevronDown, Activity, Trophy } from 'lucide-react';
import { formatSwiss } from '../lib/model';
import { expandLogSets, logSetCount, logType, groupByDate } from '../lib/stats';
import StatCard from '../components/StatCard';
import EditableSetRow from '../components/EditableSetRow';
import StreakCalendar, { STREAK_WEEKS } from '../components/StreakCalendar';

// Progress: lifetime stats, the consistency heatmap and the full log history.
export default function ProgressTab({ w }) {
  const {
    strengthLogs,
    cardioLogs,
    expandedLogId,
    setExpandedLogId,
    updateStrengthLogs,
    updateCardioLogs,
    updateLogSet,
    deleteLogSet,
    totalVolume,
    totalCardioMin,
    currentStreak,
    allTimeBests
  } = w;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <StatCard icon={Dumbbell} label="Total volume" value={`${totalVolume.toLocaleString()} kg`} />
        <StatCard icon={Timer} label="Cardio" value={`${totalCardioMin} min`} />
        <StatCard icon={Flame} label="Streak" value={currentStreak} sub={currentStreak === 1 ? 'day' : 'days'} />
      </div>

      <div className="bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-black dark:text-white text-sm">Consistency</span>
          <span className="text-[11px] text-black dark:text-white">last {STREAK_WEEKS} weeks</span>
        </div>
        <StreakCalendar strengthLogs={strengthLogs} cardioLogs={cardioLogs} />
        <div className="flex items-center gap-3 mt-3 text-[10px] text-black dark:text-white">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-100 dark:bg-violet-400/10 inline-block" /> None</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-violet-200 inline-block" /> Cardio</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-violet-400 inline-block" /> Strength</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-violet-600 inline-block" /> Both</span>
        </div>
      </div>

      <div className="bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell className="w-4 h-4 text-violet-500" />
          <span className="font-semibold text-black dark:text-white text-sm">Strength</span>
        </div>
        {strengthLogs.length === 0 ? (
          <p className="text-xs text-black dark:text-white text-center py-2">No lifts logged yet.</p>
        ) : (
          <div className="space-y-3">
            {groupByDate(strengthLogs).map(([date, logs]) => (
              <div key={date}>
                <div className="text-[10px] uppercase tracking-wide text-black dark:text-white mb-1.5">{formatSwiss(date)}</div>
                <div className="space-y-1.5">
                  {logs.map(l => {
                    const sets = expandLogSets(l);
                    const expanded = expandedLogId === l.id;
                    const type = logType(l);
                    const best = allTimeBests[l.exercise];
                    const isPR = !!best && sets.some(s => (type === 'bodyweight' ? Number(s.reps) : Number(s.weight)) === best.value);
                    return (
                      <div key={l.id} className="bg-gray-50 dark:bg-violet-400/5 rounded-lg px-3 py-2">
                        <button
                          onClick={() => setExpandedLogId(expanded ? null : l.id)}
                          className="w-full flex items-center justify-between"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs font-medium text-black dark:text-white truncate">{l.exercise}</span>
                            {type === 'bodyweight' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-600 flex-shrink-0">BW</span>
                            )}
                            {isPR && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 flex items-center gap-0.5 flex-shrink-0">
                                <Trophy className="w-2.5 h-2.5" /> PR
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-black dark:text-white tabular-nums">{logSetCount(l)} sets</span>
                            <ChevronDown className={`w-3.5 h-3.5 text-black dark:text-white transition-transform ${expanded ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                        <div className={`grid transition-[grid-template-rows] duration-250 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                          <div className="overflow-hidden">
                            <div className="mt-2 space-y-1">
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
                                className="w-full text-[11px] text-red-500 flex items-center justify-center gap-1 py-1.5"
                              >
                                <Trash2 className="w-3 h-3" /> Delete exercise entry
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
      </div>

      <div className="bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-violet-500" />
          <span className="font-semibold text-black dark:text-white text-sm">Cardio</span>
        </div>
        {cardioLogs.length === 0 ? (
          <p className="text-xs text-black dark:text-white text-center py-2">No cardio logged yet.</p>
        ) : (
          <div className="space-y-3">
            {groupByDate(cardioLogs).map(([date, logs]) => (
              <div key={date}>
                <div className="text-[10px] uppercase tracking-wide text-black dark:text-white mb-1.5">{formatSwiss(date)}</div>
                <div className="space-y-1">
                  {logs.map(l => (
                    <div key={l.id} className="flex items-center justify-between bg-gray-50 dark:bg-violet-400/5 rounded-lg px-3 py-2">
                      <span className="text-xs font-medium text-black dark:text-white">{l.activity}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-black dark:text-white tabular-nums">
                          {l.duration}min{l.distance ? ` · ${l.distance}km` : ''}
                        </span>
                        <button onClick={() => updateCardioLogs(cardioLogs.filter(x => x.id !== l.id))}
                          className="text-black dark:text-white active:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
