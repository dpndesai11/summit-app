import { LayoutDashboard, Dumbbell, Salad, Mountain, CheckSquare, Folder, Sun, Moon, AlertTriangle, Check } from 'lucide-react';
import Home from './pages/Home';
import TaskBoard from './pages/TaskBoard';
import Projects from './pages/Projects';
import WorkoutsSection from './WorkoutsSection';
import MealsSection from './MealsSection';

// One app now — Tasks and the old Daily (Fitness + Eat) merged under the
// Daily identity, deployed at the site root (2026-08-30). No more cross-app
// switcher: everything below is a section of this one app.
const SECTIONS = [
  { id: 'Home', label: 'Home', icon: LayoutDashboard, active: 'text-indigo-600' },
  { id: 'Task Dashboard', label: 'Tasks', icon: CheckSquare, active: 'text-blue-600' },
  { id: 'Projects', label: 'Projects', icon: Folder, active: 'text-blue-600' },
  { id: 'Workouts', label: 'Workouts', icon: Dumbbell, active: 'text-orange-600' },
  { id: 'Meals', label: 'Meals', icon: Salad, active: 'text-green-600' },
];

// Desktop sidebar — hidden below the `md` breakpoint, where the mobile
// header + bottom nav (below) take over instead. Automatic via CSS media
// query, not a device check, so it reacts live to resizing a window the
// same as an actual phone/desktop would.
function DesktopSidebar({ section, setSection, darkMode, setDarkMode }) {
  return (
    <aside className="hidden md:flex w-56 shrink-0 h-screen sticky top-0 flex-col border-r border-black/8 dark:border-white/8 bg-[#fbfbfa] dark:bg-[#202020] px-3 py-4">
      <div className="flex items-center gap-2 px-2 mb-6">
        <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center shrink-0">
          <Mountain className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="min-w-0">
          <span className="font-semibold text-sm text-[#37352f] dark:text-[#e6e6e6] block leading-tight">Summit</span>
          <span className="text-[10px] text-[#9b9b9b] block leading-tight">Daily</span>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5">
        {SECTIONS.map(({ id, label, icon: Icon }) => {
          const active = section === id;
          return (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm text-left transition-colors ${
                active ? 'bg-black/6 dark:bg-white/10 text-[#37352f] dark:text-white font-medium' : 'text-[#6b7280] dark:text-[#9b9b9b] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
      </nav>

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

export default function DailyApp({ section, setSection, darkMode, setDarkMode, toast, loadError, taskProps }) {
  const current = SECTIONS.find(s => s.id === section) || SECTIONS[0];

  return (
    <div className="min-h-screen bg-[#f7f7f5] dark:bg-[#191919] text-[#37352f] dark:text-[#e6e6e6] font-sans antialiased md:flex">
      <DesktopSidebar section={section} setSection={setSection} darkMode={darkMode} setDarkMode={setDarkMode} />

      <div className="flex-1 min-w-0">
        {/* Mobile-only header */}
        <div className="md:hidden sticky top-0 z-30 bg-[#f7f7f5]/90 dark:bg-[#191919]/90 backdrop-blur px-4 pt-3 pb-2">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Summit</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-600 text-white">Daily</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{current.label}</h1>
        </div>

        {/* Desktop-only header — the sidebar already carries nav */}
        <div className="hidden md:block px-6 lg:px-10 pt-8 pb-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{current.label}</h1>
        </div>

        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg border text-sm shadow-lg flex items-center gap-2 animate-toast-in-right ${
              toast.isError
                ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400'
                : 'bg-white border-gray-200 text-gray-700 dark:bg-[#252525] dark:border-white/10 dark:text-gray-200'
            }`}
          >
            {toast.isError ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            {toast.message}
          </div>
        )}

        <div className="max-w-md md:max-w-5xl mx-auto px-4 md:px-6 lg:px-10 pb-24 md:pb-10">
          {loadError && (
            <div className="mb-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{loadError}</span>
            </div>
          )}

          {section === 'Home' && <Home {...taskProps} />}
          {section === 'Task Dashboard' && <TaskBoard {...taskProps} />}
          {section === 'Projects' && <Projects {...taskProps} />}
          {section === 'Workouts' && <WorkoutsSection />}
          {section === 'Meals' && <MealsSection />}
        </div>
      </div>

      {/* Mobile-only bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-[#202020] border-t border-gray-200 dark:border-white/8 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto flex">
          {SECTIONS.map(({ id, label, icon: Icon, active }) => (
            <button key={id} onClick={() => setSection(id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 ${section === id ? active : 'text-gray-400'}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
