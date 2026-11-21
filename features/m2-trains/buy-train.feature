@m2 @wip
Feature: Buying trains
  As a railroad owner
  I want to buy a locomotive and cars
  So that I can haul passengers and freight

  Prices: locomotive $50,000, passenger car $10,000, freight car $8,000. A train holds at most 6 cars.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And existing track from (2, 5) to (12, 5)
    And a small station exists at (2, 5)

  Scenario: Buying a locomotive alone
    When I buy a locomotive at the station at (2, 5)
    Then the command succeeds
    And it cost $50,000
    And the company should own 1 train

  Scenario: Buying a locomotive with cars
    When I buy a locomotive with 2 passenger cars and 1 freight car at the station at (2, 5)
    Then it cost $78,000
    And the company's cash is $922,000
    And the train should have 3 cars

  Scenario: A train may have at most 6 cars
    When I buy a locomotive with 7 passenger cars at the station at (2, 5)
    Then the command is rejected with "too many cars"
    And no money was spent

  Scenario: A train needs a station to start from
    When I buy a locomotive at (5, 5)
    Then the command is rejected with "train must start at a station"
    And the company should own 0 trains

  Scenario: The company cannot afford a train
    Given the company has $55,000 in cash
    When I buy a locomotive with 1 passenger car at the station at (2, 5)
    Then the command is rejected with "insufficient funds"
    And the company's cash is $55,000
    And the company should own 0 trains

  Scenario: Cars need a locomotive
    When I buy 2 passenger cars at the station at (2, 5)
    Then the command is rejected with "cars need a locomotive"
