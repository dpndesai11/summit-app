import { useState, useEffect } from 'react';
import { STORAGE_KEYS, DEFAULT_TEMPLATES, DEFAULT_PLAN, DAYS, DEFAULT_WORKOUT_TIME, DEFAULT_WORKOUT_DURATION, normalizeTimeEntry, toISO, dayList, normalizePlan } from './lib/model';
import { cycleExerciseType, normalizeTemplateExercises, parseExercise } from './lib/exercises';
import { calcCurrentStreak, computeAllTimeBests, expandLogSets, logVolume, sessionKey, sessionHasProgress, setMetric, lastSetFor, defaultSetInputs } from './lib/stats';
import useTimer from './useTimer';
import { dbGet, dbSet, dbRefresh } from '@summit/core/db';
import { routeDistanceKm } from './lib/geo';

// All of the Fitness app's state and behaviour in one hook — lifted verbatim out of
// the old 1,574-line WorkoutsSection so the three tabs (Today / Plan / Progress) can
// share it. Nothing here renders anything; it loads/saves the summit_* keys through
// the shared data layer and returns everything the tabs need.
export default function useWorkoutData() {
  // The drill timer lives here (not in a tab) so switching tabs doesn't lose it.
  const timer = useTimer();
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [plan, setPlan] = useState(DEFAULT_PLAN);
  const [workoutTimes, setWorkoutTimes] = useState({});
  const [strengthLogs, setStrengthLogs] = useState([]);
  const [cardioLogs, setCardioLogs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [strengthInputs, setStrengthInputs] = useState({});
  const [cardioInputs, setCardioInputs] = useState({});
  const [justLogged, setJustLogged] = useState({});

  const [expandedLogId, setExpandedLogId] = useState(null);
  const [expandedWorkouts, setExpandedWorkouts] = useState({});
  const [dismissedStray, setDismissedStray] = useState({});
  const [resumedStray, setResumedStray] = useState({});

  const [builder, setBuilder] = useState({
    name: '', exercises: [], mode: 'list',
    bulkText: '', bulkType: 'weight',
    draftName: '', draftType: 'weight'
  });
  const [builderOpen, setBuilderOpen] = useState(false);
  // null while creating a new workout; a template id while the builder is
  // pre-filled with an existing one's name/exercises for editing.
  const [editingTemplateId, setEditingTemplateId] = useState(null);

  const [cardioSheetOpen, setCardioSheetOpen] = useState(false);
  const [cardioForm, setCardioForm] = useState({ activity: 'Running', duration: 30, distance: 5, routeId: '' });
  const [plannerOpen, setPlannerOpen] = useState(false);

  const todayISO = toISO(new Date());
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const plannedNames = dayList(plan[todayName]);
  const plannedTemplates = plannedNames
    .map(n => templates.find(t => t.name === n))
    .filter(Boolean);

  const inputKey = (sKey, e) => `${sKey}::${e}`;

  const showToast = (msg, isError = false, isPR = false) => {
    setToast({ message: msg, isError, isPR });
    setTimeout(() => setToast(null), isPR ? 3600 : 2200);
  };

  const flash = (k) => {
    setJustLogged(p => ({ ...p, [k]: true }));
    setTimeout(() => setJustLogged(p => ({ ...p, [k]: false })), 1500);
  };

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
    const [sl, cl, wt, wwp, wtm, as, rt] = await Promise.all([
      loadData(STORAGE_KEYS.strengthLogs, []),
      loadData(STORAGE_KEYS.cardioLogs, []),
      loadData(STORAGE_KEYS.workoutTemplates, DEFAULT_TEMPLATES),
      loadData(STORAGE_KEYS.weeklyWorkoutPlan, DEFAULT_PLAN),
      loadData(STORAGE_KEYS.workoutTimes, {}),
      loadData(STORAGE_KEYS.activeSession, []),
      loadData(STORAGE_KEYS.cardioRoutes, []),
    ]);
    setStrengthLogs(sl);
    setCardioLogs(cl);
    setTemplates((Array.isArray(wt) ? wt : []).map(normalizeTemplateExercises));
    setPlan(normalizePlan(wwp));
    setWorkoutTimes(wtm && typeof wtm === 'object' ? wtm : {});
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

  const updateStrengthLogs = (next) => { setStrengthLogs(next); saveToStorage(STORAGE_KEYS.strengthLogs, next); };
  const updateCardioLogs = (next) => { setCardioLogs(next); saveToStorage(STORAGE_KEYS.cardioLogs, next); };
  const updateTemplates = (next) => { setTemplates(next); saveToStorage(STORAGE_KEYS.workoutTemplates, next); };
  const updatePlan = (next) => { setPlan(next); saveToStorage(STORAGE_KEYS.weeklyWorkoutPlan, next); };
  const updateWorkoutTimes = (next) => { setWorkoutTimes(next); saveToStorage(STORAGE_KEYS.workoutTimes, next); };
  const updateSessions = (next) => { setSessions(next); saveToStorage(STORAGE_KEYS.activeSession, next); };
  const updateRoutes = (next) => { setRoutes(next); saveToStorage(STORAGE_KEYS.cardioRoutes, next); };

  // Time-of-day the Dashboard should place this day/workout at. Falls back
  // to DEFAULT_WORKOUT_TIME until someone sets one explicitly, so the
  // timeline always has something to position it with.
  const getWorkoutEntry = (day, name) => normalizeTimeEntry(workoutTimes[day]?.[name], DEFAULT_WORKOUT_TIME, DEFAULT_WORKOUT_DURATION);
  const getWorkoutTime = (day, name) => getWorkoutEntry(day, name).time;
  const getWorkoutDuration = (day, name) => getWorkoutEntry(day, name).duration;
  const setWorkoutTime = (day, name, time) => {
    const entry = getWorkoutEntry(day, name);
    updateWorkoutTimes({ ...workoutTimes, [day]: { ...workoutTimes[day], [name]: { ...entry, time } } });
  };
  const setWorkoutDuration = (day, name, duration) => {
    const entry = getWorkoutEntry(day, name);
    const clamped = Math.max(5, Number(duration) || DEFAULT_WORKOUT_DURATION);
    updateWorkoutTimes({ ...workoutTimes, [day]: { ...workoutTimes[day], [name]: { ...entry, duration: clamped } } });
  };

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

  const straySessions = sessions.filter(s =>
    !(s.date === todayISO && plannedNames.includes(s.templateName)) && sessionHasProgress(s)
  );

  const patchSession = (sKey, fn) => {
    updateSessions(sessions.map(s => (sessionKey(s) === sKey ? fn(s) : s)));
  };

  const addSet = (session, exDef) => {
    const sKey = sessionKey(session);
    const ik = inputKey(sKey, exDef.name);
    const isBodyweight = exDef.type === 'bodyweight';
    // New sets start from what you did last time (falls back to 40 kg x 8 / 8 reps).
    const inp = strengthInputs[ik] || defaultSetInputs(isBodyweight, lastSetFor(exDef.name, strengthLogs));
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

  // A set logged from the drill timer: `seconds` instead of reps (perSide when it
  // was run once per side). Additive field — older code just sees reps 0.
  const addTimedSet = (session, exDef, seconds, perSide = false) => {
    const sKey = sessionKey(session);
    const ex = session.exercises[exDef.name] || { sets: [], locked: false };
    if (ex.locked) return;
    const newSet = {
      setNumber: ex.sets.length + 1,
      reps: 0,
      weight: 0,
      seconds: Number(seconds) || 0,
      ...(perSide ? { perSide: true } : {}),
      timestamp: Date.now()
    };
    patchSession(sKey, s => ({
      ...s,
      exercises: { ...s.exercises, [exDef.name]: { ...ex, sets: [...ex.sets, newSet] } }
    }));
    timer.closeTimer();
    showToast(`${seconds}s${perSide ? '/side' : ''} logged`);
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

  // Undo a lock — reopens the exercise for editing (add/remove sets) and
  // makes it the active card again, in case a set was mis-logged.
  const unlockExercise = (session, exerciseName) => {
    const ex = session.exercises[exerciseName];
    if (!ex) return;
    patchSession(sessionKey(session), s => ({
      ...s,
      exercises: { ...s.exercises, [exerciseName]: { ...ex, locked: false } },
      activeExercise: exerciseName,
    }));
    showToast(`${exerciseName} unlocked`);
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
    const prMessages = entries
      .map(entry => {
        const bestNow = entry.setDetails.reduce((m, s) => Math.max(m, setMetric(s, entry.type)), 0);
        const prior = allTimeBests[entry.exercise];
        if (!prior || bestNow <= prior.value) return null;
        const timed = entry.type === 'bodyweight' && entry.setDetails.some(s => Number(s.seconds) > 0 && !(Number(s.reps) > 0));
        const unit = entry.type !== 'bodyweight' ? 'kg' : timed ? 's' : ' reps';
        return `${parseExercise(entry.exercise).label} ${bestNow}${unit}`;
      })
      .filter(Boolean);

    updateStrengthLogs([...strengthLogs, ...entries]);
    updateSessions(sessions.filter(s => sessionKey(s) !== sessionKey(session)));
    setResumedStray(p => ({ ...p, [sessionKey(session)]: false }));
    setExpandedWorkouts(p => ({ ...p, [sessionKey(session)]: false }));
    if (prMessages.length > 0) {
      showToast(`New PR! ${prMessages.join(', ')}`, false, true);
    } else {
      showToast('Workout complete!');
    }
  };

  const discardSession = (session) => {
    updateSessions(sessions.filter(s => sessionKey(s) !== sessionKey(session)));
    setResumedStray(p => ({ ...p, [sessionKey(session)]: false }));
  };

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

  const addDraftExercise = () => {
    if (!builder.draftName.trim()) return;
    setBuilder(p => ({
      ...p,
      exercises: [...p.exercises, { name: p.draftName.trim(), type: p.draftType }],
      draftName: ''
    }));
  };

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

  const startEditTemplate = (t) => {
    setBuilder({ name: t.name, exercises: t.exercises, mode: 'list', bulkText: '', bulkType: 'weight', draftName: '', draftType: 'weight' });
    setEditingTemplateId(t.id);
    setBuilderOpen(true);
  };

  const closeBuilder = () => {
    setBuilder({ name: '', exercises: [], mode: 'list', bulkText: '', bulkType: 'weight', draftName: '', draftType: 'weight' });
    setEditingTemplateId(null);
    setBuilderOpen(false);
  };

  const saveTemplate = () => {
    if (!builder.name.trim() || builder.exercises.length === 0) return;
    if (editingTemplateId) {
      updateTemplates(templates.map(t =>
        t.id === editingTemplateId ? { ...t, name: builder.name.trim(), exercises: builder.exercises } : t
      ));
      showToast('Workout updated');
    } else {
      updateTemplates([...templates, { id: Date.now(), name: builder.name.trim(), exercises: builder.exercises }]);
      showToast('Workout created');
    }
    setBuilder({ name: '', exercises: [], mode: 'list', bulkText: '', bulkType: 'weight', draftName: '', draftType: 'weight' });
    setEditingTemplateId(null);
    setBuilderOpen(false);
  };

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
    if (tpl) {
      const next = { ...plan };
      DAYS.forEach(d => { next[d] = dayList(next[d]).filter(n => n !== tpl.name); });
      updatePlan(next);
    }
  };

  const addWorkoutToDay = (day, name) => {
    if (!name || dayList(plan[day]).includes(name)) return;
    updatePlan({ ...plan, [day]: [...dayList(plan[day]), name] });
  };

  const removeWorkoutFromDay = (day, name) => {
    updatePlan({ ...plan, [day]: dayList(plan[day]).filter(n => n !== name) });
  };

  const totalVolume = strengthLogs.reduce((a, l) => a + logVolume(l), 0);
  const totalCardioMin = cardioLogs.reduce((a, l) => a + l.duration, 0);
  const activeDates = new Set([...strengthLogs, ...cardioLogs].map(l => l.date));
  const currentStreak = calcCurrentStreak(activeDates);
  const allTimeBests = computeAllTimeBests(strengthLogs);

  return {
    timer,
    addTimedSet,
    templates,
    setTemplates,
    plan,
    setPlan,
    workoutTimes,
    setWorkoutTimes,
    strengthLogs,
    setStrengthLogs,
    cardioLogs,
    setCardioLogs,
    sessions,
    setSessions,
    routes,
    setRoutes,
    toast,
    setToast,
    isLoading,
    setIsLoading,
    loadError,
    setLoadError,
    isRefreshing,
    setIsRefreshing,
    strengthInputs,
    setStrengthInputs,
    cardioInputs,
    setCardioInputs,
    justLogged,
    setJustLogged,
    expandedLogId,
    setExpandedLogId,
    expandedWorkouts,
    setExpandedWorkouts,
    dismissedStray,
    setDismissedStray,
    resumedStray,
    setResumedStray,
    builder,
    setBuilder,
    builderOpen,
    setBuilderOpen,
    editingTemplateId,
    setEditingTemplateId,
    cardioSheetOpen,
    setCardioSheetOpen,
    cardioForm,
    setCardioForm,
    plannerOpen,
    setPlannerOpen,
    todayISO,
    todayName,
    plannedNames,
    plannedTemplates,
    inputKey,
    showToast,
    flash,
    saveToStorage,
    loadAll,
    refreshFromRemote,
    updateStrengthLogs,
    updateCardioLogs,
    updateTemplates,
    updatePlan,
    updateWorkoutTimes,
    updateSessions,
    updateRoutes,
    getWorkoutEntry,
    getWorkoutTime,
    getWorkoutDuration,
    setWorkoutTime,
    setWorkoutDuration,
    straySessions,
    patchSession,
    addSet,
    removeSetFromSession,
    lockExercise,
    unlockExercise,
    completeWorkout,
    discardSession,
    updateLogSet,
    deleteLogSet,
    logCardioFromPlan,
    selectedRoute,
    logQuickCardio,
    saveRoute,
    deleteRoute,
    addDraftExercise,
    addBulkExercises,
    startEditTemplate,
    closeBuilder,
    saveTemplate,
    cycleTemplateExerciseType,
    deleteTemplate,
    addWorkoutToDay,
    removeWorkoutFromDay,
    totalVolume,
    totalCardioMin,
    activeDates,
    currentStreak,
    allTimeBests,
  };
}
