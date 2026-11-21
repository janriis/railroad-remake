@m6
Feature: Retiring trains
  As a railroad owner
  I want to retire a train I no longer need
  So that I stop paying to run it and get something back for it

  Rules: a train standing at a station can be retired. The company gets the locomotive's trade-in value
  (round(price x (0.5 - 0.4 x min(1, age / working life))): 50% new, 10% from the end of its working life)
  plus 50% of each car's price (coach $5,000, boxcar $4,000), booked as rolling stock. The
  train and any cargo on board are gone.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And existing track from (2, 5) to (18, 5)
    And a small station exists at (2, 5)
    And a small station exists at (18, 5)

  # New American: 50% x $50,000 = $25,000; 2 coaches x $5,000 + 1 boxcar x $4,000 = $14,000.
  Scenario: Retiring a train pays back the locomotive's trade-in and the cars' resale value
    Given an American train with 2 coaches and 1 boxcar exists at the station at (2, 5)
    When I retire the train
    Then the command succeeds
    And the company should have received a refund of $39,000
    And the company should own 0 trains

  # American aged 10 of 20: 0.5 - 0.4 x 0.5 = 0.3 -> $15,000. Aged 25: past its working life -> 10% = $5,000.
  Scenario Outline: An old locomotive is worth less
    Given an American train exists at the station at (2, 5)
    And the train is <age> years old
    When I retire the train
    Then the company should have received a refund of <refund>

    Examples:
      | age | refund  |
      | 0   | $25,000 |
      | 10  | $15,000 |
      | 25  | $5,000  |

  Scenario: A train can only be retired at a station
    Given an American train exists at the station at (2, 5)
    And the train has the route (2, 5), (18, 5)
    When 1 days pass
    And I retire the train
    Then the command is rejected with "train must be at a station"
    And no money was spent
    And the company should own 1 train

  Scenario: A retired train costs nothing to run
    Given an American train exists at the station at (2, 5)
    When I retire the train
    And 1 months pass
    Then the company should have paid $0 in train running costs

  Scenario: Other trains keep running when one is retired
    Given an American train exists at the station at (2, 5)
    And the train has the route (2, 5), (18, 5)
    And an American train exists at the station at (18, 5)
    When I retire the train
    And 5 days pass
    Then the company should own 1 train
