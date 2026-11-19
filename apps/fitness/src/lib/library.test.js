import { describe, it, expect } from 'vitest';
import {
  addToLibrary, canonicalName, canonicalizeLogs, cleanLabel, duplicatePairs, findEntry, matchKey,
  mergeEntries, seedLibrary, similarEntries,
} from './library';

describe('matchKey', () => {
  it('ignores prescriptions, notes, case and plurals', () => {
    expect(matchKey('Lat pulldown: 4 x 8 (about 45 kg)')).toBe('lat pulldown');
    expect(matchKey('Lat pulldowns')).toBe('lat pulldown');
    expect(matchKey('Seated dumbbell curls: 3 x 10')).toBe('seated dumbbell curl');
    expect(matchKey('Step-ups')).toBe('step up');
    expect(matchKey('Step-up')).toBe('step up');
    expect(matchKey('Push Ups')).toBe(matchKey('Push-ups'));
    expect(matchKey('Barbell bench press\t3\t5–6')).toBe('barbell bench press');
    expect(matchKey('Dead bug: 3 x 6 each side')).toBe('dead bug');
  });
  it('keeps different drills apart', () => {
    expect(matchKey('Side plank')).not.toBe(matchKey('Plank'));
    expect(matchKey('Glute bridge hold')).not.toBe(matchKey('Glute bridge'));
    expect(cleanLabel('Hamstring stretch — 30s/side')).toBe('Hamstring stretch');
  });
});

const lib = () => [
  { id: 'a', name: 'Lat pulldown', type: 'weight', aliases: ['Lat pulldowns', 'Lat Pulldown or Pull-ups\t4\t8–12'] },
  { id: 'b', name: 'Face pull', type: 'weight', aliases: [] },
  { id: 'c', name: 'Cable face pull', type: 'weight', aliases: [] },
];

describe('findEntry / canonicalName', () => {
  it('finds by name, alias or key', () => {
    expect(findEntry(lib(), 'Lat pulldown').id).toBe('a');
    expect(findEntry(lib(), 'Lat pulldowns').id).toBe('a');
    expect(findEntry(lib(), 'lat pulldown: 4 x 8 (about 45 kg)').id).toBe('a');
    expect(findEntry(lib(), 'Face pulls').id).toBe('b');
    expect(findEntry(lib(), 'Deadlift')).toBeNull();
    expect(canonicalName(lib(), 'Lat pulldowns')).toBe('Lat pulldown');
    expect(canonicalName(lib(), 'Deadlift')).toBe('Deadlift');
  });
});

describe('similarEntries / duplicatePairs', () => {
  it('flags near-duplicates, not unrelated drills', () => {
    expect(similarEntries(lib(), 'Face pull').map(e => e.id).sort()).toEqual(['b', 'c']);
    expect(similarEntries(lib(), 'Plank')).toEqual([]);
    expect(duplicatePairs(lib()).map(([x, y]) => [x.id, y.id])).toEqual([['b', 'c']]);
  });
  it('does not call "Side plank" a duplicate of "Plank"', () => {
    const l = [{ id: '1', name: 'Plank', aliases: [] }, { id: '2', name: 'Side plank', aliases: [] }];
    expect(similarEntries(l, 'Side plank').map(e => e.id)).toEqual(['2']);
  });
});

describe('canonicalizeLogs', () => {
  it('re-keys logs for stats without touching the originals', () => {
    const logs = [{ id: 1, exercise: 'Lat pulldowns' }, { id: 2, exercise: 'Deadlift' }];
    const out = canonicalizeLogs(lib(), logs);
    expect(out.map(l => l.exercise)).toEqual(['Lat pulldown', 'Deadlift']);
    expect(logs[0].exercise).toBe('Lat pulldowns');
  });
});

describe('seedLibrary', () => {
  it('groups raw names under one clean entry with the old spellings as aliases', () => {
    const logs = [
      { exercise: 'Lat pulldown: 4 x 8 (about 45 kg)', type: 'weight' },
      { exercise: 'Lat pulldowns', type: 'weight' },
      { exercise: 'Step-ups', type: 'bodyweight' },
    ];
    const templates = [{ exercises: [{ name: 'Lat pulldown', type: 'weight' }, { name: 'Zone 2', type: 'cardio' }] }];
    const out = seedLibrary(templates, logs);
    const lat = out.filter(e => matchKey(e.name) === 'lat pulldown');
    expect(lat).toHaveLength(1);
    expect(lat[0].name).toBe('Lat pulldown');
    expect(lat[0].aliases).toEqual(expect.arrayContaining(['Lat pulldown: 4 x 8 (about 45 kg)', 'Lat pulldowns']));
    expect(out.find(e => e.name === 'Step-ups').type).toBe('bodyweight');
    expect(out.some(e => e.name === 'Zone 2')).toBe(false);
  });
  it('keeps an existing library and only adds what is new', () => {
    const out = seedLibrary([], [{ exercise: 'Lat pulldowns' }, { exercise: 'Deadlift', type: 'weight' }], lib());
    expect(out.filter(e => e.name === 'Lat pulldown')).toHaveLength(1);
    expect(out.some(e => e.name === 'Deadlift')).toBe(true);
  });
});

describe('addToLibrary / mergeEntries', () => {
  it('returns the existing entry instead of a duplicate', () => {
    const r = addToLibrary(lib(), 'Lat pulldowns');
    expect(r.entry.id).toBe('a');
    expect(r.library).toHaveLength(3);
    const n = addToLibrary(lib(), 'Bird-dog', 'bodyweight');
    expect(n.library).toHaveLength(4);
    expect(n.entry).toMatchObject({ name: 'Bird-dog', type: 'bodyweight' });
  });
  it('merges one entry into another as aliases', () => {
    const out = mergeEntries(lib(), 'c', 'b');
    expect(out.map(e => e.id)).toEqual(['a', 'b']);
    expect(out.find(e => e.id === 'b').aliases).toEqual(['Cable face pull']);
    expect(canonicalName(out, 'Cable face pull')).toBe('Face pull');
  });
});
