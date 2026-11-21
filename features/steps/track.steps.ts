import assert from 'node:assert/strict';
import { Given, Then, When } from '@cucumber/cucumber';
import { straightPath } from '../../src/sim/track';
import type { Coord } from '../../src/sim/types';
import type { SimWorld } from '../support/world';

function line(from: Coord, to: Coord): Coord[] {
  const path = straightPath(from, to);
  if (!path) throw new Error(`(${from.x}, ${from.y}) → (${to.x}, ${to.y}) is not a straight line`);
  return path;
}

/** "(1, 1), (2, 1), (3, 2)" → Coord[] */
function parsePath(text: string): Coord[] {
  return [...text.matchAll(/\((\d+),\s*(\d+)\)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
}

// Fixture: free, bypasses validation of funds.
Given('existing track from {coord} to {coord}', function (this: SimWorld, from: Coord, to: Coord) {
  const path = line(from, to);
  for (let i = 1; i < path.length; i++) this.game.track.add(path[i - 1]!, path[i]!);
});

When('I build track from {coord} to {coord}', function (this: SimWorld, from: Coord, to: Coord) {
  this.run((g) => g.buildTrack(line(from, to)));
});

When('I build track along {}', function (this: SimWorld, pathText: string) {
  this.run((g) => g.buildTrack(parsePath(pathText)));
});

Then('the track network has {int} segment(s)', function (this: SimWorld, n: number) {
  assert.equal(this.game.track.segmentCount, n);
});

Then('there is track between {coord} and {coord}', function (this: SimWorld, a: Coord, b: Coord) {
  assert.ok(this.game.track.has(a, b));
});

// --- Bridges -------------------------------------------------------------

// Fixture: free.
Given('a bridge exists from {coord} to {coord}', function (this: SimWorld, from: Coord, to: Coord) {
  const path = line(from, to);
  for (let i = 1; i < path.length; i++) this.game.track.add(path[i - 1]!, path[i]!, true);
});

When('I build a bridge from {coord} to {coord}', function (this: SimWorld, from: Coord, to: Coord) {
  this.run((g) => g.buildBridge(from, to));
});

// --- Demolishing ---------------------------------------------------------

When('I demolish track from {coord} to {coord}', function (this: SimWorld, from: Coord, to: Coord) {
  this.run((g) => g.demolishTrack(from, to));
});

Then('the company should have received a refund of {money}', function (this: SimWorld, amount: number) {
  assert.equal(this.game.cash - this.cashBeforeLastCommand, amount);
});
