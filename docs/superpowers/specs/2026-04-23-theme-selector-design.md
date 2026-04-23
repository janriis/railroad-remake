# Iron Empire — Theme Selector Design Spec

_Date: 2026-04-23_

---

## Overview

Add a theme selector to Iron Empire so players can switch between the current Victorian dark theme and a new Modern theme with higher contrast and better readability. The selector lives in the title bar as a palette icon button. The chosen theme persists in `localStorage`.

---

## Themes

### Victorian (default — unchanged)

The existing look. Dark brown wood-grain backgrounds, amber/gold text, ornamental IM Fell English SC typography.

| Token | Value |
|---|---|
| `--bg-base` | `#0a0604` |
| `--bg-surface` | `#231408` |
| `--bg-elevated` | `#3a1f18` |
| `--bg-selected` | `linear-gradient(180deg,#6a4a28,#3a1f18)` |
| `--text-primary` | `#f0d896` |
| `--text-secondary` | `#a88238` |
| `--text-dim` | `#6a5030` |
| `--text-muted` | `#8b8070` |
| `--accent` | `#c49a44` |
| `--accent-bright` | `#f0d896` |
| `--border` | `rgba(196,154,68,0.3)` |
| `--border-strong` | `#1a0c08` |
| `--green` | `#6bbf5a` |
| `--red` | `#c85040` |
| `--font-size-base` | `11px` |
| `--font-size-sm` | `10px` |
| `--font-size-label` | `9px` |

### Modern (new — C1 Warm Slate + Gold)

Warmer dark base, near-white main text, gold accent retained. Same IM Fell English SC for headings and navigation. Body font sizes bumped +2px throughout.

| Token | Value |
|---|---|
| `--bg-base` | `#171310` |
| `--bg-surface` | `#1c1714` |
| `--bg-elevated` | `#2e2318` |
| `--bg-selected` | `linear-gradient(180deg,#3a2a18,#2a1f14)` |
| `--text-primary` | `#f5f0e8` |
| `--text-secondary` | `#9d9080` |
| `--text-dim` | `#6b6358` |
| `--text-muted` | `#7a7268` |
| `--accent` | `#c49a44` |
| `--accent-bright` | `#f5f0e8` |
| `--border` | `rgba(196,154,68,0.2)` |
| `--border-strong` | `rgba(255,255,255,0.08)` |
| `--green` | `#6dcc58` |
| `--red` | `#e06060` |
| `--font-size-base` | `13px` |
| `--font-size-sm` | `12px` |
| `--font-size-label` | `11px` |

---

## Architecture

### CSS custom properties

All color and size tokens are defined as CSS custom properties in `styles.css`.

```css
/* Victorian (default) */
:root {
  --bg-base: #0a0604;
  /* ... all tokens ... */
}

/* Modern override */
[data-theme="modern"] {
  --bg-base: #171310;
  /* ... overrides ... */
}
```

Applying the theme means setting `document.documentElement.setAttribute('data-theme', 'modern')` or removing the attribute. Every styled element reads from these variables.

### Inline styles in JSX

React inline styles accept CSS variable syntax: `style={{ color: 'var(--text-primary)' }}`. All hardcoded hex color values in JSX components are replaced with the matching CSS variable. Background gradients that differ by theme use a named variable (e.g., `--bg-selected`) rather than being written inline.

### Theme context

A new `src/context/ThemeContext.jsx` exports:

- `ThemeProvider` — wraps the app, reads initial theme from `localStorage` key `iron-empire-theme`, writes `data-theme` to `document.documentElement`, provides context
- `useTheme()` hook — returns `{ theme, setTheme }` where `theme` is `"victorian"` or `"modern"`

`App.jsx` wraps everything in `<ThemeProvider>`.

### Theme selector UI

`TitleBar.jsx` gains a palette button between the stats display and the "Hide HUD" button:

- Icon: `🎨` (or a small SVG palette icon)
- Clicking toggles a small dropdown (`position: absolute`) with two rows: **Modern** and **Victorian**, the active one marked with `✓`
- Clicking a row calls `setTheme(...)`, closes the dropdown, and the change is instant
- Dropdown closes on outside click (via a `useEffect` + document click listener)

---

## Files Changed

| File | Change |
|---|---|
| `src/styles.css` | Add CSS custom property definitions for both themes; replace all hardcoded color values in CSS classes with `var(--...)` |
| `src/context/ThemeContext.jsx` | New file — `ThemeProvider` + `useTheme` hook |
| `src/App.jsx` | Wrap render tree in `<ThemeProvider>` |
| `src/components/chrome/TitleBar.jsx` | Add palette button + dropdown |
| `src/components/chrome/Panel.jsx` | Replace hardcoded colors with CSS variables |
| `src/components/chrome/StatDisplay.jsx` | Replace hardcoded colors |
| `src/components/chrome/Ticker.jsx` | Replace hardcoded colors |
| `src/components/hud/CompanyPanel.jsx` | Replace hardcoded colors |
| `src/components/hud/FleetPanel.jsx` | Replace hardcoded colors |
| `src/components/hud/TrainDetailPanel.jsx` | Replace hardcoded colors |
| `src/components/hud/CityDetailPanel.jsx` | Replace hardcoded colors |
| `src/components/screens/DepotScreen.jsx` | Replace hardcoded colors |
| `src/components/screens/RouteSchedulerScreen.jsx` | Replace hardcoded colors |
| `src/components/screens/TrackLayingScreen.jsx` | Replace hardcoded colors |
| `src/components/screens/MapScreen.jsx` | Replace hardcoded colors |
| `src/components/map/MapView.jsx` | Replace hardcoded colors (parchment map background is theme-independent) |

---

## Persistence

Theme preference is stored separately from game state, in `localStorage` under the key `iron-empire-theme`. Value is `"victorian"` or `"modern"`. Defaults to `"victorian"` if absent.

This is intentionally separate from the Zustand `persist` store — theme is a display preference, not game state.

---

## What Does Not Change

- The parchment map background (`.map-paper`) — stays the same in both themes
- Locomotive sprite colorization — controlled by the train's livery color, not the theme
- The brass button (`.btn-brass`) gradient — same in both themes, it's a UI element, not a background surface
- All game logic, store, and data files

---

## Out of Scope

- More than two themes
- Per-component theme overrides
- Light mode
- Animated theme transition
