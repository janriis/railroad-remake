export function LocomotiveIcon({ color = '#c49a44', size = 40 }) {
  // viewBox 0 0 80 48 — side-view Victorian steam locomotive
  const scale = size / 40;
  const w = 80;
  const h = 48;

  return (
    <svg
      width={size}
      height={size * (h / w)}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Pilot / cow-catcher at front (left) */}
      <polygon
        points="6,36 12,36 14,32 8,32"
        fill={color}
        stroke="#1a0c08"
        strokeWidth="0.8"
      />

      {/* Pilot wheels (small, front) */}
      <circle cx="10" cy="37" r="3" fill="#2a1510" stroke="#1a0c08" strokeWidth="0.7" />
      <circle cx="10" cy="37" r="1.2" fill="#c49a44" />

      {/* Main boiler body */}
      <rect
        x="13"
        y="22"
        width="46"
        height="14"
        rx="3"
        fill={color}
        stroke="#1a0c08"
        strokeWidth="1"
      />
      {/* Boiler highlight stripe */}
      <rect
        x="14"
        y="23"
        width="44"
        height="3"
        rx="1.5"
        fill="rgba(255,230,160,0.18)"
      />

      {/* Steam dome on top of boiler */}
      <ellipse cx="44" cy="22" rx="6" ry="4" fill={color} stroke="#1a0c08" strokeWidth="0.9" />
      <ellipse cx="44" cy="21" rx="5" ry="2" fill="rgba(255,230,160,0.2)" />

      {/* Smokestack / chimney at front of boiler */}
      <rect x="16" y="12" width="6" height="10" rx="1" fill="#2a1510" stroke="#1a0c08" strokeWidth="0.9" />
      {/* Smokestack flare (top) */}
      <rect x="14" y="10" width="10" height="3" rx="1.5" fill="#2a1510" stroke="#1a0c08" strokeWidth="0.8" />
      {/* Gold band on smokestack */}
      <rect x="15" y="17" width="8" height="1.5" rx="0.75" fill="#f0d896" />

      {/* Cab (rear / right) */}
      <rect
        x="55"
        y="14"
        width="16"
        height="22"
        rx="1.5"
        fill={color}
        stroke="#1a0c08"
        strokeWidth="1"
      />
      {/* Cab roof overhang */}
      <rect x="53" y="13" width="20" height="3" rx="1" fill="#2a1510" stroke="#1a0c08" strokeWidth="0.8" />
      {/* Cab window */}
      <rect x="58" y="17" width="7" height="6" rx="1" fill="#0a0604" stroke="#f0d896" strokeWidth="0.7" />
      {/* Cab door frame */}
      <rect x="60" y="24" width="5" height="7" rx="0.5" fill="rgba(0,0,0,0.3)" stroke="#1a0c08" strokeWidth="0.5" />

      {/* Running plate / footboard */}
      <rect x="12" y="35" width="56" height="2.5" rx="0.5" fill="#2a1510" stroke="#1a0c08" strokeWidth="0.7" />

      {/* Drive wheels (2 large) */}
      <circle cx="30" cy="38" r="6" fill="#2a1510" stroke="#1a0c08" strokeWidth="1" />
      <circle cx="30" cy="38" r="3.5" fill={color} />
      <circle cx="30" cy="38" r="1.5" fill="#f0d896" />

      <circle cx="46" cy="38" r="6" fill="#2a1510" stroke="#1a0c08" strokeWidth="1" />
      <circle cx="46" cy="38" r="3.5" fill={color} />
      <circle cx="46" cy="38" r="1.5" fill="#f0d896" />

      {/* Trailing wheel under cab */}
      <circle cx="62" cy="38" r="4" fill="#2a1510" stroke="#1a0c08" strokeWidth="0.9" />
      <circle cx="62" cy="38" r="1.8" fill={color} />
      <circle cx="62" cy="38" r="0.8" fill="#f0d896" />

      {/* Connecting rod between drive wheels */}
      <rect x="29" y="36.5" width="18" height="1.5" rx="0.75" fill="#1a0c08" stroke="#1a0c08" strokeWidth="0.4" />

      {/* Piston / side rod from boiler to front wheel */}
      <rect x="12" y="31" width="20" height="1.5" rx="0.75" fill="#1a0c08" />

      {/* Headlamp at very front */}
      <circle cx="13" cy="25" r="2.5" fill="#f0d896" stroke="#1a0c08" strokeWidth="0.7" />
      <circle cx="13" cy="25" r="1.2" fill="rgba(255,255,200,0.8)" />
    </svg>
  );
}
