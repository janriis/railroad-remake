@m3
Feature: Yearly ledger
  As a railroad owner
  I want a yearly account of income and expenses
  So that I can see whether the company makes a profit

  The game starts on 1 January 1850. Years have 12 months of 30 days.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And the calendar starts on 1 January 1850

  Scenario: Delivery income is recorded in the ledger
    When 50 passengers are delivered over 10 tiles in 10 days
    Then the ledger for 1850 should show $2,500 in cargo income

  Scenario: Construction spending is recorded
    When I build track from (2, 2) to (6, 2)
    Then the ledger for 1850 should show $40,000 in construction expenses

  Scenario: Running costs are recorded
    Given existing track from (2, 2) to (6, 2)
    When 12 months pass
    Then the ledger for 1850 should show $4,800 in running costs

  Scenario: Profit is income minus expenses
    Given existing track from (2, 2) to (6, 2)
    When 50 passengers are delivered over 10 tiles in 10 days
    And 12 months pass
    Then the ledger for 1850 should show a loss of $2,300

  Scenario: Each year has its own page
    Given existing track from (2, 2) to (6, 2)
    When 24 months pass
    Then the ledger for 1850 should show $4,800 in running costs
    And the ledger for 1851 should show $4,800 in running costs

  Scenario: The year rolls over on 1 January
    When 360 days pass
    Then the date should be 1 January 1851

  Scenario: An empty year is a zero ledger
    When 12 months pass
    Then the ledger for 1850 should show break-even results
