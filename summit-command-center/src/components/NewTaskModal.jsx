import { X } from 'lucide-react';

export default function NewTaskModal({ taskForm, setTaskForm, onCreate, onClose }) {
  const canSubmit = taskForm.name.trim() && taskForm.targetDate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/10">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">New task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
            <input
              type="text"
              className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 rounded-lg p-2.5 focus:outline-none focus:border-blue-500"
              value={taskForm.name}
              onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
              placeholder="e.g. Master's thesis sprint"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Deadline (optional)</label>
              <input
                type="date"
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 rounded-lg p-2.5 focus:outline-none focus:border-blue-500"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Target date</label>
              <input
                type="date"
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 rounded-lg p-2.5 focus:outline-none focus:border-blue-500"
                value={taskForm.targetDate}
                onChange={(e) => setTaskForm({ ...taskForm, targetDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
            <textarea
              className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 h-20"
              value={taskForm.notes}
              onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
              placeholder="Details, specifications, etc."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Checklist (one item per line)</label>
            <textarea
              className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 h-24 font-mono text-xs"
              value={taskForm.checklistText}
              onChange={(e) => setTaskForm({ ...taskForm, checklistText: e.target.value })}
              placeholder={'Draft chapter 1\nProcess literature base\nSynthesize results'}
            />
          </div>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => { onCreate(); onClose(); }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add task
          </button>
        </div>
      </div>
    </div>
  );
}
