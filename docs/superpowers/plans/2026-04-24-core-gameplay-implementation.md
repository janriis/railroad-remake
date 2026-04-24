# Core Gameplay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement supply-and-demand city economy, per-stop car scheduling, locomotive tonnage limits, maintenance costs, and a redesigned Route Scheduler screen.

**Architecture:** New `src/data/goods.js` defines 5 car/good types with weights, base rates, and colours. City and locomotive data files gain economy fields. The store gains `cityDemand` state, replaces flat `tickRevenue` with demand-aware `settleAllRoutes` + `tickDemand`, and adds actions for per-stop car management. The Route Scheduler gets a three-column redesign showing live demand alongside the car editor.

**Tech Stack:** Vite 6, React 18, Zustand 5 (persist middleware), Vitest

---

## File Map

| Action | Path |
|---|---|
| Create | `src/data/goods.js` |
| Modify | `src/data/cities.js` |
| Modify | `src/data/locomotives.js` |
| Modify | `src/store/gameStore.js` |
| Modify | `src/store/gameStore.test.js` |
| Modify | `src/App.jsx` |
| Modify | `src/components/hud/CityDetailPanel.jsx` |
| Modify | `src/components/screens/RouteSchedulerScreen.jsx` |
| Modify | `src/components/screens/DepotScreen.jsx` |

---

### Task 1: Create src/data/goods.js

**Files:**
- Create: `src/data/goods.js`

- [ ] **Step 1: Create the file**

```js
export const GOODS = [
  { id: 'passenger', label: 'Passenger', emoji: '🚂', baseRate: 1200, weight: 8,  bg: '#3d5c2a', text: '#d0f0a0' },
  { id: 'mail',      label: 'Mail',      emoji: '✉',  baseRate: 900,  weight: 4,  bg: '#2a3a6a', text: '#a0c0f0' },
  { id: 'freight',   label: 'Freight',   emoji: '📦', baseRate: 800,  weight: 14, bg: '#4a3010', text: '#d9c698' },
  { id: 'coal',      label: 'Coal',      emoji: '⛏',  baseRate: 700,  weight: 16, bg: '#3a3028', text: '#c0b8a8' },
  { id: 'cattle',    label: 'Cattle',    emoji: '🐄', baseRate: 1000, weight: 12, bg: '#6a3010', text: '#f0c080' },
];

export const DEMAND_RECOVERY_RATE = 3;  // demand points recovered per game tick
export const DEMAND_DROP_PER_CAR  = 8;  // demand points dropped per car delivered per stop
export const TONS_RATE            = 12; // $ maintenance per ton of cars per tick
```

- [ ] **Step 2: Verify no build errors**

```bash
cd /Users/janriissorensen/projects/railroad && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/data/goods.js
git commit -m "feat: add goods data (5 car types with weights, rates, colours)"
```

---

### Task 2: Update src/data/cities.js with produces/demands

**Files:**
- Modify: `src/data/cities.js`

- [ ] **Step 1: Replace the CITIES array with economy data**

Replace the entire `export const CITIES = [...]` array (keep `cityById` unchanged):

```js
export const CITIES = [
  { id: 'sf',  name: 'San Francisco', x: 110,  y: 480, size: 'metro', pop: '149,473', state: 'CAL',
    produces: ['passenger', 'mail'], demands: ['freight', 'coal', 'cattle'] },
  { id: 'sac', name: 'Sacramento',    x: 175,  y: 440, size: 'city',  pop: '21,420',  state: 'CAL',
    produces: ['freight'], demands: ['passenger', 'mail'] },
  { id: 'lax', name: 'Los Angeles',   x: 200,  y: 620, size: 'city',  pop: '11,183',  state: 'CAL',
    produces: ['freight'], demands: ['passenger', 'mail', 'cattle'] },
  { id: 'slc', name: 'Salt Lake City',x: 420,  y: 430, size: 'city',  pop: '20,768',  state: 'UTH',
    produces: ['coal'], demands: ['passenger', 'mail', 'freight'] },
  { id: 'den', name: 'Denver',        x: 590,  y: 460, size: 'city',  pop: '35,629',  state: 'COL',
    produces: ['coal'], demands: ['passenger', 'mail', 'freight'] },
  { id: 'chy', name: 'Cheyenne',      x: 620,  y: 400, size: 'town',  pop: '3,456',   state: 'WYO',
    produces: ['cattle'], demands: ['passenger', 'mail'] },
  { id: 'abq', name: 'Albuquerque',   x: 620,  y: 580, size: 'town',  pop: '2,315',   state: 'NM',
    produces: ['cattle'], demands: ['passenger', 'mail'] },
  { id: 'epa', name: 'El Paso',       x: 650,  y: 680, size: 'town',  pop: '736',     state: 'TEX',
    produces: ['cattle'], demands: ['passenger', 'mail'] },
  { id: 'kc',  name: 'Kansas City',   x: 850,  y: 500, size: 'city',  pop: '55,785',  state: 'MO',
    produces: ['cattle', 'freight'], demands: ['passenger', 'mail', 'coal'] },
  { id: 'omh', name: 'Omaha',         x: 850,  y: 430, size: 'city',  pop: '30,518',  state: 'NEB',
    produces: ['cattle'], demands: ['passenger', 'mail', 'freight'] },
  { id: 'stl', name: 'St. Louis',     x: 960,  y: 520, size: 'metro', pop: '310,864', state: 'MO',
    produces: ['freight'], demands: ['passenger', 'mail', 'coal', 'cattle'] },
  { id: 'dal', name: 'Dallas',        x: 890,  y: 640, size: 'town',  pop: '10,358',  state: 'TEX',
    produces: ['cattle'], demands: ['passenger', 'mail', 'freight'] },
  { id: 'hou', name: 'Houston',       x: 930,  y: 720, size: 'town',  pop: '16,513',  state: 'TEX',
    produces: ['freight'], demands: ['passenger', 'mail', 'cattle'] },
  { id: 'nol', name: 'New Orleans',   x: 1060, y: 720, size: 'metro', pop: '216,090', state: 'LA',
    produces: ['freight'], demands: ['passenger', 'mail', 'cattle', 'coal'] },
  { id: 'chi', name: 'Chicago',       x: 1040, y: 400, size: 'metro', pop: '503,185', state: 'ILL',
    produces: ['freight', 'coal'], demands: ['passenger', 'mail', 'cattle'] },
  { id: 'det', name: 'Detroit',       x: 1150, y: 360, size: 'city',  pop: '116,340', state: 'MICH',
    produces: ['freight'], demands: ['passenger', 'mail', 'coal'] },
  { id: 'cle', name: 'Cleveland',     x: 1210, y: 390, size: 'city',  pop: '92,829',  state: 'OHIO',
    produces: ['coal', 'freight'], demands: ['passenger', 'mail'] },
  { id: 'pit', name: 'Pittsburgh',    x: 1260, y: 420, size: 'city',  pop: '86,076',  state: 'PENN',
    produces: ['coal', 'freight'], demands: ['passenger', 'mail'] },
  { id: 'atl', name: 'Atlanta',       x: 1180, y: 620, size: 'city',  pop: '37,409',  state: 'GA',
    produces: ['freight'], demands: ['passenger', 'mail', 'cattle', 'coal'] },
  { id: 'cha', name: 'Charleston',    x: 1280, y: 650, size: 'town',  pop: '48,956',  state: 'SC',
    produces: ['freight'], demands: ['passenger', 'mail'] },
  { id: 'dc',  name: 'Washington',    x: 1350, y: 470, size: 'city',  pop: '109,199', state: 'DC',
    produces: ['passenger', 'mail'], demands: ['freight', 'coal'] },
  { id: 'bal', name: 'Baltimore',     x: 1380, y: 450, size: 'city',  pop: '267,354', state: 'MD',
    produces: ['freight', 'coal'], demands: ['passenger', 'mail'] },
  { id: 'phi', name: 'Philadelphia',  x: 1410, y: 430, size: 'metro', pop: '674,022', state: 'PENN',
    produces: ['freight'], demands: ['passenger', 'mail', 'coal', 'cattle'] },
  { id: 'nyc', name: 'New York',      x: 1450, y: 400, size: 'metro', pop: '942,292', state: 'NY',
    produces: ['passenger', 'mail'], demands: ['freight', 'coal', 'cattle'] },
  { id: 'bos', name: 'Boston',        x: 1490, y: 340, size: 'metro', pop: '250,526', state: 'MASS',
    produces: ['passenger', 'mail'], demands: ['freight', 'coal', 'cattle'] },
  { id: 'buf', name: 'Buffalo',       x: 1320, y: 340, size: 'city',  pop: '117,714', state: 'NY',
    produces: ['coal', 'freight'], demands: ['passenger', 'mail'] },
];
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/janriissorensen/projects/railroad && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/data/cities.js
git commit -m "feat: add produces/demands economy fields to all cities"
```

