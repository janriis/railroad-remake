import type { Ui } from '../state';
import { type Station } from '../../sim/game';
import { CARGO_TYPES, INDUSTRY } from '../../sim/config';
import { btn } from '../dom';
import { stationName, unit } from '../format';
import { TOWN_WEIGHT_TOTAL, type Industry } from '../../sim/cargo';
import { INDUSTRY_LABELS } from '../render';

export function stationInfoHtml(ui: Ui, st: Station): string {
  let h = '';
  const waiting = CARGO_TYPES.map((c) => [c, ui.game.waitingAt(st, c)] as const).filter(([, n]) => n > 0);
  h += `<div class="info"><b>Waiting:</b> ${
    waiting.length ? waiting.map(([c, n]) => `${unit(n)} ${c}`).join(', ') : 'nothing right now'
  }</div>`;
  const towns = ui.game.towns
    .map((t) => [t, ui.game.townCoverage(t).get(st) ?? 0] as const)
    .filter(([, w]) => w > 0);
  if (towns.length)
    h += `<div class="info"><b>Serves:</b> ${towns
      .map(
        ([t, w]) =>
          `${t.name} (${Math.round((w / TOWN_WEIGHT_TOTAL) * 100)}% of the town, pop. ${unit(t.population)})`,
      )
      .join(', ')}</div>`;
  const inds = ui.game.industriesServedBy(st);
  if (inds.length)
    h += `<div class="info"><b>Industries:</b><ul class="plain">${inds.map((i) => `<li>${industryLine(i)}</li>`).join('')}</ul></div>`;
  if (!towns.length && !inds.length)
    h += '<div class="info sub">No town or industry is within reach of this station.</div>';
  return h;
}
export function industryLine(i: Industry): string {
  const d = INDUSTRY[i.kind];
  const flow = d.input ? `takes ${d.input}, makes ${d.output}` : `makes ${d.output}`;
  return `${INDUSTRY_LABELS[i.kind]}: ${flow}${i.stock > 0 ? ` (${unit(i.stock)} ${d.output} waiting)` : ''}`;
}
export function industryInfoHtml(ui: Ui, i: Industry): string {
  const d = INDUSTRY[i.kind];
  const covering = [...ui.game.stations.values()].filter((s) => ui.game.industriesServedBy(s).includes(i));
  let h = `<div class="sheet-title">${INDUSTRY_LABELS[i.kind]}</div>`;
  h += `<div class="info"><b>Makes:</b> ${d.output}${d.input ? ` (${d.in} ${d.input} become ${d.out})` : ` (${d.perMonth} a month)`}</div>`;
  if (d.input)
    h += `<div class="info"><b>Takes:</b> ${d.input} (${unit(i.input)} waiting to be processed, ${unit(i.received)} received so far)</div>`;
  h += `<div class="info"><b>Stock waiting:</b> ${unit(i.stock)} ${d.output}</div>`;
  h += covering.length
    ? `<div class="info"><b>Served by:</b> ${covering.map((s) => stationName(ui, s)).join(', ')}</div>`
    : '<div class="warn">No station reaches this yet. Build a station within reach to move its cargo.</div>';
  return h;
}

export function renderStationInfo(ui: Ui, st: Station): void {
  ui.setSheet(
    `<div class="sheet-title">${stationName(ui, st)} station</div>` +
      `<div class="sub">${st.size[0]!.toUpperCase() + st.size.slice(1)} station, reaches ${st.radius} tile${st.radius === 1 ? '' : 's'} around it (shown on the map).</div>` +
      stationInfoHtml(ui, st) +
      `<div class="btns">${btn('close', 'Close')}</div>`,
    { close: () => ui.clearSelection() },
    true,
  );
}

export function renderIndustryInfo(ui: Ui, i: Industry): void {
  ui.setSheet(
    industryInfoHtml(ui, i) + `<div class="btns">${btn('close', 'Close')}</div>`,
    { close: () => ui.clearSelection() },
    true,
  );
}
