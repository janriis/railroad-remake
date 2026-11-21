import { CAR, CAR_KEEP_ORDER, CAR_TYPES, type Cargo, type CarType } from '../sim/config';
import { carriesCargo, carsOf, totalCars, type CarMix } from '../sim/cars';

/** One letter per car type for the cramped roster. */
export const CAR_LETTER: Readonly<Record<CarType, string>> = {
  coach: 'C',
  baggage: 'B',
  boxcar: 'X',
  hopper: 'H',
  'covered-hopper': 'V',
  flatcar: 'F',
  'legacy-freight': 'L',
};

/** Colour marking a car type on the map (null: the sprite is left as it is). */
export const CAR_TINT: Readonly<Record<CarType, string | null>> = {
  coach: null,
  baggage: '#d9a21b',
  boxcar: '#b5532b',
  hopper: '#2f2f33',
  'covered-hopper': '#b9c2c9',
  flatcar: '#6d4c2a',
  'legacy-freight': '#8a6a45',
};

/** "2 coaches · 1 coal hopper", or `empty` for no cars. */
export function mixText(mix: CarMix, empty = 'no cars'): string {
  const parts = CAR_KEEP_ORDER.filter((t) => carsOf(mix, t) > 0).map((t) =>
    carsOf(mix, t) === 1 ? `1 ${CAR[t].name}` : `${carsOf(mix, t)} ${CAR[t].plural}`,
  );
  return parts.join(' · ') || empty;
}

/** Roster form: "2C 1H". */
export const mixShort = (mix: CarMix, empty = ''): string =>
  CAR_KEEP_ORDER.filter((t) => carsOf(mix, t) > 0)
    .map((t) => `${carsOf(mix, t)}${CAR_LETTER[t]}`)
    .join(' ') || empty;

/** Short note on what a car type carries: "coal, 25 units". */
export const carInfo = (t: CarType): string =>
  `${t === 'legacy-freight' ? 'any freight' : CAR[t].carries.join(', ')} · ${CAR[t].capacity} each`;

/** Car types that can carry `cargo` and can still be bought. */
export const carsFor = (cargo: Cargo): CarType[] =>
  CAR_TYPES.filter((t) => CAR[t].buyable && carriesCargo(t, cargo));

/**
 * A stepper row for one car type. `act` is the prefix of the data-act ("c" gives "c-:coach" and "c+:coach",
 * plus `suffix`). `label` is the visible text; `aria` names the row for screen readers.
 */
export function carStepper(opts: {
  type: CarType;
  n: number;
  canDown: boolean;
  canUp: boolean;
  act: string;
  suffix?: string;
  detail: string;
  aria?: string;
}): string {
  const { type, n, canDown, canUp, act, detail } = opts;
  const sfx = opts.suffix ?? '';
  const name = CAR[type].plural;
  const aria = `${name}${opts.aria ? ` ${opts.aria}` : ''}`;
  return (
    `<div class="stepper car-row" data-car="${type}"><span class="car-name"><b>${CAR[type].name}</b>` +
    `<span class="sub">${detail}</span></span><span class="ctl">` +
    `<button type="button" data-act="${act}-:${type}${sfx}" aria-label="Fewer ${aria}"${canDown ? '' : ' disabled'}>−</button>` +
    `<output aria-label="${name}">${n}</output>` +
    `<button type="button" data-act="${act}+:${type}${sfx}" aria-label="More ${aria}"${canUp ? '' : ' disabled'}>+</button></span></div>`
  );
}

/** Trim a mix to `max` cars, dropping from the end of the keep order first. */
export function trimMix(mix: CarMix, max: number): CarMix {
  const out: CarMix = { ...mix };
  for (const t of [...CAR_KEEP_ORDER].reverse()) {
    while (totalCars(out) > max && carsOf(out, t) > 0) out[t] = carsOf(out, t) - 1;
  }
  return out;
}
