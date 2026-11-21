# BDD harness

Gherkin specs for the simulation, run with cucumber-js and tsx. Specs are grouped by milestone
(`features/m1-track/`, ...). Steps drive the headless `Game` from `src/sim`; there is no renderer.

## Layout

- `features/support/world.ts`: `SimWorld`, one fresh instance per scenario. Holds the `Game`
  (`this.game`, throws if no game has been created yet), `lastResult` (the last `CommandResult`) and
  `cashBeforeLastCommand`. `this.run(g => g.command(...))` runs a command and records both.
- `features/support/parameter-types.ts`: custom Cucumber parameter types.
- `features/steps/*.steps.ts`: step definitions.

## Parameter types

| Type        | Matches                                                            | Value     |
| ----------- | ------------------------------------------------------------------ | --------- |
| `{coord}`   | `(3, 4)`                                                           | `{x, y}`  |
| `{money}`   | `$1,250,000` or `$500`                                             | number    |
| `{terrain}` | `plains`, `forest`, `hills`, `mountain`, `water` (from `TERRAINS`) | `Terrain` |

## Step conventions

- **Fixture steps** (`Given`) set up state directly and never charge money, for example
  `the company has $X in cash` or `the tile (2, 3) is hills`.
- **Action steps** (`When`) must go through `this.run(g => g.command(...))` so the real command
  path, validation and costs are exercised.
- **Assertion steps** (`Then`) read state or `this.lastResult`.

### Gotcha: keywords are ignored

Cucumber matches steps on the text only, not on `Given`/`When`/`Then`. A `Given` and a `Then` with the
same wording would be the same step. Word fixtures and assertions differently, for example
`the company has $X in cash` (fixture) versus `the company's cash is $X` (assertion).

## `@wip` workflow

1. Write the scenario and tag it `@wip` (plus a milestone tag such as `@m1`). It documents behaviour that
   is not implemented yet.
2. Implement until it passes, then remove `@wip`.

The default profile excludes `@wip`. Strict mode is on, so undefined or pending steps fail the run.

## Running

```
npm test            # typecheck, unit tests, BDD
npm run test:bdd    # scenarios except @wip; writes reports/cucumber.html
npm run test:wip    # only the @wip backlog
```

Run one feature or scenario with `NODE_OPTIONS='--import tsx' npx cucumber-js features/m1-track/build-track.feature`
(append `:LINE` to select a scenario).
