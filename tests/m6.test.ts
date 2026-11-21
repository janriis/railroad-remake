import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/game';

/** A game with `n` Pioneers standing at a station, each `age` years old. */
function fleet(seed: number, n: number, age: number): Game {
  const game = Game.create({ width: 20, height: 20, seed });
  game.track.add({ x: 2, y: 2 }, { x: 3, y: 2 });
  game.addStation('small', { x: 2, y: 2 });
  for (let i = 0; i < n; i++) game.addTrain({ at: { x: 2, y: 2 } }).boughtAt = -age * 360 * 24;
  return game;
}

const breakdowns = (game: Game, months: number): number[] => {
  const hits: number[] = [];
  for (let m = 0; m < months; m++) {
    game.advanceDays(30);
    for (const t of game.trains) if (t.brokenUntil === game.time + 72) hits.push(t.id);
  }
  return hits;
};

describe('random breakdowns', () => {
  it('happen at about the monthly chance', () => {
    // Pioneer aged 25 (5 years past its working life): 11% a month. 200 trains x 12 months.
    const hits = breakdowns(fleet(7, 200, 25), 12).length;
    const expected = 200 * 12 * 0.11;
    expect(hits).toBeGreaterThan(expected * 0.75);
    expect(hits).toBeLessThan(expected * 1.25);
  });

  it('are rare within the working life', () => {
    const hits = breakdowns(fleet(7, 200, 2), 12).length;
    expect(hits).toBeLessThan(200 * 12 * 0.02);
  });

  it('are the same for the same seed', () => {
    expect(breakdowns(fleet(42, 50, 25), 24)).toEqual(breakdowns(fleet(42, 50, 25), 24));
  });
});

describe('loading old saves', () => {
  it('maps an unknown locomotive model to the American', () => {
    const game = Game.generate({ width: 32, height: 32, seed: 3 });
    const [a, b] = game.towns;
    game.connect(a!, b!, { confirmBridges: true });
    game.buildStation('small', a!);
    game.addTrain({ at: a! });
    const save = JSON.parse(JSON.stringify(game.toSave()));
    save.trains[0].model = 'pioneer';
    expect(Game.fromSave(save).trains[0]!.model).toBe('american');
  });
});
