// The Fitness colour. It is picked on Fitness → Settings and followed everywhere
// Fitness shows up: the app itself, its dot in the app switcher, its button on the
// Summit home screen and the workout colour in the calendar (all via the
// --fitness variables in theme.css, switched by html[data-fitness]).
//
// The choice is kept in localStorage (instant, no flash) and in the shared data
// file under the same name, so it also matches across devices and across separate
// iPhone home-screen apps, which don't share localStorage.
import { dbGet, dbSet } from './db.js';

export const ACCENT_KEY = 'summit_fitness_accent';
export const DEFAULT_ACCENT = 'volt';

// `light` / `dark` are the swatch colours shown in Settings (they mirror theme.css).
export const ACCENTS = [
  { id: 'volt', label: 'Graphite + volt', light: '#111827', dark: '#c6f432' },
  { id: 'red', label: 'Deep red', light: '#991b1b', dark: '#f25555' },
  { id: 'orange', label: 'Burnt orange', light: '#b83d0a', dark: '#f97a1f' },
  { id: 'pink', label: 'Hot pink', light: '#d6006e', dark: '#ff69b4' },
];

const isAccent = (id) => ACCENTS.some(a => a.id === id);
export const normalizeAccent = (id) => (isAccent(id) ? id : DEFAULT_ACCENT);

const stored = () => { try { return localStorage.getItem(ACCENT_KEY); } catch { return null; } };
export const readAccent = () => normalizeAccent(stored());

// Colour the shared --fitness variables and remember the choice on this device.
export const rememberAccent = (id) => {
  const accent = normalizeAccent(id);
  if (typeof document !== 'undefined') document.documentElement.dataset.fitness = accent;
  try { localStorage.setItem(ACCENT_KEY, accent); } catch { /* storage blocked: applies for this visit */ }
  return accent;
};

// Save a newly picked colour to the shared data file.
export const shareAccent = (id) => dbSet(ACCENT_KEY, normalizeAccent(id));

// Pick up the colour from the shared data file. Resolves to it, or null if none is
// saved there. With `seed`, a colour chosen on this device before it was shared is
// uploaded instead.
export async function syncFitnessAccent({ seed = false } = {}) {
  try {
    const remote = await dbGet(ACCENT_KEY);
    if (isAccent(remote)) return rememberAccent(remote);
    const local = stored();
    if (seed && isAccent(local) && local !== DEFAULT_ACCENT) await shareAccent(local);
  } catch { /* offline or no access: keep the colour this device already has */ }
  return null;
}

// Colour the page as soon as any app loads this module, and again when coming back
// to it (the browser's back button can restore an old page) or when another tab changes it.
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  const mark = () => { document.documentElement.dataset.fitness = readAccent(); };
  mark();
  window.addEventListener('pageshow', mark);
  window.addEventListener('storage', mark);
}
