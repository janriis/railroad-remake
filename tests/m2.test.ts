import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/game';
import { MinHeap } from '../src/sim/heap';

describe('MinHeap', () => {
  it('pops by key, ties in insertion order', () => {
    const h = new MinHeap<string>();
    [
      [3, 'c'],
      [1, 'a1'],
      [2, 'b'],
      [1, 'a2'],
    ].forEach(([k, v]) => h.push(k as number, v as string));
    expect([h.pop(), h.pop(), h.pop(), h.pop()].map((x) => x!.value)).toEqual(['a1', 'a2', 'b', 'c']);
  });
});

describe('route planner on generated maps', () => {
  it('connects towns quickly and every suggestion is buildable as priced', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const game = Game.generate({ width: 64, height: 64, seed, startingCash: 1e9 });
      const [a, b] = game.towns;
      const start = performance.now();
      const planned = game.planTrack(a!, b!);
      expect(performance.now() - start, `seed ${seed} too slow`).toBeLessThan(100);
      if (!planned.ok) continue; // e.g. towns separated by wide water
      const result = game.buildPlannedTrack(planned.plan, { confirmBridges: true });
      expect(result).toEqual({ ok: true, cost: planned.plan.cost });
      // Re-planning over the built track is free.
      const again = game.planTrack(a!, b!);
      expect(again.ok && again.plan.cost).toBe(0);
    }
  });
});

describe('save and load', () => {
  it('round-trips track, stations and trains', () => {
    const game = Game.generate({ width: 64, height: 64, seed: 5 });
    const [a, b] = game.towns;
    const r = game.connect(a!, b!, { confirmBridges: true });
    expect(r.ok).toBe(true);
    game.buildStation('small', a!);
    game.buildStation('medium', b!);
    const bought = game.buyTrain({ at: a!, locomotive: true, cars: { coach: 2 } });
    expect(bought.ok).toBe(true);
    if (bought.ok) expect(game.setRoute(bought.train.id, [a!, b!]).ok).toBe(true);
    game.advanceDays(31); // past a month-end, so running costs are booked

    const save = JSON.parse(JSON.stringify(game.toSave()));
    const loaded = Game.fromSave(save);
    expect(JSON.stringify(loaded.toSave())).toBe(JSON.stringify(game.toSave()));
    expect(loaded.trains[0]!.route).toHaveLength(2);
    expect(loaded.ledgerFor(1850)).toEqual(game.ledgerFor(1850));
    expect(game.ledgerFor(1850).trainRunning).toBe(-2_400);
  });
});
