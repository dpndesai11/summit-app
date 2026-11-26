import { expandLogSets, logType, sessionKey } from './stats';

// Completing a workout, and recalling a completed one to fix a mistake.
//
// Completed logs carry `workout` (the workout's name) and `workoutId` (shared by the
// entries saved together). Older logs have neither and are grouped by date.
//
// Recalling never removes anything: it opens a session that remembers which log
// entries it came from (`recalled.logIds`). Those stay in history until the edit is
// saved, which swaps them for the new ones. Cancelling just drops the session.

export const completedNames = (strengthLogs, date) => new Set(
  strengthLogs.filter(l => l.date === date && l.workout).map(l => l.workout)
);

export const UNKNOWN_WORKOUT = 'Saved workout';

// The workout whose exercises best match some unlabelled logs.
export const bestTemplateName = (logs, templates) => {
  const names = new Set(logs.map(l => l.exercise));
  let best = null;
  let score = 0;
  templates.forEach(t => {
    const hits = t.exercises.filter(e => names.has(e.name)).length;
    if (hits > score) { best = t.name; score = hits; }
  });
  return best || UNKNOWN_WORKOUT;
};

// One day's logs split into the workouts they were saved as.
export const workoutGroups = (dayLogs, templates) => {
  const groups = new Map();
  dayLogs.forEach(l => {
    const key = l.workoutId ? String(l.workoutId) : 'unlabelled';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(l);
  });
  return [...groups.entries()].map(([key, logs]) => ({
    key,
    date: logs[0].date,
    workoutId: logs[0].workoutId || null,
    name: logs[0].workout || bestTemplateName(logs, templates),
    logs,
  }));
};

// An editable session holding a saved workout's sets, each exercise locked.
export const sessionFromGroup = (group) => {
  const exercises = {};
  const order = [];
  group.logs.forEach(l => {
    if (!exercises[l.exercise]) {
      exercises[l.exercise] = { sets: [], locked: true };
      order.push({ name: l.exercise, type: logType(l) });
    }
    const sets = [...exercises[l.exercise].sets, ...expandLogSets(l)];
    exercises[l.exercise].sets = sets.map((s, i) => ({ ...s, setNumber: i + 1 }));
  });
  return {
    date: group.date,
    templateName: group.name,
    activeExercise: null,
    exercises,
    recalled: { logIds: group.logs.map(l => l.id), workoutId: group.workoutId, exercises: order },
  };
};

// The exercise list a session is shown with. A recalled one lists what was actually
// logged (even if the workout has changed since), then the workout's other lifts.
export const templateForSession = (session, templates) => {
  const template = templates.find(t => t.name === session.templateName);
  if (session.recalled) {
    const known = new Map((template?.exercises || []).map(e => [e.name, e]));
    const logged = session.recalled.exercises.map(e => ({ ...known.get(e.name), ...e }));
    const have = new Set(logged.map(e => e.name));
    const others = (template?.exercises || []).filter(e => e.type !== 'cardio' && !have.has(e.name));
    return { name: session.templateName, exercises: [...logged, ...others] };
  }
  return template || {
    name: session.templateName,
    exercises: Object.keys(session.exercises).map(name => ({ name, type: 'weight' })),
  };
};

// History with the entries in `ids` swapped for `entries`, kept in the same place.
export const replaceLogs = (logs, ids, entries) => {
  const gone = new Set(ids);
  const at = logs.findIndex(l => gone.has(l.id));
  const kept = logs.filter(l => !gone.has(l.id));
  if (at < 0) return [...kept, ...entries];
  return [...kept.slice(0, at), ...entries, ...kept.slice(at)];
};

// Whether a workout can be recalled: not on top of unsaved sets for the same day.
export const recallBlocker = (sessions, group, hasProgress) => {
  const open = sessions.find(s => sessionKey(s) === sessionKey({ date: group.date, templateName: group.name }));
  return open && !open.recalled && hasProgress(open) ? open : null;
};
