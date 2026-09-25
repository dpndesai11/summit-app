import { describe, expect, it } from 'vitest';
import { buildFitnessCsv } from './exportCsv';

describe('buildFitnessCsv', () => {
  it('expands a strength log into one row per set, with clean labels', () => {
    const strength = [{
      id: 1, date: '2026-09-14', exercise: 'Barbell or DB Bench Press\t4\t8–10', type: 'weight',
      setDetails: [
        { setNumber: 1, reps: 8, weight: 40 },
        { setNumber: 2, reps: 8, weight: 40 },
      ],
    }];
    const csv = buildFitnessCsv(strength, []);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('date,kind,exercise,set,reps,weight_kg,seconds,per_side,duration_min,distance_km,pr');
    expect(lines).toHaveLength(3);
    // A first-ever log of an exercise is never a PR (same rule as the Progress tab).
    expect(lines[1]).toBe('2026-09-14,weight,Barbell or DB Bench Press,1,8,40,,,,,');
    expect(lines[2]).toBe('2026-09-14,weight,Barbell or DB Bench Press,2,8,40,,,,,');
  });

  it('writes a bodyweight timed set with seconds and per_side, no weight', () => {
    const strength = [{
      id: 2, date: '2026-09-15', exercise: 'Plank — 30s/side', type: 'bodyweight',
      setDetails: [{ setNumber: 1, reps: 0, weight: 0, seconds: 30, perSide: true }],
    }];
    const csv = buildFitnessCsv(strength, []);
    const row = csv.split('\n')[1];
    expect(row).toBe('2026-09-15,bodyweight,Plank,1,,,30,yes,,,');
  });

  it('writes a cardio log as one row with no set/reps/weight columns', () => {
    const cardio = [{ id: 3, date: '2026-09-16', activity: 'Running', duration: 35, distance: 5 }];
    const csv = buildFitnessCsv([], cardio);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('2026-09-16,cardio,Running,,,,,,35,5,');
  });

  it('only the day\'s all-time-best log gets pr=yes, and a first-ever log is never a PR', () => {
    const strength = [
      { id: 1, date: '2026-09-01', exercise: 'Squat', type: 'weight', setDetails: [{ setNumber: 1, reps: 5, weight: 60 }] },
      { id: 2, date: '2026-09-08', exercise: 'Squat', type: 'weight', setDetails: [{ setNumber: 1, reps: 5, weight: 65 }] },
    ];
    const csv = buildFitnessCsv(strength, []);
    const lines = csv.split('\n').slice(1);
    const byDate = Object.fromEntries(lines.map(l => [l.split(',')[0], l]));
    expect(byDate['2026-09-01'].endsWith(',')).toBe(true); // no PR
    expect(byDate['2026-09-08'].endsWith(',yes')).toBe(true); // beats the earlier day
  });

  it('quotes a comma-containing value and produces an empty-body CSV for no logs', () => {
    const cardio = [{ id: 1, date: '2026-09-01', activity: 'Trail, hilly', duration: 40, distance: 8 }];
    const csv = buildFitnessCsv([], cardio);
    expect(csv.split('\n')[1]).toContain('"Trail, hilly"');
    expect(buildFitnessCsv([], []).split('\n')).toHaveLength(1);
  });
});
