// Finance data model: storage keys, defaults and small date helpers (own
// copy, same convention as every other Summit app).

export const STORAGE_KEYS = {
  bills: 'summit_bills',
  billPayments: 'summit_bill_payments',
  netWorthSnapshots: 'summit_net_worth_snapshots',
};

// A small fixed palette for bill categories — same idea as Fitness's
// TYPE_META / Planner's BLOCK_COLOR_PRESETS: a fixed set so the exact
// Tailwind classes exist in source for the build to pick up.
export const CATEGORY_PRESETS = {
  Housing: { text: 'text-blue-600', badge: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600' },
  Utilities: { text: 'text-amber-600', badge: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600' },
  Subscriptions: { text: 'text-violet-600', badge: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600' },
  Insurance: { text: 'text-teal-600', badge: 'bg-teal-50 dark:bg-teal-500/10 text-teal-600' },
  Other: { text: 'text-rose-600', badge: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600' },
};
export const CATEGORIES = Object.keys(CATEGORY_PRESETS);

export const toISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const formatSwiss = (iso) => {
  if (!iso) return '—';
  const p = iso.split('-');
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : iso;
};

export const formatShortDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

// 'YYYY-MM' for the given date — bill payments are tracked per calendar month.
export const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const formatMonth = (key) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};

export const normalizeBill = (b) => ({
  ...b,
  dueDay: Math.min(31, Math.max(1, Number(b.dueDay) || 1)),
  category: CATEGORIES.includes(b.category) ? b.category : 'Other',
  autopay: !!b.autopay,
});

export const formatCurrency = (n) => `£${(Number(n) || 0).toFixed(2)}`;
