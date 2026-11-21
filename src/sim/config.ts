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
  /** One industry of each kind per this many tiles, at least 1. */
  tilesPerIndustry: 2048,
  /** Industries keep this Chebyshev distance from towns and each other. */
  minIndustryDistance: 4,
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
/** Share of a car's price paid back when it is taken off a train. */
export const CAR_RESALE_RATE = 0.5;

/** 1 tick = 1 game hour. */
export const TICKS_PER_DAY = 24;
/** Distance units per orthogonal tile step; a diagonal step is 1.5×. Chosen so speeds stay integral. */
export const TILE_UNITS = 48;
export const DIAGONAL_UNITS = 72;
export const LOCOMOTIVE_TILES_PER_DAY = 4;

// --- M3: economy ----------------------------------------------------------------

export const START_YEAR = 1850;
/** Charged at the end of every month. */
export const TRACK_MAINTENANCE_PER_SEGMENT = 100;
export const LOCOMOTIVE_RUNNING_COST = 2_000;
export const CAR_RUNNING_COST = 200;
/** Routing penalty (in tiles) for each segment another train plans to run the opposite way. */
export const OPPOSING_TRAFFIC_PENALTY_TILES = 4;

// --- M3: cargo ------------------------------------------------------------------

export const CARGO_TYPES = ['passengers', 'mail', 'timber', 'lumber', 'furniture', 'grain', 'flour', 'loaves'] as const;
export type Cargo = (typeof CARGO_TYPES)[number];

/** Payment per unit per tile, and which kind of car carries it. */
export const CARGO: Readonly<Record<Cargo, { rate: number; car: 'passenger' | 'freight' }>> = {
  passengers: { rate: 5, car: 'passenger' },
  mail: { rate: 8, car: 'passenger' },
  timber: { rate: 3, car: 'freight' },
  lumber: { rate: 6, car: 'freight' },
  furniture: { rate: 12, car: 'freight' },
  grain: { rate: 3, car: 'freight' },
  flour: { rate: 5, car: 'freight' },
  loaves: { rate: 9, car: 'freight' },
};

/** Units one car holds (passengers and mail share passenger cars). */
export const PASSENGER_CAR_CAPACITY = 40;
export const FREIGHT_CAR_CAPACITY = 20;

/** Full pay up to this many days in transit, then the time factor drops. */
export const TRANSIT_GRACE_DAYS = 20;
export const TRANSIT_DECAY_PERCENT_PER_DAY = 2;
export const MIN_TIME_FACTOR_PERCENT = 50;

/** Per month: one passenger per this many inhabitants, one mailbag per this many. */
export const INHABITANTS_PER_PASSENGER = 10;
export const INHABITANTS_PER_MAILBAG = 50;
/** A town spans this Chebyshev radius around its centre; the inner ring holds half the people. */
export const TOWN_RADIUS = 2;
/** Yearly growth when at least half the passengers were carried away. */
export const TOWN_GROWTH_RATE = 0.1;
export const TOWN_POPULATION = { min: 400, max: 3_000 } as const;

export const INDUSTRY_KINDS = ['timber-camp', 'sawmill', 'furniture-works', 'grain-farm', 'flour-mill', 'bakery'] as const;
export type IndustryKind = (typeof INDUSTRY_KINDS)[number];

/**
 * Primary industries make `perMonth` of their output. Processors turn every `in` units
 * received into `out` units at month end; leftovers wait for next month.
 */
export const INDUSTRY: Readonly<
  Record<
    IndustryKind,
    | { output: Cargo; perMonth: number; input?: undefined; terrain: 'forest' | 'plains' }
    | { output: Cargo; input: Cargo; in: number; out: number; terrain: 'plains' }
  >
> = {
  'timber-camp': { output: 'timber', perMonth: 40, terrain: 'forest' },
  sawmill: { input: 'timber', in: 2, output: 'lumber', out: 1, terrain: 'plains' },
  'furniture-works': { input: 'lumber', in: 2, output: 'furniture', out: 1, terrain: 'plains' },
  'grain-farm': { output: 'grain', perMonth: 60, terrain: 'plains' },
  'flour-mill': { input: 'grain', in: 3, output: 'flour', out: 2, terrain: 'plains' },
  bakery: { input: 'flour', in: 1, output: 'loaves', out: 2, terrain: 'plains' },
};
