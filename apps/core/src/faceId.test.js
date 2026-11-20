import { describe, it, expect } from 'vitest';
import { fromB64Url, toB64Url } from './faceId';

describe('base64url helpers', () => {
  it('round-trips arbitrary bytes without padding or + / characters', () => {
    const bytes = Uint8Array.from([251, 255, 254, 0, 1, 2, 62, 63, 64, 250]);
    const s = toB64Url(bytes);
    expect(s).not.toMatch(/[+/=]/);
    expect([...fromB64Url(s)]).toEqual([...bytes]);
  });
  it('handles empty and short input', () => {
    expect(toB64Url(new Uint8Array([]))).toBe('');
    expect([...fromB64Url('')]).toEqual([]);
    expect([...fromB64Url(toB64Url([1]))]).toEqual([1]);
  });
});
