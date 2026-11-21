import assert from 'node:assert/strict';
import { Given, Then, When } from '@cucumber/cucumber';
import { BUILDING, INDUSTRY, type BuildingKind, type Cargo, type IndustryKind } from '../../src/sim/config';
import { profit } from '../../src/sim/economy';
import type { Station, StationBuilding } from '../../src/sim/game';
import type { Coord } from '../../src/sim/types';
import type { SimWorld } from '../support/world';

const station = (world: SimWorld, at: Coord): Station => {
  const s = world.game.stationAt(at);
  assert.ok(s, `no station at (${at.x}, ${at.y})`);
  return s;
};

const building = (world: SimWorld, kind: BuildingKind, at: Coord): StationBuilding => {
  const b = station(world, at).buildings.find((x) => x.kind === kind);
  assert.ok(b, `no ${kind} in the station at (${at.x}, ${at.y})`);
  return b;
};

const takes = (kind: BuildingKind, cargo: Cargo) =>
  assert.equal(BUILDING[kind].input, cargo, `a ${kind} does not take ${cargo}`);
const makes = (kind: BuildingKind, cargo: Cargo) =>
  assert.equal(BUILDING[kind].output, cargo, `a ${kind} does not make ${cargo}`);

// --- Fixtures ---------------------------------------------------------------------

Given(
  'a {word} station exists at {coord} serving {string}',
  function (this: SimWorld, size: string, at: Coord, name: string) {
    const s = this.game.addStation(size as Station['size'], at);
    assert.equal(this.game.servedTown(s)?.name, name, `station should serve "${name}"`);
  },
);

Given('the station at {coord} has a {building}', function (this: SimWorld, at: Coord, kind: BuildingKind) {
  this.game.addStationBuilding(station(this, at), kind);
});

const FILLERS: BuildingKind[] = ['sawmill', 'flour-mill', 'bakery'];
Given(
  'the station at {coord} is filled with {int} buildings',
  function (this: SimWorld, at: Coord, n: number) {
    for (const kind of FILLERS.slice(0, n)) this.game.addStationBuilding(station(this, at), kind);
  },
);

Given(
  'the {building} in the station at {coord} has received {int} {cargo}',
  function (this: SimWorld, kind: BuildingKind, at: Coord, n: number, cargo: Cargo) {
    takes(kind, cargo);
    const b = building(this, kind, at);
    b.input += n;
    b.received += n;
  },
);

Given(
  'the {building} in the station at {coord} is supplied with {int} {cargo} every month',
  function (this: SimWorld, kind: BuildingKind, at: Coord, n: number, cargo: Cargo) {
    takes(kind, cargo);
    const b = building(this, kind, at);
    this.monthlySupplies.push(() => {
      b.input += n;
      b.received += n;
    });
  },
);

// --- Commands -----------------------------------------------------------------------

When(
  'I build a {building} in the station at {coord}',
  function (this: SimWorld, kind: BuildingKind, at: Coord) {
    this.run((g) => g.buildStationBuilding(at, kind));
  },
);

When(
  'I demolish the {building} in the station at {coord}',
  function (this: SimWorld, kind: BuildingKind, at: Coord) {
    this.run((g) => g.demolishStationBuilding(at, kind));
  },
);

When(
  '{int} {cargo} are delivered to the station at {coord} over {int} tiles in {int} days',
  function (this: SimWorld, units: number, cargo: Cargo, at: Coord, distance: number, days: number) {
    this.run((g) => g.deliverCargo(at, { cargo, units, distance, days }));
  },
);

// --- Station buildings ----------------------------------------------------------------

Then(
  'the station at {coord} should contain a {building}',
  function (this: SimWorld, at: Coord, kind: BuildingKind) {
    assert.ok(station(this, at).buildings.some((b) => b.kind === kind));
  },
);

Then(
  'the station at {coord} should not contain a {building}',
  function (this: SimWorld, at: Coord, kind: BuildingKind) {
    assert.ok(!station(this, at).buildings.some((b) => b.kind === kind));
  },
);

Then(
  'the {building} in the station at {coord} should have received {cargo}',
  function (this: SimWorld, kind: BuildingKind, at: Coord, cargo: Cargo) {
    takes(kind, cargo);
    assert.ok(building(this, kind, at).received > 0);
  },
);

Then(
  'the {building} in the station at {coord} should have made {int} {cargo}',
  function (this: SimWorld, kind: BuildingKind, at: Coord, n: number, cargo: Cargo) {
    makes(kind, cargo);
    assert.equal(building(this, kind, at).lastMade, n);
  },
);

Then(
  'the {building} in the station at {coord} should have made {int} {cargo} this year',
  function (this: SimWorld, kind: BuildingKind, at: Coord, n: number, cargo: Cargo) {
    makes(kind, cargo);
    assert.equal(building(this, kind, at).madeThisYear, n);
  },
);

Then(
  'the {building} in the station at {coord} should hold {int} {cargo} as input',
  function (this: SimWorld, kind: BuildingKind, at: Coord, n: number, cargo: Cargo) {
    takes(kind, cargo);
    assert.equal(building(this, kind, at).input, n);
  },
);

// --- Towns and ledger ---------------------------------------------------------------------

Then(
  'the town of {string} should have bought {int} {cargo} for {money}',
  function (this: SimWorld, name: string, n: number, cargo: Cargo, value: number) {
    const town = this.game.town(name);
    assert.ok(town, `no town "${name}"`);
    assert.deepEqual(town.soldThisMonth[cargo] ?? { units: 0, value: 0 }, { units: n, value });
  },
);

Then(
  'the ledger for {int} should show {money} in goods sales',
  function (this: SimWorld, year: number, n: number) {
    assert.equal(this.game.ledgerFor(year).goodsSales, n);
  },
);

Then(
  'the ledger for {int} should show {money} in building upkeep',
  function (this: SimWorld, year: number, n: number) {
    assert.equal(-this.game.ledgerFor(year).buildingUpkeep + 0, n);
  },
);

Then(
  'the ledger for {int} should show a profit of {money}',
  function (this: SimWorld, year: number, n: number) {
    assert.equal(profit(this.game.ledgerFor(year)), n);
  },
);

// --- Deposits -------------------------------------------------------------------------------

Then(
  'the deposit at {coord} should have {int} {cargo} waiting',
  function (this: SimWorld, at: Coord, n: number, cargo: Cargo) {
    const d = this.game.industryAt(at);
    assert.ok(d, `no deposit at (${at.x}, ${at.y})`);
    assert.equal(INDUSTRY[d.kind].output, cargo);
    assert.equal(d.stock, n);
  },
);

const generated = (world: SimWorld) => {
  const g = world.generated[world.generated.length - 1];
  assert.ok(g, 'no generated map');
  return g;
};

Then(
  'the map should have at least {int} {deposit}',
  function (this: SimWorld, n: number, kind: IndustryKind) {
    const count = generated(this).industries.filter((i) => i.kind === kind).length;
    assert.ok(count >= n, `${count} ${kind}`);
  },
);

Then('every {deposit} should stand on {}', function (this: SimWorld, kind: IndustryKind, terrains: string) {
  const allowed = terrains.split(' or ');
  const g = generated(this);
  for (const i of g.industries.filter((x) => x.kind === kind))
    assert.ok(
      allowed.includes(g.map.terrainAt(i.at)),
      `${kind} at (${i.at.x}, ${i.at.y}) on ${g.map.terrainAt(i.at)}`,
    );
});

Then('the map should have no {industry}', function (this: SimWorld, kind: IndustryKind) {
  assert.equal(generated(this).industries.filter((i) => i.kind === kind).length, 0);
});
