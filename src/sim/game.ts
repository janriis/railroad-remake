import {
  BRIDGE_SEGMENT_COST,
  CAR_RESALE_RATE,
  DEFAULT_STARTING_CASH,
  DEMOLISH_REFUND_RATE,
  DIAGONAL_COST_FACTOR,
  FREIGHT_CAR_COST,
  LOCOMOTIVE_COST,
  LOCOMOTIVE_TILES_PER_DAY,
  MAX_BRIDGE_WATER_TILES,
  MAX_CARS,
  PASSENGER_CAR_COST,
  STATION,
  TICKS_PER_DAY,
  TILE_UNITS,
  TRACK_COST,
  type StationSize,
} from './config';
import { GameMap } from './map';
import { generateWorld, type Town } from './mapgen';
import { findTrackPath } from './pathfinding';
import { planTrack, priceRoute, type PlanOptions, type PlanResult, type TrackPlan } from './planner';
import { Rng } from './rng';
import { TrackNetwork, isAdjacent, isDiagonal, straightPath } from './track';
import { advanceTrains, unitsPerTick, type CarCounts, type Train } from './trains';
import { coordKey, fail, ok, type CommandResult, type Coord, type Terrain } from './types';

export interface GameOptions {
  width: number;
  height: number;
  terrain?: Terrain;
  startingCash?: number;
  seed?: number;
}

export interface GenerateOptions {
  width: number;
  height: number;
  seed: number;
  startingCash?: number;
  towns?: number;
}

export interface Station {
  readonly id: number;
  readonly at: Coord;
  readonly size: StationSize;
  readonly radius: number;
}

export interface TrainOrder {
  at: Coord;
  locomotive: boolean;
  passengerCars?: number;
  freightCars?: number;
}

export interface SaveData {
  readonly version: 1;
  readonly gen: GenerateOptions;
  readonly cash: number;
  readonly time: number;
  readonly segments: { a: Coord; b: Coord; bridge: boolean }[];
  readonly stations: { at: Coord; size: StationSize }[];
  readonly trains: {
    at: Coord;
    tilesPerDay: number;
    passengerCars: number;
    freightCars: number;
    route: Coord[];
    stopOrders?: (CarCounts | null)[];
    target: number;
  }[];
}

const fmt = (c: Coord) => `(${c.x}, ${c.y})`;

/**
 * The single entry point for changing game state. Every command is atomic:
 * it either succeeds and applies all its effects, or fails and changes nothing.
 * A successful command's `cost` is what it took from cash (negative for refunds).
 */
export class Game {
  readonly track = new TrackNetwork();
  readonly rng: Rng;
  readonly stations = new Map<string, Station>();
  readonly trains: Train[] = [];
  cash: number;
  /** Game hours since the start. */
  time = 0;
  private nextId = 1;

  private constructor(
    readonly map: GameMap,
    readonly towns: readonly Town[],
    seed: number,
    startingCash: number,
    /** How the map was generated; null for hand-made test maps. */
    readonly gen: GenerateOptions | null,
  ) {
    this.rng = new Rng(seed);
    this.cash = startingCash;
  }

  /** A blank map of one terrain, for tests and sandboxes. */
  static create(opts: GameOptions): Game {
    const map = new GameMap(opts.width, opts.height, opts.terrain ?? 'plains');
    return new Game(map, [], opts.seed ?? 1, opts.startingCash ?? DEFAULT_STARTING_CASH, null);
  }

  /** A generated map with terrain and towns. */
  static generate(opts: GenerateOptions): Game {
    const { map, towns } = generateWorld(opts);
    return new Game(map, towns, opts.seed, opts.startingCash ?? DEFAULT_STARTING_CASH, { ...opts });
  }

  // --- Track -------------------------------------------------------------------

  /** Price of a single ordinary segment, or an error message if it cannot be built. */
  segmentCost(a: Coord, b: Coord): number | string {
    if (!this.map.inBounds(a) || !this.map.inBounds(b)) return 'out of bounds';
    if (!isAdjacent(a, b)) return 'tiles are not adjacent';
    const costs = [TRACK_COST[this.map.terrainAt(a)], TRACK_COST[this.map.terrainAt(b)]];
    if (costs.some((c) => c === null)) return 'cannot build on water';
    const base = Math.max(...(costs as number[]));
    return Math.round(isDiagonal(a, b) ? base * DIAGONAL_COST_FACTOR : base);
  }

