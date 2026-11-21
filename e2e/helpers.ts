import { expect, type Page, type TestInfo } from '@playwright/test';
import { Game, type SaveData } from '../src/sim/game';

/**
 * Fixtures
 * --------
 * Saves are built in Node with the real sim and injected into localStorage before the app
 * boots (key `railroadsim.save.v2`). The app centres the camera on `towns[0]`, so every
 * fixture lays its straight, level track in a row three tiles above that town, spanning
 * x = town.x - 6 .. town.x + 6. On a phone (zoom ~ width / 16) that is ~16 tiles across,
 * so the whole line is on screen, clear of the HUD (top) and the sheet (bottom).
 *
 * Tile -> screen: the app exposes `window.railroadsim.tileToClient(x, y)` (it applies the
 * real camera, including clamping and zoom), so tests never re-implement the camera maths.
 */
export const SEED = 15;
export const SAVE_KEY = 'railroadsim.save.v2';
export type C = { x: number; y: number };

export function newGame(): Game {
  return Game.generate({ width: 64, height: 64, seed: SEED });
}

/** The fixture row: `at(dx)` is the tile dx columns right of the first town, three rows up. */
export function row(game: Game): (dx: number) => C {
  const t = game.towns[0]!;
  return (dx) => ({ x: t.x + dx, y: t.y - 3 });
}

function mustOk(r: { ok: boolean; error?: string }, what: string): void {
  if (!r.ok) throw new Error(`fixture: ${what}: ${(r as { error: string }).error}`);
}

export interface FixtureOpts {
  track?: boolean;
  /** dx offsets (from the first town) of small stations on the line. */
  stations?: number[];
  /** Trains: where (dx) they stand, plus an optional route as dx offsets (stations). */
  trains?: { at: number; route?: number[] }[];
}

export function fixtureSave(opts: FixtureOpts = {}): SaveData {
  const g = newGame();
  const at = row(g);
  if (opts.track) mustOk(g.connect(at(-6), at(6)), 'connect');
  for (const dx of opts.stations ?? []) mustOk(g.buildStation('small', at(dx)), `station ${dx}`);
  for (const t of opts.trains ?? []) {
    // addTrain is the no-cost fixture API; setRoute is the real command.
    const train = g.addTrain({ at: at(t.at), passengerCars: 2 });
    if (t.route) mustOk(g.setRoute(train.id, t.route.map(at)), 'route');
  }
  return g.toSave();
}

/** Moves a save to the start of `year` (360-day years); trains keep their purchase time, so they age. */
export function atYear(save: SaveData, year: number): SaveData {
  return { ...save, time: (year - 1850) * 360 * 24 };
}

/** Boots the app with `save` in localStorage and waits until the HUD is up. */
export async function boot(page: Page, save: SaveData): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    // Failed resource loads are reported below with their URL (the console text has none).
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource'))
      errors.push(`console.error: ${m.text()}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push(`http ${r.status()}: ${r.url()}`);
  });
  await page.addInitScript(
    ([key, json]) => {
      // Seed once; later reloads keep whatever the app has saved since.
      if (!localStorage.getItem('e2e.seeded')) {
        localStorage.setItem(key!, json!);
        localStorage.setItem('e2e.seeded', '1');
      }
    },
    [SAVE_KEY, JSON.stringify(save)],
  );
  await page.goto('/');
  await expect(page.locator('#cash')).toContainText('$');
  await page.waitForFunction(() => !!(window as unknown as { railroadsim?: unknown }).railroadsim);
  return errors;
}

export const cashOf = async (page: Page): Promise<number> => {
  const t = (await page.locator('#cash').textContent()) ?? '';
  const n = Number(t.replace(/[^0-9]/g, ''));
  return t.includes('−') ? -n : n;
};

export const savedGame = (page: Page): Promise<SaveData> =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);

export const isTouch = (info: TestInfo): boolean => !!info.project.use.hasTouch;

/** Screen position of a tile centre (CSS px), from the app's own camera. */
export function tilePos(page: Page, c: C): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ({ x, y }) =>
      (
        window as unknown as { railroadsim: { tileToClient(x: number, y: number): { x: number; y: number } } }
      ).railroadsim.tileToClient(x, y),
    c,
  );
}

/** Tap a map tile: a real touch tap on the phone project, a mouse click on desktop. */
export async function tapTile(page: Page, info: TestInfo, c: C): Promise<void> {
  const p = await tilePos(page, c);
  if (isTouch(info)) await page.touchscreen.tap(p.x, p.y);
  else await page.mouse.click(p.x, p.y);
}

export const tool = (page: Page, name: string) => page.locator(`.tool[data-tool="${name}"]`);
export const act = (page: Page, name: string) => page.locator(`#sheet [data-act="${name}"]`);
export const trainRow = (page: Page, n = 0) => page.locator('#roster-rows .train-item').nth(n);

/** Fast-forward: 4x speed, running. */
export async function runFast(page: Page): Promise<void> {
  await page.locator('.speed[data-speed="4"]').click();
  await expect(page.locator('#play')).toHaveAttribute('aria-label', 'Pause');
}

export const liveTrains = (page: Page) =>
  page.evaluate(() =>
    (
      window as unknown as {
        railroadsim: { game: { trains: { journeys: number; lastStop: C | null; deadlocked: boolean }[] } };
      }
    ).railroadsim.game.trains.map((t) => ({
      journeys: t.journeys,
      lastStop: t.lastStop,
      deadlocked: t.deadlocked,
    })),
  );

/**
 * A real vertical drag of a handle. On the phone project this dispatches CDP touch events
 * (touchStart/Move/End), which Chrome turns into pointer events the same way a finger does,
 * including touch-action handling (page.touchscreen only offers tap).
 */
export async function dragHandle(page: Page, info: TestInfo, from: C, toY: number): Promise<void> {
  const steps = 12;
  if (!isTouch(info)) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (let i = 1; i <= steps; i++) await page.mouse.move(from.x, from.y + ((toY - from.y) * i) / steps);
    await page.mouse.up();
    return;
  }
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', y: number) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x: from.x, y }],
    });
  await touch('touchStart', from.y);
  for (let i = 1; i <= steps; i++) {
    await touch('touchMove', from.y + ((toY - from.y) * i) / steps);
    await page.waitForTimeout(16);
  }
  await touch('touchEnd', toY);
  await cdp.detach();
}
