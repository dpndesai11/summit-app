import { useState, useEffect } from 'react';
import {
  Dumbbell, CalendarDays, History, Flame, Timer, Trash2, Plus,
  Check, Minus, Moon, ChevronDown, Activity, X, AlertTriangle,
  Lock, RefreshCw, MapPin, ClipboardList, PersonStanding
} from 'lucide-react';
import { dbGet, dbSet, dbRefresh } from './lib/db';
import { routeDistanceKm } from './lib/geo';
import RoutePlanner from './RoutePlanner';

// ---------------------------------------------------------------------------
// Summit — Fitness Tracker (mobile-first)
// Persists through lib/db (summit-data.json) using the same keys as the main
// App.jsx, so existing logs/templates/plan carry over unchanged.
//
// The weekly plan maps each day to a LIST of template names (multiple
// workouts per day, e.g. a lift + an evening run). Older data stored a single
// string per day — normalizePlan upgrades that shape on read.
//
// In-progress workouts live as an array of sessions (one per date::template),
// kept separate from permanent history: sets are logged live, exercises lock
// as you finish them, and only Complete Workout commits into strengthLogs.
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  strengthLogs: 'summit_strength_logs',
  cardioLogs: 'summit_cardio_logs',
  workoutTemplates: 'summit_workout_templates',
  weeklyWorkoutPlan: 'summit_weekly_workout_plan',
  activeSession: 'summit_active_session',
  cardioRoutes: 'summit_cardio_routes'
};

const DEFAULT_TEMPLATES = [
  { id: 1, name: 'Lower Deck Alpha', exercises: [
    { name: 'Squat', type: 'weight' }, { name: 'Leg Press', type: 'weight' }, { name: 'Calf Raise', type: 'weight' }
  ]},
  { id: 2, name: 'Upper Deck Prime', exercises: [
    { name: 'Bench Press', type: 'weight' }, { name: 'Lat Pulldown', type: 'weight' },
    { name: 'Shoulder Press', type: 'weight' }, { name: 'Bicep Curl', type: 'weight' }
  ]}
];

// --- Exercise types -----------------------------------------------------
// Every exercise is one of three types, each with its own logging fields and
// color treatment throughout the app. 'gym' from older data means a weighted
// lift, so it normalizes to 'weight' (see normalizeExerciseType).
const EXERCISE_TYPE_ORDER = ['weight', 'bodyweight', 'cardio'];

const TYPE_META = {
  weight: {
    label: 'Weight', icon: Dumbbell,
    badge: 'bg-blue-50 text-blue-600',
    chip: 'bg-blue-100 text-blue-700',
    iconText: 'text-blue-500',
    cardBorder: 'border-blue-200',
    cardBadge: 'text-blue-500 bg-blue-50',
    logBtn: 'bg-blue-600 active:bg-blue-700',
  },
  bodyweight: {
    label: 'Bodyweight', icon: PersonStanding,
    badge: 'bg-teal-50 text-teal-600',
    chip: 'bg-teal-100 text-teal-700',
    iconText: 'text-teal-500',
    cardBorder: 'border-teal-200',
    cardBadge: 'text-teal-500 bg-teal-50',
    logBtn: 'bg-teal-600 active:bg-teal-700',
  },
  cardio: {
    label: 'Cardio', icon: Activity,
    badge: 'bg-orange-50 text-orange-600',
    chip: 'bg-orange-100 text-orange-700',
    iconText: 'text-orange-500',
    cardBorder: 'border-orange-200',
    cardBadge: 'text-orange-500 bg-orange-50',
    logBtn: 'bg-orange-500 active:bg-orange-600',
  },
};

const normalizeExerciseType = (t) => (t === 'bodyweight' || t === 'cardio' ? t : 'weight');
const cycleExerciseType = (t) => EXERCISE_TYPE_ORDER[(EXERCISE_TYPE_ORDER.indexOf(normalizeExerciseType(t)) + 1) % EXERCISE_TYPE_ORDER.length];
const normalizeTemplateExercises = (tpl) => ({
  ...tpl,
  exercises: (tpl.exercises || []).map(e => ({ ...e, type: normalizeExerciseType(e.type) }))
});

const DEFAULT_PLAN = {
  Monday: ['Lower Deck Alpha'], Tuesday: [], Wednesday: ['Upper Deck Prime'],
  Thursday: [], Friday: ['Lower Deck Alpha'], Saturday: [], Sunday: []
};

