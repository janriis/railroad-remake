export function Filigree({ size = 28, rotate = 0, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28"
         style={{ transform: `rotate(${rotate}deg)`, ...style }}>
      <defs>
        <linearGradient id="fg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0d896"/>
          <stop offset="50%" stopColor="#c49a44"/>
          <stop offset="100%" stopColor="#6a4a28"/>
        </linearGradient>
      </defs>
      <g fill="url(#fg1)" stroke="#2a1510" strokeWidth="0.4">
        <path d="M2 2 L10 2 L10 4 L4 4 L4 10 L2 10 Z"/>
        <circle cx="4" cy="4" r="1.2"/>
        <path d="M6 6 Q10 6 12 10 Q13 13 16 13 Q14 11 13 8 Q12 5 8 5"/>
        <circle cx="12" cy="10" r="0.9"/>
        <path d="M5 12 Q8 14 8 18 Q10 16 12 17 Q11 14 9 12" opacity="0.8"/>
      </g>
    </svg>
  );
}
