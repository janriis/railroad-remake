# RailroadSim — Project Plan

An **original** railroad-building and management sim in the genre popularised by classic railroad tycoon
games. We borrow the genre's mechanics (lay track, run trains, haul cargo, grow a company) but use our
own names, art, maps, scenarios and UI. No names, art, music, levels or look from existing titles.

## 1. Goals

- Browser-playable 2D game (top-down / light 2.5D) built with TypeScript.
- A **deterministic, headless simulation core**, so every rule can be specified and tested with BDD
  scenarios without a renderer.
- Graphics made with Higgsfield, with a tracked credit budget (see §6).

## 2. Architecture

```
src/
  sim/      Pure, deterministic game rules. No DOM, no timers, no Math.random.
            map, terrain, track network, stations, trains, cargo, economy, finance, calendar
  game/     (later) Command layer / facade used by both the UI and the BDD steps
  ui/       Canvas 2D renderer and touch UI. Reads sim state, changes it only through Game commands
  ui/       HUD, panels, build tools (DOM)
  assets/   Generated art (Higgsfield) + manifest
features/   Gherkin specs + step definitions + World (the BDD test harness)
tests/      Vitest unit tests for algorithms (pathfinding, RNG, pricing curves)
e2e/        (M4+) Playwright UI smoke tests
```

Key rules:
- **One way in:** all state changes go through `Game` commands (`buildTrack`, `buildStation`, `buyTrain`,
  `advanceDays`, …) that return a `CommandResult` (`{ok:true,cost}` / `{ok:false,error}`). Commands
  are atomic: a rejected command changes nothing.
- **Determinism:** seeded RNG (`mulberry32`), fixed-step ticks (1 tick = 1 game hour). Same seed and same
  commands give the same game. This also makes save/load and replays cheap.
- The renderer and UI subscribe to state; they hold no rules.

Stack: TypeScript 5, Vite, Canvas 2D (PixiJS dropped 2026-11-21: the canvas renderer copes and sprites draw fine with it), cucumber-js + tsx (BDD), Vitest (unit), Playwright (UI smoke).

## 3. BDD setup and test harness

| Layer | Tool | What it covers | Speed |
|---|---|---|---|
| Domain specs | `@cucumber/cucumber` (features/) | Game rules, written in Gherkin by milestone | ms per scenario |
| Unit | Vitest (tests/) | Algorithms, pure functions | ms |
| UI smoke | Playwright (e2e/, from M4) | Build tools work, a train runs on screen | seconds |

- **World** (`features/support/world.ts`): holds one `Game` per scenario, the last `CommandResult` and a
  cash snapshot. A fresh World per scenario means no shared state.
- **Parameter types** (`features/support/parameter-types.ts`): `{coord}` → `(3, 4)`,
  `{money}` → `$1,250,000`, `{terrain}` → `plains|forest|hills|mountain|water`.
- **Fixture steps** (`Given …`) build state directly without charging money, e.g. `Given existing track
  from (2, 2) to (4, 2)`. **Action steps** (`When …`) always go through real commands.
- **Tags:** `@m1`…`@m7` mark milestones. `@wip` marks specs not implemented yet; the default profile
  excludes them and `npm run test:wip` runs them. Strict mode: an undefined or pending step fails the run.
- Reports go to `reports/cucumber.html`.
- **Definition of done** for every feature: Gherkin scenario(s) written first and agreed, then implemented
  until they pass, plus unit tests for any non-trivial algorithm. CI runs `typecheck`, `test:unit` and
  `test:bdd`.

Commands:
```
npm run test:bdd    # all non-@wip scenarios
npm run test:wip    # only @wip scenarios (the backlog)
npm run test:unit   # vitest
npm test            # typecheck + unit + bdd
```

## 4. Milestones

