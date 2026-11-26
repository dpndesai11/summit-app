import { describe, it, expect } from 'vitest';
import { todayProgress, weekStats, recentDays } from './today';

const today = '2026-11-26';
const planned = [{ name: 'Upper', exercises: [{ name: 'Bench', type: 'weight', sets: 3 }, { name: 'Row', type: 'weight' }, { name: 'Walk', type: 'cardio' }] }];

describe('todayProgress', () => {
  it('is empty with nothing planned', () => {
    expect(todayProgress([], [], [], [], today)).toMatchObject({ done: 0, total: 0, percent: 0 });
  });
  it('counts open-session sets, assuming three where none are set', () => {
    const sessions = [{ date: today, templateName: 'Upper', exercises: { Bench: { sets: [{}, {}, {}, {}] }, Row: { sets: [{}] } } }];
    expect(todayProgress(planned, sessions, [], [], today)).toMatchObject({ done: 4, total: 7, exercisesDone: 1, exercises: 3 });
  });
  it('counts completed logs and cardio, without double counting', () => {
    const logs = [{ date: today, exercise: 'Bench', setDetails: [{}, {}, {}] }, { date: '2026-11-25', exercise: 'Row', setDetails: [{}] }];
    const sessions = [{ date: today, templateName: 'Upper', exercises: {} }];
    const r = todayProgress(planned, sessions, logs, [{ date: today, activity: 'Walking', duration: 20 }], today);
    expect(r).toMatchObject({ done: 4, total: 7, percent: 57 });
  });
});

describe('weekStats / recentDays', () => {
  const strength = [{ date: '2026-11-23' }, { date: '2026-11-23' }, { date: '2026-11-16' }];
  const cardio = [{ date: '2026-11-23', activity: 'Running', duration: 30, distance: 5.25 }, { date: '2026-11-22', activity: 'Swimming', duration: 60, distance: 0 }];
  it('totals only this week up to today', () => {
    expect(weekStats(strength, cardio, today)).toEqual({ days: 1, km: 5.3, minutes: 30 });
  });
  it('groups the latest days, newest first', () => {
    const r = recentDays(strength, cardio, 2, new Date(2026, 10, 26));
    expect(r.map(x => x.date)).toEqual(['2026-11-23', '2026-11-22']);
    expect(r[0].title).toBe('Strength + Running');
    expect(r[0].detail).toContain('2 exercises · 30 min · 5.3 km');
    expect(r[1]).toMatchObject({ title: 'Swimming', kind: 'cardio' });
  });
});
