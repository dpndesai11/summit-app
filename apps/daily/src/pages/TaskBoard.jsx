import { useState, useEffect } from 'react';
import { Archive, Plus, RotateCcw } from 'lucide-react';
import { CollapsibleCard } from '@summit/core';
import { TaskDetailModal } from '@summit/core';
import { filterTasks } from '@summit/core/taskUtils';
import BoardView from '../components/BoardView';
import PlannerView from '../components/PlannerView';
import NewTaskModal from '../components/NewTaskModal';
import FilterBar from '../components/FilterBar';

export default function TaskBoard({
  tasks,
  projects,
  overdueTasks,
  velocity,
  getDistributedMilestonesCount,
  formatToSwissDate,
  taskForm,
  setTaskForm,
  handleCreateTask,
  handleToggleSubtask,
  handleUpdateTaskStatus,
  handleUpdateTask,
  handleDeleteTask,
  navigateTo,
  pendingNav,
  clearPendingNav,
}) {
  const [openTaskId, setOpenTaskId] = useState(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [filters, setFilters] = useState({});
  const [view, setView] = useState('board');

  // Deep link from another page (e.g. a project's linked-task list) that
  // wants this exact task's detail modal open. Consumed during render (React's
  // sanctioned "adjust state from changed props" pattern) rather than in a
  // useEffect, since setting local state synchronously inside an effect body
  // triggers an extra unnecessary render pass.
  const [consumedNav, setConsumedNav] = useState(null);
  if (pendingNav && pendingNav !== consumedNav) {
    setConsumedNav(pendingNav);
    if (pendingNav.taskId) setOpenTaskId(pendingNav.taskId);
  }
  useEffect(() => {
    if (pendingNav) clearPendingNav();
  }, [pendingNav]);

  const overdueIds = new Set(overdueTasks.map(t => t.id));
  const openTask = tasks.find(t => t.id === openTaskId) || null;
  // Done tasks are archived: off the board, still on their project, restorable below.
  const archivedTasks = tasks.filter(t => t.status === 'done')
    .sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')));
  const projectName = (t) => projects.find(p => p.id === t.properties?.projectId)?.name;
  const filteredTasks = filterTasks(tasks.filter(t => t.status !== 'done'), filters, projects);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 rounded-xl p-4 text-center">
          <span className="text-xs text-black dark:text-white block">Completion velocity</span>
          <span className="text-2xl font-display font-extrabold text-black dark:text-white block my-1">
            {velocity === null ? '—' : `${Math.round(velocity * 100)}%`}
          </span>
          <span className="text-xs text-black dark:text-white">{velocity === null ? 'No checklist data yet' : 'Across all checklists'}</span>
        </div>
        <div className="bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 rounded-xl p-4 text-center">
          <span className="text-xs text-black dark:text-white block">Load today</span>
          <span className="text-2xl font-display font-extrabold text-black dark:text-white block my-1">
            {getDistributedMilestonesCount(new Date().toISOString().split('T')[0])}
          </span>
          <span className="text-xs text-black dark:text-white">Distributed milestone points</span>
        </div>
        <div className="bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 rounded-xl p-4 text-center">
          <span className="text-xs text-black dark:text-white block">Open tasks</span>
          <span className="text-2xl font-display font-extrabold text-black dark:text-white block my-1">
            {tasks.filter(t => !t.isCompleted).length}
          </span>
          <span className="text-xs text-black dark:text-white">
            {overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : 'All on schedule'}
          </span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-black dark:text-white">
              {view === 'board' ? 'Board' : 'Planner'}
            </h2>
            <div className="flex gap-1">
              {['board', 'planner'].map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`text-xs font-medium capitalize px-2.5 py-1 rounded-md transition-colors ${
                    view === v
                      ? 'bg-primary text-on-primary'
                      : 'bg-gray-100 dark:bg-violet-400/10 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-white/20'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => setShowNewTask(true)}
            className="flex items-center gap-1.5 text-sm font-medium bg-primary hover:bg-primary-hover text-on-primary px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New task
          </button>
        </div>

        <FilterBar
          tasks={tasks}
          filteredCount={filteredTasks.length}
          filters={filters}
          onChange={setFilters}
          projects={projects}
        />

        <div className="mt-3">
          {view === 'board' ? (
            <BoardView
              tasks={filteredTasks}
              formatToSwissDate={formatToSwissDate}
              onOpenTask={(task) => setOpenTaskId(task.id)}
              onUpdateTaskStatus={handleUpdateTaskStatus}
            />
          ) : (
            <PlannerView
              tasks={filteredTasks}
              getDistributedMilestonesCount={getDistributedMilestonesCount}
              formatToSwissDate={formatToSwissDate}
              onOpenTask={(task) => setOpenTaskId(task.id)}
            />
          )}
        </div>
      </div>

      <CollapsibleCard title="Archive" icon={Archive} iconColor="text-primary" badge={archivedTasks.length ? `${archivedTasks.length}` : null}>
        {archivedTasks.length === 0 ? (
          <p className="text-sm text-black dark:text-white">Tasks you mark done land here, and stay on their project.</p>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {archivedTasks.map(t => (
              <div key={t.id} className="flex items-center gap-2 bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 rounded-lg p-2">
                <button onClick={() => setOpenTaskId(t.id)} className="flex-1 min-w-0 text-left">
                  <span className="block text-sm font-semibold text-black dark:text-white truncate">{t.name}</span>
                  <span className="block text-xs text-black dark:text-white truncate">
                    {projectName(t) || 'No project'}{t.completedAt ? ` · done ${formatToSwissDate(String(t.completedAt).slice(0, 10))}` : ''}
                  </span>
                </button>
                <button
                  onClick={() => handleUpdateTaskStatus(t.id, 'todo')}
                  aria-label={`Restore ${t.name} to the board`}
                  className="min-h-[40px] px-3 rounded-lg text-xs font-bold text-on-primary bg-primary active:bg-primary-hover flex items-center gap-1.5 flex-shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restore
                </button>
              </div>
            ))}
          </div>
        )}
      </CollapsibleCard>

      <div className="bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-black dark:text-white mb-4">14-day load forecast</h3>
        <div className="grid grid-cols-2 sm:grid-cols-7 lg:grid-cols-14 gap-2">
          {Array.from({ length: 14 }).map((_, idx) => {
            const targetDateObj = new Date();
            targetDateObj.setDate(targetDateObj.getDate() + idx);
            const formattedDateStr = targetDateObj.toISOString().split('T')[0];
            const milestonesValue = getDistributedMilestonesCount(formattedDateStr);
            const fillHeight = Math.min(100, (milestonesValue / 5) * 100);

            return (
              <div key={idx} className="bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 rounded-lg p-2 flex flex-col justify-between items-center text-center">
                <span className="text-[11px] text-black dark:text-white">
                  {targetDateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <div className="w-3 bg-gray-200 dark:bg-violet-400/10 h-16 rounded-full my-1.5 relative overflow-hidden flex items-end">
                  <div
                    className="w-full bg-primary rounded-full transition-all duration-500"
                    style={{ height: `${fillHeight || 8}%` }}
                  ></div>
                </div>
                <span className="text-xs font-medium text-black dark:text-white">{milestonesValue}</span>
                <span className="text-[11px] text-black dark:text-white">
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
          projects={projects}
          isOverdue={overdueIds.has(openTask.id)}
          formatToSwissDate={formatToSwissDate}
          onClose={() => setOpenTaskId(null)}
          onToggleSubtask={handleToggleSubtask}
          onSetStatus={handleUpdateTaskStatus}
          onUpdateTask={handleUpdateTask}
          onDelete={handleDeleteTask}
          onNavigateToProject={(projectId) => navigateTo('Projects', { projectId })}
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
