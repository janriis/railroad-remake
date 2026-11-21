@m1
Feature: Demolishing track
  As a railroad owner
  I want to tear up track I no longer need
  So that I can recover part of the money

  Rule: demolishing a segment refunds 25% of what building that segment would cost today.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash

  Scenario: Demolishing plains track refunds 25% of its cost
    Given existing track from (2, 2) to (4, 2)
    When I demolish track from (2, 2) to (4, 2)
    Then the command succeeds
    And the track network has 0 segments
    And the company should have received a refund of $5,000

  Scenario Outline: The refund depends on the terrain the segment crosses
    Given the tile (3, 2) is <terrain>
    And existing track from (2, 2) to (3, 2)
    When I demolish track from (2, 2) to (3, 2)
    Then the company should have received a refund of <refund>

    Examples:
      | terrain  | refund  |
      | plains   | $2,500  |
      | forest   | $3,750  |
      | hills    | $6,250  |
      | mountain | $15,000 |

  Scenario: Demolishing part of a line leaves the rest
    Given existing track from (2, 2) to (6, 2)
    When I demolish track from (4, 2) to (6, 2)
    Then the track network has 2 segments
    And there is track between (3, 2) and (4, 2)

  Scenario: Demolishing where there is no track is rejected
    When I demolish track from (2, 2) to (4, 2)
    Then the command is rejected with "no track to demolish"
    And no money was spent

  @m2
  Scenario: Track under a station cannot be demolished
    Given existing track from (2, 2) to (6, 2)
    And a small station exists at (4, 2)
    When I demolish track from (3, 2) to (5, 2)
    Then the command is rejected with "station on track"
    And the track network has 4 segments

  @m2
  Scenario: Track with a train on it cannot be demolished
    Given existing track from (2, 2) to (6, 2)
    And a train exists at (4, 2)
    When I demolish track from (3, 2) to (5, 2)
    Then the command is rejected with "train on track"

  Scenario: A bridge refunds 25% of its cost too
    Given the tile (4, 2) is water
    And a bridge exists from (3, 2) to (5, 2)
    When I demolish track from (3, 2) to (5, 2)
    Then the company should have received a refund of $15,000