  /** Quote the cost of building along a path of adjacent tiles. Existing segments are free. */
  quoteTrack(path: readonly Coord[]): CommandResult {
    if (path.length < 2) return fail('path too short');
    let total = 0;
    for (let i = 1; i < path.length; i++) {
      const [a, b] = [path[i - 1]!, path[i]!];
      if (this.track.has(a, b)) continue;
      const cost = this.segmentCost(a, b);
      if (typeof cost === 'string') return fail(cost);
      total += cost;
    }
    return ok(total);
  }

  buildTrack(path: readonly Coord[]): CommandResult {
    const quote = this.quoteTrack(path);
    if (!quote.ok) return quote;
    if (quote.cost > this.cash) return fail('insufficient funds');
    for (let i = 1; i < path.length; i++) {
      const [a, b] = [path[i - 1]!, path[i]!];
      if (!this.track.has(a, b)) this.track.add(a, b);
    }
    this.cash -= quote.cost;
    return quote;
  }

  /**
   * Quote a bridge: a straight line whose two ends are land and whose every
   * tile in between is water (1–3 tiles). Each new segment has a flat price.
   */
  quoteBridge(from: Coord, to: Coord): CommandResult {
    const path = straightPath(from, to);
    if (!path || path.length < 3) return fail('a bridge must be a straight line over water');
    if (!path.every((c) => this.map.inBounds(c))) return fail('out of bounds');
    const isWater = (c: Coord) => this.map.terrainAt(c) === 'water';
    if (isWater(from) || isWater(to)) return fail('bridge must start and end on land');
    const span = path.slice(1, -1);
    if (!span.every(isWater)) return fail('a bridge may only span water');
    if (span.length > MAX_BRIDGE_WATER_TILES) return fail('bridge too long');
    let segments = 0;
    for (let i = 1; i < path.length; i++) if (!this.track.has(path[i - 1]!, path[i]!)) segments++;
    return ok(segments * BRIDGE_SEGMENT_COST);
  }

  buildBridge(from: Coord, to: Coord): CommandResult {
    const quote = this.quoteBridge(from, to);
    if (!quote.ok) return quote;
    if (quote.cost > this.cash) return fail('insufficient funds');
    const path = straightPath(from, to)!;
    for (let i = 1; i < path.length; i++) {
      const [a, b] = [path[i - 1]!, path[i]!];
      if (!this.track.has(a, b)) this.track.add(a, b, true);
    }
    this.cash -= quote.cost;
    return quote;
  }

  /** Suggest the cheapest track route between two tiles (reusing existing track). Changes nothing. */
  planTrack(from: Coord, to: Coord, opts: PlanOptions = {}): PlanResult {
    return planTrack(this, from, to, opts);
  }

  /**
   * Build a suggested route. Routes with new bridges need `confirmBridges`, so the
   * player always agrees to a water crossing. The price is re-checked against today's state.
   */
  buildPlannedTrack(plan: TrackPlan, opts: { confirmBridges?: boolean } = {}): CommandResult {
    if (plan.bridges.length > 0 && !opts.confirmBridges) return fail('route needs a bridge');
    const price = priceRoute(this, plan.path, plan.bridgeSegments);
    if (typeof price === 'string') return fail(price);
    if (price.cost > this.cash) return fail('insufficient funds');
    for (let i = 1; i < plan.path.length; i++) {
      const [a, b] = [plan.path[i - 1]!, plan.path[i]!];
      if (!this.track.has(a, b)) this.track.add(a, b, plan.bridgeSegments[i - 1]!);
    }
    this.cash -= price.cost;
    return ok(price.cost);
  }

  /** Plan and build the cheapest route in one go. */
  connect(from: Coord, to: Coord, opts: PlanOptions & { confirmBridges?: boolean } = {}): CommandResult {
    const planned = this.planTrack(from, to, opts);
    if (!planned.ok) return fail(planned.error);
    return this.buildPlannedTrack(planned.plan, opts);
  }

  /** What tearing up one existing segment pays back. */
  demolishRefund(a: Coord, b: Coord): number {
    const seg = this.track.get(a, b);
    if (!seg) return 0;
    const buildCost = seg.bridge ? BRIDGE_SEGMENT_COST : this.segmentCost(a, b);
    return typeof buildCost === 'number' ? Math.round(buildCost * DEMOLISH_REFUND_RATE) : 0;
  }

