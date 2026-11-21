@m8 @wip
Feature: Share price
  As a railroad owner
  I want the company's shares to be priced by what it owns and earns
  So that I can see how well the railroad is doing

  Rules: assets are valued at half of what they would cost today (track, stations and station buildings at
  half their build cost, locomotives at trade-in value, cars at resale value). Equity = cash + assets - bond
  debt. Operating profit = income minus running costs (cargo income, goods sales, track maintenance, train
  running, building upkeep, bond interest) over the last 12 months; construction, rolling stock and financing
  are left out. Share price = (equity + 8 x max(0, operating profit)) / shares outstanding, in whole cents,
  never below $1.00. It is recomputed at every month end and kept as a monthly history. The company starts
  with $1,000,000 and 100,000 shares.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And the calendar starts on 1 January 1850

  Scenario: The game starts at $10.00 a share
    Then the company should have 100,000 shares outstanding
    And the share price is $10.00

  Scenario: With no assets and no debt, equity is cash
    Then the company's assets are valued at $0
    And the company's equity is $1,000,000

  # Equity = 1,000,000 + 0 - 2 x 100,000.
  Scenario: Bond debt is subtracted from equity
    Given the company has 2 bonds outstanding
    Then the company's equity is $800,000

  # A segment costs the most expensive terrain it touches; its value is half that.
  Scenario Outline: A track segment is valued at half its build cost
    Given the tile (3, 2) is <terrain>
    And existing track from (2, 2) to (3, 2)
    Then the company's assets are valued at <value>

    Examples:
      | terrain  | value   |
      | plains   | $5,000  |
      | forest   | $7,500  |
      | hills    | $12,500 |
      | mountain | $30,000 |

  # Bridge: 2 segments x $30,000 = $60,000 to build, so $30,000.
  Scenario: Bridge segments are valued at half the bridge price
    Given the tile (4, 2) is water
    And a bridge exists from (3, 2) to (5, 2)
    Then the company's assets are valued at $30,000

  # 4 segments x $10,000 = $40,000 per line, so $20,000; two lines = $40,000.
  Scenario: Double track counts twice
    Given existing double track from (2, 2) to (6, 2)
    Then the company's assets are valued at $40,000

  # Track (2,5)-(6,5): 4 x $5,000 = $20,000. Stations: small $5,000 / medium $15,000 / large $40,000, halved.
  Scenario Outline: A station is valued at half its price
    Given existing track from (2, 5) to (6, 5)
    And a <size> station exists at (4, 5)
    Then the company's assets are valued at <value>

    Examples:
      | size   | value   |
      | small  | $22,500 |
      | medium | $27,500 |
      | large  | $40,000 |

  # Track $20,000 + medium station $7,500 + coal yard (cost $10,000) $5,000 = $32,500.
  Scenario: A station building is valued at half its cost
    Given existing track from (2, 5) to (6, 5)
    And the town "Alder" with 1,000 inhabitants exists at (4, 5)
    And a medium station exists at (4, 5) covering "Alder"
    And the station at (4, 5) has a coal yard
    Then the company's assets are valued at $32,500

  # Track $20,000 + small station $2,500 + new American $25,000 (trade-in 50% of $50,000)
  # + 2 coaches x $5,000 + 1 boxcar x $4,000 = $14,000: total $61,500.
  Scenario: Locomotives are valued at trade-in value and cars at resale value
    Given existing track from (2, 5) to (6, 5)
    And a small station exists at (2, 5)
    And an American train with 2 coaches and 1 boxcar exists at the station at (2, 5)
    Then the company's assets are valued at $61,500
    And the company's equity is $1,061,500

  # American aged 10 of 20 years: 0.5 - 0.4 x 0.5 = 0.3 x $50,000 = $15,000.
  Scenario: An old locomotive is worth less
    Given existing track from (2, 5) to (6, 5)
    And a small station exists at (2, 5)
    And an American train exists at the station at (2, 5)
    And the train is 10 years old
    Then the company's assets are valued at $37,500

  # 10 segments: $50,000 assets, $1,000 maintenance. Cash 950,000 - 1,000 = 949,000.
  # Equity 949,000 + 50,000 = 999,000. Operating profit is a loss of $1,000, so it adds nothing.
  # 999,000 / 100,000 = $9.99.
  Scenario: A loss does not lower the price beyond equity
    Given the company has $950,000 in cash
    And existing track from (2, 2) to (12, 2)
    When 1 months pass
    Then the company's operating loss is $1,000
    And the share price is $9.99

  # Delivery 100 x 10 x $5 = $5,000 income. Cash 950,000 + 5,000 - 1,000 = 954,000; equity 1,004,000.
  # Operating profit 5,000 - 1,000 = 4,000. (1,004,000 + 8 x 4,000) / 100,000 = $10.36.
  Scenario: Eight times operating profit is added to equity
    Given the company has $950,000 in cash
    And existing track from (2, 2) to (12, 2)
    When 100 passengers are delivered over 10 tiles in 10 days
    And 1 months pass
    Then the company's operating profit is $4,000
    And the share price is $10.36

  # Building 10 segments costs $100,000 (construction, left out of operating profit).
  # Cash 900,000 - 1,000 = 899,000; assets $50,000; equity 949,000; operating loss -> adds 0. $9.49.
  Scenario: Construction is left out of operating profit
    When I build track from (2, 2) to (12, 2)
    And 1 months pass
    Then the company's operating loss is $1,000
    And the share price is $9.49

  # Interest 417. Cash 999,583; debt 100,000; equity 899,583; loss adds 0. 899,583 / 100,000 = 8.99583 -> $9.00.
  Scenario: Bond interest counts against operating profit
    Given the company has 1 bond outstanding
    When 1 months pass
    Then the company's operating loss is $417
    And the share price is $9.00

  # Issuing the bond changes cash and debt equally; the financing is left out of operating profit.
  Scenario: Financing is left out of operating profit
    When I issue a bond
    And 1 months pass
    Then the company's operating loss is $417
    And the share price is $10.00

  # Cash 1,000: equity 1,000 / 100,000 = $0.01, lifted to the floor.
  Scenario: The price never falls below $1.00
    Given the company has $1,000 in cash
    When 1 months pass
    Then the share price is $1.00

  # Income 5,000 in month 1 and nothing else. For 12 months it counts: (1,005,000 + 8 x 5,000) / 100,000 = $10.45.
  # In month 13 it has left the window: 1,005,000 / 100,000 = $10.05.
  Scenario Outline: Operating profit looks at the last 12 months only
    Given the company has $1,000,000 in cash
    When 100 passengers are delivered over 10 tiles in 10 days
    And <months> months pass
    Then the company's operating profit is <profit>
    And the share price is <price>

    Examples:
      | months | profit | price  |
      | 12     | $5,000 | $10.45 |
      | 13     | $0     | $10.05 |

  # Building changes equity at once, but the price waits for the month end.
  Scenario: The price is recomputed at month end only
    When I build track from (2, 2) to (12, 2)
    And 20 days pass
    Then the share price is $10.00
    When 10 days pass
    Then the share price is $9.49

  # Months 1 to 3 each cost $1,000: 949,000 / 948,000 / 947,000 cash + 50,000 assets.
  Scenario: The price history keeps one entry per month
    Given the company has $950,000 in cash
    And existing track from (2, 2) to (12, 2)
    When 3 months pass
    Then the share price history should have 3 entries
    And the share price history entry 1 should be $9.99
    And the share price history entry 2 should be $9.98
    And the share price history entry 3 should be $9.97
