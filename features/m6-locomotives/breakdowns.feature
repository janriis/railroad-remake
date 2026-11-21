@m6
Feature: Breakdowns
  As a railroad owner
  I want old locomotives to break down now and then
  So that I have a reason to overhaul or replace them

  Once a month, at month end, every train rolls for a breakdown with the game's seeded random numbers.
  The chance is 1% while the locomotive's age is below its working life, and 1% + 2% x (age - working life)
  from then on. A broken-down train stops where it is for 3 days (72 hours), keeps holding its tile or
  segment, and costs 5% of its model's price in repairs, booked under train running.

  Scenarios force the roll with "breakdowns always happen" and "breakdowns never happen" instead of relying
  on the random numbers. Month end falls on day 30, 60, ... of the game.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And existing track from (2, 5) to (18, 5)
    And a small station exists at (2, 5)
    And a small station exists at (18, 5)

  # Chance = 1% + 2% x (age - working life) once age has reached the working life.
  #   American (life 20): ages 0 and 19 -> 1%; age 20 -> 1%; age 21 -> 3%; age 25 -> 11%
  #   Mogul (life 25): age 26 -> 3%
  #   Northern (life 30): age 31 -> 3%
  Scenario Outline: The monthly breakdown chance grows after the working life
    Given a <model> train exists at the station at (2, 5)
    And the train is <age> years old
    Then the train's monthly breakdown chance should be <chance>%

    Examples:
      | model      | age | chance |
      | American   | 0   | 1      |
      | American   | 19  | 1      |
      | American   | 20  | 1      |
      | American   | 21  | 3      |
      | American   | 25  | 11     |
      | Mogul      | 26  | 3      |
      | Northern   | 31  | 3      |

  Scenario: A broken-down train stops where it is for 3 days and then moves again
    Given breakdowns always happen
    And a train exists at the station at (2, 5)
    And the train has the route (2, 5), (18, 5)
    When 30 days pass
    Then the train should be broken down
    And I remember where the train stands
    When 2 days pass
    Then the train should still stand where it was remembered
    When 2 days pass
    Then the train should not be broken down
    And the train should have moved on from where it was remembered

  # Repairs are 5% of the model's price, plus the locomotive's ordinary running cost for the month
  # (new locomotive, no cars):
  #   American      5% x $50,000  = $2,500  + $2,000 = $4,500
  #   Mogul         5% x $65,000  = $3,250  + $2,300 = $5,550
  #   Ten-Wheeler   5% x $80,000  = $4,000  + $2,600 = $6,600
  #   Consolidation 5% x $90,000  = $4,500  + $2,900 = $7,400
  #   Atlantic      5% x $110,000 = $5,500  + $3,200 = $8,700
  #   Pacific       5% x $140,000 = $7,000  + $3,800 = $10,800
  #   Mikado        5% x $130,000 = $6,500  + $3,600 = $10,100
  #   Northern      5% x $200,000 = $10,000 + $4,800 = $14,800
  #   Streamliner   5% x $220,000 = $11,000 + $4,200 = $15,200
  #   Road switcher 5% x $180,000 = $9,000  + $3,500 = $12,500
  Scenario Outline: A breakdown costs 5% of the model's price in repairs
    Given breakdowns always happen
    And a <model> train exists at the station at (2, 5)
    When 1 months pass
    Then the train should be broken down
    And the company should have paid <total> in train running costs

    Examples:
      | model         | total   |
      | American      | $4,500  |
      | Mogul         | $5,550  |
      | Ten-Wheeler   | $6,600  |
      | Consolidation | $7,400  |
      | Atlantic      | $8,700  |
      | Pacific       | $10,800 |
      | Mikado        | $10,100 |
      | Northern      | $14,800 |
      | Streamliner   | $15,200 |
      | Road switcher | $12,500 |

  # Six month ends with no breakdowns: 6 x $2,000 = $12,000 (age stays 0).
  Scenario: No breakdowns happen and nothing is charged when they are switched off
    Given breakdowns never happen
    And a train exists at the station at (2, 5)
    When 6 months pass
    Then the train should not be broken down
    And the company should have paid $12,000 in train running costs

  # An American aged 25 is 5 years past its working life (an 11% chance a month), but "never" still means never.
  # Running cost: 2,000 x 1.03^25 = 4,187.56 -> $4,188 a month, 3 months = $12,564.
  Scenario: A worn-out locomotive does not break down when breakdowns are switched off
    Given breakdowns never happen
    And a train exists at the station at (2, 5)
    And the train is 25 years old
    When 3 months pass
    Then the train should not be broken down
    And the company should have paid $12,564 in train running costs

  Scenario: A broken-down train holds its place and a train behind it waits
    Given a train that is broken down for 3 days exists at (10, 5) with the route (18, 5), (2, 5)
    And a train exists at the station at (2, 5) with the route (2, 5), (18, 5)
    When 2 days pass
    Then the following train should have waited behind the slow train
    And the following train should be behind the slow train
    And no segment should have held two trains at once

  Scenario: A train behind a broken-down train gets going once it has been repaired
    Given a train that is broken down for 3 days exists at (10, 5) with the route (18, 5), (2, 5)
    And a train exists at the station at (2, 5) with the route (2, 5), (18, 5)
    When 8 days pass
    Then both trains should have completed a journey
    And no train should be deadlocked
    And no segment should have held two trains at once
