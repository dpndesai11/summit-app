import { useState } from 'react';
import { LayoutDashboard, Dumbbell, Salad } from 'lucide-react';
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

export default function DailyApp() {
  const [section, setSection] = useState('dashboard');
  const current = SECTIONS.find(s => s.id === section);

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#37352f] font-sans antialiased">
      {/* Shared header — each section owns its own refresh/toast/sub-nav below this */}
      <div className="sticky top-0 z-30 bg-[#f7f7f5]/90 backdrop-blur px-4 pt-3 pb-3">
        <div className="max-w-md mx-auto mb-2">
          <AppSwitcher current="daily" />
        </div>
        <div className="max-w-md mx-auto flex items-baseline justify-between">
          <h1 className="text-xl font-bold text-gray-900">{current.label}</h1>
        </div>
      </div>

      {/* Content — bottom padding clears the fixed nav + iOS home indicator */}
      <div className="max-w-md mx-auto px-4 pb-28">
        {section === 'dashboard' && <Dashboard />}
        {section === 'workouts' && <WorkoutsSection />}
        {section === 'meals' && <MealsSection />}
      </div>

      {/* Shared bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
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
