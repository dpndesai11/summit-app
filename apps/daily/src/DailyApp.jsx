import { LayoutDashboard, CheckSquare, Folder, AlertTriangle, Check } from 'lucide-react';
import { AppFrame, TabBar } from '@summit/core';
import Home from './pages/Home';
import TaskBoard from './pages/TaskBoard';
import Projects from './pages/Projects';

// The Planner: Home (calendar + today's focus), Tasks and Projects. Fitness
// and Eat used to be sections here (merged 2026-08-30) and were split back
// out into their own apps; Home's timeline still shows their workouts and
// meals by reading the same shared data, and AppFrame's AppSwitcher links to
// them.
//
// 2026-09-26: dropped the old always-visible desktop sidebar for the same
// AppFrame + TabBar shell every other Summit app uses (bottom bar on phone,
// top pills from `md` up) — one interface across the whole suite instead of
// Planner being the odd one out.
const TABS = [
  { id: 'Home', label: 'Home', icon: LayoutDashboard },
  { id: 'Task Dashboard', label: 'Tasks', icon: CheckSquare },
  { id: 'Projects', label: 'Projects', icon: Folder },
];

export default function DailyApp({ section, setSection, toast, loadError, taskProps }) {
  const current = TABS.find(t => t.id === section) || TABS[0];

  return (
    <AppFrame appId="daily" title={current.label}>
      <div className="relative">
        {toast && (
          <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] text-xs px-4 py-2.5 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap animate-toast-in animate-success-pulse ${
            toast.isError ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
          }`}>
            {toast.isError ? <AlertTriangle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
            {toast.message}
          </div>
        )}

        <div className="hidden md:block mb-3">
          <TabBar tabs={TABS} tab={section} setTab={setSection} variant="top" />
        </div>

        {loadError && (
          <div className="mb-4 bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-sm text-black dark:text-white">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
            <span>{loadError}</span>
          </div>
        )}

        {section === 'Home' && <Home {...taskProps} />}
        {section === 'Task Dashboard' && <TaskBoard {...taskProps} />}
        {section === 'Projects' && <Projects {...taskProps} />}
      </div>
      <TabBar tabs={TABS} tab={section} setTab={setSection} variant="bottom" />
    </AppFrame>
  );
}
