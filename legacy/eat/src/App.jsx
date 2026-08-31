// ---------------------------------------------------------------------------
// ARCHIVED — this was the standalone "Daily" app's Eat half (recipes,
// weekly meal plan, ingredient database, shopping list), previously
// deployed at /summit-app/eat/. Retired 2026-08-30 when Eat and Fitness
// merged with the old Tasks app into one app under the Daily identity — see
// /apps/daily/src/MealsSection.jsx, this file's direct, unchanged
// descendant (same data model, same storage keys). Kept here for reference
// only — not built or deployed. Moved into /legacy on 2026-08-31 alongside
// apps/tasks and apps/fitness, its once-siblings from before the merge.
// ---------------------------------------------------------------------------
import NutritionPlanner from './NutritionPlanner';

export default function App() {
  return <NutritionPlanner />;
}