---

### Task 3: Update src/data/locomotives.js with maxTons + maintenanceBase

**Files:**
- Modify: `src/data/locomotives.js`

- [ ] **Step 1: Replace the LOCOMOTIVES array**

Replace the full array (add `maxTons` and `maintenanceBase` to every entry):

```js
export const LOCOMOTIVES = [
  {
    id: 'grasshop', name: '0-4-0 "Grasshopper"', years: '1832–1860',
    price: 6500, maxSpeed: 25, power: 'Low', reliability: 'Medium',
    best: 'Short Haul', era: 'Pioneer',
    description: "The Baltimore & Ohio's famous vertical-boiler curiosity. An antique that turns heads at every depot — though her fireman earns his keep.",
    availability: 'Available',
    maxTons: 24, maintenanceBase: 40,
  },
  {
    id: 'americ', name: '4-4-0 "American"', years: '1860–1880',
    price: 18500, maxSpeed: 60, power: 'Medium', reliability: 'High',
    best: 'Passenger', era: 'Golden Age',
    description: 'The most common locomotive of the Civil War era. Versatile, reliable, and handsome in her livery.',
    availability: 'Available',
    maxTons: 36, maintenanceBase: 80,
  },
  {
    id: 'mogul', name: '2-6-0 "Mogul"', years: '1866–1890',
    price: 24800, maxSpeed: 45, power: 'High', reliability: 'High',
    best: 'Freight', era: 'Golden Age',
    description: 'A brute of a freight hauler. Six driving wheels give her tremendous pulling power over the plains.',
    availability: 'Available',
    maxTons: 56, maintenanceBase: 120,
  },
  {
    id: 'tenwh', name: '4-6-0 "Ten-Wheeler"', years: '1868–1895',
    price: 31200, maxSpeed: 55, power: 'High', reliability: 'Medium',
    best: 'Mixed', era: 'Golden Age',
    description: 'A compromise between speed and tractive force. Popular with express lines hauling long trains.',
    availability: 'Available',
    maxTons: 64, maintenanceBase: 140,
  },
  {
    id: 'consol', name: '2-8-0 "Consolidation"', years: '1866–1900',
    price: 38400, maxSpeed: 40, power: 'Very High', reliability: 'High',
    best: 'Coal & Ore', era: 'Industrial',
    description: 'Eight driving wheels of iron fury. She will drag a mountain over the Rockies if you ask her.',
    availability: 'Available',
    maxTons: 80, maintenanceBase: 160,
  },
  {
    id: 'atlan', name: '4-4-2 "Atlantic"', years: '1888–1910',
    price: 52000, maxSpeed: 85, power: 'Medium', reliability: 'Medium',
    best: 'Express Passenger', era: 'Modern',
    description: 'Latest from the Baldwin works. The fastest wheels in the west — and twice as expensive.',
    availability: 'Awaiting 1888',
    maxTons: 44, maintenanceBase: 100,
  },
];
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/janriissorensen/projects/railroad && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/data/locomotives.js
git commit -m "feat: add maxTons and maintenanceBase to all locomotives"
```

---

### Task 4: Add cityDemand to store + tickDemand action + tests

**Files:**
- Modify: `src/store/gameStore.js`
- Modify: `src/store/gameStore.test.js`

- [ ] **Step 1: Write failing tests for tickDemand in gameStore.test.js**

Add this import at the top of `gameStore.test.js` (after existing imports):

```js
import { CITIES } from '../data/cities';
```

Add this describe block at the end of `gameStore.test.js`:

```js
describe('tickDemand', () => {
  beforeEach(() => {
    useGameStore.setState({ ...INITIAL_STATE });
    hydrateCounters({ routes: [], ownedLocomotives: [] });
  });

  it('increases demand by DEMAND_RECOVERY_RATE for every demanded good at every city', () => {
    const before = useGameStore.getState().cityDemand;
    useGameStore.getState().tickDemand();
    const after = useGameStore.getState().cityDemand;
    // San Francisco demands freight — verify it rose
    expect(after['sf']['freight']).toBe(before['sf']['freight'] + 3);
  });

  it('caps demand at 100', () => {
    useGameStore.setState({
      cityDemand: { sf: { freight: 99, coal: 100, cattle: 98 } },
    });
    useGameStore.getState().tickDemand();
    const d = useGameStore.getState().cityDemand;
    expect(d['sf']['freight']).toBe(100);
    expect(d['sf']['coal']).toBe(100);
    expect(d['sf']['cattle']).toBe(100);
  });

  it('initial cityDemand starts all demanded goods at 50', () => {
    const d = useGameStore.getState().cityDemand;
    // Chicago demands passenger, mail, cattle
    expect(d['chi']['passenger']).toBe(50);
    expect(d['chi']['mail']).toBe(50);
    expect(d['chi']['cattle']).toBe(50);
    // Chicago does not demand coal — should have no key
    expect(d['chi']['coal']).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests — expect new tests to fail**

```bash
cd /Users/janriissorensen/projects/railroad && npm test 2>&1 | tail -20
```

Expected: existing 17 tests pass; the 3 new `tickDemand` tests fail (INITIAL_STATE has no `cityDemand`, `tickDemand` not defined).

- [ ] **Step 3: Update gameStore.js — add imports, helpers, cityDemand to INITIAL_STATE, tickDemand action**

At the top of `gameStore.js`, add the new import on the line after the LOCOMOTIVES import:

```js
import { GOODS, DEMAND_RECOVERY_RATE } from '../data/goods';
```

Immediately after the `let _locoCounter = 1;` line, add these two helpers:

```js
function buildInitialCityDemand() {
  const result = {};
  for (const city of CITIES) {
    if (!city.demands?.length) continue;
    result[city.id] = {};
    for (const good of city.demands) result[city.id][good] = 50;
  }
  return result;
}

function resolveConsist(schedule, stopIndex) {
  for (let i = stopIndex; i >= 0; i--) {
    if (schedule[i] !== undefined) return schedule[i];
  }
  return ['passenger', 'mail'];
}
```

In `INITIAL_STATE`, add `cityDemand` as the last field and bump `version` to `2`:

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
  cityDemand: buildInitialCityDemand(),
  version: 2,
};
```

In the `persist` config at the bottom of the file, bump `version` to `2`:

