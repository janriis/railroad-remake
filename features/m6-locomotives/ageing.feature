@m6 @wip
Feature: Locomotive ageing
  As a railroad owner
  I want locomotives to wear with the years
  So that old engines cost more to run and eventually need replacing

  A locomotive's age is the number of whole 360-day years since it was bought: floor(days since purchase / 360).
  Its monthly running cost is round(base x 1.03^age) in whole dollars, booked under train running.
  Cars do not age. A locomotive is worn out once its age has reached its working life
  (Pioneer 20 years, Ironside 25, Courier 25, Hauler 30, Pathfinder 30).

  The age steps below set a locomotive's age directly ("the train is N years old") and never charge money.
  Breakdowns are switched off so that only the ageing is measured.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And existing track from (2, 5) to (18, 5)
    And a small station exists at (2, 5)
    And breakdowns never happen

  Scenario Outline: Age counts whole years since purchase
    Given a Pioneer train exists at the station at (2, 5)
    When <days> days pass
    Then the train's age should be <age> years

    Examples:
      | days | age |
      | 1    | 0   |
      | 359  | 0   |
      | 360  | 1   |
      | 719  | 1   |
      | 720  | 2   |

  Scenario: Age is counted from the purchase date, not from the start of the game
    Given the calendar starts on 1 January 1860
    When 100 days pass
    And I buy a Pioneer locomotive at the station at (2, 5)
    And 359 days pass
    Then the train's age should be 0 years
    When 1 days pass
    Then the train's age should be 1 years

  # Pioneer, base $2,000: 2,000 x 1.03^age.
  #   age  1: 2,060.00      -> $2,060
  #   age  2: 2,121.80      -> $2,122
  #   age  5: 2,318.55      -> $2,319
  #   age 10: 2,687.83      -> $2,688
  #   age 20: 3,612.22      -> $3,612
  Scenario Outline: Running cost rises 3% a year, compounded and rounded
    Given a Pioneer train exists at the station at (2, 5)
    And the train is <age> years old
    When 1 months pass
    Then the company should have paid <cost> in train running costs

    Examples:
      | age | cost   |
      | 0   | $2,000 |
      | 1   | $2,060 |
      | 2   | $2,122 |
      | 5   | $2,319 |
      | 10  | $2,688 |
      | 20  | $3,612 |

  # Every model uses its own base cost.
  #   Ironside   age 10: 2,600 x 1.03^10 = 3,494.18 -> $3,494
  #   Courier    age  4: 3,400 x 1.03^4  = 3,826.73 -> $3,827
  #   Hauler     age 12: 3,200 x 1.03^12 = 4,562.43 -> $4,562
  #   Pathfinder age 30: 3,800 x 1.03^30 = 9,223.60 -> $9,224
  Scenario Outline: The yearly rise applies to every model's own running cost
    Given a <model> train exists at the station at (2, 5)
    And the train is <age> years old
    When 1 months pass
    Then the company should have paid <cost> in train running costs

    Examples:
      | model      | age | cost   |
      | Ironside   | 10  | $3,494 |
      | Courier    | 4   | $3,827 |
      | Hauler     | 12  | $4,562 |
      | Pathfinder | 30  | $9,224 |

  # Train running = locomotive $2,688 (age 10) + 2 cars x $200 = $3,088. The cars cost what they always did.
  Scenario: Cars do not age
    Given a Pioneer train with 2 passenger cars and 0 freight cars exists at the station at (2, 5)
    And the train is 10 years old
    When 1 months pass
    Then the company should have paid $3,088 in train running costs

  # Worn out means age >= working life.
  Scenario Outline: A locomotive is worn out once it reaches its working life
    Given a <model> train exists at the station at (2, 5)
    And the train is <age> years old
    Then the train should be <status>

    Examples:
      | model      | age | status       |
      | Pioneer    | 0   | in working order |
      | Pioneer    | 19  | in working order |
      | Pioneer    | 20  | worn out     |
      | Pioneer    | 35  | worn out     |
      | Ironside   | 24  | in working order |
      | Ironside   | 25  | worn out     |
      | Pathfinder | 29  | in working order |
      | Pathfinder | 30  | worn out     |

  # Working life left = working life - age, never below 0.
  Scenario Outline: The train sheet shows how much working life is left
    Given a <model> train exists at the station at (2, 5)
    And the train is <age> years old
    Then the train should have <left> years of working life left

    Examples:
      | model   | age | left |
      | Pioneer | 0   | 20   |
      | Pioneer | 15  | 5    |
      | Pioneer | 20  | 0    |
      | Pioneer | 25  | 0    |
