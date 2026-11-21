@m7
Feature: Stop orders by car type
  As a railroad owner
  I want to choose, stop by stop, which of my cars are coupled
  So that each leg of a route hauls the right mix of goods

  Rules (docs/rolling-stock.md):
  - A train owns a number of cars of each type and couples some or all of them. The stop order names the
    coupled count per type, at most the number owned of each type.
  - Leaving a type out of an order couples none of it. A row with no counts at all is "no order": the cars stay
    as they are.
  - A stop order that asks for more than the train owns of a type is rejected with
    "a stop order can use at most the train's N <type> cars", where <type> is the car's id (coach, baggage,
    boxcar, hopper, covered-hopper, flatcar, legacy-freight).
  - Cars that are not coupled stay with the train as spares and still cost $200 a month; only coupled cars carry.
  - Changing the owned cars drops every stop order that no longer fits, type by type.
  - Stop tables have one column per car type (plural car names). A type without a column is left out.
  - A fixture train starts with all its cars coupled.

  The train starts at (2, 5) and first calls at (18, 5) on day 4, is back at (2, 5) on day 8.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And existing track from (2, 5) to (18, 5)
    And a small station exists at (2, 5)
    And a small station exists at (18, 5)

  Scenario: Cars are swapped at each stop as ordered
    Given a train with these cars exists at the station at (2, 5):
      | car    | count |
      | coach  | 2     |
      | boxcar | 2     |
    When I assign the train these stops:
      | stop    | coaches | boxcars |
      | (2, 5)  | 2       | 0       |
      | (18, 5) | 0       | 2       |
    And 4 days pass
    Then the train should be waiting at the station at (18, 5)
    And the train should haul these cars:
      | car    | count |
      | boxcar | 2     |
    When 4 days pass
    Then the train should haul these cars:
      | car   | count |
      | coach | 2     |
    And the train should own these cars:
      | car    | count |
      | coach  | 2     |
      | boxcar | 2     |
    And no money was spent

  Scenario: A type left out of the order couples none of it
    Given a train with these cars exists at the station at (2, 5):
      | car    | count |
      | coach  | 2     |
      | hopper | 1     |
    When I assign the train these stops:
      | stop    | coaches |
      | (2, 5)  | 2       |
      | (18, 5) | 1       |
    And 4 days pass
    Then the train should haul these cars:
      | car   | count |
      | coach | 1     |
    And the train should own these cars:
      | car    | count |
      | coach  | 2     |
      | hopper | 1     |

  Scenario: A stop without an order keeps the cars as they are
    Given a train with these cars exists at the station at (2, 5):
      | car    | count |
      | coach  | 1     |
      | boxcar | 1     |
    When I assign the train these stops:
      | stop    | coaches | boxcars |
      | (2, 5)  |         |         |
      | (18, 5) | 1       | 0       |
    And 4 days pass
    Then the train should haul these cars:
      | car   | count |
      | coach | 1     |
    When 4 days pass
    Then the train should haul these cars:
      | car   | count |
      | coach | 1     |

  # The train owns 1 boxcar, so an order for 2 is too many.
  Scenario: A stop order cannot use more cars of a type than the train owns
    Given a train with these cars exists at the station at (2, 5):
      | car    | count |
      | coach  | 2     |
      | boxcar | 1     |
    When I assign the train these stops:
      | stop    | coaches | boxcars |
      | (2, 5)  | 2       | 2       |
      | (18, 5) |         |         |
    Then the command is rejected with "a stop order can use at most the train's 1 boxcar cars"
    And the train route should have 0 stops

  Scenario Outline: Each type is checked on its own
    Given the calendar starts on 1 January 1930
    And a Mikado train with these cars exists at the station at (2, 5):
      | car                | count |
      | coach              | 2     |
      | baggage car        | 2     |
      | boxcar             | 2     |
      | hopper             | 2     |
      | flatcar            | 2     |
      | covered hopper     | 2     |
      | legacy freight car | 2     |
    When I assign the train these stops:
      | stop    | <cars> |
      | (2, 5)  | 3      |
      | (18, 5) |        |
    Then the command is rejected with "a stop order can use at most the train's 2 <type> cars"

    Examples:
      | cars                | type           |
      | coaches             | coach          |
      | baggage cars        | baggage        |
      | boxcars             | boxcar         |
      | hoppers             | hopper         |
      | flatcars            | flatcar        |
      | covered hoppers     | covered-hopper |
      | legacy freight cars | legacy-freight |

  # The train owns no boxcars, so an order for 1 is rejected.
  Scenario: A type the train does not own cannot be ordered
    Given a train with these cars exists at the station at (2, 5):
      | car   | count |
      | coach | 2     |
    When I assign the train these stops:
      | stop    | boxcars |
      | (2, 5)  | 1       |
      | (18, 5) |         |
    Then the command is rejected with "a stop order can use at most the train's 0 boxcar cars"

  # Owned cars cost $200 a month whether coupled or not: American $2,000 + 3 x $200 = $2,600.
  Scenario: Spare cars still cost their running cost
    Given a train with these cars exists at the station at (2, 5):
      | car    | count |
      | coach  | 2     |
      | boxcar | 1     |
    And the train has these stops:
      | stop    | coaches | boxcars |
      | (2, 5)  | 0       | 0       |
      | (18, 5) | 2       | 1       |
    When 1 months pass
    Then the company should have paid $2,600 in train running costs

  # Only the coach is coupled at (18, 5): it takes the 20 passengers, the baggage car stays uncoupled and the
  # 10 mailbags stay at the station.
  Scenario: Cars that are not coupled carry nothing
    Given a train with these cars exists at the station at (2, 5):
      | car         | count |
      | coach       | 1     |
      | baggage car | 1     |
    And the train has these stops:
      | stop    | coaches | baggage cars |
      | (2, 5)  | 1       | 1            |
      | (18, 5) | 1       | 0            |
    And the station at (18, 5) has 20 passengers waiting
    And the station at (18, 5) has 10 mailbags waiting
    When 4 days pass
    Then the train should be carrying 20 passengers
    And the train should be carrying 0 mailbags
    And the station at (18, 5) should have 10 mailbags waiting

  # The order at (18, 5) couples the baggage car and no coach: the 20 passengers stay.
  Scenario: Coupling a different type changes what is loaded at that stop
    Given a train with these cars exists at the station at (2, 5):
      | car         | count |
      | coach       | 1     |
      | baggage car | 1     |
    And the train has these stops:
      | stop    | coaches | baggage cars |
      | (2, 5)  | 1       | 1            |
      | (18, 5) | 0       | 1            |
    And the station at (18, 5) has 20 passengers waiting
    And the station at (18, 5) has 10 mailbags waiting
    When 4 days pass
    Then the train should be carrying 10 mailbags
    And the train should be carrying 0 passengers
    And the station at (18, 5) should have 20 passengers waiting

  # The first order wants 2 coaches, the second 1 boxcar. After the change the train owns 1 coach and
  # 1 boxcar: the first order no longer fits (type by type), the second still does.
  Scenario: Changing the owned cars drops the orders that no longer fit
    Given a train with these cars exists at the station at (2, 5):
      | car    | count |
      | coach  | 2     |
      | boxcar | 1     |
    And the train has these stops:
      | stop    | coaches | boxcars |
      | (2, 5)  | 2       | 0       |
      | (18, 5) | 0       | 1       |
    When I change the train's cars to:
      | car    | count |
      | coach  | 1     |
      | boxcar | 1     |
    Then the train should have these stops:
      | stop    | coaches | boxcars |
      | (2, 5)  |         |         |
      | (18, 5) | 0       | 1       |

  # Buying a type the orders do not name leaves the orders alone (the new type is left out, so none is coupled).
  Scenario: Orders that still fit are kept when cars are added
    Given a train with these cars exists at the station at (2, 5):
      | car   | count |
      | coach | 2     |
    And the train has these stops:
      | stop    | coaches |
      | (2, 5)  | 2       |
      | (18, 5) | 1       |
    When I change the train's cars to:
      | car    | count |
      | coach  | 2     |
      | boxcar | 1     |
    Then the train should have these stops:
      | stop    | coaches | boxcars |
      | (2, 5)  | 2       | 0       |
      | (18, 5) | 1       | 0       |
