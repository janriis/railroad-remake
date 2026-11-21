import { MAX_CARS, STATION, STATION_SIZES, TICKS_PER_DAY, type StationSize } from '../sim/config';
import { Game, type SaveData, type Station } from '../sim/game';
import type { TrackPlan } from '../sim/planner';
import type { Train } from '../sim/trains';
import { straightPath, type Segment } from '../sim/track';
import { findTrackPath } from '../sim/pathfinding';
import { sameCoord, type Coord } from '../sim/types';
import {
  TRAIN_COLOURS,
  TS,
  buildTerrainLayer,
  drawCatchment,
  drawLabel,
  drawStation,
  drawTownBuildings,
  drawTrack,
  drawVehicle,
  trainPoses,
} from './render';

type Tool = 'pan' | 'track' | 'bridge' | 'demolish' | 'station' | 'train';

interface Preview {
  path: Coord[];
  ok: boolean;
  /** Safe HTML for the bottom sheet (bridge and demolish tools). */
  html: string;
  /** Segments that would be torn up (demolish preview only). */
  affected: [Coord, Coord][];
  /** Track planner preview: which segments are bridges. */
  bridgeSegs?: boolean[];
}

interface TrackState {
  main: TrackPlan | null;
  /** Land-only alternative to a route that needs a bridge. */
  alt: TrackPlan | null;
  view: 'main' | 'alt';
  error: string | null;
}

interface BuyState {
  at: Coord;
  passengerCars: number;
  freightCars: number;
}

interface RouteState {
  trainId: number;
  stops: Coord[];
  error: string | null;
}

const MAP_SIZE = 64;
const SAVE_KEY = 'railroadsim.save.v2';
const TAP_SLOP = 8;
const TICK_MS = 2000 / TICKS_PER_DAY;
const ROSTER_KEY = 'railroadsim.roster.collapsed';
const ROSTER_MS = 250;
const CAM_MS = 450;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const money = (n: number): string => '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

function humanError(err: string): string {
  const known: Record<string, string> = {
    'insufficient funds': 'Not enough cash for that.',
    'cannot build on water': 'That is water. Tap a land tile (use a bridge to cross water).',
    'out of bounds': 'That runs off the edge of the map.',
    'path too short': 'Pick two different tiles.',
    'start and end are the same tile': 'Pick two different tiles.',
    'tiles are not adjacent': 'Those tiles are not next to each other.',
    'a bridge must be a straight line over water':
      'A bridge must be a straight line (across or at 45 degrees) with water in between.',
    'bridge must start and end on land': 'Both ends of a bridge must be on land.',
    'a bridge may only span water': 'A bridge can only cross water: tap land on both sides of the gap.',
    'bridge too long': 'That gap is too wide. A bridge spans at most 3 water tiles.',
    'not a straight line': 'Demolish needs a straight line (across or at 45 degrees).',
    'no track to demolish': 'There is no track on that line.',
    'station on track': 'There is a station on that track. Tear up the track around it instead.',
    'train on track': 'A train is on that track right now.',
    'no buildable route': 'The water is too wide to bridge here, so there is no way to get there.',
    'no route over land': 'No way to get there over land.',
    'route needs a bridge': 'That route needs a bridge. Confirm the bridge to build it.',
    'tile already has a station': 'There is already a station here.',
    'station must be on track': 'A station has to sit on track. Tap a tile with track.',
    'train must start at a station': 'Trains start at a station. Tap a station.',
    'too many cars': `A train can pull at most ${MAX_CARS} cars.`,
    'cars need a locomotive': 'Cars need a locomotive.',
    'route needs at least two stops': 'Pick at least two stations.',
    'consecutive stops must differ': 'Two stops in a row cannot be the same station.',
    'stop is not a station': 'Every stop must be a station.',
  };
  if (err.startsWith('no track connects'))
    return 'No track connects these stations. Build track between them first.';
  return known[err] ?? err.charAt(0).toUpperCase() + err.slice(1) + '.';
}

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

