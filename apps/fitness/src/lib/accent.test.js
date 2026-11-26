import { describe, it, expect } from 'vitest';
import { ACCENTS, DEFAULT_ACCENT, normalizeAccent, readAccent } from './accent';

describe('accent', () => {
  it('keeps a known accent and falls back to the default otherwise', () => {
    expect(normalizeAccent('red')).toBe('red');
    expect(normalizeAccent('purple')).toBe(DEFAULT_ACCENT);
    expect(normalizeAccent(null)).toBe(DEFAULT_ACCENT);
  });
  it('offers volt, red, orange and pink, each with light and dark swatches', () => {
    expect(ACCENTS.map(a => a.id)).toEqual(['volt', 'red', 'orange', 'pink']);
    ACCENTS.forEach(a => { expect(a.light).toMatch(/^#/); expect(a.dark).toMatch(/^#/); });
  });
  it('reads the default when storage is unavailable', () => {
    expect(readAccent()).toBe(DEFAULT_ACCENT);
  });
});
