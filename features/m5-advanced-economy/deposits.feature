@m5 @wip
Feature: Deposits
  As a railroad owner
  I want raw materials to come from deposits out in the country
  So that I have somewhere to start my freight chains

  Rules: coal mine 40 coal per month (hills or mountain), timber camp 40 timber (forest), grain farm
  60 grain (plains). Deposits produce forever. Stock waits at the deposit, capped at 6 months of
  production; the excess is lost. Any station covering a deposit can load its stock. Map generation places
  deposits but no longer places sawmills, flour mills, furniture works or bakeries; old saves keep theirs.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash

  Scenario Outline: A deposit produces goods every month
    Given a <deposit> exists at (3, 3)
    When 1 months pass
    Then the deposit at (3, 3) should have <amount> <cargo> waiting

    Examples:
      | deposit       | cargo  | amount |
      | coal mine     | coal   | 40     |
      | timber camp | timber | 40     |
      | grain farm  | grain  | 60     |

  # Cap = 6 months of production: coal 6 x 40 = 240, timber 6 x 40 = 240, grain 6 x 60 = 360.
  Scenario Outline: Stock is capped at six months of production
    Given a <deposit> exists at (3, 3)
    When <months> months pass
    Then the deposit at (3, 3) should have <amount> <cargo> waiting

    Examples:
      | deposit       | cargo  | months | amount |
      | coal mine     | coal   | 5      | 200    |
      | coal mine     | coal   | 6      | 240    |
      | coal mine     | coal   | 7      | 240    |
      | timber camp | timber | 9      | 240    |
      | grain farm  | grain  | 6      | 360    |
      | grain farm  | grain  | 8      | 360    |

  # 10 years = 120 months. A deposit with reserves would be empty by now; this one is still full.
  Scenario: A deposit never runs dry
    Given a coal mine exists at (3, 3)
    When 10 years pass
    Then the deposit at (3, 3) should have 240 coal waiting

  Scenario: A station covering a deposit can load its stock
    Given a coal mine exists at (3, 3)
    And a small station exists at (3, 3)
    When 1 months pass
    Then the station at (3, 3) should have 40 coal waiting

  Scenario: A station that does not cover a deposit gets nothing
    Given a coal mine exists at (3, 3)
    And a small station exists at (8, 8)
    When 1 months pass
    Then the station at (8, 8) should have 0 coal waiting

  # Terrain rules for generated deposits.
  Scenario Outline: Map generation places each deposit on its terrain
    When I generate a 64x64 map with seed 42
    Then the map should have at least 1 <deposit>
    And every <deposit> should stand on <terrain>

    Examples:
      | deposit       | terrain            |
      | coal mine     | hills or mountain  |
      | timber camp | forest             |
      | grain farm  | plains             |

  Scenario Outline: Map generation no longer places processing industries
    When I generate a 64x64 map with seed 42
    Then the map should have no <industry>

    Examples:
      | industry        |
      | sawmill         |
      | flour mill      |
      | furniture works |
      | bakery          |

  # Legacy industries come from old saves; the fixture step creates one directly.
  # 40 timber -> 20 lumber at 2:1.
  Scenario: A legacy sawmill in an old save keeps working
    Given a sawmill exists at (10, 10)
    And the industry at (10, 10) has received 40 timber
    When 1 months pass
    Then the industry at (10, 10) should have 20 lumber waiting

  # 60 grain -> 40 flour at 3:2; legacy industries are not station buildings and charge no upkeep.
  Scenario: A legacy flour mill keeps working and costs no building upkeep
    Given the calendar starts on 1 January 1850
    And a flour mill exists at (10, 10)
    And the industry at (10, 10) has received 60 grain
    When 1 months pass
    Then the industry at (10, 10) should have 40 flour waiting
    And the ledger for 1850 should show $0 in building upkeep
