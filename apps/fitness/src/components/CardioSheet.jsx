import { ChevronDown } from 'lucide-react';
import BottomSheet from './BottomSheet';
import Stepper from './Stepper';
import { CARDIO_ACTIVITIES } from '../lib/model';
import { routeDistanceKm } from '../lib/geo';

const selectClass = 'w-full appearance-none bg-gray-100 dark:bg-violet-400/10 rounded-xl pl-4 pr-10 py-3 min-h-[48px] text-base text-black dark:text-white outline-none focus:ring-2 focus:ring-violet-500';

// Sheet for logging a quick cardio session, optionally from a saved route
// (a route fills in the activity and distance, so only the time is left).
export default function CardioSheet({ w }) {
  const {
    routes,
    cardioSheetOpen,
    setCardioSheetOpen,
    cardioForm,
    setCardioForm,
    selectedRoute,
    logQuickCardio
  } = w;

  return (
    <BottomSheet open={cardioSheetOpen} onClose={() => setCardioSheetOpen(false)} title="Log cardio">
      <div className="space-y-3 pb-2">
        {routes.length > 0 && (
          <div className="relative">
            <select
              value={cardioForm.routeId}
              onChange={e => setCardioForm(p => ({ ...p, routeId: e.target.value }))}
              aria-label="Saved route"
              className={selectClass}
            >
              <option value="">Manual entry (no route)</option>
              {routes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} · {r.activity} · {routeDistanceKm(r).toFixed(2)} km
                </option>
              ))}
            </select>
            <ChevronDown className="w-5 h-5 text-black dark:text-white absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        {!selectedRoute && (
          <div className="relative">
            <select
              value={cardioForm.activity}
              onChange={e => setCardioForm(p => ({ ...p, activity: e.target.value }))}
              aria-label="Activity"
              className={selectClass}
            >
              {CARDIO_ACTIVITIES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <ChevronDown className="w-5 h-5 text-black dark:text-white absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        <div className="flex gap-2">
          <Stepper label="Minutes" value={cardioForm.duration} step={5}
            onChange={v => setCardioForm(p => ({ ...p, duration: v }))} />
          {selectedRoute ? (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-black dark:text-white mb-1 text-center">Distance (km)</div>
              <div className="bg-gray-100 dark:bg-violet-400/10 rounded-xl h-12 flex items-center justify-center text-base font-bold text-black dark:text-white tabular-nums">
                {routeDistanceKm(selectedRoute).toFixed(2)}
              </div>
            </div>
          ) : (
            <Stepper label="Distance" unit="km" value={cardioForm.distance}
              onChange={v => setCardioForm(p => ({ ...p, distance: v }))} />
          )}
        </div>

        <button onClick={logQuickCardio}
          className="w-full min-h-[52px] bg-violet-600 text-white rounded-xl text-base font-bold active:bg-violet-700">
          Log {selectedRoute ? selectedRoute.name : 'cardio'}
        </button>
      </div>
    </BottomSheet>
  );
}
