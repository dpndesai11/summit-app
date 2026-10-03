import { CalendarDays, CalendarRange, CheckSquare, ChevronRight, Dumbbell, Plus, UtensilsCrossed } from 'lucide-react';
import { EVENT_COLORS, formatDuration, formatTime } from '../../lib/calendar';

const KIND = {
  workout: { Icon: Dumbbell, bar: 'bg-orange-500', label: 'Workout' },
  meal: { Icon: UtensilsCrossed, bar: 'bg-green-600', label: 'Meal' },
  task: { Icon: CheckSquare, bar: 'bg-primary', label: 'Task on the timeline' },
};

// The selected day as a plain list, the way a phone calendar's agenda reads:
// all-day items first, then everything in start order, each a big tap target.
// Events open the editor, tasks open their detail, and workouts/meals open the
// Day view (where they can be dragged to a new time). `children` is whatever
// belongs underneath — the day's tasks and the collapsed management cards.
export default function AgendaPanel({ title, subtitle, items, onAddEvent, onOpenDay, onEditEvent, onOpenTask, children }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-black dark:text-white truncate">{title}</h2>
          <p className="text-sm text-black dark:text-white">{subtitle}</p>
        </div>
        <button
          onClick={onOpenDay}
          className="min-h-[44px] px-3 rounded-xl text-sm font-semibold text-black dark:text-white bg-surface-raised border border-border-strong flex items-center gap-1.5"
        >
          <CalendarRange className="w-4 h-4" /> Day
        </button>
        <button
          onClick={onAddEvent}
          className="min-h-[44px] px-4 rounded-xl text-sm font-semibold text-on-primary bg-primary active:bg-primary-hover flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Event
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-violet-400/15 p-5 text-center">
          <p className="text-sm text-black dark:text-white">Nothing scheduled.</p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.map(item => {
            const isEvent = item.kind === 'event';
            const meta = isEvent
              ? { Icon: CalendarDays, bar: EVENT_COLORS[item.event.color].dot, label: item.event.repeat === 'none' ? 'Event' : `Event · repeats ${item.event.repeat === 'daily' ? 'every day' : item.event.repeat === 'weekly' ? 'every week' : 'every month'}` }
              : KIND[item.kind];
            const onClick = isEvent ? () => onEditEvent(item.event) : item.kind === 'task' ? () => onOpenTask(item.taskId) : onOpenDay;
            return (
              <li key={item.key}>
                <button
                  onClick={onClick}
                  className="w-full flex items-stretch gap-3 text-left min-h-[60px] rounded-xl bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 py-2 pl-2 pr-3"
                >
                  <span className={`w-1 rounded-full flex-shrink-0 ${meta.bar}`} />
                  <span className="w-[76px] flex-shrink-0 flex flex-col justify-center text-sm font-semibold text-black dark:text-white tabular-nums">
                    {item.allDay ? 'All day' : formatTime(item.time)}
                    {!item.allDay && <span className="text-xs font-normal">{formatDuration(item.duration)}</span>}
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col justify-center">
                    <span className="text-base font-semibold text-black dark:text-white truncate">{item.title}</span>
                    <span className="text-sm text-black dark:text-white truncate">{meta.label}</span>
                  </span>
                  <ChevronRight className="w-5 h-5 self-center flex-shrink-0 text-black dark:text-white" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {children}
    </section>
  );
}
