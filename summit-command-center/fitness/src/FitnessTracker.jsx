import { useState, useEffect } from 'react';
import {
  Dumbbell, CalendarDays, History, Flame, Timer, Trash2, Plus,
  Check, Minus, Moon, ChevronDown, Activity, X, Loader2, AlertTriangle, Lock
} from 'lucide-react';
import { dbGet, dbSet } from './lib/db';

// ---------------------------------------------------------------------------
// Summit — Fitness Tracker (mobile-first, single file)
// Persists through lib/db (summit.db) using the same keys as the original
// App.jsx, so existing logs/templates/plan carry over unchanged.
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  strengthLogs: 'summit_strength_logs',
  cardioLogs: 'summit_cardio_logs',
  workoutTemplates: 'summit_workout_templates',
  weeklyWorkoutPlan: 'summit_weekly_workout_plan',
  activeSession: 'summit_active_session'
};

const DEFAULT_TEMPLATES = [
  { id: 1, name: 'Lower Deck Alpha', exercises: [
    { name: 'Squat', type: 'gym' }, { name: 'Leg Press', type: 'gym' }, { name: 'Calf Raise', type: 'gym' }
  ]},
  { id: 2, name: 'Upper Deck Prime', exercises: [
    { name: 'Bench Press', type: 'gym' }, { name: 'Lat Pulldown', type: 'gym' },
    { name: 'Shoulder Press', type: 'gym' }, { name: 'Bicep Curl', type: 'gym' }
  ]}
];

const DEFAULT_PLAN = {
  Monday: 'Lower Deck Alpha', Tuesday: 'Rest Day', Wednesday: 'Upper Deck Prime',
  Thursday: 'Rest Day', Friday: 'Lower Deck Alpha', Saturday: 'Rest Day', Sunday: 'Rest Day'
};

