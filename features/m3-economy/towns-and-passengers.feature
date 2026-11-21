@m3 @wip
Feature: Towns and passengers
  As a railroad owner
  I want towns to produce passengers and mail
  So that I have something to carry between them

  Rules: each month a town covered by a station generates 1 passenger per 10 inhabitants and 1 mailbag per 50
  inhabitants. Only the share of the town inside the station catchment is served. A town grows 10% in a
  year in which at least half of its passengers were carried away.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And existing track from (2, 5) to (12, 5)
    And the town "Alder" with 1,000 inhabitants exists at (4, 5)

  Scenario: A town with no station generates nothing for the railroad
    When 1 months pass
    Then the passengers waiting in the town of "Alder" should number 0

  Scenario: A station covering the town collects its passengers
    Given a medium station exists at (4, 5) covering "Alder"
    When 1 months pass
    Then the station at (4, 5) should have 100 passengers waiting
    And the station at (4, 5) should have 20 mailbags waiting

  Scenario Outline: Bigger towns produce more passengers
    Given the town "Birch" with <people> inhabitants exists at (10, 5)
    And a medium station exists at (10, 5) covering "Birch"
    When 1 months pass
    Then the station at (10, 5) should have <passengers> passengers waiting

    Examples:
      | people | passengers |
      | 500    | 50         |
      | 1,000  | 100        |
      | 4,000  | 400        |

  Scenario: A station that covers only part of the town collects a share
    Given a small station exists at (4, 5) covering part of "Alder"
    When 1 months pass
    Then the station at (4, 5) should have 50 passengers waiting

  Scenario: A town that is well served grows
    Given a medium station exists at (4, 5) covering "Alder"
    And the passengers of "Alder" are being carried away
    When 1 years pass
    Then the town of "Alder" should have 1,100 inhabitants

  Scenario: A neglected town does not grow
    Given a medium station exists at (4, 5) covering "Alder"
    When 1 years pass
    Then the town of "Alder" should have 1,000 inhabitants
