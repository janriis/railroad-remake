import { TOWN_RADIUS, type IndustryKind } from '../sim/config';
import type { Station } from '../sim/game';
import type { GameMap } from '../sim/map';
import { stepUnits } from '../sim/pathfinding';
import type { Train } from '../sim/trains';
import type { Segment } from '../sim/track';
import type { Coord, Terrain } from '../sim/types';
import { atlasImage, frame } from './atlas';

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
  const img = atlasImage();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      const t = at(x, y)!;
      const f = img ? frame(`terrain-${t}-${hash(x, y, 7) < 0.5 ? 1 : 2}`) : undefined;
      if (img && f) ctx.drawImage(img, f.x, f.y, f.w, f.h, x * TS, y * TS, TS, TS);
      else drawTile(ctx, t, x, y);
    }
  // Foamy shoreline on the water side of every water/land border.
  ctx.fillStyle = img ? 'rgba(235,248,255,0.38)' : 'rgba(235,248,255,0.5)';
  const E = img ? 2 : 3;
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
    return {
      ax: s.a.x + 0.5,
      ay: s.a.y + 0.5,
      ux: dx / len,
      uy: dy / len,
      len,
      bridge: s.bridge,
      dbl: s.double,
    };
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
  for (const g of geo) {
    if (g.bridge) continue;
    ctx.strokeStyle = 'rgba(74,62,50,0.5)';
    ctx.lineWidth = (g.dbl ? 0.58 : 0.32) + 0.05;
    line(g, 0);
    ctx.strokeStyle = '#b3a998';
    ctx.lineWidth = g.dbl ? 0.58 : 0.32;
    line(g, 0);
  }

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
    const hw = g.dbl ? 0.38 : 0.26;
    ctx.strokeStyle = '#b07d36';
    ctx.lineWidth = hw * 2;
    line(g, 0, -0.02, g.len + 0.02);
    ctx.strokeStyle = 'rgba(70,42,12,0.55)';
    ctx.lineWidth = 0.025;
    for (let t = 0.0625; t < g.len; t += 0.125) cross(g, t, hw);
    ctx.strokeStyle = '#4e3216';
    ctx.lineWidth = 0.06;
    line(g, hw + 0.01);
    line(g, -hw - 0.01);
  }

  // Sleepers.
  ctx.strokeStyle = '#7a5538';
  ctx.lineWidth = 0.055;
  for (const g of geo) {
    if (g.bridge) continue;
    const n = Math.max(1, Math.round(g.len / 0.2));
    const step = g.len / n;
    for (let i = 0; i < n; i++) cross(g, (i + 0.5) * step, g.dbl ? 0.3 : 0.16);
  }

  // Rails.
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.04;
  ctx.strokeStyle = '#f1f4f7';
  for (const g of geo) {
    if (g.dbl) {
      for (const c of [-0.16, 0.16]) {
        line(g, c + 0.07);
        line(g, c - 0.07);
      }
    } else {
      line(g, 0.075);
      line(g, -0.075);
    }
  }
}

const WALLS = ['#e8d9b8', '#d9a98a', '#cfd6dd', '#e6c07a'];
const ROOFS = ['#a8432f', '#7a3b2e', '#4f5f73', '#8a5a2b'];

