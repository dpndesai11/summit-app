import { useState } from 'react';
import { Plus, X, ChevronUp, ChevronDown, SlidersHorizontal } from 'lucide-react';

// Add/remove/reorder/reweight checklist rows. Only ever maps/filters/splices
// the incoming `items` array, so untouched rows keep their `id`/`isCompleted`
// — callers relying on that (e.g. edit-then-save not resetting progress)
// don't need to do anything special.
export default function ChecklistEditor({ items, onChange }) {
  const [showWeights, setShowWeights] = useState(false);
  const [draftName, setDraftName] = useState('');

  const addItem = () => {
    if (!draftName.trim()) return;
    onChange([
      ...items,
      { id: Date.now() + Math.random(), name: draftName.trim(), isCompleted: false, weight: 1 },
    ]);
    setDraftName('');
  };

  const removeItem = (id) => onChange(items.filter(i => i.id !== id));

  const renameItem = (id, name) => onChange(items.map(i => i.id === id ? { ...i, name } : i));

  const reweightItem = (id, weight) => onChange(
    items.map(i => i.id === id ? { ...i, weight: Math.max(1, Number(weight) || 1) } : i)
  );

  const moveItem = (idx, direction) => {
    const target = idx + direction;
    if (target < 0 || target >= items.length) return;
    const updated = [...items];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    onChange(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-medium text-black dark:text-white">Checklist</label>
        <button
          type="button"
          onClick={() => setShowWeights(s => !s)}
          className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md transition-colors ${
            showWeights
              ? 'bg-violet-600 text-white'
              : 'text-black dark:text-white hover:bg-gray-100 dark:hover:bg-violet-400/10'
          }`}
        >
          <SlidersHorizontal className="w-3 h-3" />
          Weights
        </button>
      </div>

      <div className="space-y-1.5 mb-2">
        {items.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-1.5">
            <div className="flex flex-col -space-y-1">
              <button type="button" onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="text-black dark:text-white disabled:opacity-30 hover:text-black dark:hover:text-black">
                <ChevronUp className="w-3 h-3" />
              </button>
              <button type="button" onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1} className="text-black dark:text-white disabled:opacity-30 hover:text-black dark:hover:text-black">
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            <input
              type="text"
              value={item.name}
              onChange={(e) => renameItem(item.id, e.target.value)}
              className="flex-1 bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 text-black dark:text-white rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-violet-500"
            />
            {showWeights && (
              <input
                type="number"
                min="1"
                value={item.weight ?? 1}
                onChange={(e) => reweightItem(item.id, e.target.value)}
                title="Weight"
                className="w-14 bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 text-black dark:text-white rounded-md px-1.5 py-1.5 text-xs text-center focus:outline-none focus:border-violet-500"
              />
            )}
            <button type="button" onClick={() => removeItem(item.id)} className="text-black dark:text-white hover:text-red-500">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
          placeholder="Add checklist item"
          className="flex-1 bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 text-black dark:text-white rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-violet-500"
        />
        <button
          type="button"
          onClick={addItem}
          disabled={!draftName.trim()}
          className="flex items-center gap-1 text-xs font-medium bg-gray-100 dark:bg-violet-400/10 hover:bg-gray-200 dark:hover:bg-white/20 text-black dark:text-white px-2 py-1.5 rounded-md disabled:opacity-40 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>
    </div>
  );
}
