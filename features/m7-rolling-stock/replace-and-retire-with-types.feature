@m7
Feature: Replacing and retiring trains with car types
  As a railroad owner
  I want replace and retire to treat each car by its own type
  So that I get a fair price for every car I give up

  Rules (docs/rolling-stock.md, extending M6):
  - Replace keeps the owned cars up to the new locomotive's car limit, in this order: coaches, baggage cars,
    boxcars, hoppers, covered hoppers, flatcars, legacy freight cars. The last ones are sold first, each at 50% of
    its price, and the sale reduces the cost of the replacement.
  - Stop orders that no longer fit the cars kept are dropped, type by type.
  - Retire pays the locomotive's trade-in plus 50% of each owned car's price by its type: coach $5,000, baggage
    car $5,000, boxcar $4,000, hopper $4,000, covered hopper $6,000, flatcar $3,500, legacy freight car $4,000
    (see the ASSUMPTION in legacy-cars.feature). Spare (uncoupled) cars count too.
  - Trade-in of a new locomotive is 50% of its price (American $25,000, Mikado $65,000).

  Fixture steps that name a calendar date come before the steps that create trains.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And existing track from (2, 5) to (18, 5)
    And a small station exists at (2, 5)
    And a small station exists at (18, 5)
    And breakdowns never happen

  # Ten-Wheeler $80,000 - American trade-in $25,000 = $55,000; it holds 6 cars, the 3 owned stay.
  Scenario: Replacing keeps cars of every type when the new locomotive can pull them
    Given the calendar starts on 1 January 1880
    And a train with these cars exists at the station at (2, 5):
      | car     | count |
      | coach   | 1     |
      | boxcar  | 1     |
      | flatcar | 1     |
    When I replace the train's locomotive with a Ten-Wheeler
    Then it cost $55,000
    And the train should own these cars:
      | car     | count |
      | coach   | 1     |
      | boxcar  | 1     |
      | flatcar | 1     |

  # Consolidation (8 cars) -> Mogul (6 cars). Order of keeping: 2 coaches, 1 baggage car, 2 boxcars, 1 hopper
  # (6 cars); the 2 flatcars go. Trade-in Consolidation age 0: 50% x $90,000 = $45,000.
  # Sale of 2 flatcars: 2 x $3,500 = $7,000. Cost: $65,000 - $45,000 - $7,000 = $13,000.
  Scenario: Cars the new locomotive cannot pull are sold, flatcars before hoppers
    Given the calendar starts on 1 January 1900
    And a Consolidation train with these cars exists at the station at (2, 5):
      | car         | count |
      | coach       | 2     |
      | baggage car | 1     |
      | boxcar      | 2     |
      | hopper      | 1     |
      | flatcar     | 2     |
    When I replace the train's locomotive with a Mogul
    Then the command succeeds
    And it cost $13,000
    And the train should own these cars:
      | car         | count |
      | coach       | 2     |
      | baggage car | 1     |
      | boxcar      | 2     |
      | hopper      | 1     |

  # 3 coaches, 1 boxcar and 4 legacy cars: keep 3 + 1 + 2 legacy; sell 2 legacy cars at $4,000 = $8,000.
  # Cost: $65,000 - $45,000 - $8,000 = $12,000.
  Scenario: Legacy freight cars are sold first
    Given the calendar starts on 1 January 1900
    And a Consolidation train with these cars exists at the station at (2, 5):
      | car                | count |
      | coach              | 3     |
      | boxcar             | 1     |
      | legacy freight car | 4     |
    When I replace the train's locomotive with a Mogul
    Then it cost $12,000
    And the train should own these cars:
      | car                | count |
      | coach              | 3     |
      | boxcar             | 1     |
      | legacy freight car | 2     |

  # In 1930 a Mikado (10 cars, trade-in new 50% x $130,000 = $65,000) is replaced by a Pacific ($140,000, 7 cars).
  # Owned: 1 coach, 1 baggage, 1 boxcar, 1 hopper, 2 covered hoppers, 2 flatcars, 2 legacy = 10 cars.
  # Kept (7): coach, baggage, boxcar, hopper, 2 covered hoppers, 1 flatcar.
  # Sold: 1 flatcar $3,500 + 2 legacy x $4,000 = $11,500. Cost: $140,000 - $65,000 - $11,500 = $63,500.
  Scenario: The order of keeping runs through every type
    Given the calendar starts on 1 January 1930
    And a Mikado train with these cars exists at the station at (2, 5):
      | car                | count |
      | coach              | 1     |
      | baggage car        | 1     |
      | boxcar             | 1     |
      | hopper             | 1     |
      | covered hopper     | 2     |
      | flatcar            | 2     |
      | legacy freight car | 2     |
    When I replace the train's locomotive with a Pacific
    Then it cost $63,500
    And the train should own these cars:
      | car            | count |
      | coach          | 1     |
      | baggage car    | 1     |
      | boxcar         | 1     |
      | hopper         | 1     |
      | covered hopper | 2     |
      | flatcar        | 1     |

  # Coaches go first among those kept: 2 coaches + 6 boxcars on a Consolidation -> Mogul keep 2 coaches and
  # 4 boxcars; 2 boxcars are sold for 2 x $4,000 = $8,000. Cost: $65,000 - $45,000 - $8,000 = $12,000.
  # The order for the second stop (6 boxcars) no longer fits the 4 boxcars kept and is dropped; the first
  # order (2 coaches) still fits.
  Scenario: Stop orders that no longer fit the kept cars are dropped
    Given the calendar starts on 1 January 1900
    And a Consolidation train with these cars exists at the station at (2, 5):
      | car    | count |
      | coach  | 2     |
      | boxcar | 6     |
    And the train has these stops:
      | stop    | coaches | boxcars |
      | (2, 5)  | 2       | 0       |
      | (18, 5) | 0       | 6       |
    When I replace the train's locomotive with a Mogul
    Then it cost $12,000
    And the train should have these stops:
      | stop    | coaches | boxcars |
      | (2, 5)  | 2       | 0       |
      | (18, 5) |         |         |

  # Unchanged by the car types: the new locomotive only changes the owned cars when it cannot pull them all.
  Scenario: Replacing keeps the route and stop orders when all cars stay
    Given the calendar starts on 1 January 1880
    And a train with these cars exists at the station at (2, 5):
      | car    | count |
      | coach  | 2     |
      | boxcar | 2     |
    And the train has these stops:
      | stop    | coaches | boxcars |
      | (2, 5)  | 2       | 0       |
      | (18, 5) | 0       | 2       |
    When I replace the train's locomotive with a Ten-Wheeler
    Then the command succeeds
    And the train route should have 2 stops
    And the train should have these stops:
      | stop    | coaches | boxcars |
      | (2, 5)  | 2       | 0       |
      | (18, 5) | 0       | 2       |

  # New American $25,000 + coach $5,000 + baggage car $5,000 + boxcar $4,000 + hopper $4,000 = $43,000.
  Scenario: Retiring pays back half of every car's price by its type
    Given an American train with these cars exists at the station at (2, 5):
      | car         | count |
      | coach       | 1     |
      | baggage car | 1     |
      | boxcar      | 1     |
      | hopper      | 1     |
    When I retire the train
    Then the command succeeds
    And the company should have received a refund of $43,000
    And the company should own 0 trains

  # In 1930: new Mikado $65,000 + coach $5,000 + baggage car $5,000 + boxcar $4,000 + hopper $4,000
  # + covered hopper $6,000 + flatcar $3,500 + legacy freight car $4,000 = $96,500.
  Scenario: Every car type has its own resale value
    Given the calendar starts on 1 January 1930
    And a Mikado train with these cars exists at the station at (2, 5):
      | car                | count |
      | coach              | 1     |
      | baggage car        | 1     |
      | boxcar             | 1     |
      | hopper             | 1     |
      | covered hopper     | 1     |
      | flatcar            | 1     |
      | legacy freight car | 1     |
    When I retire the train
    Then the company should have received a refund of $96,500

  # Cars that are not coupled are still the company's: American $25,000 + 2 coaches x $5,000 + hopper $4,000
  # = $39,000, whatever the stop order at (2, 5) couples.
  Scenario: Spare cars are paid back too
    Given a train with these cars exists at the station at (2, 5):
      | car    | count |
      | coach  | 2     |
      | hopper | 1     |
    And the train has these stops:
      | stop    | coaches | hoppers |
      | (2, 5)  | 0       | 0       |
      | (18, 5) | 2       | 1       |
    When I retire the train
    Then the company should have received a refund of $39,000

  # American $25,000 + 3 flatcars x $3,500 = $10,500: $35,500.
  Scenario: Several cars of one type add up
    Given an American train with these cars exists at the station at (2, 5):
      | car     | count |
      | flatcar | 3     |
    When I retire the train
    Then the company should have received a refund of $35,500

  Scenario: Retired cars cost nothing to run
    Given an American train with these cars exists at the station at (2, 5):
      | car    | count |
      | coach  | 2     |
      | boxcar | 1     |
    When I retire the train
    And 1 months pass
    Then the company should have paid $0 in train running costs