/** Draws a small cluster of buildings on a town tile (tile units). */
function drawTownProcedural(ctx: CanvasRenderingContext2D, town: Coord): void {
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

const INDUSTRY_COLOURS: Record<IndustryKind, string> = {
  'timber-camp': '#6b4a2b',
  sawmill: '#a7743a',
  'furniture-works': '#8a4f7d',
  'grain-farm': '#d9b43c',
  'flour-mill': '#e8e2d2',
  bakery: '#c9763a',
  'coal-mine': '#3b3b3f',
};

export const INDUSTRY_LABELS: Record<IndustryKind, string> = {
  'timber-camp': 'Timber camp',
  sawmill: 'Sawmill',
  'furniture-works': 'Furniture works',
  'grain-farm': 'Grain farm',
  'flour-mill': 'Flour mill',
  bakery: 'Bakery',
  'coal-mine': 'Coal mine',
};

/** Draws a simple glyph for an industry on its tile (tile units). */
function drawIndustryProcedural(ctx: CanvasRenderingContext2D, kind: IndustryKind, at: Coord): void {
  const { x, y } = at;
  const col = INDUSTRY_COLOURS[kind];
  ctx.fillStyle = 'rgba(40,30,20,0.3)';
  ctx.fillRect(x + 0.06, y + 0.1, 0.9, 0.88);
  ctx.lineWidth = 0.035;
  ctx.strokeStyle = '#2f2820';
  const body = (bx: number, by: number, w: number, h: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.fillRect(x + bx, y + by, w, h);
    ctx.strokeRect(x + bx, y + by, w, h);
  };
  const tri = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x + x1, y + y1);
    ctx.lineTo(x + x2, y + y2);
    ctx.lineTo(x + x3, y + y3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  switch (kind) {
    case 'timber-camp': // log pile and a hut
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i % 2 ? '#8b633a' : col;
        ctx.beginPath();
        ctx.arc(x + 0.25 + i * 0.16, y + 0.72, 0.09, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      body(0.12, 0.2, 0.4, 0.28, '#9a6b3c');
      tri(0.08, 0.2, 0.32, 0.06, 0.56, 0.2, '#4e3216');
      tri(0.66, 0.5, 0.78, 0.15, 0.9, 0.5, '#2f6b3a');
      break;
    case 'sawmill': // shed with saw blade
      body(0.12, 0.3, 0.6, 0.5, col);
      tri(0.08, 0.3, 0.42, 0.1, 0.76, 0.3, '#5a3a1a');
      ctx.fillStyle = '#d8dce0';
      ctx.beginPath();
      ctx.arc(x + 0.82, y + 0.68, 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'furniture-works': // factory with chimney
      body(0.14, 0.34, 0.66, 0.46, col);
      body(0.64, 0.1, 0.12, 0.26, '#5b4a54');
      ctx.fillStyle = '#f4efe3';
      for (let i = 0; i < 3; i++) ctx.fillRect(x + 0.22 + i * 0.2, y + 0.5, 0.1, 0.12);
      break;
    case 'grain-farm': // field rows and barn
      ctx.fillStyle = col;
      ctx.fillRect(x + 0.08, y + 0.5, 0.84, 0.42);
      ctx.strokeStyle = '#8a6a1a';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 0.08, y + 0.58 + i * 0.1);
        ctx.lineTo(x + 0.92, y + 0.58 + i * 0.1);
        ctx.stroke();
      }
      ctx.strokeStyle = '#2f2820';
      body(0.2, 0.2, 0.34, 0.26, '#b5483a');
      tri(0.16, 0.2, 0.37, 0.06, 0.58, 0.2, '#6b2a22');
      break;
    case 'flour-mill': // tower with sails
      body(0.34, 0.3, 0.3, 0.55, col);
      tri(0.3, 0.3, 0.49, 0.12, 0.68, 0.3, '#7a5a3a');
      ctx.beginPath();
      ctx.moveTo(x + 0.49, y + 0.34);
      ctx.lineTo(x + 0.15, y + 0.06);
      ctx.moveTo(x + 0.49, y + 0.34);
      ctx.lineTo(x + 0.83, y + 0.62);
      ctx.moveTo(x + 0.49, y + 0.34);
      ctx.lineTo(x + 0.83, y + 0.06);
      ctx.moveTo(x + 0.49, y + 0.34);
      ctx.lineTo(x + 0.15, y + 0.62);
      ctx.stroke();
      break;
    case 'bakery': // house with chimney and a loaf
      body(0.16, 0.36, 0.6, 0.46, col);
      tri(0.1, 0.36, 0.46, 0.12, 0.82, 0.36, '#7a3b2e');
      body(0.62, 0.1, 0.1, 0.2, '#5b4a54');
      ctx.fillStyle = '#f2d28a';
      ctx.beginPath();
      ctx.ellipse(x + 0.46, y + 0.62, 0.12, 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
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

// ---------- stations ----------

const STATION_ROOF: Record<string, string> = { small: '#d1495b', medium: '#edae49', large: '#00798c' };
const STATION_SCALE: Record<string, number> = { small: 0.4, medium: 0.54, large: 0.7 };

/** Draws a station platform and building on its track tile (tile units). */
function drawStationProcedural(ctx: CanvasRenderingContext2D, st: Station): void {
  const { x, y } = st.at;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x + 0.1, y + 0.13, 0.8, 0.8);
  ctx.fillStyle = '#d6cfc0';
  ctx.strokeStyle = '#5f5849';
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  ctx.rect(x + 0.08, y + 0.08, 0.84, 0.84);
  ctx.fill();
  ctx.stroke();
  const w = STATION_SCALE[st.size]!;
  const h = w * 0.62;
  const bx = x + 0.5 - w / 2;
  const by = y + 0.5 - h / 2;
  ctx.fillStyle = '#f4efe3';
  ctx.fillRect(bx, by, w, h);
  ctx.fillStyle = STATION_ROOF[st.size]!;
  ctx.fillRect(bx - 0.03, by - 0.03, w + 0.06, h * 0.55);
  ctx.strokeStyle = '#3b352b';
  ctx.lineWidth = 0.03;
  ctx.strokeRect(bx - 0.03, by - 0.03, w + 0.06, h + 0.03);
  const pips = st.size === 'small' ? 1 : st.size === 'medium' ? 2 : 3;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < pips; i++) {
    ctx.beginPath();
    ctx.arc(x + 0.5 + (i - (pips - 1) / 2) * 0.14, by + h * 0.8, 0.045, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Draws the catchment square of a station (tile units). */
export function drawCatchment(
  ctx: CanvasRenderingContext2D,
  at: Coord,
  radius: number,
  strong = false,
): void {
  ctx.fillStyle = strong ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)';
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 0.05;
  ctx.setLineDash([0.18, 0.14]);
  ctx.beginPath();
  ctx.rect(at.x - radius, at.y - radius, radius * 2 + 1, radius * 2 + 1);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
}

// ---------- trains ----------

export const TRAIN_COLOURS = ['#d1495b', '#2e86ab', '#f6aa1c', '#6a994e', '#9b5de5', '#ef6f2e'];

export interface Pose {
  x: number;
  y: number;
  /** Direction of travel in radians. */
  a: number;
  kind: 'loco' | 'passenger' | 'freight';
}

const CAR_GAP = 0.44;

/**
 * Where a train's locomotive and cars are. `extra` adds distance units of smooth motion
 * between ticks. Cars trail along the last known tiles, then straight back.
 */
export function trainPoses(t: Train, extra = 0): Pose[] {
  let head = { x: t.at.x + 0.5, y: t.at.y + 0.5 };
  let fx = 1;
  let fy = 0;
  const pts: { x: number; y: number }[] = [];
  const centre = (c: Coord) => ({ x: c.x + 0.5, y: c.y + 0.5 });
  if (t.next) {
    const f = Math.min(1, (t.progress + extra) / stepUnits(t.at, t.next));
    const n = centre(t.next);
    head = { x: head.x + (n.x - head.x) * f, y: head.y + (n.y - head.y) * f };
    fx = n.x - (t.at.x + 0.5);
    fy = n.y - (t.at.y + 0.5);
    pts.push(head, centre(t.at));
  } else {
    if (t.prev) {
      fx = t.at.x - t.prev.x;
      fy = t.at.y - t.prev.y;
    }
    pts.push(head);
  }
  if (t.prev) pts.push(centre(t.prev));
  const fl = Math.hypot(fx, fy) || 1;
  const dir = { x: fx / fl, y: fy / fl };
  const tail = pts[pts.length - 1]!;
  const before = pts.length > 1 ? pts[pts.length - 2]! : null;
  let bx = before ? tail.x - before.x : -dir.x;
  let by = before ? tail.y - before.y : -dir.y;
  const bl = Math.hypot(bx, by);
  if (bl < 1e-6) {
    bx = -dir.x;
    by = -dir.y;
  } else {
    bx /= bl;
    by /= bl;
  }
  pts.push({ x: tail.x + bx * 20, y: tail.y + by * 20 });

  const at = (d: number): { x: number; y: number } => {
    let left = Math.max(0, d);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1]!;
      const q = pts[i]!;
      const len = Math.hypot(q.x - p.x, q.y - p.y);
      if (left <= len || i === pts.length - 1) {
        const k = len ? left / len : 0;
        return { x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k };
      }
      left -= len;
    }
    return head;
  };
  const poseAt = (d: number, kind: Pose['kind']): Pose => {
    const p = at(d);
    const front = at(d - 0.1);
    const back = at(d + 0.1);
    const ax = front.x - back.x;
    const ay = front.y - back.y;
    const a = Math.hypot(ax, ay) < 1e-6 ? Math.atan2(dir.y, dir.x) : Math.atan2(ay, ax);
    return { x: p.x, y: p.y, a, kind };
  };
  const out: Pose[] = [{ ...poseAt(0.1, 'loco'), x: head.x, y: head.y }];
  let d = 0.52;
  for (let i = 0; i < t.passengerCars; i++, d += CAR_GAP) out.push(poseAt(d, 'passenger'));
  for (let i = 0; i < t.freightCars; i++, d += CAR_GAP) out.push(poseAt(d, 'freight'));
  return out;
}

/** Draws one vehicle at its pose (tile units). */
function drawVehicleProcedural(ctx: CanvasRenderingContext2D, p: Pose, colour: string): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.a);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(-0.24, -0.1, 0.5, 0.28);
  ctx.strokeStyle = '#1d1a16';
  ctx.lineWidth = 0.025;
  if (p.kind === 'loco') {
    ctx.fillStyle = colour;
    ctx.fillRect(-0.27, -0.14, 0.54, 0.28);
    ctx.strokeRect(-0.27, -0.14, 0.54, 0.28);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-0.27, -0.14, 0.17, 0.28);
    ctx.fillStyle = '#fff6c2';
    ctx.beginPath();
    ctx.arc(0.27, 0, 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(-0.05, -0.1, 0.24, 0.06);
  } else if (p.kind === 'passenger') {
    ctx.fillStyle = colour;
    ctx.fillRect(-0.2, -0.12, 0.4, 0.24);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(-0.2, -0.12, 0.4, 0.24);
    ctx.fillStyle = colour;
    ctx.fillRect(-0.2, -0.04, 0.4, 0.08);
    ctx.fillStyle = '#bfe3f2';
    for (let i = -1; i <= 1; i++) ctx.fillRect(i * 0.12 - 0.035, -0.1, 0.07, 0.05);
    ctx.strokeRect(-0.2, -0.12, 0.4, 0.24);
  } else {
    ctx.fillStyle = '#8a6a45';
    ctx.fillRect(-0.2, -0.12, 0.4, 0.24);
    ctx.fillStyle = colour;
    ctx.fillRect(-0.2, -0.12, 0.4, 0.05);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(-0.2, 0.0, 0.4, 0.02);
    ctx.strokeRect(-0.2, -0.12, 0.4, 0.24);
  }
  ctx.restore();
}

