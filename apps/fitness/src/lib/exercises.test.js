import { describe, it, expect } from 'vitest';
import { parseExercise, parseHold, normalizeExerciseType, cycleExerciseType } from './exercises';

// Names below are shaped like the ones pasted into real templates.
describe('parseExercise', () => {
  it('splits a tab-separated "name, sets, reps" row', () => {
    const p = parseExercise('Barbell or DB Bench Press\t4\t8–10');
    expect(p).toMatchObject({ label: 'Barbell or DB Bench Press', sets: 4, reps: '8–10', holdSeconds: null, perSide: false });
    expect(p.prescription).toBe('4 × 8–10');
  });

  it('handles the same row when the tabs were spaces', () => {
    expect(parseExercise('Lat Pulldown or Pull-ups 4 8–12')).toMatchObject({ label: 'Lat Pulldown or Pull-ups', sets: 4, reps: '8–12' });
  });

  it('reads per-side reps', () => {
    const p = parseExercise('Single-Arm DB Row\t3\t10–12/side');
    expect(p).toMatchObject({ label: 'Single-Arm DB Row', sets: 3, reps: '10–12', perSide: true });
    expect(p.prescription).toBe('3 × 10–12/side');
  });

  it('reads a timed hold as seconds', () => {
    const p = parseExercise('Plank\t3\t60s');
    expect(p).toMatchObject({ label: 'Plank', sets: 3, reps: null, holdSeconds: 60 });
    expect(p.prescription).toBe('3 × 60s');
  });

  it('keeps distances as reps text, not a timer', () => {
    expect(parseExercise("Farmer's Carry\t3\t30–40m")).toMatchObject({ label: "Farmer's Carry", sets: 3, reps: '30–40m', holdSeconds: null });
  });

  it('reads "— 2 x 15-20"', () => {
    const p = parseExercise('Single-Leg Calf Raises — 2 x 15-20');
    expect(p).toMatchObject({ label: 'Single-Leg Calf Raises', sets: 2, reps: '15-20' });
    expect(p.prescription).toBe('2 × 15-20');
  });

  it('reads "— 2 x 12-15/side"', () => {
    expect(parseExercise('Banded Lateral Walks — 2 x 12-15/side')).toMatchObject({ label: 'Banded Lateral Walks', sets: 2, reps: '12-15', perSide: true });
  });

  it('reads a timed per-side stretch', () => {
    const p = parseExercise('Standing hip flexor stretch — 30s/side');
    expect(p).toMatchObject({ label: 'Standing hip flexor stretch', holdSeconds: 30, perSide: true, sets: null });
    expect(p.prescription).toBe('30s/side');
  });

  it('uses the lower bound of a time range', () => {
    expect(parseExercise('Deep squat hold — 30-45s').holdSeconds).toBe(30);
  });

  it('reads "— 15 reps" and "— 8–10/side" and "— 10 each way"', () => {
    expect(parseExercise('Glute bridge — 15 reps')).toMatchObject({ label: 'Glute bridge', reps: '15' });
    expect(parseExercise('Thoracic rotation (open book) — 8–10/side')).toMatchObject({ label: 'Thoracic rotation (open book)', reps: '8–10', perSide: true });
    expect(parseExercise('Ankle circles — 10 each way')).toMatchObject({ label: 'Ankle circles', reps: '10 each way' });
  });

  it('leaves names without a prescription alone', () => {
    for (const name of ['Neck & upper trap stretch', 'Zone 2', 'Squat', 'Cricket Nets — 18:00-19:30',
      '5km Easy Run — Zone 1-2, later in the day']) {
      const p = parseExercise(name);
      expect(p.label).toBe(name);
      expect(p.prescription).toBe('');
      expect(p.sets).toBeNull();
    }
  });

  it('never loses the raw name', () => {
    const raw = 'Plank\t3\t60s';
    expect(parseExercise(raw).raw).toBe(raw);
  });

  it('tolerates empty input', () => {
    expect(parseExercise('').label).toBe('');
    expect(parseExercise(undefined).label).toBe('');
  });
});

describe('parseHold', () => {
  it('gives a timer preset for timed drills', () => {
    expect(parseHold('Plank\t3\t60s')).toEqual({ seconds: 60, perSide: false });
    expect(parseHold('Standing hip flexor stretch — 30s/side')).toEqual({ seconds: 30, perSide: true });
  });
  it('is null when there is no time in the name', () => {
    expect(parseHold('Bench Press\t4\t8–10')).toBeNull();
    expect(parseHold('Squat')).toBeNull();
  });
});

describe('exercise types', () => {
  it('normalizes legacy types to weight', () => {
    expect(normalizeExerciseType('gym')).toBe('weight');
    expect(normalizeExerciseType('bodyweight')).toBe('bodyweight');
    expect(normalizeExerciseType('cardio')).toBe('cardio');
  });
  it('cycles weight → bodyweight → cardio → weight', () => {
    expect(cycleExerciseType('weight')).toBe('bodyweight');
    expect(cycleExerciseType('bodyweight')).toBe('cardio');
    expect(cycleExerciseType('cardio')).toBe('weight');
  });
});
