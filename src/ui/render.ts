import type { Station } from '../sim/game';
import type { GameMap } from '../sim/map';
import { stepUnits } from '../sim/pathfinding';
import type { Train } from '../sim/trains';
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

// ---------- stations ----------

const STATION_ROOF: Record<string, string> = { small: '#d1495b', medium: '#edae49', large: '#00798c' };
const STATION_SCALE: Record<string, number> = { small: 0.4, medium: 0.54, large: 0.7 };

/** Draws a station platform and building on its track tile (tile units). */
export function drawStation(ctx: CanvasRenderingContext2D, st: Station): void {
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
export function drawVehicle(ctx: CanvasRenderingContext2D, p: Pose, colour: string): void {
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
