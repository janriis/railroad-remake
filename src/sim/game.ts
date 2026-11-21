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
  CARGO,
  CAR_RUNNING_COST,
  FREIGHT_CAR_CAPACITY,
  INDUSTRY,
  INHABITANTS_PER_MAILBAG,
  INHABITANTS_PER_PASSENGER,
  PASSENGER_CAR_CAPACITY,
  TOWN_GROWTH_RATE,
  type Cargo,
  type IndustryKind,
  LOCOMOTIVE_RUNNING_COST,
  STATION,
  TICKS_PER_DAY,
  TRACK_MAINTENANCE_PER_SEGMENT,
  TILE_UNITS,
  TRACK_COST,
  type StationSize,
} from './config';
import {
  TOWN_WEIGHT_TOTAL,
  deliveryPayment,
  manhattan,
  townTiles,
  type Delivery,
  type Industry,
  type Lot,
  type WaitingLot,
} from './cargo';
import {
  TICKS_PER_MONTH,
  dateAt,
  emptyLedgerYear,
  type GameDate,
  type LedgerCategory,
  type LedgerYear,
} from './economy';
import { GameMap } from './map';
import { generateWorld, newTown, type Town } from './mapgen';
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
  /** Town cargo (passengers, mail) waiting to be picked up. */
  readonly waiting: WaitingLot[];
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
  readonly ledger?: ({ year: number } & Partial<LedgerYear>)[];
  readonly segments: { a: Coord; b: Coord; bridge: boolean; double?: boolean }[];
  readonly stations: { at: Coord; size: StationSize }[];
  readonly trains: {
    at: Coord;
    tilesPerDay: number;
    passengerCars: number;
    freightCars: number;
    route: Coord[];
    stopOrders?: (CarCounts | null)[];
    target: number;
    cargo?: Lot[];
    trip?: Coord | null;
    lastStop?: Coord | null;
    /** Tile it came from, so it keeps facing the same way after loading. */
    prev?: Coord | null;
  }[];
  readonly towns?: { population: number; generatedThisYear: number; carriedThisYear: number }[];
  readonly stationWaiting?: WaitingLot[][];
  readonly industries?: Omit<Industry, 'id'>[];
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
  /** Yearly accounts, keyed by year. */
  readonly ledger = new Map<number, LedgerYear>();
  readonly industries: Industry[] = [];
  private nextId = 1;

  private constructor(
    readonly map: GameMap,
    readonly towns: Town[],
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
    const { map, towns, industries } = generateWorld(opts);
    const game = new Game(map, towns, opts.seed, opts.startingCash ?? DEFAULT_STARTING_CASH, { ...opts });
    for (const i of industries) game.addIndustry(i.kind, i.at);
    return game;
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
    this.spend(quote.cost, 'construction');
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
    this.spend(quote.cost, 'construction');
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
    this.spend(price.cost, 'construction');
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
    const buildCost = this.lineCost(a, b);
    const lines = seg.double ? 2 : 1;
    return typeof buildCost === 'number' ? lines * Math.round(buildCost * DEMOLISH_REFUND_RATE) : 0;
  }

  /** What one line of an existing segment would cost to build today. */
  private lineCost(a: Coord, b: Coord): number | string {
    return this.track.get(a, b)?.bridge ? BRIDGE_SEGMENT_COST : this.segmentCost(a, b);
  }

  /** The existing track a doubling from `from` to `to` would follow, or why there is none. */
  doublingPath(from: Coord, to: Coord): Coord[] | string {
    const path = findTrackPath(this.track, from, to);
    if (!path || path.length < 2) return `no track connects ${fmt(from)} and ${fmt(to)}`;
    return path;
  }

  /** Price of doubling the single segments along the existing track between two tiles. */
  quoteDoubleTrack(from: Coord, to: Coord): CommandResult {
    const path = this.doublingPath(from, to);
    if (typeof path === 'string') return fail(path);
    let total = 0;
    let single = 0;
    for (let i = 1; i < path.length; i++) {
      const [a, b] = [path[i - 1]!, path[i]!];
      if (this.track.isDouble(a, b)) continue;
      const cost = this.lineCost(a, b);
      if (typeof cost === 'string') return fail(cost);
      total += cost;
      single++;
    }
    if (single === 0) return fail('already double track');
    return ok(total);
  }

  /** Upgrade the existing track between two tiles to double track. */
  doubleTrack(from: Coord, to: Coord): CommandResult {
    const quote = this.quoteDoubleTrack(from, to);
    if (!quote.ok) return quote;
    if (quote.cost > this.cash) return fail('insufficient funds');
    const path = this.doublingPath(from, to) as Coord[];
    for (let i = 1; i < path.length; i++) this.track.get(path[i - 1]!, path[i]!)!.double = true;
    this.spend(quote.cost, 'construction');
    return quote;
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
    this.spend(-refund, 'construction');
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
    this.spend(cost, 'construction');
    return ok(cost);
  }

  /** Loading/fixture API: place a station without checks or cost. */
  addStation(size: StationSize, at: Coord): Station {
    const station: Station = { id: this.nextId++, at, size, radius: STATION[size].radius, waiting: [] };
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
    this.spend(cost, 'rollingStock');
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
      cargo: [],
      trip: null,
      lastStop: null,
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
    trimToCapacity(train);
    const owned = cars.passengerCars + cars.freightCars;
    train.stopOrders = train.stopOrders.map((o) =>
      o && o.passengerCars + o.freightCars === owned ? o : null,
    );
    this.spend(cost, 'rollingStock');
    return ok(cost);
  }

  // --- Towns, industries and cargo ----------------------------------------------

  /** Loading/fixture API: found a town. */
  addTown(name: string, at: Coord, population: number): Town {
    const town = newTown(name, at, population);
    this.towns.push(town);
    return town;
  }

  town(name: string): Town | undefined {
    return this.towns.find((t) => t.name === name);
  }

  /** Loading/fixture API: place an industry. */
  addIndustry(kind: IndustryKind, at: Coord): Industry {
    const industry: Industry = { id: this.nextId++, kind, at, stock: 0, input: 0, received: 0 };
    this.industries.push(industry);
    return industry;
  }

  industryAt(c: Coord): Industry | undefined {
    return this.industries.find((i) => i.at.x === c.x && i.at.y === c.y);
  }

  /**
   * How much of a town each station serves, as weights out of TOWN_WEIGHT_TOTAL. A town
   * tile inside several catchments counts for the station built first.
   */
  townCoverage(town: Town): Map<Station, number> {
    const shares = new Map<Station, number>();
    for (const tile of townTiles(town)) {
      for (const station of this.stations.values()) {
        if (!this.inCatchment(station, tile.at)) continue;
        shares.set(station, (shares.get(station) ?? 0) + tile.weight);
        break;
      }
    }
    return shares;
  }

  /** Industries inside a station's catchment, in placement order. */
  industriesServedBy(station: Station): Industry[] {
    return this.industries.filter((i) => this.inCatchment(station, i.at));
  }

  /** Units of a cargo ready for pickup at a station: town cargo there plus covered industries' stock. */
  waitingAt(station: Station, cargo: Cargo): number {
    const town = station.waiting.reduce((n, l) => n + (l.cargo === cargo ? l.units : 0), 0);
    const industry = this.industriesServedBy(station).reduce(
      (n, i) => n + (INDUSTRY[i.kind].output === cargo ? i.stock : 0),
      0,
    );
    return town + industry;
  }

  /** Passengers from this town waiting at any station. */
  passengersWaitingFrom(townName: string): number {
    let n = 0;
    for (const s of this.stations.values())
      for (const l of s.waiting) if (l.source === townName && l.cargo === 'passengers') n += l.units;
    return n;
  }

  accepts(station: Station, cargo: Cargo): boolean {
    if (cargo === 'passengers' || cargo === 'mail')
      return this.towns.some((t) => townTiles(t).some((tile) => this.inCatchment(station, tile.at)));
    return this.industriesServedBy(station).some((i) => INDUSTRY[i.kind].input === cargo);
  }

  /** Get paid for a finished delivery. Trains call this when they unload; it never fails. */
  settleDelivery(delivery: Delivery): CommandResult {
    const payment = deliveryPayment(delivery);
    this.spend(-payment, 'cargoIncome');
    return ok(-payment);
  }

  /** Send a train to a station outside its route, once. It then carries on with its route. */
  sendTrainTo(trainId: number, at: Coord): CommandResult {
    const train = this.train(trainId);
    if (!train) return fail('no such train');
    if (!this.isStation(at)) return fail('not a station');
    if (sameAt(train.at, at) && !train.next) return fail('the train is already there');
    if (!findTrackPath(this.track, train.next ?? train.at, at)) return fail(`no track connects ${fmt(train.at)} and ${fmt(at)}`);
    train.trip = { ...at };
    train.plan = [];
    return ok(0);
  }

  /** Call off a one-off trip; the train goes back to its route. */
  cancelTrip(trainId: number): CommandResult {
    const train = this.train(trainId);
    if (!train) return fail('no such train');
    if (!train.trip) return fail('the train is not on a trip');
    train.trip = null;
    train.plan = [];
    return ok(0);
  }

  /** At a stop: unload what this station takes, apply the stop's car order, then load. */
  serviceStop(train: Train, stopIndex: number): void {
    const station = this.stationAt(train.at);
    if (station) this.unload(train, station);
    const order = train.stopOrders[stopIndex];
    if (order) {
      train.passengerCars = order.passengerCars;
      train.freightCars = order.freightCars;
      trimToCapacity(train);
    }
    if (station) this.load(train, station);
  }

  private unload(train: Train, station: Station): void {
    const days = (lot: Lot) => Math.floor((this.time - lot.loadedAt) / TICKS_PER_DAY);
    train.cargo = train.cargo.filter((lot) => {
      const distance = manhattan(lot.from, station.at);
      if (distance === 0 || !this.accepts(station, lot.cargo)) return true;
      this.settleDelivery({ cargo: lot.cargo, units: lot.units, distance, days: days(lot) });
      const consumer = this.industriesServedBy(station).find((i) => INDUSTRY[i.kind].input === lot.cargo);
      if (consumer) {
        consumer.input += lot.units;
        consumer.received += lot.units;
      }
      return false;
    });
  }

  private load(train: Train, station: Station): void {
    const room = { passenger: spareRoom(train, 'passenger'), freight: spareRoom(train, 'freight') };
    const take = (cargo: Cargo, available: number): number => {
      const kind = CARGO[cargo].car;
      const n = Math.min(available, room[kind]);
      if (n <= 0) return 0;
      room[kind] -= n;
      const lot = train.cargo.find((l) => l.cargo === cargo && sameAt(l.from, station.at) && l.loadedAt === this.time);
      if (lot) lot.units += n;
      else train.cargo.push({ cargo, units: n, from: { ...station.at }, loadedAt: this.time });
      return n;
    };
    for (const w of station.waiting) {
      const n = take(w.cargo, w.units);
      w.units -= n;
      const town = this.town(w.source);
      if (town && w.cargo === 'passengers') town.carriedThisYear += n;
    }
    station.waiting.splice(0, station.waiting.length, ...station.waiting.filter((w) => w.units > 0));
    for (const industry of this.industriesServedBy(station))
      industry.stock -= take(INDUSTRY[industry.kind].output, industry.stock);
  }

  private produceTownCargo(): void {
    for (const town of this.towns) {
      for (const [station, weight] of this.townCoverage(town)) {
        const scale = TOWN_WEIGHT_TOTAL;
        const passengers = Math.floor((town.population * weight) / (INHABITANTS_PER_PASSENGER * scale));
        const mail = Math.floor((town.population * weight) / (INHABITANTS_PER_MAILBAG * scale));
        addWaiting(station, 'passengers', town.name, passengers);
        addWaiting(station, 'mail', town.name, mail);
        town.generatedThisYear += passengers;
      }
    }
  }

  private runIndustries(): void {
    for (const industry of this.industries) {
      const spec = INDUSTRY[industry.kind];
      if (spec.input === undefined) {
        industry.stock += spec.perMonth;
      } else {
        const batches = Math.floor(industry.input / spec.in);
        industry.input -= batches * spec.in;
        industry.stock += batches * spec.out;
      }
    }
  }

  /** Year end: towns that saw at least half their passengers carried away grow. */
  private growTowns(): void {
    for (const town of this.towns) {
      if (town.generatedThisYear > 0 && town.carriedThisYear * 2 >= town.generatedThisYear)
        town.population = Math.round(town.population * (1 + TOWN_GROWTH_RATE));
      town.generatedThisYear = 0;
      town.carriedThisYear = 0;
    }
  }

  // --- Time --------------------------------------------------------------------

  tick(): void {
    this.time++;
    advanceTrains(this);
    if (this.time % TICKS_PER_MONTH === 0) this.endOfMonth();
  }

  get date(): GameDate {
    return dateAt(this.time);
  }

  /** What next month-end will charge, by category. */
  monthlyRunningCosts(): { trackMaintenance: number; trainRunning: number } {
    const cars = this.trains.reduce((n, t) => n + t.passengerCars + t.freightCars, 0);
    return {
      trackMaintenance: this.track.lineCount * TRACK_MAINTENANCE_PER_SEGMENT,
      trainRunning: this.trains.length * LOCOMOTIVE_RUNNING_COST + cars * CAR_RUNNING_COST,
    };
  }

  /** Runs on the first hour of a new month and bills the month that just ended. Cash may go negative. */
  private endOfMonth(): void {
    const ended = dateAt(this.time - 1);
    this.produceTownCargo();
    this.runIndustries();
    if (ended.month === 11) this.growTowns();
    const year = ended.year;
    const costs = this.monthlyRunningCosts();
    this.spend(costs.trackMaintenance, 'trackMaintenance', year);
    this.spend(costs.trainRunning, 'trainRunning', year);
  }

  // --- Money -------------------------------------------------------------------

  ledgerFor(year: number): LedgerYear {
    let page = this.ledger.get(year);
    if (!page) this.ledger.set(year, (page = emptyLedgerYear()));
    return page;
  }

  /** The one place cash changes: takes `amount` (negative = income) and books it. */
  private spend(amount: number, category: LedgerCategory, year = this.date.year): void {
    if (amount === 0) return;
    this.cash -= amount;
    this.ledgerFor(year)[category] -= amount;
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
      ledger: [...this.ledger].map(([year, page]) => ({ year, ...page })),
      segments: [...this.track.segments()].map((s) => ({ a: s.a, b: s.b, bridge: s.bridge, ...(s.double ? { double: true } : {}) })),
      stations: [...this.stations.values()].map((s) => ({ at: s.at, size: s.size })),
      trains: this.trains.map((t) => ({
        at: t.at,
        tilesPerDay: (t.speed * TICKS_PER_DAY) / TILE_UNITS,
        passengerCars: t.passengerCars,
        freightCars: t.freightCars,
        route: t.route,
        stopOrders: t.stopOrders,
        target: t.target,
        cargo: t.cargo,
        trip: t.trip,
        lastStop: t.lastStop,
        prev: t.prev,
      })),
      towns: this.towns.map((t) => ({
        population: t.population,
        generatedThisYear: t.generatedThisYear,
        carriedThisYear: t.carriedThisYear,
      })),
      stationWaiting: [...this.stations.values()].map((s) => s.waiting),
      industries: this.industries.map((i) => ({ kind: i.kind, at: i.at, stock: i.stock, input: i.input, received: i.received })),
    };
  }

  /** Restores a save. Trains restart from the tile they last reached. */
  static fromSave(save: SaveData): Game {
    const game = Game.generate(save.gen);
    game.cash = save.cash;
    game.time = save.time;
    for (const { year, ...page } of save.ledger ?? []) game.ledger.set(year, { ...emptyLedgerYear(), ...page });
    for (const s of save.segments) game.track.add(s.a, s.b, s.bridge, s.double ?? false);
    save.towns?.forEach((t, i) => Object.assign(game.towns[i]!, t));
    if (save.industries) {
      game.industries.length = 0;
      for (const i of save.industries) Object.assign(game.addIndustry(i.kind, i.at), i);
    }
    save.stations.forEach((s, i) => game.addStation(s.size, s.at).waiting.push(...(save.stationWaiting?.[i] ?? [])));
    for (const t of save.trains) {
      const train = game.addTrain(t);
      train.route = t.route;
      train.stopOrders = t.stopOrders ?? t.route.map(() => null);
      train.target = t.target;
      train.cargo = t.cargo ?? [];
      train.trip = t.trip ?? null;
      train.lastStop = t.lastStop ?? null;
      train.prev = t.prev ?? null;
    }
    return game;
  }
}

