@m3
Feature: Running costs
  As a railroad owner
  I want track and trains to cost money to keep running
  So that an idle network loses money

  Rules, charged at the end of each 30-day month:
  Track maintenance is $100 per segment. A locomotive costs $2,000 per month to run and each car $200.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And existing track from (2, 5) to (12, 5)
    And a small station exists at (2, 5)

  Scenario: Track maintenance is charged monthly
    When 1 months pass
    Then the company's cash is $999,000

  Scenario: Maintenance grows with the size of the network
    Given existing track from (2, 8) to (12, 8)
    When 1 months pass
    Then the company should have paid $2,000 in track maintenance

  Scenario: A train costs money to run
    Given a train with 2 coaches exists at the station at (2, 5)
    When 1 months pass
    Then the company should have paid $2,400 in train running costs

  Scenario: Costs are charged only at month end
    Given a train exists at the station at (2, 5)
    When 29 days pass
    Then the company's cash is $1,000,000
    When 1 days pass
    Then the company should have paid $3,000 in total running costs

  Scenario Outline: Total running cost depends on segments, locomotives and cars
    Given the company has $1,000,000 in cash
    And <trains> trains with <cars> cars each exist at the station at (2, 5)
    When 1 months pass
    Then the company should have paid <total> in total running costs

    Examples:
      | trains | cars | total   |
      | 0      | 0    | $1,000  |
      | 1      | 0    | $3,000  |
      | 1      | 4    | $3,800  |
      | 2      | 4    | $6,600  |

  Scenario: Running costs can bankrupt a small company
    Given the company has $500 in cash
    When 1 months pass
    Then the company should be in debt by $500
