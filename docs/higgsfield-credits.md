# Higgsfield credit ledger

Plan: starter. Budget envelopes are in [PLAN.md §6](PLAN.md#6-graphics-with-higgsfield--credit-tracking).
Re-read the balance from the account (`higgsfield account` or the Higgsfield `balance` tool) after every
batch. Do not estimate it.

**Current balance: 355.75** (as of 2026-11-21, re-read after the style test)

| Envelope | Budget | Spent | Left |
|---|---:|---:|---:|
| Style exploration | 30 | 5 | 25 |
| Terrain + track tiles | 80 | 0 | 80 |
| Buildings, stations, industries | 90 | 0 | 90 |
| Locomotives & cars | 80 | 0 | 80 |
| UI + title/marketing | 40 | 0 | 40 |
| Reserve | 40.75 | 0 | 40.75 |

## Log

| Date | Asset / batch | Model | Est. cost | Balance before | Balance after | Notes |
|---|---|---|---:|---:|---:|---|
| 2026-11-21 | — (opening balance) | — | — | — | 360.75 | Starting point |
| 2026-11-21 | Style test: 4 sheets (painterly, flat vector, pixel, unstyled default) of terrain, track, station, houses, loco, cars, sawmill | gpt_image_2_6, high, 1k, 1:1 | 4 × 1.25 = 5 | 360.75 | 355.75 | Saved in `assets/style-test/`. A planned diorama variant was skipped by a script bug (zsh arrays); the 4th job ran without a style line instead |
