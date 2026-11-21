import { expect, test } from '@playwright/test';
import {
  act,
  boot,
  cashOf,
  dragHandle,
  fixtureSave,
  liveTrains,
  newGame,
  row,
  runFast,
  savedGame,
  tapTile,
  tilePos,
  tool,
  trainRow,
} from './helpers';

const at = row(newGame());

test('1. loads clean with the HUD and all seven tools inside the viewport', async ({ page }) => {
  const errors = await boot(page, fixtureSave());
  await expect(page.locator('#date')).toContainText('1850');
  const tools = page.locator('#toolbar .tool');
  await expect(tools).toHaveCount(7);
  const names = await tools.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.tool));
  expect(names).toEqual(['pan', 'track', 'bridge', 'double', 'demolish', 'station', 'train']);
  const vp = page.viewportSize()!;
  for (const el of await tools.all()) {
    await expect(el).toBeVisible();
    const b = (await el.boundingBox())!;
    expect(b.x, 'tool left edge').toBeGreaterThanOrEqual(0);
    expect(b.x + b.width, 'tool right edge').toBeLessThanOrEqual(vp.width);
    expect(b.y + b.height, 'tool bottom edge').toBeLessThanOrEqual(vp.height);
  }
  const overflow = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    iw: window.innerWidth,
    bw: document.body.scrollWidth,
  }));
  expect(overflow.sw, 'no horizontal scroll').toBeLessThanOrEqual(overflow.iw);
  expect(overflow.bw).toBeLessThanOrEqual(overflow.iw);
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('2. Track tool: tap two tiles, see the quote, build, cash goes down', async ({ page }, info) => {
  await boot(page, fixtureSave());
  const before = await cashOf(page);
  await tool(page, 'track').click();
  await tapTile(page, info, at(-3));
  await expect(page.locator('#sheet-msg')).toContainText('now tap the end');
  await tapTile(page, info, at(3));
  const build = act(page, 'build');
  await expect(build).toBeVisible();
  await expect(page.locator('#sheet-msg .big')).toContainText('$');
  // The sheet must not sit on top of the toolbar.
  const s = (await page.locator('#sheet').boundingBox())!;
  const tb = (await page.locator('#toolbar').boundingBox())!;
  expect(s.y + s.height).toBeLessThanOrEqual(tb.y + 1);
  await build.click();
  await expect(page.locator('#toast')).toContainText('Built');
  expect(await cashOf(page)).toBeLessThan(before);
  expect((await savedGame(page)).segments.length).toBeGreaterThan(0);
});

test('3. Station + train: build, buy, route, then it runs and completes journeys', async ({ page }, info) => {
  await boot(page, fixtureSave({ track: true }));
  const cash0 = await cashOf(page);
  // Two stations.
  for (const dx of [-5, 5]) {
    await tool(page, 'station').click();
    await tapTile(page, info, at(dx));
    await expect(page.locator('#sheet-msg')).toContainText('Build a station here');
    await act(page, 'size-small').click();
    await expect(page.locator('#toast')).toContainText('station');
  }
  expect((await savedGame(page)).stations).toHaveLength(2);
  // Buy a train at the first one.
  await tool(page, 'train').click();
  await tapTile(page, info, at(-5));
  await expect(page.locator('#sheet-msg')).toContainText('Buy a train');
  await act(page, 'buy').click();
  await expect(page.locator('#sheet-msg')).toContainText('Add stops');
  // Pick the route on the map: first station, then the other, Done, Save.
  await tapTile(page, info, at(-5));
  await tapTile(page, info, at(5));
  await act(page, 'done').click();
  await act(page, 'save').click();
  await expect(page.locator('#toast')).toContainText('Route saved');
  expect(await cashOf(page)).toBeLessThan(cash0);
  await expect(page.locator('#roster-title')).toHaveText('Trains (1)');
  await runFast(page);
  await expect(trainRow(page).locator('.status')).toHaveText('Running');
  await expect
    .poll(async () => (await liveTrains(page))[0]?.journeys, { timeout: 20_000 })
    .toBeGreaterThanOrEqual(1);
  expect((await liveTrains(page))[0]!.lastStop).not.toBeNull();
});

