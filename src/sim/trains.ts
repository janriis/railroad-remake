import { OPPOSING_TRAFFIC_PENALTY_TILES, TICKS_PER_DAY, TILE_UNITS } from './config';
import { findTrackPath, stepUnits } from './pathfinding';
import type { TrackNetwork } from './track';
import { coordKey, sameCoord, type Coord } from './types';

export type TrainStatus = 'idle' | 'moving' | 'waiting' | 'at-stop';

/**
 * A train is a point that hops tile to tile. While it moves from `at` to `next` it holds
 * that segment and both tiles (station tiles can be shared). `progress` counts distance
 * units travelled on the current segment.
 */
export interface Train {
  readonly id: number;
  at: Coord;
  next: Coord | null;
  /** Tile it last came from, to avoid instant U-turns. */
  prev: Coord | null;
  progress: number;
  /** Distance units per tick. */
  readonly speed: number;
  readonly passengerCars: number;
  readonly freightCars: number;
  route: Coord[];
  /** Index in `route` of the stop it is heading for. */
  target: number;
  /** Planned tiles ahead, starting with `next`. Other trains read it to avoid head-on routes. */
  plan: Coord[];
  status: TrainStatus;
  blockedBy: number | null;
  waitingTicks: number;
  deadlocked: boolean;
  /** Number of stops reached. */
  journeys: number;
  readonly waitedFor: Set<number>;
}

export const unitsPerTick = (tilesPerDay: number): number => (tilesPerDay * TILE_UNITS) / TICKS_PER_DAY;

export interface MovementContext {
  readonly track: TrackNetwork;
  readonly trains: readonly Train[];
  isStation(c: Coord): boolean;
}

/** One tick of train movement, in train id order (deterministic). */
export function advanceTrains(ctx: MovementContext): void {
  for (const t of ctx.trains) stepTrain(ctx, t);
  detectDeadlocks(ctx.trains);
}

function stepTrain(ctx: MovementContext, t: Train): void {
  if (t.route.length < 2) {
    if (!t.next) {
      t.status = 'idle';
      return;
    }
  } else if (!t.next && !tryDepart(ctx, t)) {
    return;
  }

  t.progress += t.speed;
  const cost = stepUnits(t.at, t.next!);
  if (t.progress < cost) {
    t.status = 'moving';
    return;
  }

  // Arrive at the next tile.
  const leftover = t.progress - cost;
  t.prev = t.at;
  t.at = t.next!;
  t.next = null;
  t.progress = 0;
  t.plan.shift();

  if (t.route.length >= 2 && sameCoord(t.at, t.route[t.target]!)) {
    t.journeys++;
    t.target = (t.target + 1) % t.route.length;
    t.plan = [];
    t.status = 'at-stop'; // dwell for the rest of this tick
    return;
  }
  if (t.route.length < 2) {
    t.status = 'idle';
    return;
  }
  if (tryDepart(ctx, t)) t.progress = leftover;
}

/** Plan towards the current stop and claim the next segment. Returns false if the train must wait. */
function tryDepart(ctx: MovementContext, t: Train): boolean {
  // Skip stops the train is already standing on.
  for (let i = 0; i < t.route.length && sameCoord(t.at, t.route[t.target]!); i++)
    t.target = (t.target + 1) % t.route.length;

  const path = planPath(ctx, t, t.route[t.target]!);
  if (!path || path.length < 2) {
    setWaiting(t, null);
    return false;
  }
  t.plan = path.slice(1);
  const next = t.plan[0]!;
  const blocker = blockerFor(ctx, t, next);
  if (blocker !== null) {
    setWaiting(t, blocker);
    return false;
  }
  t.next = next;
  t.status = 'moving';
  t.blockedBy = null;
  t.waitingTicks = 0;
  return true;
}

function setWaiting(t: Train, blocker: number | null): void {
  t.status = 'waiting';
  t.blockedBy = blocker;
  t.waitingTicks++;
  if (blocker !== null) t.waitedFor.add(blocker);
}

/**
 * Shortest route over track, penalising segments that other trains plan to run the
 * opposite way, so trains spread over passing loops instead of meeting head-on.
 */
function planPath(ctx: MovementContext, t: Train, dest: Coord): Coord[] | null {
  const opposing = new Set<string>();
  for (const o of ctx.trains) {
    if (o === t) continue;
    const tiles = [o.at, ...o.plan];
    for (let i = 1; i < tiles.length; i++) opposing.add(`${coordKey(tiles[i]!)}>${coordKey(tiles[i - 1]!)}`);
  }
  const penalty = OPPOSING_TRAFFIC_PENALTY_TILES * TILE_UNITS;
  const extraCost = (a: Coord, b: Coord) => (opposing.has(`${coordKey(a)}>${coordKey(b)}`) ? penalty : 0);
  return (
    findTrackPath(ctx.track, t.at, dest, { extraCost, forbidFirst: t.prev }) ??
    findTrackPath(ctx.track, t.at, dest, { extraCost })
  );
}

function blockerFor(ctx: MovementContext, t: Train, n: Coord): number | null {
  const shared = ctx.isStation(n);
  for (const o of ctx.trains) {
    if (o === t) continue;
    if (o.next && sameSegment(o.at, o.next, t.at, n)) return o.id;
    if (!shared && (sameCoord(o.at, n) || (o.next !== null && sameCoord(o.next, n)))) return o.id;
  }
  return null;
}

const sameSegment = (a: Coord, b: Coord, c: Coord, d: Coord): boolean =>
  (sameCoord(a, c) && sameCoord(b, d)) || (sameCoord(a, d) && sameCoord(b, c));

/** A train is deadlocked when it has waited at least two ticks inside a cycle of waiting trains. */
function detectDeadlocks(trains: readonly Train[]): void {
  const byId = new Map(trains.map((t) => [t.id, t]));
  for (const t of trains) {
    t.deadlocked = false;
    if (t.status !== 'waiting' || t.blockedBy === null || t.waitingTicks < 2) continue;
    const seen = new Set<number>([t.id]);
    let cur = byId.get(t.blockedBy);
    while (cur && cur.status === 'waiting' && cur.blockedBy !== null) {
      if (cur.blockedBy === t.id) {
        t.deadlocked = true;
        break;
      }
      if (seen.has(cur.id)) break;
      seen.add(cur.id);
      cur = byId.get(cur.blockedBy);
    }
  }
}
