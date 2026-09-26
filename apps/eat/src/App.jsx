import { useState } from 'react';
import { RefreshCw, AlertTriangle, Check, CalendarDays, ShoppingCart } from 'lucide-react';
import { AppFrame, TabBar } from '@summit/core';
import useMealsData from './useMealsData';
import MealsSection from './MealsSection';

const TABS = [
  { id: 'week', label: 'Week', icon: CalendarDays },
  { id: 'shopping', label: 'Shopping', icon: ShoppingCart },
];

// Eat: two tabs (Week, Shopping) over one data hook, same shell every Summit
// app uses (AppFrame + the shared TabBar + a centered toast) — see App.jsx in
// apps/fitness for the pattern this mirrors. The data it reads/writes is the
// same summit-data.json and the same summit_* keys as before.
export default function App() {
  const [tab, setTab] = useState('week');
  const m = useMealsData();
  const { toast, isLoading, isRefreshing, refreshFromRemote, loadError } = m;
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
      <AppFrame appId="eat" title={title}>
        <div className="space-y-3">
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
        </div>
      </AppFrame>
    );
  }

  return (
    <AppFrame appId="eat" title={title} action={refreshButton}>
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

        <MealsSection m={m} subTab={tab} />
      </div>
      <TabBar tabs={TABS} tab={tab} setTab={setTab} variant="bottom" />
    </AppFrame>
  );
}
