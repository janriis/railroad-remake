@m6
Feature: Locomotive models
  As a railroad owner
  I want to choose between locomotive models that come and go with the years
  So that new technology opens up as the game moves through the eras

  Each model is on sale from its first year up to and including its last year (no last year means it is
  never retired). The year is the game date's year.

  | Model      | On sale   | Speed (tiles/day) | Max cars | Price    | Running / month |
  | Pioneer    | 1850-1885 | 4                 | 4        | $50,000  | $2,000          |
  | Ironside   | 1870-1910 | 5                 | 6        | $80,000  | $2,600          |
  | Courier    | 1895-1940 | 7                 | 6        | $120,000 | $3,400          |
  | Hauler     | 1900-1945 | 5                 | 8        | $110,000 | $3,200          |
  | Pathfinder | 1935-     | 8                 | 8        | $180,000 | $3,800          |

  Fixture steps that name a calendar date must come before the steps that create trains: a train's age is
  counted from the game date at which it was created.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And existing track from (2, 5) to (18, 5)
    And a small station exists at (2, 5)
    And a small station exists at (18, 5)
    And breakdowns never happen

  Scenario Outline: Which models are on sale in a given year
    Given the calendar starts on 1 January <year>
    Then the models on sale should be "<models>"

    Examples:
      | year | models                    |
      | 1850 | Pioneer                   |
      | 1869 | Pioneer                   |
      | 1870 | Pioneer, Ironside         |
      | 1875 | Pioneer, Ironside         |
      | 1885 | Pioneer, Ironside         |
      | 1886 | Ironside                  |
      | 1900 | Ironside, Courier, Hauler |
      | 1910 | Ironside, Courier, Hauler |
      | 1911 | Courier, Hauler           |
      | 1940 | Courier, Hauler, Pathfinder |
      | 1941 | Hauler, Pathfinder        |
      | 1946 | Pathfinder                |

  Scenario Outline: Buying a model that is on sale costs its price
    Given the calendar starts on 1 January <year>
    When I buy a <model> locomotive at the station at (2, 5)
    Then the command succeeds
    And it cost <price>
    And the train should be a <model>

    Examples:
      | year | model      | price    |
      | 1850 | Pioneer    | $50,000  |
      | 1875 | Ironside   | $80,000  |
      | 1900 | Courier    | $120,000 |
      | 1900 | Hauler     | $110,000 |
      | 1940 | Pathfinder | $180,000 |

  Scenario Outline: A model that is not on sale cannot be bought
    Given the calendar starts on 1 January <year>
    When I buy a <model> locomotive at the station at (2, 5)
    Then the command is rejected with "model not on sale"
    And no money was spent
    And the company should own 0 trains

    Examples:
      | year | model      |
      | 1850 | Courier    |
      | 1850 | Pathfinder |
      | 1869 | Ironside   |
      | 1886 | Pioneer    |
      | 1946 | Hauler     |

  Scenario: A model that is retired from sale keeps running in trains already bought
    Given the calendar starts on 1 January 1885
    And a Pioneer train exists at the station at (2, 5)
    When 2 years pass
    Then the train should be a Pioneer
    When I buy a Pioneer locomotive at the station at (2, 5)
    Then the command is rejected with "model not on sale"

  Scenario: Existing trains are Pioneers
    Given a train exists at the station at (2, 5)
    Then the train should be a Pioneer

  # Cars are bought with the locomotive, so the limit is checked against the model: Pioneer 4, Ironside 6,
  # Courier 6, Hauler 8, Pathfinder 8 (replaces the old fixed limit of 6).
  Scenario Outline: A model can pull as many cars as its maximum
    Given the calendar starts on 1 January <year>
    When I buy a <model> locomotive with <cars> passenger cars at the station at (2, 5)
    Then the command succeeds
    And the train should have <cars> cars

    Examples:
      | year | model      | cars |
      | 1850 | Pioneer    | 4    |
      | 1880 | Ironside   | 6    |
      | 1900 | Courier    | 6    |
      | 1900 | Hauler     | 8    |
      | 1940 | Pathfinder | 8    |

  Scenario Outline: A model cannot pull more cars than its maximum
    Given the calendar starts on 1 January <year>
    When I buy a <model> locomotive with <cars> passenger cars at the station at (2, 5)
    Then the command is rejected with "too many cars"
    And no money was spent

    Examples:
      | year | model      | cars |
      | 1850 | Pioneer    | 5    |
      | 1880 | Ironside   | 7    |
      | 1900 | Courier    | 7    |
      | 1900 | Hauler     | 9    |
      | 1940 | Pathfinder | 9    |

  Scenario: Changing cars is limited by the model, not by a fixed number
    Given the calendar starts on 1 January 1900
    And a Hauler train exists at the station at (2, 5)
    When I change the train's cars to 5 passenger cars and 3 freight cars
    Then the command succeeds
    When I change the train's cars to 5 passenger cars and 4 freight cars
    Then the command is rejected with "too many cars"
    And the train should haul 5 passenger cars and 3 freight cars

  # A Pioneer holds 4 cars, so adding a fifth is rejected.
  Scenario: A Pioneer cannot be given a fifth car
    Given a Pioneer train with 4 passenger cars and 0 freight cars exists at the station at (2, 5)
    When I change the train's cars to 4 passenger cars and 1 freight car
    Then the command is rejected with "too many cars"
    And no money was spent

  # Trains from older saves became Pioneers with up to 6 cars. They keep them; the limit only bites when
  # the cars are changed.
  # Running cost for a month: Pioneer $2,000 + 6 cars x $200 = $3,200.
  Scenario: A train from an older save keeps its extra cars until they are changed
    Given a Pioneer train with 6 passenger cars and 0 freight cars exists at the station at (2, 5)
    When 1 months pass
    Then the train should haul 6 passenger cars and 0 freight cars
    And the company should have paid $3,200 in train running costs
    When I change the train's cars to 5 passenger cars and 0 freight cars
    Then the command is rejected with "too many cars"
    When I change the train's cars to 4 passenger cars and 0 freight cars
    Then the command succeeds

  # The line is 16 tiles long and the train starts at the station at (2, 5).
  # After 2 days: Pioneer 4 x 2 = 8 tiles, Ironside and Hauler 5 x 2 = 10, Courier 7 x 2 = 14,
  # Pathfinder 8 x 2 = 16 (arrives).
  Scenario Outline: Each model has its own speed
    Given a <model> train exists at the station at (2, 5)
    And the train has the route (2, 5), (18, 5)
    When 2 days pass
    Then the train should be at <position>

    Examples:
      | model      | position |
      | Pioneer    | (10, 5)  |
      | Ironside   | (12, 5)  |
      | Courier    | (16, 5)  |
      | Hauler     | (12, 5)  |
      | Pathfinder | (18, 5)  |

  # One month of running costs for a new locomotive of each model, no cars, no breakdowns.
  Scenario Outline: Each model has its own running cost
    Given a <model> train exists at the station at (2, 5)
    When 1 months pass
    Then the company should have paid <cost> in train running costs

    Examples:
      | model      | cost   |
      | Pioneer    | $2,000 |
      | Ironside   | $2,600 |
      | Courier    | $3,400 |
      | Hauler     | $3,200 |
      | Pathfinder | $3,800 |
