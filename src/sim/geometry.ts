import type { TrackNetwork } from './track';
import { type Coord } from './types';

// Track geometry: at a tile a train may run straight on or turn by one 45° step.
// Directions are numbered round the compass ring so a 45° turn is a step of ±1.

const RING: readonly Coord[] = [
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
];

/** Ring index (0–7) of the step a → b, for adjacent tiles. */
export function heading(a: Coord, b: Coord): number {
  const dx = Math.sign(b.x - a.x);
  const dy = Math.sign(b.y - a.y);
  return RING.findIndex((d) => d.x === dx && d.y === dy);
}

export const ringStep = (h: number): Coord => RING[((h % 8) + 8) % 8]!;

/** Can a train travelling in heading `inH` carry on in heading `outH`? (straight or 45°) */
export function smoothTurn(inH: number, outH: number): boolean {
  const d = (((outH - inH) % 8) + 8) % 8;
  return d === 0 || d === 1 || d === 7;
}

/** True if tiles a → b → c form a turn of at most 45° at b. */
export const smoothAt = (a: Coord, b: Coord, c: Coord): boolean => smoothTurn(heading(a, b), heading(b, c));

/** The other diagonal of the 2×2 square that diagonal segment a–b cuts through. */
export function crossingDiagonal(a: Coord, b: Coord): [Coord, Coord] | null {
  if (a.x === b.x || a.y === b.y) return null;
  return [
    { x: a.x, y: b.y },
    { x: b.x, y: a.y },
  ];
}

/** Would diagonal segment a–b cross an existing diagonal between tiles? */
export function crossesTrack(track: TrackNetwork, a: Coord, b: Coord): boolean {
  const other = crossingDiagonal(a, b);
  return other !== null && track.has(other[0], other[1]);
}

/**
 * A segment from `tile` towards `to` is usable if a train arriving along it can carry on
 * smoothly over another segment at the tile, or if it is the only segment there (track end).
 * `others` are the tiles the other segments at `tile` lead to.
 */
export function joinsSmoothly(tile: Coord, to: Coord, others: readonly Coord[]): boolean {
  const rest = others.filter((o) => o.x !== to.x || o.y !== to.y);
  if (rest.length === 0) return true;
  const arriving = heading(to, tile);
  return rest.some((o) => smoothTurn(arriving, heading(tile, o)));
}

/**
 * Check new segments against the track as it would be once they are added: every new
 * segment must join smoothly at both ends and no new diagonal may cross another.
 */
export function checkNewTrack(
  track: TrackNetwork,
  segments: readonly (readonly [Coord, Coord])[],
): string | null {
  const key = (c: Coord) => `${c.x},${c.y}`;
  const added = new Map<string, Coord[]>();
  const link = (a: Coord, b: Coord) => {
    const list = added.get(key(a)) ?? [];
    list.push(b);
    added.set(key(a), list);
  };
  const fresh = segments.filter(([a, b]) => !track.has(a, b));
  for (const [a, b] of fresh) {
    link(a, b);
    link(b, a);
  }
  const around = (c: Coord) => [...track.neighbors(c), ...(added.get(key(c)) ?? [])];
  for (const [a, b] of fresh) {
    if (crossesTrack(track, a, b)) return 'track would cross';
    const other = crossingDiagonal(a, b);
    if (other && fresh.some(([c, d]) => sameSeg(c, d, other[0], other[1]))) return 'track would cross';
    if (!joinsSmoothly(a, b, around(a)) || !joinsSmoothly(b, a, around(b))) return 'turn too sharp';
  }
  return null;
}

const sameSeg = (a: Coord, b: Coord, c: Coord, d: Coord): boolean =>
  (a.x === c.x && a.y === c.y && b.x === d.x && b.y === d.y) ||
  (a.x === d.x && a.y === d.y && b.x === c.x && b.y === c.y);
