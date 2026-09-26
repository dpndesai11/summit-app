import { formatSwiss } from '../lib/model';
import { HEATMAP_WEEKS, heatmapWeeks } from '../lib/stats';

// One habit's 10-week consistency heatmap — same grid Fitness's
// StreakCalendar draws, just done/not-done for a single habit instead of
// strength/cardio presence.
export default function StreakCalendar({ habitId, habitLogs, colorClass }) {
  const weeks = heatmapWeeks(habitId, habitLogs);
  const dayLabels = ['', 'M', '', 'W', '', 'F', ''];

  const cellClass = (cell) => {
    if (cell.isFuture) return 'bg-transparent';
    if (cell.done) return colorClass;
    return 'bg-gray-100 dark:bg-violet-400/10';
  };

  return (
    <div className="flex gap-1.5 items-start">
      <div className="flex flex-col gap-[3px]">
        {dayLabels.map((l, i) => (
          <div key={i} className="w-3 h-3 text-[8px] leading-3 text-black dark:text-white">{l}</div>
        ))}
      </div>
      <div className="flex gap-[3px] overflow-x-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px] flex-shrink-0">
            {week.map(cell => (
              <div key={cell.iso} title={formatSwiss(cell.iso)} className={`w-3 h-3 rounded-sm ${cellClass(cell)}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export { HEATMAP_WEEKS };
