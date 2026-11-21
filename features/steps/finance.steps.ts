import assert from 'node:assert/strict';
import { Given, Then, When } from '@cucumber/cucumber';
import { BOND_BASE_RATE_PCT, BOND_PRINCIPAL, BOND_RATE_STEP_PCT } from '../../src/sim/config';
import type { SimWorld } from '../support/world';

// --- Fixtures ---------------------------------------------------------------------

/** Bonds at 5%, 6%, 7% … in order, without the cash they would have raised. */
Given('the company has {int} bond(s) outstanding', function (this: SimWorld, n: number) {
  for (let i = 0; i < n; i++)
    this.game.bonds.push({
      principal: BOND_PRINCIPAL,
      ratePct: BOND_BASE_RATE_PCT + BOND_RATE_STEP_PCT * this.game.bonds.length,
    });
});

Given('the player has {money} in personal cash', function (this: SimWorld, amount: number) {
  this.game.personalCash = amount;
});

Given(
  'the player owns {count} of the {count} shares',
  function (this: SimWorld, mine: number, total: number) {
    this.game.playerShares = mine;
    this.game.sharesOutstanding = total;
  },
);

Given('the dividend is set to {price} per share', function (this: SimWorld, cents: number) {
  this.game.dividendCents = cents;
});

// --- Commands -----------------------------------------------------------------------

When('I issue a bond', function (this: SimWorld) {
  this.run((g) => g.issueBond());
});

When('I repay a bond', function (this: SimWorld) {
  this.run((g) => g.repayBond());
});

When('the company sells {count} new shares', function (this: SimWorld, n: number) {
  this.run((g) => g.sellNewShares(n));
});

When('the company buys back {count} shares', function (this: SimWorld, n: number) {
  this.run((g) => g.buyBackShares(n));
});

When('I buy {count} shares', function (this: SimWorld, n: number) {
  this.run((g) => g.buySharesAsPlayer(n));
});

When('I sell {count} shares', function (this: SimWorld, n: number) {
  this.run((g) => g.sellSharesAsPlayer(n));
});

When('I set the dividend to {price} per share', function (this: SimWorld, cents: number) {
  this.run((g) => g.setDividend(cents));
});

// --- Assertions ---------------------------------------------------------------------

Then("the company's debt is {money}", function (this: SimWorld, amount: number) {
  assert.equal(this.game.debt, amount);
});

Then('the company should have {int} bond(s) outstanding', function (this: SimWorld, n: number) {
  assert.equal(this.game.bonds.length, n);
});

Then('the newest bond should have an interest rate of {int}%', function (this: SimWorld, pct: number) {
  assert.equal(this.game.bonds[this.game.bonds.length - 1]?.ratePct, pct);
});

Then('the bonds outstanding should carry the rates {string}', function (this: SimWorld, list: string) {
  assert.equal(this.game.bonds.map((b) => `${b.ratePct}%`).join(', '), list);
});

Then("the company's assets are valued at {money}", function (this: SimWorld, amount: number) {
  assert.equal(this.game.assetValue(), amount);
});

Then("the company's equity is {money}", function (this: SimWorld, amount: number) {
  assert.equal(this.game.equity(), amount);
});

Then("the company's operating profit is {money}", function (this: SimWorld, amount: number) {
  assert.equal(this.game.operatingProfit(), amount);
});

Then("the company's operating loss is {money}", function (this: SimWorld, amount: number) {
  assert.equal(-this.game.operatingProfit(), amount);
});

Then('the share price is {price}', function (this: SimWorld, cents: number) {
  assert.equal(this.game.sharePriceCents, cents);
});

Then('the share price history should have {int} entries', function (this: SimWorld, n: number) {
  assert.equal(this.game.priceHistory.length, n);
});

Then(
  'the share price history entry {int} should be {price}',
  function (this: SimWorld, i: number, cents: number) {
    assert.equal(this.game.priceHistory[i - 1], cents);
  },
);

Then('the company should have {count} shares outstanding', function (this: SimWorld, n: number) {
  assert.equal(this.game.sharesOutstanding, n);
});

Then(
  'the player should own {count} of the {count} shares',
  function (this: SimWorld, mine: number, total: number) {
    assert.deepEqual([this.game.playerShares, this.game.sharesOutstanding], [mine, total]);
  },
);

Then("the player's personal cash is {money}", function (this: SimWorld, amount: number) {
  assert.equal(this.game.personalCash, amount);
});

Then("the player's net worth is {money}", function (this: SimWorld, amount: number) {
  assert.equal(this.game.netWorth(), amount);
});

Then('the dividend should be {price} per share', function (this: SimWorld, cents: number) {
  assert.equal(this.game.dividendCents, cents);
});

Then(
  'the ledger for {int} should show {money} in interest',
  function (this: SimWorld, year: number, n: number) {
    assert.equal(-this.game.ledgerFor(year).interest + 0, n);
  },
);

Then(
  'the ledger for {int} should show {money} in financing inflows',
  function (this: SimWorld, year: number, n: number) {
    assert.equal(this.game.ledgerFor(year).financingIn, n);
  },
);

Then(
  'the ledger for {int} should show {money} in financing outflows',
  function (this: SimWorld, year: number, n: number) {
    assert.equal(-this.game.ledgerFor(year).financingOut + 0, n);
  },
);

Then('the ledger for {int} should show no financing', function (this: SimWorld, year: number) {
  const page = this.game.ledgerFor(year);
  assert.deepEqual([page.financingIn + 0, page.financingOut + 0], [0, 0]);
});

Then('the company should have been restructured {int} time(s)', function (this: SimWorld, n: number) {
  assert.equal(this.game.restructurings, n);
});

Then('a notice should say {string}', function (this: SimWorld, text: string) {
  assert.ok(
    this.game.notices.some((n) => n.includes(text)),
    JSON.stringify(this.game.notices),
  );
});

Then('no notice should say {string}', function (this: SimWorld, text: string) {
  assert.ok(!this.game.notices.some((n) => n.includes(text)), JSON.stringify(this.game.notices));
});
