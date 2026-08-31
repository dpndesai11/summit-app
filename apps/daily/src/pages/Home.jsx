import { useState, useEffect, useRef } from 'react';
import {
  Dumbbell, Coffee, Apple, Sandwich, Cookie, CookingPot,
  CheckSquare, Check, ChevronDown, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, Circle, CircleCheck, CalendarRange, Bell, X,
  Repeat, Plus, Pencil, Trash2
} from 'lucide-react';
import { dbGet, dbSet, dbRefresh } from '../lib/db';
import { toISODate, startOfWeek, addDays, getTodayFocusTasks } from '../lib/taskUtils';
import TaskDetailModal from '../components/TaskDetailModal';
import WeeklyReview from '../components/WeeklyReview';
import CollapsibleCard from '../components/CollapsibleCard';

// ---------------------------------------------------------------------------
// Summit Daily — Home: the app's opening page. A "Day" view (hour-by-hour
// timeline of today's workouts/meals, merged with the old Today Focus page's
// task-picking) and a "Week" view (the recurring weekly workout/meal plan at
// a glance, real task load on the next 7 calendar dates, and the weekly
// review ritual).
//
// Task data (tasks/projects/dailySelections/weeklyReviewLog) is owned by the
// top-level App and passed down as props — Home is where Tasks' old Today
// Focus page and Daily's old Dashboard page merged into one. Workout/meal
// data is still self-loaded here, read-only, same as before: this file
// duplicates the small bits of shape/default logic it needs rather than
// importing from WorkoutsSection/MealsSection, matching this codebase's
// existing "separate copies of the same pattern" convention.
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  workoutTemplates: 'summit_workout_templates',
  weeklyWorkoutPlan: 'summit_weekly_workout_plan',
  workoutTimes: 'summit_workout_times',
  recipes: 'summit_recipes',
  weeklyMealPlan: 'summit_weekly_meal_plan',
  mealTimes: 'summit_meal_times',
  taskTimes: 'summit_task_times',
  recurringBlocks: 'summit_recurring_blocks',
};

// Recurring background blocks — user-defined repeating commitments (work
// hours, uni hours, commute) that aren't tasks/workouts/meals but still
// belong on the calendar as a lighter-colour band behind everything else.
// A small fixed palette (not free-form colour data) so the exact Tailwind
// classes exist in this file for the build to pick up — same convention as
// TYPE_META/SLOT_META elsewhere in this codebase.
const BLOCK_COLOR_PRESETS = {
  slate: { label: 'Slate', band: 'bg-slate-400/20 dark:bg-slate-300/10 border-slate-400/40', text: 'text-slate-700 dark:text-slate-300', chip: 'bg-slate-100 dark:bg-slate-400/10 text-slate-700 dark:text-slate-300' },
  blue: { label: 'Blue', band: 'bg-blue-400/20 dark:bg-blue-300/10 border-blue-400/40', text: 'text-blue-700 dark:text-blue-300', chip: 'bg-blue-100 dark:bg-blue-400/10 text-blue-700 dark:text-blue-300' },
  amber: { label: 'Amber', band: 'bg-amber-400/20 dark:bg-amber-300/10 border-amber-400/40', text: 'text-amber-700 dark:text-amber-300', chip: 'bg-amber-100 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300' },
  rose: { label: 'Rose', band: 'bg-rose-400/20 dark:bg-rose-300/10 border-rose-400/40', text: 'text-rose-700 dark:text-rose-300', chip: 'bg-rose-100 dark:bg-rose-400/10 text-rose-700 dark:text-rose-300' },
  teal: { label: 'Teal', band: 'bg-teal-400/20 dark:bg-teal-300/10 border-teal-400/40', text: 'text-teal-700 dark:text-teal-300', chip: 'bg-teal-100 dark:bg-teal-400/10 text-teal-700 dark:text-teal-300' },
};
const BLOCK_COLORS = Object.keys(BLOCK_COLOR_PRESETS);
const DEFAULT_RECURRING_BLOCK = { name: '', color: 'slate', days: [], time: '09:00', duration: 60 };

const DEFAULT_WORKOUT_TIME = '07:00';
const DEFAULT_WORKOUT_DURATION = 60;
const SLOT_DEFAULT_TIMES = { breakfast: '08:00', snack1: '11:00', lunch: '13:00', snack2: '16:00', dinner: '19:00' };
const SLOT_DEFAULT_DURATIONS = { breakfast: 20, snack1: 10, lunch: 30, snack2: 10, dinner: 45 };
// A newly-scheduled task lands here until dragged elsewhere — no smarter
// slot-finding, since you can just drag it once it's on the timeline.
const DEFAULT_TASK_TIME = '09:00';
const DEFAULT_TASK_DURATION = 30;

const normalizeTimeEntry = (v, defaultTime, defaultDuration) => {
  if (v && typeof v === 'object') return { time: v.time || defaultTime, duration: Number(v.duration) > 0 ? Number(v.duration) : defaultDuration };
  if (typeof v === 'string' && v) return { time: v, duration: defaultDuration };
  return { time: defaultTime, duration: defaultDuration };
};
const SLOT_META = {
  breakfast: { label: 'Breakfast', icon: Coffee },
  snack1: { label: 'Snack 1', icon: Apple },
  lunch: { label: 'Lunch', icon: Sandwich },
  snack2: { label: 'Snack 2', icon: Cookie },
  dinner: { label: 'Dinner', icon: CookingPot },
};
const SLOTS = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const dayList = (v) => {
  if (Array.isArray(v)) return v.filter(n => typeof n === 'string' && n && n !== 'Rest Day');
  if (typeof v === 'string' && v && v !== 'Rest Day' && v !== 'None') return [v];
  return [];
};
const slotList = (v) => {
  if (Array.isArray(v)) return v.filter(n => typeof n === 'string' && n.trim());
  if (typeof v === 'string' && v.trim()) return [v];
  return [];
};

