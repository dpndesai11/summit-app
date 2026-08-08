// Pure, stateless helpers shared across task/board/planner/projects components.
// No React, no storage access — everything here is derived data.

// Local calendar date, not `.toISOString()` — that converts to UTC first,
// which rolls a local midnight back to the previous day in any positive
// UTC-offset timezone (e.g. midnight CEST is 22:00 UTC the day before).
export const toISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

// Monday-start week, matching the existing `daysOfWeek` convention in App.jsx.
export const startOfWeek = (date) => {
  const d = startOfDay(date);
  const day = d.getDay(); // 0 = Sun .. 6 = Sat
  const diff = (day === 0 ? -6 : 1) - day;
  return addDays(d, diff);
};

export const endOfWeek = (date) => addDays(startOfWeek(date), 6);

// Full Monday-start weeks covering the given month, including the leading/
// trailing days needed to fill out a proper calendar grid.
export function getMonthGridDates(date) {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const gridStart = startOfWeek(firstOfMonth);
  const gridEnd = endOfWeek(lastOfMonth);

  const days = [];
  for (let cursor = gridStart; cursor <= gridEnd; cursor = addDays(cursor, 1)) {
    days.push(cursor);
  }
  return days;
}

// Weighted checklist completion: sum(completed weights) / sum(all weights).
// Returns null (not 0) for an empty checklist so callers can show "no data".
export function weightedCompletion(checklist) {
  if (!checklist || checklist.length === 0) return null;
  const totalWeight = checklist.reduce((s, i) => s + (i.weight ?? 1), 0);
  if (totalWeight === 0) return 0;
  const doneWeight = checklist
    .filter(i => i.isCompleted)
    .reduce((s, i) => s + (i.weight ?? 1), 0);
  return doneWeight / totalWeight;
}

// 'overdue' | 'soon' | 'normal' | null (no due date)
export function getDueBadgeLevel(task, today = new Date()) {
  if (!task.dueDate) return null;
  const t0 = startOfDay(today);
  const due = startOfDay(new Date(task.dueDate));
  if (!task.isCompleted && due < t0) return 'overdue';
  const daysAway = Math.round((due - t0) / (1000 * 60 * 60 * 24));
  if (!task.isCompleted && daysAway >= 0 && daysAway <= 2) return 'soon';
  return 'normal';
}

export const SWIMLANES = [
  { id: 'this_week', title: 'This Week' },
  { id: 'next_week', title: 'Next Week' },
  { id: 'later', title: 'Later' },
  { id: 'no_date', title: 'No Date' },
];

// Lane is always derived from dates, never stored. Overdue/incomplete tasks
// (dates before "this week") fold into This Week rather than getting a
// separate lane — the board intentionally caps at these 4 lanes.
export function getSwimlaneKey(task, today = new Date()) {
  const dateStr = task.targetDate || task.dueDate;
  if (!dateStr) return 'no_date';

  const date = startOfDay(new Date(dateStr));
  const t0 = startOfDay(today);
  const wkEnd = endOfWeek(t0);
  const nextStart = addDays(wkEnd, 1);
  const nextEnd = addDays(nextStart, 6);

  if (date <= wkEnd) return 'this_week';
  if (date <= nextEnd) return 'next_week';
  return 'later';
}

// AND-combines active filters. Each filter key is only applied if non-empty.
// `projects` is only needed to resolve the '__none__' sentinel, which
// matches both truly-unassigned tasks and orphaned ones (a projectId that
// no longer resolves to a real project).
export function filterTasks(tasks, filters, projects = []) {
  const { tag, priority, projectId } = filters || {};
  const validProjectIds = new Set(projects.map(p => p.id));
  return tasks.filter(t => {
    if (tag && !(t.tags || []).includes(tag)) return false;
    if (priority && (t.properties?.priority || null) !== priority) return false;
    if (projectId) {
      const taskProjectId = t.properties?.projectId ?? null;
      if (projectId === '__none__') {
        if (taskProjectId != null && validProjectIds.has(taskProjectId)) return false;
      } else if (taskProjectId !== projectId) {
        return false;
      }
    }
    return true;
  });
}

