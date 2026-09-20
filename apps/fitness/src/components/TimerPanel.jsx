import { Minus, Pause, Play, Plus, RotateCcw, X } from 'lucide-react';
import { formatClock } from '../lib/timer';

const btn = 'min-h-[48px] rounded-xl text-base font-semibold flex items-center justify-center gap-2';

// The countdown for one timed drill, shown inside its exercise card. Big digits
// and a progress ring; state changes come from useTimer. When it finishes, one tap
// logs the set (it never logs by itself).
export default function TimerPanel({ t, remaining, api, onLog }) {
  const total = t.seconds * 1000;
  const progress = t.status === 'ready' ? 0 : 1 - Math.min(1, remaining / total);
  const r = 44;
  const circ = 2 * Math.PI * r;
  const sideText = t.perSide ? (t.status === 'switch' ? 'Switch sides' : `Side ${t.side} of 2`) : '';
  const statusText = {
    ready: 'Ready',
    running: 'Go',
    paused: 'Paused',
    switch: 'Switch sides',
    done: 'Done',
  }[t.status];

  return (
    <div className="rounded-2xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-400/25 p-4 mb-3" role="timer" aria-label={`Timer for ${t.label}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-base font-bold text-black dark:text-white">Timer</span>
        <button onClick={api.closeTimer} aria-label="Close timer" className="w-10 h-10 -mr-2 flex items-center justify-center text-black dark:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" className="stroke-gray-200 dark:stroke-violet-400/25" />
            <circle
              cx="50" cy="50" r={r} fill="none" strokeWidth="8" strokeLinecap="round"
              className={t.status === 'done' ? 'stroke-green-500' : 'stroke-violet-600'}
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - progress)}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-black dark:text-white tabular-nums">
            {formatClock(t.status === 'done' || t.status === 'switch' ? 0 : remaining)}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold text-black dark:text-white">{statusText}</div>
          {sideText && t.status !== 'switch' && <div className="text-base text-black dark:text-white">{sideText}</div>}
          {t.status === 'ready' && (
            <div className="flex items-center gap-2 mt-2">
              <button onClick={() => api.adjustTimer(-5)} aria-label="5 seconds shorter"
                className="w-11 h-11 rounded-xl bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/25 flex items-center justify-center text-black dark:text-white">
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-base font-semibold text-black dark:text-white tabular-nums w-12 text-center">{t.seconds}s</span>
              <button onClick={() => api.adjustTimer(5)} aria-label="5 seconds longer"
                className="w-11 h-11 rounded-xl bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/25 flex items-center justify-center text-black dark:text-white">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        {t.status === 'ready' && (
          <button onClick={api.runTimer} className={`${btn} flex-1 bg-violet-600 text-white`}>
            <Play className="w-5 h-5" /> Start
          </button>
        )}
        {t.status === 'running' && (
          <button onClick={api.pauseTimer} className={`${btn} flex-1 bg-violet-600 text-white`}>
            <Pause className="w-5 h-5" /> Pause
          </button>
        )}
        {t.status === 'paused' && (
          <>
            <button onClick={api.runTimer} className={`${btn} flex-1 bg-violet-600 text-white`}>
              <Play className="w-5 h-5" /> Resume
            </button>
            <button onClick={api.resetTimer} className={`${btn} px-4 bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/25 text-black dark:text-white`} aria-label="Reset timer">
              <RotateCcw className="w-5 h-5" />
            </button>
          </>
        )}
        {t.status === 'switch' && (
          <button onClick={api.nextSide} className={`${btn} flex-1 bg-violet-600 text-white`}>
            <Play className="w-5 h-5" /> Start side 2
          </button>
        )}
        {t.status === 'done' && (
          <>
            <button onClick={() => onLog(t.seconds, t.perSide)} className={`${btn} flex-1 bg-green-600 text-white`}>
              Log set ({t.seconds}s{t.perSide ? '/side' : ''})
            </button>
            <button onClick={api.resetTimer} className={`${btn} px-4 bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/25 text-black dark:text-white`} aria-label="Run again">
              <RotateCcw className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
