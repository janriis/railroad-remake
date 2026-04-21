# Iron Empire MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable Railroad Tycoon-style game — lay track, buy locos, assign routes, earn revenue.

**Architecture:** Vite + React. Zustand store owns all mutable state. Components are thin readers. SVG map is the core visual; HUD panels float over it as DOM.

**Tech Stack:** Vite 6, React 18, Zustand 5, Vitest

**Prototype source:** `/tmp/railroad-game/project/` — reference for all visual components.

**Port rule for visual components:** Copy JSX from prototype, replace `const { useState } = React` with `import { useState } from 'react'`, replace global variable reads with named imports, replace `Object.assign(window, {...})` with named exports.

---

### Task 1: Scaffold project

**Files:**
- Create: `vite.config.js`
- Create: `package.json` (via npm)
- Create: `src/styles.css`
- Create: `src/main.jsx`
- Create: `index.html`

- [ ] **Step 1: Init Vite project**

```bash
cd /Users/janriissorensen/projects/railroad
npm create vite@latest . -- --template react --yes
npm install zustand
npm install -D vitest
```

- [ ] **Step 2: Configure Vitest in vite.config.js**

Replace `vite.config.js` with:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
  },
});
```

- [ ] **Step 3: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Copy prototype CSS**

Copy the full contents of `/tmp/railroad-game/project/styles.css` into `src/styles.css` verbatim.

- [ ] **Step 5: Replace src/main.jsx**

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 6: Replace index.html title**

Change `<title>` to `Iron Empire — Railroad Tycoon`.

- [ ] **Step 7: Delete boilerplate**

```bash
rm -f src/App.css src/index.css
rm -rf src/assets
```

- [ ] **Step 8: Verify dev server starts**

```bash
npm run dev
```
Expected: Vite starts on `http://localhost:5173`. Browser shows blank page (no errors in console).

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: scaffold Vite + React project"
```

---

### Task 2: Data files + geometry utils

**Files:**
- Create: `src/data/cities.js`
- Create: `src/data/tracks.js`
- Create: `src/data/locomotives.js`
- Create: `src/data/news.js`
- Create: `src/data/trains.js`
- Create: `src/utils/geometry.js`

- [ ] **Step 1: Create src/data/cities.js**

```js
export const CITIES = [
  { id: 'sf',  name: 'San Francisco', x: 110,  y: 480, size: 'metro', pop: '149,473', state: 'CAL' },
  { id: 'sac', name: 'Sacramento',    x: 175,  y: 440, size: 'city',  pop: '21,420',  state: 'CAL' },
  { id: 'lax', name: 'Los Angeles',   x: 200,  y: 620, size: 'city',  pop: '11,183',  state: 'CAL' },
  { id: 'slc', name: 'Salt Lake City',x: 420,  y: 430, size: 'city',  pop: '20,768',  state: 'UTH' },
  { id: 'den', name: 'Denver',        x: 590,  y: 460, size: 'city',  pop: '35,629',  state: 'COL' },
  { id: 'chy', name: 'Cheyenne',      x: 620,  y: 400, size: 'town',  pop: '3,456',   state: 'WYO' },
  { id: 'abq', name: 'Albuquerque',   x: 620,  y: 580, size: 'town',  pop: '2,315',   state: 'NM'  },
  { id: 'epa', name: 'El Paso',       x: 650,  y: 680, size: 'town',  pop: '736',     state: 'TEX' },
  { id: 'kc',  name: 'Kansas City',   x: 850,  y: 500, size: 'city',  pop: '55,785',  state: 'MO'  },
  { id: 'omh', name: 'Omaha',         x: 850,  y: 430, size: 'city',  pop: '30,518',  state: 'NEB' },
  { id: 'stl', name: 'St. Louis',     x: 960,  y: 520, size: 'metro', pop: '310,864', state: 'MO'  },
  { id: 'dal', name: 'Dallas',        x: 890,  y: 640, size: 'town',  pop: '10,358',  state: 'TEX' },
  { id: 'hou', name: 'Houston',       x: 930,  y: 720, size: 'town',  pop: '16,513',  state: 'TEX' },
  { id: 'nol', name: 'New Orleans',   x: 1060, y: 720, size: 'metro', pop: '216,090', state: 'LA'  },
  { id: 'chi', name: 'Chicago',       x: 1040, y: 400, size: 'metro', pop: '503,185', state: 'ILL' },
  { id: 'det', name: 'Detroit',       x: 1150, y: 360, size: 'city',  pop: '116,340', state: 'MICH'},
  { id: 'cle', name: 'Cleveland',     x: 1210, y: 390, size: 'city',  pop: '92,829',  state: 'OHIO'},
  { id: 'pit', name: 'Pittsburgh',    x: 1260, y: 420, size: 'city',  pop: '86,076',  state: 'PENN'},
  { id: 'atl', name: 'Atlanta',       x: 1180, y: 620, size: 'city',  pop: '37,409',  state: 'GA'  },
  { id: 'cha', name: 'Charleston',    x: 1280, y: 650, size: 'town',  pop: '48,956',  state: 'SC'  },
  { id: 'dc',  name: 'Washington',    x: 1350, y: 470, size: 'city',  pop: '109,199', state: 'DC'  },
  { id: 'bal', name: 'Baltimore',     x: 1380, y: 450, size: 'city',  pop: '267,354', state: 'MD'  },
  { id: 'phi', name: 'Philadelphia',  x: 1410, y: 430, size: 'metro', pop: '674,022', state: 'PENN'},
  { id: 'nyc', name: 'New York',      x: 1450, y: 400, size: 'metro', pop: '942,292', state: 'NY'  },
  { id: 'bos', name: 'Boston',        x: 1490, y: 340, size: 'metro', pop: '250,526', state: 'MASS'},
  { id: 'buf', name: 'Buffalo',       x: 1320, y: 340, size: 'city',  pop: '117,714', state: 'NY'  },
];

