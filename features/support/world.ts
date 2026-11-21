import { World, setWorldConstructor, type IWorldOptions } from '@cucumber/cucumber';
import { Game } from '../../src/sim/game';
import type { CommandResult } from '../../src/sim/types';

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

  /** Run a command, remembering its result and the cash before it ran. */
  run(command: (g: Game) => CommandResult): CommandResult {
    this.cashBeforeLastCommand = this.game.cash;
    this.lastResult = command(this.game);
    return this.lastResult;
  }
}

setWorldConstructor(SimWorld);
