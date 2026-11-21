import type { Ui } from './state';
import { CAM_MS, MAP_SIZE, TAP_SLOP } from './constants';
import { type Train } from '../sim/trains';
import { trainPoses } from './render';

export function clampZoom(ui: Ui, z: number): number {
  const min = Math.max(3, Math.min(ui.viewW, ui.viewH) / (MAP_SIZE * 1.1));
  return Math.max(min, Math.min(64, z));
}
/**
 * Keep the map on screen. It may scroll past its edges only far enough that edge tiles
 * can be brought out from under the HUD (top) and the toolbar + bottom sheet.
 */
export function clampCam(ui: Ui): void {
  const OVERSCROLL = { top: 150, bottom: 300, side: 24 }; // CSS px
  const clampAxis = (v: number, view: number, before: number, after: number) => {
    const min = (view / 2 - before) / ui.cam.zoom;
    const max = MAP_SIZE - (view / 2 - after) / ui.cam.zoom;
    return min > max ? MAP_SIZE / 2 : Math.max(min, Math.min(max, v));
  };
  ui.cam.x = clampAxis(ui.cam.x, ui.viewW, OVERSCROLL.side, OVERSCROLL.side);
  ui.cam.y = clampAxis(ui.cam.y, ui.viewH, OVERSCROLL.top, OVERSCROLL.bottom);
}
export const screenToWorld = (ui: Ui, sx: number, sy: number) => ({
  x: ui.cam.x + (sx - ui.viewW / 2) / ui.cam.zoom,
  y: ui.cam.y + (sy - ui.viewH / 2) / ui.cam.zoom,
});
export function zoomAt(ui: Ui, sx: number, sy: number, factor: number): void {
  const before = screenToWorld(ui, sx, sy);
  ui.cam.zoom = clampZoom(ui, ui.cam.zoom * factor);
  ui.cam.x = before.x - (sx - ui.viewW / 2) / ui.cam.zoom;
  ui.cam.y = before.y - (sy - ui.viewH / 2) / ui.cam.zoom;
  clampCam(ui);
  ui.requestDraw();
}
export function panToTrain(ui: Ui, t: Train): void {
  const head = trainPoses(t, 0)[0]!;
  const z1 = clampZoom(ui, Math.max(ui.cam.zoom, 18));
  // The side panel covers the right of the screen on wide layouts: centre in what is left.
  const shift = ui.wideLayout.matches ? 156 / z1 : 0;
  const keep = { ...ui.cam };
  ui.cam.zoom = z1;
  ui.cam.x = head.x + shift;
  ui.cam.y = head.y;
  clampCam(ui);
  const to = { ...ui.cam };
  Object.assign(ui.cam, keep);
  if (ui.reducedMotion) {
    Object.assign(ui.cam, to);
    ui.camAnim = null;
  } else {
    ui.camAnim = {
      x0: ui.cam.x,
      y0: ui.cam.y,
      z0: ui.cam.zoom,
      x1: to.x,
      y1: to.y,
      z1,
      t0: performance.now(),
    };
  }
  ui.requestDraw();
}
export function stepCamAnim(ui: Ui, now: number): boolean {
  if (!ui.camAnim) return false;
  const k = Math.min(1, (now - ui.camAnim.t0) / CAM_MS);
  const e = 1 - Math.pow(1 - k, 3);
  ui.cam.zoom = ui.camAnim.z0 + (ui.camAnim.z1 - ui.camAnim.z0) * e;
  ui.cam.x = ui.camAnim.x0 + (ui.camAnim.x1 - ui.camAnim.x0) * e;
  ui.cam.y = ui.camAnim.y0 + (ui.camAnim.y1 - ui.camAnim.y0) * e;
  if (k >= 1) ui.camAnim = null;
  return true;
}

