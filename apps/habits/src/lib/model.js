// Habits data model: storage keys, defaults and small date helpers (own copy,
// same convention as every other Summit app rather than a shared import — see
// CLAUDE.md's "separate copies of the same pattern").

export const STORAGE_KEYS = {
  habits: 'summit_habits',
  habitLogs: 'summit_habit_logs',
};

// A small fixed palette, same idea as Planner's recurring-block colors and
// Fitness's exercise-type colors — a fixed set so the exact Tailwind classes
// exist in source for the build to pick up, rather than free-form color input.
export const COLOR_PRESETS = {
  violet: { label: 'Violet', dot: 'bg-violet-600', text: 'text-violet-600', ring: 'ring-violet-600' },
  blue: { label: 'Blue', dot: 'bg-blue-600', text: 'text-blue-600', ring: 'ring-blue-600' },
  amber: { label: 'Amber', dot: 'bg-amber-500', text: 'text-amber-600', ring: 'ring-amber-500' },
  rose: { label: 'Rose', dot: 'bg-rose-500', text: 'text-rose-600', ring: 'ring-rose-500' },
  teal: { label: 'Teal', dot: 'bg-teal-500', text: 'text-teal-600', ring: 'ring-teal-500' },
};
export const COLORS = Object.keys(COLOR_PRESETS);

export const toISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const formatSwiss = (iso) => {
  if (!iso) return '—';
  const p = iso.split('-');
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : iso;
};

// A summit_habits entry may be missing `archived` on older data.
export const normalizeHabit = (h) => ({ ...h, color: COLORS.includes(h.color) ? h.color : 'violet', archived: !!h.archived });

// summit_habit_logs is {[isoDate]: [habitId, ...]}; older/malformed entries
// normalize to an empty list on read rather than crashing the checklist.
export const logsFor = (habitLogs, iso) => (Array.isArray(habitLogs[iso]) ? habitLogs[iso] : []);
