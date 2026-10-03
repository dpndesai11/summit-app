import { CalendarRange, Circle, CircleCheck, CheckSquare } from 'lucide-react';

// The tasks for one day: due/overdue/picked for today, or the simpler
// due/targeted/picked list for any other date. Tap a title for the full task
// detail; "Add to timeline" opts a task onto the Day view's hour grid.
export default function DayTaskList({
  tasks, label, isToday, selectedISO, overdueIds, pickedIds,
  isTaskScheduled, onToggleDone, onOpenTask, onAddToTimeline, onRemoveFromTimeline,
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <CheckSquare className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-black dark:text-white text-sm">Tasks</h3>
        <span className="text-[11px] text-black dark:text-white ml-auto">{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <div className="bg-white dark:bg-[#211b34] rounded-2xl border border-dashed border-gray-200 dark:border-violet-400/15 p-4 text-center">
          <p className="text-xs text-black dark:text-white">
            {isToday ? 'Nothing due, overdue, or picked for today.' : `Nothing due, targeted, or picked for ${label}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {tasks.map(task => {
            const done = task.status === 'done' || task.isCompleted;
            const scheduled = isTaskScheduled(task.id);
            return (
              <div key={task.id} className="bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15 p-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleDone(task.id, done ? 'todo' : 'done')}
                    aria-label={done ? `Reopen ${task.name}` : `Mark ${task.name} done`}
                    className="w-9 h-9 -ml-1.5 flex items-center justify-center text-black dark:text-white active:text-primary flex-shrink-0"
                  >
                    {done ? <CircleCheck className="w-5 h-5 text-primary" /> : <Circle className="w-5 h-5" />}
                  </button>
                  <button onClick={() => onOpenTask(task.id)} className="flex-1 min-w-0 text-left min-h-[36px]">
                    <span className={`text-sm truncate block ${done ? 'line-through text-black dark:text-white' : 'text-black dark:text-white font-medium'}`}>{task.name}</span>
                  </button>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {overdueIds.has(task.id) && <span className="text-[11px] font-medium text-danger bg-danger/10 px-1.5 py-0.5 rounded">Overdue</span>}
                    {task.dueDate === selectedISO && !overdueIds.has(task.id) && <span className="text-[11px] font-medium text-warning bg-warning/10 px-1.5 py-0.5 rounded">Due</span>}
                    {pickedIds.includes(task.id) && <span className="text-[11px] font-medium text-primary bg-primary-soft px-1.5 py-0.5 rounded">Picked</span>}
                  </div>
                </div>
                <div className="pl-8 mt-1">
                  {scheduled ? (
                    <button
                      onClick={() => onRemoveFromTimeline(task.id)}
                      className="flex items-center gap-1 text-[11px] font-medium text-primary bg-primary-soft px-2.5 py-1 rounded-full active:bg-primary-soft"
                    >
                      <CalendarRange className="w-3 h-3" /> On timeline · remove
                    </button>
                  ) : (
                    <button
                      onClick={() => onAddToTimeline(task.id)}
                      className="flex items-center gap-1 text-[11px] font-medium text-black dark:text-white bg-gray-100 dark:bg-violet-400/10 px-2.5 py-1 rounded-full active:bg-gray-200 dark:active:bg-violet-400/20"
                    >
                      <CalendarRange className="w-3 h-3" /> Add to timeline
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
