import { expandLogSets, logType, prBadgeFor } from './stats';
import { parseExercise } from './exercises';

// Turns your strength + cardio logs into one CSV — one row per set for
// strength (so a 3-set bench session is 3 rows), one row per cardio log.
// Pure string-building, no I/O; downloadExportCsv (below) is the only part
// that touches the DOM/browser, so this stays easy to unit test.

const COLUMNS = [
  'date', 'kind', 'exercise', 'set', 'reps', 'weight_kg', 'seconds', 'per_side',
  'duration_min', 'distance_km', 'pr',
];

const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const csvRow = (values) => COLUMNS.map(c => csvCell(values[c])).join(',');

export const buildFitnessCsv = (strengthLogs, cardioLogs) => {
  const rows = [COLUMNS.join(',')];

  strengthLogs.forEach(log => {
    const type = logType(log);
    const isPR = prBadgeFor(log, strengthLogs);
    const label = parseExercise(log.exercise).label;
    expandLogSets(log).forEach((s, i) => {
      rows.push(csvRow({
        date: log.date,
        kind: type,
        exercise: label,
        set: i + 1,
        reps: Number(s.reps) || '',
        weight_kg: type === 'weight' ? (Number(s.weight) || '') : '',
        seconds: Number(s.seconds) || '',
        per_side: s.perSide ? 'yes' : '',
        duration_min: '',
        distance_km: '',
        pr: isPR ? 'yes' : '',
      }));
    });
  });

  cardioLogs.forEach(log => {
    rows.push(csvRow({
      date: log.date,
      kind: 'cardio',
      exercise: log.activity || '',
      set: '',
      reps: '',
      weight_kg: '',
      seconds: '',
      per_side: '',
      duration_min: Number(log.duration) || '',
      distance_km: Number(log.distance) || '',
      pr: '',
    }));
  });

  // Oldest first reads naturally in a spreadsheet; ties keep their log order.
  const header = rows[0];
  const body = rows.slice(1).sort((a, b) => a.localeCompare(b));
  return [header, ...body].join('\n');
};

// Triggers a browser download of the CSV. Kept separate from buildFitnessCsv
// so the string-building logic can be tested without a DOM.
export const downloadFitnessCsv = (strengthLogs, cardioLogs, filename = 'summit-fitness-export.csv') => {
  const csv = buildFitnessCsv(strengthLogs, cardioLogs);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
