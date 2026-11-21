@m7
Feature: Cars from older saves
  As a railroad owner with a saved game from before car types
  I want my old cars to keep working
  So that nothing I own is lost when the rules change

  Rules (docs/rolling-stock.md):
  - Passenger cars from an older save become coaches.
  - Freight cars from an older save become legacy freight cars. A legacy freight car carries any freight
    (not passengers or mail), holds 20 units shared by everything it carries, costs $200 a month like every car,
    and can be sold for 50% of its price.
  - A legacy freight car can't be bought: asking for more of them than the train owns is "car type not on sale".
  - Old stop orders carry over: passenger counts become coaches, freight counts become legacy freight cars.

  ASSUMPTION: the legacy freight car's price, which sets its resale value, is the old freight car price of
  $8,000, so it is resold for $4,000 (see BACKLOG-ASSUMPTIONS.md).

  The train starts at (2, 5) and first calls at (18, 5) on day 4. Nothing is unloaded there (no town or industry).
  Loading a train that also owns the matching typed car (say a hopper and a legacy car, both for coal) is not
  specified here.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And existing track from (2, 5) to (18, 5)
    And a small station exists at (2, 5)
    And a small station exists at (18, 5)
    And a train exists at the station at (2, 5)

  Scenario: Old passenger cars become coaches and old freight cars become legacy freight cars
    Given the train comes from an old save with 2 passenger cars and 3 freight cars
    Then the train should own these cars:
      | car                | count |
      | coach              | 2     |
      | legacy freight car | 3     |
    And the train should haul these cars:
      | car                | count |
      | coach              | 2     |
      | legacy freight car | 3     |

  Scenario: An old train with only passenger cars owns no legacy cars
    Given the train comes from an old save with 3 passenger cars and 0 freight cars
    Then the train should own these cars:
      | car   | count |
      | coach | 3     |

  # Mail needed a passenger car before; now it needs a baggage car, so a coach-only old train leaves it.
  Scenario: Coaches from an old save carry passengers but not mail
    Given the train comes from an old save with 2 passenger cars and 0 freight cars
    And the train has the route (2, 5), (18, 5)
    And the station at (18, 5) has 30 passengers waiting
    And the station at (18, 5) has 20 mailbags waiting
    When 4 days pass
    Then the train should be carrying 30 passengers
    And the train should be carrying 0 mailbags
    And the station at (18, 5) should have 20 mailbags waiting

  # One legacy car holds 20 units shared by all freight: coal arrived first (15), timber gets 5 of its 15.
  # Passengers are not freight and stay.
  Scenario: A legacy freight car carries any freight, up to its capacity
    Given the train comes from an old save with 0 passenger cars and 1 freight car
    And the train has the route (2, 5), (18, 5)
    And the station at (18, 5) has 15 coal waiting
    And the station at (18, 5) has 15 timber waiting
    And the station at (18, 5) has 10 passengers waiting
    When 4 days pass
    Then the train should be carrying 15 coal
    And the train should be carrying 5 timber
    And the train should be carrying 0 passengers
    And the station at (18, 5) should have 10 timber waiting
    And the station at (18, 5) should have 10 passengers waiting

  Scenario Outline: A legacy freight car takes every kind of freight
    Given the train comes from an old save with 0 passenger cars and 1 freight car
    And the train has the route (2, 5), (18, 5)
    And the station at (18, 5) has 50 <cargo> waiting
    When 4 days pass
    Then the train should be carrying 20 <cargo>
    And the station at (18, 5) should have 30 <cargo> waiting

    Examples:
      | cargo     |
      | coal      |
      | timber    |
      | lumber    |
      | furniture |
      | grain     |
      | flour     |
      | loaves    |

  Scenario: A legacy freight car does not carry passengers or mail
    Given the train comes from an old save with 0 passenger cars and 1 freight car
    And the train has the route (2, 5), (18, 5)
    And the station at (18, 5) has 10 passengers waiting
    And the station at (18, 5) has 10 mailbags waiting
    When 4 days pass
    Then the train should be carrying no cargo
    And the station at (18, 5) should have 10 passengers waiting
    And the station at (18, 5) should have 10 mailbags waiting

  # A train that owns 2 legacy cars may not grow that number.
  Scenario: Legacy freight cars cannot be bought
    Given the train comes from an old save with 0 passenger cars and 2 freight cars
    When I change the train's cars to:
      | car                | count |
      | legacy freight car | 3     |
    Then the command is rejected with "car type not on sale"
    And no money was spent
    And the train should own these cars:
      | car                | count |
      | legacy freight car | 2     |

  Scenario: A new train cannot be bought with legacy freight cars
    When I buy a locomotive with these cars at the station at (2, 5):
      | car                | count |
      | legacy freight car | 1     |
    Then the command is rejected with "car type not on sale"
    And no money was spent
    And the company should own 1 train

  # Selling 2 of 3 legacy cars: 2 x 50% x $8,000 = $8,000.
  Scenario: Legacy freight cars can be sold
    Given the train comes from an old save with 0 passenger cars and 3 freight cars
    When I change the train's cars to:
      | car                | count |
      | legacy freight car | 1     |
    Then the company should have received a refund of $8,000
    And the train should own these cars:
      | car                | count |
      | legacy freight car | 1     |

  # Legacy cars can be swapped for new types: sell 1 legacy car ($4,000), buy 1 flatcar ($7,000): $3,000.
  Scenario: A legacy freight car can be exchanged for a car on sale
    Given the train comes from an old save with 0 passenger cars and 1 freight car
    When I change the train's cars to:
      | car     | count |
      | flatcar | 1     |
    Then it cost $3,000
    And the train should own these cars:
      | car     | count |
      | flatcar | 1     |

  # Legacy cars cost what every car costs: American $2,000 + 2 coaches and 3 legacy cars = 5 x $200 = $3,000.
  Scenario: Legacy freight cars cost $200 a month to run
    Given the train comes from an old save with 2 passenger cars and 3 freight cars
    When 1 months pass
    Then the company should have paid $3,000 in train running costs

  Scenario: Old stop orders carry over to coaches and legacy freight cars
    Given the train comes from an old save with 2 passenger cars and 1 freight car and these stops:
      | stop    | passenger cars | freight cars |
      | (2, 5)  | 2              | 0            |
      | (18, 5) | 0              | 1            |
    Then the train should have these stops:
      | stop    | coaches | legacy freight cars |
      | (2, 5)  | 2       | 0                   |
      | (18, 5) | 0       | 1                   |
    When 4 days pass
    Then the train should haul these cars:
      | car                | count |
      | legacy freight car | 1     |

  Scenario: A stop order cannot use more legacy freight cars than the train owns
    Given the train comes from an old save with 0 passenger cars and 2 freight cars
    When I assign the train these stops:
      | stop    | legacy freight cars |
      | (2, 5)  | 3                   |
      | (18, 5) |                     |
    Then the command is rejected with "a stop order can use at most the train's 2 legacy-freight cars"
