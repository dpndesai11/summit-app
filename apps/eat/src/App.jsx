import { AppFrame } from '@summit/core';
import MealsSection from './MealsSection';

// Eat is its own app now (split back out of the merged Daily app). All it
// does is frame the Meals section; the data it reads/writes is the same
// summit-data.json and the same summit_* keys as before, shared with the
// other Summit apps.
export default function App() {
  return (
    <AppFrame appId="eat" title="Meals">
      <MealsSection />
    </AppFrame>
  );
}
