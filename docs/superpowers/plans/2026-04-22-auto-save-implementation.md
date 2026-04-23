# Auto-Save Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically persist the full Zustand game store to `localStorage` on every state change and rehydrate it on page load, so the game resumes exactly where the player left off.

**Architecture:** Wrap the existing `create(...)` call in `src/store/gameStore.js` with Zustand's built-in `persist` middleware. Add a `version` field to the store for future migration safety. Export a `hydrateCounters(state)` function that restores the module-level `_routeCounter` / `_locoCounter` from persisted IDs after rehydration.

**Tech Stack:** Zustand 5 (`zustand/middleware` — already installed), Vitest

---

### Task 1: Export `hydrateCounters` + tests

**Files:**
- Modify: `src/store/gameStore.js`
- Modify: `src/store/gameStore.test.js`

The module-level `_routeCounter` and `_locoCounter` are not part of the Zustand store — they won't be serialized. After rehydration, they reset to `1`, which would produce duplicate IDs (e.g. `R-1` already exists but the counter would try to make another `R-1`). `hydrateCounters` fixes this by scanning the reloaded state and setting the counters to `max existing ID + 1`.

- [ ] **Step 1: Add `hydrateCounters` export to `gameStore.js`**

Add the following immediately after the `let _locoCounter = 1;` line:

```js
export function hydrateCounters(state) {
  if (!state) return;
  const maxRoute = (state.routes ?? []).reduce((max, r) => {
    const n = parseInt(r.id.replace('R-', ''), 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);
  const maxLoco = (state.ownedLocomotives ?? []).reduce((max, l) => {
    const n = parseInt(l.uid.replace('L-', ''), 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);
  _routeCounter = maxRoute + 1;
  _locoCounter = maxLoco + 1;
}
```

- [ ] **Step 2: Add `version: 1` to `INITIAL_STATE`**

In `INITIAL_STATE`, add `version: 1` as the last field:

```js
export const INITIAL_STATE = {
  tracks: INITIAL_TRACKS.map(t => ({ ...t })),
  trains: INITIAL_TRAINS.map(t => ({ ...t })),
  ownedLocomotives: [],
  routes: [],
  cash: 428_650,
  netWorth: 2_840_000,
  year: 1875,
  month: 'April',
  screen: 'map',
  selectedCityId: null,
  focusTrainId: null,
  trackLayingFrom: null,
  version: 1,
};
```

- [ ] **Step 3: Write failing tests for `hydrateCounters` in `gameStore.test.js`**

Add this describe block at the end of `gameStore.test.js`:

```js
import { hydrateCounters } from './gameStore';

describe('hydrateCounters', () => {
  beforeEach(reset);

  it('sets _routeCounter above the max existing route ID', () => {
    hydrateCounters({ routes: [{ id: 'R-3' }, { id: 'R-7' }], ownedLocomotives: [] });
    useGameStore.getState().buyLocomotive('americ');
    const uid = useGameStore.getState().ownedLocomotives[0].uid;
    const routeId = useGameStore.getState().createRoute(['sf', 'sac'], uid);
    expect(routeId).toBe('R-8');
  });

  it('sets _locoCounter above the max existing loco UID', () => {
    hydrateCounters({ routes: [], ownedLocomotives: [{ uid: 'L-5' }, { uid: 'L-2' }] });
    const uids = useGameStore.getState().buyLocomotive('americ');
    expect(uids[0]).toBe('L-6');
  });

  it('defaults to counter=1 when state has no routes or locos', () => {
    hydrateCounters({ routes: [], ownedLocomotives: [] });
    const uids = useGameStore.getState().buyLocomotive('americ');
    expect(uids[0]).toMatch(/^L-\d+$/);
  });

  it('handles null/undefined state gracefully', () => {
    expect(() => hydrateCounters(null)).not.toThrow();
    expect(() => hydrateCounters(undefined)).not.toThrow();
  });
});
```

- [ ] **Step 4: Run tests — expect the new tests to FAIL**

```bash
cd /Users/janriissorensen/projects/railroad && npm test
```

