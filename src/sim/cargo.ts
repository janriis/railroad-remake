import {
  CARGO,
  MIN_TIME_FACTOR_PERCENT,
  TOWN_RADIUS,
  TRANSIT_DECAY_PERCENT_PER_DAY,
  TRANSIT_GRACE_DAYS,
  type Cargo,
  type IndustryKind,
} from './config';
import type { Coord } from './types';

/** Cargo on board a train, remembered with where and when it was picked up. */
export interface Lot {
  readonly cargo: Cargo;
  units: number;
  readonly from: Coord;
  /** Game time when it was loaded. */
  readonly loadedAt: number;
}

/** Town cargo waiting at a station, by the town it came from. */
export interface WaitingLot {
  readonly cargo: Cargo;
  readonly source: string;
  units: number;
}

export interface Industry {
  readonly id: number;
  readonly kind: IndustryKind;
  readonly at: Coord;
  /** Finished output waiting to be picked up. */
  stock: number;
  /** Input received and not yet processed. */
  input: number;
  /** Input received over the industry's lifetime. */
  received: number;
}

export interface Delivery {
  readonly cargo: Cargo;
  readonly units: number;
  /** Manhattan distance between pickup and drop-off, in tiles. */
  readonly distance: number;
  /** Whole days in transit. */
  readonly days: number;
}

export const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Percentage of the full rate paid after `days` in transit. */
export function timeFactorPercent(days: number): number {
  const late = Math.max(0, days - TRANSIT_GRACE_DAYS);
  return Math.max(MIN_TIME_FACTOR_PERCENT, 100 - late * TRANSIT_DECAY_PERCENT_PER_DAY);
}

export function deliveryPayment(d: Delivery): number {
  return Math.round((d.units * d.distance * CARGO[d.cargo].rate * timeFactorPercent(d.days)) / 100);
}

// --- Town footprint ---------------------------------------------------------------
// A town covers the square of TOWN_RADIUS around its centre. Its people are denser in
// the middle: the inner 3×3 holds half of them and the outer ring the other half.
// Integer weights keep coverage shares exact.

const INNER_TILE_WEIGHT = 16; // 9 tiles × 16 = 144
const OUTER_TILE_WEIGHT = 9; // 16 tiles × 9 = 144
export const TOWN_WEIGHT_TOTAL = 288;

export interface TownTile {
  readonly at: Coord;
  readonly weight: number;
}

export function townTiles(centre: Coord): TownTile[] {
  const tiles: TownTile[] = [];
  for (let dy = -TOWN_RADIUS; dy <= TOWN_RADIUS; dy++)
    for (let dx = -TOWN_RADIUS; dx <= TOWN_RADIUS; dx++) {
      const inner = Math.max(Math.abs(dx), Math.abs(dy)) <= 1;
      tiles.push({
        at: { x: centre.x + dx, y: centre.y + dy },
        weight: inner ? INNER_TILE_WEIGHT : OUTER_TILE_WEIGHT,
      });
    }
  return tiles;
}
