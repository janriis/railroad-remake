import type { Ui } from './state';
import { type Coord } from '../sim/types';
import { FLOAT_MS, MAP_SIZE } from './constants';
import {
  INDUSTRY_LABELS,
  TS,
  drawCatchment,
  drawIndustry,
  drawLabel,
  drawStation,
  drawTownBuildings,
  drawTrack,
  drawVehicle,
  trainPoses,
} from './render';
import { type Train } from '../sim/trains';
import { findTrackPath } from '../sim/pathfinding';
import { trainColour } from './format';
import { STATION, STATION_SIZES } from '../sim/config';

export function requestDraw(ui: Ui): void {
  if (ui.drawQueued) return;
  ui.drawQueued = true;
  requestAnimationFrame(() => {
    ui.drawQueued = false;
    draw(ui);
  });
}
export function tileRect(ui: Ui, c: Coord, inset = 0): void {
  const ctx = ui.ctx;
  ctx.rect(c.x + inset, c.y + inset, 1 - 2 * inset, 1 - 2 * inset);
}
export function draw(ui: Ui, now = performance.now()): void {
  const ctx = ui.ctx;
  const z = ui.cam.zoom;
  ctx.setTransform(ui.dpr, 0, 0, ui.dpr, 0, 0);
  ctx.fillStyle = '#26323b';
  ctx.fillRect(0, 0, ui.viewW, ui.viewH);

  const ox = ui.viewW / 2 - ui.cam.x * z;
  const oy = ui.viewH / 2 - ui.cam.y * z;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(ui.terrain, 0, 0, MAP_SIZE * TS, MAP_SIZE * TS, ox, oy, MAP_SIZE * z, MAP_SIZE * z);

  // World space (1 unit = 1 tile).
  ctx.setTransform(ui.dpr * z, 0, 0, ui.dpr * z, ui.dpr * ox, ui.dpr * oy);

  if (z >= 26) {
    ctx.strokeStyle = 'rgba(0,0,0,0.09)';
    ctx.lineWidth = 1 / z;
    ctx.beginPath();
    for (let i = 0; i <= MAP_SIZE; i++) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i, MAP_SIZE);
      ctx.moveTo(0, i);
      ctx.lineTo(MAP_SIZE, i);
    }
    ctx.stroke();
  }

  const g = ui.game;
  const builtOn = (c: { x: number; y: number }) => g.track.touches(c) || g.isStation(c) || !!g.industryAt(c);
  for (const t of g.towns) drawTownBuildings(ctx, t, builtOn);
  for (const i of ui.game.industries) drawIndustry(ctx, i.kind, i.at);
  drawTrack(ctx, ui.segs);
  drawRouteLegs(ui, z);
  drawCatchments(ui);
  drawSelection(ui, z);
  for (const s of ui.game.stations.values()) drawStation(ctx, s);
  drawTrains(ui, now, z);

  // Screen space: labels keep a constant readable size.
  ctx.setTransform(ui.dpr, 0, 0, ui.dpr, 0, 0);
  for (const t of ui.game.towns)
    drawLabel(
      ctx,
      `${t.name} · ${t.population.toLocaleString('en-US')}`,
      ox + (t.x + 0.5) * z,
      oy + t.y * z - 2,
    );
  if (z >= 14)
    for (const i of ui.game.industries)
      drawLabel(ctx, INDUSTRY_LABELS[i.kind], ox + (i.at.x + 0.5) * z, oy + i.at.y * z - 2);
  drawRouteMarkers(ui, ox, oy, z);
  drawFloaters(ui, ox, oy, z, now);
}
export function routeLegs(ui: Ui, t: Train): [Coord, Coord][] {
  const key = `${t.id}|${ui.trackVersion}|${t.route.map((c) => `${c.x},${c.y}`).join(';')}`;
  if (ui.legCache?.key === key) return ui.legCache.segs;
  const out: [Coord, Coord][] = [];
  const seen = new Set<string>();
  const n = t.route.length;
  if (n >= 2) {
    for (let i = 0; i < n; i++) {
      const path = findTrackPath(ui.game.track, t.route[i]!, t.route[(i + 1) % n]!);
      if (!path) continue;
      for (let j = 1; j < path.length; j++) {
        const a = path[j - 1]!;
        const b = path[j]!;
        const k1 = `${a.x},${a.y}-${b.x},${b.y}`;
        const k2 = `${b.x},${b.y}-${a.x},${a.y}`;
        if (seen.has(k1) || seen.has(k2)) continue;
        seen.add(k1);
        out.push([a, b]);
      }
    }
  }
  ui.legCache = { key, segs: out };
  return out;
}
export function drawRouteLegs(ui: Ui, z: number): void {
  const ctx = ui.ctx;
  const t = ui.routing ? undefined : ui.selectedTrain();
  if (!t || t.route.length < 2) return;
  const legs = routeLegs(ui, t);
  if (!legs.length) return;
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = trainColour(ui, t);
  ctx.lineWidth = Math.max(0.42, 7 / z);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (const [a, b] of legs) {
    ctx.moveTo(a.x + 0.5, a.y + 0.5);
    ctx.lineTo(b.x + 0.5, b.y + 0.5);
  }
  ctx.stroke();
  ctx.restore();
}
export function drawFloaters(ui: Ui, ox: number, oy: number, z: number, now: number): void {
  const ctx = ui.ctx;
  for (let i = ui.floaters.length - 1; i >= 0; i--)
    if (now - ui.floaters[i]!.t0 > FLOAT_MS) ui.floaters.splice(i, 1);
  if (!ui.floaters.length) return;
  ctx.font = '800 15px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (const f of ui.floaters) {
    const k = (now - f.t0) / FLOAT_MS;
    const sx = ox + f.x * z;
    const sy = oy + f.y * z - (ui.reducedMotion ? 12 : 8 + k * 30);
    ctx.globalAlpha = 1 - k * k;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(10,50,20,0.85)';
    ctx.strokeText(f.text, sx, sy);
    ctx.fillStyle = '#9af0b2';
    ctx.fillText(f.text, sx, sy);
  }
  ctx.globalAlpha = 1;
}
export function drawCatchments(ui: Ui): void {
  const ctx = ui.ctx;
  if (ui.stationTile && ui.tool === 'station') {
    for (const size of [...STATION_SIZES].reverse())
      drawCatchment(ctx, ui.stationTile, STATION[size].radius, size === 'small');
  }
  if (ui.selStation) drawCatchment(ctx, ui.selStation.at, ui.selStation.radius, true);
  if (ui.selIndustry) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.07;
    ctx.beginPath();
    tileRect(ui, ui.selIndustry.at, 0.02);
    ctx.stroke();
  }
  const sender = ui.sendTo ? ui.game.train(ui.sendTo.trainId) : undefined;
  if (sender) for (const s of ui.game.stations.values()) drawCatchment(ctx, s.at, 0, false);
}
export function drawTrains(ui: Ui, now: number, z: number): void {
  const ctx = ui.ctx;
  const frac = ui.paused ? 0 : ui.renderFrac;
  for (const t of ui.game.trains) {
    const extra = t.status === 'moving' && t.next ? t.speed * frac : 0;
    const poses = trainPoses(t, extra);
    const colour = trainColour(ui, t);
    for (let i = poses.length - 1; i >= 0; i--) drawVehicle(ctx, poses[i]!, colour);
    const head = poses[0]!;
    if (t.id === ui.selTrainId) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5 / z;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (t.deadlocked) {
      const pulse = ui.reducedMotion ? 0.5 : 0.5 + 0.12 * Math.sin(now / 160);
      ctx.fillStyle = 'rgba(230,30,20,0.28)';
      ctx.strokeStyle = '#e61e14';
      ctx.lineWidth = 3.5 / z;
      ctx.beginPath();
      ctx.arc(head.x, head.y, pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}
export function drawRouteMarkers(ui: Ui, ox: number, oy: number, z: number): void {
  const ctx = ui.ctx;
  const train = ui.routing ? ui.game.train(ui.routing.trainId) : ui.selectedTrain();
  const stops = ui.routing ? ui.routing.stops : (train?.route ?? []);
  if (!stops.length) return;
  const byTile = new Map<string, { c: Coord; nums: number[] }>();
  stops.forEach((c, i) => {
    const k = `${c.x},${c.y}`;
    const e = byTile.get(k) ?? { c, nums: [] };
    e.nums.push(i + 1);
    byTile.set(k, e);
  });
  ctx.font = '700 13px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const { c, nums } of byTile.values()) {
    const sx = ox + (c.x + 0.85) * z;
    const sy = oy + (c.y + 0.1) * z;
    const label = nums.join(',');
    const w = Math.max(24, 10 + label.length * 8);
    const hot = ui.dragStop !== null && nums.includes(ui.dragStop + 1);
    ctx.fillStyle = hot ? '#e08a00' : !ui.routing && train ? trainColour(ui, train) : '#1f6f8b';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = hot ? 3 : 2;
    ctx.beginPath();
    if (hot) ctx.roundRect(sx - w / 2 - 3, sy - 15, w + 6, 30, 15);
    else ctx.roundRect(sx - w / 2, sy - 12, w, 24, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.strokeText(label, sx, sy + 0.5);
    ctx.fillText(label, sx, sy + 0.5);
  }
}
export function drawSelection(ui: Ui, z: number): void {
  const ctx = ui.ctx;
  if (ui.stationTile && ui.tool === 'station') {
    ctx.strokeStyle = '#1d74d6';
    ctx.lineWidth = 3 / z;
    ctx.beginPath();
    tileRect(ui, ui.stationTile, 0.04);
    ctx.stroke();
  }
  if (!ui.startTile) return;
  const good = ui.preview ? ui.preview.ok : true;
  const fill = good ? 'rgba(40,140,230,0.38)' : 'rgba(220,50,40,0.38)';
  const edge = good ? '#1d74d6' : '#d02a20';
  if (ui.preview) {
    const bs = ui.preview.bridgeSegs;
    const wet = (c: Coord): boolean => !!bs && ui.game.map.terrainAt(c) === 'water';
    ctx.fillStyle = fill;
    ctx.beginPath();
    for (const c of ui.preview.path) if (ui.game.map.inBounds(c) && !wet(c)) tileRect(ui, c);
    ctx.fill();
    if (bs) {
      ctx.fillStyle = 'rgba(255,159,28,0.55)';
      ctx.beginPath();
      for (const c of ui.preview.path) if (ui.game.map.inBounds(c) && wet(c)) tileRect(ui, c);
      ctx.fill();
    }
    if (ui.preview.path.length > 1) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < ui.preview.path.length; i++) {
        const a = ui.preview.path[i - 1]!;
        const b = ui.preview.path[i]!;
        const bridge = !!bs?.[i - 1];
        if (bridge) {
          ctx.setLineDash([]);
          ctx.strokeStyle = '#7a3e00';
          ctx.lineWidth = 6 / z;
          ctx.beginPath();
          ctx.moveTo(a.x + 0.5, a.y + 0.5);
          ctx.lineTo(b.x + 0.5, b.y + 0.5);
          ctx.stroke();
          ctx.strokeStyle = '#ffb347';
          ctx.lineWidth = 3.5 / z;
        } else {
          ctx.setLineDash([0.25, 0.2]);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3 / z;
        }
        ctx.beginPath();
        ctx.moveTo(a.x + 0.5, a.y + 0.5);
        ctx.lineTo(b.x + 0.5, b.y + 0.5);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    if (ui.preview.affected.length) {
      ctx.strokeStyle = 'rgba(230,40,30,0.9)';
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      for (const [p, q] of ui.preview.affected) {
        ctx.moveTo(p.x + 0.5, p.y + 0.5);
        ctx.lineTo(q.x + 0.5, q.y + 0.5);
      }
      ctx.stroke();
    }
  }
  // Start and end markers.
  const marks = [ui.startTile, ui.preview?.path[ui.preview.path.length - 1]].filter((c): c is Coord => !!c);
  ctx.strokeStyle = edge;
  ctx.lineWidth = 3 / z;
  for (const c of marks) {
    ctx.beginPath();
    tileRect(ui, c, 0.04);
    ctx.stroke();
  }
  ctx.fillStyle = edge;
  ctx.beginPath();
  ctx.arc(ui.startTile.x + 0.5, ui.startTile.y + 0.5, 0.16, 0, Math.PI * 2);
  ctx.fill();
}