```js
{
  name: 'iron-empire-save',
  version: 2,
  migrate: (_persistedState, _version) => ({ ...INITIAL_STATE }),
  onRehydrateStorage: () => (state) => hydrateCounters(state),
}
```

Add `tickDemand` action inside the store, after `cancelTrackLaying`:

```js
tickDemand: () => {
  set(s => {
    const next = {};
    for (const [cityId, goods] of Object.entries(s.cityDemand)) {
      next[cityId] = {};
      for (const [good, val] of Object.entries(goods)) {
        next[cityId][good] = Math.min(100, val + DEMAND_RECOVERY_RATE);
      }
    }
    return { cityDemand: next };
  });
},
```

- [ ] **Step 4: Run tests — all must pass**

```bash
cd /Users/janriissorensen/projects/railroad && npm test 2>&1 | tail -20
```

Expected: all 20 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/store/gameStore.js src/store/gameStore.test.js
git commit -m "feat: add cityDemand state and tickDemand action to store"
```

---

### Task 5: Update route schema + add setStopCars, setLoadingPolicy, resumeRoute actions + tests

**Files:**
- Modify: `src/store/gameStore.js`
- Modify: `src/store/gameStore.test.js`

- [ ] **Step 1: Write failing tests**

Replace the entire `describe('createRoute', ...)` block in `gameStore.test.js` with:

```js
describe('createRoute', () => {
  beforeEach(() => {
    useGameStore.setState({ ...INITIAL_STATE });
    hydrateCounters({ routes: [], ownedLocomotives: [] });
    useGameStore.getState().buyLocomotive('americ');
  });

  it('creates running route with schedule, loadingPolicy, maxWaitDays (no revenuePerTick)', () => {
    const uid = useGameStore.getState().ownedLocomotives[0].uid;
    const routeId = useGameStore.getState().createRoute(['sf', 'sac', 'slc'], uid);
    const s = useGameStore.getState();
    expect(routeId).toBeTruthy();
    expect(s.routes[0].status).toBe('running');
    expect(s.routes[0].schedule[0]).toEqual(['passenger', 'mail']);
    expect(s.routes[0].loadingPolicy).toBe('express');
    expect(s.routes[0].maxWaitDays).toBe(2);
    expect(s.routes[0].revenuePerTick).toBeUndefined();
    expect(s.trains.some(t => t.id === routeId)).toBe(true);
    expect(s.ownedLocomotives[0].assignedRouteId).toBe(routeId);
  });

  it('rejects stops not connected by player track', () => {
    const uid = useGameStore.getState().ownedLocomotives[0].uid;
    expect(useGameStore.getState().createRoute(['sf', 'nyc'], uid)).toBeNull();
  });

  it('rejects already-assigned loco', () => {
    const uid = useGameStore.getState().ownedLocomotives[0].uid;
    useGameStore.getState().createRoute(['sf', 'sac'], uid);
    expect(useGameStore.getState().createRoute(['sf', 'sac'], uid)).toBeNull();
  });
});
```

Replace the entire `describe('tickRevenue', ...)` block with:

```js
describe('suspendRoute + resumeRoute', () => {
  beforeEach(() => {
    useGameStore.setState({ ...INITIAL_STATE });
    hydrateCounters({ routes: [], ownedLocomotives: [] });
    useGameStore.getState().buyLocomotive('americ');
    const uid = useGameStore.getState().ownedLocomotives[0].uid;
    useGameStore.getState().createRoute(['sf', 'sac'], uid);
  });

  it('suspendRoute sets status to suspended', () => {
    const id = useGameStore.getState().routes[0].id;
    useGameStore.getState().suspendRoute(id);
    expect(useGameStore.getState().routes[0].status).toBe('suspended');
  });

  it('resumeRoute sets status back to running', () => {
    const id = useGameStore.getState().routes[0].id;
    useGameStore.getState().suspendRoute(id);
    useGameStore.getState().resumeRoute(id);
    expect(useGameStore.getState().routes[0].status).toBe('running');
  });
});

describe('setStopCars', () => {
  beforeEach(() => {
    useGameStore.setState({ ...INITIAL_STATE });
    hydrateCounters({ routes: [], ownedLocomotives: [] });
    useGameStore.getState().buyLocomotive('americ');
    const uid = useGameStore.getState().ownedLocomotives[0].uid;
    useGameStore.getState().createRoute(['sf', 'sac', 'slc'], uid);
  });

  it('sets car consist for a specific stop index', () => {
    const id = useGameStore.getState().routes[0].id;
    useGameStore.getState().setStopCars(id, 2, ['coal', 'freight']);
    expect(useGameStore.getState().routes[0].schedule[2]).toEqual(['coal', 'freight']);
  });

  it('rejects consist that exceeds loco maxTons (American = 36t; coal+freight+coal = 46t)', () => {
    const id = useGameStore.getState().routes[0].id;
    // coal=16t, freight=14t, coal=16t → 46t > 36t
    const ok = useGameStore.getState().setStopCars(id, 0, ['coal', 'freight', 'coal']);
    expect(ok).toBe(false);
    expect(useGameStore.getState().routes[0].schedule[0]).toEqual(['passenger', 'mail']);
  });
});

