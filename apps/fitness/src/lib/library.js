import { parseExercise } from './exercises';

// The exercise library: one canonical entry per drill, so the same exercise is
// never added twice under slightly different names. History is never rewritten —
// logs keep whatever name they were saved under. An entry lists those older
// names as `aliases`, and stats read a log under its canonical name.
//   { id, name, type, aliases: [raw names] }

// A name stripped down to what identifies the drill: no prescription ("4 x 8",
// "30s/side"), no bracketed notes, no "each side", lower case, singular words.
export const cleanLabel = (name) => {
  let s = parseExercise(name).label;
  s = s.replace(/[:\-–—]?\s*\d+\s*[x×]\s*\d.*$/i, '');
  s = s.replace(/\(.*?\)/g, ' ');
  s = s.replace(/\b(each|per)\s+(side|leg|arm|direction|way)\b/gi, ' ');
  return s.replace(/\s+/g, ' ').replace(/[\s:,\-–—]+$/g, '').trim();
};

const singular = (w) => (w.length > 2 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);

// Comparison key: "Lat pulldowns", "Lat pulldown: 4 x 8 (about 45 kg)" and
// "lat Pulldown" all give "lat pulldown"; "Step-ups" and "Step-up" both "step up".
export const matchKey = (name) => cleanLabel(name)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .split(' ')
  .filter(Boolean)
  .map(singular)
  .join(' ');

const tokens = (key) => new Set(key.split(' ').filter(Boolean));

// The entry an exact name or alias points at, else one with the same key.
export const findEntry = (library, name) => {
  if (!name) return null;
  const raw = String(name);
  const exact = library.find(e => e.name === raw || (e.aliases || []).includes(raw));
  if (exact) return exact;
  const key = matchKey(raw);
  if (!key) return null;
  return library.find(e => matchKey(e.name) === key || (e.aliases || []).some(a => matchKey(a) === key)) || null;
};

// Entries that look like the same drill under another name: one's words contain
// all of the other's ("face pull" in "cable face pull"). Exact matches are left to findEntry.
export const similarEntries = (library, name, limit = 4) => {
  const key = matchKey(name);
  if (!key) return [];
  const mine = tokens(key);
  return library.filter(e => {
    const theirs = tokens(matchKey(e.name));
    if (theirs.size === 0) return false;
    const [small, big] = mine.size <= theirs.size ? [mine, theirs] : [theirs, mine];
    const contained = [...small].every(t => big.has(t));
    // A single shared word ("plank" in "side plank") is not enough to call two drills the same.
    return contained && (small.size === big.size || small.size >= 2);
  }).slice(0, limit);
};

// Pairs of library entries that look like duplicates of each other.
export const duplicatePairs = (library) => {
  const pairs = [];
  for (let i = 0; i < library.length; i++) {
    for (let j = i + 1; j < library.length; j++) {
      if (similarEntries([library[j]], library[i].name).length) pairs.push([library[i], library[j]]);
    }
  }
  return pairs;
};

// Raw log name -> canonical name (unchanged when the library doesn't know it).
export const canonicalName = (library, raw) => findEntry(library, raw)?.name ?? raw;

// Logs as the stats should see them: same logs, canonical exercise names. Used
// for read-only views (trends, PRs, "last time") — saved history is never touched.
export const canonicalizeLogs = (library, logs) => {
  if (!library.length) return logs;
  return logs.map(l => {
    const name = canonicalName(library, l.exercise);
    return name === l.exercise ? l : { ...l, exercise: name };
  });
};

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Build the library from what already exists: every exercise in the logs and the
// templates, grouped by matchKey. The canonical name is a clean label, preferring
// one a workout already uses, then one that was logged as typed, then the shortest;
// every other raw spelling becomes an alias. An existing library is kept as is.
export const seedLibrary = (templates, strengthLogs, existing = []) => {
  const library = existing.map(e => ({ ...e, aliases: [...(e.aliases || [])] }));
  const groups = new Map(); // key -> { raws: Map(raw -> {n, inTemplate}), type }
  const see = (raw, type, inTemplate) => {
    if (!raw) return;
    const hit = findEntry(library, raw);
    if (hit) {
      if (hit.name !== raw && !hit.aliases.includes(raw)) hit.aliases.push(raw);
      return;
    }
    const key = matchKey(raw);
    if (!key) return;
    const g = groups.get(key) || { raws: new Map(), type };
    const r = g.raws.get(raw) || { n: 0, inTemplate: false };
    r.n += 1;
    r.inTemplate = r.inTemplate || inTemplate;
    g.raws.set(raw, r);
    g.type = type || g.type;
    groups.set(key, g);
  };
  strengthLogs.forEach(l => see(l.exercise, l.type, false));
  templates.forEach(t => (t.exercises || []).forEach(e => { if (e.type !== 'cardio') see(e.name, e.type, true); }));

  groups.forEach(g => {
    const raws = [...g.raws.entries()];
    const score = ([raw, info]) => [
      cleanLabel(raw) === raw && info.inTemplate ? 1 : 0, // a plain name a workout already uses
      cleanLabel(raw) === raw ? 1 : 0, // a plain name
      /^[A-Z][^A-Z]*$/.test(cleanLabel(raw)) ? 1 : 0, // sentence case ("Seated cable row")
      -cleanLabel(raw).length, // shorter reads as the plain form ("Lat pulldown" over "Lat pulldowns")
    ];
    const best = raws.slice().sort((x, y) => {
      const sx = score(x); const sy = score(y);
      for (let i = 0; i < sx.length; i++) if (sx[i] !== sy[i]) return sy[i] - sx[i];
      return 0;
    })[0];
    const name = cleanLabel(best[0]) || String(best[0]).trim();
    library.push({ id: uid(), name, type: g.type || 'weight', aliases: raws.map(([raw]) => raw).filter(raw => raw !== name) });
  });
  return library;
};

// Add an exercise (or return the entry that already covers it).
export const addToLibrary = (library, name, type = 'weight') => {
  const hit = findEntry(library, name);
  if (hit) return { library, entry: hit };
  const entry = { id: uid(), name: cleanLabel(name) || String(name).trim(), type, aliases: [] };
  return { library: [...library, entry], entry };
};

// Merge `fromId` into `intoId`: its name and aliases become aliases of the target.
export const mergeEntries = (library, fromId, intoId) => {
  const from = library.find(e => e.id === fromId);
  const into = library.find(e => e.id === intoId);
  if (!from || !into || from === into) return library;
  const aliases = [...new Set([...(into.aliases || []), from.name, ...(from.aliases || [])])].filter(a => a !== into.name);
  return library.filter(e => e.id !== fromId).map(e => (e.id === intoId ? { ...e, aliases } : e));
};
