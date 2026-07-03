import { X, Trash2 } from 'lucide-react';

const STATUS_OPTIONS = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
];

export default function TaskDetailModal({ task, isOverdue, formatToSwissDate, onClose, onToggleSubtask, onSetStatus, onDelete }) {
  if (!task) return null;

  const totalCount = task.checklist.length;
  const completedCount = task.checklist.filter(i => i.isCompleted).length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-white/10">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{task.name}</h2>
            <p className={`text-xs mt-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
              {task.dueDate && `Deadline ${formatToSwissDate(task.dueDate)} · `}Target {formatToSwissDate(task.targetDate)}
              {isOverdue && ' — overdue'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">Status</span>
            <div className="flex gap-1.5">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => onSetStatus(task.id, opt.id)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                    task.status === opt.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {task.notes && (
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">Notes</span>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-white/5 p-3 rounded-lg border border-gray-200 dark:border-white/10 whitespace-pre-wrap">
                {task.notes}
              </p>
            </div>
          )}

          {totalCount > 0 && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Checklist</span>
                <span className="text-xs text-gray-400">{completedCount}/{totalCount}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-white/10 h-1 rounded-full mb-2 overflow-hidden">
                <div className="bg-blue-600 h-full" style={{ width: `${progressPct}%` }}></div>
              </div>
              <div className="space-y-1.5">
                {task.checklist.map(item => (
                  <label key={item.id} className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 p-2 rounded-md border border-gray-200 dark:border-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.isCompleted}
                      onChange={() => onToggleSubtask(task.id, item.id)}
                    />
                    <span className={`text-sm ${item.isCompleted ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {item.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => { onDelete(task.id); onClose(); }}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 py-2 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete task
          </button>
        </div>
      </div>
    </div>
  );
}
