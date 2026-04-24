# Iron Empire — Auto-Save Design Spec

_Date: 2026-04-22_

---

## Overview

Add automatic, invisible game persistence to Iron Empire. The game serializes its full state to `localStorage` on every store change and rehydrates it on page load. Players never see a save button or loading screen — the game is simply where they left it after any reload.

---

## Tech Approach

Zustand's built-in `persist` middleware wraps the existing `create(...)` call in `src/store/gameStore.js`. No new packages are required — `persist` ships with Zustand 5.

**Storage key:** `"iron-empire-save"`  
**Storage backend:** `localStorage` (browser-native, survives tab close and reload)

---

## What Gets Persisted

The entire store is serialized — no fields are excluded:

| Field | Restored value |
|---|---|
| `cash`, `netWorth` | Player's exact financial state |
| `tracks` | Full track network including player-laid tracks |
| `trains` | All trains with current route/leg/progress |
| `routes` | All routes with status and revenuePerTick |
| `ownedLocomotives` | Owned locos and their assignments |
| `year`, `month` | Game date |
| `screen` | Last active tab (map/depot/route/track) |
| `selectedCityId` | Previously selected city, if any |
| `focusTrainId` | Previously selected train, if any |
| `trackLayingFrom` | Track-laying mode state, if mid-action |
| `version` | Schema version (starts at `1`) |

---

## Version Guard

A `version: 1` field is added to `INITIAL_STATE`. The `persist` middleware's `migrate` function checks the stored version against the current one. On mismatch, it returns `INITIAL_STATE` — wiping the old save and starting fresh rather than loading corrupted state.

When the store shape changes in a future feature, increment `version` by 1.

---

## Counter Fix

`_routeCounter` and `_locoCounter` are module-level variables that live outside the Zustand store. They are not serialized. Without correction, reloading would reset them to `1`, and new route/loco IDs could collide with ones already in the saved state.

Fix: the `onRehydrateStorage` callback runs after hydration and scans the loaded state:

- Find the max `N` in all route IDs matching `R-N` → set `_routeCounter = max + 1`
- Find the max `N` in all loco UIDs matching `L-N` → set `_locoCounter = max + 1`

If no routes or locos exist in the save, counters stay at `1`.

---

## Files Changed

| File | Change |
|---|---|
| `src/store/gameStore.js` | Wrap `create` with `persist`, add `version: 1` to `INITIAL_STATE`, add `onRehydrateStorage` counter fix |

No other files change. No UI changes.

---

## Player Experience

None visible. Reload the page — the game is exactly where it was left. No save indicator, no loading screen, no explicit save action required.

---

## Out of Scope

- Multiple save slots
- Cloud sync
- Export/import save file
- Save indicator in the UI
- Manual save/load controls
