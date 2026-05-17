import { describe, it, expect } from 'vitest';
import { hashSeed, mulberry32, fisherYates, seededRand } from '../random.js';

describe('hashSeed', () => {
  it('returns a non-negative integer', () => {
    expect(hashSeed('hello')).toBeGreaterThanOrEqual(0);
  });
  it('is deterministic for the same input', () => {
    expect(hashSeed('exhibit')).toBe(hashSeed('exhibit'));
  });
  it('returns different values for different inputs', () => {
    expect(hashSeed('foo')).not.toBe(hashSeed('bar'));
  });
  it('handles empty string without throwing', () => {
    expect(() => hashSeed('')).not.toThrow();
  });
});

describe('mulberry32', () => {
  it('returns values in [0, 1)', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('produces the same sequence from the same seed', () => {
    const a = mulberry32(1337);
    const b = mulberry32(1337);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('produces different sequences from different seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe('fisherYates', () => {
  it('returns a new array with the same length', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = fisherYates(arr, mulberry32(42));
    expect(shuffled).toHaveLength(arr.length);
    expect(shuffled).not.toBe(arr);
  });
  it('contains the same elements after shuffle', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(fisherYates(arr, mulberry32(42)).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });
  it('produces the same shuffle for the same seed', () => {
    const arr = ['a', 'b', 'c', 'd', 'e'];
    expect(fisherYates(arr, mulberry32(99))).toEqual(fisherYates(arr, mulberry32(99)));
  });
  it('does not mutate the original array', () => {
    const arr = [1, 2, 3];
    fisherYates(arr, mulberry32(1));
    expect(arr).toEqual([1, 2, 3]);
  });
});

describe('seededRand', () => {
  it('returns values in [0, 1)', () => {
    for (let i = 0; i < 50; i++) {
      const v = seededRand(i);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('is deterministic for the same seed', () => {
    expect(seededRand(7)).toBe(seededRand(7));
  });
  it('returns different values for different seeds', () => {
    expect(seededRand(0)).not.toBe(seededRand(1));
  });
});
