import { useState, useEffect, useRef } from 'react';
import {
  createTimer, adjustTimer, startTimer, pauseTimer, resetTimer, startNextSide, remainingMs, tick,
} from './lib/timer';

// Runs the drill timer. lib/timer.js holds the state transitions; this hook adds
// what needs a browser: the 250ms redraw while counting, a beep + vibration when
// a side or the whole drill finishes, and a best-effort "keep the screen on"
// while it runs. Only one timer exists at a time, and it lives in the shared
// workout hook so switching tabs doesn't lose it.
//
// Honest limits: sound is created on the Start tap (browsers only allow audio
// after a tap); vibration is not supported on iPhone Safari; and if the phone
// locks the screen the page is frozen, so you hear/see nothing until you unlock
// (the countdown is timestamp-based, so it is still correct when you do).
export default function useTimer() {
  const [timer, setTimer] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const wakeRef = useRef(null);
  timerRef.current = timer;

  const unlockAudio = () => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioRef.current) audioRef.current = new AC();
      audioRef.current.resume?.();
    } catch { /* sound is optional */ }
  };

  const beep = (count) => {
    try {
      const ctx = audioRef.current;
      if (ctx) {
        for (let i = 0; i < count; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = 880;
          gain.gain.value = 0.25;
          osc.connect(gain);
          gain.connect(ctx.destination);
          const t = ctx.currentTime + i * 0.3;
          osc.start(t);
          osc.stop(t + 0.18);
        }
      }
      navigator.vibrate?.(count > 1 ? [200, 100, 200, 100, 200] : [300]);
    } catch { /* sound/vibration are optional */ }
  };

  const requestWake = async () => {
    try { wakeRef.current = await navigator.wakeLock?.request('screen'); } catch { /* not supported / denied */ }
  };
  const releaseWake = () => {
    try { wakeRef.current?.release?.(); } catch { /* already released */ }
    wakeRef.current = null;
  };

  const advance = () => {
    const cur = timerRef.current;
    if (!cur) return;
    const n = Date.now();
    setNow(n);
    const { timer: next, finished } = tick(cur, n);
    if (finished) {
      timerRef.current = next;
      setTimer(next);
      beep(finished === 'done' ? 3 : 2);
    }
  };

  useEffect(() => {
    if (timer?.status !== 'running') return undefined;
    const id = setInterval(advance, 250);
    const onVisible = () => {
      if (document.visibilityState === 'visible') { advance(); requestWake(); }
    };
    document.addEventListener('visibilitychange', onVisible);
    requestWake();
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      releaseWake();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer?.status, timer?.endsAt]);

  const update = (fn) => setTimer(cur => (cur ? fn(cur) : cur));

  return {
    timer,
    remaining: timer ? remainingMs(timer, now) : 0,
    openTimer: (cfg) => setTimer(createTimer(cfg)),
    runTimer: () => { unlockAudio(); update(t => startTimer(t, Date.now())); },
    pauseTimer: () => update(t => pauseTimer(t, Date.now())),
    resetTimer: () => update(resetTimer),
    nextSide: () => { unlockAudio(); update(t => startNextSide(t, Date.now())); },
    adjustTimer: (delta) => update(t => adjustTimer(t, delta)),
    closeTimer: () => setTimer(null),
  };
}
