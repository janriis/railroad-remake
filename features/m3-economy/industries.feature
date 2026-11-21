@m3
Feature: Industries and production chains
  As a railroad owner
  I want industries that make goods from other goods
  So that I can build profitable freight lines between them

  Chain A: timber camp -> sawmill -> furniture works.
    Timber camp: 40 timber per month. Sawmill: 2 timber -> 1 lumber. Furniture works: 2 lumber -> 1 furniture.
  Chain B: grain farm -> flour mill -> bakery.
    Grain farm: 60 grain per month. Flour mill: 3 grain -> 2 flour. Bakery: 1 flour -> 2 loaves.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash

  Scenario: A primary industry produces goods every month
    Given a timber camp exists at (3, 3)
    When 1 months pass
    Then the timber camp at (3, 3) should have 40 timber waiting

  Scenario: A farm produces grain
    Given a grain farm exists at (3, 12)
    When 2 months pass
    Then the grain farm at (3, 12) should have 120 grain waiting

  Scenario Outline: A processing industry turns its input into output
    Given a <industry> exists at (10, 10)
    And the industry at (10, 10) has received <input_amount> <input>
    When 1 months pass
    Then the industry at (10, 10) should have <output_amount> <output> waiting

    Examples:
      | industry        | input  | input_amount | output    | output_amount |
      | sawmill         | timber | 40           | lumber    | 20            |
      | furniture works | lumber | 20           | furniture | 10            |
      | flour mill      | grain  | 60           | flour     | 40            |
      | bakery          | flour  | 40           | loaves    | 80            |

  Scenario: A processing industry makes nothing without input
    Given a sawmill exists at (10, 10)
    When 1 months pass
    Then the industry at (10, 10) should have 0 lumber waiting

  Scenario: Delivered timber becomes lumber at the sawmill
    Given existing track from (3, 3) to (10, 3)
    And a timber camp exists at (3, 3)
    And a sawmill exists at (10, 3)
    And a small station exists at (3, 3)
    And a small station exists at (10, 3)
    And a train with 2 freight cars exists at the station at (3, 3) with the route (3, 3), (10, 3)
    When 2 months pass
    Then the sawmill at (10, 3) should have received timber
    And the sawmill at (10, 3) should have lumber waiting

  Scenario: An industry only supplies stations that cover it
    Given a timber camp exists at (3, 3)
    And a small station exists at (8, 8)
    When 1 months pass
    Then the station at (8, 8) should have 0 timber waiting
