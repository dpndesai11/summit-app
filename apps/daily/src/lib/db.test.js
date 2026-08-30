import { describe, it, expect, beforeEach, vi } from 'vitest';

// db.js keeps its cache/sha/pending state at module scope, so each test
// needs a fresh module instance — vi.resetModules() + a dynamic import per
// test, rather than one static top-level import shared across the file.
const freshDb = async () => {
  vi.resetModules();
  return import('./db.js');
};

const b64 = (obj) => Buffer.from(JSON.stringify(obj), 'utf-8').toString('base64');

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

describe('dbSet / flushToGitHub', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('writes only the changed key, merged onto the latest remote content — not a stale full snapshot', async () => {
    const { dbGet, dbSet } = await freshDb();

    // Initial load: remote has two keys, from before this tab opened.
    let putBody = null;
    global.fetch = vi.fn(async (url, opts) => {
      if (!opts || opts.method !== 'PUT') {
        // GET (initial load, and the refetch-before-write inside flush)
        return jsonResponse(200, { sha: 'sha-1', content: b64({ summit_tasks: ['old'], summit_recipes: ['r1'] }) });
      }
      // PUT
      putBody = JSON.parse(opts.body);
      return jsonResponse(200, { content: { sha: 'sha-2' } });
    });

    // Prime the cache via a read, then change one key.
    await dbGet('summit_tasks');
    const setPromise = dbSet('summit_tasks', ['new']);
    await vi.advanceTimersByTimeAsync(800);
    await setPromise;

    const written = JSON.parse(Buffer.from(putBody.content, 'base64').toString('utf-8'));
    // The key we changed is updated...
    expect(written.summit_tasks).toEqual(['new']);
    // ...and a key we never touched, but that exists on the remote, survives —
    // this is the actual fix: a concurrent edit to summit_recipes elsewhere
    // wouldn't be clobbered by our stale in-memory copy of it.
    expect(written.summit_recipes).toEqual(['r1']);
  });

  it('retries against fresh state on a sha conflict instead of failing outright', async () => {
    const { dbGet, dbSet } = await freshDb();

    let getCount = 0;
    let putCount = 0;
    global.fetch = vi.fn(async (url, opts) => {
      if (!opts || opts.method !== 'PUT') {
        getCount += 1;
        // Second GET (the retry's refetch) reflects someone else's concurrent write.
        const content = getCount === 1
          ? { summit_tasks: ['old'] }
          : { summit_tasks: ['old'], summit_projects: ['someone-elses-write'] };
        return jsonResponse(200, { sha: `sha-${getCount}`, content: b64(content) });
      }
      putCount += 1;
      if (putCount === 1) return jsonResponse(409, {});
      return jsonResponse(200, { content: { sha: 'sha-final' } });
    });

    await dbGet('summit_tasks');
    const setPromise = dbSet('summit_tasks', ['mine']);
    await vi.advanceTimersByTimeAsync(800);
    await setPromise; // should resolve, not reject, once the retry succeeds

    expect(putCount).toBe(2);
  });

  it("rejects the caller's promise when the write ultimately fails, so a 'save failed' toast actually fires", async () => {
    const { dbGet, dbSet } = await freshDb();

    global.fetch = vi.fn(async (url, opts) => {
      if (!opts || opts.method !== 'PUT') return jsonResponse(200, { sha: 'sha-1', content: b64({}) });
      return jsonResponse(500, {});
    });

    await dbGet('summit_tasks');
    const setPromise = dbSet('summit_tasks', ['x']);
    await vi.advanceTimersByTimeAsync(800);
    await expect(setPromise).rejects.toThrow();
  });

  it('batches multiple keys changed within the debounce window into one write', async () => {
    const { dbGet, dbSet } = await freshDb();
    let putBody = null;
    global.fetch = vi.fn(async (url, opts) => {
      if (!opts || opts.method !== 'PUT') return jsonResponse(200, { sha: 'sha-1', content: b64({}) });
      putBody = JSON.parse(opts.body);
      return jsonResponse(200, { content: { sha: 'sha-2' } });
    });

    await dbGet('summit_tasks');
    const p1 = dbSet('summit_tasks', ['a']);
    const p2 = dbSet('summit_projects', ['b']);
    await vi.advanceTimersByTimeAsync(800);
    await Promise.all([p1, p2]);

    const written = JSON.parse(Buffer.from(putBody.content, 'base64').toString('utf-8'));
    expect(written).toEqual({ summit_tasks: ['a'], summit_projects: ['b'] });
  });
});
