import type { Ui } from '../state';
import { CAR, CAR_TYPES, LOCO, type CarType, type LocoModel } from '../../sim/config';
import { carsOf, cleanMix, totalCars } from '../../sim/cars';
import { carInfo, carStepper, trimMix } from '../cars';
import { maxCarsOf, modelCard } from '../models';
import { humanError, money, stationNameAt } from '../format';
import { btn } from '../dom';
import { beginRouting } from './route';

/** Car types the player can buy right now. */
export const buyableCars = (ui: Ui): CarType[] => CAR_TYPES.filter((t) => ui.game.carOnSale(t));

export function renderBuy(ui: Ui): void {
  const b = ui.buy!;
  const max = maxCarsOf(b.model);
  const price = ui.game.trainPrice({ at: b.at, locomotive: true, model: b.model, cars: b.cars });
  const total = totalCars(b.cars);
  const broke = price > ui.game.cash;
  const types = buyableCars(ui);
  ui.setSheet(
    `<div class="sheet-title">Buy a train at ${stationNameAt(ui, b.at)}</div>` +
      `<div class="sub">Pick a locomotive (${LOCO[b.model].name}: up to ${max} cars).</div>` +
      `<div class="editor-scroll">` +
      ui.game
        .modelsOnSale()
        .map((m) => modelCard(m, m === b.model))
        .join('') +
      `</div>` +
      `<div class="sub">Cars: ${total} of ${max}</div>` +
      types
        .map((t) =>
          carStepper({
            type: t,
            n: carsOf(b.cars, t),
            canDown: carsOf(b.cars, t) > 0,
            canUp: total < max,
            act: 'c',
            detail: `${carInfo(t)} · ${money(CAR[t].price)}`,
          }),
        )
        .join('') +
      `<div class="big">${money(price)}</div>` +
      (broke ? `<div class="err">Not enough cash: you have ${money(ui.game.cash)}.</div>` : '') +
      `<div class="btns">${btn('cancel', 'Cancel')}${btn('buy', 'Buy train', 'primary', broke)}</div>`,
    {
      cancel: ui.clearSelection,
      buy: () => buyTrain(ui),
      ...Object.fromEntries(
        ui.game.modelsOnSale().map((m) => [`model:${m}`, () => pickModel(ui, m)] as const),
      ),
      ...Object.fromEntries(
        types.flatMap((t) => [
          [`c-:${t}`, () => step(ui, t, -1)] as const,
          [`c+:${t}`, () => step(ui, t, 1)] as const,
        ]),
      ),
    },
    true,
  );
}
export function pickModel(ui: Ui, model: LocoModel): void {
  if (!ui.buy) return;
  ui.buy.model = model;
  // Drop cars from the end of the keep order until the train fits the new limit.
  ui.buy.cars = trimMix(ui.buy.cars, maxCarsOf(model));
  ui.renderSheet();
}
export function step(ui: Ui, type: CarType, d: number): void {
  if (!ui.buy) return;
  const next = carsOf(ui.buy.cars, type) + d;
  if (next < 0 || (d > 0 && totalCars(ui.buy.cars) >= maxCarsOf(ui.buy.model))) return;
  ui.buy.cars = cleanMix({ ...ui.buy.cars, [type]: next });
  ui.renderSheet();
}
export function buyTrain(ui: Ui): void {
  if (!ui.buy) return;
  const r = ui.game.buyTrain({
    at: ui.buy.at,
    locomotive: true,
    model: ui.buy.model,
    cars: ui.buy.cars,
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
