import assert from 'node:assert/strict';
import { Given, Then, When } from '@cucumber/cucumber';
import { TICKS_PER_DAY } from '../../src/sim/config';
import {
  DAYS_PER_MONTH,
  DAYS_PER_YEAR,
  MONTH_NAMES,
  profit,
  runningCosts,
  timeOf,
  type LedgerYear,
} from '../../src/sim/economy';
import type { CarMix } from '../../src/sim/cars';
import type { Coord } from '../../src/sim/types';
import type { SimWorld } from '../support/world';

const month = (name: string): number => {
  const m = MONTH_NAMES.indexOf(name as (typeof MONTH_NAMES)[number]);
  assert.ok(m >= 0, `unknown month ${name}`);
  return m;
};

/** Sum a figure over every ledger year so far. */
const total = (world: SimWorld, pick: (y: LedgerYear) => number): number =>
  [...world.game.ledger.values()].reduce((sum, y) => sum + pick(y), 0);

// --- Calendar -------------------------------------------------------------------

Given(
  'the calendar starts on {int} {word} {int}',
  function (this: SimWorld, day: number, m: string, year: number) {
    this.game.time = timeOf({ year, month: month(m), day });
  },
);

When('{int} months pass', function (this: SimWorld, months: number) {
  this.passHours(months * DAYS_PER_MONTH * TICKS_PER_DAY);
});

When('{int} years pass', function (this: SimWorld, years: number) {
  this.passHours(years * DAYS_PER_YEAR * TICKS_PER_DAY);
});

Then(
  'the date should be {int} {word} {int}',
  function (this: SimWorld, day: number, m: string, year: number) {
    assert.deepEqual(this.game.date, { year, month: month(m), day });
  },
);

// --- Train fixtures -------------------------------------------------------------

Given(
  'a train with {carlist} exists at the station at {coord}',
  function (this: SimWorld, cars: CarMix, at: Coord) {
    this.normalTrains.push(this.game.addTrain({ at, cars }));
  },
);

Given(
  '{int} trains with {int} cars each exist at the station at {coord}',
  function (this: SimWorld, n: number, coaches: number, at: Coord) {
    for (let i = 0; i < n; i++) this.normalTrains.push(this.game.addTrain({ at, cars: { coach: coaches } }));
  },
);

// --- Running costs --------------------------------------------------------------

Then('the company should have paid {money} in track maintenance', function (this: SimWorld, amount: number) {
  assert.equal(
    total(this, (y) => -y.trackMaintenance),
    amount,
  );
});

Then(
  'the company should have paid {money} in train running costs',
  function (this: SimWorld, amount: number) {
    assert.equal(
      total(this, (y) => -y.trainRunning),
      amount,
    );
  },
);

Then(
  'the company should have paid {money} in total running costs',
  function (this: SimWorld, amount: number) {
    assert.equal(total(this, runningCosts), amount);
  },
);

Then('the company should be in debt by {money}', function (this: SimWorld, amount: number) {
  assert.equal(this.game.cash, -amount);
});

// --- Ledger ---------------------------------------------------------------------

const page = (world: SimWorld, year: number): LedgerYear => world.game.ledgerFor(year);

Then(
  'the ledger for {int} should show {money} in cargo income',
  function (this: SimWorld, year: number, amount: number) {
    assert.equal(page(this, year).cargoIncome, amount);
  },
);

Then(
  'the ledger for {int} should show {money} in construction expenses',
  function (this: SimWorld, year: number, amount: number) {
    assert.equal(-page(this, year).construction, amount);
  },
);

Then(
  'the ledger for {int} should show {money} in running costs',
  function (this: SimWorld, year: number, amount: number) {
    assert.equal(runningCosts(page(this, year)), amount);
  },
);

Then(
  'the ledger for {int} should show a loss of {money}',
  function (this: SimWorld, year: number, amount: number) {
    assert.equal(profit(page(this, year)), -amount);
  },
);

Then('the ledger for {int} should show break-even results', function (this: SimWorld, year: number) {
  assert.equal(profit(page(this, year)), 0);
});
