import { describe, it, expect } from 'vitest';
import {
  createTimer, adjustTimer, startTimer, pauseTimer, resetTimer, startNextSide, remainingMs, tick, formatClock,
} from './timer';

const T0 = 1_000_000;

describe('timer', () => {
  it('starts ready with the chosen length', () => {
    const t = createTimer({ key: 'k', label: 'Plank', seconds: 60 });
    expect(t).toMatchObject({ status: 'ready', seconds: 60, remainingMs: 60000, side: 1, perSide: false });
  });

  it('clamps the length to 5s–10min and falls back to 30s', () => {
    expect(createTimer({ key: 'k', label: 'x', seconds: 1 }).seconds).toBe(5);
    expect(createTimer({ key: 'k', label: 'x', seconds: 9999 }).seconds).toBe(600);
    expect(createTimer({ key: 'k', label: 'x', seconds: undefined }).seconds).toBe(30);
  });

  it('adjusts length only while ready', () => {
    const t = createTimer({ key: 'k', label: 'x', seconds: 30 });
    expect(adjustTimer(t, 5)).toMatchObject({ seconds: 35, remainingMs: 35000 });
    expect(adjustTimer(t, -100).seconds).toBe(5);
    const running = startTimer(t, T0);
    expect(adjustTimer(running, 5)).toBe(running);
  });

  it('counts down from an end timestamp', () => {
    const running = startTimer(createTimer({ key: 'k', label: 'x', seconds: 60 }), T0);
    expect(running.endsAt).toBe(T0 + 60000);
    expect(remainingMs(running, T0 + 15000)).toBe(45000);
    expect(remainingMs(running, T0 + 99000)).toBe(0);
  });

  it('pauses and resumes without losing time', () => {
    const running = startTimer(createTimer({ key: 'k', label: 'x', seconds: 60 }), T0);
    const paused = pauseTimer(running, T0 + 20000);
    expect(paused).toMatchObject({ status: 'paused', remainingMs: 40000 });
    const resumed = startTimer(paused, T0 + 100000);
    expect(resumed.endsAt).toBe(T0 + 140000);
  });

  it('finishes exactly once', () => {
    const running = startTimer(createTimer({ key: 'k', label: 'x', seconds: 10 }), T0);
    expect(tick(running, T0 + 5000)).toEqual({ timer: running, finished: null });
    const { timer, finished } = tick(running, T0 + 10000);
    expect(finished).toBe('done');
    expect(timer.status).toBe('done');
    expect(tick(timer, T0 + 20000).finished).toBeNull();
  });

  it('still finishes if the page was frozen past the end (phone locked)', () => {
    const running = startTimer(createTimer({ key: 'k', label: 'x', seconds: 10 }), T0);
    expect(tick(running, T0 + 600000).finished).toBe('done');
  });

  it('runs a per-side drill twice with a switch prompt in between', () => {
    const t0 = startTimer(createTimer({ key: 'k', label: 'Hip flexor', seconds: 30, perSide: true }), T0);
    const first = tick(t0, T0 + 30000);
    expect(first.finished).toBe('side');
    expect(first.timer).toMatchObject({ status: 'switch', side: 1 });
    expect(remainingMs(first.timer, T0 + 31000)).toBe(0);
    const second = startNextSide(first.timer, T0 + 35000);
    expect(second).toMatchObject({ status: 'running', side: 2, endsAt: T0 + 65000 });
    const end = tick(second, T0 + 65000);
    expect(end.finished).toBe('done');
  });

  it('resets back to ready on side 1', () => {
    const running = startTimer(createTimer({ key: 'k', label: 'x', seconds: 45, perSide: true }), T0);
    const reset = resetTimer(tick(running, T0 + 45000).timer);
    expect(reset).toMatchObject({ status: 'ready', side: 1, remainingMs: 45000 });
  });

  it('formats the clock', () => {
    expect(formatClock(60000)).toBe('1:00');
    expect(formatClock(45000)).toBe('0:45');
    expect(formatClock(44100)).toBe('0:45');
    expect(formatClock(0)).toBe('0:00');
  });
});
