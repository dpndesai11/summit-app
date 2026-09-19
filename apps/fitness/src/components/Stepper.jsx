import { Plus, Minus } from 'lucide-react';

export default function Stepper({ label, value, onChange, step = 1, min = 0, unit }) {
  const bump = (dir) => onChange(Math.max(min, Number(value || 0) + dir * step));
  return (
    <div className="flex-1 min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-black dark:text-white mb-1 text-center">
        {label}{unit ? ` (${unit})` : ''}
      </div>
      <div className="flex items-center justify-between bg-gray-100 dark:bg-violet-400/10 rounded-xl overflow-hidden">
        <button onClick={() => bump(-1)} className="p-3 text-black dark:text-white active:bg-gray-200 dark:bg-violet-400/10" aria-label={`decrease ${label}`}>
          <Minus className="w-4 h-4" />
        </button>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-12 bg-transparent text-center text-sm font-semibold text-black dark:text-white outline-none"
        />
        <button onClick={() => bump(1)} className="p-3 text-black dark:text-white active:bg-gray-200 dark:bg-violet-400/10" aria-label={`increase ${label}`}>
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
