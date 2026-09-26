import { monthKey } from './model';

// Pure finance maths — bill totals/overdue detection and net-worth trend. No
// React, no I/O.

export const monthlyTotal = (bills) => bills.reduce((a, b) => a + (Number(b.amount) || 0), 0);

export const isPaid = (billId, key, payments) => !!payments[key]?.[billId];

// A bill counts as overdue once its due day has passed in the current month
// and it hasn't been marked paid — never overdue in a month that hasn't
// reached its due day yet, and never for a future/past month you're not on.
export const isOverdue = (bill, today, payments) => {
  const key = monthKey(today);
  if (isPaid(bill.id, key, payments)) return false;
  return today.getDate() > bill.dueDay;
};

export const totalForAccounts = (accounts) => accounts.reduce((a, acc) => a + (Number(acc.balance) || 0), 0);

// Snapshots oldest-first, each with its running total (recomputed from its
// accounts rather than trusting a possibly-stale stored `total`).
export const netWorthSeries = (snapshots) => (
  [...snapshots]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(s => ({ date: s.date, value: totalForAccounts(s.accounts) }))
);

export const latestNetWorth = (snapshots) => {
  const series = netWorthSeries(snapshots);
  return series.length > 0 ? series[series.length - 1].value : null;
};

// Change from the previous snapshot to the latest one, or null with fewer
// than two snapshots (nothing to compare against yet).
export const netWorthChange = (snapshots) => {
  const series = netWorthSeries(snapshots);
  if (series.length < 2) return null;
  return series[series.length - 1].value - series[series.length - 2].value;
};
