@m5 @wip
Feature: Town demand
  As a railroad owner
  I want towns to buy the goods my buildings make
  So that my industrial chains earn money

  Rules: per 1,000 inhabitants a town wants each month: loaves 40, furniture 5, coal 20, lumber 10. Prices per
  unit: loaves $60, furniture $400, coal $40, lumber $90, flour $50 (towns do not want flour by default).
  Goods sell at full price up to the month's demand, at half price from demand up to twice the demand, and
  not at all beyond that (the rest waits at the station). Demand renews every month. Goods delivered by
  train to any station serving a town sell the same way without a building. A town whose bread demand was
  met that year grows 5% on top of the passenger growth.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And the calendar starts on 1 January 1850
    And existing track from (2, 5) to (12, 5)
    And the town "Alder" with 1,000 inhabitants exists at (4, 5)
    And a large station exists at (4, 5) covering "Alder"

  # Alder (1,000): loaves demand 40, so full price up to 40, half price ($30) 41-80, nothing above 80.
  # Flour in -> loaves out at 1:2.
  #   20 flour -> 40 loaves: 40 x 60 = 2,400
  #   30 flour -> 60 loaves: 2,400 + 20 x 30 = 3,000
  #   40 flour -> 80 loaves: 2,400 + 40 x 30 = 3,600
  #   50 flour -> 100 loaves: 3,600 sold, 20 loaves wait
  Scenario Outline: A town buys bread with a price that falls as demand saturates
    Given the station at (4, 5) has a bakery
    And the bakery in the station at (4, 5) has received <flour> flour
    When 1 months pass
    Then the ledger for 1850 should show <sales> in goods sales
    And the station at (4, 5) should have <waiting> loaves waiting

    Examples:
      | flour | sales  | waiting |
      | 20    | $2,400 | 0       |
      | 30    | $3,000 | 0       |
      | 40    | $3,600 | 0       |
      | 50    | $3,600 | 20      |

  # Demand renews: two months of 20 flour -> 40 loaves each month, each fully at full price: 2 x 2,400.
  Scenario: Demand resets every month
    Given the station at (4, 5) has a bakery
    And the bakery in the station at (4, 5) is supplied with 20 flour every month
    When 2 months pass
    Then the ledger for 1850 should show $4,800 in goods sales

  # Demand = population / 1,000 x 40 loaves; delivering exactly the demand sells it all at $60.
  #   500 -> 20 loaves -> 1,200;  1,000 -> 40 -> 2,400;  4,000 -> 160 -> 9,600.
  Scenario Outline: Demand grows with the population
    Given the town "Birch" with <people> inhabitants exists at (10, 5)
    And a medium station exists at (10, 5) covering "Birch"
    When <loaves> loaves are delivered to the station at (10, 5) over 10 tiles in 10 days
    Then the town of "Birch" should have bought <loaves> loaves for <price>

    Examples:
      | people | loaves | price  |
      | 500    | 20     | $1,200 |
      | 1,000  | 40     | $2,400 |
      | 4,000  | 160    | $9,600 |

  # Direct sales: no building at the station; the goods sell at demand price.
  # Alder demand: furniture 5 x 400 = 2,000; coal 20 x 40 = 800; lumber 10 x 90 = 900; loaves 40 x 60 = 2,400.
  Scenario Outline: Goods delivered to a town station sell without a building
    When <amount> <cargo> are delivered to the station at (4, 5) over 10 tiles in 10 days
    Then the town of "Alder" should have bought <amount> <cargo> for <price>

    Examples:
      | cargo     | amount | price  |
      | loaves    | 40     | $2,400 |
      | furniture | 5      | $2,000 |
      | coal      | 20     | $800   |
      | lumber    | 10     | $900   |

  # 100 loaves: 40 x 60 + 40 x 30 = 3,600 bought, 20 loaves are left at the station.
  Scenario: Direct sales saturate the same way
    When 100 loaves are delivered to the station at (4, 5) over 10 tiles in 10 days
    Then the town of "Alder" should have bought 80 loaves for $3,600
    And the station at (4, 5) should have 20 loaves waiting

  # Freight pay: 40 loaves x 10 tiles x $9 = 3,600 (10 days, no time penalty); plus the sale 2,400.
  Scenario: A direct sale is paid on top of the freight pay
    When 40 loaves are delivered to the station at (4, 5) over 10 tiles in 10 days
    Then the company should be paid $6,000

  Scenario: Towns do not want flour by default
    When 10 flour are delivered to the station at (4, 5) over 10 tiles in 10 days
    Then the town of "Alder" should have bought 0 flour for $0

  # A station at (12, 5) covers no town tile, so nobody buys there.
  Scenario: A station that serves no town buys nothing
    Given a small station exists at (12, 5)
    When 40 loaves are delivered to the station at (12, 5) over 10 tiles in 10 days
    Then the station at (12, 5) should have 40 loaves waiting

  # Growth. Bread demand is "met" in a month when 40 loaves (Alder's demand) sold at full price.
  # Assumed rule: the town grows when demand was met in at least half of the year's months.
  # 1,000 x 1.05 = 1,050.
  Scenario: A town fed with bread grows
    Given the station at (4, 5) has a bakery
    And the bakery in the station at (4, 5) is supplied with 20 flour every month
    When 1 years pass
    Then the town of "Alder" should have 1,050 inhabitants

  Scenario: A town without bread does not grow
    Given the station at (4, 5) has a bakery
    When 1 years pass
    Then the town of "Alder" should have 1,000 inhabitants

  # Passenger growth 10% + bread 5% on top, taken additively on the starting population:
  # 1,000 x (1 + 0.10 + 0.05) = 1,150.
  Scenario: Bread growth adds to passenger growth
    Given the station at (4, 5) has a bakery
    And the bakery in the station at (4, 5) is supplied with 20 flour every month
    And the passengers of "Alder" are being carried away
    When 1 years pass
    Then the town of "Alder" should have 1,150 inhabitants
