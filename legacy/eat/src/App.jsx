// ---------------------------------------------------------------------------
// ARCHIVED — this was the standalone "Daily" app's Eat half (recipes,
// weekly meal plan, ingredient database, shopping list), previously
// deployed at /summit-app/eat/. Retired 2026-08-30 when Eat and Fitness
// merged with the old Tasks app into one app, then split back out again on
// 2026-09-19 — the live successor is /apps/eat (MealsSection.jsx there
// descends from this file's code, same data model and storage keys, but was
// carved from the merged app, so it carries the newer theme and shared
// shell — don't restore code from here). Kept here for reference only — not
// built or deployed. Moved into /legacy on 2026-08-31 alongside apps/tasks
// and apps/fitness, its once-siblings from before the merge.
// ---------------------------------------------------------------------------
import NutritionPlanner from './NutritionPlanner';

export default function App() {
  return <NutritionPlanner />;
}