// Tasks relevant to "today": due today, overdue, or manually selected today —
// unioned and deduped by id. Completed tasks only show up if manually selected
// (so a checked-off daily pick stays visible, struck through).
export function getTodayFocusTasks(tasks, overdueTasks, dailySelectionsToday, todayISO) {
  const selected = new Set(dailySelectionsToday || []);
  const overdueIds = new Set(overdueTasks.map(t => t.id));
  const seen = new Set();
  const result = [];

  for (const t of tasks) {
    if (seen.has(t.id)) continue;
    const isRelevant =
      (!t.isCompleted && (t.dueDate === todayISO || overdueIds.has(t.id))) ||
      selected.has(t.id);
    if (isRelevant) {
      seen.add(t.id);
      result.push(t);
    }
  }
  return result;
}

// Buckets for the weekly review ritual. completedThisWeek relies on the
// `completedAt` timestamp (set when a task's status becomes 'done'); legacy
// tasks completed before this field existed simply won't count, which is
// more honest than guessing from due/target dates.
export function getWeeklyReviewData(tasks, today = new Date()) {
  const t0 = startOfDay(today);
  const wkStart = startOfWeek(t0);
  const wkEnd = endOfWeek(t0);
  const nextStart = addDays(wkEnd, 1);
  const nextEnd = addDays(nextStart, 6);

  const within = (dateStr, a, b) => {
    if (!dateStr) return false;
    const d = startOfDay(new Date(dateStr));
    return d >= a && d <= b;
  };

  const completedThisWeek = tasks.filter(
    t => t.isCompleted && t.completedAt && within(t.completedAt, wkStart, wkEnd)
  );
  const overdue = tasks.filter(
    t => !t.isCompleted && t.dueDate && startOfDay(new Date(t.dueDate)) < t0
  );
  const comingUpNextWeek = tasks.filter(t => {
    if (t.isCompleted) return false;
    const dateStr = t.targetDate || t.dueDate;
    return within(dateStr, nextStart, nextEnd);
  });

  return { weekStart: wkStart, weekEnd: wkEnd, completedThisWeek, overdue, comingUpNextWeek };
}

// Backfills weight/tags/properties/completedAt on tasks (in-memory, same
// convention as App.jsx's `withStatus`) and migrates any legacy freeform
// `properties.project` string into a real entry in the `projects` list.
// The project-creation half of this must be force-written by the caller
// (see `forceWrite`), since it mints new ids that would otherwise be
// re-minted (duplicated) on every reload before the first save.
export function migrateTasksAndProjects(rawTasks, rawProjects) {
  const projects = [...(rawProjects || [])];
  const byName = new Map(projects.map(p => [p.name.trim().toLowerCase(), p]));
  let nextId = Date.now();
  let createdAny = false;

  const migratedTasks = (rawTasks || []).map(task => {
    const checklist = (task.checklist || []).map(item => ({ weight: 1, ...item }));
    const tags = task.tags || [];
    let properties = (task.properties && typeof task.properties === 'object')
      ? { priority: null, projectId: null, ...task.properties }
      : { priority: null, projectId: null };

    const legacyName = typeof task.properties?.project === 'string'
      ? task.properties.project.trim()
      : null;

    if (legacyName) {
      const key = legacyName.toLowerCase();
      let project = byName.get(key);
      if (!project) {
        project = { id: nextId++, name: legacyName, notes: '', createdAt: new Date().toISOString() };
        projects.push(project);
        byName.set(key, project);
        createdAny = true;
      }
      properties = { ...properties, projectId: project.id };
      delete properties.project;
    }

    return {
      ...task,
      status: task.status || (task.isCompleted ? 'done' : 'todo'),
      completedAt: task.completedAt ?? null,
      checklist,
      tags,
      properties,
    };
  });

  return { tasks: migratedTasks, projects, forceWrite: createdAny };
}
