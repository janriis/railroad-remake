export const INITIAL_TRAINS = [
  {
    id: 'T-01', name: 'The Golden Spike', model: '4-4-0 American',
    route: ['sf', 'sac', 'slc', 'chy', 'omh'],
    leg: 1, progress: 0.34, speed: 0.00045,
    cars: ['mail', 'passenger', 'passenger', 'passenger'], color: '#c49a44',
  },
  {
    id: 'T-02', name: 'Prairie Schooner', model: '2-6-0 Mogul',
    route: ['chi', 'stl', 'kc'],
    leg: 0, progress: 0.62, speed: 0.00038,
    cars: ['freight', 'freight', 'cattle', 'cattle'], color: '#8b2818',
  },
  {
    id: 'T-03', name: 'Atlantic Express', model: '4-6-0 Ten-Wheeler',
    route: ['bos', 'nyc', 'phi', 'pit'],
    leg: 2, progress: 0.18, speed: 0.00055,
    cars: ['mail', 'passenger', 'passenger', 'passenger', 'passenger'], color: '#3d5c2a',
  },
  {
    id: 'T-04', name: 'Iron Duke', model: '2-8-0 Consolidation',
    route: ['pit', 'cle', 'det', 'chi'],
    leg: 1, progress: 0.71, speed: 0.00032,
    cars: ['coal', 'coal', 'coal', 'freight'], color: '#1e3a5c',
  },
  {
    id: 'T-05', name: 'Pioneer', model: '4-4-0 American',
    route: ['omh', 'chi'],
    leg: 0, progress: 0.45, speed: 0.00040,
    cars: ['passenger', 'passenger', 'mail'], color: '#6b4a88',
  },
];
