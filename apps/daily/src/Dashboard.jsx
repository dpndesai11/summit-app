import { useState, useEffect, useRef } from 'react';
import {
  Dumbbell, Activity, PersonStanding, Coffee, Apple, Sandwich, Cookie, CookingPot,
  CheckSquare, Check, ChevronDown, RefreshCw, AlertTriangle, X, Circle, CircleCheck
} from 'lucide-react';
import { dbGet, dbSet, dbRefresh } from './lib/db';

// ---------------------------------------------------------------------------
// Summit Daily — Dashboard: an hour-by-hour view of today, combining
// Workouts' and Meals' scheduled times with Tasks' picked-for-today list.
// Reads all three domains read-only (same summit-data.json, same storage
// keys those sections/apps use) except for a "mark done" quick action on a
// task, which writes back to summit_tasks — the one shared write here.
// Self-contained: duplicates the small bits of shape/default logic it needs
// rather than importing from WorkoutsSection/MealsSection, matching this
// codebase's existing "separate copies of the same pattern" convention.
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  workoutTemplates: 'summit_workout_templates',
  weeklyWorkoutPlan: 'summit_weekly_workout_plan',
  workoutTimes: 'summit_workout_times',
  recipes: 'summit_recipes',
  weeklyMealPlan: 'summit_weekly_meal_plan',
  mealTimes: 'summit_meal_times',
  tasks: 'summit_tasks',
  dailySelections: 'summit_daily_selections',
};

const DEFAULT_WORKOUT_TIME = '07:00';
const DEFAULT_WORKOUT_DURATION = 60;
const SLOT_DEFAULT_TIMES = { breakfast: '08:00', snack1: '11:00', lunch: '13:00', snack2: '16:00', dinner: '19:00' };
const SLOT_DEFAULT_DURATIONS = { breakfast: 20, snack1: 10, lunch: 30, snack2: 10, dinner: 45 };

// A workoutTimes/mealTimes entry may be the current shape ({time, duration})
// or the older plain-string shape (just a time) — normalize on read, same
// helper WorkoutsSection/MealsSection use on their own copies.
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

// A day's plan value may be a list (current shape) or a single string/legacy
// shape — same normalization WorkoutsSection uses for the weekly plan.
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

// Timeline window: 6am to 10pm, one row per hour.
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

// Drag-to-reschedule tuning: a block only counts as "dragged" (vs. tapped to
// expand) past this many px of movement, and its dropped time/duration snaps
// to the nearest 5 minutes rather than landing on an exact pixel.
const DRAG_THRESHOLD_PX = 6;
const SNAP_MINUTES = 5;
const MIN_DURATION = 10;
const snapMinutes = (mins) => Math.round(mins / SNAP_MINUTES) * SNAP_MINUTES;
// A block's rendered height comes from its duration, but never shrinks below
// this so short entries (a 10-minute snack) still have a tappable/draggable
// target.
const MIN_BLOCK_HEIGHT = 32;

