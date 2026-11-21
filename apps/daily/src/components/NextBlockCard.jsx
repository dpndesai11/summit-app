import { useEffect, useState } from 'react';
import { CalendarPlus, Clock } from 'lucide-react';
import { dbGet, dbSet } from '@summit/core/db';
import {
  NEXT_BLOCK_MINUTES, findScheduledBlock, pickNextBlock, scheduleBlock, toISODate,
} from '@summit/core/taskUtils';

const TIMES_KEY = 'summit_task_times';

const prettyDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const addMinutes = (hhmm, minutes) => {
  const [h, m] = hhmm.split(':').map(Number);
  const total = Math.min(24 * 60, h * 60 + m + minutes);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

// "Next block": one task, one fixed 2-hour block, and you choose the day. Picks the
// in-progress task touched longest ago, else the top-priority todo from Academic then
// Portfolio. It never schedules anything by itself, and a task only ever holds one block
// (adding another moves it). The block is written to summit_task_times, the same place
// the calendar's "Add to timeline" uses, so it shows up on the Summit home calendar.
export default function NextBlockCard({ tasks, projects, onOpenTask }) {
  const [times, setTimes] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;
    dbGet(TIMES_KEY).then(v => { if (alive) setTimes(v && typeof v === 'object' ? v : {}); }).catch(() => { if (alive) setTimes({}); });
    return () => { alive = false; };
  }, []);

  const pick = pickNextBlock(tasks, projects);
  const today = toISODate(new Date());

  if (!pick) {
    return (
      <div className="bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 rounded-xl p-4">
        <h3 className="text-base font-bold text-black dark:text-white">Next block</h3>
        <p className="text-sm text-black dark:text-white mt-1">
          Nothing queued. Add a task to Academic or Portfolio, or move one back to To Do.
        </p>
      </div>
    );
  }

  const { task, reason } = pick;
  const project = projects.find(p => p.id === task.properties?.projectId);
  const nextAction = task.properties?.nextAction;
  const existing = times ? findScheduledBlock(times, task.id, today) : null;

  const schedule = async () => {
    if (!date || saving) return;
    setSaving(true);
    setMessage('');
    try {
      const next = scheduleBlock(times || {}, task.id, date, time, NEXT_BLOCK_MINUTES);
      await dbSet(TIMES_KEY, next);
      setTimes(next);
      setMessage(`Block set for ${prettyDate(date)}, ${time}–${addMinutes(time, NEXT_BLOCK_MINUTES)}.`);
    } catch {
      setMessage('Could not save the block. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#211b34] border-2 border-primary rounded-xl p-4 space-y-3">
      <div>
        <h3 className="text-base font-bold text-black dark:text-white">Next block</h3>
        <p className="text-xs text-black dark:text-white">
          {reason === 'in_progress'
            ? 'In progress, and not touched for the longest.'
            : `Nothing in progress. Top priority in ${project ? project.name : 'your projects'}.`}
        </p>
      </div>

      <div>
        <button onClick={() => onOpenTask(task.id)} className="text-left text-base font-semibold text-black dark:text-white underline decoration-primary underline-offset-2">
          {task.name}
        </button>
        {project && <div className="text-xs font-medium text-black dark:text-white">{project.name}</div>}
      </div>

      <div className="rounded-lg bg-primary-soft px-3 py-2 text-sm text-black dark:text-white">
        <span className="font-bold">Next action: </span>
        {nextAction ? nextAction : (
          <button onClick={() => onOpenTask(task.id)} className="font-semibold underline">add one in the task</button>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-sm font-semibold text-black dark:text-white">
        <Clock className="w-4 h-4" aria-hidden="true" /> 2 hours
      </div>

      {existing && (
        <p className="text-sm text-black dark:text-white">
          Already on the calendar: <span className="font-bold">{prettyDate(existing.iso)}, {existing.time}–{addMinutes(existing.time, existing.duration || NEXT_BLOCK_MINUTES)}</span>. Choosing a new day moves it.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-xs font-medium text-black dark:text-white mb-1">Day</span>
          <input
            type="date"
            value={date}
            min={today}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 text-black dark:text-white rounded-lg p-2.5 text-base focus:outline-none focus:border-focus-ring"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-black dark:text-white mb-1">Start</span>
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value || '10:00')}
            className="w-full bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 text-black dark:text-white rounded-lg p-2.5 text-base focus:outline-none focus:border-focus-ring"
          />
        </label>
      </div>

      <button
        onClick={schedule}
        disabled={!date || saving}
        className="w-full min-h-[48px] rounded-xl bg-primary text-on-primary text-base font-bold disabled:opacity-40 flex items-center justify-center gap-2 active:bg-primary-hover"
      >
        <CalendarPlus className="w-5 h-5" aria-hidden="true" />
        {existing ? 'Move the 2-hour block' : 'Add a 2-hour block to the calendar'}
      </button>
      {message && <p className="text-sm font-semibold text-black dark:text-white" aria-live="polite">{message}</p>}
    </div>
  );
}
