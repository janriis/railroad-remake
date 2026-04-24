# Core Gameplay — Design Spec

**Date:** 2026-04-24
**Status:** Approved

## Goal

Implement the complete core gameplay loop: meaningful track building, car management tied to city supply and demand, per-stop route scheduling, locomotive tonnage limits, maintenance costs, and a configurable loading policy per route.

---

## 1. Economy System

### Model

Supply and demand with inventory. Each city has a demand level (0–100) per good type it consumes. Demand rises over time as cities keep consuming. Delivering a matching car type at a stop reduces that city's demand proportionally. Revenue scales with demand level — underserved cities pay more, saturated ones pay little.

### City data additions (`cities.js`)

Each city entry gains two fields:

```js
produces: CarType[],  // goods this city generates (train picks up here)
demands:  CarType[],  // goods this city consumes and pays for (train delivers here)
```

### Good types (`src/data/goods.js` — new file)

Five types only:

| ID | Label | Base rate (full demand) | Car weight |
|---|---|---|---|
| `passenger` | 🚂 Passenger | $1,200 | 8 t |
| `mail` | ✉ Mail | $900 | 4 t |
| `freight` | 📦 Freight | $800 | 14 t |
| `coal` | ⛏ Coal | $700 | 16 t |
| `cattle` | 🐄 Cattle | $1,000 | 12 t |

### Revenue formula

When a train departs a city stop, for each car of type T assigned to that stop:

```
revenue += BASE_RATE[T] × (demandLevel / 100)
```

`demandLevel` is read at departure time. If the city does not demand type T, no revenue is earned for that car on this stop.

### Demand recovery

