export function BigLocomotiveEngraving({ color = '#c49a44' }) {
  // 240x140 viewBox — detailed Victorian engraving-style side-view locomotive
  const W = 240;
  const H = 140;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Crosshatch pattern for engraving effect on shadow areas */}
        <pattern id="hatch1" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="4" stroke="#1a0c08" strokeWidth="0.4" strokeOpacity="0.35" />
        </pattern>
        <pattern id="hatch2" patternUnits="userSpaceOnUse" width="3" height="3" patternTransform="rotate(-45)">
          <line x1="0" y1="0" x2="0" y2="3" stroke="#1a0c08" strokeWidth="0.35" strokeOpacity="0.25" />
        </pattern>
        {/* Gold gradient for body highlights */}
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0d896" stopOpacity="0.22" />
          <stop offset="50%" stopColor={color} stopOpacity="0" />
          <stop offset="100%" stopColor="#1a0c08" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="boilerGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0d896" stopOpacity="0.18" />
          <stop offset="40%" stopColor={color} stopOpacity="0" />
          <stop offset="100%" stopColor="#1a0c08" stopOpacity="0.25" />
        </linearGradient>
        {/* Decorative border gradient */}
        <linearGradient id="borderGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0d896" />
          <stop offset="50%" stopColor="#c49a44" />
          <stop offset="100%" stopColor="#8b6a30" />
        </linearGradient>
      </defs>

      {/* ===== DECORATIVE BORDER FRAME ===== */}
      {/* Outer frame */}
      <rect x="1" y="1" width={W-2} height={H-2} rx="4"
        fill="none" stroke="url(#borderGrad)" strokeWidth="2" />
      {/* Inner frame */}
      <rect x="5" y="5" width={W-10} height={H-10} rx="2"
        fill="none" stroke="#8b6a30" strokeWidth="0.8" />
      {/* Corner ornaments */}
      {[[8,8],[W-8,8],[8,H-8],[W-8,H-8]].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="3" fill="#c49a44" stroke="#8b6a30" strokeWidth="0.7" />
          <circle cx={cx} cy={cy} r="1.2" fill="#f0d896" />
        </g>
      ))}

      {/* ===== STEAM EFFECTS ===== */}
      {/* Wisps of steam from stack */}
      <ellipse cx="42" cy="16" rx="5" ry="8" fill="rgba(255,255,255,0.07)" />
      <ellipse cx="38" cy="12" rx="4" ry="6" fill="rgba(255,255,255,0.05)" />
      <ellipse cx="46" cy="10" rx="3" ry="5" fill="rgba(255,255,255,0.04)" />

      {/* ===== PILOT / COW-CATCHER ===== */}
      <polygon
        points="16,98 30,98 34,88 20,88"
        fill={color}
        stroke="#1a0c08"
        strokeWidth="1.2"
      />
      {/* Pilot cross-braces */}
      <line x1="18" y1="98" x2="22" y2="88" stroke="#1a0c08" strokeWidth="0.7" />
      <line x1="22" y1="98" x2="26" y2="88" stroke="#1a0c08" strokeWidth="0.7" />
      <line x1="26" y1="98" x2="30" y2="88" stroke="#1a0c08" strokeWidth="0.7" />
      {/* Shadow hatch on pilot */}
      <polygon points="16,98 30,98 34,88 20,88" fill="url(#hatch1)" />

      {/* Headlamp housing */}
      <rect x="20" y="68" width="14" height="10" rx="2"
        fill="#2a1510" stroke="#1a0c08" strokeWidth="1" />
      {/* Headlamp lens */}
      <circle cx="27" cy="73" r="5" fill="#f0d896" stroke="#1a0c08" strokeWidth="0.9" />
      <circle cx="27" cy="73" r="3.5" fill="rgba(255,255,210,0.9)" />
      <circle cx="27" cy="73" r="1.8" fill="rgba(255,255,255,0.7)" />
      {/* Headlamp bracket */}
      <rect x="24" y="78" width="6" height="3" rx="0.5" fill="#2a1510" stroke="#1a0c08" strokeWidth="0.7" />

      {/* ===== SMOKESTACK ===== */}
      {/* Stack base */}
      <rect x="36" y="52" width="16" height="28" rx="2"
        fill="#2a1510" stroke="#1a0c08" strokeWidth="1.2" />
      {/* Stack flare (Victorian balloon top) */}
      <ellipse cx="44" cy="52" rx="12" ry="5"
        fill="#2a1510" stroke="#1a0c08" strokeWidth="1.2" />
      {/* Stack inner shadow */}
      <rect x="37" y="52" width="14" height="28" fill="url(#hatch2)" />
      {/* Gold bands on stack */}
      <rect x="35" y="64" width="18" height="2.5" rx="1" fill="#f0d896" />
      <rect x="35" y="72" width="18" height="1.5" rx="0.7" fill="#c49a44" />
      {/* Stack top lip engraved line */}
      <ellipse cx="44" cy="52" rx="11" ry="3.5" fill="none" stroke="#f0d896" strokeWidth="0.6" strokeOpacity="0.5" />

      {/* ===== MAIN BOILER ===== */}
      {/* Boiler cylinder */}
      <rect x="36" y="62" width="136" height="28" rx="6"
        fill={color} stroke="#1a0c08" strokeWidth="1.4" />
      {/* Boiler gradient overlay */}
      <rect x="36" y="62" width="136" height="28" rx="6" fill="url(#boilerGrad)" />
      {/* Boiler engraving lines (horizontal) */}
      <line x1="37" y1="70" x2="171" y2="70" stroke="#1a0c08" strokeWidth="0.4" strokeOpacity="0.4" />
      <line x1="37" y1="78" x2="171" y2="78" stroke="#1a0c08" strokeWidth="0.4" strokeOpacity="0.4" />
      <line x1="37" y1="84" x2="171" y2="84" stroke="#1a0c08" strokeWidth="0.4" strokeOpacity="0.3" />
      {/* Boiler front ring */}
      <line x1="54" y1="62" x2="54" y2="90" stroke="#1a0c08" strokeWidth="1" strokeOpacity="0.5" />
      {/* Gold boiler band rings */}
      <rect x="54" y="62" width="3" height="28" rx="1" fill="#c49a44" fillOpacity="0.5" stroke="#8b6a30" strokeWidth="0.5" />
      <rect x="90" y="62" width="2.5" height="28" rx="1" fill="#c49a44" fillOpacity="0.4" stroke="#8b6a30" strokeWidth="0.5" />
      <rect x="130" y="62" width="2.5" height="28" rx="1" fill="#c49a44" fillOpacity="0.4" stroke="#8b6a30" strokeWidth="0.5" />

      {/* Boiler top highlight stripe */}
      <rect x="38" y="63" width="132" height="4" rx="2" fill="rgba(255,240,180,0.15)" />

      {/* ===== STEAM DOME ===== */}
      <ellipse cx="120" cy="62" rx="14" ry="8"
        fill={color} stroke="#1a0c08" strokeWidth="1.2" />
      <ellipse cx="120" cy="60" rx="12" ry="5"
        fill="rgba(255,230,160,0.15)" />
      {/* Dome base ring */}
      <rect x="107" y="60" width="26" height="3" rx="1"
        fill="#2a1510" stroke="#8b6a30" strokeWidth="0.7" />
      {/* Safety valve on dome */}
      <rect x="118" y="53" width="4" height="8" rx="1"
        fill="#2a1510" stroke="#1a0c08" strokeWidth="0.8" />
      <rect x="116" y="51" width="8" height="3" rx="1.5"
        fill="#c49a44" stroke="#8b6a30" strokeWidth="0.7" />

      {/* Sand dome (forward of steam dome) */}
      <ellipse cx="88" cy="62" rx="9" ry="6"
        fill={color} stroke="#1a0c08" strokeWidth="1" />
      <rect x="80" y="60" width="16" height="2.5" rx="1"
        fill="#2a1510" stroke="#8b6a30" strokeWidth="0.6" />

      {/* ===== RUNNING BOARD / WALKWAY ===== */}
      <rect x="36" y="88" width="156" height="4" rx="0.5"
        fill="#2a1510" stroke="#1a0c08" strokeWidth="0.9" />
      {/* Running board engraving lines */}
      {[40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180].map((x) => (
        <line key={x} x1={x} y1="88" x2={x} y2="92" stroke="#1a0c08" strokeWidth="0.4" strokeOpacity="0.5" />
      ))}

      {/* ===== CAB ===== */}
      {/* Cab body */}
      <rect x="160" y="52" width="40" height="40" rx="2"
        fill={color} stroke="#1a0c08" strokeWidth="1.4" />
      {/* Cab gradient */}
      <rect x="160" y="52" width="40" height="40" rx="2" fill="url(#bodyGrad)" />
      {/* Cab crosshatch (shadow side) */}
      <rect x="177" y="52" width="23" height="40" rx="2" fill="url(#hatch1)" />

      {/* Cab roof */}
      <rect x="156" y="48" width="48" height="8" rx="2"
        fill="#2a1510" stroke="#1a0c08" strokeWidth="1.2" />
      {/* Roof overhang shadow line */}
      <rect x="157" y="54" width="46" height="1.5" fill="#1a0c08" fillOpacity="0.4" />

      {/* Cab windows (two large arched) */}
      <rect x="163" y="56" width="14" height="16" rx="4"
        fill="#0a0604" stroke="#f0d896" strokeWidth="1" />
      {/* Window highlight */}
      <rect x="164" y="57" width="5" height="6" rx="1.5" fill="rgba(255,255,200,0.08)" />

      <rect x="181" y="56" width="12" height="16" rx="3"
        fill="#0a0604" stroke="#f0d896" strokeWidth="1" />

      {/* Cab door */}
      <rect x="163" y="74" width="14" height="16" rx="1"
        fill="rgba(0,0,0,0.25)" stroke="#1a0c08" strokeWidth="0.7" />
      <circle cx="176" cy="82" r="1.5" fill="#f0d896" />

      {/* Cab number plate / builder plate */}
      <rect x="182" y="74" width="14" height="10" rx="1"
        fill="#8b6a30" stroke="#c49a44" strokeWidth="0.8" />
      {/* Decorative lines on plate */}
      <line x1="184" y1="77" x2="194" y2="77" stroke="#f0d896" strokeWidth="0.6" strokeOpacity="0.7" />
      <line x1="184" y1="80" x2="194" y2="80" stroke="#f0d896" strokeWidth="0.4" strokeOpacity="0.5" />

      {/* ===== FIREBOX / TENDER CONNECTION ===== */}
      <rect x="196" y="66" width="8" height="26" rx="1"
        fill="#2a1510" stroke="#1a0c08" strokeWidth="0.9" />

      {/* ===== CYLINDERS & VALVE GEAR ===== */}
      {/* Main cylinder (Walschaerts valve gear) */}
      <rect x="30" y="82" width="26" height="10" rx="2"
        fill="#2a1510" stroke="#1a0c08" strokeWidth="1" />
      <rect x="30" y="83" width="26" height="4" rx="1" fill="rgba(255,200,100,0.1)" />
      {/* Cylinder end cap */}
      <ellipse cx="30" cy="87" rx="4" ry="6"
        fill="#2a1510" stroke="#1a0c08" strokeWidth="1" />

      {/* Piston rod */}
      <rect x="22" y="86" width="20" height="2.5" rx="1"
        fill="#3a2a10" stroke="#1a0c08" strokeWidth="0.7" />
      {/* Crosshead */}
      <rect x="20" y="83" width="5" height="8" rx="0.5"
        fill="#2a1510" stroke="#1a0c08" strokeWidth="0.8" />

      {/* Main connecting rod (long, to drive wheel) */}
      <rect x="24" y="87" width="74" height="2.5" rx="1"
        fill="#1a0c08" />
      {/* Side rod (coupling rod between drivers) */}
      <rect x="68" y="98" width="60" height="2.5" rx="1"
        fill="#1a0c08" />
      <rect x="68" y="100" width="60" height="1" rx="0.5"
        fill="rgba(255,200,100,0.15)" />

      {/* Eccentric crank visible on first driver */}
      <circle cx="80" cy="104" r="4" fill="#2a1510" stroke="#1a0c08" strokeWidth="0.7" />
      <line x1="80" y1="100" x2="80" y2="99" stroke="#1a0c08" strokeWidth="1" />

      {/* ===== DRIVE WHEELS (3 large) ===== */}
      {[80, 112, 144].map((cx) => (
        <g key={cx}>
          {/* Outer tire ring */}
          <circle cx={cx} cy="108" r="18" fill="#2a1510" stroke="#1a0c08" strokeWidth="1.4" />
          {/* Wheel face */}
          <circle cx={cx} cy="108" r="16" fill="#1a0c08" />
          {/* Spokes (8) */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * Math.PI * 2) / 8;
            const x1 = cx + Math.cos(angle) * 4;
            const y1 = 108 + Math.sin(angle) * 4;
            const x2 = cx + Math.cos(angle) * 14;
            const y2 = 108 + Math.sin(angle) * 14;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.4" />;
          })}
          {/* Hub */}
          <circle cx={cx} cy="108" r="4.5" fill={color} stroke="#1a0c08" strokeWidth="0.9" />
          <circle cx={cx} cy="108" r="2.2" fill="#f0d896" />
          <circle cx={cx} cy="108" r="1" fill="#1a0c08" />
          {/* Counterbalance weight on rim */}
          <path
            d={`M ${cx + Math.cos(Math.PI * 0.3) * 12} ${108 + Math.sin(Math.PI * 0.3) * 12}
                A 12 12 0 0 1 ${cx + Math.cos(Math.PI * 0.7) * 12} ${108 + Math.sin(Math.PI * 0.7) * 12}`}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeOpacity="0.6"
          />
        </g>
      ))}

      {/* ===== TRAILING WHEELS (2 smaller under cab) ===== */}
      {[170, 196].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="108" r="12" fill="#2a1510" stroke="#1a0c08" strokeWidth="1.2" />
          <circle cx={cx} cy="108" r="10" fill="#1a0c08" />
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = (i * Math.PI * 2) / 6;
            const x1 = cx + Math.cos(angle) * 3;
            const y1 = 108 + Math.sin(angle) * 3;
            const x2 = cx + Math.cos(angle) * 9;
            const y2 = 108 + Math.sin(angle) * 9;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.2" />;
          })}
          <circle cx={cx} cy="108" r="3" fill={color} stroke="#1a0c08" strokeWidth="0.8" />
          <circle cx={cx} cy="108" r="1.3" fill="#f0d896" />
        </g>
      ))}

      {/* ===== PILOT WHEELS (2 small at front) ===== */}
      {[24, 44].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="108" r="10" fill="#2a1510" stroke="#1a0c08" strokeWidth="1.1" />
          <circle cx={cx} cy="108" r="8" fill="#1a0c08" />
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = (i * Math.PI * 2) / 6;
            const x1 = cx + Math.cos(angle) * 2.5;
            const y1 = 108 + Math.sin(angle) * 2.5;
            const x2 = cx + Math.cos(angle) * 7;
            const y2 = 108 + Math.sin(angle) * 7;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.1" />;
          })}
          <circle cx={cx} cy="108" r="2.8" fill={color} stroke="#1a0c08" strokeWidth="0.7" />
          <circle cx={cx} cy="108" r="1.2" fill="#f0d896" />
        </g>
      ))}

      {/* ===== RAIL LINE ===== */}
      <rect x="8" y="124" width={W-16} height="3" rx="1"
        fill="#3a2a10" stroke="#1a0c08" strokeWidth="0.8" />
      {/* Rail ties */}
      {Array.from({ length: 22 }).map((_, i) => (
        <rect key={i} x={10 + i * 10} y="123" width="7" height="5" rx="0.5"
          fill="#2a1510" stroke="#1a0c08" strokeWidth="0.4" />
      ))}

      {/* ===== LETTERING AREA (banner below) ===== */}
      <rect x="60" y="126" width="120" height="10" rx="1"
        fill="#1a0c08" fillOpacity="0" />

      {/* ===== GOLD FILIGREE ACCENTS ===== */}
      {/* On boiler side, small decorative shield */}
      <rect x="64" y="66" width="20" height="14" rx="2"
        fill="none" stroke="#c49a44" strokeWidth="0.8" />
      <line x1="65" y1="71" x2="83" y2="71" stroke="#c49a44" strokeWidth="0.5" strokeOpacity="0.5" />
      <line x1="74" y1="67" x2="74" y2="79" stroke="#c49a44" strokeWidth="0.5" strokeOpacity="0.5" />

      {/* Stars at each boiler band */}
      {[57, 93, 133].map((x) => (
        <text key={x} x={x} y="79" fontSize="5" fill="#c49a44" fillOpacity="0.6" textAnchor="middle">✦</text>
      ))}
    </svg>
  );
}
