import { formatShortDate } from '../lib/model';

// A line of your best weight (or reps / seconds) per training day for one
// exercise, with real personal records ringed in amber. Inline SVG; text is
// plain black/white.
export default function TrendChart({ series, unit }) {
  const W = 320, H = 190, left = 40, right = 12, top = 14, bottom = 28;
  const values = series.map(p => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.15;
  const lo = Math.max(0, min - pad);
  const hi = max + pad;
  const chartW = W - left - right;
  const chartH = H - top - bottom;
  const x = (i) => (series.length === 1 ? left + chartW / 2 : left + (i / (series.length - 1)) * chartW);
  const y = (v) => top + chartH - ((v - lo) / (hi - lo)) * chartH;
  const ticks = [lo + (hi - lo) * 0.05, (lo + hi) / 2, hi - (hi - lo) * 0.05];
  const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Best ${unit} per session: ${series.map(p => `${formatShortDate(p.date)} ${fmt(p.value)}${p.isPR ? ' personal record' : ''}`).join(', ')}`}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} className="stroke-gray-200 dark:stroke-violet-400/20" strokeWidth="1" />
            <text x={left - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10" className="fill-black dark:fill-white">{fmt(Math.round(t * 2) / 2)}</text>
          </g>
        ))}
        {series.length > 1 && (
          <polyline
            points={series.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}
            fill="none" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="stroke-violet-600"
          />
        )}
        {series.map((p, i) => (
          <g key={p.date}>
            {p.isPR && <circle cx={x(i)} cy={y(p.value)} r="8" className="fill-amber-400/30 stroke-amber-500" strokeWidth="2" />}
            <circle cx={x(i)} cy={y(p.value)} r="3.5" className="fill-violet-600" />
          </g>
        ))}
        <text x={left} y={H - 8} fontSize="10" textAnchor="start" className="fill-black dark:fill-white">{formatShortDate(series[0].date)}</text>
        {series.length > 1 && (
          <text x={W - right} y={H - 8} fontSize="10" textAnchor="end" className="fill-black dark:fill-white">{formatShortDate(series[series.length - 1].date)}</text>
        )}
        <text x={4} y={H - 8} fontSize="10" fontWeight="600" className="fill-black dark:fill-white">{unit}</text>
      </svg>
      <div className="flex items-center gap-4 mt-1 text-sm text-black dark:text-white">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-600 inline-block" /> Session</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full border-2 border-amber-500 bg-amber-400/30 inline-block" /> Personal record</span>
      </div>
    </div>
  );
}
