import { describe, expect, it } from 'vitest';
import { monthKey } from './model';
import { isOverdue, isPaid, latestNetWorth, monthlyTotal, netWorthChange, netWorthSeries, totalForAccounts } from './stats';

describe('monthlyTotal', () => {
  it('sums bill amounts', () => {
    expect(monthlyTotal([{ amount: 10 }, { amount: 25.5 }])).toBe(35.5);
  });
  it('is 0 for no bills', () => {
    expect(monthlyTotal([])).toBe(0);
  });
});

describe('isOverdue', () => {
  const bill = { id: 1, dueDay: 15 };
  it('is overdue once the due day has passed and nothing is marked paid', () => {
    const today = new Date(2026, 8, 20); // 20 Sept, dueDay 15
    expect(isOverdue(bill, today, {})).toBe(true);
  });
  it('is not overdue before the due day', () => {
    const today = new Date(2026, 8, 10); // 10 Sept
    expect(isOverdue(bill, today, {})).toBe(false);
  });
  it('is not overdue once marked paid this month', () => {
    const today = new Date(2026, 8, 20);
    const key = monthKey(today);
    expect(isOverdue(bill, today, { [key]: { 1: true } })).toBe(false);
  });
  it('isPaid reads the same shape isOverdue checks', () => {
    const key = '2026-09';
    expect(isPaid(1, key, { '2026-09': { 1: true } })).toBe(true);
    expect(isPaid(2, key, { '2026-09': { 1: true } })).toBe(false);
  });
});

describe('net worth', () => {
  it('totals an accounts list', () => {
    expect(totalForAccounts([{ balance: 1000 }, { balance: -200 }])).toBe(800);
  });

  it('sorts snapshots oldest-first and recomputes each total from its accounts', () => {
    const snapshots = [
      { id: 2, date: '2026-09-01', accounts: [{ balance: 5000 }], total: 999 }, // stale stored total ignored
      { id: 1, date: '2026-08-01', accounts: [{ balance: 4000 }] },
    ];
    expect(netWorthSeries(snapshots)).toEqual([
      { date: '2026-08-01', value: 4000 },
      { date: '2026-09-01', value: 5000 },
    ]);
  });

  it('latestNetWorth is the newest snapshot total, or null with none', () => {
    expect(latestNetWorth([])).toBeNull();
    expect(latestNetWorth([{ date: '2026-08-01', accounts: [{ balance: 100 }] }])).toBe(100);
  });

  it('netWorthChange compares the latest two snapshots, or null with fewer than two', () => {
    expect(netWorthChange([{ date: '2026-08-01', accounts: [{ balance: 100 }] }])).toBeNull();
    const snapshots = [
      { date: '2026-08-01', accounts: [{ balance: 4000 }] },
      { date: '2026-09-01', accounts: [{ balance: 4500 }] },
    ];
    expect(netWorthChange(snapshots)).toBe(500);
  });
});
