import type { Ui } from '../state';
import { renderLineSheet } from '../tools/line';
import { renderStationSheet } from '../tools/station';
import { renderTrackSheet } from '../tools/track';
import { renderBuy } from '../tools/train';
import { renderCarsSheet } from './cars';
import { renderIndustryInfo, renderStationInfo } from './info';
import { renderLedger } from './ledger';
import { renderPicking, renderRouteEditor } from './route';
import { renderSendSheet } from './send';
import { renderTrainSheet } from './train';

/** Draws whichever bottom sheet the current selection and tool call for. */
export function renderSheet(ui: Ui): void {
  if (ui.routing) {
    if (ui.routing.picking) renderPicking(ui);
    else renderRouteEditor(ui);
    return;
  }
  if (ui.carsEdit) {
    renderCarsSheet(ui);
    return;
  }
  if (ui.sendTo) {
    renderSendSheet(ui);
    return;
  }
  if (ui.ledgerOpen) {
    renderLedger(ui);
    return;
  }
  if (ui.buy) {
    renderBuy(ui);
    return;
  }
  const train = ui.selectedTrain();
  if (train) {
    renderTrainSheet(ui, train);
    return;
  }
  if (ui.selStation) {
    renderStationInfo(ui, ui.selStation);
    return;
  }
  if (ui.selIndustry) {
    renderIndustryInfo(ui, ui.selIndustry);
    return;
  }
  if (ui.tool === 'pan') {
    ui.sheet.classList.add('hidden');
    return;
  }
  if (ui.tool === 'track') return renderTrackSheet(ui);
  if (ui.tool === 'station') return renderStationSheet(ui);
  if (ui.tool === 'train') {
    ui.setSheet('<b>Train:</b> tap a station to buy a train there', {});
    return;
  }
  renderLineSheet(ui);
}

/** Routes clicks on `[data-act]` buttons to the handlers the current sheet registered. */
export function initSheet(ui: Ui): void {
  ui.sheet.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el || (el as HTMLButtonElement).disabled) return;
    ui.actions[el.dataset.act!]?.();
  });
}
