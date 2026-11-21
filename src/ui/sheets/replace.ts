import { LOCO, OVERHAUL_RATE, type LocoModel } from '../../sim/config';
import type { Train } from '../../sim/trains';
import { btn } from '../dom';
import { cargoBreakdown, humanError, loadText, money, plural, trainName } from '../format';
import { atStation, modelCard, netText, replacePreview, retireRefund } from '../models';
import type { Ui } from '../state';

export const overhaulCost = (t: Train): number => Math.round(LOCO[t.model].price * OVERHAUL_RATE);

export function overhaulTrain(ui: Ui, train: Train): void {
  const r = ui.game.overhaul(train.id);
  ui.updateHud();
  if (!r.ok) {
    ui.showToast(humanError(r.error));
    return;
  }
  ui.persist();
  ui.showToast(`${LOCO[train.model].name} overhauled for ${money(r.cost)}. Its age is back to 0.`);
  ui.renderSheet();
  ui.renderRoster();
}

export function beginReplace(ui: Ui, train: Train): void {
  if (!atStation(ui.game, train)) {
    ui.showToast(humanError('train must be at a station'));
    return;
  }
  ui.replacing = { trainId: train.id, model: null, confirm: false };
  ui.renderSheet();
}

const soldText = (p: ReturnType<typeof replacePreview>): string => {
  const parts = [
    p.soldPassenger ? plural(p.soldPassenger, 'passenger car') : '',
    p.soldFreight ? plural(p.soldFreight, 'freight car') : '',
  ].filter(Boolean);
  return parts.join(' and ');
};

/** Model picker for swapping a train's locomotive: price, trade-in, cars sold and the net cost. */
export function renderReplaceSheet(ui: Ui): void {
  const r = ui.replacing!;
  const train = ui.game.train(r.trainId);
  if (!train || !atStation(ui.game, train)) {
    ui.replacing = null;
    ui.renderSheet();
    return;
  }
  const sel = r.model;
  const p = sel ? replacePreview(ui.game, train, sel) : null;
  const broke = !!p && p.net > ui.game.cash;
  const sells = !!p && p.soldPassenger + p.soldFreight > 0;
  const acts: Record<string, () => void> = {
    back: () => {
      ui.replacing = null;
      ui.renderSheet();
    },
    unconfirm: () => {
      r.confirm = false;
      ui.renderSheet();
    },
    replace: () => {
      if (!sel) return;
      if (sells && !r.confirm) {
        r.confirm = true;
        ui.renderSheet();
        return;
      }
      const res = ui.game.replaceLocomotive(train.id, sel);
      ui.updateHud();
      if (!res.ok) {
        ui.showToast(humanError(res.error));
        return;
      }
      ui.persist();
      ui.replacing = null;
      ui.showToast(`Now pulled by a ${LOCO[sel].name}: ${netText(res.cost)}.`);
      ui.renderSheet();
      ui.renderRoster();
    },
  };
  for (const m of ui.game.modelsOnSale())
    acts[`model:${m}`] = () => {
      r.model = m;
      r.confirm = false;
      ui.renderSheet();
    };
  const card = (m: LocoModel) => {
    const q = replacePreview(ui.game, train, m);
    const sold = soldText(q);
    return modelCard(
      m,
      m === sel,
      `<span class="mc-line">Trade-in ${money(q.tradeIn)}${sold ? ` · sells ${sold} for ${money(q.resale)}` : ''}</span>` +
        `<span class="mc-line"><b>You pay ${netText(q.net)}</b></span>`,
    );
  };
  const title = `<div class="sheet-title">New locomotive for ${trainName(ui, train)}</div>`;
  if (r.confirm && p && sel) {
    ui.setSheet(
      title +
        `<div class="warn">Fitting a ${LOCO[sel].name} (up to ${LOCO[sel].maxCars} cars) sells ${soldText(p)} for ${money(p.resale)}.</div>` +
        `<div class="sub">The ${LOCO[train.model].name} goes in for ${money(p.tradeIn)}. You pay ${netText(p.net)}.</div>` +
        (broke ? `<div class="err">Not enough cash: you have ${money(ui.game.cash)}.</div>` : '') +
        `<div class="btns">${btn('unconfirm', 'Back')}${btn('replace', 'Sell cars and replace', 'primary', broke)}</div>`,
      acts,
    );
    return;
  }
  ui.setSheet(
    title +
      `<div class="sub">Cars, route and cargo stay. Your ${LOCO[train.model].name} is traded in for ${money(ui.game.tradeInValue(train))}.</div>` +
      `<div class="editor-scroll">${ui.game.modelsOnSale().map(card).join('')}</div>` +
      (broke ? `<div class="err">Not enough cash: you have ${money(ui.game.cash)}.</div>` : '') +
      `<div class="btns">${btn('back', 'Back')}${btn('replace', sel ? `Replace: ${netText(p!.net)}` : 'Pick a model', 'primary', !sel || broke)}</div>`,
    acts,
    true,
  );
}

export function beginRetire(ui: Ui, train: Train): void {
  if (!atStation(ui.game, train)) {
    ui.showToast(humanError('train must be at a station'));
    return;
  }
  ui.retiring = train.id;
  ui.renderSheet();
}

/** Confirmation before retiring a train: shows the refund and warns about cargo on board. */
export function renderRetireSheet(ui: Ui): void {
  const train = ui.game.train(ui.retiring!);
  if (!train || !atStation(ui.game, train)) {
    ui.retiring = null;
    ui.renderSheet();
    return;
  }
  const refund = retireRefund(ui.game, train);
  const cargo = loadText(train) && train.cargo.some((l) => l.units > 0);
  ui.setSheet(
    `<div class="sheet-title">Retire ${trainName(ui, train)}?</div>` +
      `<div class="info">The ${LOCO[train.model].name} and its ${plural(train.owned.passengerCars + train.owned.freightCars, 'car')} are sold for <b>${money(refund)}</b>.</div>` +
      (cargo ? `<div class="warn">The cargo on board (${cargoBreakdown(train)}) is lost.</div>` : '') +
      `<div class="btns">${btn('back', 'Keep it')}${btn('retire', `Retire for ${money(refund)}`, 'primary')}</div>`,
    {
      back: () => {
        ui.retiring = null;
        ui.renderSheet();
      },
      retire: () => {
        const name = trainName(ui, train);
        const r = ui.game.retireTrain(train.id);
        ui.updateHud();
        if (!r.ok) {
          ui.showToast(humanError(r.error));
          return;
        }
        ui.persist();
        ui.showToast(`${name} retired: ${money(-r.cost)} back.`);
        ui.clearSelection();
      },
    },
  );
}
