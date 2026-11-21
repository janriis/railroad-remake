@m2 @wip
Feature: Stations
  As a railroad owner
  I want to build stations on my track
  So that trains can load and unload cargo from the surrounding area

  Station sizes: small (catchment radius 1, $5,000), medium (radius 2, $15,000), large (radius 3, $40,000).

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And existing track from (2, 5) to (12, 5)

  Scenario Outline: Station size sets cost and catchment radius
    When I build a <size> station at (6, 5)
    Then the command succeeds
    And it cost <cost>
    And the station at (6, 5) should have a catchment radius of <radius>

    Examples:
      | size   | cost    | radius |
      | small  | $5,000  | 1      |
      | medium | $15,000 | 2      |
      | large  | $40,000 | 3      |

  Scenario: A station must be built on track
    When I build a small station at (6, 8)
    Then the command is rejected with "station must be on track"
    And no money was spent

  Scenario: The catchment covers tiles within the radius
    When I build a medium station at (6, 5)
    Then the tile (8, 7) should be in the catchment of the station at (6, 5)
    And the tile (9, 5) should be outside the catchment of the station at (6, 5)

  Scenario: Two stations cannot share a tile
    Given a small station exists at (6, 5)
    When I build a large station at (6, 5)
    Then the command is rejected with "tile already has a station"

  Scenario: Stations need funds
    Given the company has $4,000 in cash
    When I build a small station at (6, 5)
    Then the command is rejected with "insufficient funds"
    And the company's cash is $4,000

  Scenario: A station can be built at the end of the line
    When I build a small station at (12, 5)
    Then the command succeeds

  Scenario: Stations cannot be built off the map
    When I build a small station at (25, 5)
    Then the command is rejected with "out of bounds"
