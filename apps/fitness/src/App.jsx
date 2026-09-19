import { useState } from 'react';
import { RefreshCw, AlertTriangle, Check, Trophy, Activity } from 'lucide-react';
import { AppFrame } from '@summit/core';
import useWorkoutData from './useWorkoutData';
import TabBar, { TABS } from './components/TabBar';
import CardioSheet from './components/CardioSheet';
import RoutePlanner from './RoutePlanner';
import TodayTab from './tabs/TodayTab';
import PlanTab from './tabs/PlanTab';
import ProgressTab from './tabs/ProgressTab';
import { CARDIO_ACTIVITIES } from './lib/model';

// Fitness: three tabs over one shared data hook. The data it reads/writes is
// the same summit-data.json and the same summit_* keys as before (the Planner's
// calendar reads the templates, weekly plan and times).
export default function App() {
  const [tab, setTab] = useState('today');
  const w = useWorkoutData();
  const { toast, isLoading, isRefreshing, refreshFromRemote, loadError, plannerOpen, setPlannerOpen, saveRoute } = w;
  const title = TABS.find(t => t.id === tab).label;

  if (isLoading) {
    return (
      <AppFrame appId="fitness" title={title}>
        <div className="space-y-3">
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
        </div>
      </AppFrame>
    );
  }

  return (
    <AppFrame appId="fitness" title={title}>
      <div className="relative">
        {toast && (
          <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] text-xs px-4 py-2.5 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap animate-toast-in animate-success-pulse ${
            toast.isError ? 'bg-red-600 text-white' : toast.isPR ? 'bg-amber-500 text-white' : 'bg-gray-900 text-white'
          }`}>
            {toast.isError ? <AlertTriangle className="w-3.5 h-3.5" /> : toast.isPR ? <Trophy className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
            {toast.message}
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <TabBar tab={tab} setTab={setTab} variant="top" />
          <button
            onClick={refreshFromRemote}
            disabled={isRefreshing}
            aria-label="Refresh data"
            className="ml-auto p-2 text-black dark:text-white disabled:opacity-40"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadError && (
          <div className="mb-3 bg-red-50 dark:bg-red-500/10 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-xs text-red-600">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {tab === 'today' && <TodayTab w={w} onOpenPlan={() => setTab('plan')} />}
        {tab === 'plan' && <PlanTab w={w} />}
        {tab === 'progress' && <ProgressTab w={w} />}

        <button
          onClick={() => {
            w.setCardioForm(p => ({ ...p, routeId: '' }));
            w.setCardioSheetOpen(true);
          }}
          aria-label="Log quick cardio"
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-6 right-4 z-40 w-14 h-14 bg-violet-500 text-white rounded-full shadow-lg shadow-violet-500/30 flex items-center justify-center active:bg-violet-600"
        >
          <Activity className="w-6 h-6" />
        </button>

        <CardioSheet w={w} />

        {plannerOpen && (
          <RoutePlanner
            activities={CARDIO_ACTIVITIES}
            onSave={saveRoute}
            onClose={() => setPlannerOpen(false)}
          />
        )}
      </div>
      <TabBar tab={tab} setTab={setTab} variant="bottom" />
    </AppFrame>
  );
}
