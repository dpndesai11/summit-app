// ---------------------------------------------------------------------------
// ARCHIVED — this was the standalone "Daily" app's Fitness half (workout
// templates, weekly plan, logging, PRs, streak, cardio routes), previously
// deployed at /summit-app/fitness/. Retired 2026-08-30 when Fitness and Eat
// merged with the old Tasks app into one app under the Daily identity — see
// /apps/daily/src/WorkoutsSection.jsx and RoutePlanner.jsx, which are this
// file's direct, unchanged descendants (same data model, same storage keys).
// Kept here for reference only — not built or deployed. Moved into /legacy
// on 2026-08-31 alongside apps/tasks and apps/eat, its once-siblings from
// before the merge.
// ---------------------------------------------------------------------------
import FitnessTracker from './FitnessTracker';

export default function App() {
  return <FitnessTracker />;
}
