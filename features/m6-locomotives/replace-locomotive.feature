@m6
Feature: Replacing locomotives
  As a railroad owner
  I want to swap an old locomotive for a newer model
  So that my trains keep up with the times

  Replace works only for a train standing at a station. You pay the new model's price minus a trade-in for
  the old one, paid as rolling stock:
    trade-in = round(old price x (0.5 - 0.4 x min(1, age / working life)))
  which is 50% of the price when new, falling to 10% at the end of the working life.
  Cars, route, stop orders and cargo stay; the new locomotive starts at age 0 and sets the train's speed.
  Extra cars are sold (passenger cars are kept first) at the car resale rate of 50%
  (passenger car $5,000, freight car $4,000).

  Fixture steps that name a calendar date come before the steps that create trains.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And existing track from (2, 5) to (18, 5)
    And a small station exists at (2, 5)
    And a small station exists at (18, 5)
    And breakdowns never happen

  # American age 0 -> Ten-Wheeler: trade-in 50% x $50,000 = $25,000; cost $80,000 - $25,000 = $55,000.
  Scenario: Replacing a new American with a Ten-Wheeler
    Given the calendar starts on 1 January 1875
    And a train exists at the station at (2, 5)
    When I replace the train's locomotive with a Ten-Wheeler
    Then the command succeeds
    And it cost $55,000
    And the company's cash is $945,000
    And the train should be a Ten-Wheeler
    And the train's age should be 0 years

  # Trade-in = round(price x (0.5 - 0.4 x min(1, age / life))); cost = new price - trade-in.
  #   American age 5, life 20:      0.5 - 0.4 x 0.25   = 0.40 -> $20,000; Ten-Wheeler $80,000 -> $60,000
  #   American age 10:              0.5 - 0.4 x 0.5    = 0.30 -> $15,000;                     -> $65,000
  #   American age 20:              0.5 - 0.4 x 1      = 0.10 -> $5,000;                      -> $75,000
  #   American age 30:              min(1, 1.5) = 1, so the same as age 20: $5,000;             -> $75,000
  #   Ten-Wheeler age 15, life 25:  0.5 - 0.4 x 0.6    = 0.26 x $80,000  = $20,800; Pacific $140,000 -> $119,200
  #   Atlantic age 10, life 25:     0.5 - 0.4 x 0.4    = 0.34 x $110,000 = $37,400; Pacific $140,000 -> $102,600
  #   Consolidation age 7, life 30: 0.5 - 0.4 x 7/30   = 0.40667 x $90,000 = $36,600;
  #                                 Northern $200,000 - $36,600 = $163,400
  #   Mikado age 7, life 30:        0.40667 x $130,000 = $52,866.67 -> $52,867;
  #                                 Northern $200,000 - $52,867 = $147,133
  Scenario Outline: The trade-in falls from 50% to 10% over the working life
    Given the calendar starts on 1 January <year>
    And a <old> train exists at the station at (2, 5)
    And the train is <age> years old
    When I replace the train's locomotive with <article> <new>
    Then it cost <cost>

    Examples:
      | year | old           | age | article | new         | cost     |
      | 1880 | American      | 5   | a       | Ten-Wheeler | $60,000  |
      | 1880 | American      | 10  | a       | Ten-Wheeler | $65,000  |
      | 1880 | American      | 20  | a       | Ten-Wheeler | $75,000  |
      | 1880 | American      | 30  | a       | Ten-Wheeler | $75,000  |
      | 1910 | Ten-Wheeler   | 15  | a       | Pacific     | $119,200 |
      | 1910 | Atlantic      | 10  | a       | Pacific     | $102,600 |
      | 1930 | Consolidation | 7   | a       | Northern    | $163,400 |
      | 1930 | Mikado        | 7   | a       | Northern    | $147,133 |

  # American age 10 -> American in 1880: trade-in $15,000; cost $50,000 - $15,000 = $35,000.
  Scenario: A locomotive can be replaced by the same model
    Given the calendar starts on 1 January 1880
    And a train exists at the station at (2, 5)
    And the train is 10 years old
    When I replace the train's locomotive with an American
    Then it cost $35,000
    And the train's age should be 0 years

  # The old model does not need to be on sale: American age 10 (trade-in $15,000) -> Atlantic $110,000 in 1900,
  # cost $95,000.
  Scenario: A locomotive that is no longer on sale can still be traded in
    Given the calendar starts on 1 January 1900
    And a train exists at the station at (2, 5)
    And the train is 10 years old
    When I replace the train's locomotive with an Atlantic
    Then it cost $95,000
    And the train should be an Atlantic

  # American 4 tiles a day, Atlantic 7: in 2 days the train covers 14 tiles, from (2, 5) to (16, 5).
  Scenario: The new locomotive sets the train's speed
    Given the calendar starts on 1 January 1900
    And a train exists at the station at (2, 5)
    And the train has the route (2, 5), (18, 5)
    When I replace the train's locomotive with an Atlantic
    And 2 days pass
    Then the train should be at (16, 5)

  # Ten-Wheeler age 0 after the swap: $2,600 a month. The American's age 10 is gone.
  Scenario: The new locomotive starts at age 0
    Given the calendar starts on 1 January 1880
    And a train exists at the station at (2, 5)
    And the train is 10 years old
    When I replace the train's locomotive with a Ten-Wheeler
    And 1 months pass
    Then the company should have paid $2,600 in train running costs

  Scenario: Replacing keeps the cars, route and stop orders
    Given the calendar starts on 1 January 1880
    And a train exists at the station at (2, 5)
    And the train has 2 passenger cars and 0 freight cars
    And the train has these stops:
      | stop    | passenger cars | freight cars |
      | (2, 5)  | 2              | 0            |
      | (18, 5) | 0              | 2            |
    When I replace the train's locomotive with a Ten-Wheeler
    Then the command succeeds
    And the train should haul 2 passenger cars and 0 freight cars
    And the train route should have 2 stops
    And the train should have these stops:
      | stop    | passenger cars | freight cars |
      | (2, 5)  | 2              | 0            |
      | (18, 5) | 0              | 2            |

  # Consolidation (8 cars) -> Mogul (6 cars): 2 freight cars too many (passenger cars are kept first).
  # Trade-in Consolidation age 0: 50% x $90,000 = $45,000. Sale of 2 freight cars: 2 x $4,000 = $8,000.
  # Cost: $65,000 - $45,000 - $8,000 = $12,000.
  Scenario: Cars the new model cannot pull are sold
    Given the calendar starts on 1 January 1900
    And a Consolidation train with 3 passenger cars and 5 freight cars exists at the station at (2, 5)
    When I replace the train's locomotive with a Mogul
    Then the command succeeds
    And it cost $12,000
    And the train should haul 3 passenger cars and 3 freight cars

  # 7 passenger cars and 1 freight car on a Consolidation -> Mogul holds 6: keep 6 passenger cars, sell
  # 1 passenger car ($5,000) and the freight car ($4,000) = $9,000.
  # Cost: $65,000 - $45,000 - $9,000 = $11,000.
  Scenario: Passenger cars are kept before freight cars
    Given the calendar starts on 1 January 1900
    And a Consolidation train with 7 passenger cars and 1 freight car exists at the station at (2, 5)
    When I replace the train's locomotive with a Mogul
    Then it cost $11,000
    And the train should haul 6 passenger cars and 0 freight cars

  Scenario: A replacement needs the train to be at a station
    Given the calendar starts on 1 January 1880
    And a train exists at the station at (2, 5)
    And the train has the route (2, 5), (18, 5)
    When 1 days pass
    And I replace the train's locomotive with a Ten-Wheeler
    Then the command is rejected with "train must be at a station"
    And no money was spent
    And the train should be an American

  Scenario: Only a model on sale can replace the locomotive
    Given a train exists at the station at (2, 5)
    When I replace the train's locomotive with a Pacific
    Then the command is rejected with "model not on sale"
    And no money was spent
    And the train should be an American

  # American age 0 -> Ten-Wheeler costs $55,000, more than the $20,000 in cash.
  Scenario: The company must afford the replacement
    Given the calendar starts on 1 January 1880
    And a train exists at the station at (2, 5)
    And the company has $20,000 in cash
    When I replace the train's locomotive with a Ten-Wheeler
    Then the command is rejected with "insufficient funds"
    And the company's cash is $20,000
    And the train should be an American
