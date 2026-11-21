import { sameCoord, type Coord } from '../../sim/types';
import { type Preview, type Ui } from '../state';
import { btn } from '../dom';
import { humanError, money, plural } from '../format';
import { straightPath } from '../../sim/track';

const err = (path: Coord[], message: string): Preview => ({
  path,
  ok: false,
  html: `<div class="err">${humanError(message)}</div>`,
  affected: [],
});
export function computePreview(ui: Ui, a: Coord, b: Coord): Preview {
  if (sameCoord(a, b)) return err([a], 'path too short');
  if (ui.tool === 'double') {
    const dp = ui.game.doublingPath(a, b);
    if (typeof dp === 'string') return err([a, b], dp);
    const q = ui.game.quoteDoubleTrack(a, b);
    if (!q.ok) return err(dp, q.error);
    let n = 0;
    for (let i = 1; i < dp.length; i++) if (!ui.game.track.isDouble(dp[i - 1]!, dp[i]!)) n++;
    if (q.cost > ui.game.cash)
      return err(dp, `not enough cash: it costs ${money(q.cost)} and you have ${money(ui.game.cash)}`);
    return {
      path: dp,
      ok: true,
      html: `<div class="big">${money(q.cost)}</div><div class="sub">Double ${plural(n, 'segment')}: trains can pass each other here</div>`,
      affected: [],
    };
  }
  const path = straightPath(a, b);
  if (!path)
    return err(
      [a, b],
      ui.tool === 'bridge' ? 'a bridge must be a straight line over water' : 'not a straight line',
    );
  if (ui.tool === 'bridge') {
    const q = ui.game.quoteBridge(a, b);
    if (!q.ok) return err(path, q.error);
    if (q.cost === 0) return err(path, 'track is already there');
    if (q.cost > ui.game.cash)
      return err(path, `not enough cash: it costs ${money(q.cost)} and you have ${money(ui.game.cash)}`);
    return {
      path,
      ok: true,
      html: `<div class="big">${money(q.cost)}</div><div class="sub">Bridge over ${plural(path.length - 2, 'water tile')}</div>`,
      affected: [],
    };
  }
  const affected: [Coord, Coord][] = [];
  let refund = 0;
  for (let i = 1; i < path.length; i++) {
    const [p, q] = [path[i - 1]!, path[i]!];
    if (ui.game.track.has(p, q)) {
      affected.push([p, q]);
      refund += ui.game.demolishRefund(p, q);
    }
  }
  if (!affected.length) return err(path, 'no track to demolish');
  return {
    path,
    ok: true,
    html: `<div class="big">+${money(refund)}</div><div class="sub">Refund for tearing up ${plural(affected.length, 'segment')}</div>`,
    affected,
  };
}
export function confirm(ui: Ui): void {
  if (!ui.startTile || !ui.preview || !ui.preview.ok) return;
  const a = ui.startTile;
  const b = ui.preview.path[ui.preview.path.length - 1]!;
  let message: string;
  if (ui.tool === 'bridge') {
    const r = ui.game.buildBridge(a, b);
    message = r.ok ? `Built a bridge for ${money(r.cost)}` : humanError(r.error);
  } else if (ui.tool === 'double') {
    const r = ui.game.doubleTrack(a, b);
    message = r.ok ? `Doubled the track for ${money(r.cost)}` : humanError(r.error);
  } else {
    const r = ui.game.demolishTrack(a, b);
    message = r.ok ? `Refunded ${money(r.cost)}` : humanError(r.error);
  }
  ui.refreshSegs();
  ui.updateHud();
  ui.persist();
  ui.showToast(message);
  ui.clearSelection();
}

/** The sheet for the Bridge, Double and Demolish tools (hint while picking, preview once both ends are set). */
export function renderLineSheet(ui: Ui): void {
  const name = { bridge: 'Bridge', double: 'Double track', demolish: 'Demolish' }[
    ui.tool as 'bridge' | 'double' | 'demolish'
  ];
  const cancel = btn('cancel', 'Cancel');
  if (ui.preview) {
    ui.setSheet(
      ui.preview.html +
        `<div class="btns">${cancel}${btn('confirm', 'Confirm', 'primary', !ui.preview.ok)}</div>`,
      { cancel: ui.clearSelection, confirm: () => confirm(ui) },
    );
  } else {
    const hint =
      ui.tool === 'double'
        ? ui.startTile
          ? 'now tap the end tile on the same line of track'
          : 'tap a start tile on existing track. Trains can pass each other on double track.'
        : ui.startTile
          ? 'now tap the end tile'
          : 'tap the start tile';
    ui.setSheet(`<b>${name}:</b> ${hint}`, { cancel: ui.clearSelection });
    if (ui.startTile) ui.sheetMsg.insertAdjacentHTML('beforeend', `<div class="btns">${cancel}</div>`);
  }
}
