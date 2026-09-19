import { Plus, Check, Moon, ChevronDown, X, AlertTriangle, Lock, Unlock } from 'lucide-react';
import { formatSwiss } from '../lib/model';
import { TYPE_META } from '../lib/exercises';
import { sessionKey, sessionSetCount } from '../lib/stats';
import Stepper from '../components/Stepper';
import WeekStrip from '../components/WeekStrip';

// Today: the week at a glance, then today's session(s) with the quick-list logging
// (Add set / Lock / Unlock / Complete), recovery cards for unfinished sessions, and
// the rest-day card.
export default function TodayTab({ w, onOpenPlan }) {
  const {
    templates,
    plan,
    strengthLogs,
    cardioLogs,
    sessions,
    strengthInputs,
    setStrengthInputs,
    cardioInputs,
    setCardioInputs,
    justLogged,
    expandedWorkouts,
    setExpandedWorkouts,
    dismissedStray,
    setDismissedStray,
    resumedStray,
    setResumedStray,
    todayISO,
    todayName,
    plannedTemplates,
    inputKey,
    straySessions,
    patchSession,
    addSet,
    removeSetFromSession,
    lockExercise,
    unlockExercise,
    completeWorkout,
    discardSession,
    logCardioFromPlan
  } = w;

  const renderExerciseCard = (session, template, ex) => {
    const sKey = sessionKey(session);
    const k = inputKey(sKey, ex.name);
    const logged = justLogged[k];
    const meta = TYPE_META[ex.type] || TYPE_META.weight;
    const Icon = meta.icon;

    if (ex.type === 'cardio') {
      return (
        <div key={k} className="bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Icon className={`w-4 h-4 ${meta.iconText}`} />
            <span className="font-semibold text-black dark:text-white text-sm">{ex.name}</span>
            <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ml-auto ${meta.badge}`}>cardio</span>
          </div>
          <div className="flex items-end gap-3">
            <Stepper label="Minutes" value={cardioInputs[k] ?? 30} step={5}
              onChange={v => setCardioInputs(p => ({ ...p, [k]: v }))} />
            <button
              onClick={() => logCardioFromPlan(sKey, ex.name)}
              className={`h-11 px-5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                logged ? 'bg-green-500 text-white animate-success-pulse' : `${meta.logBtn} text-white`
              }`}
            >
              {logged ? <Check className="w-4 h-4" /> : null}
              {logged ? 'Logged' : 'Log'}
            </button>
          </div>
        </div>
      );
    }

    const isBodyweight = ex.type === 'bodyweight';
    const formatSet = (s) => (isBodyweight ? `${s.reps} reps` : `${s.weight}kg × ${s.reps}`);
    const exSession = session.exercises[ex.name] || { sets: [], locked: false };
    const isLocked = exSession.locked;
    const isActive = session.activeExercise === ex.name && !isLocked;

    if (isLocked) {
      return (
        <div key={k} className="bg-gray-50 dark:bg-violet-400/5 rounded-2xl border border-gray-200 dark:border-violet-400/15 p-4 opacity-80">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-4 h-4 text-green-500" />
            <span className="font-semibold text-black dark:text-white text-sm">{ex.name}</span>
            <span className="text-[10px] text-black dark:text-white">{exSession.sets.length} set{exSession.sets.length === 1 ? '' : 's'} locked</span>
            <button
              onClick={() => unlockExercise(session, ex.name)}
              className="ml-auto flex items-center gap-1 text-[10px] font-medium text-violet-600 bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 rounded-full active:bg-violet-100"
            >
              <Unlock className="w-3 h-3" /> Unlock
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {exSession.sets.map(s => (
              <span key={s.setNumber} className="text-[11px] bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 rounded-full px-2 py-0.5 text-black dark:text-white">
                {formatSet(s)}
              </span>
            ))}
          </div>
        </div>
      );
    }

    if (!isActive) {
      return (
        <button
          key={k}
          onClick={() => patchSession(sKey, s => ({ ...s, activeExercise: ex.name }))}
          className="w-full text-left bg-white dark:bg-[#211b34] rounded-2xl border border-dashed border-gray-200 dark:border-violet-400/15 p-4 opacity-60"
        >
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-black dark:text-white" />
            <span className="font-medium text-black dark:text-white text-sm">{ex.name}</span>
            <span className="text-[10px] text-black dark:text-white ml-auto">
              {exSession.sets.length > 0 ? `${exSession.sets.length} sets` : 'Not started'}
            </span>
          </div>
        </button>
      );
    }

    const inp = strengthInputs[k] || (isBodyweight ? { reps: 8 } : { weight: 40, reps: 8 });
    const setInp = (field, v) => setStrengthInputs(p => ({ ...p, [k]: { ...inp, [field]: v } }));
    return (
      <div key={k} className={`bg-white dark:bg-[#211b34] rounded-2xl border p-4 ${meta.cardBorder}`}>
        <div className="flex items-center gap-2 mb-3">
          <Icon className={`w-4 h-4 ${meta.iconText}`} />
          <span className="font-semibold text-black dark:text-white text-sm">{ex.name}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ml-auto ${meta.cardBadge}`}>
            {exSession.sets.length} set{exSession.sets.length === 1 ? '' : 's'} logged
          </span>
        </div>

        {exSession.sets.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {exSession.sets.map((s, i) => (
              <span key={s.setNumber} className="text-[11px] bg-gray-100 dark:bg-violet-400/10 rounded-full pl-2 pr-1 py-0.5 text-black dark:text-white flex items-center gap-1">
                {formatSet(s)}
                <button onClick={() => removeSetFromSession(session, ex.name, i)} className="text-black dark:text-white active:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-3">
          {!isBodyweight && (
            <Stepper label="Weight" unit="kg" value={inp.weight} step={2.5} onChange={v => setInp('weight', v)} />
          )}
          <Stepper label="Reps" value={inp.reps} onChange={v => setInp('reps', v)} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => addSet(session, ex)}
            className={`flex-1 h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1.5 ${meta.logBtn}`}
          >
            <Plus className="w-4 h-4" /> Add set
          </button>
          <button
            onClick={() => lockExercise(session, template, ex.name)}
            disabled={exSession.sets.length === 0}
            className="flex-1 h-11 rounded-xl text-sm font-semibold bg-gray-900 text-white active:bg-gray-700 disabled:opacity-30 flex items-center justify-center gap-1.5"
          >
            <Lock className="w-4 h-4" /> Lock set
          </button>
        </div>
      </div>
    );
  };

  const renderWorkoutCard = (session, { stray = false } = {}) => {
    const sKey = sessionKey(session);
    const template = templates.find(t => t.name === session.templateName) || {
      name: session.templateName,
      exercises: Object.keys(session.exercises).map(name => ({ name, type: 'weight' }))
    };
    const expanded = !!expandedWorkouts[sKey];
    const gymCount = template.exercises.filter(e => e.type !== 'cardio').length;
    const lockedCount = template.exercises.filter(e => session.exercises[e.name]?.locked).length;
    const setCount = sessionSetCount(session);

    return (
      <div key={sKey} className={`rounded-2xl overflow-hidden ${stray ? 'ring-2 ring-amber-300' : ''}`}>
        <button
          onClick={() => setExpandedWorkouts(p => ({ ...p, [sKey]: !expanded }))}
          className="w-full bg-violet-600 p-4 text-white text-left"
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-violet-200">
                {stray ? `Resumed · ${formatSwiss(session.date)}` : todayName}
              </div>
              <div className="text-lg font-bold truncate">{template.name}</div>
              <div className="text-xs text-violet-200">
                {template.exercises.length} exercises
                {setCount > 0 ? ` · ${setCount} sets logged` : ''}
                {lockedCount > 0 ? ` · ${lockedCount}/${gymCount} done` : ''}
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-violet-200 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </button>
        <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <div className="space-y-3 bg-transparent pt-3">
              {template.exercises.map(ex => renderExerciseCard(session, template, ex))}
              <button
                onClick={() => completeWorkout(session)}
                className="w-full h-12 rounded-xl text-sm font-bold bg-green-600 text-white active:bg-green-700 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Complete workout
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const visibleStrays = straySessions.filter(s => !dismissedStray[sessionKey(s)]);
  const resumedSessions = straySessions.filter(s => resumedStray[sessionKey(s)]);
  const todaySessions = plannedTemplates
    .map(tpl => sessions.find(s => s.date === todayISO && s.templateName === tpl.name))
    .filter(Boolean);
  const cardioOnlyTemplates = plannedTemplates.filter(
    tpl => !tpl.exercises.some(e => e.type !== 'cardio')
  );

  // Today's in-progress workouts + recovery cards.
  const TodaysWorkouts = (
    <div className="space-y-3">
      {visibleStrays.filter(s => !resumedStray[sessionKey(s)]).map(s => {
        const sKey = sessionKey(s);
        return (
          <div key={sKey} className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 rounded-2xl p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-amber-800">
                  {s.templateName} · {formatSwiss(s.date)}
                </div>
                <div className="text-[11px] text-amber-700">
                  {sessionSetCount(s)} sets logged, never completed.
                </div>
              </div>
              <button
                onClick={() => setDismissedStray(p => ({ ...p, [sKey]: true }))}
                className="text-amber-400 active:text-amber-600 flex-shrink-0"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 mt-2.5">
              <button
                onClick={() => {
                  setResumedStray(p => ({ ...p, [sKey]: true }));
                  setExpandedWorkouts(p => ({ ...p, [sKey]: true }));
                }}
                className="flex-1 h-8 rounded-lg bg-amber-600 text-white text-xs font-semibold active:bg-amber-700"
              >
                Resume
              </button>
              <button
                onClick={() => discardSession(s)}
                className="flex-1 h-8 rounded-lg bg-white dark:bg-[#211b34] border border-amber-300 text-amber-700 text-xs font-semibold active:bg-amber-100"
              >
                Discard
              </button>
            </div>
          </div>
        );
      })}

      {resumedSessions.map(s => renderWorkoutCard(s, { stray: true }))}

      {todaySessions.map(s => renderWorkoutCard(s))}

      {cardioOnlyTemplates.map(tpl => {
        const pseudo = { date: todayISO, templateName: tpl.name, exercises: {}, activeExercise: null };
        return (
          <div key={tpl.name} className="space-y-3">
            <div className="bg-violet-500 rounded-2xl p-4 text-white">
              <div className="text-[11px] uppercase tracking-wide text-violet-100">{todayName}</div>
              <div className="text-lg font-bold">{tpl.name}</div>
              <div className="text-xs text-violet-100">{tpl.exercises.length} cardio exercises</div>
            </div>
            {tpl.exercises.map(ex => renderExerciseCard(pseudo, tpl, ex))}
          </div>
        );
      })}

      {plannedTemplates.length === 0 && resumedSessions.length === 0 && (
        <div className="bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15 p-6 text-center">
          <Moon className="w-6 h-6 text-black dark:text-white mx-auto mb-2" />
          <div className="font-semibold text-black dark:text-white text-sm">Rest day</div>
          <div className="text-xs text-black dark:text-white mt-1">Nothing scheduled for {todayName}. Recovery counts too.</div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <WeekStrip plan={plan} strengthLogs={strengthLogs} cardioLogs={cardioLogs} onSelectDay={onOpenPlan} />
      {TodaysWorkouts}
    </div>
  );
}
