import { useState } from 'react';
import { AlertTriangle, Check, Plus, Repeat, Trash2 } from 'lucide-react';
import { CATEGORIES, CATEGORY_PRESETS, formatCurrency, formatMonth, monthKey } from '../lib/model';
import { isOverdue, isPaid, monthlyTotal } from '../lib/stats';

const card = 'bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15';
const inputClass = 'w-full min-h-[48px] px-4 rounded-xl bg-gray-100 dark:bg-violet-400/10 text-base text-black dark:text-white outline-none focus:ring-2 focus:ring-violet-500';

// Bills: this month's recurring bills, each with a paid toggle, an overdue
// flag once its due day has passed unpaid, and a running monthly total.
export default function BillsTab({ w }) {
  const { bills, billPayments, addBill, deleteBill, togglePaid } = w;
  const [draft, setDraft] = useState({ name: '', amount: '', dueDay: '1', category: 'Other', autopay: false });
  const today = new Date();
  const key = monthKey(today);
  const total = monthlyTotal(bills);
  const paidTotal = monthlyTotal(bills.filter(b => isPaid(b.id, key, billPayments)));

  const submit = () => {
    const name = draft.name.trim();
    const amount = Number(draft.amount);
    if (!name || !amount) return;
    addBill({ name, amount, dueDay: Number(draft.dueDay) || 1, category: draft.category, autopay: draft.autopay });
    setDraft({ name: '', amount: '', dueDay: '1', category: 'Other', autopay: false });
  };

  return (
    <div className="space-y-6">
      <div className={`${card} p-4`}>
        <div className="text-sm font-medium text-black dark:text-white mb-1">{formatMonth(key)}</div>
        <div className="text-3xl font-bold text-black dark:text-white tabular-nums">{formatCurrency(total)}</div>
        <div className="text-sm text-black dark:text-white">{formatCurrency(paidTotal)} paid so far</div>
      </div>

      <section>
        <h2 className="text-lg font-bold text-black dark:text-white mb-2">This month's bills</h2>
        {bills.length === 0 ? (
          <div className={`${card} p-5 text-center text-base text-black dark:text-white`}>
            No bills yet — add your first one below.
          </div>
        ) : (
          <div className={`${card} divide-y divide-gray-100 dark:divide-violet-400/15 overflow-hidden`}>
            {bills.map(b => {
              const meta = CATEGORY_PRESETS[b.category];
              const paid = isPaid(b.id, key, billPayments);
              const overdue = isOverdue(b, today, billPayments);
              return (
                <div key={b.id} className="flex items-center gap-3 px-4 py-3 min-h-[64px]">
                  <button
                    onClick={() => togglePaid(b.id, key)}
                    aria-pressed={paid}
                    aria-label={`${b.name} ${paid ? 'paid' : 'not paid'}`}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      paid ? 'bg-green-600 border-transparent' : 'border-gray-300 dark:border-white/20'
                    }`}
                  >
                    {paid && <Check className="w-4 h-4 text-white" />}
                  </button>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="text-base font-semibold text-black dark:text-white truncate">{b.name}</span>
                      {b.autopay && <Repeat className="w-3.5 h-3.5 text-black dark:text-white flex-shrink-0" aria-label="Autopay" />}
                    </span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.badge}`}>{b.category}</span>
                      <span className="text-sm text-black dark:text-white">Due day {b.dueDay}</span>
                      {overdue && (
                        <span className="text-sm font-semibold text-red-500 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Overdue
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="text-base font-bold text-black dark:text-white tabular-nums flex-shrink-0">{formatCurrency(b.amount)}</span>
                  <button
                    onClick={() => deleteBill(b.id)}
                    aria-label={`Delete ${b.name}`}
                    className="w-9 h-9 flex items-center justify-center text-black dark:text-white active:text-red-500 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-black dark:text-white mb-2">Add a bill</h2>
        <div className={`${card} p-4 space-y-3`}>
          <input
            value={draft.name}
            onChange={e => setDraft(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Rent"
            className={inputClass}
          />
          <div className="flex gap-2">
            <input
              value={draft.amount}
              onChange={e => setDraft(p => ({ ...p, amount: e.target.value }))}
              type="number"
              inputMode="decimal"
              placeholder="Amount"
              className={inputClass}
            />
            <input
              value={draft.dueDay}
              onChange={e => setDraft(p => ({ ...p, dueDay: e.target.value }))}
              type="number"
              inputMode="numeric"
              min="1"
              max="31"
              placeholder="Due day"
              className={inputClass}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setDraft(p => ({ ...p, category: c }))}
                aria-pressed={draft.category === c}
                className={`min-h-[40px] px-3 rounded-full text-sm font-semibold ${
                  draft.category === c ? CATEGORY_PRESETS[c].badge + ' ring-2 ring-inset ring-current' : 'bg-gray-100 dark:bg-violet-400/10 text-black dark:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <button
            onClick={() => setDraft(p => ({ ...p, autopay: !p.autopay }))}
            aria-pressed={draft.autopay}
            className="w-full min-h-[44px] flex items-center gap-2.5 text-base text-black dark:text-white"
          >
            <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
              draft.autopay ? 'bg-violet-600 border-transparent' : 'border-gray-300 dark:border-white/20'
            }`}>
              {draft.autopay && <Check className="w-4 h-4 text-white" />}
            </span>
            Autopay
          </button>
          <button
            onClick={submit}
            disabled={!draft.name.trim() || !Number(draft.amount)}
            className="w-full min-h-[48px] rounded-xl bg-violet-600 text-white text-base font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> Add bill
          </button>
        </div>
      </section>
    </div>
  );
}
