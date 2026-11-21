# RailroadSim

An original railroad-building and management sim, written in TypeScript. You lay track, run trains and
grow a company. The simulation core is headless and deterministic, so game rules are specified as BDD
scenarios and tested without a renderer.

**Status:** early stage, M0 (foundation). The browser game is not playable yet.

## Quick start

```
npm install
npm test
```

`npm test` runs the typecheck, unit tests and BDD scenarios. `npm run lint` runs ESLint and Prettier checks;
`npm run format` applies Prettier.

## Docs

- [docs/PLAN.md](docs/PLAN.md): goals, architecture and milestones
- [features/README.md](features/README.md): the BDD harness and step conventions
