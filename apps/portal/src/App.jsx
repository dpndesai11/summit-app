import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarCheck, Check, Dumbbell, Moon, Sun, UtensilsCrossed } from 'lucide-react';
import { SUMMIT_APPS, useDarkMode, useTaskEngine } from '@summit/core';
import { dbGet } from '@summit/core/db';
import logoUrl from './assets/summit-command-center.png';
import CalendarPage from './calendar/CalendarPage';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Stored plans hold either a list of names or (older data) a single name/null.
const asList = (v) => (Array.isArray(v) ? v : v ? [v] : []);

// One short line of "what's on today" per app, read from the shared data file.
// Each is null when the data can't be read, so a button just shows its name.
async function loadSummaries(now, plansFor) {
  const day = DAYS[now.getDay()];
  const [workoutPlan, weekPlans, mealPlan] = await Promise.all([
    dbGet('summit_weekly_workout_plan'),
    dbGet('summit_week_plans'),
    dbGet('summit_weekly_meal_plan'),
  ]);

  // A week can carry its own workout plan (Fitness), else the default plan applies.
  let fitness = null;
  const plan = (weekPlans && weekPlans[plansFor]) || workoutPlan;
  if (plan) {
    const workouts = asList(plan[day]);
    fitness = workouts.length === 0 ? 'Rest day' : workouts.join(' + ');
  }

  let eat = null;
  if (mealPlan) {
    const dinner = asList(mealPlan[day]?.dinner);
    eat = dinner.length === 0 ? 'No dinner planned' : `Dinner: ${dinner.join(', ')}`;
  }
  return { fitness, eat };
}

// Monday of the week containing `now`, as an ISO date (the key of a week plan).
const mondayISO = (now) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
  return toISO(d);
};

const ICONS = { daily: CalendarCheck, fitness: Dumbbell, eat: UtensilsCrossed };
const BLURBS = { daily: 'Tasks and projects', fitness: 'Workouts', eat: 'Meals' };

function greeting(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// The Summit home screen: a compact band, three small buttons into the apps (each
// in its own colour, with a one-line look at today), and the calendar.
export default function App() {
  const [darkMode, setDarkMode] = useDarkMode();
  const engine = useTaskEngine();
  const [summaries, setSummaries] = useState(null);
  const now = new Date();

  useEffect(() => {
    let cancelled = false;
    loadSummaries(new Date(), mondayISO(new Date()))
      .then(s => { if (!cancelled) setSummaries(s); })
      .catch(() => { if (!cancelled) setSummaries({}); });
    return () => { cancelled = true; };
  }, []);

  const today = toISO(now);
  const due = engine.tasks.filter(t => !t.isCompleted && t.dueDate && t.dueDate <= today).length;
  const lines = {
    daily: engine.isLoading ? null : due === 0 ? 'Nothing due' : `${due} due`,
    fitness: summaries?.fitness,
    eat: summaries?.eat,
  };

  const { toast, isLoading, showToast, ...taskProps } = engine;

  return (
    <div className="min-h-screen bg-[#f7f7f5] dark:bg-[#14101f] text-black dark:text-white font-sans antialiased">
      <div className="max-w-md md:max-w-5xl mx-auto px-4 md:px-6 pt-4 md:pt-8 pb-24">
        {toast && (
          <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5 whitespace-nowrap animate-toast-in ${
            toast.isError ? 'bg-danger text-on-danger' : 'bg-gray-900 text-white'
          }`}>
            {toast.isError ? <AlertTriangle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
            {toast.message}
          </div>
        )}

        {/* The official Command Center lockup only ever sits on brand-night, its own ground, so the
            band is that exact colour in both themes (see the design system's logo rules). The
            strip under it carries the four app colours. */}
        <div className="relative rounded-3xl bg-brand-night overflow-hidden mb-3">
          <div className="flex items-center gap-3 p-3 pr-14">
            <img src={logoUrl} alt="Summit Command Center" width="56" height="56" className="w-14 h-14 flex-shrink-0 rounded-xl" />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-extrabold text-white leading-tight">{greeting(now.getHours())}</h1>
              <p className="text-sm text-white">
                {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
          <button
            onClick={() => setDarkMode(m => !m)}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="absolute top-1.5 right-1.5 w-11 h-11 flex items-center justify-center rounded-xl text-white hover:bg-white/10 transition-colors"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <div className="flex h-1.5" aria-hidden="true">
            {SUMMIT_APPS.map(app => <span key={app.id} className="flex-1" style={{ backgroundColor: app.color }} />)}
          </div>
        </div>

        <nav aria-label="Summit apps" className="grid grid-cols-3 gap-2 mb-4">
          {SUMMIT_APPS.filter(a => a.id !== 'portal').map(app => {
            const Icon = ICONS[app.id];
            const line = lines[app.id];
            return (
              <a
                key={app.id}
                href={app.href}
                className="flex flex-col gap-1.5 p-2.5 rounded-2xl bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 active:scale-[0.97] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <span className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: app.color }}>
                    <Icon className="w-4.5 h-4.5 text-white" aria-hidden="true" />
                  </span>
                  <span className="text-base font-display font-bold text-black dark:text-white truncate">{app.label}</span>
                </span>
                {line === null || (line === undefined && summaries === null) ? (
                  <span className="skeleton block h-4 w-full rounded" aria-hidden="true" />
                ) : (
                  <span className="text-xs font-medium text-black dark:text-white leading-snug line-clamp-2">{line || BLURBS[app.id]}</span>
                )}
              </a>
            );
          })}
        </nav>

        {isLoading ? (
          <div className="space-y-3">
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-[360px] w-full" />
          </div>
        ) : (
          <CalendarPage
            {...taskProps}
            navigateTo={(page, payload) => {
              if (page === 'Projects' && payload?.projectId != null) {
                window.location.href = `/summit-app/planner/?project=${encodeURIComponent(payload.projectId)}`;
              } else {
                window.location.href = '/summit-app/planner/';
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
