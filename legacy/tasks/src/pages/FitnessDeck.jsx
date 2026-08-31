import { Trash2 } from 'lucide-react';
import { dayWorkoutList } from '../lib/planUtils';

export default function FitnessDeck({
  strengthLogs,
  cardioLogs,
  workoutTemplates,
  weeklyWorkoutPlan,
  daysOfWeek,
  workoutTemplateForm,
  setWorkoutTemplateForm,
  cardioForm,
  setCardioForm,
  getTotalKineticVolume,
  getTotalCardioMinutes,
  handleAddExerciseToDraft,
  handleRemoveDraftExercise,
  handleCreateWorkoutTemplate,
  handleDeleteTemplate,
  handleUpdateWeeklyWorkout,
  handleApplyWeekPreset,
  handleLogManualCardio,
  handleDeleteStrengthLog,
  handleDeleteCardioLog,
  REST_WEEK,
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-4 text-center">
          <span className="text-xs text-gray-400 dark:text-gray-500 block">Cumulative lift volume</span>
          <span className="text-2xl font-semibold text-gray-900 dark:text-gray-100 block my-1">
            {getTotalKineticVolume().toLocaleString()} kg
          </span>
        </div>
        <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-4 text-center">
          <span className="text-xs text-gray-400 dark:text-gray-500 block">Cardio minutes</span>
          <span className="text-2xl font-semibold text-gray-900 dark:text-gray-100 block my-1">
            {getTotalCardioMinutes()}
          </span>
        </div>
        <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-4 text-center">
          <span className="text-xs text-gray-400 dark:text-gray-500 block">Logged sessions</span>
          <span className="text-2xl font-semibold text-gray-900 dark:text-gray-100 block my-1">
            {strengthLogs.length + cardioLogs.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">

          <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Workout template builder</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Routine name</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 rounded-lg p-2.5 focus:outline-none focus:border-blue-500"
                  value={workoutTemplateForm.name}
                  onChange={(e) => setWorkoutTemplateForm({ ...workoutTemplateForm, name: e.target.value })}
                  placeholder="e.g. Back and biceps"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Add exercises</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 rounded-lg p-2 focus:outline-none focus:border-blue-500"
                    value={workoutTemplateForm.draftName}
                    onChange={(e) => setWorkoutTemplateForm({ ...workoutTemplateForm, draftName: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddExerciseToDraft()}
                    placeholder="e.g. Squat / Run / Swim"
                  />
                  <select
                    className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-lg px-2 focus:outline-none"
                    value={workoutTemplateForm.draftType}
                    onChange={(e) => setWorkoutTemplateForm({ ...workoutTemplateForm, draftType: e.target.value })}
                  >
                    <option value="gym">Gym</option>
                    <option value="run">Run</option>
                    <option value="swim">Swim</option>
                    <option value="bike">Bike</option>
                  </select>
                  <button type="button" onClick={handleAddExerciseToDraft} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 font-medium">
                    +
                  </button>
                </div>
                <textarea
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 rounded-lg p-2 focus:outline-none focus:border-blue-500 h-16 font-mono text-xs"
                  placeholder={"Or paste multiple (one per line):\nSquat\nBench Press\nDeadlift"}
                  value={workoutTemplateForm.pasteText || ''}
                  onChange={(e) => setWorkoutTemplateForm({ ...workoutTemplateForm, pasteText: e.target.value })}
                />
                {workoutTemplateForm.pasteText?.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      const lines = workoutTemplateForm.pasteText.split('\n').map(l => l.trim()).filter(Boolean);
                      const newExercises = lines.map(name => ({ name, type: workoutTemplateForm.draftType }));
                      setWorkoutTemplateForm(prev => ({ ...prev, exercises: [...prev.exercises, ...newExercises], pasteText: '' }));
                    }}
                    className="mt-1.5 w-full text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    Add all as {workoutTemplateForm.draftType}
                  </button>
                )}
              </div>

              {workoutTemplateForm.exercises.length > 0 && (
                <div className="space-y-1.5">
                  {workoutTemplateForm.exercises.map((ex, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-1.5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded border border-gray-300 dark:border-white/15 text-gray-500 dark:text-gray-400">{ex.type}</span>
                        <span className="text-gray-800 dark:text-gray-200 text-sm">{ex.name}</span>
                      </div>
                      <button type="button" onClick={() => handleRemoveDraftExercise(idx)} className="text-red-500 hover:text-red-600 text-xs font-bold px-1">✕</button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                disabled={!workoutTemplateForm.name.trim() || workoutTemplateForm.exercises.length === 0}
                onClick={handleCreateWorkoutTemplate}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save template
              </button>
            </div>

            <div className="mt-5 space-y-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block">Stored templates</span>
              {workoutTemplates.length === 0 ? (
                <span className="text-xs text-gray-400 italic">No templates created yet</span>
              ) : (
                workoutTemplates.map(t => {
                  const normEx = t.exercises.map(e => typeof e === 'string' ? { name: e, type: 'gym' } : e);
                  return (
                    <div key={t.id} className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 rounded-lg flex justify-between items-start">
                      <div>
                        <strong className="text-sm text-gray-800 dark:text-gray-200 block mb-1">{t.name}</strong>
                        <div className="flex flex-wrap gap-1">
                          {normEx.map((ex, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded border border-gray-300 dark:border-white/15 text-gray-500 dark:text-gray-400">
                              {ex.name} <span className="opacity-60">({ex.type})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteTemplate(t.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-1.5 rounded-full transition-colors flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Weekly training plan</h3>
              <button
                onClick={() => handleApplyWeekPreset(REST_WEEK)}
                className="text-xs font-medium px-2.5 py-1 rounded-full border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
              >
                Rest week
              </button>
            </div>
            <div className="space-y-2 text-sm">
              {daysOfWeek.map(day => (
                <div key={day} className="flex justify-between items-center bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-2.5 rounded-lg">
                  <span className="text-gray-800 dark:text-gray-200 font-medium">{day}</span>
                  <select
                    className="bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none"
                    value={dayWorkoutList(weeklyWorkoutPlan[day])[0] || 'Rest Day'}
                    onChange={(e) => handleUpdateWeeklyWorkout(day, e.target.value)}
                  >
                    <option value="Rest Day">Rest Day</option>
                    {workoutTemplates.map(tmpl => <option key={tmpl.id} value={tmpl.name}>{tmpl.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="space-y-6">

          <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Log cardio session</h3>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Activity</label>
                  <select
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-lg p-2.5 focus:outline-none"
                    value={cardioForm.activity}
                    onChange={(e) => setCardioForm({ ...cardioForm, activity: e.target.value })}
                  >
                    <option value="Running">Running</option>
                    <option value="Cycling">Cycling</option>
                    <option value="Swimming">Swimming</option>
                    <option value="Rowing">Rowing Machine</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Duration (min)</label>
                  <input
                    type="number"
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 rounded-lg p-2.5 focus:outline-none focus:border-blue-500"
                    value={cardioForm.duration}
                    onChange={(e) => setCardioForm({ ...cardioForm, duration: e.target.value })}
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Distance (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 rounded-lg p-2.5 focus:outline-none focus:border-blue-500"
                    value={cardioForm.distance}
                    onChange={(e) => setCardioForm({ ...cardioForm, distance: e.target.value })}
                    min="0"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogManualCardio}
                disabled={!cardioForm.duration || Number(cardioForm.duration) <= 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Log session
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">History</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">Strength</span>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {strengthLogs.length === 0 ? (
                    <span className="text-xs text-gray-400 italic">No records logged</span>
                  ) : (
                    strengthLogs.slice().reverse().map(log => (
                      <div key={log.id} className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-2 rounded-lg flex justify-between items-center text-xs">
                        <div>
                          <span className="font-medium text-gray-800 dark:text-gray-200 block">{log.exercise}</span>
                          <span className="text-gray-400">{log.weight}kg × {log.sets}×{log.reps}</span>
                        </div>
                        <button onClick={() => handleDeleteStrengthLog(log.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-1 rounded-full">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">Cardio</span>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {cardioLogs.length === 0 ? (
                    <span className="text-xs text-gray-400 italic">No records logged</span>
                  ) : (
                    cardioLogs.slice().reverse().map(log => (
                      <div key={log.id} className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-2 rounded-lg flex justify-between items-center text-xs">
                        <div>
                          <span className="font-medium text-gray-800 dark:text-gray-200 block">{log.activity}</span>
                          <span className="text-gray-400">{log.duration} min · {log.distance} km</span>
                        </div>
                        <button onClick={() => handleDeleteCardioLog(log.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-1 rounded-full">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