Expected: existing 13 tests pass; the 4 new `hydrateCounters` tests fail because `hydrateCounters` is not yet exported (it was just added to the file in Step 1 but the test may fail if the counters aren't being reset between tests).

> **Note:** The `hydrateCounters` tests depend on the module-level counters being at a known value. Because counters are module-level singletons, earlier tests that call `buyLocomotive` / `createRoute` will have incremented them. The tests use `reset()` to reset Zustand state but NOT the counters. The assertions use exact ID values (`R-8`, `L-6`) that assume specific starting counter values — this means test order matters. If these tests are flaky, wrap each test with an explicit `hydrateCounters({ routes: [], ownedLocomotives: [] })` call in `beforeEach` to reset counters to 1 before verifying the increment.
>
> Revised `beforeEach` for the `hydrateCounters` describe block:
> ```js
> beforeEach(() => {
>   reset();
>   hydrateCounters({ routes: [], ownedLocomotives: [] });
> });
> ```
> Then adjust the expected IDs: after `hydrateCounters({routes:[{id:'R-3'},{id:'R-7'}], ...})`, `_routeCounter` = 8, so the next route is `R-8`. After `hydrateCounters({routes:[], locos:[{uid:'L-5'},{uid:'L-2'}]})`, `_locoCounter` = 6, so the next loco is `L-6`. These are correct.

- [ ] **Step 5: Implement `hydrateCounters` is already done in Step 1. Run tests — all must pass**

```bash
cd /Users/janriissorensen/projects/railroad && npm test
```

Expected: all 17 tests pass. If the `R-8` / `L-6` assertions fail due to counter bleed from earlier tests, add `hydrateCounters({ routes: [], ownedLocomotives: [] })` to the `beforeEach` as described in Step 4.

- [ ] **Step 6: Commit**

```bash
git add src/store/gameStore.js src/store/gameStore.test.js
git commit -m "feat: export hydrateCounters for post-rehydration counter fix"
```

---

### Task 2: Wire `persist` middleware

**Files:**
- Modify: `src/store/gameStore.js`

- [ ] **Step 1: Add the `persist` import**

Change the first line of `gameStore.js` from:

```js
import { create } from 'zustand';
```

To:

```js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
```

- [ ] **Step 2: Replace `create(...)` with `create(persist(...))`**

Replace the entire `export const useGameStore = create((set, get) => ({` block. The store body (all actions) is unchanged — only the outer wrapper changes.

Full replacement for the store creation (keep all actions inside verbatim, only change the wrapper):

```js
export const useGameStore = create(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      navigate: (screen) => set({ screen, selectedCityId: null, focusTrainId: null }),
      selectCity: (id) => set({ selectedCityId: id, focusTrainId: null }),
      selectTrain: (id) => set({ focusTrainId: id, selectedCityId: null }),
      startTrackLaying: (fromId) => set({ trackLayingFrom: fromId, selectedCityId: null }),
      cancelTrackLaying: () => set({ trackLayingFrom: null }),

      trackCost: (fromId, toId) => {
        const a = cityById(fromId);
        const b = cityById(toId);
        if (!a || !b) return 0;
        return Math.round(Math.hypot(b.x - a.x, b.y - a.y) * TRACK_COST_PER_PIXEL);
      },

      layTrack: (fromId, toId) => {
        const { tracks, cash, trackCost } = get();
        const cost = trackCost(fromId, toId);
        const duplicate = tracks.some(t =>
          (t.a === fromId && t.b === toId) || (t.a === toId && t.b === fromId)
        );
        if (duplicate || cash < cost) return false;
        set(s => ({
          tracks: [...s.tracks, { a: fromId, b: toId, owner: 'player' }],
          cash: s.cash - cost,
          trackLayingFrom: null,
        }));
        return true;
      },

      buyLocomotive: (catalogId, qty = 1) => {
        const { cash, ownedLocomotives } = get();
        const loco = LOCOMOTIVES.find(l => l.id === catalogId);
        if (!loco || loco.availability !== 'Available' || cash < loco.price * qty) return null;
        const uids = [];
        const newLocos = [];
        for (let i = 0; i < qty; i++) {
          const uid = `L-${_locoCounter++}`;
          uids.push(uid);
          newLocos.push({
            uid,
            catalogId,
            name: loco.name,
            color: TRAIN_COLORS[(ownedLocomotives.length + i) % TRAIN_COLORS.length],
            assignedRouteId: null,
          });
        }
        set(s => ({
          cash: s.cash - loco.price * qty,
          ownedLocomotives: [...s.ownedLocomotives, ...newLocos],
        }));
        return uids;
      },

      createRoute: (stops, locomotiveUid) => {
        const { tracks, ownedLocomotives } = get();
        for (let i = 0; i < stops.length - 1; i++) {
          const ok = tracks.some(t =>
            t.owner === 'player' &&
            ((t.a === stops[i] && t.b === stops[i + 1]) ||
             (t.a === stops[i + 1] && t.b === stops[i]))
          );
          if (!ok) return null;
        }
        const loco = ownedLocomotives.find(l => l.uid === locomotiveUid && l.assignedRouteId === null);
        if (!loco) return null;
        const routeId = `R-${_routeCounter++}`;
        const newTrain = {
          id: routeId,
          name: loco.name,
          model: LOCOMOTIVES.find(l => l.id === loco.catalogId)?.name ?? loco.name,
          route: stops,
          leg: 0,
          progress: 0,
          speed: 0.00042,
          cars: ['passenger', 'mail'],
          color: loco.color,
        };
        set(s => ({
          routes: [...s.routes, {
            id: routeId,
            name: `Route #${_routeCounter - 1}`,
            stops,
            locomotiveUid,
            status: 'running',
            revenuePerTick: stops.length * 800,
          }],
          trains: [...s.trains, newTrain],
          ownedLocomotives: s.ownedLocomotives.map(l =>
            l.uid === locomotiveUid ? { ...l, assignedRouteId: routeId } : l
          ),
        }));
        return routeId;
      },

      suspendRoute: (routeId) => {
        set(s => ({
          routes: s.routes.map(r => r.id === routeId ? { ...r, status: 'suspended' } : r),
        }));
      },

      tickRevenue: () => {
        set(s => {
          const earned = s.routes
            .filter(r => r.status === 'running')
            .reduce((acc, r) => acc + r.revenuePerTick, 0);
          return earned > 0 ? { cash: s.cash + earned } : s;
        });
      },
    }),
    {
      name: 'iron-empire-save',
      version: 1,
      migrate: (_persistedState, _version) => ({ ...INITIAL_STATE }),
      onRehydrateStorage: () => (state) => hydrateCounters(state),
    }
  )
);
```

- [ ] **Step 3: Run all tests — all must still pass**

```bash
cd /Users/janriissorensen/projects/railroad && npm test
```

Expected: all 17 tests pass. The `persist` middleware will attempt `localStorage` access in the Node test environment — Zustand handles missing `localStorage` gracefully (no-op storage), so tests are unaffected.

If any test fails with a `localStorage is not defined` error, add this to the top of `gameStore.test.js`:

```js
import { beforeAll } from 'vitest';

