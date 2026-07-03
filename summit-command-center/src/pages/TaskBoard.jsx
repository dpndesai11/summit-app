import { useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import KanbanColumn from '../components/KanbanColumn';
import TaskDetailModal from '../components/TaskDetailModal';
import NewTaskModal from '../components/NewTaskModal';

const COLUMNS = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
];

export default function TaskBoard({
  tasks,
  overdueTasks,
  velocity,
  getDistributedMilestonesCount,
  formatToSwissDate,
  taskForm,
  setTaskForm,
  handleCreateTask,
  handleToggleSubtask,
  handleUpdateTaskStatus,
  handleDeleteTask,
}) {
  const [openTaskId, setOpenTaskId] = useState(null);
  const [showNewTask, setShowNewTask] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const overdueIds = new Set(overdueTasks.map(t => t.id));
  const openTask = tasks.find(t => t.id === openTaskId) || null;

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;
    const task = tasks.find(t => t.id === active.id);
    if (task && task.status !== over.id) {
      handleUpdateTaskStatus(task.id, over.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-4 text-center">
          <span className="text-xs text-gray-400 dark:text-gray-500 block">Completion velocity</span>
          <span className="text-2xl font-semibold text-gray-900 dark:text-gray-100 block my-1">
            {velocity === null ? '—' : `${Math.round(velocity * 100)}%`}
          </span>
          <span className="text-xs text-gray-400">{velocity === null ? 'No checklist data yet' : 'Across all checklists'}</span>
        </div>
        <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-4 text-center">
          <span className="text-xs text-gray-400 dark:text-gray-500 block">Load today</span>
          <span className="text-2xl font-semibold text-gray-900 dark:text-gray-100 block my-1">
            {getDistributedMilestonesCount(new Date().toISOString().split('T')[0])}
          </span>
          <span className="text-xs text-gray-400">Distributed milestone points</span>
        </div>
        <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-4 text-center">
          <span className="text-xs text-gray-400 dark:text-gray-500 block">Open tasks</span>
          <span className="text-2xl font-semibold text-gray-900 dark:text-gray-100 block my-1">
            {tasks.filter(t => !t.isCompleted).length}
          </span>
          <span className="text-xs text-gray-400">
            {overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : 'All on schedule'}
          </span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Board</h2>
          <button
            onClick={() => setShowNewTask(true)}
            className="flex items-center gap-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New task
          </button>
        </div>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.id}
                id={col.id}
                title={col.title}
                tasks={tasks.filter(t => t.status === col.id)}
                overdueIds={overdueIds}
                formatToSwissDate={formatToSwissDate}
                onOpenTask={(task) => setOpenTaskId(task.id)}
              />
            ))}
          </div>
        </DndContext>
      </div>

      <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">14-day load forecast</h3>
        <div className="grid grid-cols-2 sm:grid-cols-7 lg:grid-cols-14 gap-2">
          {Array.from({ length: 14 }).map((_, idx) => {
            const targetDateObj = new Date();
            targetDateObj.setDate(targetDateObj.getDate() + idx);
            const formattedDateStr = targetDateObj.toISOString().split('T')[0];
            const milestonesValue = getDistributedMilestonesCount(formattedDateStr);
            const fillHeight = Math.min(100, (milestonesValue / 5) * 100);

            return (
              <div key={idx} className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-2 flex flex-col justify-between items-center text-center">
                <span className="text-[10px] text-gray-400">
                  {targetDateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <div className="w-3 bg-gray-200 dark:bg-white/10 h-16 rounded-full my-1.5 relative overflow-hidden flex items-end">
                  <div
                    className="w-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ height: `${fillHeight || 8}%` }}
                  ></div>
                </div>
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{milestonesValue}</span>
                <span className="text-[9px] text-gray-400">
                  {targetDateObj.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {openTask && (
        <TaskDetailModal
          task={openTask}
          isOverdue={overdueIds.has(openTask.id)}
          formatToSwissDate={formatToSwissDate}
          onClose={() => setOpenTaskId(null)}
          onToggleSubtask={handleToggleSubtask}
          onSetStatus={handleUpdateTaskStatus}
          onDelete={handleDeleteTask}
        />
      )}

      {showNewTask && (
        <NewTaskModal
          taskForm={taskForm}
          setTaskForm={setTaskForm}
          onCreate={handleCreateTask}
          onClose={() => setShowNewTask(false)}
        />
      )}
    </div>
  );
}
