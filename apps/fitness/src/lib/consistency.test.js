import { describe, it, expect } from 'vitest';
import { buildConsistency } from './consistency';

const today = new Date(2026, 10, 26); // Thursday 26 Nov 2026

describe('buildConsistency', () => {
  const strength = [{ date: '2026-11-23' }, { date: '2026-11-23' }, { date: '2026-11-24' }];
  const cardio = [{ date: '2026-11-24' }, { date: '2026-11-15' }, { date: '2026-11-27' }, { date: '2026-01-01' }];
  const r = buildConsistency(strength, cardio, 10, today);
  const day = (iso) => r.weeks.flatMap(w => w.days).find(d => d.iso === iso);

  it('builds Monday-start weeks ending with this week', () => {
    expect(r.weeks).toHaveLength(10);
    r.weeks.forEach(w => expect(w.days).toHaveLength(7));
    expect(r.weeks[9].weekStart).toBe('2026-11-23');
    expect(r.weeks[0].weekStart).toBe('2026-09-21');
  });
  it('marks strength, cardio, today and the future', () => {
    expect(day('2026-11-23')).toMatchObject({ strength: true, cardio: false });
    expect(day('2026-11-24')).toMatchObject({ strength: true, cardio: true });
    expect(day('2026-11-26')).toMatchObject({ isToday: true, isFuture: false });
    expect(day('2026-11-27').isFuture).toBe(true);
  });
  it('counts each active day once and ignores future and out-of-range logs', () => {
    expect(r.thisWeek).toBe(2);
    expect(r.activeDays).toBe(3);
    expect(r.bestWeek).toBe(2);
  });
});
