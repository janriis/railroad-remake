import { btn } from '../dom';
import {
  ageText,
  cargoBreakdown,
  loadText,
  modelName,
  money,
  plural,
  routeList,
  stationNameAt,
  statusText,
  trainName,
} from '../format';
import { atStation, retireRefund } from '../models';
import { beginReplace, beginRetire, overhaulCost, overhaulTrain } from './replace';
import type { Ui } from '../state';
import { beginRouting } from '../tools/route';
import type { Train } from '../../sim/trains';
import { beginCars } from './cars';
import { beginSend, cancelTripOf } from './send';

/** The sheet for the selected train: status, load, route and the Cars / Send / Route buttons. */
export function renderTrainSheet(ui: Ui, train: Train): void {
  const g = ui.game;
  const worn = g.isWornOut(train);
  const here = atStation(g, train);
  const cost = overhaulCost(train);
  const onSale = g.onSale(train.model);
  let why = '';
  if (!here) why = 'Overhaul, replace and retire need the train to stand at a station.';
  else if (!onSale)
    why = `The ${modelName(train)} is no longer on sale, so it cannot be overhauled. Replace it instead.`;
  const overhaulOff = !here || !onSale || cost > g.cash;
  ui.setSheet(
    `<div class="sheet-title">${trainName(ui, train)} <span class="pill${train.deadlocked || g.isBrokenDown(train) ? ' bad' : ''}">${statusText(ui, train)}</span>${worn ? ' <span class="pill muted">Worn out</span>' : ''}</div>` +
      `<div class="sub"><b>${modelName(train)}</b> · ${ageText(ui, train)} · ${money(g.locoRunningCost(train))}/month to run` +
      (worn ? ` · ${Math.round(g.breakdownChance(train) * 100)}% chance of a breakdown each month` : '') +
      `</div>` +
      `<div class="sub">${plural(train.passengerCars, 'passenger car')}, ${plural(train.freightCars, 'freight car')}` +
      (loadText(train) ? ` · ${loadText(train)}` : '') +
      `</div>` +
      (cargoBreakdown(train) ? `<div class="sub">Carrying ${cargoBreakdown(train)}</div>` : '') +
      (train.trip
        ? `<div>On a trip to <b>${stationNameAt(ui, train.trip)}</b>, then back to its route.</div>`
        : '') +
      (train.route.length >= 2
        ? `<div>Stops: ${routeList(ui, train.route)}</div>`
        : '<div>This train has no route yet.</div>') +
      `<div class="btns">${btn('overhaul', `Overhaul ${money(cost)}`, '', overhaulOff)}${btn('replace', 'Replace…', worn ? 'primary' : '', !here)}${btn('retire', `Retire ${money(retireRefund(g, train))}`, '', !here)}</div>` +
      (why
        ? `<div class="sub" id="wear-why">${why}</div>`
        : here && onSale
          ? '<div class="sub">An overhaul sets its age back to 0.</div>'
          : '') +
      `<div class="btns">${btn('close', 'Close')}${btn('cars', 'Cars')}${train.trip ? btn('cancel-trip', 'Cancel trip') : btn('send', 'Send to…')}${btn('route', 'Route', 'primary')}</div>`,
    {
      overhaul: () => overhaulTrain(ui, train),
      retire: () => beginRetire(ui, train),
      replace: () => beginReplace(ui, train),
      close: () => ui.clearSelection(),
      cars: () => beginCars(ui, train),
      route: () => beginRouting(ui, train),
      send: () => beginSend(ui, train),
      'cancel-trip': () => cancelTripOf(ui, train),
    },
  );
}
