@m8
Feature: Bonds
  As a railroad owner
  I want to borrow money by issuing bonds
  So that I can build before I have earned the money

  Rules: a bond is $100,000 borrowed. Its interest rate is fixed when it is issued: 5% for the first bond
  outstanding, plus 1 point for each other bond already outstanding. At most 10 bonds at a time. Every month
  end the company pays principal x rate / 12 (whole dollars, rounded per bond) on each bond, booked as
  `interest`, which is part of profit. A bond can be repaid at any time for its principal, the most expensive
  bond first. Borrowing and repaying are booked as `financing`, which is not part of profit.

  Background:
    Given a new game on a 20x20 map of plains
    And the company has $1,000,000 in cash
    And the calendar starts on 1 January 1850

  Scenario: Issuing a bond adds $100,000 in cash and in debt
    When I issue a bond
    Then the command succeeds
    And the company's cash is $1,100,000
    And the company's debt is $100,000
    And the company should have 1 bond outstanding

  # The rate is 5% plus 1 point for each bond already outstanding.
  Scenario Outline: The rate depends on how many bonds are outstanding
    Given the company has <outstanding> bonds outstanding
    When I issue a bond
    Then the command succeeds
    And the newest bond should have an interest rate of <rate>%

    Examples:
      | outstanding | rate |
      | 0           | 5    |
      | 1           | 6    |
      | 2           | 7    |
      | 9           | 14   |

  Scenario: The credit limit is 10 bonds
    Given the company has 10 bonds outstanding
    When I issue a bond
    Then the command is rejected with "credit limit reached"
    And no money was spent
    And the company should have 10 bonds outstanding

  Scenario: Bonds already issued keep their rate when more are issued
    When I issue a bond
    And I issue a bond
    And I issue a bond
    Then the bonds outstanding should carry the rates "5%, 6%, 7%"

  # Fixture bonds are issued at 5%, 6%, 7% ... in order and give no cash.
  # 100,000 x 5% / 12 = 416.67 -> 417; 100,000 x 6% / 12 = 500; 100,000 x 7% / 12 = 583.33 -> 583.
  # n = 5: 417 + 500 + 583 + 667 (666.67) + 750 = 2,917. n = 10 (5% to 14%): 7,917.
  Scenario Outline: Interest is paid at every month end
    Given the company has <bonds> bonds outstanding
    When 1 months pass
    Then the ledger for 1850 should show <interest> in interest
    And the company's cash is <cash>

    Examples:
      | bonds | interest | cash       |
      | 1     | $417     | $999,583   |
      | 2     | $917     | $999,083   |
      | 3     | $1,500   | $998,500   |
      | 5     | $2,917   | $997,083   |
      | 10    | $7,917   | $992,083   |

  Scenario: Interest is part of profit
    Given the company has 1 bond outstanding
    When 1 months pass
    Then the ledger for 1850 should show a loss of $417

  Scenario: No bonds, no interest
    When 12 months pass
    Then the ledger for 1850 should show $0 in interest

  # Rate is fixed at issue: the 7% bond is repaid first, so a new bond again gets 5% + 2 points = 7%.
  Scenario: The most expensive bond is repaid first
    Given the company has 3 bonds outstanding
    When I repay a bond
    Then the command succeeds
    And the company's cash is $900,000
    And the company's debt is $200,000
    And the bonds outstanding should carry the rates "5%, 6%"

  Scenario: A bond issued after a repayment takes the rate for the bonds still outstanding
    Given the company has 3 bonds outstanding
    When I repay a bond
    And I issue a bond
    Then the bonds outstanding should carry the rates "5%, 6%, 7%"

  Scenario: Repaying with exactly enough cash
    Given the company has $100,000 in cash
    And the company has 1 bond outstanding
    When I repay a bond
    Then the command succeeds
    And the company's cash is $0
    And the company's debt is $0

  Scenario: Repaying with too little cash is rejected
    Given the company has $99,999 in cash
    And the company has 1 bond outstanding
    When I repay a bond
    Then the command is rejected with "insufficient funds"
    And no money was spent
    And the company should have 1 bond outstanding

  Scenario: There is nothing to repay without bonds
    When I repay a bond
    Then the command is rejected with "no bonds"
    And no money was spent

  Scenario: Issuing a bond is financing, not profit
    When I issue a bond
    Then the ledger for 1850 should show $100,000 in financing inflows
    And the ledger for 1850 should show $0 in financing outflows
    And the ledger for 1850 should show break-even results

  Scenario: Repaying a bond is financing, not profit
    Given the company has 1 bond outstanding
    When I repay a bond
    Then the ledger for 1850 should show $100,000 in financing outflows
    And the ledger for 1850 should show break-even results
