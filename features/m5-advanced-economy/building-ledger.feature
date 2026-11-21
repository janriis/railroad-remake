@m5 @wip
Feature: Building ledger
  As a railroad owner
  I want my buildings in the yearly ledger
  So that I can see whether they pay for themselves

  Rules: the yearly ledger has two new categories, buildingSales (income) and buildingUpkeep (expense).
  Buying a building counts as construction. Profit includes both.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And the calendar starts on 1 January 1850
    And existing track from (2, 5) to (6, 5)
    And the town "Alder" with 1,000 inhabitants exists at (4, 5)
    And a medium station exists at (4, 5) covering "Alder"

  Scenario: Buying a building counts as construction
    When I build a bakery in the station at (4, 5)
    Then the ledger for 1850 should show $20,000 in construction expenses

  # 20 flour -> 40 loaves, all at full price: 40 x 60 = 2,400.
  Scenario: Sales to the town are recorded as goods sales
    Given the station at (4, 5) has a bakery
    And the bakery in the station at (4, 5) has received 20 flour
    When 1 months pass
    Then the ledger for 1850 should show $2,400 in goods sales

  # Sawmill $1,000 x 12 = 12,000; track upkeep (4 segments x $100 x 12 = 4,800) stays in running costs.
  Scenario: Upkeep is recorded apart from running costs
    Given the station at (4, 5) has a sawmill
    When 12 months pass
    Then the ledger for 1850 should show $12,000 in building upkeep
    And the ledger for 1850 should show $4,800 in running costs

  Scenario: Each year has its own building upkeep
    Given the station at (4, 5) has a sawmill
    When 24 months pass
    Then the ledger for 1850 should show $12,000 in building upkeep
    And the ledger for 1851 should show $12,000 in building upkeep

  # Loss = construction 20,000 + upkeep 800 + track 400 - sales 2,400 = 18,800 (track 4 x $100 for 1 month).
  Scenario: Profit includes building purchase, upkeep and sales
    When I build a bakery in the station at (4, 5)
    And the bakery in the station at (4, 5) has received 20 flour
    And 1 months pass
    Then the ledger for 1850 should show a loss of $18,800

  # Year: sales 12 x 2,400 = 28,800; upkeep 12 x 800 = 9,600; track 4,800. Profit 28,800 - 9,600 - 4,800 = 14,400.
  Scenario: A busy bakery makes a profit
    Given the station at (4, 5) has a bakery
    And the bakery in the station at (4, 5) is supplied with 20 flour every month
    When 12 months pass
    Then the ledger for 1850 should show a profit of $14,400
