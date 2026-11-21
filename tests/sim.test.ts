import { describe, expect, it } from 'vitest';
import { Rng } from '../src/sim/rng';
import { straightPath } from '../src/sim/track';

describe('Rng', () => {
  it('is deterministic for a given seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(Array.from({ length: 5 }, () => b.next()));
  });

  it('int() stays within inclusive bounds', () => {
    const r = new Rng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.int(3, 5);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(5);
    }
  });
});

describe('straightPath', () => {
  it('walks orthogonal, diagonal and reversed lines', () => {
    expect(straightPath({ x: 0, y: 0 }, { x: 2, y: 0 })).toHaveLength(3);
    expect(straightPath({ x: 2, y: 2 }, { x: 0, y: 0 })).toEqual([
      { x: 2, y: 2 },
      { x: 1, y: 1 },
      { x: 0, y: 0 },
    ]);
  });

  it('rejects lines that are neither orthogonal nor 45°', () => {
    expect(straightPath({ x: 0, y: 0 }, { x: 2, y: 1 })).toBeNull();
  });
});
