export const CITIES = [
  { id: 'sf',  name: 'San Francisco', x: 110,  y: 480, size: 'metro', pop: '149,473', state: 'CAL' },
  { id: 'sac', name: 'Sacramento',    x: 175,  y: 440, size: 'city',  pop: '21,420',  state: 'CAL' },
  { id: 'lax', name: 'Los Angeles',   x: 200,  y: 620, size: 'city',  pop: '11,183',  state: 'CAL' },
  { id: 'slc', name: 'Salt Lake City',x: 420,  y: 430, size: 'city',  pop: '20,768',  state: 'UTH' },
  { id: 'den', name: 'Denver',        x: 590,  y: 460, size: 'city',  pop: '35,629',  state: 'COL' },
  { id: 'chy', name: 'Cheyenne',      x: 620,  y: 400, size: 'town',  pop: '3,456',   state: 'WYO' },
  { id: 'abq', name: 'Albuquerque',   x: 620,  y: 580, size: 'town',  pop: '2,315',   state: 'NM'  },
  { id: 'epa', name: 'El Paso',       x: 650,  y: 680, size: 'town',  pop: '736',     state: 'TEX' },
  { id: 'kc',  name: 'Kansas City',   x: 850,  y: 500, size: 'city',  pop: '55,785',  state: 'MO'  },
  { id: 'omh', name: 'Omaha',         x: 850,  y: 430, size: 'city',  pop: '30,518',  state: 'NEB' },
  { id: 'stl', name: 'St. Louis',     x: 960,  y: 520, size: 'metro', pop: '310,864', state: 'MO'  },
  { id: 'dal', name: 'Dallas',        x: 890,  y: 640, size: 'town',  pop: '10,358',  state: 'TEX' },
  { id: 'hou', name: 'Houston',       x: 930,  y: 720, size: 'town',  pop: '16,513',  state: 'TEX' },
  { id: 'nol', name: 'New Orleans',   x: 1060, y: 720, size: 'metro', pop: '216,090', state: 'LA'  },
  { id: 'chi', name: 'Chicago',       x: 1040, y: 400, size: 'metro', pop: '503,185', state: 'ILL' },
  { id: 'det', name: 'Detroit',       x: 1150, y: 360, size: 'city',  pop: '116,340', state: 'MICH'},
  { id: 'cle', name: 'Cleveland',     x: 1210, y: 390, size: 'city',  pop: '92,829',  state: 'OHIO'},
  { id: 'pit', name: 'Pittsburgh',    x: 1260, y: 420, size: 'city',  pop: '86,076',  state: 'PENN'},
  { id: 'atl', name: 'Atlanta',       x: 1180, y: 620, size: 'city',  pop: '37,409',  state: 'GA'  },
  { id: 'cha', name: 'Charleston',    x: 1280, y: 650, size: 'town',  pop: '48,956',  state: 'SC'  },
  { id: 'dc',  name: 'Washington',    x: 1350, y: 470, size: 'city',  pop: '109,199', state: 'DC'  },
  { id: 'bal', name: 'Baltimore',     x: 1380, y: 450, size: 'city',  pop: '267,354', state: 'MD'  },
  { id: 'phi', name: 'Philadelphia',  x: 1410, y: 430, size: 'metro', pop: '674,022', state: 'PENN'},
  { id: 'nyc', name: 'New York',      x: 1450, y: 400, size: 'metro', pop: '942,292', state: 'NY'  },
  { id: 'bos', name: 'Boston',        x: 1490, y: 340, size: 'metro', pop: '250,526', state: 'MASS'},
  { id: 'buf', name: 'Buffalo',       x: 1320, y: 340, size: 'city',  pop: '117,714', state: 'NY'  },
];

export function cityById(id) {
  return CITIES.find(c => c.id === id);
}
