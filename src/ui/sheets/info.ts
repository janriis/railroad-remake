import type { Ui } from '../state';
import { type Station } from '../../sim/game';
import {
  BUILDING,
  BUILDING_KINDS,
  BUILDING_REFUND_RATE,
  BUILDING_SLOTS,
  CAR,
  CARGO_TYPES,
  DEPOSIT_CAP_MONTHS,
  INDUSTRY,
  TOWN_DEMAND,
  isDeposit,
  type BuildingKind,
} from '../../sim/config';
import { btn } from '../dom';
import { carsFor } from '../cars';
import { humanError, money, stationName, unit } from '../format';
import { TOWN_WEIGHT_TOTAL, type Industry } from '../../sim/cargo';
import { INDUSTRY_LABELS } from '../render';

export function stationInfoHtml(ui: Ui, st: Station): string {
  let h = '';
  const waiting = CARGO_TYPES.map((c) => [c, ui.game.waitingAt(st, c)] as const).filter(([, n]) => n > 0);
  h += `<div class="info"><b>Waiting:</b> ${
    waiting.length
      ? waiting
          .map(
            ([c, n]) =>
              `${unit(n)} ${c} — ${carsFor(c)
                .map((t) => CAR[t].name)
                .join(' or ')}`,
          )
          .join('; ')
      : 'nothing right now'
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

const kindName = (k: BuildingKind): string => {
  const n = k.replaceAll('-', ' ');
  return n[0]!.toUpperCase() + n.slice(1);
};
const flow = (k: BuildingKind): string => {
  const d = BUILDING[k];
  return d.input === d.output
    ? `takes ${d.input}, sells it to the town`
    : `takes ${d.input} → makes ${d.output}`;
};

/** Buildings, free slots and the served town's monthly demand. */
export function buildingsHtml(ui: Ui, st: Station): string {
  const slots = BUILDING_SLOTS[st.size];
  const town = ui.game.servedTown(st);
  let h = `<div class="info"><b>Buildings:</b> ${st.buildings.length} of ${slots} slot${slots === 1 ? '' : 's'} used</div>`;
  if (!town) h += `<div class="info sub">This station serves no town, so it can't hold buildings.</div>`;
  if (st.buildings.length)
    h += `<ul class="plain buildings">${st.buildings
      .map((b) => {
        const d = BUILDING[b.kind];
        const made = b.kind === 'coal-yard' ? 'sold' : 'made';
        return `<li><b>${kindName(b.kind)}</b>: ${unit(b.input)} ${d.input} waiting, ${unit(b.lastMade)} ${d.output} ${made} last month, upkeep ${money(d.upkeep)}/month ${btn(`demolish-${b.kind}`, 'Demolish', 'small')}</li>`;
      })
      .join('')}</ul>`;
  if (town) {
    const rows = (Object.keys(TOWN_DEMAND) as (keyof typeof TOWN_DEMAND)[]).map((c) => {
      const bought = ui.game.townDemand(town, c);
      const sold = town.soldThisMonth[c]?.units ?? 0;
      return `${c[0]!.toUpperCase() + c.slice(1)} ${unit(sold)}/${unit(bought)}`;
    });
    h += `<div class="info"><b>${town.name} bought this month:</b> ${rows.join(', ')}</div>`;
  }
  return h;
}

function buildPaneHtml(ui: Ui, st: Station): string {
  const town = ui.game.servedTown(st);
  const full = st.buildings.length >= BUILDING_SLOTS[st.size];
  const opts = BUILDING_KINDS.map((k) => {
    const d = BUILDING[k];
    const has = st.buildings.some((b) => b.kind === k);
    const why = !town
      ? "This station serves no town, so it can't hold buildings."
      : has
        ? 'Already built here.'
        : full
          ? 'No free building slot.'
          : d.cost > ui.game.cash
            ? 'Not enough cash.'
            : '';
    return `<button type="button" class="opt wide" data-act="build-${k}"${why ? ' disabled' : ''}>
        <span>${kindName(k)} · ${money(d.cost)}</span>
        <small>${flow(k)} · upkeep ${money(d.upkeep)}/month</small>${why ? `<small>${why}</small>` : ''}</button>`;
  }).join('');
  return `<div class="sheet-title">Build in ${stationName(ui, st)}</div><div class="opts list">${opts}</div>`;
}

