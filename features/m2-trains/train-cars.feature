@m2
Feature: Changing a train's cars
  As a railroad owner
  I want to change the cars a train hauls, and what it hauls on each part of its route
  So that each train carries what its route needs

  Adding a car costs its price (passenger $10,000, freight $8,000). Taking a car off pays back half.
  A stop order sets which of the train's own cars are coupled from that stop on: any mix of passenger and
  freight cars up to the number the train owns, or none at all (the locomotive runs alone). Swapping types
  is free. Cars that are not coupled stay with the train as spares and still cost their running cost;
  only coupled cars carry cargo.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And existing track from (2, 5) to (18, 5)
    And a small station exists at (2, 5)
    And a small station exists at (18, 5)
    And a train exists at the station at (2, 5)
    And the train has 1 passenger car and 0 freight cars

  Scenario: Adding cars costs their price
    When I change the train's cars to 3 passenger cars and 1 freight car
    Then the command succeeds
    And it cost $28,000
    And the train should haul 3 passenger cars and 1 freight car

  Scenario: Taking cars off pays back half their price
    Given the train has 3 passenger cars and 0 freight cars
    When I change the train's cars to 1 passenger car and 0 freight cars
    Then the company should have received a refund of $10,000

  Scenario: Swapping car types pays for the new and refunds the old
    When I change the train's cars to 0 passenger cars and 1 freight car
    Then it cost $3,000

  Scenario: A train holds at most 6 cars
    When I change the train's cars to 5 passenger cars and 2 freight cars
    Then the command is rejected with "too many cars"
    And the train should haul 1 passenger car and 0 freight cars

  Scenario: The company must afford new cars
    Given the company has $5,000 in cash
    When I change the train's cars to 2 passenger cars and 0 freight cars
    Then the command is rejected with "insufficient funds"
    And no money was spent

  Scenario: Cars are swapped at each stop as ordered
    Given the train has 2 passenger cars and 0 freight cars
    When I assign the train these stops:
      | stop    | passenger cars | freight cars |
      | (2, 5)  | 2              | 0            |
      | (18, 5) | 0              | 2            |
    And 4 days pass
    Then the train should be waiting at the station at (18, 5)
    And the train should haul 0 passenger cars and 2 freight cars
    When 4 days pass
    Then the train should haul 2 passenger cars and 0 freight cars
    And no money was spent

  Scenario: A stop without an order keeps the cars as they are
    Given the train has 2 passenger cars and 0 freight cars
    When I assign the train these stops:
      | stop    | passenger cars | freight cars |
      | (2, 5)  |                |              |
      | (18, 5) | 1              | 1            |
    And 8 days pass
    Then the train should haul 1 passenger car and 1 freight car

  Scenario: A stop order cannot use more cars than the train owns
    Given the train has 2 passenger cars and 0 freight cars
    When I assign the train these stops:
      | stop    | passenger cars | freight cars |
      | (2, 5)  | 3              | 0            |
      | (18, 5) |                |              |
    Then the command is rejected with "a stop order can use at most the train's 2 cars"

  # The train starts at (2, 5) and first calls at (18, 5) on day 4, where it uncouples its cars; it is back
  # at (2, 5) on day 8 and couples both again.
  Scenario: A train can leave a station without cars
    Given the train has 2 passenger cars and 0 freight cars
    When I assign the train these stops:
      | stop    | passenger cars | freight cars |
      | (2, 5)  | 2              | 0            |
      | (18, 5) | 0              | 0            |
    Then the command succeeds
    When 6 days pass
    Then the train should haul 0 passenger cars and 0 freight cars
    And the train should own 2 cars
    When 4 days pass
    Then the train should haul 2 passenger cars and 0 freight cars

  # Owned cars cost $200 a month whether coupled or not: $2,000 locomotive + 2 x $200 = $2,400.
  Scenario: Spare cars still cost their running cost
    Given the train has 2 passenger cars and 0 freight cars
    And the train has these stops:
      | stop    | passenger cars | freight cars |
      | (2, 5)  | 0              | 0            |
      | (18, 5) | 2              | 0            |
    When 1 months pass
    Then the company should have paid $2,400 in train running costs

  Scenario: A train running without cars carries nothing
    Given the town "Alder" with 1,000 inhabitants exists at (2, 5)
    And the train has 2 passenger cars and 0 freight cars
    And the train has these stops:
      | stop    | passenger cars | freight cars |
      | (2, 5)  | 0              | 0            |
      | (18, 5) | 2              | 0            |
    When 35 days pass
    Then the train should be carrying no cargo

  Scenario: Changing how many cars a train owns drops orders that no longer fit
    Given the train has 2 passenger cars and 0 freight cars
    And the train has these stops:
      | stop    | passenger cars | freight cars |
      | (2, 5)  | 2              | 0            |
      | (18, 5) | 0              | 2            |
    When I change the train's cars to 1 passenger car and 0 freight cars
    Then the train should have no stop orders