function start(hotData: unknown): void {
  const canvas = $<HTMLCanvasElement>('map');
  const ctx = canvas.getContext('2d')!;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let game: Game;
  let terrain: HTMLCanvasElement;
  let segs: Segment[] = [];
  let trackVersion = 0;

  const cam = { x: 0, y: 0, zoom: 24 };
  let viewW = 0;
  let viewH = 0;
  let dpr = 1;

  let tool: Tool = 'pan';
  let startTile: Coord | null = null;
  let preview: Preview | null = null;
  let tp: TrackState | null = null;
  let stationTile: Coord | null = null;
  let buy: BuyState | null = null;
  let routing: RouteState | null = null;
  let selTrainId: number | null = null;
  let selStation: Station | null = null;
  let actions: Record<string, () => void> = {};

  let paused = false;
  let speed = 1;
  let acc = 0;
  let renderFrac = 0;
  let lastDay = 0;
  const alarmed = new Set<number>();

  // ---------- persistence ----------
  const persist = (): void => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(game.toSave()));
    } catch {
      /* storage unavailable: play on without saving */
    }
  };
  const loadSaved = (): SaveData | null => {
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
    trackVersion++;
  };
  const centreOnFirstTown = (): void => {
    const t = game.towns[0];
    cam.x = t ? t.x + 0.5 : MAP_SIZE / 2;
    cam.y = t ? t.y + 0.5 : MAP_SIZE / 2;
    cam.zoom = clampZoom(Math.min(viewW, viewH) / 16);
    clampCam();
  };
  const newGame = (saved: SaveData | null): void => {
    let g: Game | null = null;
    if (saved) {
      try {
        g = Game.fromSave(saved);
      } catch {
        g = null;
      }
    }
    game =
      g ??
      Game.generate({ width: MAP_SIZE, height: MAP_SIZE, seed: 1 + Math.floor(Math.random() * 999_999) });
    terrain = buildTerrainLayer(game.map);
    refreshSegs();
    alarmed.clear();
    acc = 0;
    lastDay = Math.floor(game.time / TICKS_PER_DAY);
    clearSelection();
    centreOnFirstTown();
    updateHud();
    requestDraw();
  };

  // ---------- names ----------
  const townOf = (c: Coord) => {
    let best = game.towns[0];
    let bd = Infinity;
    for (const t of game.towns) {
      const d = Math.max(Math.abs(t.x - c.x), Math.abs(t.y - c.y));
      if (d < bd) {
        bd = d;
        best = t;
      }
    }
    return best;
  };
  const stationName = (s: Station): string => {
    const town = townOf(s.at);
    if (!town) return `Station ${s.id}`;
    const same = [...game.stations.values()].filter((o) => townOf(o.at) === town).sort((a, b) => a.id - b.id);
    const idx = same.findIndex((o) => o.id === s.id);
    return idx > 0 ? `${town.name} ${idx + 1}` : town.name;
  };
  const stationNameAt = (c: Coord): string => {
    const s = game.stationAt(c);
    return s ? stationName(s) : 'Unknown';
  };
  const trainName = (t: Train): string => `Train ${game.trains.indexOf(t) + 1}`;
  const trainColour = (t: Train): string => TRAIN_COLOURS[game.trains.indexOf(t) % TRAIN_COLOURS.length]!;

  // ---------- HUD / UI ----------
  const sheet = $('sheet');
  const sheetMsg = $('sheet-msg');
  const toast = $('toast');
  let toastTimer = 0;
  let lastCash = '';
  let lastDate = '';

  function dateText(): string {
    const day = Math.floor(game.time / TICKS_PER_DAY);
    const year = 1850 + Math.floor(day / 360);
    const month = Math.floor((day % 360) / 30);
    return `${(day % 30) + 1} ${MONTHS[month]} ${year}`;
  }
  function updateHud(): void {
    const cash = '$' + Math.round(game.cash).toLocaleString('en-US');
    if (cash !== lastCash) {
      lastCash = cash;
      $('cash').textContent = cash;
    }
    const d = dateText();
    if (d !== lastDate) {
      lastDate = d;
      $('date').textContent = d;
    }
    $('seed').textContent = String(game.gen?.seed ?? 0);
  }
  function showToast(text: string, ms = 3500): void {
    toast.textContent = text;
    toast.classList.remove('hidden');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.add('hidden'), ms);
  }

  const btn = (act: string, label: string, kind = '', disabled = false): string =>
    `<button type="button" class="btn ${kind}" data-act="${act}"${disabled ? ' disabled' : ''}>${label}</button>`;

  function setSheet(html: string, acts: Record<string, () => void>): void {
    sheet.classList.remove('hidden');
    sheetMsg.innerHTML = html;
    actions = acts;
  }
  sheet.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el || (el as HTMLButtonElement).disabled) return;
    actions[el.dataset.act!]?.();
  });

  const selectedTrain = (): Train | undefined =>
    selTrainId === null ? undefined : game.trains.find((t) => t.id === selTrainId);

  function statusText(t: Train): string {
    if (t.route.length < 2) return 'No route yet';
    if (t.deadlocked) return 'Stuck head-on';
    if (t.status === 'waiting')
      return t.blockedBy === null ? 'Waiting: no way through to the next stop' : 'Waiting for the line ahead';
    if (t.status === 'at-stop') return 'At station';
    if (t.status === 'moving') return 'Running';
    return t.next ? 'Running' : 'At station';
  }

  function routeList(stops: Coord[]): string {
    return stops.map((c, i) => `${i + 1}. ${stationNameAt(c)}`).join(' → ');
  }

  // ---------- train roster ----------
  const rosterEl = $('roster');
  const rosterTitle = $('roster-title');
  const rosterToggle = $<HTMLButtonElement>('roster-toggle');
  const rosterEmpty = $('roster-empty');
  const rosterRows = $('roster-rows');
  const LOCO_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12a2 2 0 012 2v10a3 3 0 01-3 3l2 3h-2.5l-2-3h-5l-2 3H5l2-3a3 3 0 01-3-3V5a2 2 0 012-2zm0 3v5h12V6zm2 8a1.3 1.3 0 100 2.6A1.3 1.3 0 008 14zm8 0a1.3 1.3 0 100 2.6 1.3 1.3 0 000-2.6z" /></svg>';

  interface RosterRow {
    el: HTMLButtonElement;
    swatch: HTMLElement;
    name: HTMLElement;
    consistText: HTMLElement;
    consistSr: HTMLElement;
    chip: HTMLElement;
    route: HTMLElement;
    routeKey: string;
  }
  const rosterRowMap = new Map<number, RosterRow>();
  let lastRosterAt = 0;

  const setText = (el: HTMLElement, text: string): void => {
    if (el.textContent !== text) el.textContent = text;
  };

  function chipFor(t: Train): { text: string; cls: string } {
    if (t.route.length < 2) return { text: 'No route', cls: 'none' };
    if (t.deadlocked) return { text: 'Stuck', cls: 'stuck' };
    if (t.status === 'waiting') return { text: 'Waiting', cls: 'waiting' };
    if (t.status === 'at-stop') return { text: 'At station', cls: 'station' };
    if (t.status === 'moving') return { text: 'Running', cls: 'running' };
    return t.next ? { text: 'Running', cls: 'running' } : { text: 'At station', cls: 'station' };
  }

  function makeRosterRow(id: number): RosterRow {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'train-row';
    el.dataset.train = String(id);
    el.innerHTML =
      '<span class="swatch" aria-hidden="true"></span><span class="body">' +
      '<span class="line1"><span class="tname"></span>' +
      `<span class="consist">${LOCO_SVG}<span class="ctext" aria-hidden="true"></span><span class="sr csr"></span></span>` +
      '<span class="status"></span></span><span class="route"></span></span>';
    const q = (sel: string) => el.querySelector<HTMLElement>(sel)!;
    return {
      el,
      swatch: q('.swatch'),
      name: q('.tname'),
      consistText: q('.ctext'),
      consistSr: q('.csr'),
      chip: q('.status'),
      route: q('.route'),
      routeKey: '\u0000',
    };
  }

  function updateRosterRoute(row: RosterRow, t: Train): void {
    const names = t.route.map(stationNameAt);
    const key = `${names.join('|')}#${t.target}`;
    if (key === row.routeKey) return;
    row.routeKey = key;
    row.route.replaceChildren();
    if (names.length < 2) {
      row.route.textContent = 'No route yet. Tap to choose stops.';
      row.route.removeAttribute('title');
      return;
    }
    row.route.title = names.join(' → ') + ', then repeats';
    names.forEach((n, i) => {
      if (i > 0) row.route.append(' → ');
      const span = document.createElement('span');
      span.className = i === t.target ? 'stop next' : 'stop';
      span.textContent = i === t.target ? `▸ ${n}` : n;
      row.route.append(span);
    });
    const loop = document.createElement('span');
    loop.setAttribute('aria-hidden', 'true');
    loop.textContent = ' ↺';
    row.route.append(loop);
  }

  function renderRoster(): void {
    if (!game) return;
    lastRosterAt = performance.now();
    const trains = game.trains;
    setText(rosterTitle, `Trains (${trains.length})`);
    rosterEmpty.hidden = trains.length > 0;
    const live = new Set(trains.map((t) => t.id));
    for (const [id, row] of rosterRowMap)
      if (!live.has(id)) {
        row.el.remove();
        rosterRowMap.delete(id);
      }
    trains.forEach((t, i) => {
      let row = rosterRowMap.get(t.id);
      if (!row) {
        row = makeRosterRow(t.id);
        rosterRowMap.set(t.id, row);
      }
      if (rosterRows.children[i] !== row.el) rosterRows.insertBefore(row.el, rosterRows.children[i] ?? null);
      const name = trainName(t);
      setText(row.name, name);
      row.swatch.style.backgroundColor = trainColour(t);
      const cars = [t.passengerCars ? `${t.passengerCars}P` : '', t.freightCars ? `${t.freightCars}F` : '']
        .filter(Boolean)
        .join(' ');
      setText(row.consistText, cars || 'loco');
      setText(
        row.consistSr,
        `Locomotive, ${plural(t.passengerCars, 'passenger car')}, ${plural(t.freightCars, 'freight car')}`,
      );
      const chip = chipFor(t);
      setText(row.chip, chip.text);
      const cls = `status ${chip.cls}`;
      if (row.chip.className !== cls) row.chip.className = cls;
      updateRosterRoute(row, t);
      if (t.id === selTrainId) row.el.setAttribute('aria-current', 'true');
      else row.el.removeAttribute('aria-current');
    });
  }

  let rosterCollapsed = false;
  try {
    rosterCollapsed = localStorage.getItem(ROSTER_KEY) === '1';
  } catch {
    /* storage unavailable: start expanded */
  }
  function applyRosterCollapsed(): void {
    rosterEl.classList.toggle('collapsed', rosterCollapsed);
    rosterToggle.setAttribute('aria-expanded', String(!rosterCollapsed));
    rosterToggle.setAttribute('aria-label', rosterCollapsed ? 'Expand train list' : 'Collapse train list');
  }
  applyRosterCollapsed();
  rosterToggle.addEventListener('click', () => {
    rosterCollapsed = !rosterCollapsed;
    applyRosterCollapsed();
    try {
      localStorage.setItem(ROSTER_KEY, rosterCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  });
  rosterRows.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-train]');
    if (!el) return;
    const train = game.train(Number(el.dataset.train));
    if (!train) return;
    if (routing) {
      showToast('Finish picking the route first.');
      return;
    }
    setTool('pan');
    selTrainId = train.id;
    renderSheet();
    renderRoster();
    panToTrain(train);
    requestDraw();
  });

  function renderSheet(): void {
    if (routing) {
      const train = game.train(routing.trainId);
      const n = routing.stops.length;
      setSheet(
        `<div class="sheet-title">Route for ${train ? trainName(train) : 'train'}</div>` +
          (n
            ? `<div>${routeList(routing.stops)}</div>`
            : '<div>Tap stations on the map in the order the train should visit them.</div>') +
          `<div class="sub">${n < 2 ? 'Pick at least two stations.' : 'The train will loop through these stops.'}</div>` +
          (routing.error ? `<div class="err">${humanError(routing.error)}</div>` : '') +
          `<div class="btns">${btn('cancel', 'Cancel')}${btn('undo', 'Undo last', '', n === 0)}${btn('done', 'Done', 'primary', n < 2)}</div>`,
        { cancel: cancelRouting, undo: undoStop, done: finishRouting },
      );
      return;
    }
    if (buy) {
      renderBuy();
      return;
    }
    const train = selectedTrain();
    if (train) {
      setSheet(
        `<div class="sheet-title">${trainName(train)} <span class="pill${train.deadlocked ? ' bad' : ''}">${statusText(train)}</span></div>` +
          `<div class="sub">${plural(train.passengerCars, 'passenger car')}, ${plural(train.freightCars, 'freight car')}</div>` +
          (train.route.length >= 2
            ? `<div>Stops: ${routeList(train.route)}</div>`
            : '<div>This train has no route yet.</div>') +
          `<div class="btns">${btn('close', 'Close')}${btn('route', 'Change route', 'primary')}</div>`,
        {
          close: () => clearSelection(),
          route: () => beginRouting(train),
        },
      );
      return;
    }
    if (selStation) {
      const st = selStation;
      setSheet(
        `<div class="sheet-title">${stationName(st)} station</div>` +
          `<div class="sub">${st.size[0]!.toUpperCase() + st.size.slice(1)} station, reaches ${st.radius} tile${st.radius === 1 ? '' : 's'} around it (shown on the map).</div>` +
          `<div class="btns">${btn('close', 'Close')}</div>`,
        { close: () => clearSelection() },
      );
      return;
    }
    if (tool === 'pan') {
      sheet.classList.add('hidden');
      return;
    }
    if (tool === 'track') return renderTrackSheet();
    if (tool === 'station') return renderStationSheet();
    if (tool === 'train') {
      setSheet('<b>Train:</b> tap a station to buy a train there', {});
      return;
    }
    // Bridge and demolish.
    const name = { bridge: 'Bridge', demolish: 'Demolish' }[tool];
    const cancel = btn('cancel', 'Cancel');
    if (preview) {
      setSheet(
        preview.html +
          `<div class="btns">${cancel}${btn('confirm', 'Confirm', 'primary', !preview.ok)}</div>`,
        { cancel: clearSelection, confirm },
      );
    } else {
      setSheet(startTile ? `<b>${name}:</b> now tap the end tile` : `<b>${name}:</b> tap the start tile`, {
        cancel: clearSelection,
      });
      if (startTile) sheetMsg.insertAdjacentHTML('beforeend', `<div class="btns">${cancel}</div>`);
    }
  }

  function renderTrackSheet(): void {
    const cancel = btn('cancel', 'Cancel');
    if (!startTile) {
      setSheet('<b>Track:</b> tap the start (towns snap into place)', {});
      return;
    }
    if (!tp) {
      setSheet(`<b>Track:</b> now tap the end`, { cancel: clearSelection });
      sheetMsg.insertAdjacentHTML('beforeend', `<div class="btns">${cancel}</div>`);
      return;
    }
    if (tp.error) {
      setSheet(`<div class="err">${humanError(tp.error)}</div><div class="btns">${cancel}</div>`, {
        cancel: clearSelection,
      });
      return;
    }
    const plan = tp.view === 'alt' ? tp.alt! : tp.main!;
    const broke = plan.cost > game.cash;
    const short = broke
      ? `<div class="err">Not enough cash: it costs ${money(plan.cost)} and you have ${money(game.cash)}.</div>`
      : '';
    if (plan.newSegments === 0) {
      setSheet(
        `<div class="big">Already connected</div><div class="sub">There is track along this whole route.</div><div class="btns">${cancel}</div>`,
        { cancel: clearSelection },
      );
      return;
    }
    if (plan.bridges.length === 0) {
      const around = tp.view === 'alt' ? 'Going around the water. ' : '';
      setSheet(
        `<div class="big">${money(plan.cost)}</div><div class="sub">${around}${plural(plan.newSegments, 'new segment')}</div>${short}` +
          `<div class="btns">${cancel}${btn('build', 'Build', 'primary', broke)}</div>`,
        { cancel: clearSelection, build: () => buildPlan(plan, false) },
      );
      return;
    }
    const bridgeCost = plan.bridges.reduce((s, b) => s + b.cost, 0);
    const n = plan.bridges.length;
    setSheet(
      `<div class="sheet-title">This route crosses water.</div>` +
        `<div>It needs ${plural(n, 'bridge')} (${money(bridgeCost)} of the ${money(plan.cost)} total).</div>${short}` +
        `<div class="btns">${cancel}${tp.alt ? btn('around', 'Go around') : ''}${btn('build', 'Build with bridge', 'primary', broke)}</div>`,
      {
        cancel: clearSelection,
        around: () => {
          if (!tp?.alt) return;
          tp.view = 'alt';
          setTrackPreview(tp.alt);
          renderSheet();
          requestDraw();
        },
        build: () => buildPlan(plan, true),
      },
    );
  }

  function renderStationSheet(): void {
    const cancel = btn('cancel', 'Cancel');
    if (!stationTile) {
      setSheet('<b>Station:</b> tap a tile that has track', {});
      return;
    }
    const opts = STATION_SIZES.map((size) => {
      const { cost, radius } = STATION[size];
      return `<button type="button" class="opt" data-act="size-${size}"${cost > game.cash ? ' disabled' : ''}>
        <span>${size[0]!.toUpperCase() + size.slice(1)}</span><span>${money(cost)}</span><small>reaches ${radius}</small></button>`;
    }).join('');
    const acts: Record<string, () => void> = { cancel: clearSelection };
    for (const size of STATION_SIZES) acts[`size-${size}`] = () => buildStationOf(size);
    setSheet(
      `<div class="sheet-title">Build a station here</div><div class="opts">${opts}</div><div class="btns">${cancel}</div>`,
      acts,
    );
  }

  function renderBuy(): void {
    const b = buy!;
    const order = { at: b.at, locomotive: true, passengerCars: b.passengerCars, freightCars: b.freightCars };
    const price = game.trainPrice(order);
    const cars = b.passengerCars + b.freightCars;
    const broke = price > game.cash;
    const row = (label: string, key: 'pass' | 'freight', n: number) =>
      `<div class="stepper"><span>${label}</span><span class="ctl">
        <button type="button" data-act="${key}-" aria-label="Fewer ${label}"${n === 0 ? ' disabled' : ''}>−</button>
        <output>${n}</output>
        <button type="button" data-act="${key}+" aria-label="More ${label}"${cars >= MAX_CARS ? ' disabled' : ''}>+</button></span></div>`;
    setSheet(
      `<div class="sheet-title">Buy a train at ${stationNameAt(b.at)}</div>` +
        `<div class="sub">One locomotive, up to ${MAX_CARS} cars.</div>` +
        row('Passenger cars', 'pass', b.passengerCars) +
        row('Freight cars', 'freight', b.freightCars) +
        `<div class="big">${money(price)}</div>` +
        (broke ? `<div class="err">Not enough cash: you have ${money(game.cash)}.</div>` : '') +
        `<div class="btns">${btn('cancel', 'Cancel')}${btn('buy', 'Buy train', 'primary', broke)}</div>`,
      {
        cancel: clearSelection,
        'pass-': () => step('passengerCars', -1),
        'pass+': () => step('passengerCars', 1),
        'freight-': () => step('freightCars', -1),
        'freight+': () => step('freightCars', 1),
        buy: buyTrain,
      },
    );
  }
  function step(key: 'passengerCars' | 'freightCars', d: number): void {
    if (!buy) return;
    const next = buy[key] + d;
    if (next < 0 || (d > 0 && buy.passengerCars + buy.freightCars >= MAX_CARS)) return;
    buy[key] = next;
    renderSheet();
  }

  function clearSelection(): void {
    startTile = null;
    preview = null;
    tp = null;
    stationTile = null;
    buy = null;
    routing = null;
    selTrainId = null;
    selStation = null;
    renderSheet();
    renderRoster();
    requestDraw();
  }
  function setTool(t: Tool): void {
    tool = t;
    for (const b of document.querySelectorAll<HTMLButtonElement>('.tool'))
      b.classList.toggle('active', b.dataset.tool === t);
    canvas.style.cursor = t === 'pan' ? 'grab' : 'crosshair';
    clearSelection();
  }

  // ---------- track planner ----------
  const nearestTown = (t: Coord): Coord => {
    let best: Coord | null = null;
    let bd = Infinity;
    for (const town of game.towns) {
      const cheb = Math.max(Math.abs(town.x - t.x), Math.abs(town.y - t.y));
      if (cheb > 1) continue;
      const d = cheb * 10 + Math.hypot(town.x - t.x, town.y - t.y);
      if (d < bd) {
        bd = d;
        best = town;
      }
    }
    return best ? { x: best.x, y: best.y } : t;
  };

  function setTrackPreview(plan: TrackPlan): void {
    preview = {
      path: [...plan.path],
      ok: true,
      html: '',
      affected: [],
      bridgeSegs: [...plan.bridgeSegments],
    };
  }

  function planBetween(a: Coord, b: Coord): void {
    const main = game.planTrack(a, b);
    if (!main.ok) {
      tp = { main: null, alt: null, view: 'main', error: main.error };
      preview = { path: [a, b], ok: false, html: '', affected: [] };
      return;
    }
    let alt: TrackPlan | null = null;
    if (main.plan.bridges.length > 0) {
      const land = game.planTrack(a, b, { bridges: false });
      if (land.ok) alt = land.plan;
    }
    tp = { main: main.plan, alt, view: 'main', error: null };
    setTrackPreview(main.plan);
  }

  function buildPlan(plan: TrackPlan, confirmBridges: boolean): void {
    const r = game.buildPlannedTrack(plan, { confirmBridges });
    refreshSegs();
    updateHud();
    persist();
    showToast(
      r.ok
        ? r.cost === 0
          ? 'Nothing to build'
          : `Built ${plural(plan.newSegments, 'segment')} for ${money(r.cost)}`
        : humanError(r.error),
    );
    clearSelection();
  }

  // ---------- previews and commands (bridge, demolish) ----------
  const err = (path: Coord[], message: string): Preview => ({
    path,
    ok: false,
    html: `<div class="err">${humanError(message)}</div>`,
    affected: [],
  });

  function computePreview(a: Coord, b: Coord): Preview {
    if (sameCoord(a, b)) return err([a], 'path too short');
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
      return {
        path,
        ok: true,
        html: `<div class="big">${money(q.cost)}</div><div class="sub">Bridge over ${plural(path.length - 2, 'water tile')}</div>`,
        affected: [],
      };
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
      html: `<div class="big">+${money(refund)}</div><div class="sub">Refund for tearing up ${plural(affected.length, 'segment')}</div>`,
      affected,
    };
  }

  function confirm(): void {
    if (!startTile || !preview || !preview.ok) return;
    const a = startTile;
    const b = preview.path[preview.path.length - 1]!;
    let message: string;
    if (tool === 'bridge') {
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

  // ---------- stations and trains ----------
  function buildStationOf(size: StationSize): void {
    if (!stationTile) return;
    const r = game.buildStation(size, stationTile);
    updateHud();
    if (r.ok) persist();
    showToast(r.ok ? `Built a ${size} station for ${money(r.cost)}` : humanError(r.error));
    clearSelection();
  }

  function buyTrain(): void {
    if (!buy) return;
    const r = game.buyTrain({
      at: buy.at,
      locomotive: true,
      passengerCars: buy.passengerCars,
      freightCars: buy.freightCars,
    });
    updateHud();
    if (!r.ok) {
      showToast(humanError(r.error));
      return;
    }
    persist();
    renderRoster();
    showToast(`Bought a train for ${money(r.cost)}. Now pick its route.`);
    buy = null;
    beginRouting(r.train);
  }

  function beginRouting(train: Train): void {
    startTile = null;
    preview = null;
    tp = null;
    stationTile = null;
    buy = null;
    selStation = null;
    selTrainId = train.id;
    routing = { trainId: train.id, stops: [], error: null };
    renderSheet();
    requestDraw();
  }
  function cancelRouting(): void {
    routing = null;
    renderSheet();
    renderRoster();
    requestDraw();
  }
  function undoStop(): void {
    if (!routing) return;
    routing.stops.pop();
    routing.error = null;
    renderSheet();
    requestDraw();
  }
  function finishRouting(): void {
    if (!routing) return;
    const r = game.setRoute(routing.trainId, routing.stops);
    if (!r.ok) {
      routing.error = r.error;
      renderSheet();
      return;
    }
    persist();
    routing = null;
    showToast('Route set. The train is on its way.');
    renderSheet();
    renderRoster();
    requestDraw();
  }

  // ---------- tapping ----------
  function stationNear(wx: number, wy: number): Station | null {
    const reach = Math.max(0.7, 24 / cam.zoom);
    let best: Station | null = null;
    let bd = reach;
    for (const s of game.stations.values()) {
      const d = Math.hypot(wx - (s.at.x + 0.5), wy - (s.at.y + 0.5));
      if (d <= bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }
  function trainNear(wx: number, wy: number): Train | null {
    const reach = Math.max(0.7, 24 / cam.zoom);
    let best: Train | null = null;
    let bd = reach;
    for (const t of game.trains) {
      const p = trainPoses(t, 0)[0]!;
      const d = Math.hypot(wx - p.x, wy - p.y);
      if (d <= bd) {
        bd = d;
        best = t;
      }
    }
    return best;
  }

  function handleTap(sx: number, sy: number): void {
    const w = screenToWorld(sx, sy);
    const t = { x: Math.floor(w.x), y: Math.floor(w.y) };
    if (routing) {
      const st = stationNear(w.x, w.y);
      if (!st) {
        showToast('Tap a station to add it to the route.');
        return;
      }
      const last = routing.stops[routing.stops.length - 1];
      if (last && sameCoord(last, st.at)) {
        showToast('That is already the last stop. Pick a different station.');
        return;
      }
      routing.stops.push({ ...st.at });
      routing.error = null;
      renderSheet();
      requestDraw();
      return;
    }
    if (tool === 'pan') {
      const train = trainNear(w.x, w.y);
      if (train) {
        clearSelection();
        selTrainId = train.id;
      } else {
        const st = stationNear(w.x, w.y);
        clearSelection();
        selStation = st;
      }
      renderSheet();
      requestDraw();
      return;
    }
    if (tool === 'train') {
      const st = stationNear(w.x, w.y);
      if (!st) {
        showToast('Tap a station to buy a train there.');
        return;
      }
      buy = { at: { ...st.at }, passengerCars: 2, freightCars: 0 };
      renderSheet();
      requestDraw();
      return;
    }
    if (!game.map.inBounds(t)) return;
    if (tool === 'station') {
      if (game.isStation(t)) {
        showToast('There is already a station here.');
        return;
      }
      if (!game.track.touches(t)) {
        showToast('A station has to sit on track. Tap a tile that has track.');
        return;
      }
      stationTile = t;
      renderSheet();
      requestDraw();
      return;
    }
    // Track, bridge, demolish: two taps.
    const tile = tool === 'track' ? nearestTown(t) : t;
    if (startTile && !preview && !tp && sameCoord(startTile, tile)) {
      clearSelection();
      return;
    }
    if (!startTile || preview || tp) {
      startTile = tile;
      preview = null;
      tp = null;
    } else if (tool === 'track') {
      planBetween(startTile, tile);
    } else {
      preview = computePreview(startTile, tile);
    }
    renderSheet();
    requestDraw();
  }

  // ---------- camera ----------
  function clampZoom(z: number): number {
    const min = Math.max(3, Math.min(viewW, viewH) / (MAP_SIZE * 1.1));
    return Math.max(min, Math.min(64, z));
  }
  /**
   * Keep the map on screen. It may scroll past its edges only far enough that edge tiles
   * can be brought out from under the HUD (top) and the toolbar + bottom sheet.
   */
  function clampCam(): void {
    const OVERSCROLL = { top: 150, bottom: 300, side: 24 }; // CSS px
    const clampAxis = (v: number, view: number, before: number, after: number) => {
      const min = (view / 2 - before) / cam.zoom;
      const max = MAP_SIZE - (view / 2 - after) / cam.zoom;
      return min > max ? MAP_SIZE / 2 : Math.max(min, Math.min(max, v));
    };
    cam.x = clampAxis(cam.x, viewW, OVERSCROLL.side, OVERSCROLL.side);
    cam.y = clampAxis(cam.y, viewH, OVERSCROLL.top, OVERSCROLL.bottom);
  }
  const screenToWorld = (sx: number, sy: number) => ({
    x: cam.x + (sx - viewW / 2) / cam.zoom,
    y: cam.y + (sy - viewH / 2) / cam.zoom,
  });
  function zoomAt(sx: number, sy: number, factor: number): void {
    const before = screenToWorld(sx, sy);
    cam.zoom = clampZoom(cam.zoom * factor);
    cam.x = before.x - (sx - viewW / 2) / cam.zoom;
    cam.y = before.y - (sy - viewH / 2) / cam.zoom;
    clampCam();
    requestDraw();
  }

  // ---------- camera animation ----------
  const wideLayout = window.matchMedia('(min-width: 720px)');
  let camAnim: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number; t0: number } | null =
    null;
  function panToTrain(t: Train): void {
    const head = trainPoses(t, 0)[0]!;
    const z1 = clampZoom(Math.max(cam.zoom, 18));
    // The side panel covers the right of the screen on wide layouts: centre in what is left.
    const shift = wideLayout.matches ? 156 / z1 : 0;
    const keep = { ...cam };
    cam.zoom = z1;
    cam.x = head.x + shift;
    cam.y = head.y;
    clampCam();
    const to = { ...cam };
    Object.assign(cam, keep);
    if (reducedMotion) {
      Object.assign(cam, to);
      camAnim = null;
    } else {
      camAnim = { x0: cam.x, y0: cam.y, z0: cam.zoom, x1: to.x, y1: to.y, z1, t0: performance.now() };
    }
    requestDraw();
  }
  function stepCamAnim(now: number): boolean {
    if (!camAnim) return false;
    const k = Math.min(1, (now - camAnim.t0) / CAM_MS);
    const e = 1 - Math.pow(1 - k, 3);
    cam.zoom = camAnim.z0 + (camAnim.z1 - camAnim.z0) * e;
    cam.x = camAnim.x0 + (camAnim.x1 - camAnim.x0) * e;
    cam.y = camAnim.y0 + (camAnim.y1 - camAnim.y0) * e;
    if (k >= 1) camAnim = null;
    return true;
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
    camAnim = null;
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
      // Touch pans only in the Pan tool (or while picking a route); a mouse can always drag.
      const canPan = tool === 'pan' || !!routing || e.pointerType === 'mouse';
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
      camAnim = null;
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

  function draw(now = performance.now()): void {
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
    drawRouteLegs(z);
    drawCatchments();
    drawSelection(z);
    for (const s of game.stations.values()) drawStation(ctx, s);
    drawTrains(now, z);

    // Screen space: labels keep a constant readable size.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const t of game.towns) drawLabel(ctx, t.name, ox + (t.x + 0.5) * z, oy + t.y * z - 2);
    drawRouteMarkers(ox, oy, z);
  }

  // ---------- selected train's route on the map ----------
  let legCache: { key: string; segs: [Coord, Coord][] } | null = null;
  function routeLegs(t: Train): [Coord, Coord][] {
    const key = `${t.id}|${trackVersion}|${t.route.map((c) => `${c.x},${c.y}`).join(';')}`;
    if (legCache?.key === key) return legCache.segs;
    const out: [Coord, Coord][] = [];
    const seen = new Set<string>();
    const n = t.route.length;
    if (n >= 2) {
      for (let i = 0; i < n; i++) {
        const path = findTrackPath(game.track, t.route[i]!, t.route[(i + 1) % n]!);
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
    legCache = { key, segs: out };
    return out;
  }
  function drawRouteLegs(z: number): void {
    const t = routing ? undefined : selectedTrain();
    if (!t || t.route.length < 2) return;
    const legs = routeLegs(t);
    if (!legs.length) return;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = trainColour(t);
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

  function drawCatchments(): void {
    if (stationTile && tool === 'station') {
      for (const size of [...STATION_SIZES].reverse())
        drawCatchment(ctx, stationTile, STATION[size].radius, size === 'small');
    }
    if (selStation) drawCatchment(ctx, selStation.at, selStation.radius, true);
  }

  function drawTrains(now: number, z: number): void {
    const frac = paused ? 0 : renderFrac;
    for (const t of game.trains) {
      const extra = t.status === 'moving' && t.next ? t.speed * frac : 0;
      const poses = trainPoses(t, extra);
      const colour = trainColour(t);
      for (let i = poses.length - 1; i >= 0; i--) drawVehicle(ctx, poses[i]!, colour);
      const head = poses[0]!;
      if (t.id === selTrainId) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5 / z;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (t.deadlocked) {
        const pulse = reducedMotion ? 0.5 : 0.5 + 0.12 * Math.sin(now / 160);
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

  function drawRouteMarkers(ox: number, oy: number, z: number): void {
    const train = routing ? game.train(routing.trainId) : selectedTrain();
    const stops = routing ? routing.stops : (train?.route ?? []);
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
      ctx.fillStyle = !routing && train ? trainColour(train) : '#1f6f8b';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(sx - w / 2, sy - 12, w, 24, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.strokeText(label, sx, sy + 0.5);
      ctx.fillText(label, sx, sy + 0.5);
    }
  }

  function drawSelection(z: number): void {
    if (stationTile && tool === 'station') {
      ctx.strokeStyle = '#1d74d6';
      ctx.lineWidth = 3 / z;
      ctx.beginPath();
      tileRect(stationTile, 0.04);
      ctx.stroke();
    }
    if (!startTile) return;
    const good = preview ? preview.ok : true;
    const fill = good ? 'rgba(40,140,230,0.38)' : 'rgba(220,50,40,0.38)';
    const edge = good ? '#1d74d6' : '#d02a20';
    if (preview) {
      const bs = preview.bridgeSegs;
      const wet = (c: Coord): boolean => !!bs && game.map.terrainAt(c) === 'water';
      ctx.fillStyle = fill;
      ctx.beginPath();
      for (const c of preview.path) if (game.map.inBounds(c) && !wet(c)) tileRect(c);
      ctx.fill();
      if (bs) {
        ctx.fillStyle = 'rgba(255,159,28,0.55)';
        ctx.beginPath();
        for (const c of preview.path) if (game.map.inBounds(c) && wet(c)) tileRect(c);
        ctx.fill();
      }
      if (preview.path.length > 1) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 1; i < preview.path.length; i++) {
          const a = preview.path[i - 1]!;
          const b = preview.path[i]!;
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
    clampCam();
    requestDraw();
  }
  window.addEventListener('resize', resize);
  new ResizeObserver(resize).observe(canvas);

  // ---------- time ----------
  let lastFrame = performance.now();
  let lastTrainKey = '';

  function afterTicks(): void {
    updateHud();
    const day = Math.floor(game.time / TICKS_PER_DAY);
    if (day !== lastDay) {
      lastDay = day;
      persist();
    }
    // Deadlock alarm: once per incident.
    const stuck = game.trains.filter((t) => t.deadlocked);
    if (stuck.length === 0) alarmed.clear();
    else if (stuck.some((t) => !alarmed.has(t.id))) {
      if (alarmed.size === 0)
        showToast('Two trains are stuck head-on. Add a passing loop or a station between them.', 7000);
      for (const t of stuck) alarmed.add(t.id);
    }
    const sel = selectedTrain();
    const key = sel ? `${sel.id}|${statusText(sel)}` : '';
    if (key !== lastTrainKey) {
      lastTrainKey = key;
      if (sel && !routing) renderSheet();
    }
  }

  function frame(now: number): void {
    requestAnimationFrame(frame);
    const dt = Math.min(now - lastFrame, 250);
    lastFrame = now;
    const animating = stepCamAnim(now);
    if (now - lastRosterAt >= ROSTER_MS) renderRoster();
    if (animating && paused) draw(now);
    if (!paused) {
      acc += dt * speed;
      const ticked = Math.min(Math.floor(acc / TICK_MS), 48);
      acc -= ticked * TICK_MS;
      if (acc > TICK_MS) acc = 0;
      for (let i = 0; i < ticked; i++) game.tick();
      renderFrac = acc / TICK_MS;
      if (ticked > 0) afterTicks();
      if (ticked > 0 || game.trains.length > 0) draw(now);
    }
  }

  function setPaused(p: boolean): void {
    paused = p;
    const icon = $('play-icon');
    icon.innerHTML = p ? '<path d="M8 5v14l11-7z" />' : '<path d="M7 5h4v14H7zM13 5h4v14h-4z" />';
    $('play').setAttribute('aria-label', p ? 'Play' : 'Pause');
    lastFrame = performance.now();
    requestDraw();
  }
  function setSpeed(s: number): void {
    speed = s;
    for (const b of document.querySelectorAll<HTMLButtonElement>('.speed'))
      b.classList.toggle('active', Number(b.dataset.speed) === s);
  }

  // ---------- wiring ----------
  for (const b of document.querySelectorAll<HTMLButtonElement>('.tool'))
    b.addEventListener('click', () => setTool(b.dataset.tool as Tool));
  $('play').addEventListener('click', () => setPaused(!paused));
  for (const b of document.querySelectorAll<HTMLButtonElement>('.speed'))
    b.addEventListener('click', () => {
      setSpeed(Number(b.dataset.speed));
      if (paused) setPaused(false);
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
    newGame(null);
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

  window.claude?.hot?.snapshot?.(() => game.toSave());

  // ---------- boot ----------
  viewW = canvas.clientWidth;
  viewH = canvas.clientHeight;
  const saved = loadSaved();
  newGame(saved);
  resize();
  setTool('pan');
  if (!saved) persist();
  Object.defineProperty(window, 'railroadsim', {
    configurable: true,
    value: Object.freeze({
      get game() {
        return game;
      },
      get tool() {
        return tool;
      },
      get paused() {
        return paused;
      },
      get speed() {
        return speed;
      },
      /** Re-reads the game state into the UI (for tests that change `game` directly). */
      refresh() {
        refreshSegs();
        updateHud();
        renderRoster();
        requestDraw();
      },
      setView(x: number, y: number, zoom: number) {
        cam.x = x;
        cam.y = y;
        cam.zoom = clampZoom(zoom);
        clampCam();
        requestDraw();
      },
      tileToClient(x: number, y: number) {
        const r = canvas.getBoundingClientRect();
        return {
          x: r.left + viewW / 2 + (x + 0.5 - cam.x) * cam.zoom,
          y: r.top + viewH / 2 + (y + 0.5 - cam.y) * cam.zoom,
        };
      },
    }),
  });
  requestAnimationFrame(frame);
}

if (window.claude?.hot?.ready) window.claude.hot.ready(start);
else start(window.claude?.hot?.data ?? {});
