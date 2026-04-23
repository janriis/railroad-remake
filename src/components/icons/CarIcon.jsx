const CAR_COLORS = {
  passenger: '#3d5c2a',
  freight:   '#6a4a28',
  mail:      '#8b2818',
  cattle:    '#8b7a5a',
  coal:      '#2a2a2a',
};

function PassengerCar({ color }) {
  return (
    <>
      {/* Body with rounded roof */}
      <rect x="4" y="10" width="56" height="18" rx="2" fill={color} stroke="#1a0c08" strokeWidth="1" />
      {/* Rounded roof */}
      <ellipse cx="32" cy="10" rx="28" ry="5" fill={color} stroke="#1a0c08" strokeWidth="1" />
      {/* Windows */}
      {[12, 24, 36, 48].map((x) => (
        <rect key={x} x={x} y="14" width="8" height="6" rx="1" fill="#0a0604" stroke="#f0d896" strokeWidth="0.7" />
      ))}
      {/* Highlight stripe along body */}
      <rect x="5" y="11" width="54" height="2" rx="1" fill="rgba(255,230,160,0.13)" />
      {/* Gold trim stripe */}
      <rect x="4" y="24" width="56" height="1.5" rx="0.5" fill="#c49a44" />
    </>
  );
}

function FreightCar({ color }) {
  return (
    <>
      {/* Flat box car body */}
      <rect x="4" y="8" width="56" height="22" rx="1.5" fill={color} stroke="#1a0c08" strokeWidth="1" />
      {/* Board lines (horizontal planking) */}
      {[13, 18, 23].map((y) => (
        <line key={y} x1="5" y1={y} x2="59" y2={y} stroke="#1a0c08" strokeWidth="0.5" strokeOpacity="0.6" />
      ))}
      {/* Vertical reinforcement bands */}
      <rect x="16" y="8" width="2" height="22" fill="#1a0c08" fillOpacity="0.3" />
      <rect x="30" y="8" width="2" height="22" fill="#1a0c08" fillOpacity="0.3" />
      <rect x="44" y="8" width="2" height="22" fill="#1a0c08" fillOpacity="0.3" />
    </>
  );
}

function MailCar({ color }) {
  return (
    <>
      {/* Box body */}
      <rect x="4" y="8" width="56" height="22" rx="1.5" fill={color} stroke="#1a0c08" strokeWidth="1" />
      {/* Mail envelope symbol centered */}
      <rect x="22" y="12" width="20" height="14" rx="1" fill="rgba(255,255,255,0.12)" stroke="#f0d896" strokeWidth="0.8" />
      {/* Envelope flap (V) */}
      <polyline points="22,12 32,20 42,12" fill="none" stroke="#f0d896" strokeWidth="0.9" />
      {/* Side stripe */}
      <rect x="4" y="8" width="6" height="22" rx="1.5" fill="#6a1a10" stroke="none" />
      <rect x="54" y="8" width="6" height="22" rx="1.5" fill="#6a1a10" stroke="none" />
    </>
  );
}

function CattleCar({ color }) {
  return (
    <>
      {/* Frame */}
      <rect x="4" y="8" width="56" height="22" rx="1.5" fill="none" stroke="#1a0c08" strokeWidth="1" />
      {/* Background fill */}
      <rect x="5" y="9" width="54" height="20" fill={color} fillOpacity="0.5" />
      {/* Vertical slats */}
      {[8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56].map((x) => (
        <line key={x} x1={x} y1="9" x2={x} y2="29" stroke="#1a0c08" strokeWidth="1.2" />
      ))}
      {/* Horizontal rails top and bottom */}
      <rect x="4" y="8" width="56" height="3" rx="1" fill={color} stroke="#1a0c08" strokeWidth="0.8" />
      <rect x="4" y="27" width="56" height="3" rx="1" fill={color} stroke="#1a0c08" strokeWidth="0.8" />
      {/* Middle rail */}
      <rect x="4" y="17" width="56" height="2" fill={color} stroke="#1a0c08" strokeWidth="0.5" />
    </>
  );
}

function CoalCar({ color }) {
  return (
    <>
      {/* Open hopper shape — trapezoid body */}
      <polygon
        points="4,10 60,10 56,30 8,30"
        fill={color}
        stroke="#1a0c08"
        strokeWidth="1"
      />
      {/* Coal fill (dark lumpy top) */}
      <ellipse cx="32" cy="11" rx="26" ry="5" fill="#1a1a1a" stroke="#1a0c08" strokeWidth="0.7" />
      {/* Coal texture marks */}
      {[[18,10],[26,13],[34,11],[42,13],[22,8],[38,9]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="1.5" fill="#0a0a0a" />
      ))}
      {/* Hopper frame ribs */}
      <line x1="20" y1="10" x2="17" y2="30" stroke="#3a3a3a" strokeWidth="0.9" />
      <line x1="32" y1="10" x2="32" y2="30" stroke="#3a3a3a" strokeWidth="0.9" />
      <line x1="44" y1="10" x2="47" y2="30" stroke="#3a3a3a" strokeWidth="0.9" />
    </>
  );
}

const CAR_BODIES = {
  passenger: PassengerCar,
  freight: FreightCar,
  mail: MailCar,
  cattle: CattleCar,
  coal: CoalCar,
};

export function CarIcon({ type = 'freight', size = 32 }) {
  const color = CAR_COLORS[type] ?? CAR_COLORS.freight;
  const Body = CAR_BODIES[type] ?? CAR_BODIES.freight;

  // viewBox 0 0 64 40
  const w = 64;
  const h = 40;

  return (
    <svg
      width={size}
      height={size * (h / w)}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Car body (type-specific) */}
      <Body color={color} />

      {/* Underframe / chassis */}
      <rect x="4" y="30" width="56" height="3" rx="0.5" fill="#2a1510" stroke="#1a0c08" strokeWidth="0.8" />

      {/* Couplers */}
      <rect x="0" y="31" width="5" height="2" rx="0.5" fill="#1a0c08" />
      <rect x="59" y="31" width="5" height="2" rx="0.5" fill="#1a0c08" />

      {/* Wheels (4 total, 2 per truck) */}
      <circle cx="14" cy="35" r="4" fill="#2a1510" stroke="#1a0c08" strokeWidth="0.8" />
      <circle cx="14" cy="35" r="1.8" fill={color} />
      <circle cx="22" cy="35" r="4" fill="#2a1510" stroke="#1a0c08" strokeWidth="0.8" />
      <circle cx="22" cy="35" r="1.8" fill={color} />

      <circle cx="42" cy="35" r="4" fill="#2a1510" stroke="#1a0c08" strokeWidth="0.8" />
      <circle cx="42" cy="35" r="1.8" fill={color} />
      <circle cx="50" cy="35" r="4" fill="#2a1510" stroke="#1a0c08" strokeWidth="0.8" />
      <circle cx="50" cy="35" r="1.8" fill={color} />

      {/* Axle / truck frame */}
      <rect x="12" y="32" width="12" height="1.5" rx="0.5" fill="#1a0c08" />
      <rect x="40" y="32" width="12" height="1.5" rx="0.5" fill="#1a0c08" />
    </svg>
  );
}
