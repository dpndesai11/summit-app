import { toISO, formatShortDate } from './model';
import { parseExerciseItem } from './exercises';
import { logSetCount, mondayOf } from './stats';

// The numbers behind the Today dashboard. Everything comes from what was actually
// logged: no calories, heart rate or other figures the app doesn't record.

const DEFAULT_SETS = 3;
const plannedSets = (ex) => (ex.type === 'cardio' ? 1 : parseExerciseItem(ex).sets || DEFAULT_SETS);

// How far through today's planned workouts you are, counted in sets (a cardio item
// counts as one). Sets still in an open session and sets already completed both count.
// A workout you've pressed Complete on (`completed`) is finished, whatever it planned,
// unless it is open again for editing.
export const todayProgress = (planned, sessions, strengthLogs, cardioLogs, todayISO, completed = new Set()) => {
  const lifts = strengthLogs.filter(l => l.date === todayISO);
  let cardioLeft = cardioLogs.filter(l => l.date === todayISO).length;
  let done = 0; let total = 0; let exercises = 0; let exercisesDone = 0;
  let setsLogged = 0; // lifting sets really done, whatever the ring says
  planned.forEach(tpl => {
    const session = sessions.find(s => s.date === todayISO && s.templateName === tpl.name);
    const finished = completed.has(tpl.name) && !session?.recalled;
    tpl.exercises.forEach(ex => {
      const want = plannedSets(ex);
      let got = 0;
      const loggedSets = () => lifts.filter(l => l.exercise === ex.name).reduce((n, l) => n + logSetCount(l), 0);
      if (finished) {
        got = want;
        if (ex.type !== 'cardio') setsLogged += loggedSets();
      } else if (ex.type === 'cardio') {
        if (cardioLeft > 0) { got = 1; cardioLeft -= 1; }
      } else {
        const open = session?.exercises?.[ex.name]?.sets?.length || 0;
        const actual = Math.max(open, loggedSets());
        setsLogged += actual;
        got = Math.min(want, actual);
      }
      total += want; done += got; exercises += 1;
      if (got >= want) exercisesDone += 1;
    });
  });
  return { done, total, exercises, exercisesDone, setsLogged, percent: total ? Math.round((done / total) * 100) : 0 };
};

// This Monday-to-Sunday week: days trained, kilometres and cardio minutes.
export const weekStats = (strengthLogs, cardioLogs, todayISO) => {
  const monday = mondayOf(todayISO);
  const inWeek = (l) => l.date >= monday && l.date <= todayISO;
  const cardio = cardioLogs.filter(inWeek);
  return {
    days: new Set([...strengthLogs.filter(inWeek), ...cardio].map(l => l.date)).size,
    km: Math.round(cardio.reduce((n, l) => n + (Number(l.distance) || 0), 0) * 10) / 10,
    minutes: Math.round(cardio.reduce((n, l) => n + (Number(l.duration) || 0), 0)),
  };
};

// The latest `count` days with anything logged, newest first.
export const recentDays = (strengthLogs, cardioLogs, count = 4, today = new Date()) => {
  const todayISO = toISO(today);
  const dates = [...new Set([...strengthLogs, ...cardioLogs].map(l => l.date))]
    .filter(d => d <= todayISO).sort().reverse().slice(0, count);
  return dates.map(date => {
    const lifts = strengthLogs.filter(l => l.date === date);
    const cardio = cardioLogs.filter(l => l.date === date);
    const names = [...new Set(cardio.map(l => l.activity))];
    const minutes = Math.round(cardio.reduce((n, l) => n + (Number(l.duration) || 0), 0));
    const km = Math.round(cardio.reduce((n, l) => n + (Number(l.distance) || 0), 0) * 10) / 10;
    return {
      date,
      kind: lifts.length ? 'strength' : 'cardio',
      title: [lifts.length ? 'Strength' : null, ...names].filter(Boolean).join(' + '),
      detail: [formatShortDate(date), lifts.length ? `${lifts.length} exercise${lifts.length === 1 ? '' : 's'}` : null,
        minutes ? `${minutes} min` : null, km ? `${km} km` : null].filter(Boolean).join(' · '),
    };
  });
};
