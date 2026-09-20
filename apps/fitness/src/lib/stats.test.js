import { describe, it, expect } from 'vitest';
import {
  calcCurrentStreak, computeAllTimeBests, expandLogSets, logSetCount, logVolume, logType,
  sessionKey, sessionHasProgress, sessionSetCount, groupByDate, weekDates,
  setMetric, lastSetFor, defaultSetInputs, formatSetText,
  mondayOf, weeklyAggregates, exerciseSeries, prBadgeFor, exerciseSummaries,
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

describe('setMetric', () => {
  it('uses weight for lifts, reps or seconds for bodyweight', () => {
    expect(setMetric({ weight: 80, reps: 5 }, 'weight')).toBe(80);
    expect(setMetric({ reps: 12, weight: 0 }, 'bodyweight')).toBe(12);
    expect(setMetric({ reps: 0, weight: 0, seconds: 60 }, 'bodyweight')).toBe(60);
  });
  it('lets a timed hold count as a personal best', () => {
    const bests = computeAllTimeBests([
      { exercise: 'Plank', type: 'bodyweight', setDetails: [{ reps: 0, weight: 0, seconds: 45 }] },
      { exercise: 'Plank', type: 'bodyweight', setDetails: [{ reps: 0, weight: 0, seconds: 60 }] },
    ]);
    expect(bests.Plank).toEqual({ value: 60, type: 'bodyweight' });
  });
});

describe('lastSetFor', () => {
  const logs = [
    { exercise: 'Squat', date: '2026-09-01', setDetails: [{ weight: 100, reps: 5 }, { weight: 105, reps: 5 }] },
    { exercise: 'Row', date: '2026-09-10', setDetails: [{ weight: 50, reps: 10 }] },
    { exercise: 'Squat', date: '2026-09-08', setDetails: [{ weight: 110, reps: 4 }, { weight: 115, reps: 3 }] },
  ];
  it('returns the last set of the newest entry for that exercise', () => {
    expect(lastSetFor('Squat', logs)).toMatchObject({ weight: 115, reps: 3, date: '2026-09-08' });
  });
  it('breaks date ties by log order', () => {
    const tied = [
      { exercise: 'Squat', date: '2026-09-08', setDetails: [{ weight: 90, reps: 5 }] },
      { exercise: 'Squat', date: '2026-09-08', setDetails: [{ weight: 95, reps: 5 }] },
    ];
    expect(lastSetFor('Squat', tied).weight).toBe(95);
  });
  it('reads older aggregate logs too', () => {
    expect(lastSetFor('Press', [{ exercise: 'Press', date: '2026-08-01', weight: 40, sets: 3, reps: 8 }])).toMatchObject({ weight: 40, reps: 8 });
  });
  it('is null when never logged', () => {
    expect(lastSetFor('Deadlift', logs)).toBeNull();
  });
});

describe('defaultSetInputs', () => {
  it('falls back to 40 kg x 8 and 8 reps with no history', () => {
    expect(defaultSetInputs(false, null)).toEqual({ weight: 40, reps: 8 });
    expect(defaultSetInputs(true, null)).toEqual({ reps: 8 });
  });
  it('uses the last set when there is one', () => {
    expect(defaultSetInputs(false, { weight: 62.5, reps: 6 })).toEqual({ weight: 62.5, reps: 6 });
    expect(defaultSetInputs(true, { reps: 15 })).toEqual({ reps: 15 });
  });
});

describe('mondayOf', () => {
  it('finds the Monday of any date, including Sundays and month boundaries', () => {
    expect(mondayOf('2026-09-16')).toBe('2026-09-14'); // Wed
    expect(mondayOf('2026-09-14')).toBe('2026-09-14'); // Mon
    expect(mondayOf('2026-09-20')).toBe('2026-09-14'); // Sun
    expect(mondayOf('2026-10-01')).toBe('2026-09-28'); // crosses month
  });
});

describe('weeklyAggregates', () => {
  const today = new Date(2026, 8, 19); // Sat 19 Sep 2026 → this week starts Mon 14 Sep
  const strength = [
    { exercise: 'Squat', date: '2026-09-14', setDetails: [{ weight: 100, reps: 5 }] },   // 500
    { exercise: 'Row', date: '2026-09-16', setDetails: [{ weight: 50, reps: 10 }] },       // 500, same week
    { exercise: 'Squat', date: '2026-09-01', setDetails: [{ weight: 100, reps: 10 }] },   // 1000, week of 31 Aug
  ];
  const cardio = [{ date: '2026-09-15', duration: 30 }, { date: '2026-09-02', duration: 45 }];

  it('returns the requested number of Monday-start weeks, oldest first', () => {
    const weeks = weeklyAggregates(strength, cardio, 4, today);
    expect(weeks.map(w => w.weekStart)).toEqual(['2026-08-24', '2026-08-31', '2026-09-07', '2026-09-14']);
  });
  it('sums volume, cardio minutes and active days per week', () => {
    const weeks = weeklyAggregates(strength, cardio, 4, today);
    const current = weeks[3];
    expect(current).toMatchObject({ volume: 1000, cardioMin: 30, activeDays: 3 });
    expect(weeks[1]).toMatchObject({ volume: 1000, cardioMin: 45, activeDays: 2 });
  });
  it('keeps empty weeks as zeros (a deload week must show as a low bar)', () => {
    const weeks = weeklyAggregates(strength, cardio, 4, today);
    expect(weeks[0]).toMatchObject({ volume: 0, cardioMin: 0, activeDays: 0 });
    expect(weeks[2]).toMatchObject({ volume: 0, cardioMin: 0, activeDays: 0 });
  });
  it('ignores logs older than the window', () => {
    const weeks = weeklyAggregates([{ exercise: 'X', date: '2025-01-01', setDetails: [{ weight: 999, reps: 9 }] }], [], 4, today);
    expect(weeks.every(w => w.volume === 0)).toBe(true);
  });
});

describe('exerciseSeries', () => {
  const logs = [
    { exercise: 'Bench', date: '2026-09-01', setDetails: [{ weight: 60, reps: 8 }, { weight: 65, reps: 5 }] },
    { exercise: 'Bench', date: '2026-09-08', setDetails: [{ weight: 62.5, reps: 8 }] },
    { exercise: 'Bench', date: '2026-09-15', setDetails: [{ weight: 70, reps: 3 }] },
    { exercise: 'Row', date: '2026-09-01', setDetails: [{ weight: 40, reps: 10 }] },
  ];
  it('gives the best weight per day, in date order, with a kg unit', () => {
    const s = exerciseSeries('Bench', logs);
    expect(s.map(p => [p.date, p.value])).toEqual([['2026-09-01', 65], ['2026-09-08', 62.5], ['2026-09-15', 70]]);
    expect(s[0].unit).toBe('kg');
  });
  it('marks real records only — the first day is not a PR, a lower day is not, a higher day is', () => {
    expect(exerciseSeries('Bench', logs).map(p => p.isPR)).toEqual([false, false, true]);
  });
  it('merges two entries on the same day into that day\'s best', () => {
    const s = exerciseSeries('Bench', [
      { exercise: 'Bench', date: '2026-09-01', setDetails: [{ weight: 60, reps: 8 }] },
      { exercise: 'Bench', date: '2026-09-01', setDetails: [{ weight: 70, reps: 3 }] },
    ]);
    expect(s).toHaveLength(1);
    expect(s[0].value).toBe(70);
  });
  it('uses reps for bodyweight and seconds for timed holds', () => {
    expect(exerciseSeries('Push-up', [{ exercise: 'Push-up', type: 'bodyweight', date: '2026-09-01', setDetails: [{ reps: 12 }, { reps: 15 }] }])[0])
      .toMatchObject({ value: 15, unit: 'reps' });
    expect(exerciseSeries('Plank', [{ exercise: 'Plank', type: 'bodyweight', date: '2026-09-01', setDetails: [{ reps: 0, seconds: 60 }] }])[0])
      .toMatchObject({ value: 60, unit: 's' });
  });
  it('is empty for an exercise that was never logged', () => {
    expect(exerciseSeries('Deadlift', logs)).toEqual([]);
  });
});

describe('prBadgeFor', () => {
  const logs = [
    { id: 1, exercise: 'Bench', date: '2026-09-01', setDetails: [{ weight: 60, reps: 8 }] },
    { id: 2, exercise: 'Bench', date: '2026-09-08', setDetails: [{ weight: 55, reps: 8 }] },
    { id: 3, exercise: 'Bench', date: '2026-09-15', setDetails: [{ weight: 65, reps: 5 }] },
    { id: 4, exercise: 'Row', date: '2026-09-01', setDetails: [{ weight: 40, reps: 10 }] },
  ];
  it('never badges the first time an exercise was logged', () => {
    expect(prBadgeFor(logs[0], logs)).toBe(false);
    expect(prBadgeFor(logs[3], logs)).toBe(false);
  });
  it('does not badge a lighter later day', () => expect(prBadgeFor(logs[1], logs)).toBe(false));
  it('badges a day that beat every earlier one', () => expect(prBadgeFor(logs[2], logs)).toBe(true));
  it('does not badge a tie', () => {
    const tie = [...logs, { id: 5, exercise: 'Bench', date: '2026-09-22', setDetails: [{ weight: 65, reps: 5 }] }];
    expect(prBadgeFor(tie[4], tie)).toBe(false);
  });
});

describe('exerciseSummaries', () => {
  it('lists each exercise once, most recently trained first, with latest / best / PR count', () => {
    const summaries = exerciseSummaries([
      { exercise: 'Bench', date: '2026-09-01', setDetails: [{ weight: 60, reps: 8 }] },
      { exercise: 'Bench', date: '2026-09-15', setDetails: [{ weight: 70, reps: 3 }] },
      { exercise: 'Row', date: '2026-09-20', setDetails: [{ weight: 40, reps: 10 }] },
    ]);
    expect(summaries.map(s => s.exercise)).toEqual(['Row', 'Bench']);
    expect(summaries[1]).toMatchObject({ latest: 70, best: 70, sessions: 2, prCount: 1, unit: 'kg' });
    expect(summaries[0]).toMatchObject({ sessions: 1, prCount: 0 });
  });
});

describe('formatSetText', () => {
  it('formats lifts, reps and timed holds', () => {
    expect(formatSetText({ weight: 60, reps: 8 }, false)).toBe('60kg × 8');
    expect(formatSetText({ reps: 12 }, true)).toBe('12 reps');
    expect(formatSetText({ reps: 0, seconds: 45 }, true)).toBe('45s');
    expect(formatSetText({ reps: 0, seconds: 30, perSide: true }, true)).toBe('30s/side');
  });
});
