import { START_YEAR, TICKS_PER_DAY } from './config';

// --- Calendar -------------------------------------------------------------------
// A simplified calendar: 12 months of 30 days, starting 1 January START_YEAR.

export const DAYS_PER_MONTH = 30;
export const MONTHS_PER_YEAR = 12;
export const DAYS_PER_YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR;
export const TICKS_PER_MONTH = DAYS_PER_MONTH * TICKS_PER_DAY;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export interface GameDate {
  readonly year: number;
  /** 0 = January. */
  readonly month: number;
  /** 1–30. */
  readonly day: number;
}

export function dateAt(time: number): GameDate {
  const days = Math.floor(time / TICKS_PER_DAY);
  return {
    year: START_YEAR + Math.floor(days / DAYS_PER_YEAR),
    month: Math.floor((days % DAYS_PER_YEAR) / DAYS_PER_MONTH),
    day: (days % DAYS_PER_MONTH) + 1,
  };
}

/** Game time (ticks) at the first hour of the given date. */
export function timeOf(date: GameDate): number {
  const days = (date.year - START_YEAR) * DAYS_PER_YEAR + date.month * DAYS_PER_MONTH + (date.day - 1);
  return days * TICKS_PER_DAY;
}

// --- Ledger ---------------------------------------------------------------------

/** Where money went or came from. Income categories are positive, spending negative. */
export const LEDGER_CATEGORIES = [
  'cargoIncome',
  'construction',
  'rollingStock',
  'trackMaintenance',
  'trainRunning',
] as const;
export type LedgerCategory = (typeof LEDGER_CATEGORIES)[number];

/** One year's account. Each entry is the net cash flow: positive in, negative out. */
export type LedgerYear = Record<LedgerCategory, number>;

export const emptyLedgerYear = (): LedgerYear => ({
  cargoIncome: 0,
  construction: 0,
  rollingStock: 0,
  trackMaintenance: 0,
  trainRunning: 0,
});

export const runningCosts = (y: LedgerYear): number => -(y.trackMaintenance + y.trainRunning);

/** Net result for the year: income minus all spending. */
export const profit = (y: LedgerYear): number => LEDGER_CATEGORIES.reduce((sum, c) => sum + y[c], 0);
