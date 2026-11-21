import {
  BRIDGE_SEGMENT_COST,
  DEFAULT_STARTING_CASH,
  DEMOLISH_REFUND_RATE,
  DIAGONAL_COST_FACTOR,
  MAX_BRIDGE_WATER_TILES,
  TRACK_COST,
} from './config';
import { GameMap } from './map';
import { generateWorld, type Town } from './mapgen';
import { Rng } from './rng';
import { TrackNetwork, isAdjacent, isDiagonal, straightPath } from './track';
import { fail, ok, type CommandResult, type Coord, type Terrain } from './types';

export interface GameOptions {
  width: number;
  height: number;
  terrain?: Terrain;
  startingCash?: number;
  seed?: number;
}

export interface GenerateOptions {
  width: number;
  height: number;
  seed: number;
  startingCash?: number;
  towns?: number;
}

/**
 * The single entry point for changing game state. Every command is atomic:
 * it either succeeds and applies all its effects, or fails and changes nothing.
 * A successful command's `cost` is what it took from cash (negative for refunds).
 */
export class Game {
  readonly track = new TrackNetwork();
  readonly rng: Rng;
  cash: number;

  private constructor(
    readonly map: GameMap,
    readonly towns: readonly Town[],
    seed: number,
    startingCash: number,
  ) {
    this.rng = new Rng(seed);
    this.cash = startingCash;
  }

  /** A blank map of one terrain, for tests and sandboxes. */
  static create(opts: GameOptions): Game {
    const map = new GameMap(opts.width, opts.height, opts.terrain ?? 'plains');
    return new Game(map, [], opts.seed ?? 1, opts.startingCash ?? DEFAULT_STARTING_CASH);
  }

  /** A generated map with terrain and towns. */
  static generate(opts: GenerateOptions): Game {
    const { map, towns } = generateWorld(opts);
    return new Game(map, towns, opts.seed, opts.startingCash ?? DEFAULT_STARTING_CASH);
  }

  /** Price of a single ordinary segment, or an error message if it cannot be built. */
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
    for (let i = 1; i < path.length; i++) {
      const [a, b] = [path[i - 1]!, path[i]!];
      if (!this.track.has(a, b)) this.track.add(a, b);
    }
    this.cash -= quote.cost;
    return quote;
  }

  /**
   * Quote a bridge: a straight line whose two ends are land and whose every
   * tile in between is water (1–3 tiles). Each new segment has a flat price.
   */
  quoteBridge(from: Coord, to: Coord): CommandResult {
    const path = straightPath(from, to);
    if (!path || path.length < 3) return fail('a bridge must be a straight line over water');
    if (!path.every((c) => this.map.inBounds(c))) return fail('out of bounds');
    const isWater = (c: Coord) => this.map.terrainAt(c) === 'water';
    if (isWater(from) || isWater(to)) return fail('bridge must start and end on land');
    const span = path.slice(1, -1);
    if (!span.every(isWater)) return fail('a bridge may only span water');
    if (span.length > MAX_BRIDGE_WATER_TILES) return fail('bridge too long');
    let segments = 0;
    for (let i = 1; i < path.length; i++) if (!this.track.has(path[i - 1]!, path[i]!)) segments++;
    return ok(segments * BRIDGE_SEGMENT_COST);
  }

  buildBridge(from: Coord, to: Coord): CommandResult {
    const quote = this.quoteBridge(from, to);
    if (!quote.ok) return quote;
    if (quote.cost > this.cash) return fail('insufficient funds');
    const path = straightPath(from, to)!;
    for (let i = 1; i < path.length; i++) {
      const [a, b] = [path[i - 1]!, path[i]!];
      if (!this.track.has(a, b)) this.track.add(a, b, true);
    }
    this.cash -= quote.cost;
    return quote;
  }

  /** What tearing up one existing segment pays back. */
  demolishRefund(a: Coord, b: Coord): number {
    const seg = this.track.get(a, b);
    if (!seg) return 0;
    const buildCost = seg.bridge ? BRIDGE_SEGMENT_COST : this.segmentCost(a, b);
    return typeof buildCost === 'number' ? Math.round(buildCost * DEMOLISH_REFUND_RATE) : 0;
  }

  /** Tear up every existing segment on the straight line from `from` to `to`. */
  demolishTrack(from: Coord, to: Coord): CommandResult {
    const path = straightPath(from, to);
    if (!path || path.length < 2) return fail('not a straight line');
    const existing: [Coord, Coord][] = [];
    for (let i = 1; i < path.length; i++)
      if (this.track.has(path[i - 1]!, path[i]!)) existing.push([path[i - 1]!, path[i]!]);
    if (existing.length === 0) return fail('no track to demolish');
    const refund = existing.reduce((sum, [a, b]) => sum + this.demolishRefund(a, b), 0);
    for (const [a, b] of existing) this.track.remove(a, b);
    this.cash += refund;
    return ok(-refund);
  }
}
