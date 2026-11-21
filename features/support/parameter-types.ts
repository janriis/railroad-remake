import { defineParameterType } from '@cucumber/cucumber';
import {
  BUILDING_KINDS,
  CARGO_TYPES,
  INDUSTRY_KINDS,
  type BuildingKind,
  type Cargo,
  type IndustryKind,
  type LocoModel,
} from '../../src/sim/config';
import { TERRAINS, type Coord, type Terrain } from '../../src/sim/types';

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

/** Pioneer | Ironside | Courier | Hauler | Pathfinder */
defineParameterType({
  name: 'model',
  regexp: /Pioneer|Ironside|Courier|Hauler|Pathfinder/,
  transformer: (s: string): LocoModel => s.toLowerCase() as LocoModel,
});
