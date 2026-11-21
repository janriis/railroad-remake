import type { Ui } from '../state';
import { type Train } from '../../sim/trains';
import { humanError, stationName, trainName } from '../format';
import { btn } from '../dom';
import { type Station } from '../../sim/game';

export function beginSend(ui: Ui, train: Train): void {
  ui.clearSelection();
  ui.selTrainId = train.id;
  ui.sendTo = { trainId: train.id };
  ui.renderSheet();
  ui.renderRoster();
  ui.requestDraw();
}
export function renderSendSheet(ui: Ui): void {
  const train = ui.game.train(ui.sendTo!.trainId);
  if (!train) return;
  const acts: Record<string, () => void> = { cancel: ui.clearSelection };
  let list = '<div class="picker" role="group" aria-label="Choose a station">';
  [...ui.game.stations.values()].forEach((st, k) => {
    acts[`go-${k}`] = () => sendToStation(ui, train, st);
    list += `<button type="button" class="segbtn" data-act="go-${k}">${stationName(ui, st)}</button>`;
  });
  list += '</div>';
  ui.setSheet(
    `<div class="sheet-title">Send ${trainName(ui, train)} to…</div>` +
      `<div class="sub">Pick a station below or tap one on the map. It goes there once, then back to its route.</div>` +
      `<div class="editor-scroll">${list}</div>` +
      `<div class="btns">${btn('cancel', 'Cancel')}</div>`,
    acts,
    true,
  );
}
export function sendToStation(ui: Ui, train: Train, st: Station): void {
  const r = ui.game.sendTrainTo(train.id, st.at);
  if (!r.ok) {
    ui.showToast(humanError(r.error));
    return;
  }
  ui.persist();
  ui.showToast(`${trainName(ui, train)} is heading to ${stationName(ui, st)}.`);
  ui.sendTo = null;
  ui.selTrainId = train.id;
  ui.renderSheet();
  ui.renderRoster();
  ui.requestDraw();
}
export function cancelTripOf(ui: Ui, train: Train): void {
  const r = ui.game.cancelTrip(train.id);
  if (!r.ok) {
    ui.showToast(humanError(r.error));
    return;
  }
  ui.persist();
  ui.showToast(`${trainName(ui, train)} is back on its route.`);
  ui.renderSheet();
  ui.renderRoster();
  ui.requestDraw();
}
