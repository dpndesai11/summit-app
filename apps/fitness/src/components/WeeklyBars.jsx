import { useState } from 'react';
import { formatShortDate } from '../lib/model';

const METRICS = [
  { id: 'volume', label: 'Volume', format: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${Math.round(v)}kg`), title: 'Weight lifted' },
  { id: 'activeDays', label: 'Active days', format: (v) => String(v), title: 'Days with a workout or cardio' },
  { id: 'cardioMin', label: 'Cardio', format: (v) => `${Math.round(v)}m`, title: 'Cardio minutes' },
];

// One bar per week (Monday-start), oldest to newest, with a switch between
// weight lifted, active days and cardio minutes. Empty weeks stay as (near-)zero
// bars on purpose, so a deload week reads as a dip instead of disappearing.
// Text is plain black/white; the current week is the solid violet bar.
export default function WeeklyBars({ weeks }) {
  const [metricId, setMetricId] = useState('volume');
  const metric = METRICS.find(m => m.id === metricId);
  const values = weeks.map(w => w[metricId]);
  const max = Math.max(...values, 1);

  const W = 320, H = 168, padX = 6, top = 22, bottom = 26;
  const slot = (W - padX * 2) / weeks.length;
  const barW = slot * 0.62;
  const chartH = H - top - bottom;

  const current = weeks[weeks.length - 1];
  const previous = weeks[weeks.length - 2];

  return (
    <div className="bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15 p-4">
      <div className="flex bg-gray-100 dark:bg-violet-400/10 rounded-xl p-1 mb-3" role="tablist" aria-label="Chart metric">
        {METRICS.map(m => (
          <button
            key={m.id}
            role="tab"
            aria-selected={m.id === metricId}
            onClick={() => setMetricId(m.id)}
            className={`flex-1 min-h-[40px] rounded-lg text-sm font-semibold ${
              m.id === metricId ? 'bg-white dark:bg-[#211b34] text-black dark:text-white shadow-sm' : 'text-black dark:text-white'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mb-2">
        <div className="text-2xl font-bold text-black dark:text-white tabular-nums">{metric.format(current[metricId])}</div>
        <div className="text-sm text-black dark:text-white">
          this week · last week {metric.format(previous ? previous[metricId] : 0)}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`${metric.title}, last ${weeks.length} weeks: ${weeks.map(w => `${formatShortDate(w.weekStart)} ${metric.format(w[metricId])}`).join(', ')}`}
      >
        <line x1={padX} x2={W - padX} y1={top + chartH} y2={top + chartH} className="stroke-gray-200 dark:stroke-violet-400/25" strokeWidth="1" />
        {weeks.map((w, i) => {
          const v = w[metricId];
          const h = v > 0 ? Math.max(3, (v / max) * chartH) : 2;
          const x = padX + i * slot + (slot - barW) / 2;
          const y = top + chartH - h;
          const isCurrent = i === weeks.length - 1;
          const showLabel = v > 0 && (weeks.length <= 6 || isCurrent || i % 2 === 0 || v === max);
          return (
            <g key={w.weekStart}>
              <rect
                x={x} y={y} width={barW} height={h} rx="3"
                className={v === 0 ? 'fill-gray-200 dark:fill-violet-400/25' : isCurrent ? 'fill-violet-600' : 'fill-violet-400'}
              />
              {showLabel && (
                <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="10" fontWeight="600" className="fill-black dark:fill-white">
                  {metric.format(v)}
                </text>
              )}
              {(i % 3 === weeks.length % 3 || isCurrent) && (
                <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="10" className="fill-black dark:fill-white">
                  {formatShortDate(w.weekStart)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
