import {
  BRIDGE_SEGMENT_COST,
  CAR_RESALE_RATE,
  DEFAULT_STARTING_CASH,
  DEMOLISH_REFUND_RATE,
  DIAGONAL_COST_FACTOR,
  MAX_BRIDGE_WATER_TILES,
  AGE_RUNNING_COST_RATE,
  ASSET_VALUE_RATE,
  BANKRUPTCY_MONTHS,
  BOND_BASE_RATE_PCT,
  BOND_PRINCIPAL,
  BOND_RATE_STEP_PCT,
  BUYBACK_PRICE_RATE,
  COMPANY_SHARE_LOT,
  EARNINGS_MULTIPLE,
  MAX_BONDS,
  MIN_SHARE_PRICE_CENTS,
  NEW_SHARE_PRICE_RATE,
  PLAYER_SHARE_LOT,
  PLAYER_START_SHARES,
  START_SHARES,
  BREAD_GROWTH_RATE,
  CAR,
  CAR_FILL_ORDER,
  CAR_KEEP_ORDER,
  CAR_TYPES,
  type CarType,
  BREAKDOWN_CHANCE,
  BREAKDOWN_CHANCE_PER_YEAR_WORN,
  BREAKDOWN_DAYS,
  LOCO,
  LOCO_MODELS,
  OVERHAUL_RATE,
  REPAIR_RATE,
  TRADE_IN_NEW_RATE,
  TRADE_IN_WORN_RATE,
  type LocoModel,
  BUILDING,
  BUILDING_REFUND_RATE,
  BUILDING_SLOTS,
  CAR_RUNNING_COST,
  DEPOSIT_CAP_MONTHS,
  SATURATED_PRICE_RATE,
  SATURATION_LIMIT,
  TOWN_DEMAND,
  type BuildingKind,
  INDUSTRY,
  INHABITANTS_PER_MAILBAG,
  INHABITANTS_PER_PASSENGER,
  TOWN_GROWTH_RATE,
  type Cargo,
  type IndustryKind,
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
  DAYS_PER_YEAR,
  MONTH_NAMES,
  OPERATING,
  TICKS_PER_MONTH,
  dateAt,
  emptyLedgerYear,
  type GameDate,
  type LedgerCategory,
  type LedgerYear,
} from './economy';
import { GameMap } from './map';
import { generateWorld, newTown, type Town } from './mapgen';
import { checkNewTrack } from './geometry';
import { findTrackPath } from './pathfinding';
import { planTrack, priceRoute, type PlanOptions, type PlanResult, type TrackPlan } from './planner';
import { Rng } from './rng';
import { TrackNetwork, isAdjacent, isDiagonal, straightPath } from './track';
import { advanceTrains, unitsPerTick, type Train } from './trains';
import { carriesCargo, carsOf, cleanMix, mixValue, totalCars, type CarMix } from './cars';
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
  /** Cargo waiting to be picked up: town passengers/mail and goods the town would not buy. */
  readonly waiting: WaitingLot[];
  /** Buildings the player built here (M5). */
  readonly buildings: StationBuilding[];
}

export interface StationBuilding {
  readonly kind: BuildingKind;
  /** Input received and not yet converted. */
  input: number;
  /** Input received over the building's life. */
  received: number;
  /** Output made at the last month end. */
  lastMade: number;
  madeThisYear: number;
}

