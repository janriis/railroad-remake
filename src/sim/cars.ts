import { CAR, CAR_TYPES, type Cargo, type CarType } from './config';

/** How many cars of each type; missing types count as 0. */
export type CarMix = Partial<Record<CarType, number>>;

export const carsOf = (mix: CarMix, type: CarType): number => mix[type] ?? 0;

export const totalCars = (mix: CarMix): number => CAR_TYPES.reduce((n, t) => n + carsOf(mix, t), 0);

/** The same mix without zero entries, in the standard type order (stable for saves and comparisons). */
export function cleanMix(mix: CarMix): CarMix {
  const out: CarMix = {};
  for (const t of CAR_TYPES) if (carsOf(mix, t) > 0) out[t] = carsOf(mix, t);
  return out;
}

export const carriesCargo = (type: CarType, cargo: Cargo): boolean => CAR[type].carries.includes(cargo);

/** Price of a mix at the car prices, times `rate`, in whole dollars per type. */
export const mixValue = (mix: CarMix, rate = 1): number =>
  CAR_TYPES.reduce((n, t) => n + Math.round(carsOf(mix, t) * CAR[t].price * rate), 0);
