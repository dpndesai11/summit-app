import { X } from 'lucide-react';
import ChecklistEditor from './ChecklistEditor';

export default function NewTaskModal({ taskForm, setTaskForm, onCreate, onClose }) {
  const canSubmit = taskForm.name.trim() && taskForm.targetDate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-violet-400/15">
          <h2 className="text-base font-semibold text-black dark:text-white">New task</h2>
          <button onClick={onClose} aria-label="Close" className="text-black dark:text-white hover:text-black dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-black dark:text-white mb-1">Name</label>
            <input
              type="text"
              className="w-full bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 text-black dark:text-white rounded-lg p-2.5 focus:outline-none focus:border-violet-500"
              value={taskForm.name}
              onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
              placeholder="e.g. Master's thesis sprint"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-black dark:text-white mb-1">Deadline (optional)</label>
              <input
                type="date"
                className="w-full bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 text-black dark:text-white rounded-lg p-2.5 focus:outline-none focus:border-violet-500"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-black dark:text-white mb-1">Target date</label>
              <input
                type="date"
                className="w-full bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 text-black dark:text-white rounded-lg p-2.5 focus:outline-none focus:border-violet-500"
                value={taskForm.targetDate}
                onChange={(e) => setTaskForm({ ...taskForm, targetDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-black dark:text-white mb-1">Notes</label>
            <textarea
              className="w-full bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 text-black dark:text-white rounded-lg p-2.5 focus:outline-none focus:border-violet-500 h-20"
              value={taskForm.notes}
              onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
              placeholder="Details, specifications, etc."
            />
          </div>

          <ChecklistEditor
            items={taskForm.checklist}
            onChange={(checklist) => setTaskForm({ ...taskForm, checklist })}
          />

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => { onCreate(); onClose(); }}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add task
          </button>
        </div>
      </div>
    </div>
  );
}
