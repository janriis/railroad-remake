import assert from 'node:assert/strict';
import { Given, Then } from '@cucumber/cucumber';
import { Game } from '../../src/sim/game';
import type { Coord, Terrain } from '../../src/sim/types';
import type { SimWorld } from '../support/world';

Given(
  'a new game on a {int}x{int} map of {terrain}',
  function (this: SimWorld, width: number, height: number, terrain: Terrain) {
    this.game = Game.create({ width, height, terrain, seed: 1 });
  },
);

// Fixture steps: set state directly, no cost.
Given('the company has {money} in cash', function (this: SimWorld, amount: number) {
  this.game.cash = amount;
});

Given('the tile {coord} is {terrain}', function (this: SimWorld, c: Coord, terrain: Terrain) {
  this.game.map.setTerrain(c, terrain);
});

Then("the company's cash is {money}", function (this: SimWorld, amount: number) {
  assert.equal(this.game.cash, amount);
});

Then('the command succeeds', function (this: SimWorld) {
  assert.ok(this.lastResult, 'no command has run');
  assert.ok(this.lastResult.ok, `expected success, got: ${!this.lastResult.ok && this.lastResult.error}`);
});

Then('the command is rejected with {string}', function (this: SimWorld, error: string) {
  assert.ok(this.lastResult, 'no command has run');
  assert.deepEqual(this.lastResult, { ok: false, error });
});

Then('it cost {money}', function (this: SimWorld, amount: number) {
  assert.ok(this.lastResult?.ok, 'last command did not succeed');
  assert.equal(this.lastResult.cost, amount);
  assert.equal(this.cashBeforeLastCommand - this.game.cash, amount, 'cash change does not match cost');
});

Then('no money was spent', function (this: SimWorld) {
  assert.equal(this.game.cash, this.cashBeforeLastCommand);
});
