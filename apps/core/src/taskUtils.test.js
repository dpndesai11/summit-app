import { describe, it, expect } from 'vitest';
import {
  toISODate, startOfWeek, endOfWeek, addDays, weightedCompletion,
  getDueBadgeLevel, getSwimlaneKey, filterTasks, getTodayFocusTasks,
  migrateTasksAndProjects, isSomeday, taskLastTouched, checkInProgressLimit, inProgressLimitMessage,
  pickNextBlock, scheduleBlock, findScheduledBlock, NEXT_BLOCK_MINUTES,
} from './taskUtils';

describe('toISODate', () => {
  it('formats a local date without UTC conversion', () => {
    // Regression: .toISOString() converts to UTC first, which can roll a
    // local midnight back a day in positive UTC-offset timezones — the
    // whole reason this helper exists instead of using it directly.
    const d = new Date(2026, 0, 5, 0, 30); // Jan 5, 2026, 00:30 local
    expect(toISODate(d)).toBe('2026-01-05');
  });

  it('pads single-digit month/day', () => {
    expect(toISODate(new Date(2026, 2, 4))).toBe('2026-03-04');
  });
});

describe('startOfWeek / endOfWeek', () => {
  it('always lands on a Monday, even starting from a Sunday', () => {
    const sunday = new Date(2026, 7, 30); // 2026-08-30 is a Sunday
    const monday = startOfWeek(sunday);
    expect(monday.getDay()).toBe(1);
    expect(toISODate(monday)).toBe('2026-08-24');
  });

  it('endOfWeek is exactly 6 days after startOfWeek', () => {
    const d = new Date(2026, 5, 17);
    expect(toISODate(endOfWeek(d))).toBe(toISODate(addDays(startOfWeek(d), 6)));
  });
});

describe('weightedCompletion', () => {
  it('returns null for an empty checklist, not 0', () => {
    expect(weightedCompletion([])).toBeNull();
    expect(weightedCompletion(null)).toBeNull();
  });

  it('weights by item weight, not a flat count', () => {
    const checklist = [
      { weight: 3, isCompleted: true },
      { weight: 1, isCompleted: false },
    ];
    // 3 of 4 total weight completed
    expect(weightedCompletion(checklist)).toBe(0.75);
  });

  it('defaults missing weight to 1', () => {
    const checklist = [{ isCompleted: true }, { isCompleted: false }];
    expect(weightedCompletion(checklist)).toBe(0.5);
  });
});

describe('getDueBadgeLevel', () => {
  const today = new Date(2026, 5, 15);

  it('is null with no due date', () => {
    expect(getDueBadgeLevel({ dueDate: null }, today)).toBeNull();
  });

  it('is overdue for a past due date on an incomplete task', () => {
    expect(getDueBadgeLevel({ dueDate: '2026-06-10', isCompleted: false }, today)).toBe('overdue');
  });

  it('a completed task is never overdue', () => {
    expect(getDueBadgeLevel({ dueDate: '2026-06-10', isCompleted: true }, today)).toBe('normal');
  });

  it('is soon within the next 2 days', () => {
    expect(getDueBadgeLevel({ dueDate: '2026-06-16', isCompleted: false }, today)).toBe('soon');
    expect(getDueBadgeLevel({ dueDate: '2026-06-17', isCompleted: false }, today)).toBe('soon');
    expect(getDueBadgeLevel({ dueDate: '2026-06-18', isCompleted: false }, today)).toBe('normal');
  });
});

describe('getSwimlaneKey', () => {
  const today = new Date(2026, 5, 15); // Monday

  it('falls back to no_date when neither date is set', () => {
    expect(getSwimlaneKey({}, today)).toBe('no_date');
  });

  it('buckets an overdue/this-week date into this_week, not a separate lane', () => {
    expect(getSwimlaneKey({ targetDate: '2026-06-01' }, today)).toBe('this_week');
  });

  it('buckets next week correctly', () => {
    expect(getSwimlaneKey({ targetDate: '2026-06-25' }, today)).toBe('next_week');
  });

  it('anything further out is later', () => {
    expect(getSwimlaneKey({ targetDate: '2026-08-01' }, today)).toBe('later');
  });
});

describe('filterTasks', () => {
  const projects = [{ id: 1, name: 'Alpha' }];
  const tasks = [
    { id: 'a', tags: ['x'], properties: { priority: 'high', projectId: 1 } },
    { id: 'b', tags: [], properties: { priority: 'low', projectId: null } },
    { id: 'c', tags: ['x'], properties: { priority: null, projectId: 999 } }, // orphaned
  ];

  it('with no filters, returns everything', () => {
    expect(filterTasks(tasks, {}, projects)).toHaveLength(3);
  });

  it('AND-combines active filters', () => {
    const result = filterTasks(tasks, { tag: 'x', priority: 'high' }, projects);
    expect(result.map(t => t.id)).toEqual(['a']);
  });

  it('__none__ project filter matches unassigned AND orphaned tasks', () => {
    const result = filterTasks(tasks, { projectId: '__none__' }, projects);
    expect(result.map(t => t.id).sort()).toEqual(['b', 'c']);
  });
});

