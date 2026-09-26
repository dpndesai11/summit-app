import { useState } from 'react';
import { RefreshCw, AlertTriangle, Check, CalendarCheck, TrendingUp } from 'lucide-react';
import { AppFrame, TabBar } from '@summit/core';
import useHabitsData from './useHabitsData';
import TodayTab from './tabs/TodayTab';
import ProgressTab from './tabs/ProgressTab';

const TABS = [
  { id: 'today', label: 'Today', icon: CalendarCheck },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
];

// Habits: a daily checklist plus streaks, over one shared data hook — the
// same AppFrame + TabBar shell every Summit app uses.
export default function App() {
  const [tab, setTab] = useState('today');
  const w = useHabitsData();
  const { toast, isLoading, isRefreshing, refreshFromRemote, loadError } = w;
  const title = TABS.find(t => t.id === tab).label;

  const refreshButton = (
    <button
      onClick={refreshFromRemote}
      disabled={isRefreshing}
      aria-label="Refresh data"
      className="w-11 h-11 -mr-2 flex items-center justify-center text-black dark:text-white disabled:opacity-40"
    >
      <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
    </button>
  );

  if (isLoading) {
    return (
      <AppFrame appId="habits" title={title}>
        <div className="space-y-3">
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
        </div>
      </AppFrame>
    );
  }

  return (
    <AppFrame appId="habits" title={title} action={refreshButton}>
      <div className="relative">
        {toast && (
          <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] text-xs px-4 py-2.5 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap animate-toast-in animate-success-pulse ${
            toast.isError ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
          }`}>
            {toast.isError ? <AlertTriangle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
            {toast.message}
          </div>
        )}

        <div className="hidden md:block mb-3">
          <TabBar tabs={TABS} tab={tab} setTab={setTab} variant="top" />
        </div>

        {loadError && (
          <div className="mb-3 bg-red-50 dark:bg-red-500/10 border border-red-300 rounded-xl p-3 flex items-start gap-2 text-sm text-black dark:text-white">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-500" />
            <span>{loadError}</span>
          </div>
        )}

        {tab === 'today' && <TodayTab w={w} />}
        {tab === 'progress' && <ProgressTab w={w} />}
      </div>
      <TabBar tabs={TABS} tab={tab} setTab={setTab} variant="bottom" />
    </AppFrame>
  );
}