export interface TrainOrder {
  at: Coord;
  locomotive: boolean;
  /** Locomotive model; defaults to the 4-4-0 American. */
  model?: LocoModel;
  /** Cars to buy with it, by type. */
  cars?: CarMix;
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
    /** Coupled and owned cars by type. Saves from before M7 have passengerCars/freightCars instead. */
    cars?: CarMix;
    owned?: CarMix | LegacyCarCounts;
    passengerCars?: number;
    freightCars?: number;
    route: Coord[];
    stopOrders?: (CarMix | LegacyCarCounts | null)[];
    target: number;
    cargo?: (Omit<Lot, 'car'> & { car?: CarType })[];
    trip?: Coord | null;
    lastStop?: Coord | null;
    /** Tile it came from, so it keeps facing the same way after loading. */
    prev?: Coord | null;
    model?: LocoModel;
    boughtAt?: number;
    brokenUntil?: number | null;
  }[];
  readonly towns?: {
    population: number;
    generatedThisYear: number;
    carriedThisYear: number;
    soldThisMonth?: Town['soldThisMonth'];
    breadThisYear?: number;
  }[];
  readonly stationBuildings?: StationBuilding[][];
  readonly finance?: {
    bonds: { principal: number; ratePct: number }[];
    sharesOutstanding: number;
    playerShares: number;
    personalCash: number;
    dividendCents: number;
    sharePriceCents: number;
    priceHistory: number[];
    negativeMonths: number;
    restructurings: number;
    notices: string[];
    monthlyOps: number[];
    opsAtLastMonthEnd: number;
  };

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
  /** Bonds outstanding, oldest first; the rate is in whole percent, fixed at issue. */
  readonly bonds: { principal: number; ratePct: number }[] = [];
  sharesOutstanding = START_SHARES;
  playerShares = PLAYER_START_SHARES;
  /** The player's own money, apart from the company's. */
  personalCash = 0;
  dividendCents = 0;
  /** Share price at the last month end, in cents; commands trade at this price. */
  sharePriceCents = 0;
  /** Share price at every month end so far, in cents. */
  readonly priceHistory: number[] = [];
  negativeMonths = 0;
  restructurings = 0;
  /** Messages for the player, newest last. */
  readonly notices: string[] = [];
  /** Operating result of each completed month, newest last (at most 12 kept). */
  private readonly monthlyOps: number[] = [];
  private opsAtLastMonthEnd = 0;
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
    this.sharePriceCents = this.computeSharePriceCents();
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
    const shape = checkNewTrack(this.track, pairs(path));
    if (shape) return fail(shape);
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
    const shape = checkNewTrack(this.track, pairs(straightPath(from, to)!));
    if (shape) return fail(shape);
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
    const shape = checkNewTrack(this.track, pairs(plan.path));
    if (shape) return fail(shape);
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
    const station: Station = {
      id: this.nextId++,
      at,
      size,
      radius: STATION[size].radius,
      waiting: [],
      buildings: [],
    };
    this.stations.set(coordKey(at), station);
    return station;
  }

  // --- Trains ------------------------------------------------------------------

  trainPrice(order: TrainOrder): number {
    return (order.locomotive ? LOCO[order.model ?? 'american'].price : 0) + mixValue(order.cars ?? {});
  }

  buyTrain(order: TrainOrder): { ok: true; cost: number; train: Train } | { ok: false; error: string } {
    const cars = order.cars ?? {};
    if (!order.locomotive) return fail('cars need a locomotive');
    const model = order.model ?? 'american';
    if (!this.onSale(model)) return fail('model not on sale');
    if (CAR_TYPES.some((t) => carsOf(cars, t) < 0)) return fail('car counts cannot be negative');
    if (CAR_TYPES.some((t) => carsOf(cars, t) > 0 && !this.carOnSale(t))) return fail('car type not on sale');
    if (totalCars(cars) > LOCO[model].maxCars) return fail('too many cars');
    if (!this.isStation(order.at)) return fail('train must start at a station');
    const cost = this.trainPrice(order);
    if (cost > this.cash) return fail('insufficient funds');
    const train = this.addTrain({ ...order });
    this.spend(cost, 'rollingStock');
    return { ok: true, cost, train };
  }

  /** Loading/fixture API: place a train without checks or cost. */
  addTrain(opts: { at: Coord; model?: LocoModel; tilesPerDay?: number; cars?: CarMix }): Train {
    const model = opts.model ?? 'american';
    const train: Train = {
      id: this.nextId++,
      at: opts.at,
      next: null,
      prev: null,
      progress: 0,
      speed: unitsPerTick(opts.tilesPerDay ?? LOCO[model].tilesPerDay),
      model,
      boughtAt: this.time,
      brokenUntil: null,
      cars: cleanMix(opts.cars ?? {}),
      owned: cleanMix(opts.cars ?? {}),
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
  setRoute(trainId: number, stops: readonly Coord[], orders: readonly (CarMix | null)[] = []): CommandResult {
    const train = this.train(trainId);
    if (!train) return fail('no such train');
    if (stops.length < 2) return fail('route needs at least two stops');
    for (let i = 0; i < stops.length; i++) {
      if (!this.isStation(stops[i]!)) return fail('stop is not a station');
      const next = stops[(i + 1) % stops.length]!;
      if (next.x === stops[i]!.x && next.y === stops[i]!.y) return fail('consecutive stops must differ');
    }
    for (const order of orders) {
      if (!order) continue;
      if (CAR_TYPES.some((t) => carsOf(order, t) < 0)) return fail('car counts cannot be negative');
      const over = CAR_TYPES.find((t) => carsOf(order, t) > carsOf(train.owned, t));
      if (over)
        return fail(`a stop order can use at most the train's ${carsOf(train.owned, over)} ${over} cars`);
    }
    const legs: [Coord, Coord][] = [[train.at, stops[0]!]];
    for (let i = 1; i < stops.length; i++) legs.push([stops[i - 1]!, stops[i]!]);
    for (const [a, b] of legs)
      if (!findTrackPath(this.track, a, b)) return fail(`no track connects ${fmt(a)} and ${fmt(b)}`);

    train.route = stops.map((c) => ({ ...c }));
    train.stopOrders = stops.map((_, i) => (orders[i] ? cleanMix(orders[i]!) : null));
    train.target = train.at.x === stops[0]!.x && train.at.y === stops[0]!.y ? 1 : 0;
    train.plan = [];
    return ok(0);
  }

  /**
   * Change how many cars of each type a train owns. Added cars cost their price; removed
   * cars pay back CAR_RESALE_RATE of it. Stop orders that no longer fit are dropped.
   */
  changeCars(trainId: number, cars: CarMix): CommandResult {
    const train = this.train(trainId);
    if (!train) return fail('no such train');
    if (CAR_TYPES.some((t) => carsOf(cars, t) < 0)) return fail('car counts cannot be negative');
    if (CAR_TYPES.some((t) => carsOf(cars, t) > carsOf(train.owned, t) && !this.carOnSale(t)))
      return fail('car type not on sale');
    if (totalCars(cars) > LOCO[train.model].maxCars) return fail('too many cars');
    const cost = CAR_TYPES.reduce((n, t) => {
      const d = carsOf(cars, t) - carsOf(train.owned, t);
      return n + (d > 0 ? d * CAR[t].price : Math.round(d * CAR[t].price * CAR_RESALE_RATE));
    }, 0);
    if (cost > this.cash) return fail('insufficient funds');
    this.setOwnedCars(train, cars);
    this.spend(cost, 'rollingStock');
    return ok(cost);
  }

  /** A car type is for sale from its year on; legacy freight cars never are. */
  carOnSale(type: CarType, year = this.date.year): boolean {
    return CAR[type].buyable && CAR[type].from <= year;
  }

  /** New owned cars, all coupled; stop orders that ask for more than owned of a type are dropped. */
  private setOwnedCars(train: Train, cars: CarMix): void {
    train.owned = cleanMix(cars);
    train.cars = cleanMix(cars);
    trimToCapacity(train);
    train.stopOrders = train.stopOrders.map((o) =>
      o && CAR_TYPES.every((t) => carsOf(o, t) <= carsOf(train.owned, t)) ? o : null,
    );
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
    const town = this.servedTown(station);
    if (cargo === 'passengers' || cargo === 'mail') return town !== null;
    if (station.buildings.some((b) => BUILDING[b.kind].input === cargo)) return true;
    if (town && TOWN_DEMAND[cargo]) return true;
    return this.industriesServedBy(station).some((i) => INDUSTRY[i.kind].input === cargo);
  }

  /** The town a station serves: the one with most of its footprint in the catchment, or null. */
  servedTown(station: Station): Town | null {
    let best: Town | null = null;
    let bestTiles = 0;
    for (const town of this.towns) {
      const tiles = townTiles(town).filter((t) => this.inCatchment(station, t.at)).length;
      if (tiles > bestTiles) [best, bestTiles] = [town, tiles];
    }
    return best;
  }

  /** What a town wants of a cargo per month (0 if it does not buy it). */
  townDemand(town: Town, cargo: Cargo): number {
    const d = TOWN_DEMAND[cargo];
    return d ? Math.floor((town.population * d.perThousand) / 1000) : 0;
  }

  /**
   * Sell goods to a town this month: full price up to demand, then a reduced price up to
   * SATURATION_LIMIT x demand. Returns how many units it bought; the money is booked as goods sales.
   */
  private sellToTown(town: Town, cargo: Cargo, units: number, year = this.date.year): number {
    const d = TOWN_DEMAND[cargo];
    const demand = this.townDemand(town, cargo);
    if (!d || demand === 0) return 0;
    const tally = (town.soldThisMonth[cargo] ??= { units: 0, value: 0 });
    const full = Math.max(0, Math.min(units, demand - tally.units));
    const half = Math.max(0, Math.min(units - full, SATURATION_LIMIT * demand - tally.units - full));
    const value = full * d.price + Math.round(half * d.price * SATURATED_PRICE_RATE);
    tally.units += full + half;
    tally.value += value;
    if (cargo === 'loaves') town.breadThisYear += full;
    this.spend(-value, 'goodsSales', year);
    return full + half;
  }

  /**
   * Cargo arrives at a station: the haul is paid, then a building here takes it as input, or the
   * town buys it, or a covered industry takes it. Goods nobody takes now wait at the station.
   * Trains call this when they unload; tests use it to stage a delivery.
   */
  deliverCargo(at: Coord, delivery: Delivery): CommandResult {
    const station = this.stationAt(at);
    if (!station) return fail('not a station');
    const before = this.cash;
    this.settleDelivery(delivery);
    const { cargo, units } = delivery;
    const building = station.buildings.find((b) => BUILDING[b.kind].input === cargo);
    const town = this.servedTown(station);
    const consumer = this.industriesServedBy(station).find((i) => INDUSTRY[i.kind].input === cargo);
    if (building) {
      building.input += units;
      building.received += units;
    } else if (town && TOWN_DEMAND[cargo]) {
      addWaiting(station, cargo, 'delivery', units - this.sellToTown(town, cargo, units));
    } else if (consumer) {
      consumer.input += units;
      consumer.received += units;
    } else if (cargo !== 'passengers' && cargo !== 'mail') {
      addWaiting(station, cargo, 'delivery', units);
    }
    return ok(before - this.cash);
  }

  /** Build a processing building inside a station that serves a town. */
  buildStationBuilding(at: Coord, kind: BuildingKind): CommandResult {
    const station = this.stationAt(at);
    if (!station) return fail('not a station');
    if (!this.servedTown(station)) return fail('station serves no town');
    if (station.buildings.some((b) => b.kind === kind))
      return fail(`station already has a ${kind.replaceAll('-', ' ')}`);
    if (station.buildings.length >= BUILDING_SLOTS[station.size]) return fail('no free building slot');
    const { cost } = BUILDING[kind];
    if (cost > this.cash) return fail('insufficient funds');
    this.addStationBuilding(station, kind);
    this.spend(cost, 'construction');
    return ok(cost);
  }

  /** Loading/fixture API: put a building in a station without checks or cost. */
  addStationBuilding(station: Station, kind: BuildingKind): StationBuilding {
    const b: StationBuilding = { kind, input: 0, received: 0, lastMade: 0, madeThisYear: 0 };
    station.buildings.push(b);
    return b;
  }

  /** Tear down a station building for a partial refund. Its unused input is lost. */
  demolishStationBuilding(at: Coord, kind: BuildingKind): CommandResult {
    const station = this.stationAt(at);
    if (!station) return fail('not a station');
    const i = station.buildings.findIndex((b) => b.kind === kind);
    if (i < 0) return fail('no such building');
    station.buildings.splice(i, 1);
    const refund = Math.round(BUILDING[kind].cost * BUILDING_REFUND_RATE);
    this.spend(-refund, 'construction');
    return ok(-refund);
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
    if (!findTrackPath(this.track, train.next ?? train.at, at))
      return fail(`no track connects ${fmt(train.at)} and ${fmt(at)}`);
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
      train.cars = cleanMix(order);
      trimToCapacity(train);
    }
    if (station) this.load(train, station);
  }

  private unload(train: Train, station: Station): void {
    const days = (lot: Lot) => Math.floor((this.time - lot.loadedAt) / TICKS_PER_DAY);
    train.cargo = train.cargo.filter((lot) => {
      const distance = manhattan(lot.from, station.at);
      if (distance === 0 || !this.accepts(station, lot.cargo)) return true;
      this.deliverCargo(station.at, { cargo: lot.cargo, units: lot.units, distance, days: days(lot) });
      return false;
    });
  }

  private load(train: Train, station: Station): void {
    const room = new Map(CAR_TYPES.map((t) => [t, spareRoom(train, t)]));
    /** Load up to `available` units into the coupled cars that carry it, specialised types first. */
    const take = (cargo: Cargo, available: number): number => {
      let loaded = 0;
      for (const car of CAR_FILL_ORDER) {
        if (!carriesCargo(car, cargo)) continue;
        const n = Math.min(available - loaded, room.get(car)!);
        if (n <= 0) continue;
        room.set(car, room.get(car)! - n);
        loaded += n;
        const lot = train.cargo.find(
          (l) => l.cargo === cargo && l.car === car && sameAt(l.from, station.at) && l.loadedAt === this.time,
        );
        if (lot) lot.units += n;
        else train.cargo.push({ cargo, car, units: n, from: { ...station.at }, loadedAt: this.time });
      }
      return loaded;
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
        industry.stock = Math.min(industry.stock + spec.perMonth, DEPOSIT_CAP_MONTHS * spec.perMonth);
      } else {
        const batches = Math.floor(industry.input / spec.in);
        industry.input -= batches * spec.in;
        industry.stock += batches * spec.out;
      }
    }
  }

  /**
   * Month end for station buildings: convert input by ratio (leftovers wait), sell the output to the
   * town, leave the rest at the station as cargo, and pay upkeep.
   */
  private runBuildings(year: number): void {
    for (const station of this.stations.values()) {
      const town = this.servedTown(station);
      for (const b of station.buildings) {
        const spec = BUILDING[b.kind];
        const batches = Math.floor(b.input / spec.in);
        b.input -= batches * spec.in;
        const made = batches * spec.out;
        b.lastMade = made;
        b.madeThisYear += made;
        const sold = town ? this.sellToTown(town, spec.output, made, year) : 0;
        addWaiting(station, spec.output, b.kind, made - sold);
        this.spend(spec.upkeep, 'buildingUpkeep', year);
      }
    }
  }

  /**
   * Year end: towns that saw at least half their passengers carried away grow, and towns sold at
   * least half their yearly bread demand at full price grow a little more.
   */
  private growTowns(): void {
    for (const town of this.towns) {
      let rate = 0;
      if (town.generatedThisYear > 0 && town.carriedThisYear * 2 >= town.generatedThisYear)
        rate += TOWN_GROWTH_RATE;
      const breadDemand = 12 * this.townDemand(town, 'loaves');
      if (breadDemand > 0 && town.breadThisYear * 2 >= breadDemand) rate += BREAD_GROWTH_RATE;
      if (rate > 0) town.population = Math.round(town.population * (1 + rate));
      town.generatedThisYear = 0;
      town.carriedThisYear = 0;
      town.breadThisYear = 0;
    }
    for (const station of this.stations.values()) for (const b of station.buildings) b.madeThisYear = 0;
  }

  // --- Locomotives: eras, ageing, breakdowns -------------------------------------

  /** How breakdowns are decided; tests force them on or off. */
  breakdowns: 'random' | 'always' | 'never' = 'random';

  onSale(model: LocoModel, year = this.date.year): boolean {
    const m = LOCO[model];
    return m.from <= year && (m.to === undefined || year <= m.to);
  }

  modelsOnSale(year = this.date.year): LocoModel[] {
    return LOCO_MODELS.filter((m) => this.onSale(m, year));
  }

  /** Whole 360-day years since the locomotive was bought (or last overhauled). */
  trainAge(train: Train): number {
    return Math.floor((this.time - train.boughtAt) / (TICKS_PER_DAY * DAYS_PER_YEAR));
  }

  isWornOut(train: Train): boolean {
    return this.trainAge(train) >= LOCO[train.model].life;
  }

  workingLifeLeft(train: Train): number {
    return Math.max(0, LOCO[train.model].life - this.trainAge(train));
  }

  /** The locomotive's monthly running cost: base x 1.03^age, in whole dollars. */
  locoRunningCost(train: Train): number {
    return Math.round(LOCO[train.model].running * (1 + AGE_RUNNING_COST_RATE) ** this.trainAge(train));
  }

  breakdownChance(train: Train): number {
    const past = this.trainAge(train) - LOCO[train.model].life;
    return past < 0 ? BREAKDOWN_CHANCE : BREAKDOWN_CHANCE + BREAKDOWN_CHANCE_PER_YEAR_WORN * past;
  }

  isBrokenDown(train: Train): boolean {
    return train.brokenUntil !== null && this.time < train.brokenUntil;
  }

  /** Month end: every running train rolls for a breakdown; repairs are paid straight away. */
  private rollBreakdowns(year: number): void {
    for (const train of this.trains) {
      if (this.isBrokenDown(train)) continue;
      const roll = this.rng.next();
      const broken =
        this.breakdowns === 'always' || (this.breakdowns === 'random' && roll < this.breakdownChance(train));
      if (!broken) continue;
      train.brokenUntil = this.time + BREAKDOWN_DAYS * TICKS_PER_DAY;
      train.status = 'broken-down';
      this.spend(Math.round(LOCO[train.model].price * REPAIR_RATE), 'trainRunning', year);
    }
  }

  /** A train standing still on a station tile. */
  private atStation(train: Train): boolean {
    return train.next === null && this.isStation(train.at);
  }

  /** Make the locomotive as good as new (age 0) for 30% of its price. */
  overhaul(trainId: number): CommandResult {
    const train = this.train(trainId);
    if (!train) return fail('no such train');
    if (!this.atStation(train)) return fail('train must be at a station');
    if (!this.onSale(train.model)) return fail('model no longer on sale');
    const cost = Math.round(LOCO[train.model].price * OVERHAUL_RATE);
    if (cost > this.cash) return fail('insufficient funds');
    train.boughtAt = this.time;
    this.spend(cost, 'rollingStock');
    return ok(cost);
  }

  /**
   * Retire a train standing at a station: the company gets the locomotive's trade-in value plus the
   * cars' resale value. The train and any cargo on board are gone.
   */
  retireTrain(trainId: number): CommandResult {
    const train = this.train(trainId);
    if (!train) return fail('no such train');
    if (!this.atStation(train)) return fail('train must be at a station');
    const refund = this.tradeInValue(train) + mixValue(train.owned, CAR_RESALE_RATE);
    this.trains.splice(this.trains.indexOf(train), 1);
    this.spend(-refund, 'rollingStock');
    return ok(-refund);
  }

  /** What the current locomotive is worth when traded in: 50% new, falling to 10% over its working life. */
  tradeInValue(train: Train): number {
    const m = LOCO[train.model];
    const worn = Math.min(1, this.trainAge(train) / m.life);
    return Math.round(m.price * (TRADE_IN_NEW_RATE - (TRADE_IN_NEW_RATE - TRADE_IN_WORN_RATE) * worn));
  }

  /**
   * Swap the locomotive for a model on sale. Pays the new price minus the trade-in; cars the new model
   * cannot pull are sold (kept in CAR_KEEP_ORDER). Cars, route, orders and cargo stay.
   */
  replaceLocomotive(trainId: number, model: LocoModel): CommandResult {
    const train = this.train(trainId);
    if (!train) return fail('no such train');
    if (!this.atStation(train)) return fail('train must be at a station');
    if (!this.onSale(model)) return fail('model not on sale');
    let room = LOCO[model].maxCars;
    const kept: CarMix = {};
    const sold: CarMix = {};
    for (const t of CAR_KEEP_ORDER) {
      const keep = Math.min(carsOf(train.owned, t), room);
      room -= keep;
      kept[t] = keep;
      sold[t] = carsOf(train.owned, t) - keep;
    }
    const resale = mixValue(sold, CAR_RESALE_RATE);
    const cost = LOCO[model].price - this.tradeInValue(train) - resale;
    if (cost > this.cash) return fail('insufficient funds');
    train.model = model;
    train.boughtAt = this.time;
    train.speed = unitsPerTick(LOCO[model].tilesPerDay);
    if (totalCars(sold) > 0) this.setOwnedCars(train, kept);
    this.spend(cost, 'rollingStock');
    return ok(cost);
  }

  // --- Finance: bonds, shares, dividends, solvency --------------------------------

  /** Borrow $100,000. The rate is 5% plus a point for every bond already outstanding. */
  issueBond(): CommandResult {
    if (this.bonds.length >= MAX_BONDS) return fail('credit limit reached');
    this.bonds.push({
      principal: BOND_PRINCIPAL,
      ratePct: BOND_BASE_RATE_PCT + BOND_RATE_STEP_PCT * this.bonds.length,
    });
    this.spend(-BOND_PRINCIPAL, 'financingIn');
    return ok(-BOND_PRINCIPAL);
  }

  /** Pay back the most expensive bond outstanding. */
  repayBond(): CommandResult {
    if (this.bonds.length === 0) return fail('no bonds');
    const i = this.bonds.reduce((best, b, k) => (b.ratePct > this.bonds[best]!.ratePct ? k : best), 0);
    const { principal } = this.bonds[i]!;
    if (principal > this.cash) return fail('insufficient funds');
    this.bonds.splice(i, 1);
    this.spend(principal, 'financingOut');
    return ok(principal);
  }

  get debt(): number {
    return this.bonds.reduce((n, b) => n + b.principal, 0);
  }

  private payInterest(year: number): void {
    for (const b of this.bonds)
      this.spend(Math.round((b.principal * b.ratePct) / 100 / 12), 'interest', year);
  }

  /** What the company owns, at half its build cost today (trains at trade-in and resale value). */
  assetValue(): number {
    let value = 0;
    for (const seg of this.track.segments()) {
      const cost = this.lineCost(seg.a, seg.b);
      if (typeof cost === 'number') value += cost * ASSET_VALUE_RATE * (seg.double ? 2 : 1);
    }
    for (const st of this.stations.values()) {
      value += STATION[st.size].cost * ASSET_VALUE_RATE;
      for (const b of st.buildings) value += BUILDING[b.kind].cost * ASSET_VALUE_RATE;
    }
    for (const t of this.trains) value += this.tradeInValue(t) + mixValue(t.owned, CAR_RESALE_RATE);
    return Math.round(value);
  }

  equity(): number {
    return this.cash + this.assetValue() - this.debt;
  }

  /** Income minus running costs over the last 12 completed months. */
  operatingProfit(): number {
    return this.monthlyOps.reduce((n, m) => n + m, 0);
  }

  private operatingTotal(): number {
    let n = 0;
    for (const page of this.ledger.values()) for (const c of OPERATING) n += page[c];
    return n;
  }

  private recordOperatingMonth(): void {
    const total = this.operatingTotal();
    this.monthlyOps.push(total - this.opsAtLastMonthEnd);
    this.opsAtLastMonthEnd = total;
    if (this.monthlyOps.length > 12) this.monthlyOps.shift();
  }

  private computeSharePriceCents(): number {
    const value = this.equity() + EARNINGS_MULTIPLE * Math.max(0, this.operatingProfit());
    return Math.max(MIN_SHARE_PRICE_CENTS, Math.round((value * 100) / this.sharesOutstanding));
  }

  private updateSharePrice(): void {
    this.sharePriceCents = this.computeSharePriceCents();
    this.priceHistory.push(this.sharePriceCents);
  }

  /** Money for `shares` at the last month-end price times `rate`, in whole dollars. */
  private shareMoney(shares: number, rate = 1): number {
    return Math.round((shares * this.sharePriceCents * rate) / 100);
  }

  get publicShares(): number {
    return this.sharesOutstanding - this.playerShares;
  }

  /** Sell new shares to the public at 90% of the price; the money goes to the company. */
  sellNewShares(shares: number): CommandResult {
    if (shares <= 0 || shares % COMPANY_SHARE_LOT !== 0) return fail('shares are issued in lots of 10,000');
    const money = this.shareMoney(shares, NEW_SHARE_PRICE_RATE);
    this.sharesOutstanding += shares;
    this.spend(-money, 'financingIn');
    return ok(-money);
  }

  /** Buy back public shares at 110% of the price from company cash. */
  buyBackShares(shares: number): CommandResult {
    if (shares <= 0 || shares % COMPANY_SHARE_LOT !== 0) return fail('shares are issued in lots of 10,000');
    if (shares > this.publicShares) return fail('not enough shares');
    const money = this.shareMoney(shares, BUYBACK_PRICE_RATE);
    if (money > this.cash) return fail('insufficient funds');
    this.sharesOutstanding -= shares;
    this.spend(money, 'financingOut');
    return ok(money);
  }

  /** The player buys shares from the public with personal cash. */
  buySharesAsPlayer(shares: number): CommandResult {
    if (shares <= 0 || shares % PLAYER_SHARE_LOT !== 0) return fail('shares trade in lots of 1,000');
    if (shares > this.publicShares) return fail('not enough shares');
    const money = this.shareMoney(shares);
    if (money > this.personalCash) return fail('insufficient personal funds');
    this.personalCash -= money;
    this.playerShares += shares;
    return ok(0);
  }

  /** The player sells shares to the public for personal cash. */
  sellSharesAsPlayer(shares: number): CommandResult {
    if (shares <= 0 || shares % PLAYER_SHARE_LOT !== 0) return fail('shares trade in lots of 1,000');
    if (shares > this.playerShares) return fail('not enough shares');
    this.personalCash += this.shareMoney(shares);
    this.playerShares -= shares;
    return ok(0);
  }

  /** The yearly dividend per share, in cents. */
  setDividend(cents: number): CommandResult {
    if (cents < 0) return fail('dividend cannot be negative');
    this.dividendCents = Math.round(cents);
    return ok(0);
  }

  /** The player's score: personal cash plus their shares at the share price. */
  netWorth(): number {
    return this.personalCash + this.shareMoney(this.playerShares);
  }

  private notify(message: string): void {
    this.notices.push(`${fmtDate(this.date)}: ${message}`);
  }

  private payDividend(year: number): void {
    if (this.dividendCents === 0) return;
    const total = Math.round((this.sharesOutstanding * this.dividendCents) / 100);
    if (this.cash - total < 0) {
      this.notify('dividend skipped: not enough cash');
      return;
    }
    this.spend(total, 'financingOut', year);
    this.personalCash += Math.round((this.playerShares * this.dividendCents) / 100);
  }

  /** Warn at the first month end in the red; restructure at the third in a row. */
  private checkSolvency(year: number): void {
    if (this.cash >= 0) {
      this.negativeMonths = 0;
      return;
    }
    this.negativeMonths++;
    if (this.negativeMonths === 1)
      this.notify('cash is negative: raise money or the company will be restructured');
    if (this.negativeMonths < BANKRUPTCY_MONTHS) return;
    for (const b of this.bonds) b.principal = Math.round(b.principal / 2);
    this.playerShares = Math.ceil(this.playerShares / 2);
    this.spend(this.cash, 'financingIn', year);
    this.restructurings++;
    this.negativeMonths = 0;
    this.notify('company restructured: debt and your shares halved, cash set to $0');
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
    const cars = this.trains.reduce((n, t) => n + totalCars(t.owned), 0);
    return {
      trackMaintenance: this.track.lineCount * TRACK_MAINTENANCE_PER_SEGMENT,
      trainRunning: this.trains.reduce((n, t) => n + this.locoRunningCost(t), 0) + cars * CAR_RUNNING_COST,
    };
  }

  /** Runs on the first hour of a new month and bills the month that just ended. Cash may go negative. */
  private endOfMonth(): void {
    const ended = dateAt(this.time - 1);
    const year = ended.year;
    this.produceTownCargo();
    this.runIndustries();
    this.runBuildings(year);
    for (const town of this.towns) town.soldThisMonth = {};
    if (ended.month === 11) this.growTowns();
    const costs = this.monthlyRunningCosts();
    this.spend(costs.trackMaintenance, 'trackMaintenance', year);
    this.spend(costs.trainRunning, 'trainRunning', year);
    this.rollBreakdowns(year);
    this.payInterest(year);
    this.recordOperatingMonth();
    if (ended.month === 11) this.payDividend(year);
    this.checkSolvency(year);
    this.updateSharePrice();
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
      segments: [...this.track.segments()].map((s) => ({
        a: s.a,
        b: s.b,
        bridge: s.bridge,
        ...(s.double ? { double: true } : {}),
      })),
      stations: [...this.stations.values()].map((s) => ({ at: s.at, size: s.size })),
      trains: this.trains.map((t) => ({
        at: t.at,
        tilesPerDay: (t.speed * TICKS_PER_DAY) / TILE_UNITS,
        cars: t.cars,
        owned: t.owned,
        route: t.route,
        stopOrders: t.stopOrders,
        target: t.target,
        cargo: t.cargo,
        trip: t.trip,
        lastStop: t.lastStop,
        prev: t.prev,
        model: t.model,
        boughtAt: t.boughtAt,
        brokenUntil: t.brokenUntil,
      })),
      towns: this.towns.map((t) => ({
        population: t.population,
        generatedThisYear: t.generatedThisYear,
        carriedThisYear: t.carriedThisYear,
        soldThisMonth: t.soldThisMonth,
        breadThisYear: t.breadThisYear,
      })),
      stationWaiting: [...this.stations.values()].map((s) => s.waiting),
      stationBuildings: [...this.stations.values()].map((s) => s.buildings),
      finance: {
        bonds: this.bonds,
        sharesOutstanding: this.sharesOutstanding,
        playerShares: this.playerShares,
        personalCash: this.personalCash,
        dividendCents: this.dividendCents,
        sharePriceCents: this.sharePriceCents,
        priceHistory: this.priceHistory,
        negativeMonths: this.negativeMonths,
        restructurings: this.restructurings,
        notices: this.notices,
        monthlyOps: this.monthlyOps,
        opsAtLastMonthEnd: this.opsAtLastMonthEnd,
      },

      industries: this.industries.map((i) => ({
        kind: i.kind,
        at: i.at,
        stock: i.stock,
        input: i.input,
        received: i.received,
      })),
    };
  }

  private restoreFinance(save: SaveData): void {
    const f = save.finance;
    if (!f) {
      // Saves from before M8: start measuring operating months from now.
      this.opsAtLastMonthEnd = this.operatingTotal();
      this.sharePriceCents = this.computeSharePriceCents();
      return;
    }
    this.bonds.push(...f.bonds);
    this.sharesOutstanding = f.sharesOutstanding;
    this.playerShares = f.playerShares;
    this.personalCash = f.personalCash;
    this.dividendCents = f.dividendCents;
    this.sharePriceCents = f.sharePriceCents;
    this.priceHistory.push(...f.priceHistory);
    this.negativeMonths = f.negativeMonths;
    this.restructurings = f.restructurings;
    this.notices.push(...f.notices);
    this.monthlyOps.push(...f.monthlyOps);
    this.opsAtLastMonthEnd = f.opsAtLastMonthEnd;
  }

  /** Restores a save. Trains restart from the tile they last reached. */
  static fromSave(save: SaveData): Game {
    const game = Game.generate(save.gen);
    game.cash = save.cash;
    game.time = save.time;
    for (const { year, ...page } of save.ledger ?? [])
      game.ledger.set(year, { ...emptyLedgerYear(), ...page });
    for (const s of save.segments) game.track.add(s.a, s.b, s.bridge, s.double ?? false);
    game.restoreFinance(save);
    save.towns?.forEach((t, i) => Object.assign(game.towns[i]!, { soldThisMonth: {}, breadThisYear: 0 }, t));
    if (save.industries) {
      game.industries.length = 0;
      for (const i of save.industries) Object.assign(game.addIndustry(i.kind, i.at), i);
    }
    save.stations.forEach((s, i) => {
      const station = game.addStation(s.size, s.at);
      station.waiting.push(...(save.stationWaiting?.[i] ?? []));
      station.buildings.push(...(save.stationBuildings?.[i] ?? []));
    });
    for (const t of save.trains) {
      const train = game.addTrain(t);
      train.route = t.route;
      // Before M7 trains had passenger and freight cars: they become coaches and legacy freight cars.
      train.cars = cleanMix(
        t.cars ?? fromLegacy({ passengerCars: t.passengerCars ?? 0, freightCars: t.freightCars ?? 0 }),
      );
      train.owned = t.owned ? cleanMix(fromLegacy(t.owned)) : { ...train.cars };
      train.stopOrders = (t.stopOrders ?? t.route.map(() => null)).map((o) =>
        o ? cleanMix(fromLegacy(o)) : null,
      );
      train.target = t.target;
      train.cargo = (t.cargo ?? []).map((l) => ({
        ...l,
        car: l.car ?? (l.cargo === 'passengers' ? 'coach' : l.cargo === 'mail' ? 'coach' : 'legacy-freight'),
      }));
      train.trip = t.trip ?? null;
      train.lastStop = t.lastStop ?? null;
      train.prev = t.prev ?? null;
      // Unknown or retired ids from older builds load as the 4-4-0 American.
      train.model = t.model && t.model in LOCO ? t.model : 'american';
      train.speed = unitsPerTick(t.tilesPerDay ?? LOCO[train.model].tilesPerDay);
      train.boughtAt = t.boughtAt ?? 0;
      train.brokenUntil = t.brokenUntil ?? null;
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

/** Units of free room in the coupled cars of one type. */
function spareRoom(train: Train, type: CarType): number {
  const used = train.cargo.reduce((n, l) => n + (l.car === type ? l.units : 0), 0);
  return carsOf(train.cars, type) * CAR[type].capacity - used;
}

/** After cars are uncoupled or sold, cargo that no longer fits is lost (newest first). */
function trimToCapacity(train: Train): void {
  for (const type of CAR_TYPES) {
    let over = -spareRoom(train, type);
    for (let i = train.cargo.length - 1; i >= 0 && over > 0; i--) {
      const lot = train.cargo[i]!;
      if (lot.car !== type) continue;
      const cut = Math.min(lot.units, over);
      lot.units -= cut;
      over -= cut;
    }
  }
  train.cargo = train.cargo.filter((l) => l.units > 0);
}

/** Car counts as saved before M7. */
export interface LegacyCarCounts {
  passengerCars: number;
  freightCars: number;
}

/** Cars saved before M7: passenger cars become coaches, freight cars legacy freight cars. */
export function carsFromLegacy(c: CarMix | LegacyCarCounts): CarMix {
  return cleanMix(fromLegacy(c));
}

function fromLegacy(c: CarMix | LegacyCarCounts): CarMix {
  if (!('passengerCars' in c) && !('freightCars' in c)) return c as CarMix;
  const old = c as LegacyCarCounts;
  return { coach: old.passengerCars ?? 0, 'legacy-freight': old.freightCars ?? 0 };
}

/** Consecutive tile pairs of a path. */
const pairs = (path: readonly Coord[]): [Coord, Coord][] =>
  path.slice(1).map((c, i) => [path[i]!, c] as [Coord, Coord]);

const fmtDate = (d: GameDate): string => `${d.day} ${MONTH_NAMES[d.month]} ${d.year}`;
