import { coordKey, type Coord } from './types';

export interface Segment {
  readonly a: Coord;
  readonly b: Coord;
  readonly bridge: boolean;
}

const NEIGHBOR_OFFSETS: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/** Undirected graph of track segments between 8-neighbour tiles. */
export class TrackNetwork {
  private readonly segs = new Map<string, Segment>();

  static segmentKey(a: Coord, b: Coord): string {
    const [ka, kb] = [coordKey(a), coordKey(b)];
    return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
  }

  has(a: Coord, b: Coord): boolean {
    return this.segs.has(TrackNetwork.segmentKey(a, b));
  }

  get(a: Coord, b: Coord): Segment | undefined {
    return this.segs.get(TrackNetwork.segmentKey(a, b));
  }

  add(a: Coord, b: Coord, bridge = false): void {
    this.segs.set(TrackNetwork.segmentKey(a, b), { a, b, bridge });
  }

  remove(a: Coord, b: Coord): void {
    this.segs.delete(TrackNetwork.segmentKey(a, b));
  }

  /** Tiles joined to `c` by a segment, in a fixed direction order. */
  neighbors(c: Coord): Coord[] {
    const out: Coord[] = [];
    for (const [dx, dy] of NEIGHBOR_OFFSETS) {
      const n = { x: c.x + dx, y: c.y + dy };
      if (this.has(c, n)) out.push(n);
    }
    return out;
  }

  /** True if any segment ends at `c`. */
  touches(c: Coord): boolean {
    return this.neighbors(c).length > 0;
  }

  segments(): IterableIterator<Segment> {
    return this.segs.values();
  }

  get segmentCount(): number {
    return this.segs.size;
  }
}

export const isAdjacent = (a: Coord, b: Coord): boolean => {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.max(dx, dy) === 1;
};

export const isDiagonal = (a: Coord, b: Coord): boolean => a.x !== b.x && a.y !== b.y;

/**
 * Tiles on a straight line (orthogonal or 45° diagonal) from `from` to `to`, inclusive.
 * Returns null if the two points are not on such a line.
 */
export function straightPath(from: Coord, to: Coord): Coord[] | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return null;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  return Array.from({ length: steps + 1 }, (_, i) => ({ x: from.x + sx * i, y: from.y + sy * i }));
}
