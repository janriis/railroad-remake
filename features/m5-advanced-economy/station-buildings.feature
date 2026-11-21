@m5 @wip
Feature: Station buildings
  As a railroad owner
  I want to build workshops inside stations that serve a town
  So that I can turn raw materials into goods the town buys

  Rules: sawmill (timber 2 -> lumber 1, $30,000, $1,000/month), furniture works (lumber 2 -> furniture 1,
  $45,000, $1,500), flour mill (grain 3 -> flour 2, $30,000, $1,000), bakery (flour 1 -> loaves 2, $20,000,
  $800), coal yard (coal 1 -> sells coal 1, $10,000, $300). A station must serve a town (its catchment
  covers at least one town tile). Slots: small 1, medium 2, large 3; each kind at most once per station.
  Demolishing refunds 25%. Month end: convert input by ratio (leftovers wait), sell output to the town's
  demand, the surplus waits at the station as cargo. Upkeep is charged every month end, even when idle.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And the calendar starts on 1 January 1850
    And existing track from (2, 5) to (12, 5)
    And the town "Alder" with 1,000 inhabitants exists at (4, 5)

  Scenario Outline: Each building has a build cost
    Given a large station exists at (4, 5) covering "Alder"
    When I build a <building> in the station at (4, 5)
    Then the command succeeds
    And it cost <cost>
    And the station at (4, 5) should contain a <building>

    Examples:
      | building        | cost    |
      | sawmill         | $30,000 |
      | furniture works | $45,000 |
      | flour mill      | $30,000 |
      | bakery          | $20,000 |
      | coal yard       | $10,000 |

  # The station at (12, 5) is 8 tiles from Alder's 5x5 footprint, so it covers no town tile.
  Scenario: A station that serves no town cannot hold buildings
    Given a large station exists at (4, 5) covering "Alder"
    And a small station exists at (12, 5)
    When I build a bakery in the station at (12, 5)
    Then the command is rejected with "station serves no town"
    And no money was spent

  Scenario: Building needs a station
    Given a large station exists at (4, 5) covering "Alder"
    When I build a bakery in the station at (8, 5)
    Then the command is rejected with "not a station"
    And no money was spent

  Scenario: Building needs enough cash
    Given a large station exists at (4, 5) covering "Alder"
    And the company has $19,999 in cash
    When I build a bakery in the station at (4, 5)
    Then the command is rejected with "insufficient funds"
    And no money was spent

  Scenario: A small station has one slot
    Given a small station exists at (4, 5) covering "Alder"
    And the station at (4, 5) is filled with 1 buildings
    When I build a coal yard in the station at (4, 5)
    Then the command is rejected with "no free building slot"
    And no money was spent

  # Filler buildings are taken in the order sawmill, flour mill, bakery; the extra building is a coal yard.
  Scenario Outline: A free slot accepts a building
    Given a <size> station exists at (4, 5) covering "Alder"
    And the station at (4, 5) is filled with <filled> buildings
    When I build a coal yard in the station at (4, 5)
    Then the command succeeds

    Examples:
      | size   | filled |
      | medium | 1      |
      | large  | 2      |

  Scenario Outline: A full station rejects more buildings
    Given a <size> station exists at (4, 5) covering "Alder"
    And the station at (4, 5) is filled with <filled> buildings
    When I build a coal yard in the station at (4, 5)
    Then the command is rejected with "no free building slot"

    Examples:
      | size   | filled |
      | small  | 1      |
      | medium | 2      |
      | large  | 3      |

  Scenario: Each kind can be built only once per station
    Given a large station exists at (4, 5) covering "Alder"
    And the station at (4, 5) has a sawmill
    When I build a sawmill in the station at (4, 5)
    Then the command is rejected with "station already has a sawmill"
    And no money was spent

  # 25% of $30,000 = $7,500.
  Scenario: Demolishing a building refunds a quarter of its cost
    Given a large station exists at (4, 5) covering "Alder"
    And the station at (4, 5) has a sawmill
    When I demolish the sawmill in the station at (4, 5)
    Then the company should have received a refund of $7,500
    And the station at (4, 5) should not contain a sawmill

  Scenario: A demolished building frees its slot
    Given a small station exists at (4, 5) covering "Alder"
    And the station at (4, 5) has a sawmill
    When I demolish the sawmill in the station at (4, 5)
    And I build a bakery in the station at (4, 5)
    Then the command succeeds

  # Train carries timber from a timber camp at (12, 5) to Alder's station; the sawmill takes it as input.
  Scenario: Unloaded cargo goes into a building that takes it
    Given a large station exists at (4, 5) covering "Alder"
    And the tile (12, 5) is forest
    And a timber camp exists at (12, 5)
    And a small station exists at (12, 5)
    And the station at (4, 5) has a sawmill
    And a train with 1 freight cars exists at the station at (12, 5) with the route (12, 5), (4, 5)
    When 2 months pass
    Then the sawmill in the station at (4, 5) should have received timber
    And the station at (4, 5) should have 0 timber waiting

  # Ratio rule: output = floor(input / in) x out, leftover input stays in the building.
  # sawmill 41 timber -> 20 lumber, 1 left; furniture works 5 lumber -> 2 furniture, 1 left;
  # flour mill 10 grain -> 3 batches = 6 flour, 1 left; bakery 7 flour -> 14 loaves, 0 left.
  Scenario Outline: A building converts its input by its ratio and keeps the leftovers
    Given a large station exists at (4, 5) covering "Alder"
    And the station at (4, 5) has a <building>
    And the <building> in the station at (4, 5) has received <input_amount> <input>
    When 1 months pass
    Then the <building> in the station at (4, 5) should have made <output_amount> <output>
    And the <building> in the station at (4, 5) should hold <left> <input> as input

    Examples:
      | building        | input  | input_amount | output    | output_amount | left |
      | sawmill         | timber | 41           | lumber    | 20            | 1    |
      | furniture works | lumber | 5            | furniture | 2             | 1    |
      | flour mill      | grain  | 10           | flour     | 6             | 1    |
      | bakery          | flour  | 7            | loaves    | 14            | 0    |

  Scenario: Leftover input is used the next month
    Given a large station exists at (4, 5) covering "Alder"
    And the station at (4, 5) has a sawmill
    And the sawmill in the station at (4, 5) has received 1 timber
    When 1 months pass
    And the sawmill in the station at (4, 5) has received 1 timber
    And 1 months pass
    Then the sawmill in the station at (4, 5) should have made 1 lumber this year

  # Upkeep per month: sawmill 1,000, furniture works 1,500, flour mill 1,000, bakery 800, coal yard 300.
  Scenario Outline: Upkeep is charged every month even when the building is idle
    Given a large station exists at (4, 5) covering "Alder"
    And the station at (4, 5) has a <building>
    When 1 months pass
    Then the ledger for 1850 should show <upkeep> in building upkeep

    Examples:
      | building        | upkeep |
      | sawmill         | $1,000 |
      | furniture works | $1,500 |
      | flour mill      | $1,000 |
      | bakery          | $800   |
      | coal yard       | $300   |

  # (1,000 + 800) x 3 months = $5,400.
  Scenario: Upkeep adds up over several buildings and months
    Given a large station exists at (4, 5) covering "Alder"
    And the station at (4, 5) has a sawmill
    And the station at (4, 5) has a bakery
    When 3 months pass
    Then the ledger for 1850 should show $5,400 in building upkeep

  # Alder: lumber demand 10 per 1,000 inhabitants. 20 timber -> 10 lumber, all sold at $90 = $900.
  Scenario: Output is sold to the town first
    Given a large station exists at (4, 5) covering "Alder"
    And the station at (4, 5) has a sawmill
    And the sawmill in the station at (4, 5) has received 20 timber
    When 1 months pass
    Then the ledger for 1850 should show $900 in goods sales
    And the station at (4, 5) should have 0 lumber waiting

  # 80 timber -> 40 lumber. Demand 10: 10 x $90 = $900; half-price band up to 20: 10 x $45 = $450;
  # above 2 x demand nothing sells, so 40 - 20 = 20 lumber wait. Sales $1,350.
  Scenario: Surplus output waits at the station as cargo
    Given a large station exists at (4, 5) covering "Alder"
    And the station at (4, 5) has a sawmill
    And the sawmill in the station at (4, 5) has received 80 timber
    When 1 months pass
    Then the ledger for 1850 should show $1,350 in goods sales
    And the station at (4, 5) should have 20 lumber waiting

  # A coal yard sells what it takes straight to the town: 20 coal at $40 = $800 (demand 20).
  Scenario: A coal yard sells coal to the town
    Given a large station exists at (4, 5) covering "Alder"
    And the station at (4, 5) has a coal yard
    And the coal yard in the station at (4, 5) has received 20 coal
    When 1 months pass
    Then the ledger for 1850 should show $800 in goods sales