export default function Dashboard() {
  const [templates, setTemplates] = useState([]);
  const [workoutPlan, setWorkoutPlan] = useState({});
  const [workoutTimes, setWorkoutTimes] = useState({});
  const [recipes, setRecipes] = useState([]);
  const [mealPlan, setMealPlan] = useState({});
  const [mealTimes, setMealTimes] = useState({});
  const [tasks, setTasks] = useState([]);
  const [dailySelections, setDailySelections] = useState({});
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedBlock, setExpandedBlock] = useState(null);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  // Drag-to-reschedule state for the timeline, calendar-app style: press and
  // drag a block, it follows the finger/pointer, release to commit the new
  // time. `drag` tracks the block being moved and its live (pre-commit)
  // minutes; dragMovedRef distinguishes an actual drag from a tap (which
  // should just toggle the block's expanded detail instead).
  const [drag, setDrag] = useState(null);
  const dragMovedRef = useRef(false);

  const showToast = (msg, isError = false) => {
    setToast({ message: msg, isError });
    setTimeout(() => setToast(null), 2200);
  };

  const todayISO = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const loadAll = async () => {
    const loadData = async (key, fallback) => {
      try {
        const val = await dbGet(key);
        return val ?? fallback;
      } catch {
        return fallback;
      }
    };
    const [wt, wwp, wtm, rc, wmp, mt, tk, ds] = await Promise.all([
      loadData(STORAGE_KEYS.workoutTemplates, []),
      loadData(STORAGE_KEYS.weeklyWorkoutPlan, {}),
      loadData(STORAGE_KEYS.workoutTimes, {}),
      loadData(STORAGE_KEYS.recipes, []),
      loadData(STORAGE_KEYS.weeklyMealPlan, {}),
      loadData(STORAGE_KEYS.mealTimes, {}),
      loadData(STORAGE_KEYS.tasks, []),
      loadData(STORAGE_KEYS.dailySelections, {}),
    ]);
    setTemplates(Array.isArray(wt) ? wt : []);
    setWorkoutPlan(wwp && typeof wwp === 'object' ? wwp : {});
    setWorkoutTimes(wtm && typeof wtm === 'object' ? wtm : {});
    setRecipes(Array.isArray(rc) ? rc : []);
    setMealPlan(wmp && typeof wmp === 'object' ? wmp : {});
    setMealTimes(mt && typeof mt === 'object' ? mt : {});
    setTasks(Array.isArray(tk) ? tk : []);
    setDailySelections(ds && typeof ds === 'object' ? ds : {});
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

  // --- Build today's blocks ---------------------------------------------------
  const todaysWorkoutNames = dayList(workoutPlan[todayName]);
  const workoutBlocks = todaysWorkoutNames
    .map(name => templates.find(t => t.name === name))
    .filter(Boolean)
    .map(tpl => {
      const entry = normalizeTimeEntry(workoutTimes[todayName]?.[tpl.name], DEFAULT_WORKOUT_TIME, DEFAULT_WORKOUT_DURATION);
      return {
        kind: 'workout',
        key: `w::${tpl.name}`,
        title: tpl.name,
        time: entry.time,
        duration: entry.duration,
        exercises: tpl.exercises || [],
      };
    });

  const mealBlocks = SLOTS.flatMap(slot => {
    const names = slotList(mealPlan[todayName]?.[slot]);
    const entry = normalizeTimeEntry(mealTimes[todayName]?.[slot], SLOT_DEFAULT_TIMES[slot], SLOT_DEFAULT_DURATIONS[slot]);
    return names.map(name => {
      const recipe = recipes.find(r => r.name === name);
      return {
        kind: 'meal',
        key: `m::${slot}::${name}`,
        title: name,
        slot,
        time: entry.time,
        duration: entry.duration,
        recipe,
      };
    });
  });

  const allBlocks = [...workoutBlocks, ...mealBlocks].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  // --- Today's tasks (untimed, from the Tasks app's own "Today Focus" pick) --
  const selectedTaskIds = dailySelections[todayISO] || [];
  const todaysTasks = selectedTaskIds
    .map(id => tasks.find(t => String(t.id) === String(id)))
    .filter(Boolean);

  const toggleTaskDone = (task) => {
    const nowDone = task.status !== 'done';
    const next = tasks.map(t => (
      String(t.id) === String(task.id)
        ? { ...t, status: nowDone ? 'done' : 'todo', isCompleted: nowDone, completedAt: nowDone ? new Date().toISOString() : null }
        : t
    ));
    setTasks(next);
    dbSet(STORAGE_KEYS.tasks, next).catch(() => showToast('Save failed — change may not persist.', true));
    showToast(nowDone ? 'Task marked done' : 'Task reopened');
  };

  // --- Drag-to-reschedule + resize-to-set-duration -----------------------------
  // Workout times are keyed by template name, meal times by slot (dragging or
  // resizing one recipe in a shared slot moves/resizes every recipe in that
  // slot — same as editing the time/duration in Workouts/Meals directly).
  const commitWorkoutEntry = (templateName, patch) => {
    const entry = normalizeTimeEntry(workoutTimes[todayName]?.[templateName], DEFAULT_WORKOUT_TIME, DEFAULT_WORKOUT_DURATION);
    const next = { ...workoutTimes, [todayName]: { ...workoutTimes[todayName], [templateName]: { ...entry, ...patch } } };
    setWorkoutTimes(next);
    dbSet(STORAGE_KEYS.workoutTimes, next).catch(() => showToast('Save failed — change may not persist.', true));
  };
  const commitMealEntry = (slot, patch) => {
    const entry = normalizeTimeEntry(mealTimes[todayName]?.[slot], SLOT_DEFAULT_TIMES[slot], SLOT_DEFAULT_DURATIONS[slot]);
    const next = { ...mealTimes, [todayName]: { ...mealTimes[todayName], [slot]: { ...entry, ...patch } } };
    setMealTimes(next);
    dbSet(STORAGE_KEYS.mealTimes, next).catch(() => showToast('Save failed — change may not persist.', true));
  };

  // `mode: 'move'` drags the whole block to a new start time; `mode: 'resize'`
  // drags just its bottom handle to change how long it lasts. Both share the
  // same tap-vs-drag threshold logic.
  const handleBlockPointerDown = (block, mode, e) => {
    if (e.button != null && e.button !== 0) return; // primary button/touch only
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* best-effort — move/resize still track via bubbled events */ }
    dragMovedRef.current = false;
    setDrag({
      mode,
      key: block.key,
      kind: block.kind,
      templateName: block.title,
      slot: block.slot,
      pointerId: e.pointerId,
      startClientY: e.clientY,
      startMinutes: timeToMinutes(block.time),
      liveMinutes: timeToMinutes(block.time),
      startDuration: block.duration,
      liveDuration: block.duration,
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
        else commitMealEntry(drag.slot, { duration: drag.liveDuration });
        showToast(`Set to ${formatDuration(drag.liveDuration)}`);
      } else {
        const finalTime = minutesToTime(drag.liveMinutes);
        if (drag.kind === 'workout') commitWorkoutEntry(drag.templateName, { time: finalTime });
        else commitMealEntry(drag.slot, { time: finalTime });
        showToast(`Moved to ${formatTime(finalTime)}`);
      }
    } else if (drag.mode === 'move') {
      setExpandedBlock(expandedBlock === block.key ? null : block.key);
    }
    setDrag(null);
  };

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

      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-gray-900 text-sm block">{todayName}'s timeline</span>
          <span className="text-[10px] text-gray-400">Drag a block to reschedule, its bottom edge to resize</span>
        </div>
        <button onClick={refresh} disabled={isRefreshing} aria-label="Refresh data" className="text-gray-400 active:text-gray-600 disabled:opacity-40">
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* On desktop the timeline and today's tasks sit side by side instead of
          stacked — the same content, just laid out to use the extra width. */}
      <div className="md:grid md:grid-cols-[2fr_1fr] md:gap-6 md:items-start space-y-4 md:space-y-0">
      <div className="space-y-4">
      {/* Hour-by-hour timeline */}
      <div className="bg-white rounded-2xl border border-gray-200 p-3">
        <div className="relative" style={{ height: TIMELINE_HOURS.length * HOUR_HEIGHT }}>
          {/* Hour gridlines + labels */}
          {TIMELINE_HOURS.map((h, i) => (
            <div key={h} className="absolute left-0 right-0 flex items-start gap-2" style={{ top: i * HOUR_HEIGHT }}>
              <span className="text-[10px] text-gray-300 w-10 flex-shrink-0 -mt-1.5 tabular-nums">{formatHour(h)}</span>
              <div className="flex-1 border-t border-gray-100 mt-1" />
            </div>
          ))}

          {/* Now indicator */}
          {nowMinutes >= TIMELINE_START_MIN && nowMinutes <= TIMELINE_END_MIN && (
            <div
              className="absolute left-10 right-0 flex items-center gap-1 z-10 pointer-events-none"
              style={{ top: ((nowMinutes - TIMELINE_START_MIN) / 60) * HOUR_HEIGHT }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              <div className="flex-1 border-t border-red-400" />
            </div>
          )}

          {/* Blocks — press and drag to reschedule, drag the bottom handle to
              resize its duration, tap to expand */}
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
            const expanded = expandedBlock === block.key;
            const showDurationLabel = height >= 44;
            return (
              <div
                key={block.key}
                className={`absolute left-14 right-2 ${isDragging ? 'z-30' : 'z-20'}`}
                style={{ top: top + 2, touchAction: 'none' }}
              >
                <button
                  onPointerDown={e => handleBlockPointerDown(block, 'move', e)}
                  onPointerMove={handleBlockPointerMove}
                  onPointerUp={e => handleBlockPointerUp(block, e)}
                  onPointerCancel={() => setDrag(null)}
                  style={{ height: height - 4 }}
                  className={`w-full text-left rounded-xl px-3 py-2 flex items-start gap-2 select-none transition-shadow overflow-hidden ${
                    isWorkout ? 'bg-orange-500 text-white' : 'bg-green-600 text-white'
                  } ${isDragging ? 'shadow-xl scale-[1.02]' : ''}`}
                >
                  {isWorkout ? <Dumbbell className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> : (() => {
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

                {/* Resize handle — drag to change duration, independent of the
                    move-drag above it */}
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

                {isResizing && (
                  <div className="text-[10px] text-gray-500 mt-0.5">{formatDuration(drag.liveDuration)}</div>
                )}

                {expanded && !isDragging && (
                  <div className={`mt-1 rounded-xl px-3 py-2 text-xs ${isWorkout ? 'bg-orange-50 text-orange-800' : 'bg-green-50 text-green-800'}`}>
                    {isWorkout ? (
                      block.exercises.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {block.exercises.map((ex, i) => (
                            <span key={i} className="bg-white/70 rounded-full px-2 py-0.5">{ex.name}</span>
                          ))}
                        </div>
                      ) : <span className="opacity-70">No exercises set.</span>
                    ) : block.recipe ? (
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {block.recipe.ingredients.map((ing, i) => (
                            <span key={i} className="bg-white/70 rounded-full px-2 py-0.5">
                              {ing.name}{ing.quantity ? ` · ${ing.quantity}g` : ''}
                            </span>
                          ))}
                        </div>
                        {block.recipe.notes && <p className="opacity-80 whitespace-pre-line">{block.recipe.notes}</p>}
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
        <p className="text-xs text-gray-400 text-center -mt-2">
          Nothing scheduled yet — add times to workouts and meals in their own tabs.
        </p>
      )}
      </div>

      {/* Today's tasks — untimed, picked in the Tasks app's Today Focus */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <CheckSquare className="w-4 h-4 text-indigo-600" />
          <span className="font-semibold text-gray-900 text-sm">Today's tasks</span>
          <span className="text-[10px] text-gray-400 ml-auto">{todaysTasks.length} picked</span>
        </div>
        {todaysTasks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-400">No tasks picked for today yet — pick some in the Tasks app's Today Focus.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {todaysTasks.map(task => {
              const done = task.status === 'done' || task.isCompleted;
              const expanded = expandedTaskId === task.id;
              const checklist = Array.isArray(task.checklist) ? task.checklist : [];
              const checklistDone = checklist.filter(c => c.isCompleted).length;
              return (
                <div key={task.id} className="bg-white rounded-2xl border border-gray-200 p-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleTaskDone(task)}
                      aria-label={done ? `Reopen ${task.name}` : `Mark ${task.name} done`}
                      className="text-gray-300 active:text-indigo-600 flex-shrink-0"
                    >
                      {done ? <CircleCheck className="w-5 h-5 text-indigo-600" /> : <Circle className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => setExpandedTaskId(expanded ? null : task.id)}
                      className="flex-1 min-w-0 flex items-center gap-2 text-left"
                    >
                      <span className={`text-sm truncate ${done ? 'line-through text-gray-400' : 'text-gray-900 font-medium'}`}>
                        {task.name}
                      </span>
                      {checklist.length > 0 && (
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{checklistDone}/{checklist.length}</span>
                      )}
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                      <div className="mt-2 pt-2 border-t border-gray-100 pl-7 space-y-1.5">
                        {task.notes && <p className="text-xs text-gray-500 whitespace-pre-line">{task.notes}</p>}
                        {checklist.length > 0 && (
                          <div className="space-y-1">
                            {checklist.map(item => (
                              <div key={item.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                                {item.isCompleted
                                  ? <CircleCheck className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                                  : <Circle className="w-3 h-3 text-gray-300 flex-shrink-0" />}
                                <span className={item.isCompleted ? 'line-through text-gray-400' : ''}>{item.text || item.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {!task.notes && checklist.length === 0 && (
                          <p className="text-xs text-gray-300">No notes or checklist.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