test('4. Double track frees two trains stuck head-on', async ({ page }, info) => {
  const save = fixtureSave({
    track: true,
    stations: [-6, 6],
    trains: [
      { at: -3, route: [6, -6] },
      { at: 3, route: [-6, 6] },
    ],
  });
  await boot(page, save);
  await runFast(page);
  await expect(trainRow(page, 0).locator('.status')).toHaveText('Stuck', { timeout: 20_000 });
  await expect(trainRow(page, 1).locator('.status')).toHaveText('Stuck');
  const cash0 = await cashOf(page);
  await tool(page, 'track').click();
  await tapTile(page, info, at(-6));
  await tapTile(page, info, at(6));
  await expect(page.locator('#sheet-msg')).toContainText('Already connected');
  await act(page, 'upgrade').click();
  await expect(page.locator('#toast')).toContainText('Doubled');
  expect(await cashOf(page)).toBeLessThan(cash0);
  await tool(page, 'pan').click();
  await expect(trainRow(page, 0).locator('.status')).toHaveText('Running', { timeout: 20_000 });
  await expect(trainRow(page, 1).locator('.status')).toHaveText('Running');
  await expect
    .poll(async () => (await liveTrains(page)).every((t) => t.journeys >= 1 && !t.deadlocked), {
      timeout: 30_000,
    })
    .toBe(true);
});

test('5. Route editor: drag a stop by its handle, save, order changes', async ({ page }, info) => {
  await boot(
    page,
    fixtureSave({ track: true, stations: [-6, 0, 6], trains: [{ at: -6, route: [-6, 0, 6] }] }),
  );
  // Pause so the camera and train do not move under us.
  await page.locator('#play').click();
  await trainRow(page).locator('[data-ract="route"]').click();
  await expect(page.locator('#sheet-msg')).toContainText('Route for');
  const rows = page.locator('#sheet .stoprow');
  await expect(rows).toHaveCount(3);
  const before = (await savedGame(page)).trains[0]!.route.map((c) => c.x);
  expect(before).toEqual([at(-6).x, at(0).x, at(6).x]);
  const grip = (await page.locator('#sheet [data-grip="0"]').boundingBox())!;
  const third = (await rows.nth(2).boundingBox())!;
  await dragHandle(
    page,
    info,
    { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 },
    third.y + third.height - 4,
  );
  // The editor itself should now show the moved order (first stop went to the end).
  await expect(rows.last().locator('b')).toContainText('3.');
  await act(page, 'save').click();
  await expect(page.locator('#toast')).toContainText('Route saved');
  const after = (await savedGame(page)).trains[0]!.route.map((c) => c.x);
  expect(after).toEqual([at(0).x, at(6).x, at(-6).x]);
});

test('6. Send to…: send a train, see the trip, cancel it', async ({ page }) => {
  await boot(page, fixtureSave({ track: true, stations: [-6, 6], trains: [{ at: -6, route: [-6, 6] }] }));
  await page.locator('#play').click(); // pause: nothing arrives while we look
  await trainRow(page).locator('[data-ract="send"]').click();
  await expect(page.locator('#sheet-msg')).toContainText('Send Train 1 to');
  const picks = page.locator('#sheet [data-act^="go-"]');
  await expect(picks).toHaveCount(2);
  await picks.last().click();
  // Both layouts show the trip on the selected-train sheet.
  await expect(page.locator('#sheet-msg')).toContainText('On a trip to');
  if (page.viewportSize()!.width >= 720) {
    // Wide layout: the roster stays visible beside the sheet.
    await expect(trainRow(page).locator('.trip-text')).toContainText('Trip to ');
    await expect(trainRow(page).locator('.status')).toHaveText('On trip');
    await trainRow(page).locator('[data-ract="cancel-trip"]').click();
    await expect(trainRow(page).locator('.trip-line')).toBeHidden();
  } else {
    // Phone: the sheet replaces the roster while it is open.
    await expect(page.locator('#roster')).toBeHidden();
    await act(page, 'cancel-trip').click();
  }
  await expect(page.locator('#toast')).toContainText('back on its route');
});

test('7. Ledger opens from the cash box and closes again', async ({ page }) => {
  await boot(page, fixtureSave());
  await page.locator('.cash-box').click();
  await expect(page.locator('#sheet-msg .sheet-title')).toHaveText('Ledger');
  await expect(page.locator('#sheet-msg table.ledger')).toBeVisible();
  await act(page, 'close').click();
  await expect(page.locator('#sheet')).toBeHidden();
});

// Keeps `tilePos` exercised so a camera/API change fails loudly in one place.
test('hook: tileToClient lands inside the viewport for the fixture row', async ({ page }) => {
  await boot(page, fixtureSave());
  const vp = page.viewportSize()!;
  for (const dx of [-6, 6]) {
    const p = await tilePos(page, at(dx));
    expect(p.x).toBeGreaterThan(0);
    expect(p.x).toBeLessThan(vp.width);
    expect(p.y).toBeGreaterThan(100);
    expect(p.y).toBeLessThan(vp.height - 200);
  }
});
