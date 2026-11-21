import type { Ui } from '../state';
import { type Train } from '../../sim/trains';
import { humanError, money, plural, trainName } from '../format';
import { CAR, CAR_RESALE_RATE, CAR_TYPES, LOCO, type CarType } from '../../sim/config';
import { carsOf, cleanMix, totalCars } from '../../sim/cars';
import { carInfo, carStepper } from '../cars';
import { btn } from '../dom';
import { maxCarsOf } from '../models';

export function beginCars(ui: Ui, train: Train): void {
  ui.clearSelection();
  ui.selTrainId = train.id;
  ui.carsEdit = { trainId: train.id, cars: { ...train.owned } };
  ui.renderSheet();
  ui.renderRoster();
  ui.requestDraw();
}
export function renderCarsSheet(ui: Ui): void {
  const c = ui.carsEdit!;
  const train = ui.game.train(c.trainId);
  if (!train) return;
  const max = maxCarsOf(train.model);
  const total = totalCars(c.cars);
  // Types shown: those on sale, plus any the train already owns (legacy freight cars can only be removed).
  const types = CAR_TYPES.filter((t) => ui.game.carOnSale(t) || carsOf(train.owned, t) > 0);
  let cost = 0;
  let added = 0;
  let removed = 0;
  for (const t of CAR_TYPES) {
    const d = carsOf(c.cars, t) - carsOf(train.owned, t);
    if (d > 0) {
      cost += d * CAR[t].price;
      added += d;
    } else if (d < 0) {
      cost += Math.round(d * CAR[t].price * CAR_RESALE_RATE);
      removed -= d;
    }
  }
  let line = 'No change';
  if (added && !removed) line = `Adds ${plural(added, 'car')}: ${money(cost)}`;
  else if (removed && !added) line = `Takes off ${plural(removed, 'car')}: +${money(-cost)} back`;
  else if (added && removed)
    line = `Adds ${plural(added, 'car')}, takes off ${plural(removed, 'car')}: ${cost >= 0 ? money(cost) : `+${money(-cost)} back`}`;
  const broke = cost > ui.game.cash;
  const dropsOrders =
    CAR_TYPES.some((t) => carsOf(c.cars, t) < carsOf(train.owned, t)) &&
    train.stopOrders.some((o) => o !== null && CAR_TYPES.some((t) => carsOf(o, t) > carsOf(c.cars, t)));
  const bump = (t: CarType, d: number) => () => {
    const next = carsOf(c.cars, t) + d;
    if (next < 0 || (d > 0 && total >= max)) return;
    c.cars = cleanMix({ ...c.cars, [t]: next });
    ui.renderSheet();
  };
  const acts: Record<string, () => void> = {
    cancel: ui.clearSelection,
    apply: () => {
      const r = ui.game.changeCars(c.trainId, c.cars);
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
  };
  for (const t of types) {
    acts[`c-:${t}`] = bump(t, -1);
    acts[`c+:${t}`] = bump(t, 1);
  }
  const canAdd = (t: CarType) => total < max && ui.game.carOnSale(t) && CAR[t].buyable;
  ui.setSheet(
    `<div class="sheet-title">Cars for ${trainName(ui, train)}</div>` +
      `<div class="sub">${LOCO[train.model].name}: up to ${max} cars (${total} now).</div>` +
      `<div class="editor-scroll">` +
      types
        .map((t) =>
          carStepper({
            type: t,
            n: carsOf(c.cars, t),
            canDown: carsOf(c.cars, t) > 0,
            canUp: canAdd(t),
            act: 'c',
            detail: `${carInfo(t)} · ${CAR[t].buyable ? `${money(CAR[t].price)}, ${money(Math.round(CAR[t].price * CAR_RESALE_RATE))} back` : `can only be removed, ${money(Math.round(CAR[t].price * CAR_RESALE_RATE))} back`}`,
          }),
        )
        .join('') +
      `</div>` +
      `<div class="big" id="cars-price">${line}</div>` +
      (dropsOrders ? '<div class="warn">Stop orders that use more cars than this are cleared.</div>' : '') +
      (broke ? `<div class="err">Not enough cash: you have ${money(ui.game.cash)}.</div>` : '') +
      `<div class="btns">${btn('cancel', 'Cancel')}${btn('apply', 'Apply', 'primary', broke || (added === 0 && removed === 0))}</div>`,
    acts,
    true,
  );
}
