import { CalendarCheck, CalendarDays, TrendingUp } from 'lucide-react';

export const TABS = [
  { id: 'today', label: 'Today', icon: CalendarCheck },
  { id: 'plan', label: 'Plan', icon: CalendarDays },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
];

// Three tabs. variant="bottom" is the phone bar fixed to the bottom of the
// screen (thumb reach, padded for the iPhone home indicator); variant="top" is
// the row of pills shown from `md` up. Render both — each hides itself at the
// other's breakpoint.
export default function TabBar({ tab, setTab, variant = 'bottom' }) {
  if (variant === 'bottom') {
    return (
      <nav
        aria-label="Sections"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-[#1c1730] border-t border-gray-200 dark:border-violet-400/15 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="max-w-md mx-auto flex">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 min-h-[56px] ${
                tab === id ? 'text-violet-600' : 'text-black dark:text-white'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className={`text-xs ${tab === id ? 'font-bold' : 'font-medium'}`}>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    );
  }

  return (
      <nav aria-label="Sections" className="hidden md:flex bg-gray-200/60 dark:bg-violet-400/10 rounded-lg p-0.5 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-current={tab === id ? 'page' : undefined}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium ${
              tab === id ? 'bg-white dark:bg-[#211b34] text-violet-600 shadow-sm' : 'text-black dark:text-white'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </nav>
  );
}