const TIMELINE_START_MIN = 6 * 60;
const TIMELINE_END_MIN = 22 * 60;
const TIMELINE_HOURS = Array.from({ length: (TIMELINE_END_MIN - TIMELINE_START_MIN) / 60 + 1 }, (_, i) => TIMELINE_START_MIN / 60 + i);
const HOUR_HEIGHT = 56; // px

const timeToMinutes = (hhmm) => {
  const [h, m] = (hhmm || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const formatHour = (h) => {
  const period = h < 12 || h === 24 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${period}`;
};
const formatTime = (hhmm) => {
  const mins = timeToMinutes(hhmm);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${String(m).padStart(2, '0')} ${period}`;
};
const minutesToTime = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
const formatDuration = (mins) => {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

const DRAG_THRESHOLD_PX = 6;
const SNAP_MINUTES = 5;
const MIN_DURATION = 10;
const snapMinutes = (mins) => Math.round(mins / SNAP_MINUTES) * SNAP_MINUTES;
const MIN_BLOCK_HEIGHT = 32;

export default function Home({
  tasks,
  projects,
  overdueTasks,
  dailySelections,
  weeklyReviewLog,
  formatToSwissDate,
  handleToggleSubtask,
  handleUpdateTaskStatus,
  handleUpdateTask,
  handleDeleteTask,
  handleToggleDailySelection,
  handleCompleteWeeklyReview,
  navigateTo,
}) {
  const [view, setView] = useState('day'); // 'day' | 'week'
  // Day view defaults to today but can navigate to any day — prev/next
  // arrows here, or tapping a row in Week view. The recurring workout/meal
  // plan is keyed by weekday name, not a specific date, so "viewing Tuesday"
  // always shows Tuesday's recurring plan regardless of which calendar week
  // you're actually in; task due/target dates are real dates though, so
  // those are looked up against the actual selected date.
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [templates, setTemplates] = useState([]);
  const [workoutPlan, setWorkoutPlan] = useState({});
  const [workoutTimes, setWorkoutTimes] = useState({});
  const [recipes, setRecipes] = useState([]);
  const [mealPlan, setMealPlan] = useState({});
  const [mealTimes, setMealTimes] = useState({});
  // Which picked tasks have been placed on the timeline, and when —
  // {[isoDate]: {[taskId]: {time, duration}}}. Keyed by real date (not
  // weekday) since tasks are one-off, not a recurring weekly plan.
  const [taskTimes, setTaskTimes] = useState({});
  const [recurringBlocks, setRecurringBlocks] = useState([]);
  const [blockBuilder, setBlockBuilder] = useState(DEFAULT_RECURRING_BLOCK);
  const [blockBuilderOpen, setBlockBuilderOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedBlock, setExpandedBlock] = useState(null);
  const [openTaskId, setOpenTaskId] = useState(null);
  const [drag, setDrag] = useState(null);
  const dragMovedRef = useRef(false);

  // --- Reminders ---------------------------------------------------------------
  // Local notifications only: this is a static site with no backend to send
  // real push, so these fire from a timer that only runs while this tab is
  // open (foreground or background), not when the browser/phone is fully
  // closed. Honest tradeoff, spelled out in the opt-in banner below.
  const [notifPermission, setNotifPermission] = useState(
    () => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  );
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const notifiedRef = useRef(new Set());

  const requestReminders = async () => {
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
    } catch {
      setNotifPermission('denied');
    }
  };

  const showToast = (msg, isError = false) => {
    setToast({ message: msg, isError });
    setTimeout(() => setToast(null), 2200);
  };

  const todayISO = toISODate(new Date());
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const selectedISO = toISODate(selectedDate);
  const selectedDayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
  const isViewingToday = selectedISO === todayISO;
  const selectedDateLabel = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const goToDay = (iso) => { setSelectedDate(new Date(`${iso}T00:00:00`)); setView('day'); };
  const shiftDay = (delta) => setSelectedDate(d => addDays(d, delta));

  const loadAll = async () => {
    const loadData = async (key, fallback) => {
      try {
        const val = await dbGet(key);
        return val ?? fallback;
      } catch {
        return fallback;
      }
    };
    const [wt, wwp, wtm, rc, wmp, mt, tt, rb] = await Promise.all([
      loadData(STORAGE_KEYS.workoutTemplates, []),
      loadData(STORAGE_KEYS.weeklyWorkoutPlan, {}),
      loadData(STORAGE_KEYS.workoutTimes, {}),
      loadData(STORAGE_KEYS.recipes, []),
      loadData(STORAGE_KEYS.weeklyMealPlan, {}),
      loadData(STORAGE_KEYS.mealTimes, {}),
      loadData(STORAGE_KEYS.taskTimes, {}),
      loadData(STORAGE_KEYS.recurringBlocks, []),
    ]);
    setTemplates(Array.isArray(wt) ? wt : []);
    setWorkoutPlan(wwp && typeof wwp === 'object' ? wwp : {});
    setWorkoutTimes(wtm && typeof wtm === 'object' ? wtm : {});
    setRecipes(Array.isArray(rc) ? rc : []);
    setMealPlan(wmp && typeof wmp === 'object' ? wmp : {});
    setMealTimes(mt && typeof mt === 'object' ? mt : {});
    setTaskTimes(tt && typeof tt === 'object' ? tt : {});
    setRecurringBlocks(Array.isArray(rb) ? rb : []);
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

  // --- Build a given day's blocks -----------------------------------------------
  // Factored out so the reminder checker below can build *today's* blocks for
  // notifications even while you're browsing a different day in the Day view.
  // `iso` is the real calendar date (for tasks, which aren't a recurring
  // weekly plan like workouts/meals are); `dayName` is its weekday name.
  const buildBlocksForDay = (dayName, iso) => {
    const workoutBlocks = dayList(workoutPlan[dayName])
      .map(name => templates.find(t => t.name === name))
      .filter(Boolean)
      .map(tpl => {
        const entry = normalizeTimeEntry(workoutTimes[dayName]?.[tpl.name], DEFAULT_WORKOUT_TIME, DEFAULT_WORKOUT_DURATION);
        return {
          kind: 'workout', key: `w::${tpl.name}`, title: tpl.name,
          time: entry.time, duration: entry.duration, exercises: tpl.exercises || [],
        };
      });

    // One block per SLOT, not per recipe — a slot only has one time/duration
    // in the data model (summit_meal_times is keyed by slot), so multiple
    // recipes in the same slot (a meal plus a side, several snacks) used to
    // render as separate blocks at the identical time and visually overlap.
    // Combining them into one block that lists every recipe in that slot
    // matches the data model and avoids the overlap entirely.
    const mealBlocks = SLOTS.flatMap(slot => {
      const names = slotList(mealPlan[dayName]?.[slot]);
      if (names.length === 0) return [];
      const entry = normalizeTimeEntry(mealTimes[dayName]?.[slot], SLOT_DEFAULT_TIMES[slot], SLOT_DEFAULT_DURATIONS[slot]);
      const slotRecipes = names.map(name => recipes.find(r => r.name === name)).filter(Boolean);
      return [{
        kind: 'meal', key: `m::${slot}`, title: names.join(' + '), slot,
        time: entry.time, duration: entry.duration, recipes: slotRecipes,
      }];
    });

    // Tasks placed on the timeline — opt-in per task (see "Add to timeline"
    // in the task list below), not automatic just from being picked, so the
    // timeline doesn't fill up with every due/overdue task by default.
    const dayTaskTimes = taskTimes[iso] || {};
    const taskBlocks = Object.keys(dayTaskTimes).map(taskId => {
      const task = tasks.find(t => String(t.id) === String(taskId));
      if (!task) return null;
      const entry = normalizeTimeEntry(dayTaskTimes[taskId], DEFAULT_TASK_TIME, DEFAULT_TASK_DURATION);
      return {
        kind: 'task', key: `t::${taskId}`, title: task.name, taskId,
        time: entry.time, duration: entry.duration, task,
      };
    }).filter(Boolean);

    return [...workoutBlocks, ...mealBlocks, ...taskBlocks].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  };

  const allBlocks = buildBlocksForDay(selectedDayName, selectedISO);

  // Checks every 30s (while this tab is open) for a workout/meal starting
  // within the next 5 minutes and fires a browser notification once per
  // block per day. Always checks the *actual* current day's blocks,
  // independent of whatever day is being viewed in the Day view above.
  useEffect(() => {
    if (notifPermission !== 'granted' || isLoading) return;
    const check = () => {
      const nowD = new Date();
      const realTodayName = nowD.toLocaleDateString('en-US', { weekday: 'long' });
      const realTodayISO = toISODate(nowD);
      const nowM = nowD.getHours() * 60 + nowD.getMinutes();
      const blocks = realTodayISO === selectedISO ? allBlocks : buildBlocksForDay(realTodayName, realTodayISO);
      blocks.forEach(b => {
        const start = timeToMinutes(b.time);
        const delta = start - nowM;
        const notifKey = `${realTodayISO}::${b.key}`;
        if (delta >= 0 && delta <= 5 && !notifiedRef.current.has(notifKey)) {
          notifiedRef.current.add(notifKey);
          try {
            new Notification(delta === 0 ? `${b.title} — starting now` : `${b.title} in ${delta}m`, {
              body: `${formatTime(b.time)} · ${formatDuration(b.duration)}`,
              tag: notifKey,
            });
          } catch { /* Notification constructor can throw on some mobile browsers — best-effort */ }
        }
      });
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifPermission, isLoading, workoutPlan, workoutTimes, mealPlan, mealTimes, templates, recipes, taskTimes, tasks]);

  // --- Drag-to-reschedule + resize-to-set-duration -----------------------------
  const commitWorkoutEntry = (templateName, patch) => {
    const entry = normalizeTimeEntry(workoutTimes[selectedDayName]?.[templateName], DEFAULT_WORKOUT_TIME, DEFAULT_WORKOUT_DURATION);
    const next = { ...workoutTimes, [selectedDayName]: { ...workoutTimes[selectedDayName], [templateName]: { ...entry, ...patch } } };
    setWorkoutTimes(next);
    dbSetSafe(STORAGE_KEYS.workoutTimes, next);
  };
  const commitMealEntry = (slot, patch) => {
    const entry = normalizeTimeEntry(mealTimes[selectedDayName]?.[slot], SLOT_DEFAULT_TIMES[slot], SLOT_DEFAULT_DURATIONS[slot]);
    const next = { ...mealTimes, [selectedDayName]: { ...mealTimes[selectedDayName], [slot]: { ...entry, ...patch } } };
    setMealTimes(next);
    dbSetSafe(STORAGE_KEYS.mealTimes, next);
  };
  const dbSetSafe = (key, value) => {
    dbSet(key, value).catch(() => showToast('Save failed — change may not persist.', true));
  };

  // Tasks are opt-in onto the timeline (see the "Add to timeline" button in
  // the task list) rather than automatic just from being picked/due, keyed
  // by the real selected date since tasks aren't a recurring weekly plan.
  const commitTaskEntry = (taskId, patch) => {
    const entry = normalizeTimeEntry(taskTimes[selectedISO]?.[taskId], DEFAULT_TASK_TIME, DEFAULT_TASK_DURATION);
    const next = { ...taskTimes, [selectedISO]: { ...taskTimes[selectedISO], [taskId]: { ...entry, ...patch } } };
    setTaskTimes(next);
    dbSetSafe(STORAGE_KEYS.taskTimes, next);
  };
  const removeTaskFromTimeline = (taskId) => {
    const dayEntries = { ...(taskTimes[selectedISO] || {}) };
    delete dayEntries[String(taskId)];
    delete dayEntries[taskId];
    const next = { ...taskTimes, [selectedISO]: dayEntries };
    setTaskTimes(next);
    dbSetSafe(STORAGE_KEYS.taskTimes, next);
  };
  const isTaskScheduled = (taskId) => Object.prototype.hasOwnProperty.call(taskTimes[selectedISO] || {}, String(taskId))
    || Object.prototype.hasOwnProperty.call(taskTimes[selectedISO] || {}, taskId);

  // --- Recurring background blocks (work/uni hours, commute, ...) --------------
  // Not tasks or a weekly workout/meal plan — just a repeating time range that
  // should show as a lighter-colour band on whichever days it applies to.
  const saveRecurringBlocks = (next) => {
    setRecurringBlocks(next);
    dbSetSafe(STORAGE_KEYS.recurringBlocks, next);
  };
  const toggleBuilderDay = (day) => setBlockBuilder(p => ({
    ...p, days: p.days.includes(day) ? p.days.filter(d => d !== day) : [...p.days, day]
  }));
  const startEditBlock = (b) => {
    setBlockBuilder({ name: b.name, color: b.color, days: b.days, time: b.time, duration: b.duration });
    setEditingBlockId(b.id);
    setBlockBuilderOpen(true);
  };
  const closeBlockBuilder = () => {
    setBlockBuilder(DEFAULT_RECURRING_BLOCK);
    setEditingBlockId(null);
    setBlockBuilderOpen(false);
  };
  const saveBlock = () => {
    if (!blockBuilder.name.trim() || blockBuilder.days.length === 0) return;
    const clean = { ...blockBuilder, name: blockBuilder.name.trim() };
    if (editingBlockId) {
      saveRecurringBlocks(recurringBlocks.map(b => (b.id === editingBlockId ? { ...b, ...clean } : b)));
      showToast('Block updated');
    } else {
      saveRecurringBlocks([...recurringBlocks, { id: Date.now(), ...clean }]);
      showToast('Block added');
    }
    closeBlockBuilder();
  };
  const deleteBlock = (id) => {
    saveRecurringBlocks(recurringBlocks.filter(b => b.id !== id));
    if (editingBlockId === id) closeBlockBuilder();
  };
  const dayRecurringBlocks = recurringBlocks.filter(b => b.days.includes(selectedDayName));

  const handleBlockPointerDown = (block, mode, e) => {
    if (e.button != null && e.button !== 0) return;
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* best-effort */ }
    dragMovedRef.current = false;
    setDrag({
      mode, key: block.key, kind: block.kind, templateName: block.title, slot: block.slot, taskId: block.taskId,
      pointerId: e.pointerId, startClientY: e.clientY,
      startMinutes: timeToMinutes(block.time), liveMinutes: timeToMinutes(block.time),
      startDuration: block.duration, liveDuration: block.duration,
    });
  };

  const handleBlockPointerMove = (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const deltaY = e.clientY - drag.startClientY;
    if (Math.abs(deltaY) > DRAG_THRESHOLD_PX) dragMovedRef.current = true;
    if (!dragMovedRef.current) return;
    e.preventDefault();
    const deltaMinutes = (deltaY / HOUR_HEIGHT) * 60;
    if (drag.mode === 'resize') {
      const raw = drag.startDuration + deltaMinutes;
      const maxDuration = TIMELINE_END_MIN - drag.startMinutes;
      const snapped = snapMinutes(Math.max(MIN_DURATION, Math.min(maxDuration, raw)));
      setDrag(d => (d && d.pointerId === e.pointerId ? { ...d, liveDuration: snapped } : d));
    } else {
      const raw = drag.startMinutes + deltaMinutes;
      const snapped = snapMinutes(Math.max(TIMELINE_START_MIN, Math.min(TIMELINE_END_MIN, raw)));
      setDrag(d => (d && d.pointerId === e.pointerId ? { ...d, liveMinutes: snapped } : d));
    }
  };

  const handleBlockPointerUp = (block, e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (dragMovedRef.current) {
      if (drag.mode === 'resize') {
        if (drag.kind === 'workout') commitWorkoutEntry(drag.templateName, { duration: drag.liveDuration });
        else if (drag.kind === 'meal') commitMealEntry(drag.slot, { duration: drag.liveDuration });
        else commitTaskEntry(drag.taskId, { duration: drag.liveDuration });
        showToast(`Set to ${formatDuration(drag.liveDuration)}`);
      } else {
        const finalTime = minutesToTime(drag.liveMinutes);
        if (drag.kind === 'workout') commitWorkoutEntry(drag.templateName, { time: finalTime });
        else if (drag.kind === 'meal') commitMealEntry(drag.slot, { time: finalTime });
        else commitTaskEntry(drag.taskId, { time: finalTime });
        showToast(`Moved to ${formatTime(finalTime)}`);
      }
    } else if (drag.mode === 'move') {
      setExpandedBlock(expandedBlock === block.key ? null : block.key);
    }
    setDrag(null);
  };

  // --- Today Focus (merged in from the old standalone page) ------------------
  // "Pick today's focus" and the due/overdue/picked union only make sense
  // for the actual current day — viewing another day instead shows a
  // simpler read-only list of whatever's due/targeted/picked on that date.
  const selectedToday = dailySelections[todayISO] || [];
  const overdueIds = new Set(overdueTasks.map(t => t.id));
  const focusTasks = getTodayFocusTasks(tasks, overdueTasks, selectedToday, todayISO);
  const openTasks = tasks.filter(t => !t.isCompleted);
  const openTask = tasks.find(t => t.id === openTaskId) || null;

  const otherDaySelections = dailySelections[selectedISO] || [];
  const otherDayTasks = isViewingToday ? [] : tasks.filter(t =>
    t.dueDate === selectedISO || t.targetDate === selectedISO || otherDaySelections.includes(t.id)
  );
  const dayListTasks = isViewingToday ? focusTasks : otherDayTasks;

  // --- Week view: the recurring weekly workout/meal plan at a glance, plus
  // real task load on the actual next 7 calendar dates (Monday-start, same
  // convention as the rest of the app). --------------------------------------
  const weekStart = startOfWeek(new Date());
  const weekDates = DAYS.map((day, i) => ({ day, iso: toISODate(addDays(weekStart, i)) }));
  const tasksOnDate = (iso) => tasks.filter(t => !t.isCompleted && (t.dueDate === iso || t.targetDate === iso)).length;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-6 w-32" />
        <div className="skeleton h-[480px] w-full" />
        <div className="skeleton h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="relative space-y-4">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] text-xs px-4 py-2.5 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap animate-toast-in ${
          toast.isError ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
        }`}>
          {toast.isError ? <AlertTriangle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
          {toast.message}
        </div>
      )}

      {notifPermission === 'default' && !bannerDismissed && (
        <div className="bg-violet-50 dark:bg-violet-500/10 border border-violet-100 rounded-2xl p-3 flex items-start gap-2.5">
          <Bell className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-violet-900">Get reminded when a workout or meal starts</p>
            <p className="text-[11px] text-violet-600/80 mt-0.5">
              Only fires while this tab is open (foreground or background) — not a real push notification when the app is fully closed.
            </p>
            <button onClick={requestReminders} className="mt-2 text-[11px] font-semibold text-white bg-violet-600 px-2.5 py-1 rounded-lg active:bg-violet-700">
              Enable reminders
            </button>
          </div>
          <button onClick={() => setBannerDismissed(true)} aria-label="Dismiss" className="text-violet-300 active:text-violet-500 flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex bg-gray-200/60 dark:bg-violet-400/10 rounded-lg p-0.5">
          {[['day', 'Day'], ['week', 'Week']].map(([id, label]) => (
            <button key={id} onClick={() => setView(id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${view === id ? 'bg-white dark:bg-[#211b34] text-violet-600 shadow-sm' : 'text-black dark:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button onClick={refresh} disabled={isRefreshing} aria-label="Refresh data" className="text-black dark:text-white active:text-black dark:text-white disabled:opacity-40">
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {view === 'day' ? (
        <>
          <div className="flex items-center justify-between -mt-1">
            <div className="flex items-center gap-1">
              <button onClick={() => shiftDay(-1)} aria-label="Previous day" className="text-black dark:text-white active:text-black dark:text-white p-1">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-black dark:text-white w-36 text-center">
                {isViewingToday ? 'Today' : selectedDateLabel}
              </span>
              <button onClick={() => shiftDay(1)} aria-label="Next day" className="text-black dark:text-white active:text-black dark:text-white p-1">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {!isViewingToday && (
              <button onClick={() => setSelectedDate(new Date())} className="text-[11px] font-medium text-violet-600 bg-violet-50 dark:bg-violet-500/10 px-2.5 py-1 rounded-lg active:bg-violet-100">
                Jump to today
              </button>
            )}
          </div>

          <div className="md:grid md:grid-cols-[2fr_1fr] md:gap-6 md:items-start space-y-4 md:space-y-0">
          <div className="space-y-4">
          <div>
            <span className="text-xs text-black dark:text-white">Drag a block to reschedule, its bottom edge to resize</span>
          </div>
          <div className="bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15 p-3">
            <div className="relative" style={{ height: TIMELINE_HOURS.length * HOUR_HEIGHT }}>
              {TIMELINE_HOURS.map((h, i) => (
                <div key={h} className="absolute left-0 right-0 flex items-start gap-2" style={{ top: i * HOUR_HEIGHT }}>
                  <span className="text-[10px] text-black dark:text-white w-10 flex-shrink-0 -mt-1.5 tabular-nums">{formatHour(h)}</span>
                  <div className="flex-1 border-t border-gray-100 dark:border-violet-400/15 mt-1" />
                </div>
              ))}

              {dayRecurringBlocks.map(b => {
                const preset = BLOCK_COLOR_PRESETS[b.color] || BLOCK_COLOR_PRESETS.slate;
                const start = timeToMinutes(b.time);
                const clampedStart = Math.max(TIMELINE_START_MIN, Math.min(TIMELINE_END_MIN, start));
                const clampedEnd = Math.max(TIMELINE_START_MIN, Math.min(TIMELINE_END_MIN, start + b.duration));
                const top = ((clampedStart - TIMELINE_START_MIN) / 60) * HOUR_HEIGHT;
                const height = Math.max(20, ((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT);
                return (
                  <div
                    key={b.id}
                    className={`absolute left-14 right-2 rounded-lg border pointer-events-none px-2 py-1 ${preset.band}`}
                    style={{ top, height }}
                  >
                    <span className={`text-[10px] font-medium ${preset.text}`}>{b.name}</span>
                  </div>
                );
              })}

              {isViewingToday && nowMinutes >= TIMELINE_START_MIN && nowMinutes <= TIMELINE_END_MIN && (
                <div
                  className="absolute left-10 right-0 flex items-center gap-1 z-10 pointer-events-none"
                  style={{ top: ((nowMinutes - TIMELINE_START_MIN) / 60) * HOUR_HEIGHT }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  <div className="flex-1 border-t border-red-400" />
                </div>
              )}

              {allBlocks.map(block => {
                const isMoving = drag && drag.key === block.key && drag.mode === 'move' && dragMovedRef.current;
                const isResizing = drag && drag.key === block.key && drag.mode === 'resize' && dragMovedRef.current;
                const isDragging = isMoving || isResizing;
                const displayMinutes = isMoving ? drag.liveMinutes : timeToMinutes(block.time);
                const displayDuration = isResizing ? drag.liveDuration : block.duration;
                const clamped = Math.max(TIMELINE_START_MIN, Math.min(TIMELINE_END_MIN, displayMinutes));
                const top = ((clamped - TIMELINE_START_MIN) / 60) * HOUR_HEIGHT;
                const height = Math.max(MIN_BLOCK_HEIGHT, (displayDuration / 60) * HOUR_HEIGHT);
                const isWorkout = block.kind === 'workout';
                const isTask = block.kind === 'task';
                const blockColor = isWorkout ? 'bg-orange-500' : isTask ? 'bg-violet-600' : 'bg-green-600';
                const expanded = expandedBlock === block.key;
                const showDurationLabel = height >= 44;
                return (
                  <div key={block.key} className={`absolute left-14 right-2 ${isDragging ? 'z-30' : 'z-20'}`} style={{ top: top + 2, touchAction: 'none' }}>
                    <button
                      onPointerDown={e => handleBlockPointerDown(block, 'move', e)}
                      onPointerMove={handleBlockPointerMove}
                      onPointerUp={e => handleBlockPointerUp(block, e)}
                      onPointerCancel={() => setDrag(null)}
                      style={{ height: height - 4 }}
                      className={`w-full text-left rounded-xl px-3 py-2 flex items-start gap-2 select-none transition-shadow overflow-hidden text-white ${blockColor} ${isDragging ? 'shadow-xl scale-[1.02]' : ''}`}
                    >
                      {isWorkout ? <Dumbbell className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> : isTask ? (
                        <CheckSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      ) : (() => {
                        const Icon = SLOT_META[block.slot]?.icon || CookingPot;
                        return <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />;
                      })()}
                      <span className="min-w-0 flex-1">
                        <span className="text-xs font-semibold truncate block">{block.title}</span>
                        {showDurationLabel && (
                          <span className="text-[10px] opacity-80 block">{formatTime(block.time)} · {formatDuration(displayDuration)}</span>
                        )}
                      </span>
                      {!showDurationLabel && (
                        <span className="text-[10px] opacity-80 tabular-nums flex-shrink-0">
                          {isMoving ? formatTime(minutesToTime(drag.liveMinutes)) : formatTime(block.time)}
                        </span>
                      )}
                      <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>

                    <div
                      onPointerDown={e => handleBlockPointerDown(block, 'resize', e)}
                      onPointerMove={handleBlockPointerMove}
                      onPointerUp={e => handleBlockPointerUp(block, e)}
                      onPointerCancel={() => setDrag(null)}
                      style={{ touchAction: 'none' }}
                      className="w-full h-2.5 -mt-1.5 flex items-center justify-center cursor-row-resize group"
                      aria-hidden="true"
                    >
                      <span className={`w-8 h-1 rounded-full transition-colors ${isResizing ? 'bg-gray-500' : 'bg-black/10 group-hover:bg-black/20'}`} />
                    </div>

                    {isResizing && <div className="text-[10px] text-black dark:text-white mt-0.5">{formatDuration(drag.liveDuration)}</div>}

                    {expanded && !isDragging && (
                      <div className={`mt-1 rounded-xl px-3 py-2 text-xs ${isWorkout ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-800' : isTask ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-800' : 'bg-green-50 dark:bg-green-500/10 text-green-800'}`}>
                        {isWorkout ? (
                          block.exercises.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {block.exercises.map((ex, i) => <span key={i} className="bg-white/70 dark:bg-violet-400/10 rounded-full px-2 py-0.5">{ex.name}</span>)}
                            </div>
                          ) : <span className="opacity-70">No exercises set.</span>
                        ) : isTask ? (
                          <div className="space-y-2">
                            {block.task.notes && <p className="opacity-80 whitespace-pre-line">{block.task.notes}</p>}
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateTaskStatus(block.taskId, (block.task.status === 'done' || block.task.isCompleted) ? 'todo' : 'done')}
                                className="text-[11px] font-semibold bg-white/70 dark:bg-violet-400/10 px-2 py-1 rounded-lg active:bg-white dark:bg-[#211b34]"
                              >
                                {(block.task.status === 'done' || block.task.isCompleted) ? 'Reopen' : 'Mark done'}
                              </button>
                              <button
                                onClick={() => { removeTaskFromTimeline(block.taskId); setExpandedBlock(null); }}
                                className="text-[11px] font-semibold bg-white/70 dark:bg-violet-400/10 px-2 py-1 rounded-lg active:bg-white dark:bg-[#211b34]"
                              >
                                Remove from timeline
                              </button>
                            </div>
                          </div>
                        ) : block.recipes && block.recipes.length > 0 ? (
                          <div className="space-y-2">
                            {block.recipes.map(recipe => (
                              <div key={recipe.id}>
                                {block.recipes.length > 1 && <div className="font-semibold mb-1">{recipe.name}</div>}
                                <div className="flex flex-wrap gap-1">
                                  {recipe.ingredients.map((ing, i) => (
                                    <span key={i} className="bg-white/70 dark:bg-violet-400/10 rounded-full px-2 py-0.5">{ing.name}{ing.quantity ? ` · ${ing.quantity}g` : ''}</span>
                                  ))}
                                </div>
                                {recipe.notes && <p className="opacity-80 whitespace-pre-line mt-1">{recipe.notes}</p>}
                              </div>
                            ))}
                          </div>
                        ) : <span className="opacity-70">Recipe not found.</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {allBlocks.length === 0 && (
            <p className="text-xs text-black dark:text-white text-center -mt-2">Nothing scheduled yet — add times to workouts and meals in their own tabs.</p>
          )}

          <CollapsibleCard
            title="Recurring blocks"
            icon={Repeat}
            iconColor="text-violet-600"
            badge={recurringBlocks.length > 0 ? `${recurringBlocks.length}` : null}
            actions={
              <button
                onClick={() => (blockBuilderOpen ? closeBlockBuilder() : setBlockBuilderOpen(true))}
                className="flex items-center gap-1 text-[11px] font-medium text-violet-600 bg-violet-50 dark:bg-violet-500/10 px-2.5 py-1 rounded-lg active:bg-violet-100"
              >
                {blockBuilderOpen ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                {blockBuilderOpen ? 'Cancel' : 'New'}
              </button>
            }
          >
            <p className="text-xs text-black dark:text-white mb-3">
              Repeating commitments that aren't tasks, workouts, or meals — work hours, uni hours, commute — shown as a lighter band on the days you pick.
            </p>

            {blockBuilderOpen && (
              <div className="bg-gray-50 dark:bg-violet-400/5 rounded-xl p-3 mb-3 space-y-2.5">
                <input
                  value={blockBuilder.name}
                  onChange={(e) => setBlockBuilder(p => ({ ...p, name: e.target.value }))}
                  placeholder="Name (e.g. Work hours, Commute)"
                  className="w-full bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 rounded-lg px-3 py-2 text-sm text-black dark:text-white outline-none focus:border-violet-500"
                />

                <div className="flex flex-wrap gap-1.5">
                  {BLOCK_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setBlockBuilder(p => ({ ...p, color: c }))}
                      className={`text-[10px] font-medium px-2.5 py-1 rounded-full border ${BLOCK_COLOR_PRESETS[c].chip} ${blockBuilder.color === c ? 'border-current' : 'border-transparent opacity-50'}`}
                    >
                      {BLOCK_COLOR_PRESETS[c].label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map(day => (
                    <button
                      key={day}
                      onClick={() => toggleBuilderDay(day)}
                      className={`text-[11px] font-medium w-11 h-7 rounded-full ${blockBuilder.days.includes(day) ? 'bg-violet-600 text-white' : 'bg-white dark:bg-[#211b34] text-black dark:text-white border border-gray-200 dark:border-violet-400/15'}`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] text-black dark:text-white mb-1">Start time</label>
                    <input
                      type="time"
                      value={blockBuilder.time}
                      onChange={(e) => setBlockBuilder(p => ({ ...p, time: e.target.value }))}
                      className="w-full bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 rounded-lg px-2 py-1.5 text-sm text-black dark:text-white outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] text-black dark:text-white mb-1">Duration (min)</label>
                    <input
                      type="number"
                      min={5}
                      step={5}
                      value={blockBuilder.duration}
                      onChange={(e) => setBlockBuilder(p => ({ ...p, duration: Math.max(5, Number(e.target.value) || 5) }))}
                      className="w-full bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 rounded-lg px-2 py-1.5 text-sm text-black dark:text-white outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <button
                  onClick={saveBlock}
                  disabled={!blockBuilder.name.trim() || blockBuilder.days.length === 0}
                  className="w-full h-10 bg-violet-600 text-white rounded-lg text-sm font-semibold disabled:opacity-40 active:bg-violet-700"
                >
                  {editingBlockId ? 'Save changes' : 'Add block'}
                </button>
              </div>
            )}

            {recurringBlocks.length === 0 ? (
              <p className="text-xs text-black dark:text-white text-center py-2">No recurring blocks yet — add one above.</p>
            ) : (
              <div className="space-y-2">
                {recurringBlocks.map(b => {
                  const preset = BLOCK_COLOR_PRESETS[b.color] || BLOCK_COLOR_PRESETS.slate;
                  return (
                    <div key={b.id} className="border border-gray-200 dark:border-violet-400/15 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${preset.chip}`}>{b.name}</span>
                        <span className="text-[10px] text-black dark:text-white ml-auto">{formatTime(b.time)} · {formatDuration(b.duration)}</span>
                        <button onClick={() => startEditBlock(b)} className="text-black dark:text-white active:text-violet-600 p-1" aria-label={`Edit ${b.name}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteBlock(b.id)} className="text-black dark:text-white active:text-red-500 p-1" aria-label={`Delete ${b.name}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {b.days.map(d => (
                          <span key={d} className="text-[9px] text-black dark:text-white bg-gray-100 dark:bg-violet-400/10 rounded px-1.5 py-0.5">{d.slice(0, 3)}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CollapsibleCard>
          </div>

          {/* Tasks for the selected day — due/overdue/picked for today, or a
              simpler due/targeted/picked list for any other day, tap to open
              the full task detail. */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckSquare className="w-4 h-4 text-violet-600" />
                <span className="font-semibold text-black dark:text-white text-sm">{isViewingToday ? 'Today' : selectedDateLabel}</span>
                <span className="text-[10px] text-black dark:text-white ml-auto">{dayListTasks.length}</span>
              </div>
              {dayListTasks.length === 0 ? (
                <div className="bg-white dark:bg-[#211b34] rounded-2xl border border-dashed border-gray-200 dark:border-violet-400/15 p-4 text-center">
                  <p className="text-xs text-black dark:text-white">
                    {isViewingToday ? 'Nothing due, overdue, or picked for today.' : 'Nothing due, targeted, or picked for this day.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {dayListTasks.map(task => {
                    const done = task.status === 'done' || task.isCompleted;
                    const scheduled = isTaskScheduled(task.id);
                    return (
                      <div key={task.id} className="bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15 p-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateTaskStatus(task.id, done ? 'todo' : 'done')}
                            aria-label={done ? `Reopen ${task.name}` : `Mark ${task.name} done`}
                            className="text-black dark:text-white active:text-violet-600 flex-shrink-0"
                          >
                            {done ? <CircleCheck className="w-5 h-5 text-violet-600" /> : <Circle className="w-5 h-5" />}
                          </button>
                          <button onClick={() => setOpenTaskId(task.id)} className="flex-1 min-w-0 text-left">
                            <span className={`text-sm truncate block ${done ? 'line-through text-black dark:text-white' : 'text-black dark:text-white font-medium'}`}>{task.name}</span>
                          </button>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {overdueIds.has(task.id) && <span className="text-[9px] font-medium text-red-600 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded">Overdue</span>}
                            {task.dueDate === selectedISO && !overdueIds.has(task.id) && <span className="text-[9px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded">Due</span>}
                            {(isViewingToday ? selectedToday : otherDaySelections).includes(task.id) && <span className="text-[9px] font-medium text-violet-600 bg-violet-50 dark:bg-violet-500/10 px-1.5 py-0.5 rounded">Picked</span>}
                          </div>
                        </div>
                        <div className="pl-7 mt-1.5">
                          {scheduled ? (
                            <button
                              onClick={() => removeTaskFromTimeline(task.id)}
                              className="flex items-center gap-1 text-[10px] font-medium text-violet-600 bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 rounded-full active:bg-violet-100"
                            >
                              <CalendarRange className="w-2.5 h-2.5" /> On timeline · remove
                            </button>
                          ) : (
                            <button
                              onClick={() => commitTaskEntry(task.id, {})}
                              className="flex items-center gap-1 text-[10px] font-medium text-black dark:text-white bg-gray-100 dark:bg-violet-400/10 px-2 py-0.5 rounded-full active:bg-gray-200 dark:bg-violet-400/10"
                            >
                              <CalendarRange className="w-2.5 h-2.5" /> Add to timeline
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {isViewingToday && (
              <CollapsibleCard title="Pick today's focus" badge={openTasks.length ? `${openTasks.length}` : null}>
                <p className="text-xs text-black dark:text-white mb-3">Deliberately choose what you're targeting today — separate from what's simply due.</p>
                {openTasks.length === 0 ? (
                  <p className="text-sm text-black dark:text-white">No open tasks.</p>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {openTasks.map(task => (
                      <label key={task.id} className="flex items-center gap-2 bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 rounded-lg p-2 cursor-pointer">
                        <input type="checkbox" checked={selectedToday.includes(task.id)} onChange={() => handleToggleDailySelection(task.id)} />
                        <span onClick={(e) => { e.preventDefault(); setOpenTaskId(task.id); }} className="text-xs text-black dark:text-white truncate flex-1">
                          {task.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </CollapsibleCard>
            )}
          </div>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarRange className="w-4 h-4 text-violet-600" />
              <span className="font-semibold text-black dark:text-white text-sm">This week's plan</span>
            </div>
            <p className="text-[11px] text-black dark:text-white mb-2">Tap a day to see (and drag-schedule) its timeline</p>
            <div className="space-y-1.5">
              {weekDates.map(({ day, iso }) => {
                const workoutNames = dayList(workoutPlan[day]);
                const mealCount = SLOTS.reduce((a, s) => a + slotList(mealPlan[day]?.[s]).length, 0);
                const taskCount = tasksOnDate(iso);
                const isToday = iso === todayISO;
                return (
                  <button
                    key={day}
                    onClick={() => goToDay(iso)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-gray-50 dark:bg-violet-400/5 ${isToday ? 'bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-50 dark:bg-violet-500/10' : ''}`}
                  >
                    <span className={`text-xs w-24 flex-shrink-0 ${isToday ? 'font-bold text-violet-600' : 'text-black dark:text-white'}`}>
                      {day.slice(0, 3)}{isToday ? ' •' : ''} <span className="text-black dark:text-white">{iso.slice(5)}</span>
                    </span>
                    <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5">
                      {workoutNames.length === 0 && mealCount === 0 && taskCount === 0 && (
                        <span className="text-[11px] text-black dark:text-white">Nothing planned</span>
                      )}
                      {workoutNames.map(name => (
                        <span key={name} className="text-[10px] bg-orange-100 text-orange-700 rounded-full px-2 py-0.5">{name}</span>
                      ))}
                      {mealCount > 0 && (
                        <span className="text-[10px] bg-green-100 text-green-700 rounded-full px-2 py-0.5">{mealCount} meal{mealCount === 1 ? '' : 's'}</span>
                      )}
                      {taskCount > 0 && (
                        <span className="text-[10px] bg-violet-100 text-violet-700 rounded-full px-2 py-0.5">{taskCount} task{taskCount === 1 ? '' : 's'}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <WeeklyReview
            tasks={tasks}
            weeklyReviewLog={weeklyReviewLog}
            formatToSwissDate={formatToSwissDate}
            onCompleteReview={handleCompleteWeeklyReview}
          />
        </div>
      )}

      {openTask && (
        <TaskDetailModal
          task={openTask}
          projects={projects}
          isOverdue={overdueIds.has(openTask.id)}
          formatToSwissDate={formatToSwissDate}
          onClose={() => setOpenTaskId(null)}
          onToggleSubtask={handleToggleSubtask}
          onSetStatus={handleUpdateTaskStatus}
          onUpdateTask={handleUpdateTask}
          onDelete={handleDeleteTask}
          onNavigateToProject={(projectId) => navigateTo('Projects', { projectId })}
        />
      )}
    </div>
  );
}
