@m2 @wip
Feature: Train movement
  As a railroad owner
  I want trains to run along my track over time
  So that cargo and passengers actually get somewhere

  A locomotive travels 4 tiles per day. A diagonal step counts as 1.5 tiles. Trains follow the shortest route over track.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And existing track from (2, 5) to (18, 5)
    And a small station exists at (2, 5)
    And a small station exists at (18, 5)

  Scenario: A train advances along the track
    Given a train exists at the station at (2, 5)
    And the train has the route (2, 5), (18, 5)
    When 1 days pass
    Then the train should be at (6, 5)

  Scenario Outline: Position after several days
    Given a train exists at the station at (2, 5)
    And the train has the route (2, 5), (18, 5)
    When <days> days pass
    Then the train should be at <position>

    Examples:
      | days | position |
      | 2    | (10, 5)  |
      | 3    | (14, 5)  |
      | 4    | (18, 5)  |

  Scenario: The train stops at its station and turns around
    Given a train exists at the station at (2, 5)
    And the train has the route (2, 5), (18, 5)
    When 4 days pass
    Then the train should be waiting at the station at (18, 5)
    When 1 days pass
    Then the train should be at (14, 5)

  Scenario: A train with no route stays where it is
    Given a train exists at the station at (2, 5)
    When 3 days pass
    Then the train should be at (2, 5)

  Scenario: The train picks the shortest of two routes
    Given existing track from (2, 5) to (2, 9)
    And existing track from (2, 9) to (10, 9)
    And existing track from (10, 9) to (10, 5)
    And a small station exists at (10, 5)
    And a train exists at the station at (2, 5)
    And the train has the route (2, 5), (10, 5)
    When 2 days pass
    Then the train should be at (10, 5)

  Scenario: Moving time is deterministic
    Given a train exists at the station at (2, 5)
    And the train has the route (2, 5), (18, 5)
    When 3 days pass
    And 1 days pass
    Then the train should be at (18, 5)
