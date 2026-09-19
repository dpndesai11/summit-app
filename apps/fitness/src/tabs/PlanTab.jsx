import { Trash2, Plus, ChevronDown, X, MapPin, ClipboardList, Clock, Pencil } from 'lucide-react';
import { DEFAULT_PLAN, REST_WEEK, DAYS, dayList } from '../lib/model';
import { TYPE_META, cycleExerciseType } from '../lib/exercises';
import RouteThumb from '../components/RouteThumb';
import { CollapsibleCard } from '@summit/core';
import { routeDistanceKm } from '../lib/geo';

// Plan: the weekly plan editor, the workout templates and the saved routes.
export default function PlanTab({ w }) {
  const {
    templates,
    plan,
    routes,
    builder,
    setBuilder,
    builderOpen,
    setBuilderOpen,
    editingTemplateId,
    setPlannerOpen,
    todayName,
    updatePlan,
    getWorkoutTime,
    getWorkoutDuration,
    setWorkoutTime,
    setWorkoutDuration,
    deleteRoute,
    addDraftExercise,
    addBulkExercises,
    startEditTemplate,
    closeBuilder,
    saveTemplate,
    cycleTemplateExerciseType,
    deleteTemplate,
    addWorkoutToDay,
    removeWorkoutFromDay
  } = w;

  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-black dark:text-white text-sm">Weekly plan</span>
          <div className="flex gap-2">
            <button onClick={() => updatePlan(DEFAULT_PLAN)}
              className="text-[11px] font-medium text-violet-600 bg-violet-50 dark:bg-violet-500/10 px-2.5 py-1 rounded-lg active:bg-violet-100">
              Default
            </button>
            <button onClick={() => updatePlan(REST_WEEK)}
              className="text-[11px] font-medium text-black dark:text-white bg-gray-100 dark:bg-violet-400/10 px-2.5 py-1 rounded-lg active:bg-gray-200 dark:bg-violet-400/10">
              Rest week
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          {DAYS.map(day => {
            const assigned = dayList(plan[day]);
            const available = templates.filter(t => !assigned.includes(t.name));
            return (
              <div key={day}
                className={`flex items-start gap-3 rounded-xl px-3 py-2 ${day === todayName ? 'bg-violet-50 dark:bg-violet-500/10' : ''}`}>
                <span className={`text-xs w-12 flex-shrink-0 pt-1.5 ${day === todayName ? 'font-bold text-violet-600' : 'text-black dark:text-white'}`}>
                  {day.slice(0, 3)}{day === todayName ? ' •' : ''}
                </span>
                <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5">
                  {assigned.length === 0 && (
                    <span className="text-[11px] text-black dark:text-white py-1">Rest day</span>
                  )}
                  {assigned.map(name => (
                    <span key={name}
                      className="text-[11px] bg-violet-100 text-violet-700 rounded-full pl-2.5 pr-1 py-1 flex items-center gap-1.5 font-medium">
                      {name}
                      <span className="flex items-center gap-0.5 bg-white/60 dark:bg-violet-400/10 rounded-full pl-1.5 pr-0.5">
                        <Clock className="w-2.5 h-2.5 text-violet-500" />
                        <input
                          type="time"
                          value={getWorkoutTime(day, name)}
                          onChange={e => setWorkoutTime(day, name, e.target.value)}
                          className="bg-transparent text-[10px] text-violet-700 outline-none w-[52px]"
                          aria-label={`Time for ${name} on ${day}`}
                        />
                      </span>
                      <span className="flex items-center gap-0.5 bg-white/60 dark:bg-violet-400/10 rounded-full pl-1.5 pr-0.5">
                        <input
                          type="number" inputMode="numeric" min="5" step="5"
                          value={getWorkoutDuration(day, name)}
                          onChange={e => setWorkoutDuration(day, name, e.target.value)}
                          className="bg-transparent text-[10px] text-violet-700 outline-none w-[26px]"
                          aria-label={`Duration for ${name} on ${day}, in minutes`}
                        />
                        <span className="text-[9px] text-violet-500">min</span>
                      </span>
                      <button onClick={() => removeWorkoutFromDay(day, name)}
                        className="text-violet-400 active:text-red-500" aria-label={`Remove ${name} from ${day}`}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {available.length > 0 && (
                    <div className="relative">
                      <select
                        value=""
                        onChange={e => addWorkoutToDay(day, e.target.value)}
                        className="appearance-none bg-gray-100 dark:bg-violet-400/10 text-black dark:text-white rounded-full pl-2.5 pr-6 py-1 text-[11px] outline-none"
                        aria-label={`Add workout to ${day}`}
                      >
                        <option value="" disabled>+ Add</option>
                        {available.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                      </select>
                      <ChevronDown className="w-3 h-3 text-black dark:text-white absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CollapsibleCard
        title="Workouts"
        badge={`${templates.length}`}
        actions={
          <button onClick={() => (builderOpen ? closeBuilder() : setBuilderOpen(true))}
            className="flex items-center gap-1 text-[11px] font-medium text-violet-600 bg-violet-50 dark:bg-violet-500/10 px-2.5 py-1 rounded-lg active:bg-violet-100">
            {builderOpen ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {builderOpen ? 'Cancel' : 'New'}
          </button>
        }
      >
        {builderOpen && (
          <div className="bg-gray-50 dark:bg-violet-400/5 rounded-xl p-3 mb-3 space-y-2">
            <input
              value={builder.name}
              onChange={e => setBuilder(p => ({ ...p, name: e.target.value }))}
              placeholder="Workout name"
              className="w-full bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-violet-500"
            />

            <div className="flex bg-gray-200/60 dark:bg-violet-400/10 rounded-lg p-0.5">
              {[['list', 'Paste a list'], ['single', 'One at a time']].map(([mode, label]) => (
                <button key={mode}
                  onClick={() => setBuilder(p => ({ ...p, mode }))}
                  className={`flex-1 text-[11px] font-medium py-1.5 rounded-md ${
                    builder.mode === mode ? 'bg-white dark:bg-[#211b34] text-black dark:text-white shadow-sm' : 'text-black dark:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {builder.mode === 'list' ? (
              <>
                <textarea
                  value={builder.bulkText}
                  onChange={e => setBuilder(p => ({ ...p, bulkText: e.target.value }))}
                  placeholder={'One exercise per line, or comma-separated:\nSquat\nLeg Press, Calf Raise'}
                  rows={4}
                  className="w-full bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-violet-500 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setBuilder(p => ({ ...p, bulkType: cycleExerciseType(p.bulkType) }))}
                    className={`px-3 py-2 rounded-lg text-[11px] font-medium flex-shrink-0 flex items-center gap-1 ${TYPE_META[builder.bulkType].chip}`}
                    title="Tap to change type for the whole list"
                  >
                    {(() => { const Icon = TYPE_META[builder.bulkType].icon; return <Icon className="w-3.5 h-3.5" />; })()}
                    {TYPE_META[builder.bulkType].label}
                  </button>
                  <button onClick={addBulkExercises}
                    disabled={!builder.bulkText.trim()}
                    className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-xs font-semibold disabled:opacity-40 active:bg-gray-700 flex items-center justify-center gap-1">
                    <ClipboardList className="w-3.5 h-3.5" /> Add list
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <input
                  value={builder.draftName}
                  onChange={e => setBuilder(p => ({ ...p, draftName: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addDraftExercise()}
                  placeholder="Exercise"
                  className="flex-1 min-w-0 bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                />
                <button
                  onClick={() => setBuilder(p => ({ ...p, draftType: cycleExerciseType(p.draftType) }))}
                  className={`px-3 rounded-lg text-[11px] font-medium flex-shrink-0 flex items-center gap-1 ${TYPE_META[builder.draftType].chip}`}
                >
                  {(() => { const Icon = TYPE_META[builder.draftType].icon; return <Icon className="w-3.5 h-3.5" />; })()}
                  {TYPE_META[builder.draftType].label}
                </button>
                <button onClick={addDraftExercise}
                  className="bg-gray-900 text-white rounded-lg px-3 flex-shrink-0 active:bg-gray-700">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}

            {builder.exercises.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {builder.exercises.map((ex, i) => {
                  const meta = TYPE_META[ex.type] || TYPE_META.weight;
                  return (
                    <div key={i} className={`text-[11px] pl-2.5 pr-1 py-1 rounded-full flex items-center gap-1 ${meta.chip}`}>
                      <button
                        onClick={() => setBuilder(p => ({
                          ...p,
                          exercises: p.exercises.map((e, j) => j === i ? { ...e, type: cycleExerciseType(e.type) } : e)
                        }))}
                        className="flex items-center gap-1"
                        title="Tap to change type"
                      >
                        {ex.name}
                        <span className="opacity-70">· {meta.label}</span>
                      </button>
                      <button
                        onClick={() => setBuilder(p => ({ ...p, exercises: p.exercises.filter((_, j) => j !== i) }))}
                        aria-label={`Remove ${ex.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <button onClick={saveTemplate}
              disabled={!builder.name.trim() || builder.exercises.length === 0}
              className="w-full h-10 bg-violet-600 text-white rounded-lg text-sm font-semibold disabled:opacity-40 active:bg-violet-700">
              {editingTemplateId ? 'Save changes' : 'Create workout'}
            </button>
          </div>
        )}

        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="border border-gray-200 dark:border-violet-400/15 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-black dark:text-white">{t.name}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEditTemplate(t)} className="text-black dark:text-white active:text-violet-600 p-1" aria-label={`Edit ${t.name}`}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteTemplate(t.id)} className="text-black dark:text-white active:text-red-500 p-1" aria-label={`Delete ${t.name}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {t.exercises.map((ex, i) => (
                  <button key={i}
                    onClick={() => cycleTemplateExerciseType(t.id, i)}
                    className={`text-[10px] px-2 py-0.5 rounded-full ${(TYPE_META[ex.type] || TYPE_META.weight).badge}`}
                    title="Tap to change type"
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <p className="text-xs text-black dark:text-white text-center py-2">No workouts yet — create one above.</p>
          )}
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Routes"
        badge={routes.length > 0 ? `${routes.length}` : null}
        actions={
          <button onClick={() => setPlannerOpen(true)}
            className="flex items-center gap-1 text-[11px] font-medium text-violet-600 bg-violet-50 dark:bg-violet-500/10 px-2.5 py-1 rounded-lg active:bg-violet-100">
            <MapPin className="w-3 h-3" /> Plan route
          </button>
        }
      >
        {routes.length === 0 ? (
          <p className="text-xs text-black dark:text-white text-center py-2">
            No routes yet — plan one to make logging repeat runs a two-tap action.
          </p>
        ) : (
          <div className="space-y-2">
            {routes.map(r => (
              <div key={r.id} className="flex items-center gap-3 border border-gray-200 dark:border-violet-400/15 rounded-xl p-2.5">
                <RouteThumb waypoints={r.waypoints} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-black dark:text-white truncate">{r.name}</div>
                  <div className="text-[11px] text-black dark:text-white">
                    {r.activity} · {routeDistanceKm(r).toFixed(2)} km · {r.waypoints.length} points
                  </div>
                </div>
                <button onClick={() => deleteRoute(r.id)} className="text-black dark:text-white active:text-red-500 p-1 flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CollapsibleCard>
    </div>
  );
}
