import type { Industry } from '../sim/cargo';
import type { Game, Station } from '../sim/game';
import type { TrackPlan } from '../sim/planner';
import type { Segment } from '../sim/track';
import type { CarMix } from '../sim/cars';
import type { Train } from '../sim/trains';
import type { Coord } from '../sim/types';
import { BANKRUPTCY_MONTHS, type LocoModel } from '../sim/config';
import { MONTHS, SAVE_KEY } from './constants';
import { $ } from './dom';
import { money } from './format';

export type Tool = 'pan' | 'track' | 'bridge' | 'double' | 'demolish' | 'station' | 'train';

export interface Preview {
  path: Coord[];
  ok: boolean;
  /** Safe HTML for the bottom sheet (bridge and demolish tools). */
  html: string;
  /** Segments that would be torn up (demolish preview only). */
  affected: [Coord, Coord][];
  /** Track planner preview: which segments are bridges. */
  bridgeSegs?: boolean[];
}

export interface TrackState {
  main: TrackPlan | null;
  /** Land-only alternative to a route that needs a bridge. */
  alt: TrackPlan | null;
  view: 'main' | 'alt';
  error: string | null;
}

export interface BuyState {
  at: Coord;
  model: LocoModel;
  cars: CarMix;
}

export interface RouteState {
  trainId: number;
  stops: Coord[];
  /** Per stop: the car split to leave with, or null to keep the cars. */
  orders: (CarMix | null)[];
  /** True while tapping stations on the map; false while editing the list. */
  picking: boolean;
  /** List editor: index the station picker will insert at (stops.length = append), or null when closed. */
  picker: number | null;
  error: string | null;
}

/** Picking a new locomotive for a train standing at a station. */
export interface ReplaceState {
  trainId: number;
  model: LocoModel | null;
  /** True once the player must confirm selling cars. */
  confirm: boolean;
}

export interface SendState {
  trainId: number;
}

export interface Floater {
  x: number;
  y: number;
  text: string;
  t0: number;
}

export interface CarsState {
  trainId: number;
  cars: CarMix;
}

/** Pointer-based drag reorder of stop rows. Live transforms only; commit on drop. */
export interface DragState {
  pid: number;
  from: number;
  to: number;
  startY: number;
  clientY: number;
  startScroll: number;
  sc: HTMLElement;
  rows: HTMLElement[];
  centers: number[];
  heights: number[];
  raf: number;
}

export interface CamAnim {
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
  t0: number;
}

/**
 * The shared UI context: the game, camera, tool and selection state, DOM anchors and the
 * cross-module hooks. Modules take it as a parameter instead of capturing closure variables.
 */
export class Ui {
  // DOM anchors
  readonly canvas = $<HTMLCanvasElement>('map');
  readonly ctx = this.canvas.getContext('2d')!;
  readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  readonly wideLayout = window.matchMedia('(min-width: 720px)');
  readonly sheet = $('sheet');
  readonly sheetMsg = $('sheet-msg');
  readonly toast = $('toast');
  readonly cashBox = document.querySelector<HTMLElement>('.cash-box')!;

  // Game and derived map data
  game!: Game;
  terrain!: HTMLCanvasElement;
  segs: Segment[] = [];
  trackVersion = 0;

  // Camera
  readonly cam = { x: 0, y: 0, zoom: 24 };
  camAnim: CamAnim | null = null;
  viewW = 0;
  viewH = 0;
  dpr = 1;

  // Tool and selection
  tool: Tool = 'pan';
  startTile: Coord | null = null;
  preview: Preview | null = null;
  tp: TrackState | null = null;
  stationTile: Coord | null = null;
  buy: BuyState | null = null;
  routing: RouteState | null = null;
  /** Index of the stop being dragged in the route editor (highlighted on the map). */
  dragStop: number | null = null;
  drag: DragState | null = null;
  carsEdit: CarsState | null = null;
  replacing: ReplaceState | null = null;
  /** Train id awaiting a confirmation to retire it. */
  retiring: number | null = null;
  /** Trains seen broken down (to toast once per breakdown); null until the first frame. */
  brokenSeen: Set<number> | null = null;
  /** Last year checked for model arrivals and retirements; null until the first frame. */
  eraYear: number | null = null;
  selTrainId: number | null = null;
  selStation: Station | null = null;
  /** Station sheet pane: the overview, the build list, or a demolish confirmation for one building. */
  stationPane: 'info' | 'build' | `demolish:${string}` = 'info';
  selIndustry: Industry | null = null;
  sendTo: SendState | null = null;
  ledgerOpen = false;
  companyOpen = false;
  /** How many game notices have been toasted; null until the first frame of a game. */
  noticesSeen: number | null = null;
  floaters: Floater[] = [];
  actions: Record<string, () => void> = {};