export function buildBuilding(ui: Ui, st: Station, kind: BuildingKind): void {
  const r = ui.game.buildStationBuilding(st.at, kind);
  ui.updateHud();
  if (r.ok) ui.persist();
  ui.showToast(r.ok ? `Built a ${kind.replaceAll('-', ' ')} for ${money(r.cost)}` : humanError(r.error));
  ui.stationPane = 'info';
  ui.renderSheet();
  ui.requestDraw();
}
export function demolishBuilding(ui: Ui, st: Station, kind: BuildingKind): void {
  const r = ui.game.demolishStationBuilding(st.at, kind);
  ui.updateHud();
  if (r.ok) ui.persist();
  ui.showToast(
    r.ok ? `Demolished the ${kind.replaceAll('-', ' ')}, got ${money(r.cost)} back` : humanError(r.error),
  );
  ui.stationPane = 'info';
  ui.renderSheet();
  ui.requestDraw();
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
  if (d.input) h += `<div class="info"><b>Makes:</b> ${d.output} (${d.in} ${d.input} become ${d.out})</div>`;
  if (d.input)
    h += `<div class="info"><b>Takes:</b> ${d.input} (${unit(i.input)} waiting to be processed, ${unit(i.received)} received so far)</div>`;
  if (d.input === undefined && isDeposit(i.kind))
    h += `<div class="info"><b>Deposit</b> · produces ${d.perMonth} ${d.output}/month · stock ${unit(i.stock)}/${unit(d.perMonth * DEPOSIT_CAP_MONTHS)}</div>`;
  else h += `<div class="info"><b>Stock waiting:</b> ${unit(i.stock)} ${d.output}</div>`;
  h += covering.length
    ? `<div class="info"><b>Served by:</b> ${covering.map((s) => stationName(ui, s)).join(', ')}</div>`
    : '<div class="warn">No station reaches this yet. Build a station within reach to move its cargo.</div>';
  return h;
}

export function renderStationInfo(ui: Ui, st: Station): void {
  const head =
    `<div class="sheet-title">${stationName(ui, st)} station</div>` +
    `<div class="sub">${st.size[0]!.toUpperCase() + st.size.slice(1)} station, reaches ${st.radius} tile${st.radius === 1 ? '' : 's'} around it (shown on the map).</div>`;
  const pane = ui.stationPane;
  if (pane === 'build') {
    const acts: Record<string, () => void> = {
      back: () => {
        ui.stationPane = 'info';
        ui.renderSheet();
      },
    };
    for (const k of BUILDING_KINDS) acts[`build-${k}`] = () => buildBuilding(ui, st, k);
    ui.setSheet(buildPaneHtml(ui, st) + `<div class="btns">${btn('back', 'Back')}</div>`, acts, true);
    return;
  }
  if (pane.startsWith('demolish:')) {
    const kind = pane.slice('demolish:'.length) as BuildingKind;
    const refund = Math.round(BUILDING[kind].cost * BUILDING_REFUND_RATE);
    ui.setSheet(
      `<div class="sheet-title">Demolish the ${kind.replaceAll('-', ' ')}?</div>` +
        `<div class="info">You get ${money(refund)} back (${Math.round(BUILDING_REFUND_RATE * 100)}% of ${money(BUILDING[kind].cost)}). Input waiting in it is lost.</div>` +
        `<div class="btns">${btn('back', 'Keep it')}${btn('confirm-demolish', 'Demolish', 'primary')}</div>`,
      {
        back: () => {
          ui.stationPane = 'info';
          ui.renderSheet();
        },
        'confirm-demolish': () => demolishBuilding(ui, st, kind),
      },
    );
    return;
  }
  const acts: Record<string, () => void> = {
    close: () => ui.clearSelection(),
    build: () => {
      ui.stationPane = 'build';
      ui.renderSheet();
    },
  };
  for (const b of st.buildings)
    acts[`demolish-${b.kind}`] = () => {
      ui.stationPane = `demolish:${b.kind}`;
      ui.renderSheet();
    };
  ui.setSheet(
    head +
      stationInfoHtml(ui, st) +
      buildingsHtml(ui, st) +
      `<div class="btns">${btn('build', 'Build…')}${btn('close', 'Close')}</div>`,
    acts,
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