  /** Tear up every existing segment on the straight line from `from` to `to`. */
  demolishTrack(from: Coord, to: Coord): CommandResult {
    const path = straightPath(from, to);
    if (!path || path.length < 2) return fail('not a straight line');
    const existing: [Coord, Coord][] = [];
    for (let i = 1; i < path.length; i++)
      if (this.track.has(path[i - 1]!, path[i]!)) existing.push([path[i - 1]!, path[i]!]);
    if (existing.length === 0) return fail('no track to demolish');
    const touched = existing.flat();
    if (touched.some((c) => this.stationAt(c))) return fail('station on track');
    const trainTiles = this.trains.flatMap((t) => (t.next ? [t.at, t.next] : [t.at]));
    if (touched.some((c) => trainTiles.some((tc) => tc.x === c.x && tc.y === c.y)))
      return fail('train on track');
    const refund = existing.reduce((sum, [a, b]) => sum + this.demolishRefund(a, b), 0);
    for (const [a, b] of existing) this.track.remove(a, b);
    this.cash += refund;
    return ok(-refund);
  }

  // --- Stations ----------------------------------------------------------------

  stationAt(c: Coord): Station | undefined {
    return this.stations.get(coordKey(c));
  }

  isStation(c: Coord): boolean {
    return this.stations.has(coordKey(c));
  }

  inCatchment(station: Station, c: Coord): boolean {
    return Math.max(Math.abs(station.at.x - c.x), Math.abs(station.at.y - c.y)) <= station.radius;
  }

  buildStation(size: StationSize, at: Coord): CommandResult {
    if (!this.map.inBounds(at)) return fail('out of bounds');
    if (this.isStation(at)) return fail('tile already has a station');
    if (!this.track.touches(at)) return fail('station must be on track');
    const { cost } = STATION[size];
    if (cost > this.cash) return fail('insufficient funds');
    this.addStation(size, at);
    this.cash -= cost;
    return ok(cost);
  }

  /** Loading/fixture API: place a station without checks or cost. */
  addStation(size: StationSize, at: Coord): Station {
    const station = { id: this.nextId++, at, size, radius: STATION[size].radius };
    this.stations.set(coordKey(at), station);
    return station;
  }

  // --- Trains ------------------------------------------------------------------

  trainPrice(order: TrainOrder): number {
    return (
      (order.locomotive ? LOCOMOTIVE_COST : 0) +
      (order.passengerCars ?? 0) * PASSENGER_CAR_COST +
      (order.freightCars ?? 0) * FREIGHT_CAR_COST
    );
  }

  buyTrain(order: TrainOrder): { ok: true; cost: number; train: Train } | { ok: false; error: string } {
    const cars = (order.passengerCars ?? 0) + (order.freightCars ?? 0);
    if (!order.locomotive) return fail('cars need a locomotive');
    if (cars > MAX_CARS) return fail('too many cars');
    if (!this.isStation(order.at)) return fail('train must start at a station');
    const cost = this.trainPrice(order);
    if (cost > this.cash) return fail('insufficient funds');
    const train = this.addTrain({ ...order });
    this.cash -= cost;
    return { ok: true, cost, train };
  }

  /** Loading/fixture API: place a train without checks or cost. */
  addTrain(opts: { at: Coord; tilesPerDay?: number; passengerCars?: number; freightCars?: number }): Train {
    const train: Train = {
      id: this.nextId++,
      at: opts.at,
      next: null,
      prev: null,
      progress: 0,
      speed: unitsPerTick(opts.tilesPerDay ?? LOCOMOTIVE_TILES_PER_DAY),
      passengerCars: opts.passengerCars ?? 0,
      freightCars: opts.freightCars ?? 0,
      route: [],
      stopOrders: [],
      target: 0,
      plan: [],
      status: 'idle',
      blockedBy: null,
      waitingTicks: 0,
      deadlocked: false,
      journeys: 0,
      waitedFor: new Set(),
    };
    this.trains.push(train);
    return train;
  }

  train(id: number): Train | undefined {
    return this.trains.find((t) => t.id === id);
  }

