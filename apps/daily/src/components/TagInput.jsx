import { useState } from 'react';
import { X } from 'lucide-react';

// Freeform tag chip input — type + Enter/comma to add, click x to remove.
export default function TagInput({ tags, onChange }) {
  const [draft, setDraft] = useState('');

  const addTag = () => {
    const value = draft.trim();
    if (!value || tags.includes(value)) { setDraft(''); return; }
    onChange([...tags, value]);
    setDraft('');
  };

  const removeTag = (tag) => onChange(tags.filter(t => t !== tag));

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tags</label>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {tags.map(tag => (
          <span
            key={tag}
            className="flex items-center gap-1 text-[11px] font-medium bg-gray-100 dark:bg-violet-400/10 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full"
          >
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
        }}
        onBlur={addTag}
        placeholder="Add a tag, press Enter"
        className="w-full bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-xs focus:outline-none focus:border-violet-500"
      />
    </div>
  );
}
