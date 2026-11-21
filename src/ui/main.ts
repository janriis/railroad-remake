import { Game } from '../sim/game';
import { straightPath, type Segment } from '../sim/track';
import { sameCoord, type Coord } from '../sim/types';
import { TS, buildTerrainLayer, drawLabel, drawTownBuildings, drawTrack } from './render';

type Tool = 'pan' | 'track' | 'bridge' | 'demolish';

interface SavedState {
  seed: number;
  cash: number;
  segments: { a: Coord; b: Coord; bridge: boolean }[];
}

interface Preview {
  path: Coord[];
  ok: boolean;
  /** Safe HTML for the bottom sheet. */
  html: string;
  /** Segments that would be torn up (demolish preview only). */
  affected: [Coord, Coord][];
}

const MAP_SIZE = 64;
const SAVE_KEY = 'railroadsim.save.v1';
const TAP_SLOP = 8;

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const money = (n: number): string => '$' + Math.round(Math.abs(n)).toLocaleString('en-US');

function humanError(err: string): string {
  const known: Record<string, string> = {
    'insufficient funds': 'Not enough cash for that.',
    'cannot build on water': 'Track cannot go on water. Use the Bridge tool to cross it.',
    'out of bounds': 'That runs off the edge of the map.',
    'path too short': 'Pick two different tiles.',
    'tiles are not adjacent': 'Those tiles are not next to each other.',
    'a bridge must be a straight line over water':
      'A bridge must be a straight line (across or at 45 degrees) with water in between.',
    'bridge must start and end on land': 'Both ends of a bridge must be on land.',
    'a bridge may only span water': 'A bridge can only cross water: tap land on both sides of the gap.',
    'bridge too long': 'That gap is too wide. A bridge spans at most 3 water tiles.',
    'not a straight line': 'Demolish needs a straight line (across or at 45 degrees).',
    'no track to demolish': 'There is no track on that line.',
  };
  return known[err] ?? err.charAt(0).toUpperCase() + err.slice(1) + '.';
}

/** Octilinear path: diagonal until aligned with the target, then straight. */
function octilinear(a: Coord, b: Coord): Coord[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  const diag = Math.min(Math.abs(dx), Math.abs(dy));
  const path: Coord[] = [a];
  let { x, y } = a;
  for (let i = 0; i < diag; i++) path.push({ x: (x += sx), y: (y += sy) });
  const rest = Math.max(Math.abs(dx), Math.abs(dy)) - diag;
  const stepX = Math.abs(dx) > Math.abs(dy) ? sx : 0;
  const stepY = Math.abs(dx) > Math.abs(dy) ? 0 : sy;
  for (let i = 0; i < rest; i++) path.push({ x: (x += stepX), y: (y += stepY) });
  return path;
}

function readSave(raw: unknown): SavedState | null {
  const s = raw as Partial<SavedState> | null;
  if (!s || typeof s.seed !== 'number' || typeof s.cash !== 'number' || !Array.isArray(s.segments))
    return null;
  return s as SavedState;
}

