import { Calendar, CheckSquare, Dumbbell, AlertTriangle, Activity } from 'lucide-react';
import TodaysWorkoutPanel from '../components/TodaysWorkoutPanel';
import { dayWorkoutLabel } from '../lib/planUtils';

export default function Dashboard({
  tasks,
  overdueTasks,
  weeklyWorkoutPlan,
  workoutTemplates,
  todayDayName,
  strengthLogs,
  cardioLogs,
  setCurrentPage,
  getDistributedMilestonesCount,
  formatToSwissDate,
  handleToggleSubtask,
  handleCompleteTask,
  strengthLogInputs,
  setStrengthLogInputs,
  cardioLogInputs,
  setCardioLogInputs,
  justLogged,
  justLoggedCardio,
  strengthKey,
  handleLogStrengthFromHub,
  handleLogCardioFromHub,
}) {
  const activeTasks = tasks.filter(t => !t.isCompleted);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">

        <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Today</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {todayDayName} · {formatToSwissDate(new Date().toISOString().split('T')[0])}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-3 flex flex-col justify-between gap-2">
              <div>
                <span className="text-xs text-gray-400 dark:text-gray-500 block mb-0.5">Training today</span>
                <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">{dayWorkoutLabel(weeklyWorkoutPlan[todayDayName])}</span>
              </div>
              <button onClick={() => setCurrentPage('Fitness Dashboard')} className="text-xs font-medium text-blue-600 hover:text-blue-700 text-left">
                Open fitness →
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-3 flex flex-col justify-between gap-2">
              <div>
                <span className="text-xs text-gray-400 dark:text-gray-500 block mb-0.5">Active tasks</span>
                <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">{activeTasks.length} open</span>
                {overdueTasks.length > 0 && (
                  <span className="text-xs text-red-500 block mt-0.5">{overdueTasks.length} overdue</span>
                )}
              </div>
              <button onClick={() => setCurrentPage('Task Dashboard')} className="text-xs font-medium text-blue-600 hover:text-blue-700 text-left">
                Open tasks →
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-3">
              <span className="text-xs text-gray-400 dark:text-gray-500 block mb-1">Session log</span>
              <div className="text-sm text-gray-700 dark:text-gray-300 space-y-0.5">
                <div>Lifts: <span className="font-medium">{strengthLogs.length}</span></div>
                <div>Cardio: <span className="font-medium">{cardioLogs.length}</span></div>
              </div>
            </div>
          </div>
        </div>

        {overdueTasks.length > 0 && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-700 dark:text-red-400">
                {overdueTasks.length} task{overdueTasks.length > 1 ? 's' : ''} past deadline
              </h3>
              <p className="text-xs text-red-500 dark:text-red-400/80 mt-0.5">
                {overdueTasks.map(t => t.name).join(', ')}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-gray-400" />
              Today's training
            </h3>
            <button onClick={() => setCurrentPage('Fitness Dashboard')} className="text-xs text-gray-400 hover:text-blue-600">
              Full deck →
            </button>
          </div>
          <TodaysWorkoutPanel
            weeklyWorkoutPlan={weeklyWorkoutPlan}
            workoutTemplates={workoutTemplates}
            todayDayName={todayDayName}
            strengthLogInputs={strengthLogInputs}
            setStrengthLogInputs={setStrengthLogInputs}
            cardioLogInputs={cardioLogInputs}
            setCardioLogInputs={setCardioLogInputs}
            justLogged={justLogged}
            justLoggedCardio={justLoggedCardio}
            strengthKey={strengthKey}
            onLog={handleLogStrengthFromHub}
            onLogCardio={handleLogCardioFromHub}
          />
        </div>

        <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-gray-400" />
              Today's milestones
            </h3>
            <button onClick={() => setCurrentPage('Task Dashboard')} className="text-xs text-gray-400 hover:text-blue-600">
              All tasks →
            </button>
          </div>

          {activeTasks.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">No active tasks. Nice.</p>
          ) : (
            <div className="space-y-3">
              {activeTasks.map(task => {
                const progressPct = task.checklist.length > 0
                  ? Math.round((task.checklist.filter(item => item.isCompleted).length / task.checklist.length) * 100)
                  : 0;
                return (
                  <div key={task.id} className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 block">{task.name}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">Target: {formatToSwissDate(task.targetDate)}</span>
                      </div>
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full">
                        {progressPct}%
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 dark:bg-white/10 h-1 rounded-full mb-2 overflow-hidden">
                      <div className="bg-blue-600 h-full" style={{ width: `${progressPct}%` }}></div>
                    </div>

                    {task.checklist.length === 0 ? (
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-xs text-gray-400 italic">No checklist</span>
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          className="bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-600 text-blue-600 hover:text-white text-xs font-medium py-1 px-2.5 rounded-md transition-colors"
                        >
                          Complete
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mt-2">
                        {task.checklist.map(item => (
                          <label key={item.id} className="flex items-center gap-2 bg-white dark:bg-white/5 p-1.5 rounded-md border border-gray-200 dark:border-white/10 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.isCompleted}
                              onChange={() => handleToggleSubtask(task.id, item.id)}
                            />
                            <span className={`text-xs ${item.isCompleted ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                              {item.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            Coming up
          </h3>
          <div className="space-y-2">
            {[1, 2, 3].map(offset => {
              const nextDateObj = new Date();
              nextDateObj.setDate(nextDateObj.getDate() + offset);
              const nextDayName = nextDateObj.toLocaleDateString('en-US', { weekday: 'long' });
              const nextDateStr = nextDateObj.toISOString().split('T')[0];

              const assignedWorkout = dayWorkoutLabel(weeklyWorkoutPlan[nextDayName]);
              const activeMilestonesCount = getDistributedMilestonesCount(nextDateStr);

              return (
                <div key={offset} className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 rounded-lg">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{nextDayName}</span>
                    <span className="text-xs text-gray-400">{formatToSwissDate(nextDateStr)}</span>
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Training</span>
                      <span className="text-gray-700 dark:text-gray-300">{assignedWorkout}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Task load</span>
                      <span className="text-gray-700 dark:text-gray-300">{activeMilestonesCount} pts</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" />
            Status
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Workout templates</span>
              <span className="text-gray-700 dark:text-gray-300">{workoutTemplates.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Data</span>
              <span className="text-green-600 dark:text-green-500 font-medium">Synced</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
