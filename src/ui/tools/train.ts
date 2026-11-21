import type { Ui } from '../state';
import type { LocoModel } from '../../sim/config';
import { LOCO } from '../../sim/config';
import { maxCarsOf, modelCard } from '../models';
import { humanError, money, stationNameAt } from '../format';
import { btn } from '../dom';
import { beginRouting } from './route';

export function renderBuy(ui: Ui): void {
  const b = ui.buy!;
  const max = maxCarsOf(b.model);
  const order = {
    at: b.at,
    locomotive: true,
    model: b.model,
    passengerCars: b.passengerCars,
    freightCars: b.freightCars,
  };
  const price = ui.game.trainPrice(order);
  const cars = b.passengerCars + b.freightCars;
  const broke = price > ui.game.cash;
  const row = (label: string, key: 'pass' | 'freight', n: number) =>
    `<div class="stepper"><span>${label}</span><span class="ctl">
        <button type="button" data-act="${key}-" aria-label="Fewer ${label}"${n === 0 ? ' disabled' : ''}>−</button>
        <output>${n}</output>
        <button type="button" data-act="${key}+" aria-label="More ${label}"${cars >= max ? ' disabled' : ''}>+</button></span></div>`;
  ui.setSheet(
    `<div class="sheet-title">Buy a train at ${stationNameAt(ui, b.at)}</div>` +
      `<div class="sub">Pick a locomotive (${LOCO[b.model].name}: up to ${max} cars).</div>` +
      `<div class="editor-scroll">` +
      ui.game
        .modelsOnSale()
        .map((m) => modelCard(m, m === b.model))
        .join('') +
      `</div>` +
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
      ...Object.fromEntries(
        ui.game.modelsOnSale().map((m) => [`model:${m}`, () => pickModel(ui, m)] as const),
      ),
    },
    true,
  );
}
export function pickModel(ui: Ui, model: LocoModel): void {
  if (!ui.buy) return;
  ui.buy.model = model;
  // Drop freight cars first, then passenger cars, until the train fits the new limit.
  const max = maxCarsOf(model);
  ui.buy.freightCars = Math.min(ui.buy.freightCars, max);
  while (ui.buy.passengerCars + ui.buy.freightCars > max)
    if (ui.buy.freightCars > 0) ui.buy.freightCars--;
    else ui.buy.passengerCars--;
  ui.renderSheet();
}
export function step(ui: Ui, key: 'passengerCars' | 'freightCars', d: number): void {
  if (!ui.buy) return;
  const next = ui.buy[key] + d;
  if (next < 0 || (d > 0 && ui.buy.passengerCars + ui.buy.freightCars >= maxCarsOf(ui.buy.model))) return;
  ui.buy[key] = next;
  ui.renderSheet();
}
export function buyTrain(ui: Ui): void {
  if (!ui.buy) return;
  const r = ui.game.buyTrain({
    at: ui.buy.at,
    locomotive: true,
    model: ui.buy.model,
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
