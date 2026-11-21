@m2
Feature: Block signalling
  As a railroad owner
  I want trains never to share a stretch of track
  So that my network runs without collisions

  Each track segment is a block. A moving train holds its segment and the tiles at both ends;
  station tiles can hold several trains. A train waits when the way ahead is taken.
  Stations, double-track tiles and junctions are passing places: a train leaving one does not
  enter the single track ahead while a train coming the other way is on it.
  Every scenario also checks, hour by hour, that no segment ever held two trains.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And existing track from (2, 5) to (18, 5)
    And a small station exists at (2, 5)
    And a small station exists at (18, 5)

  Scenario: A train catches up with a slower train and waits behind it
    Given a slow train exists at (6, 5) with the route (18, 5), (2, 5)
    And a train exists at the station at (2, 5) with the route (2, 5), (18, 5)
    When 3 days pass
    Then the following train should have waited behind the slow train
    And the following train should be behind the slow train
    And no segment should have held two trains at once

  Scenario: A waiting train departs once the block is free
    Given a slow train exists at (3, 5) with the route (18, 5), (2, 5)
    And a train exists at the station at (2, 5) with the route (2, 5), (18, 5)
    When 1 days pass
    Then the following train should have waited behind the slow train
    And the following train should have left its first stop

  Scenario: Trains pass each other at a passing loop
    Given existing track from (8, 5) to (8, 7)
    And existing track from (8, 7) to (12, 7)
    And existing track from (12, 7) to (12, 5)
    And a train exists at the station at (2, 5) with the route (2, 5), (18, 5)
    And a train exists at the station at (18, 5) with the route (18, 5), (2, 5)
    When 6 days pass
    Then no segment should have held two trains at once
    And both trains should have completed a journey
    And no train should be deadlocked

  Scenario: A train waits at its station while an opposing train is on the single track ahead
    Given a train exists at the station at (2, 5) with the route (2, 5), (18, 5)
    And a train exists at the station at (18, 5) with the route (18, 5), (2, 5)
    When 10 days pass
    Then both trains should have completed a journey
    And no train should be deadlocked
    And no segment should have held two trains at once

  Scenario: Head-on trains already on the same single track are reported as deadlocked
    Given a train exists at (6, 5) with the route (18, 5), (2, 5)
    And a train exists at (14, 5) with the route (2, 5), (18, 5)
    When 10 days pass
    Then the trains should be reported as deadlocked
    And no segment should have held two trains at once

  Scenario: Trains pass each other inside a station
    Given a small station exists at (10, 5)
    And a train exists at the station at (2, 5) with the route (2, 5), (18, 5)
    And a train exists at the station at (18, 5) with the route (18, 5), (2, 5)
    When 4 days pass
    Then both trains should have completed a journey
    And no train should be deadlocked
