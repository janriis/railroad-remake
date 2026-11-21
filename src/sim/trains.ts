import { OPPOSING_TRAFFIC_PENALTY_TILES, TICKS_PER_DAY, TILE_UNITS } from './config';
import { heading } from './geometry';
import { findTrackPath, stepUnits } from './pathfinding';
import type { Lot } from './cargo';
import type { TrackNetwork } from './track';
import { coordKey, sameCoord, type Coord } from './types';

export interface CarCounts {
  readonly passengerCars: number;
  readonly freightCars: number;
}

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
  passengerCars: number;
  freightCars: number;
  route: Coord[];
  /** Per stop (same index as `route`): the cars to leave that stop with, or null to keep them. */
  stopOrders: (CarCounts | null)[];
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
  /** Cargo on board. */
  cargo: Lot[];
  /** A one-off trip to this station, taking priority over the route. */
  trip: Coord | null;
  /** The last station it called at. */
  lastStop: Coord | null;
  readonly waitedFor: Set<number>;
}

export const unitsPerTick = (tilesPerDay: number): number => (tilesPerDay * TILE_UNITS) / TICKS_PER_DAY;

export interface MovementContext {
  readonly track: TrackNetwork;
  readonly trains: readonly Train[];
  isStation(c: Coord): boolean;
  /** Called when a train reaches stop `stopIndex` of its route: unload, change cars, load. */
  serviceStop(t: Train, stopIndex: number): void;
}

/** One tick of train movement, in train id order (deterministic). */
export function advanceTrains(ctx: MovementContext): void {
  for (const t of ctx.trains) stepTrain(ctx, t);
  detectDeadlocks(ctx.trains);
}

function stepTrain(ctx: MovementContext, t: Train): void {
  if (t.route.length < 2 && !t.trip) {
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

  if (t.trip && sameCoord(t.at, t.trip)) {
    t.journeys++;
    t.lastStop = { ...t.at };
    ctx.serviceStop(t, -1);
    t.trip = null;
    t.plan = [];
    t.status = t.route.length >= 2 ? 'at-stop' : 'idle';
    return;
  }
  if (!t.trip && t.route.length >= 2 && sameCoord(t.at, t.route[t.target]!)) {
    t.journeys++;
    t.lastStop = { ...t.at };
    ctx.serviceStop(t, t.target);
    t.target = (t.target + 1) % t.route.length;
    t.plan = [];
    t.status = 'at-stop'; // dwell for the rest of this tick
    return;
  }
  if (t.route.length < 2 && !t.trip) {
    t.status = 'idle';
    return;
  }
  if (tryDepart(ctx, t)) t.progress = leftover;
}

/** Plan towards the current stop and claim the next segment. Returns false if the train must wait. */
function tryDepart(ctx: MovementContext, t: Train): boolean {
  // Skip stops the train is already standing on.
  if (!t.trip)
    for (let i = 0; i < t.route.length && sameCoord(t.at, t.route[t.target]!); i++)
      t.target = (t.target + 1) % t.route.length;

  const path = planPath(ctx, t, t.trip ?? t.route[t.target]!);
  if (!path || path.length < 2) {
    setWaiting(t, null);
    return false;
  }
  t.plan = path.slice(1);
  const next = t.plan[0]!;
  const blocker = blockerFor(ctx, t, next) ?? opposingInSection(ctx, t);
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
  const extraCost = (a: Coord, b: Coord) =>
    !ctx.track.isDouble(a, b) && opposing.has(`${coordKey(a)}>${coordKey(b)}`) ? penalty : 0;
  // Carry on the way the train is facing; it may only reverse at a station (or if it has
  // never moved, e.g. a train just placed on the line).
  const facing = t.prev ? heading(t.prev, t.at) : null;
  const ahead = findTrackPath(ctx.track, t.at, dest, { extraCost, heading: facing });
  if (ahead || facing === null || !ctx.isStation(t.at)) return ahead;
  return findTrackPath(ctx.track, t.at, dest, { extraCost });
}

/**
 * Who stops `t` from moving onto tile `n`. A segment is one block; on double track each
 * direction is its own block. Tiles are exclusive except stations and plain double-line tiles.
 */
function blockerFor(ctx: MovementContext, t: Train, n: Coord): number | null {
  const double = ctx.track.isDouble(t.at, n);
  const station = ctx.isStation(n);
  const shared = station || ctx.track.isDoubleTile(n);
  for (const o of ctx.trains) {
    if (o === t) continue;
    if (!o.next) {
      if (!sameCoord(o.at, n)) continue;
      // On a double line a standing train only blocks its own line: the one it is facing along.
      if (!shared || (!station && sameDirection(o, t.at))) return o.id;
      continue;
    }
    const sameLine = double
      ? sameCoord(o.at, t.at) && sameCoord(o.next, n)
      : sameSegment(o.at, o.next, t.at, n);
    if (sameLine) return o.id;
    if (!shared && (sameCoord(o.at, n) || sameCoord(o.next, n))) return o.id;
  }
  return null;
}

/**
 * Places where trains can wait or pass: stations, tiles on a plain double line, and junctions.
 * The single track between two such places is a section.
 */
function isPassingPlace(ctx: MovementContext, c: Coord): boolean {
  return ctx.isStation(c) || ctx.track.isDoubleTile(c) || ctx.track.neighbors(c).length >= 3;
}

/**
 * Section signalling: a train standing at a passing place does not enter the single-track
 * section ahead while a train coming the other way is in it, so they never meet head-on there.
 */
function opposingInSection(ctx: MovementContext, t: Train): number | null {
  if (!isPassingPlace(ctx, t.at)) return null;
  const section: Coord[] = [];
  for (const c of t.plan) {
    if (isPassingPlace(ctx, c)) break;
    section.push(c);
  }
  if (section.length === 0) return null;
  const index = (c: Coord) => section.findIndex((s) => sameCoord(s, c));
  for (const o of ctx.trains) {
    if (o === t) continue;
    const here = index(o.at);
    if (here < 0) {
      // Just pulling into the section: from our end it follows us, from the far end it comes at us.
      if (o.next && index(o.next) >= 0 && !sameCoord(o.at, t.at)) return o.id;
      continue;
    }
    // Coming towards us if its way ahead leads back down the section or to our tile.
    const ahead = [o.next, ...o.plan].filter((c): c is Coord => c !== null);
    const towardsUs =
      ahead.length === 0 || ahead.some((c) => sameCoord(c, t.at) || (index(c) >= 0 && index(c) < here));
    if (towardsUs) return o.id;
  }
  return null;
}

/**
 * Whether standing train `o` faces the same way as a train arriving from `from`: it is heading
 * away from `from` (or, with no plan, it came from `from` or we cannot tell).
 */
function sameDirection(o: Train, from: Coord): boolean {
  const ahead = o.plan[0];
  if (ahead) return !sameCoord(ahead, from);
  return o.prev === null || sameCoord(o.prev, from);
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
