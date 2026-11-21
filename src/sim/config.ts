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

// --- M2: stations & trains ----------------------------------------------------

export const STATION_SIZES = ['small', 'medium', 'large'] as const;
export type StationSize = (typeof STATION_SIZES)[number];
export const STATION: Readonly<Record<StationSize, { cost: number; radius: number }>> = {
  small: { cost: 5_000, radius: 1 },
  medium: { cost: 15_000, radius: 2 },
  large: { cost: 40_000, radius: 3 },
};

export const LOCOMOTIVE_COST = 50_000;
export const PASSENGER_CAR_COST = 10_000;
export const FREIGHT_CAR_COST = 8_000;
export const MAX_CARS = 6;

/** 1 tick = 1 game hour. */
export const TICKS_PER_DAY = 24;
/** Distance units per orthogonal tile step; a diagonal step is 1.5×. Chosen so speeds stay integral. */
export const TILE_UNITS = 48;
export const DIAGONAL_UNITS = 72;
export const LOCOMOTIVE_TILES_PER_DAY = 4;
/** Routing penalty (in tiles) for each segment another train plans to run the opposite way. */
export const OPPOSING_TRAFFIC_PENALTY_TILES = 4;
