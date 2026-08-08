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
let pending = null;
let flushTimer = null;

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
  if (res.status === 404) return {};
  if (!res.ok) throw new Error(`GitHub read error: ${res.status}`);
  const json = await res.json();
  sha = json.sha;
  return JSON.parse(b64decode(json.content));
}

async function flushToGitHub() {
  if (!pending) return;
  const snapshot = { ...pending };
  pending = null;
  const body = {
    message: 'update summit data',
    content: b64encode(JSON.stringify(snapshot)),
    ...(sha && { sha }),
  };
  const res = await fetch(API_URL, { method: 'PUT', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`GitHub write error: ${res.status}`);
  const json = await res.json();
  sha = json.content.sha;
  cache = snapshot;
}

export async function dbGet(key) {
  if (!cache) cache = await loadFromGitHub();
  return cache[key] ?? null;
}

export async function dbSet(key, value) {
  if (!cache) cache = await loadFromGitHub();
  if (!pending) pending = { ...cache };
  pending[key] = value;
  cache = { ...pending };
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flushToGitHub, 800);
}
