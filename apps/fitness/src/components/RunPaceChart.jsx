import { formatShortDate } from '../lib/model';
import { formatPace } from '../lib/stats';

// Pace (min/km) for each run, faster at the top, so an improving runner's line
// climbs. Dot size grows with distance; personal bests are ringed in magenta
// (achievement colour). Runs with no recorded time are left off the line.
export default function RunPaceChart({ runs }) {
  const pts = runs.filter(r => r.pace !== null);
  if (pts.length === 0) return null;
  const W = 320, H = 190, left = 40, right = 12, top = 14, bottom = 28;
  const values = pts.map(r => r.pace);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) { min -= 0.5; max += 0.5; }
  const pad = (max - min) * 0.2;
  const lo = min - pad;
  const hi = max + pad;
  const chartW = W - left - right;
  const chartH = H - top - bottom;
  const x = (i) => (pts.length === 1 ? left + chartW / 2 : left + (i / (pts.length - 1)) * chartW);
  const y = (v) => top + ((v - lo) / (hi - lo)) * chartH; // slower = lower
  const maxKm = Math.max(...pts.map(r => r.distance));
  const radius = (r) => 3 + (r.distance / maxKm) * 4;
  const ticks = [lo + (hi - lo) * 0.05, (lo + hi) / 2, hi - (hi - lo) * 0.05];

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Pace per run: ${pts.map(r => `${formatShortDate(r.date)} ${formatPace(r.pace)} per km over ${r.distance} km${r.isBestPace ? ', best pace' : ''}`).join('; ')}`}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} className="stroke-gray-200 dark:stroke-violet-400/20" strokeWidth="1" />
            <text x={left - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10" className="fill-black dark:fill-white">{formatPace(t)}</text>
          </g>
        ))}
        {pts.length > 1 && (
          <polyline
            points={pts.map((r, i) => `${x(i)},${y(r.pace)}`).join(' ')}
            fill="none" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="stroke-primary"
          />
        )}
        {pts.map((r, i) => (
          <g key={r.id}>
            {r.isBestPace && <circle cx={x(i)} cy={y(r.pace)} r={radius(r) + 5} className="fill-brand-magenta/30 stroke-brand-magenta" strokeWidth="2" />}
            <circle cx={x(i)} cy={y(r.pace)} r={radius(r)} className="fill-primary" />
          </g>
        ))}
        <text x={left} y={H - 8} fontSize="10" textAnchor="start" className="fill-black dark:fill-white">{formatShortDate(pts[0].date)}</text>
        {pts.length > 1 && (
          <text x={W - right} y={H - 8} fontSize="10" textAnchor="end" className="fill-black dark:fill-white">{formatShortDate(pts[pts.length - 1].date)}</text>
        )}
        <text x={4} y={9} fontSize="10" fontWeight="600" className="fill-black dark:fill-white">min/km</text>
      </svg>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-black dark:text-white">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" /> Run (bigger = longer)</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full border-2 border-brand-magenta bg-brand-magenta/30 inline-block" /> Best pace</span>
      </div>
    </div>
  );
}
