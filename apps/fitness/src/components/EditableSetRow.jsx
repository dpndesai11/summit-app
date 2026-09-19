import { X } from 'lucide-react';

export default function EditableSetRow({ set, type = 'weight', onChange, onDelete }) {
  const isBodyweight = type === 'bodyweight';
  return (
    <div className="flex items-center gap-2 bg-white dark:bg-[#211b34] rounded-lg px-2.5 py-1.5 border border-gray-100 dark:border-violet-400/15">
      <span className="text-[10px] text-black dark:text-white w-10 flex-shrink-0">Set {set.setNumber}</span>
      {!isBodyweight && (
        <>
          <input
            type="number"
            inputMode="decimal"
            value={set.weight}
            onChange={e => onChange({ ...set, weight: e.target.value === '' ? '' : Number(e.target.value) })}
            className="w-14 bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 rounded-md text-center text-xs py-1 outline-none focus:border-violet-400"
          />
          <span className="text-[10px] text-black dark:text-white flex-shrink-0">kg ×</span>
        </>
      )}
      <input
        type="number"
        inputMode="numeric"
        value={set.reps}
        onChange={e => onChange({ ...set, reps: e.target.value === '' ? '' : Number(e.target.value) })}
        className="w-12 bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 rounded-md text-center text-xs py-1 outline-none focus:border-violet-400"
      />
      <span className="text-[10px] text-black dark:text-white flex-shrink-0">reps</span>
      <button onClick={onDelete} className="ml-auto text-black dark:text-white active:text-red-500 flex-shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
