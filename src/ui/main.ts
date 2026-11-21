import { TICKS_PER_DAY } from '../sim/config';
import { Game, type SaveData } from '../sim/game';
import { centreOnFirstTown, clampCam, clampZoom, initCameraInput, initResize, resize } from './camera';
import { MAP_SIZE, SAVE_KEY } from './constants';
import { $ } from './dom';
import { requestDraw } from './draw';
import { startLoop, setPaused, setSpeed } from './loop';
import { loadAtlas } from './atlas';
import { buildTerrainLayer } from './render';
import { createRoster } from './roster';
import { initSheet, renderSheet } from './sheets';
import { toggleLedger } from './sheets/ledger';
import { initRouteDrag } from './sheets/route';
import { Ui, type Tool } from './state';
import { handleTap } from './tools/tap';

function readSave(raw: unknown): SaveData | null {
  const s = raw as Partial<SaveData> | null;
  if (
    !s ||
    s.version !== 1 ||
    typeof s.gen !== 'object' ||
    !s.gen ||
    typeof s.cash !== 'number' ||
    !Array.isArray(s.segments) ||
    !Array.isArray(s.stations) ||
    !Array.isArray(s.trains)
  )
    return null;
  return s as SaveData;
}

function loadSaved(hotData: unknown): SaveData | null {
  const hot = readSave(hotData);
  if (hot) return hot;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? readSave(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** Replaces the running game with a loaded save (or a fresh random map) and resets the per-game UI state. */
function newGame(ui: Ui, saved: SaveData | null): void {
  let g: Game | null = null;
  if (saved) {
    try {
      g = Game.fromSave(saved);
    } catch {
      g = null;
    }
  }
  ui.game =
    g ?? Game.generate({ width: MAP_SIZE, height: MAP_SIZE, seed: 1 + Math.floor(Math.random() * 999_999) });
  ui.terrain = buildTerrainLayer(ui.game.map);
  ui.refreshSegs();
  ui.alarmed.clear();
  ui.floaters.length = 0;
  ui.stopCount.clear();
  ui.lastIncome = -1;
  ui.noticesSeen = null;
  ui.acc = 0;
  ui.lastDay = Math.floor(ui.game.time / TICKS_PER_DAY);
  ui.clearSelection();
  centreOnFirstTown(ui);
  ui.updateHud();
  ui.requestDraw();
}

function start(hotData: unknown): void {
  const ui = new Ui();
  // Hooks: modules reach these through the context so they never import each other in a cycle.
  ui.renderSheet = () => renderSheet(ui);
  ui.requestDraw = () => requestDraw(ui);
  ui.renderRoster = createRoster(ui);
  initSheet(ui);
  initRouteDrag(ui);
  initCameraInput(ui, (x, y) => handleTap(ui, x, y));
  initResize(ui);

  // ---------- wiring ----------
  for (const b of document.querySelectorAll<HTMLButtonElement>('.tool'))
    b.addEventListener('click', () => ui.setTool(b.dataset.tool as Tool));

  // Tapping the cash box opens the ledger.
  ui.cashBox.setAttribute('role', 'button');
  ui.cashBox.setAttribute('tabindex', '0');
  ui.cashBox.setAttribute('aria-label', 'Cash. Open the ledger');
  ui.cashBox.addEventListener('click', () => toggleLedger(ui));
  ui.cashBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleLedger(ui);
    }
  });
  $('play').addEventListener('click', () => setPaused(ui, !ui.paused));
  for (const b of document.querySelectorAll<HTMLButtonElement>('.speed'))
    b.addEventListener('click', () => {
      setSpeed(ui, Number(b.dataset.speed));
      if (ui.paused) setPaused(ui, false);
    });

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
    newGame(ui, null);
    ui.persist();
    ui.showToast('New map ready');
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      toggleHelp(false);
      newMapCard.classList.add('hidden');
      ui.clearSelection();
    }
  });

  window.claude?.hot?.snapshot?.(() => ui.game.toSave());

  // ---------- boot ----------
  ui.viewW = ui.canvas.clientWidth;
  ui.viewH = ui.canvas.clientHeight;
  const saved = loadSaved(hotData);
  newGame(ui, saved);
  resize(ui);
  ui.setTool('pan');
  if (!saved) ui.persist();
  Object.defineProperty(window, 'railroadsim', {
    configurable: true,
    value: Object.freeze({
      get game() {
        return ui.game;
      },
      get tool() {
        return ui.tool;
      },
      get paused() {
        return ui.paused;
      },
      get speed() {
        return ui.speed;
      },
      /** Re-reads the game state into the UI (for tests that change `game` directly). */
      refresh() {
        ui.refreshSegs();
        ui.updateHud();
        ui.renderRoster();
        ui.requestDraw();
      },
      setView(x: number, y: number, zoom: number) {
        ui.cam.x = x;
        ui.cam.y = y;
        ui.cam.zoom = clampZoom(ui, zoom);
        clampCam(ui);
        ui.requestDraw();
      },
      tileToClient(x: number, y: number) {
        const r = ui.canvas.getBoundingClientRect();
        return {
          x: r.left + ui.viewW / 2 + (x + 0.5 - ui.cam.x) * ui.cam.zoom,
          y: r.top + ui.viewH / 2 + (y + 0.5 - ui.cam.y) * ui.cam.zoom,
        };
      },
    }),
  });
  startLoop(ui);
  // Sprites and terrain art load after the first (procedural) frame.
  void loadAtlas().then((ok) => {
    if (!ok) return;
    ui.terrain = buildTerrainLayer(ui.game.map);
    ui.requestDraw();
  });
}

if (window.claude?.hot?.ready) window.claude.hot.ready(start);
else start(window.claude?.hot?.data ?? {});
