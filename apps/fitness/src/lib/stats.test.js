import { describe, it, expect } from 'vitest';
import {
  calcCurrentStreak, computeAllTimeBests, expandLogSets, logSetCount, logVolume, logType,
  sessionKey, sessionHasProgress, sessionSetCount, groupByDate, weekDates,
} from './stats';
import { toISO } from './model';

const daysAgo = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return toISO(d); };

describe('calcCurrentStreak', () => {
  it('counts consecutive days ending today', () => {
    expect(calcCurrentStreak(new Set([daysAgo(0), daysAgo(1), daysAgo(2)]))).toBe(3);
  });
  it('does not look broken until a full day has passed with nothing logged', () => {
    expect(calcCurrentStreak(new Set([daysAgo(1), daysAgo(2)]))).toBe(2);
  });
  it('is 0 after a gap of two days', () => {
    expect(calcCurrentStreak(new Set([daysAgo(2), daysAgo(3)]))).toBe(0);
  });
  it('stops at the first gap', () => {
    expect(calcCurrentStreak(new Set([daysAgo(0), daysAgo(1), daysAgo(3)]))).toBe(2);
  });
});

describe('log helpers', () => {
  const detailed = { exercise: 'Squat', date: '2026-09-01', setDetails: [{ weight: 100, reps: 5 }, { weight: 110, reps: 3 }] };
  const legacy = { exercise: 'Squat', date: '2026-08-01', weight: 80, sets: 3, reps: 8 };

  it('expands both the per-set shape and the older aggregate shape', () => {
    expect(expandLogSets(detailed)).toHaveLength(2);
    expect(expandLogSets(legacy)).toHaveLength(3);
    expect(expandLogSets(legacy)[0]).toMatchObject({ weight: 80, reps: 8 });
  });
  it('counts sets and volume for both shapes', () => {
    expect(logSetCount(detailed)).toBe(2);
    expect(logSetCount(legacy)).toBe(3);
    expect(logVolume(detailed)).toBe(100 * 5 + 110 * 3);
    expect(logVolume(legacy)).toBe(80 * 8 * 3);
  });
  it('defaults the type to weight', () => {
    expect(logType(detailed)).toBe('weight');
    expect(logType({ type: 'bodyweight' })).toBe('bodyweight');
  });
  it('ignores an optional seconds field on a set', () => {
    const timed = { exercise: 'Plank', type: 'bodyweight', setDetails: [{ reps: 0, weight: 0, seconds: 60 }] };
    expect(logVolume(timed)).toBe(0);
    expect(logSetCount(timed)).toBe(1);
  });
});

describe('computeAllTimeBests', () => {
  it('tracks max weight for lifts and max reps for bodyweight, per exercise', () => {
    const bests = computeAllTimeBests([
      { exercise: 'Squat', setDetails: [{ weight: 100, reps: 5 }, { weight: 120, reps: 1 }] },
      { exercise: 'Squat', setDetails: [{ weight: 110, reps: 5 }] },
      { exercise: 'Push-up', type: 'bodyweight', setDetails: [{ reps: 15, weight: 0 }, { reps: 20, weight: 0 }] },
    ]);
    expect(bests.Squat).toEqual({ value: 120, type: 'weight' });
    expect(bests['Push-up']).toEqual({ value: 20, type: 'bodyweight' });
  });
  it('ignores zero values', () => {
    expect(computeAllTimeBests([{ exercise: 'Plank', type: 'bodyweight', setDetails: [{ reps: 0, weight: 0 }] }])).toEqual({});
  });
});

describe('sessions', () => {
  const s = { date: '2026-09-19', templateName: 'Gym 1', exercises: { Squat: { sets: [{}, {}] }, Row: { sets: [] } } };
  it('builds a stable key', () => expect(sessionKey(s)).toBe('2026-09-19::Gym 1'));
  it('detects progress and counts sets', () => {
    expect(sessionHasProgress(s)).toBe(true);
    expect(sessionSetCount(s)).toBe(2);
    expect(sessionHasProgress({ ...s, exercises: { Row: { sets: [] } } })).toBe(false);
  });
});

describe('groupByDate', () => {
  it('groups logs by date, newest first', () => {
    const groups = groupByDate([{ date: '2026-09-01', id: 1 }, { date: '2026-09-03', id: 2 }, { date: '2026-09-01', id: 3 }]);
    expect(groups.map(g => g[0])).toEqual(['2026-09-03', '2026-09-01']);
    expect(groups[1][1]).toHaveLength(2);
  });
});

describe('weekDates', () => {
  it('starts on Monday and covers seven days', () => {
    // Sat 2026-09-19
    const week = weekDates(new Date(2026, 8, 19));
    expect(week.map(d => d.day[0])).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    expect(week[0].iso).toBe('2026-09-14');
    expect(week[6].iso).toBe('2026-09-20');
    expect(week.filter(d => d.isToday).map(d => d.day)).toEqual(['Saturday']);
    expect(week[6].isFuture).toBe(true);
    expect(week[0].isFuture).toBe(false);
  });
  it('treats Sunday as the last day of its week', () => {
    const week = weekDates(new Date(2026, 8, 20));
    expect(week[0].iso).toBe('2026-09-14');
    expect(week.find(d => d.isToday).day).toBe('Sunday');
  });
});
