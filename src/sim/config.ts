import type { Terrain } from './types';

/** Cost of one orthogonal track segment, keyed by the most expensive terrain it touches. */
export const TRACK_COST: Readonly<Record<Terrain, number | null>> = {
  plains: 10_000,
  forest: 15_000,
  hills: 25_000,
  mountain: 60_000,
  water: null, // needs a bridge (M1 backlog)
};

/** Diagonal segments are longer, so they cost more. */
export const DIAGONAL_COST_FACTOR = 1.5;

export const DEFAULT_STARTING_CASH = 1_000_000;