  // Time
  paused = false;
  speed = 1;
  acc = 0;
  renderFrac = 0;
  lastDay = 0;
  lastFrame = performance.now();
  lastTrainKey = '';
  lastRosterAt = 0;
  readonly alarmed = new Set<number>();
  readonly stopCount = new Map<number, number>();
  lastIncome = -1;
  lastIncomeYear = 0;

  // Drawing caches
  drawQueued = false;
  legCache: { key: string; segs: [Coord, Coord][] } | null = null;

  // HUD caches
  private toastTimer = 0;
  private lastCash = '';
  private lastDate = '';

  // Hooks wired in main.ts (they live in modules that depend on this one).
  renderSheet: () => void = () => {};
  renderRoster: () => void = () => {};
  requestDraw: () => void = () => {};

  persist = (): void => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.game.toSave()));
    } catch {
      /* storage unavailable: play on without saving */
    }
  };

  refreshSegs = (): void => {
    this.segs = [...this.game.track.segments()];
    this.trackVersion++;
  };

  private dateText(): string {
    const { day, month, year } = this.game.date;
    return `${day} ${MONTHS[month]} ${year}`;
  }

  updateHud = (): void => {
    const { game } = this;
    const cash = (game.cash < 0 ? '−' : '') + money(game.cash);
    if (cash !== this.lastCash) {
      this.lastCash = cash;
      $('cash').textContent = cash;
      this.cashBox.classList.toggle('negative', game.cash < 0);
    }
    const warn = $('cash-warn');
    const w =
      game.negativeMonths > 0
        ? `Cash negative: ${game.negativeMonths} of ${BANKRUPTCY_MONTHS} months before restructuring`
        : '';
    if (warn.textContent !== w) {
      warn.textContent = w;
      warn.classList.toggle('hidden', !w);
    }
    const d = this.dateText();
    if (d !== this.lastDate) {
      this.lastDate = d;
      $('date').textContent = d;
    }
    $('seed').textContent = String(game.gen?.seed ?? 0);
  };

  showToast = (text: string, ms = 3500): void => {
    this.toast.textContent = text;
    this.toast.classList.remove('hidden');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toast.classList.add('hidden'), ms);
  };

  setSheet = (html: string, acts: Record<string, () => void>, tall = false): void => {
    const keep = this.sheetMsg.querySelector('.editor-scroll')?.scrollTop ?? 0;
    this.sheet.classList.remove('hidden');
    this.sheet.classList.toggle('tall', tall);
    this.sheetMsg.innerHTML = html;
    this.actions = acts;
    const sc = this.sheetMsg.querySelector('.editor-scroll');
    if (sc && tall) sc.scrollTop = keep;
  };

  selectedTrain = (): Train | undefined =>
    this.selTrainId === null ? undefined : this.game.trains.find((t) => t.id === this.selTrainId);

  clearSelection = (): void => {
    this.startTile = null;
    this.preview = null;
    this.tp = null;
    this.stationTile = null;
    this.buy = null;
    this.routing = null;
    this.carsEdit = null;
    this.replacing = null;
    this.retiring = null;
    this.selTrainId = null;
    this.selStation = null;
    this.stationPane = 'info';
    this.selIndustry = null;
    this.sendTo = null;
    this.ledgerOpen = false;
    this.companyOpen = false;
    this.renderSheet();
    this.renderRoster();
    this.requestDraw();
  };

  setTool = (t: Tool): void => {
    this.tool = t;
    for (const b of document.querySelectorAll<HTMLButtonElement>('.tool'))
      b.classList.toggle('active', b.dataset.tool === t);
    this.canvas.style.cursor = t === 'pan' ? 'grab' : 'crosshair';
    this.clearSelection();
  };
}
