import { X } from 'lucide-react';

const field = 'h-10 bg-gray-100 dark:bg-violet-400/10 rounded-lg text-center text-base font-semibold text-black dark:text-white outline-none focus:ring-2 focus:ring-violet-500';

// One set in a logged exercise, editable in History. Lifts show weight × reps;
// bodyweight shows reps; a set logged from the drill timer shows seconds.
export default function EditableSetRow({ set, type = 'weight', onChange, onDelete }) {
  const isBodyweight = type === 'bodyweight';
  const timed = isBodyweight && Number(set.seconds) > 0 && !(Number(set.reps) > 0);
  const num = (v) => (v === '' ? '' : Number(v));
  return (
    <div className="flex items-center gap-2 bg-white dark:bg-[#211b34] rounded-xl px-3 py-1.5 border border-gray-100 dark:border-violet-400/15">
      <span className="text-sm font-medium text-black dark:text-white w-12 flex-shrink-0">Set {set.setNumber}</span>
      {!isBodyweight && (
        <>
          <input
            type="number"
            inputMode="decimal"
            value={set.weight}
            aria-label={`Set ${set.setNumber} weight in kg`}
            onChange={e => onChange({ ...set, weight: num(e.target.value) })}
            className={`${field} w-16`}
          />
          <span className="text-sm text-black dark:text-white flex-shrink-0">kg ×</span>
        </>
      )}
      {timed ? (
        <>
          <input
            type="number"
            inputMode="numeric"
            value={set.seconds}
            aria-label={`Set ${set.setNumber} seconds`}
            onChange={e => onChange({ ...set, seconds: num(e.target.value) })}
            className={`${field} w-16`}
          />
          <span className="text-sm text-black dark:text-white flex-shrink-0">sec{set.perSide ? '/side' : ''}</span>
        </>
      ) : (
        <>
          <input
            type="number"
            inputMode="numeric"
            value={set.reps}
            aria-label={`Set ${set.setNumber} reps`}
            onChange={e => onChange({ ...set, reps: num(e.target.value) })}
            className={`${field} w-14`}
          />
          <span className="text-sm text-black dark:text-white flex-shrink-0">reps</span>
        </>
      )}
      <button onClick={onDelete} aria-label={`Delete set ${set.setNumber}`}
        className="ml-auto w-10 h-10 flex items-center justify-center text-black dark:text-white active:text-red-500 flex-shrink-0">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
