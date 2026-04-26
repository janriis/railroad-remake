# Theme Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-theme system (Victorian/Modern) with a palette button in the title bar, driven by CSS custom properties and persisted in localStorage.

**Architecture:** All theme tokens are CSS custom properties on `:root` (Victorian) and `[data-theme="modern"]` (Modern). A `ThemeContext` writes `data-theme` to `document.documentElement` and persists to `localStorage`. Every hardcoded hex color in JSX inline styles is replaced with `var(--token)`.

**Tech Stack:** React 18 `createContext` / `useContext`, CSS custom properties, Vite 6, no new packages.

---

### Task 1: CSS custom properties in `styles.css`

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Add token definitions at the top of `styles.css`**

Insert immediately after the `@import` line and before the `* { box-sizing... }` reset:

```css
/* ─── Theme tokens ─────────────────────────────────────── */
:root {
  --bg-base:          #0a0604;
  --bg-surface:       linear-gradient(160deg,#180e06 0%,#231408 30%,#1c1005 60%,#231508 100%);
  --bg-wood-grain:    linear-gradient(160deg,#2a1a0e 0%,#3b220f 20%,#2e1a0c 40%,#3a200e 60%,#2a1a0e 80%,#331d0d 100%);
  --bg-elevated:      linear-gradient(180deg,#6a4a28,#3a1f18);
  --bg-panel-header:  linear-gradient(180deg,#3d2410 0%,#2a1a0e 100%);
  --bg-dock:          linear-gradient(180deg,#3a1f18,#1a0c08);
  --text-primary:     #f0d896;
  --text-secondary:   #a88238;
  --text-dim:         #8b6a30;
  --text-muted:       #8b8070;
  --accent:           #c49a44;
  --border:           rgba(196,154,68,0.3);
  --border-strong:    #1a0c08;
  --green:            #6bbf5a;
  --red:              #c85040;
  --font-size-base:   11px;
  --font-size-sm:     10px;
  --font-size-label:  9px;
}

[data-theme="modern"] {
  --bg-base:          #171310;
  --bg-surface:       #1c1714;
  --bg-wood-grain:    #1c1714;
  --bg-elevated:      #2e2318;
  --bg-panel-header:  #211c18;
  --bg-dock:          #211c18;
  --text-primary:     #f5f0e8;
  --text-secondary:   #9d9080;
  --text-dim:         #6b6358;
  --text-muted:       #7a7268;
  --accent:           #c49a44;
  --border:           rgba(196,154,68,0.2);
  --border-strong:    rgba(255,255,255,0.08);
  --green:            #6dcc58;
  --red:              #e06060;
  --font-size-base:   13px;
  --font-size-sm:     12px;
  --font-size-label:  11px;
}
```

- [ ] **Step 2: Update CSS classes to use variables**

Replace the entire body of the following rules (keep selectors unchanged):

```css
body {
  background: var(--bg-base);
  overflow: hidden;
}

.wood-grain {
  background: var(--bg-wood-grain);
}

.wood-dark {
  background: var(--bg-surface);
}

.panel-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border-strong);
  background: var(--bg-panel-header);
}

.gold {
  color: var(--text-primary);
}

.gold-dim {
  color: var(--accent);
}

.tab-plate {
  padding: 8px 16px;
  color: var(--text-secondary);
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-family: 'IM Fell English SC', 'Palatino Linotype', Palatino, serif;
  font-size: var(--font-size-base);
  letter-spacing: 0.04em;
  transition: color 0.15s ease, border-bottom-color 0.15s ease;
  user-select: none;
}

.tab-plate[data-active='true'] {
  color: var(--text-primary);
  border-bottom-color: var(--accent);
  background: linear-gradient(180deg, transparent 0%, rgba(196,154,68,0.08) 100%);
}

.divider-dots {
  text-align: center;
  color: var(--accent);
}
```

Leave `.map-paper`, `.btn-brass`, `.field-parchment`, `.ticker-track`, and `@keyframes tickerScroll` unchanged.

- [ ] **Step 3: Build to confirm no errors**

```bash
cd /Users/janriissorensen/projects/railroad && npm run build 2>&1 | tail -5
```

Expected: clean build, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/styles.css
git commit -m "feat: add CSS theme tokens for Victorian and Modern themes"
```

---

### Task 2: ThemeContext

**Files:**
- Create: `src/context/ThemeContext.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create `src/context/ThemeContext.jsx`**

