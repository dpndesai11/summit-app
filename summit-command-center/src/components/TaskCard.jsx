import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

export default function TaskCard({ task, isOverdue, formatToSwissDate, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const totalCount = task.checklist.length;
  const completedCount = task.checklist.filter(i => i.isCompleted).length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(task)}
      className={`bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-white/10 rounded-lg p-3 cursor-pointer shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-white/20 transition-shadow ${isDragging ? 'dnd-dragging' : ''}`}
    >
      <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">{task.name}</div>

      {totalCount > 0 && (
        <div className="mb-2">
          <div className="w-full bg-gray-200 dark:bg-white/10 h-1 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full" style={{ width: `${progressPct}%` }}></div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {task.targetDate && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            Target {formatToSwissDate(task.targetDate)}
          </span>
        )}
        {isOverdue && (
          <span className="text-[10px] font-medium text-red-600 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded">
            Overdue
          </span>
        )}
        {totalCount > 0 && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
            {completedCount}/{totalCount}
          </span>
        )}
      </div>
    </div>
  );
}
