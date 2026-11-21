import type { Terrain } from './types';

/** Cost of one orthogonal track segment, keyed by the most expensive terrain it touches. */
export const TRACK_COST: Readonly<Record<Terrain, number | null>> = {
  plains: 10_000,
  forest: 15_000,
  hills: 25_000,
  mountain: 60_000,
  water: null, // needs a bridge
};

/** Diagonal segments are longer, so they cost more. */
export const DIAGONAL_COST_FACTOR = 1.5;

/** Every segment of a bridge costs the same, whatever is beneath it. */
export const BRIDGE_SEGMENT_COST = 30_000;
/** Longest run of water tiles a single bridge may span. */
export const MAX_BRIDGE_WATER_TILES = 3;

/** Share of today's build cost paid back when a segment is torn up. */
export const DEMOLISH_REFUND_RATE = 0.25;

export const DEFAULT_STARTING_CASH = 1_000_000;

/** Map generation: share of tiles per terrain, applied as height/moisture quantiles. */
export const MAPGEN = {
  water: 0.15,
  hills: 0.14,
  mountain: 0.06,
  /** Share of the remaining plains that becomes forest. */
  forestOfPlains: 0.3,
  minTownDistance: 10,
  townEdgeMargin: 2,
  /** One town per this many tiles, at least 2. */
  tilesPerTown: 1024,
} as const;
