import { AlertTriangle } from 'lucide-react';

// Tasks whose `properties.projectId` no longer resolves to a real project
// (its project was deleted). Deleting a project never deletes its tasks —
// this is where the dangling link gets surfaced instead of silently dropped.
export default function OrphanedTasksBanner({ tasks, onOpenTask }) {
  if (tasks.length === 0) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-amber-700 dark:text-amber-400">
            {tasks.length} orphaned task{tasks.length > 1 ? 's' : ''}
          </h3>
          <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5 mb-2">
            These were linked to a project that's been deleted. Assign them to a project or leave as-is.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tasks.map(task => (
              <button
                key={task.id}
                onClick={() => onOpenTask(task.id)}
                className="text-xs font-medium bg-white dark:bg-white/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-md hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
              >
                {task.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
