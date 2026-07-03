
export default function TodaysWorkoutPanel({
  weeklyWorkoutPlan,
  workoutTemplates,
  todayDayName,
  strengthLogInputs,
  setStrengthLogInputs,
  cardioLogInputs,
  setCardioLogInputs,
  justLogged,
  justLoggedCardio,
  strengthKey,
  onLog,
  onLogCardio
}) {
  const todaysRoutine = weeklyWorkoutPlan[todayDayName];

  if (!todaysRoutine || todaysRoutine === 'None' || todaysRoutine === 'Rest Day') {
    return (
      <div className="text-center py-6">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Rest day</span>
        <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 block">No training scheduled today.</span>
      </div>
    );
  }

  const activeTemplate = workoutTemplates.find(t => t.name === todaysRoutine);
  if (!activeTemplate || !activeTemplate.exercises.length) {
    return (
      <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
        No exercises found in "{todaysRoutine}"
      </div>
    );
  }

  const normalizeEx = (ex) => typeof ex === 'string' ? { name: ex, type: 'gym' } : ex;
  const isCardio = (type) => ['run', 'swim', 'bike'].includes(type);

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg px-3 py-2 flex justify-between items-center">
        <span className="text-sm font-medium text-blue-900 dark:text-blue-300">{todaysRoutine}</span>
        <span className="bg-blue-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">Today</span>
      </div>

      <div className="space-y-2">
        {activeTemplate.exercises.map((rawEx, index) => {
          const ex = normalizeEx(rawEx);
          const key = strengthKey(todaysRoutine, ex.name);

          if (isCardio(ex.type)) {
            const mins = cardioLogInputs[key]?.minutes ?? 30;
            const isLocked = justLoggedCardio[key];
            return (
              <div key={index} className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border border-gray-300 dark:border-white/15 text-gray-500 dark:text-gray-400">{ex.type}</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{ex.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="bg-white dark:bg-[#252525] border border-gray-300 dark:border-white/15 text-gray-800 dark:text-gray-200 rounded-md px-2 py-1 text-sm w-16"
                    value={mins}
                    onChange={(e) => setCardioLogInputs(prev => ({ ...prev, [key]: { minutes: e.target.value } }))}
                    min="1"
                  />
                  <span className="text-xs text-gray-400">min</span>
                  <button
                    type="button"
                    onClick={() => onLogCardio(todaysRoutine, ex.name)}
                    className={`text-xs font-medium py-1.5 px-3 rounded-md transition-colors ${
                      isLocked ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isLocked ? 'Logged' : 'Log'}
                  </button>
                </div>
              </div>
            );
          }

          const userInputs = strengthLogInputs[key] || { weight: 40, sets: 3, reps: 8 };
          const isLocked = justLogged[key];
          return (
            <div key={index} className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200 min-w-[130px]">{ex.name}</span>
              <div className="flex gap-2 w-full md:w-auto">
                {['weight', 'sets', 'reps'].map(field => (
                  <div key={field} className="flex-1 md:flex-initial">
                    <input
                      type="number"
                      className="bg-white dark:bg-[#252525] border border-gray-300 dark:border-white/15 text-gray-800 dark:text-gray-200 rounded-md px-2 py-1 text-sm w-full md:w-14"
                      value={userInputs[field]}
                      onChange={(e) => setStrengthLogInputs(prev => ({ ...prev, [key]: { ...userInputs, [field]: e.target.value } }))}
                      min={field === 'weight' ? '0' : '1'}
                      step={field === 'weight' ? '0.5' : '1'}
                      title={field}
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onLog(todaysRoutine, ex.name)}
                className={`w-full md:w-auto text-xs font-medium py-1.5 px-3 rounded-md transition-colors ${
                  isLocked ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isLocked ? 'Logged' : 'Log set'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
