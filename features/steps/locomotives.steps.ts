import assert from 'node:assert/strict';
import { Given, Then, When, type DataTable } from '@cucumber/cucumber';
import { LOCO, type LocoModel } from '../../src/sim/config';
import { DAYS_PER_YEAR } from '../../src/sim/economy';
import { TICKS_PER_DAY } from '../../src/sim/config';
import { cleanMix, type CarMix } from '../../src/sim/cars';
import type { Coord } from '../../src/sim/types';
import { parseCoords, stopsFromTable } from './trains.steps';
import type { SimWorld } from '../support/world';

// --- Fixtures ---------------------------------------------------------------------

Given(
  'a/an {model} train exists at the station at {coord}',
  function (this: SimWorld, model: LocoModel, at: Coord) {
    this.normalTrains.push(this.game.addTrain({ at, model }));
  },
);

Given(
  'a/an {model} train with {carlist} exists at the station at {coord}',
  function (this: SimWorld, model: LocoModel, cars: CarMix, at: Coord) {
    this.normalTrains.push(this.game.addTrain({ at, model, cars }));
  },
);

Given('the train is {int} year(s) old', function (this: SimWorld, years: number) {
  this.train.boughtAt = this.game.time - years * DAYS_PER_YEAR * TICKS_PER_DAY;
});

Given('breakdowns always happen', function (this: SimWorld) {
  this.game.breakdowns = 'always';
});

Given('breakdowns never happen', function (this: SimWorld) {
  this.game.breakdowns = 'never';
});

Given(
  'a train that is broken down for {int} days exists at {coord} with the route {}',
  function (this: SimWorld, days: number, at: Coord, route: string) {
    const train = this.game.addTrain({ at });
    const r = this.game.setRoute(train.id, parseCoords(route));
    assert.ok(r.ok, !r.ok ? r.error : '');
    train.brokenUntil = this.game.time + days * TICKS_PER_DAY;
    this.slowTrain = train;
  },
);

// --- Commands -----------------------------------------------------------------------

When('I retire the train', function (this: SimWorld) {
  this.run((g) => g.retireTrain(this.train.id));
});

When('I overhaul the train', function (this: SimWorld) {
  this.run((g) => g.overhaul(this.train.id));
});

When("I replace the train's locomotive with a/an {model}", function (this: SimWorld, model: LocoModel) {
  this.run((g) => g.replaceLocomotive(this.train.id, model));
});

// --- Assertions ---------------------------------------------------------------------

Then('the models on sale should be {string}', function (this: SimWorld, list: string) {
  assert.equal(
    this.game
      .modelsOnSale()
      .map((m) => LOCO[m].name)
      .join(', '),
    list,
  );
});

Then('the train should be a/an {model}', function (this: SimWorld, model: LocoModel) {
  assert.equal(this.train.model, model);
});

Then("the train's age should be {int} year(s)", function (this: SimWorld, years: number) {
  assert.equal(this.game.trainAge(this.train), years);
});

Then('the train should be worn out', function (this: SimWorld) {
  assert.ok(this.game.isWornOut(this.train));
});

Then('the train should be in working order', function (this: SimWorld) {
  assert.ok(!this.game.isWornOut(this.train));
});

Then('the train should have {int} years of working life left', function (this: SimWorld, years: number) {
  assert.equal(this.game.workingLifeLeft(this.train), years);
});

Then("the train's monthly breakdown chance should be {int}%", function (this: SimWorld, pct: number) {
  assert.equal(Math.round(this.game.breakdownChance(this.train) * 100), pct);
});

Then('the train should be broken down', function (this: SimWorld) {
  assert.ok(this.game.isBrokenDown(this.train));
});

Then('the train should not be broken down', function (this: SimWorld) {
  assert.ok(!this.game.isBrokenDown(this.train));
});

let remembered: { at: Coord; next: Coord | null; progress: number } | null = null;

Then('I remember where the train stands', function (this: SimWorld) {
  remembered = {
    at: { ...this.train.at },
    next: this.train.next && { ...this.train.next },
    progress: this.train.progress,
  };
});

Then('the train should still stand where it was remembered', function (this: SimWorld) {
  assert.deepEqual({ at: this.train.at, next: this.train.next, progress: this.train.progress }, remembered);
});

Then('the train should have moved on from where it was remembered', function (this: SimWorld) {
  assert.notDeepEqual(
    { at: this.train.at, next: this.train.next, progress: this.train.progress },
    remembered,
  );
});

Then('the train should have these stops:', function (this: SimWorld, table: DataTable) {
  const { stops, orders } = stopsFromTable(table);
  assert.deepEqual(this.train.route, stops);
  assert.deepEqual(
    this.train.stopOrders.map((o) => (o ? cleanMix(o) : null)),
    orders,
  );
});
