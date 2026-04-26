export const GOODS = [
  { id: 'passenger', label: 'Passenger', emoji: '🚂', baseRate: 1200, weight: 8,  bg: '#3d5c2a', text: '#d0f0a0' },
  { id: 'mail',      label: 'Mail',      emoji: '✉',  baseRate: 900,  weight: 4,  bg: '#2a3a6a', text: '#a0c0f0' },
  { id: 'freight',   label: 'Freight',   emoji: '📦', baseRate: 800,  weight: 14, bg: '#4a3010', text: '#d9c698' },
  { id: 'coal',      label: 'Coal',      emoji: '⛏',  baseRate: 700,  weight: 16, bg: '#3a3028', text: '#c0b8a8' },
  { id: 'cattle',    label: 'Cattle',    emoji: '🐄', baseRate: 1000, weight: 12, bg: '#6a3010', text: '#f0c080' },
];

export const DEMAND_RECOVERY_RATE = 3;  // demand points recovered per game tick
export const DEMAND_DROP_PER_CAR  = 8;  // demand points dropped per car delivered per stop
export const TONS_RATE            = 12; // $ maintenance per ton of cars per tick
