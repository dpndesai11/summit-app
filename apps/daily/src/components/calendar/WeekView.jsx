import { useEffect, useRef } from 'react';
import {
  BLOCK_COLOR_PRESETS, EVENT_COLORS, dayItems, formatHour, layoutLanes, normalizeBlockDays, timeToMinutes, toISODate, weekdayName,
} from '../../lib/calendar';

const START_MIN = 6 * 60;
const END_MIN = 22 * 60;
const HOURS = Array.from({ length: (END_MIN - START_MIN) / 60 + 1 }, (_, i) => START_MIN / 60 + i);
const HOUR_PX = 48;
const COL_MIN_PX = 88;
const GUTTER_PX = 48;

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Fill per block kind. Primary fills flip to a light tint in dark mode, so
// their text flips with them (that is what `text-on-primary` is for).
const fillFor = (item) => (
  item.kind === 'event' ? EVENT_COLORS[item.event.color].fill
    : item.kind === 'workout' ? 'bg-orange-500 text-white'
    : item.kind === 'task' ? 'bg-primary text-on-primary'
    : 'bg-green-600 text-white'
);

// Seven day columns over an hour grid (6am–10pm), the way Google Calendar's
// week view reads. All-day events sit in a strip under the day headings,
// recurring blocks (work hours...) are a faint backdrop behind everything, and
// overlapping items share their column side by side. Blocks are tap-only —
// tapping anything opens that day (where blocks can be dragged); dragging a
// workout or meal here would silently move every such weekday.
//
// On a phone each column is at least 88px wide and the grid scrolls sideways,
// opening scrolled to today; from `md` up all seven columns fit.
export default function WeekView({ days, todayISO, selectedISO, data, recurringBlocks, nowMinutes, onOpenDay }) {
  const scrollRef = useRef(null);
  const weekKey = toISODate(days[0]);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const todayIdx = days.findIndex(d => toISODate(d) === todayISO);
    el.scrollLeft = todayIdx > 0 ? Math.max(0, (todayIdx - 1) * COL_MIN_PX) : 0;
    // only when the visible week changes, not on every data refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey]);

  const columns = days.map(d => {
    const iso = toISODate(d);
    const items = dayItems(data, iso);
    const dayName = weekdayName(iso);
    return {
      d, iso,
      allDay: items.filter(i => i.allDay),
      timed: layoutLanes(items.filter(i => !i.allDay)),
      bands: recurringBlocks.map(block => ({ block, entry: normalizeBlockDays(block)[dayName] })).filter(x => x.entry),
    };
  });
  const gridCols = { gridTemplateColumns: `${GUTTER_PX}px repeat(7, minmax(${COL_MIN_PX}px, 1fr))` };

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-violet-400/15 bg-white dark:bg-[#211b34]">
      <div ref={scrollRef} className="overflow-x-auto">
        <div className="min-w-max md:min-w-0">
          {/* Day headings */}
          <div className="grid border-b border-gray-200 dark:border-violet-400/15" style={gridCols}>
            <div className="sticky left-0 z-20 bg-white dark:bg-[#211b34]" />
            {columns.map(({ d, iso }, i) => {
              const isToday = iso === todayISO;
              return (
                <button
                  key={iso}
                  onClick={() => onOpenDay(iso)}
                  aria-label={d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                  className={`flex flex-col items-center py-2 min-h-[56px] border-l border-gray-100 dark:border-violet-400/15 ${iso === selectedISO && !isToday ? 'bg-primary-soft' : ''}`}
                >
                  <span className="text-xs font-semibold text-black dark:text-white">{WEEKDAYS[i]}</span>
                  <span className={`text-base font-bold w-8 h-8 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-on-primary' : 'text-black dark:text-white'}`}>
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* All-day strip */}
          {columns.some(c => c.allDay.length > 0) && (
            <div className="grid border-b border-gray-200 dark:border-violet-400/15" style={gridCols}>
              <div className="sticky left-0 z-20 bg-white dark:bg-[#211b34] text-[11px] font-semibold text-black dark:text-white px-1 py-1.5">All day</div>
              {columns.map(({ iso, allDay }) => (
                <div key={iso} className="border-l border-gray-100 dark:border-violet-400/15 p-0.5 space-y-0.5 min-w-0">
                  {allDay.map(item => (
                    <button
                      key={item.key}
                      onClick={() => onOpenDay(iso)}
                      className={`w-full truncate rounded px-1 py-0.5 text-[11px] font-medium text-left ${EVENT_COLORS[item.event.color].fill}`}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Hour grid */}
          <div className="grid" style={gridCols}>
            <div className="sticky left-0 z-20 bg-white dark:bg-[#211b34]" style={{ height: HOURS.length * HOUR_PX }}>
              {HOURS.map((h, i) => (
                <span key={h} className="absolute right-1 text-[11px] text-black dark:text-white tabular-nums -translate-y-1/2" style={{ top: i * HOUR_PX }}>
                  {i === 0 ? '' : formatHour(h)}
                </span>
              ))}
            </div>
            {columns.map(({ iso, timed, bands }) => {
              const isToday = iso === todayISO;
              return (
                <div
                  key={iso}
                  className={`relative border-l border-gray-100 dark:border-violet-400/15 ${isToday ? 'bg-primary-soft/40' : ''}`}
                  style={{ height: HOURS.length * HOUR_PX }}
                >
                  {HOURS.map((h, i) => (
                    <div key={h} className="absolute left-0 right-0 border-t border-gray-100 dark:border-violet-400/15" style={{ top: i * HOUR_PX }} />
                  ))}

                  {bands.map(({ block, entry }) => {
                    const preset = BLOCK_COLOR_PRESETS[block.color] || BLOCK_COLOR_PRESETS.slate;
                    const s = Math.max(START_MIN, Math.min(END_MIN, timeToMinutes(entry.time)));
                    const e = Math.max(START_MIN, Math.min(END_MIN, timeToMinutes(entry.time) + entry.duration));
                    return (
                      <div
                        key={block.id}
                        className={`absolute left-0 right-0 pointer-events-none opacity-40 ${preset.band}`}
                        style={{ top: ((s - START_MIN) / 60) * HOUR_PX, height: Math.max(8, ((e - s) / 60) * HOUR_PX) }}
                      />
                    );
                  })}

                  {isToday && nowMinutes >= START_MIN && nowMinutes <= END_MIN && (
                    <div className="absolute left-0 right-0 z-10 pointer-events-none flex items-center" style={{ top: ((nowMinutes - START_MIN) / 60) * HOUR_PX }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-danger -ml-0.5" />
                      <span className="flex-1 border-t border-danger" />
                    </div>
                  )}

                  {timed.map(item => {
                    const s = Math.max(START_MIN, Math.min(END_MIN, timeToMinutes(item.time)));
                    const top = ((s - START_MIN) / 60) * HOUR_PX;
                    const height = Math.max(20, (item.duration / 60) * HOUR_PX - 1);
                    return (
                      <button
                        key={item.key}
                        onClick={() => onOpenDay(iso)}
                        aria-label={item.title}
                        className={`absolute z-[5] rounded px-1 py-0.5 text-left text-[11px] font-medium leading-tight overflow-hidden ${fillFor(item)}`}
                        style={{
                          top, height,
                          left: `calc(${(item.lane / item.lanes) * 100}% + 1px)`,
                          width: `calc(${100 / item.lanes}% - 2px)`,
                        }}
                      >
                        {item.title}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