const REST_WEEK = {
  Monday: 'Rest Day', Tuesday: 'Rest Day', Wednesday: 'Rest Day',
  Thursday: 'Rest Day', Friday: 'Rest Day', Saturday: 'Rest Day', Sunday: 'Rest Day'
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const CARDIO_ACTIVITIES = ['Running', 'Cycling', 'Rowing', 'Swimming', 'Walking', 'Elliptical'];

const toISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatSwiss = (iso) => {
  if (!iso) return '—';
  const p = iso.split('-');
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : iso;
};

const startOfWeekISO = () => {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // Monday start
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return toISO(d);
};

// --- Per-set helpers ---------------------------------------------------------
// Older strength logs are a single aggregate record: { weight, sets: <count>, reps }
// covering N identical sets. Newer records carry `setDetails`, an array of
// individual { setNumber, reps, weight, timestamp }. These helpers let the rest
// of the app treat both shapes uniformly, and editing a legacy record migrates
// just that record to setDetails without touching any others.
const expandLogSets = (log) => (
  Array.isArray(log.setDetails)
    ? log.setDetails
    : Array.from({ length: Number(log.sets) || 0 }, (_, i) => ({
        setNumber: i + 1, reps: log.reps, weight: log.weight, timestamp: null
      }))
);

const logSetCount = (log) => (Array.isArray(log.setDetails) ? log.setDetails.length : Number(log.sets) || 0);

const logVolume = (log) => expandLogSets(log).reduce(
  (a, s) => a + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0
);

// --- Small mobile-friendly stepper input (big tap targets beat tiny inputs) --
function Stepper({ label, value, onChange, step = 1, min = 0, unit }) {
  const bump = (dir) => onChange(Math.max(min, Number(value || 0) + dir * step));
  return (
    <div className="flex-1 min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1 text-center">
        {label}{unit ? ` (${unit})` : ''}
      </div>
      <div className="flex items-center justify-between bg-gray-100 rounded-xl overflow-hidden">
        <button onClick={() => bump(-1)} className="p-3 text-gray-500 active:bg-gray-200" aria-label={`decrease ${label}`}>
          <Minus className="w-4 h-4" />
        </button>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-12 bg-transparent text-center text-sm font-semibold text-gray-900 outline-none"
        />
        <button onClick={() => bump(1)} className="p-3 text-gray-500 active:bg-gray-200" aria-label={`increase ${label}`}>
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 flex-1 min-w-0">
      <div className="flex items-center gap-1.5 text-gray-400 mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-wide truncate">{label}</span>
      </div>
      <div className="text-lg font-bold text-gray-900 truncate">{value}</div>
      {sub && <div className="text-[11px] text-gray-400 truncate">{sub}</div>}
    </div>
  );
}

// Compact editable row for one set within an expanded history entry.
function EditableSetRow({ set, onChange, onDelete }) {
  return (
    <div className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-gray-100">
      <span className="text-[10px] text-gray-400 w-10 flex-shrink-0">Set {set.setNumber}</span>
      <input
        type="number"
        inputMode="decimal"
        value={set.weight}
        onChange={e => onChange({ ...set, weight: e.target.value === '' ? '' : Number(e.target.value) })}
        className="w-14 bg-gray-50 border border-gray-200 rounded-md text-center text-xs py-1 outline-none focus:border-blue-400"
      />
      <span className="text-[10px] text-gray-400 flex-shrink-0">kg ×</span>
      <input
        type="number"
        inputMode="numeric"
        value={set.reps}
        onChange={e => onChange({ ...set, reps: e.target.value === '' ? '' : Number(e.target.value) })}
        className="w-12 bg-gray-50 border border-gray-200 rounded-md text-center text-xs py-1 outline-none focus:border-blue-400"
      />
      <span className="text-[10px] text-gray-400 flex-shrink-0">reps</span>
      <button onClick={onDelete} className="ml-auto text-gray-300 active:text-red-500 flex-shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function FitnessTracker() {
  const [tab, setTab] = useState('today');
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [plan, setPlan] = useState(DEFAULT_PLAN);
  const [strengthLogs, setStrengthLogs] = useState([]);
  const [cardioLogs, setCardioLogs] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Per-exercise input state, keyed `${template}::${exercise}` so shared
  // exercise names across templates don't collide.
  const [strengthInputs, setStrengthInputs] = useState({});
  const [cardioInputs, setCardioInputs] = useState({});
  const [justLogged, setJustLogged] = useState({});

  // Which history entry is expanded for per-set editing.
  const [expandedLogId, setExpandedLogId] = useState(null);
  // Marks a stale (different-day) session's banner as dismissed, keyed by "date::templateName".
  const [dismissedStale, setDismissedStale] = useState(null);

  // Template builder
  const [builder, setBuilder] = useState({ name: '', exercises: [], draftName: '', draftType: 'gym' });
  const [builderOpen, setBuilderOpen] = useState(false);

  // Manual cardio
  const [cardioForm, setCardioForm] = useState({ activity: 'Running', duration: 30, distance: 5 });

  const todayISO = toISO(new Date());
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayTemplateName = plan[todayName];
  const todayTemplate = templates.find(t => t.name === todayTemplateName);
  const key = (t, e) => `${t}::${e}`;

  // The workout currently being worked through — either today's fresh session,
  // or a leftover/outdated session that no longer matches today's plan (see
  // stale banner below).
  const sessionTemplate = activeSession
    ? (templates.find(t => t.name === activeSession.templateName) || todayTemplate)
    : todayTemplate;

  const sessionMatchesPlan = !!activeSession && activeSession.date === todayISO && activeSession.templateName === todayTemplateName;
  const sessionHasProgress = !!activeSession && Object.values(activeSession.exercises).some(ex => ex.sets.length > 0);
  const isDifferentDay = !!activeSession && activeSession.date !== todayISO;
  const staleKey = activeSession ? `${activeSession.date}::${activeSession.templateName}` : null;
  const showStaleBanner = !!activeSession && !sessionMatchesPlan && sessionHasProgress && dismissedStale !== staleKey;

  const showToast = (msg, isError = false) => {
    setToast({ message: msg, isError });
    setTimeout(() => setToast(null), 2200);
  };

  const flash = (k) => {
    setJustLogged(p => ({ ...p, [k]: true }));
    setTimeout(() => setJustLogged(p => ({ ...p, [k]: false })), 1500);
  };

  // --- Persistence (summit.db via lib/db) ------------------------------------
  const saveToStorage = (storageKey, data) => {
    dbSet(storageKey, data).catch(() => {
      showToast('Save failed — change may not persist.', true);
    });
  };

  useEffect(() => {
    const load = async () => {
      const loadData = async (storageKey, fallback) => {
        try {
          const val = await dbGet(storageKey);
          return val ?? fallback;
        } catch {
          return fallback;
        }
      };
      try {
        const [sl, cl, wt, wwp, as] = await Promise.all([
          loadData(STORAGE_KEYS.strengthLogs, []),
          loadData(STORAGE_KEYS.cardioLogs, []),
          loadData(STORAGE_KEYS.workoutTemplates, DEFAULT_TEMPLATES),
          loadData(STORAGE_KEYS.weeklyWorkoutPlan, DEFAULT_PLAN),
          loadData(STORAGE_KEYS.activeSession, null),
        ]);
        setStrengthLogs(sl);
        setCardioLogs(cl);
        setTemplates(wt);
        setPlan(wwp);
        setActiveSession(as);
      } catch {
        setLoadError('Could not load saved data. Starting fresh — new entries will still try to save.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Write-through setters: update state and persist in one call.
  const updateStrengthLogs = (next) => { setStrengthLogs(next); saveToStorage(STORAGE_KEYS.strengthLogs, next); };
  const updateCardioLogs = (next) => { setCardioLogs(next); saveToStorage(STORAGE_KEYS.cardioLogs, next); };
  const updateTemplates = (next) => { setTemplates(next); saveToStorage(STORAGE_KEYS.workoutTemplates, next); };
  const updatePlan = (next) => { setPlan(next); saveToStorage(STORAGE_KEYS.weeklyWorkoutPlan, next); };
  const updateActiveSession = (next) => { setActiveSession(next); saveToStorage(STORAGE_KEYS.activeSession, next); };

  // Keep the session in sync with today's plan. Starts a fresh session the
  // first time a workout day loads, and also follows the Plan page: if the
  // day's assigned workout changes and nothing has been logged against the
  // old one yet, swap seamlessly. If sets are already recorded, leave the
  // session alone — the stale banner offers an explicit Resume/Discard so
  // in-progress data is never silently dropped.
  useEffect(() => {
    if (isLoading) return;
    const freshSessionFor = (tpl) => {
      const firstGym = tpl?.exercises.find(e => e.type !== 'cardio');
      return firstGym
        ? { date: todayISO, templateName: tpl.name, exercises: {}, activeExercise: firstGym.name }
        : null;
    };
    if (!activeSession) {
      const fresh = freshSessionFor(todayTemplate);
      if (fresh) updateActiveSession(fresh);
      return;
    }
    const matchesPlan = activeSession.date === todayISO && activeSession.templateName === todayTemplateName;
    if (matchesPlan) return;
    const hasProgress = Object.values(activeSession.exercises).some(ex => ex.sets.length > 0);
    if (hasProgress) return;
    updateActiveSession(freshSessionFor(todayTemplate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, todayTemplateName, activeSession]);

  // --- Session actions (Add Set / Lock Set / Complete) ------------------------
  const addSet = (exerciseName) => {
    if (!activeSession) return;
    const ik = key(activeSession.templateName, exerciseName);
    const inp = strengthInputs[ik] || { weight: 40, reps: 8 };
    const ex = activeSession.exercises[exerciseName] || { sets: [], locked: false };
    if (ex.locked) return;
    const newSet = {
      setNumber: ex.sets.length + 1,
      reps: Number(inp.reps) || 0,
      weight: Number(inp.weight) || 0,
      timestamp: Date.now()
    };
    updateActiveSession({
      ...activeSession,
      exercises: { ...activeSession.exercises, [exerciseName]: { ...ex, sets: [...ex.sets, newSet] } }
    });
    setStrengthInputs(p => ({ ...p, [ik]: { weight: 40, reps: 8 } }));
  };

  const removeSetFromSession = (exerciseName, index) => {
    if (!activeSession) return;
    const ex = activeSession.exercises[exerciseName];
    if (!ex || ex.locked) return;
    const sets = ex.sets.filter((_, i) => i !== index).map((s, i) => ({ ...s, setNumber: i + 1 }));
    updateActiveSession({
      ...activeSession,
      exercises: { ...activeSession.exercises, [exerciseName]: { ...ex, sets } }
    });
  };

  const lockExercise = (exerciseName) => {
    if (!activeSession || !sessionTemplate) return;
    const ex = activeSession.exercises[exerciseName] || { sets: [], locked: false };
    if (ex.sets.length === 0) return;
    const gymExercises = sessionTemplate.exercises.filter(e => e.type !== 'cardio');
    const idx = gymExercises.findIndex(e => e.name === exerciseName);
    const nextEx = gymExercises[idx + 1];
    updateActiveSession({
      ...activeSession,
      exercises: { ...activeSession.exercises, [exerciseName]: { ...ex, locked: true } },
      activeExercise: nextEx ? nextEx.name : null
    });
    showToast(nextEx ? `${exerciseName} locked — next up: ${nextEx.name}` : `${exerciseName} locked`);
  };

  const completeWorkout = () => {
    if (!activeSession) return;
    const entries = Object.entries(activeSession.exercises)
      .filter(([, ex]) => ex.sets.length > 0)
      .map(([exercise, ex]) => ({
        id: Date.now() + Math.random(),
        date: activeSession.date,
        exercise,
        setDetails: ex.sets
      }));
    if (entries.length === 0) {
      showToast('No sets recorded — nothing to complete', true);
      return;
    }
    updateStrengthLogs([...strengthLogs, ...entries]);
    updateActiveSession(null);
    showToast('Workout complete!');
  };

  const discardSession = () => {
    updateActiveSession(null);
    setDismissedStale(null);
  };

  const resumeStaleSession = () => setDismissedStale(staleKey);

  // --- History editing (works on both legacy and per-set records) ------------
  const updateLogSet = (logId, setIndex, updatedSet) => {
    updateStrengthLogs(strengthLogs.map(l => {
      if (l.id !== logId) return l;
      const sets = expandLogSets(l);
      sets[setIndex] = { ...sets[setIndex], ...updatedSet };
      return { ...l, setDetails: sets };
    }));
  };

  const deleteLogSet = (logId, setIndex) => {
    const target = strengthLogs.find(l => l.id === logId);
    if (!target) return;
    const sets = expandLogSets(target).filter((_, i) => i !== setIndex).map((s, i) => ({ ...s, setNumber: i + 1 }));
    if (sets.length === 0) {
      updateStrengthLogs(strengthLogs.filter(l => l.id !== logId));
    } else {
      updateStrengthLogs(strengthLogs.map(l => (l.id === logId ? { ...l, setDetails: sets } : l)));
    }
  };

  const logCardioFromPlan = (templateName, exercise) => {
    const k = key(templateName, exercise);
    const mins = Number(cardioInputs[k] ?? 30);
    if (!mins || mins <= 0) return;
    updateCardioLogs([...cardioLogs, {
      id: Date.now() + Math.random(),
      date: toISO(new Date()),
      activity: exercise, duration: mins, distance: 0
    }]);
    flash(k);
    showToast(`${exercise} logged`);
  };

  const logManualCardio = () => {
    const duration = Number(cardioForm.duration);
    if (!duration || duration <= 0) return;
    updateCardioLogs([...cardioLogs, {
      id: Date.now(),
      date: toISO(new Date()),
      activity: cardioForm.activity,
      duration,
      distance: Number(cardioForm.distance) || 0
    }]);
    showToast('Cardio session logged');
  };

  // --- Template actions ------------------------------------------------------
  const addDraftExercise = () => {
    if (!builder.draftName.trim()) return;
    setBuilder(p => ({
      ...p,
      exercises: [...p.exercises, { name: p.draftName.trim(), type: p.draftType }],
      draftName: '', draftType: 'gym'
    }));
  };

  const createTemplate = () => {
    if (!builder.name.trim() || builder.exercises.length === 0) return;
    updateTemplates([...templates, { id: Date.now(), name: builder.name.trim(), exercises: builder.exercises }]);
    setBuilder({ name: '', exercises: [], draftName: '', draftType: 'gym' });
    setBuilderOpen(false);
    showToast('Workout created');
  };

  const deleteTemplate = (id) => {
    const tpl = templates.find(t => t.id === id);
    updateTemplates(templates.filter(t => t.id !== id));
    // Un-assign it from any day it was scheduled on
    if (tpl) {
      const next = { ...plan };
      DAYS.forEach(d => { if (next[d] === tpl.name) next[d] = 'Rest Day'; });
      updatePlan(next);
    }
  };

  // --- Stats -----------------------------------------------------------------
  const totalVolume = strengthLogs.reduce((a, l) => a + logVolume(l), 0);
  const totalCardioMin = cardioLogs.reduce((a, l) => a + l.duration, 0);
  const weekStart = startOfWeekISO();
  const sessionsThisWeek = new Set(
    [...strengthLogs, ...cardioLogs].filter(l => l.date >= weekStart).map(l => l.date)
  ).size;

  const groupByDate = (logs) => {
    const map = {};
    logs.forEach(l => { (map[l.date] = map[l.date] || []).push(l); });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  };

  // --- Shared bits -----------------------------------------------------------
  const renderExerciseCard = (templateName, ex) => {
    const k = key(templateName, ex.name);
    const logged = justLogged[k];
    if (ex.type === 'cardio') {
      return (
        <div key={k} className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-orange-500" />
            <span className="font-semibold text-gray-900 text-sm">{ex.name}</span>
            <span className="text-[10px] uppercase tracking-wide text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full ml-auto">cardio</span>
          </div>
          <div className="flex items-end gap-3">
            <Stepper label="Minutes" value={cardioInputs[k] ?? 30} step={5}
              onChange={v => setCardioInputs(p => ({ ...p, [k]: v }))} />
            <button
              onClick={() => logCardioFromPlan(templateName, ex.name)}
              className={`h-11 px-5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                logged ? 'bg-green-500 text-white' : 'bg-blue-600 text-white active:bg-blue-700'
              }`}
            >
              {logged ? <Check className="w-4 h-4" /> : null}
              {logged ? 'Logged' : 'Log'}
            </button>
          </div>
        </div>
      );
    }

    if (!activeSession) return null;
    const exSession = activeSession.exercises[ex.name] || { sets: [], locked: false };
    const isLocked = exSession.locked;
    const isActive = activeSession.activeExercise === ex.name && !isLocked;

    if (isLocked) {
      return (
        <div key={k} className="bg-gray-50 rounded-2xl border border-gray-200 p-4 opacity-80">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-4 h-4 text-green-500" />
            <span className="font-semibold text-gray-700 text-sm">{ex.name}</span>
            <span className="text-[10px] text-gray-400 ml-auto">{exSession.sets.length} set{exSession.sets.length === 1 ? '' : 's'} locked</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {exSession.sets.map(s => (
              <span key={s.setNumber} className="text-[11px] bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-500">
                {s.weight}kg × {s.reps}
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
          onClick={() => updateActiveSession({ ...activeSession, activeExercise: ex.name })}
          className="w-full text-left bg-white rounded-2xl border border-dashed border-gray-200 p-4 opacity-60"
        >
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-gray-300" />
            <span className="font-medium text-gray-400 text-sm">{ex.name}</span>
            <span className="text-[10px] text-gray-300 ml-auto">Not started</span>
          </div>
        </button>
      );
    }

    const inp = strengthInputs[k] || { weight: 40, reps: 8 };
    const setInp = (field, v) => setStrengthInputs(p => ({ ...p, [k]: { ...inp, [field]: v } }));
    return (
      <div key={k} className="bg-white rounded-2xl border border-blue-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell className="w-4 h-4 text-blue-500" />
          <span className="font-semibold text-gray-900 text-sm">{ex.name}</span>
          <span className="text-[10px] text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full ml-auto">
            {exSession.sets.length} set{exSession.sets.length === 1 ? '' : 's'} logged
          </span>
        </div>

        {exSession.sets.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {exSession.sets.map((s, i) => (
              <span key={s.setNumber} className="text-[11px] bg-gray-100 rounded-full pl-2 pr-1 py-0.5 text-gray-600 flex items-center gap-1">
                {s.weight}kg × {s.reps}
                <button onClick={() => removeSetFromSession(ex.name, i)} className="text-gray-400 active:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-3">
          <Stepper label="Weight" unit="kg" value={inp.weight} step={2.5} onChange={v => setInp('weight', v)} />
          <Stepper label="Reps" value={inp.reps} onChange={v => setInp('reps', v)} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => addSet(ex.name)}
            className="flex-1 h-11 rounded-xl text-sm font-semibold bg-blue-600 text-white active:bg-blue-700 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add set
          </button>
          <button
            onClick={() => lockExercise(ex.name)}
            disabled={exSession.sets.length === 0}
            className="flex-1 h-11 rounded-xl text-sm font-semibold bg-gray-900 text-white active:bg-gray-700 disabled:opacity-30 flex items-center justify-center gap-1.5"
          >
            <Lock className="w-4 h-4" /> Lock set
          </button>
        </div>
      </div>
    );
  };

  // --- Pages -----------------------------------------------------------------
  const TodayPage = (
    <div className="space-y-3">
      <div className="flex gap-2">
        <StatCard icon={Flame} label="Volume" value={`${(totalVolume / 1000).toFixed(1)}t`} sub="lifetime lifted" />
        <StatCard icon={Timer} label="Cardio" value={`${totalCardioMin}m`} sub="lifetime" />
        <StatCard icon={CalendarDays} label="This week" value={sessionsThisWeek} sub="active days" />
      </div>

      {showStaleBanner && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-800">Unfinished workout</span>
          </div>
          <div className="text-xs text-amber-700 mb-3">
            {isDifferentDay
              ? <>{activeSession.templateName} from {formatSwiss(activeSession.date)} was never completed.</>
              : <>You have unfinished sets for {activeSession.templateName}, but today's plan now shows {todayTemplateName}.</>}
          </div>
          <div className="flex gap-2">
            <button onClick={resumeStaleSession}
              className="flex-1 h-9 rounded-lg bg-amber-600 text-white text-xs font-semibold active:bg-amber-700">
              Resume
            </button>
            <button onClick={discardSession}
              className="flex-1 h-9 rounded-lg bg-white border border-amber-300 text-amber-700 text-xs font-semibold active:bg-amber-100">
              Discard
            </button>
          </div>
        </div>
      )}

      {sessionTemplate ? (
        <>
          <div className="bg-blue-600 rounded-2xl p-4 text-white">
            <div className="text-[11px] uppercase tracking-wide text-blue-200">
              {isDifferentDay ? formatSwiss(activeSession.date) : todayName}
            </div>
            <div className="text-lg font-bold">{sessionTemplate.name}</div>
            <div className="text-xs text-blue-200">{sessionTemplate.exercises.length} exercises</div>
          </div>
          {sessionTemplate.exercises.map(ex => renderExerciseCard(sessionTemplate.name, ex))}
          {activeSession && sessionTemplate.exercises.some(e => e.type !== 'cardio') && (
            <button
              onClick={completeWorkout}
              className="w-full h-12 rounded-xl text-sm font-bold bg-green-600 text-white active:bg-green-700 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Complete workout
            </button>
          )}
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <Moon className="w-6 h-6 text-gray-300 mx-auto mb-2" />
          <div className="font-semibold text-gray-900 text-sm">Rest day</div>
          <div className="text-xs text-gray-400 mt-1">Nothing scheduled for {todayName}. Recovery counts too.</div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-orange-500" />
          <span className="font-semibold text-gray-900 text-sm">Quick cardio</span>
        </div>
        <div className="relative mb-3">
          <select
            value={cardioForm.activity}
            onChange={e => setCardioForm(p => ({ ...p, activity: e.target.value }))}
            className="w-full appearance-none bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none"
          >
            {CARDIO_ACTIVITIES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <div className="flex gap-2 mb-3">
          <Stepper label="Minutes" value={cardioForm.duration} step={5}
            onChange={v => setCardioForm(p => ({ ...p, duration: v }))} />
          <Stepper label="Distance" unit="km" value={cardioForm.distance}
            onChange={v => setCardioForm(p => ({ ...p, distance: v }))} />
        </div>
        <button onClick={logManualCardio}
          className="w-full h-11 bg-orange-500 text-white rounded-xl text-sm font-semibold active:bg-orange-600">
          Log cardio
        </button>
      </div>
    </div>
  );

  const PlanPage = (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-gray-900 text-sm">Weekly plan</span>
          <div className="flex gap-2">
            <button onClick={() => updatePlan(DEFAULT_PLAN)}
              className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg active:bg-blue-100">
              Default
            </button>
            <button onClick={() => updatePlan(REST_WEEK)}
              className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg active:bg-gray-200">
              Rest week
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          {DAYS.map(day => (
            <div key={day}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 ${day === todayName ? 'bg-blue-50' : ''}`}>
              <span className={`text-xs w-20 flex-shrink-0 ${day === todayName ? 'font-bold text-blue-600' : 'text-gray-500'}`}>
                {day.slice(0, 3)}{day === todayName ? ' •' : ''}
              </span>
              <div className="relative flex-1">
                <select
                  value={plan[day]}
                  onChange={e => updatePlan({ ...plan, [day]: e.target.value })}
                  className={`w-full appearance-none rounded-lg px-3 py-2 text-xs outline-none ${
                    plan[day] === 'Rest Day' ? 'bg-gray-100 text-gray-400' : 'bg-white border border-gray-200 text-gray-900 font-medium'
                  }`}
                >
                  <option value="Rest Day">Rest Day</option>
                  {templates.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-gray-900 text-sm">Workouts</span>
          <button onClick={() => setBuilderOpen(o => !o)}
            className="flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg active:bg-blue-100">
            {builderOpen ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {builderOpen ? 'Cancel' : 'New'}
          </button>
        </div>

        {builderOpen && (
          <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
            <input
              value={builder.name}
              onChange={e => setBuilder(p => ({ ...p, name: e.target.value }))}
              placeholder="Workout name"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
            <div className="flex gap-2">
              <input
                value={builder.draftName}
                onChange={e => setBuilder(p => ({ ...p, draftName: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addDraftExercise()}
                placeholder="Exercise"
                className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
              <button
                onClick={() => setBuilder(p => ({ ...p, draftType: p.draftType === 'gym' ? 'cardio' : 'gym' }))}
                className={`px-3 rounded-lg text-[11px] font-medium flex-shrink-0 ${
                  builder.draftType === 'gym' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                }`}
              >
                {builder.draftType}
              </button>
              <button onClick={addDraftExercise}
                className="bg-gray-900 text-white rounded-lg px-3 flex-shrink-0 active:bg-gray-700">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {builder.exercises.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {builder.exercises.map((ex, i) => (
                  <button key={i}
                    onClick={() => setBuilder(p => ({ ...p, exercises: p.exercises.filter((_, j) => j !== i) }))}
                    className={`text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1 ${
                      ex.type === 'cardio' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {ex.name} <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}
            <button onClick={createTemplate}
              disabled={!builder.name.trim() || builder.exercises.length === 0}
              className="w-full h-10 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-40 active:bg-blue-700">
              Create workout
            </button>
          </div>
        )}

        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="border border-gray-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-900">{t.name}</span>
                <button onClick={() => deleteTemplate(t.id)} className="text-gray-300 active:text-red-500 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {t.exercises.map((ex, i) => (
                  <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full ${
                    ex.type === 'cardio' ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {ex.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">No workouts yet — create one above.</p>
          )}
        </div>
      </div>
    </div>
  );

  const HistoryPage = (
    <div className="space-y-3">
      <div className="flex gap-2">
        <StatCard icon={Flame} label="Total volume" value={`${totalVolume.toLocaleString()} kg`} />
        <StatCard icon={Timer} label="Cardio" value={`${totalCardioMin} min`} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell className="w-4 h-4 text-blue-500" />
          <span className="font-semibold text-gray-900 text-sm">Strength</span>
        </div>
        {strengthLogs.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">No lifts logged yet.</p>
        ) : (
          <div className="space-y-3">
            {groupByDate(strengthLogs).map(([date, logs]) => (
              <div key={date}>
                <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1.5">{formatSwiss(date)}</div>
                <div className="space-y-1.5">
                  {logs.map(l => {
                    const sets = expandLogSets(l);
                    const expanded = expandedLogId === l.id;
                    return (
                      <div key={l.id} className="bg-gray-50 rounded-lg px-3 py-2">
                        <button
                          onClick={() => setExpandedLogId(expanded ? null : l.id)}
                          className="w-full flex items-center justify-between"
                        >
                          <span className="text-xs font-medium text-gray-900">{l.exercise}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 tabular-nums">{logSetCount(l)} sets</span>
                            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                        {expanded && (
                          <div className="mt-2 space-y-1">
                            {sets.map((s, i) => (
                              <EditableSetRow
                                key={i}
                                set={s}
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
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-orange-500" />
          <span className="font-semibold text-gray-900 text-sm">Cardio</span>
        </div>
        {cardioLogs.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">No cardio logged yet.</p>
        ) : (
          <div className="space-y-3">
            {groupByDate(cardioLogs).map(([date, logs]) => (
              <div key={date}>
                <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1.5">{formatSwiss(date)}</div>
                <div className="space-y-1">
                  {logs.map(l => (
                    <div key={l.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-xs font-medium text-gray-900">{l.activity}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 tabular-nums">
                          {l.duration}min{l.distance ? ` · ${l.distance}km` : ''}
                        </span>
                        <button onClick={() => updateCardioLogs(cardioLogs.filter(x => x.id !== l.id))}
                          className="text-gray-300 active:text-red-500">
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

  const TABS = [
    { id: 'today', label: 'Today', icon: Flame },
    { id: 'plan', label: 'Plan', icon: CalendarDays },
    { id: 'history', label: 'History', icon: History }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f7f5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-blue-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-xs text-gray-400">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#37352f] font-sans antialiased">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 text-xs px-4 py-2.5 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap ${
          toast.isError ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
        }`}>
          {toast.isError ? <AlertTriangle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#f7f7f5]/90 backdrop-blur px-4 pt-5 pb-3">
        <div className="max-w-md mx-auto flex items-baseline justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            {tab === 'today' ? 'Today' : tab === 'plan' ? 'Plan' : 'History'}
          </h1>
          <span className="text-xs text-gray-400">{formatSwiss(toISO(new Date()))}</span>
        </div>
      </div>

      {/* Content — bottom padding clears the fixed nav + iOS home indicator */}
      <div className="max-w-md mx-auto px-4 pb-28">
        {loadError && (
          <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-xs text-red-600">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{loadError}</span>
          </div>
        )}
        {tab === 'today' && TodayPage}
        {tab === 'plan' && PlanPage}
        {tab === 'history' && HistoryPage}
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto flex">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 ${
                tab === id ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