// ---------- atlas sprites ----------

/** Draws an atlas frame `width` tiles wide, centred on cx with its bottom edge at by (tile units). */
function sprite(ctx: CanvasRenderingContext2D, name: string, cx: number, by: number, width: number): boolean {
  const img = atlasImage();
  const f = img ? frame(name) : undefined;
  if (!img || !f) return false;
  const h = (width * f.h) / f.w;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, f.x, f.y, f.w, f.h, cx - width / 2, by - h, width, h);
  return true;
}

function groundShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  ctx.fillStyle = 'rgba(30,25,15,0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** One house per this many inhabitants (within the limits below). */
const PEOPLE_PER_HOUSE = 160;
const MIN_HOUSES = 3;
const MAX_HOUSES = 18;
/** Two building plots per tile, as offsets of the house's bottom centre within the tile. */
const PLOTS: [number, number][] = [
  [0.3, 0.55],
  [0.7, 0.95],
];

/**
 * Draws a town's houses spread over its footprint (TOWN_RADIUS around the centre), more for
 * bigger towns, densest in the middle. Tiles for which `blocked` is true (track, stations,
 * industries) stay free. Back to front.
 */
export function drawTownBuildings(
  ctx: CanvasRenderingContext2D,
  town: Coord & { population?: number },
  blocked: (c: Coord) => boolean = () => false,
): void {
  if (!atlasImage()) return drawTownProcedural(ctx, town);
  const { x, y } = town;
  const wanted = Math.round((town.population ?? 1000) / PEOPLE_PER_HOUSE);
  const count = Math.max(MIN_HOUSES, Math.min(MAX_HOUSES, wanted));
  const plots: { px: number; py: number; k: number }[] = [];
  for (let dy = -TOWN_RADIUS; dy <= TOWN_RADIUS; dy++)
    for (let dx = -TOWN_RADIUS; dx <= TOWN_RADIUS; dx++) {
      const tx = x + dx;
      const ty = y + dy;
      if (blocked({ x: tx, y: ty })) continue;
      const ring = Math.max(Math.abs(dx), Math.abs(dy));
      PLOTS.forEach(([ox, oy], i) =>
        plots.push({ px: tx + ox, py: ty + oy, k: ring + hash(tx, ty, 300 + i) * 0.9 }),
      );
    }
  plots.sort((a, b) => a.k - b.k);
  const chosen = plots.slice(0, count).sort((a, b) => a.py - b.py || a.px - b.px);
  for (const p of chosen) {
    const fx = Math.floor(p.px);
    const fy = Math.floor(p.py);
    const jx = (hash(fx, fy, 320) - 0.5) * 0.08;
    const w = 0.44 + hash(fx, fy, 340 + Math.round(p.py * 2)) * 0.06;
    const n = 1 + Math.floor(hash(fx, fy, 330 + Math.round(p.px * 2)) * 4);
    groundShadow(ctx, p.px + jx, p.py - 0.02, w * 0.4, 0.05);
    sprite(ctx, `house-${n}`, p.px + jx, p.py, w);
  }
}

