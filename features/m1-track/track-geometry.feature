@m1
Feature: Track geometry
  As a railroad owner
  I want track to curve and branch the way real railways do
  So that every junction I build can actually be used by trains

  Rules: at any tile a train may run straight on or turn by one step of 45 degrees. New track may
  not turn more sharply than that, a new branch must join existing track at a gentle angle, and
  diagonal track may not cross other diagonal track between tiles (there is no junction there).
  Track can cross straight over other track at a tile. Trains only reverse at stations.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash

  Scenario: A 45-degree bend can be built
    When I build track along (2, 2), (3, 2), (4, 3)
    Then the command succeeds

  Scenario: A right-angle corner cannot be built
    When I build track along (2, 2), (3, 2), (3, 3)
    Then the command is rejected with "turn too sharp"
    And no money was spent

  Scenario: A branch cannot meet existing track at a right angle
    Given existing track from (2, 8) to (8, 2)
    When I build track along (2, 2), (3, 3), (4, 4), (5, 5)
    Then the command is rejected with "turn too sharp"

  Scenario: A branch can leave existing track at 45 degrees
    Given existing track from (2, 5) to (10, 5)
    When I build track along (5, 5), (6, 6), (7, 7)
    Then the command succeeds

  Scenario: A branch cannot leave existing track at a right angle
    Given existing track from (2, 5) to (10, 5)
    When I build track along (5, 5), (5, 6), (5, 7)
    Then the command is rejected with "turn too sharp"

  Scenario: Diagonal track cannot cross diagonal track between tiles
    Given existing track from (2, 2) to (3, 3)
    When I build track along (3, 2), (2, 3)
    Then the command is rejected with "track would cross"

  Scenario: Track can cross straight over other track at a tile
    Given existing track from (2, 5) to (8, 5)
    When I build track along (5, 2), (5, 3), (5, 4), (5, 5), (5, 6), (5, 7)
    Then the command succeeds

  Scenario: The route planner only suggests smooth routes
    Given existing track from (2, 10) to (10, 10)
    When I ask for a route from (6, 4) to (10, 10)
    Then the suggested route should turn by at most 45 degrees at every tile

  Scenario: A train cannot take a right-angle turn at a crossing
    Given existing track from (2, 5) to (8, 5)
    And existing track from (5, 2) to (5, 8)
    And a small station exists at (2, 5)
    And a small station exists at (5, 8)
    And a train exists at the station at (2, 5)
    When I assign the train the route (2, 5), (5, 8)
    Then the command is rejected with "no track connects (2, 5) and (5, 8)"

  Scenario: A train reverses at a station but not out on the line
    Given existing track from (2, 5) to (10, 5)
    And existing track from (5, 5) to (8, 8)
    And a small station exists at (2, 5)
    And a small station exists at (10, 5)
    And a small station exists at (8, 8)
    And a train exists at the station at (10, 5)
    When I assign the train the route (10, 5), (8, 8)
    Then the command is rejected with "no track connects (10, 5) and (8, 8)"
    When I assign the train the route (10, 5), (2, 5), (8, 8)
    Then the command succeeds