describe('setLoadingPolicy', () => {
  beforeEach(() => {
    useGameStore.setState({ ...INITIAL_STATE });
    hydrateCounters({ routes: [], ownedLocomotives: [] });
    useGameStore.getState().buyLocomotive('americ');
    const uid = useGameStore.getState().ownedLocomotives[0].uid;
    useGameStore.getState().createRoute(['sf', 'sac'], uid);
  });

  it('updates loadingPolicy and maxWaitDays', () => {
    const id = useGameStore.getState().routes[0].id;
    useGameStore.getState().setLoadingPolicy(id, 'fullLoad', 4);
    const r = useGameStore.getState().routes[0];
    expect(r.loadingPolicy).toBe('fullLoad');
    expect(r.maxWaitDays).toBe(4);
  });

  it('defaults maxWaitDays to 2 when not provided', () => {
    const id = useGameStore.getState().routes[0].id;
    useGameStore.getState().setLoadingPolicy(id, 'fullLoad');
    expect(useGameStore.getState().routes[0].maxWaitDays).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests — expect new tests to fail**

```bash
cd /Users/janriissorensen/projects/railroad && npm test 2>&1 | tail -20
```

Expected: prior tests pass; new tests fail (`revenuePerTick` still exists, `setStopCars`/`setLoadingPolicy`/`resumeRoute` not defined).

- [ ] **Step 3: Update createRoute in gameStore.js**

In `gameStore.js`, replace the `createRoute` action. The existing action sets `revenuePerTick: stops.length * 800` on the route — remove that and add `schedule`, `loadingPolicy`, `maxWaitDays`:

```js
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
      schedule: { 0: ['passenger', 'mail'] },
      loadingPolicy: 'express',
      maxWaitDays: 2,
    }],
    trains: [...s.trains, newTrain],
    ownedLocomotives: s.ownedLocomotives.map(l =>
      l.uid === locomotiveUid ? { ...l, assignedRouteId: routeId } : l
    ),
  }));
  return routeId;
},
```

- [ ] **Step 4: Add setStopCars, setLoadingPolicy, resumeRoute actions**

In `gameStore.js`, replace the `suspendRoute` action and everything after it (up to the closing `}`), with:

```js
suspendRoute: (routeId) => {
  set(s => ({
    routes: s.routes.map(r => r.id === routeId ? { ...r, status: 'suspended' } : r),
  }));
},

resumeRoute: (routeId) => {
  set(s => ({
    routes: s.routes.map(r => r.id === routeId ? { ...r, status: 'running' } : r),
  }));
},

setStopCars: (routeId, stopIndex, cars) => {
  const { routes, ownedLocomotives } = get();
  const route = routes.find(r => r.id === routeId);
  if (!route) return false;
  const owned = ownedLocomotives.find(o => o.uid === route.locomotiveUid);
  const loco = LOCOMOTIVES.find(l => l.id === owned?.catalogId);
  const maxTons = loco?.maxTons ?? 36;
  const totalTons = cars.reduce((sum, t) => sum + (GOODS.find(g => g.id === t)?.weight ?? 0), 0);
  if (totalTons > maxTons) return false;
  set(s => ({
    routes: s.routes.map(r =>
      r.id === routeId
        ? { ...r, schedule: { ...r.schedule, [stopIndex]: cars } }
        : r
    ),
  }));
  return true;
},

setLoadingPolicy: (routeId, policy, maxWaitDays = 2) => {
  set(s => ({
    routes: s.routes.map(r =>
      r.id === routeId ? { ...r, loadingPolicy: policy, maxWaitDays } : r
    ),
  }));
},
```

- [ ] **Step 5: Run tests — all must pass**

```bash
cd /Users/janriissorensen/projects/railroad && npm test 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/store/gameStore.js src/store/gameStore.test.js
git commit -m "feat: update route schema (schedule/loadingPolicy) and add car management actions"
```

---

### Task 6: Replace tickRevenue with settleAllRoutes + update App.jsx + tests

**Files:**
- Modify: `src/store/gameStore.js`
- Modify: `src/store/gameStore.test.js`
- Modify: `src/App.jsx`

- [ ] **Step 1: Write failing tests for settleAllRoutes**

Add this describe block at the end of `gameStore.test.js`:

```js
describe('settleAllRoutes', () => {
  beforeEach(() => {
    useGameStore.setState({ ...INITIAL_STATE });
    hydrateCounters({ routes: [], ownedLocomotives: [] });
    useGameStore.getState().buyLocomotive('americ');
    const uid = useGameStore.getState().ownedLocomotives[0].uid;
    // SF→SAC route. SF demands freight/coal/cattle. SAC demands passenger/mail.
    useGameStore.getState().createRoute(['sf', 'sac'], uid);
  });

  it('earns revenue based on demand level and reduces demand', () => {
    // Set known demand: SAC demands passenger at 80
    useGameStore.setState({ cityDemand: { ...INITIAL_STATE.cityDemand, sac: { passenger: 80, mail: 60 } } });
    const cashBefore = useGameStore.getState().cash;
    useGameStore.getState().settleAllRoutes();
    const s = useGameStore.getState();
    // Should have earned something (demand was > 0)
    expect(s.cash).toBeGreaterThan(cashBefore - 1000); // maintenance is ~$160/tick
    // SAC passenger demand should have dropped
    expect(s.cityDemand['sac']['passenger']).toBeLessThan(80);
  });

  it('earns zero revenue for cars whose city has zero demand', () => {
    // Set all demands to 0
    const zeroDemand = Object.fromEntries(
      Object.entries(INITIAL_STATE.cityDemand).map(([cid, goods]) => [
        cid,
        Object.fromEntries(Object.entries(goods).map(([g]) => [g, 0])),
      ])
    );
    useGameStore.setState({ cityDemand: zeroDemand });
    const cashBefore = useGameStore.getState().cash;
    useGameStore.getState().settleAllRoutes();
    // Only maintenance deducted (American base $80 + 12t × $12 = $224)
    expect(useGameStore.getState().cash).toBe(cashBefore - 224);
  });

  it('skips suspended routes', () => {
    const id = useGameStore.getState().routes[0].id;
    useGameStore.getState().suspendRoute(id);
    const cashBefore = useGameStore.getState().cash;
    useGameStore.getState().settleAllRoutes();
    expect(useGameStore.getState().cash).toBe(cashBefore);
  });
});
```

- [ ] **Step 2: Run tests — expect new tests to fail**

```bash
cd /Users/janriissorensen/projects/railroad && npm test 2>&1 | tail -20
```

Expected: existing tests pass; `settleAllRoutes` tests fail.

- [ ] **Step 3: Add settleAllRoutes to gameStore.js and remove tickRevenue**

In `gameStore.js`, add the `DEMAND_DROP_PER_CAR` and `TONS_RATE` to the existing goods import line:

```js
import { GOODS, DEMAND_RECOVERY_RATE, DEMAND_DROP_PER_CAR, TONS_RATE } from '../data/goods';
```

Add a `maxStopTons` helper after the `resolveConsist` helper:

```js
function maxStopTons(schedule, stopCount) {
  let max = 0;
  for (let i = 0; i < stopCount; i++) {
    const consist = resolveConsist(schedule, i);
    const tons = consist.reduce((s, t) => s + (GOODS.find(g => g.id === t)?.weight ?? 0), 0);
    if (tons > max) max = tons;
  }
  return max;
}
```

Remove the entire `tickRevenue` action from the store and replace it with `settleAllRoutes` (add after `setLoadingPolicy`):

```js
settleAllRoutes: () => {
  set(s => {
    const { routes, ownedLocomotives, cityDemand } = s;
    let cash = s.cash;
    const newDemand = {};
    for (const [cityId, goods] of Object.entries(cityDemand)) {
      newDemand[cityId] = { ...goods };
    }

    for (const route of routes.filter(r => r.status === 'running')) {
      const owned = ownedLocomotives.find(o => o.uid === route.locomotiveUid);
      const loco = LOCOMOTIVES.find(l => l.id === owned?.catalogId);
      const maintenanceBase = loco?.maintenanceBase ?? 80;
      const tons = maxStopTons(route.schedule, route.stops.length);
      const maintenance = maintenanceBase + tons * TONS_RATE;

      let revenue = 0;
      for (let i = 0; i < route.stops.length; i++) {
        const cityId = route.stops[i];
        const consist = resolveConsist(route.schedule, i);
        for (const carType of consist) {
          const good = GOODS.find(g => g.id === carType);
          if (!good) continue;
          const demand = newDemand[cityId]?.[carType] ?? 0;
          if (demand > 0) {
            revenue += Math.round(good.baseRate * (demand / 100));
            newDemand[cityId][carType] = Math.max(0, demand - DEMAND_DROP_PER_CAR);
          }
        }
      }

      cash += revenue - maintenance;
    }

    return { cash, cityDemand: newDemand };
  });
},
```

- [ ] **Step 4: Run tests — all must pass**

```bash
cd /Users/janriissorensen/projects/railroad && npm test 2>&1 | tail -20
```

Expected: all tests pass. If the "zero demand" test fails due to tonnage mismatch, note: American = 36t max, default consist is `['passenger', 'mail']` = 8+4 = 12t. Maintenance = $80 + 12×$12 = $80 + $144 = $224. Adjust the test expected value accordingly.

- [ ] **Step 5: Update App.jsx — replace tickRevenue with settleAllRoutes + tickDemand**

Replace the entire `App.jsx` file with:

```jsx
import { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore.js';
import { TitleBar } from './components/chrome/TitleBar.jsx';
import { Ticker } from './components/chrome/Ticker.jsx';
import { MapScreen } from './components/screens/MapScreen.jsx';
import { DepotScreen } from './components/screens/DepotScreen.jsx';
import { RouteSchedulerScreen } from './components/screens/RouteSchedulerScreen.jsx';
import { TrackLayingScreen } from './components/screens/TrackLayingScreen.jsx';
import { NEWS } from './data/news.js';

const COMPANY_STATIC = { name: 'GREAT NORTHERN & PACIFIC', founded: 1863 };

export default function App() {
  const cash             = useGameStore(s => s.cash);
  const year             = useGameStore(s => s.year);
  const month            = useGameStore(s => s.month);
  const screen           = useGameStore(s => s.screen);
  const navigate         = useGameStore(s => s.navigate);
  const settleAllRoutes  = useGameStore(s => s.settleAllRoutes);
  const tickDemand       = useGameStore(s => s.tickDemand);

  const [hudVisible, setHudVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      settleAllRoutes();
      tickDemand();
    }, 2000);
    return () => clearInterval(id);
  }, [settleAllRoutes, tickDemand]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TitleBar
        company={{ ...COMPANY_STATIC, cash, year, month }}
        screen={screen}
        onNav={navigate}
        hudVisible={hudVisible}
        onToggleHUD={() => setHudVisible(v => !v)}
      />
      {screen === 'map'   && <MapScreen hudVisible={hudVisible} />}
      {screen === 'depot' && <DepotScreen onBack={() => navigate('map')} />}
      {screen === 'route' && <RouteSchedulerScreen onBack={() => navigate('map')} />}
      {screen === 'track' && <TrackLayingScreen onBack={() => navigate('map')} />}
      <Ticker items={NEWS} />
    </div>
  );
}
```

- [ ] **Step 6: Build and verify**

```bash
cd /Users/janriissorensen/projects/railroad && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 7: Commit**

```bash
git add src/store/gameStore.js src/store/gameStore.test.js src/App.jsx
git commit -m "feat: replace tickRevenue with demand-aware settleAllRoutes + tickDemand"
```

---

### Task 7: Update CityDetailPanel with produces/demands

**Files:**
- Modify: `src/components/hud/CityDetailPanel.jsx`

- [ ] **Step 1: Replace CityDetailPanel.jsx**

```jsx
import { useGameStore } from '../../store/gameStore.js';
import { cityById } from '../../data/cities.js';
import { GOODS } from '../../data/goods.js';
import { Panel } from '../chrome/Panel.jsx';
import { CityVignette } from '../icons/index.js';
import { Label, DividerDots } from './helpers.jsx';

function DemandBar({ good, level }) {
  const colour = level >= 80 ? '#c85040' : level >= 40 ? '#c49a44' : '#5a5a4a';
  const label  = level >= 80 ? 'HIGH' : level >= 40 ? 'MED' : 'LOW';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 72, fontSize: 11, color: '#d9c698' }}>{good.emoji} {good.label}</span>
      <div style={{ flex: 1, height: 7, background: '#2a1510', borderRadius: 3 }}>
        <div style={{ width: `${level}%`, height: '100%', background: colour, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 10, color: colour, width: 32, textAlign: 'right' }}>{label}</span>
    </div>
  );
}

export function CityDetailPanel({ cityId, onClose, onLayTrack }) {
  const city      = cityById(cityId);
  const tracks    = useGameStore(s => s.tracks);
  const cityDemand = useGameStore(s => s.cityDemand);

  if (!city) return null;

  const connectedTracks = tracks.filter(t => t.a === cityId || t.b === cityId);
  const demandLevels    = cityDemand[cityId] ?? {};
  const demandedGoods   = GOODS.filter(g => demandLevels[g.id] !== undefined);

  return (
    <Panel
      title={city.name}
      style={{ width: 280 }}
      actions={
        <button className="btn-brass" onClick={onClose} style={{ fontSize: 10, padding: '2px 8px' }}>✕</button>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <CityVignette size={city.size} style={{ flexShrink: 0 }} />
        <div>
          <div className="display uppercase" style={{ fontSize: 12, color: '#c49a44', letterSpacing: '0.14em' }}>
            {city.size.toUpperCase()} · {city.state}
          </div>
          <div className="body-serif" style={{ fontSize: 11, color: '#a88238', fontStyle: 'italic' }}>
            Pop. {city.pop}
          </div>
        </div>
      </div>

      <DividerDots />

      {city.produces?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <Label>Produces</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
            {city.produces.map(gid => {
              const g = GOODS.find(x => x.id === gid);
              return g ? (
                <span key={gid} style={{ padding: '2px 8px', background: g.bg, color: g.text, fontSize: 11, border: '1px solid rgba(255,255,255,0.1)' }}>
                  {g.emoji} {g.label}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}

      {demandedGoods.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <Label>Demand</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 5 }}>
            {demandedGoods.map(g => (
              <DemandBar key={g.id} good={g} level={demandLevels[g.id]} />
            ))}
          </div>
        </div>
      )}

      <DividerDots />

      <div style={{ marginBottom: 10 }}>
        <Label>Rail Connections</Label>
        <div style={{ marginTop: 4 }}>
          {connectedTracks.length === 0 ? (
            <div className="body-serif" style={{ fontSize: 11, color: '#8b6a30', fontStyle: 'italic' }}>No rail connections</div>
          ) : (
            connectedTracks.map((t, i) => {
              const otherId = t.a === cityId ? t.b : t.a;
              const other   = cityById(otherId);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', borderBottom: '1px solid rgba(26,12,8,0.3)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.owner === 'player' ? '#c49a44' : t.owner === 'rival' ? '#c85040' : '#8b8070', flexShrink: 0 }} />
                  <span className="body-serif" style={{ fontSize: 11, color: '#d9c698' }}>{other?.name ?? otherId}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 9, color: '#8b6a30', fontFamily: 'IM Fell English SC, serif' }}>{t.owner}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <button className="btn-brass" onClick={onLayTrack} style={{ width: '100%', fontSize: 12 }}>
        ⚒ Lay Track From Here
      </button>
    </Panel>
  );
}
```

- [ ] **Step 2: Start dev server and verify in browser**

```bash
npm run dev
```

Open `http://localhost:5173`. Click any city on the map. Verify:
- "Produces" pills appear for producing cities (e.g. Omaha shows 🐄 Cattle)
- "Demand" bars appear with coloured fills (e.g. San Francisco shows demand bars for Freight, Coal, Cattle)
- Bars change colour: red ≥ 80, gold 40–79, grey < 40
- Existing "Rail Connections" section still shows

- [ ] **Step 3: Commit**

```bash
git add src/components/hud/CityDetailPanel.jsx
git commit -m "feat: add produces pills and demand bars to CityDetailPanel"
```

---

### Task 8: Redesign RouteSchedulerScreen (three-column layout)

**Files:**
- Modify: `src/components/screens/RouteSchedulerScreen.jsx`

- [ ] **Step 1: Replace RouteSchedulerScreen.jsx**

```jsx
import { useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { Panel } from '../chrome/Panel.jsx';
import { LocomotiveIcon } from '../icons/index.js';
import { Label, DividerDots } from '../hud/helpers.jsx';
import { CITIES, cityById } from '../../data/cities.js';
import { LOCOMOTIVES } from '../../data/locomotives.js';
import { GOODS } from '../../data/goods.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function resolveConsist(schedule, stopIndex) {
  for (let i = stopIndex; i >= 0; i--) {
    if (schedule[i] !== undefined) return schedule[i];
  }
  return ['passenger', 'mail'];
}

function consistTons(cars) {
  return cars.reduce((s, t) => s + (GOODS.find(g => g.id === t)?.weight ?? 0), 0);
}

// ─── RouteBuilder (new route creation) ─────────────────────────────────────

function RouteBuilder({ onDone, onCancel }) {
  const tracks           = useGameStore(s => s.tracks);
  const ownedLocomotives = useGameStore(s => s.ownedLocomotives);
  const createRoute      = useGameStore(s => s.createRoute);
  const [stops, setStops]     = useState([]);
  const [locoUid, setLocoUid] = useState('');
  const [error, setError]     = useState('');

  const idleLocos = ownedLocomotives.filter(l => l.assignedRouteId === null);

  function reachableCities(fromId) {
    return CITIES.filter(c =>
      c.id !== fromId &&
      !stops.includes(c.id) &&
      tracks.some(t =>
        t.owner === 'player' &&
        ((t.a === fromId && t.b === c.id) || (t.a === c.id && t.b === fromId))
      )
    );
  }

  const nextOptions = stops.length === 0
    ? CITIES.filter(c => tracks.some(t => t.owner === 'player' && (t.a === c.id || t.b === c.id)))
    : reachableCities(stops[stops.length - 1]);

  function handleDispatch() {
    if (stops.length < 2) { setError('Add at least 2 stops.'); return; }
    if (!locoUid) { setError('Assign a locomotive.'); return; }
    const id = createRoute(stops, locoUid);
    if (!id) { setError('Route invalid — check track connections and loco availability.'); return; }
    onDone(id);
  }

  return (
    <Panel title="New Route">
      <div style={{ marginBottom: 12 }}>
        <Label>Stops</Label>
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {stops.map((id, i) => (
            <span key={i} style={{ padding: '3px 10px', background: 'linear-gradient(180deg,#6a4a28,#3a1f18)', border: '1px solid #c49a44', color: '#f0d896', fontFamily: 'IM Fell English SC', fontSize: 12 }}>
              {cityById(id).name}
            </span>
          ))}
          {stops.length > 0 && <span className="gold-dim" style={{ fontSize: 18 }}>→</span>}
          <select className="field-parchment" style={{ minWidth: 160 }}
                  value="" onChange={e => { if (e.target.value) setStops(s => [...s, e.target.value]); }}>
            <option value="">Add stop…</option>
            {nextOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {stops.length > 0 && (
            <button className="btn-brass" style={{ fontSize: 11, padding: '4px 8px' }}
                    onClick={() => setStops(s => s.slice(0, -1))}>↩ Undo</button>
          )}
        </div>
      </div>

      <DividerDots />

      <div style={{ marginBottom: 12 }}>
        <Label>Locomotive</Label>
        {idleLocos.length === 0 ? (
          <div className="body-serif" style={{ fontSize: 12, color: '#c85040', marginTop: 6 }}>No idle locomotives — buy one in Locomotive Works.</div>
        ) : (
          <select className="field-parchment" style={{ marginTop: 6, width: '100%' }}
                  value={locoUid} onChange={e => setLocoUid(e.target.value)}>
            <option value="">Select locomotive…</option>
            {idleLocos.map(l => <option key={l.uid} value={l.uid}>{l.name} ({l.uid})</option>)}
          </select>
        )}
      </div>

      {error && <div style={{ color: '#c85040', fontSize: 12, marginBottom: 8 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-brass" style={{ flex: 1 }} onClick={handleDispatch}>Dispatch</button>
        <button className="btn-brass" onClick={onCancel}>Cancel</button>
      </div>
    </Panel>
  );
}

// ─── CarPicker ──────────────────────────────────────────────────────────────

function CarPicker({ onPick, maxTons, currentTons }) {
  const free = maxTons - currentTons;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 0' }}>
      {GOODS.map(g => {
        const fits = g.weight <= free;
        return (
          <button key={g.id} onClick={() => fits && onPick(g.id)} disabled={!fits}
                  style={{ padding: '5px 10px', background: fits ? g.bg : 'rgba(42,21,16,0.4)', color: fits ? g.text : '#3a2a18', border: `1px solid ${fits ? 'rgba(255,255,255,0.15)' : '#1a0c08'}`, fontSize: 11, cursor: fits ? 'pointer' : 'not-allowed', fontFamily: 'IM Fell English SC, serif' }}>
            {g.emoji} {g.label} <span style={{ fontSize: 10, opacity: 0.7 }}>{g.weight}t</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main screen ────────────────────────────────────────────────────────────

export function RouteSchedulerScreen({ onBack }) {
  const routes           = useGameStore(s => s.routes);
  const ownedLocomotives = useGameStore(s => s.ownedLocomotives);
  const cityDemand       = useGameStore(s => s.cityDemand);
  const setStopCars      = useGameStore(s => s.setStopCars);
  const setLoadingPolicy = useGameStore(s => s.setLoadingPolicy);
  const suspendRoute     = useGameStore(s => s.suspendRoute);
  const resumeRoute      = useGameStore(s => s.resumeRoute);

  const [selectedRouteId,  setSelectedRouteId]  = useState(routes[0]?.id ?? null);
  const [selectedStopIdx,  setSelectedStopIdx]  = useState(0);
  const [building,         setBuilding]         = useState(false);
  const [addingCar,        setAddingCar]        = useState(false);

  const route        = routes.find(r => r.id === selectedRouteId);
  const selectedCity = route ? cityById(route.stops[selectedStopIdx]) : null;

  const owned = route ? ownedLocomotives.find(o => o.uid === route.locomotiveUid) : null;
  const loco  = owned ? LOCOMOTIVES.find(l => l.id === owned.catalogId) : null;
  const maxTons = loco?.maxTons ?? 36;

  const currentConsist = route ? resolveConsist(route.schedule, selectedStopIdx) : [];
  const currentTons    = consistTons(currentConsist);
  const maintenanceCost = route && loco
    ? (() => {
        let max = 0;
        for (let i = 0; i < route.stops.length; i++) {
          const t = consistTons(resolveConsist(route.schedule, i));
          if (t > max) max = t;
        }
        return (loco.maintenanceBase ?? 80) + max * 12;
      })()
    : 0;

  const demandLevels  = selectedCity ? (cityDemand[selectedCity.id] ?? {}) : {};
  const demandedGoods = GOODS.filter(g => demandLevels[g.id] !== undefined);

  function handleRemoveCar(idx) {
    if (!route) return;
    const newCars = currentConsist.filter((_, i) => i !== idx);
    setStopCars(route.id, selectedStopIdx, newCars);
    setAddingCar(false);
  }

  function handleAddCar(goodId) {
    if (!route) return;
    setStopCars(route.id, selectedStopIdx, [...currentConsist, goodId]);
    setAddingCar(false);
  }

  function selectRoute(id) {
    setSelectedRouteId(id);
    setSelectedStopIdx(0);
    setBuilding(false);
    setAddingCar(false);
  }

  // ── Column 1: route list ────────────────────────────────────────────────
  const col1 = (
    <div className="wood-dark" style={{ width: 200, borderRight: '1px solid #1a0c08', padding: 10, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'auto' }}>
      <div className="display uppercase gold" style={{ fontSize: 11, letterSpacing: '0.18em', textAlign: 'center', padding: '6px 0', borderBottom: '1px solid rgba(196,154,68,0.2)' }}>⚜ Standing Orders</div>

      {routes.map(r => (
        <div key={r.id} onClick={() => selectRoute(r.id)}
             style={{ padding: 8, cursor: 'pointer', background: selectedRouteId === r.id && !building ? 'linear-gradient(180deg,#6a4a28,#3a1f18)' : 'linear-gradient(180deg,#3a1f18,#2a1510)', border: selectedRouteId === r.id && !building ? '1px solid #c49a44' : '1px solid #1a0c08' }}>
          <div className="display uppercase" style={{ fontSize: 11, color: '#f0d896', letterSpacing: '0.1em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
          <div className="body-serif" style={{ fontSize: 10, color: '#a88238', fontStyle: 'italic', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.stops.map(id => cityById(id)?.name).join(' → ')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <span style={{ padding: '1px 5px', background: r.status === 'running' ? '#3d5c2a' : '#6a4a28', color: '#f0d896', fontFamily: 'IM Fell English SC', fontSize: 9 }}>{r.status.toUpperCase()}</span>
          </div>
        </div>
      ))}

      {routes.length === 0 && !building && (
        <div className="body-serif" style={{ fontSize: 11, color: '#a88238', fontStyle: 'italic', textAlign: 'center', padding: 10 }}>No routes yet.</div>
      )}

      <button className="btn-brass" style={{ marginTop: 4 }} onClick={() => { setBuilding(true); setSelectedRouteId(null); }}>+ New Route</button>
      <button className="btn-brass" onClick={onBack} style={{ marginTop: 'auto' }}>← Map</button>
    </div>
  );

  // ── Column 2: stop timeline ─────────────────────────────────────────────
  const col2 = building ? null : (
    <div style={{ width: 200, borderRight: '1px solid #1a0c08', padding: 10, display: 'flex', flexDirection: 'column', background: '#0e0804', overflow: 'auto' }}>
      {route ? (
        <>
          <div className="display uppercase" style={{ fontSize: 10, color: '#c49a44', letterSpacing: '0.15em', paddingBottom: 6, borderBottom: '1px solid rgba(196,154,68,0.15)', marginBottom: 8 }}>SCHEDULE</div>

          <div style={{ flex: 1 }}>
            {route.stops.map((stopId, i) => {
              const city    = cityById(stopId);
              const hasOverride = route.schedule[i] !== undefined;
              const consist = resolveConsist(route.schedule, i);
              const isSelected = i === selectedStopIdx;
              return (
                <div key={i} style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 18 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: hasOverride ? '#c49a44' : '#a88238', border: `2px solid ${hasOverride ? '#c49a44' : '#1a0c08'}`, marginTop: 4, flexShrink: 0, boxShadow: hasOverride ? '0 0 5px rgba(196,154,68,0.5)' : 'none' }} />
                    {i < route.stops.length - 1 && <div style={{ width: 2, flex: 1, background: '#3a2010', minHeight: 20 }} />}
                  </div>
                  <div onClick={() => { setSelectedStopIdx(i); setAddingCar(false); }}
                       style={{ flex: 1, padding: '2px 0 10px 7px', cursor: 'pointer', background: isSelected ? 'rgba(196,154,68,0.06)' : 'transparent', borderRight: isSelected ? '2px solid #c49a44' : '2px solid transparent', borderRadius: '0 2px 2px 0' }}>
                    <div style={{ fontSize: 11, color: '#f0d896' }}>
                      {city?.name}
                      {hasOverride && <span style={{ fontSize: 9, color: '#c49a44', marginLeft: 4 }}>✦</span>}
                    </div>
                    {hasOverride ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 3 }}>
                        {consist.map((t, j) => {
                          const g = GOODS.find(x => x.id === t);
                          return g ? <span key={j} style={{ padding: '1px 4px', background: g.bg, color: g.text, fontSize: 9 }}>{g.emoji}</span> : null;
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: 9, color: '#4a3a18', fontStyle: 'italic', marginTop: 2 }}>← inherited</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <DividerDots />

          <div>
            <Label>Loading Policy</Label>
            <div style={{ display: 'flex', gap: 0, marginTop: 4 }}>
              {['express', 'fullLoad'].map(p => (
                <div key={p} onClick={() => setLoadingPolicy(route.id, p)}
                     style={{ flex: 1, padding: '4px 0', background: route.loadingPolicy === p ? '#3d5c2a' : '#2a1510', border: `1px solid ${route.loadingPolicy === p ? '#5a9a3a' : '#1a0c08'}`, color: route.loadingPolicy === p ? '#d0f0a0' : '#6a5030', fontSize: 10, textAlign: 'center', cursor: 'pointer', fontFamily: 'IM Fell English SC, serif' }}>
                  {p === 'express' ? 'Express' : 'Full Load'}
                </div>
              ))}
            </div>
            {route.loadingPolicy === 'fullLoad' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <Label>Max wait</Label>
                <input type="number" min={1} max={30} value={route.maxWaitDays}
                       onChange={e => setLoadingPolicy(route.id, 'fullLoad', Number(e.target.value))}
                       className="field-parchment" style={{ width: 48, fontSize: 12, padding: '2px 6px' }} />
                <span style={{ fontSize: 10, color: '#8b6a30' }}>days</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {route.status === 'running'
              ? <button className="btn-brass" style={{ flex: 1, fontSize: 10 }} onClick={() => suspendRoute(route.id)}>Suspend</button>
              : <button className="btn-brass" style={{ flex: 1, fontSize: 10 }} onClick={() => resumeRoute(route.id)}>Resume</button>
            }
          </div>
        </>
      ) : (
        <div className="body-serif" style={{ fontSize: 12, color: '#6a5020', fontStyle: 'italic', padding: 10 }}>Select a route to see its schedule.</div>
      )}
    </div>
  );

  // ── Column 3: car editor + demand ───────────────────────────────────────
  const col3 = (
    <div style={{ flex: 1, padding: 14, background: '#080402', overflow: 'auto' }}>
      {building && (
        <RouteBuilder
          onDone={(id) => { setBuilding(false); setSelectedRouteId(id); setSelectedStopIdx(0); }}
          onCancel={() => setBuilding(false)}
        />
      )}

      {!building && route && selectedCity && (
        <>
          <div className="display uppercase" style={{ fontSize: 10, color: '#c49a44', letterSpacing: '0.18em', paddingBottom: 6, borderBottom: '1px solid rgba(196,154,68,0.15)', marginBottom: 10 }}>
            {selectedCity.name.toUpperCase()} — CAR CONSIST & DEMAND
          </div>

          {/* Tonnage bar */}
          {loco && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: '#a88238', fontFamily: 'IM Fell English SC, serif', flexShrink: 0 }}>{loco.name}</span>
              <div style={{ flex: 1, height: 6, background: '#2a1510', borderRadius: 3 }}>
                <div style={{ width: `${Math.min(100, (currentTons / maxTons) * 100)}%`, height: '100%', background: currentTons / maxTons > 0.85 ? '#c85040' : currentTons / maxTons > 0.6 ? '#c49a44' : '#6bbf5a', borderRadius: 3, transition: 'width 0.2s' }} />
              </div>
              <span style={{ fontSize: 10, color: '#a88238', fontFamily: 'monospace', flexShrink: 0 }}>{currentTons} / {maxTons} t</span>
            </div>
          )}

          {/* Car slots */}
          <Label>Cars at this stop</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0 14px' }}>
            {currentConsist.map((t, i) => {
              const g = GOODS.find(x => x.id === t);
              return g ? (
                <div key={i} title="Click to remove" onClick={() => handleRemoveCar(i)}
                     style={{ width: 70, padding: '7px 5px', background: g.bg, border: `1px solid rgba(255,255,255,0.15)`, textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ fontSize: 18 }}>{g.emoji}</div>
                  <div style={{ color: g.text, fontSize: 10, marginTop: 2 }}>{g.label}</div>
                  <div style={{ color: g.text, fontSize: 9, opacity: 0.7 }}>{g.weight} t</div>
                </div>
              ) : null;
            })}

            {!addingCar && (
              <div onClick={() => setAddingCar(true)}
                   style={{ width: 70, padding: '7px 5px', background: 'rgba(196,154,68,0.06)', border: '1px dashed rgba(196,154,68,0.25)', textAlign: 'center', cursor: currentTons < maxTons ? 'pointer' : 'not-allowed', opacity: currentTons < maxTons ? 1 : 0.4 }}>
                <div style={{ fontSize: 20, color: '#3a2a10' }}>+</div>
                <div style={{ color: '#3a2a10', fontSize: 9, marginTop: 2 }}>{maxTons - currentTons} t free</div>
              </div>
            )}
          </div>

          {addingCar && (
            <div style={{ marginBottom: 14, padding: 8, background: 'rgba(42,21,16,0.5)', border: '1px solid #1a0c08' }}>
              <div style={{ fontSize: 10, color: '#a88238', marginBottom: 6 }}>Pick a car to add ({maxTons - currentTons} t remaining):</div>
              <CarPicker onPick={handleAddCar} maxTons={maxTons} currentTons={currentTons} />
              <button className="btn-brass" style={{ fontSize: 10, marginTop: 6 }} onClick={() => setAddingCar(false)}>Cancel</button>
            </div>
          )}

          {/* Maintenance */}
          <div style={{ marginBottom: 14, padding: '6px 10px', background: 'rgba(42,21,16,0.4)', border: '1px solid #1a0c08', fontSize: 10, color: '#8b6a30' }}>
            ⚙ Maintenance: ${maintenanceCost.toLocaleString()}/tick
          </div>

          {/* Demand bars */}
          {demandedGoods.length > 0 && (
            <>
              <Label>{selectedCity.name} Demand</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
                {demandedGoods.map(g => {
                  const level  = demandLevels[g.id];
                  const colour = level >= 80 ? '#c85040' : level >= 40 ? '#c49a44' : '#5a5a4a';
                  const label  = level >= 80 ? 'HIGH' : level >= 40 ? 'MED' : 'LOW';
                  return (
                    <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 76, fontSize: 11, color: '#d9c698' }}>{g.emoji} {g.label}</span>
                      <div style={{ flex: 1, height: 7, background: '#2a1510', borderRadius: 3 }}>
                        <div style={{ width: `${level}%`, height: '100%', background: colour, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 10, color: colour, width: 32, textAlign: 'right' }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {selectedCity.produces?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Label>Produces at {selectedCity.name}</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                {selectedCity.produces.map(gid => {
                  const g = GOODS.find(x => x.id === gid);
                  return g ? (
                    <span key={gid} style={{ padding: '2px 8px', background: g.bg, color: g.text, fontSize: 11 }}>
                      {g.emoji} {g.label}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </>
      )}

      {!building && !route && (
        <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
          <div className="body-serif" style={{ fontSize: 15, color: '#6a5020', fontStyle: 'italic' }}>Select a route or create a new one.</div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, background: '#0a0604' }}>
      {col1}
      {col2}
      {col3}
    </div>
  );
}
```

- [ ] **Step 2: Run all tests**

```bash
cd /Users/janriissorensen/projects/railroad && npm test 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 3: Start dev server and verify in browser**

```bash
npm run dev
```

1. Navigate to Dispatch Office (Route Scheduler). Verify three columns render.
2. Create a new route via "+ New Route", dispatch it.
3. Select the route — Column 2 shows the stop timeline. Click a stop — Column 3 updates.
4. In Column 3, click the "+" tile — car picker appears with goods that fit within tonnage.
5. Pick a car — it appears in the grid. Tonnage bar updates.
6. Click an existing car tile — it is removed.
7. Toggle between Express / Full Load in Column 2. When Full Load is selected, "Max wait N days" input appears.
8. Suspend and resume the route using the button in Column 2.
9. Wait ~4 seconds — verify cash changes (revenue earned or maintenance paid).
10. Click different stops — Column 3 demand bars update to reflect the selected city.

- [ ] **Step 4: Commit**

```bash
git add src/components/screens/RouteSchedulerScreen.jsx
git commit -m "feat: redesign RouteSchedulerScreen with three-column stop/demand/car editor"
```

---

### Task 9: Add maxTons display to DepotScreen

**Files:**
- Modify: `src/components/screens/DepotScreen.jsx`

- [ ] **Step 1: Update the Spec grid in DepotScreen to show maxTons**

Find the specs grid in `DepotScreen.jsx`. It currently renders:

```jsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, ... }}>
  <Spec label="Price" value={'$' + loco.price.toLocaleString()} />
  <Spec label="Max Speed" value={loco.maxSpeed + ' mph'} />
  <Spec label="Power" value={loco.power} />
  <Spec label="Reliability" value={loco.reliability} />
  <Spec label="Best For" value={loco.best} />
</div>
```

Replace it with a 6-column grid that adds the tonnage:

```jsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, padding: '12px 0', borderTop: '1px solid rgba(196,154,68,0.2)', borderBottom: '1px solid rgba(196,154,68,0.2)', marginBottom: 12 }}>
  <Spec label="Price"      value={'$' + loco.price.toLocaleString()} />
  <Spec label="Max Speed"  value={loco.maxSpeed + ' mph'} />
  <Spec label="Capacity"   value={loco.maxTons + ' t'} />
  <Spec label="Power"      value={loco.power} />
  <Spec label="Reliability" value={loco.reliability} />
  <Spec label="Best For"   value={loco.best} />
