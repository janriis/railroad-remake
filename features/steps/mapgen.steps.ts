import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import { Game } from '../../src/sim/game';
import { TERRAINS, type Terrain } from '../../src/sim/types';
import type { SimWorld } from '../support/world';

function generate(world: SimWorld, width: number, height: number, seed: number): void {
  world.game = Game.generate({ width, height, seed });
  world.generated.push(world.game);
}

When(
  'I generate a {int}x{int} map with seed {int}',
  function (this: SimWorld, w: number, h: number, seed: number) {
    generate(this, w, h, seed);
  },
);

When(
  'I generate another {int}x{int} map with seed {int}',
  function (this: SimWorld, w: number, h: number, seed: number) {
    generate(this, w, h, seed);
  },
);

const fingerprint = (g: Game) => JSON.stringify({ tiles: g.map.snapshot(), towns: g.towns });

function lastTwo(world: SimWorld): [Game, Game] {
  const [a, b] = world.generated.slice(-2);
  assert.ok(a && b, 'generate two maps first');
  return [a, b];
}

Then('both maps should be identical', function (this: SimWorld) {
  const [a, b] = lastTwo(this);
  assert.equal(fingerprint(a), fingerprint(b));
});

Then('the two maps should differ', function (this: SimWorld) {
  const [a, b] = lastTwo(this);
  assert.notEqual(fingerprint(a), fingerprint(b));
});

Then(
  'the map should be {int} tiles wide and {int} tiles high',
  function (this: SimWorld, w: number, h: number) {
    assert.equal(this.game.map.width, w);
    assert.equal(this.game.map.height, h);
  },
);

Then('the map should contain plains, forest, hills, mountain and water', function (this: SimWorld) {
  const present = new Set(this.game.map.snapshot());
  for (const t of TERRAINS) assert.ok(present.has(t), `no ${t} on the map`);
});

Then(
  'at least {int}% of the tiles should be plains, forest or hills',
  function (this: SimWorld, pct: number) {
    const tiles = this.game.map.snapshot();
    const buildable: Terrain[] = ['plains', 'forest', 'hills'];
    const share = tiles.filter((t) => buildable.includes(t)).length / tiles.length;
    assert.ok(share * 100 >= pct, `only ${(share * 100).toFixed(1)}% buildable`);
  },
);

Then('the map should have {int} towns', function (this: SimWorld, n: number) {
  assert.equal(this.game.towns.length, n);
});

Then('every town should stand on plains', function (this: SimWorld) {
  for (const t of this.game.towns)
    assert.equal(this.game.map.terrainAt(t), 'plains', `${t.name} is not on plains`);
});

Then('every pair of towns should be at least {int} tiles apart', function (this: SimWorld, min: number) {
  const towns = this.game.towns;
  for (let i = 0; i < towns.length; i++)
    for (let j = i + 1; j < towns.length; j++) {
      const [a, b] = [towns[i]!, towns[j]!];
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= min, `${a.name} and ${b.name} are too close`);
    }
});