describe('getTodayFocusTasks', () => {
  const todayISO = '2026-06-15';
  const tasks = [
    { id: 1, isCompleted: false, dueDate: todayISO },
    { id: 2, isCompleted: false, dueDate: '2026-06-01' }, // overdue
    { id: 3, isCompleted: false, dueDate: null },
    { id: 4, isCompleted: true, dueDate: todayISO }, // done, not manually picked — excluded
    { id: 5, isCompleted: true, dueDate: null }, // done but picked — stays visible
  ];
  const overdueTasks = [tasks[1]];

  it('unions due-today, overdue, and manually-picked, deduped', () => {
    const result = getTodayFocusTasks(tasks, overdueTasks, [1, 5], todayISO);
    expect(result.map(t => t.id).sort()).toEqual([1, 2, 5]);
  });

  it('a completed task only shows if manually picked', () => {
    const result = getTodayFocusTasks(tasks, overdueTasks, [], todayISO);
    expect(result.find(t => t.id === 4)).toBeUndefined();
  });
});

describe('migrateTasksAndProjects', () => {
  it('backfills status/checklist weight/tags/properties on old tasks', () => {
    const raw = [{ id: 1, name: 'old', isCompleted: true, checklist: [{ id: 'a' }] }];
    const { tasks, forceWrite } = migrateTasksAndProjects(raw, []);
    expect(tasks[0].status).toBe('done');
    expect(tasks[0].checklist[0].weight).toBe(1);
    expect(tasks[0].tags).toEqual([]);
    expect(forceWrite).toBe(false);
  });

  it('migrates a legacy properties.project string into a real project, force-writing once', () => {
    const raw = [{ id: 1, name: 't', properties: { project: 'Old Freeform Name' } }];
    const { tasks, projects, forceWrite } = migrateTasksAndProjects(raw, []);
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('Old Freeform Name');
    expect(tasks[0].properties.projectId).toBe(projects[0].id);
    expect(tasks[0].properties.project).toBeUndefined();
    expect(forceWrite).toBe(true);
  });

  it('reuses an existing project by case-insensitive name match instead of duplicating', () => {
    const existing = [{ id: 42, name: 'Alpha' }];
    const raw = [{ id: 1, properties: { project: 'alpha' } }];
    const { tasks, projects, forceWrite } = migrateTasksAndProjects(raw, existing);
    expect(projects).toHaveLength(1);
    expect(tasks[0].properties.projectId).toBe(42);
    expect(forceWrite).toBe(false);
  });
});

// --- focus rules ----------------------------------------------------------------------
const mk = (id, over = {}) => ({
  id, name: `Task ${id}`, status: 'todo', isCompleted: false, tags: [], checklist: [],
  properties: { projectId: 1, priority: null }, ...over,
});
const projects = [{ id: 1, name: 'Academic' }, { id: 2, name: 'Portfolio' }];

describe('isSomeday / taskLastTouched', () => {
  it('recognises the someday tag in any case', () => {
    expect(isSomeday(mk(1, { tags: ['Someday'] }))).toBe(true);
    expect(isSomeday(mk(1, { tags: ['academic'] }))).toBe(false);
    expect(isSomeday({ id: 1 })).toBe(false);
  });
  it('uses updatedAt, then the creation time in the id, then 0', () => {
    expect(taskLastTouched(mk(1795000000000, { updatedAt: '2026-11-01T00:00:00.000Z' }))).toBe(Date.parse('2026-11-01T00:00:00.000Z'));
    expect(taskLastTouched(mk(1795000000000))).toBe(1795000000000);
    expect(taskLastTouched(mk(5))).toBe(0);
  });
});

