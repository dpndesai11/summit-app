import { useState, useEffect } from 'react';
import { toISODate, getTodayFocusTasks } from '../lib/taskUtils';
import TaskDetailModal from '../components/TaskDetailModal';
import WeeklyReview from '../components/WeeklyReview';

export default function TodayFocus({
  tasks,
  projects,
  overdueTasks,
  dailySelections,
  weeklyReviewLog,
  formatToSwissDate,
  handleToggleSubtask,
  handleUpdateTaskStatus,
  handleUpdateTask,
  handleDeleteTask,
  handleToggleDailySelection,
  handleCompleteWeeklyReview,
  navigateTo,
  pendingNav,
  clearPendingNav,
}) {
  const [tab, setTab] = useState('focus'); // 'focus' | 'review'
  const [openTaskId, setOpenTaskId] = useState(null);

  // Deep link consumed during render rather than in a useEffect — see the
  // matching comment in TaskBoard.jsx for why.
  const [consumedNav, setConsumedNav] = useState(null);
  if (pendingNav && pendingNav !== consumedNav) {
    setConsumedNav(pendingNav);
    if (pendingNav.taskId) setOpenTaskId(pendingNav.taskId);
  }
  useEffect(() => {
    if (pendingNav) clearPendingNav();
  }, [pendingNav]);

  const todayISO = toISODate(new Date());
  const selectedToday = dailySelections[todayISO] || [];
  const overdueIds = new Set(overdueTasks.map(t => t.id));

  const focusTasks = getTodayFocusTasks(tasks, overdueTasks, selectedToday, todayISO);
  const openTasks = tasks.filter(t => !t.isCompleted);
  const openTask = tasks.find(t => t.id === openTaskId) || null;

  return (
    <div className="space-y-6">
      <div className="flex gap-1.5">
        {[{ id: 'focus', label: 'Focus' }, { id: 'review', label: 'Weekly Review' }].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
              tab === t.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'focus' ? (
        <>
          <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Today</h2>
            {focusTasks.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-600">Nothing due, overdue, or picked for today.</p>
            ) : (
              <div className="space-y-1.5">
                {focusTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-2.5"
                  >
                    <button onClick={() => setOpenTaskId(task.id)} className="text-left flex-1 min-w-0">
                      <span className={`text-sm block truncate ${task.isCompleted ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                        {task.name}
                      </span>
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {overdueIds.has(task.id) && (
                        <span className="text-[10px] font-medium text-red-600 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded">Overdue</span>
                      )}
                      {task.dueDate === todayISO && !overdueIds.has(task.id) && (
                        <span className="text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded">Due today</span>
                      )}
                      {selectedToday.includes(task.id) && (
                        <span className="text-[10px] font-medium text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded">Picked</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Pick today's focus</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              Deliberately choose what you're targeting today — separate from what's simply due.
            </p>
            {openTasks.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-600">No open tasks.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {openTasks.map(task => (
                  <label
                    key={task.id}
                    className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedToday.includes(task.id)}
                      onChange={() => handleToggleDailySelection(task.id)}
                    />
                    <span
                      onClick={(e) => { e.preventDefault(); setOpenTaskId(task.id); }}
                      className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1"
                    >
                      {task.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <WeeklyReview
          tasks={tasks}
          weeklyReviewLog={weeklyReviewLog}
          formatToSwissDate={formatToSwissDate}
          onCompleteReview={handleCompleteWeeklyReview}
        />
      )}

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
    </div>
  );
}
