# Higgsfield credit ledger

Plan: starter. Budget envelopes are in [PLAN.md §6](PLAN.md#6-graphics-with-higgsfield--credit-tracking).
Re-read the balance from the account (`higgsfield account` or the Higgsfield `balance` tool) after every
batch. Do not estimate it.

**Current balance: 315.75** (as of 2026-11-21, re-read after the M6 locomotives)

| Envelope | Budget | Spent | Left |
|---|---:|---:|---:|
| Style exploration | 30 | 5 | 25 |
| Terrain + track tiles | 80 | 12.5 | 67.5 |
| Buildings, stations, industries | 90 | 18.75 | 71.25 |
| Locomotives & cars | 80 | 8.75 | 71.25 |
| UI + title/marketing | 40 | 0 | 40 |
| Reserve | 40.75 | 0 | 40.75 |

## Log

| Date | Asset / batch | Model | Est. cost | Balance before | Balance after | Notes |
|---|---|---|---:|---:|---:|---|
| 2026-11-21 | — (opening balance) | — | — | — | 360.75 | Starting point |
| 2026-11-21 | Style test: 4 sheets (painterly, flat vector, pixel, unstyled default) of terrain, track, station, houses, loco, cars, sawmill | gpt_image_2_6, high, 1k, 1:1 | 4 × 1.25 = 5 | 360.75 | 355.75 | Saved in `assets/style-test/`. A planned diorama variant was skipped by a script bug (zsh arrays); the 4th job ran without a style line instead |
| 2026-11-21 | Art batch 1 (approved by user, ~36 quoted): 10 terrain tiles, 3 stations, 6 industries, 4 houses, loco, passenger car, freight car = 26 images | gpt_image_2_6, high, 1k, 1:1, flat.jpg as reference | 26 × 1.25 = 32.5 | 355.75 | 323.25 | First run hit the starter plan's 4-concurrent-job limit (rejected jobs were not charged); rerun 3 at a time. Raw output in `assets/raw/` (gitignored) |
| 2026-11-21 | M5 sprites: coal mine, coal yard | gpt_image_2_6, high, 1k, 1:1, flat.jpg as reference | 2 × 1.25 = 2.5 | 323.25 | 320.75 | Under the 30-credit approval threshold |
| 2026-11-21 | M6 locomotives: Ironside, Courier, Hauler, Pathfinder (Pioneer reuses `loco`) | gpt_image_2_6, high, 1k, 1:1, flat.jpg as reference | 4 × 1.25 = 5 | 320.75 | 315.75 | Under the 30-credit approval threshold |