beforeAll(() => {
  if (typeof localStorage === 'undefined') {
    global.localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
});
```

- [ ] **Step 4: Build to verify no bundler errors**

```bash
cd /Users/janriissorensen/projects/railroad && npm run build 2>&1 | tail -10
```

Expected: clean build, no errors.

- [ ] **Step 5: Verify in browser**

```bash
npm run dev
```

1. Open `http://localhost:5173`
2. Buy a locomotive in Locomotive Works — cash decreases
3. Create a route in Dispatch Office
4. Hard-reload the page (Cmd+Shift+R / Ctrl+Shift+R)
5. Expected: cash shows the post-purchase value, the route still exists, the train animates, the screen is wherever you left it

Also verify version migration: open DevTools → Application → Local Storage → `iron-empire-save`. Change the `version` field to `99`. Reload. Expected: game resets to initial state (fresh $428,650, no owned locos, no routes).

- [ ] **Step 6: Commit**

```bash
git add src/store/gameStore.js
git commit -m "feat: auto-save game state to localStorage via Zustand persist"
```

---

## Self-Review

**Spec coverage:**
- ✅ Full store persisted (all fields including `screen`, `selectedCityId`, `focusTrainId`, `trackLayingFrom`)
- ✅ Automatic — no UI changes, no save button
- ✅ Rehydrates on page load (handled by `persist` middleware)
- ✅ Restores to exact screen and selection state
- ✅ `version: 1` field added to `INITIAL_STATE`
- ✅ Version mismatch → wipe and return `INITIAL_STATE`
- ✅ `_routeCounter` / `_locoCounter` restored via `hydrateCounters` after rehydration
- ✅ `hydrateCounters` tested: max-ID scanning, graceful null handling

**Placeholder scan:** None.

**Type consistency:** `hydrateCounters(state)` defined in Task 1, called in `onRehydrateStorage` in Task 2. Shape of `state.routes[].id` and `state.ownedLocomotives[].uid` match the store definitions. ✅
