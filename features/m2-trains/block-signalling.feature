@m2 @wip
Feature: Block signalling
  As a railroad owner
  I want trains never to share a stretch of track
  So that my network runs without collisions

  Each track segment is a block. A block holds at most one train; a train waits when the next block is occupied.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And existing track from (2, 5) to (18, 5)
    And a small station exists at (2, 5)
    And a small station exists at (18, 5)

  Scenario: A train waits behind a slower train
    Given a slow train exists at (6, 5) with the route (2, 5), (18, 5)
    And a train exists at the station at (2, 5) with the route (2, 5), (18, 5)
    When 1 days pass
    Then the two trains should never have shared a segment
    And the following train should be waiting behind the slow train

  Scenario: Two trains in the same direction never occupy the same segment
    Given a train exists at the station at (2, 5) with the route (2, 5), (18, 5)
    And a slow train exists at (3, 5) with the route (2, 5), (18, 5)
    When 10 days pass
    Then no segment should have held two trains at once

  Scenario: Trains pass each other at a passing loop
    Given existing track from (8, 5) to (8, 7)
    And existing track from (8, 7) to (12, 7)
    And existing track from (12, 7) to (12, 5)
    And a train exists at the station at (2, 5) with the route (2, 5), (18, 5)
    And a train exists at the station at (18, 5) with the route (18, 5), (2, 5)
    When 10 days pass
    Then no segment should have held two trains at once
    And both trains should have completed a journey

  Scenario: Head-on trains on single track wait for each other
    Given a train exists at the station at (2, 5) with the route (2, 5), (18, 5)
    And a train exists at the station at (18, 5) with the route (18, 5), (2, 5)
    When 10 days pass
    Then the trains should be reported as deadlocked

  Scenario: A waiting train departs once the block is free
    Given a slow train exists at (6, 5) with the route (2, 5), (18, 5)
    And a train exists at the station at (2, 5) with the route (2, 5), (18, 5)
    When 5 days pass
    Then the following train should have left its first stop
