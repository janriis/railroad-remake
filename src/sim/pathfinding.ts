import { DIAGONAL_UNITS, TILE_UNITS } from './config';
import { MinHeap } from './heap';
import { isDiagonal, type TrackNetwork } from './track';
import { coordKey, sameCoord, type Coord } from './types';

export const DIRECTIONS: readonly Coord[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
];

/** Travel distance of one step, in distance units. */
export const stepUnits = (a: Coord, b: Coord): number => (isDiagonal(a, b) ? DIAGONAL_UNITS : TILE_UNITS);

export interface TrackPathOptions {
  /** Extra cost (distance units) for stepping a → b. */
  extraCost?: (a: Coord, b: Coord) => number;
  /** The first step may not go to this tile (no instant U-turns). */
  forbidFirst?: Coord | null;
}

/** Shortest path over existing track, inclusive of both ends; null if unreachable. */
export function findTrackPath(
  track: TrackNetwork,
  from: Coord,
  to: Coord,
  opts: TrackPathOptions = {},
): Coord[] | null {
  if (sameCoord(from, to)) return [from];
  const dist = new Map<string, number>([[coordKey(from), 0]]);
  const prev = new Map<string, Coord>();
  const heap = new MinHeap<Coord>();
  heap.push(0, from);
  while (heap.size > 0) {
    const { key: d, value: c } = heap.pop()!;
    const ck = coordKey(c);
    if (d > (dist.get(ck) ?? Infinity)) continue;
    if (sameCoord(c, to)) return unwind(prev, to);
    for (const n of track.neighbors(c)) {
      if (opts.forbidFirst && sameCoord(c, from) && sameCoord(n, opts.forbidFirst)) continue;
      const nd = d + stepUnits(c, n) + (opts.extraCost?.(c, n) ?? 0);
      const nk = coordKey(n);
      if (nd < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, nd);
        prev.set(nk, c);
        heap.push(nd, n);
      }
    }
  }
  return null;
}

export function unwind(prev: Map<string, Coord>, to: Coord): Coord[] {
  const path = [to];
  let cur = prev.get(coordKey(to));
  while (cur) {
    path.push(cur);
    cur = prev.get(coordKey(cur));
  }
  return path.reverse();
}