const REST_WEEK = {
  Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
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

// --- Plan shape helpers ------------------------------------------------------
// A day's value may be an array of template names (current shape) or a single
// string / 'Rest Day' (legacy shape). Everything reads through dayList.
const dayList = (v) => {
  if (Array.isArray(v)) return v.filter(n => typeof n === 'string' && n && n !== 'Rest Day');
  if (typeof v === 'string' && v && v !== 'Rest Day' && v !== 'None') return [v];
  return [];
};

const normalizePlan = (raw) => {
  const plan = {};
  DAYS.forEach(d => { plan[d] = dayList(raw?.[d]); });
  return plan;
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

// Strength logs carry a `type` ('weight' | 'bodyweight') set at completion
// time from the template's exercise definition. Older logs predate the
// field, and were always weighted lifts, so they default to 'weight'.
const logType = (log) => (log.type === 'bodyweight' ? 'bodyweight' : 'weight');

// --- Session helpers ---------------------------------------------------------
// A session's identity is date::templateName — the same template can run on
// two different dates, or two templates on the same date, but not the same
// template twice in one day.
const sessionKey = (s) => `${s.date}::${s.templateName}`;
const sessionHasProgress = (s) => Object.values(s.exercises).some(ex => ex.sets.length > 0);
const sessionSetCount = (s) => Object.values(s.exercises).reduce((a, ex) => a + ex.sets.length, 0);

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
function EditableSetRow({ set, type = 'weight', onChange, onDelete }) {
  const isBodyweight = type === 'bodyweight';
  return (
    <div className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-gray-100">
      <span className="text-[10px] text-gray-400 w-10 flex-shrink-0">Set {set.setNumber}</span>
      {!isBodyweight && (
        <>
          <input
            type="number"
            inputMode="decimal"
            value={set.weight}
            onChange={e => onChange({ ...set, weight: e.target.value === '' ? '' : Number(e.target.value) })}
            className="w-14 bg-gray-50 border border-gray-200 rounded-md text-center text-xs py-1 outline-none focus:border-orange-400"
          />
          <span className="text-[10px] text-gray-400 flex-shrink-0">kg ×</span>
        </>
      )}
      <input
        type="number"
        inputMode="numeric"
        value={set.reps}
        onChange={e => onChange({ ...set, reps: e.target.value === '' ? '' : Number(e.target.value) })}
        className="w-12 bg-gray-50 border border-gray-200 rounded-md text-center text-xs py-1 outline-none focus:border-orange-400"
      />
      <span className="text-[10px] text-gray-400 flex-shrink-0">reps</span>
      <button onClick={onDelete} className="ml-auto text-gray-300 active:text-red-500 flex-shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// Tiny SVG polyline preview of a saved route — no map tiles needed.
function RouteThumb({ waypoints }) {
  const w = 72, h = 48, pad = 6;
  if (!waypoints || waypoints.length < 2) {
    return <div className="w-[72px] h-12 bg-gray-100 rounded-lg" />;
  }
  const lats = waypoints.map(p => p.latitude);
  const lngs = waypoints.map(p => p.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 1e-6;
  const spanLng = maxLng - minLng || 1e-6;
  const pts = waypoints.map(p => {
    const x = pad + ((p.longitude - minLng) / spanLng) * (w - 2 * pad);
    const y = pad + ((maxLat - p.latitude) / spanLat) * (h - 2 * pad);
    return [x, y];
  });
  const [sx, sy] = pts[0];
  const [ex, ey] = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="bg-orange-50 rounded-lg flex-shrink-0">
      <polyline
        points={pts.map(([x, y]) => `${x},${y}`).join(' ')}
        fill="none" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
      />
      <circle cx={sx} cy={sy} r="3" fill="#16a34a" />
      <circle cx={ex} cy={ey} r="3" fill="#dc2626" />
    </svg>
  );
}

export default function FitnessTracker() {
  const [tab, setTab] = useState('today');
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [plan, setPlan] = useState(DEFAULT_PLAN);
  const [strengthLogs, setStrengthLogs] = useState([]);
  const [cardioLogs, setCardioLogs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Per-exercise input state, keyed `${sessionKey}::${exercise}` so the same
  // exercise in two sessions (or templates) never collides.
  const [strengthInputs, setStrengthInputs] = useState({});
  const [cardioInputs, setCardioInputs] = useState({});
  const [justLogged, setJustLogged] = useState({});

  // Which history entry is expanded for per-set editing.
  const [expandedLogId, setExpandedLogId] = useState(null);
  // Which Today workout cards are expanded (collapsed by default), keyed by session key.
  const [expandedWorkouts, setExpandedWorkouts] = useState({});
  // Stray-session recovery cards: dismissed hides the card for now, resumed
  // shows the session's full logging UI alongside today's workouts.
  const [dismissedStray, setDismissedStray] = useState({});
  const [resumedStray, setResumedStray] = useState({});

  // Template builder. Bulk "paste a list" mode is the default — typing 5-8
  // exercises one at a time was a genuine reported pain point.
  const [builder, setBuilder] = useState({
    name: '', exercises: [], mode: 'list',
    bulkText: '', bulkType: 'weight',
    draftName: '', draftType: 'weight'
  });
  const [builderOpen, setBuilderOpen] = useState(false);

  // Quick cardio sheet (floating action, not a permanently-visible card).
  const [cardioSheetOpen, setCardioSheetOpen] = useState(false);
  const [cardioForm, setCardioForm] = useState({ activity: 'Running', duration: 30, distance: 5, routeId: '' });
  const [plannerOpen, setPlannerOpen] = useState(false);

  const todayISO = toISO(new Date());
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const plannedNames = dayList(plan[todayName]);
  // "Today" is always derived live from the plan — never stored separately.
  const plannedTemplates = plannedNames
    .map(n => templates.find(t => t.name === n))
    .filter(Boolean);

  const inputKey = (sKey, e) => `${sKey}::${e}`;

  const showToast = (msg, isError = false) => {
    setToast({ message: msg, isError });
    setTimeout(() => setToast(null), 2200);
  };

  const flash = (k) => {
    setJustLogged(p => ({ ...p, [k]: true }));
    setTimeout(() => setJustLogged(p => ({ ...p, [k]: false })), 1500);
  };

  // --- Persistence (summit-data.json via lib/db) -----------------------------
  const saveToStorage = (storageKey, data) => {
    dbSet(storageKey, data).catch(() => {
      showToast('Save failed — change may not persist.', true);
    });
  };

  const loadAll = async () => {
    const loadData = async (storageKey, fallback) => {
      try {
        const val = await dbGet(storageKey);
        return val ?? fallback;
      } catch {
        return fallback;
      }
    };
    const [sl, cl, wt, wwp, as, rt] = await Promise.all([
      loadData(STORAGE_KEYS.strengthLogs, []),
      loadData(STORAGE_KEYS.cardioLogs, []),
      loadData(STORAGE_KEYS.workoutTemplates, DEFAULT_TEMPLATES),
      loadData(STORAGE_KEYS.weeklyWorkoutPlan, DEFAULT_PLAN),
      loadData(STORAGE_KEYS.activeSession, []),
      loadData(STORAGE_KEYS.cardioRoutes, []),
    ]);
    setStrengthLogs(sl);
    setCardioLogs(cl);
    // Legacy 'gym' exercises (and anything else unrecognized) normalize to 'weight'.
    setTemplates((Array.isArray(wt) ? wt : []).map(normalizeTemplateExercises));
    setPlan(normalizePlan(wwp));
    // Legacy shape stored a single session object; now it's an array.
    setSessions(Array.isArray(as) ? as : as ? [as] : []);
    setRoutes(rt);
  };

  useEffect(() => {
    (async () => {
      try {
        await loadAll();
      } catch {
        setLoadError('Could not load saved data. Starting fresh — new entries will still try to save.');
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manual refresh — the GitHub-backed store is cached in memory per page
  // load, so changes made elsewhere (another device/tab) aren't picked up
  // until now without a full app reload.
  const refreshFromRemote = async () => {
    setIsRefreshing(true);
    try {
      await dbRefresh();
      await loadAll();
      showToast('Refreshed');
    } catch {
      showToast('Refresh failed — check your connection', true);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Write-through setters: update state and persist in one call.
  const updateStrengthLogs = (next) => { setStrengthLogs(next); saveToStorage(STORAGE_KEYS.strengthLogs, next); };
  const updateCardioLogs = (next) => { setCardioLogs(next); saveToStorage(STORAGE_KEYS.cardioLogs, next); };
  const updateTemplates = (next) => { setTemplates(next); saveToStorage(STORAGE_KEYS.workoutTemplates, next); };
  const updatePlan = (next) => { setPlan(next); saveToStorage(STORAGE_KEYS.weeklyWorkoutPlan, next); };
  const updateSessions = (next) => { setSessions(next); saveToStorage(STORAGE_KEYS.activeSession, next); };
  const updateRoutes = (next) => { setRoutes(next); saveToStorage(STORAGE_KEYS.cardioRoutes, next); };

  // Reconcile sessions against today's plan:
  //  - every planned template today with at least one gym exercise gets a
  //    session (so picking a workout in Plan is instantly reflected in Today),
  //  - sessions that no longer match the plan and have no progress are
  //    dropped silently (stale leftovers from an old plan),
  //  - sessions with progress are never removed here — they surface as
  //    dismissible recovery cards instead of vanishing.
  useEffect(() => {
    if (isLoading) return;
    let next = sessions.filter(s =>
      (s.date === todayISO && plannedNames.includes(s.templateName)) || sessionHasProgress(s)
    );
    plannedTemplates.forEach(tpl => {
      const firstGym = tpl.exercises.find(e => e.type !== 'cardio');
      if (!firstGym) return;
      if (!next.some(s => s.date === todayISO && s.templateName === tpl.name)) {
        next = [...next, { date: todayISO, templateName: tpl.name, exercises: {}, activeExercise: firstGym.name }];
      }
    });
    const keysOf = (arr) => arr.map(sessionKey).sort().join('|');
    if (keysOf(next) !== keysOf(sessions)) updateSessions(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, plan, templates, sessions]);

  // Sessions with progress that no longer match today's plan — candidates for
  // the Resume/Discard recovery flow.
  const straySessions = sessions.filter(s =>
    !(s.date === todayISO && plannedNames.includes(s.templateName)) && sessionHasProgress(s)
  );

  // --- Session actions (Add Set / Lock Set / Complete) ------------------------
  const patchSession = (sKey, fn) => {
    updateSessions(sessions.map(s => (sessionKey(s) === sKey ? fn(s) : s)));
  };

  // exDef is the template's exercise definition ({ name, type }) — the type
  // decides whether a weight is recorded at all.
  const addSet = (session, exDef) => {
    const sKey = sessionKey(session);
    const ik = inputKey(sKey, exDef.name);
    const isBodyweight = exDef.type === 'bodyweight';
    const inp = strengthInputs[ik] || (isBodyweight ? { reps: 8 } : { weight: 40, reps: 8 });
    const ex = session.exercises[exDef.name] || { sets: [], locked: false };
    if (ex.locked) return;
    const newSet = {
      setNumber: ex.sets.length + 1,
      reps: Number(inp.reps) || 0,
      weight: isBodyweight ? 0 : (Number(inp.weight) || 0),
      timestamp: Date.now()
    };
    patchSession(sKey, s => ({
      ...s,
      exercises: { ...s.exercises, [exDef.name]: { ...ex, sets: [...ex.sets, newSet] } }
    }));
  };

  const removeSetFromSession = (session, exerciseName, index) => {
    const ex = session.exercises[exerciseName];
    if (!ex || ex.locked) return;
    const sets = ex.sets.filter((_, i) => i !== index).map((s, i) => ({ ...s, setNumber: i + 1 }));
    patchSession(sessionKey(session), s => ({
      ...s,
      exercises: { ...s.exercises, [exerciseName]: { ...ex, sets } }
    }));
  };

  const lockExercise = (session, template, exerciseName) => {
    const ex = session.exercises[exerciseName] || { sets: [], locked: false };
    if (ex.sets.length === 0) return;
    const gymExercises = template.exercises.filter(e => e.type !== 'cardio');
    const remaining = gymExercises.filter(e =>
      e.name !== exerciseName && !session.exercises[e.name]?.locked
    );
    const idx = gymExercises.findIndex(e => e.name === exerciseName);
    const nextEx = gymExercises.slice(idx + 1).find(e => !session.exercises[e.name]?.locked) || remaining[0];
    patchSession(sessionKey(session), s => ({
      ...s,
      exercises: { ...s.exercises, [exerciseName]: { ...ex, locked: true } },
      activeExercise: nextEx ? nextEx.name : null
    }));
    showToast(nextEx ? `${exerciseName} locked — next up: ${nextEx.name}` : `${exerciseName} locked`);
  };

  const completeWorkout = (session) => {
    const template = templates.find(t => t.name === session.templateName);
    const entries = Object.entries(session.exercises)
      .filter(([, ex]) => ex.sets.length > 0)
      .map(([exercise, ex]) => ({
        id: Date.now() + Math.random(),
        date: session.date,
        exercise,
        type: template?.exercises.find(e => e.name === exercise)?.type === 'bodyweight' ? 'bodyweight' : 'weight',
        setDetails: ex.sets
      }));
    if (entries.length === 0) {
      showToast('No sets recorded — nothing to complete', true);
      return;
    }
    updateStrengthLogs([...strengthLogs, ...entries]);
    updateSessions(sessions.filter(s => sessionKey(s) !== sessionKey(session)));
    setResumedStray(p => ({ ...p, [sessionKey(session)]: false }));
    setExpandedWorkouts(p => ({ ...p, [sessionKey(session)]: false }));
    showToast('Workout complete!');
  };

  const discardSession = (session) => {
    updateSessions(sessions.filter(s => sessionKey(s) !== sessionKey(session)));
    setResumedStray(p => ({ ...p, [sessionKey(session)]: false }));
  };

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

  // --- Cardio ----------------------------------------------------------------
  const logCardioFromPlan = (sKey, exercise) => {
    const k = inputKey(sKey, exercise);
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

  // Quick cardio: either manual entry, or from a saved route — the route
  // pre-fills activity + distance so only duration needs entering.
  const selectedRoute = cardioForm.routeId
    ? routes.find(r => String(r.id) === String(cardioForm.routeId))
    : null;

  const logQuickCardio = () => {
    const duration = Number(cardioForm.duration);
    if (!duration || duration <= 0) return;
    const activity = selectedRoute ? selectedRoute.activity : cardioForm.activity;
    const distance = selectedRoute
      ? Number(routeDistanceKm(selectedRoute).toFixed(2))
      : Number(cardioForm.distance) || 0;
    updateCardioLogs([...cardioLogs, {
      id: Date.now(),
      date: toISO(new Date()),
      activity, duration, distance
    }]);
    setCardioSheetOpen(false);
    showToast(selectedRoute ? `${selectedRoute.name} logged` : 'Cardio session logged');
  };

  const saveRoute = (route) => {
    updateRoutes([...routes, route]);
    setPlannerOpen(false);
    showToast(`Route saved · ${(route.distanceMeters / 1000).toFixed(2)} km`);
  };

  const deleteRoute = (id) => updateRoutes(routes.filter(r => r.id !== id));

  // --- Template actions ------------------------------------------------------
  const addDraftExercise = () => {
    if (!builder.draftName.trim()) return;
    setBuilder(p => ({
      ...p,
      exercises: [...p.exercises, { name: p.draftName.trim(), type: p.draftType }],
      draftName: ''
    }));
  };

  // Bulk entry: one exercise per line OR comma-separated (covers pasting from
  // a notes app and typing a quick list), one type applied to the whole batch.
  const addBulkExercises = () => {
    const names = builder.bulkText
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    setBuilder(p => ({
      ...p,
      exercises: [...p.exercises, ...names.map(name => ({ name, type: p.bulkType }))],
      bulkText: ''
    }));
  };

  const createTemplate = () => {
    if (!builder.name.trim() || builder.exercises.length === 0) return;
    updateTemplates([...templates, { id: Date.now(), name: builder.name.trim(), exercises: builder.exercises }]);
    setBuilder({ name: '', exercises: [], mode: 'list', bulkText: '', bulkType: 'weight', draftName: '', draftType: 'weight' });
    setBuilderOpen(false);
    showToast('Workout created');
  };

  // Lets an exercise's type be changed after the fact — both while still
  // drafting in the builder and on an already-saved template — without
  // deleting and re-adding it.
  const cycleTemplateExerciseType = (templateId, exerciseIndex) => {
    updateTemplates(templates.map(t => {
      if (t.id !== templateId) return t;
      return {
        ...t,
        exercises: t.exercises.map((e, i) => i === exerciseIndex ? { ...e, type: cycleExerciseType(e.type) } : e)
      };
    }));
  };

  const deleteTemplate = (id) => {
    const tpl = templates.find(t => t.id === id);
    updateTemplates(templates.filter(t => t.id !== id));
    // Un-assign it from any day it was scheduled on
    if (tpl) {
      const next = { ...plan };
      DAYS.forEach(d => { next[d] = dayList(next[d]).filter(n => n !== tpl.name); });
      updatePlan(next);
    }
  };

  // --- Plan actions ----------------------------------------------------------
  const addWorkoutToDay = (day, name) => {
    if (!name || dayList(plan[day]).includes(name)) return;
    updatePlan({ ...plan, [day]: [...dayList(plan[day]), name] });
  };

  const removeWorkoutFromDay = (day, name) => {
    updatePlan({ ...plan, [day]: dayList(plan[day]).filter(n => n !== name) });
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

  // --- Exercise card inside an expanded workout ------------------------------
  const renderExerciseCard = (session, template, ex) => {
    const sKey = sessionKey(session);
    const k = inputKey(sKey, ex.name);
    const logged = justLogged[k];
    const meta = TYPE_META[ex.type] || TYPE_META.weight;
    const Icon = meta.icon;

    // Cardio inside a template: duration input + log, outside the set/lock flow.
    if (ex.type === 'cardio') {
      return (
        <div key={k} className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Icon className={`w-4 h-4 ${meta.iconText}`} />
            <span className="font-semibold text-gray-900 text-sm">{ex.name}</span>
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
        <div key={k} className="bg-gray-50 rounded-2xl border border-gray-200 p-4 opacity-80">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-4 h-4 text-green-500" />
            <span className="font-semibold text-gray-700 text-sm">{ex.name}</span>
            <span className="text-[10px] text-gray-400 ml-auto">{exSession.sets.length} set{exSession.sets.length === 1 ? '' : 's'} locked</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {exSession.sets.map(s => (
              <span key={s.setNumber} className="text-[11px] bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-500">
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
          className="w-full text-left bg-white rounded-2xl border border-dashed border-gray-200 p-4 opacity-60"
        >
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-gray-300" />
            <span className="font-medium text-gray-400 text-sm">{ex.name}</span>
            <span className="text-[10px] text-gray-300 ml-auto">
              {exSession.sets.length > 0 ? `${exSession.sets.length} sets` : 'Not started'}
            </span>
          </div>
        </button>
      );
    }

    const inp = strengthInputs[k] || (isBodyweight ? { reps: 8 } : { weight: 40, reps: 8 });
    const setInp = (field, v) => setStrengthInputs(p => ({ ...p, [k]: { ...inp, [field]: v } }));
    return (
      <div key={k} className={`bg-white rounded-2xl border p-4 ${meta.cardBorder}`}>
        <div className="flex items-center gap-2 mb-3">
          <Icon className={`w-4 h-4 ${meta.iconText}`} />
          <span className="font-semibold text-gray-900 text-sm">{ex.name}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ml-auto ${meta.cardBadge}`}>
            {exSession.sets.length} set{exSession.sets.length === 1 ? '' : 's'} logged
          </span>
        </div>

        {exSession.sets.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {exSession.sets.map((s, i) => (
              <span key={s.setNumber} className="text-[11px] bg-gray-100 rounded-full pl-2 pr-1 py-0.5 text-gray-600 flex items-center gap-1">
                {formatSet(s)}
                <button onClick={() => removeSetFromSession(session, ex.name, i)} className="text-gray-400 active:text-red-500">
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

  // --- Collapsible workout card on Today -------------------------------------
  // Collapsed by default (name + status only) so a multi-workout day stays
  // scannable; expand-on-demand reveals the full logging UI.
  const renderWorkoutCard = (session, { stray = false } = {}) => {
    const sKey = sessionKey(session);
    const template = templates.find(t => t.name === session.templateName) || {
      // Template was deleted mid-session — synthesize enough to keep logging.
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
          className="w-full bg-orange-600 p-4 text-white text-left"
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-orange-200">
                {stray ? `Resumed · ${formatSwiss(session.date)}` : todayName}
              </div>
              <div className="text-lg font-bold truncate">{template.name}</div>
              <div className="text-xs text-orange-200">
                {template.exercises.length} exercises
                {setCount > 0 ? ` · ${setCount} sets logged` : ''}
                {lockedCount > 0 ? ` · ${lockedCount}/${gymCount} done` : ''}
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-orange-200 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
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

  // --- Pages -----------------------------------------------------------------
  const visibleStrays = straySessions.filter(s => !dismissedStray[sessionKey(s)]);
  const resumedSessions = straySessions.filter(s => resumedStray[sessionKey(s)]);
  const todaySessions = plannedTemplates
    .map(tpl => sessions.find(s => s.date === todayISO && s.templateName === tpl.name))
    .filter(Boolean);
  // Cardio-only templates have no session — render them as a simple card.
  const cardioOnlyTemplates = plannedTemplates.filter(
    tpl => !tpl.exercises.some(e => e.type !== 'cardio')
  );

  const TodayPage = (
    <div className="space-y-3">
      <div className="flex gap-2">
        <StatCard icon={Flame} label="Volume" value={`${(totalVolume / 1000).toFixed(1)}t`} sub="lifetime lifted" />
        <StatCard icon={Timer} label="Cardio" value={`${totalCardioMin}m`} sub="lifetime" />
        <StatCard icon={CalendarDays} label="This week" value={sessionsThisWeek} sub="active days" />
      </div>

      {/* Stray in-progress sessions: small, dismissible recovery cards rather
          than one big blocking banner. */}
      {visibleStrays.filter(s => !resumedStray[sessionKey(s)]).map(s => {
        const sKey = sessionKey(s);
        return (
          <div key={sKey} className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
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
                className="flex-1 h-8 rounded-lg bg-white border border-amber-300 text-amber-700 text-xs font-semibold active:bg-amber-100"
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
        // No session for cardio-only workouts — log each activity directly.
        const pseudo = { date: todayISO, templateName: tpl.name, exercises: {}, activeExercise: null };
        return (
          <div key={tpl.name} className="space-y-3">
            <div className="bg-orange-500 rounded-2xl p-4 text-white">
              <div className="text-[11px] uppercase tracking-wide text-orange-100">{todayName}</div>
              <div className="text-lg font-bold">{tpl.name}</div>
              <div className="text-xs text-orange-100">{tpl.exercises.length} cardio exercises</div>
            </div>
            {tpl.exercises.map(ex => renderExerciseCard(pseudo, tpl, ex))}
          </div>
        );
      })}

      {plannedTemplates.length === 0 && resumedSessions.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <Moon className="w-6 h-6 text-gray-300 mx-auto mb-2" />
          <div className="font-semibold text-gray-900 text-sm">Rest day</div>
          <div className="text-xs text-gray-400 mt-1">Nothing scheduled for {todayName}. Recovery counts too.</div>
        </div>
      )}
    </div>
  );

  const PlanPage = (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-gray-900 text-sm">Weekly plan</span>
          <div className="flex gap-2">
            <button onClick={() => updatePlan(DEFAULT_PLAN)}
              className="text-[11px] font-medium text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg active:bg-orange-100">
              Default
            </button>
            <button onClick={() => updatePlan(REST_WEEK)}
              className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg active:bg-gray-200">
              Rest week
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          {DAYS.map(day => {
            const assigned = dayList(plan[day]);
            const available = templates.filter(t => !assigned.includes(t.name));
            return (
              <div key={day}
                className={`flex items-start gap-3 rounded-xl px-3 py-2 ${day === todayName ? 'bg-orange-50' : ''}`}>
                <span className={`text-xs w-12 flex-shrink-0 pt-1.5 ${day === todayName ? 'font-bold text-orange-600' : 'text-gray-500'}`}>
                  {day.slice(0, 3)}{day === todayName ? ' •' : ''}
                </span>
                <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5">
                  {assigned.length === 0 && (
                    <span className="text-[11px] text-gray-300 py-1">Rest day</span>
                  )}
                  {assigned.map(name => (
                    <span key={name}
                      className="text-[11px] bg-orange-100 text-orange-700 rounded-full pl-2.5 pr-1 py-1 flex items-center gap-1 font-medium">
                      {name}
                      <button onClick={() => removeWorkoutFromDay(day, name)}
                        className="text-orange-400 active:text-red-500" aria-label={`Remove ${name} from ${day}`}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {available.length > 0 && (
                    <div className="relative">
                      <select
                        value=""
                        onChange={e => addWorkoutToDay(day, e.target.value)}
                        className="appearance-none bg-gray-100 text-gray-500 rounded-full pl-2.5 pr-6 py-1 text-[11px] outline-none"
                        aria-label={`Add workout to ${day}`}
                      >
                        <option value="" disabled>+ Add</option>
                        {available.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                      </select>
                      <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-gray-900 text-sm">Workouts</span>
          <button onClick={() => setBuilderOpen(o => !o)}
            className="flex items-center gap-1 text-[11px] font-medium text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg active:bg-orange-100">
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
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-orange-500"
            />

            {/* Entry mode toggle — bulk list is the default */}
            <div className="flex bg-gray-200/60 rounded-lg p-0.5">
              {[['list', 'Paste a list'], ['single', 'One at a time']].map(([mode, label]) => (
                <button key={mode}
                  onClick={() => setBuilder(p => ({ ...p, mode }))}
                  className={`flex-1 text-[11px] font-medium py-1.5 rounded-md ${
                    builder.mode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {builder.mode === 'list' ? (
              <>
                <textarea
                  value={builder.bulkText}
                  onChange={e => setBuilder(p => ({ ...p, bulkText: e.target.value }))}
                  placeholder={'One exercise per line, or comma-separated:\nSquat\nLeg Press, Calf Raise'}
                  rows={4}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-orange-500 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setBuilder(p => ({ ...p, bulkType: cycleExerciseType(p.bulkType) }))}
                    className={`px-3 py-2 rounded-lg text-[11px] font-medium flex-shrink-0 flex items-center gap-1 ${TYPE_META[builder.bulkType].chip}`}
                    title="Tap to change type for the whole list"
                  >
                    {(() => { const Icon = TYPE_META[builder.bulkType].icon; return <Icon className="w-3.5 h-3.5" />; })()}
                    {TYPE_META[builder.bulkType].label}
                  </button>
                  <button onClick={addBulkExercises}
                    disabled={!builder.bulkText.trim()}
                    className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-xs font-semibold disabled:opacity-40 active:bg-gray-700 flex items-center justify-center gap-1">
                    <ClipboardList className="w-3.5 h-3.5" /> Add list
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <input
                  value={builder.draftName}
                  onChange={e => setBuilder(p => ({ ...p, draftName: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addDraftExercise()}
                  placeholder="Exercise"
                  className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-orange-500"
                />
                <button
                  onClick={() => setBuilder(p => ({ ...p, draftType: cycleExerciseType(p.draftType) }))}
                  className={`px-3 rounded-lg text-[11px] font-medium flex-shrink-0 flex items-center gap-1 ${TYPE_META[builder.draftType].chip}`}
                >
                  {(() => { const Icon = TYPE_META[builder.draftType].icon; return <Icon className="w-3.5 h-3.5" />; })()}
                  {TYPE_META[builder.draftType].label}
                </button>
                <button onClick={addDraftExercise}
                  className="bg-gray-900 text-white rounded-lg px-3 flex-shrink-0 active:bg-gray-700">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}

            {builder.exercises.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {/* Each exercise keeps its own type after being added — tap the
                    name to cycle Weight → Bodyweight → Cardio, tap × to remove. */}
                {builder.exercises.map((ex, i) => {
                  const meta = TYPE_META[ex.type] || TYPE_META.weight;
                  return (
                    <div key={i} className={`text-[11px] pl-2.5 pr-1 py-1 rounded-full flex items-center gap-1 ${meta.chip}`}>
                      <button
                        onClick={() => setBuilder(p => ({
                          ...p,
                          exercises: p.exercises.map((e, j) => j === i ? { ...e, type: cycleExerciseType(e.type) } : e)
                        }))}
                        className="flex items-center gap-1"
                        title="Tap to change type"
                      >
                        {ex.name}
                        <span className="opacity-70">· {meta.label}</span>
                      </button>
                      <button
                        onClick={() => setBuilder(p => ({ ...p, exercises: p.exercises.filter((_, j) => j !== i) }))}
                        aria-label={`Remove ${ex.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <button onClick={createTemplate}
              disabled={!builder.name.trim() || builder.exercises.length === 0}
              className="w-full h-10 bg-orange-600 text-white rounded-lg text-sm font-semibold disabled:opacity-40 active:bg-orange-700">
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
                {/* Tap an exercise to cycle its type — stays editable after the
                    workout is saved, no need to delete and re-add. */}
                {t.exercises.map((ex, i) => (
                  <button key={i}
                    onClick={() => cycleTemplateExerciseType(t.id, i)}
                    className={`text-[10px] px-2 py-0.5 rounded-full ${(TYPE_META[ex.type] || TYPE_META.weight).badge}`}
                    title="Tap to change type"
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">No workouts yet — create one above.</p>
          )}
        </div>
      </div>

      {/* Saved cardio routes */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-gray-900 text-sm">Routes</span>
          <button onClick={() => setPlannerOpen(true)}
            className="flex items-center gap-1 text-[11px] font-medium text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg active:bg-orange-100">
            <MapPin className="w-3 h-3" /> Plan route
          </button>
        </div>
        {routes.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">
            No routes yet — plan one to make logging repeat runs a two-tap action.
          </p>
        ) : (
          <div className="space-y-2">
            {routes.map(r => (
              <div key={r.id} className="flex items-center gap-3 border border-gray-200 rounded-xl p-2.5">
                <RouteThumb waypoints={r.waypoints} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 truncate">{r.name}</div>
                  <div className="text-[11px] text-gray-400">
                    {r.activity} · {routeDistanceKm(r).toFixed(2)} km · {r.waypoints.length} points
                  </div>
                </div>
                <button onClick={() => deleteRoute(r.id)} className="text-gray-300 active:text-red-500 p-1 flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
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
          <Dumbbell className="w-4 h-4 text-orange-500" />
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
                    const type = logType(l);
                    return (
                      <div key={l.id} className="bg-gray-50 rounded-lg px-3 py-2">
                        <button
                          onClick={() => setExpandedLogId(expanded ? null : l.id)}
                          className="w-full flex items-center justify-between"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs font-medium text-gray-900 truncate">{l.exercise}</span>
                            {type === 'bodyweight' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 flex-shrink-0">BW</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 tabular-nums">{logSetCount(l)} sets</span>
                            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
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
      <div className="min-h-screen bg-[#f7f7f5]">
        <div className="max-w-md mx-auto px-4 pt-5 pb-28 space-y-3">
          <div className="skeleton h-6 w-24" />
          <div className="flex gap-2">
            <div className="skeleton h-[74px] flex-1" />
            <div className="skeleton h-[74px] flex-1" />
            <div className="skeleton h-[74px] flex-1" />
          </div>
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#37352f] font-sans antialiased">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] text-xs px-4 py-2.5 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap animate-toast-in ${
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
          <div className="flex items-center gap-3">
            <button
              onClick={refreshFromRemote}
              disabled={isRefreshing}
              aria-label="Refresh data"
              className="text-gray-400 active:text-gray-600 disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <span className="text-xs text-gray-400">{formatSwiss(todayISO)}</span>
          </div>
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

      {/* Floating quick-cardio action (Today only) */}
      {tab === 'today' && (
        <button
          onClick={() => {
            setCardioForm(p => ({ ...p, routeId: '' }));
            setCardioSheetOpen(true);
          }}
          aria-label="Log quick cardio"
          className="fixed bottom-20 right-4 z-40 w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg shadow-orange-500/30 flex items-center justify-center active:bg-orange-600"
        >
          <Activity className="w-6 h-6" />
        </button>
      )}

      {/* Quick cardio bottom sheet */}
      {cardioSheetOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCardioSheetOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-w-md mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-500" />
                <span className="font-semibold text-gray-900 text-sm">Quick cardio</span>
              </div>
              <button onClick={() => setCardioSheetOpen(false)} className="text-gray-400 active:text-gray-600 p-1" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Route picker — a saved route turns "log today's run" into two taps */}
            {routes.length > 0 && (
              <div className="relative mb-2">
                <select
                  value={cardioForm.routeId}
                  onChange={e => setCardioForm(p => ({ ...p, routeId: e.target.value }))}
                  className="w-full appearance-none bg-orange-50 text-orange-700 rounded-xl px-4 py-3 text-sm font-medium outline-none"
                >
                  <option value="">Manual entry (no route)</option>
                  {routes.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} · {r.activity} · {routeDistanceKm(r).toFixed(2)} km
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-orange-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {!selectedRoute && (
              <div className="relative mb-2">
                <select
                  value={cardioForm.activity}
                  onChange={e => setCardioForm(p => ({ ...p, activity: e.target.value }))}
                  className="w-full appearance-none bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none"
                >
                  {CARDIO_ACTIVITIES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            <div className="flex gap-2 mb-3">
              <Stepper label="Minutes" value={cardioForm.duration} step={5}
                onChange={v => setCardioForm(p => ({ ...p, duration: v }))} />
              {selectedRoute ? (
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1 text-center">Distance (km)</div>
                  <div className="bg-orange-50 rounded-xl py-3 text-center text-sm font-semibold text-orange-700 tabular-nums">
                    {routeDistanceKm(selectedRoute).toFixed(2)}
                  </div>
                </div>
              ) : (
                <Stepper label="Distance" unit="km" value={cardioForm.distance}
                  onChange={v => setCardioForm(p => ({ ...p, distance: v }))} />
              )}
            </div>
            <button onClick={logQuickCardio}
              className="w-full h-11 bg-orange-500 text-white rounded-xl text-sm font-semibold active:bg-orange-600">
              Log {selectedRoute ? selectedRoute.name : 'cardio'}
            </button>
          </div>
        </div>
      )}

      {plannerOpen && (
        <RoutePlanner
          activities={CARDIO_ACTIVITIES}
          onSave={saveRoute}
          onClose={() => setPlannerOpen(false)}
        />
      )}

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto flex">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 ${
                tab === id ? 'text-orange-600' : 'text-gray-400'
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
