import type { GameMap } from '../sim/map';
import type { Segment } from '../sim/track';
import type { Coord, Terrain } from '../sim/types';

/** Pixel size of one tile in the cached terrain layer. */
export const TS = 32;

/** Deterministic pseudo-random number in [0, 1) from tile coordinates. */
export function hash(x: number, y: number, salt = 0): number {
  let h =
    Math.imul(x + 374761393, 668265263) ^
    Math.imul(y + 1274126177, 2246822519) ^
    Math.imul(salt + 1, 3266489917);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawTile(ctx: CanvasRenderingContext2D, t: Terrain, x: number, y: number): void {
  const v = hash(x, y);
  ctx.save();
  ctx.translate(x * TS, y * TS);
  switch (t) {
    case 'plains': {
      ctx.fillStyle = `hsl(${92 + v * 10}, ${36 + v * 6}%, ${57 + v * 6}%)`;
      ctx.fillRect(0, 0, TS, TS);
      for (let i = 0; i < 3; i++) {
        circle(ctx, hash(x, y, 10 + i) * TS, hash(x, y, 20 + i) * TS, 1.3, 'rgba(255,255,255,0.14)');
      }
      break;
    }
    case 'forest': {
      ctx.fillStyle = `hsl(${118 + v * 12}, ${28 + v * 6}%, ${35 + v * 4}%)`;
      ctx.fillRect(0, 0, TS, TS);
      for (let i = 0; i < 5; i++) {
        const cx = 5 + hash(x, y, 30 + i) * (TS - 10);
        const cy = 5 + hash(x, y, 40 + i) * (TS - 10);
        const r = 4 + hash(x, y, 50 + i) * 2.5;
        circle(ctx, cx + 1, cy + 1.5, r, 'rgba(0,0,0,0.22)');
        circle(ctx, cx, cy, r, `hsl(${125 + hash(x, y, 60 + i) * 15}, 38%, ${27 + hash(x, y, 70 + i) * 8}%)`);
        circle(ctx, cx - r * 0.3, cy - r * 0.3, r * 0.45, 'rgba(255,255,255,0.12)');
      }
      break;
    }
    case 'hills': {
      ctx.fillStyle = `hsl(${46 + v * 8}, ${34 + v * 6}%, ${60 + v * 5}%)`;
      ctx.fillRect(0, 0, TS, TS);
      for (let i = 0; i < 2; i++) {
        const cx = 9 + i * 14 + (hash(x, y, 80 + i) - 0.5) * 5;
        const cy = 14 + i * 7 + (hash(x, y, 90 + i) - 0.5) * 4;
        const r = 9 + hash(x, y, 100 + i) * 2;
        ctx.fillStyle = 'rgba(90,70,30,0.22)';
        ctx.beginPath();
        ctx.ellipse(cx + 1.5, cy + 2.5, r, r * 0.7, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = `hsl(${50 + v * 8}, 36%, ${68 + i * 2}%)`;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * 0.7, 0, Math.PI, 0);
        ctx.fill();
      }
      break;
    }
    case 'mountain': {
      ctx.fillStyle = `hsl(${212 + v * 10}, 8%, ${48 + v * 6}%)`;
      ctx.fillRect(0, 0, TS, TS);
      const peaks = [
        { cx: 10, base: 26, h: 17, w: 10 },
        { cx: 22, base: 28, h: 22, w: 11 },
      ];
      for (const [i, p] of peaks.entries()) {
        const cx = p.cx + (hash(x, y, 110 + i) - 0.5) * 4;
        const top = p.base - p.h;
        ctx.fillStyle = '#9aa0aa';
        ctx.beginPath();
        ctx.moveTo(cx - p.w, p.base);
        ctx.lineTo(cx, top);
        ctx.lineTo(cx, p.base);
        ctx.fill();
        ctx.fillStyle = '#5d636e';
        ctx.beginPath();
        ctx.moveTo(cx + p.w, p.base);
        ctx.lineTo(cx, top);
        ctx.lineTo(cx, p.base);
        ctx.fill();
        ctx.fillStyle = '#f2f5f8';
        ctx.beginPath();
        ctx.moveTo(cx, top);
        ctx.lineTo(cx - p.w * 0.36, top + p.h * 0.34);
        ctx.lineTo(cx - p.w * 0.1, top + p.h * 0.26);
        ctx.lineTo(cx + p.w * 0.12, top + p.h * 0.36);
        ctx.lineTo(cx + p.w * 0.38, top + p.h * 0.34);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'water': {
      ctx.fillStyle = `hsl(${204 + v * 8}, ${58 + v * 6}%, ${42 + v * 6}%)`;
      ctx.fillRect(0, 0, TS, TS);
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      for (let i = 0; i < 2; i++) {
        const cx = 6 + hash(x, y, 120 + i) * (TS - 16);
        const cy = 7 + i * 14 + hash(x, y, 130 + i) * 5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(cx + 3.5, cy - 3, cx + 7, cy);
        ctx.quadraticCurveTo(cx + 10.5, cy + 3, cx + 14, cy);
        ctx.stroke();
      }
      break;
    }
  }
  ctx.restore();
}

/** Renders the whole terrain once; the main canvas just scales this image. */
export function buildTerrainLayer(map: GameMap): HTMLCanvasElement {
  const layer = document.createElement('canvas');
  layer.width = map.width * TS;
  layer.height = map.height * TS;
  const ctx = layer.getContext('2d')!;
  const at = (x: number, y: number): Terrain | null =>
    x < 0 || y < 0 || x >= map.width || y >= map.height ? null : map.terrainAt({ x, y });
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) drawTile(ctx, at(x, y)!, x, y);
  // Foamy shoreline on the water side of every water/land border.
  ctx.fillStyle = 'rgba(235,248,255,0.5)';
  const E = 3;
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      if (at(x, y) !== 'water') continue;
      const px = x * TS;
      const py = y * TS;
      const land = (dx: number, dy: number) => {
        const n = at(x + dx, y + dy);
        return n !== null && n !== 'water';
      };
      if (land(0, -1)) ctx.fillRect(px, py, TS, E);
      if (land(0, 1)) ctx.fillRect(px, py + TS - E, TS, E);
      if (land(-1, 0)) ctx.fillRect(px, py, E, TS);
      if (land(1, 0)) ctx.fillRect(px + TS - E, py, E, TS);
    }
  return layer;
}

/** Draws all track in tile units (the caller has already applied the camera transform). */
export function drawTrack(ctx: CanvasRenderingContext2D, segs: readonly Segment[]): void {
  const geo = segs.map((s) => {
    const dx = s.b.x - s.a.x;
    const dy = s.b.y - s.a.y;
    const len = Math.hypot(dx, dy);
    return { ax: s.a.x + 0.5, ay: s.a.y + 0.5, ux: dx / len, uy: dy / len, len, bridge: s.bridge };
  });
  type G = (typeof geo)[number];
  const line = (g: G, off: number, from = 0, to = g.len) => {
    const nx = -g.uy * off;
    const ny = g.ux * off;
    ctx.beginPath();
    ctx.moveTo(g.ax + g.ux * from + nx, g.ay + g.uy * from + ny);
    ctx.lineTo(g.ax + g.ux * to + nx, g.ay + g.uy * to + ny);
    ctx.stroke();
  };
  const cross = (g: G, t: number, half: number) => {
    const nx = -g.uy * half;
    const ny = g.ux * half;
    ctx.beginPath();
    ctx.moveTo(g.ax + g.ux * t + nx, g.ay + g.uy * t + ny);
    ctx.lineTo(g.ax + g.ux * t - nx, g.ay + g.uy * t - ny);
    ctx.stroke();
  };

  // Gravel bed.
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(92,76,60,0.85)';
  ctx.lineWidth = 0.32;
  for (const g of geo) if (!g.bridge) line(g, 0);

  // Bridges: piers, wooden deck, planks and side beams.
  ctx.lineCap = 'butt';
  for (const g of geo) {
    if (!g.bridge) continue;
    ctx.strokeStyle = '#3d2a14';
    ctx.lineWidth = 0.1;
    for (const end of [0, g.len]) {
      const nx = -g.uy * 0.27;
      const ny = g.ux * 0.27;
      const ex = g.ax + g.ux * end;
      const ey = g.ay + g.uy * end;
      ctx.beginPath();
      ctx.moveTo(ex + nx, ey + ny);
      ctx.lineTo(ex + nx * 1.5, ey + ny * 1.5);
      ctx.moveTo(ex - nx, ey - ny);
      ctx.lineTo(ex - nx * 1.5, ey - ny * 1.5);
      ctx.stroke();
    }
    ctx.strokeStyle = '#b07d36';
    ctx.lineWidth = 0.52;
    line(g, 0, -0.02, g.len + 0.02);
    ctx.strokeStyle = 'rgba(70,42,12,0.55)';
    ctx.lineWidth = 0.025;
    for (let t = 0.0625; t < g.len; t += 0.125) cross(g, t, 0.26);
    ctx.strokeStyle = '#4e3216';
    ctx.lineWidth = 0.06;
    line(g, 0.27);
    line(g, -0.27);
  }

  // Sleepers.
  ctx.strokeStyle = '#4a3322';
  ctx.lineWidth = 0.055;
  for (const g of geo) {
    if (g.bridge) continue;
    const n = Math.max(1, Math.round(g.len / 0.2));
    const step = g.len / n;
    for (let i = 0; i < n; i++) cross(g, (i + 0.5) * step, 0.16);
  }

  // Rails.
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.04;
  ctx.strokeStyle = '#d8dce0';
  for (const g of geo) {
    line(g, 0.075);
    line(g, -0.075);
  }
}

const WALLS = ['#e8d9b8', '#d9a98a', '#cfd6dd', '#e6c07a'];
const ROOFS = ['#a8432f', '#7a3b2e', '#4f5f73', '#8a5a2b'];

/** Draws a small cluster of buildings on a town tile (tile units). */
export function drawTownBuildings(ctx: CanvasRenderingContext2D, town: Coord): void {
  const { x, y } = town;
  ctx.fillStyle = 'rgba(70,55,40,0.28)';
  ctx.fillRect(x + 0.04, y + 0.06, 0.92, 0.9);
  const cells: [number, number][] = [
    [0.1, 0.1],
    [0.38, 0.1],
    [0.66, 0.1],
    [0.1, 0.52],
    [0.38, 0.52],
    [0.66, 0.52],
  ];
  for (const [i, [cx, cy]] of cells.entries()) {
    if (hash(x, y, 200 + i) < 0.15) continue;
    const w = 0.2 + hash(x, y, 210 + i) * 0.04;
    const h = 0.28 + hash(x, y, 220 + i) * 0.1;
    const k = Math.floor(hash(x, y, 230 + i) * WALLS.length);
    ctx.fillStyle = WALLS[k]!;
    ctx.fillRect(x + cx, y + cy, w, h);
    ctx.fillStyle = ROOFS[k]!;
    ctx.fillRect(x + cx, y + cy, w, h * 0.45);
  }
}

/** Draws a town name in screen space with a halo so it reads on any terrain. */
export function drawLabel(ctx: CanvasRenderingContext2D, text: string, sx: number, sy: number): void {
  ctx.font = '700 13px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.strokeText(text, sx, sy);
  ctx.fillStyle = '#1c2630';
  ctx.fillText(text, sx, sy);
}
