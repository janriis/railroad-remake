@m2
Feature: Changing a train's cars
  As a railroad owner
  I want to change the cars a train hauls, and what it hauls on each part of its route
  So that each train carries what its route needs

  Adding a car costs its price (coach $10,000, boxcar $8,000). Taking a car off pays back half.
  A stop order sets which of the train's own cars are coupled from that stop on: any mix of types, up to the
  number of each type the train owns, or none at all (the locomotive runs alone). There is no free swapping:
  a stop order can only couple cars the train already owns. Cars that are not coupled stay with the train as
  spares and still cost their running cost; only coupled cars carry cargo.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And existing track from (2, 5) to (18, 5)
    And a small station exists at (2, 5)
    And a small station exists at (18, 5)
    And a train exists at the station at (2, 5)
    And the train owns 1 coach

  Scenario: Adding cars costs their price
    When I change the train's cars to 3 coaches and 1 boxcar
    Then the command succeeds
    And it cost $28,000
    And the train should haul 3 coaches and 1 boxcar

  Scenario: Taking cars off pays back half their price
    Given the train owns 3 coaches
    When I change the train's cars to 1 coach and 0 boxcars
    Then the company should have received a refund of $10,000

  # New boxcar $8,000 minus half the coach's price ($5,000) = $3,000.
  Scenario: Replacing a coach with a boxcar pays for the new and refunds the old
    When I change the train's cars to 0 coaches and 1 boxcar
    Then it cost $3,000

  Scenario: A train holds at most as many cars as its locomotive allows
    When I change the train's cars to 5 coaches and 0 boxcars
    Then the command is rejected with "too many cars"
    And the train should haul 1 coach and 0 boxcars

  Scenario: The company must afford new cars
    Given the company has $5,000 in cash
    When I change the train's cars to 2 coaches and 0 boxcars
    Then the command is rejected with "insufficient funds"
    And no money was spent

  Scenario: Cars are swapped at each stop as ordered
    Given the train owns 2 coaches and 2 boxcars
    When I assign the train these stops:
      | stop    | coaches | boxcars |
      | (2, 5)  | 2              | 0            |
      | (18, 5) | 0              | 2            |
    And 4 days pass
    Then the train should be waiting at the station at (18, 5)
    And the train should haul 0 coaches and 2 boxcars
    When 4 days pass
    Then the train should haul 2 coaches and 0 boxcars
    And no money was spent

  Scenario: A stop without an order keeps the cars as they are
    Given the train owns 2 coaches and 2 boxcars
    When I assign the train these stops:
      | stop    | coaches | boxcars |
      | (2, 5)  |                |              |
      | (18, 5) | 1              | 1            |
    And 8 days pass
    Then the train should haul 1 coach and 1 boxcar

  Scenario: A stop order cannot use more cars than the train owns
    Given the train owns 2 coaches
    When I assign the train these stops:
      | stop    | coaches | boxcars |
      | (2, 5)  | 3              | 0            |
      | (18, 5) |                |              |
    Then the command is rejected with "a stop order can use at most the train's 2 coach cars"

  # The train starts at (2, 5) and first calls at (18, 5) on day 4, where it uncouples its cars; it is back
  # at (2, 5) on day 8 and couples both again.
  Scenario: A train can leave a station without cars
    Given the train owns 2 coaches
    When I assign the train these stops:
      | stop    | coaches | boxcars |
      | (2, 5)  | 2              | 0            |
      | (18, 5) | 0              | 0            |
    Then the command succeeds
    When 6 days pass
    Then the train should haul 0 coaches and 0 boxcars
    And the train should own 2 cars
    When 4 days pass
    Then the train should haul 2 coaches and 0 boxcars

  # Owned cars cost $200 a month whether coupled or not: $2,000 locomotive + 2 x $200 = $2,400.
  Scenario: Spare cars still cost their running cost
    Given the train owns 2 coaches
    And the train has these stops:
      | stop    | coaches | boxcars |
      | (2, 5)  | 0              | 0            |
      | (18, 5) | 2              | 0            |
    When 1 months pass
    Then the company should have paid $2,400 in train running costs

  Scenario: A train running without cars carries nothing
    Given the town "Alder" with 1,000 inhabitants exists at (2, 5)
    And the train owns 2 coaches
    And the train has these stops:
      | stop    | coaches | boxcars |
      | (2, 5)  | 0              | 0            |
      | (18, 5) | 2              | 0            |
    When 35 days pass
    Then the train should be carrying no cargo

  Scenario: Changing how many cars a train owns drops orders that no longer fit
    Given the train owns 2 coaches and 2 boxcars
    And the train has these stops:
      | stop    | coaches | boxcars |
      | (2, 5)  | 2              | 0            |
      | (18, 5) | 0              | 2            |
    When I change the train's cars to 1 coach and 0 boxcars
    Then the train should have no stop orders
