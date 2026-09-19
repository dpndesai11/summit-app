import { useState } from 'react';
import { Plus, X, ClipboardList, Trash2 } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { TYPE_META, cycleExerciseType, parseExercise } from '../lib/exercises';

const inputClass = 'w-full bg-gray-100 dark:bg-violet-400/10 rounded-xl px-4 py-3 text-base text-black dark:text-white outline-none focus:ring-2 focus:ring-violet-500';

// Create or edit a workout (template): its name and exercises. Same builder
// behaviour as before — paste a list or add one at a time, tap an exercise's
// type to cycle weight / bodyweight / cardio — but in a sheet with full-size
// inputs, and exercise names shown cleanly (prescription split out for display;
// the stored name is unchanged).
export default function TemplateSheet({ w }) {
  const {
    builder, setBuilder, builderOpen, editingTemplateId, closeBuilder, saveTemplate,
    addDraftExercise, addBulkExercises, deleteTemplate,
  } = w;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const close = () => { setConfirmDelete(false); closeBuilder(); };

  return (
    <BottomSheet open={builderOpen} onClose={close} title={editingTemplateId ? 'Edit workout' : 'New workout'}>
      <div className="space-y-4 pb-2">
        <label className="block">
          <span className="block text-base font-bold text-black dark:text-white mb-1.5">Name</span>
          <input
            value={builder.name}
            onChange={e => setBuilder(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Gym 1 — Push + Pull"
            className={inputClass}
          />
        </label>

        <div>
          <span className="block text-base font-bold text-black dark:text-white mb-1.5">Exercises</span>
          {builder.exercises.length === 0 ? (
            <p className="text-base text-black dark:text-white mb-2">None yet — add some below.</p>
          ) : (
            <ul className="mb-2 divide-y divide-gray-100 dark:divide-violet-400/15">
              {builder.exercises.map((ex, i) => {
                const meta = TYPE_META[ex.type] || TYPE_META.weight;
                const Icon = meta.icon;
                const p = parseExercise(ex.name);
                return (
                  <li key={i} className="flex items-center gap-2 min-h-[48px] py-1">
                    <button
                      onClick={() => setBuilder(prev => ({
                        ...prev,
                        exercises: prev.exercises.map((e, j) => (j === i ? { ...e, type: cycleExerciseType(e.type) } : e)),
                      }))}
                      className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                      title="Tap to change type"
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 ${meta.iconText}`} />
                      <span className="min-w-0">
                        <span className="block text-base font-medium text-black dark:text-white truncate">{p.label}</span>
                        {p.prescription && <span className="block text-sm text-black dark:text-white">{p.prescription}</span>}
                      </span>
                    </button>
                    <span className="text-sm font-semibold text-black dark:text-white flex-shrink-0">{meta.label}</span>
                    <button
                      onClick={() => setBuilder(prev => ({ ...prev, exercises: prev.exercises.filter((_, j) => j !== i) }))}
                      aria-label={`Remove ${p.label}`}
                      className="w-10 h-10 flex items-center justify-center text-black dark:text-white active:text-red-500 flex-shrink-0"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex bg-gray-100 dark:bg-violet-400/10 rounded-xl p-1 mb-3">
            {[['list', 'Paste a list'], ['single', 'One at a time']].map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setBuilder(p => ({ ...p, mode }))}
                className={`flex-1 min-h-[40px] text-sm font-semibold rounded-lg ${
                  builder.mode === mode ? 'bg-white dark:bg-[#211b34] text-black dark:text-white shadow-sm' : 'text-black dark:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {builder.mode === 'list' ? (
            <div className="space-y-2">
              <textarea
                value={builder.bulkText}
                onChange={e => setBuilder(p => ({ ...p, bulkText: e.target.value }))}
                placeholder={'One exercise per line, or comma-separated:\nSquat\nLeg Press, Calf Raise'}
                rows={4}
                className={`${inputClass} resize-none`}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setBuilder(p => ({ ...p, bulkType: cycleExerciseType(p.bulkType) }))}
                  className="min-h-[48px] px-4 rounded-xl bg-gray-100 dark:bg-violet-400/10 text-base font-semibold text-black dark:text-white flex items-center gap-2 flex-shrink-0"
                  title="Tap to change type for the whole list"
                >
                  {(() => { const Icon = TYPE_META[builder.bulkType].icon; return <Icon className={`w-5 h-5 ${TYPE_META[builder.bulkType].iconText}`} />; })()}
                  {TYPE_META[builder.bulkType].label}
                </button>
                <button
                  onClick={addBulkExercises}
                  disabled={!builder.bulkText.trim()}
                  className="flex-1 min-h-[48px] rounded-xl bg-violet-600 text-white text-base font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <ClipboardList className="w-5 h-5" /> Add list
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={builder.draftName}
                onChange={e => setBuilder(p => ({ ...p, draftName: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addDraftExercise()}
                placeholder="Exercise"
                className={`${inputClass} flex-1 min-w-0`}
              />
              <button
                onClick={() => setBuilder(p => ({ ...p, draftType: cycleExerciseType(p.draftType) }))}
                className="min-h-[48px] px-3 rounded-xl bg-gray-100 dark:bg-violet-400/10 text-sm font-semibold text-black dark:text-white flex items-center gap-1.5 flex-shrink-0"
              >
                {(() => { const Icon = TYPE_META[builder.draftType].icon; return <Icon className={`w-5 h-5 ${TYPE_META[builder.draftType].iconText}`} />; })()}
                {TYPE_META[builder.draftType].label}
              </button>
              <button onClick={addDraftExercise} aria-label="Add exercise"
                className="w-12 min-h-[48px] rounded-xl bg-violet-600 text-white flex items-center justify-center flex-shrink-0">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => { saveTemplate(); setConfirmDelete(false); }}
          disabled={!builder.name.trim() || builder.exercises.length === 0}
          className="w-full min-h-[52px] rounded-xl bg-violet-600 text-white text-base font-bold disabled:opacity-40"
        >
          {editingTemplateId ? 'Save changes' : 'Create workout'}
        </button>

        {editingTemplateId && (
          <button
            onClick={() => {
              if (!confirmDelete) { setConfirmDelete(true); return; }
              deleteTemplate(editingTemplateId);
              close();
            }}
            className="w-full min-h-[48px] rounded-xl border border-red-500 text-black dark:text-white text-base font-semibold flex items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5 text-red-500" />
            {confirmDelete ? 'Tap again to delete this workout' : 'Delete workout'}
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
