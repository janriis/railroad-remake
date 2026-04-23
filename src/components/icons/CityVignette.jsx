// Building silhouette configurations per settlement size
function MetroSkyline() {
  return (
    <>
      {/* Background building — tallest, center-right */}
      <rect x="34" y="8" width="12" height="42" rx="1" fill="#8b6a30" stroke="#1a0c08" strokeWidth="0.8" />
      {/* Windows on tall building */}
      {[12, 18, 24, 30, 36, 42].map((y) => (
        <g key={y}>
          <rect x="37" y={y} width="2.5" height="3" rx="0.3" fill="#f0d896" fillOpacity="0.7" />
          <rect x="41" y={y} width="2.5" height="3" rx="0.3" fill="#f0d896" fillOpacity="0.5" />
        </g>
      ))}

      {/* Left building — medium */}
      <rect x="8" y="18" width="10" height="32" rx="1" fill="#6a4e1c" stroke="#1a0c08" strokeWidth="0.8" />
      {[22, 28, 34, 40].map((y) => (
        <rect key={y} x="10" y={y} width="6" height="3" rx="0.3" fill="#f0d896" fillOpacity="0.5" />
      ))}

      {/* Second building left-center */}
      <rect x="20" y="24" width="12" height="26" rx="1" fill="#7a5a22" stroke="#1a0c08" strokeWidth="0.8" />
      {[28, 34, 40].map((y) => (
        <g key={y}>
          <rect x="22" y={y} width="3" height="3.5" rx="0.3" fill="#f0d896" fillOpacity="0.6" />
          <rect x="27" y={y} width="3" height="3.5" rx="0.3" fill="#f0d896" fillOpacity="0.4" />
        </g>
      ))}

      {/* Right building — stepped */}
      <rect x="48" y="22" width="9" height="28" rx="1" fill="#6a4e1c" stroke="#1a0c08" strokeWidth="0.8" />
      {[26, 32, 38, 44].map((y) => (
        <rect key={y} x="50" y={y} width="5" height="3" rx="0.3" fill="#f0d896" fillOpacity="0.45" />
      ))}

      {/* Water tower / spire on tall building */}
      <rect x="39" y="4" width="4" height="6" rx="0.5" fill="#c49a44" stroke="#1a0c08" strokeWidth="0.7" />
      <polygon points="37,4 41,0 45,4" fill="#c49a44" stroke="#1a0c08" strokeWidth="0.7" />

      {/* Ground line */}
      <rect x="4" y="49" width="52" height="2" rx="0.5" fill="#3a2a10" />
    </>
  );
}

function CitySkyline() {
  return (
    <>
      {/* Main building — center */}
      <rect x="22" y="14" width="16" height="36" rx="1" fill="#8b6a30" stroke="#1a0c08" strokeWidth="0.8" />
      {[18, 24, 30, 36, 42].map((y) => (
        <g key={y}>
          <rect x="25" y={y} width="4" height="3.5" rx="0.3" fill="#f0d896" fillOpacity="0.65" />
          <rect x="31" y={y} width="4" height="3.5" rx="0.3" fill="#f0d896" fillOpacity="0.45" />
        </g>
      ))}

      {/* Left building */}
      <rect x="8" y="24" width="12" height="26" rx="1" fill="#6a4e1c" stroke="#1a0c08" strokeWidth="0.8" />
      {[28, 34, 40].map((y) => (
        <rect key={y} x="10" y={y} width="8" height="3.5" rx="0.3" fill="#f0d896" fillOpacity="0.5" />
      ))}

      {/* Right building — shorter */}
      <rect x="40" y="28" width="11" height="22" rx="1" fill="#7a5a22" stroke="#1a0c08" strokeWidth="0.8" />
      {[32, 38, 44].map((y) => (
        <rect key={y} x="42" y={y} width="7" height="3" rx="0.3" fill="#f0d896" fillOpacity="0.4" />
      ))}

      {/* Rooftop spire on main building */}
      <polygon points="26,14 30,7 34,14" fill="#c49a44" stroke="#1a0c08" strokeWidth="0.7" />

      {/* Ground line */}
      <rect x="4" y="49" width="52" height="2" rx="0.5" fill="#3a2a10" />
    </>
  );
}

function TownSkyline() {
  return (
    <>
      {/* Simple church / depot — center */}
      {/* Main building */}
      <rect x="18" y="26" width="24" height="24" rx="1" fill="#8b6a30" stroke="#1a0c08" strokeWidth="0.9" />
      {/* Roof (pitched) */}
      <polygon points="14,26 30,14 46,26" fill="#6a4e1c" stroke="#1a0c08" strokeWidth="0.8" />
      {/* Bell tower / steeple */}
      <rect x="27" y="8" width="6" height="16" rx="0.5" fill="#7a5a22" stroke="#1a0c08" strokeWidth="0.8" />
      <polygon points="25,8 30,2 35,8" fill="#c49a44" stroke="#1a0c08" strokeWidth="0.7" />
      {/* Cross atop steeple */}
      <line x1="30" y1="1" x2="30" y2="4" stroke="#f0d896" strokeWidth="1" />
      <line x1="28.5" y1="2.5" x2="31.5" y2="2.5" stroke="#f0d896" strokeWidth="1" />

      {/* Door */}
      <rect x="27" y="38" width="6" height="12" rx="2" fill="#0a0604" stroke="#1a0c08" strokeWidth="0.7" />
      {/* Windows */}
      <rect x="21" y="30" width="5" height="7" rx="2" fill="#0a0604" stroke="#f0d896" strokeWidth="0.6" />
      <rect x="34" y="30" width="5" height="7" rx="2" fill="#0a0604" stroke="#f0d896" strokeWidth="0.6" />

      {/* Small house to the right */}
      <rect x="44" y="36" width="10" height="14" rx="0.5" fill="#6a4e1c" stroke="#1a0c08" strokeWidth="0.7" />
      <polygon points="42,36 49,29 56,36" fill="#5a3e14" stroke="#1a0c08" strokeWidth="0.7" />
      <rect x="46" y="39" width="4" height="5" rx="0.3" fill="#0a0604" stroke="#f0d896" strokeWidth="0.5" />

      {/* Ground line */}
      <rect x="4" y="49" width="52" height="2" rx="0.5" fill="#3a2a10" />
    </>
  );
}

const SIZE_COMPONENTS = {
  metro: MetroSkyline,
  city:  CitySkyline,
  town:  TownSkyline,
};

export function CityVignette({ size = 'city', style }) {
  const Skyline = SIZE_COMPONENTS[size] ?? SIZE_COMPONENTS.city;

  return (
    <svg
      width={60}
      height={60}
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      {/* Subtle ground gradient */}
      <defs>
        <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2a10" stopOpacity="0" />
          <stop offset="100%" stopColor="#3a2a10" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <rect x="0" y="40" width="60" height="20" fill="url(#groundGrad)" />

      <Skyline />
    </svg>
  );
}
