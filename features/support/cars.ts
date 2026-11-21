import type { CarType } from '../../src/sim/config';
import type { CarMix } from '../../src/sim/cars';

/** Car names as written in scenarios (singular and plural) → car type id. Longest names first. */
const NAMES: [RegExp, CarType][] = [
  [/^covered hoppers?$/, 'covered-hopper'],
  [/^(?:coal )?hoppers?$/, 'hopper'],
  [/^(?:mail & )?baggage cars?$/, 'baggage'],
  [/^boxcars?$/, 'boxcar'],
  [/^flatcars?$/, 'flatcar'],
  [/^legacy freight cars?$/, 'legacy-freight'],
  [/^coach(?:es)?$/, 'coach'],
];

export const CAR_NAME_PATTERN =
  'covered hoppers?|coal hoppers?|hoppers?|mail & baggage cars?|baggage cars?|boxcars?|flatcars?|legacy freight cars?|coach(?:es)?';

export function carType(name: string): CarType {
  const hit = NAMES.find(([re]) => re.test(name.trim()));
  if (!hit) throw new Error(`unknown car "${name}"`);
  return hit[1];
}

/** The singular names used in scenario lists, in the standard type order. */
export const SINGULAR: Record<CarType, string> = {
  coach: 'coach',
  baggage: 'baggage car',
  boxcar: 'boxcar',
  hopper: 'hopper',
  'covered-hopper': 'covered hopper',
  flatcar: 'flatcar',
  'legacy-freight': 'legacy freight car',
};

/** "2 coaches and 1 boxcar" / "2 coaches, 1 boxcar and 0 hoppers" → a car mix. */
export function parseCarList(text: string): CarMix {
  const mix: CarMix = {};
  for (const m of text.matchAll(new RegExp(`(\\d+) (${CAR_NAME_PATTERN})`, 'g'))) {
    const t = carType(m[2]!);
    mix[t] = (mix[t] ?? 0) + Number(m[1]);
  }
  return mix;
}

/** A `| car | count |` table → a car mix. */
export function mixFromRows(rows: Record<string, string>[]): CarMix {
  const mix: CarMix = {};
  for (const r of rows) {
    const t = carType(r['car']!);
    mix[t] = (mix[t] ?? 0) + Number(r['count'] || 0);
  }
  return mix;
}
