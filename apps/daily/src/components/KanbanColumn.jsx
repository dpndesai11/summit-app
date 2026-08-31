import { useDroppable } from '@dnd-kit/core';
import TaskCard from './TaskCard';

export default function KanbanColumn({ id, title, tasks, formatToSwissDate, onOpenTask }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex-1 min-w-[260px] flex flex-col">
      <div className="flex items-center justify-between px-1 mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-violet-400/5 px-1.5 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 rounded-lg p-2 min-h-[120px] transition-colors ${
          isOver ? 'bg-violet-50 dark:bg-violet-500/10' : 'bg-gray-100/60 dark:bg-violet-400/[0.05]'
        }`}
      >
        {tasks.length === 0 && (
          <div className="text-xs text-gray-400 dark:text-gray-600 text-center py-6">No tasks</div>
        )}
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            formatToSwissDate={formatToSwissDate}
            onOpen={onOpenTask}
          />
        ))}
      </div>
    </div>
  );
}
