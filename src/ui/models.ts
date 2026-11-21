import { CAR_KEEP_ORDER, CAR_RESALE_RATE, LOCO, LOCO_MODELS, type LocoModel } from '../sim/config';
import { carsOf, cleanMix, mixValue, totalCars, type CarMix } from '../sim/cars';
import type { Game } from '../sim/game';
import type { Train } from '../sim/trains';
import { money } from './format';

export const maxCarsOf = (model: LocoModel): number => LOCO[model].maxCars;

/** The cheapest model on sale: what the buy sheet starts on. */
export function cheapestOnSale(game: Game): LocoModel {
  const on = game.modelsOnSale();
  return on.reduce((a, b) => (LOCO[b].price < LOCO[a].price ? b : a), on[0] ?? LOCO_MODELS[0]);
}

/** Whether the train stands still on a station tile (the only place to overhaul or replace). */
export const atStation = (game: Game, t: Train): boolean => !t.next && game.isStation(t.at);

export interface ReplacePreview {
  price: number;
  tradeIn: number;
  /** Cars sold because the new locomotive pulls fewer. */
  sold: CarMix;
  soldCount: number;
  resale: number;
  /** New price minus trade-in minus resale; negative means money back. */
  net: number;
}

/** Mirrors `Game.replaceLocomotive`: cars are kept in `CAR_KEEP_ORDER`, extras are sold at the resale rate. */
export function replacePreview(game: Game, t: Train, model: LocoModel): ReplacePreview {
  let room = LOCO[model].maxCars;
  const sold: CarMix = {};
  for (const type of CAR_KEEP_ORDER) {
    const have = carsOf(t.owned, type);
    const keep = Math.min(have, room);
    room -= keep;
    if (have > keep) sold[type] = have - keep;
  }
  const resale = mixValue(sold, CAR_RESALE_RATE);
  const tradeIn = game.tradeInValue(t);
  return {
    price: LOCO[model].price,
    tradeIn,
    sold: cleanMix(sold),
    soldCount: totalCars(sold),
    resale,
    net: LOCO[model].price - tradeIn - resale,
  };
}

export const netText = (n: number): string => (n < 0 ? `${money(n)} back` : money(n));

/** A tappable model card: name, speed, cars, price, running cost and working life. */
export function modelCard(model: LocoModel, selected: boolean, extra = ''): string {
  const m = LOCO[model];
  return (
    `<button type="button" class="model-card${selected ? ' on' : ''}" data-act="model:${model}" aria-pressed="${selected}">` +
    `<span class="mc-top"><b>${m.name}</b><span>${money(m.price)}</span></span>` +
    `<span class="mc-line">${m.tilesPerDay} tiles/day · up to ${m.maxCars} cars</span>` +
    `<span class="mc-line">${money(m.running)}/month to run · lasts ${m.life} years</span>` +
    extra +
    `</button>`
  );
}

/** Mirrors `Game.retireTrain`: trade-in for the locomotive plus resale of every car. */
export const retireRefund = (game: Game, t: Train): number =>
  game.tradeInValue(t) + mixValue(t.owned, CAR_RESALE_RATE);
