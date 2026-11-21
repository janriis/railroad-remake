import assert from 'node:assert/strict';
import { Given, Then, When, type DataTable } from '@cucumber/cucumber';
import { CAR, CAR_TYPES, type Cargo, type CarType, type LocoModel } from '../../src/sim/config';
import { carriesCargo, cleanMix, type CarMix } from '../../src/sim/cars';
import { carsFromLegacy } from '../../src/sim/game';
import type { Coord } from '../../src/sim/types';
import { SINGULAR, mixFromRows } from '../support/cars';
import type { SimWorld } from '../support/world';
import { parseCoords } from './trains.steps';

const mix = (table: DataTable): CarMix => mixFromRows(table.hashes());

// --- Fixtures ---------------------------------------------------------------------

Given(
  'a train with these cars exists at the station at {coord}:',
  function (this: SimWorld, at: Coord, t: DataTable) {
    this.normalTrains.push(this.game.addTrain({ at, cars: mix(t) }));
  },
);

Given(
  'a/an {model} train with these cars exists at the station at {coord}:',
  function (this: SimWorld, model: LocoModel, at: Coord, t: DataTable) {
    this.normalTrains.push(this.game.addTrain({ at, model, cars: mix(t) }));
  },
);

Given(
  'the station at {coord} has {int} {cargo} waiting',
  function (this: SimWorld, at: Coord, n: number, cargo: Cargo) {
    const s = this.game.stationAt(at);
    assert.ok(s, `no station at (${at.x}, ${at.y})`);
    s.waiting.push({ cargo, source: 'fixture', units: n });
  },
);

/** Turns the current train into one loaded from a save made before car types (M7). */
Given(
  'the train comes from an old save with {int} passenger car(s) and {int} freight car(s)',
  function (this: SimWorld, p: number, f: number) {
    this.train.cars = carsFromLegacy({ passengerCars: p, freightCars: f });
    this.train.owned = { ...this.train.cars };
  },
);

Given(
  'the train comes from an old save with {int} passenger car(s) and {int} freight car(s) and these stops:',
  function (this: SimWorld, p: number, f: number, table: DataTable) {
    this.train.cars = carsFromLegacy({ passengerCars: p, freightCars: f });
    this.train.owned = { ...this.train.cars };
    const rows = table.hashes();
    const stops = rows.map((r) => parseCoords(r['stop']!)[0]!);
    const orders = rows.map((r) => {
      const [pc, fc] = [r['passenger cars']?.trim(), r['freight cars']?.trim()];
      return pc || fc
        ? carsFromLegacy({ passengerCars: Number(pc || 0), freightCars: Number(fc || 0) })
        : null;
    });
    const r = this.game.setRoute(this.train.id, stops, orders);
    assert.ok(r.ok, !r.ok ? r.error : '');
  },
);

// --- Commands -----------------------------------------------------------------------

When(
  'I buy a locomotive with these cars at the station at {coord}:',
  function (this: SimWorld, at: Coord, t: DataTable) {
    let bought: ReturnType<SimWorld['game']['buyTrain']> | undefined;
    this.run((g) => (bought = g.buyTrain({ at, locomotive: true, cars: mix(t) })));
    if (bought?.ok) this.normalTrains.push(bought.train);
  },
);

When(
  'I buy a/an {model} locomotive with these cars at the station at {coord}:',
  function (this: SimWorld, model: LocoModel, at: Coord, t: DataTable) {
    let bought: ReturnType<SimWorld['game']['buyTrain']> | undefined;
    this.run((g) => (bought = g.buyTrain({ at, locomotive: true, model, cars: mix(t) })));
    if (bought?.ok) this.normalTrains.push(bought.train);
  },
);

When("I change the train's cars to:", function (this: SimWorld, t: DataTable) {
  this.run((g) => g.changeCars(this.train.id, mix(t)));
});

// --- Assertions ---------------------------------------------------------------------

Then('the train should own these cars:', function (this: SimWorld, t: DataTable) {
  assert.deepEqual(cleanMix(this.train.owned), cleanMix(mix(t)));
});

Then('the train should haul these cars:', function (this: SimWorld, t: DataTable) {
  assert.deepEqual(cleanMix(this.train.cars), cleanMix(mix(t)));
});

Then('the train should be carrying {int} {cargo}', function (this: SimWorld, n: number, cargo: Cargo) {
  assert.equal(
    this.train.cargo.filter((l) => l.cargo === cargo).reduce((s, l) => s + l.units, 0),
    n,
  );
});

Then('the cars that carry {cargo} should be {string}', function (this: SimWorld, cargo: Cargo, list: string) {
  assert.equal(
    CAR_TYPES.filter((t) => carriesCargo(t, cargo))
      .map((t) => SINGULAR[t])
      .join(', '),
    list,
  );
});

Then('a {car} should hold {int} units', function (this: SimWorld, car: CarType, n: number) {
  assert.equal(CAR[car].capacity, n);
});