const sameAt = (a: Coord, b: Coord): boolean => a.x === b.x && a.y === b.y;

function addWaiting(station: Station, cargo: Cargo, source: string, units: number): void {
  if (units <= 0) return;
  const lot = station.waiting.find((w) => w.cargo === cargo && w.source === source);
  if (lot) lot.units += units;
  else station.waiting.push({ cargo, source, units });
}

function capacity(train: Train, kind: 'passenger' | 'freight'): number {
  return kind === 'passenger' ? train.passengerCars * PASSENGER_CAR_CAPACITY : train.freightCars * FREIGHT_CAR_CAPACITY;
}

function spareRoom(train: Train, kind: 'passenger' | 'freight'): number {
  const used = train.cargo.reduce((n, l) => n + (CARGO[l.cargo].car === kind ? l.units : 0), 0);
  return capacity(train, kind) - used;
}

/** After cars are removed, cargo that no longer fits is lost (newest first). */
function trimToCapacity(train: Train): void {
  for (const kind of ['passenger', 'freight'] as const) {
    let over = -spareRoom(train, kind);
    for (let i = train.cargo.length - 1; i >= 0 && over > 0; i--) {
      const lot = train.cargo[i]!;
      if (CARGO[lot.cargo].car !== kind) continue;
      const cut = Math.min(lot.units, over);
      lot.units -= cut;
      over -= cut;
    }
  }
  train.cargo = train.cargo.filter((l) => l.units > 0);
}
