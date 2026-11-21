@m1
Feature: Bridges
  As a railroad owner
  I want to carry track over water
  So that I can connect land that a river or lake divides

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash

  Scenario: A bridge over one water tile
    Given the tile (4, 2) is water
    When I build a bridge from (3, 2) to (5, 2)
    Then the command succeeds
    And there is track between (3, 2) and (4, 2)
    And there is track between (4, 2) and (5, 2)
    And it cost $60,000

  Scenario: A bridge segment costs $30,000 regardless of how many tiles are water
    Given the tile (4, 2) is water
    And the tile (5, 2) is water
    When I build a bridge from (3, 2) to (6, 2)
    Then the track network has 3 segments
    And it cost $90,000

  Scenario: A bridge may cross at most 3 water tiles in a row
    Given the tile (4, 2) is water
    And the tile (5, 2) is water
    And the tile (6, 2) is water
    When I build a bridge from (3, 2) to (7, 2)
    Then the command succeeds
    And it cost $120,000

  Scenario: A bridge over 4 water tiles in a row is too long
    Given the tile (4, 2) is water
    And the tile (5, 2) is water
    And the tile (6, 2) is water
    And the tile (7, 2) is water
    When I build a bridge from (3, 2) to (8, 2)
    Then the command is rejected with "bridge too long"
    And the track network has 0 segments
    And no money was spent

  Scenario: A bridge must start and end on land
    Given the tile (3, 2) is water
    And the tile (4, 2) is water
    When I build a bridge from (3, 2) to (5, 2)
    Then the command is rejected with "bridge must start and end on land"

  Scenario: A bridge may only span water
    Given the tile (4, 2) is water
    When I build a bridge from (2, 2) to (5, 2)
    Then the command is rejected with "a bridge may only span water"

  Scenario: A bridge needs funds for every segment
    Given the tile (4, 2) is water
    And the company has $50,000 in cash
    When I build a bridge from (3, 2) to (5, 2)
    Then the command is rejected with "insufficient funds"
    And the track network has 0 segments
    And the company's cash is $50,000

  Scenario: Ordinary track still cannot be laid on water
    Given the tile (4, 2) is water
    When I build track from (3, 2) to (5, 2)
    Then the command is rejected with "cannot build on water"
