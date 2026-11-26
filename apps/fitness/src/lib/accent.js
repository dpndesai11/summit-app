// The Fitness colour theme, picked on the Settings tab. Kept per device in
// localStorage (like dark mode). The colours themselves live in index.css as
// html[data-accent="..."] blocks; this only chooses which one applies.
export const ACCENT_KEY = 'summit_fitness_accent';
export const DEFAULT_ACCENT = 'volt';

// `light` / `dark` are the swatch colours shown in Settings (they mirror index.css).
export const ACCENTS = [
  { id: 'volt', label: 'Graphite + volt', light: '#111827', dark: '#c6f432' },
  { id: 'red', label: 'Deep red', light: '#991b1b', dark: '#f25555' },
  { id: 'orange', label: 'Burnt orange', light: '#b83d0a', dark: '#f97a1f' },
  { id: 'pink', label: 'Hot pink', light: '#d6006e', dark: '#ff69b4' },
];

export const normalizeAccent = (id) => (ACCENTS.some(a => a.id === id) ? id : DEFAULT_ACCENT);

export const readAccent = () => {
  try { return normalizeAccent(localStorage.getItem(ACCENT_KEY)); } catch { return DEFAULT_ACCENT; }
};

export const applyAccent = (id) => {
  const accent = normalizeAccent(id);
  document.documentElement.dataset.accent = accent;
  try { localStorage.setItem(ACCENT_KEY, accent); } catch { /* storage blocked: applies for this visit */ }
  return accent;
};
