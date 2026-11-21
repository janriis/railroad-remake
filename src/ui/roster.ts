import { type Train } from '../sim/trains';
import type { Ui } from './state';
import {
  ageText,
  brokenDaysLeft,
  carsText,
  loadText,
  modelName,
  plural,
  stationNameAt,
  trainColour,
  trainName,
} from './format';
import { $, setText } from './dom';
import { ROSTER_KEY } from './constants';
import { beginSend, cancelTripOf } from './sheets/send';
import { beginRouting } from './tools/route';
import { beginCars } from './sheets/cars';
import { panToTrain } from './camera';

export const LOCO_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12a2 2 0 012 2v10a3 3 0 01-3 3l2 3h-2.5l-2-3h-5l-2 3H5l2-3a3 3 0 01-3-3V5a2 2 0 012-2zm0 3v5h12V6zm2 8a1.3 1.3 0 100 2.6A1.3 1.3 0 008 14zm8 0a1.3 1.3 0 100 2.6 1.3 1.3 0 000-2.6z" /></svg>';
export interface RosterRow {
  el: HTMLElement;
  main: HTMLButtonElement;
  swatch: HTMLElement;
  name: HTMLElement;
  consistText: HTMLElement;
  consistSr: HTMLElement;
  chip: HTMLElement;
  wear: HTMLElement;
  model: HTMLElement;
  route: HTMLElement;
  load: HTMLElement;
  trip: HTMLElement;
  tripText: HTMLElement;
  routeKey: string;
}
export function chipFor(t: Train, ui?: Ui): { text: string; cls: string } {
  if (ui?.game.isBrokenDown(t)) return { text: `Broken down, ${brokenDaysLeft(ui, t)} d`, cls: 'stuck' };
  if (!ui && t.status === 'broken-down') return { text: 'Broken down', cls: 'stuck' };
  if (t.deadlocked) return { text: 'Stuck', cls: 'stuck' };
  if (t.status === 'waiting') return { text: 'Waiting', cls: 'waiting' };
  if (t.trip) return { text: 'On trip', cls: 'trip' };
  if (t.route.length < 2) return { text: 'No route', cls: 'none' };
  if (t.status === 'at-stop') return { text: 'At station', cls: 'station' };
  if (t.status === 'moving') return { text: 'Running', cls: 'running' };
  return t.next ? { text: 'Running', cls: 'running' } : { text: 'At station', cls: 'station' };
}
export function makeRosterRow(id: number): RosterRow {
  const el = document.createElement('div');
  el.className = 'train-item';
  el.dataset.train = String(id);
  el.innerHTML =
    '<button type="button" class="train-row"><span class="swatch" aria-hidden="true"></span><span class="body">' +
    '<span class="line1"><span class="tname"></span>' +
    `<span class="consist">${LOCO_SVG}<span class="ctext" aria-hidden="true"></span><span class="sr csr"></span></span>` +
    '<span class="wear" hidden>Worn out</span><span class="status"></span></span><span class="model"></span><span class="route"></span><span class="load"></span></span></button>' +
    '<span class="row-actions"><button type="button" class="mini txt" data-ract="route">Route</button>' +
    '<button type="button" class="mini txt" data-ract="cars">Cars</button>' +
    '<button type="button" class="mini txt" data-ract="send">Send to…</button></span>';
  const trip = document.createElement('div');
  trip.className = 'trip-line';
  trip.hidden = true;
  trip.innerHTML =
    '<span class="trip-text"></span><button type="button" class="mini txt" data-ract="cancel-trip">Cancel trip</button>';
  el.append(trip);
  const q = (sel: string) => el.querySelector<HTMLElement>(sel)!;
  return {
    el,
    main: q('.train-row') as HTMLButtonElement,
    swatch: q('.swatch'),
    name: q('.tname'),
    consistText: q('.ctext'),
    consistSr: q('.csr'),
    chip: q('.status'),
    wear: q('.wear'),
    model: q('.model'),
    route: q('.route'),
    load: q('.load'),
    trip,
    tripText: trip.querySelector<HTMLElement>('.trip-text')!,
    routeKey: '\u0000',
  };
}
export function updateRosterRoute(ui: Ui, row: RosterRow, t: Train): void {
  const names = t.route.map((c) => stationNameAt(ui, c));
  if (t.trip) {
    // The trip takes the place of the route line while it lasts.
    const tripKey = `trip:${t.trip.x},${t.trip.y}:${names.join('|')}`;
    if (tripKey === row.routeKey) return;
    row.routeKey = tripKey;
    row.route.removeAttribute('title');
    row.route.textContent = names.length >= 2 ? `Then back to its route: ${names.join(' → ')} ↺` : '';
    return;
  }
  const orders = names.map((_, i) => {
    const o = t.stopOrders[i];
    return o ? carsText(o) : '';
  });
  const key = `${names.join('|')}#${t.target}#${orders.join('|')}`;
  if (key === row.routeKey) return;
  row.routeKey = key;
  row.route.replaceChildren();
  if (names.length < 2) {
    row.route.textContent = 'No route yet. Tap to choose stops.';
    row.route.removeAttribute('title');
    return;
  }
  row.route.title =
    names.map((n, i) => n + (orders[i] ? ` (${orders[i]})` : '')).join(' → ') + ', then repeats';
  names.forEach((n, i) => {
    if (i > 0) row.route.append(' → ');
    const span = document.createElement('span');
    span.className = i === t.target ? 'stop next' : 'stop';
    const tag = orders[i] ? ` (${orders[i]})` : '';
    span.textContent = (i === t.target ? `▸ ${n}` : n) + tag;
    row.route.append(span);
  });
  const loop = document.createElement('span');
  loop.setAttribute('aria-hidden', 'true');
  loop.textContent = ' ↺';
  row.route.append(loop);
}

