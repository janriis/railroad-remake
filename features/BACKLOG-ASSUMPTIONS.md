# Backlog assumptions (invented balancing numbers)

For lead review. Costs use the existing base: plains segment $10,000, forest $15,000, hills $25,000,
mountain $60,000, diagonal x1.5.

## m1-track/bridges.feature

- Bridge segment cost: $30,000 per segment, regardless of terrain.
- Maximum bridge span: 3 water tiles in a row (4 segments). Rejections: "bridge too long", "bridge must start and end on land".

## m1-track/demolish-track.feature

- Demolish refund: 25% of the current build cost of each segment (plains $2,500, forest $3,750, hills $6,250, mountain $15,000, bridge segment $7,500).
- Errors: "no track to demolish", "station on track", "train on track".

## m1-track/map-generation.feature

- Test map size 64x64; town count 4; towns stand on plains; towns at least 10 tiles apart.
- At least 60% of tiles are plains/forest/hills.

## m2-trains/stations.feature

- Station price: small $5,000, medium $15,000, large $40,000 (catchment radius 1/2/3 from the brief).
- Catchment shape: Chebyshev (square) distance. (8,7) is in a radius-2 catchment of (6,5); (9,5) is not.
- Errors: "station must be on track", "tile already has a station".

## m2-trains/buy-train.feature

- Locomotive $50,000; passenger car $10,000; freight car $8,000; max 6 cars per train.
- Errors: "too many cars", "train must start at a station", "cars need a locomotive".

## m2-trains/routes.feature

- Route needs at least 2 stops; consecutive stops must differ.
- Errors: "stop is not a station", "route needs at least two stops", "no track connects (A) and (B)", "consecutive stops must differ".

## m2-trains/train-movement.feature

- Locomotive speed: 4 tiles per day (orthogonal); diagonal step = 1.5 tiles. Train turns around at the end of its route.

## m2-trains/block-signalling.feature

- Block = one track segment, max one train. A "slow train" fixture exists (speed not specified, only "slower than normal").
- Passing loop lets opposing trains pass; head-on trains on single track deadlock (see open questions).

## m3-economy/towns-and-passengers.feature

- Passengers: 1 per 10 inhabitants per month; mail: 1 bag per 50 inhabitants per month.
- Partial catchment coverage serves a proportional share (50% in the example).
- Growth: +10% per year when at least half the passengers were carried away.

## m3-economy/industries.feature

- Timber camp 40 timber/month; sawmill 2 timber -> 1 lumber; furniture works 2 lumber -> 1 furniture.
- Grain farm 60 grain/month; flour mill 3 grain -> 2 flour; bakery 1 flour -> 2 loaves.
- Processing happens at month end from input received that month.

## m3-economy/cargo-delivery-revenue.feature

- Rates per unit per tile: passengers $5, mail $8, timber $3, lumber $6, furniture $12, grain $3, flour $5, loaves $9.
- Distance = Manhattan distance between stations.
- Time factor: 100% up to 20 days, -2 percentage points per extra day, floor 50%.

## m3-economy/running-costs.feature

- Track maintenance $100 per segment per month; locomotive $2,000 per month; car $200 per month.
- Month = 30 days, charged at month end. Cash may go negative (company in debt).

## m3-economy/yearly-ledger.feature

- Start date 1 January 1850; year = 12 months x 30 days = 360 days.
- Ledger categories: cargo income, construction expenses, running costs, profit/loss.

## Decided while implementing M3 (lead)

- Town footprint: 5x5 tiles around the centre; the inner 3x3 holds half the people, the outer ring the
  other half (so a small station on the centre serves 50%). A town tile inside several catchments counts
  for the station built first.
- Town populations on generated maps: 400–3,000, rolled after town placement.
- Industries keep their output in stock at the industry; any station covering it can load it. Each kind
  appears once per 2,048 map tiles (2 each on 64x64), at least 4 tiles from towns and other industries;
  timber camps on forest, the rest on plains.
- Car capacity: passenger car 40 units (passengers and mail share it), freight car 20 units of any freight.
- A stop unloads cargo the station accepts (towns accept passengers/mail; industries their input), then
  applies the car order, then loads. Cargo that no longer fits after removing cars is lost.
- Profit counts construction and rolling-stock spending as expenses (no depreciation yet).
- Double track: costs today's segment price again (bridge segment $30,000); twice the maintenance; demolish
  refunds both lines.
- Section signalling: stations, plain double-line tiles and junctions (3+ segments) are passing places.

## m5-advanced-economy

Assumptions the design (docs/advanced-economy.md) does not state. Error strings are placeholders until the
sim exists.

- "Serves a town" = the station catchment covers at least one town tile (the existing 5x5 footprint rule).
  A town tile in several catchments counts for the station built first, so a later station may serve no town.
- Town demand uses the town's whole population, regardless of how much of the town the station covers.
- Rounding: no rounding is needed for the specified numbers (half prices $30, $200, $20, $45, $25 are whole).
  Conversion is `floor(input / in) x out`; leftover input stays in the building and carries over to the next month.
- Saturation bands are measured in units: full price for units 1..D, half price for units D+1..2D, nothing
  above 2D. The unsold rest waits at the station as cargo (for buildings) or stays at the station (direct sales).
- "Output goes to the town first" follows the same saturation rule, including the half-price band, before any
  surplus becomes station cargo.
- Month-end order: convert input, sell output to demand, charge upkeep. Demand renews at month end after that.
- A coal yard sells the coal it takes to the town under the same saturation rule (demand 20 coal per 1,000);
  coal beyond 2x demand waits as coal cargo at the station.
- Rejections: "station serves no town", "no free building slot", "station already has a <kind>", plus the
  existing "not a station" and "insufficient funds". Rejected commands spend nothing.
- Demolishing a building refunds 25% of its build cost as cash; the ledger category of the refund is not specified
  and not tested here.
- Slots: slots are counted from the number of buildings; demolishing frees the slot.
- Deposit stock cap = 6 x monthly production (coal 240, timber 240, grain 360). A station covering a deposit
  loads from the deposit's stock the same way it loads from today's primary industries.
- Generated maps contain at least one of each deposit kind (count rule not in the design); the existing
  timber camp / grain farm rule is untouched by these scenarios.
- Legacy processing industries (sawmill etc. in old saves) are not station buildings: no upkeep, no town sale.
- Bread growth: demand is "met" in a month when at least the full-price demand (40 loaves per 1,000) was sold;
  the town grows 5% if that held in at least half of the year's months. Bread growth is added to the
  passenger growth in percentage points on the starting population (10% + 5% = 15%).
- Direct sales to a station that serves no town buy nothing; the delivered goods wait at the station.
- Freight pay for a direct-sale delivery is computed as today and paid in addition to the sale.
- Coal needs a freight rate per unit per tile (not in the design); no scenario depends on it.
