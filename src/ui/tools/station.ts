import type { Ui } from '../state';
import { btn } from '../dom';
import { STATION, STATION_SIZES, type StationSize } from '../../sim/config';
import { humanError, money } from '../format';

export function renderStationSheet(ui: Ui): void {
  const cancel = btn('cancel', 'Cancel');
  if (!ui.stationTile) {
    ui.setSheet('<b>Station:</b> tap a tile that has track', {});
    return;
  }
  const opts = STATION_SIZES.map((size) => {
    const { cost, radius } = STATION[size];
    return `<button type="button" class="opt" data-act="size-${size}"${cost > ui.game.cash ? ' disabled' : ''}>
        <span>${size[0]!.toUpperCase() + size.slice(1)}</span><span>${money(cost)}</span><small>reaches ${radius}</small></button>`;
  }).join('');
  const acts: Record<string, () => void> = { cancel: ui.clearSelection };
  for (const size of STATION_SIZES) acts[`size-${size}`] = () => buildStationOf(ui, size);
  ui.setSheet(
    `<div class="sheet-title">Build a station here</div><div class="opts">${opts}</div><div class="btns">${cancel}</div>`,
    acts,
  );
}
export function buildStationOf(ui: Ui, size: StationSize): void {
  if (!ui.stationTile) return;
  const r = ui.game.buildStation(size, ui.stationTile);
  ui.updateHud();
  if (r.ok) ui.persist();
  ui.showToast(r.ok ? `Built a ${size} station for ${money(r.cost)}` : humanError(r.error));
  ui.clearSelection();
}
