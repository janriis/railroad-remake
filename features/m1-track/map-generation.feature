@m1
Feature: Map generation
  As a player
  I want a new map for every seed
  So that each game is different but any game can be reproduced

  Scenario: The same seed gives the same map
    When I generate a 64x64 map with seed 42
    And I generate another 64x64 map with seed 42
    Then both maps should be identical

  Scenario: Different seeds give different maps
    When I generate a 64x64 map with seed 42
    And I generate another 64x64 map with seed 43
    Then the two maps should differ

  Scenario: A generated map has the requested size
    When I generate a 64x64 map with seed 7
    Then the map should be 64 tiles wide and 64 tiles high

  Scenario: A generated map has a mix of terrain
    When I generate a 64x64 map with seed 7
    Then the map should contain plains, forest, hills, mountain and water

  Scenario: Generated terrain is mostly buildable land
    When I generate a 64x64 map with seed 7
    Then at least 60% of the tiles should be plains, forest or hills

  Scenario Outline: Towns are placed on land
    When I generate a 64x64 map with seed <seed>
    Then the map should have 4 towns
    And every town should stand on plains

    Examples:
      | seed |
      | 1    |
      | 42   |
      | 999  |

  Scenario: Towns keep their distance from each other
    When I generate a 64x64 map with seed 42
    Then every pair of towns should be at least 10 tiles apart
