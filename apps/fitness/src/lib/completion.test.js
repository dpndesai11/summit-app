import { describe, it, expect } from 'vitest';
import {
  completedNames, bestTemplateName, workoutGroups, sessionFromGroup, templateForSession, replaceLogs, recallBlocker, UNKNOWN_WORKOUT,
} from './completion';
import { sessionHasProgress } from './stats';

const templates = [
  { name: 'Upper', exercises: [{ name: 'Bench', type: 'weight', sets: 3 }, { name: 'Row', type: 'weight' }, { name: 'Walk', type: 'cardio' }] },
  { name: 'Legs', exercises: [{ name: 'Squat', type: 'weight' }] },
];
const log = (id, exercise, extra = {}) => ({ id, date: '2026-11-26', exercise, type: 'weight', setDetails: [{ setNumber: 1, reps: 8, weight: 60 }], ...extra });

describe('completedNames / bestTemplateName', () => {
  it('lists the workouts completed on a date', () => {
    const logs = [log(1, 'Bench', { workout: 'Upper' }), log(2, 'Squat'), log(3, 'Squat', { workout: 'Legs', date: '2026-11-25' })];
    expect([...completedNames(logs, '2026-11-26')]).toEqual(['Upper']);
  });
  it('matches unlabelled logs to the closest workout', () => {
    expect(bestTemplateName([log(1, 'Bench'), log(2, 'Row'), log(3, 'Squat')], templates)).toBe('Upper');
    expect(bestTemplateName([log(1, 'Plank')], templates)).toBe(UNKNOWN_WORKOUT);
  });
});

describe('recalling a workout', () => {
  const logs = [log(1, 'Bench', { workout: 'Upper', workoutId: 9 }), log(2, 'Dips', { workout: 'Upper', workoutId: 9, type: 'bodyweight' }), log(3, 'Squat')];
  const [upper, other] = workoutGroups(logs, templates);

  it('splits a day into the workouts it was saved as', () => {
    expect(upper).toMatchObject({ name: 'Upper', workoutId: 9 });
    expect(upper.logs).toHaveLength(2);
    expect(other).toMatchObject({ name: 'Legs', workoutId: null });
  });
  it('rebuilds a session with locked sets and remembers the original entries', () => {
    const s = sessionFromGroup(upper);
    expect(s.exercises.Bench).toMatchObject({ locked: true });
    expect(s.exercises.Bench.sets).toHaveLength(1);
    expect(s.recalled.logIds).toEqual([1, 2]);
    expect(sessionHasProgress(s)).toBe(true);
  });
  it('expands older aggregate logs into sets', () => {
    const s = sessionFromGroup({ date: '2026-08-01', name: 'Legs', workoutId: null, logs: [{ id: 7, date: '2026-08-01', exercise: 'Squat', sets: 3, reps: 5, weight: 100 }] });
    expect(s.exercises.Squat.sets.map(x => x.setNumber)).toEqual([1, 2, 3]);
  });
  it('shows what was logged, with workout details, then the other lifts', () => {
    const t = templateForSession(sessionFromGroup(upper), templates);
    expect(t.exercises.map(e => e.name)).toEqual(['Bench', 'Dips', 'Row']);
    expect(t.exercises[0].sets).toBe(3);
    expect(t.exercises[1].type).toBe('bodyweight');
  });
  it('swaps the old entries for the new ones in place', () => {
    const out = replaceLogs([log(0, 'A'), ...logs], [1, 2], [log(10, 'Bench')]);
    expect(out.map(l => l.id)).toEqual([0, 10, 3]);
    expect(replaceLogs([log(0, 'A')], [], [log(10, 'B')]).map(l => l.id)).toEqual([0, 10]);
  });
  it('refuses to overwrite unsaved sets', () => {
    const open = { date: '2026-11-26', templateName: 'Upper', exercises: { Bench: { sets: [{}] } } };
    expect(recallBlocker([open], upper, sessionHasProgress)).toBe(open);
    expect(recallBlocker([{ ...open, exercises: {} }], upper, sessionHasProgress)).toBeNull();
    expect(recallBlocker([sessionFromGroup(upper)], upper, sessionHasProgress)).toBeNull();
  });
});
