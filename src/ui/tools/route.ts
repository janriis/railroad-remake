import type { Ui } from '../state';
import { type Train } from '../../sim/trains';

export function beginRouting(ui: Ui, train: Train): void {
  ui.startTile = null;
  ui.preview = null;
  ui.tp = null;
  ui.stationTile = null;
  ui.buy = null;
  ui.carsEdit = null;
  ui.selStation = null;
  ui.selIndustry = null;
  ui.sendTo = null;
  ui.ledgerOpen = false;
  ui.selTrainId = train.id;
  ui.routing = {
    trainId: train.id,
    stops: train.route.map((c) => ({ ...c })),
    orders: train.route.map((_, i) => {
      const o = train.stopOrders[i];
      return o ? { ...o } : null;
    }),
    picking: train.route.length === 0,
    picker: null,
    error: null,
  };
  ui.renderSheet();
  ui.renderRoster();
  ui.requestDraw();
}
export function cancelRouting(ui: Ui): void {
  ui.routing = null;
  ui.renderSheet();
  ui.renderRoster();
  ui.requestDraw();
}
export function undoStop(ui: Ui): void {
  if (!ui.routing) return;
  ui.routing.stops.pop();
  ui.routing.orders.pop();
  ui.routing.error = null;
  ui.renderSheet();
  ui.requestDraw();
}
export function finishPicking(ui: Ui): void {
  if (!ui.routing) return;
  ui.routing.picking = false;
  ui.routing.error = null;
  ui.renderSheet();
  ui.requestDraw();
}
export function saveRoute(ui: Ui): void {
  if (!ui.routing) return;
  const r = ui.game.setRoute(ui.routing.trainId, ui.routing.stops, ui.routing.orders);
  if (!r.ok) {
    ui.routing.error = r.error;
    ui.renderSheet();
    return;
  }
  ui.persist();
  ui.routing = null;
  ui.showToast('Route saved.');
  ui.renderSheet();
  ui.renderRoster();
  ui.requestDraw();
}
