import type { Ui } from '../state';
import { type Station } from '../../sim/game';
import { type Train } from '../../sim/trains';
import { trainPoses } from '../render';
import { cheapestOnSale } from '../models';
import { screenToWorld } from '../camera';
import { sameCoord } from '../../sim/types';
import { sendToStation } from '../sheets/send';
import { nearestTown, planBetween } from './track';
import { computePreview } from './line';

export function stationNear(ui: Ui, wx: number, wy: number): Station | null {
  const reach = Math.max(0.7, 24 / ui.cam.zoom);
  let best: Station | null = null;
  let bd = reach;
  for (const s of ui.game.stations.values()) {
    const d = Math.hypot(wx - (s.at.x + 0.5), wy - (s.at.y + 0.5));
    if (d <= bd) {
      bd = d;
      best = s;
    }
  }
  return best;
}
export function trainNear(ui: Ui, wx: number, wy: number): Train | null {
  const reach = Math.max(0.7, 24 / ui.cam.zoom);
  let best: Train | null = null;
  let bd = reach;
  for (const t of ui.game.trains) {
    const p = trainPoses(t, 0)[0]!;
    const d = Math.hypot(wx - p.x, wy - p.y);
    if (d <= bd) {
      bd = d;
      best = t;
    }
  }
  return best;
}
export function handleTap(ui: Ui, sx: number, sy: number): void {
  const w = screenToWorld(ui, sx, sy);
  const t = { x: Math.floor(w.x), y: Math.floor(w.y) };
  if (ui.routing) {
    const st = stationNear(ui, w.x, w.y);
    if (!st) {
      ui.showToast('Tap a station to add it to the route.');
      return;
    }
    const last = ui.routing.stops[ui.routing.stops.length - 1];
    if (last && sameCoord(last, st.at)) {
      ui.showToast('That is already the last stop. Pick a different station.');
      return;
    }
    ui.routing.stops.push({ ...st.at });
    ui.routing.orders.push(null);
    ui.routing.error = null;
    ui.routing.picker = null;
    ui.renderSheet();
    ui.renderRoster();
    if (!ui.routing.picking) {
      const sc = ui.sheetMsg.querySelector('.editor-scroll');
      if (sc) sc.scrollTop = sc.scrollHeight;
    }
    ui.requestDraw();
    return;
  }
  if (ui.sendTo) {
    const st = stationNear(ui, w.x, w.y);
    const train = ui.game.train(ui.sendTo.trainId);
    if (!st || !train) {
      ui.showToast('Tap a station, or pick one from the list.');
      return;
    }
    sendToStation(ui, train, st);
    return;
  }
  if (ui.tool === 'pan') {
    const train = trainNear(ui, w.x, w.y);
    if (train) {
      ui.clearSelection();
      ui.selTrainId = train.id;
    } else {
      const st = stationNear(ui, w.x, w.y);
      ui.clearSelection();
      ui.selStation = st;
      if (!st) ui.selIndustry = ui.game.industryAt(t) ?? null;
    }
    ui.renderSheet();
    ui.requestDraw();
    return;
  }
  if (ui.tool === 'train') {
    const st = stationNear(ui, w.x, w.y);
    if (!st) {
      ui.showToast('Tap a station to buy a train there.');
      return;
    }
    ui.buy = { at: { ...st.at }, model: cheapestOnSale(ui.game), cars: {} };
    ui.renderSheet();
    ui.requestDraw();
    return;
  }
  if (!ui.game.map.inBounds(t)) return;
  if (ui.tool === 'station') {
    if (ui.game.isStation(t)) {
      ui.showToast('There is already a station here.');
      return;
    }
    if (!ui.game.track.touches(t)) {
      ui.showToast('A station has to sit on track. Tap a tile that has track.');
      return;
    }
    ui.stationTile = t;
    ui.renderSheet();
    ui.requestDraw();
    return;
  }
  // Track, bridge, double, demolish: two taps.
  const tile = ui.tool === 'track' ? nearestTown(ui, t) : t;
  if (ui.tool === 'double' && (!ui.startTile || ui.preview) && !ui.game.track.touches(tile)) {
    ui.showToast('Double track upgrades existing track. Tap a tile that has track.');
    return;
  }
  if (ui.startTile && !ui.preview && !ui.tp && sameCoord(ui.startTile, tile)) {
    ui.clearSelection();
    return;
  }
  if (!ui.startTile || ui.preview || ui.tp) {
    ui.startTile = tile;
    ui.preview = null;
    ui.tp = null;
  } else if (ui.tool === 'track') {
    planBetween(ui, ui.startTile, tile);
  } else {
    ui.preview = computePreview(ui, ui.startTile, tile);
  }
  ui.renderSheet();
  ui.requestDraw();
}
