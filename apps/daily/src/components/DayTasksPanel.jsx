import { X } from 'lucide-react';

// Tasks landing on a clicked planner day (matched on targetDate or dueDate).
export default function DayTasksPanel({ dateStr, tasks, formatToSwissDate, onOpenTask, onClose }) {
  const dayTasks = tasks.filter(t => t.targetDate === dateStr || t.dueDate === dateStr);

  return (
    <div className="bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-black dark:text-white">{formatToSwissDate(dateStr)}</h3>
        <button onClick={onClose} aria-label="Close" className="text-black dark:text-white hover:text-black dark:hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      {dayTasks.length === 0 ? (
        <p className="text-xs text-black dark:text-white">No tasks land on this day.</p>
      ) : (
        <div className="space-y-2">
          {dayTasks.map(task => (
            <button
              key={task.id}
              onClick={() => onOpenTask(task)}
              className="w-full text-left bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 rounded-lg p-2.5 hover:border-gray-300 dark:hover:border-white/20 transition-colors"
            >
              <span className="text-sm font-medium text-black dark:text-white block">{task.name}</span>
              <span className="text-[10px] text-black dark:text-white">
                {task.targetDate === dateStr ? 'Target' : 'Deadline'} · {task.status.replace('_', ' ')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
