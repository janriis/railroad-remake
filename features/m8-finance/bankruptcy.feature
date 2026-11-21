@m8 @wip
Feature: Bankruptcy
  As a railroad owner
  I want a company that cannot pay its way to be restructured
  So that failure has a price but the game goes on

  Rules: the player is warned at the first month end with negative cash. At the third month end in a row
  with negative cash the company is restructured: every bond's principal is halved, the player's shares are
  halved (the removed shares go to the public), company cash is set to $0 and the run of negative months
  starts again from zero. Restructurings are counted. A month end with cash of $0 or more ends the run.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $500 in cash
    And the calendar starts on 1 January 1850
    And existing track from (2, 2) to (12, 2)

  # 10 segments x $100 = $1,000 maintenance a month. Month 1 ends at 500 - 1,000 = -500.
  Scenario: The first negative month end gives a warning
    When 1 months pass
    Then the company should be in debt by $500
    And a notice should say "cash is negative"
    And the company should have been restructured 0 times

  Scenario: No warning while cash is not negative
    Given the company has $5,000 in cash
    When 1 months pass
    Then the company's cash is $4,000
    And no notice should say "cash is negative"

  # Cash of exactly $0 is not negative.
  Scenario: Cash of exactly $0 is not negative
    Given the company has $1,000 in cash
    When 1 months pass
    Then the company's cash is $0
    And no notice should say "cash is negative"

  # Month ends: -500, -1,500, -2,500 (third in a row: restructure, cash to $0), then -1,000, -2,000, -3,000
  # (a new run: restructure again). The player's shares halve each time: 40,000, 20,000, 10,000.
  Scenario Outline: The third negative month end in a row restructures the company
    When <months> months pass
    Then the company should have been restructured <count> times
    And the player should own <player shares> of the 100,000 shares

    Examples:
      | months | count | player shares |
      | 2      | 0     | 40,000        |
      | 3      | 1     | 20,000        |
      | 5      | 1     | 20,000        |
      | 6      | 2     | 10,000        |

  # Two bonds at 5% and 6%. Each month: 1,000 maintenance + 417 + 500 interest = 1,917.
  # Month 3 ends at 500 - 3 x 1,917 = -5,251. Restructure: each principal 100,000 -> 50,000.
  Scenario: Bond principals are halved and cash is set to $0
    Given the company has 2 bonds outstanding
    When 3 months pass
    Then the company should have been restructured 1 times
    And the company should have 2 bonds outstanding
    And the company's debt is $100,000
    And the company's cash is $0
    And a notice should say "company restructured"

  Scenario: The railroad itself survives a restructuring
    When 3 months pass
    Then the track network has 10 segments
    And the company should have 100,000 shares outstanding

  # After the restructuring cash is $0. Month 4: 0 - 1,000 - (208 + 250) = -1,458. Interest is 50,000 x 5% / 12
  # = 208.33 -> 208 and 50,000 x 6% / 12 = 250, so the halved principals pay less. A new run has begun,
  # so this is a first negative month end and warns again.
  Scenario: After a restructuring the run starts again from zero
    Given the company has 2 bonds outstanding
    And 3 months pass
    When 1 months pass
    Then the company should be in debt by $1,458
    And the company should have been restructured 1 times
    And a notice should say "cash is negative"

  # Cash after delivery: -500 + 3,000 = 2,500. Month 2: 1,500 (run ends). Month 3: 500. Month 4: -500.
  # Month 5: -1,500. Only two in a row, so no restructuring; month 6 (-2,500) is the third.
  Scenario: A month end with positive cash ends the run
    When 1 months pass
    And 60 passengers are delivered over 10 tiles in 10 days
    And 1 months pass
    And 3 months pass
    Then the company should be in debt by $1,500
    And the company should have been restructured 0 times
    When 1 months pass
    Then the company should have been restructured 1 times

  # After month 1: -500. Issue a bond: +100,000 = 99,500. Then 3 months x (1,000 + 417) = 4,251 -> 95,249.
  Scenario: Issuing a bond after the warning recovers the company
    Given 1 months pass
    When I issue a bond
    And 3 months pass
    Then the company's cash is $95,249
    And the company should have been restructured 0 times

  # Month 1 price: equity -500 + 50,000 = 49,500 -> 0.495, lifted to $1.00. New shares sell at 90% = $0.90:
  # 10,000 x $0.90 = $9,000. Cash 8,500, then 3 x 1,000 = 5,500.
  Scenario: Selling new shares after the warning recovers the company
    Given 1 months pass
    When the company sells 10,000 new shares
    And 3 months pass
    Then the company's cash is $5,500
    And the company should have been restructured 0 times

  # Two bonds are halved to 50,000 each; a new bond is the third, at 5% + 2 points = 7%.
  Scenario: Play goes on after a restructuring
    Given the company has 2 bonds outstanding
    And 3 months pass
    When I issue a bond
    Then the command succeeds
    And the company's cash is $100,000
    And the company's debt is $200,000
    And the newest bond should have an interest rate of 7%
