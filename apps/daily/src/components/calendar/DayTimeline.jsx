import { useRef, useState } from 'react';
import { Apple, CalendarDays, CheckSquare, ChevronDown, Coffee, CookingPot, Cookie, Dumbbell, Pencil, Sandwich } from 'lucide-react';
import {
  BLOCK_COLOR_PRESETS, EVENT_COLORS, formatDuration, formatHour, formatTime, minutesToTime, timeToMinutes,
} from '../../lib/calendar';

const SLOT_ICONS = { breakfast: Coffee, snack1: Apple, lunch: Sandwich, snack2: Cookie, dinner: CookingPot };

const TIMELINE_START_MIN = 6 * 60;
const TIMELINE_END_MIN = 22 * 60;
const TIMELINE_HOURS = Array.from({ length: (TIMELINE_END_MIN - TIMELINE_START_MIN) / 60 + 1 }, (_, i) => TIMELINE_START_MIN / 60 + i);
const HOUR_HEIGHT = 56; // px

const DRAG_THRESHOLD_PX = 6;
const SNAP_MINUTES = 5;
const MIN_DURATION = 10;
const MIN_BLOCK_HEIGHT = 32;
const snapMinutes = (mins) => Math.round(mins / SNAP_MINUTES) * SNAP_MINUTES;

