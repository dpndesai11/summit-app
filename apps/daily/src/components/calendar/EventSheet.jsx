import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { BottomSheet } from '@summit/core';
import { EVENT_COLORS, EVENT_COLOR_IDS, MIN_EVENT_DURATION, REPEATS, formatDuration, weekdayName } from '../../lib/calendar';

const field = 'w-full min-h-[48px] px-4 rounded-xl bg-surface-sunken border border-border-strong text-base text-black dark:text-white outline-none focus:ring-2 focus:ring-focus-ring';
const LENGTHS = [15, 30, 45, 60, 90, 120];

// The add/edit form. Mounted only while the sheet is open (BottomSheet renders
// nothing when closed), so its initial state is read fresh every time.
function EventForm({ event, defaults, onSave, onDelete }) {
  const initial = event || defaults;
  const [title, setTitle] = useState(event?.title ?? '');
  const [date, setDate] = useState(initial.date);
  const [allDay, setAllDay] = useState(event ? event.time === null : false);
  const [time, setTime] = useState(event?.time ?? defaults.time);
  const [duration, setDuration] = useState(initial.duration);
  const [color, setColor] = useState(event?.color ?? 'primary');
  const [repeat, setRepeat] = useState(event?.repeat ?? 'none');
  const [notes, setNotes] = useState(event?.notes ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canSave = title.trim() && date;
  const repeatHint = {
    daily: 'Every day',
    weekly: date ? `Every ${weekdayName(date)}` : 'Every week',
    monthly: date ? `On day ${Number(date.slice(8, 10))} of each month (the last day in shorter months)` : 'Every month',
  }[repeat];

  const save = () => {
    if (!canSave) return;
    onSave({
      title: title.trim(), date, time: allDay ? null : time,
      duration: Number(duration) >= MIN_EVENT_DURATION ? Number(duration) : 60, color, repeat, notes,
    });
  };

  return (
    <div className="space-y-4 pb-2">
      <div>
        <label htmlFor="event-title" className="block text-base font-bold text-black dark:text-white mb-1.5">Title</label>
        <input id="event-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Dentist" autoFocus={!event} className={field} />
      </div>

      <div>
        <label htmlFor="event-date" className="block text-base font-bold text-black dark:text-white mb-1.5">Date</label>
        <input id="event-date" type="date" value={date} onChange={e => setDate(e.target.value)} className={field} />
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={allDay}
        onClick={() => setAllDay(a => !a)}
        className="w-full min-h-[48px] flex items-center justify-between text-base font-bold text-black dark:text-white"
      >
        All day
        <span className={`w-12 h-7 rounded-full p-0.5 transition-colors ${allDay ? 'bg-primary' : 'bg-border-strong'}`}>
          <span className={`block w-6 h-6 rounded-full bg-white transition-transform ${allDay ? 'translate-x-5' : ''}`} />
        </span>
      </button>

      {!allDay && (
        <>
          <div>
            <label htmlFor="event-time" className="block text-base font-bold text-black dark:text-white mb-1.5">Starts</label>
            <input id="event-time" type="time" value={time} onChange={e => setTime(e.target.value)} className={field} />
          </div>
          <div>
            <span className="block text-base font-bold text-black dark:text-white mb-1.5">Length</span>
            <div className="flex flex-wrap gap-2">
              {LENGTHS.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDuration(m)}
                  aria-pressed={Number(duration) === m}
                  className={`min-h-[44px] px-4 rounded-full text-base font-semibold border ${
                    Number(duration) === m ? 'bg-primary text-on-primary border-transparent' : 'bg-surface-raised text-black dark:text-white border-border-strong'
                  }`}
                >
                  {formatDuration(m)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                inputMode="numeric"
                min={MIN_EVENT_DURATION}
                step={5}
                value={duration}
                onChange={e => setDuration(e.target.value === '' ? '' : Number(e.target.value))}
                aria-label="Length in minutes"
                className={`${field} !w-28`}
              />
              <span className="text-base text-black dark:text-white">minutes</span>
            </div>
          </div>
        </>
      )}

      <div>
        <span className="block text-base font-bold text-black dark:text-white mb-1.5">Colour</span>
        <div className="flex gap-3">
          {EVENT_COLOR_IDS.map(id => (
            <button
              key={id}
              type="button"
              onClick={() => setColor(id)}
              aria-label={EVENT_COLORS[id].label}
              aria-pressed={color === id}
              className={`w-11 h-11 rounded-full ${EVENT_COLORS[id].dot} ${color === id ? 'ring-2 ring-offset-2 ring-focus-ring ring-offset-surface-raised' : ''}`}
            />
          ))}
        </div>
      </div>

      <div>
        <span className="block text-base font-bold text-black dark:text-white mb-1.5">Repeat</span>
        <div className="flex flex-wrap gap-2">
          {REPEATS.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRepeat(r.id)}
              aria-pressed={repeat === r.id}
              className={`min-h-[44px] px-4 rounded-full text-base font-semibold border ${
                repeat === r.id ? 'bg-primary text-on-primary border-transparent' : 'bg-surface-raised text-black dark:text-white border-border-strong'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {repeatHint && <p className="text-sm text-black dark:text-white mt-2">{repeatHint}</p>}
        {event && event.repeat !== 'none' && (
          <p className="text-sm font-semibold text-black dark:text-white mt-1">Changes apply to every repeat.</p>
        )}
      </div>

      <div>
        <label htmlFor="event-notes" className="block text-base font-bold text-black dark:text-white mb-1.5">Notes</label>
        <textarea id="event-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Optional" className={`${field} py-3 resize-none`} />
      </div>

      <button
        type="button"
        onClick={save}
        disabled={!canSave}
        className="w-full min-h-[52px] rounded-xl bg-primary text-on-primary text-base font-bold disabled:opacity-40 active:bg-primary-hover"
      >
        {event ? 'Save changes' : 'Add event'}
      </button>

      {event && (
        <button
          type="button"
          onClick={() => {
            if (!confirmDelete) { setConfirmDelete(true); return; }
            onDelete(event.id);
          }}
          className="w-full min-h-[48px] rounded-xl border border-danger text-base font-semibold text-black dark:text-white flex items-center justify-center gap-2"
        >
          <Trash2 className="w-5 h-5 text-danger" />
          {confirmDelete ? (event.repeat !== 'none' ? 'Tap again to delete every repeat' : 'Tap again to delete') : 'Delete event'}
        </button>
      )}
    </div>
  );
}

// `event` is the event being edited, or null for a new one (then `defaults`
// supplies the date/time the form starts with).
export default function EventSheet({ open, onClose, event, defaults, onSave, onDelete }) {
  return (
    <BottomSheet open={open} onClose={onClose} title={event ? 'Edit event' : 'New event'}>
      <EventForm event={event} defaults={defaults} onSave={onSave} onDelete={onDelete} />
    </BottomSheet>
  );
}
