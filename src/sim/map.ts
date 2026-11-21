import type { Coord, Terrain } from './types';

export class GameMap {
  private readonly tiles: Terrain[];

  constructor(
    readonly width: number,
    readonly height: number,
    fill: Terrain = 'plains',
  ) {
    if (width <= 0 || height <= 0) throw new Error(`invalid map size ${width}x${height}`);
    this.tiles = new Array<Terrain>(width * height).fill(fill);
  }

  inBounds(c: Coord): boolean {
    return c.x >= 0 && c.y >= 0 && c.x < this.width && c.y < this.height;
  }

  terrainAt(c: Coord): Terrain {
    this.assertInBounds(c);
    return this.tiles[c.y * this.width + c.x]!;
  }

  setTerrain(c: Coord, terrain: Terrain): void {
    this.assertInBounds(c);
    this.tiles[c.y * this.width + c.x] = terrain;
  }

  private assertInBounds(c: Coord): void {
    if (!this.inBounds(c)) throw new Error(`(${c.x}, ${c.y}) is outside the map`);
  }
}
