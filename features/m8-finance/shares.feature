@m8 @wip
Feature: Shares
  As a railroad owner
  I want to sell new shares, buy them back and trade my own
  So that I can raise money, control the company and build a personal fortune

  Rules: of the 100,000 shares the player owns 40,000 and the public the rest. The company sells new shares
  10,000 at a time at 90% of the share price, the money going to the company, and buys back 10,000 public
  shares at 110% of the price from company cash. The player buys or sells 1,000 shares at a time at the share
  price, with personal cash. Commands use the price from the last month end. Net worth = personal cash +
  the player's shares x share price. Share sales, buybacks and dividends are `financing`, not profit.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And the calendar starts on 1 January 1850

  Scenario: The player starts with 40% of the shares
    Then the player should own 40,000 of the 100,000 shares
    And the player's personal cash is $0

  # 10,000 x 90% x $10.00 = $90,000. The player still owns 40,000, but of 110,000 shares.
  Scenario: The company sells 10,000 new shares at 90% of the price
    When the company sells 10,000 new shares
    Then the command succeeds
    And the company's cash is $1,090,000
    And the company should have 110,000 shares outstanding
    And the player should own 40,000 of the 110,000 shares

  Scenario: Selling new shares is financing, not profit
    When the company sells 10,000 new shares
    Then the ledger for 1850 should show $90,000 in financing inflows
    And the ledger for 1850 should show break-even results

  # Equity 1,090,000 / 110,000 shares = 9.909 -> $9.91 at the next month end.
  Scenario: The price is spread over the new shares at the next month end
    When the company sells 10,000 new shares
    Then the share price is $10.00
    When 1 months pass
    Then the share price is $9.91

  # Track fixture: 10 segments, cash 950,000. After month 1: cash 949,000, equity 999,000 -> $9.99.
  # 10,000 x 90% x $9.99 = 89,910.
  Scenario: New shares are sold at the price of the last month end
    Given the company has $950,000 in cash
    And existing track from (2, 2) to (12, 2)
    And 1 months pass
    When the company sells 10,000 new shares
    Then the company's cash is $1,038,910

  # 10,000 x 110% x $10.00 = $110,000. 100,000 - 10,000 = 90,000 shares remain.
  Scenario: The company buys back 10,000 public shares at 110% of the price
    When the company buys back 10,000 shares
    Then the command succeeds
    And the company's cash is $890,000
    And the company should have 90,000 shares outstanding
    And the player should own 40,000 of the 90,000 shares
    And the ledger for 1850 should show $110,000 in financing outflows

  Scenario: A buyback needs enough cash
    Given the company has $109,999 in cash
    When the company buys back 10,000 shares
    Then the command is rejected with "insufficient funds"
    And no money was spent
    And the company should have 100,000 shares outstanding

  # The public holds 100,000 - 95,000 = 5,000 shares, fewer than the 10,000 asked for.
  Scenario: A buyback needs enough public shares
    Given the player owns 95,000 of the 100,000 shares
    When the company buys back 10,000 shares
    Then the command is rejected with "not enough shares"
    And no money was spent
    And the company should have 100,000 shares outstanding

  # 1,000 x $10.00 = $10,000 of personal cash. The company's cash does not change.
  Scenario: The player buys 1,000 shares from the public
    Given the player has $25,000 in personal cash
    When I buy 1,000 shares
    Then the command succeeds
    And the player's personal cash is $15,000
    And the player should own 41,000 of the 100,000 shares
    And the company's cash is $1,000,000

  Scenario: Buying shares needs enough personal cash
    Given the player has $9,999 in personal cash
    When I buy 1,000 shares
    Then the command is rejected with "insufficient personal funds"
    And the player should own 40,000 of the 100,000 shares
    And the player's personal cash is $9,999

  # The public holds 100,000 - 99,500 = 500 shares, fewer than 1,000.
  Scenario: Buying shares needs enough public shares
    Given the player owns 99,500 of the 100,000 shares
    And the player has $50,000 in personal cash
    When I buy 1,000 shares
    Then the command is rejected with "not enough shares"
    And the player's personal cash is $50,000

  Scenario: The player sells 1,000 shares to the public
    When I sell 1,000 shares
    Then the command succeeds
    And the player's personal cash is $10,000
    And the player should own 39,000 of the 100,000 shares
    And the company's cash is $1,000,000

  Scenario: The player cannot sell shares they do not have
    Given the player owns 500 of the 100,000 shares
    When I sell 1,000 shares
    Then the command is rejected with "not enough shares"
    And the player should own 500 of the 100,000 shares
    And the player's personal cash is $0

  # Price 9.99 at the last month end (see above); 1,000 x $9.99 = $9,990.
  Scenario: The player trades at the price of the last month end
    Given the company has $950,000 in cash
    And existing track from (2, 2) to (12, 2)
    And the player has $20,000 in personal cash
    And 1 months pass
    When I buy 1,000 shares
    Then the player's personal cash is $10,010

  # 25,000 + 40,000 x $10.00 = 425,000.
  Scenario: Net worth is personal cash plus the shares at the share price
    Given the player has $25,000 in personal cash
    Then the player's net worth is $425,000

  # Personal cash 25,000 + 40,000 x $9.99 = 25,000 + 399,600 = 424,600.
  Scenario: Net worth follows the share price
    Given the company has $950,000 in cash
    And existing track from (2, 2) to (12, 2)
    And the player has $25,000 in personal cash
    When 1 months pass
    Then the player's net worth is $424,600

  # Paying $10,000 for 1,000 shares worth $10,000 leaves net worth unchanged: 15,000 + 41,000 x $10.00.
  Scenario: Buying shares at the price leaves net worth unchanged
    Given the player has $25,000 in personal cash
    When I buy 1,000 shares
    Then the player's net worth is $425,000
