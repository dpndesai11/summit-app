import { formatShortDate } from '../lib/model';

// Net worth over time — same inline-SVG-line convention as Fitness's
// TrendChart (no chart library), simplified to one series with no PR rings.
export default function TrendChart({ series, unit }) {
  const W = 320, H = 190, left = 44, right = 12, top = 14, bottom = 28;
  const values = series.map(p => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.15;
  const lo = min - pad;
  const hi = max + pad;
  const chartW = W - left - right;
  const chartH = H - top - bottom;
  const x = (i) => (series.length === 1 ? left + chartW / 2 : left + (i / (series.length - 1)) * chartW);
  const y = (v) => top + chartH - ((v - lo) / (hi - lo)) * chartH;
  const ticks = [lo + (hi - lo) * 0.05, (lo + hi) / 2, hi - (hi - lo) * 0.05];
  const fmt = (v) => Math.round(v).toLocaleString();

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Net worth over time: ${series.map(p => `${formatShortDate(p.date)} ${unit}${fmt(p.value)}`).join(', ')}`}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} className="stroke-gray-200 dark:stroke-violet-400/20" strokeWidth="1" />
            <text x={left - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10" className="fill-black dark:fill-white">{fmt(t)}</text>
          </g>
        ))}
        {series.length > 1 && (
          <polyline
            points={series.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}
            fill="none" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="stroke-violet-600"
          />
        )}
        {series.map((p, i) => (
          <circle key={p.date} cx={x(i)} cy={y(p.value)} r="3.5" className="fill-violet-600" />
        ))}
        <text x={left} y={H - 8} fontSize="10" textAnchor="start" className="fill-black dark:fill-white">{formatShortDate(series[0].date)}</text>
        {series.length > 1 && (
          <text x={W - right} y={H - 8} fontSize="10" textAnchor="end" className="fill-black dark:fill-white">{formatShortDate(series[series.length - 1].date)}</text>
        )}
        <text x={4} y={H - 8} fontSize="10" fontWeight="600" className="fill-black dark:fill-white">{unit}</text>
      </svg>
    </div>
  );
}
