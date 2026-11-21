import type { Ui } from '../state';
import { MAX_CARS } from '../../sim/config';
import { humanError, money, stationNameAt } from '../format';
import { btn } from '../dom';
import { beginRouting } from './route';

export function renderBuy(ui: Ui): void {
  const b = ui.buy!;
  const order = { at: b.at, locomotive: true, passengerCars: b.passengerCars, freightCars: b.freightCars };
  const price = ui.game.trainPrice(order);
  const cars = b.passengerCars + b.freightCars;
  const broke = price > ui.game.cash;
  const row = (label: string, key: 'pass' | 'freight', n: number) =>
    `<div class="stepper"><span>${label}</span><span class="ctl">
        <button type="button" data-act="${key}-" aria-label="Fewer ${label}"${n === 0 ? ' disabled' : ''}>−</button>
        <output>${n}</output>
        <button type="button" data-act="${key}+" aria-label="More ${label}"${cars >= MAX_CARS ? ' disabled' : ''}>+</button></span></div>`;
  ui.setSheet(
    `<div class="sheet-title">Buy a train at ${stationNameAt(ui, b.at)}</div>` +
      `<div class="sub">One locomotive, up to ${MAX_CARS} cars.</div>` +
      row('Passenger cars', 'pass', b.passengerCars) +
      row('Freight cars', 'freight', b.freightCars) +
      `<div class="big">${money(price)}</div>` +
      (broke ? `<div class="err">Not enough cash: you have ${money(ui.game.cash)}.</div>` : '') +
      `<div class="btns">${btn('cancel', 'Cancel')}${btn('buy', 'Buy train', 'primary', broke)}</div>`,
    {
      cancel: ui.clearSelection,
      'pass-': () => step(ui, 'passengerCars', -1),
      'pass+': () => step(ui, 'passengerCars', 1),
      'freight-': () => step(ui, 'freightCars', -1),
      'freight+': () => step(ui, 'freightCars', 1),
      buy: () => buyTrain(ui),
    },
  );
}
export function step(ui: Ui, key: 'passengerCars' | 'freightCars', d: number): void {
  if (!ui.buy) return;
  const next = ui.buy[key] + d;
  if (next < 0 || (d > 0 && ui.buy.passengerCars + ui.buy.freightCars >= MAX_CARS)) return;
  ui.buy[key] = next;
  ui.renderSheet();
}
export function buyTrain(ui: Ui): void {
  if (!ui.buy) return;
  const r = ui.game.buyTrain({
    at: ui.buy.at,
    locomotive: true,
    passengerCars: ui.buy.passengerCars,
    freightCars: ui.buy.freightCars,
  });
  ui.updateHud();
  if (!r.ok) {
    ui.showToast(humanError(r.error));
    return;
  }
  ui.persist();
  ui.renderRoster();
  ui.showToast(`Bought a train for ${money(r.cost)}. Now pick its route.`);
  ui.buy = null;
  beginRouting(ui, r.train);
}
