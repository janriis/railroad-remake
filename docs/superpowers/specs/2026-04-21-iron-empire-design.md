# Iron Empire — MVP Design Spec

_Date: 2026-04-21_

---

## Overview

Iron Empire is a Railroad Tycoon 2-style management game set in the American West, 1875. The player runs a railroad company: laying track between cities, buying locomotives from a period catalog, defining freight/passenger routes, and watching revenue accumulate in real time.

The MVP delivers a fully playable core loop: lay track → buy locomotive → assign route → earn revenue. All four screens from the Claude Design prototype are implemented. Visual fidelity matches the prototype exactly (mahogany/brass Victorian aesthetic, parchment SVG map).

---

## Tech Stack

- **Vite + React** (no TypeScript for MVP)
- **Zustand** for all game state and actions
- **Plain CSS** — exact copy of prototype `styles.css`
- No backend, no persistence — in-memory only for MVP

---

## File Structure

```
src/
  data/
    cities.js          ← 26 cities, 26 initial tracks, locomotive catalog, news headlines
  utils/
    geometry.js        ← curvyPath, bezierAt (ported from prototype)
  store/
    gameStore.js       ← Zustand store: all game state + actions
  components/
    chrome/            ← TitleBar, Panel, Filigree, Ticker, StatDisplay, Rivets, Plaque
    map/               ← MapView (SVG), TrackLayingOverlay
    hud/               ← CompanyPanel, FleetPanel, TrainDetailPanel, CityDetailPanel
    screens/           ← MapScreen, DepotScreen, RouteSchedulerScreen
    icons/             ← LocomotiveIcon, CarIcon, CityVignette, BigLocomotiveEngraving
  styles.css
  App.jsx
  main.jsx
```

---

## Game State (Zustand Store)

### Shape

```js
{
  // Company financials
  cash: 428_650,
  netWorth: 2_840_000,
  year: 1875,
  month: 'April',

  // World state
  tracks: [{ a: cityId, b: cityId, owner: 'player'|'rival'|'neutral' }],
  ownedLocomotives: [],    // { uid, catalogId, name, color, assignedRouteId: null }
  routes: [],              // { id, name, stops: [cityId], locomotiveUid, status, revenuePerTick }

  // UI state
  screen: 'map',           // 'map' | 'depot' | 'route'
  selectedCityId: null,
  focusTrainId: null,
  trackLayingFrom: null,   // cityId when mid-lay, null otherwise
}
```

### Actions

| Action | Effect |
|--------|--------|
| `layTrack(fromId, toId)` | Validates: funds sufficient, track not already present. Deducts cost, appends `{ a, b, owner:'player' }` to tracks. |
| `buyLocomotive(catalogId)` | Validates: loco is available (era), funds sufficient. Deducts price, appends to `ownedLocomotives` with a unique uid. |
| `createRoute(stops, locomotiveUid)` | Validates: consecutive stops connected by any owned track. Sets route status to `'running'`, marks loco as assigned. Sets `revenuePerTick = stops.length × 800`. |
| `assignLocomotive(routeId, locoUid)` | Wires a previously idle loco to an existing draft route. |
| `tickRevenue()` | Called every 2 real-time seconds. Adds `revenuePerTick` to `cash` for each running route. |
| `navigate(screen)` | Sets `screen`. |
| `selectCity(id)` | Sets `selectedCityId`. |
| `selectTrain(id)` | Sets `focusTrainId`. |
| `startTrackLaying(fromId)` | Sets `trackLayingFrom`. |
| `cancelTrackLaying()` | Clears `trackLayingFrom`. |

### Revenue formula

`revenuePerTick = stops.length × $800`, credited every 2 real-time seconds per running route.

No cargo simulation for MVP — route length drives income.

### Track cost formula

`cost = Math.round(pixelDistance(fromCity, toCity) × 0.14) × 28_500`

Matches the prototype surveyor's calculation.

---

## Screens

### Map Room (hero screen — fully interactive)

- SVG map: parchment paper, terrain, rivers, coastlines, compass rose — exact prototype rendering
- 26 city dots (metro/city/town sizing), clickable → opens CityDetailPanel on right rail
- Tracks rendered as curved paths: red (player), green (rival), dark (neutral)
- Trains animate along bezier curves using `requestAnimationFrame`; clicking a train opens TrainDetailPanel
- HUD panels overlay (left rail: CompanyPanel + FleetPanel; right rail: TrainDetailPanel or CityDetailPanel)
- Bottom action dock: Lay Track / Locomotive Works / Dispatch / Play-Pause-Fast (time controls are visual only for MVP)
- Telegraph Ticker scrolls along the bottom

**Track laying mode (triggered from dock button or CityDetailPanel):**
1. `startTrackLaying(cityId)` — map enters laying mode
2. All cities pulse gold; non-reachable cities dim to 40% opacity
3. User clicks a second city → preview arc (dashed gold, `.track-preview` CSS) appears
4. Floating cost bar at bottom: "Denver → Kansas City · 372 mi · $14.8M · Break Ground / Cancel"
5. "Break Ground" → `layTrack` → new red arc drawn, mode exits
6. Insufficient funds → button disabled, label reads "Insufficient funds"
7. Escape key or "Cancel" → `cancelTrackLaying()`

### Locomotive Works (static → interactive)

- Left panel: Baldwin catalog list — all 5 locos from prototype
- Right panel: selected loco detail with big engraving, specs grid
- Era-locked locos (Atlantic, era 1888) grayed out, "Place Order" disabled
- "Place Order" → `buyLocomotive(catalogId)` → cash deducted, loco appears in Fleet Register as "Idle"
- Quantity input works (multiplies price, buys N locos)

### Dispatch Office (static → interactive)

- Left panel: route list (running routes + "+ New Route" button)
- "+ New Route" → opens a route builder panel within the Dispatch screen:
  - City stop picker: dropdown list of cities, filtered to those reachable via player-owned track from the previously selected stop
  - User adds stops one at a time via the picker; stops appear in the schedule tape
  - Route name auto-generated ("Route #N") or user-editable
  - Assign locomotive from dropdown (shows idle locos only)
  - "Dispatch" → `createRoute(stops, locoUid)` → route becomes running, loco animates
- Running routes show live revenue/expenses/profit (revenue from store, expenses static for MVP)
- "Suspend" pauses a route (sets status to `'suspended'`, stops revenue ticks)

### Track Laying Screen

Retained as a visual reference/detail view (zoomed map of a selected region). Not used for actual track placement in MVP — track laying happens directly on the Map Room. "Return to Map" navigates back.

---

## Train Animation

- All player-created routes animate a train along their stops using the same `requestAnimationFrame` loop as the prototype
- New trains get a color from a fixed palette (6 colors cycling)
- Trains follow the bezier path for each consecutive stop pair, looping
- Smoke puff rendering matches prototype

---

## Out of Scope (MVP)

- Cargo types / supply chains
- Game clock advancing (years/seasons)
- Rival AI
- Terrain cost modifiers (bridges, tunnels add cost)
- Bankruptcy / win condition
- Save / load
- Map pan / zoom
- Sound

---

## Initial Game State

Player starts with:
- $428,650 cash
- The prototype's existing track network (transcontinental + major eastern lines, owned as `player`)
- 0 owned locomotives
- 0 active routes
- Net worth: $2,840,000 (tracks and land value)
