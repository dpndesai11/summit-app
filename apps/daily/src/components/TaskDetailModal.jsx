import { useState } from 'react';
import { X, Trash2, Pencil } from 'lucide-react';
import { weightedCompletion } from '../lib/taskUtils';
import TaskEditForm from './TaskEditForm';

const STATUS_OPTIONS = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
];

const PRIORITY_STYLES = {
  High: 'text-red-600 bg-red-50 dark:bg-red-500/10',
  Medium: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10',
  Low: 'text-black dark:text-white bg-gray-100 dark:bg-violet-400/10',
};

export default function TaskDetailModal({
  task, isOverdue, projects, formatToSwissDate,
  onClose, onToggleSubtask, onSetStatus, onDelete, onUpdateTask, onNavigateToProject,
}) {
  const [mode, setMode] = useState('view');

  if (!task) return null;

  const totalCount = task.checklist.length;
  const completedCount = task.checklist.filter(i => i.isCompleted).length;
  const progressPct = Math.round((weightedCompletion(task.checklist) ?? 0) * 100);
  const priority = task.properties?.priority;
  const project = projects?.find(p => p.id === task.properties?.projectId);

  const handleSave = (taskId, updates) => {
    onUpdateTask(taskId, updates);
    setMode('view');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-violet-400/15">
          <div>
            <h2 className="text-base font-semibold text-black dark:text-white">{task.name}</h2>
            <p className={`text-xs mt-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-black dark:text-white'}`}>
              {task.dueDate && `Deadline ${formatToSwissDate(task.dueDate)} · `}Target {formatToSwissDate(task.targetDate)}
              {isOverdue && ' — overdue'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-black dark:text-white hover:text-black dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {mode === 'edit' ? (
            <TaskEditForm
              key={task.id}
              task={task}
              projects={projects || []}
              onSave={handleSave}
              onCancel={() => setMode('view')}
            />
          ) : (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-medium text-black dark:text-white block mb-1.5">Status</span>
                <div className="flex gap-1.5">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => onSetStatus(task.id, opt.id)}
                      className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                        task.status === opt.id
                          ? 'bg-violet-600 text-white'
                          : 'bg-gray-100 dark:bg-violet-400/10 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-white/20'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {(priority || project || (task.tags && task.tags.length > 0)) && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {priority && (
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${PRIORITY_STYLES[priority] || ''}`}>
                      {priority}
                    </span>
                  )}
                  {project && (
                    <button
                      onClick={() => onNavigateToProject?.(project.id)}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors"
                    >
                      {project.name} →
                    </button>
                  )}
                  {(task.tags || []).map(tag => (
                    <span key={tag} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-violet-400/10 text-black dark:text-white">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {task.notes && (
                <div>
                  <span className="text-xs font-medium text-black dark:text-white block mb-1.5">Notes</span>
                  <p className="text-sm text-black dark:text-white bg-gray-50 dark:bg-violet-400/5 p-3 rounded-lg border border-gray-200 dark:border-violet-400/15 whitespace-pre-wrap">
                    {task.notes}
                  </p>
                </div>
              )}

              {totalCount > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-medium text-black dark:text-white">Checklist</span>
                    <span className="text-xs text-black dark:text-white">{completedCount}/{totalCount}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-violet-400/10 h-1 rounded-full mb-2 overflow-hidden">
                    <div className="bg-violet-600 h-full" style={{ width: `${progressPct}%` }}></div>
                  </div>
                  <div className="space-y-1.5">
                    {task.checklist.map(item => (
                      <label key={item.id} className="flex items-center gap-2 bg-gray-50 dark:bg-violet-400/5 p-2 rounded-md border border-gray-200 dark:border-violet-400/15 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.isCompleted}
                          onChange={() => onToggleSubtask(task.id, item.id)}
                        />
                        <span className={`text-sm ${item.isCompleted ? 'line-through text-black' : 'text-black dark:text-white'}`}>
                          {item.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setMode('edit')}
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-black dark:text-white bg-gray-100 dark:bg-violet-400/10 hover:bg-gray-200 dark:hover:bg-white/20 py-2 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => { onDelete(task.id); onClose(); }}
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 py-2 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