Each game tick (one tick = one animation frame's revenue interval, same cadence as the existing `tickRevenue` call), every city's demand for each of its listed good types rises by `DEMAND_RECOVERY_RATE = 2`. Demand is capped at 100. A city at 0 demand recovers to full in ~50 ticks without deliveries.

### City Detail Panel update

The existing panel gains two new sections below "Rail Connections":

- **Produces** — pills listing good types this city generates
- **Demand** — horizontal bars (0–100) for each good type the city demands, coloured by level: red ≥ 80 (high), gold 40–79 (medium), grey < 40 (low)

---

## 2. Route Scheduler Redesign

### Screen layout — three columns

**Column 1 — Route list (existing, ~200 px wide)**
Lists all routes with name, stop summary, status badge, and revenue/tick. "New Route" and "Return to Map" buttons at bottom. Unchanged from current.

**Column 2 — Stop timeline (~200 px wide)**
Vertical tape of stops for the selected route. Each stop shows:
- City name
- Car consist assigned at this stop (pill badges)
- If consist is unchanged from previous stop, shows "← same consist" in muted italic
- Stops with a car change glow gold and show a "✦ change" marker

At the bottom of the column:
- **Loading Policy toggle** — Express / Full Load (segmented button)
- **Max wait** — number input, visible only when Full Load is selected (default 2 days)

Clicking a stop selects it and updates Column 3.

**Column 3 — Demand + car editor (flex-1)**
Header shows the selected city name.

Top: **Locomotive capacity bar** — loco name, maxTons, current load, free tonnage. Bar fills green → amber → red as load approaches capacity.

Middle: **Assigned cars** — grid of car tiles for the selected stop. Each tile shows the good type emoji, label, and weight. A "+" tile opens a picker to add a car (only types that fit within remaining tonnage are selectable). Clicking an existing car tile removes it.

Bottom: **City demand bars** — demand level for each good type this city demands. Coloured by level. Non-demanded types are not shown.

A maintenance warning strip shows the current maintenance cost per tick and a delta preview when adding/removing a car.

### New Route flow

Unchanged from current (select stops, assign locomotive, dispatch) except the route is created with a default schedule: all stops inherit the same initial consist (one passenger + one mail car), loading policy defaults to Express.

### Route editing

Car changes can be queued at any time while a route is running. The `schedule` map on the route holds per-stop overrides. Changes take effect the next time the train arrives at that stop.

---

## 3. Car Management

### Consist per stop

Each route stores a `schedule` field:

```js
schedule: {
  [stopIndex: number]: CarType[]
}
```

Stops not present in `schedule` inherit the nearest preceding stop's consist. Stop 0 must always be explicitly set (the initial consist).

### Constraints

- Total weight of assigned cars must not exceed the locomotive's `maxTons`.
- Cars are free — no purchase cost.
- More cars = higher maintenance cost (see Section 5).

### Car change timing

The player may edit the schedule at any time. The new consist is applied the next time the train departs that stop. There is no need to suspend the route to change cars.

---

## 4. Loading Policy

Configurable per route. Two modes:

**Express** — train arrives at a stop, loads whatever goods are available at that moment (up to car capacity), and departs immediately. `waitingAt` is set briefly then cleared.

**Full Load** — train waits at the stop until all cars are loaded to capacity, or `maxWaitDays` elapses (whichever comes first), then departs with whatever it has.

`maxWaitDays` defaults to 2 and is editable in Column 2 of the Route Scheduler. This prevents trains getting stranded at low-production towns.

---

## 5. Locomotive Tonnage & Maintenance

### Tonnage values (`locomotives.js` additions)

| Locomotive | `maxTons` | `maintenanceBase` |
|---|---|---|
| 0-4-0 Grasshopper | 24 t | $40/tick |
| 4-4-0 American | 36 t | $80/tick |
| 2-6-0 Mogul | 56 t | $120/tick |
| 4-6-0 Ten-Wheeler | 64 t | $140/tick |
| 2-8-0 Consolidation | 80 t | $160/tick |
| 4-4-2 Atlantic | 44 t | $100/tick |

### Maintenance formula

```
maintenanceCost = maintenanceBase + (totalCarTons × TONS_RATE)
```

`TONS_RATE = 12` (dollars per ton of cars per tick). Maintenance is deducted from revenue each tick for running routes. A suspended route pays no maintenance.

**Example:** American ($80 base) + 3 cars (20 t total) × $12 = **$320/tick**.

---

## 6. Track Building UX

The Track Laying screen remains reachable from the dock (for the network summary view), but track is now laid directly from the map:

1. Click a city → City Detail Panel opens
2. Click **"⚒ Lay Track From Here"** → city glows gold, panel enters track-laying mode
3. Hover another city → dashed cost-preview arc appears with live price label
4. Click target city → confirm button appears: **"⚒ Break Ground — $X,XXX"**
5. Click confirm → track built, cash deducted, arc turns solid gold, mode exits
6. Escape or click empty map → cancel

The city panel shows an error state if funds are insufficient. Duplicate tracks are silently prevented.

---

## 7. Game Store Changes

### New state fields

| Field | Type | Purpose |
|---|---|---|
| `cityDemand` | `{ [cityId]: { [goodType]: number } }` | Live demand levels 0–100 |
| `route.schedule` | `{ [stopIndex]: CarType[] }` | Per-stop car consist overrides |
| `route.loadingPolicy` | `'express' \| 'fullLoad'` | Loading behaviour |
| `route.maxWaitDays` | `number` | Full Load timeout |
| `train.waitingAt` | `cityId \| null` | City where train is currently loading |

### New actions

| Action | Signature | Description |
|---|---|---|
| `setStopCars` | `(routeId, stopIndex, cars[])` | Set car consist for a stop |
| `setLoadingPolicy` | `(routeId, policy, maxWaitDays?)` | Update loading policy |
| `tickDemand` | `()` | Nudge all city demand levels upward by recovery rate |
| `settleStop` | `(routeId, stopIndex)` | Deliver cars, reduce demand, earn revenue, deduct maintenance |
| `resumeRoute` | `(routeId)` | Re-activate a suspended route |

### Existing revenue action

`tickRevenue()` is replaced by `settleStop()`. The flat `revenuePerTick` field on routes is removed; revenue is now computed dynamically by `settleStop`.

---

## 8. Out of Scope

- Year/month time advancement
- Net worth recalculation
- Rival AI behaviour
- Buying or acquiring rival/neutral track
- More than 5 good types
