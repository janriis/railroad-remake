import assert from 'node:assert/strict';
import { smoothAt } from '../../src/sim/geometry';
import { Given, Then, When } from '@cucumber/cucumber';
import type { TrackPlan } from '../../src/sim/planner';
import { straightPath } from '../../src/sim/track';
import type { Coord, Terrain } from '../../src/sim/types';
import type { SimWorld } from '../support/world';

function plan(world: SimWorld): TrackPlan {
  assert.ok(world.lastPlan, 'ask for a route first');
  assert.ok(world.lastPlan.ok, !world.lastPlan.ok ? `planner said: ${world.lastPlan.error}` : '');
  return world.lastPlan.plan;
}

function water(world: SimWorld, x: number, fromRow: number, toRow: number): void {
  for (let y = fromRow; y <= toRow; y++) world.game.map.setTerrain({ x, y }, 'water');
}

Given('mountains cover {coord} to {coord}', function (this: SimWorld, a: Coord, b: Coord) {
  for (const c of straightPath(a, b)!) this.game.map.setTerrain(c, 'mountain');
});

Given('a river runs down column {int}', function (this: SimWorld, x: number) {
  water(this, x, 0, this.game.map.height - 1);
});

Given(
  'a river runs down column {int} from row {int} to row {int}',
  function (this: SimWorld, x: number, a: number, b: number) {
    water(this, x, a, b);
  },
);

Given('a river runs down columns {int} to {int}', function (this: SimWorld, a: number, b: number) {
  for (let x = a; x <= b; x++) water(this, x, 0, this.game.map.height - 1);
});

When('I ask for a route from {coord} to {coord}', function (this: SimWorld, a: Coord, b: Coord) {
  this.lastPlan = this.game.planTrack(a, b);
});

When(
  'I ask for a route from {coord} to {coord} without bridges',
  function (this: SimWorld, a: Coord, b: Coord) {
    this.lastPlan = this.game.planTrack(a, b, { bridges: false });
  },
);

When('I connect {coord} to {coord}', function (this: SimWorld, a: Coord, b: Coord) {
  this.run((g) => g.connect(a, b));
});

When('I connect {coord} to {coord} and confirm the bridge(s)', function (this: SimWorld, a: Coord, b: Coord) {
  this.run((g) => g.connect(a, b, { confirmBridges: true }));
});

Then('the suggested route should cost {money}', function (this: SimWorld, amount: number) {
  assert.equal(plan(this).cost, amount);
});

Then('the suggested route should cost less than {money}', function (this: SimWorld, amount: number) {
  assert.ok(plan(this).cost < amount, `costs ${plan(this).cost}`);
});

Then('the suggested route should have {int} new segments', function (this: SimWorld, n: number) {
  assert.equal(plan(this).newSegments, n);
});

Then('the suggested route should have {int} bridge(s)', function (this: SimWorld, n: number) {
  assert.equal(plan(this).bridges.length, n);
});

Then('the suggested route should not cross {terrain}', function (this: SimWorld, t: Terrain) {
  for (const c of plan(this).path)
    assert.notEqual(this.game.map.terrainAt(c), t, `passes ${t} at (${c.x}, ${c.y})`);
});

Then('the suggested route should pass {coord}', function (this: SimWorld, c: Coord) {
  assert.ok(
    plan(this).path.some((p) => p.x === c.x && p.y === c.y),
    JSON.stringify(plan(this).path),
  );
});

Then('the planner should report {string}', function (this: SimWorld, error: string) {
  assert.deepEqual(this.lastPlan, { ok: false, error });
});

Then('there is a bridge between {coord} and {coord}', function (this: SimWorld, a: Coord, b: Coord) {
  assert.equal(this.game.track.get(a, b)?.bridge, true);
});

Then('the suggested route should turn by at most 45 degrees at every tile', function (this: SimWorld) {
  const path = plan(this).path;
  for (let i = 2; i < path.length; i++)
    assert.ok(smoothAt(path[i - 2]!, path[i - 1]!, path[i]!), `sharp turn at (${path[i - 1]!.x}, ${path[i - 1]!.y})`);
});