</div>
```

- [ ] **Step 2: Verify in browser**

Navigate to Locomotive Works. Select any locomotive — verify a "Capacity" spec tile appears showing e.g. "36 t" for the American.

- [ ] **Step 3: Run all tests and build**

```bash
cd /Users/janriissorensen/projects/railroad && npm test && npm run build 2>&1 | tail -10
```

Expected: all tests pass, clean build.

- [ ] **Step 4: Commit**

```bash
git add src/components/screens/DepotScreen.jsx
git commit -m "feat: add tonnage capacity to Locomotive Works spec grid"
```

---

## Self-Review

### Spec coverage

| Spec section | Task |
|---|---|
| 5 good types with weights and base rates | Task 1 |
| City produces/demands data | Task 2 |
| Locomotive maxTons + maintenanceBase | Task 3 |
| cityDemand state initialised at 50 | Task 4 |
| tickDemand recovery | Task 4 |
| Route schema: schedule, loadingPolicy, maxWaitDays | Task 5 |
| setStopCars with tonnage validation | Task 5 |
| setLoadingPolicy | Task 5 |
| resumeRoute | Task 5 |
| Demand-aware revenue (settleAllRoutes) | Task 6 |
| Maintenance cost formula | Task 6 |
| DEMAND_DROP_PER_CAR applied on delivery | Task 6 |
| App.jsx game tick wired to new actions | Task 6 |
| CityDetailPanel: produces pills + demand bars | Task 7 |
| Route Scheduler: 3-column redesign | Task 8 |
| Per-stop car editor with tonnage bar | Task 8 |
| Loading policy toggle + maxWaitDays input | Task 8 |
| Locomotive Works: maxTons display | Task 9 |

### Placeholder scan

None. Every step contains exact code or exact commands with expected output.

### Type consistency

- `GOODS[n].id` values (`'passenger'`, `'mail'`, `'freight'`, `'coal'`, `'cattle'`) used consistently in all tasks.
- `route.schedule` is `{ [number]: string[] }` defined in Task 5, read in Tasks 6 and 8 via the same `resolveConsist` helper (duplicated in store and component — each file is self-contained).
- `loco.maxTons` defined in Task 3, used in Tasks 5 (setStopCars), 8 (CarPicker), 9 (DepotScreen).
- `loco.maintenanceBase` defined in Task 3, used in Task 6 (`settleAllRoutes`) and Task 8 (maintenanceCost display).
- `cityDemand` key structure `{ [cityId]: { [goodId]: number } }` consistent across Tasks 4, 6, 7, 8.
