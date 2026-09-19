import { useState } from 'react';
import { ChevronRight, Ellipsis, MapPin, Plus, Trash2 } from 'lucide-react';
import { CollapsibleCard } from '@summit/core';
import BottomSheet from '../components/BottomSheet';
import DaySheet from '../components/DaySheet';
import RouteThumb from '../components/RouteThumb';
import TemplateSheet from '../components/TemplateSheet';
import { DAYS, DEFAULT_PLAN, REST_WEEK, dayList } from '../lib/model';
import { parseExercise } from '../lib/exercises';
import { routeDistanceKm } from '../lib/geo';

// "Default" / "Rest week" replace the whole weekly plan, so they live behind a
// menu with a confirm step instead of sitting next to the plan as one-tap buttons.
function ResetWeekSheet({ open, onClose, onApply }) {
  const [pending, setPending] = useState(null);
  const close = () => { setPending(null); onClose(); };
  const options = [
    { id: 'default', label: 'Default plan', hint: 'Lower / Upper / Lower on Mon, Wed, Fri', plan: DEFAULT_PLAN },
    { id: 'rest', label: 'Rest week', hint: 'Clears every day', plan: REST_WEEK },
  ];
  const chosen = options.find(o => o.id === pending);
  return (
    <BottomSheet open={open} onClose={close} title="Replace the weekly plan">
      {!chosen ? (
        <div className="space-y-2 pb-2">
          {options.map(o => (
            <button key={o.id} onClick={() => setPending(o.id)}
              className="w-full text-left min-h-[56px] px-4 py-2 rounded-xl border border-gray-200 dark:border-violet-400/15 text-black dark:text-white">
              <span className="block text-base font-bold">{o.label}</span>
              <span className="block text-sm">{o.hint}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3 pb-2">
          <p className="text-base text-black dark:text-white">
            This replaces every workout you have planned this week with “{chosen.label}”. Workout times are kept.
          </p>
          <button onClick={() => { onApply(chosen.plan); close(); }}
            className="w-full min-h-[52px] rounded-xl bg-violet-600 text-white text-base font-bold">
            Replace plan
          </button>
          <button onClick={() => setPending(null)}
            className="w-full min-h-[48px] rounded-xl bg-gray-100 dark:bg-violet-400/10 text-base font-semibold text-black dark:text-white">
            Back
          </button>
        </div>
      )}
    </BottomSheet>
  );
}

// Plan: a compact week list (tap a day to edit it in a sheet), the workout
// templates as cards (tap one to edit it in a sheet), and saved routes.
export default function PlanTab({ w, openDay, setOpenDay }) {
  const {
    templates, plan, routes, todayName, updatePlan, setBuilderOpen, startEditTemplate,
    setPlannerOpen, deleteRoute,
  } = w;
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-black dark:text-white">This week</h2>
          <button onClick={() => setResetOpen(true)} aria-label="Replace the weekly plan"
            className="w-11 h-11 -mr-2 flex items-center justify-center text-black dark:text-white">
            <Ellipsis className="w-6 h-6" />
          </button>
        </div>
        <div className="bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15 divide-y divide-gray-100 dark:divide-violet-400/15 overflow-hidden">
          {DAYS.map(day => {
            const assigned = dayList(plan[day]);
            const isToday = day === todayName;
            return (
              <button
                key={day}
                onClick={() => setOpenDay(day)}
                aria-label={`Edit ${day}`}
                className={`w-full flex items-center gap-3 px-4 py-3 min-h-[56px] text-left ${isToday ? 'bg-violet-50 dark:bg-violet-500/10' : ''}`}
              >
                <span className="w-12 flex-shrink-0">
                  <span className={`block text-base text-black dark:text-white ${isToday ? 'font-bold' : 'font-semibold'}`}>{day.slice(0, 3)}</span>
                  {isToday && <span className="block text-xs font-bold text-violet-600">Today</span>}
                </span>
                <span className="flex-1 min-w-0 flex flex-wrap gap-1.5">
                  {assigned.length === 0 ? (
                    <span className="text-base text-black dark:text-white">Rest</span>
                  ) : assigned.map(name => (
                    <span key={name} className="text-sm font-medium text-black dark:text-white bg-violet-100 dark:bg-violet-400/20 rounded-full px-3 py-1">
                      {name}
                    </span>
                  ))}
                </span>
                <ChevronRight className="w-5 h-5 text-black dark:text-white flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-black dark:text-white">Workouts</h2>
          <button onClick={() => setBuilderOpen(true)}
            className="min-h-[40px] px-4 rounded-full bg-violet-600 text-white text-sm font-bold flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New
          </button>
        </div>
        {templates.length === 0 ? (
          <p className="text-base text-black dark:text-white py-4 text-center">No workouts yet — create one.</p>
        ) : (
          <div className="space-y-2">
            {templates.map(t => {
              const labels = t.exercises.map(e => parseExercise(e.name).label);
              const shown = labels.slice(0, 3);
              return (
                <button
                  key={t.id}
                  onClick={() => startEditTemplate(t)}
                  aria-label={`Edit ${t.name}`}
                  className="w-full text-left bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15 px-4 py-3 flex items-center gap-3"
                >
                  <span className="flex-1 min-w-0">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-base font-bold text-black dark:text-white truncate">{t.name}</span>
                      <span className="text-sm font-medium text-black dark:text-white flex-shrink-0">
                        {t.exercises.length} exercise{t.exercises.length === 1 ? '' : 's'}
                      </span>
                    </span>
                    <span className="block text-sm text-black dark:text-white truncate">
                      {shown.join(' · ')}{labels.length > shown.length ? ` · +${labels.length - shown.length} more` : ''}
                    </span>
                  </span>
                  <ChevronRight className="w-5 h-5 text-black dark:text-white flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </section>

      <CollapsibleCard
        title="Routes"
        badge={routes.length > 0 ? `${routes.length}` : null}
        actions={
          <button onClick={() => setPlannerOpen(true)}
            className="min-h-[36px] px-3 rounded-full bg-violet-600 text-white text-sm font-bold flex items-center gap-1.5">
            <MapPin className="w-4 h-4" /> Plan route
          </button>
        }
      >
        {routes.length === 0 ? (
          <p className="text-base text-black dark:text-white text-center py-2">
            No routes yet — plan one to make logging repeat runs a two-tap action.
          </p>
        ) : (
          <div className="space-y-2">
            {routes.map(r => (
              <div key={r.id} className="flex items-center gap-3 border border-gray-200 dark:border-violet-400/15 rounded-xl p-2.5">
                <RouteThumb waypoints={r.waypoints} />
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold text-black dark:text-white truncate">{r.name}</div>
                  <div className="text-sm text-black dark:text-white">
                    {r.activity} · {routeDistanceKm(r).toFixed(2)} km · {r.waypoints.length} points
                  </div>
                </div>
                <button onClick={() => deleteRoute(r.id)} aria-label={`Delete ${r.name}`}
                  className="w-11 h-11 flex items-center justify-center text-black dark:text-white active:text-red-500 flex-shrink-0">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CollapsibleCard>

      <DaySheet w={w} day={openDay} onClose={() => setOpenDay(null)} />
      <TemplateSheet w={w} />
      <ResetWeekSheet open={resetOpen} onClose={() => setResetOpen(false)} onApply={updatePlan} />
    </div>
  );
}
