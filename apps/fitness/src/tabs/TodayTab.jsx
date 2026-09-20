import { Plus, Check, Moon, ChevronDown, X, AlertTriangle, Lock, Unlock, Timer as TimerIcon, Activity } from 'lucide-react';
import { formatSwiss } from '../lib/model';
import { TYPE_META, parseExercise } from '../lib/exercises';
import { sessionKey, sessionSetCount, lastSetFor, defaultSetInputs, formatSetText } from '../lib/stats';
import Stepper from '../components/Stepper';
import SetDots from '../components/SetDots';
import TimerPanel from '../components/TimerPanel';
import WeekStrip from '../components/WeekStrip';

const card = 'bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15';

// Today: the week at a glance, a quick cardio log, then today's session(s) with
// the quick-list logging (Add set / Lock / Unlock / Complete), recovery cards for
// unfinished sessions, and the rest-day card. Text is plain black/white; state is
// shown with icons, dots and the violet accent.
export default function TodayTab({ w, onOpenPlan }) {
  const {
    templates, plan, strengthLogs, cardioLogs, sessions, strengthInputs, setStrengthInputs,
    cardioInputs, setCardioInputs, justLogged, expandedWorkouts, setExpandedWorkouts,
    dismissedStray, setDismissedStray, resumedStray, setResumedStray, todayISO, todayName,
    plannedTemplates, inputKey, straySessions, patchSession, addSet, addTimedSet,
    removeSetFromSession, lockExercise, unlockExercise, completeWorkout, discardSession,
    logCardioFromPlan, timer, setCardioForm, setCardioSheetOpen,
  } = w;

  const renderExerciseCard = (session, template, ex) => {
    const sKey = sessionKey(session);
    const k = inputKey(sKey, ex.name);
    const logged = justLogged[k];
    const meta = TYPE_META[ex.type] || TYPE_META.weight;
    const Icon = meta.icon;
    const p = parseExercise(ex.name);

    if (ex.type === 'cardio') {
      return (
        <div key={k} className={`${card} p-4`}>
          <div className="flex items-start gap-2.5 mb-3">
            <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${meta.iconText}`} />
            <span className="flex-1 min-w-0 text-base font-bold text-black dark:text-white">{p.label}</span>
            <span className="text-sm font-semibold text-black dark:text-white flex-shrink-0">Cardio</span>
          </div>
          <div className="flex items-end gap-3">
            <Stepper label="Minutes" value={cardioInputs[k] ?? 30} step={5}
              onChange={v => setCardioInputs(prev => ({ ...prev, [k]: v }))} />
            <button
              onClick={() => logCardioFromPlan(sKey, ex.name)}
              className={`h-12 px-6 rounded-xl text-base font-bold transition-colors flex items-center gap-1.5 ${
                logged ? 'bg-green-600 text-white animate-success-pulse' : 'bg-violet-600 text-white'
              }`}
            >
              {logged ? <Check className="w-5 h-5" /> : null}
              {logged ? 'Logged' : 'Log'}
            </button>
          </div>
        </div>
      );
    }

    const isBodyweight = ex.type === 'bodyweight';
    const exSession = session.exercises[ex.name] || { sets: [], locked: false };
    const setCount = exSession.sets.length;
    const isLocked = exSession.locked;
    const isActive = session.activeExercise === ex.name && !isLocked;
    const hold = isBodyweight && p.holdSeconds ? { seconds: p.holdSeconds, perSide: p.perSide } : null;

    if (isLocked) {
      return (
        <div key={k} className={`${card} p-4`}>
          <div className="flex items-center gap-2.5">
            <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span className="flex-1 min-w-0 text-base font-bold text-black dark:text-white truncate">{p.label}</span>
            <button
              onClick={() => unlockExercise(session, ex.name)}
              className="min-h-[40px] px-3 rounded-full bg-violet-100 dark:bg-violet-400/20 text-sm font-semibold text-black dark:text-white flex items-center gap-1.5 flex-shrink-0"
            >
              <Unlock className="w-4 h-4" /> Unlock
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {exSession.sets.map(s => (
              <span key={s.setNumber} className="text-sm font-medium bg-gray-100 dark:bg-violet-400/10 rounded-full px-3 py-1 text-black dark:text-white">
                {formatSetText(s, isBodyweight)}
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
          className={`${card} w-full text-left p-4 min-h-[64px] border-dashed`}
        >
          <div className="flex items-center gap-3">
            <Icon className={`w-5 h-5 flex-shrink-0 ${meta.iconText}`} />
            <span className="flex-1 min-w-0">
              <span className="block text-base font-semibold text-black dark:text-white truncate">{p.label}</span>
              {p.prescription && <span className="block text-sm text-black dark:text-white">{p.prescription}</span>}
            </span>
            <SetDots done={setCount} total={p.sets} />
          </div>
        </button>
      );
    }

    const last = lastSetFor(ex.name, strengthLogs);
    const inp = strengthInputs[k] || defaultSetInputs(isBodyweight, last);
    const setInp = (field, v) => setStrengthInputs(prev => ({ ...prev, [k]: { ...inp, [field]: v } }));
    const timerHere = timer.timer && timer.timer.key === k ? timer.timer : null;
    return (
      <div key={k} className={`bg-white dark:bg-[#211b34] rounded-2xl border-2 p-4 ${meta.cardBorder}`}>
        <div className="flex items-start gap-2.5 mb-1">
          <Icon className={`w-5 h-5 mt-1 flex-shrink-0 ${meta.iconText}`} />
          <span className="flex-1 min-w-0">
            <span className="block text-lg font-bold text-black dark:text-white">{p.label}</span>
            {p.prescription && <span className="block text-base text-black dark:text-white">{p.prescription}</span>}
          </span>
          <SetDots done={setCount} total={p.sets} />
        </div>
        {last && (
          <div className="text-sm text-black dark:text-white mb-3 ml-[30px]">
            Last time: <span className="font-semibold">{formatSetText(last, isBodyweight)}</span>
          </div>
        )}

        {setCount > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {exSession.sets.map((s, i) => (
              <span key={s.setNumber} className="text-sm font-medium bg-gray-100 dark:bg-violet-400/10 rounded-full pl-3 pr-1 py-1 text-black dark:text-white flex items-center gap-1">
                {formatSetText(s, isBodyweight)}
                <button onClick={() => removeSetFromSession(session, ex.name, i)} aria-label={`Remove set ${s.setNumber}`}
                  className="w-7 h-7 flex items-center justify-center text-black dark:text-white active:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
        )}

        {isBodyweight && (timerHere ? (
          <TimerPanel
            t={timerHere}
            remaining={timer.remaining}
            api={timer}
            onLog={(seconds, perSide) => addTimedSet(session, ex, seconds, perSide)}
          />
        ) : (
          <button
            onClick={() => timer.openTimer({ key: k, label: p.label, seconds: hold?.seconds ?? 30, perSide: hold?.perSide })}
            className="w-full min-h-[48px] mb-3 rounded-xl border border-violet-300 dark:border-violet-400/40 text-base font-semibold text-black dark:text-white flex items-center justify-center gap-2"
          >
            <TimerIcon className="w-5 h-5 text-violet-600" />
            {hold ? `Timer · ${hold.seconds}s${hold.perSide ? ' per side' : ''}` : 'Timer'}
          </button>
        ))}

        {!(hold && isBodyweight) && (
          <div className="flex gap-2 mb-3">
            {!isBodyweight && (
              <Stepper label="Weight" unit="kg" value={inp.weight} step={2.5} onChange={v => setInp('weight', v)} />
            )}
            <Stepper label="Reps" value={inp.reps} onChange={v => setInp('reps', v)} />
          </div>
        )}
        <div className="flex gap-2">
          {!(hold && isBodyweight) && (
            <button
              onClick={() => addSet(session, ex)}
              className={`flex-1 min-h-[52px] rounded-xl text-base font-bold text-white flex items-center justify-center gap-2 ${meta.logBtn}`}
            >
              <Plus className="w-5 h-5" /> Add set
            </button>
          )}
          <button
            onClick={() => lockExercise(session, template, ex.name)}
            disabled={setCount === 0}
            className="flex-1 min-h-[52px] rounded-xl text-base font-bold bg-gray-900 dark:bg-white text-white dark:text-black disabled:opacity-30 flex items-center justify-center gap-2"
          >
            <Lock className="w-5 h-5" /> Lock set
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
      <div key={sKey} className={`rounded-2xl overflow-hidden ${stray ? 'ring-2 ring-amber-400' : ''}`}>
        <button
          onClick={() => setExpandedWorkouts(prev => ({ ...prev, [sKey]: !expanded }))}
          aria-expanded={expanded}
          className="w-full bg-violet-600 p-4 text-white text-left"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-bold uppercase tracking-wide">
                {stray ? `Resumed · ${formatSwiss(session.date)}` : todayName}
              </div>
              <div className="text-xl font-bold">{template.name}</div>
              <div className="text-base">
                {template.exercises.length} exercises
                {setCount > 0 ? ` · ${setCount} sets logged` : ''}
                {lockedCount > 0 ? ` · ${lockedCount}/${gymCount} done` : ''}
              </div>
            </div>
            <ChevronDown className={`w-6 h-6 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </button>
        <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <div className="space-y-3 bg-transparent pt-3">
              {template.exercises.map(ex => renderExerciseCard(session, template, ex))}
              <button
                onClick={() => completeWorkout(session)}
                className="w-full min-h-[56px] rounded-xl text-base font-bold bg-green-600 text-white active:bg-green-700 flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" /> Complete workout
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

  return (
    <div className="space-y-3">
      <WeekStrip plan={plan} strengthLogs={strengthLogs} cardioLogs={cardioLogs} onSelectDay={onOpenPlan} />

      <button
        onClick={() => {
          setCardioForm(prev => ({ ...prev, routeId: '' }));
          setCardioSheetOpen(true);
        }}
        className="w-full min-h-[52px] rounded-2xl border border-dashed border-violet-400 dark:border-violet-400/50 text-base font-bold text-black dark:text-white flex items-center justify-center gap-2"
      >
        <Activity className="w-5 h-5 text-violet-600" /> Log cardio
      </button>

      {visibleStrays.filter(s => !resumedStray[sessionKey(s)]).map(s => {
        const sKey = sessionKey(s);
        return (
          <div key={sKey} className="bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-400/40 rounded-2xl p-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-base font-bold text-black dark:text-white">{s.templateName} · {formatSwiss(s.date)}</div>
                <div className="text-sm text-black dark:text-white">{sessionSetCount(s)} sets logged, never completed.</div>
              </div>
              <button
                onClick={() => setDismissedStray(prev => ({ ...prev, [sKey]: true }))}
                className="w-10 h-10 -mt-1 -mr-1 flex items-center justify-center text-black dark:text-white flex-shrink-0"
                aria-label="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  setResumedStray(prev => ({ ...prev, [sKey]: true }));
                  setExpandedWorkouts(prev => ({ ...prev, [sKey]: true }));
                }}
                className="flex-1 min-h-[44px] rounded-xl bg-violet-600 text-white text-base font-bold"
              >
                Resume
              </button>
              <button
                onClick={() => discardSession(s)}
                className="flex-1 min-h-[44px] rounded-xl bg-white dark:bg-[#211b34] border border-amber-400 text-black dark:text-white text-base font-bold"
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
            <div className="bg-violet-600 rounded-2xl p-4 text-white">
              <div className="text-sm font-bold uppercase tracking-wide">{todayName}</div>
              <div className="text-xl font-bold">{tpl.name}</div>
              <div className="text-base">{tpl.exercises.length} cardio exercises</div>
            </div>
            {tpl.exercises.map(ex => renderExerciseCard(pseudo, tpl, ex))}
          </div>
        );
      })}

      {plannedTemplates.length === 0 && resumedSessions.length === 0 && (
        <div className={`${card} p-6 text-center`}>
          <Moon className="w-7 h-7 text-violet-600 mx-auto mb-2" />
          <div className="text-lg font-bold text-black dark:text-white">Rest day</div>
          <div className="text-base text-black dark:text-white mt-1">Nothing scheduled for {todayName}. Recovery counts too.</div>
        </div>
      )}
    </div>
  );
}
