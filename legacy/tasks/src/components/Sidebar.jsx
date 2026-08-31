import { LayoutGrid, CheckSquare, Dumbbell, Sun, Moon, Mountain, Target, Folder, LayoutDashboard, ExternalLink } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'Main Hub', label: 'Home', icon: LayoutGrid },
  { id: 'Task Dashboard', label: 'Tasks', icon: CheckSquare },
  { id: 'Today Focus', label: 'Today', icon: Target },
  { id: 'Projects', label: 'Projects', icon: Folder },
  { id: 'Fitness Dashboard', label: 'Fitness', icon: Dumbbell },
];

// The other Summit app, deployed as a sibling under the same Pages site.
// Fitness + Eat merged into one phone-oriented app ("Daily") with its own
// Dashboard/Workouts/Meals sections — this used to be two links.
// Absolute prod path — doesn't resolve in local dev, only deployed.
const SUMMIT_APPS = [
  { label: 'Daily', href: '/summit-app/daily/', icon: LayoutDashboard, color: 'text-indigo-600' },
];

// Desktop sidebar — hidden below the `md` breakpoint, where MobileTopBar +
// MobileNav (below) take over navigation instead. Automatic via CSS media
// query, not a device check, so resizing a window crosses the breakpoint
// live same as an actual phone/desktop would.
export default function Sidebar({ currentPage, setCurrentPage, darkMode, setDarkMode }) {
  return (
    <aside className="hidden md:flex w-60 shrink-0 h-screen sticky top-0 flex-col border-r border-black/8 dark:border-white/8 bg-[#fbfbfa] dark:bg-[#202020] px-3 py-4">
      <div className="flex items-center gap-2 px-2 mb-6">
        <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
          <Mountain className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="min-w-0">
          <span className="font-semibold text-sm text-[#37352f] dark:text-[#e6e6e6] block leading-tight">Summit</span>
          <span className="text-[10px] text-[#9b9b9b] block leading-tight">Command Center</span>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const active = currentPage === id;
          return (
            <button
              key={id}
              onClick={() => setCurrentPage(id)}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm text-left transition-colors ${
                active
                  ? 'bg-black/6 dark:bg-white/10 text-[#37352f] dark:text-white font-medium'
                  : 'text-[#6b7280] dark:text-[#9b9b9b] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="mt-6">
        <div className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#9b9b9b]">Apps</div>
        {SUMMIT_APPS.map(({ label, href, icon: Icon, color }) => (
          <a
            key={label}
            href={href}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm text-[#6b7280] dark:text-[#9b9b9b] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <Icon className={`w-4 h-4 ${color}`} />
            {label}
            <ExternalLink className="w-3 h-3 ml-auto opacity-40" />
          </a>
        ))}
      </div>

      <div className="flex-1" />

      <button
        onClick={() => setDarkMode(m => !m)}
        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm text-[#6b7280] dark:text-[#9b9b9b] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        {darkMode ? 'Light mode' : 'Dark mode'}
      </button>
    </aside>
  );
}

// Mobile top strip — the sidebar's "SUMMIT" wordmark + cross-app switcher,
// surfaced above the content only below `md` since the sidebar (and its own
// copy of this) is hidden there. Mirrors the AppSwitcher pattern in Daily's
// own header.
export function MobileTopBar() {
  return (
    <div className="md:hidden sticky top-0 z-30 bg-[#f7f7f5]/90 dark:bg-[#191919]/90 backdrop-blur px-4 pt-3 pb-2 flex items-center gap-1.5">
      <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mr-0.5">Summit</span>
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-600 text-white">Tasks</span>
      {SUMMIT_APPS.map(a => (
        <a key={a.label} href={a.href} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-200/70 dark:bg-white/10 text-gray-500 dark:text-gray-300 active:bg-gray-300">
          {a.label}
        </a>
      ))}
    </div>
  );
}

// Mobile bottom tab bar — takes over from the sidebar below `md`, same
// NAV_ITEMS and same fixed-bottom-bar pattern Daily uses.
export function MobileNav({ currentPage, setCurrentPage }) {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-[#202020] border-t border-black/8 dark:border-white/8 pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const active = currentPage === id;
          return (
            <button
              key={id}
              onClick={() => setCurrentPage(id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 ${
                active ? 'text-blue-600' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
