import type { Ui } from '../state';
import { emptyLedgerYear, profit, type LedgerYear } from '../../sim/economy';
import { money, signed } from '../format';
import { btn } from '../dom';

export function renderLedger(ui: Ui): void {
  const yr = ui.game.date.year;
  const cur = ui.game.ledger.get(yr) ?? emptyLedgerYear();
  const prev = ui.game.ledger.get(yr - 1) ?? emptyLedgerYear();
  const rows: [string, keyof LedgerYear][] = [
    ['Cargo income', 'cargoIncome'],
    ['Goods sales', 'goodsSales'],
    ['Construction', 'construction'],
    ['Rolling stock', 'rollingStock'],
    ['Track maintenance', 'trackMaintenance'],
    ['Train running', 'trainRunning'],
    ['Building upkeep', 'buildingUpkeep'],
    ['Interest', 'interest'],
  ];
  const fin: [string, keyof LedgerYear][] = [
    ['Financing in', 'financingIn'],
    ['Financing out', 'financingOut'],
  ];
  const cell = (n: number): string =>
    `<td class="${n < 0 ? 'neg' : n > 0 ? 'pos' : ''}">${n === 0 ? '$0' : signed(n)}</td>`;
  const costs = ui.game.monthlyRunningCosts();
  ui.setSheet(
    `<div class="sheet-title">Ledger</div>` +
      `<table class="ledger"><thead><tr><th></th><th>${yr}</th><th>${yr - 1}</th></tr></thead><tbody>` +
      rows
        .map(([label, k]) => `<tr><th scope="row">${label}</th>${cell(cur[k])}${cell(prev[k])}</tr>`)
        .join('') +
      `<tr class="total"><th scope="row">Profit / loss</th>${cell(profit(cur))}${cell(profit(prev))}</tr>` +
      fin
        .map(
          ([label, k]) =>
            `<tr class="fin-row"><th scope="row">${label}</th>${cell(cur[k])}${cell(prev[k])}</tr>`,
        )
        .join('') +
      `</tbody></table>` +
      `<div class="sub">Financing (bonds, shares, dividends) is not part of profit.</div>` +
      `<div class="sub">Running costs next month-end: ${money(costs.trackMaintenance + costs.trainRunning)} (track ${money(costs.trackMaintenance)}, trains ${money(costs.trainRunning)})</div>` +
      `<div class="btns">${btn('company', 'Company')}${btn('close', 'Close')}</div>`,
    {
      company: () => {
        ui.ledgerOpen = false;
        ui.companyOpen = true;
        ui.renderSheet();
      },
      close: () => ui.clearSelection(),
    },
    true,
  );
}
export function toggleLedger(ui: Ui): void {
  const was = ui.ledgerOpen;
  ui.setTool('pan');
  if (was) return;
  ui.ledgerOpen = true;
  ui.renderSheet();
}
