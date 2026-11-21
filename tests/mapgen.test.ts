import { describe, expect, it } from 'vitest';
import { generateWorld } from '../src/sim/mapgen';

describe('generateWorld over many seeds', () => {
  it('always places the requested towns on plains, far enough apart', () => {
    for (let seed = 0; seed < 200; seed++) {
      const { map, towns } = generateWorld({ width: 64, height: 64, seed });
      expect(towns, `seed ${seed}`).toHaveLength(4);
      for (const t of towns) expect(map.terrainAt(t)).toBe('plains');
      expect(new Set(towns.map((t) => t.name)).size).toBe(towns.length);
    }
  });
});
