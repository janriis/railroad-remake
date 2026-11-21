@m3 @wip
Feature: Cargo delivery revenue
  As a railroad owner
  I want to be paid for cargo I deliver
  So that long, fast hauls earn more than short, slow ones

  Rules: payment = units x distance in tiles x rate per unit per tile x time factor.
  Distance is the Manhattan distance between pickup and drop-off stations.
  Rates per unit per tile: passengers $5, mail $8, timber $3, lumber $6, furniture $12, grain $3, flour $5, loaves $9.
  Time factor: 100% for transit up to 20 days, then minus 2 percentage points per extra day, never below 50%.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash

  Scenario: Delivering passengers pays for distance
    When 50 passengers are delivered over 10 tiles in 10 days
    Then the company should be paid $2,500

  Scenario Outline: Payment grows with distance
    When 50 passengers are delivered over <distance> tiles in 5 days
    Then the company should be paid <payment>

    Examples:
      | distance | payment |
      | 5        | $1,250  |
      | 10       | $2,500  |
      | 20       | $5,000  |

  Scenario Outline: Payment decays with transit time
    When 50 passengers are delivered over 10 tiles in <days> days
    Then the company should be paid <payment>

    Examples:
      | days | payment |
      | 10   | $2,500  |
      | 20   | $2,500  |
      | 30   | $2,000  |
      | 40   | $1,500  |
      | 100  | $1,250  |

  Scenario Outline: Each cargo has its own rate
    When 10 units of <cargo> are delivered over 10 tiles in 10 days
    Then the company should be paid <payment>

    Examples:
      | cargo     | payment |
      | passengers | $500    |
      | mail      | $800    |
      | timber    | $300    |
      | lumber    | $600    |
      | furniture | $1,200  |
      | grain     | $300    |
      | flour     | $500    |
      | loaves    | $900    |

  Scenario: A finished delivery adds the payment to cash
    Given the company has $100,000 in cash
    When 50 passengers are delivered over 10 tiles in 10 days
    Then the company's cash is $102,500

  Scenario: Nothing is paid when cargo is delivered to its origin
    When 50 passengers are delivered over 0 tiles in 1 days
    Then the company should be paid $0
