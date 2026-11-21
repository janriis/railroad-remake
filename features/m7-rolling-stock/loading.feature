@m7
Feature: Loading by car type
  As a railroad owner
  I want trains to load only what their coupled cars can carry
  So that I have to match my cars to my cargo

  Rules (docs/rolling-stock.md):
  - At a stop the train loads what is waiting, in the order the goods arrived at the station, into the coupled
    cars that can carry it, until those cars are full.
  - Each car type has its own capacity, shared by all the goods it carries (coach 40, baggage car 30, boxcar 20,
    hopper 25, flatcar 20, covered hopper 35).
  - Goods no coupled car can carry stay where they are.
  - Mail goes in baggage cars, never in coaches; coaches carry only passengers.

  The train starts at (2, 5) and first calls at (18, 5) on day 4 (16 tiles at 4 tiles a day). There is no town
  or industry at (18, 5), so nothing is unloaded there and the cargo stays on board. The goods waiting at
  (18, 5) are set up directly; they are the only goods in play.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And existing track from (2, 5) to (18, 5)
    And a small station exists at (2, 5)
    And a small station exists at (18, 5)

  # One hopper holds 25 coal; 15 stay at the station.
  Scenario: Coal loads into a hopper
    Given a train with these cars exists at the station at (2, 5):
      | car    | count |
      | hopper | 1     |
    And the train has the route (2, 5), (18, 5)
    And the station at (18, 5) has 40 coal waiting
    When 4 days pass
    Then the train should be waiting at the station at (18, 5)
    And the train should be carrying 25 coal
    And the station at (18, 5) should have 15 coal waiting

  Scenario: Coal waits for a hopper
    Given a train with these cars exists at the station at (2, 5):
      | car    | count |
      | boxcar | 2     |
    And the train has the route (2, 5), (18, 5)
    And the station at (18, 5) has 40 coal waiting
    When 4 days pass
    Then the train should be waiting at the station at (18, 5)
    And the train should be carrying no cargo
    And the station at (18, 5) should have 40 coal waiting

  # The boxcar holds 20 units: it takes 20 of the 30 flour. The coal needs a hopper and stays.
  Scenario: A boxcar takes flour but not coal
    Given a train with these cars exists at the station at (2, 5):
      | car    | count |
      | boxcar | 1     |
    And the train has the route (2, 5), (18, 5)
    And the station at (18, 5) has 30 flour waiting
    And the station at (18, 5) has 30 coal waiting
    When 4 days pass
    Then the train should be carrying 20 flour
    And the train should be carrying 0 coal
    And the station at (18, 5) should have 10 flour waiting
    And the station at (18, 5) should have 30 coal waiting

  # Two boxcars hold 2 x 20 = 40 units between them. Flour arrived first and takes 30; grain gets the other 10.
  Scenario: A car type's capacity is shared by the goods it carries
    Given a train with these cars exists at the station at (2, 5):
      | car    | count |
      | boxcar | 2     |
    And the train has the route (2, 5), (18, 5)
    And the station at (18, 5) has 30 flour waiting
    And the station at (18, 5) has 30 grain waiting
    When 4 days pass
    Then the train should be carrying 30 flour
    And the train should be carrying 10 grain
    And the station at (18, 5) should have 0 flour waiting
    And the station at (18, 5) should have 20 grain waiting

  # With 100 units waiting, one car of each type fills up to its own capacity.
  Scenario Outline: A car fills with the goods it can carry
    Given a train with these cars exists at the station at (2, 5):
      | car   | count |
      | <car> | 1     |
    And the train has the route (2, 5), (18, 5)
    And the station at (18, 5) has 100 <cargo> waiting
    When 4 days pass
    Then the train should be carrying <loaded> <cargo>
    And the station at (18, 5) should have <left> <cargo> waiting

    Examples:
      | car                | cargo      | loaded | left |
      | coach              | passengers | 40     | 60   |
      | baggage car        | mailbags   | 30     | 70   |
      | boxcar             | furniture  | 20     | 80   |
      | boxcar             | loaves     | 20     | 80   |
      | hopper             | coal       | 25     | 75   |
      | flatcar            | timber     | 20     | 80   |
      | flatcar            | lumber     | 20     | 80   |

  # Coaches carry only passengers: the 20 mailbags stay, the 30 passengers fit into 2 x 40 seats.
  Scenario: Mail does not go in coaches
    Given a train with these cars exists at the station at (2, 5):
      | car   | count |
      | coach | 2     |
    And the train has the route (2, 5), (18, 5)
    And the station at (18, 5) has 30 passengers waiting
    And the station at (18, 5) has 20 mailbags waiting
    When 4 days pass
    Then the train should be carrying 30 passengers
    And the train should be carrying 0 mailbags
    And the station at (18, 5) should have 20 mailbags waiting

  # Coach 40 passengers (10 stay), baggage car 30 mailbags (10 stay).
  Scenario: Mail goes in a baggage car and passengers in a coach
    Given a train with these cars exists at the station at (2, 5):
      | car         | count |
      | coach       | 1     |
      | baggage car | 1     |
    And the train has the route (2, 5), (18, 5)
    And the station at (18, 5) has 50 passengers waiting
    And the station at (18, 5) has 40 mailbags waiting
    When 4 days pass
    Then the train should be carrying 40 passengers
    And the train should be carrying 30 mailbags
    And the station at (18, 5) should have 10 passengers waiting
    And the station at (18, 5) should have 10 mailbags waiting

  # Each type fills from its own goods: coach 40 of 60 passengers, baggage 30 of 40 mail, boxcar 20 of 50 flour,
  # hopper 25 of 50 coal.
  Scenario: Several car types on one train each fill with their own goods
    Given a train with these cars exists at the station at (2, 5):
      | car         | count |
      | coach       | 1     |
      | baggage car | 1     |
      | boxcar      | 1     |
      | hopper      | 1     |
    And the train has the route (2, 5), (18, 5)
    And the station at (18, 5) has 60 passengers waiting
    And the station at (18, 5) has 40 mailbags waiting
    And the station at (18, 5) has 50 flour waiting
    And the station at (18, 5) has 50 coal waiting
    When 4 days pass
    Then the train should be carrying 40 passengers
    And the train should be carrying 30 mailbags
    And the train should be carrying 20 flour
    And the train should be carrying 25 coal
    And the station at (18, 5) should have 20 passengers waiting
    And the station at (18, 5) should have 10 mailbags waiting
    And the station at (18, 5) should have 30 flour waiting
    And the station at (18, 5) should have 25 coal waiting

  # Several cars of a type add up: 3 hoppers hold 75 coal.
  Scenario: Cars of one type add their capacities
    Given a train with these cars exists at the station at (2, 5):
      | car    | count |
      | hopper | 3     |
    And the train has the route (2, 5), (18, 5)
    And the station at (18, 5) has 100 coal waiting
    When 4 days pass
    Then the train should be carrying 75 coal
    And the station at (18, 5) should have 25 coal waiting

  # Grain can go in a boxcar (20) or a covered hopper (35, on sale from 1930): together 55 units.
  # ASSUMPTION: grain fills every coupled car that can carry it, so 5 of the 60 stay.
  Scenario: Grain loads into boxcars and covered hoppers alike
    Given the calendar starts on 1 January 1930
    And a Mikado train with these cars exists at the station at (2, 5):
      | car            | count |
      | boxcar         | 1     |
      | covered hopper | 1     |
    And the train has the route (2, 5), (18, 5)
    And the station at (18, 5) has 60 grain waiting
    When 4 days pass
    Then the train should be carrying 55 grain
    And the station at (18, 5) should have 5 grain waiting

  # The covered hopper carries only grain: the 35 units fit, 15 grain and all the flour stay.
  Scenario: A covered hopper carries grain and nothing else
    Given the calendar starts on 1 January 1930
    And a Mikado train with these cars exists at the station at (2, 5):
      | car            | count |
      | covered hopper | 1     |
    And the train has the route (2, 5), (18, 5)
    And the station at (18, 5) has 50 grain waiting
    And the station at (18, 5) has 10 flour waiting
    When 4 days pass
    Then the train should be carrying 35 grain
    And the train should be carrying 0 flour
    And the station at (18, 5) should have 15 grain waiting
    And the station at (18, 5) should have 10 flour waiting

  # A coal mine makes 40 coal a month at its month end (day 30). The train calls at (18, 5) on days 4, 12, 20,
  # 28 (nothing yet) and 36, when it takes 25 of the 40 (one hopper). On day 38 it is on its way back.
  Scenario: A hopper loads a deposit's coal
    Given a coal mine exists at (18, 5)
    And a train with these cars exists at the station at (2, 5):
      | car    | count |
      | hopper | 1     |
    And the train has the route (2, 5), (18, 5)
    When 38 days pass
    Then the train should be carrying 25 coal
    And the deposit at (18, 5) should have 15 coal waiting
