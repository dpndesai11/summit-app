// ---------------------------------------------------------------------------
// ARCHIVED — this was the standalone "Daily" app's Fitness half (workout
// templates, weekly plan, logging, PRs, streak, cardio routes), previously
// deployed at /summit-app/fitness/. Retired 2026-08-30 when Fitness and Eat
// merged with the old Tasks app into one app, then split back out again on
// 2026-09-19 — the live successor is /apps/fitness (WorkoutsSection.jsx and
// RoutePlanner.jsx there descend from this file's code, same data model and
// storage keys, but were carved from the merged app, so they carry the newer
// theme and shared shell — don't restore code from here).
// Kept here for reference only — not built or deployed. Moved into /legacy
// on 2026-08-31 alongside apps/tasks and apps/eat, its once-siblings from
// before the merge.
// ---------------------------------------------------------------------------
import FitnessTracker from './FitnessTracker';

export default function App() {
  return <FitnessTracker />;
}
