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
