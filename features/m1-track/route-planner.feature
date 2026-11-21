@m1
Feature: Route planner
  As a railroad owner
  I want the game to suggest the cheapest way to join two places
  So that I don't have to plot every tile myself

  The planner finds the cheapest route over land. Existing track is free, so it is reused.
  Crossing water needs a bridge, and a route with a bridge is only built when I confirm it.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash

  Scenario: On open plains the suggestion is the straight line
    When I ask for a route from (2, 2) to (8, 2)
    Then the suggested route should cost $60,000
    And the suggested route should have 6 new segments
    And the suggested route should have 0 bridges

  Scenario: Asking for a route changes nothing
    When I ask for a route from (2, 2) to (8, 2)
    Then the track network has 0 segments
    And the company's cash is $1,000,000

  Scenario: The suggestion goes around a mountain when that is cheaper
    Given mountains cover (5, 0) to (5, 3)
    When I ask for a route from (2, 2) to (8, 2)
    Then the suggested route should not cross mountain
    And the suggested route should cost less than $160,000

  Scenario: Existing track is reused for free
    Given existing track from (2, 2) to (6, 2)
    When I ask for a route from (2, 2) to (8, 2)
    Then the suggested route should cost $20,000

  Scenario: Connecting builds the suggestion
    When I connect (2, 2) to (8, 2)
    Then the command succeeds
    And it cost $60,000
    And there is track between (7, 2) and (8, 2)

  Scenario: A river crossing is only built after I confirm the bridge
    Given a river runs down column 5
    When I connect (2, 2) to (8, 2)
    Then the command is rejected with "route needs a bridge"
    And the track network has 0 segments
    And no money was spent

  Scenario: Confirming the bridge builds the crossing
    Given a river runs down column 5
    When I ask for a route from (2, 2) to (8, 2)
    Then the suggested route should have 1 bridge
    And the suggested route should cost $100,000
    When I connect (2, 2) to (8, 2) and confirm the bridge
    Then it cost $100,000
    And there is a bridge between (4, 2) and (5, 2)

  Scenario: Without bridges the planner goes the long way round
    Given a river runs down column 5 from row 0 to row 15
    When I ask for a route from (2, 2) to (8, 2) without bridges
    Then the suggested route should have 0 bridges
    And the suggested route should pass (5, 16)

  Scenario: With bridges allowed a short bridge beats a long detour
    Given a river runs down column 5 from row 0 to row 15
    When I ask for a route from (2, 2) to (8, 2)
    Then the suggested route should have 1 bridge

  Scenario: No route over land
    Given a river runs down column 5
    When I ask for a route from (2, 2) to (8, 2) without bridges
    Then the planner should report "no route over land"

  Scenario: A river too wide to bridge
    Given a river runs down columns 5 to 8
    When I ask for a route from (2, 2) to (12, 2)
    Then the planner should report "no buildable route"

  Scenario: The company must afford the whole route
    Given the company has $50,000 in cash
    When I connect (2, 2) to (8, 2)
    Then the command is rejected with "insufficient funds"
    And the track network has 0 segments
