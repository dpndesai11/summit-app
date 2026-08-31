import { useState } from 'react';
import ChecklistEditor from './ChecklistEditor';
import TagInput from './TagInput';

const PRIORITIES = ['High', 'Medium', 'Low'];

// Local draft state that's only ever written to `tasks` on Save — Cancel
// just discards this component, so "cancel discards changes" is structural
// rather than something each field has to implement. The parent renders
// this with `key={task.id}` so switching tasks remounts it with a fresh
// draft instead of needing an effect to resync state.
export default function TaskEditForm({ task, projects, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => structuredClone(task));

  const setField = (field, value) => setDraft(d => ({ ...d, [field]: value }));
  const setProperty = (key, value) => setDraft(d => ({ ...d, properties: { ...d.properties, [key]: value } }));

  return (
    <div className="space-y-4 text-sm">
      <div>
        <label className="block text-xs font-medium text-black dark:text-white mb-1">Name</label>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => setField('name', e.target.value)}
          autoFocus
          className="w-full bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 text-black dark:text-white rounded-lg p-2.5 focus:outline-none focus:border-violet-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-black dark:text-white mb-1">Deadline</label>
          <input
            type="date"
            value={draft.dueDate || ''}
            onChange={(e) => setField('dueDate', e.target.value)}
            className="w-full bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 text-black dark:text-white rounded-lg p-2.5 focus:outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-black dark:text-white mb-1">Target date</label>
          <input
            type="date"
            value={draft.targetDate || ''}
            onChange={(e) => setField('targetDate', e.target.value)}
            className="w-full bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 text-black dark:text-white rounded-lg p-2.5 focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-black dark:text-white mb-1">Notes</label>
        <textarea
          value={draft.notes}
          onChange={(e) => setField('notes', e.target.value)}
          className="w-full bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 text-black dark:text-white rounded-lg p-2.5 focus:outline-none focus:border-violet-500 h-20"
        />
      </div>

      <ChecklistEditor
        items={draft.checklist}
        onChange={(checklist) => setField('checklist', checklist)}
      />

      <TagInput tags={draft.tags || []} onChange={(tags) => setField('tags', tags)} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-black dark:text-white mb-1">Priority</label>
          <div className="flex gap-1.5">
            {PRIORITIES.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setProperty('priority', draft.properties?.priority === p ? null : p)}
                className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                  draft.properties?.priority === p
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-100 dark:bg-violet-400/10 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-white/20'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-black dark:text-white mb-1">Project</label>
          <select
            value={draft.properties?.projectId ?? ''}
            onChange={(e) => setProperty('projectId', e.target.value ? Number(e.target.value) : null)}
            className="w-full bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 text-black dark:text-white rounded-lg p-2 text-xs focus:outline-none focus:border-violet-500"
          >
            <option value="">No project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 text-sm font-medium px-3 py-2 rounded-lg border border-gray-200 dark:border-violet-400/15 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-violet-400/10 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(task.id, draft)}
          disabled={!draft.name.trim()}
          className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </div>
    </div>
  );
}
