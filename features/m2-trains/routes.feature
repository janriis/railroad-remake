@m2 @wip
Feature: Train routes
  As a railroad owner
  I want to give a train a list of stops
  So that it shuttles between my stations

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And existing track from (2, 5) to (12, 5)
    And a small station exists at (2, 5)
    And a small station exists at (8, 5)
    And a small station exists at (12, 5)
    And a train exists at the station at (2, 5)

  Scenario: Assigning two stops
    When I assign the train the route (2, 5), (12, 5)
    Then the command succeeds
    And the train route should have 2 stops

  Scenario: A route may have more than two stops
    When I assign the train the route (2, 5), (8, 5), (12, 5)
    Then the command succeeds
    And the train route should have 3 stops

  Scenario: A stop must be a station
    When I assign the train the route (2, 5), (5, 5)
    Then the command is rejected with "stop is not a station"

  Scenario: A route needs at least two stops
    When I assign the train the route (2, 5)
    Then the command is rejected with "route needs at least two stops"

  Scenario: A stop that cannot be reached by track is rejected
    Given existing track from (2, 10) to (6, 10)
    And a small station exists at (6, 10)
    When I assign the train the route (2, 5), (6, 10)
    Then the command is rejected with "no track connects (2, 5) and (6, 10)"

  Scenario: A rejected route leaves the old route unchanged
    Given the train has the route (2, 5), (12, 5)
    When I assign the train the route (2, 5), (5, 5)
    Then the command is rejected with "stop is not a station"
    And the train route should have 2 stops

  Scenario: Consecutive stops must differ
    When I assign the train the route (2, 5), (2, 5)
    Then the command is rejected with "consecutive stops must differ"
