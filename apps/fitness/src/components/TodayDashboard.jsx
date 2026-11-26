import { Activity, Check, CalendarCheck, Dumbbell, Route, Timer } from 'lucide-react';

const panel = 'bg-white dark:bg-[#211b34] rounded-3xl border border-gray-200 dark:border-violet-400/15';

// A summit ridge, drawn faintly behind the hero card: the app's own mark in place of a stock photo.
const Ridge = () => (
  <svg viewBox="0 0 200 110" preserveAspectRatio="xMaxYMax slice" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
    <path d="M20 110 L74 62 L96 76 L142 28 L168 54 L182 44 L200 62 V110 Z" fill="currentColor" opacity="0.12" />
    <path d="M142 28 V12 l17 5.5 -17 5.5" fill="currentColor" opacity="0.3" />
  </svg>
);

// The bright card that leads the day: what's on, and one button to get going.
export function HeroCard({ eyebrow, title, detail, action }) {
  return (
    <span className="relative block overflow-hidden rounded-3xl bg-primary text-on-primary p-5">
      <Ridge />
      <span className="relative flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{eyebrow}</span>
          <span className="block text-2xl font-display font-extrabold leading-tight mt-1">{title}</span>
          <span className="block text-sm font-medium mt-1">{detail}</span>
        </span>
        <span className="w-11 h-11 rounded-full bg-on-primary text-primary flex items-center justify-center flex-shrink-0">
          <Dumbbell className="w-5 h-5" aria-hidden="true" />
        </span>
      </span>
      {action && (
        <span className="relative inline-flex items-center gap-2 mt-5 min-h-[44px] px-5 rounded-full bg-on-primary text-primary text-base font-bold">
          {action}
        </span>
      )}
    </span>
  );
}

const WELL = 'bg-gray-100 dark:bg-violet-400/10';
// Tiles that sit straight on the page need to be cards, or they vanish into it in light mode.
const CARD = 'bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15';

const Tile = ({ icon: Icon, value, label, surface = WELL }) => (
  <div className={`rounded-2xl ${surface} px-2 py-3 text-center`}>
    <Icon className="w-5 h-5 mx-auto text-primary" aria-hidden="true" />
    <div className="text-xl font-display font-extrabold text-black dark:text-white mt-1.5 leading-none tabular-nums">{value}</div>
    <div className="text-xs font-medium text-black dark:text-white mt-1">{label}</div>
  </div>
);

// A half ring that fills with today's sets.
export function ProgressCard({ progress }) {
  const arc = 'M 14 96 A 86 86 0 0 1 186 96';
  return (
    <div className={`${panel} p-4`}>
      <h2 className="text-lg font-bold text-black dark:text-white">Today’s progress</h2>
      <div className="relative mx-auto max-w-[240px] mt-2">
        <svg viewBox="0 0 200 106" className="w-full" role="img" aria-label={`${progress.percent}% of today’s sets done`}>
          <path d={arc} fill="none" strokeWidth="14" strokeLinecap="round" className="stroke-gray-200 dark:stroke-violet-400/20" />
          {progress.percent > 0 && (
            <path d={arc} fill="none" strokeWidth="14" strokeLinecap="round" pathLength="100" strokeDasharray={`${progress.percent} 100`} className="stroke-primary" />
          )}
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <div className="text-4xl font-display font-extrabold text-black dark:text-white leading-none tabular-nums">{progress.percent}%</div>
          <div className="text-sm font-medium text-black dark:text-white">completed</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <Tile icon={Check} value={`${progress.done}/${progress.total}`} label="sets" />
        <Tile icon={Dumbbell} value={`${progress.exercisesDone}/${progress.exercises}`} label="exercises" />
      </div>
    </div>
  );
}

export function WeekActivity({ stats, onViewAll }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-black dark:text-white">This week</h2>
        <button onClick={onViewAll} className="min-h-[44px] px-1 text-sm font-bold text-primary">View all</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Tile icon={CalendarCheck} surface={CARD} value={stats.days} label={stats.days === 1 ? 'day trained' : 'days trained'} />
        <Tile icon={Route} surface={CARD} value={stats.km} label="km" />
        <Tile icon={Timer} surface={CARD} value={stats.minutes} label="cardio min" />
      </div>
    </div>
  );
}

export function RecentList({ days }) {
  if (days.length === 0) return null;
  return (
    <div>
      <h2 className="text-lg font-bold text-black dark:text-white mb-2">Recent workouts</h2>
      <ul className="space-y-2">
        {days.map(d => (
          <li key={d.date} className={`${panel} !rounded-2xl flex items-center gap-3 p-3`}>
            <span className="w-12 h-12 rounded-2xl bg-primary-soft flex items-center justify-center flex-shrink-0">
              {d.kind === 'strength'
                ? <Dumbbell className="w-6 h-6 text-black dark:text-white" aria-hidden="true" />
                : <Activity className="w-6 h-6 text-black dark:text-white" aria-hidden="true" />}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-base font-bold text-black dark:text-white truncate">{d.title}</span>
              <span className="block text-sm text-black dark:text-white">{d.detail}</span>
            </span>
            <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center flex-shrink-0" aria-label="Done">
              <Check className="w-5 h-5" aria-hidden="true" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
