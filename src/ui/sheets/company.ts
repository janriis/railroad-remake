import type { Ui } from '../state';
import {
  BOND_BASE_RATE_PCT,
  BOND_PRINCIPAL,
  BOND_RATE_STEP_PCT,
  BUYBACK_PRICE_RATE,
  COMPANY_SHARE_LOT,
  MAX_BONDS,
  NEW_SHARE_PRICE_RATE,
  PLAYER_SHARE_LOT,
} from '../../sim/config';
import type { CommandResult } from '../../sim/types';
import { btn } from '../dom';
import { humanError, money, signed, unit } from '../format';

const signedMoney = (n: number): string => (n < 0 ? '−' : '') + money(n);
const price = (cents: number): string => `$${(cents / 100).toFixed(2)}`;
/** Exactly the sim's rounding: whole dollars for `shares` at the price times `rate`. */
const shareMoney = (cents: number, shares: number, rate = 1): number =>
  Math.round((shares * cents * rate) / 100);

/** The share price history as an inline SVG line chart. */
function chart(history: number[], now: number): string {
  const pts = history.length ? history : [now];
  const w = 300;
  const h = 90;
  const pad = 6;
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  const span = Math.max(hi - lo, 1);
  const x = (i: number): number => (pts.length === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (pts.length - 1));
  const y = (v: number): number => h - pad - ((v - lo) / span) * (h - 2 * pad);
  const line = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const dots = pts
    .map(
      (v, i) =>
        `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="9" class="hit"><title>Month ${i + 1}: ${price(v)}</title></circle>`,
    )
    .join('');
  return (
    `<svg class="pchart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Share price by month end, from ${price(lo)} to ${price(hi)}" preserveAspectRatio="none">` +
    `<path d="${line}" class="pline" vector-effect="non-scaling-stroke"/>` +
    `${dots}</svg>` +
    `<div class="chart-axis"><span>Low ${price(lo)}</span><span>${history.length ? `${history.length} month${history.length === 1 ? '' : 's'}` : 'First month end pending'}</span><span>High ${price(hi)}</span></div>`
  );
}

function action(ui: Ui, run: () => CommandResult, done: string): void {
  const r = run();
  if (!r.ok) ui.showToast(humanError(r.error), 4000);
  else {
    ui.showToast(done);
    ui.persist();
  }
  ui.updateHud();
  ui.renderSheet();
}

const row = (label: string, value: string, cls = ''): string =>
  `<tr><th scope="row">${label}</th><td class="${cls}">${value}</td></tr>`;

/** A button and, when disabled, the reason under it. */
const guarded = (act: string, label: string, reason: string | null, kind = ''): string =>
  `<div class="fin-act">${btn(act, label, kind, reason !== null)}${reason ? `<div class="sub">${reason}</div>` : ''}</div>`;

