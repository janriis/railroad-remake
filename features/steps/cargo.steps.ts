import assert from 'node:assert/strict';
import { Given, Then, When } from '@cucumber/cucumber';
import {
  INDUSTRY,
  STATION_SIZES,
  type Cargo,
  type IndustryKind,
  type StationSize,
} from '../../src/sim/config';
import type { Industry } from '../../src/sim/cargo';
import { TOWN_WEIGHT_TOTAL } from '../../src/sim/cargo';
import type { Station } from '../../src/sim/game';
import type { Town } from '../../src/sim/mapgen';
import type { CarMix } from '../../src/sim/cars';
import type { Coord } from '../../src/sim/types';
import { parseCoords } from './trains.steps';
import type { SimWorld } from '../support/world';

const town = (world: SimWorld, name: string): Town => {
  const t = world.game.town(name);
  assert.ok(t, `no town "${name}"`);
  return t;
};

const industry = (world: SimWorld, at: Coord, kind?: IndustryKind): Industry => {
  const i = world.game.industryAt(at);
  assert.ok(i, `no industry at (${at.x}, ${at.y})`);
  if (kind) assert.equal(i.kind, kind);
  return i;
};

/** The industry, after checking that it makes this cargo. */
const output = (i: Industry, cargo: Cargo): Industry => {
  assert.equal(INDUSTRY[i.kind].output, cargo, `${i.kind} does not make ${cargo}`);
  return i;
};

const station = (world: SimWorld, at: Coord): Station => {
  const s = world.game.stationAt(at);
  assert.ok(s, `no station at (${at.x}, ${at.y})`);
  return s;
};

const stationSize = (s: string): StationSize => {
  assert.ok((STATION_SIZES as readonly string[]).includes(s), `unknown station size ${s}`);
  return s as StationSize;
};

// --- Towns ----------------------------------------------------------------------

Given(
  'the town {string} with {count} inhabitants exists at {coord}',
  function (this: SimWorld, name: string, population: number, at: Coord) {
    this.game.addTown(name, at, population);
  },
);

/** Fixture stations that also check how much of the town they cover. */
Given(
  'a {word} station exists at {coord} covering {string}',
  function (this: SimWorld, size: string, at: Coord, name: string) {
    const s = this.game.addStation(stationSize(size), at);
    assert.equal(
      this.game.townCoverage(town(this, name)).get(s),
      TOWN_WEIGHT_TOTAL,
      'station should cover the whole town',
    );
  },
);

Given(
  'a {word} station exists at {coord} covering part of {string}',
  function (this: SimWorld, size: string, at: Coord, name: string) {
    const s = this.game.addStation(stationSize(size), at);
    const share = this.game.townCoverage(town(this, name)).get(s) ?? 0;
    assert.ok(share > 0 && share < TOWN_WEIGHT_TOTAL, 'station should cover part of the town');
  },
);

/**
 * Sets up a regular service that takes the town's passengers away: a second town and
 * station at the far end of the track, and a passenger train shuttling between them.
 */
Given('the passengers of {string} are being carried away', function (this: SimWorld, name: string) {
  const from = [...this.game.stations.values()].find(
    (s) => (this.game.townCoverage(town(this, name)).get(s) ?? 0) > 0,
  );
  assert.ok(from, `no station serves "${name}"`);
  const to = { x: from.at.x + 8, y: from.at.y };
  this.game.addTown(`${name} Terminus`, to, 1_000);
  this.game.addStation('small', to);
  const train = this.game.addTrain({ at: from.at, cars: { coach: 3, baggage: 1 } });
  const r = this.game.setRoute(train.id, [from.at, to]);
  assert.ok(r.ok, !r.ok ? r.error : '');
  this.normalTrains.push(train);
});

Then(
  'the passengers waiting in the town of {string} should number {int}',
  function (this: SimWorld, name: string, n: number) {
    town(this, name);
    assert.equal(this.game.passengersWaitingFrom(name), n);
  },
);

Then(
  'the town of {string} should have {count} inhabitants',
  function (this: SimWorld, name: string, n: number) {
    assert.equal(town(this, name).population, n);
  },
);

Then(
  'the station at {coord} should have {int} {cargo} waiting',
  function (this: SimWorld, at: Coord, n: number, cargo: Cargo) {
    assert.equal(this.game.waitingAt(station(this, at), cargo), n);
  },
);

// --- Industries -----------------------------------------------------------------

Given('a {industry} exists at {coord}', function (this: SimWorld, kind: IndustryKind, at: Coord) {
  this.game.addIndustry(kind, at);
});

Given(
  'the industry at {coord} has received {int} {cargo}',
  function (this: SimWorld, at: Coord, n: number, cargo: Cargo) {
    const i = industry(this, at);
    assert.equal(INDUSTRY[i.kind].input, cargo, `${i.kind} does not take ${cargo}`);
    i.input += n;
    i.received += n;
  },
);

Then(
  'the {industry} at {coord} should have {int} {cargo} waiting',
  function (this: SimWorld, kind: IndustryKind, at: Coord, n: number, cargo: Cargo) {
    assert.equal(output(industry(this, at, kind), cargo).stock, n);
  },
);

Then(
  'the industry at {coord} should have {int} {cargo} waiting',
  function (this: SimWorld, at: Coord, n: number, cargo: Cargo) {
    assert.equal(output(industry(this, at), cargo).stock, n);
  },
);

Then(
  'the {industry} at {coord} should have {cargo} waiting',
  function (this: SimWorld, kind: IndustryKind, at: Coord, cargo: Cargo) {
    assert.ok(output(industry(this, at, kind), cargo).stock > 0);
  },
);

Then(
  'the {industry} at {coord} should have received {cargo}',
  function (this: SimWorld, kind: IndustryKind, at: Coord, cargo: Cargo) {
    const i = industry(this, at, kind);
    assert.equal(INDUSTRY[i.kind].input, cargo, `${i.kind} does not take ${cargo}`);
    assert.ok(i.received > 0);
  },
);

// --- Trains ---------------------------------------------------------------------

Given(
  'a train with {carlist} exists at the station at {coord} with the route {}',
  function (this: SimWorld, cars: CarMix, at: Coord, route: string) {
    const train = this.game.addTrain({ at, cars });
    const r = this.game.setRoute(train.id, parseCoords(route));
    assert.ok(r.ok, !r.ok ? r.error : '');
    this.normalTrains.push(train);
  },
);

// --- Deliveries -----------------------------------------------------------------

When(
  '{int} passengers are delivered over {int} tiles in {int} days',
  function (this: SimWorld, units: number, distance: number, days: number) {
    this.run((g) => g.settleDelivery({ cargo: 'passengers', units, distance, days }));
  },
);

When(
  '{int} units of {cargo} are delivered over {int} tiles in {int} days',
  function (this: SimWorld, units: number, cargo: Cargo, distance: number, days: number) {
    this.run((g) => g.settleDelivery({ cargo, units, distance, days }));
  },
);

Then('the company should be paid {money}', function (this: SimWorld, amount: number) {
  assert.deepEqual(this.lastResult, { ok: true, cost: -amount });
});
