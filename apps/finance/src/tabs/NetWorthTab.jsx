import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { formatCurrency, formatSwiss } from '../lib/model';
import { latestNetWorth, netWorthChange, netWorthSeries, totalForAccounts } from '../lib/stats';
import TrendChart from '../components/TrendChart';

const card = 'bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15';
const inputClass = 'w-full min-h-[48px] px-4 rounded-xl bg-gray-100 dark:bg-violet-400/10 text-base text-black dark:text-white outline-none focus:ring-2 focus:ring-violet-500';

// Net worth: a manual, occasional snapshot of your account balances, plus a
// trend line across every snapshot you've taken.
export default function NetWorthTab({ w }) {
  const { netWorthSnapshots, addSnapshot, deleteSnapshot } = w;
  const [accounts, setAccounts] = useState([{ name: '', balance: '' }]);
  const series = netWorthSeries(netWorthSnapshots);
  const latest = latestNetWorth(netWorthSnapshots);
  const change = netWorthChange(netWorthSnapshots);

  const setAccount = (i, field, value) => {
    setAccounts(prev => prev.map((a, j) => (j === i ? { ...a, [field]: value } : a)));
  };
  const addAccountRow = () => setAccounts(prev => [...prev, { name: '', balance: '' }]);
  const removeAccountRow = (i) => setAccounts(prev => prev.filter((_, j) => j !== i));

  const submit = () => {
    const cleaned = accounts
      .map(a => ({ name: a.name.trim(), balance: Number(a.balance) || 0 }))
      .filter(a => a.name);
    if (cleaned.length === 0) return;
    addSnapshot(cleaned);
    setAccounts([{ name: '', balance: '' }]);
  };

  return (
    <div className="space-y-6">
      <div className={`${card} p-4`}>
        <div className="text-sm font-medium text-black dark:text-white mb-1">Net worth</div>
        <div className="text-3xl font-bold text-black dark:text-white tabular-nums">
          {latest === null ? '—' : formatCurrency(latest)}
        </div>
        {change !== null && (
          <div className={`text-sm font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {change >= 0 ? '+' : ''}{formatCurrency(change)} since last snapshot
          </div>
        )}
      </div>

      {series.length > 1 && (
        <section>
          <h2 className="text-lg font-bold text-black dark:text-white mb-2">Trend</h2>
          <div className={`${card} p-4`}>
            <TrendChart series={series} unit="£" />
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-bold text-black dark:text-white mb-2">Add a snapshot</h2>
        <div className={`${card} p-4 space-y-3`}>
          {accounts.map((a, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={a.name}
                onChange={e => setAccount(i, 'name', e.target.value)}
                placeholder="e.g. Current account"
                className={`${inputClass} flex-1 min-w-0`}
              />
              <input
                value={a.balance}
                onChange={e => setAccount(i, 'balance', e.target.value)}
                type="number"
                inputMode="decimal"
                placeholder="Balance"
                className={`${inputClass} !w-32 flex-shrink-0`}
              />
              {accounts.length > 1 && (
                <button
                  onClick={() => removeAccountRow(i)}
                  aria-label={`Remove account ${i + 1}`}
                  className="w-11 h-11 flex-shrink-0 flex items-center justify-center text-black dark:text-white active:text-red-500"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addAccountRow}
            className="w-full min-h-[44px] rounded-xl bg-gray-100 dark:bg-violet-400/10 text-base font-semibold text-black dark:text-white flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> Add account
          </button>
          <button
            onClick={submit}
            disabled={accounts.every(a => !a.name.trim())}
            className="w-full min-h-[48px] rounded-xl bg-violet-600 text-white text-base font-semibold disabled:opacity-40"
          >
            Save snapshot
          </button>
        </div>
      </section>

      {netWorthSnapshots.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-black dark:text-white mb-2">Snapshots</h2>
          <div className={`${card} divide-y divide-gray-100 dark:divide-violet-400/15 overflow-hidden`}>
            {[...netWorthSnapshots].sort((a, b) => b.date.localeCompare(a.date)).map(s => (
              <div key={s.id} className="flex items-center justify-between gap-2 px-4 py-3 min-h-[56px]">
                <span className="text-base font-semibold text-black dark:text-white">{formatSwiss(s.date)}</span>
                <span className="flex items-center gap-3">
                  <span className="text-base font-bold text-black dark:text-white tabular-nums">{formatCurrency(totalForAccounts(s.accounts))}</span>
                  <button
                    onClick={() => deleteSnapshot(s.id)}
                    aria-label={`Delete snapshot from ${formatSwiss(s.date)}`}
                    className="w-9 h-9 flex items-center justify-center text-black dark:text-white active:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
