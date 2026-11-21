# M7 Finance: design

Status: rules agreed with the user 2026-11-21. Numbers are first guesses for balancing.

## Idea

The railroad is a company with shares. It can borrow by issuing bonds, raise money by selling new shares,
and pay dividends. Its share price follows what the company is worth and what it earns. A company that
cannot pay its way goes bankrupt.

## Company value and share price

- **Assets** are valued at half of what they would cost today:
  - track lines, stations and station buildings at their build cost;
  - locomotives at their trade-in value, and cars at resale.
- **Equity:** cash + assets − bond debt.
- **Operating profit** is income minus running costs over the last 12 months. It counts cargo income, goods
  sales, track maintenance, train running, building upkeep and bond interest. It leaves out construction,
  rolling stock and financing.
- **Share price:** (equity + 8 × max(0, operating profit)) / shares outstanding, in whole cents, never
  below $1.00.
- The price is recomputed at every month end and kept as a monthly history for a chart.
- **Start:** $1,000,000 cash and 100,000 shares, so the price starts at $10.00.

## Bonds

- **Size:** a bond is $100,000 borrowed. Its interest rate is fixed when it is issued:
  - 5% for the first bond outstanding, plus 1 point for each other bond already outstanding;
  - at most 10 bonds at a time ("credit limit reached").
- **Interest:** principal × rate / 12, in whole dollars, paid at every month end and booked as `interest`.
- **Repaying:** a bond can be repaid at any time for its principal ("insufficient funds" if cash is short).
  The most expensive bond is repaid first.
- **Ledger:** borrowing and repaying go to a new category, `financing`. It is not part of profit.

## Shares

- **Owners:** of the 100,000 shares, the player owns 40,000 (40%) and the public holds the rest.
- **Selling new shares:** 10,000 at a time, at 90% of the current price, with the money going to the
  company. The player's stake shrinks because there are more shares.
- **Buying back:** the company buys 10,000 public shares at 110% of the price, paid from company cash.
- **Dividends:** each year the player sets a dividend per share, paid at year end from company cash to every
  shareholder. It is booked as `financing` and is never paid when it would make cash negative.

## Bankruptcy

- At three month ends in a row with negative cash, the company goes bankrupt.
- From the first negative month end the player is warned, and can still issue bonds or sell shares to
  recover.

## Decided with the user (2026-11-21)

1. **Personal fortune:** yes. The player has personal cash, starting at $0, and gets dividends on their own
   shares.
   - They can buy company shares from the public, 1,000 at a time at the current price, with personal
     cash. They can also sell their shares to the public, 1,000 at a time at the current price.
   - **Net worth:** personal cash + the player's shares × the share price. It is the score for later win
     conditions.
2. **Bankruptcy restructures the company and play goes on.** At the third month end in a row with
   negative cash:
   - every bond's principal is halved;
   - the player's shares are halved, and the removed shares go to the public (the creditors);
   - company cash is set to $0;
   - the run of negative months starts again from zero.

   A warning comes at the first negative month end. Restructurings are counted.
3. **Dividends:** the player sets a yearly dividend per share, in cents ($0.00 by default).
   - It is paid at year end from company cash to every shareholder; the player's part goes to their
     personal cash.
   - It is skipped entirely, with a notice, when paying it would make company cash negative.

## Lead decisions while specifying (2026-11-21)

- **Ledger:** new categories `interest` (part of profit) and `financing` (bond money in and out, share
  sales and buybacks, dividends; not part of profit). `profit()` leaves `financing` out.
- **Operating profit:** the sum of the last 12 monthly operating results. Each month's result is the change
  in cargo income, goods sales, track maintenance, train running, building upkeep and interest over that
  month. Before 12 months have passed, the months so far count.
- **Asset value:**
  - each track line: half its build cost today (bridge segments at half the bridge price; double track
    counts twice);
  - each station: half its build price;
  - each station building: half its build cost;
  - each locomotive: its trade-in value;
  - each car: its resale value.
- **Share price:** rounded to whole cents and recomputed at every month end. Commands always use the price
  from the last month end; at the start of the game that is the starting price.
- **Lots:** share sales, buybacks and the player's share trades use lots of 1,000 or 10,000 shares as
  written above. A trade needs enough shares on the other side ("not enough shares") and enough cash
  ("insufficient funds", or "insufficient personal funds" for the player).
- **Repaying a bond** with nothing outstanding is rejected with "no bonds".
