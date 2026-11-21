import { CAR, CAR_TYPES, LOCO, TICKS_PER_DAY } from '../sim/config';
import { carsOf } from '../sim/cars';
import type { Train } from '../sim/trains';
import type { Station } from '../sim/game';
import type { Coord } from '../sim/types';
import type { CarMix } from '../sim/cars';
import { mixShort } from './cars';
import { TRAIN_COLOURS } from './render';
import type { Ui } from './state';

export const money = (n: number): string => '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
export const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;
export const unit = (n: number): string => n.toLocaleString('en-US');
export const signed = (n: number): string => (n < 0 ? '−' : n > 0 ? '+' : '') + money(n);

/** Maps a sim error string to the message shown to the player. */
export function humanError(err: string): string {
  const known: Record<string, string> = {
    'insufficient funds': 'Not enough cash for that.',
    'cannot build on water': 'That is water. Tap a land tile (use a bridge to cross water).',
    'out of bounds': 'That runs off the edge of the map.',
    'path too short': 'Pick two different tiles.',
    'start and end are the same tile': 'Pick two different tiles.',
    'tiles are not adjacent': 'Those tiles are not next to each other.',
    'a bridge must be a straight line over water':
      'A bridge must be a straight line (across or at 45 degrees) with water in between.',
    'bridge must start and end on land': 'Both ends of a bridge must be on land.',
    'a bridge may only span water': 'A bridge can only cross water: tap land on both sides of the gap.',
    'bridge too long': 'That gap is too wide. A bridge spans at most 3 water tiles.',
    'not a straight line': 'Demolish needs a straight line (across or at 45 degrees).',
    'no track to demolish': 'There is no track on that line.',
    'station on track': 'There is a station on that track. Tear up the track around it instead.',
    'train on track': 'A train is on that track right now.',
    'no buildable route': 'The water is too wide to bridge here, so there is no way to get there.',
    'no route over land': 'No way to get there over land.',
    'route needs a bridge': 'That route needs a bridge. Confirm the bridge to build it.',
    'tile already has a station': 'There is already a station here.',
    'turn too sharp':
      'Track can only bend by 45 degrees at a time, and branches must join at a gentle angle.',
    'track would cross': 'Diagonal tracks cannot cross between tiles. Cross at a tile instead.',
    'station must be on track': 'A station has to sit on track. Tap a tile with track.',
    'train must start at a station': 'Trains start at a station. Tap a station.',
    'too many cars': 'This locomotive cannot pull that many cars.',
    'model not on sale': 'That locomotive is no longer on sale.',
    'model no longer on sale':
      'That locomotive is no longer on sale, so it cannot be overhauled. Replace it instead.',
    'train must be at a station': 'The train has to be standing at a station.',
    'cars need a locomotive': 'Cars need a locomotive.',
    'route needs at least two stops': 'Pick at least two stations.',
    'consecutive stops must differ': 'Two stops in a row cannot be the same station.',
    'stop is not a station': 'Every stop must be a station.',
    'already double track': 'That stretch is already double track.',
    'not a station': 'Pick a station.',
    'the train is already there': 'The train is already at that station.',
    'the train is not on a trip': 'That train is not on a trip.',
    'station serves no town': "This station serves no town, so it can't hold buildings.",
    'no free building slot': 'No free building slot. Demolish a building first, or use a bigger station.',
    'no such building': 'That building is no longer there.',
    'no such train': 'That train no longer exists.',
  };
  if (err.startsWith('no track connects'))
    return 'No track connects these stations. Build track between them first.';
  const dup = /^station already has an? (.+)$/.exec(err);
  if (dup) return `This station already has a ${dup[1]}.`;
  return known[err] ?? err.charAt(0).toUpperCase() + err.slice(1) + '.';
}

// ---------- names ----------
function townOf(ui: Ui, c: Coord) {
  const { game } = ui;
  let best = game.towns[0];
  let bd = Infinity;
  for (const t of game.towns) {
    const d = Math.max(Math.abs(t.x - c.x), Math.abs(t.y - c.y));
    if (d < bd) {
      bd = d;
      best = t;
    }
  }
  return best;
}
export const stationName = (ui: Ui, s: Station): string => {
  const town = townOf(ui, s.at);
  if (!town) return `Station ${s.id}`;
  const same = [...ui.game.stations.values()]
    .filter((o) => townOf(ui, o.at) === town)
    .sort((a, b) => a.id - b.id);
  const idx = same.findIndex((o) => o.id === s.id);
  return idx > 0 ? `${town.name} ${idx + 1}` : town.name;
};
export const stationNameAt = (ui: Ui, c: Coord): string => {
  const s = ui.game.stationAt(c);
  return s ? stationName(ui, s) : 'Unknown';
};
export const trainName = (ui: Ui, t: Train): string => `Train ${ui.game.trains.indexOf(t) + 1}`;
export const trainColour = (ui: Ui, t: Train): string =>
  TRAIN_COLOURS[ui.game.trains.indexOf(t) % TRAIN_COLOURS.length]!;

// ---------- train text ----------
export const brokenDaysLeft = (ui: Ui, t: Train): number =>
  t.brokenUntil === null ? 0 : Math.max(1, Math.ceil((t.brokenUntil - ui.game.time) / TICKS_PER_DAY));

export const modelName = (t: Train): string => LOCO[t.model].name;

/** "12 years, 8 left" while in working life, "Worn out" after it. */
export function ageText(ui: Ui, t: Train): string {
  const age = ui.game.trainAge(t);
  if (ui.game.isWornOut(t)) return `${plural(age, 'year')}, worn out`;
  return `${plural(age, 'year')}, ${ui.game.workingLifeLeft(t)} left`;
}

export function statusText(ui: Ui, t: Train): string {
  if (ui.game.isBrokenDown(t)) return `Broken down, ${plural(brokenDaysLeft(ui, t), 'day')} left`;
  if (t.deadlocked) return 'Stuck head-on';
  if (t.status === 'waiting')
    return t.blockedBy === null ? 'Waiting: no way through to the next stop' : 'Waiting for the line ahead';
  if (t.trip) return `Trip to ${stationNameAt(ui, t.trip)}`;
  if (t.route.length < 2) return 'No route yet';
  if (t.status === 'at-stop') return 'At station';
  if (t.status === 'moving') return 'Running';
  return t.next ? 'Running' : 'At station';
}

/** Load per coupled car type: "coaches 62/80 passengers; coal hopper 25/25 coal". */
export function loadText(t: Train): string {
  const parts: string[] = [];
  for (const type of CAR_TYPES) {
    const n = carsOf(t.cars, type);
    if (!n) continue;
    const lots = t.cargo.filter((l) => l.car === type && l.units > 0);
    const units = lots.reduce((a, l) => a + l.units, 0);
    const what = [...new Set(lots.map((l) => l.cargo))].join(', ');
    parts.push(
      `${n === 1 ? CAR[type].name : CAR[type].plural} ${units}/${n * CAR[type].capacity}${what ? ` ${what}` : ''}`,
    );
  }
  return parts.join('; ');
}
export function cargoBreakdown(t: Train): string {
  const by = new Map<string, number>();
  for (const l of t.cargo) by.set(l.cargo, (by.get(l.cargo) ?? 0) + l.units);
  return [...by]
    .filter(([, n]) => n > 0)
    .map(([c, n]) => `${n} ${c}`)
    .join(', ');
}

export function routeList(ui: Ui, stops: Coord[]): string {
  return stops.map((c, i) => `${i + 1}. ${stationNameAt(ui, c)}`).join(' → ');
}

export const carsText = (o: CarMix): string => mixShort(o, 'no cars');