// One day as an hour grid (6am–10pm). Workouts, meals, scheduled tasks and the
// user's events are blocks you can tap to expand, drag to a new time, or resize
// by their bottom edge; recurring blocks (work hours...) sit behind as bands;
// all-day events sit in a strip above. Tapping an empty stretch of the grid asks
// the parent to create an event at that time (snapped to 15 minutes).
//
// Dragging a workout or meal changes its time for *every* such weekday (they're
// a recurring weekly plan) — that is the existing behaviour, kept here.
export default function DayTimeline({
  items, allDayItems, recurring, isToday, nowMinutes,
  onMoveBlock, onResizeBlock, onCreateAt, onEditEvent, onToggleTaskDone, onRemoveTaskFromTimeline, showToast,
}) {
  const [expandedBlock, setExpandedBlock] = useState(null);
  const [drag, setDrag] = useState(null);
  const dragMovedRef = useRef(false);

  const handleBlockPointerDown = (block, mode, e) => {
    if (e.button != null && e.button !== 0) return;
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* best-effort */ }
    dragMovedRef.current = false;
    setDrag({
      mode, key: block.key, block,
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
        onResizeBlock(drag.block, drag.liveDuration);
        showToast(`Set to ${formatDuration(drag.liveDuration)}`);
      } else {
        const finalTime = minutesToTime(drag.liveMinutes);
        onMoveBlock(drag.block, finalTime);
        showToast(`Moved to ${formatTime(finalTime)}`);
      }
    } else if (drag.mode === 'move') {
      setExpandedBlock(expandedBlock === block.key ? null : block.key);
    }
    setDrag(null);
  };

  // A tap on bare grid (not on a block or its resize handle) starts a new event at that time.
  const handleGridClick = (e) => {
    if (e.target.closest('button, [data-block]')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const minutes = TIMELINE_START_MIN + ((e.clientY - rect.top) / HOUR_HEIGHT) * 60;
    const snapped = Math.max(TIMELINE_START_MIN, Math.min(TIMELINE_END_MIN - 15, Math.floor(minutes / 15) * 15));
    onCreateAt(minutesToTime(snapped));
  };

  return (
    <div className="space-y-3">
      {allDayItems.length > 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-violet-400/15 bg-white dark:bg-[#211b34] p-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-black dark:text-white px-1">All day</span>
          {allDayItems.map(item => (
            <button
              key={item.key}
              onClick={() => onEditEvent(item.event)}
              className={`min-h-[36px] px-3 rounded-full text-sm font-semibold truncate max-w-full ${EVENT_COLORS[item.event.color].fill}`}
            >
              {item.title}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-black dark:text-white">Tap an empty slot to add an event. Drag a block to reschedule, its bottom edge to resize.</p>

      <div className="bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15 p-3">
        <div className="relative" style={{ height: TIMELINE_HOURS.length * HOUR_HEIGHT }} onClick={handleGridClick}>
          {TIMELINE_HOURS.map((h, i) => (
            <div key={h} className="absolute left-0 right-0 flex items-start gap-2" style={{ top: i * HOUR_HEIGHT }}>
              <span className="text-[11px] text-black dark:text-white w-10 flex-shrink-0 -mt-1.5 tabular-nums">{formatHour(h)}</span>
              <div className="flex-1 border-t border-gray-100 dark:border-violet-400/15 mt-1" />
            </div>
          ))}

          {recurring.map(({ block, entry }) => {
            const preset = BLOCK_COLOR_PRESETS[block.color] || BLOCK_COLOR_PRESETS.slate;
            const start = timeToMinutes(entry.time);
            const clampedStart = Math.max(TIMELINE_START_MIN, Math.min(TIMELINE_END_MIN, start));
            const clampedEnd = Math.max(TIMELINE_START_MIN, Math.min(TIMELINE_END_MIN, start + entry.duration));
            const top = ((clampedStart - TIMELINE_START_MIN) / 60) * HOUR_HEIGHT;
            const height = Math.max(20, ((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT);
            // Repeat the label every ~2h down a long band, as a small pill, so a
            // block sitting on its first stretch can't hide the name for the day.
            const REPEAT_PX = HOUR_HEIGHT * 2;
            const repeatCount = Math.max(1, Math.floor((height - 1) / REPEAT_PX) + 1);
            return (
              <div
                key={block.id}
                className={`absolute left-14 right-2 rounded-lg border pointer-events-none overflow-hidden ${preset.band}`}
                style={{ top, height }}
              >
                {Array.from({ length: repeatCount }).map((_, i) => (
                  <span
                    key={i}
                    className={`absolute left-2 px-1.5 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${preset.chip}`}
                    style={{ top: i * REPEAT_PX + 4 }}
                  >
                    {block.name}
                  </span>
                ))}
              </div>
            );
          })}

          {isToday && nowMinutes >= TIMELINE_START_MIN && nowMinutes <= TIMELINE_END_MIN && (
            <div
              className="absolute left-10 right-0 flex items-center gap-1 z-10 pointer-events-none"
              style={{ top: ((nowMinutes - TIMELINE_START_MIN) / 60) * HOUR_HEIGHT }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-danger flex-shrink-0" />
              <div className="flex-1 border-t border-danger" />
            </div>
          )}

          {items.map(block => {
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
            const isEvent = block.kind === 'event';
            // Each kind has its own fill. The primary fills (task, purple event) flip
            // to a light tint in dark mode, so their text flips dark with them.
            const fill = isEvent ? EVENT_COLORS[block.event.color].fill
              : isWorkout ? 'bg-orange-500 text-white'
              : isTask ? 'bg-primary text-on-primary'
              : 'bg-green-600 text-white';
            const Icon = isEvent ? CalendarDays : isWorkout ? Dumbbell : isTask ? CheckSquare : (SLOT_ICONS[block.slot] || CookingPot);
            const expanded = expandedBlock === block.key;
            const showDurationLabel = height >= 44;
            return (
              <div key={block.key} data-block className={`absolute left-14 right-2 ${isDragging ? 'z-30' : 'z-20'}`} style={{ top: top + 2, touchAction: 'none' }}>
                <button
                  onPointerDown={e => handleBlockPointerDown(block, 'move', e)}
                  onPointerMove={handleBlockPointerMove}
                  onPointerUp={e => handleBlockPointerUp(block, e)}
                  onPointerCancel={() => setDrag(null)}
                  style={{ height: height - 4 }}
                  className={`w-full text-left rounded-xl px-3 py-2 flex items-start gap-2 select-none transition-shadow overflow-hidden ${fill} ${isDragging ? 'shadow-xl scale-[1.02]' : ''}`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span className="min-w-0 flex-1">
                    <span className="text-xs font-semibold truncate block">{block.title}</span>
                    {showDurationLabel && (
                      <span className="text-[11px] opacity-80 block">{formatTime(block.time)} · {formatDuration(displayDuration)}</span>
                    )}
                  </span>
                  {!showDurationLabel && (
                    <span className="text-[11px] opacity-80 tabular-nums flex-shrink-0">
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

                {isResizing && <div className="text-[11px] text-black dark:text-white mt-0.5">{formatDuration(drag.liveDuration)}</div>}

                {expanded && !isDragging && (
                  <div className={`mt-1 rounded-xl px-3 py-2 text-xs ${isEvent ? 'bg-primary-soft text-primary' : isWorkout ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-800' : isTask ? 'bg-primary-soft text-primary' : 'bg-green-50 dark:bg-green-500/10 text-green-800'}`}>
                    {isEvent ? (
                      <div className="space-y-2">
                        {block.event.notes && <p className="whitespace-pre-line">{block.event.notes}</p>}
                        {block.event.repeat !== 'none' && <p className="font-medium">Repeats {block.event.repeat === 'daily' ? 'every day' : block.event.repeat === 'weekly' ? 'every week' : 'every month'}</p>}
                        <button
                          onClick={() => onEditEvent(block.event)}
                          className="flex items-center gap-1 text-[11px] font-semibold bg-white/70 dark:bg-violet-400/10 px-2.5 py-1.5 rounded-lg"
                        >
                          <Pencil className="w-3 h-3" /> Edit event
                        </button>
                      </div>
                    ) : isWorkout ? (
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
                            onClick={() => onToggleTaskDone(block.taskId, (block.task.status === 'done' || block.task.isCompleted) ? 'todo' : 'done')}
                            className="text-[11px] font-semibold bg-white/70 dark:bg-violet-400/10 px-2.5 py-1.5 rounded-lg"
                          >
                            {(block.task.status === 'done' || block.task.isCompleted) ? 'Reopen' : 'Mark done'}
                          </button>
                          <button
                            onClick={() => { onRemoveTaskFromTimeline(block.taskId); setExpandedBlock(null); }}
                            className="text-[11px] font-semibold bg-white/70 dark:bg-violet-400/10 px-2.5 py-1.5 rounded-lg"
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

      {items.length === 0 && allDayItems.length === 0 && (
        <p className="text-xs text-black dark:text-white text-center">Nothing scheduled — tap the grid to add an event, or set times for workouts and meals in the Fitness and Eat apps.</p>
      )}
    </div>
  );
}
