@m6
Feature: Locomotive ageing
  As a railroad owner
  I want locomotives to wear with the years
  So that old engines cost more to run and eventually need replacing

  A locomotive's age is the number of whole 360-day years since it was bought: floor(days since purchase / 360).
  Its monthly running cost is round(base x 1.03^age) in whole dollars, booked under train running.
  Cars do not age. A locomotive is worn out once its age has reached its working life
  (American 20 years, Mogul 25, Ten-Wheeler 25, Consolidation 30, Atlantic 25, Pacific 30, Mikado 30,
  Northern 30, Streamliner 30, Road switcher 30).

  The age steps below set a locomotive's age directly ("the train is N years old") and never charge money.
  Breakdowns are switched off so that only the ageing is measured.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And existing track from (2, 5) to (18, 5)
    And a small station exists at (2, 5)
    And breakdowns never happen

  Scenario Outline: Age counts whole years since purchase
    Given an American train with 0 coaches and 0 boxcars exists at the station at (2, 5)
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
    And I buy an American locomotive at the station at (2, 5)
    And 359 days pass
    Then the train's age should be 0 years
    When 1 days pass
    Then the train's age should be 1 years

  # American, base $2,000: 2,000 x 1.03^age.
  #   age  1: 2,060.00      -> $2,060
  #   age  2: 2,121.80      -> $2,122
  #   age  5: 2,318.55      -> $2,319
  #   age 10: 2,687.83      -> $2,688
  #   age 20: 3,612.22      -> $3,612
  Scenario Outline: Running cost rises 3% a year, compounded and rounded
    Given an American train with 0 coaches and 0 boxcars exists at the station at (2, 5)
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
  #   Mogul         age 10: 2,300 x 1.03^10 = 3,091.01 -> $3,091
  #   Ten-Wheeler   age  8: 2,600 x 1.03^8  = 3,293.60 -> $3,294
  #   Consolidation age 12: 2,900 x 1.03^12 = 4,134.71 -> $4,135
  #   Atlantic      age  4: 3,200 x 1.03^4  = 3,601.63 -> $3,602
  #   Pacific       age 15: 3,800 x 1.03^15 = 5,920.28 -> $5,920
  #   Mikado        age  6: 3,600 x 1.03^6  = 4,298.59 -> $4,299
  #   Northern      age 20: 4,800 x 1.03^20 = 8,669.33 -> $8,669
  #   Streamliner   age 10: 4,200 x 1.03^10 = 5,644.45 -> $5,644
  #   Road switcher age  5: 3,500 x 1.03^5  = 4,057.46 -> $4,057
  Scenario Outline: The yearly rise applies to every model's own running cost
    Given a <model> train exists at the station at (2, 5)
    And the train is <age> years old
    When 1 months pass
    Then the company should have paid <cost> in train running costs

    Examples:
      | model         | age | cost   |
      | Mogul         | 10  | $3,091 |
      | Ten-Wheeler   | 8   | $3,294 |
      | Consolidation | 12  | $4,135 |
      | Atlantic      | 4   | $3,602 |
      | Pacific       | 15  | $5,920 |
      | Mikado        | 6   | $4,299 |
      | Northern      | 20  | $8,669 |
      | Streamliner   | 10  | $5,644 |
      | Road switcher | 5   | $4,057 |

  # Train running = locomotive $2,688 (age 10) + 2 cars x $200 = $3,088. The cars cost what they always did.
  Scenario: Cars do not age
    Given an American train with 2 coaches and 0 boxcars exists at the station at (2, 5)
    And the train is 10 years old
    When 1 months pass
    Then the company should have paid $3,088 in train running costs

  # Worn out means age >= working life.
  Scenario Outline: A locomotive is worn out once it reaches its working life
    Given a <model> train exists at the station at (2, 5)
    And the train is <age> years old
    Then the train should be <status>

    Examples:
      | model         | age | status           |
      | American      | 0   | in working order |
      | American      | 19  | in working order |
      | American      | 20  | worn out         |
      | American      | 35  | worn out         |
      | Mogul         | 24  | in working order |
      | Mogul         | 25  | worn out         |
      | Atlantic      | 24  | in working order |
      | Atlantic      | 25  | worn out         |
      | Consolidation | 29  | in working order |
      | Consolidation | 30  | worn out         |
      | Northern      | 29  | in working order |
      | Northern      | 30  | worn out         |

  # Working life left = working life - age, never below 0.
  Scenario Outline: The train sheet shows how much working life is left
    Given a <model> train exists at the station at (2, 5)
    And the train is <age> years old
    Then the train should have <left> years of working life left

    Examples:
      | model    | age | left |
      | American | 0   | 20   |
      | American | 15  | 5    |
      | American | 20  | 0    |
      | American | 25  | 0    |
      | Mogul    | 10  | 15   |
      | Northern | 10  | 20   |
