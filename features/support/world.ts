import { World, setWorldConstructor, type IWorldOptions } from '@cucumber/cucumber';
import { Game } from '../../src/sim/game';
import type { PlanResult } from '../../src/sim/planner';
import { TrackNetwork } from '../../src/sim/track';
import type { Train } from '../../src/sim/trains';
import { coordKey, type CommandResult } from '../../src/sim/types';

/**
 * One fresh World per scenario. Steps talk to the game only through `game` commands;
 * fixture steps may set state directly (see features/README.md).
 */
export class SimWorld extends World {
  private _game: Game | undefined;
  lastResult: CommandResult | undefined;
  cashBeforeLastCommand = 0;
  /** Games produced by map-generation steps, in order. */
  readonly generated: Game[] = [];
  /** Last route suggestion from the planner. */
  lastPlan: PlanResult | undefined;
  /** Trains created by fixtures, by role. "the train" is the latest normal train. */
  readonly normalTrains: Train[] = [];
  slowTrain: Train | undefined;
  /** Rule breaches seen by the hour-by-hour monitor while time passed. */
  readonly violations: string[] = [];
  everDeadlocked = false;

  constructor(options: IWorldOptions) {
    super(options);
  }

  get game(): Game {
    if (!this._game) throw new Error('No game yet: start the scenario with "Given a new game …"');
    return this._game;
  }

  set game(g: Game) {
    this._game = g;
  }

  get train(): Train {
    const t = this.normalTrains[this.normalTrains.length - 1];
    if (!t) throw new Error('No train yet: add "Given a train exists …"');
    return t;
  }

  get followingTrain(): Train {
    const t = this.normalTrains[0];
    if (!t) throw new Error('No following train in this scenario');
    return t;
  }

  /** Advance time hour by hour, checking that trains never share a line of track or a plain tile. */
  passHours(hours: number): void {
    for (let h = 0; h < hours; h++) {
      this.game.tick();
      const segments = new Map<string, number>();
      const tiles = new Map<string, number>();
      for (const t of this.game.trains) {
        if (t.next) {
          // On double track each direction is its own line.
          const key = this.game.track.isDouble(t.at, t.next)
            ? `${coordKey(t.at)}>${coordKey(t.next)}`
            : TrackNetwork.segmentKey(t.at, t.next);
          if (segments.has(key))
            this.violations.push(`hour ${this.game.time}: trains ${segments.get(key)} and ${t.id} on ${key}`);
          segments.set(key, t.id);
        }
        for (const c of t.next ? [t.at, t.next] : [t.at]) {
          if (this.game.isStation(c) || this.game.track.isDoubleTile(c)) continue;
          const key = coordKey(c);
          const other = tiles.get(key);
          if (other !== undefined && other !== t.id)
            this.violations.push(`hour ${this.game.time}: trains ${other} and ${t.id} on tile ${key}`);
          tiles.set(key, t.id);
        }
        if (t.deadlocked) this.everDeadlocked = true;
      }
    }
  }

  /** Run a command, remembering its result and the cash before it ran. */
  run(command: (g: Game) => CommandResult): CommandResult {
    this.cashBeforeLastCommand = this.game.cash;
    this.lastResult = command(this.game);
    return this.lastResult;
  }
}

setWorldConstructor(SimWorld);
