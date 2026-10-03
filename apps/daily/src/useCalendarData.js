import { useEffect, useState } from 'react';
import { dbGet, dbSet, dbRefresh } from '@summit/core/db';
import {
  DEFAULT_TASK_DURATION, DEFAULT_TASK_TIME, DEFAULT_WORKOUT_DURATION, DEFAULT_WORKOUT_TIME,
  SLOT_DEFAULT_DURATIONS, SLOT_DEFAULT_TIMES, normalizeEvent, normalizeTimeEntry,
} from './lib/calendar';

// Everything the calendar reads and writes, in one place (same hook pattern as
// Fitness/Eat/Habits). Workout and meal data belongs to Fitness and Eat and is
// only *times* editable here (drag-to-reschedule), exactly as before; tasks come
// from the Planner's own state as props, so they are not loaded here. `events`
// is new: the user's own one-off and repeating calendar events.
const STORAGE_KEYS = {
  workoutTemplates: 'summit_workout_templates',
  weeklyWorkoutPlan: 'summit_weekly_workout_plan',
  workoutTimes: 'summit_workout_times',
  recipes: 'summit_recipes',
  weeklyMealPlan: 'summit_weekly_meal_plan',
  mealTimes: 'summit_meal_times',
  taskTimes: 'summit_task_times',
  recurringBlocks: 'summit_recurring_blocks',
  events: 'summit_events',
};