function start(hotData: unknown): void {
  const canvas = $<HTMLCanvasElement>('map');
  const ctx = canvas.getContext('2d')!;

  let game: Game;
  let terrain: HTMLCanvasElement;
  let segs: Segment[] = [];
  let seed = 0;

  const cam = { x: 0, y: 0, zoom: 24 };
  let viewW = 0;
  let viewH = 0;
  let dpr = 1;

  let tool: Tool = 'pan';
  let startTile: Coord | null = null;
  let preview: Preview | null = null;

  // ---------- persistence ----------
  const snapshot = (): SavedState => ({
    seed,
    cash: game.cash,
    segments: segs.map((s) => ({ a: s.a, b: s.b, bridge: s.bridge })),
  });
  const persist = (): void => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot()));
    } catch {
      /* storage unavailable: play on without saving */
    }
  };
  const loadSaved = (): SavedState | null => {
    const hot = readSave(hotData);
    if (hot) return hot;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? readSave(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  };

  // ---------- game lifecycle ----------
  const refreshSegs = (): void => {
    segs = [...game.track.segments()];
  };
  const centreOnFirstTown = (): void => {
    const t = game.towns[0];
    cam.x = t ? t.x + 0.5 : MAP_SIZE / 2;
    cam.y = t ? t.y + 0.5 : MAP_SIZE / 2;
    cam.zoom = clampZoom(Math.min(viewW, viewH) / 16);
  };
  const newGame = (nextSeed: number, saved: SavedState | null): void => {
    seed = nextSeed;
    game = Game.generate({ width: MAP_SIZE, height: MAP_SIZE, seed });
    if (saved) {
      for (const s of saved.segments) game.track.add(s.a, s.b, s.bridge);
      game.cash = saved.cash;
    }
    terrain = buildTerrainLayer(game.map);
    refreshSegs();
    clearSelection();
    centreOnFirstTown();
    updateHud();
    requestDraw();
  };

  // ---------- HUD / UI ----------
  const sheet = $('sheet');
  const sheetMsg = $('sheet-msg');
  const confirmBtn = $<HTMLButtonElement>('confirm');
  const toast = $('toast');
  let toastTimer = 0;

  function updateHud(): void {
    $('cash').textContent = '$' + Math.round(game.cash).toLocaleString('en-US');
    $('seed').textContent = String(seed);
  }
  function showToast(text: string): void {
    toast.textContent = text;
    toast.classList.remove('hidden');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.add('hidden'), 3500);
  }
  function renderSheet(): void {
    if (tool === 'pan') {
      sheet.classList.add('hidden');
      return;
    }
    sheet.classList.remove('hidden');
    const name = { track: 'Track', bridge: 'Bridge', demolish: 'Demolish' }[tool];
    if (preview) {
      sheetMsg.innerHTML = preview.html;
      confirmBtn.hidden = false;
      confirmBtn.disabled = !preview.ok;
    } else {
      sheetMsg.innerHTML = startTile
        ? `<b>${name}:</b> now tap the end tile`
        : `<b>${name}:</b> tap the start tile`;
      confirmBtn.hidden = true;
    }
    $('cancel').hidden = !startTile;
  }
  function clearSelection(): void {
    startTile = null;
    preview = null;
    renderSheet();
    requestDraw();
  }
  function setTool(t: Tool): void {
    tool = t;
    for (const b of document.querySelectorAll<HTMLButtonElement>('.tool'))
      b.classList.toggle('active', b.dataset.tool === t);
    canvas.style.cursor = t === 'pan' ? 'grab' : 'crosshair';
    clearSelection();
  }

  // ---------- previews and commands ----------
  const err = (path: Coord[], message: string): Preview => ({
    path,
    ok: false,
    html: `<div class="err">${humanError(message)}</div>`,
    affected: [],
  });

  function computePreview(a: Coord, b: Coord): Preview {
    if (sameCoord(a, b)) return err([a], 'path too short');
    if (tool === 'track') {
      const path = octilinear(a, b);
      const q = game.quoteTrack(path);
      if (!q.ok) return err(path, q.error);
      let fresh = 0;
      for (let i = 1; i < path.length; i++) if (!game.track.has(path[i - 1]!, path[i]!)) fresh++;
      if (fresh === 0) return err(path, 'track is already there');
      if (q.cost > game.cash)
        return err(path, `not enough cash: it costs ${money(q.cost)} and you have ${money(game.cash)}`);
      return ok(path, q.cost, `${fresh} new segment${fresh === 1 ? '' : 's'}`);
    }
    const path = straightPath(a, b);
    if (!path)
      return err(
        [a, b],
        tool === 'bridge' ? 'a bridge must be a straight line over water' : 'not a straight line',
      );
    if (tool === 'bridge') {
      const q = game.quoteBridge(a, b);
      if (!q.ok) return err(path, q.error);
      if (q.cost === 0) return err(path, 'track is already there');
      if (q.cost > game.cash)
        return err(path, `not enough cash: it costs ${money(q.cost)} and you have ${money(game.cash)}`);
      return ok(path, q.cost, `Bridge over ${path.length - 2} water tile${path.length === 3 ? '' : 's'}`);
    }
    const affected: [Coord, Coord][] = [];
    let refund = 0;
    for (let i = 1; i < path.length; i++) {
      const [p, q] = [path[i - 1]!, path[i]!];
      if (game.track.has(p, q)) {
        affected.push([p, q]);
        refund += game.demolishRefund(p, q);
      }
    }
    if (!affected.length) return err(path, 'no track to demolish');
    return {
      path,
      ok: true,
      html: `<div class="big">+${money(refund)}</div><div class="sub">Refund for tearing up ${affected.length} segment${affected.length === 1 ? '' : 's'}</div>`,
      affected,
    };
  }
  function ok(path: Coord[], cost: number, sub: string): Preview {
    return {
      path,
      ok: true,
      html: `<div class="big">${money(cost)}</div><div class="sub">${sub}</div>`,
      affected: [],
    };
  }

  function confirm(): void {
    if (!startTile || !preview || !preview.ok) return;
    const a = startTile;
    const b = preview.path[preview.path.length - 1]!;
    let message: string;
    if (tool === 'track') {
      const path = preview.path;
      let fresh = 0;
      for (let i = 1; i < path.length; i++) if (!game.track.has(path[i - 1]!, path[i]!)) fresh++;
      const r = game.buildTrack(path);
      message = r.ok
        ? `Built ${fresh} segment${fresh === 1 ? '' : 's'} for ${money(r.cost)}`
        : humanError(r.error);
    } else if (tool === 'bridge') {
      const r = game.buildBridge(a, b);
      message = r.ok ? `Built a bridge for ${money(r.cost)}` : humanError(r.error);
    } else {
      const r = game.demolishTrack(a, b);
      message = r.ok ? `Refunded ${money(r.cost)}` : humanError(r.error);
    }
    refreshSegs();
    updateHud();
    persist();
    showToast(message);
    clearSelection();
  }

  // ---------- tapping tiles ----------
  function handleTap(sx: number, sy: number): void {
    if (tool === 'pan') return;
    const t = screenToTile(sx, sy);
    if (!game.map.inBounds(t)) return;
    if (startTile && !preview && sameCoord(startTile, t)) {
      clearSelection();
      return;
    }
    if (!startTile || preview) {
      startTile = t;
      preview = null;
    } else {
      preview = computePreview(startTile, t);
    }
    renderSheet();
    requestDraw();
  }

  // ---------- camera ----------
  function clampZoom(z: number): number {
    const min = Math.max(3, Math.min(viewW, viewH) / (MAP_SIZE * 1.1));
    return Math.max(min, Math.min(64, z));
  }
  function clampCam(): void {
    cam.x = Math.max(0, Math.min(MAP_SIZE, cam.x));
    cam.y = Math.max(0, Math.min(MAP_SIZE, cam.y));
  }
  const screenToWorld = (sx: number, sy: number) => ({
    x: cam.x + (sx - viewW / 2) / cam.zoom,
    y: cam.y + (sy - viewH / 2) / cam.zoom,
  });
  const screenToTile = (sx: number, sy: number): Coord => {
    const w = screenToWorld(sx, sy);
    return { x: Math.floor(w.x), y: Math.floor(w.y) };
  };
  function zoomAt(sx: number, sy: number, factor: number): void {
    const before = screenToWorld(sx, sy);
    cam.zoom = clampZoom(cam.zoom * factor);
    cam.x = before.x - (sx - viewW / 2) / cam.zoom;
    cam.y = before.y - (sy - viewH / 2) / cam.zoom;
    clampCam();
    requestDraw();
  }

  // ---------- pointer input ----------
  const pointers = new Map<number, { x: number; y: number }>();
  let tap: { id: number; x: number; y: number; ok: boolean } | null = null;
  let panFrom: { x: number; y: number; cx: number; cy: number } | null = null;
  let pinch: { dist: number; zoom: number; wx: number; wy: number } | null = null;

  const pinchPoints = () => {
    const [p, q] = [...pointers.values()] as [{ x: number; y: number }, { x: number; y: number }];
    return { mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2, dist: Math.hypot(p.x - q.x, p.y - q.y) || 1 };
  };
  const rel = (e: MouseEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const beginPanFromRemaining = () => {
    const p = [...pointers.values()][0];
    panFrom = p ? { x: p.x, y: p.y, cx: cam.x, cy: cam.y } : null;
  };

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, rel(e));
    if (pointers.size === 1) {
      const p = rel(e);
      tap = { id: e.pointerId, x: p.x, y: p.y, ok: true };
      beginPanFromRemaining();
    } else if (pointers.size === 2) {
      if (tap) tap.ok = false;
      const { mx, my, dist } = pinchPoints();
      const w = screenToWorld(mx, my);
      pinch = { dist, zoom: cam.zoom, wx: w.x, wy: w.y };
      panFrom = null;
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    const p = rel(e);
    pointers.set(e.pointerId, p);
    if (pointers.size >= 2 && pinch) {
      const { mx, my, dist } = pinchPoints();
      cam.zoom = clampZoom((pinch.zoom * dist) / pinch.dist);
      cam.x = pinch.wx - (mx - viewW / 2) / cam.zoom;
      cam.y = pinch.wy - (my - viewH / 2) / cam.zoom;
      clampCam();
      requestDraw();
    } else if (pointers.size === 1 && panFrom) {
      const moved = Math.hypot(p.x - panFrom.x, p.y - panFrom.y);
      if (tap && tap.id === e.pointerId && moved > TAP_SLOP) tap.ok = false;
      // Touch pans only in the Pan tool; a mouse can always drag the map.
      const canPan = tool === 'pan' || e.pointerType === 'mouse';
      if (canPan && (tap?.ok === false || moved > TAP_SLOP)) {
        cam.x = panFrom.cx - (p.x - panFrom.x) / cam.zoom;
        cam.y = panFrom.cy - (p.y - panFrom.y) / cam.zoom;
        clampCam();
        requestDraw();
      }
    }
  });
  const release = (e: PointerEvent, cancelled: boolean) => {
    if (!pointers.has(e.pointerId)) return;
    const p = rel(e);
    pointers.delete(e.pointerId);
    if (pointers.size === 0 && tap && tap.id === e.pointerId) {
      if (tap.ok && !cancelled) handleTap(p.x, p.y);
      tap = null;
    }
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 1) {
      if (tap) tap.ok = false;
      beginPanFromRemaining();
    }
    if (pointers.size === 0) panFrom = null;
  };
  canvas.addEventListener('pointerup', (e) => release(e, false));
  canvas.addEventListener('pointercancel', (e) => release(e, true));
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const p = rel(e);
      zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015)));
    },
    { passive: false },
  );
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---------- drawing ----------
  let drawQueued = false;
  function requestDraw(): void {
    if (drawQueued) return;
    drawQueued = true;
    requestAnimationFrame(() => {
      drawQueued = false;
      draw();
    });
  }

  function tileRect(c: Coord, inset = 0): void {
    ctx.rect(c.x + inset, c.y + inset, 1 - 2 * inset, 1 - 2 * inset);
  }

  function draw(): void {
    const z = cam.zoom;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#26323b';
    ctx.fillRect(0, 0, viewW, viewH);

    const ox = viewW / 2 - cam.x * z;
    const oy = viewH / 2 - cam.y * z;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(terrain, 0, 0, MAP_SIZE * TS, MAP_SIZE * TS, ox, oy, MAP_SIZE * z, MAP_SIZE * z);

    // World space (1 unit = 1 tile).
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * ox, dpr * oy);

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

    for (const t of game.towns) drawTownBuildings(ctx, t);
    drawTrack(ctx, segs);
    drawSelection(z);

    // Screen space: labels keep a constant readable size.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const t of game.towns) drawLabel(ctx, t.name, ox + (t.x + 0.5) * z, oy + t.y * z - 2);
  }

  function drawSelection(z: number): void {
    if (!startTile) return;
    const good = preview ? preview.ok : true;
    const fill = good ? 'rgba(40,140,230,0.38)' : 'rgba(220,50,40,0.38)';
    const edge = good ? '#1d74d6' : '#d02a20';
    if (preview) {
      ctx.fillStyle = fill;
      ctx.beginPath();
      for (const c of preview.path) if (game.map.inBounds(c)) tileRect(c);
      ctx.fill();
      if (preview.path.length > 1) {
        ctx.setLineDash([0.25, 0.2]);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3 / z;
        ctx.lineCap = 'round';
        ctx.beginPath();
        preview.path.forEach((c, i) =>
          i ? ctx.lineTo(c.x + 0.5, c.y + 0.5) : ctx.moveTo(c.x + 0.5, c.y + 0.5),
        );
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (preview.affected.length) {
        ctx.strokeStyle = 'rgba(230,40,30,0.9)';
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        for (const [p, q] of preview.affected) {
          ctx.moveTo(p.x + 0.5, p.y + 0.5);
          ctx.lineTo(q.x + 0.5, q.y + 0.5);
        }
        ctx.stroke();
      }
    }
    // Start and end markers.
    const marks = [startTile, preview?.path[preview.path.length - 1]].filter((c): c is Coord => !!c);
    ctx.strokeStyle = edge;
    ctx.lineWidth = 3 / z;
    for (const c of marks) {
      ctx.beginPath();
      tileRect(c, 0.04);
      ctx.stroke();
    }
    ctx.fillStyle = edge;
    ctx.beginPath();
    ctx.arc(startTile.x + 0.5, startTile.y + 0.5, 0.16, 0, Math.PI * 2);
    ctx.fill();
  }

  function resize(): void {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    viewW = canvas.clientWidth;
    viewH = canvas.clientHeight;
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    cam.zoom = clampZoom(cam.zoom);
    requestDraw();
  }
  window.addEventListener('resize', resize);
  new ResizeObserver(resize).observe(canvas);

  // ---------- wiring ----------
  for (const b of document.querySelectorAll<HTMLButtonElement>('.tool'))
    b.addEventListener('click', () => setTool(b.dataset.tool as Tool));
  confirmBtn.addEventListener('click', confirm);
  $('cancel').addEventListener('click', clearSelection);

  const help = $('help');
  const helpBtn = $('help-btn');
  const toggleHelp = (open: boolean): void => {
    help.classList.toggle('hidden', !open);
    helpBtn.setAttribute('aria-expanded', String(open));
  };
  helpBtn.addEventListener('click', () => toggleHelp(help.classList.contains('hidden')));
  $('help-close').addEventListener('click', () => toggleHelp(false));

  const newMapCard = $('newmap');
  $('new-map').addEventListener('click', () => {
    toggleHelp(false);
    newMapCard.classList.remove('hidden');
  });
  $('newmap-cancel').addEventListener('click', () => newMapCard.classList.add('hidden'));
  $('newmap-ok').addEventListener('click', () => {
    newMapCard.classList.add('hidden');
    newGame(1 + Math.floor(Math.random() * 999_999), null);
    persist();
    showToast('New map ready');
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      toggleHelp(false);
      newMapCard.classList.add('hidden');
      clearSelection();
    }
  });

  window.claude?.hot?.snapshot?.(snapshot);

  // ---------- boot ----------
  viewW = canvas.clientWidth;
  viewH = canvas.clientHeight;
  const saved = loadSaved();
  newGame(saved ? saved.seed : 1 + Math.floor(Math.random() * 999_999), saved);
  resize();
  setTool('pan');
  if (!saved) persist();
}

if (window.claude?.hot?.ready) window.claude.hot.ready(start);
else start(window.claude?.hot?.data ?? {});
