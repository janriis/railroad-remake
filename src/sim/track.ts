import { coordKey, type Coord } from './types';

/** Undirected graph of track segments between 8-neighbour tiles. */
export class TrackNetwork {
  private readonly segments = new Set<string>();

  static segmentKey(a: Coord, b: Coord): string {
    const [ka, kb] = [coordKey(a), coordKey(b)];
    return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
  }

  has(a: Coord, b: Coord): boolean {
    return this.segments.has(TrackNetwork.segmentKey(a, b));
  }

  add(a: Coord, b: Coord): void {
    this.segments.add(TrackNetwork.segmentKey(a, b));
  }

  get segmentCount(): number {
    return this.segments.size;
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
