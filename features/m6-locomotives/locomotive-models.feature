@m6
Feature: Locomotive models
  As a railroad owner
  I want to choose between locomotive models that come and go with the years
  So that new technology opens up as the game moves through the eras

  Each model is on sale from its first year up to and including its last year (no last year means it is
  never retired). The year is the game date's year.

  | Model                        | On sale   | Speed (tiles/day) | Max cars | Price    | Running / month |
  | 4-4-0 American              | 1850-1890 | 4                 | 4        | $50,000  | $2,000          |
  | 2-6-0 Mogul                 | 1865-1905 | 4                 | 6        | $65,000  | $2,300          |
  | 4-6-0 Ten-Wheeler           | 1870-1915 | 5                 | 6        | $80,000  | $2,600          |
  | 2-8-0 Consolidation         | 1875-1925 | 4                 | 8        | $90,000  | $2,900          |
  | 4-4-2 Atlantic              | 1895-1920 | 7                 | 5        | $110,000 | $3,200          |
  | 4-6-2 Pacific               | 1905-1945 | 7                 | 7        | $140,000 | $3,800          |
  | 2-8-2 Mikado                | 1910-1945 | 5                 | 10       | $130,000 | $3,600          |
  | 4-8-4 Northern              | 1927-1950 | 8                 | 10       | $200,000 | $4,800          |
  | Streamlined passenger diesel | 1937-     | 9                 | 8        | $220,000 | $4,200          |
  | Road-switcher diesel        | 1949-     | 7                 | 12       | $180,000 | $3,500          |

  Scenarios use the short names (American, Mogul, Ten-Wheeler, ...). Fixture steps that name a calendar
  date must come before the steps that create trains: a train's age is counted from the game date at which
  it was created.

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
      | year | models                                                                                              |
      | 1850 | 4-4-0 American                                                                                      |
      | 1864 | 4-4-0 American                                                                                      |
      | 1865 | 4-4-0 American, 2-6-0 Mogul                                                                         |
      | 1870 | 4-4-0 American, 2-6-0 Mogul, 4-6-0 Ten-Wheeler                                                      |
      | 1875 | 4-4-0 American, 2-6-0 Mogul, 4-6-0 Ten-Wheeler, 2-8-0 Consolidation                                 |
      | 1890 | 4-4-0 American, 2-6-0 Mogul, 4-6-0 Ten-Wheeler, 2-8-0 Consolidation                                 |
      | 1891 | 2-6-0 Mogul, 4-6-0 Ten-Wheeler, 2-8-0 Consolidation                                                 |
      | 1895 | 2-6-0 Mogul, 4-6-0 Ten-Wheeler, 2-8-0 Consolidation, 4-4-2 Atlantic                                 |
      | 1905 | 2-6-0 Mogul, 4-6-0 Ten-Wheeler, 2-8-0 Consolidation, 4-4-2 Atlantic, 4-6-2 Pacific                  |
      | 1906 | 4-6-0 Ten-Wheeler, 2-8-0 Consolidation, 4-4-2 Atlantic, 4-6-2 Pacific                               |
      | 1910 | 4-6-0 Ten-Wheeler, 2-8-0 Consolidation, 4-4-2 Atlantic, 4-6-2 Pacific, 2-8-2 Mikado                 |
      | 1916 | 2-8-0 Consolidation, 4-4-2 Atlantic, 4-6-2 Pacific, 2-8-2 Mikado                                    |
      | 1921 | 2-8-0 Consolidation, 4-6-2 Pacific, 2-8-2 Mikado                                                    |
      | 1927 | 4-6-2 Pacific, 2-8-2 Mikado, 4-8-4 Northern                                                         |
      | 1937 | 4-6-2 Pacific, 2-8-2 Mikado, 4-8-4 Northern, Streamlined passenger diesel                           |
      | 1946 | 4-8-4 Northern, Streamlined passenger diesel                                                        |
      | 1949 | 4-8-4 Northern, Streamlined passenger diesel, Road-switcher diesel                                  |
      | 1951 | Streamlined passenger diesel, Road-switcher diesel                                                  |

  Scenario Outline: Buying a model that is on sale costs its price
    Given the calendar starts on 1 January <year>
    When I buy <article> <model> locomotive at the station at (2, 5)
    Then the command succeeds
    And it cost <price>
    And the train should be <article> <model>

    Examples:
      | year | article | model         | price    |
      | 1850 | an      | American      | $50,000  |
      | 1865 | a       | Mogul         | $65,000  |
      | 1870 | a       | Ten-Wheeler   | $80,000  |
      | 1875 | a       | Consolidation | $90,000  |
      | 1895 | an      | Atlantic      | $110,000 |
      | 1905 | a       | Pacific       | $140,000 |
      | 1910 | a       | Mikado        | $130,000 |
      | 1927 | a       | Northern      | $200,000 |
      | 1937 | a       | Streamliner   | $220,000 |
      | 1949 | a       | Road switcher | $180,000 |

  Scenario Outline: A model that is not on sale cannot be bought
    Given the calendar starts on 1 January <year>
    When I buy <article> <model> locomotive at the station at (2, 5)
    Then the command is rejected with "model not on sale"
    And no money was spent
    And the company should own 0 trains

    Examples:
      | year | article | model         |
      | 1850 | a       | Mogul         |
      | 1850 | a       | Northern      |
      | 1869 | a       | Ten-Wheeler   |
      | 1891 | an      | American      |
      | 1906 | a       | Mogul         |
      | 1921 | an      | Atlantic      |
      | 1946 | a       | Mikado        |
      | 1948 | a       | Road switcher |
      | 1951 | a       | Northern      |

  Scenario: A model that is retired from sale keeps running in trains already bought
    Given the calendar starts on 1 January 1890
    And an American train with 0 coaches and 0 boxcars exists at the station at (2, 5)
    When 2 years pass
    Then the train should be an American
    When I buy an American locomotive at the station at (2, 5)
    Then the command is rejected with "model not on sale"

  Scenario: Existing trains are Americans
    Given a train exists at the station at (2, 5)
    Then the train should be an American

  # Cars are bought with the locomotive, so the limit is checked against the model: American 4, Mogul 6,
  # Ten-Wheeler 6, Consolidation 8, Atlantic 5, Pacific 7, Mikado 10, Northern 10, Streamliner 8,
  # Road switcher 12 (replaces the old fixed limit of 6).
  Scenario Outline: A model can pull as many cars as its maximum
    Given the calendar starts on 1 January <year>
    When I buy <article> <model> locomotive with <cars> coaches at the station at (2, 5)
    Then the command succeeds
    And the train should have <cars> cars

    Examples:
      | year | article | model         | cars |
      | 1850 | an      | American      | 4    |
      | 1870 | a       | Mogul         | 6    |
      | 1870 | a       | Ten-Wheeler   | 6    |
      | 1875 | a       | Consolidation | 8    |
      | 1895 | an      | Atlantic      | 5    |
      | 1905 | a       | Pacific       | 7    |
      | 1910 | a       | Mikado        | 10   |
      | 1927 | a       | Northern      | 10   |
      | 1937 | a       | Streamliner   | 8    |
      | 1949 | a       | Road switcher | 12   |

  Scenario Outline: A model cannot pull more cars than its maximum
    Given the calendar starts on 1 January <year>
    When I buy <article> <model> locomotive with <cars> coaches at the station at (2, 5)
    Then the command is rejected with "too many cars"
    And no money was spent

    Examples:
      | year | article | model         | cars |
      | 1850 | an      | American      | 5    |
      | 1870 | a       | Mogul         | 7    |
      | 1870 | a       | Ten-Wheeler   | 7    |
      | 1875 | a       | Consolidation | 9    |
      | 1895 | an      | Atlantic      | 6    |
      | 1905 | a       | Pacific       | 8    |
      | 1910 | a       | Mikado        | 11   |
      | 1927 | a       | Northern      | 11   |
      | 1937 | a       | Streamliner   | 9    |
      | 1949 | a       | Road switcher | 13   |

  Scenario: Changing cars is limited by the model, not by a fixed number
    Given the calendar starts on 1 January 1910
    And a Mikado train exists at the station at (2, 5)
    When I change the train's cars to 6 coaches and 4 boxcars
    Then the command succeeds
    When I change the train's cars to 6 coaches and 5 boxcars
    Then the command is rejected with "too many cars"
    And the train should haul 6 coaches and 4 boxcars

  # An American holds 4 cars, so adding a fifth is rejected.
  Scenario: An American cannot be given a fifth car
    Given an American train with 4 coaches and 0 boxcars exists at the station at (2, 5)
    When I change the train's cars to 4 coaches and 1 boxcar
    Then the command is rejected with "too many cars"
    And no money was spent

  # Trains from older saves became Americans with up to 6 cars. They keep them; the limit only bites when
  # the cars are changed.
  # Running cost for a month: American $2,000 + 6 cars x $200 = $3,200.
  Scenario: A train from an older save keeps its extra cars until they are changed
    Given an American train with 6 coaches and 0 boxcars exists at the station at (2, 5)
    When 1 months pass
    Then the train should haul 6 coaches and 0 boxcars
    And the company should have paid $3,200 in train running costs
    When I change the train's cars to 5 coaches and 0 boxcars
    Then the command is rejected with "too many cars"
    When I change the train's cars to 4 coaches and 0 boxcars
    Then the command succeeds

  # The line is 16 tiles long and the train starts at the station at (2, 5), so after 1 day a train is at
  # x = 2 + tiles per day: American, Mogul and Consolidation 4 -> 6;
  # Ten-Wheeler and Mikado 5 -> 7; Atlantic, Pacific and Road switcher 7 -> 9; Northern 8 -> 10;
  # Streamliner 9 -> 11. One day keeps even the fastest train on the line (2 days would take the
  # Streamliner past (18, 5), where it turns round).
  Scenario Outline: Each model has its own speed
    Given a <model> train exists at the station at (2, 5)
    And the train has the route (2, 5), (18, 5)
    When 1 days pass
    Then the train should be at <position>

    Examples:
      | model         | position |
      | American      | (6, 5)   |
      | Mogul         | (6, 5)   |
      | Ten-Wheeler   | (7, 5)   |
      | Consolidation | (6, 5)   |
      | Atlantic      | (9, 5)   |
      | Pacific       | (9, 5)   |
      | Mikado        | (7, 5)   |
      | Northern      | (10, 5)  |
      | Streamliner   | (11, 5)  |
      | Road switcher | (9, 5)   |

  # One month of running costs for a new locomotive of each model, no cars, no breakdowns.
  Scenario Outline: Each model has its own running cost
    Given a <model> train exists at the station at (2, 5)
    When 1 months pass
    Then the company should have paid <cost> in train running costs

    Examples:
      | model         | cost   |
      | American      | $2,000 |
      | Mogul         | $2,300 |
      | Ten-Wheeler   | $2,600 |
      | Consolidation | $2,900 |
      | Atlantic      | $3,200 |
      | Pacific       | $3,800 |
      | Mikado        | $3,600 |
      | Northern      | $4,800 |
      | Streamliner   | $4,200 |
      | Road switcher | $3,500 |
