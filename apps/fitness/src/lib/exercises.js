import { Dumbbell, PersonStanding, Activity } from 'lucide-react';

// Exercise types and how their names are shown. Stored names are never rewritten
// (logs, PR bests and the Planner's chips are keyed by the raw name).

export const EXERCISE_TYPE_ORDER = ['weight', 'bodyweight', 'cardio'];

export const TYPE_META = {
  weight: {
    label: 'Weight', icon: Dumbbell,
    badge: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600',
    chip: 'bg-blue-100 text-blue-700',
    iconText: 'text-blue-500',
    cardBorder: 'border-blue-200',
    cardBadge: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
    logBtn: 'bg-blue-600 active:bg-blue-700',
  },
  bodyweight: {
    label: 'Bodyweight', icon: PersonStanding,
    badge: 'bg-teal-50 dark:bg-teal-500/10 text-teal-600',
    chip: 'bg-teal-100 text-teal-700',
    iconText: 'text-teal-500',
    cardBorder: 'border-teal-200',
    cardBadge: 'text-teal-500 bg-teal-50 dark:bg-teal-500/10',
    logBtn: 'bg-teal-600 active:bg-teal-700',
  },
  cardio: {
    label: 'Cardio', icon: Activity,
    badge: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600',
    chip: 'bg-orange-100 text-orange-700',
    iconText: 'text-orange-500',
    cardBorder: 'border-orange-200',
    cardBadge: 'text-orange-500 bg-orange-50 dark:bg-orange-500/10',
    logBtn: 'bg-orange-500 active:bg-orange-600',
  },
};

export const normalizeExerciseType = (t) => (t === 'bodyweight' || t === 'cardio' ? t : 'weight');
export const cycleExerciseType = (t) => EXERCISE_TYPE_ORDER[(EXERCISE_TYPE_ORDER.indexOf(normalizeExerciseType(t)) + 1) % EXERCISE_TYPE_ORDER.length];
export const normalizeTemplateExercises = (tpl) => ({
  ...tpl,
  exercises: (tpl.exercises || []).map(e => ({ ...e, type: normalizeExerciseType(e.type) }))
});

// ---------------------------------------------------------------------------
// Display-only parsing of exercise names. Templates were often pasted from a
// table, so a stored name may carry its prescription: "Bench Press\t4\t8–10",
// "Plank\t3\t60s", "Calf Raises — 2 x 15-20", "Hip flexor stretch — 30s/side".
// parseExercise() splits that into a clean label + prescription for display
// (and holdSeconds for the timer). The stored name is never touched.
// ---------------------------------------------------------------------------
const RANGE = '\\d+(?:\\s?[–-]\\s?\\d+)?';
// "4<tab>8–10", "3 60s", "3 30–40m/side": name, then sets, then a reps/hold token
const TRAILING = new RegExp(`^(.*?\\S)[\\t ]+(\\d{1,2})[\\t ]+(${RANGE}\\s?(?:s|sec|m)?(?:/side)?)\\s*$`);
// "Name — <prescription>" (em dash, en dash or spaced hyphen; the last one wins)
const DASHED = /^(.*\S)\s+[—–-]\s+(.+)$/;

const lowerBound = (token) => Number(String(token).match(/\d+/)[0]);

// A prescription token on its own: "8–10", "10–12/side", "60s", "30-45s/side", "30–40m", "15 reps"
const parseToken = (token) => {
  const t = token.trim();
  const perSide = /\/side$/i.test(t);
  const core = t.replace(/\/side$/i, '').trim();
  let m = core.match(new RegExp(`^(${RANGE})\\s?(?:s|sec)$`, 'i'));
  if (m) return { holdSeconds: lowerBound(m[1]), reps: null, perSide };
  m = core.match(new RegExp(`^(${RANGE})\\s?m$`, 'i'));
  if (m) return { holdSeconds: null, reps: core, perSide };
  m = core.match(new RegExp(`^(${RANGE})(?:\\s?reps)?$`, 'i'));
  if (m) return { holdSeconds: null, reps: m[1], perSide };
  m = core.match(/^(\d+)\s+each way$/i);
  if (m) return { holdSeconds: null, reps: core, perSide };
  return null;
};

export const parseExercise = (name) => {
  const raw = String(name ?? '');
  const trimmed = raw.trim();
  const plain = { raw, label: trimmed, sets: null, reps: null, holdSeconds: null, perSide: false, prescription: '' };

  let label = null, sets = null, tok = null;
  let m = trimmed.match(TRAILING);
  if (m) {
    tok = parseToken(m[3]);
    if (tok) { label = m[1]; sets = Number(m[2]); }
  }
  if (!tok) {
    m = trimmed.match(DASHED);
    if (m) {
      const setsReps = m[2].match(new RegExp(`^(\\d+)\\s*[x×]\\s*(${RANGE})(/side)?$`, 'i'));
      if (setsReps) {
        label = m[1]; sets = Number(setsReps[1]);
        tok = { holdSeconds: null, reps: setsReps[2], perSide: Boolean(setsReps[3]) };
      } else {
        const t = parseToken(m[2]);
        if (t) { label = m[1]; tok = t; }
      }
    }
  }
  if (!tok) return plain;

  const side = tok.perSide ? '/side' : '';
  let prescription = '';
  if (tok.holdSeconds != null) prescription = sets ? `${sets} × ${tok.holdSeconds}s${side}` : `${tok.holdSeconds}s${side}`;
  else if (tok.reps != null) prescription = sets ? `${sets} × ${tok.reps}${side}` : `${tok.reps} reps${side}`;
  return { raw, label: label.trim(), sets, reps: tok.reps, holdSeconds: tok.holdSeconds, perSide: tok.perSide, prescription };
};

// Timer preset for a timed drill, or null when the name has no time in it.
// A range like "30-45s" starts at its lower bound; the timer lets you adjust.
export const parseHold = (name) => {
  const { holdSeconds, perSide } = parseExercise(name);
  return holdSeconds ? { seconds: holdSeconds, perSide } : null;
};
