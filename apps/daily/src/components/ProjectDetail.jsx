const STATUS_COLUMNS = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
];

// One project's notes + its linked tasks grouped by status. Stays in sync
// with task edits/status changes automatically since it derives the list
// from `tasks` on every render rather than storing its own copy.
export default function ProjectDetail({ project, tasks, onUpdateNotes, onOpenTask }) {
  const linkedTasks = tasks.filter(t => t.properties?.projectId === project.id);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{project.name}</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {linkedTasks.length} linked task{linkedTasks.length === 1 ? '' : 's'}
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Notes</label>
        <textarea
          value={project.notes}
          onChange={(e) => onUpdateNotes(project.id, e.target.value)}
          placeholder="Notes for this project…"
          className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500 h-32"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Linked tasks</label>
        {linkedTasks.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-600">No tasks linked to this project yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {STATUS_COLUMNS.map(col => (
              <div key={col.id}>
                <div className="flex items-center justify-between mb-1.5 px-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{col.title}</span>
                  <span className="text-[11px] text-gray-400">{linkedTasks.filter(t => t.status === col.id).length}</span>
                </div>
                <div className="space-y-1.5">
                  {linkedTasks.filter(t => t.status === col.id).map(task => (
                    <button
                      key={task.id}
                      onClick={() => onOpenTask(task.id)}
                      className="w-full text-left bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-xs text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20 transition-colors"
                    >
                      {task.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
