import KanbanColumn from './KanbanColumn';

const COLUMNS = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
];

// One urgency lane containing the 3 status columns. The droppable id on each
// column is `${laneId}:${statusId}` — lane is never written by a drag, only
// status is (lane is always re-derived from the task's dates).
export default function SwimlaneRow({ laneId, title, tasks, formatToSwissDate, onOpenTask }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-violet-400/5 px-1.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col.id}
            id={`${laneId}:${col.id}`}
            title={col.title}
            tasks={tasks.filter(t => t.status === col.id)}
            formatToSwissDate={formatToSwissDate}
            onOpenTask={onOpenTask}
          />
        ))}
      </div>
    </div>
  );
}
