import { describe, it, expect } from 'vitest';
import { defaultTransform, pointsToPath, pathHitTest, screenToWorld } from '../canvas.js';

describe('defaultTransform', () => {
  it('returns an object with x, y, scale, rotate, zIndex', () => {
    const t = defaultTransform(0, 10);
    expect(t).toHaveProperty('x');
    expect(t).toHaveProperty('y');
    expect(t).toHaveProperty('scale');
    expect(t).toHaveProperty('rotate');
    expect(t).toHaveProperty('zIndex');
  });
  it('assigns sequential zIndex from 1', () => {
    expect(defaultTransform(0, 5).zIndex).toBe(1);
    expect(defaultTransform(4, 5).zIndex).toBe(5);
  });
  it('keeps scale in a sane range', () => {
    for (let i = 0; i < 20; i++) {
      const { scale } = defaultTransform(i, 20);
      expect(scale).toBeGreaterThan(0.5);
      expect(scale).toBeLessThan(2);
    }
  });
  it('produces positive x and y', () => {
    for (let i = 0; i < 10; i++) {
      const { x, y } = defaultTransform(i, 10);
      expect(x).toBeGreaterThan(0);
      expect(y).toBeGreaterThan(0);
    }
  });
});

describe('pointsToPath', () => {
  it('returns empty string for zero points', () => {
    expect(pointsToPath([])).toBe('');
  });
  it('returns empty string for a single point', () => {
    expect(pointsToPath([{ x: 0, y: 0 }])).toBe('');
  });
  it('starts with M for the first point', () => {
    const d = pointsToPath([{ x: 10, y: 20 }, { x: 30, y: 40 }]);
    expect(d).toMatch(/^M 10 20/);
  });
  it('generates L commands for subsequent points', () => {
    const d = pointsToPath([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }]);
    expect(d).toContain('L 1 1');
    expect(d).toContain('L 2 2');
  });
});

describe('pathHitTest', () => {
  const hLine = 'M 0 0 L 100 0';

  it('returns true for a point on the path', () => {
    expect(pathHitTest(hLine, 50, 0, 5)).toBe(true);
  });
  it('returns false for a point far from the path', () => {
    expect(pathHitTest(hLine, 50, 50, 5)).toBe(false);
  });
  it('returns true near an endpoint', () => {
    expect(pathHitTest(hLine, 0, 0, 5)).toBe(true);
    expect(pathHitTest(hLine, 100, 0, 5)).toBe(true);
  });
  it('respects the threshold parameter', () => {
    expect(pathHitTest(hLine, 50, 8, 5)).toBe(false);
    expect(pathHitTest(hLine, 50, 8, 10)).toBe(true);
  });
});

describe('screenToWorld', () => {
  it('is identity when pan=0 and zoom=1', () => {
    expect(screenToWorld(100, 200, { x: 0, y: 0 }, 1)).toEqual({ x: 100, y: 200 });
  });
  it('subtracts pan offset', () => {
    expect(screenToWorld(100, 200, { x: 50, y: 50 }, 1)).toEqual({ x: 50, y: 150 });
  });
  it('divides by zoom', () => {
    expect(screenToWorld(100, 100, { x: 0, y: 0 }, 2)).toEqual({ x: 50, y: 50 });
  });
  it('applies both pan and zoom correctly', () => {
    const result = screenToWorld(200, 100, { x: 100, y: 0 }, 2);
    expect(result).toEqual({ x: 50, y: 50 });
  });
});