| # | Milestone | Scope (each item gets its own .feature file) |
|---|---|---|
| M0 | Foundation | Repo, harness, CI, credit ledger, first walking skeleton (build track) |
| M1 | Map & track | Terrain build costs, diagonals, rejections, bridges, demolish track, map generator (seeded). **Done**, plus an early touch UI (Canvas 2D, procedural art) published as a private claude.ai page for on-the-go testing |
| M2 | Stations & trains | Station sizes + catchment radius, buy locomotive + cars, route with stops, shortest-path routing over track, movement over time, block signalling with passing loops and deadlock detection, **route planner** (cheapest route between two places; bridges need the player's confirmation). **Done**, playable on the phone page |
| M3 | Cargo & economy | Cities (passengers, mail), original industry chains (e.g. timber→sawmill→furniture), supply/demand, payment by distance and transit time, running and maintenance costs, monthly/yearly ledger. Also: double track with section signalling, one-off trips to any station, 45-degree track geometry. **Done** |
| M4 | Rendering & UI | Canvas map, camera pan/zoom, build tools, train/station panels, Higgsfield assets in place, Playwright smoke. **Art direction (2026-11-21): flat vector**, top-down terrain/vehicles with buildings in a slight ¾ view; reference `assets/style-test/flat.jpg` |
| M5 | Advanced economy | **Done.** Raw-material deposits outside towns (coal, timber, grain, ore); processing buildings the player builds inside stations (bakery, sawmill, flour mill, …); town demand with saturation; building profit and upkeep in the ledger. Design: [advanced-economy.md](advanced-economy.md) |
| M6 | Eras & locomotives | **Done.** Real North American locomotive types (4-4-0 American to road-switcher diesels) on sale for a window of years, ageing (rising running cost, breakdowns that stop the train for 3 days past working life), overhaul and replace with trade-in; only locomotives age. Design: [locomotives.md](locomotives.md) |
| M7 | Rolling stock & cargo types | **Done.** Real North American car types, each carrying certain goods (passenger coach, mail & baggage car, boxcar, coal hopper, flatcar, covered hopper from 1930); per-type stop orders, capacity and prices; old freight cars kept as a legacy type. Design: [rolling-stock.md](rolling-stock.md) |
| M8 | Finance | **Done.** Bonds with credit-based rates, shares (issue, buy back, player trades), share price from equity and earnings, yearly dividends, personal fortune / net worth, bankruptcy restructuring. Design: [finance.md](finance.md) |
| M9 | Rivals & progression | AI railroads, ore/steel and later tech unlocks, scenarios with win conditions, save/load |
| M10 | Polish | Audio, balancing pass, performance, tutorial |

M1–M3 are pure simulation, all driven by BDD. M4 brings visuals. This order gives a playable headless
game early and keeps the expensive art for when the needs are known.

## 5. Work split: Opus vs Sonnet 5.5 subagents

| Opus (lead) | Sonnet 5.5 subagents |
|---|---|
| Architecture, sim core algorithms (pathfinding, train movement, economy model, finance) | Gherkin scenario drafts from milestone specs |
| World/harness design, step-definition conventions | Step-definition boilerplate for agreed scenarios |
| Reviewing subagent output before merge | Tooling: lint, format, CI workflow, scripts |
| Art direction, Higgsfield prompts, credit decisions | UI panels/HUD from specs, asset pipeline scripts (slice, resize, atlas) |
| Balancing decisions | Docs, README, changelog |

Subagents get a narrow brief (files to touch, conventions, acceptance = which command must pass), and
their output is reviewed before it is committed.

## 6. Graphics with Higgsfield + credit tracking

- **Starting balance:** 360.75 credits (starter plan), checked 2026-11-21.
- **Ledger:** `docs/higgsfield-credits.md`. Every generation gets a row: date, asset, model, cost estimate,
  balance before and after. The balance is re-read from the account after each batch.
- **Before each batch:** run `higgsfield generate cost …` to estimate, then check that the batch fits its
  budget envelope. Batches over 30 credits need your OK first.
- **Order:** (1) a style-test sheet with a few cheap variations to lock the art direction, (2) tileable
  terrain textures, (3) track/station/industry sprites, (4) locomotives per era, (5) UI chrome and title
  art.

| Envelope | Credits |
|---|---|
| Style exploration | 30 |
| Terrain + track tiles | 80 |
| Buildings, stations, industries | 90 |
| Locomotives & cars | 80 |
| UI + title/marketing | 40 |
| Reserve | ~40 |

Art direction (to be confirmed with the style test): an original "hand-tinted survey map" look. Muted
paper tones, ink outlines, readable at small sizes, top-down with slight perspective on buildings and
trains.

## 7. Risks

- **Asset consistency across generations:** lock the style early, reuse reference images, and generate in
  sheets rather than one-offs.
- **Credits running out:** envelopes plus the ledger, with a procedural/vector fallback for tiles if needed.
- **Sim complexity creep:** every rule must have a scenario first; `@wip` keeps the backlog visible.