export function initCameraInput(ui: Ui, onTap: (x: number, y: number) => void): void {
  const pointers = new Map<number, { x: number; y: number }>();
  let tap: { id: number; x: number; y: number; ok: boolean } | null = null;
  let panFrom: { x: number; y: number; cx: number; cy: number } | null = null;
  let pinch: { dist: number; zoom: number; wx: number; wy: number } | null = null;
  const pinchPoints = () => {
    const [p, q] = [...pointers.values()] as [{ x: number; y: number }, { x: number; y: number }];
    return { mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2, dist: Math.hypot(p.x - q.x, p.y - q.y) || 1 };
  };
  const rel = (e: MouseEvent) => {
    const r = ui.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const beginPanFromRemaining = () => {
    const p = [...pointers.values()][0];
    panFrom = p ? { x: p.x, y: p.y, cx: ui.cam.x, cy: ui.cam.y } : null;
  };
  ui.canvas.addEventListener('pointerdown', (e) => {
    ui.camAnim = null;
    ui.canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, rel(e));
    if (pointers.size === 1) {
      const p = rel(e);
      tap = { id: e.pointerId, x: p.x, y: p.y, ok: true };
      beginPanFromRemaining();
    } else if (pointers.size === 2) {
      if (tap) tap.ok = false;
      const { mx, my, dist } = pinchPoints();
      const w = screenToWorld(ui, mx, my);
      pinch = { dist, zoom: ui.cam.zoom, wx: w.x, wy: w.y };
      panFrom = null;
    }
  });
  ui.canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    const p = rel(e);
    pointers.set(e.pointerId, p);
    if (pointers.size >= 2 && pinch) {
      const { mx, my, dist } = pinchPoints();
      ui.cam.zoom = clampZoom(ui, (pinch.zoom * dist) / pinch.dist);
      ui.cam.x = pinch.wx - (mx - ui.viewW / 2) / ui.cam.zoom;
      ui.cam.y = pinch.wy - (my - ui.viewH / 2) / ui.cam.zoom;
      clampCam(ui);
      ui.requestDraw();
    } else if (pointers.size === 1 && panFrom) {
      const moved = Math.hypot(p.x - panFrom.x, p.y - panFrom.y);
      if (tap && tap.id === e.pointerId && moved > TAP_SLOP) tap.ok = false;
      // Touch pans only in the Pan tool (or while picking a route); a mouse can always drag.
      const canPan = ui.tool === 'pan' || !!ui.routing || !!ui.sendTo || e.pointerType === 'mouse';
      if (canPan && (tap?.ok === false || moved > TAP_SLOP)) {
        ui.cam.x = panFrom.cx - (p.x - panFrom.x) / ui.cam.zoom;
        ui.cam.y = panFrom.cy - (p.y - panFrom.y) / ui.cam.zoom;
        clampCam(ui);
        ui.requestDraw();
      }
    }
  });
  const release = (e: PointerEvent, cancelled: boolean) => {
    if (!pointers.has(e.pointerId)) return;
    const p = rel(e);
    pointers.delete(e.pointerId);
    if (pointers.size === 0 && tap && tap.id === e.pointerId) {
      if (tap.ok && !cancelled) onTap(p.x, p.y);
      tap = null;
    }
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 1) {
      if (tap) tap.ok = false;
      beginPanFromRemaining();
    }
    if (pointers.size === 0) panFrom = null;
  };
  ui.canvas.addEventListener('pointerup', (e) => release(e, false));
  ui.canvas.addEventListener('pointercancel', (e) => release(e, true));
  ui.canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      ui.camAnim = null;
      const p = rel(e);
      zoomAt(ui, p.x, p.y, Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015)));
    },
    { passive: false },
  );
  ui.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function resize(ui: Ui): void {
  ui.dpr = Math.min(window.devicePixelRatio || 1, 3);
  ui.viewW = ui.canvas.clientWidth;
  ui.viewH = ui.canvas.clientHeight;
  ui.canvas.width = Math.round(ui.viewW * ui.dpr);
  ui.canvas.height = Math.round(ui.viewH * ui.dpr);
  ui.cam.zoom = clampZoom(ui, ui.cam.zoom);
  clampCam(ui);
  ui.requestDraw();
}

export function initResize(ui: Ui): void {
  window.addEventListener('resize', () => resize(ui));
  new ResizeObserver(() => resize(ui)).observe(ui.canvas);
}

export function centreOnFirstTown(ui: Ui): void {
  const t = ui.game.towns[0];
  ui.cam.x = t ? t.x + 0.5 : MAP_SIZE / 2;
  ui.cam.y = t ? t.y + 0.5 : MAP_SIZE / 2;
  ui.cam.zoom = clampZoom(ui, Math.min(ui.viewW, ui.viewH) / 16);
  clampCam(ui);
}
