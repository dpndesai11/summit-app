import { useState } from 'react';
import { ArrowUpRight, Lightbulb, Plus, Trash2 } from 'lucide-react';
import { CollapsibleCard } from '@summit/core';

// Someday: a plain list for ideas that show up mid-block. Capturing one here keeps it off
// the board. Each idea is a normal todo task carrying the `someday` tag (see taskUtils);
// "Move to board" just drops the tag, and the task then lands on the board as To Do.
export default function SomedayCard({ ideas, onAdd, onPromote, onDelete }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    if (!draft.trim()) return;
    onAdd(draft);
    setDraft('');
  };

  return (
    <CollapsibleCard title="Someday" icon={Lightbulb} iconColor="text-primary" badge={ideas.length ? `${ideas.length}` : null}>
      <div className="space-y-3">
        <p className="text-sm text-black dark:text-white">
          An idea mid-block? Park it here, not on the board. It moves onto the board only when you choose.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Capture an idea"
            aria-label="Capture an idea"
            className="flex-1 min-w-0 bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 text-black dark:text-white rounded-lg p-2.5 text-base focus:outline-none focus:border-focus-ring"
          />
          <button
            onClick={add}
            disabled={!draft.trim()}
            aria-label="Add idea"
            className="w-12 min-h-[44px] rounded-lg bg-primary text-on-primary flex items-center justify-center disabled:opacity-40 flex-shrink-0"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        {ideas.length === 0 ? (
          <p className="text-sm text-black dark:text-white">No ideas parked.</p>
        ) : (
          <div className="space-y-1.5">
            {ideas.map(t => (
              <div key={t.id} className="flex items-center gap-2 bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 rounded-lg p-2">
                <span className="flex-1 min-w-0 text-sm text-black dark:text-white break-words">{t.name}</span>
                <button
                  onClick={() => onPromote(t.id)}
                  aria-label={`Move ${t.name} to the board`}
                  className="min-h-[40px] px-2.5 rounded-lg text-xs font-bold text-on-primary bg-primary flex items-center gap-1 flex-shrink-0 active:bg-primary-hover"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" /> Board
                </button>
                <button
                  onClick={() => onDelete(t.id)}
                  aria-label={`Delete ${t.name}`}
                  className="w-10 h-10 flex items-center justify-center text-black dark:text-white active:text-danger flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