describe('checkInProgressLimit', () => {
  it('allows the first card in a project', () => {
    expect(checkInProgressLimit([mk(1), mk(2)], 1)).toEqual({ ok: true });
  });
  it('refuses a second card in the same project', () => {
    const tasks = [mk(1, { status: 'in_progress' }), mk(2)];
    const r = checkInProgressLimit(tasks, 2);
    expect(r).toMatchObject({ ok: false, reason: 'project' });
    expect(r.blocker.id).toBe(1);
    expect(inProgressLimitMessage(r, projects)).toMatch(/Academic already has .*Task 1.* in progress/);
  });
  it('allows one card per project, up to two in total', () => {
    const tasks = [mk(1, { status: 'in_progress' }), mk(2, { properties: { projectId: 2 } })];
    expect(checkInProgressLimit(tasks, 2)).toEqual({ ok: true });
  });
  it('refuses a third card in total, even from a third group', () => {
    const tasks = [
      mk(1, { status: 'in_progress' }),
      mk(2, { status: 'in_progress', properties: { projectId: 2 } }),
      mk(3, { properties: { projectId: 3 } }),
    ];
    const r = checkInProgressLimit(tasks, 3);
    expect(r).toMatchObject({ ok: false, reason: 'total' });
    expect(inProgressLimitMessage(r, projects)).toMatch(/Two cards are already in progress/);
  });
  it('ignores the moving task itself, done tasks and someday ideas', () => {
    const tasks = [mk(1, { status: 'in_progress' }), mk(2, { status: 'done' }), mk(3, { tags: ['someday'], status: 'in_progress', properties: { projectId: 2 } })];
    expect(checkInProgressLimit(tasks, 1)).toEqual({ ok: true });
    expect(checkInProgressLimit(tasks, 2)).toMatchObject({ ok: false, reason: 'project' });
  });
  it('groups tasks with no project together', () => {
    const tasks = [mk(1, { status: 'in_progress', properties: {} }), mk(2, { properties: {} })];
    expect(checkInProgressLimit(tasks, 2)).toMatchObject({ ok: false, reason: 'project' });
  });
});

describe('pickNextBlock', () => {
  it('returns null when there is nothing to do', () => {
    expect(pickNextBlock([], projects)).toBeNull();
    expect(pickNextBlock([mk(1, { status: 'done' })], projects)).toBeNull();
  });
  it('prefers the in-progress task touched longest ago', () => {
    const tasks = [
      mk(1, { status: 'in_progress', updatedAt: '2026-11-20T10:00:00.000Z' }),
      mk(2, { status: 'in_progress', properties: { projectId: 2 }, updatedAt: '2026-11-10T10:00:00.000Z' }),
      mk(3, { properties: { projectId: 1, priority: 'High' } }),
    ];
    const r = pickNextBlock(tasks, projects);
    expect(r.task.id).toBe(2);
    expect(r.reason).toBe('in_progress');
  });
  it('otherwise takes the highest-priority todo from Academic first', () => {
    const tasks = [
      mk(1, { properties: { projectId: 2, priority: 'High' } }),
      mk(2, { properties: { projectId: 1, priority: 'Medium' } }),
      mk(3, { properties: { projectId: 1, priority: 'High' } }),
      mk(4, { properties: { projectId: 1, priority: 'High' } }),
    ];
    expect(pickNextBlock(tasks, projects).task.id).toBe(3);
  });
  it('falls back to Portfolio when Academic has no todo', () => {
    const tasks = [mk(1, { properties: { projectId: 2, priority: 'Medium' } }), mk(2, { properties: { projectId: 2, priority: 'High' } })];
    expect(pickNextBlock(tasks, projects).task.id).toBe(2);
  });
  it('skips someday ideas and tasks in other projects', () => {
    const tasks = [mk(1, { tags: ['someday'] }), mk(2, { properties: { projectId: 9, priority: 'High' } })];
    expect(pickNextBlock(tasks, projects)).toBeNull();
  });
});

describe('scheduleBlock / findScheduledBlock', () => {
  it('writes one 2-hour block and removes the task\'s other blocks', () => {
    const before = { '2026-11-22': { 7: { time: '09:00', duration: 30 }, 8: { time: '11:00', duration: 60 } }, '2026-11-23': {} };
    const next = scheduleBlock(before, 7, '2026-11-28', '10:00');
    expect(next['2026-11-28']).toEqual({ 7: { time: '10:00', duration: NEXT_BLOCK_MINUTES } });
    expect(next['2026-11-22']).toEqual({ 8: { time: '11:00', duration: 60 } });
    expect(before['2026-11-22'][7]).toBeDefined(); // input is not mutated
  });
  it('finds a block today or later, earliest first', () => {
    const times = { '2026-11-10': { 7: { time: '09:00', duration: 60 } }, '2026-11-25': { 7: { time: '10:00', duration: 120 } }, '2026-11-30': { 7: { time: '08:00', duration: 120 } } };
    expect(findScheduledBlock(times, 7, '2026-11-20')).toEqual({ iso: '2026-11-25', time: '10:00', duration: 120 });
    expect(findScheduledBlock(times, 8, '2026-11-20')).toBeNull();
    expect(findScheduledBlock({}, 7, '2026-11-20')).toBeNull();
  });
});