/** Draws an industry sprite on its tile (tile units). */
export function drawIndustry(ctx: CanvasRenderingContext2D, kind: IndustryKind, at: Coord): void {
  if (!atlasImage()) return drawIndustryProcedural(ctx, kind, at);
  groundShadow(ctx, at.x + 0.5, at.y + 0.95, 0.46, 0.08);
  if (!sprite(ctx, `industry-${kind}`, at.x + 0.5, at.y + 1.0, 1.08)) drawIndustryProcedural(ctx, kind, at);
}

/** Slots around a station tile: bottom-anchor offsets of the building sprites (tile units). */
const BUILDING_SPOTS: [number, number][] = [
  [-0.05, 0.05],
  [1.05, 0.05],
  [0.5, 1.7],
];
const BUILDING_WIDTH = 0.85;

/** Draws a station's buildings as small sprites around its tile (tile units). */
export function drawStationBuildings(ctx: CanvasRenderingContext2D, st: Station): void {
  st.buildings.forEach((b, i) => {
    const [ox, by] = BUILDING_SPOTS[i] ?? BUILDING_SPOTS[0]!;
    const cx = st.at.x + ox;
    const bottom = st.at.y + by;
    groundShadow(ctx, cx, bottom - 0.03, BUILDING_WIDTH * 0.42, 0.05);
    const name = b.kind === 'coal-yard' ? 'building-coal-yard' : `industry-${b.kind}`;
    if (sprite(ctx, name, cx, bottom, BUILDING_WIDTH)) return;
    // Fallback: the industry glyph scaled down into the slot.
    const k = b.kind === 'coal-yard' ? 'coal-mine' : b.kind;
    ctx.save();
    ctx.translate(cx - BUILDING_WIDTH / 2, bottom - BUILDING_WIDTH);
    ctx.scale(BUILDING_WIDTH, BUILDING_WIDTH);
    drawIndustryProcedural(ctx, k, { x: 0, y: 0 });
    ctx.restore();
  });
}

