# 🚂 Iron Empire

A browser-based railroad management game inspired by the classic *Railroad Tycoon* series. Plan routes, manage cargo, build your railway empire, and watch your trains haul goods across a dynamic American map.

Built with **React 19** + **Vite** + **Zustand**.

![Game Preview](docs/iron-empire-preview.png)

## Features

### 🏗️ Core Gameplay
- **Supply & Demand Economy** — Cities produce and demand specific goods (passengers, mail, freight, coal, cattle). Deliver the right cargo to earn premiums.
- **Route Scheduling** — Design multi-stop routes with per-stop loading policies. Trains depart on configurable timers.
- **Car Management** — Assign car types to routes. Each carries specific goods at different weight/rate ratios.
- **Tonnage Limits** — Every locomotive has a `maxTons` capacity. Overloading slows your train and increases maintenance costs.
- **Track Laying** — Build new rail connections between cities on an interactive map.

### 🚂 Locomotive Roster

| Loco | Years | Price | Max Tons | Speed | Best For |
|------|-------|-------|----------|-------|----------|
| 0-4-0 "Grasshopper" | 1832–1860 | $6,500 | 24 | 25 mph | Short Haul |
| 4-4-0 "American" | 1860–1880 | $18,500 | 36 | 60 mph | Passenger |
| 2-6-0 "Mogul" | 1866–1890 | $24,800 | 56 | 45 mph | Freight |
| 4-6-0 "Ten-Wheeler" | 1868–1895 | $31,200 | 64 | 55 mph | Mixed |
| 2-8-0 "Consolidation" | 1866–1900 | $38,400 | 80 | 40 mph | Coal & Ore |
| 4-4-2 "Atlantic" | 1888–1910 | $52,000 | 44 | 85 mph | Express Passenger |

### 📦 Goods & Economy

| Good | Emoji | Base Rate | Weight |
|------|-------|-----------|--------|
| Passenger | 🚂 | $1,200 | 8 |
| Mail | ✉ | $900 | 4 |
| Freight | 📦 | $800 | 14 |
| Coal | ⛏ | $700 | 16 |
| Cattle | 🐄 | $1,000 | 12 |

Demand recovers at **3 points/tick**, drops **8 points per car delivered**.

### 🎨 UI & Theming
- **Dark/Light Theme** — Toggle between themes via CSS custom properties
- **Interactive Map** — Click cities to view production, demand, and connected routes
- **Sprite-based Graphics** — Locomotive icons with authentic engraving-style sprites
- **HUD Panels** — City detail, company stats, fleet overview, and train detail panels
- **Filigree Chrome** — Victorian-era decorative UI elements

### 💾 Persistence
- **Save/Load** — Game state persists via `localStorage` with automatic versioning
- **Migration System** — Saves migrate cleanly between versions without data loss
- **Tested** — Unit tests via Vitest cover store logic and migration

## Getting Started

```bash
# Clone the repo
git clone https://github.com/janriis/railroad-remake.git
cd railroad-remake

# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
src/
├── components/
│   ├── chrome/          # UI chrome — panels, stat displays, ticker, title bar
│   ├── hud/             # Heads-up display — city detail, company, fleet, train panels
│   ├── icons/           # Sprite renderers — locomotives, cars, city vignettes
│   ├── map/             # Interactive map view
│   └── screens/         # Full screens — map, depot, route scheduler, track laying
├── context/
│   └── ThemeContext.jsx  # Dark/light theme provider
├── data/
│   ├── cities.js        # City definitions with produces/demands
│   ├── goods.js         # 5 cargo types with rates, weights, colours
│   ├── locomotives.js   # 6 loco specs (maxTons, maintenanceBase, era)
│   ├── spriteCrops.js   # Shared sprite sheet crop coordinates
│   ├── tracks.js        # Rail track segments
│   └── trains.js        # Train state definitions
├── store/
│   ├── gameStore.js     # Zustand store — state, actions, persistence
│   └── gameStore.test.js # Vitest unit tests
├── utils/
│   └── geometry.js      # Map coordinate helpers
├── App.jsx              # Root component
├── main.jsx             # Entry point
└── styles.css           # Global styles with CSS custom properties
```

## Tech Stack

| Layer | Tool |
|-------|------|
| Framework | [React 19](https://react.dev/) |
| Bundler | [Vite 8](https://vitejs.dev/) |
| State | [Zustand 5](https://github.com/pmndrs/zustand) |
| Testing | [Vitest](https://vitest.dev/) |
| Linting | [ESLint 9](https://eslint.org/) flat config |
| Styling | CSS Custom Properties (no framework) |
| Icons | Custom sprite sheets |

## Game Mechanics

### Route Lifecycle
1. **Create Route** — Pick a name, select locomotive, set departure interval
2. **Add Stops** — Choose cities, set loading policy per stop
3. **Assign Cars** — Match car types to city demands
4. **Dispatch** — Trains auto-depart on schedule, `settleAllRoutes()` runs each tick
5. **Collect Revenue** — Delivery value = base rate × demand multiplier × distance

### Economy Model
- Each city has `produces[]` and `demands[]` arrays with good types
- `tickDemand()` cycles demand levels (restocking over time)
- Delivering demanded goods triggers revenue; wrong goods earn base rate only
- Maintenance costs scale with tonnage: `$ × tons × tick`

## Contributing

Issues and PRs welcome! Check the [open issues](https://github.com/janriis/railroad-remake/issues) for bugs and feature requests.

## License

MIT
