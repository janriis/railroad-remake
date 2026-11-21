import type { Ui } from './state';
import { type Train } from '../sim/trains';
import { loadText, money, statusText } from './format';
import { TICKS_PER_DAY } from '../sim/config';
import { stepCamAnim } from './camera';
import { ROSTER_MS, TICK_MS } from './constants';
import { draw } from './draw';
import { $ } from './dom';

export function trackIncome(ui: Ui): void {
  const year = ui.game.date.year;
  const income = ui.game.ledger.get(year)?.cargoIncome ?? 0;
  const arrived: Train[] = [];
  for (const t of ui.game.trains) {
    const seen = ui.stopCount.get(t.id);
    if (seen !== undefined && t.journeys > seen && t.lastStop) arrived.push(t);
    ui.stopCount.set(t.id, t.journeys);
  }
  if (ui.lastIncome >= 0 && year === ui.lastIncomeYear && income > ui.lastIncome && arrived.length) {
    const share = Math.round((income - ui.lastIncome) / arrived.length);
    const now = performance.now();
    for (const t of arrived)
      ui.floaters.push({ x: t.lastStop!.x + 0.5, y: t.lastStop!.y, text: `+${money(share)}`, t0: now });
  }
  ui.lastIncome = income;
  ui.lastIncomeYear = year;
}
export function afterTicks(ui: Ui): void {
  ui.updateHud();
  trackIncome(ui);
  const day = Math.floor(ui.game.time / TICKS_PER_DAY);
  if (day !== ui.lastDay) {
    ui.lastDay = day;
    ui.persist();
    if (
      (ui.selStation || ui.selIndustry || ui.ledgerOpen) &&
      !ui.routing &&
      !ui.carsEdit &&
      !ui.sendTo &&
      !ui.buy
    )
      ui.renderSheet();
  }
  // Deadlock alarm: once per incident.
  const stuck = ui.game.trains.filter((t) => t.deadlocked);
  if (stuck.length === 0) ui.alarmed.clear();
  else if (stuck.some((t) => !ui.alarmed.has(t.id))) {
    if (ui.alarmed.size === 0)
      ui.showToast(
        'Two trains are stuck head-on. Use the Double tool on that stretch so they can pass.',
        7000,
      );
    for (const t of stuck) ui.alarmed.add(t.id);
  }
  const sel = ui.selectedTrain();
  const key = sel ? `${sel.id}|${statusText(ui, sel)}|${loadText(sel)}` : '';
  if (key !== ui.lastTrainKey) {
    ui.lastTrainKey = key;
    if (sel && !ui.routing && !ui.carsEdit && !ui.sendTo) ui.renderSheet();
  }
}
export function startLoop(ui: Ui): void {
  const frame = (now: number): void => {
    requestAnimationFrame(frame);
    const dt = Math.min(now - ui.lastFrame, 250);
    ui.lastFrame = now;
    const animating = stepCamAnim(ui, now);
    if (now - ui.lastRosterAt >= ROSTER_MS) ui.renderRoster();
    if (animating && ui.paused) draw(ui, now);
    if (!ui.paused) {
      ui.acc += dt * ui.speed;
      const ticked = Math.min(Math.floor(ui.acc / TICK_MS), 48);
      ui.acc -= ticked * TICK_MS;
      if (ui.acc > TICK_MS) ui.acc = 0;
      for (let i = 0; i < ticked; i++) ui.game.tick();
      ui.renderFrac = ui.acc / TICK_MS;
      if (ticked > 0) afterTicks(ui);
      if (ticked > 0 || ui.game.trains.length > 0) draw(ui, now);
    }
    if (ui.paused && ui.floaters.length) draw(ui, now);
  };
  requestAnimationFrame(frame);
}

export function setPaused(ui: Ui, p: boolean): void {
  ui.paused = p;
  const icon = $('play-icon');
  icon.innerHTML = p ? '<path d="M8 5v14l11-7z" />' : '<path d="M7 5h4v14H7zM13 5h4v14h-4z" />';
  $('play').setAttribute('aria-label', p ? 'Play' : 'Pause');
  ui.lastFrame = performance.now();
  ui.requestDraw();
}
export function setSpeed(ui: Ui, s: number): void {
  ui.speed = s;
  for (const b of document.querySelectorAll<HTMLButtonElement>('.speed'))
    b.classList.toggle('active', Number(b.dataset.speed) === s);
}