  /**
   * Give a train its stops. It heads for the first stop, or the second if it already
   * stands on the first, and then cycles through them.
   */
  setRoute(
    trainId: number,
    stops: readonly Coord[],
    orders: readonly (CarCounts | null)[] = [],
  ): CommandResult {
    const train = this.train(trainId);
    if (!train) return fail('no such train');
    if (stops.length < 2) return fail('route needs at least two stops');
    for (let i = 0; i < stops.length; i++) {
      if (!this.isStation(stops[i]!)) return fail('stop is not a station');
      const next = stops[(i + 1) % stops.length]!;
      if (next.x === stops[i]!.x && next.y === stops[i]!.y) return fail('consecutive stops must differ');
    }
    const owned = train.passengerCars + train.freightCars;
    for (const order of orders) {
      if (!order) continue;
      if (order.passengerCars < 0 || order.freightCars < 0) return fail('car counts cannot be negative');
      if (order.passengerCars + order.freightCars !== owned)
        return fail(`a stop order must use the train's ${owned} cars`);
    }
    const legs: [Coord, Coord][] = [[train.at, stops[0]!]];
    for (let i = 1; i < stops.length; i++) legs.push([stops[i - 1]!, stops[i]!]);
    for (const [a, b] of legs)
      if (!findTrackPath(this.track, a, b)) return fail(`no track connects ${fmt(a)} and ${fmt(b)}`);

    train.route = stops.map((c) => ({ ...c }));
    train.stopOrders = stops.map((_, i) => (orders[i] ? { ...orders[i]! } : null));
    train.target = train.at.x === stops[0]!.x && train.at.y === stops[0]!.y ? 1 : 0;
    train.plan = [];
    return ok(0);
  }

  /**
   * Change how many cars of each type a train owns. Added cars cost their price; removed
   * cars pay back CAR_RESALE_RATE of it. Stop orders that no longer fit are dropped.
   */
  changeCars(trainId: number, cars: CarCounts): CommandResult {
    const train = this.train(trainId);
    if (!train) return fail('no such train');
    if (cars.passengerCars < 0 || cars.freightCars < 0) return fail('car counts cannot be negative');
    if (cars.passengerCars + cars.freightCars > MAX_CARS) return fail('too many cars');
    const price = (n: number, unit: number) => (n > 0 ? n * unit : Math.round(n * unit * CAR_RESALE_RATE));
    const cost =
      price(cars.passengerCars - train.passengerCars, PASSENGER_CAR_COST) +
      price(cars.freightCars - train.freightCars, FREIGHT_CAR_COST);
    if (cost > this.cash) return fail('insufficient funds');
    train.passengerCars = cars.passengerCars;
    train.freightCars = cars.freightCars;
    const owned = cars.passengerCars + cars.freightCars;
    train.stopOrders = train.stopOrders.map((o) =>
      o && o.passengerCars + o.freightCars === owned ? o : null,
    );
    this.cash -= cost;
    return ok(cost);
  }

  // --- Time --------------------------------------------------------------------

  tick(): void {
    this.time++;
    advanceTrains(this);
  }

  advanceDays(days: number): void {
    for (let i = 0; i < days * TICKS_PER_DAY; i++) this.tick();
  }

  // --- Save / load -------------------------------------------------------------

  toSave(): SaveData {
    if (!this.gen) throw new Error('only generated maps can be saved');
    return {
      version: 1,
      gen: this.gen,
      cash: this.cash,
      time: this.time,
      segments: [...this.track.segments()].map((s) => ({ a: s.a, b: s.b, bridge: s.bridge })),
      stations: [...this.stations.values()].map((s) => ({ at: s.at, size: s.size })),
      trains: this.trains.map((t) => ({
        at: t.at,
        tilesPerDay: (t.speed * TICKS_PER_DAY) / TILE_UNITS,
        passengerCars: t.passengerCars,
        freightCars: t.freightCars,
        route: t.route,
        stopOrders: t.stopOrders,
        target: t.target,
      })),
    };
  }

  /** Restores a save. Trains restart from the tile they last reached. */
  static fromSave(save: SaveData): Game {
    const game = Game.generate(save.gen);
    game.cash = save.cash;
    game.time = save.time;
    for (const s of save.segments) game.track.add(s.a, s.b, s.bridge);
    for (const s of save.stations) game.addStation(s.size, s.at);
    for (const t of save.trains) {
      const train = game.addTrain(t);
      train.route = t.route;
      train.stopOrders = t.stopOrders ?? t.route.map(() => null);
      train.target = t.target;
    }
    return game;
  }
}
