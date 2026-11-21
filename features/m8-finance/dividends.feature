@m8
Feature: Dividends
  As a railroad owner
  I want to pay a dividend to the shareholders
  So that I can turn company cash into personal cash

  Rules: the player sets a dividend per share (in cents, $0.00 by default). At year end it is paid from
  company cash to every shareholder; the player's part goes to personal cash. It is booked as `financing`,
  not profit. It is skipped entirely, with a notice, when paying it would make company cash negative.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And the calendar starts on 1 January 1850

  Scenario: The dividend is $0.00 by default
    Then the dividend should be $0.00 per share

  Scenario: Setting a dividend
    When I set the dividend to $0.50 per share
    Then the command succeeds
    And the dividend should be $0.50 per share

  # Nothing to pay: no money moves and the ledger shows no financing.
  Scenario: A default dividend pays nothing
    When 12 months pass
    Then the company's cash is $1,000,000
    And the player's personal cash is $0
    And the ledger for 1850 should show no financing

  # 100,000 shares x $0.50 = $50,000 from the company. Player 40,000 x $0.50 = $20,000; public 30,000.
  Scenario: The dividend is paid at year end to all shareholders
    Given the dividend is set to $0.50 per share
    When 12 months pass
    Then the company's cash is $950,000
    And the player's personal cash is $20,000

  Scenario: Nothing is paid before year end
    Given the dividend is set to $0.50 per share
    When 11 months pass
    Then the company's cash is $1,000,000
    And the player's personal cash is $0

  Scenario Outline: The amounts follow the dividend per share
    Given the dividend is set to <dividend> per share
    When 12 months pass
    Then the company's cash is <cash>
    And the player's personal cash is <personal>

    Examples:
      | dividend | cash       | personal |
      | $0.00    | $1,000,000 | $0       |
      | $0.25    | $975,000   | $10,000  |
      | $0.50    | $950,000   | $20,000  |
      | $1.00    | $900,000   | $40,000  |

  # The company sold 10,000 new shares: cash 1,000,000 + 90,000 = 1,090,000, 110,000 shares.
  # Total 110,000 x $0.50 = $55,000; the player's 40,000 x $0.50 = $20,000. Cash 1,090,000 - 55,000.
  Scenario: Newly sold shares are paid a dividend too
    Given the dividend is set to $0.50 per share
    When the company sells 10,000 new shares
    And 12 months pass
    Then the company's cash is $1,035,000
    And the player's personal cash is $20,000

  # The dividend is paid every year: 2 x $50,000 out, 2 x $20,000 to the player.
  Scenario: The dividend is paid every year
    Given the dividend is set to $0.50 per share
    When 2 years pass
    Then the company's cash is $900,000
    And the player's personal cash is $40,000

  Scenario: The latest dividend is the one paid
    Given the dividend is set to $0.50 per share
    When I set the dividend to $0.20 per share
    And 12 months pass
    Then the company's cash is $980,000
    And the player's personal cash is $8,000

  Scenario: A dividend is financing, not profit
    Given the dividend is set to $0.50 per share
    When 12 months pass
    Then the ledger for 1850 should show $50,000 in financing outflows
    And the ledger for 1850 should show break-even results

  # Paying exactly the cash on hand leaves $0, which is not negative.
  Scenario: A dividend that uses all the cash is paid
    Given the company has $50,000 in cash
    And the dividend is set to $0.50 per share
    When 12 months pass
    Then the company's cash is $0
    And the player's personal cash is $20,000

  # $50,000 would be owed but only $49,999 is on hand: nobody is paid, not even partly.
  Scenario: A dividend that would make cash negative is skipped
    Given the company has $49,999 in cash
    And the dividend is set to $0.50 per share
    When 12 months pass
    Then the company's cash is $49,999
    And the player's personal cash is $0
    And the ledger for 1850 should show no financing
    And a notice should say "dividend skipped"

  Scenario: No notice when the dividend is paid
    Given the dividend is set to $0.50 per share
    When 12 months pass
    Then no notice should say "dividend skipped"
