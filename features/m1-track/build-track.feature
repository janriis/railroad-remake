@m1
Feature: Building track
  As a railroad owner
  I want to lay track across the map
  So that my trains can connect towns and industries

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash

  Scenario: Laying a straight stretch of track on plains
    When I build track from (2, 2) to (6, 2)
    Then the command succeeds
    And the track network has 4 segments
    And it cost $40,000
    And the company's cash is $960,000

  Scenario: A segment costs as much as the most expensive tile it touches
    Given the tile (4, 2) is forest
    When I build track from (2, 2) to (6, 2)
    Then it cost $50,000

  Scenario Outline: Terrain changes the price of a segment
    Given the tile (3, 2) is <terrain>
    When I build track from (2, 2) to (3, 2)
    Then it cost <cost>

    Examples:
      | terrain  | cost    |
      | plains   | $10,000 |
      | forest   | $15,000 |
      | hills    | $25,000 |
      | mountain | $60,000 |

  Scenario: Diagonal track is longer and costs 50% more
    When I build track from (2, 2) to (4, 4)
    Then the track network has 2 segments
    And it cost $30,000

  Scenario: Following a winding path
    When I build track along (1, 1), (2, 1), (3, 2), (3, 3)
    Then the track network has 3 segments
    And there is track between (2, 1) and (3, 2)
    And it cost $35,000

  Scenario: Existing track is not paid for twice
    Given existing track from (2, 2) to (4, 2)
    When I build track from (2, 2) to (6, 2)
    Then it cost $20,000
    And the track network has 4 segments

  Scenario: Track cannot be laid on water
    Given the tile (4, 2) is water
    When I build track from (2, 2) to (6, 2)
    Then the command is rejected with "cannot build on water"
    And the track network has 0 segments
    And no money was spent

  Scenario: Track cannot leave the map
    When I build track from (18, 5) to (21, 5)
    Then the command is rejected with "out of bounds"
    And the track network has 0 segments

  Scenario: The company cannot spend money it does not have
    Given the company has $25,000 in cash
    When I build track from (2, 2) to (6, 2)
    Then the command is rejected with "insufficient funds"
    And the track network has 0 segments
    And the company's cash is $25,000

  Scenario: Path steps must be adjacent tiles
    When I build track along (1, 1), (3, 1)
    Then the command is rejected with "tiles are not adjacent"

  Scenario: Bridging a river
    Given the tile (4, 2) is water
    When I build a bridge from (3, 2) to (5, 2)
    Then the command succeeds
    And there is track between (3, 2) and (4, 2)
