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

export default function Sidebar({ currentPage, setCurrentPage, darkMode, setDarkMode }) {
  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col border-r border-black/8 dark:border-white/8 bg-[#fbfbfa] dark:bg-[#202020] px-3 py-4">
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
