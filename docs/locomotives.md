# Eras and locomotives: design

Status: milestone M6; decisions below agreed with the user 2026-11-21. All names and numbers are original first guesses for balancing.

## Idea

The game runs through eras. Each locomotive model is on sale for a window of years, then retires from
sale. Locomotives age: they cost more to run each year and, once past their working life, they break
down more often. The player replaces a worn locomotive with a newer model, keeping the train's cars and
route.

## Models (original designs)

| Model | On sale | Speed (tiles/day) | Max cars | Price | Running / month | Working life |
|---|---|---:|---:|---:|---:|---:|
| Pioneer (light steam) | 1850–1885 | 4 | 4 | $50,000 | $2,000 | 20 years |
| Ironside (heavy steam) | 1870–1910 | 5 | 6 | $80,000 | $2,600 | 25 years |
| Courier (express steam) | 1895–1940 | 7 | 6 | $120,000 | $3,400 | 25 years |
| Hauler (freight steam) | 1900–1945 | 5 | 8 | $110,000 | $3,200 | 30 years |
| Pathfinder (diesel) | 1935– | 8 | 8 | $180,000 | $3,800 | 30 years |

- Today's single locomotive becomes the Pioneer; existing saves map to it.
- Buying offers only models on sale in the current year. Trains already running keep their model.

## Wear

- **Age:** counted from the purchase date.
- **Running cost:** rises 3% for every year of age, compounded and charged at month end like today.
- **Breakdowns:** within its working life a locomotive breaks down rarely, at 1% a month. After its
  working life the chance grows by 2 points per extra year.
  - A breakdown stops the train where it is for 3 days.
  - It costs 5% of the model's price in repairs.
  - The rolls use the game's seeded `Rng`, so the same game always plays out the same way.
- **Overhaul:** at a station, an overhaul costs 30% of the model's price. It sets the age back to 0, but
  only for a model that is still on sale.

## Replacement

- **Command:** replace a train's locomotive at a station with any model on sale. You pay the new price
  minus a trade-in for the old locomotive, worth 50% of its price falling to 10% at the end of its working
  life.
- **What stays:** cars, route, stop orders and cargo stay.
- **Too many cars:** if the new model can pull fewer cars than the train has, the extras are sold at the
  usual car resale rate. The player sees this before confirming.

## UI notes

- Train sheet: model, age, condition (working life left), running cost now, and a Replace button.
- A "Worn out" status chip once past working life. A toast when a train breaks down.

## Decided (2026-11-21)

1. Breakdowns stop the train where it is for 3 days (it can block single track).
2. Only locomotives age; cars don't.
3. New games always start in 1850 (no era choice).

## Lead decisions while specifying (2026-11-21)

- **On sale:** a model is on sale when `from <= year` and (no `to`, or `year <= to`), using the game date.
- **Car limit:** the model's max cars replaces today's fixed limit of 6 when buying a train or changing
  cars. Trains from older saves become Pioneers and keep any extra cars until their cars are changed.
- **Age** is in whole years since purchase (360-day years): `floor(days since purchase / 360)`.
- **Running cost** of a locomotive each month is `round(base × 1.03^age)` in whole dollars, booked under
  train running as today. Cars cost as today.
- **Breakdowns** are rolled once per train at every month end with the game's seeded `Rng`.
  - Chance: 1% while `age < working life`, then `1% + 2% × (age − working life)` (so 1% in the first year
    past it, 3% the next, and so on).
  - A broken-down train stops where it is: it keeps holding its tile or segment, so other trains wait
    behind it. It starts moving again 3 days (72 hours) later.
  - Repairs cost 5% of the model's price and are booked under train running.
  - Scenarios force the roll with a fixture ("breakdowns always happen" / "never happen") instead of
    relying on the random numbers.
- **Overhaul** works only for a train standing at a station. It costs 30% of the model's price, booked as
  rolling stock, and sets the age to 0. Rejections: "train must be at a station", "model no longer on
  sale".
- **Replacement** also works only at a station. It costs the new model's price minus the trade-in value,
  booked as rolling stock.
  - Trade-in: `round(price × (0.5 − 0.4 × min(1, age / working life)))`, so 50% when new and 10% from the
    end of its working life.
  - If the new model can pull fewer cars, the train keeps passenger cars first and the extras are sold at
    the car resale rate.
  - The new locomotive's age starts at 0 and the train's speed changes to the new model's.
  - Rejections: "train must be at a station", "model not on sale", "insufficient funds".
- **Buying:** a train can only be bought with a model on sale ("model not on sale").
- **Saved state:** model, purchase time and broken-down-until time.
