# RailroadSim

An original railroad-building sim in the railroad-tycoon genre. Do not use names, art, maps or scenarios
from existing games. Plan: [docs/PLAN.md](docs/PLAN.md).

## Commands
- `npm test`: typecheck, unit tests and BDD (must pass before every commit)
- `npm run test:bdd`: cucumber scenarios except `@wip`
- `npm run test:wip`: backlog scenarios that aren't implemented yet

## Rules
- `src/sim` is pure and deterministic: no DOM, no `Math.random` (use `Rng`), no wall-clock time.
- All state changes go through `Game` commands that return a `CommandResult` and are atomic.
- BDD first: write or agree the Gherkin scenario, then implement. A new spec starts as `@wip` and loses
  the tag when it passes.
- Step conventions (see `features/support/`):
  - `Given` fixture steps may set state directly and never charge money.
  - `When` steps must go through `this.run(g => g.command(...))`.
  - Cucumber ignores the Given/When/Then keyword when matching, so fixture and assertion phrasing must
    differ ("the company has $X in cash" vs "the company's cash is $X").
  - Use the `{coord}`, `{money}` and `{terrain}` parameter types.

## Delegation
Lead (Opus) owns architecture, sim algorithms, harness design and review. Simpler work (Gherkin drafts,
step boilerplate, tooling, UI panels, asset scripts, docs) goes to Sonnet subagents
(`model: "sonnet"`), and their output is reviewed before commit.

## Graphics / Higgsfield
Every Higgsfield generation must be logged in [docs/higgsfield-credits.md](docs/higgsfield-credits.md):
check the cost with `higgsfield generate cost` first, then re-read the real balance afterwards. Batches
over 30 credits need the user's OK.
