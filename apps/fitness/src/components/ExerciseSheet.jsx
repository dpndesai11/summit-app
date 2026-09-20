import BottomSheet from './BottomSheet';
import TrendChart from './TrendChart';
import { parseExercise } from '../lib/exercises';
import { formatShortDate } from '../lib/model';

const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

// One exercise's history: its trend line, best / latest / sessions, and its most
// recent days. `summary` is one entry from exerciseSummaries(); null closes it.
export default function ExerciseSheet({ summary, onClose }) {
  const recent = summary ? [...summary.series].reverse().slice(0, 8) : [];
  return (
    <BottomSheet open={Boolean(summary)} onClose={onClose} title={summary ? parseExercise(summary.exercise).label : ''}>
      {summary && (
        <div className="space-y-4 pb-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ['Best', `${fmt(summary.best)}${summary.unit}`],
              ['Latest', `${fmt(summary.latest)}${summary.unit}`],
              ['Days logged', String(summary.sessions)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-gray-100 dark:bg-violet-400/10 py-2.5">
                <div className="text-xl font-bold text-black dark:text-white tabular-nums">{value}</div>
                <div className="text-sm text-black dark:text-white">{label}</div>
              </div>
            ))}
          </div>

          {summary.sessions > 1 ? (
            <TrendChart series={summary.series} unit={summary.unit} />
          ) : (
            <p className="text-base text-black dark:text-white">
              One day logged so far — log it again and a trend line appears.
            </p>
          )}

          <div>
            <h3 className="text-base font-bold text-black dark:text-white mb-1">Recent days</h3>
            <ul className="divide-y divide-gray-100 dark:divide-violet-400/15">
              {recent.map(p => (
                <li key={p.date} className="flex items-center justify-between min-h-[44px] text-base text-black dark:text-white">
                  <span>{formatShortDate(p.date)}</span>
                  <span className="font-semibold tabular-nums">
                    {fmt(p.value)}{p.unit}{p.isPR ? ' · PR' : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