const STATION_WIDTH: Record<string, number> = { small: 1.0, medium: 1.12, large: 1.26 };

/** Draws a station sprite anchored at the bottom centre of its tile (tile units). */
export function drawStation(ctx: CanvasRenderingContext2D, st: Station): void {
  if (!atlasImage()) return drawStationProcedural(ctx, st);
  const { x, y } = st.at;
  sprite(ctx, `station-${st.size}`, x + 0.5, y + 1.02, STATION_WIDTH[st.size] ?? 1.0);
}

const VEHICLE_LENGTH = { loco: 0.68, passenger: 0.46, freight: 0.46 } as const;

/** Draws one vehicle at its pose (tile units); a coloured stripe along its side shows the train colour. */
export function drawVehicle(ctx: CanvasRenderingContext2D, p: Pose, colour: string): void {
  const img = atlasImage();
  const name = p.kind === 'loco' ? 'loco' : p.kind === 'passenger' ? 'car-passenger' : 'car-freight';
  const f = img ? frame(name) : undefined;
  if (!img || !f) return drawVehicleProcedural(ctx, p, colour);
  const len = VEHICLE_LENGTH[p.kind];
  const h = (len * f.h) / f.w;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.a);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-len / 2 + 0.01, -h / 2 + 0.035, len, h);
  const stripe = p.kind === 'loco' ? 0.075 : 0.05;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.roundRect(-len / 2 + 0.02, h / 2 - stripe * 0.4, len - 0.04, stripe, stripe / 2);
  ctx.fill();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, f.x, f.y, f.w, f.h, -len / 2, -h / 2, len, h);
  ctx.restore();
}
