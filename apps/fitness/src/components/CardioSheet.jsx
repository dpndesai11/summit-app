import { ChevronDown, Activity, X } from 'lucide-react';
import { CARDIO_ACTIVITIES } from '../lib/model';
import Stepper from './Stepper';
import { routeDistanceKm } from '../lib/geo';

// Bottom sheet for logging a quick cardio session (optionally from a saved route).
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

  if (!cardioSheetOpen) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={() => setCardioSheetOpen(false)} />
      <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-[#211b34] rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-w-md mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-500" />
            <span className="font-semibold text-black dark:text-white text-sm">Quick cardio</span>
          </div>
          <button onClick={() => setCardioSheetOpen(false)} className="text-black dark:text-white active:text-black dark:text-white p-1" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {routes.length > 0 && (
          <div className="relative mb-2">
            <select
              value={cardioForm.routeId}
              onChange={e => setCardioForm(p => ({ ...p, routeId: e.target.value }))}
              className="w-full appearance-none bg-violet-50 dark:bg-violet-500/10 text-violet-700 rounded-xl px-4 py-3 text-sm font-medium outline-none"
            >
              <option value="">Manual entry (no route)</option>
              {routes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} · {r.activity} · {routeDistanceKm(r).toFixed(2)} km
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-violet-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        {!selectedRoute && (
          <div className="relative mb-2">
            <select
              value={cardioForm.activity}
              onChange={e => setCardioForm(p => ({ ...p, activity: e.target.value }))}
              className="w-full appearance-none bg-gray-100 dark:bg-violet-400/10 rounded-xl px-4 py-3 text-sm text-black dark:text-white outline-none"
            >
              {CARDIO_ACTIVITIES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 text-black dark:text-white absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        <div className="flex gap-2 mb-3">
          <Stepper label="Minutes" value={cardioForm.duration} step={5}
            onChange={v => setCardioForm(p => ({ ...p, duration: v }))} />
          {selectedRoute ? (
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-black dark:text-white mb-1 text-center">Distance (km)</div>
              <div className="bg-violet-50 dark:bg-violet-500/10 rounded-xl py-3 text-center text-sm font-semibold text-violet-700 tabular-nums">
                {routeDistanceKm(selectedRoute).toFixed(2)}
              </div>
            </div>
          ) : (
            <Stepper label="Distance" unit="km" value={cardioForm.distance}
              onChange={v => setCardioForm(p => ({ ...p, distance: v }))} />
          )}
        </div>
        <button onClick={logQuickCardio}
          className="w-full h-11 bg-violet-500 text-white rounded-xl text-sm font-semibold active:bg-violet-600">
          Log {selectedRoute ? selectedRoute.name : 'cardio'}
        </button>
      </div>
    </div>
  );
}
