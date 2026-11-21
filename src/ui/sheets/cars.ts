import type { Ui } from '../state';
import { type Train } from '../../sim/trains';
import { humanError, money, plural, trainName } from '../format';
import { CAR_RESALE_RATE, FREIGHT_CAR_COST, LOCO, PASSENGER_CAR_COST } from '../../sim/config';
import { btn } from '../dom';
import { maxCarsOf } from '../models';

export function beginCars(ui: Ui, train: Train): void {
  ui.clearSelection();
  ui.selTrainId = train.id;
  ui.carsEdit = { trainId: train.id, ...train.owned };
  ui.renderSheet();
  ui.renderRoster();
  ui.requestDraw();
}
export function renderCarsSheet(ui: Ui): void {
  const c = ui.carsEdit!;
  const train = ui.game.train(c.trainId);
  if (!train) return;
  const dp = c.passengerCars - train.owned.passengerCars;
  const df = c.freightCars - train.owned.freightCars;
  const price = (n: number, unit: number) => (n > 0 ? n * unit : Math.round(n * unit * CAR_RESALE_RATE));
  const cost = price(dp, PASSENGER_CAR_COST) + price(df, FREIGHT_CAR_COST);
  const added = Math.max(dp, 0) + Math.max(df, 0);
  const removed = Math.max(-dp, 0) + Math.max(-df, 0);
  let line = 'No change';
  if (added && !removed) line = `Adds ${plural(added, 'car')}: ${money(cost)}`;
  else if (removed && !added) line = `Takes off ${plural(removed, 'car')}: +${money(-cost)} back`;
  else if (added && removed)
    line = `Adds ${plural(added, 'car')}, takes off ${plural(removed, 'car')}: ${cost >= 0 ? money(cost) : `+${money(-cost)} back`}`;
  const total = c.passengerCars + c.freightCars;
  const max = maxCarsOf(train.model);
  const broke = cost > ui.game.cash;
  const dropsOrders =
    total < train.owned.passengerCars + train.owned.freightCars &&
    train.stopOrders.some((o) => o !== null && o.passengerCars + o.freightCars > total);
  const row = (label: string, key: 'pass' | 'freight', n: number) =>
    `<div class="stepper"><span>${label}</span><span class="ctl">
        <button type="button" data-act="${key}-" aria-label="Fewer ${label}"${n === 0 ? ' disabled' : ''}>−</button>
        <output>${n}</output>
        <button type="button" data-act="${key}+" aria-label="More ${label}"${total >= max ? ' disabled' : ''}>+</button></span></div>`;
  const bump = (key: 'passengerCars' | 'freightCars', d: number) => () => {
    const next = c[key] + d;
    if (next < 0 || (d > 0 && c.passengerCars + c.freightCars >= max)) return;
    c[key] = next;
    ui.renderSheet();
  };
  ui.setSheet(
    `<div class="sheet-title">Cars for ${trainName(ui, train)}</div>` +
      `<div class="sub">${LOCO[train.model].name}: up to ${max} cars.</div>` +
      row('Passenger cars', 'pass', c.passengerCars) +
      row('Freight cars', 'freight', c.freightCars) +
      `<div class="big" id="cars-price">${line}</div>` +
      (dropsOrders ? '<div class="warn">Stop orders that use more cars than this are cleared.</div>' : '') +
      (broke ? `<div class="err">Not enough cash: you have ${money(ui.game.cash)}.</div>` : '') +
      `<div class="btns">${btn('cancel', 'Cancel')}${btn('apply', 'Apply', 'primary', broke || (dp === 0 && df === 0))}</div>`,
    {
      cancel: ui.clearSelection,
      'pass-': bump('passengerCars', -1),
      'pass+': bump('passengerCars', 1),
      'freight-': bump('freightCars', -1),
      'freight+': bump('freightCars', 1),
      apply: () => {
        const r = ui.game.changeCars(c.trainId, {
          passengerCars: c.passengerCars,
          freightCars: c.freightCars,
        });
        ui.updateHud();
        if (!r.ok) {
          ui.showToast(humanError(r.error));
          return;
        }
        ui.persist();
        ui.showToast(
          r.cost > 0
            ? `Cars changed for ${money(r.cost)}`
            : r.cost < 0
              ? `Cars changed, ${money(-r.cost)} back`
              : 'Cars changed',
        );
        ui.carsEdit = null;
        ui.renderSheet();
        ui.renderRoster();
      },
    },
  );
}
