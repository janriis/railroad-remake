export interface Coord {
  readonly x: number;
  readonly y: number;
}

export const TERRAINS = ['plains', 'forest', 'hills', 'mountain', 'water'] as const;
export type Terrain = (typeof TERRAINS)[number];

export type CommandResult =
  { readonly ok: true; readonly cost: number } | { readonly ok: false; readonly error: string };

export const ok = (cost: number): CommandResult => ({ ok: true, cost });
export const fail = (error: string): { readonly ok: false; readonly error: string } => ({ ok: false, error });

export const coordKey = (c: Coord): string => `${c.x},${c.y}`;
export const sameCoord = (a: Coord, b: Coord): boolean => a.x === b.x && a.y === b.y;
