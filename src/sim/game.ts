import { DEFAULT_STARTING_CASH, DIAGONAL_COST_FACTOR, TRACK_COST } from './config';
import { GameMap } from './map';
import { Rng } from './rng';
import { TrackNetwork, isAdjacent, isDiagonal } from './track';
import { fail, ok, type CommandResult, type Coord, type Terrain } from './types';

export interface GameOptions {
  width: number;
  height: number;
  terrain?: Terrain;
  startingCash?: number;
  seed?: number;
}

/**
 * The single entry point for changing game state. Every command is atomic:
 * it either succeeds and applies all its effects, or fails and changes nothing.
 */
export class Game {
  readonly map: GameMap;
  readonly track = new TrackNetwork();
  readonly rng: Rng;
  cash: number;

  private constructor(opts: GameOptions) {
    this.map = new GameMap(opts.width, opts.height, opts.terrain ?? 'plains');
    this.rng = new Rng(opts.seed ?? 1);
    this.cash = opts.startingCash ?? DEFAULT_STARTING_CASH;
  }

  static create(opts: GameOptions): Game {
    return new Game(opts);
  }

  /** Price of a single segment, or an error message if it cannot be built. */
  segmentCost(a: Coord, b: Coord): number | string {
    if (!this.map.inBounds(a) || !this.map.inBounds(b)) return 'out of bounds';
    if (!isAdjacent(a, b)) return 'tiles are not adjacent';
    const costs = [TRACK_COST[this.map.terrainAt(a)], TRACK_COST[this.map.terrainAt(b)]];
    if (costs.some((c) => c === null)) return 'cannot build on water';
    const base = Math.max(...(costs as number[]));
    return Math.round(isDiagonal(a, b) ? base * DIAGONAL_COST_FACTOR : base);
  }

  /** Quote the cost of building along a path of adjacent tiles. Existing segments are free. */
  quoteTrack(path: readonly Coord[]): CommandResult {
    if (path.length < 2) return fail('path too short');
    let total = 0;
    for (let i = 1; i < path.length; i++) {
      const [a, b] = [path[i - 1]!, path[i]!];
      if (this.track.has(a, b)) continue;
      const cost = this.segmentCost(a, b);
      if (typeof cost === 'string') return fail(cost);
      total += cost;
    }
    return ok(total);
  }

  buildTrack(path: readonly Coord[]): CommandResult {
    const quote = this.quoteTrack(path);
    if (!quote.ok) return quote;
    if (quote.cost > this.cash) return fail('insufficient funds');
    for (let i = 1; i < path.length; i++) this.track.add(path[i - 1]!, path[i]!);
    this.cash -= quote.cost;
    return quote;
  }
}
