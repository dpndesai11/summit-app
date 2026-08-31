import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { weightedCompletion, getDueBadgeLevel } from '../lib/taskUtils';

const DUE_BADGE_STYLES = {
  overdue: 'text-red-600 bg-red-50 dark:bg-red-500/10',
  soon: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10',
  normal: 'text-gray-400 bg-gray-100 dark:bg-violet-400/5',
};

export default function TaskCard({ task, formatToSwissDate, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const totalCount = task.checklist.length;
  const completedCount = task.checklist.filter(i => i.isCompleted).length;
  const weightedPct = Math.round((weightedCompletion(task.checklist) ?? 0) * 100);

  const dueBadgeLevel = getDueBadgeLevel(task);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(task)}
      className={`bg-white dark:bg-[#2a2340] border border-gray-200 dark:border-violet-400/15 rounded-lg p-3 cursor-pointer shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-white/20 transition-shadow ${isDragging ? 'dnd-dragging' : ''}`}
    >
      <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">{task.name}</div>

      {totalCount > 0 && (
        <div className="mb-2">
          <div className="w-full bg-gray-200 dark:bg-violet-400/10 h-1 rounded-full overflow-hidden">
            <div className="bg-violet-600 h-full" style={{ width: `${weightedPct}%` }}></div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {task.dueDate && dueBadgeLevel && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${DUE_BADGE_STYLES[dueBadgeLevel]}`}>
            {dueBadgeLevel === 'overdue' ? 'Overdue' : `Due ${formatToSwissDate(task.dueDate)}`}
          </span>
        )}
        {task.targetDate && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            Target {formatToSwissDate(task.targetDate)}
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
