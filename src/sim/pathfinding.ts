import { DIAGONAL_UNITS, TILE_UNITS } from './config';
import { MinHeap } from './heap';
import { heading, smoothTurn } from './geometry';
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
  /**
   * Ring heading (see geometry.ts) the train is already travelling in at `from`; the first
   * step must then turn by at most 45° too. Null or absent: any first step (e.g. at a station).
   */
  heading?: number | null;
}

/**
 * Shortest path over existing track, inclusive of both ends; null if unreachable. Trains turn
 * by at most 45° at every tile on the way, so the search state is (tile, heading).
 */
export function findTrackPath(
  track: TrackNetwork,
  from: Coord,
  to: Coord,
  opts: TrackPathOptions = {},
): Coord[] | null {
  if (sameCoord(from, to)) return [from];
  const START = 8;
  const key = (c: Coord, h: number) => `${coordKey(c)}|${h}`;
  const first = opts.heading ?? START;
  const dist = new Map<string, number>([[key(from, first), 0]]);
  const prev = new Map<string, { at: Coord; h: number }>();
  const heap = new MinHeap<{ at: Coord; h: number }>();
  heap.push(0, { at: from, h: first });
  while (heap.size > 0) {
    const { key: d, value: s } = heap.pop()!;
    const sk = key(s.at, s.h);
    if (d > (dist.get(sk) ?? Infinity)) continue;
    if (sameCoord(s.at, to)) return unwindStates(prev, s);
    for (const n of track.neighbors(s.at)) {
      const h = heading(s.at, n);
      if (s.h !== START && !smoothTurn(s.h, h)) continue;
      const nd = d + stepUnits(s.at, n) + (opts.extraCost?.(s.at, n) ?? 0);
      const nk = key(n, h);
      if (nd < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, nd);
        prev.set(nk, s);
        heap.push(nd, { at: n, h });
      }
    }
  }
  return null;
}

function unwindStates(prev: Map<string, { at: Coord; h: number }>, last: { at: Coord; h: number }): Coord[] {
  const path: Coord[] = [];
  let cur: { at: Coord; h: number } | undefined = last;
  while (cur) {
    path.push(cur.at);
    cur = prev.get(`${coordKey(cur.at)}|${cur.h}`);
  }
  return path.reverse();
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
