@m7
Feature: Car types
  As a railroad owner
  I want every kind of goods to travel in the kind of car that suits it
  So that I buy the right cars for each line

  Rules (docs/rolling-stock.md):
    coach          passengers                           40 units   $10,000   1850-
    baggage car    mail                                 30 units   $10,000   1850-   (mail & baggage car)
    boxcar         flour, loaves, furniture, grain      20 units   $8,000    1850-
    hopper         coal                                 25 units   $8,000    1850-   (coal hopper)
    flatcar        timber, lumber                       20 units   $7,000    1850-
    covered hopper grain                                35 units   $12,000   1930-
    legacy freight car: any freight, 20 units, from old saves only (see legacy-cars.feature).
  Every car costs $200 a month to run, coupled or spare. A car sold is worth 50% of its price.
  A train's car limit comes from its locomotive and counts every owned car of every type.
  Car tables name a count per type; a type left out of a table means none of it.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And existing track from (2, 5) to (12, 5)
    And a small station exists at (2, 5)

  # Cars are listed in the order of the table above.
  Scenario Outline: Each cargo is carried by the cars that suit it
    Then the cars that carry <cargo> should be "<cars>"

    Examples:
      | cargo      | cars                                       |
      | passengers | coach                                     |
      | mail       | baggage car                               |
      | flour      | boxcar, legacy freight car                |
      | loaves     | boxcar, legacy freight car                |
      | furniture  | boxcar, legacy freight car                |
      | grain      | boxcar, covered hopper, legacy freight car |
      | coal       | hopper, legacy freight car                |
      | timber     | flatcar, legacy freight car               |
      | lumber     | flatcar, legacy freight car               |

  Scenario Outline: Each car type has its own capacity
    Then a <car> should hold <capacity> units

    Examples:
      | car                | capacity |
      | coach              | 40       |
      | baggage car        | 30       |
      | boxcar             | 20       |
      | hopper             | 25       |
      | flatcar            | 20       |
      | covered hopper     | 35       |
      | legacy freight car | 20       |

  # Locomotive $50,000 (American) + 2 cars at the car's price.
  Scenario Outline: Cars bought with a locomotive cost their price
    When I buy a locomotive with these cars at the station at (2, 5):
      | car   | count |
      | <car> | 2     |
    Then the command succeeds
    And it cost <cost>
    And the train should own these cars:
      | car   | count |
      | <car> | 2     |

    Examples:
      | car         | cost     |
      | coach       | $70,000  |
      | baggage car | $70,000  |
      | boxcar      | $66,000  |
      | hopper      | $66,000  |
      | flatcar     | $64,000  |

  # American $50,000 + coach $10,000 + baggage $10,000 + boxcar $8,000 + hopper $8,000 = $86,000.
  Scenario: A train can be bought with a mix of car types
    When I buy a locomotive with these cars at the station at (2, 5):
      | car         | count |
      | coach       | 1     |
      | baggage car | 1     |
      | boxcar      | 1     |
      | hopper      | 1     |
    Then it cost $86,000
    And the company's cash is $914,000
    And the train should own these cars:
      | car         | count |
      | coach       | 1     |
      | baggage car | 1     |
      | boxcar      | 1     |
      | hopper      | 1     |

  # In 1930 a Mikado (10 cars, $130,000) is on sale. Covered hoppers: 2 x $12,000 = $24,000.
  Scenario: The covered hopper is on sale from 1930
    Given the calendar starts on 1 January 1930
    When I buy a Mikado locomotive with these cars at the station at (2, 5):
      | car            | count |
      | covered hopper | 2     |
    Then the command succeeds
    And it cost $154,000

  # The Mikado is on sale from 1910, so only the car type is wrong in 1929.
  Scenario: The covered hopper is not on sale before 1930
    Given the calendar starts on 1 January 1929
    When I buy a Mikado locomotive with these cars at the station at (2, 5):
      | car            | count |
      | covered hopper | 1     |
    Then the command is rejected with "car type not on sale"
    And no money was spent
    And the company should own 0 trains

  Scenario Outline: Covered hoppers can be added to a train only from 1930
    Given the calendar starts on 1 January <year>
    And a Mikado train exists at the station at (2, 5)
    When I change the train's cars to:
      | car            | count |
      | covered hopper | 1     |
    Then the command <outcome>

    Examples:
      | year | outcome                                      |
      | 1929 | is rejected with "car type not on sale"      |
      | 1930 | succeeds                                     |

  # Adding: flatcar $7,000 + hopper $8,000 = $15,000; the coach is already owned and costs nothing.
  Scenario: Adding cars of other types costs their price
    Given a train with these cars exists at the station at (2, 5):
      | car   | count |
      | coach | 1     |
    When I change the train's cars to:
      | car     | count |
      | coach   | 1     |
      | flatcar | 1     |
      | hopper  | 1     |
    Then the command succeeds
    And it cost $15,000
    And the train should own these cars:
      | car     | count |
      | coach   | 1     |
      | flatcar | 1     |
      | hopper  | 1     |

  # Taking off 2 of 3 boxcars: 2 x 50% x $8,000 = $8,000.
  Scenario: Taking cars off pays back half their price
    Given a train with these cars exists at the station at (2, 5):
      | car    | count |
      | boxcar | 3     |
    When I change the train's cars to:
      | car    | count |
      | boxcar | 1     |
    Then the company should have received a refund of $8,000

  # The coach is sold for $5,000 and a boxcar bought for $8,000: $3,000.
  Scenario: Swapping one type for another pays for the new car and refunds the old
    Given a train with these cars exists at the station at (2, 5):
      | car   | count |
      | coach | 1     |
    When I change the train's cars to:
      | car    | count |
      | boxcar | 1     |
    Then it cost $3,000

  # An American pulls 4 cars: 2 coaches + 1 boxcar + 1 flatcar = 4 is fine (2 x $10,000 + $8,000 + $7,000 = $35,000);
  # one more car of any type is one too many.
  Scenario: The locomotive's car limit counts every owned car of every type
    Given a train exists at the station at (2, 5)
    When I change the train's cars to:
      | car     | count |
      | coach   | 2     |
      | boxcar  | 1     |
      | flatcar | 1     |
    Then it cost $35,000
    When I change the train's cars to:
      | car     | count |
      | coach   | 2     |
      | boxcar  | 1     |
      | flatcar | 1     |
      | hopper  | 1     |
    Then the command is rejected with "too many cars"
    And the train should own these cars:
      | car     | count |
      | coach   | 2     |
      | boxcar  | 1     |
      | flatcar | 1     |

  # Every car costs $200 a month, whatever its type: American $2,000 + 2 x $200 = $2,400.
  Scenario Outline: Every car type costs $200 a month to run
    Given the calendar starts on 1 January 1930
    And a train with these cars exists at the station at (2, 5):
      | car   | count |
      | <car> | 2     |
    When 1 months pass
    Then the company should have paid $2,400 in train running costs

    Examples:
      | car                |
      | coach              |
      | baggage car        |
      | boxcar             |
      | hopper             |
      | flatcar            |
      | covered hopper     |
      | legacy freight car |

  # Mikado $3,600 + 7 cars (one of each type) x $200 = $5,000.
  Scenario: Running costs add up over a mixed train
    Given the calendar starts on 1 January 1930
    And a Mikado train with these cars exists at the station at (2, 5):
      | car                | count |
      | coach              | 1     |
      | baggage car        | 1     |
      | boxcar             | 1     |
      | hopper             | 1     |
      | covered hopper     | 1     |
      | flatcar            | 1     |
      | legacy freight car | 1     |
    When 1 months pass
    Then the company should have paid $5,000 in train running costs

  # Resale is 50% of the price: 2 cars each.
  Scenario Outline: A car sold is worth half its price
    Given the calendar starts on 1 January 1930
    And a train with these cars exists at the station at (2, 5):
      | car   | count |
      | <car> | 2     |
    When I change the train's cars to:
      | car   | count |
      | <car> | 0     |
    Then the company should have received a refund of <refund>

    Examples:
      | car            | refund  |
      | coach          | $10,000 |
      | baggage car    | $10,000 |
      | boxcar         | $8,000  |
      | hopper         | $8,000  |
      | flatcar        | $7,000  |
      | covered hopper | $12,000 |