/** Builds the train roster panel and returns its (cheap, incremental) render function. */
export function createRoster(ui: Ui): () => void {
  const rosterEl = $('roster');
  const rosterTitle = $('roster-title');
  const rosterToggle = $<HTMLButtonElement>('roster-toggle');
  const rosterEmpty = $('roster-empty');
  const rosterRows = $('roster-rows');
  const rosterRowMap = new Map<number, RosterRow>();
  function renderRoster(): void {
    if (!ui.game) return;
    ui.lastRosterAt = performance.now();
    const trains = ui.game.trains;
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
      const name = trainName(ui, t);
      setText(row.name, name);
      row.swatch.style.backgroundColor = trainColour(ui, t);
      const cars = [t.passengerCars ? `${t.passengerCars}P` : '', t.freightCars ? `${t.freightCars}F` : '']
        .filter(Boolean)
        .join(' ');
      setText(row.consistText, cars || 'loco');
      setText(
        row.consistSr,
        `Locomotive, ${plural(t.passengerCars, 'passenger car')}, ${plural(t.freightCars, 'freight car')}`,
      );
      const chip = chipFor(t, ui);
      const worn = ui.game.isWornOut(t);
      row.wear.hidden = !worn;
      setText(row.model, `${modelName(t)} · ${ageText(ui, t)}`);
      setText(row.chip, chip.text);
      const cls = `status ${chip.cls}`;
      if (row.chip.className !== cls) row.chip.className = cls;
      updateRosterRoute(ui, row, t);
      setText(row.load, loadText(t));
      row.trip.hidden = !t.trip;
      if (t.trip) setText(row.tripText, `Trip to ${stationNameAt(ui, t.trip)}`);
      row.el.classList.toggle('current', t.id === ui.selTrainId);
      if (t.id === ui.selTrainId) row.main.setAttribute('aria-current', 'true');
      else row.main.removeAttribute('aria-current');
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
    const train = ui.game.train(Number(el.dataset.train));
    if (!train) return;
    if (ui.routing) {
      ui.showToast('Finish the route first (Save or Cancel).');
      return;
    }
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-ract]')?.dataset.ract;
    if (act === 'cancel-trip') {
      cancelTripOf(ui, train);
      return;
    }
    ui.setTool('pan');
    ui.selTrainId = train.id;
    if (act === 'route') beginRouting(ui, train);
    else if (act === 'cars') beginCars(ui, train);
    else if (act === 'send') beginSend(ui, train);
    else ui.renderSheet();
    ui.renderRoster();
    panToTrain(ui, train);
    ui.requestDraw();
  });
  return renderRoster;
}
