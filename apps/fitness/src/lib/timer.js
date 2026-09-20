// Countdown timer for timed bodyweight drills (planks, holds, stretches).
// Pure state transitions — no React, no clocks, no sound: every function takes
// `now` (ms) explicitly, so it is deterministic and easy to test. The countdown
// is derived from an `endsAt` timestamp rather than counted tick-by-tick, so it
// stays correct if the phone throttles the page or the tab is backgrounded.
//
// status: 'ready'   – set the length, not started
//         'running' – counting down to endsAt
//         'paused'  – stopped part-way, remainingMs kept
//         'switch'  – first side of a per-side drill finished, waiting to start side 2
//         'done'    – finished; offer to log the set

export const MIN_SECONDS = 5;
export const MAX_SECONDS = 600;
export const DEFAULT_SECONDS = 30;

const clampSeconds = (s) => Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(Number(s) || DEFAULT_SECONDS)));

export const createTimer = ({ key, label, seconds, perSide = false }) => {
  const secs = clampSeconds(seconds);
  return { key, label, seconds: secs, perSide: Boolean(perSide), side: 1, status: 'ready', endsAt: null, remainingMs: secs * 1000 };
};

// Change the length by `delta` seconds — only before it has started.
export const adjustTimer = (t, delta) => {
  if (t.status !== 'ready') return t;
  const secs = clampSeconds(t.seconds + delta);
  return { ...t, seconds: secs, remainingMs: secs * 1000 };
};

export const startTimer = (t, now) => (
  t.status === 'ready' || t.status === 'paused'
    ? { ...t, status: 'running', endsAt: now + t.remainingMs }
    : t
);

export const pauseTimer = (t, now) => (
  t.status === 'running' ? { ...t, status: 'paused', endsAt: null, remainingMs: Math.max(0, t.endsAt - now) } : t
);

export const resetTimer = (t) => ({ ...t, side: 1, status: 'ready', endsAt: null, remainingMs: t.seconds * 1000 });

// Side 2 of a per-side drill, after the "switch sides" prompt.
export const startNextSide = (t, now) => (
  t.status === 'switch'
    ? { ...t, side: 2, status: 'running', remainingMs: t.seconds * 1000, endsAt: now + t.seconds * 1000 }
    : t
);

export const remainingMs = (t, now) => {
  if (t.status === 'running') return Math.max(0, t.endsAt - now);
  if (t.status === 'done' || t.status === 'switch') return 0;
  return t.remainingMs;
};

// Move a running timer forward. Returns the new timer plus what just happened
// ('side' = first side finished, 'done' = all finished, null = nothing) so the
// caller can beep / vibrate exactly once.
export const tick = (t, now) => {
  if (t.status !== 'running' || now < t.endsAt) return { timer: t, finished: null };
  if (t.perSide && t.side === 1) return { timer: { ...t, status: 'switch', endsAt: null, remainingMs: 0 }, finished: 'side' };
  return { timer: { ...t, status: 'done', endsAt: null, remainingMs: 0 }, finished: 'done' };
};

// "1:05", "0:45"
export const formatClock = (ms) => {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};