```jsx
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ theme: 'victorian', setTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('iron-empire-theme') ?? 'victorian'
  );

  useEffect(() => {
    if (theme === 'modern') {
      document.documentElement.setAttribute('data-theme', 'modern');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('iron-empire-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

- [ ] **Step 2: Wrap App in ThemeProvider**

Replace `src/App.jsx` with:

```jsx
import { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore.js';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { TitleBar } from './components/chrome/TitleBar.jsx';
import { Ticker } from './components/chrome/Ticker.jsx';
import { MapScreen } from './components/screens/MapScreen.jsx';
import { DepotScreen } from './components/screens/DepotScreen.jsx';
import { RouteSchedulerScreen } from './components/screens/RouteSchedulerScreen.jsx';
import { TrackLayingScreen } from './components/screens/TrackLayingScreen.jsx';
import { NEWS } from './data/news.js';

const COMPANY_STATIC = { name: 'GREAT NORTHERN & PACIFIC', founded: 1863 };

function AppInner() {
  const cash        = useGameStore(s => s.cash);
  const year        = useGameStore(s => s.year);
  const month       = useGameStore(s => s.month);
  const screen      = useGameStore(s => s.screen);
  const navigate    = useGameStore(s => s.navigate);
  const tickRevenue = useGameStore(s => s.tickRevenue);

  const [hudVisible, setHudVisible] = useState(true);

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

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
```

- [ ] **Step 3: Build and check**

```bash
cd /Users/janriissorensen/projects/railroad && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Verify initial load reads localStorage**

```bash
npm run dev
```

Open http://localhost:5173, open DevTools Console, run:
```js
localStorage.setItem('iron-empire-theme', 'modern');
location.reload();
```
Expected: page loads — no visual change yet because components still have hardcoded colors, but no errors.

- [ ] **Step 5: Commit**

```bash
git add src/context/ThemeContext.jsx src/App.jsx
git commit -m "feat: add ThemeContext with localStorage persistence"
```

---

### Task 3: Theme picker button in TitleBar

**Files:**
- Modify: `src/components/chrome/TitleBar.jsx`

- [ ] **Step 1: Replace `src/components/chrome/TitleBar.jsx` with:**

```jsx
import { useState, useRef, useEffect } from 'react';
import { StatDisplay } from './StatDisplay.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

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

const THEMES = [
  { id: 'modern',   label: '✦ Modern' },
  { id: 'victorian', label: '⚙ Victorian' },
];

export function TitleBar({ company, onNav, screen, onToggleHUD, hudVisible }) {
  const { theme, setTheme } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!pickerOpen) return;
    function onMouseDown(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [pickerOpen]);

  const tabs = [
    { id: 'map',   label: 'Map Room' },
    { id: 'track', label: 'Track Laying' },
    { id: 'depot', label: 'Locomotive Works' },
    { id: 'route', label: 'Dispatch Office' },
  ];

  return (
    <div className="wood-dark" style={{ borderBottom: '1px solid var(--border-strong)', boxShadow: 'inset 0 -1px 0 rgba(255,200,140,0.1), 0 2px 4px rgba(0,0,0,0.6)', display: 'flex', alignItems: 'stretch', height: 72, position: 'relative' }}>
      <div style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 14, borderRight: '1px solid var(--border-strong)' }}>
        <CompanyCrest />
        <div>
          <div className="display uppercase gold" style={{ fontSize: 15, letterSpacing: '0.18em', textShadow: '0 1px 0 rgba(0,0,0,0.8)' }}>{company.name}</div>
          <div className="body-serif" style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Estab. {company.founded} · Yr. {company.year} · {company.month}</div>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 24px', borderLeft: '1px solid var(--border-strong)' }}>
        <StatDisplay label="Treasury" value={'$' + company.cash.toLocaleString()} big />
        <StatDisplay label="Stock" value={'$68.25'} delta={1.75} />

        {/* Theme picker */}
        <div style={{ position: 'relative' }} ref={pickerRef}>
          <button
            className="btn-brass"
            onClick={() => setPickerOpen(v => !v)}
            style={{ fontSize: 11, padding: '6px 10px' }}
            title="Switch theme"
          >
            🎨
          </button>
          {pickerOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 4px)',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 3, padding: 6,
              boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
              minWidth: 148, zIndex: 100,
            }}>
              <div style={{ color: 'var(--text-dim)', fontSize: 'var(--font-size-label)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'IM Fell English SC, serif' }}>Theme</div>
              {THEMES.map(t => (
                <div
                  key={t.id}
                  onClick={() => { setTheme(t.id); setPickerOpen(false); }}
                  style={{
                    padding: '5px 8px', cursor: 'pointer', borderRadius: 2, marginBottom: 3,
                    background: theme === t.id ? 'rgba(196,154,68,0.15)' : 'transparent',
                    border: `1px solid ${theme === t.id ? 'var(--accent)' : 'transparent'}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    color: theme === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontSize: 'var(--font-size-sm)',
                    fontFamily: 'IM Fell English SC, serif',
                  }}
                >
                  {t.label}
                  {theme === t.id && <span style={{ color: 'var(--accent)', fontSize: 10 }}>✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="btn-brass" onClick={onToggleHUD} style={{ fontSize: 11, padding: '6px 12px' }}>
          {hudVisible ? 'Hide HUD' : 'Show HUD'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

Open http://localhost:5173. Click 🎨 — picker opens with "Modern" and "Victorian". Click Modern. Expected: title bar subtitle text and tab colours update immediately (other components still have hardcoded colours — that's fine).

- [ ] **Step 3: Commit**

```bash
git add src/components/chrome/TitleBar.jsx
git commit -m "feat: add theme picker button to title bar"
```

---

### Task 4: Chrome + HUD helper components

**Files:**
- Modify: `src/components/chrome/StatDisplay.jsx`
- Modify: `src/components/chrome/Ticker.jsx`
- Modify: `src/components/chrome/Panel.jsx`
- Modify: `src/components/hud/helpers.jsx`

- [ ] **Step 1: Replace `src/components/chrome/StatDisplay.jsx` with:**

```jsx
export function StatDisplay({ label, value, delta, big }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div className="display uppercase" style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-dim)', letterSpacing: '0.2em' }}>{label}</div>
      <div className="numeric gold" style={{ fontSize: big ? 18 : 15, textShadow: '0 1px 0 rgba(0,0,0,0.8)', lineHeight: 1.1 }}>
        {value}
        {delta != null && (
          <span style={{ fontSize: 11, marginLeft: 6, color: delta >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {delta >= 0 ? '▲' : '▼'}{Math.abs(delta).toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/components/chrome/Ticker.jsx` with:**

```jsx
export function Ticker({ items }) {
  const doubled = [...items, ...items];
  return (
    <div style={{ borderTop: '1px solid var(--border-strong)', borderBottom: '1px solid var(--border-strong)', background: 'var(--bg-surface)', height: 26, overflow: 'hidden', display: 'flex', alignItems: 'center', position: 'relative' }}>
      <div style={{ padding: '0 14px', background: 'var(--bg-elevated)', height: '100%', display: 'flex', alignItems: 'center', borderRight: '1px solid var(--border-strong)', boxShadow: 'inset 0 1px 0 rgba(255,200,140,0.15)', flexShrink: 0 }}>
        <span className="display uppercase" style={{ fontSize: 11, color: 'var(--text-primary)', letterSpacing: '0.18em' }}>⚜ Telegraph ⚜</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div className="ticker-track" style={{ padding: '0 20px' }}>
          {doubled.map((item, i) => (
            <span key={i} className="body-serif gold-dim" style={{ fontSize: 13, padding: '0 40px', whiteSpace: 'nowrap' }}>{item}</span>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 60, background: `linear-gradient(90deg, transparent, var(--bg-base))`, pointerEvents: 'none' }}/>
    </div>
  );
}
```

- [ ] **Step 3: Replace `src/components/chrome/Panel.jsx` with:**

```jsx
import { Filigree } from './Filigree.jsx';

export function Panel({ title, children, style = {}, bodyStyle = {}, actions, noPadding }) {
  return (
    <div className="wood-grain" style={{
      position: 'relative', border: '1px solid var(--border-strong)',
      boxShadow: 'inset 0 1px 0 rgba(255,200,140,0.15), inset 0 0 0 2px rgba(0,0,0,0.3), 0 6px 20px rgba(0,0,0,0.6)',
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

- [ ] **Step 4: Replace `src/components/hud/helpers.jsx` with:**

```jsx
import { Panel } from '../chrome/Panel.jsx';

export function Label({ children }) {
  return <span className="display uppercase" style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-dim)', letterSpacing: '0.22em' }}>{children}</span>;
}

export function ProgressBar({ value }) {
  return (
    <div style={{ height: 6, background: 'var(--border-strong)', border: '1px solid var(--border-strong)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)', marginTop: 4 }}>
      <div style={{ width: `${value * 100}%`, height: '100%', background: 'linear-gradient(180deg, var(--text-primary), var(--accent))', boxShadow: 'inset 0 1px 0 rgba(255,240,190,0.6)' }}/>
    </div>
  );
}

export function DividerDots() {
  return <div className="divider-dots" style={{ margin: '10px 0' }}/>;
}
```

- [ ] **Step 5: Build**

```bash
cd /Users/janriissorensen/projects/railroad && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 6: Verify in browser — switch to Modern**

Open http://localhost:5173, click 🎨 → Modern. Expected: ticker bar, panel headers, and HUD label text now update to the lighter palette.

- [ ] **Step 7: Commit**

```bash
git add src/components/chrome/StatDisplay.jsx src/components/chrome/Ticker.jsx src/components/chrome/Panel.jsx src/components/hud/helpers.jsx
git commit -m "feat: update chrome and HUD helpers to use CSS theme variables"
```

---

### Task 5: HUD panel components

**Files:**
- Modify: `src/components/hud/CompanyPanel.jsx`
- Modify: `src/components/hud/CityDetailPanel.jsx`
- Modify: `src/components/hud/TrainDetailPanel.jsx`
- Modify: `src/components/hud/FleetPanel.jsx`

- [ ] **Step 1: Replace `src/components/hud/CompanyPanel.jsx` with:**

```jsx
import { useGameStore } from '../../store/gameStore.js';
import { Panel } from '../chrome/Panel.jsx';
import { Label } from './helpers.jsx';

function LedgerRow({ label, value, delta }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="numeric gold" style={{ fontSize: 15 }}>
        {value}
        {delta != null && (
          <span style={{ fontSize: 11, marginLeft: 4, color: delta >= 0 ? 'var(--green)' : 'var(--red)' }}>
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
      <div className="body-serif" style={{ fontSize: 'var(--font-size-base)', fontStyle: 'italic', color: 'var(--text-secondary)', textAlign: 'center' }}>
        "A railroad is a ribbon of steel binding the Republic."
      </div>
    </Panel>
  );
}
```

- [ ] **Step 2: Replace `src/components/hud/CityDetailPanel.jsx` with:**

```jsx
import { useGameStore } from '../../store/gameStore.js';
import { cityById } from '../../data/cities.js';
import { Panel } from '../chrome/Panel.jsx';
import { CityVignette } from '../icons/index.js';
import { Label, DividerDots } from './helpers.jsx';

export function CityDetailPanel({ cityId, onClose, onLayTrack }) {
  const city = cityById(cityId);
  const tracks = useGameStore(s => s.tracks);

  if (!city) return null;

  const connectedTracks = tracks.filter(t => t.a === cityId || t.b === cityId);

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
          <div className="display uppercase" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--accent)', letterSpacing: '0.14em' }}>
            {city.size.toUpperCase()} · {city.state}
          </div>
          <div className="body-serif" style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            Pop. {city.pop}
          </div>
        </div>
      </div>

      <DividerDots />

      <div style={{ marginBottom: 10 }}>
        <Label>Rail Connections</Label>
        <div style={{ marginTop: 4 }}>
          {connectedTracks.length === 0 ? (
            <div className="body-serif" style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-dim)', fontStyle: 'italic' }}>No rail connections</div>
          ) : (
            connectedTracks.map((t, i) => {
              const otherId = t.a === cityId ? t.b : t.a;
              const other = cityById(otherId);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', borderBottom: '1px solid rgba(26,12,8,0.3)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.owner === 'player' ? 'var(--accent)' : t.owner === 'rival' ? 'var(--red)' : 'var(--text-muted)', flexShrink: 0 }}/>
                  <span className="body-serif" style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)' }}>{other?.name ?? otherId}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 'var(--font-size-label)', color: 'var(--text-dim)', fontFamily: 'IM Fell English SC, serif' }}>{t.owner}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <button className="btn-brass" onClick={onLayTrack} style={{ width: '100%', fontSize: 'var(--font-size-sm)' }}>
        ⚒ Lay Track From Here
      </button>
    </Panel>
  );
}
```

- [ ] **Step 3: Replace `src/components/hud/TrainDetailPanel.jsx` with:**

```jsx
import { useGameStore } from '../../store/gameStore.js';
import { cityById } from '../../data/cities.js';
import { Panel } from '../chrome/Panel.jsx';
import { LocomotiveIcon, CarIcon } from '../icons/index.js';
import { Label, DividerDots } from './helpers.jsx';

export function TrainDetailPanel({ trainId, onClose, onOpenRoute }) {
  const train = useGameStore(s => s.trains).find(t => t.id === trainId);
  const routes = useGameStore(s => s.routes);
  const route = routes.find(r => r.id === trainId);
  const ownedLocomotives = useGameStore(s => s.ownedLocomotives);
  const loco = route ? ownedLocomotives.find(l => l.uid === route.locomotiveUid) : null;
  const catalogId = loco?.catalogId ?? 'americ';

  if (!train) return null;

  return (
    <Panel
      title={train.name}
      style={{ width: 280 }}
      actions={
        <button className="btn-brass" onClick={onClose} style={{ fontSize: 10, padding: '2px 8px' }}>✕</button>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <LocomotiveIcon color={train.color} size={48} catalogId={catalogId} />
        <div>
          <div className="display uppercase gold" style={{ fontSize: 'var(--font-size-sm)', letterSpacing: '0.14em' }}>{train.model}</div>
          <div className="body-serif" style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{train.id}</div>
        </div>
      </div>

      <DividerDots />

      <div style={{ marginBottom: 8 }}>
        <Label>Route</Label>
        <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          {train.route.map((id, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="body-serif" style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-primary)' }}>
                {cityById(id)?.name ?? id}
              </span>
              {i < train.route.length - 1 && (
                <span style={{ color: 'var(--accent)', fontSize: 10 }}>→</span>
              )}
            </span>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <Label>Consist</Label>
        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
          {train.cars.map((type, i) => (
            <CarIcon key={i} type={type} size={28} />
          ))}
        </div>
      </div>

      {route && (
        <>
          <DividerDots />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Label>Revenue/tick</Label>
              <div className="numeric" style={{ fontSize: 14, color: 'var(--green)' }}>
                ${route.revenuePerTick.toLocaleString()}
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <span style={{ padding: '2px 8px', background: route.status === 'running' ? '#3d5c2a' : '#6a4a28', color: 'var(--text-primary)', fontFamily: 'IM Fell English SC, serif', fontSize: 10 }}>
                {route.status.toUpperCase()}
              </span>
            </div>
          </div>
          <button className="btn-brass" onClick={onOpenRoute} style={{ marginTop: 10, width: '100%', fontSize: 'var(--font-size-label)' }}>
            Open in Dispatch Office
          </button>
        </>
      )}
    </Panel>
  );
}
```

- [ ] **Step 4: Replace `src/components/hud/FleetPanel.jsx` with:**

```jsx
import { useGameStore } from '../../store/gameStore.js';
import { Panel } from '../chrome/Panel.jsx';

export function FleetPanel() {
  const trains       = useGameStore(s => s.trains);
  const focusTrainId = useGameStore(s => s.focusTrainId);
  const selectTrain  = useGameStore(s => s.selectTrain);

  return (
    <Panel title="Fleet Register" style={{ width: 280 }}>
      {trains.map(tr => (
        <div key={tr.id} onClick={() => selectTrain(tr.id)}
             style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', cursor: 'pointer', background: focusTrainId === tr.id ? 'rgba(196,154,68,0.15)' : 'transparent', borderBottom: '1px solid rgba(26,12,8,0.4)' }}>
          <div style={{ width: 4, height: 28, background: tr.color, border: '1px solid var(--border-strong)' }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="display uppercase" style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-primary)', letterSpacing: '0.14em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tr.name}</div>
            <div className="body-serif" style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{tr.id} · {tr.model}</div>
          </div>
        </div>
      ))}
    </Panel>
  );
}
```

- [ ] **Step 5: Build**

```bash
cd /Users/janriissorensen/projects/railroad && npm run build 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add src/components/hud/CompanyPanel.jsx src/components/hud/CityDetailPanel.jsx src/components/hud/TrainDetailPanel.jsx src/components/hud/FleetPanel.jsx
git commit -m "feat: update HUD panels to use CSS theme variables"
```

---

### Task 6: Screen components

**Files:**
- Modify: `src/components/screens/DepotScreen.jsx`
- Modify: `src/components/screens/RouteSchedulerScreen.jsx`
- Modify: `src/components/screens/TrackLayingScreen.jsx`
- Modify: `src/components/screens/MapScreen.jsx`

- [ ] **Step 1: Replace `src/components/screens/DepotScreen.jsx` with:**

```jsx
import { useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { Panel } from '../chrome/Panel.jsx';
import { LocomotiveIcon, BigLocomotiveEngraving } from '../icons/index.js';
import { Label, DividerDots } from '../hud/helpers.jsx';
import { LOCOMOTIVES } from '../../data/locomotives.js';

function Spec({ label, value }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <Label>{label}</Label>
      <div className="numeric" style={{ fontSize: 14, color: 'var(--accent)', marginTop: 2 }}>{value}</div>
    </div>
  );
}

export function DepotScreen({ onBack }) {
  const buyLocomotive = useGameStore(s => s.buyLocomotive);
  const cash          = useGameStore(s => s.cash);
  const [selectedId, setSelectedId] = useState(LOCOMOTIVES[0].id);
  const [qty, setQty]     = useState(1);
  const [ordered, setOrdered] = useState(false);

  const loco = LOCOMOTIVES.find(l => l.id === selectedId);
  const available = loco.availability === 'Available';
  const canAfford = cash >= loco.price * qty;

  function handleOrder() {
    const uids = buyLocomotive(loco.id, qty);
    if (uids) {
      setOrdered(true);
      setTimeout(() => setOrdered(false), 1500);
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, background: 'var(--bg-base)' }}>
      {/* Left: locomotive list */}
      <div className="wood-dark" style={{ width: 300, borderRight: '1px solid var(--border-strong)', padding: 14, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' }}>
        <div className="display uppercase gold" style={{ fontSize: 13, letterSpacing: '0.2em', textAlign: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          ⚙ Locomotive Catalogue ⚙
        </div>

        {LOCOMOTIVES.map(l => {
          const isSelected = l.id === selectedId;
          const isAvailable = l.availability === 'Available';
          return (
            <div key={l.id}
                 onClick={() => { setSelectedId(l.id); setQty(1); setOrdered(false); }}
                 style={{
                   padding: 10, cursor: 'pointer',
                   background: isSelected ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                   border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-strong)',
                   opacity: isAvailable ? 1 : 0.6,
                 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LocomotiveIcon color={isAvailable ? 'var(--accent)' : 'var(--text-muted)'} size={32} catalogId={l.id} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="display uppercase" style={{ fontSize: 'var(--font-size-label)', color: isAvailable ? 'var(--text-primary)' : 'var(--text-muted)', letterSpacing: '0.12em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.name}
                  </div>
                  <div className="body-serif" style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{l.years}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="numeric" style={{ fontSize: 'var(--font-size-sm)', color: isAvailable ? 'var(--green)' : 'var(--red)' }}>
                    ${l.price.toLocaleString()}
                  </div>
                  {!isAvailable && (
                    <div style={{ fontSize: 9, color: 'var(--red)', fontFamily: 'IM Fell English SC, serif' }}>
                      {l.availability}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: 'auto', paddingTop: 12 }}>
          <button className="btn-brass" onClick={onBack} style={{ width: '100%' }}>← Return to Map</button>
        </div>
      </div>

      {/* Right: detail */}
      <div style={{ flex: 1, padding: 24, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Panel title={loco.name}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 2 }}>
            <BigLocomotiveEngraving color={available ? '#c49a44' : '#6a6a5a'} catalogId={loco.id} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ padding: '3px 12px', background: available ? '#3d5c2a' : '#6a4a28', color: 'var(--text-primary)', fontFamily: 'IM Fell English SC, serif', fontSize: 11, letterSpacing: '0.14em' }}>
              {loco.era}
            </span>
            <span className="body-serif" style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>{loco.years}</span>
            {!available && (
              <span style={{ padding: '2px 8px', background: '#4a1a1a', color: 'var(--red)', fontFamily: 'IM Fell English SC, serif', fontSize: 10 }}>
                {loco.availability}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, padding: '12px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
            <Spec label="Price" value={'$' + loco.price.toLocaleString()} />
            <Spec label="Max Speed" value={loco.maxSpeed + ' mph'} />
            <Spec label="Power" value={loco.power} />
            <Spec label="Reliability" value={loco.reliability} />
            <Spec label="Best For" value={loco.best} />
          </div>

          <div className="body-serif" style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
            {loco.description}
          </div>

          <DividerDots />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <Label>Quantity</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <button className="btn-brass" style={{ padding: '4px 10px', fontSize: 14 }}
                        onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                <input value={qty} readOnly className="field-parchment"
                       style={{ width: 40, textAlign: 'center', margin: '0 4px' }}/>
                <button className="btn-brass" style={{ padding: '4px 10px', fontSize: 14 }}
                        onClick={() => setQty(q => q + 1)}>+</button>
              </div>
            </div>

            <div>
              <Label>Total Cost</Label>
              <div className="numeric" style={{ fontSize: 18, color: canAfford && available ? 'var(--text-primary)' : 'var(--red)', marginTop: 4 }}>
                ${(loco.price * qty).toLocaleString()}
              </div>
            </div>

            <div>
              <Label>Treasury</Label>
              <div className="numeric" style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
                ${cash.toLocaleString()}
              </div>
            </div>

            <div style={{ marginLeft: 'auto' }}>
              <button className="btn-brass"
                      style={{ fontSize: 15, padding: '10px 24px' }}
                      disabled={!available || !canAfford}
                      onClick={handleOrder}>
                {ordered ? '✓ Ordered!' : !available ? 'Unavailable' : !canAfford ? 'Insufficient Funds' : 'Place Order'}
              </button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/components/screens/RouteSchedulerScreen.jsx` with:**

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
      <div className="numeric" style={{ fontSize: 16, color: accent ? 'var(--green)' : 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

function RouteBuilder({ onDone, onCancel }) {
  const tracks           = useGameStore(s => s.tracks);
  const ownedLocomotives = useGameStore(s => s.ownedLocomotives);
  const createRoute      = useGameStore(s => s.createRoute);
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
            <span key={i} style={{ padding: '3px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--accent)', color: 'var(--text-primary)', fontFamily: 'IM Fell English SC', fontSize: 12 }}>
              {cityById(id).name}
            </span>
          ))}
          {stops.length > 0 && <span style={{ color: 'var(--accent)', fontSize: 18 }}>→</span>}
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
          <div className="body-serif" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--red)', marginTop: 6 }}>No idle locomotives — buy one in Locomotive Works.</div>
        ) : (
          <select className="field-parchment" style={{ marginTop: 6, width: '100%' }}
                  value={locoUid} onChange={e => setLocoUid(e.target.value)}>
            <option value="">Select locomotive…</option>
            {idleLocos.map(l => <option key={l.uid} value={l.uid}>{l.name} ({l.uid})</option>)}
          </select>
        )}
      </div>

      {error && <div style={{ color: 'var(--red)', fontSize: 'var(--font-size-sm)', marginBottom: 8 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-brass" style={{ flex: 1 }} onClick={handleDispatch}>Dispatch</button>
        <button className="btn-brass" onClick={onCancel}>Cancel</button>
      </div>
    </Panel>
  );
}

export function RouteSchedulerScreen({ onBack }) {
  const routes           = useGameStore(s => s.routes);
  const trains           = useGameStore(s => s.trains);
  const suspendRoute     = useGameStore(s => s.suspendRoute);
  const ownedLocomotives = useGameStore(s => s.ownedLocomotives);
  const [building, setBuilding] = useState(false);
  const [selectedId, setSelectedId] = useState(routes[0]?.id ?? null);

  const route = routes.find(r => r.id === selectedId);

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, background: 'var(--bg-base)' }}>
      <div className="wood-dark" style={{ width: 280, borderRight: '1px solid var(--border-strong)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
        <div className="display uppercase gold" style={{ fontSize: 13, letterSpacing: '0.2em', textAlign: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>⚜ Standing Orders ⚜</div>

        {routes.map(r => (
          <div key={r.id} onClick={() => { setSelectedId(r.id); setBuilding(false); }}
               style={{ padding: 10, cursor: 'pointer', background: selectedId === r.id ? 'var(--bg-elevated)' : 'var(--bg-surface)', border: selectedId === r.id ? '1px solid var(--accent)' : '1px solid var(--border-strong)' }}>
            <div className="display uppercase" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', letterSpacing: '0.12em' }}>{r.name}</div>
            <div className="body-serif" style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 2 }}>
              {r.stops.map(id => cityById(id).name).join(' → ')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ padding: '1px 6px', background: r.status === 'running' ? '#3d5c2a' : '#6a4a28', color: 'var(--text-primary)', fontFamily: 'IM Fell English SC', fontSize: 9 }}>{r.status.toUpperCase()}</span>
              <span className="numeric" style={{ fontSize: 'var(--font-size-label)', color: 'var(--green)' }}>+${(r.revenuePerTick/1000).toFixed(1)}K/tick</span>
            </div>
          </div>
        ))}

        {routes.length === 0 && !building && (
          <div className="body-serif" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: 12 }}>No routes yet. Buy a locomotive, then create a route.</div>
        )}

        <button className="btn-brass" style={{ marginTop: 4 }} onClick={() => { setBuilding(true); setSelectedId(null); }}>+ New Route</button>
        <button className="btn-brass" onClick={onBack} style={{ marginTop: 'auto' }}>← Return to Map</button>
      </div>

      <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
        {building && (
          <RouteBuilder onDone={() => setBuilding(false)} onCancel={() => setBuilding(false)} />
        )}

        {!building && route && (
          <Panel title={route.name}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
              {(() => {
                const train = trains.find(t => t.id === route.id);
                const locoOwned = ownedLocomotives.find(l => l.uid === route.locomotiveUid);
                return train ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <LocomotiveIcon color={train.color} size={56} catalogId={locoOwned?.catalogId ?? 'americ'}/>
                    <div>
                      <div className="display uppercase gold" style={{ fontSize: 'var(--font-size-sm)' }}>{train.name}</div>
                      <div className="body-serif" style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{train.model}</div>
                    </div>
                  </div>
                ) : null;
              })()}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
                <FinStat label="Revenue/tick" value={'$' + route.revenuePerTick.toLocaleString()} accent={true}/>
              </div>
            </div>

            <DividerDots />

            <div style={{ marginBottom: 12 }}>
              <Label>Stops</Label>
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {route.stops.map((id, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ padding: '3px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'IM Fell English SC', fontSize: 12 }}>
                      {cityById(id).name}
                    </span>
                    {i < route.stops.length - 1 && <span style={{ color: 'var(--accent)', fontSize: 16 }}>→</span>}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-brass"
                      style={{ flex: 1 }}
                      disabled={route.status === 'suspended'}
                      onClick={() => suspendRoute(route.id)}>
                ⏸ Suspend Route
              </button>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Replace `src/components/screens/TrackLayingScreen.jsx` with:**

```jsx
import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { Panel } from '../chrome/Panel.jsx';
import { CITIES, cityById } from '../../data/cities.js';
import { curvyPath, buildTrackGeo } from '../../utils/geometry.js';
import { Label, DividerDots } from '../hud/helpers.jsx';

const PREVIEW_FROM = 'den';
const PREVIEW_TO   = 'kc';

export function TrackLayingScreen({ onBack }) {
  const tracks    = useGameStore(s => s.tracks);
  const cash      = useGameStore(s => s.cash);
  const trackCost = useGameStore(s => s.trackCost);

  const trackGeo = useMemo(() => buildTrackGeo(tracks, CITIES), [tracks]);

  const playerCount  = tracks.filter(t => t.owner === 'player').length;
  const rivalCount   = tracks.filter(t => t.owner === 'rival').length;
  const neutralCount = tracks.filter(t => t.owner === 'neutral').length;

  const exampleCost = trackCost(PREVIEW_FROM, PREVIEW_TO);
  const exampleFrom = cityById(PREVIEW_FROM);
  const exampleTo   = cityById(PREVIEW_TO);
  const exampleArc  = exampleFrom && exampleTo
    ? curvyPath(exampleFrom.x, exampleFrom.y, exampleTo.x, exampleTo.y, 0.15, 99)
    : null;

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, background: 'var(--bg-base)' }}>
      <div className="wood-dark" style={{ width: 320, borderRight: '1px solid var(--border-strong)', padding: 14, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}>
        <div className="display uppercase gold" style={{ fontSize: 13, letterSpacing: '0.2em', textAlign: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          ⚒ Track Laying Operations ⚒
        </div>

        <Panel title="How to Lay Track" style={{ flexShrink: 0 }}>
          <div className="body-serif" style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <p style={{ margin: '0 0 8px' }}>1. Return to the <strong style={{ color: 'var(--text-primary)' }}>Map Room</strong>.</p>
            <p style={{ margin: '0 0 8px' }}>2. Click any city node to open its detail panel.</p>
            <p style={{ margin: '0 0 8px' }}>3. Click <em>"⚒ Lay Track From Here"</em> — the city glows gold.</p>
            <p style={{ margin: '0 0 8px' }}>4. Hover another city to see the cost preview arc.</p>
            <p style={{ margin: '0' }}>5. Click <em>"⚒ Break Ground"</em> to build if funds allow.</p>
          </div>
        </Panel>

        <Panel title="Network Status" style={{ flexShrink: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
            <div>
              <Label>Your Lines</Label>
              <div className="numeric gold" style={{ fontSize: 20 }}>{playerCount}</div>
            </div>
            <div>
              <Label>Rival Lines</Label>
              <div className="numeric" style={{ fontSize: 20, color: 'var(--red)' }}>{rivalCount}</div>
            </div>
            <div>
              <Label>Neutral</Label>
              <div className="numeric" style={{ fontSize: 20, color: 'var(--text-muted)' }}>{neutralCount}</div>
            </div>
          </div>
          <DividerDots />
          <div>
            <Label>Treasury</Label>
            <div className="numeric gold" style={{ fontSize: 16, marginTop: 4 }}>${cash.toLocaleString()}</div>
          </div>
        </Panel>

        {exampleCost > 0 && (
          <Panel title="Example Route Cost" style={{ flexShrink: 0 }}>
            <div className="body-serif" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 8 }}>
              {exampleFrom.name} → {exampleTo.name}
            </div>
            <div className="numeric" style={{ fontSize: 20, color: cash >= exampleCost ? 'var(--green)' : 'var(--red)' }}>
              ${exampleCost.toLocaleString()}
            </div>
            <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-dim)', marginTop: 4, fontFamily: 'IM Fell English SC, serif' }}>
              {cash >= exampleCost ? 'Funds available' : 'Insufficient funds'}
            </div>
          </Panel>
        )}

        <div style={{ marginTop: 'auto' }}>
          <button className="btn-brass" onClick={onBack} style={{ width: '100%' }}>← Return to Map</button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div className="map-paper" style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 80px rgba(80,40,20,0.5)' }}>
          <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet"
               style={{ width: '100%', height: '100%', display: 'block' }}>
            <defs>
              <pattern id="tls-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#8a6a3a" strokeWidth="0.25" opacity="0.2"/>
              </pattern>
            </defs>
            <rect width="1600" height="900" fill="url(#tls-grid)"/>

            {trackGeo.map((t, i) => {
              const colors = { player: '#8b6a30', rival: '#6a2a1a', neutral: '#5a5a4a' };
              return (
                <g key={i}>
                  <path d={t.d} fill="none" stroke={colors[t.owner] || colors.neutral} strokeWidth={t.owner === 'player' ? 4 : 3} strokeLinecap="round"/>
                  <path d={t.d} fill="none" stroke={t.owner === 'player' ? '#c49a44' : '#7a7060'} strokeWidth={t.owner === 'player' ? 1.5 : 1} strokeDasharray={t.owner === 'neutral' ? '4 4' : 'none'} strokeLinecap="round" opacity={0.6}/>
                </g>
              );
            })}

            {exampleArc && (
              <path d={exampleArc.d} fill="none" stroke="#c49a44" strokeWidth="3" strokeDasharray="8 4" opacity="0.85"/>
            )}

            {CITIES.map(city => {
              const r = city.size === 'metro' ? 7 : city.size === 'city' ? 5 : 4;
              const isExample = city.id === PREVIEW_FROM || city.id === PREVIEW_TO;
              return (
                <g key={city.id}>
                  {isExample && (
                    <circle cx={city.x} cy={city.y} r={r + 6} fill="none" stroke="#c49a44" strokeWidth="1.5" opacity="0.6"/>
                  )}
                  <circle cx={city.x} cy={city.y} r={r}
                          fill={city.size === 'metro' ? '#c49a44' : '#a88238'}
                          stroke="#1a0c08" strokeWidth="1.2"/>
                  <circle cx={city.x} cy={city.y} r={r * 0.45} fill="rgba(255,240,180,0.6)"/>
                  {isExample && (
                    <text x={city.x} y={city.y - r - 5}
                          textAnchor="middle" fontSize="11"
                          fontFamily="IM Fell English SC, serif"
                          fill="#f0d896" stroke="#1a0c08" strokeWidth="3" paintOrder="stroke">
                      {city.name}
                    </text>
                  )}
                </g>
              );
            })}

            <g transform="translate(20, 820)">
              <rect width="260" height="66" rx="2" fill="rgba(26,12,8,0.8)" stroke="#c49a44" strokeWidth="0.8"/>
              <text x="12" y="18" fontSize="9" fontFamily="IM Fell English SC, serif" fill="#f0d896" letterSpacing="0.15em">LEGEND</text>
              <line x1="12" y1="28" x2="40" y2="28" stroke="#c49a44" strokeWidth="3"/>
              <text x="46" y="31" fontSize="10" fontFamily="IM Fell English SC, serif" fill="#c49a44">Your Railroad</text>
              <line x1="12" y1="44" x2="40" y2="44" stroke="#6a2a1a" strokeWidth="3"/>
              <text x="46" y="47" fontSize="10" fontFamily="IM Fell English SC, serif" fill="#a86040">Rival Railroad</text>
              <line x1="12" y1="58" x2="40" y2="58" stroke="#5a5a4a" strokeWidth="2" strokeDasharray="4 3"/>
              <text x="46" y="61" fontSize="10" fontFamily="IM Fell English SC, serif" fill="#8b8070">Neutral / Unowned</text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Replace `src/components/screens/MapScreen.jsx` with:**

```jsx
import { useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { MapView } from '../map/MapView.jsx';
import { CompanyPanel } from '../hud/CompanyPanel.jsx';
import { FleetPanel } from '../hud/FleetPanel.jsx';
import { TrainDetailPanel } from '../hud/TrainDetailPanel.jsx';
import { CityDetailPanel } from '../hud/CityDetailPanel.jsx';

export function MapScreen({ hudVisible }) {
  const selectedCityId   = useGameStore(s => s.selectedCityId);
  const focusTrainId     = useGameStore(s => s.focusTrainId);
  const selectTrain      = useGameStore(s => s.selectTrain);
  const navigate         = useGameStore(s => s.navigate);
  const startTrackLaying = useGameStore(s => s.startTrackLaying);
  const selectCity       = useGameStore(s => s.selectCity);

  return (
    <div style={{ flex: 1, position: 'relative', display: 'flex', minHeight: 0 }}>
      <MapView />

      {hudVisible && (
        <>
          <div style={{ position: 'absolute', left: 14, top: 14, bottom: 14, display: 'flex', flexDirection: 'column', gap: 12, pointerEvents: 'none' }}>
            <div style={{ pointerEvents: 'auto' }}><CompanyPanel /></div>
            <div style={{ pointerEvents: 'auto', flex: 1, minHeight: 0, overflow: 'auto' }}><FleetPanel /></div>
          </div>

          <div style={{ position: 'absolute', right: 14, top: 14, bottom: 14, display: 'flex', flexDirection: 'column', gap: 12, pointerEvents: 'none' }}>
            {focusTrainId && (
              <div style={{ pointerEvents: 'auto' }}>
                <TrainDetailPanel trainId={focusTrainId} onClose={() => selectTrain(null)} onOpenRoute={() => navigate('route')} />
              </div>
            )}
            {selectedCityId && !focusTrainId && (
              <div style={{ pointerEvents: 'auto' }}>
                <CityDetailPanel cityId={selectedCityId} onClose={() => selectCity(null)}
                                 onLayTrack={() => startTrackLaying(selectedCityId)} />
              </div>
            )}
          </div>

          <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, padding: 8, background: 'var(--bg-dock)', border: '1px solid var(--border-strong)', boxShadow: 'inset 0 1px 0 rgba(255,200,140,0.15), 0 4px 12px rgba(0,0,0,0.6)' }}>
            <button className="btn-brass" onClick={() => startTrackLaying(null)}>⚿ Lay Track</button>
            <button className="btn-brass" onClick={() => navigate('depot')}>⚙ Locomotive Works</button>
            <button className="btn-brass" onClick={() => navigate('route')}>✒ Dispatch</button>
            <div style={{ width: 1, background: 'var(--border-strong)', margin: '0 4px' }}/>
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

- [ ] **Step 5: Run all tests to confirm nothing broke**

```bash
cd /Users/janriissorensen/projects/railroad && npm test 2>&1 | tail -10
```

Expected: all 17 tests pass (theme changes are purely visual, no store logic changed).

- [ ] **Step 6: Build**

```bash
npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 7: Commit**

```bash
git add src/components/screens/DepotScreen.jsx src/components/screens/RouteSchedulerScreen.jsx src/components/screens/TrackLayingScreen.jsx src/components/screens/MapScreen.jsx
git commit -m "feat: update all screen components to use CSS theme variables"
```

---

### Task 7: End-to-end browser verification

**Files:** None — verification only.

- [ ] **Step 1: Start dev server**

```bash
cd /Users/janriissorensen/projects/railroad && npm run dev
```

- [ ] **Step 2: Verify Victorian theme (default)**

Open http://localhost:5173. Expected: identical to current look — dark brown/amber.

- [ ] **Step 3: Switch to Modern and verify all screens**

Click 🎨 → Modern. Walk through every screen:

1. **Map Room** — parchment map unchanged; HUD panels show near-white text on warm dark background; bottom dock bar updated
2. **Locomotive Works** — list items and detail panel text clearly readable; large engraving unchanged (it controls its own colors)
3. **Dispatch Office** — route list and route builder use variables
4. **Track Laying** — left panel text readable; SVG mini-map unchanged (map visualization colors are data-driven)

- [ ] **Step 4: Verify persistence**

With Modern active, hard-reload (Cmd+Shift+R). Expected: Modern theme loads instantly (no flash of Victorian on reload).

- [ ] **Step 5: Verify Victorian persistence**

Switch back to Victorian, reload. Expected: stays Victorian.

- [ ] **Step 6: Final commit tag**

```bash
git add -A
git status  # confirm nothing stray
git log --oneline -6
```

---

## Self-Review

**Spec coverage:**
- ✅ Two themes: Victorian (default) and Modern (C1 Warm Slate + Gold)
- ✅ CSS custom properties on `:root` and `[data-theme="modern"]`
- ✅ `ThemeContext` with `useTheme()` hook
- ✅ `data-theme` applied to `document.documentElement`
- ✅ Palette button in TitleBar between stats and Hide HUD
- ✅ Two-item dropdown, active item marked ✓
- ✅ Closes on outside click
- ✅ `localStorage` key `iron-empire-theme` persists across reloads
- ✅ All 16 component files updated
- ✅ Parchment map and brass buttons unchanged
- ✅ SVG map visualization colors (track/city) unchanged — data-driven, not theme tokens

**Placeholder scan:** None.

**Type consistency:** `useTheme()` returns `{ theme, setTheme }`. TitleBar calls `setTheme(t.id)` with `t.id` being `'modern'` or `'victorian'`. `ThemeContext` reads same strings. ✅
