import { BRIDGE_SEGMENT_COST, MAX_BRIDGE_WATER_TILES } from './config';
import type { GameMap } from './map';
import { MinHeap } from './heap';
import { DIRECTIONS } from './pathfinding';
import type { TrackNetwork } from './track';
import { coordKey, sameCoord, type Coord } from './types';

export interface PlannedBridge {
  readonly from: Coord;
  readonly to: Coord;
  readonly cost: number;
}

/** A suggested route for new track. Building it is a separate, atomic command. */
export interface TrackPlan {
  /** Every tile along the route, in order. */
  readonly path: readonly Coord[];
  /** Per segment (path[i] → path[i+1]): is it part of a bridge? */
  readonly bridgeSegments: readonly boolean[];
  readonly bridges: readonly PlannedBridge[];
  /** Money needed to build the missing parts today. */
  readonly cost: number;
  readonly newSegments: number;
}

export type PlanResult =
  { readonly ok: true; readonly plan: TrackPlan } | { readonly ok: false; readonly error: string };

export interface PlanOptions {
  /** Allow crossing water with new bridges (default true). */
  bridges?: boolean;
}

export interface PlannerContext {
  readonly map: GameMap;
  readonly track: TrackNetwork;
  segmentCost(a: Coord, b: Coord): number | string;
}

interface Edge {
  from: Coord;
  /** Water tiles crossed by a bridge edge, in order. */
  via: Coord[];
  bridge: boolean;
}

/**
 * Cheapest way to join two tiles with track. Existing track costs nothing, so routes
 * reuse it. Ties go to the route with fewer steps.
 */
export function planTrack(ctx: PlannerContext, from: Coord, to: Coord, opts: PlanOptions = {}): PlanResult {
  const allowBridges = opts.bridges ?? true;
  const { map, track } = ctx;
  if (!map.inBounds(from) || !map.inBounds(to)) return { ok: false, error: 'out of bounds' };
  if (sameCoord(from, to)) return { ok: false, error: 'start and end are the same tile' };
  const isWater = (c: Coord) => map.terrainAt(c) === 'water';
  if (isWater(from) || isWater(to)) return { ok: false, error: 'cannot build on water' };

  // Priority = money first, then number of steps as a tie-breaker.
  const STEP_WEIGHT = 1 / 1024;
  const best = new Map<string, number>([[coordKey(from), 0]]);
  const prev = new Map<string, Edge>();
  const heap = new MinHeap<Coord>();
  heap.push(0, from);

  const relax = (c: Coord, n: Coord, key: number, edge: Edge) => {
    const nk = coordKey(n);
    if (key < (best.get(nk) ?? Infinity)) {
      best.set(nk, key);
      prev.set(nk, edge);
      heap.push(key, n);
    }
  };

  while (heap.size > 0) {
    const { key, value: c } = heap.pop()!;
    if (key > (best.get(coordKey(c)) ?? Infinity)) continue;
    if (sameCoord(c, to)) break;

    for (const d of DIRECTIONS) {
      const n = { x: c.x + d.x, y: c.y + d.y };
      if (!map.inBounds(n)) continue;

      // Ordinary step: existing track is free; new track only between land tiles.
      if (track.has(c, n)) {
        relax(c, n, key + STEP_WEIGHT, { from: c, via: [], bridge: false });
      } else if (!isWater(c) && !isWater(n)) {
        const cost = ctx.segmentCost(c, n);
        if (typeof cost === 'number')
          relax(c, n, key + cost + STEP_WEIGHT, { from: c, via: [], bridge: false });
      }

      // Bridge: straight over 1..MAX water tiles to the next land tile.
      if (!allowBridges || isWater(c) || !isWater(n)) continue;
      const via: Coord[] = [];
      for (let j = 1; j <= MAX_BRIDGE_WATER_TILES + 1; j++) {
        const t = { x: c.x + d.x * j, y: c.y + d.y * j };
        if (!map.inBounds(t)) break;
        if (isWater(t)) {
          via.push(t);
          continue;
        }
        const tiles = [c, ...via, t];
        let cost = 0;
        for (let i = 1; i < tiles.length; i++)
          if (!track.has(tiles[i - 1]!, tiles[i]!)) cost += BRIDGE_SEGMENT_COST;
        relax(c, t, key + cost + STEP_WEIGHT * (tiles.length - 1), { from: c, via: [...via], bridge: true });
        break;
      }
    }
  }

  if (!prev.has(coordKey(to))) {
    return { ok: false, error: allowBridges ? 'no buildable route' : 'no route over land' };
  }
  const route = traceRoute(track, prev, from, to);
  const price = priceRoute(ctx, route.path, route.bridgeSegments);
  if (typeof price === 'string') return { ok: false, error: price };
  return { ok: true, plan: { ...route, ...price } };
}

/**
 * Price of the missing segments of a route against today's map and track, or an error
 * if part of it can no longer be built.
 */
export function priceRoute(
  ctx: PlannerContext,
  path: readonly Coord[],
  bridgeSegments: readonly boolean[],
): { cost: number; newSegments: number } | string {
  let cost = 0;
  let newSegments = 0;
  for (let i = 1; i < path.length; i++) {
    const [a, b] = [path[i - 1]!, path[i]!];
    if (ctx.track.has(a, b)) continue;
    newSegments++;
    if (bridgeSegments[i - 1]) {
      if (!ctx.map.inBounds(a) || !ctx.map.inBounds(b)) return 'out of bounds';
      cost += BRIDGE_SEGMENT_COST;
    } else {
      const c = ctx.segmentCost(a, b);
      if (typeof c === 'string') return c;
      cost += c;
    }
  }
  return { cost, newSegments };
}

function traceRoute(
  track: TrackNetwork,
  prev: Map<string, Edge>,
  from: Coord,
  to: Coord,
): Pick<TrackPlan, 'path' | 'bridgeSegments' | 'bridges'> {
  // Walk back edge by edge, then reverse into tile order.
  const edges: { to: Coord; edge: Edge }[] = [];
  let cur = to;
  while (!sameCoord(cur, from)) {
    const edge = prev.get(coordKey(cur))!;
    edges.push({ to: cur, edge });
    cur = edge.from;
  }
  edges.reverse();

  const path: Coord[] = [from];
  const bridgeSegments: boolean[] = [];
  const bridges: PlannedBridge[] = [];
  for (const { to: end, edge } of edges) {
    const tiles = [...edge.via, end];
    let bridgeCost = 0;
    for (const t of tiles) {
      const a = path[path.length - 1]!;
      if (edge.bridge && !track.has(a, t)) bridgeCost += BRIDGE_SEGMENT_COST;
      path.push(t);
      bridgeSegments.push(edge.bridge);
    }
    if (edge.bridge && bridgeCost > 0) bridges.push({ from: edge.from, to: end, cost: bridgeCost });
  }
  return { path, bridgeSegments, bridges };
}
