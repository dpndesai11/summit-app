import { useDroppable } from '@dnd-kit/core';
import TaskCard from './TaskCard';

// `archive` marks the Done column: dropping a card here archives it (the board
// never lists done tasks; they stay on their project and in the Archive).
export default function KanbanColumn({ id, title, tasks, formatToSwissDate, onOpenTask, archive = false }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex-1 min-w-[260px] flex flex-col">
      <div className="flex items-center justify-between px-1 mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-black dark:text-white">{title}</h3>
        {!archive && <span className="text-xs text-black dark:text-white bg-gray-100 dark:bg-violet-400/5 px-1.5 py-0.5 rounded-full">{tasks.length}</span>}
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 rounded-lg p-2 min-h-[120px] transition-colors ${
          isOver ? 'bg-primary-soft' : 'bg-gray-100/60 dark:bg-violet-400/[0.05]'
        }`}
      >
        {archive && (
          <div className={`text-xs text-center py-6 rounded-lg border-2 border-dashed ${isOver ? 'border-primary font-bold' : 'border-border-strong'} text-black dark:text-white`}>
            Drop here to mark done and archive
          </div>
        )}
        {!archive && tasks.length === 0 && (
          <div className="text-xs text-black dark:text-white text-center py-6">No tasks</div>
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
