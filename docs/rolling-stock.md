# M7 Rolling stock & cargo types: design

Status: draft by the lead after the user chose the six core types (2026-11-21). Numbers are first
guesses for balancing.

## Idea

Every kind of goods travels in the kind of car that suits it, as on real North American railways. A train
owns a number of cars of each type and couples a mix of them at each stop.

## Car types

| Car | Id | Carries | Capacity (units) | Price | On sale |
|---|---|---|---:|---:|---|
| Passenger coach | coach | passengers | 40 | $10,000 | 1850– |
| Mail & baggage car | baggage | mail | 30 | $10,000 | 1850– |
| Boxcar | boxcar | flour, loaves, furniture, grain | 20 | $8,000 | 1850– |
| Coal hopper | hopper | coal | 25 | $8,000 | 1850– |
| Flatcar | flatcar | timber, lumber | 20 | $7,000 | 1850– |
| Covered hopper | covered-hopper | grain | 35 | $12,000 | 1930– |

- **Running cost:** every car costs $200 a month, coupled or spare, as today.
- **Resale:** a car sold, retired or replaced is worth 50% of its price, as today.
- **Legacy types:** passenger cars from older saves become coaches. Freight cars from older saves become a
  legacy **freight car** that carries any freight (20 units). It can't be bought, but it keeps working and
  can be sold.
- **Loading:**
  - Each car type has its own capacity, shared by the goods it carries.
  - At a stop the train loads what is waiting, in today's order, into the coupled cars that can carry it,
    until those cars are full.
  - Goods no coupled car can carry stay where they are.
- **Mail** moves from passenger cars to mail & baggage cars. Passenger coaches carry only passengers.

## Trains, stop orders and commands

- **Owned and coupled:** a train owns a number of cars of each type and couples some or all of them. The
  locomotive's car limit counts all owned cars.
- **Buying a train** and **changing cars** name a count per type. A car type that is not yet on sale can't
  be bought ("car type not on sale"), and its cars count toward the car limit.
- **A stop order** names the coupled count per type, at most the number owned of each ("a stop order can
  use at most the train's N <type> cars"). Leaving a type out of the order couples none of it.
- **Retire, replace and the trade-in rules** use the owned cars per type. Replace keeps cars in this
  order: coaches, baggage, boxcars, hoppers, covered hoppers, flatcars, legacy freight. The last ones are
  sold first.

## UI notes

- **Buy and Cars sheets:** one stepper per car type that is on sale.
- **Route editor:** a stepper per owned type, plus "No cars".
- **Station sheet:** the waiting goods with the car type each needs.
- **Map:** a sprite per car type (6 new sprites, about 7.5 credits).

## Open questions

None yet. The type list and the order of the milestones were decided with the user on 2026-11-21.
