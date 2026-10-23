import { useState } from 'react';
import { CalendarClock, Copy, MoveRight, Pencil, Settings2, SkipForward } from 'lucide-react';
import { BottomSheet } from '@summit/core';
import { formatShortDate } from '../lib/model';
import { mondayOf } from '../lib/stats';
import {
  WEEK_TYPES, actualKm, blockStatus, dropWeek, insertRestWeek, pushBack, repeatWeek,
} from '../lib/training';
import { TypeBadge } from './TrainingWeeks';

const km = (v) => Math.round(v * 10) / 10;

// The "life happens" menu: repeat the week, add a rest week, drop one, or slide
// the rest of the block later. Each shows what it will do and asks to confirm.
function AdjustSheet({ open, onClose, w, onEditWeek, status }) {
  const { trainingWeeks, weekPlans, updateTrainingWeeks, updateWeekPlans, todayISO, showToast } = w;
  const [pending, setPending] = useState(null);
  const close = () => { setPending(null); onClose(); };
  const monday = status?.week ? status.week.weekStart : mondayOf(todayISO);
  const firstStart = trainingWeeks[0]?.weekStart;
  const hasCurrent = status?.state === 'active' && status.week;

  const actions = [
    hasCurrent && {
      id: 'repeat', icon: Copy, label: 'Repeat this week',
      hint: 'You missed it or it went badly. A copy of this week goes next; later weeks move back a week.',
      run: () => repeatWeek(trainingWeeks, weekPlans, monday),
    },
    hasCurrent && {
      id: 'rest', icon: SkipForward, label: 'Add a rest week after this one',
      hint: 'Illness, travel or a busy stretch. Later weeks move back a week.',
      run: () => insertRestWeek(trainingWeeks, weekPlans, monday),
    },
    hasCurrent && {
      id: 'drop', icon: SkipForward, label: 'Skip this week and close the gap',
      hint: 'Remove this week from the block; later weeks move forward a week.',
      run: () => dropWeek(trainingWeeks, weekPlans, monday),
    },
    firstStart && {
      id: 'push', icon: MoveRight,
      label: status?.state === 'before' ? 'Start the block a week later' : 'Push the whole block back a week',
      hint: status?.state === 'before'
        ? 'Every week moves a week later.'
        : 'This week and every later week move a week later; you restart this week next Monday.',
      run: () => pushBack(trainingWeeks, weekPlans, status?.state === 'active' ? monday : firstStart),
    },
  ].filter(Boolean);
  const chosen = actions.find(a => a.id === pending);

  const apply = () => {
    const r = chosen.run();
    updateTrainingWeeks(r.weeks);
    updateWeekPlans(r.plans);
    showToast('Block updated');
    close();
  };

  return (
    <BottomSheet open={open} onClose={close} title="Adjust the block">
      {!chosen ? (
        <div className="space-y-2 pb-2">
          {hasCurrent && (
            <button onClick={() => { close(); onEditWeek(); }}
              className="w-full text-left min-h-[56px] px-4 py-2 rounded-xl border border-gray-200 dark:border-violet-400/15 text-black dark:text-white flex items-center gap-3">
              <Pencil className="w-5 h-5 flex-shrink-0" />
              <span>
                <span className="block text-base font-bold">Change this week’s sessions</span>
                <span className="block text-sm">Move a run, swap a gym day, make it lighter.</span>
              </span>
            </button>
          )}
          {actions.map(a => (
            <button key={a.id} onClick={() => setPending(a.id)}
              className="w-full text-left min-h-[56px] px-4 py-2 rounded-xl border border-gray-200 dark:border-violet-400/15 text-black dark:text-white flex items-center gap-3">
              <a.icon className="w-5 h-5 flex-shrink-0" />
              <span>
                <span className="block text-base font-bold">{a.label}</span>
                <span className="block text-sm">{a.hint}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3 pb-2">
          <p className="text-base font-bold text-black dark:text-white">{chosen.label}</p>
          <p className="text-base text-black dark:text-white">{chosen.hint}</p>
          <button onClick={apply} className="w-full min-h-[52px] rounded-xl bg-primary text-on-primary text-base font-bold">Do it</button>
          <button onClick={() => setPending(null)}
            className="w-full min-h-[48px] rounded-xl bg-gray-100 dark:bg-violet-400/10 text-base font-semibold text-black dark:text-white">Back</button>
        </div>
      )}
    </BottomSheet>
  );
}

// The block home on Today: a welcome that says which week you're on, a segmented
// progress bar (one segment per week, coloured by type), and the Adjust menu.
export default function BlockBanner({ w, onEditWeek }) {
  const { trainingWeeks, trainingBlocks, cardioLogs, todayISO } = w;
  const [adjusting, setAdjusting] = useState(false);
  const status = blockStatus(trainingWeeks, todayISO);
  if (!status) return null;
  const name = trainingBlocks[0]?.name || 'Training block';
  const week = status.week;
  const weekKm = week ? actualKm(cardioLogs, week.weekStart) : 0;

  let heading;
  let sub;
  if (status.state === 'before') {
    heading = status.startsInDays === 1 ? 'Your block starts tomorrow' : `Your block starts in ${status.startsInDays} days`;
    sub = `Begins Mon ${formatShortDate(status.start)}`;
  } else if (status.state === 'after') {
    heading = 'Block complete';
    sub = `Finished ${formatShortDate(status.end)}`;
  } else {
    heading = `Welcome — you’re on week ${status.index + 1} of ${status.total}`;
    sub = week ? WEEK_TYPES[week.type].hint : 'No week planned for this date';
  }

  return (
    <div className="bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-black dark:text-white">{name}</div>
          <h2 className="text-lg font-bold text-black dark:text-white leading-snug">{heading}</h2>
          {week && (
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <TypeBadge type={week.type} />
              <span className="text-base font-semibold text-black dark:text-white">{week.label}</span>
            </div>
          )}
          <p className="text-sm text-black dark:text-white mt-0.5">{sub}</p>
        </div>
        <button onClick={() => setAdjusting(true)} aria-label="Adjust the block"
          className="min-h-[44px] px-3 rounded-xl bg-gray-100 dark:bg-violet-400/10 text-sm font-bold text-black dark:text-white flex items-center gap-1.5 flex-shrink-0">
          <Settings2 className="w-4 h-4" /> Adjust
        </button>
      </div>

      <div
        role="progressbar" aria-label="Block progress" aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={Math.round(status.progress * 100)}
        className="flex gap-1"
      >
        {trainingWeeks.map((t, i) => {
          const current = status.state === 'active' && i === status.index;
          const done = status.state === 'after' || (status.state === 'active' && i < status.index);
          return (
            <span key={t.weekStart} className={`relative flex-1 h-3 rounded-full overflow-hidden bg-gray-200 dark:bg-violet-400/20 ${current ? 'ring-2 ring-primary ring-offset-2 ring-offset-white dark:ring-offset-[#211b34]' : ''}`}>
              <span
                className={`absolute inset-y-0 left-0 ${WEEK_TYPES[t.type].dot}`}
                style={{ width: done ? '100%' : current ? `${(status.dayOfWeek / 7) * 100}%` : '0%' }}
              />
            </span>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-sm text-black dark:text-white tabular-nums">
        <span>{Math.round(status.progress * 100)}% through</span>
        {status.state === 'active' && (
          <span className="flex items-center gap-1.5">
            <CalendarClock className="w-4 h-4" />
            {week?.targetKm ? `${km(weekKm)} / ${week.targetKm} km this week` : `ends ${formatShortDate(status.end)}`}
          </span>
        )}
      </div>

      <AdjustSheet open={adjusting} onClose={() => setAdjusting(false)} w={w} onEditWeek={onEditWeek} status={status} />
    </div>
  );
}
