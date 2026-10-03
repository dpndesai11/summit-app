import { useEffect, useState } from 'react';
import { CalendarCheck, ChevronRight, Dumbbell, Flame, Moon, Sun, UtensilsCrossed } from 'lucide-react';
import { useDarkMode } from '@summit/core';
import { dbGet } from '@summit/core/db';
import logoUrl from './assets/summit-command-center.png';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Stored plans hold either a list of names or (older data) a single name/null.
const asList = (v) => (Array.isArray(v) ? v : v ? [v] : []);

// One line of "what's on today" per app, read from the shared data file.
// Each returns null when the data can't be read, so a card just shows its
// description instead of an error.
async function loadSummaries(now) {
  const today = toISO(now);
  const day = DAYS[now.getDay()];
  const [tasks, workoutPlan, mealPlan, habits, habitLogs] = await Promise.all([
    dbGet('summit_tasks'),
    dbGet('summit_weekly_workout_plan'),
    dbGet('summit_weekly_meal_plan'),
    dbGet('summit_habits'),
    dbGet('summit_habit_logs'),
  ]);

  let planner = null;
  if (Array.isArray(tasks)) {
    const due = tasks.filter(t => !t.isCompleted && t.dueDate && t.dueDate <= today).length;
    planner = due === 0 ? 'Nothing due today' : `${due} task${due === 1 ? '' : 's'} due or overdue`;
  }

  let fitness = null;
  if (workoutPlan) {
    const workouts = asList(workoutPlan[day]);
    fitness = workouts.length === 0 ? 'Rest day' : workouts.join(' + ');
  }

  let eat = null;
  if (mealPlan) {
    const dinner = asList(mealPlan[day]?.dinner);
    eat = dinner.length === 0 ? 'No dinner planned' : `Dinner: ${dinner.join(', ')}`;
  }

  let habitsSummary = null;
  if (Array.isArray(habits)) {
    const active = habits.filter(h => !h.archived);
    if (active.length > 0) {
      const done = Array.isArray(habitLogs?.[today]) ? habitLogs[today] : [];
      const doneCount = active.filter(h => done.includes(h.id)).length;
      habitsSummary = `${doneCount} of ${active.length} done today`;
    } else {
      habitsSummary = 'No habits yet';
    }
  }

  return { daily: planner, fitness, eat, habits: habitsSummary };
}

const APPS = [
  { id: 'daily', title: 'Planner', blurb: 'Calendar, tasks and projects', href: '/summit-app/planner/', Icon: CalendarCheck },
  { id: 'fitness', title: 'Fitness', blurb: 'Log workouts and see progress', href: '/summit-app/fitness/', Icon: Dumbbell },
  { id: 'eat', title: 'Eat', blurb: 'Recipes, meal plan and shopping', href: '/summit-app/eat/', Icon: UtensilsCrossed },
  { id: 'habits', title: 'Habits', blurb: 'Daily checklist and streaks', href: '/summit-app/habits/', Icon: Flame },
];

function greeting(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// The portal: the page you land on at the site root. Just a way into the
// three apps, each with a one-line look at today.
export default function App() {
  const [darkMode, setDarkMode] = useDarkMode();
  const [summaries, setSummaries] = useState(null);
  const now = new Date();

  useEffect(() => {
    let cancelled = false;
    loadSummaries(new Date())
      .then(s => { if (!cancelled) setSummaries(s); })
      .catch(() => { if (!cancelled) setSummaries({}); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f7f5] dark:bg-[#14101f] text-black dark:text-white font-sans antialiased">
      <div className="max-w-md md:max-w-4xl mx-auto px-4 md:px-6 pt-6 md:pt-12 pb-10">
        {/* The official Command Center lockup only ever sits on brand-night, its own ground, so the
            band is that exact colour in both themes (see the design system's logo rules). */}
        <div className="relative flex items-center gap-4 mb-6 p-4 rounded-3xl bg-brand-night">
          <img src={logoUrl} alt="Summit Command Center" width="96" height="96" className="w-24 h-24 flex-shrink-0 rounded-2xl" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-white">{greeting(now.getHours())}</h1>
            <p className="text-base text-white">
              {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button
            onClick={() => setDarkMode(m => !m)}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center rounded-xl text-white hover:bg-white/10 transition-colors"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <nav aria-label="Summit apps" className="grid gap-3 md:grid-cols-2">
          {APPS.map(({ id, title, blurb, href, Icon }) => {
            const summary = summaries?.[id];
            return (
              <a
                key={id}
                href={href}
                className="group flex md:flex-col md:justify-between items-center md:items-start gap-4 min-h-[104px] md:min-h-[200px] p-5 rounded-3xl bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 active:scale-[0.98] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <span className="w-14 h-14 rounded-2xl bg-brand-night flex items-center justify-center flex-shrink-0">
                  <Icon className="w-7 h-7 text-white" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-2xl font-display font-bold text-black dark:text-white">{title}</span>
                  <span className="block text-base text-black dark:text-white">{blurb}</span>
                  {summaries === null ? (
                    <span className="skeleton block h-5 w-40 rounded mt-2" aria-hidden="true" />
                  ) : summary ? (
                    <span className="block text-base font-semibold text-black dark:text-white mt-2">{summary}</span>
                  ) : null}
                </span>
                <ChevronRight className="w-6 h-6 text-black dark:text-white flex-shrink-0 md:hidden" />
              </a>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
