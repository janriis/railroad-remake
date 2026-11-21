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

export const CARGO_TYPES = [
  'passengers',
  'mail',
  'timber',
  'lumber',
  'furniture',
  'grain',
  'flour',
  'loaves',
  'coal',
] as const;
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
  coal: { rate: 4, car: 'freight' },
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

export const INDUSTRY_KINDS = [
  'timber-camp',
  'sawmill',
  'furniture-works',
  'grain-farm',
  'flour-mill',
  'bakery',
  'coal-mine',
] as const;
export type IndustryKind = (typeof INDUSTRY_KINDS)[number];

/**
 * Deposits (no input) make `perMonth` of their output, and keep at most DEPOSIT_CAP_MONTHS of it.
 * Processors turn every `in` units received into `out` units at month end; leftovers wait for next
 * month. Since M5 map generation only places deposits; processors survive in older saves.
 */
export const INDUSTRY: Readonly<
  Record<
    IndustryKind,
    | { output: Cargo; perMonth: number; input?: undefined; terrains: readonly Terrain[] }
    | { output: Cargo; input: Cargo; in: number; out: number; terrains: readonly Terrain[] }
  >
> = {
  'timber-camp': { output: 'timber', perMonth: 40, terrains: ['forest'] },
  sawmill: { input: 'timber', in: 2, output: 'lumber', out: 1, terrains: ['plains'] },
  'furniture-works': { input: 'lumber', in: 2, output: 'furniture', out: 1, terrains: ['plains'] },
  'grain-farm': { output: 'grain', perMonth: 60, terrains: ['plains'] },
  'flour-mill': { input: 'grain', in: 3, output: 'flour', out: 2, terrains: ['plains'] },
  bakery: { input: 'flour', in: 1, output: 'loaves', out: 2, terrains: ['plains'] },
  'coal-mine': { output: 'coal', perMonth: 40, terrains: ['hills', 'mountain'] },
};

export const isDeposit = (kind: IndustryKind): boolean => INDUSTRY[kind].input === undefined;
/** A deposit's stock is capped at this many months of production; the rest is lost. */
export const DEPOSIT_CAP_MONTHS = 6;

// --- M5: station buildings and town demand ---------------------------------------

export const BUILDING_KINDS = ['sawmill', 'furniture-works', 'flour-mill', 'bakery', 'coal-yard'] as const;
export type BuildingKind = (typeof BUILDING_KINDS)[number];

/** Built by the player inside a station that serves a town. Converts `in` input into `out` output. */
export const BUILDING: Readonly<
  Record<BuildingKind, { input: Cargo; output: Cargo; in: number; out: number; cost: number; upkeep: number }>
> = {
  sawmill: { input: 'timber', output: 'lumber', in: 2, out: 1, cost: 30_000, upkeep: 1_000 },
  'furniture-works': { input: 'lumber', output: 'furniture', in: 2, out: 1, cost: 45_000, upkeep: 1_500 },
  'flour-mill': { input: 'grain', output: 'flour', in: 3, out: 2, cost: 30_000, upkeep: 1_000 },
  bakery: { input: 'flour', output: 'loaves', in: 1, out: 2, cost: 20_000, upkeep: 800 },
  'coal-yard': { input: 'coal', output: 'coal', in: 1, out: 1, cost: 10_000, upkeep: 300 },
};

export const BUILDING_SLOTS: Readonly<Record<StationSize, number>> = { small: 1, medium: 2, large: 3 };
export const BUILDING_REFUND_RATE = 0.25;

/** What a town buys each month per 1,000 inhabitants, and the full price per unit. */
export const TOWN_DEMAND: Readonly<Partial<Record<Cargo, { perThousand: number; price: number }>>> = {
  loaves: { perThousand: 40, price: 60 },
  furniture: { perThousand: 5, price: 400 },
  coal: { perThousand: 20, price: 40 },
  lumber: { perThousand: 10, price: 90 },
};
/** Above demand a town pays this share of the price, up to this many times demand; then nothing. */
export const SATURATED_PRICE_RATE = 0.5;
export const SATURATION_LIMIT = 2;
/** Extra yearly growth for a town sold at least half its yearly bread demand at full price. */
export const BREAD_GROWTH_RATE = 0.05;

// --- M6: eras and locomotives -------------------------------------------------------

export const LOCO_MODELS = ['pioneer', 'ironside', 'courier', 'hauler', 'pathfinder'] as const;
export type LocoModel = (typeof LOCO_MODELS)[number];

/** Original locomotive designs. On sale from `from` to `to` inclusive (no `to`: never retired). */
export const LOCO: Readonly<
  Record<
    LocoModel,
    {
      name: string;
      from: number;
      to?: number;
      tilesPerDay: number;
      maxCars: number;
      price: number;
      running: number;
      /** Working life in years. */
      life: number;
    }
  >
> = {
  pioneer: {
    name: 'Pioneer',
    from: 1850,
    to: 1885,
    tilesPerDay: 4,
    maxCars: 4,
    price: 50_000,
    running: 2_000,
    life: 20,
  },
  ironside: {
    name: 'Ironside',
    from: 1870,
    to: 1910,
    tilesPerDay: 5,
    maxCars: 6,
    price: 80_000,
    running: 2_600,
    life: 25,
  },
  courier: {
    name: 'Courier',
    from: 1895,
    to: 1940,
    tilesPerDay: 7,
    maxCars: 6,
    price: 120_000,
    running: 3_400,
    life: 25,
  },
  hauler: {
    name: 'Hauler',
    from: 1900,
    to: 1945,
    tilesPerDay: 5,
    maxCars: 8,
    price: 110_000,
    running: 3_200,
    life: 30,
  },
  pathfinder: {
    name: 'Pathfinder',
    from: 1935,
    tilesPerDay: 8,
    maxCars: 8,
    price: 180_000,
    running: 3_800,
    life: 30,
  },
};

/** Running cost rises by this share per year of age, compounded. */
export const AGE_RUNNING_COST_RATE = 0.03;
/** Monthly breakdown chance within the working life, and the extra per year past it. */
export const BREAKDOWN_CHANCE = 0.01;
export const BREAKDOWN_CHANCE_PER_YEAR_WORN = 0.02;
export const BREAKDOWN_DAYS = 3;
/** Repairs after a breakdown, overhaul price, and trade-in as shares of the model's price. */
export const REPAIR_RATE = 0.05;
export const OVERHAUL_RATE = 0.3;
export const TRADE_IN_NEW_RATE = 0.5;
export const TRADE_IN_WORN_RATE = 0.1;
