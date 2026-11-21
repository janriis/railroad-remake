@m6
Feature: Overhauling locomotives
  As a railroad owner
  I want to renew an old locomotive in place
  So that it is cheap to run and reliable again

  Overhaul works only for a train standing at a station. It costs 30% of the model's price, paid as rolling
  stock (not a running cost), and sets the age back to 0, but only for a model still on sale.

  Fixture steps that name a calendar date come before the steps that create trains.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And existing track from (2, 5) to (18, 5)
    And a small station exists at (2, 5)
    And a small station exists at (18, 5)
    And breakdowns never happen

  # 30% x $50,000 = $15,000
  Scenario: An overhaul costs 30% of the price and makes the locomotive new again
    Given a train exists at the station at (2, 5)
    And the train is 12 years old
    When I overhaul the train
    Then the command succeeds
    And it cost $15,000
    And the company's cash is $985,000
    And the train's age should be 0 years
    And the train should be an American

  # 30% of the price: American $50,000 -> $15,000; Mogul $65,000 -> $19,500; Ten-Wheeler $80,000 -> $24,000;
  # Consolidation $90,000 -> $27,000; Atlantic $110,000 -> $33,000; Pacific $140,000 -> $42,000;
  # Mikado $130,000 -> $39,000; Northern $200,000 -> $60,000; Streamliner $220,000 -> $66,000;
  # Road switcher $180,000 -> $54,000.
  Scenario Outline: The overhaul price depends on the model
    Given the calendar starts on 1 January <year>
    And a <model> train exists at the station at (2, 5)
    And the train is 5 years old
    When I overhaul the train
    Then it cost <cost>
    And the train's age should be 0 years

    Examples:
      | year | model         | cost     |
      | 1860 | American      | $15,000  |
      | 1880 | Mogul         | $19,500  |
      | 1880 | Ten-Wheeler   | $24,000  |
      | 1900 | Consolidation | $27,000  |
      | 1900 | Atlantic      | $33,000  |
      | 1910 | Pacific       | $42,000  |
      | 1920 | Mikado        | $39,000  |
      | 1930 | Northern      | $60,000  |
      | 1940 | Streamliner   | $66,000  |
      | 1950 | Road switcher | $54,000  |

  # After the overhaul the American costs the age-0 running cost, $2,000, instead of $2,688 at age 10.
  # The $15,000 overhaul is not a running cost.
  Scenario: An overhauled locomotive runs at the cost of a new one
    Given a train exists at the station at (2, 5)
    And the train is 10 years old
    When I overhaul the train
    And 1 months pass
    Then the company should have paid $2,000 in train running costs

  Scenario: An overhaul takes a worn-out locomotive out of the worn-out state
    Given a train exists at the station at (2, 5)
    And the train is 22 years old
    And the train should be worn out
    When I overhaul the train
    Then the train should be in working order

  Scenario: An overhaul keeps the train's cars and route
    Given an American train with 2 passenger cars and 0 freight cars exists at the station at (2, 5)
    And the train has the route (2, 5), (18, 5)
    And the train is 6 years old
    When I overhaul the train
    Then the train should haul 2 passenger cars and 0 freight cars
    And the train route should have 2 stops

  Scenario: An overhaul needs the train to be at a station
    Given a train exists at the station at (2, 5)
    And the train has the route (2, 5), (18, 5)
    And the train is 12 years old
    When 1 days pass
    And I overhaul the train
    Then the command is rejected with "train must be at a station"
    And no money was spent
    And the train's age should be 12 years

  # American is on sale until 1890, so by 1 January 1900 there is no new American to restore it to.
  Scenario: A model that is no longer on sale cannot be overhauled
    Given the calendar starts on 1 January 1900
    And a train exists at the station at (2, 5)
    And the train is 10 years old
    When I overhaul the train
    Then the command is rejected with "model no longer on sale"
    And no money was spent
    And the train's age should be 10 years

  Scenario: The company must afford an overhaul
    Given a train exists at the station at (2, 5)
    And the train is 10 years old
    And the company has $10,000 in cash
    When I overhaul the train
    Then the command is rejected with "insufficient funds"
    And the company's cash is $10,000
    And the train's age should be 10 years
