import { useState } from 'react';
import { LayoutDashboard, Dumbbell, Salad, Mountain, ExternalLink, CheckSquare } from 'lucide-react';
import Dashboard from './Dashboard';
import WorkoutsSection from './WorkoutsSection';
import MealsSection from './MealsSection';

// Summit Command Center strip: ties the sibling apps together under one
// identity, with one-tap jumps between them. Absolute prod paths — the apps
// are only siblings when deployed under /summit-app/, not in local dev.
// Only two apps now that Fitness + Eat live here together as Daily.
const SUMMIT_APPS = [
  { id: 'tasks', label: 'Tasks', href: '/summit-app/', active: 'bg-blue-600 text-white' },
  { id: 'daily', label: 'Daily', href: '/summit-app/daily/', active: 'bg-indigo-600 text-white' },
];

// Mobile pill-row switcher (top header, phone-width).
function AppSwitcher({ current }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mr-0.5">Summit</span>
      {SUMMIT_APPS.map(a => (
        a.id === current ? (
          <span key={a.id} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${a.active}`}>{a.label}</span>
        ) : (
          <a key={a.id} href={a.href} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-200/70 text-gray-500 active:bg-gray-300">
            {a.label}
          </a>
        )
      ))}
    </div>
  );
}

const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, active: 'text-indigo-600' },
  { id: 'workouts', label: 'Workouts', icon: Dumbbell, active: 'text-orange-600' },
  { id: 'meals', label: 'Meals', icon: Salad, active: 'text-green-600' },
];

// Desktop sidebar — same shape/family as the Tasks app's Sidebar, hidden
// below the `md` breakpoint where the mobile header + bottom nav take over.
// Automatic via CSS media query, not a device check, so it reacts live to
// resizing a window the same way an actual phone/desktop would.
function DesktopSidebar({ section, setSection }) {
  return (
    <aside className="hidden md:flex w-56 shrink-0 h-screen sticky top-0 flex-col border-r border-black/8 bg-[#fbfbfa] px-3 py-4">
      <div className="flex items-center gap-2 px-2 mb-6">
        <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center shrink-0">
          <Mountain className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="min-w-0">
          <span className="font-semibold text-sm text-[#37352f] block leading-tight">Summit</span>
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
                active ? 'bg-black/6 text-[#37352f] font-medium' : 'text-[#6b7280] hover:bg-black/5'
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
        <a
          href="/summit-app/"
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm text-[#6b7280] hover:bg-black/5 transition-colors"
        >
          <CheckSquare className="w-4 h-4 text-blue-600" />
          Tasks
          <ExternalLink className="w-3 h-3 ml-auto opacity-40" />
        </a>
      </div>

      <div className="flex-1" />
    </aside>
  );
}

export default function DailyApp() {
  const [section, setSection] = useState('dashboard');
  const current = SECTIONS.find(s => s.id === section);

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#37352f] font-sans antialiased md:flex">
      <DesktopSidebar section={section} setSection={setSection} />

      <div className="flex-1 min-w-0">
        {/* Mobile-only header — each section owns its own refresh/toast/sub-nav below this */}
        <div className="md:hidden sticky top-0 z-30 bg-[#f7f7f5]/90 backdrop-blur px-4 pt-3 pb-3">
          <div className="max-w-md mx-auto mb-2">
            <AppSwitcher current="daily" />
          </div>
          <div className="max-w-md mx-auto flex items-baseline justify-between">
            <h1 className="text-xl font-bold text-gray-900">{current.label}</h1>
          </div>
        </div>

        {/* Desktop-only header — the sidebar already carries nav + app switcher */}
        <div className="hidden md:block px-6 lg:px-10 pt-8 pb-4">
          <h1 className="text-xl font-bold text-gray-900">{current.label}</h1>
        </div>

        {/* Content — bottom padding on mobile clears the fixed nav + iOS home indicator */}
        <div className="max-w-md md:max-w-5xl mx-auto px-4 md:px-6 lg:px-10 pb-28 md:pb-10">
          {section === 'dashboard' && <Dashboard />}
          {section === 'workouts' && <WorkoutsSection />}
          {section === 'meals' && <MealsSection />}
        </div>
      </div>

      {/* Mobile-only bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto flex">
          {SECTIONS.map(({ id, label, icon: Icon, active }) => (
            <button key={id} onClick={() => setSection(id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 ${
                section === id ? active : 'text-gray-400'
              }`}
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
