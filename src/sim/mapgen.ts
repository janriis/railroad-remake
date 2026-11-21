import { INDUSTRY, INDUSTRY_KINDS, MAPGEN, TOWN_POPULATION, type IndustryKind } from './config';
import { GameMap } from './map';
import { Rng } from './rng';
import type { Coord } from './types';

export interface Town extends Coord {
  readonly name: string;
  population: number;
  /** Passengers produced for the railroad and carried away so far this year (drives growth). */
  generatedThisYear: number;
  carriedThisYear: number;
}

export const newTown = (name: string, at: Coord, population: number): Town => ({
  x: at.x,
  y: at.y,
  name,
  population,
  generatedThisYear: 0,
  carriedThisYear: 0,
});

export interface IndustrySite {
  readonly kind: IndustryKind;
  readonly at: Coord;
}

export interface GeneratedWorld {
  readonly map: GameMap;
  readonly towns: Town[];
  readonly industries: IndustrySite[];
}

export interface MapGenOptions {
  width: number;
  height: number;
  seed: number;
  towns?: number;
}

/** Deterministic terrain + town placement. Same options ⇒ same world. */
export function generateWorld(opts: MapGenOptions): GeneratedWorld {
  const { width, height } = opts;
  const rng = new Rng(opts.seed);
  const elevation = fractalNoise(rng, width, height);
  const moisture = fractalNoise(rng, width, height);
  const map = new GameMap(width, height, 'plains');

  // Quantile thresholds guarantee the terrain mix on every seed.
  const waterAt = quantile(elevation, MAPGEN.water);
  const hillsAt = quantile(elevation, 1 - MAPGEN.hills - MAPGEN.mountain);
  const mountainAt = quantile(elevation, 1 - MAPGEN.mountain);
  const forestAt = quantile(moisture, 1 - MAPGEN.forestOfPlains);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const e = elevation[i]!;
      const c = { x, y };
      if (e < waterAt) map.setTerrain(c, 'water');
      else if (e >= mountainAt) map.setTerrain(c, 'mountain');
      else if (e >= hillsAt) map.setTerrain(c, 'hills');
      else if (moisture[i]! >= forestAt) map.setTerrain(c, 'forest');
    }
  }

  const townCount = opts.towns ?? Math.max(2, Math.round((width * height) / MAPGEN.tilesPerTown));
  const towns = placeTowns(rng, map, townCount);
  // Drawn after placement so that town positions don't depend on these rolls.
  for (const t of towns) t.population = rng.int(TOWN_POPULATION.min / 10, TOWN_POPULATION.max / 10) * 10;
  return { map, towns, industries: placeIndustries(rng, map, towns) };
}

/** Each industry kind appears once per MAPGEN.tilesPerIndustry tiles (at least once). */
function placeIndustries(rng: Rng, map: GameMap, towns: readonly Town[]): IndustrySite[] {
  const perKind = Math.max(1, Math.round((map.width * map.height) / MAPGEN.tilesPerIndustry));
  const m = MAPGEN.townEdgeMargin;
  const candidates: Coord[] = [];
  for (let y = m; y < map.height - m; y++) for (let x = m; x < map.width - m; x++) candidates.push({ x, y });
  shuffle(rng, candidates);
  const taken: Coord[] = [...towns];
  const sites: IndustrySite[] = [];
  for (const kind of INDUSTRY_KINDS) {
    let placed = 0;
    for (const c of candidates) {
      if (placed === perKind) break;
      if (map.terrainAt(c) !== INDUSTRY[kind].terrain) continue;
      if (taken.some((t) => Math.max(Math.abs(t.x - c.x), Math.abs(t.y - c.y)) < MAPGEN.minIndustryDistance)) continue;
      sites.push({ kind, at: c });
      taken.push(c);
      placed++;
    }
  }
  return sites;
}

function shuffle<T>(rng: Rng, items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
}

function placeTowns(rng: Rng, map: GameMap, count: number): Town[] {
  const m = MAPGEN.townEdgeMargin;
  const candidates: Coord[] = [];
  for (let y = m; y < map.height - m; y++)
    for (let x = m; x < map.width - m; x++)
      if (map.terrainAt({ x, y }) === 'plains') candidates.push({ x, y });

  shuffle(rng, candidates);

  const names = townNames(rng, count);
  const towns: Town[] = [];
  for (const c of candidates) {
    if (towns.length === count) break;
    if (towns.every((t) => Math.hypot(t.x - c.x, t.y - c.y) >= MAPGEN.minTownDistance))
      towns.push(newTown(names[towns.length]!, c, 0));
  }
  return towns;
}

const PREFIXES = [
  'Ash',
  'Bram',
  'Cold',
  'Elm',
  'Fair',
  'Gran',
  'Hollow',
  'Iron',
  'Kings',
  'Lark',
  'Mill',
  'North',
  'Oak',
  'Pine',
  'Red',
  'Stone',
  'Wex',
  'Wil',
  'Copper',
  'Black',
];
const SUFFIXES = [
  'ford',
  'bury',
  'field',
  'haven',
  'ton',
  'wick',
  'ridge',
  'mouth',
  'dale',
  'stead',
  'crossing',
  'falls',
];

function townNames(rng: Rng, count: number): string[] {
  const names = new Set<string>();
  while (names.size < count)
    names.add(PREFIXES[rng.int(0, PREFIXES.length - 1)]! + SUFFIXES[rng.int(0, SUFFIXES.length - 1)]!);
  return [...names];
}

/** Three octaves of value noise in [0, 1]. */
function fractalNoise(rng: Rng, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  const octaves: [cell: number, weight: number][] = [
    [16, 0.6],
    [8, 0.3],
    [4, 0.1],
  ];
  for (const [cell, weight] of octaves) {
    const gw = Math.ceil(width / cell) + 2;
    const gh = Math.ceil(height / cell) + 2;
    const lattice = Float32Array.from({ length: gw * gh }, () => rng.next());
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const gx = x / cell;
        const gy = y / cell;
        const x0 = Math.floor(gx);
        const y0 = Math.floor(gy);
        const tx = smooth(gx - x0);
        const ty = smooth(gy - y0);
        const v = (ix: number, iy: number) => lattice[iy * gw + ix]!;
        const top = lerp(v(x0, y0), v(x0 + 1, y0), tx);
        const bottom = lerp(v(x0, y0 + 1), v(x0 + 1, y0 + 1), tx);
        out[y * width + x]! += weight * lerp(top, bottom, ty);
      }
    }
  }
  return out;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function quantile(values: Float32Array, q: number): number {
  const sorted = Float32Array.from(values).sort();
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;
}
