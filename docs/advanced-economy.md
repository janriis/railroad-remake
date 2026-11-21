# M5 Advanced economy: design

Status: rules agreed with the user 2026-11-21. Numbers are first guesses for balancing; they live in
`src/sim/config.ts` once implemented and are listed in `features/BACKLOG-ASSUMPTIONS.md`.

## Idea

Raw materials come from **deposits** out in the country. Goods are made in **station buildings** the
player builds inside stations that serve a town. The town around the station buys what the buildings
make. Railways earn twice: freight pay for hauling, and the profit of their own buildings.

## Deposits (placed by map generation, not built)

| Deposit | Terrain | Produces per month |
|---|---|---|
| Coal mine | hills or mountain | 40 coal |
| Timber camp | forest | 40 timber |
| Grain farm | plains | 60 grain |

- Timber camps and grain farms are today's primary industries, now counted as deposits; coal mines are new.
  Map generation places each deposit kind as often as it places them today (one per 2,048 tiles).
- Deposits produce forever (no reserves). They work like today's primary industries: stock waits at the deposit and any station covering it can
  load it. Stock is capped at 6 months of production; anything beyond that is lost.
- Map generation stops placing sawmills, flour mills, furniture works and bakeries. Saves that already
  have them keep them working as before (legacy industries).

## Station buildings (built by the player)

| Building | Takes | Makes | Ratio | Build cost | Upkeep / month |
|---|---|---|---|---:|---:|
| Sawmill | timber | lumber | 2 → 1 | $30,000 | $1,000 |
| Furniture works | lumber | furniture | 2 → 1 | $45,000 | $1,500 |
| Flour mill | grain | flour | 3 → 2 | $30,000 | $1,000 |
| Bakery | flour | loaves | 1 → 2 | $20,000 | $800 |
| Coal yard | coal | (sells coal) | 1 → 1 | $10,000 | $300 |

- **Command:** build a building at a station (`buildStationBuilding(station, kind)`), and demolish it for
  25% back.
- **Where:** only in a station whose catchment covers a town (at least some of it). The number of building
  slots goes by station size: small 1, medium 2, large 3. Each kind at most once per station.
- **Input:** cargo a train unloads at that station goes into the building's input when the building takes
  it. The freight pay for the haul is paid as now.
- **Month end:** a building turns its input into output by its ratio (leftovers wait). Output first goes to
  the town's demand (sold), and the rest becomes cargo waiting at the station for trains to take elsewhere.
- **Upkeep:** charged every month end, even when idle.
- **Ledger:** new categories `goodsSales` (income from every sale to a town, from a building or a direct
  delivery) and `buildingUpkeep`; building purchases and demolish refunds count as `construction`.

## Town demand

- A town wants goods every month in proportion to its population. Per 1,000 inhabitants:
  - loaves 40
  - furniture 5
  - coal 20
  - lumber 10
- **Sale price per unit:**
  - loaves $60
  - furniture $400
  - coal $40
  - lumber $90
  - flour $50 (sold only if a town wants it; towns don't want flour by default)
- Goods are sold at full price up to the month's demand. Above that the town buys at half price, and
  above twice the demand it buys nothing; the rest waits at the station.
- **Growth:** a town that was sold at least half of its yearly bread demand at full price grows 5 points more
  that year (added to the passenger growth rate: 10% + 5% = 15%).

## Direct sales

Loaves, furniture, coal and lumber also sell when a train delivers them to any station that serves a
town, without a building there: the town buys them at its demand price under the same saturation rule.
Freight pay is paid as well.

## Lead decisions while specifying (2026-11-21)

- Coal pays $4 per unit per tile as freight.
- Order at month end: buildings convert, then sell to the town (full price, then half price), then upkeep;
  what the town won't buy waits at the station as cargo.
- A station accepts a cargo if a building there takes it, a covered industry takes it, or it is a
  direct-sale good and the station serves a town. Anything else stays on the train.
- Rejections: "station serves no town", "no free building slot", "station already has a <kind>".

## Decided with the user (2026-11-21)

1. Deposits produce forever.
2. Direct sales at any town station: yes (above).
3. Ore and steel: later, with eras and locomotive tech (M7), not in M5.
