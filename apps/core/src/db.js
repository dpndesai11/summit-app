const OWNER = import.meta.env.VITE_GITHUB_OWNER;
const REPO = import.meta.env.VITE_GITHUB_REPO;
const TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const FILE = 'summit-data.json';
const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`;

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
};

let cache = null;
let sha = null;
// `pending` is the full optimistic working copy (cache + every uncommitted
// local change), so reads always see your own writes immediately.
// `pendingKeys` tracks only the keys actually changed locally since the
// last successful flush — see flushToGitHub for why that distinction
// matters for not clobbering a concurrent write from another device/tab.
let pending = null;
let pendingKeys = new Set();
let flushTimer = null;
// Callers of dbSet get a promise that resolves/rejects with the outcome of
// whichever flush ends up carrying their write — not just "did dbSet get
// scheduled" (which always trivially succeeds). Everyone whose dbSet lands
// in the same debounce window shares one flush and settles together.
let waiters = [];
// Serializes flushes so two overlapping ones (e.g. dbRefresh's own flush
// racing a debounce that fires at the same moment) can't PUT concurrently.
let flushChain = Promise.resolve();

function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  return btoa(String.fromCharCode(...bytes));
}

function b64decode(b64) {
  const bytes = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bytes, c => c.charCodeAt(0)));
}

async function loadFromGitHub() {
  const res = await fetch(API_URL, { headers });
  if (res.status === 404) { sha = null; return {}; }
  if (!res.ok) throw new Error(`GitHub read error: ${res.status}`);
  const json = await res.json();
  sha = json.sha;
  return JSON.parse(b64decode(json.content));
}

// Writes only the keys that changed locally, layered on top of whatever is
// actually on GitHub right now — not on top of our possibly-stale in-memory
// cache. This is what lets two devices editing different keys (e.g. one
// changes summit_meal_times, the other summit_tasks) both keep their
// changes instead of one silently overwriting the other with a stale full
// snapshot. Two devices editing the *same* key at the same moment still
// resolves last-write-wins for that key — a real limit without a proper
// merge, but one key's worth of blast radius instead of the whole document.
//
// On a sha conflict (someone else wrote in between our read and our write)
// this refetches and retries a few times before giving up.
async function flushToGitHub(attempt = 0) {
  if (pendingKeys.size === 0) return;
  const changedKeys = [...pendingKeys];
  const changes = {};
  changedKeys.forEach(k => { changes[k] = pending[k]; });
  const settling = waiters;
  waiters = [];
  // Clear the pending markers optimistically; on failure we restore them
  // below so the next flush attempt/retry carries them.
  pendingKeys = new Set();

  try {
    const base = await loadFromGitHub();
    const merged = { ...base, ...changes };
    const body = {
      message: 'update summit data',
      content: b64encode(JSON.stringify(merged)),
      ...(sha && { sha }),
    };
    const res = await fetch(API_URL, { method: 'PUT', headers, body: JSON.stringify(body) });

    if ((res.status === 409 || res.status === 422) && attempt < 3) {
      // Stale sha race — someone else wrote between our read above and this
      // PUT. Re-queue our changes and retry against fresh state.
      changedKeys.forEach(k => pendingKeys.add(k));
      waiters.push(...settling);
      return flushToGitHub(attempt + 1);
    }
    if (!res.ok) throw new Error(`GitHub write error: ${res.status}`);

    const json = await res.json();
    sha = json.content.sha;
    cache = merged;
    settling.forEach(w => w.resolve());
  } catch (e) {
    changedKeys.forEach(k => pendingKeys.add(k));
    settling.forEach(w => w.reject(e));
    throw e;
  }
}

export async function dbGet(key) {
  if (!cache) cache = await loadFromGitHub();
  return cache[key] ?? null;
}

export function dbSet(key, value) {
  return new Promise((resolve, reject) => {
    (async () => {
      if (!cache) cache = await loadFromGitHub();
      if (!pending) pending = { ...cache };
      pending[key] = value;
      pendingKeys.add(key);
      cache = { ...pending };
      waiters.push({ resolve, reject });
      clearTimeout(flushTimer);
      flushTimer = setTimeout(() => {
        flushChain = flushChain.then(() => flushToGitHub()).catch(() => {});
      }, 800);
    })().catch(reject);
  });
}

// Forces the next dbGet to refetch from GitHub instead of serving the
// in-memory cache — lets an open tab pick up changes made elsewhere
// (another device, another tab) without a full reload. Flushes any pending
// local write first so an in-flight edit isn't lost by the refetch.
export async function dbRefresh() {
  clearTimeout(flushTimer);
  flushChain = flushChain.then(() => flushToGitHub()).catch(() => {});
  await flushChain;
  cache = null;
  sha = null;
}
