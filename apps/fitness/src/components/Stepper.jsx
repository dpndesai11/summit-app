import { Minus, Plus } from 'lucide-react';

// A number with − / + buttons. The field is 16px text (iPhone Safari zooms into
// smaller inputs) and the buttons are 48px tall for thumbs.
export default function Stepper({ label, value, onChange, step = 1, min = 0, unit }) {
  const bump = (dir) => onChange(Math.max(min, Number(value || 0) + dir * step));
  return (
    <div className="flex-1 min-w-0">
      <div className="text-sm font-semibold text-black dark:text-white mb-1 text-center">
        {label}{unit ? ` (${unit})` : ''}
      </div>
      <div className="flex items-center justify-between bg-gray-100 dark:bg-violet-400/10 rounded-xl overflow-hidden">
        <button onClick={() => bump(-1)} className="w-12 h-12 flex items-center justify-center text-black dark:text-white active:bg-gray-200 dark:active:bg-violet-400/20" aria-label={`decrease ${label}`}>
          <Minus className="w-5 h-5" />
        </button>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          aria-label={label}
          className="w-14 min-w-0 bg-transparent text-center text-base font-bold text-black dark:text-white outline-none"
        />
        <button onClick={() => bump(1)} className="w-12 h-12 flex items-center justify-center text-black dark:text-white active:bg-gray-200 dark:active:bg-violet-400/20" aria-label={`increase ${label}`}>
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
