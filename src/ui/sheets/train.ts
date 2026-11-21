import { btn } from '../dom';
import { cargoBreakdown, loadText, plural, routeList, stationNameAt, statusText, trainName } from '../format';
import type { Ui } from '../state';
import { beginRouting } from '../tools/route';
import type { Train } from '../../sim/trains';
import { beginCars } from './cars';
import { beginSend, cancelTripOf } from './send';

/** The sheet for the selected train: status, load, route and the Cars / Send / Route buttons. */
export function renderTrainSheet(ui: Ui, train: Train): void {
  ui.setSheet(
    `<div class="sheet-title">${trainName(ui, train)} <span class="pill${train.deadlocked ? ' bad' : ''}">${statusText(ui, train)}</span></div>` +
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
      `<div class="btns">${btn('close', 'Close')}${btn('cars', 'Cars')}${train.trip ? btn('cancel-trip', 'Cancel trip') : btn('send', 'Send to…')}${btn('route', 'Route', 'primary')}</div>`,
    {
      close: () => ui.clearSelection(),
      cars: () => beginCars(ui, train),
      route: () => beginRouting(ui, train),
      send: () => beginSend(ui, train),
      'cancel-trip': () => cancelTripOf(ui, train),
    },
  );
}
