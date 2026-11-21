import { defineParameterType } from '@cucumber/cucumber';
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
