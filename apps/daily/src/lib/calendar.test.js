import { describe, expect, it } from 'vitest';
import {
  buildBlocksForDay, dayItems, dayMarkers, eventOccursOn, eventsOnDate, monthGrid, monthTitle,
  normalizeEvent, parseISO, weekDays, weekdayName, weekTitle,
} from './calendar';
import { toISODate } from './taskUtils';

const ev = (over = {}) => ({ id: 1, title: 'Dentist', date: '2026-10-03', time: '14:00', duration: 45, color: 'blue', repeat: 'none', notes: '', ...over });

describe('month and week grids', () => {
  it('October 2026 starts on the Monday before the 1st and ends on the Sunday after the 31st', () => {
    const grid = monthGrid(new Date(2026, 9, 15));
    expect(toISODate(grid[0])).toBe('2026-09-28'); // 1 Oct 2026 is a Thursday
    expect(toISODate(grid[grid.length - 1])).toBe('2026-11-01');
    expect(grid).toHaveLength(35);
  });

  it('a month that fits exactly in four Monday-to-Sunday weeks has no spill-over days', () => {
    const grid = monthGrid(new Date(2027, 1, 10)); // Feb 2027: Monday the 1st, 28 days
    expect(grid).toHaveLength(28);
    expect(toISODate(grid[0])).toBe('2027-02-01');
  });

  it('a month can need six rows', () => {
    expect(monthGrid(new Date(2026, 7, 1))).toHaveLength(42); // Aug 2026: starts Saturday, 31 days
  });

  it('weekDays is Monday to Sunday around the given date', () => {
    const days = weekDays(new Date(2026, 9, 3)); // a Saturday
    expect(days.map(toISODate)).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
  });

  it('titles read naturally, collapsing the month when a week stays inside one', () => {
    expect(monthTitle(new Date(2026, 9, 3))).toBe('October 2026');
    expect(weekTitle(new Date(2026, 9, 14))).toBe('12 – 18 Oct');
    expect(weekTitle(new Date(2026, 9, 28))).toBe('26 Oct – 1 Nov');
    expect(weekdayName('2026-10-03')).toBe('Saturday');
  });
});

describe('eventOccursOn', () => {
  it('one-off events happen on their date only', () => {
    expect(eventOccursOn(ev(), '2026-10-03')).toBe(true);
    expect(eventOccursOn(ev(), '2026-10-04')).toBe(false);
  });

  it('repeats never reach back before the start date', () => {
    const daily = ev({ repeat: 'daily' });
    expect(eventOccursOn(daily, '2026-10-02')).toBe(false);
    expect(eventOccursOn(daily, '2026-10-03')).toBe(true);
    expect(eventOccursOn(daily, '2027-03-01')).toBe(true);
  });

  it('weekly repeats land on the same weekday, including across a clock change', () => {
    const weekly = ev({ repeat: 'weekly' }); // Saturday 3 Oct 2026
    expect(eventOccursOn(weekly, '2026-10-10')).toBe(true);
    expect(eventOccursOn(weekly, '2026-10-11')).toBe(false);
    expect(eventOccursOn(weekly, '2026-11-07')).toBe(true); // after UK clocks go back on 25 Oct
  });

  it('monthly repeats on the 31st fall back to the last day of shorter months', () => {
    const monthly = ev({ date: '2026-01-31', repeat: 'monthly' });
    expect(eventOccursOn(monthly, '2026-02-28')).toBe(true);
    expect(eventOccursOn(monthly, '2026-02-27')).toBe(false);
    expect(eventOccursOn(monthly, '2026-03-31')).toBe(true);
    expect(eventOccursOn(monthly, '2026-04-30')).toBe(true);
    expect(eventOccursOn(monthly, '2026-04-29')).toBe(false);
    expect(eventOccursOn(monthly, '2028-02-29')).toBe(true); // leap year
  });
});

