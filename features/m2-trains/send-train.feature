@m2
Feature: Send a train to a station
  As a railroad owner
  I want to send a train to any station outside its route
  So that I can move trains around, fetch cargo or clear a jam without rewriting the route

  Rules: a one-off trip is free. The train heads for the chosen station, unloads and loads there as
  at any stop (car orders belong to route stops and are not applied), then carries on with its
  route towards the stop it was heading for. A train without a route stays at the station.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And existing track from (2, 5) to (18, 5)
    And a small station exists at (2, 5)
    And a small station exists at (10, 5)
    And a small station exists at (18, 5)

  Scenario: A train goes to a station that is not on its route
    Given a train exists at the station at (2, 5) with the route (2, 5), (10, 5)
    When I send the train to the station at (18, 5)
    Then the command succeeds
    And no money was spent
    When 5 days pass
    Then the train's last stop should be (18, 5)

  Scenario: After the trip the train carries on with its route
    Given a train exists at the station at (2, 5) with the route (2, 5), (10, 5)
    When I send the train to the station at (18, 5)
    And 7 days pass
    Then the train's last stop should be (10, 5)
    And the train should not be on a trip

  Scenario: A train without a route stays at the station it was sent to
    Given a train exists at the station at (2, 5)
    When I send the train to the station at (18, 5)
    And 6 days pass
    Then the train should be at (18, 5)
    And the train should not be on a trip

  Scenario: A trip can be called off
    Given a train exists at the station at (2, 5) with the route (2, 5), (10, 5)
    When I send the train to the station at (18, 5)
    And I call off the train's trip
    And 3 days pass
    Then the train's last stop should be (10, 5)

  Scenario: Trains can only be sent to stations
    Given a train exists at the station at (2, 5)
    When I send the train to the station at (6, 5)
    Then the command is rejected with "not a station"

  Scenario: The station must be reachable over track
    Given existing track from (2, 15) to (6, 15)
    And a small station exists at (6, 15)
    And a train exists at the station at (2, 5)
    When I send the train to the station at (6, 15)
    Then the command is rejected with "no track connects (2, 5) and (6, 15)"