export function renderCompany(ui: Ui): void {
  const g = ui.game;
  const c = g.sharePriceCents;
  const hist = g.priceHistory;
  const prev = hist.length >= 2 ? hist[hist.length - 2]! : null;
  const delta = prev === null ? null : c - prev;
  const deltaTxt =
    delta === null
      ? 'no change yet'
      : `${delta < 0 ? '−' : delta > 0 ? '+' : ''}${price(Math.abs(delta))} since last month`;
  const stake = g.sharesOutstanding ? (g.playerShares / g.sharesOutstanding) * 100 : 0;
  const op = g.operatingProfit();
  const nextRate = BOND_BASE_RATE_PCT + BOND_RATE_STEP_PCT * g.bonds.length;

  // Bonds
  const worst = g.bonds.reduce((m, b) => Math.max(m, b.ratePct), 0);
  const repayCost = g.bonds.find((b) => b.ratePct === worst)?.principal ?? 0;
  const bondList = g.bonds.length
    ? `<ul class="plain">${g.bonds
        .map(
          (b) =>
            `<li>${money(b.principal)} at ${b.ratePct}%: ${money(Math.round((b.principal * b.ratePct) / 100 / 12))}/month</li>`,
        )
        .join('')}</ul>`
    : '<div class="sub">No bonds outstanding.</div>';
  const issueReason = g.bonds.length >= MAX_BONDS ? 'Credit limit reached' : null;
  const repayReason = !g.bonds.length ? 'No bonds to repay' : repayCost > g.cash ? 'Not enough cash' : null;

  // Shares
  const sellNew = shareMoney(c, COMPANY_SHARE_LOT, NEW_SHARE_PRICE_RATE);
  const buyBack = shareMoney(c, COMPANY_SHARE_LOT, BUYBACK_PRICE_RATE);
  const buyMine = shareMoney(c, PLAYER_SHARE_LOT);
  const buyBackReason =
    g.publicShares < COMPANY_SHARE_LOT
      ? 'Not enough public shares'
      : buyBack > g.cash
        ? 'Not enough cash'
        : null;
  const buyMineReason =
    g.publicShares < PLAYER_SHARE_LOT
      ? 'Not enough public shares'
      : buyMine > g.personalCash
        ? 'Not enough personal cash'
        : null;
  const sellMineReason = g.playerShares < PLAYER_SHARE_LOT ? 'You have no shares to sell' : null;

  // Dividend
  const d = g.dividendCents;
  const divTotal = Math.round((g.sharesOutstanding * d) / 100);
  const divMine = Math.round((g.playerShares * d) / 100);
  const skip = d > 0 && g.cash - divTotal < 0;

  ui.setSheet(
    `<div class="editor-scroll" id="company-scroll">` +
      `<div class="sheet-title">Company</div>` +
      `<div class="fin-price"><span class="big">${price(c)}</span> <span class="sub ${delta !== null && delta < 0 ? 'neg' : delta ? 'pos' : ''}">${deltaTxt}</span></div>` +
      chart(hist, c) +
      `<table class="ledger fin"><tbody>` +
      row('Shares outstanding', unit(g.sharesOutstanding)) +
      row('Your stake', `${stake.toFixed(1)}% (${unit(g.playerShares)})`) +
      row('Personal cash', signedMoney(g.personalCash)) +
      row('Net worth', money(g.netWorth()), 'strong') +
      `</tbody></table>` +
      `<div class="sheet-title sm">Equity ${signedMoney(g.equity())}</div>` +
      `<table class="ledger fin"><tbody>` +
      row('Cash', signedMoney(g.cash), g.cash < 0 ? 'neg' : '') +
      row('Assets', money(g.assetValue())) +
      row('Debt', g.debt ? '−' + money(g.debt) : '$0', g.debt ? 'neg' : '') +
      row('Operating profit, 12 months', op === 0 ? '$0' : signed(op), op < 0 ? 'neg' : op > 0 ? 'pos' : '') +
      `</tbody></table>` +
      `<div class="sheet-title sm">Bonds (${g.bonds.length} of ${MAX_BONDS}), debt ${money(g.debt)}</div>` +
      bondList +
      `<div class="fin-grid">` +
      guarded('issue-bond', `Issue bond (${money(BOND_PRINCIPAL)} at ${nextRate}%)`, issueReason) +
      guarded('repay-bond', `Repay most expensive (${money(repayCost)})`, repayReason) +
      `</div>` +
      `<div class="sheet-title sm">Shares</div>` +
      `<div class="sub">Company (${unit(g.publicShares)} held by the public)</div>` +
      `<div class="fin-grid">` +
      guarded('sell-new', `Sell ${unit(COMPANY_SHARE_LOT)} new shares (+${money(sellNew)})`, null) +
      guarded('buy-back', `Buy back ${unit(COMPANY_SHARE_LOT)} (−${money(buyBack)})`, buyBackReason) +
      `</div>` +
      `<div class="sub">You</div>` +
      `<div class="fin-grid">` +
      guarded('buy-mine', `Buy ${unit(PLAYER_SHARE_LOT)} (${money(buyMine)})`, buyMineReason) +
      guarded('sell-mine', `Sell ${unit(PLAYER_SHARE_LOT)} (+${money(buyMine)})`, sellMineReason) +
      `</div>` +
      `<div class="sheet-title sm">Dividend per share, paid at year end</div>` +
      `<div class="stepper" role="group" aria-label="Dividend per share">` +
      btn('div-m5', '−5¢', '', d === 0) +
      btn('div-m1', '−1¢', '', d < 1) +
      `<output id="div-val" class="div-val">${price(d)}</output>` +
      btn('div-p1', '+1¢') +
      btn('div-p5', '+5¢') +
      `</div>` +
      `<div class="sub">Year-end total ${money(divTotal)}, your part ${money(divMine)}.</div>` +
      (skip
        ? `<div class="sub warn">Cash is ${signedMoney(g.cash)}, so this dividend would be skipped.</div>`
        : '') +
      (g.restructurings
        ? `<div class="sub">Restructured ${g.restructurings} time${g.restructurings === 1 ? '' : 's'}.</div>`
        : '') +
      `</div>` +
      `<div class="btns">${btn('ledger', 'Ledger')}${btn('close', 'Close', 'primary')}</div>`,
    {
      'issue-bond': () => action(ui, () => g.issueBond(), `Bond issued: +${money(BOND_PRINCIPAL)}`),
      'repay-bond': () => action(ui, () => g.repayBond(), `Bond repaid: −${money(repayCost)}`),
      'sell-new': () =>
        action(ui, () => g.sellNewShares(COMPANY_SHARE_LOT), `Sold new shares: +${money(sellNew)}`),
      'buy-back': () =>
        action(ui, () => g.buyBackShares(COMPANY_SHARE_LOT), `Bought back shares: −${money(buyBack)}`),
      'buy-mine': () =>
        action(
          ui,
          () => g.buySharesAsPlayer(PLAYER_SHARE_LOT),
          `You bought ${unit(PLAYER_SHARE_LOT)} shares`,
        ),
      'sell-mine': () =>
        action(ui, () => g.sellSharesAsPlayer(PLAYER_SHARE_LOT), `You sold ${unit(PLAYER_SHARE_LOT)} shares`),
      'div-m5': () =>
        action(ui, () => g.setDividend(Math.max(0, d - 5)), `Dividend ${price(Math.max(0, d - 5))}`),
      'div-m1': () =>
        action(ui, () => g.setDividend(Math.max(0, d - 1)), `Dividend ${price(Math.max(0, d - 1))}`),
      'div-p1': () => action(ui, () => g.setDividend(d + 1), `Dividend ${price(d + 1)}`),
      'div-p5': () => action(ui, () => g.setDividend(d + 5), `Dividend ${price(d + 5)}`),
      ledger: () => {
        ui.companyOpen = false;
        ui.ledgerOpen = true;
        ui.renderSheet();
      },
      close: () => ui.clearSelection(),
    },
    true,
  );
}

export function toggleCompany(ui: Ui): void {
  ui.setTool('pan');
  ui.companyOpen = true;
  ui.renderSheet();
}

/** Toasts each new notice once; the first call after a (re)load only records what exists. */
export function trackNotices(ui: Ui): void {
  const n = ui.game.notices;
  if (ui.noticesSeen === null) ui.noticesSeen = n.length;
  while (ui.noticesSeen < n.length) ui.showToast(n[ui.noticesSeen++]!, 7000);
}