export function cityById(id) {
  return CITIES.find(c => c.id === id);
}
```

- [ ] **Step 2: Create src/data/tracks.js**

```js
export const INITIAL_TRACKS = [
  { a: 'sf',  b: 'sac', owner: 'player'  },
  { a: 'sac', b: 'slc', owner: 'player'  },
  { a: 'slc', b: 'chy', owner: 'player'  },
  { a: 'chy', b: 'omh', owner: 'player'  },
  { a: 'omh', b: 'chi', owner: 'player'  },
  { a: 'chi', b: 'det', owner: 'player'  },
  { a: 'chi', b: 'stl', owner: 'player'  },
  { a: 'stl', b: 'kc',  owner: 'player'  },
  { a: 'kc',  b: 'den', owner: 'rival'   },
  { a: 'den', b: 'slc', owner: 'rival'   },
  { a: 'den', b: 'abq', owner: 'rival'   },
  { a: 'abq', b: 'epa', owner: 'rival'   },
  { a: 'stl', b: 'nol', owner: 'rival'   },
  { a: 'dal', b: 'hou', owner: 'rival'   },
  { a: 'hou', b: 'nol', owner: 'rival'   },
  { a: 'det', b: 'cle', owner: 'player'  },
  { a: 'cle', b: 'pit', owner: 'player'  },
  { a: 'pit', b: 'phi', owner: 'player'  },
  { a: 'phi', b: 'nyc', owner: 'player'  },
  { a: 'nyc', b: 'bos', owner: 'player'  },
  { a: 'nyc', b: 'buf', owner: 'neutral' },
  { a: 'buf', b: 'cle', owner: 'neutral' },
  { a: 'phi', b: 'bal', owner: 'neutral' },
  { a: 'bal', b: 'dc',  owner: 'neutral' },
  { a: 'dc',  b: 'atl', owner: 'neutral' },
  { a: 'atl', b: 'cha', owner: 'neutral' },
];
```

- [ ] **Step 3: Create src/data/locomotives.js**

```js
export const LOCOMOTIVES = [
  {
    id: 'americ', name: '4-4-0 "American"', years: '1860–1880',
    price: 18500, maxSpeed: 60, power: 'Medium', reliability: 'High',
    best: 'Passenger', era: 'Golden Age',
    description: 'The most common locomotive of the Civil War era. Versatile, reliable, and handsome in her livery.',
    availability: 'Available',
  },
  {
    id: 'mogul', name: '2-6-0 "Mogul"', years: '1866–1890',
    price: 24800, maxSpeed: 45, power: 'High', reliability: 'High',
    best: 'Freight', era: 'Golden Age',
    description: 'A brute of a freight hauler. Six driving wheels give her tremendous pulling power over the plains.',
    availability: 'Available',
  },
  {
    id: 'tenwh', name: '4-6-0 "Ten-Wheeler"', years: '1868–1895',
    price: 31200, maxSpeed: 55, power: 'High', reliability: 'Medium',
    best: 'Mixed', era: 'Golden Age',
    description: 'A compromise between speed and tractive force. Popular with express lines hauling long trains.',
    availability: 'Available',
  },
  {
    id: 'consol', name: '2-8-0 "Consolidation"', years: '1866–1900',
    price: 38400, maxSpeed: 40, power: 'Very High', reliability: 'High',
    best: 'Coal & Ore', era: 'Industrial',
    description: 'Eight driving wheels of iron fury. She will drag a mountain over the Rockies if you ask her.',
    availability: 'Available',
  },
  {
    id: 'atlan', name: '4-4-2 "Atlantic"', years: '1888–1910',
    price: 52000, maxSpeed: 85, power: 'Medium', reliability: 'Medium',
    best: 'Express Passenger', era: 'Modern',
    description: 'Latest from the Baldwin works. The fastest wheels in the west — and twice as expensive.',
    availability: 'Awaiting 1888',
  },
];
```

- [ ] **Step 4: Create src/data/news.js**

```js
export const NEWS = [
  '★ 1875 — GRAND OPENING of the Sacramento–Salt Lake extension ★',
  '◆ Union Pacific reports losses after Wyoming cattle strike ◆',
  '★ Gold discovered in Black Hills — prospectors flock west ★',
  '◆ New York & Erie Railroad stock rises 4¼ points ◆',
  '★ President Grant to address the Trunk Line Association ★',
  '◆ Steel rails cheaper this quarter by 12% per ton ◆',
  '★ Baldwin Locomotive Works unveils the 4-4-2 "Atlantic" ★',
  '◆ Bandits strike freight train near Albuquerque — no casualties ◆',
];
```

- [ ] **Step 5: Create src/data/trains.js**

```js
export const INITIAL_TRAINS = [
  {
    id: 'T-01', name: 'The Golden Spike', model: '4-4-0 American',
    route: ['sf', 'sac', 'slc', 'chy', 'omh'],
    leg: 1, progress: 0.34, speed: 0.00045,
    cars: ['mail', 'passenger', 'passenger', 'passenger'], color: '#c49a44',
  },
  {
    id: 'T-02', name: 'Prairie Schooner', model: '2-6-0 Mogul',
    route: ['chi', 'stl', 'kc'],
    leg: 0, progress: 0.62, speed: 0.00038,
    cars: ['freight', 'freight', 'cattle', 'cattle'], color: '#8b2818',
  },
  {
    id: 'T-03', name: 'Atlantic Express', model: '4-6-0 Ten-Wheeler',
    route: ['bos', 'nyc', 'phi', 'pit'],
    leg: 2, progress: 0.18, speed: 0.00055,
    cars: ['mail', 'passenger', 'passenger', 'passenger', 'passenger'], color: '#3d5c2a',
  },
  {
    id: 'T-04', name: 'Iron Duke', model: '2-8-0 Consolidation',
    route: ['pit', 'cle', 'det', 'chi'],
    leg: 1, progress: 0.71, speed: 0.00032,
    cars: ['coal', 'coal', 'coal', 'freight'], color: '#1e3a5c',
  },
  {
    id: 'T-05', name: 'Pioneer', model: '4-4-0 American',
    route: ['omh', 'chi'],
    leg: 0, progress: 0.45, speed: 0.00040,
    cars: ['passenger', 'passenger', 'mail'], color: '#6b4a88',
  },
];
```

- [ ] **Step 6: Create src/utils/geometry.js**

```js
export function curvyPath(x1, y1, x2, y2, curvature = 0.18, seed = 0) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const nx = -dy, ny = dx;
  const len = Math.hypot(nx, ny) || 1;
  const offset = curvature * (((seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 2;
  const cx = mx + (nx / len) * offset * len * 0.25;
  const cy = my + (ny / len) * offset * len * 0.25;
  return { d: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`, cx, cy };
}

export function bezierAt(x1, y1, cx, cy, x2, y2, t) {
  const mt = 1 - t;
  const x = mt * mt * x1 + 2 * mt * t * cx + t * t * x2;
  const y = mt * mt * y1 + 2 * mt * t * cy + t * t * y2;
  const tx = 2 * mt * (cx - x1) + 2 * t * (x2 - cx);
  const ty = 2 * mt * (cy - y1) + 2 * t * (y2 - cy);
  return { x, y, angle: Math.atan2(ty, tx) * 180 / Math.PI };
}

export function buildTrackGeo(tracks, cities) {
  return tracks.map((t, i) => {
    const a = cities.find(c => c.id === t.a);
    const b = cities.find(c => c.id === t.b);
    if (!a || !b) return null;
    const geo = curvyPath(a.x, a.y, b.x, b.y, 0.22, i + 3);
    return { ...t, ax: a.x, ay: a.y, bx: b.x, by: b.y, cx: geo.cx, cy: geo.cy, d: geo.d };
  }).filter(Boolean);
}
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add data files and geometry utils"
```

---

### Task 3: Game store + tests

**Files:**
- Create: `src/store/gameStore.js`
- Create: `src/store/gameStore.test.js`

- [ ] **Step 1: Create src/store/gameStore.js**

```js
import { create } from 'zustand';
import { CITIES, cityById } from '../data/cities';
import { INITIAL_TRACKS } from '../data/tracks';
import { INITIAL_TRAINS } from '../data/trains';
import { LOCOMOTIVES } from '../data/locomotives';

const TRACK_COST_PER_PIXEL = 3990;
const TRAIN_COLORS = ['#c49a44', '#8b2818', '#3d5c2a', '#1e3a5c', '#6b4a88', '#2a6b5c'];

let _routeCounter = 1;
let _locoCounter = 1;

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
};

export const useGameStore = create((set, get) => ({
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
}));
```

- [ ] **Step 2: Create src/store/gameStore.test.js**

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, INITIAL_STATE } from './gameStore';
import { INITIAL_TRACKS } from '../data/tracks';
import { INITIAL_TRAINS } from '../data/trains';

function reset() {
  useGameStore.setState({
    tracks: INITIAL_TRACKS.map(t => ({ ...t })),
    trains: INITIAL_TRAINS.map(t => ({ ...t })),
    ownedLocomotives: [],
    routes: [],
    cash: 428_650,
    netWorth: 2_840_000,
    trackLayingFrom: null,
    selectedCityId: null,
    focusTrainId: null,
    screen: 'map',
  });
}

describe('layTrack', () => {
  beforeEach(reset);

  it('adds a player track and deducts cost', () => {
    const before = useGameStore.getState().cash;
    const ok = useGameStore.getState().layTrack('sf', 'lax');
    const s = useGameStore.getState();
    expect(ok).toBe(true);
    expect(s.tracks.some(t => t.a === 'sf' && t.b === 'lax' && t.owner === 'player')).toBe(true);
    expect(s.cash).toBeLessThan(before);
  });

  it('rejects duplicate track', () => {
    const ok = useGameStore.getState().layTrack('sf', 'sac');
    expect(ok).toBe(false);
    expect(useGameStore.getState().tracks.filter(t =>
      (t.a === 'sf' && t.b === 'sac') || (t.a === 'sac' && t.b === 'sf')
    )).toHaveLength(1);
  });

  it('rejects if insufficient funds', () => {
    useGameStore.setState({ cash: 0 });
    expect(useGameStore.getState().layTrack('sf', 'lax')).toBe(false);
    expect(useGameStore.getState().cash).toBe(0);
  });

  it('clears trackLayingFrom on success', () => {
    useGameStore.setState({ trackLayingFrom: 'sf' });
    useGameStore.getState().layTrack('sf', 'lax');
    expect(useGameStore.getState().trackLayingFrom).toBeNull();
  });
});

describe('buyLocomotive', () => {
  beforeEach(reset);

  it('adds loco and deducts $18,500 for American', () => {
    const before = useGameStore.getState().cash;
    const uids = useGameStore.getState().buyLocomotive('americ');
    const s = useGameStore.getState();
    expect(uids).toHaveLength(1);
    expect(s.ownedLocomotives).toHaveLength(1);
    expect(s.ownedLocomotives[0].catalogId).toBe('americ');
    expect(s.cash).toBe(before - 18500);
  });

  it('buys qty=2 and deducts double price', () => {
    const before = useGameStore.getState().cash;
    useGameStore.getState().buyLocomotive('americ', 2);
    expect(useGameStore.getState().ownedLocomotives).toHaveLength(2);
    expect(useGameStore.getState().cash).toBe(before - 37000);
  });

  it('rejects era-locked Atlantic', () => {
    const uids = useGameStore.getState().buyLocomotive('atlan');
    expect(uids).toBeNull();
    expect(useGameStore.getState().ownedLocomotives).toHaveLength(0);
  });

  it('rejects when cash < price', () => {
    useGameStore.setState({ cash: 100 });
    expect(useGameStore.getState().buyLocomotive('americ')).toBeNull();
  });
});

describe('createRoute', () => {
  beforeEach(() => {
    reset();
    useGameStore.getState().buyLocomotive('americ');
  });

  it('creates running route, adds train, marks loco assigned', () => {
    const uid = useGameStore.getState().ownedLocomotives[0].uid;
    const routeId = useGameStore.getState().createRoute(['sf', 'sac', 'slc'], uid);
    const s = useGameStore.getState();
    expect(routeId).toBeTruthy();
    expect(s.routes[0].status).toBe('running');
    expect(s.routes[0].revenuePerTick).toBe(3 * 800);
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

describe('tickRevenue', () => {
  beforeEach(reset);

  it('adds revenuePerTick for running routes', () => {
    useGameStore.setState({ routes: [{ id: 'R-1', status: 'running', revenuePerTick: 2400 }] });
    const before = useGameStore.getState().cash;
    useGameStore.getState().tickRevenue();
    expect(useGameStore.getState().cash).toBe(before + 2400);
  });

  it('skips suspended routes', () => {
    useGameStore.setState({ routes: [{ id: 'R-1', status: 'suspended', revenuePerTick: 2400 }] });
    const before = useGameStore.getState().cash;
    useGameStore.getState().tickRevenue();
    expect(useGameStore.getState().cash).toBe(before);
  });
});
```

- [ ] **Step 3: Run tests — expect all to pass**

```bash
npm test
```
Expected: All 12 tests pass. If `layTrack('sf','lax')` fails with "insufficient funds", confirm `cash: 428_650` is in reset state.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add game store with tests"
```

---

### Task 4: Chrome components

**Files:**
- Create: `src/components/chrome/Filigree.jsx`
- Create: `src/components/chrome/Panel.jsx`
- Create: `src/components/chrome/TitleBar.jsx`
- Create: `src/components/chrome/Ticker.jsx`
- Create: `src/components/chrome/StatDisplay.jsx`
- Create: `src/components/chrome/index.js`

- [ ] **Step 1: Create Filigree, Panel, StatDisplay, Ticker**

Port from `/tmp/railroad-game/project/chrome.jsx`. Each component becomes its own file. Changes from prototype:
- Replace `const { useState } = React` → `import { useState } from 'react'`
- Replace `Object.assign(window, {...})` → named `export` on each function
- `TitleBar` receives `onNav, screen, company, onToggleHUD, hudVisible` props — same as prototype

`src/components/chrome/Filigree.jsx`:
```jsx
export function Filigree({ size = 28, rotate = 0, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28"
         style={{ transform: `rotate(${rotate}deg)`, ...style }}>
      <defs>
        <linearGradient id="fg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0d896"/>
          <stop offset="50%" stopColor="#c49a44"/>
          <stop offset="100%" stopColor="#6a4a28"/>
        </linearGradient>
      </defs>
      <g fill="url(#fg1)" stroke="#2a1510" strokeWidth="0.4">
        <path d="M2 2 L10 2 L10 4 L4 4 L4 10 L2 10 Z"/>
        <circle cx="4" cy="4" r="1.2"/>
        <path d="M6 6 Q10 6 12 10 Q13 13 16 13 Q14 11 13 8 Q12 5 8 5"/>
        <circle cx="12" cy="10" r="0.9"/>
        <path d="M5 12 Q8 14 8 18 Q10 16 12 17 Q11 14 9 12" opacity="0.8"/>
      </g>
    </svg>
  );
}
```

`src/components/chrome/Panel.jsx`:
```jsx
import { Filigree } from './Filigree.jsx';

export function Panel({ title, children, style = {}, bodyStyle = {}, actions, noPadding }) {
  return (
    <div className="wood-grain" style={{
      position: 'relative', border: '1px solid #1a0c08',
      boxShadow: 'inset 0 1px 0 rgba(255,200,140,0.15), inset 0 0 0 2px #2a1510, 0 6px 20px rgba(0,0,0,0.6)',
      display: 'flex', flexDirection: 'column', ...style,
    }}>
      {title && (
        <div className="panel-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Filigree size={18} />
            <span className="display uppercase gold" style={{ fontSize: 14, letterSpacing: '0.18em', textShadow: '0 1px 0 rgba(0,0,0,0.6)' }}>
              {title}
            </span>
          </div>
          {actions && <div style={{ display: 'flex', gap: 6 }}>{actions}</div>}
        </div>
      )}
      <div style={{ padding: noPadding ? 0 : 14, flex: 1, minHeight: 0, ...bodyStyle }}>
        {children}
      </div>
      <div style={{ position: 'absolute', top: 2, left: 2, pointerEvents: 'none' }}><Filigree size={14} /></div>
      <div style={{ position: 'absolute', top: 2, right: 2, pointerEvents: 'none' }}><Filigree size={14} rotate={90} /></div>
      <div style={{ position: 'absolute', bottom: 2, left: 2, pointerEvents: 'none' }}><Filigree size={14} rotate={-90} /></div>
      <div style={{ position: 'absolute', bottom: 2, right: 2, pointerEvents: 'none' }}><Filigree size={14} rotate={180} /></div>
    </div>
  );
}
```

`src/components/chrome/StatDisplay.jsx`:
```jsx
export function StatDisplay({ label, value, delta, big }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div className="display uppercase" style={{ fontSize: 9, color: '#8b6a30', letterSpacing: '0.2em' }}>{label}</div>
      <div className="numeric gold" style={{ fontSize: big ? 18 : 15, color: big ? '#f0d896' : '#e4c470', textShadow: '0 1px 0 rgba(0,0,0,0.8)', lineHeight: 1.1 }}>
        {value}
        {delta != null && (
          <span style={{ fontSize: 11, marginLeft: 6, color: delta >= 0 ? '#6bbf5a' : '#c85040' }}>
            {delta >= 0 ? '▲' : '▼'}{Math.abs(delta).toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}
```

`src/components/chrome/Ticker.jsx`:
```jsx
export function Ticker({ items }) {
  const doubled = [...items, ...items];
  return (
    <div style={{ borderTop: '1px solid #1a0c08', borderBottom: '1px solid #1a0c08', background: 'linear-gradient(180deg, #2a1510, #1a0c08)', height: 26, overflow: 'hidden', display: 'flex', alignItems: 'center', position: 'relative' }}>
      <div style={{ padding: '0 14px', background: 'linear-gradient(180deg, #6a4a28, #3a1f18)', height: '100%', display: 'flex', alignItems: 'center', borderRight: '1px solid #1a0c08', boxShadow: 'inset 0 1px 0 rgba(255,200,140,0.15)', flexShrink: 0 }}>
        <span className="display uppercase" style={{ fontSize: 11, color: '#f0d896', letterSpacing: '0.18em' }}>⚜ Telegraph ⚜</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div className="ticker-track" style={{ padding: '0 20px' }}>
          {doubled.map((item, i) => (
            <span key={i} className="body-serif gold-dim" style={{ fontSize: 13, padding: '0 40px', whiteSpace: 'nowrap' }}>{item}</span>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 60, background: 'linear-gradient(90deg, transparent, #1a0c08)', pointerEvents: 'none' }}/>
    </div>
  );
}
```

- [ ] **Step 2: Create TitleBar**

`src/components/chrome/TitleBar.jsx` — port from prototype `chrome.jsx`. The component reads company data via props (passed from App). Exports `TitleBar` and `CompanyCrest`.

```jsx
import { StatDisplay } from './StatDisplay.jsx';

function CompanyCrest() {
  return (
    <svg width="54" height="54" viewBox="0 0 54 54">
      <defs>
        <radialGradient id="crestBg"><stop offset="0%" stopColor="#6a4a28"/><stop offset="100%" stopColor="#2a1510"/></radialGradient>
        <linearGradient id="crestGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f0d896"/><stop offset="100%" stopColor="#8b6a30"/></linearGradient>
      </defs>
      <circle cx="27" cy="27" r="26" fill="url(#crestBg)" stroke="#8b6a30" strokeWidth="1.2"/>
      <circle cx="27" cy="27" r="22" fill="none" stroke="#c49a44" strokeWidth="0.5"/>
      <g fill="url(#crestGold)" stroke="#2a1510" strokeWidth="0.4">
        <rect x="14" y="26" width="22" height="8"/>
        <rect x="30" y="21" width="10" height="13"/>
        <rect x="36" y="18" width="3" height="4"/>
        <circle cx="18" cy="36" r="3"/>
        <circle cx="26" cy="36" r="3"/>
        <circle cx="35" cy="36" r="3"/>
        <path d="M14 26 L11 31 L14 31 Z"/>
      </g>
      <path d="M27 9 L28.5 13 L32.5 13 L29.5 15.5 L30.7 19.5 L27 17 L23.3 19.5 L24.5 15.5 L21.5 13 L25.5 13 Z" fill="#f0d896" stroke="#2a1510" strokeWidth="0.3"/>
      <path d="M10 32 Q14 40 22 44" fill="none" stroke="#c49a44" strokeWidth="0.8"/>
      <path d="M44 32 Q40 40 32 44" fill="none" stroke="#c49a44" strokeWidth="0.8"/>
    </svg>
  );
}

export function TitleBar({ company, onNav, screen, onToggleHUD, hudVisible }) {
  const tabs = [
    { id: 'map', label: 'Map Room' },
    { id: 'track', label: 'Track Laying' },
    { id: 'depot', label: 'Locomotive Works' },
    { id: 'route', label: 'Dispatch Office' },
  ];
  return (
    <div className="wood-dark" style={{ borderBottom: '1px solid #1a0c08', boxShadow: 'inset 0 -1px 0 rgba(255,200,140,0.1), 0 2px 4px rgba(0,0,0,0.6)', display: 'flex', alignItems: 'stretch', height: 72, position: 'relative' }}>
      <div style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 14, borderRight: '1px solid #1a0c08' }}>
        <CompanyCrest />
        <div>
          <div className="display uppercase gold" style={{ fontSize: 15, letterSpacing: '0.18em', textShadow: '0 1px 0 rgba(0,0,0,0.8)' }}>{company.name}</div>
          <div className="body-serif" style={{ fontSize: 11, color: '#a88238', fontStyle: 'italic' }}>Estab. {company.founded} · Yr. {company.year} · {company.month}</div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', padding: '0 20px' }}>
        {tabs.map(t => (
          <div key={t.id} className="tab-plate" data-active={screen === t.id} onClick={() => onNav(t.id)}
               style={{ cursor: 'pointer' }}>
            {t.label}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 24px', borderLeft: '1px solid #1a0c08' }}>
        <StatDisplay label="Treasury" value={'$' + company.cash.toLocaleString()} big />
        <StatDisplay label="Stock" value={'$68.25'} delta={1.75} />
        <button className="btn-brass" onClick={onToggleHUD} style={{ fontSize: 11, padding: '6px 12px' }}>
          {hudVisible ? 'Hide HUD' : 'Show HUD'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create src/components/chrome/index.js**

```js
export { Filigree } from './Filigree.jsx';
export { Panel } from './Panel.jsx';
export { StatDisplay } from './StatDisplay.jsx';
export { Ticker } from './Ticker.jsx';
export { TitleBar } from './TitleBar.jsx';
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add chrome components"
```

---

### Task 5: Icon components

**Files:**
- Create: `src/components/icons/LocomotiveIcon.jsx`
- Create: `src/components/icons/CarIcon.jsx`
- Create: `src/components/icons/CityVignette.jsx`
- Create: `src/components/icons/BigLocomotiveEngraving.jsx`
- Create: `src/components/icons/index.js`

- [ ] **Step 1: Port all icon components**

Copy the four SVG components verbatim from `/tmp/railroad-game/project/hud.jsx` (`LocomotiveIcon`, `CarIcon`, `CityVignette`) and from `screens.jsx` (`BigLocomotiveEngraving`). Each goes in its own file with `export function`. No logic changes needed.

`src/components/icons/LocomotiveIcon.jsx` — port `LocomotiveIcon` from `hud.jsx`
`src/components/icons/CarIcon.jsx` — port `CarIcon` from `hud.jsx`
`src/components/icons/CityVignette.jsx` — port `CityVignette` from `hud.jsx`
`src/components/icons/BigLocomotiveEngraving.jsx` — port `BigLocomotiveEngraving` from `screens.jsx`

- [ ] **Step 2: Create src/components/icons/index.js**

```js
export { LocomotiveIcon } from './LocomotiveIcon.jsx';
export { CarIcon } from './CarIcon.jsx';
export { CityVignette } from './CityVignette.jsx';
export { BigLocomotiveEngraving } from './BigLocomotiveEngraving.jsx';
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add icon components"
```

---

### Task 6: MapView — milestone: game renders

**Files:**
- Create: `src/components/map/MapView.jsx`
- Create: `src/App.jsx`

- [ ] **Step 1: Create src/components/map/MapView.jsx**

This is the core visual. Port the SVG map from prototype `map.jsx`, replacing global reads with store hooks and imports.

```jsx
import { useState, useEffect, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { CITIES, cityById } from '../../data/cities.js';
import { curvyPath, bezierAt, buildTrackGeo } from '../../utils/geometry.js';

const TERRAIN = [
  { x: 180, y: 260, r: 40 }, { x: 190, y: 350, r: 30 }, { x: 200, y: 420, r: 34 },
  { x: 210, y: 520, r: 32 }, { x: 220, y: 610, r: 28 }, { x: 240, y: 700, r: 26 },
  { x: 440, y: 300, r: 30 }, { x: 480, y: 370, r: 36 }, { x: 510, y: 440, r: 40 },
  { x: 540, y: 510, r: 36 }, { x: 560, y: 580, r: 30 }, { x: 580, y: 650, r: 28 },
  { x: 600, y: 720, r: 26 }, { x: 940, y: 560, r: 22 }, { x: 970, y: 590, r: 20 },
  { x: 1200, y: 450, r: 22 }, { x: 1230, y: 500, r: 24 }, { x: 1250, y: 560, r: 22 },
  { x: 1270, y: 610, r: 20 }, { x: 1290, y: 660, r: 18 },
];

const RIVERS = [
  'M 890 280 Q 920 380 950 470 Q 980 560 1020 640 Q 1050 700 1060 780',
  'M 700 320 Q 780 400 850 460 Q 900 500 950 530',
  'M 1260 440 Q 1180 480 1100 510 Q 1030 540 960 540',
  'M 470 400 Q 420 510 380 620 Q 340 700 310 780',
  'M 1450 300 Q 1455 340 1450 410 Q 1455 460 1460 500',
];

export function MapView() {
  const tracks      = useGameStore(s => s.tracks);
  const trains      = useGameStore(s => s.trains);
  const selectedCityId  = useGameStore(s => s.selectedCityId);
  const focusTrainId    = useGameStore(s => s.focusTrainId);
  const trackLayingFrom = useGameStore(s => s.trackLayingFrom);
  const selectCity      = useGameStore(s => s.selectCity);
  const selectTrain     = useGameStore(s => s.selectTrain);
  const layTrack        = useGameStore(s => s.layTrack);
  const cancelTrackLaying = useGameStore(s => s.cancelTrackLaying);
  const trackCost       = useGameStore(s => s.trackCost);
  const cash            = useGameStore(s => s.cash);

  const [hover, setHover]           = useState(null);
  const [now, setNow]               = useState(0);
  const [layPreviewTo, setLayPreviewTo] = useState(null);

  // rAF timer for train animation
  useEffect(() => {
    let raf, last = performance.now();
    const tick = (t) => { setNow(n => n + t - last); last = t; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // clear lay preview when mode exits
  useEffect(() => { if (!trackLayingFrom) setLayPreviewTo(null); }, [trackLayingFrom]);

  // Escape cancels track laying
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { cancelTrackLaying(); setLayPreviewTo(null); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cancelTrackLaying]);

  const trackGeo = useMemo(() => buildTrackGeo(tracks, CITIES), [tracks]);

  function trackBetween(aId, bId) {
    return trackGeo.find(t => (t.a === aId && t.b === bId) || (t.a === bId && t.b === aId));
  }

  const trainPositions = useMemo(() => {
    return trains.map(tr => {
      const legCount = tr.route.length - 1;
      if (legCount <= 0) return { ...tr, visible: false };
      const total = tr.progress + (now / 1000) * tr.speed * 1000;
      const legIdx = (tr.leg + Math.floor(total)) % legCount;
      const prog = total - Math.floor(total);
      const aId = tr.route[legIdx], bId = tr.route[legIdx + 1];
      const trk = trackBetween(aId, bId);
      if (!trk) return { ...tr, visible: false };
      const t2 = trk.a === aId ? prog : 1 - prog;
      const pos = bezierAt(trk.ax, trk.ay, trk.cx, trk.cy, trk.bx, trk.by, t2);
      return { ...tr, x: pos.x, y: pos.y, angle: pos.angle, visible: true };
    });
  }, [now, trains, trackGeo]);

  const previewGeo = useMemo(() => {
    if (!trackLayingFrom || !layPreviewTo || trackLayingFrom === layPreviewTo) return null;
    const a = cityById(trackLayingFrom), b = cityById(layPreviewTo);
    return curvyPath(a.x, a.y, b.x, b.y, 0.15, 99);
  }, [trackLayingFrom, layPreviewTo]);

  const previewCost = useMemo(() => {
    if (!trackLayingFrom || !layPreviewTo) return 0;
    return trackCost(trackLayingFrom, layPreviewTo);
  }, [trackLayingFrom, layPreviewTo, trackCost]);

  function handleCityClick(cityId) {
    if (!trackLayingFrom) { selectCity(cityId); return; }
    if (cityId === trackLayingFrom) { cancelTrackLaying(); return; }
    setLayPreviewTo(cityId);
  }

  function handleBreakGround() {
    if (trackLayingFrom && layPreviewTo) { layTrack(trackLayingFrom, layPreviewTo); setLayPreviewTo(null); }
  }

  const cityRadius = (size) => size === 'metro' ? 7 : size === 'city' ? 5 : 4;

  return (
    <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
      <div className="map-paper" style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 120px rgba(80,40,20,0.5)' }}>
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', display: 'block' }}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#8a6a3a" strokeWidth="0.25" opacity="0.25"/>
            </pattern>
            <filter id="paperRough">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/>
              <feColorMatrix values="0 0 0 0 0.6  0 0 0 0 0.4  0 0 0 0 0.2  0 0 0 0.08 0"/>
              <feComposite in2="SourceGraphic" operator="in"/>
            </filter>
          </defs>

          <rect width="1600" height="900" fill="url(#grid)"/>

          {/* Lat/lng lines */}
          <g stroke="#8a6a3a" strokeWidth="0.4" opacity="0.3" fill="none">
            {[200,400,600].map(y => <line key={'lat'+y} x1="0" y1={y} x2="1600" y2={y} strokeDasharray="1 4"/>)}
            {[400,800,1200].map(x => <line key={'lng'+x} x1={x} y1="0" x2={x} y2="900" strokeDasharray="1 4"/>)}
          </g>

          {/* Coastlines */}
          <path d="M 80 200 Q 100 300 120 400 Q 110 500 140 600 Q 160 700 180 800" fill="none" stroke="#6a4220" strokeWidth="1.8" opacity="0.65"/>
          <path d="M 1560 280 Q 1510 340 1500 410 Q 1490 500 1450 560 Q 1400 640 1360 700 Q 1300 760 1240 790" fill="none" stroke="#6a4220" strokeWidth="1.8" opacity="0.65"/>
          <path d="M 900 780 Q 1000 800 1100 790 Q 1200 780 1280 790" fill="none" stroke="#6a4220" strokeWidth="1.8" opacity="0.65"/>
          <path d="M 120 180 L 1500 180" stroke="#6a4220" strokeWidth="1" strokeDasharray="6 3" opacity="0.4"/>
          <path d="M 200 760 Q 400 740 600 740 Q 800 740 900 780" stroke="#6a4220" strokeWidth="1" strokeDasharray="6 3" opacity="0.4"/>

          {/* Territory labels */}
          <g fill="#6a4220" opacity="0.4" fontFamily="IM Fell English" fontStyle="italic">
            <text x="340" y="300" fontSize="22">Dakota Territory</text>
            <text x="340" y="600" fontSize="22">Indian Territory</text>
            <text x="50" y="440" fontSize="18" transform="rotate(-80 50 440)">PACIFIC OCEAN</text>
            <text x="1560" y="560" fontSize="18" transform="rotate(90 1560 560)">ATLANTIC OCEAN</text>
            <text x="980" y="820" fontSize="14">Gulf of Mexico</text>
          </g>

          {/* Mountains */}
          <g>
            {TERRAIN.map((m, i) => (
              <g key={'mtn'+i} transform={`translate(${m.x},${m.y})`}>
                <path d={`M ${-m.r*0.6} 8 L 0 ${-m.r*0.7} L ${m.r*0.4} 2 L ${m.r*0.7} ${-m.r*0.3} L ${m.r} 8 Z`} fill="#8a6a48" stroke="#4a3020" strokeWidth="0.6" opacity="0.55"/>
                <path d={`M ${-m.r*0.2} -4 L 0 ${-m.r*0.6} L ${m.r*0.15} -2`} fill="none" stroke="#f4e8c8" strokeWidth="0.8" opacity="0.4"/>
              </g>
            ))}
          </g>

          {/* Rivers */}
          <g>
            {RIVERS.map((d,i) => <path key={'riv'+i} d={d} fill="none" stroke="#5a7a9a" strokeWidth="1.5" opacity="0.55"/>)}
            {RIVERS.map((d,i) => <path key={'rivh'+i} d={d} fill="none" stroke="#8ab0c8" strokeWidth="0.4" opacity="0.5"/>)}
          </g>

          {/* Compass rose */}
          <g transform="translate(1470,780)" style={{ animation: 'compassGlow 4s ease-in-out infinite' }}>
            <circle r="44" fill="#e8d9b0" stroke="#4a2a1f" strokeWidth="1.2" opacity="0.92"/>
            <circle r="38" fill="none" stroke="#4a2a1f" strokeWidth="0.4" strokeDasharray="2 2"/>
            <path d="M 0 -38 L 6 0 L 0 38 L -6 0 Z" fill="#8b2818" opacity="0.9"/>
            <path d="M -38 0 L 0 -6 L 38 0 L 0 6 Z" fill="#4a2a1f" opacity="0.8"/>
            <text y="-46" textAnchor="middle" fontSize="12" fontFamily="IM Fell English SC" fill="#4a2a1f" fontWeight="bold">N</text>
            <text y="54" textAnchor="middle" fontSize="12" fontFamily="IM Fell English SC" fill="#4a2a1f">S</text>
            <text x="48" y="4" textAnchor="middle" fontSize="12" fontFamily="IM Fell English SC" fill="#4a2a1f">E</text>
            <text x="-48" y="4" textAnchor="middle" fontSize="12" fontFamily="IM Fell English SC" fill="#4a2a1f">W</text>
          </g>

          {/* Tracks */}
          <g>
            {trackGeo.map((t, i) => {
              const color = t.owner === 'player' ? '#8b2818' : t.owner === 'rival' ? '#3d5c2a' : '#5a3528';
              return (
                <g key={'trk'+i}>
                  <path d={t.d} fill="none" stroke={color} strokeWidth="4" opacity="0.95" strokeLinecap="round"/>
                  <path d={t.d} fill="none" stroke="#f4e8c8" strokeWidth="1" opacity="0.45" strokeDasharray="1 3"/>
                </g>
              );
            })}
          </g>

          {/* Track laying preview */}
          {previewGeo && (
            <path d={previewGeo.d} className="track-preview" fill="none" stroke="#c49a44" strokeWidth="4" opacity="0.9"/>
          )}

          {/* Route highlight for focused train */}
          {focusTrainId && (() => {
            const tr = trains.find(x => x.id === focusTrainId);
            if (!tr) return null;
            const legs = [];
            for (let i = 0; i < tr.route.length - 1; i++) {
              const trk = trackBetween(tr.route[i], tr.route[i+1]);
              if (trk) legs.push(trk);
            }
            return <g>{legs.map((trk, i) => <path key={'hl'+i} d={trk.d} fill="none" stroke="#f0d896" strokeWidth="10" opacity="0.35" strokeLinecap="round"/>)}</g>;
          })()}

          {/* Cities */}
          <g>
            {CITIES.map(c => {
              const r = cityRadius(c.size);
              const selected = selectedCityId === c.id;
              const hovered = hover === c.id;
              const inLayMode = !!trackLayingFrom;
              const isLayFrom = trackLayingFrom === c.id;
              return (
                <g key={c.id} style={{ cursor: 'pointer', opacity: inLayMode && !isLayFrom ? 0.6 : 1 }}
                   onMouseEnter={() => setHover(c.id)}
                   onMouseLeave={() => setHover(null)}
                   onClick={() => handleCityClick(c.id)}>
                  {(selected || hovered || isLayFrom) && <circle cx={c.x} cy={c.y} r={r+10} fill="#c49a44" opacity="0.2"/>}
                  {c.size === 'metro' && <circle cx={c.x} cy={c.y} r={r+4} fill="none" stroke="#3a1f18" strokeWidth="1.2" opacity="0.7"/>}
                  <circle cx={c.x} cy={c.y} r={r} fill="#f0d896" stroke="#3a1f18" strokeWidth="1.5"/>
                  <circle cx={c.x} cy={c.y} r={r-2} fill={isLayFrom ? '#c49a44' : '#8b2818'}/>
                  {selected && (
                    <circle cx={c.x} cy={c.y} r={r+6} fill="none" stroke="#8b2818" strokeWidth="1.5" strokeDasharray="3 2">
                      <animateTransform attributeName="transform" type="rotate" from={`0 ${c.x} ${c.y}`} to={`360 ${c.x} ${c.y}`} dur="8s" repeatCount="indefinite"/>
                    </circle>
                  )}
                  <text x={c.x+r+6} y={c.y+4}
                        fontSize={c.size === 'metro' ? 16 : c.size === 'city' ? 13 : 11}
                        fontFamily="IM Fell English SC"
                        fontWeight={c.size === 'metro' ? 'bold' : 'normal'}
                        fill="#2a1510"
                        style={{ paintOrder: 'stroke', stroke: 'rgba(244,232,200,0.7)', strokeWidth: 3 }}>
                    {c.name}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Trains */}
          <g>
            {trainPositions.map(tr => {
              if (!tr.visible) return null;
              const isFocused = focusTrainId === tr.id;
              return (
                <g key={tr.id} transform={`translate(${tr.x},${tr.y}) rotate(${tr.angle})`}
                   style={{ cursor: 'pointer' }}
                   onClick={e => { e.stopPropagation(); selectTrain(tr.id); }}>
                  {isFocused && <circle r="14" fill="#f0d896" opacity="0.3"/>}
                  <circle cx="-12" cy="-6" r="3" fill="#f4e8c8" opacity="0.5"/>
                  <circle cx="-16" cy="-9" r="4" fill="#e8d9b0" opacity="0.35"/>
                  <rect x="-9" y="-4" width="18" height="7" rx="1" fill={tr.color} stroke="#1a0c08" strokeWidth="0.8"/>
                  <rect x="2" y="-7" width="4" height="3" fill="#1a0c08"/>
                  <rect x="-9" y="-4" width="3" height="7" fill="#f0d896" opacity="0.7"/>
                  <circle cx="-5" cy="4" r="1.6" fill="#1a0c08"/>
                  <circle cx="0" cy="4" r="1.6" fill="#1a0c08"/>
                  <circle cx="5" cy="4" r="1.6" fill="#1a0c08"/>
                </g>
              );
            })}
          </g>

          <rect x="0" y="0" width="1600" height="900" fill="url(#paperRough)" pointerEvents="none"/>
        </svg>
      </div>

      {/* Map border */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 0 6px #3a1f18, inset 0 0 0 8px #c49a44, inset 0 0 0 14px #3a1f18' }}/>
      <div className="vignette"/>

      {/* Hover tooltip */}
      {hover && (() => {
        const c = cityById(hover);
        return (
          <div style={{ position: 'absolute', left: `${(c.x/1600)*100}%`, top: `${(c.y/900)*100}%`, transform: 'translate(16px,-100%)', pointerEvents: 'none' }}>
            <div className="parchment" style={{ padding: '6px 10px', border: '1px solid #4a2a1f', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', minWidth: 140 }}>
              <div className="display uppercase ink" style={{ fontSize: 12, letterSpacing: '0.14em' }}>{c.name}</div>
              <div className="body-serif ink-dim" style={{ fontSize: 11, fontStyle: 'italic' }}>{c.state} · pop. {c.pop}</div>
            </div>
          </div>
        );
      })()}

      {/* Track laying cost bar */}
      {trackLayingFrom && layPreviewTo && (
        <div style={{ position: 'absolute', bottom: 74, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
          <div className="wood-grain" style={{ padding: '12px 24px', border: '1px solid #c49a44', boxShadow: '0 4px 16px rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', gap: 24 }}>
            <span className="display uppercase gold" style={{ fontSize: 13 }}>
              {cityById(trackLayingFrom).name} → {cityById(layPreviewTo).name}
            </span>
            <span className="numeric gold" style={{ fontSize: 18 }}>
              ${previewCost.toLocaleString()}
            </span>
            <button className="btn-brass" onClick={handleBreakGround} disabled={cash < previewCost}
                    style={{ opacity: cash < previewCost ? 0.5 : 1 }}>
              {cash < previewCost ? 'Insufficient funds' : 'Break Ground'}
            </button>
            <button className="btn-brass" onClick={() => { cancelTrackLaying(); setLayPreviewTo(null); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create minimal App.jsx to verify render**

```jsx
import { useGameStore } from './store/gameStore.js';
import { TitleBar } from './components/chrome/TitleBar.jsx';
import { Ticker } from './components/chrome/Ticker.jsx';
import { MapView } from './components/map/MapView.jsx';
import { NEWS } from './data/news.js';

const COMPANY = { name: 'GREAT NORTHERN & PACIFIC', founded: 1863 };

export default function App() {
  const cash    = useGameStore(s => s.cash);
  const year    = useGameStore(s => s.year);
  const month   = useGameStore(s => s.month);
  const screen  = useGameStore(s => s.screen);
  const navigate = useGameStore(s => s.navigate);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TitleBar
        company={{ ...COMPANY, cash, year, month }}
        screen={screen}
        onNav={navigate}
        hudVisible={true}
        onToggleHUD={() => {}}
      />
      <MapView />
      <Ticker items={NEWS} />
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```
Expected: Parchment map with 26 cities, 5 animated trains, track network, compass rose, title bar, ticker. Hover cities shows tooltip. No console errors.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: MapView renders — milestone 1 (map visible)"
```

---

### Task 7: HUD panels

**Files:**
- Create: `src/components/hud/CompanyPanel.jsx`
- Create: `src/components/hud/FleetPanel.jsx`
- Create: `src/components/hud/TrainDetailPanel.jsx`
- Create: `src/components/hud/CityDetailPanel.jsx`
- Create: `src/components/hud/index.js`

- [ ] **Step 1: Create shared helpers file**

`src/components/hud/helpers.jsx`:
```jsx
import { Panel } from '../chrome/Panel.jsx';

export function Label({ children }) {
  return <span className="display uppercase" style={{ fontSize: 9, color: '#8b6a30', letterSpacing: '0.22em' }}>{children}</span>;
}

export function ProgressBar({ value }) {
  return (
    <div style={{ height: 6, background: '#1a0c08', border: '1px solid #1a0c08', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)', marginTop: 4 }}>
      <div style={{ width: `${value * 100}%`, height: '100%', background: 'linear-gradient(180deg, #f0d896, #8b6a30)', boxShadow: 'inset 0 1px 0 rgba(255,240,190,0.6)' }}/>
    </div>
  );
}

export function DividerDots() {
  return <div className="divider-dots" style={{ margin: '10px 0' }}/>;
}
```

- [ ] **Step 2: Create CompanyPanel**

`src/components/hud/CompanyPanel.jsx`:
```jsx
import { useGameStore } from '../../store/gameStore.js';
import { Panel } from '../chrome/Panel.jsx';
import { Label } from './helpers.jsx';

function LedgerRow({ label, value, delta }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="numeric gold" style={{ fontSize: 15, color: '#f0d896' }}>
        {value}
        {delta != null && (
          <span style={{ fontSize: 11, marginLeft: 4, color: delta >= 0 ? '#6bbf5a' : '#c85040' }}>
            {delta >= 0 ? '▲' : '▼'}{Math.abs(delta).toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}

export function CompanyPanel() {
  const cash     = useGameStore(s => s.cash);
  const netWorth = useGameStore(s => s.netWorth);
  return (
    <Panel title="Ledger" style={{ width: 280 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <LedgerRow label="Treasury" value={'$' + cash.toLocaleString()}/>
        <LedgerRow label="Net Worth" value={'$' + (netWorth/1e6).toFixed(2) + 'M'}/>
      </div>
      <div className="divider-dots" style={{ margin: '10px 0' }}/>
      <div className="body-serif" style={{ fontSize: 12, fontStyle: 'italic', color: '#d9c698', textAlign: 'center' }}>
        "A railroad is a ribbon of steel binding the Republic."
      </div>
    </Panel>
  );
}
```

- [ ] **Step 3: Create FleetPanel**

`src/components/hud/FleetPanel.jsx`:
```jsx
import { useGameStore } from '../../store/gameStore.js';
import { Panel } from '../chrome/Panel.jsx';
import { INITIAL_TRAINS } from '../../data/trains.js';

export function FleetPanel() {
  const trains       = useGameStore(s => s.trains);
  const focusTrainId = useGameStore(s => s.focusTrainId);
  const selectTrain  = useGameStore(s => s.selectTrain);

  return (
    <Panel title="Fleet Register" style={{ width: 280 }}>
      {trains.map(tr => (
        <div key={tr.id} onClick={() => selectTrain(tr.id)}
             style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', cursor: 'pointer', background: focusTrainId === tr.id ? 'rgba(196,154,68,0.15)' : 'transparent', borderBottom: '1px solid rgba(26,12,8,0.4)' }}>
          <div style={{ width: 4, height: 28, background: tr.color, border: '1px solid #1a0c08' }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="display uppercase" style={{ fontSize: 11, color: '#f0d896', letterSpacing: '0.14em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tr.name}</div>
            <div className="body-serif" style={{ fontSize: 10, color: '#a88238', fontStyle: 'italic' }}>{tr.id} · {tr.model}</div>
          </div>
        </div>
      ))}
    </Panel>
  );
}
```

- [ ] **Step 4: Create TrainDetailPanel**

Port `TrainDetailPanel` from `/tmp/railroad-game/project/hud.jsx`. Replace `TRAINS.find(...)` with `useGameStore(s => s.trains).find(...)` and replace `cityById(id)` calls with the imported `cityById` from `src/data/cities.js`. Import `Panel` from `../chrome/Panel.jsx`, `LocomotiveIcon` and `CarIcon` from `../icons/index.js`. Export as named export.

- [ ] **Step 5: Create CityDetailPanel**

Port `CityDetailPanel` from `/tmp/railroad-game/project/hud.jsx`. Same substitutions: named imports instead of globals. Add prop `onLayTrack` which calls `useGameStore(s => s.startTrackLaying)(cityId)` — or pass as prop from parent. Export as named export.

- [ ] **Step 6: Create src/components/hud/index.js**

```js
export { CompanyPanel } from './CompanyPanel.jsx';
export { FleetPanel } from './FleetPanel.jsx';
export { TrainDetailPanel } from './TrainDetailPanel.jsx';
export { CityDetailPanel } from './CityDetailPanel.jsx';
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add HUD panels"
```

---

### Task 8: MapScreen + full App — milestone: interactive map

**Files:**
- Create: `src/components/screens/MapScreen.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create src/components/screens/MapScreen.jsx**

```jsx
import { useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { MapView } from '../map/MapView.jsx';
import { CompanyPanel } from '../hud/CompanyPanel.jsx';
import { FleetPanel } from '../hud/FleetPanel.jsx';
import { TrainDetailPanel } from '../hud/TrainDetailPanel.jsx';
import { CityDetailPanel } from '../hud/CityDetailPanel.jsx';

export function MapScreen() {
  const [hudVisible, setHudVisible]   = useState(true);
  const selectedCityId  = useGameStore(s => s.selectedCityId);
  const focusTrainId    = useGameStore(s => s.focusTrainId);
  const selectTrain     = useGameStore(s => s.selectTrain);
  const navigate        = useGameStore(s => s.navigate);
  const startTrackLaying = useGameStore(s => s.startTrackLaying);

  return (
    <div style={{ flex: 1, position: 'relative', display: 'flex', minHeight: 0 }}>
      <MapView />

      {hudVisible && (
        <>
          {/* Left rail */}
          <div style={{ position: 'absolute', left: 14, top: 14, bottom: 14, display: 'flex', flexDirection: 'column', gap: 12, pointerEvents: 'none' }}>
            <div style={{ pointerEvents: 'auto' }}><CompanyPanel /></div>
            <div style={{ pointerEvents: 'auto', flex: 1, minHeight: 0, overflow: 'auto' }}><FleetPanel /></div>
          </div>

          {/* Right rail */}
          <div style={{ position: 'absolute', right: 14, top: 14, bottom: 14, display: 'flex', flexDirection: 'column', gap: 12, pointerEvents: 'none' }}>
            {focusTrainId && (
              <div style={{ pointerEvents: 'auto' }}>
                <TrainDetailPanel trainId={focusTrainId} onClose={() => selectTrain(null)} onOpenRoute={() => navigate('route')} />
              </div>
            )}
            {selectedCityId && !focusTrainId && (
              <div style={{ pointerEvents: 'auto' }}>
                <CityDetailPanel cityId={selectedCityId} onClose={() => useGameStore.getState().selectCity(null)}
                                 onLayTrack={() => startTrackLaying(selectedCityId)} />
              </div>
            )}
          </div>

          {/* Bottom action dock */}
          <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, padding: 8, background: 'linear-gradient(180deg, #3a1f18, #1a0c08)', border: '1px solid #1a0c08', boxShadow: 'inset 0 1px 0 rgba(255,200,140,0.15), 0 4px 12px rgba(0,0,0,0.6)' }}>
            <button className="btn-brass" onClick={() => startTrackLaying(null)}>⚿ Lay Track</button>
            <button className="btn-brass" onClick={() => navigate('depot')}>⚙ Locomotive Works</button>
            <button className="btn-brass" onClick={() => navigate('route')}>✒ Dispatch</button>
            <div style={{ width: 1, background: '#1a0c08', margin: '0 4px' }}/>
            <button className="btn-brass">▶ Play</button>
            <button className="btn-brass">⏸ Pause</button>
            <button className="btn-brass">⏩ Fast</button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update App.jsx with screen routing + revenue ticker**

```jsx
import { useEffect } from 'react';
import { useGameStore } from './store/gameStore.js';
import { TitleBar } from './components/chrome/TitleBar.jsx';
import { Ticker } from './components/chrome/Ticker.jsx';
import { MapScreen } from './components/screens/MapScreen.jsx';
import { NEWS } from './data/news.js';

const COMPANY_STATIC = { name: 'GREAT NORTHERN & PACIFIC', founded: 1863 };

export default function App() {
  const cash     = useGameStore(s => s.cash);
  const year     = useGameStore(s => s.year);
  const month    = useGameStore(s => s.month);
  const screen   = useGameStore(s => s.screen);
  const navigate = useGameStore(s => s.navigate);
  const tickRevenue = useGameStore(s => s.tickRevenue);

  useEffect(() => {
    const id = setInterval(tickRevenue, 2000);
    return () => clearInterval(id);
  }, [tickRevenue]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TitleBar
        company={{ ...COMPANY_STATIC, cash, year, month }}
        screen={screen}
        onNav={navigate}
        hudVisible={true}
        onToggleHUD={() => {}}
      />
      {screen === 'map'   && <MapScreen />}
      {screen === 'depot' && <div style={{ flex: 1, color: '#f0d896', display: 'grid', placeItems: 'center' }}>Depot coming in Task 10</div>}
      {screen === 'route' && <div style={{ flex: 1, color: '#f0d896', display: 'grid', placeItems: 'center' }}>Dispatch coming in Task 11</div>}
      {screen === 'track' && <div style={{ flex: 1, color: '#f0d896', display: 'grid', placeItems: 'center' }}>Track screen coming in Task 12</div>}
      <Ticker items={NEWS} />
    </div>
  );
}
```

- [ ] **Step 3: Verify full interactive map**

```bash
npm run dev
```
Expected:
- Map renders with HUD panels (Ledger left, Fleet Register left)
- Click a city → CityDetailPanel appears right
- Click "Lay Track From Here" → city glows gold, cursor shows crosshair on hover
- Click a second city → cost bar appears at bottom with "Break Ground"
- Click "Break Ground" → new red track drawn, cash decreases in title bar
- Click a train → TrainDetailPanel appears right
- Tabs navigate to placeholder screens

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: interactive map — track laying works (milestone 2)"
```

---

### Task 9: DepotScreen — buy locomotives

**Files:**
- Create: `src/components/screens/DepotScreen.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create src/components/screens/DepotScreen.jsx**

Port `DepotScreen` from `/tmp/railroad-game/project/screens.jsx`. Changes:
- Add `import { useState } from 'react'`
- Replace `LOCOMOTIVES` global with `import { LOCOMOTIVES } from '../../data/locomotives.js'`
- Import `Panel` from `../chrome/Panel.jsx`, `LocomotiveIcon` from `../icons/index.js`, `BigLocomotiveEngraving` from `../icons/index.js`, `Label` from `../hud/helpers.jsx`, `Spec` (define locally — see below)
- Wire the "Place Order" button: call `useGameStore(s => s.buyLocomotive)(loco.id, qty)` on click
- Show feedback: after successful purchase, button briefly reads "Ordered!" (use local `useState`)

Add these to the file (not in prototype, needed for real purchase):

```jsx
import { useGameStore } from '../../store/gameStore.js';

// Inside DepotScreen component, after existing state:
const buyLocomotive = useGameStore(s => s.buyLocomotive);
const cash          = useGameStore(s => s.cash);
const [qty, setQty] = useState(1);
const [ordered, setOrdered] = useState(false);

function handleOrder() {
  const uids = buyLocomotive(loco.id, qty);
  if (uids) { setOrdered(true); setTimeout(() => setOrdered(false), 1500); }
}
```

Replace the "Place Order" button `onClick` and `disabled`:
```jsx
<button className="btn-brass"
        style={{ fontSize: 15, padding: '10px 24px' }}
        disabled={loco.availability !== 'Available' || cash < loco.price * qty}
        onClick={handleOrder}>
  {ordered ? 'Ordered!' : loco.availability === 'Available' ? 'Place Order' : 'Unavailable'}
</button>
```

Wire qty `−` / `+` buttons:
```jsx
<button className="btn-brass" style={{ padding: '4px 10px', fontSize: 14 }}
        onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
<input value={qty} readOnly className="field-parchment" style={{ width: 40, textAlign: 'center', margin: '0 4px' }}/>
<button className="btn-brass" style={{ padding: '4px 10px', fontSize: 14 }}
        onClick={() => setQty(q => q + 1)}>+</button>
```

- [ ] **Step 2: Wire DepotScreen in App.jsx**

Replace the depot placeholder with:
```jsx
import { DepotScreen } from './components/screens/DepotScreen.jsx';
// ...
{screen === 'depot' && <DepotScreen onBack={() => navigate('map')} />}
```

- [ ] **Step 3: Verify**

Open Locomotive Works tab. Select a loco, click Place Order. Expected: cash decreases in title bar, Fleet Register on map screen shows the new loco when you go back.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: DepotScreen — locomotive purchase works (milestone 3)"
```

---

### Task 10: RouteSchedulerScreen — create routes

**Files:**
- Create: `src/components/screens/RouteSchedulerScreen.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create src/components/screens/RouteSchedulerScreen.jsx**

This screen needs a route builder panel. Port the list/detail layout from `/tmp/railroad-game/project/screens.jsx` then wire real state.

```jsx
import { useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { Panel } from '../chrome/Panel.jsx';
import { LocomotiveIcon } from '../icons/index.js';
import { Label, DividerDots } from '../hud/helpers.jsx';
import { CITIES, cityById } from '../../data/cities.js';
import { LOCOMOTIVES } from '../../data/locomotives.js';

function FinStat({ label, value, accent }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <Label>{label}</Label>
      <div className="numeric" style={{ fontSize: 16, color: accent ? '#6bbf5a' : '#f0d896' }}>{value}</div>
    </div>
  );
}

function RouteBuilder({ onDone, onCancel }) {
  const tracks          = useGameStore(s => s.tracks);
  const ownedLocomotives = useGameStore(s => s.ownedLocomotives);
  const createRoute     = useGameStore(s => s.createRoute);
  const [stops, setStops]   = useState([]);
  const [locoUid, setLocoUid] = useState('');
  const [error, setError]   = useState('');

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

  const nextOptions = stops.length === 0 ? CITIES.filter(c =>
    tracks.some(t => t.owner === 'player' && (t.a === c.id || t.b === c.id))
  ) : reachableCities(stops[stops.length - 1]);

  function handleDispatch() {
    if (stops.length < 2) { setError('Add at least 2 stops.'); return; }
    if (!locoUid) { setError('Assign a locomotive.'); return; }
    const id = createRoute(stops, locoUid);
    if (!id) { setError('Route invalid — check track connections and loco availability.'); return; }
    onDone();
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

export function RouteSchedulerScreen({ onBack }) {
  const routes          = useGameStore(s => s.routes);
  const trains          = useGameStore(s => s.trains);
  const suspendRoute    = useGameStore(s => s.suspendRoute);
  const [building, setBuilding] = useState(false);
  const [selectedId, setSelectedId] = useState(routes[0]?.id ?? null);

  const route = routes.find(r => r.id === selectedId);

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, background: '#0a0604' }}>
      {/* Left: route list */}
      <div className="wood-dark" style={{ width: 280, borderRight: '1px solid #1a0c08', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
        <div className="display uppercase gold" style={{ fontSize: 13, letterSpacing: '0.2em', textAlign: 'center', padding: '8px 0', borderBottom: '1px solid rgba(196,154,68,0.3)' }}>⚜ Standing Orders ⚜</div>

        {routes.map(r => (
          <div key={r.id} onClick={() => { setSelectedId(r.id); setBuilding(false); }}
               style={{ padding: 10, cursor: 'pointer', background: selectedId === r.id ? 'linear-gradient(180deg,#6a4a28,#3a1f18)' : 'linear-gradient(180deg,#3a1f18,#2a1510)', border: selectedId === r.id ? '1px solid #c49a44' : '1px solid #1a0c08' }}>
            <div className="display uppercase" style={{ fontSize: 12, color: '#f0d896', letterSpacing: '0.12em' }}>{r.name}</div>
            <div className="body-serif" style={{ fontSize: 11, color: '#a88238', fontStyle: 'italic', marginTop: 2 }}>
              {r.stops.map(id => cityById(id).name).join(' → ')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ padding: '1px 6px', background: r.status === 'running' ? '#3d5c2a' : '#6a4a28', color: '#f0d896', fontFamily: 'IM Fell English SC', fontSize: 9 }}>{r.status.toUpperCase()}</span>
              <span className="numeric" style={{ fontSize: 11, color: '#6bbf5a' }}>+${(r.revenuePerTick/1000).toFixed(1)}K/tick</span>
            </div>
          </div>
        ))}

        {routes.length === 0 && !building && (
          <div className="body-serif" style={{ fontSize: 12, color: '#a88238', fontStyle: 'italic', textAlign: 'center', padding: 12 }}>No routes yet. Buy a locomotive, then create a route.</div>
        )}

        <button className="btn-brass" style={{ marginTop: 4 }} onClick={() => { setBuilding(true); setSelectedId(null); }}>+ New Route</button>
        <button className="btn-brass" onClick={onBack} style={{ marginTop: 'auto' }}>← Return to Map</button>
      </div>

      {/* Right: detail / builder */}
      <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
        {building && (
          <RouteBuilder onDone={() => setBuilding(false)} onCancel={() => setBuilding(false)} />
        )}

        {!building && route && (
          <Panel title={route.name}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
              {(() => {
                const train = trains.find(t => t.id === route.id);
                return train ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <LocomotiveIcon color={train.color} size={56}/>
                    <div>
                      <div className="display uppercase gold" style={{ fontSize: 12 }}>{train.name}</div>
                      <div className="body-serif" style={{ fontSize: 11, color: '#a88238', fontStyle: 'italic' }}>{train.model}</div>
                    </div>
                  </div>
                ) : null;
              })()}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
                <FinStat label="Revenue/tick" value={'$' + route.revenuePerTick.toLocaleString()} accent={true}/>
              </div>
            </div>

            <DividerDots />

            {/* Schedule tape */}
            <div style={{ background: 'linear-gradient(180deg,rgba(26,12,8,0.5),rgba(42,21,16,0.5))', border: '1px solid #1a0c08', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'stretch', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 28, left: 20, right: 20, height: 4, background: 'linear-gradient(180deg,#8b6a30,#4a2a1f)' }}/>
                {route.stops.map((stopId, i) => {
                  const c = cityById(stopId);
                  return (
                    <div key={i} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%,#f0d896,#8b6a30 60%,#3a1f18)', border: '2px solid #1a0c08', margin: '20px auto 0', position: 'relative', zIndex: 1 }}/>
                      <div className="display uppercase" style={{ fontSize: 12, color: '#f0d896', letterSpacing: '0.12em', marginTop: 8 }}>{c.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DividerDots />

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-brass" onClick={() => suspendRoute(route.id)}
                      disabled={route.status === 'suspended'}>
                {route.status === 'suspended' ? 'Suspended' : 'Suspend'}
              </button>
            </div>
          </Panel>
        )}

        {!building && !route && routes.length === 0 && (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#a88238' }}>
            <div className="body-serif" style={{ fontSize: 16, fontStyle: 'italic' }}>Click "+ New Route" to create your first route.</div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire RouteSchedulerScreen in App.jsx**

```jsx
import { RouteSchedulerScreen } from './components/screens/RouteSchedulerScreen.jsx';
// ...
{screen === 'route' && <RouteSchedulerScreen onBack={() => navigate('map')} />}
```

- [ ] **Step 3: Verify full core loop**

1. Buy a locomotive in Locomotive Works (e.g. 4-4-0 American, $18,500)
2. Go to Dispatch Office → click "+ New Route"
3. Add stops: San Francisco → Sacramento (connected by player track)
4. Assign the locomotive → click Dispatch
5. Return to Map Room — new train animates along the route
6. Cash in title bar increases every 2 seconds
7. Route appears in Standing Orders list with revenue/tick shown

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: RouteSchedulerScreen — route creation works (milestone 4 — MVP complete)"
```

---

### Task 11: Static TrackLayingScreen

**Files:**
- Create: `src/components/screens/TrackLayingScreen.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Port TrackLayingScreen**

Port `TrackLayingScreen` verbatim from `/tmp/railroad-game/project/screens.jsx`. Add:
```jsx
import { useState } from 'react';
import { Panel } from '../chrome/Panel.jsx';
import { CITIES, cityById } from '../../data/cities.js';
import { curvyPath, bezierAt, buildTrackGeo } from '../../utils/geometry.js';
import { INITIAL_TRACKS } from '../../data/tracks.js';
import { useGameStore } from '../../store/gameStore.js';
```

Replace `TERRAIN`, `TRACK_GEO`, `curvyPath`, `bezierAt` global references with the imported versions.
The static `fromId = 'den'`, `toId = 'kc'` hardcodes remain — this is a visual reference screen.

- [ ] **Step 2: Wire in App.jsx**

```jsx
import { TrackLayingScreen } from './components/screens/TrackLayingScreen.jsx';
// ...
{screen === 'track' && <TrackLayingScreen onBack={() => navigate('map')} />}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add static TrackLayingScreen"
```

---

### Task 12: Final wiring — HUD toggle + polish

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/screens/MapScreen.jsx`

- [ ] **Step 1: Wire HUD toggle in TitleBar**

In `App.jsx`, lift `hudVisible` to app level and pass to both `TitleBar` and `MapScreen`:

```jsx
const [hudVisible, setHudVisible] = useState(true);

// Pass to TitleBar:
onToggleHUD={() => setHudVisible(v => !v)}
hudVisible={hudVisible}

// Pass to MapScreen:
<MapScreen hudVisible={hudVisible} />
```

Update `MapScreen` to accept and use the `hudVisible` prop instead of its own local state.

- [ ] **Step 2: Verify toggle works**

Click "Hide HUD" → panels disappear, map fills screen. Click "Show HUD" → panels reappear.

- [ ] **Step 3: Final smoke test**

Run through the full core loop one more time:
1. Open map — all 5 trains animate, HUD panels visible
2. Click a city — detail panel opens
3. Lay track — cost bar, Break Ground, new red track appears
4. Buy locomotive — cash deducted
5. Create route — train appears on map, revenue ticks
6. Suspend route — revenue stops
7. Toggle HUD — works
8. All 4 tabs navigate correctly

- [ ] **Step 4: Run tests one final time**

```bash
npm test
```
Expected: All tests pass.

- [ ] **Step 5: Final commit**

```bash
git add -A && git commit -m "feat: complete Iron Empire MVP — all core loop mechanics working"
```

---

## Self-Review

**Spec coverage:**
- ✅ Vite + React + Zustand
- ✅ All 26 cities, 26 initial tracks, 5 locomotive catalog entries
- ✅ `layTrack`, `buyLocomotive`, `createRoute`, `tickRevenue`, `suspendRoute` actions
- ✅ Track laying on Map Room with preview arc + cost bar
- ✅ Locomotive Works with real purchase, qty input
- ✅ Dispatch Office with stop picker, idle loco filter, Dispatch button
- ✅ Revenue ticks every 2s for running routes
- ✅ Trains animate on player-created routes
- ✅ All 4 tabs navigate
- ✅ HUD toggle
- ✅ Telegraph Ticker
- ✅ Static TrackLayingScreen retained as visual reference
- ✅ Tests for all 4 store actions

**Placeholder scan:** None found.

**Type consistency:** `locomotiveUid` / `locoUid` — both forms appear. Plan uses `locomotiveUid` consistently in the store shape and `locoUid` as a local variable name in RouteSchedulerScreen. No conflict — different scopes.
