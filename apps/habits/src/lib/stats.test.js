import { describe, expect, it } from 'vitest';
import { toISO } from './model';
import { anyHabitStreak, calcStreak, datesFor, heatmapWeeks, streakFor } from './stats';

const iso = (daysAgo) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return toISO(d);
};

describe('calcStreak', () => {
  it('counts consecutive days ending today', () => {
    expect(calcStreak(new Set([iso(0), iso(1), iso(2)]))).toBe(3);
  });

  it('stops at the first gap', () => {
    expect(calcStreak(new Set([iso(0), iso(1), iso(3)]))).toBe(2);
  });

  it('still counts a streak that ended yesterday (today not logged yet)', () => {
    expect(calcStreak(new Set([iso(1), iso(2)]))).toBe(2);
  });

  it('is 0 when nothing is logged, and 0 when only older-than-yesterday days are logged', () => {
    expect(calcStreak(new Set())).toBe(0);
    expect(calcStreak(new Set([iso(2)]))).toBe(0);
  });
});

describe('datesFor / streakFor', () => {
  it('only counts the given habit, ignoring other habits logged the same day', () => {
    const logs = {
      [iso(0)]: ['water', 'reading'],
      [iso(1)]: ['water'],
      [iso(2)]: ['reading'],
    };
    expect(datesFor('water', logs)).toEqual(new Set([iso(0), iso(1)]));
    expect(streakFor('water', logs)).toBe(2);
    expect(streakFor('reading', logs)).toBe(1); // yesterday's reading breaks the streak to today
  });

  it('ignores malformed log entries instead of throwing', () => {
    const logs = { [iso(0)]: null, [iso(1)]: 'not-an-array' };
    expect(datesFor('water', logs).size).toBe(0);
  });
});

describe('anyHabitStreak', () => {
  it('counts a day active if any habit was done', () => {
    const logs = { [iso(0)]: ['reading'], [iso(1)]: ['water'], [iso(2)]: [] };
    expect(anyHabitStreak(logs)).toBe(2);
  });
});

describe('heatmapWeeks', () => {
  it('returns the requested number of 7-day weeks, marking done days and future days', () => {
    const logs = { [iso(0)]: ['water'] };
    const weeks = heatmapWeeks('water', logs, 3);
    expect(weeks).toHaveLength(3);
    weeks.forEach(w => expect(w).toHaveLength(7));
    const flat = weeks.flat();
    expect(flat.find(c => c.iso === iso(0)).done).toBe(true);
    expect(flat.some(c => c.isFuture)).toBe(true);
  });
});
