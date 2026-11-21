import { defineParameterType } from '@cucumber/cucumber';
import {
  BUILDING_KINDS,
  LOCO,
  LOCO_MODELS,
  CARGO_TYPES,
  INDUSTRY_KINDS,
  type BuildingKind,
  type CarType,
  type Cargo,
  type IndustryKind,
  type LocoModel,
} from '../../src/sim/config';
import { TERRAINS, type Coord, type Terrain } from '../../src/sim/types';
import type { CarMix } from '../../src/sim/cars';
import { CAR_NAME_PATTERN, carType, parseCarList } from './cars';

/** (3, 4) */
defineParameterType({
  name: 'coord',
  regexp: /\((\d+),\s*(\d+)\)/,
  transformer: (x: string, y: string): Coord => ({ x: Number(x), y: Number(y) }),
});

/** $1,250,000 */
defineParameterType({
  name: 'money',
  regexp: /\$(\d{1,3}(?:,\d{3})*|\d+)/,
  transformer: (s: string): number => Number(s.replaceAll(',', '')),
});

/** plains | forest | hills | mountain | water */
defineParameterType({
  name: 'terrain',
  regexp: new RegExp(TERRAINS.join('|')),
  transformer: (s: string): Terrain => s as Terrain,
});

/** 4,000 or 500 — a plain count that may use thousands separators. */
defineParameterType({
  name: 'count',
  regexp: /\d{1,3}(?:,\d{3})+|\d+/,
  transformer: (s: string): number => Number(s.replaceAll(',', '')),
});

/** timber camp | sawmill | furniture works | grain farm | flour mill | bakery */
defineParameterType({
  name: 'industry',
  regexp: new RegExp(INDUSTRY_KINDS.map((k) => k.replace('-', ' ')).join('|')),
  transformer: (s: string): IndustryKind => s.replace(' ', '-') as IndustryKind,
});

/** passengers | mail | mailbags | timber | … */
defineParameterType({
  name: 'cargo',
  regexp: new RegExp(['mailbags', ...CARGO_TYPES].join('|')),
  transformer: (s: string): Cargo => (s === 'mailbags' ? 'mail' : (s as Cargo)),
});

/** coal mine | timber camp | grain farm */
defineParameterType({
  name: 'deposit',
  regexp: /coal mine|timber camp|grain farm/,
  transformer: (s: string): IndustryKind => s.replace(' ', '-') as IndustryKind,
});

/** sawmill | furniture works | flour mill | bakery | coal yard */
defineParameterType({
  name: 'building',
  regexp: new RegExp(BUILDING_KINDS.map((k) => k.replace('-', ' ')).join('|')),
  transformer: (s: string): BuildingKind => s.replace(' ', '-') as BuildingKind,
});

/** American | Mogul | Ten-Wheeler | … | Road switcher (the short names in LOCO) */
defineParameterType({
  name: 'model',
  regexp: new RegExp(LOCO_MODELS.map((m) => LOCO[m].short).join('|')),
  transformer: (s: string): LocoModel => LOCO_MODELS.find((m) => LOCO[m].short === s)!,
});

/** coach(es) | baggage car(s) | boxcar(s) | (coal) hopper(s) | covered hopper(s) | flatcar(s) | legacy freight car(s) */
defineParameterType({
  name: 'car',
  regexp: new RegExp(CAR_NAME_PATTERN),
  transformer: (s: string): CarType => carType(s),
});

/** "2 coaches and 1 boxcar", "3 coaches, 1 baggage car and 0 boxcars" */
defineParameterType({
  name: 'carlist',
  regexp: new RegExp(`\\d+ (?:${CAR_NAME_PATTERN})(?:(?:, | and )\\d+ (?:${CAR_NAME_PATTERN}))*`),
  transformer: (s: string): CarMix => parseCarList(s),
});

/** $9.75 — dollars and whole cents, as integer cents. */
defineParameterType({
  name: 'price',
  regexp: /\$\d{1,3}(?:,\d{3})*\.\d{2}|\$\d+\.\d{2}/,
  transformer: (s: string): number => Math.round(Number(s.replace(/[$,]/g, '')) * 100),
});
