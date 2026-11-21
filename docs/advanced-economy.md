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
| Timber forest | forest | 40 timber |
| Grain fields | plains | 60 grain |

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
- **Ledger:** new categories `buildingSales` (income) and `buildingUpkeep`; building purchases count as
  `construction`.

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
- **Growth:** a town whose bread demand was met that year grows 5% on top of the passenger growth rule.

## Direct sales

Loaves, furniture, coal and lumber also sell when a train delivers them to any station that serves a
town, without a building there: the town buys them at its demand price under the same saturation rule.
Freight pay is paid as well.

## Decided (2026-11-21)

1. Deposits produce forever.
2. Direct sales at any town station: yes (above).
3. Ore and steel: later, with eras and locomotive tech (M7), not in M5.