export default function useCalendarData() {
  const [templates, setTemplates] = useState([]);
  const [workoutPlan, setWorkoutPlan] = useState({});
  const [workoutTimes, setWorkoutTimes] = useState({});
  const [recipes, setRecipes] = useState([]);
  const [mealPlan, setMealPlan] = useState({});
  const [mealTimes, setMealTimes] = useState({});
  // {[isoDate]: {[taskId]: {time, duration}}} — which tasks sit on the timeline
  // and when; keyed by real date since tasks are one-off.
  const [taskTimes, setTaskTimes] = useState({});
  const [recurringBlocks, setRecurringBlocks] = useState([]);
  const [events, setEvents] = useState([]);
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const showToast = (msg, isError = false) => {
    setToast({ message: msg, isError });
    setTimeout(() => setToast(null), 2200);
  };
  const dbSetSafe = (key, value) => {
    dbSet(key, value).catch(() => showToast('Save failed — change may not persist.', true));
  };

  const loadAll = async () => {
    const loadData = async (key, fallback) => {
      try {
        const val = await dbGet(key);
        return val ?? fallback;
      } catch {
        return fallback;
      }
    };
    const [wt, wwp, wtm, rc, wmp, mt, tt, rb, ev] = await Promise.all([
      loadData(STORAGE_KEYS.workoutTemplates, []),
      loadData(STORAGE_KEYS.weeklyWorkoutPlan, {}),
      loadData(STORAGE_KEYS.workoutTimes, {}),
      loadData(STORAGE_KEYS.recipes, []),
      loadData(STORAGE_KEYS.weeklyMealPlan, {}),
      loadData(STORAGE_KEYS.mealTimes, {}),
      loadData(STORAGE_KEYS.taskTimes, {}),
      loadData(STORAGE_KEYS.recurringBlocks, []),
      loadData(STORAGE_KEYS.events, []),
    ]);
    setTemplates(Array.isArray(wt) ? wt : []);
    setWorkoutPlan(wwp && typeof wwp === 'object' ? wwp : {});
    setWorkoutTimes(wtm && typeof wtm === 'object' ? wtm : {});
    setRecipes(Array.isArray(rc) ? rc : []);
    setMealPlan(wmp && typeof wmp === 'object' ? wmp : {});
    setMealTimes(mt && typeof mt === 'object' ? mt : {});
    setTaskTimes(tt && typeof tt === 'object' ? tt : {});
    setRecurringBlocks(Array.isArray(rb) ? rb : []);
    // An entry without a date can never be shown; drop it rather than carry it.
    setEvents((Array.isArray(ev) ? ev : []).filter(e => e && e.date).map(normalizeEvent));
  };

  useEffect(() => {
    (async () => {
      try { await loadAll(); } finally { setIsLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await dbRefresh();
      await loadAll();
      showToast('Refreshed');
    } catch {
      showToast('Refresh failed', true);
    } finally {
      setIsRefreshing(false);
    }
  };

  // --- Drag-to-reschedule / resize writes. Workouts and meals are keyed by
  // weekday (a recurring weekly plan), tasks by the real date. ------------------
  const commitWorkoutEntry = (dayName, templateName, patch) => {
    const entry = normalizeTimeEntry(workoutTimes[dayName]?.[templateName], DEFAULT_WORKOUT_TIME, DEFAULT_WORKOUT_DURATION);
    const next = { ...workoutTimes, [dayName]: { ...workoutTimes[dayName], [templateName]: { ...entry, ...patch } } };
    setWorkoutTimes(next);
    dbSetSafe(STORAGE_KEYS.workoutTimes, next);
  };
  const commitMealEntry = (dayName, slot, patch) => {
    const entry = normalizeTimeEntry(mealTimes[dayName]?.[slot], SLOT_DEFAULT_TIMES[slot], SLOT_DEFAULT_DURATIONS[slot]);
    const next = { ...mealTimes, [dayName]: { ...mealTimes[dayName], [slot]: { ...entry, ...patch } } };
    setMealTimes(next);
    dbSetSafe(STORAGE_KEYS.mealTimes, next);
  };
  const commitTaskEntry = (iso, taskId, patch) => {
    const entry = normalizeTimeEntry(taskTimes[iso]?.[taskId], DEFAULT_TASK_TIME, DEFAULT_TASK_DURATION);
    const next = { ...taskTimes, [iso]: { ...taskTimes[iso], [taskId]: { ...entry, ...patch } } };
    setTaskTimes(next);
    dbSetSafe(STORAGE_KEYS.taskTimes, next);
  };
  const removeTaskFromTimeline = (iso, taskId) => {
    const dayEntries = { ...(taskTimes[iso] || {}) };
    delete dayEntries[String(taskId)];
    delete dayEntries[taskId];
    const next = { ...taskTimes, [iso]: dayEntries };
    setTaskTimes(next);
    dbSetSafe(STORAGE_KEYS.taskTimes, next);
  };
  const isTaskScheduled = (iso, taskId) => (
    Object.prototype.hasOwnProperty.call(taskTimes[iso] || {}, String(taskId))
    || Object.prototype.hasOwnProperty.call(taskTimes[iso] || {}, taskId)
  );

  // --- Recurring background blocks (work hours, commute, ...) ------------------
  const saveRecurringBlocks = (next) => {
    setRecurringBlocks(next);
    dbSetSafe(STORAGE_KEYS.recurringBlocks, next);
  };

  // --- The user's own events ---------------------------------------------------
  const saveEvents = (next) => {
    setEvents(next);
    dbSetSafe(STORAGE_KEYS.events, next);
  };
  const addEvent = (fields) => {
    const event = normalizeEvent({ ...fields, id: Date.now() });
    saveEvents([...events, event]);
    return event;
  };
  const updateEvent = (id, patch) => {
    saveEvents(events.map(e => (e.id === id ? normalizeEvent({ ...e, ...patch }) : e)));
  };
  const deleteEvent = (id) => {
    saveEvents(events.filter(e => e.id !== id));
  };

  return {
    templates, workoutPlan, workoutTimes, recipes, mealPlan, mealTimes, taskTimes, recurringBlocks, events,
    toast, isLoading, isRefreshing, showToast, refresh,
    commitWorkoutEntry, commitMealEntry, commitTaskEntry, removeTaskFromTimeline, isTaskScheduled,
    saveRecurringBlocks, addEvent, updateEvent, deleteEvent,
  };
}