describe('normalizeEvent / eventsOnDate', () => {
  it('fills defaults and rejects bad values', () => {
    const n = normalizeEvent({ id: 9, title: '  Trip  ', date: '2026-10-03', color: 'nope', repeat: 'hourly', time: 'soon', duration: 0 });
    expect(n).toMatchObject({ title: 'Trip', time: null, duration: 60, color: 'primary', repeat: 'none' });
  });

  it('an event cannot run past midnight', () => {
    expect(normalizeEvent(ev({ time: '23:00', duration: 120 })).duration).toBe(60);
    expect(normalizeEvent(ev({ time: '23:50', duration: 120 })).duration).toBe(15);
  });

  it('lists all-day events first, then timed ones in order', () => {
    const events = [ev({ id: 1, title: 'Late', time: '18:00' }), ev({ id: 2, title: 'Holiday', time: null }), ev({ id: 3, title: 'Early', time: '08:30' })];
    expect(eventsOnDate(events, '2026-10-03').map(e => e.title)).toEqual(['Holiday', 'Early', 'Late']);
  });

  it('tolerates missing or malformed data', () => {
    expect(eventsOnDate(undefined, '2026-10-03')).toEqual([]);
    expect(eventsOnDate(null, '2026-10-03')).toEqual([]);
  });
});

const data = {
  templates: [{ name: 'Gym 1', exercises: [{ name: 'Squat' }] }, { name: 'Run - 5KM', exercises: [] }],
  workoutPlan: { Saturday: ['Gym 1'], Sunday: ['Run - 5KM', 'Missing template'] },
  workoutTimes: { Saturday: { 'Gym 1': { time: '09:00', duration: 75 } } },
  recipes: [{ id: 1, name: 'Oats', ingredients: [] }],
  mealPlan: { Saturday: { breakfast: ['Oats'], dinner: ['Curry', 'Rice'] } },
  mealTimes: {},
  taskTimes: { '2026-10-03': { 7: { time: '08:00', duration: 20 } } },
  tasks: [{ id: 7, name: 'Pay invoice', dueDate: '2026-10-03', isCompleted: false }, { id: 8, name: 'Done thing', dueDate: '2026-10-03', isCompleted: true }],
  events: [ev({ id: 1, title: 'Dentist', time: '14:00' }), ev({ id: 2, title: 'Birthday', time: null })],
};

describe('buildBlocksForDay / dayItems / dayMarkers', () => {
  it('a weekday-keyed workout, a per-slot meal and a dated task all land on the real date, in time order', () => {
    const blocks = buildBlocksForDay(data, 'Saturday', '2026-10-03');
    // at a tie (08:00) the original order holds: workouts, then meals, then tasks
    expect(blocks.map(b => `${b.kind}:${b.time}`)).toEqual(['meal:08:00', 'task:08:00', 'workout:09:00', 'meal:19:00']);
    expect(blocks.find(b => b.kind === 'meal' && b.slot === 'dinner').title).toBe('Curry + Rice');
  });

  it('a workout in the plan whose template is gone is skipped, not shown', () => {
    expect(buildBlocksForDay(data, 'Sunday', '2026-10-04').map(b => b.title)).toEqual(['Run - 5KM']);
  });

  it('a task scheduled on one date does not appear on another', () => {
    expect(buildBlocksForDay(data, 'Saturday', '2026-10-10').some(b => b.kind === 'task')).toBe(false);
  });

  it('dayItems puts all-day events first, then everything else by start time', () => {
    const items = dayItems(data, '2026-10-03');
    expect(items[0]).toMatchObject({ kind: 'event', title: 'Birthday', allDay: true });
    const times = items.filter(i => !i.allDay).map(i => i.time);
    expect(times).toEqual([...times].sort());
    expect(items.some(i => i.kind === 'event' && i.title === 'Dentist')).toBe(true);
  });

  it('dayMarkers counts events, workouts, meal slots and only open tasks', () => {
    expect(dayMarkers(data, '2026-10-03')).toMatchObject({ workouts: 1, meals: 2, tasks: 1 });
    expect(dayMarkers(data, '2026-10-03').events).toHaveLength(2);
    expect(dayMarkers(data, '2026-10-04')).toMatchObject({ workouts: 1, meals: 0, tasks: 0 }); // 'Missing template' not counted
  });

  it('parseISO is local midnight', () => {
    expect(parseISO('2026-10-03').getHours()).toBe(0);
  });
});
