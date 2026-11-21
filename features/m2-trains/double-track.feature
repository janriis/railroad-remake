@m2
Feature: Double track
  As a railroad owner
  I want to upgrade busy single track to double track
  So that trains running in opposite directions can pass anywhere instead of getting stuck head-on

  Rules: doubling follows the existing track between two tiles and costs what building those
  segments would cost today (a bridge segment costs a bridge segment). On double track each
  direction has its own line, so a segment holds one train per direction; tiles on a plain double
  line can be shared by trains passing each other. Double track costs twice the maintenance, and
  demolishing it refunds both lines.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash

  Scenario: Doubling existing track costs the same as building it
    Given existing track from (2, 5) to (6, 5)
    When I double the track from (2, 5) to (6, 5)
    Then it cost $40,000
    And the track from (2, 5) to (6, 5) should be double

  Scenario: Doubling follows the existing track between the two tiles
    Given existing track from (2, 5) to (6, 5)
    And existing track from (6, 5) to (9, 8)
    When I double the track from (2, 5) to (9, 8)
    Then it cost $85,000
    And the track from (2, 5) to (9, 8) should be double

  Scenario: Only the single parts of a line are charged
    Given existing double track from (2, 5) to (4, 5)
    And existing track from (4, 5) to (8, 5)
    When I double the track from (2, 5) to (8, 5)
    Then it cost $40,000

  Scenario: Track that is already double cannot be doubled again
    Given existing double track from (2, 5) to (6, 5)
    When I double the track from (2, 5) to (6, 5)
    Then the command is rejected with "already double track"
    And no money was spent

  Scenario: Only existing track can be doubled
    Given existing track from (2, 5) to (6, 5)
    When I double the track from (2, 5) to (9, 9)
    Then the command is rejected with "no track connects (2, 5) and (9, 9)"
    And no money was spent

  Scenario: Doubling needs the money for it
    Given existing track from (2, 5) to (6, 5)
    And the company has $30,000 in cash
    When I double the track from (2, 5) to (6, 5)
    Then the command is rejected with "insufficient funds"
    And no money was spent

  Scenario: Trains running in opposite directions pass on double track
    Given existing double track from (2, 5) to (18, 5)
    And a small station exists at (2, 5)
    And a small station exists at (18, 5)
    And a train exists at the station at (2, 5) with the route (2, 5), (18, 5)
    And a train exists at the station at (18, 5) with the route (18, 5), (2, 5)
    When 10 days pass
    Then both trains should have completed a journey
    And no train should be deadlocked
    And no line should have held two trains at once

  Scenario: Trains in the same direction still keep a block apart on double track
    Given existing double track from (2, 5) to (18, 5)
    And a small station exists at (2, 5)
    And a small station exists at (18, 5)
    And a slow train exists at (6, 5) with the route (18, 5), (2, 5)
    And a train exists at the station at (2, 5) with the route (2, 5), (18, 5)
    When 3 days pass
    Then the following train should have waited behind the slow train
    And no line should have held two trains at once

  Scenario: Double track costs twice the maintenance
    Given existing double track from (2, 5) to (12, 5)
    When 1 months pass
    Then the company should have paid $2,000 in track maintenance

  Scenario: Demolishing double track refunds both lines
    Given existing double track from (2, 5) to (4, 5)
    When I demolish track from (2, 5) to (4, 5)
    Then the company should have received a refund of $10,000
    And the track network has 0 segments

  Scenario: A doubled stretch in the middle of a single line works as a passing place
    Given existing track from (2, 5) to (18, 5)
    And existing double track from (7, 5) to (13, 5)
    And a small station exists at (2, 5)
    And a small station exists at (18, 5)
    And a train exists at the station at (2, 5) with the route (2, 5), (18, 5)
    And a train exists at the station at (18, 5) with the route (18, 5), (2, 5)
    When 10 days pass
    Then both trains should have completed a journey
    And no train should be deadlocked
    And no line should have held two trains at once

  Scenario: Trains standing face to face on double track get past each other
    Given existing double track from (2, 5) to (18, 5)
    And a small station exists at (2, 5)
    And a small station exists at (18, 5)
    And a train exists at (9, 5) with the route (18, 5), (2, 5)
    And a train exists at (10, 5) with the route (2, 5), (18, 5)
    When 10 days pass
    Then both trains should have completed a journey
    And no train should be deadlocked

  Scenario: Trains stuck head-on get moving once their track is doubled
    Given existing track from (2, 5) to (18, 5)
    And a small station exists at (2, 5)
    And a small station exists at (18, 5)
    And a train exists at (6, 5) with the route (18, 5), (2, 5)
    And a train exists at (14, 5) with the route (2, 5), (18, 5)
    And 5 days pass
    And the trains should be reported as deadlocked
    When I double the track from (2, 5) to (18, 5)
    And 10 days pass
    Then both trains should have completed a journey
    And no train should be deadlocked any more
