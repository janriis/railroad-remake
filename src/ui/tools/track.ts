import type { Ui } from '../state';
import { btn } from '../dom';
import { humanError, money, plural } from '../format';
import { type Coord } from '../../sim/types';
import { type TrackPlan } from '../../sim/planner';

export function renderTrackSheet(ui: Ui): void {
  const cancel = btn('cancel', 'Cancel');
  if (!ui.startTile) {
    ui.setSheet('<b>Track:</b> tap the start (towns snap into place)', {});
    return;
  }
  if (!ui.tp) {
    ui.setSheet(`<b>Track:</b> now tap the end`, { cancel: ui.clearSelection });
    ui.sheetMsg.insertAdjacentHTML('beforeend', `<div class="btns">${cancel}</div>`);
    return;
  }
  if (ui.tp.error) {
    ui.setSheet(`<div class="err">${humanError(ui.tp.error)}</div><div class="btns">${cancel}</div>`, {
      cancel: ui.clearSelection,
    });
    return;
  }
  const plan = ui.tp.view === 'alt' ? ui.tp.alt! : ui.tp.main!;
  const broke = plan.cost > ui.game.cash;
  const short = broke
    ? `<div class="err">Not enough cash: it costs ${money(plan.cost)} and you have ${money(ui.game.cash)}.</div>`
    : '';
  // Existing single track between the same two tiles can be upgraded to double track.
  const [pa, pb] = [plan.path[0]!, plan.path[plan.path.length - 1]!];
  const dq = ui.game.quoteDoubleTrack(pa, pb);
  const upgrade = (): void => {
    const r = ui.game.doubleTrack(pa, pb);
    ui.refreshSegs();
    ui.updateHud();
    if (r.ok) ui.persist();
    ui.showToast(r.ok ? `Doubled the track for ${money(r.cost)}` : humanError(r.error));
    ui.clearSelection();
  };
  const upBtn = dq.ok
    ? btn('upgrade', `Upgrade to double track — ${money(dq.cost)}`, 'primary', dq.cost > ui.game.cash)
    : '';
  if (plan.newSegments === 0) {
    const dbl = !dq.ok && dq.error === 'already double track';
    ui.setSheet(
      `<div class="big">Already connected</div><div class="sub">There is track along this whole route.${dbl ? ' It is already double track.' : ''}</div>` +
        (dq.ok && dq.cost > ui.game.cash
          ? `<div class="err">Not enough cash to double it: ${money(dq.cost)}.</div>`
          : '') +
        `<div class="btns">${cancel}${upBtn}</div>`,
      { cancel: ui.clearSelection, upgrade },
    );
    return;
  }
  if (plan.bridges.length === 0) {
    const around = ui.tp.view === 'alt' ? 'Going around the water. ' : '';
    ui.setSheet(
      `<div class="big">${money(plan.cost)}</div><div class="sub">${around}${plural(plan.newSegments, 'new segment')}</div>${short}` +
        `<div class="btns">${cancel}${upBtn.replace('primary', '')}${btn('build', 'Build', 'primary', broke)}</div>`,
      { cancel: ui.clearSelection, upgrade, build: () => buildPlan(ui, plan, false) },
    );
    return;
  }
  const bridgeCost = plan.bridges.reduce((s, b) => s + b.cost, 0);
  const n = plan.bridges.length;
  ui.setSheet(
    `<div class="sheet-title">This route crosses water.</div>` +
      `<div>It needs ${plural(n, 'bridge')} (${money(bridgeCost)} of the ${money(plan.cost)} total).</div>${short}` +
      `<div class="btns">${cancel}${ui.tp.alt ? btn('around', 'Go around') : ''}${btn('build', 'Build with bridge', 'primary', broke)}</div>`,
    {
      cancel: ui.clearSelection,
      around: () => {
        if (!ui.tp?.alt) return;
        ui.tp.view = 'alt';
        setTrackPreview(ui, ui.tp.alt);
        ui.renderSheet();
        ui.requestDraw();
      },
      build: () => buildPlan(ui, plan, true),
    },
  );
}
export const nearestTown = (ui: Ui, t: Coord): Coord => {
  let best: Coord | null = null;
  let bd = Infinity;
  for (const town of ui.game.towns) {
    const cheb = Math.max(Math.abs(town.x - t.x), Math.abs(town.y - t.y));
    if (cheb > 1) continue;
    const d = cheb * 10 + Math.hypot(town.x - t.x, town.y - t.y);
    if (d < bd) {
      bd = d;
      best = town;
    }
  }
  return best ? { x: best.x, y: best.y } : t;
};
export function setTrackPreview(ui: Ui, plan: TrackPlan): void {
  ui.preview = {
    path: [...plan.path],
    ok: true,
    html: '',
    affected: [],
    bridgeSegs: [...plan.bridgeSegments],
  };
}
export function planBetween(ui: Ui, a: Coord, b: Coord): void {
  const main = ui.game.planTrack(a, b);
  if (!main.ok) {
    ui.tp = { main: null, alt: null, view: 'main', error: main.error };
    ui.preview = { path: [a, b], ok: false, html: '', affected: [] };
    return;
  }
  let alt: TrackPlan | null = null;
  if (main.plan.bridges.length > 0) {
    const land = ui.game.planTrack(a, b, { bridges: false });
    if (land.ok) alt = land.plan;
  }
  ui.tp = { main: main.plan, alt, view: 'main', error: null };
  setTrackPreview(ui, main.plan);
}
export function buildPlan(ui: Ui, plan: TrackPlan, confirmBridges: boolean): void {
  const r = ui.game.buildPlannedTrack(plan, { confirmBridges });
  ui.refreshSegs();
  ui.updateHud();
  ui.persist();
  ui.showToast(
    r.ok
      ? r.cost === 0
        ? 'Nothing to build'
        : `Built ${plural(plan.newSegments, 'segment')} for ${money(r.cost)}`
      : humanError(r.error),
  );
  ui.clearSelection();
}
