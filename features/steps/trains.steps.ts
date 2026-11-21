import assert from 'node:assert/strict';
import { Given, Then, When, type DataTable } from '@cucumber/cucumber';
import { STATION_SIZES, TICKS_PER_DAY, type StationSize } from '../../src/sim/config';
import type { CarCounts } from '../../src/sim/trains';
import { sameCoord, type Coord } from '../../src/sim/types';
import type { SimWorld } from '../support/world';

/** "(1, 1), (2, 1)" → Coord[] */
export function parseCoords(text: string): Coord[] {
  return [...text.matchAll(/\((\d+),\s*(\d+)\)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
}

function size(word: string): StationSize {
  assert.ok((STATION_SIZES as readonly string[]).includes(word), `unknown station size "${word}"`);
  return word as StationSize;
}

// --- Stations ------------------------------------------------------------------

Given('a {word} station exists at {coord}', function (this: SimWorld, s: string, at: Coord) {
  this.game.addStation(size(s), at);
});

When('I build a {word} station at {coord}', function (this: SimWorld, s: string, at: Coord) {
  this.run((g) => g.buildStation(size(s), at));
});

Then(
  'the station at {coord} should have a catchment radius of {int}',
  function (this: SimWorld, at: Coord, r: number) {
    assert.equal(this.game.stationAt(at)?.radius, r);
  },
);

Then(
  'the tile {coord} should be in the catchment of the station at {coord}',
  function (this: SimWorld, c: Coord, at: Coord) {
    assert.ok(this.game.inCatchment(this.game.stationAt(at)!, c));
  },
);

Then(
  'the tile {coord} should be outside the catchment of the station at {coord}',
  function (this: SimWorld, c: Coord, at: Coord) {
    assert.ok(!this.game.inCatchment(this.game.stationAt(at)!, c));
  },
);

// --- Buying trains -------------------------------------------------------------

When(
  /^I buy (.+?) at (?:the station at )?\((\d+), (\d+)\)$/,
  function (this: SimWorld, what: string, x: string, y: string) {
    const count = (re: RegExp) => Number(what.match(re)?.[1] ?? 0);
    const order = {
      at: { x: Number(x), y: Number(y) },
      locomotive: /\ba locomotive\b/.test(what),
      passengerCars: count(/(\d+) passenger cars?/),
      freightCars: count(/(\d+) freight cars?/),
    };
    let bought: ReturnType<SimWorld['game']['buyTrain']> | undefined;
    this.run((g) => (bought = g.buyTrain(order)));
    if (bought?.ok) this.normalTrains.push(bought.train);
  },
);

Then('the company should own {int} train(s)', function (this: SimWorld, n: number) {
  assert.equal(this.game.trains.length, n);
});

Then('the train should have {int} cars', function (this: SimWorld, n: number) {
  assert.equal(this.train.passengerCars + this.train.freightCars, n);
});

// --- Train fixtures ------------------------------------------------------------

function addTrain(world: SimWorld, at: Coord, route?: string): void {
  const train = world.game.addTrain({ at });
  world.normalTrains.push(train);
  if (route) assert.deepEqual(world.game.setRoute(train.id, parseCoords(route)), { ok: true, cost: 0 });
}

Given('a train exists at the station at {coord}', function (this: SimWorld, at: Coord) {
  addTrain(this, at);
});

Given('a train exists at {coord}', function (this: SimWorld, at: Coord) {
  addTrain(this, at);
});

Given(
  'a train exists at the station at {coord} with the route {}',
  function (this: SimWorld, at: Coord, route: string) {
    addTrain(this, at, route);
  },
);

Given('a train exists at {coord} with the route {}', function (this: SimWorld, at: Coord, route: string) {
  addTrain(this, at, route);
});

Given(
  'a slow train exists at {coord} with the route {}',
  function (this: SimWorld, at: Coord, route: string) {
    this.slowTrain = this.game.addTrain({ at, tilesPerDay: 2 });
    assert.ok(this.game.setRoute(this.slowTrain.id, parseCoords(route)).ok);
  },
);

Given('the train has the route {}', function (this: SimWorld, route: string) {
  const result = this.game.setRoute(this.train.id, parseCoords(route));
  assert.ok(result.ok, !result.ok ? result.error : '');
});

// --- Routes --------------------------------------------------------------------

When('I assign the train the route {}', function (this: SimWorld, route: string) {
  this.run((g) => g.setRoute(this.train.id, parseCoords(route)));
});

Then('the train route should have {int} stops', function (this: SimWorld, n: number) {
  assert.equal(this.train.route.length, n);
});

// --- Time and movement ---------------------------------------------------------

When('{int} days pass', function (this: SimWorld, days: number) {
  this.passHours(days * TICKS_PER_DAY);
});

Then('the train should be at {coord}', function (this: SimWorld, c: Coord) {
  assert.deepEqual(this.train.at, c);
});

Then('the train should be waiting at the station at {coord}', function (this: SimWorld, c: Coord) {
  assert.deepEqual(this.train.at, c);
  assert.equal(this.train.status, 'at-stop');
});

// --- Signalling ----------------------------------------------------------------

Then('the following train should have waited behind the slow train', function (this: SimWorld) {
  assert.ok(this.followingTrain.waitedFor.has(this.slowTrain!.id));
});

Then('the following train should be behind the slow train', function (this: SimWorld) {
  assert.ok(this.followingTrain.at.x < this.slowTrain!.at.x);
});

Then('the following train should have left its first stop', function (this: SimWorld) {
  const t = this.followingTrain;
  assert.ok(!sameCoord(t.at, t.route[0]!) || t.next !== null);
});

Then('no segment should have held two trains at once', function (this: SimWorld) {
  assert.deepEqual(this.violations, []);
});

Then('no line should have held two trains at once', function (this: SimWorld) {
  assert.deepEqual(this.violations, []);
});

Then('both trains should have completed a journey', function (this: SimWorld) {
  for (const t of this.game.trains) assert.ok(t.journeys >= 1, `train ${t.id} has not reached a stop`);
});

Then('no train should be deadlocked', function (this: SimWorld) {
  assert.equal(this.everDeadlocked, false);
});

Then('no train should be deadlocked any more', function (this: SimWorld) {
  for (const t of this.game.trains) assert.equal(t.deadlocked, false, `train ${t.id} is still deadlocked`);
});

Then('the trains should be reported as deadlocked', function (this: SimWorld) {
  for (const t of this.game.trains) assert.ok(t.deadlocked, `train ${t.id} is not deadlocked`);
});

// --- Cars and stop orders --------------------------------------------------------

Given(
  'the train has {int} passenger car(s) and {int} freight car(s)',
  function (this: SimWorld, p: number, f: number) {
    this.train.passengerCars = p;
    this.train.freightCars = f;
  },
);

When(
  "I change the train's cars to {int} passenger car(s) and {int} freight car(s)",
  function (this: SimWorld, p: number, f: number) {
    this.run((g) => g.changeCars(this.train.id, { passengerCars: p, freightCars: f }));
  },
);

Then(
  'the train should haul {int} passenger car(s) and {int} freight car(s)',
  function (this: SimWorld, p: number, f: number) {
    assert.deepEqual([this.train.passengerCars, this.train.freightCars], [p, f]);
  },
);

Then('the train should have no stop orders', function (this: SimWorld) {
  assert.ok(this.train.stopOrders.every((o) => o === null));
});

function stopsFromTable(table: DataTable): { stops: Coord[]; orders: (CarCounts | null)[] } {
  const rows = table.hashes();
  return {
    stops: rows.map((r) => parseCoords(r['stop']!)[0]!),
    orders: rows.map((r) => {
      const [p, f] = [r['passenger cars']?.trim(), r['freight cars']?.trim()];
      return p || f ? { passengerCars: Number(p || 0), freightCars: Number(f || 0) } : null;
    }),
  };
}

When('I assign the train these stops:', function (this: SimWorld, table: DataTable) {
  const { stops, orders } = stopsFromTable(table);
  this.run((g) => g.setRoute(this.train.id, stops, orders));
});

Given('the train has these stops:', function (this: SimWorld, table: DataTable) {
  const { stops, orders } = stopsFromTable(table);
  const result = this.game.setRoute(this.train.id, stops, orders);
  assert.ok(result.ok, !result.ok ? result.error : '');
});

// --- One-off trips -------------------------------------------------------------

When('I send the train to the station at {coord}', function (this: SimWorld, at: Coord) {
  this.run((g) => g.sendTrainTo(this.train.id, at));
});

When("I call off the train's trip", function (this: SimWorld) {
  this.run((g) => g.cancelTrip(this.train.id));
});

Then("the train's last stop should be {coord}", function (this: SimWorld, c: Coord) {
  assert.deepEqual(this.train.lastStop, c);
});

Then('the train should not be on a trip', function (this: SimWorld) {
  assert.equal(this.train.trip, null);
});
