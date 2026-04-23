import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { Panel } from '../chrome/Panel.jsx';
import { CITIES, cityById } from '../../data/cities.js';
import { curvyPath, buildTrackGeo } from '../../utils/geometry.js';
import { Label, DividerDots } from '../hud/helpers.jsx';

const PREVIEW_FROM = 'den';
const PREVIEW_TO   = 'kc';

export function TrackLayingScreen({ onBack }) {
  const tracks = useGameStore(s => s.tracks);
  const cash   = useGameStore(s => s.cash);
  const trackCost = useGameStore(s => s.trackCost);

  const trackGeo = useMemo(() => buildTrackGeo(tracks, CITIES), [tracks]);

  const playerCount  = tracks.filter(t => t.owner === 'player').length;
  const rivalCount   = tracks.filter(t => t.owner === 'rival').length;
  const neutralCount = tracks.filter(t => t.owner === 'neutral').length;

  const exampleCost = trackCost(PREVIEW_FROM, PREVIEW_TO);
  const exampleFrom = cityById(PREVIEW_FROM);
  const exampleTo   = cityById(PREVIEW_TO);
  const exampleArc  = exampleFrom && exampleTo
    ? curvyPath(exampleFrom.x, exampleFrom.y, exampleTo.x, exampleTo.y, 0.15, 99)
    : null;

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, background: '#0a0604' }}>
      {/* Left: instructions + stats */}
      <div className="wood-dark" style={{ width: 320, borderRight: '1px solid #1a0c08', padding: 14, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}>
        <div className="display uppercase gold" style={{ fontSize: 13, letterSpacing: '0.2em', textAlign: 'center', padding: '8px 0', borderBottom: '1px solid rgba(196,154,68,0.3)' }}>
          ⚒ Track Laying Operations ⚒
        </div>

        <Panel title="How to Lay Track" style={{ flexShrink: 0 }}>
          <div className="body-serif" style={{ fontSize: 13, color: '#d9c698', lineHeight: 1.7 }}>
            <p style={{ margin: '0 0 8px' }}>1. Return to the <strong style={{ color: '#f0d896' }}>Map Room</strong>.</p>
            <p style={{ margin: '0 0 8px' }}>2. Click any city node to open its detail panel.</p>
            <p style={{ margin: '0 0 8px' }}>3. Click <em>"⚒ Lay Track From Here"</em> — the city glows gold.</p>
            <p style={{ margin: '0 0 8px' }}>4. Hover another city to see the cost preview arc.</p>
            <p style={{ margin: '0' }}>5. Click <em>"⚒ Break Ground"</em> to build if funds allow.</p>
          </div>
        </Panel>

        <Panel title="Network Status" style={{ flexShrink: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
            <div>
              <Label>Your Lines</Label>
              <div className="numeric gold" style={{ fontSize: 20 }}>{playerCount}</div>
            </div>
            <div>
              <Label>Rival Lines</Label>
              <div className="numeric" style={{ fontSize: 20, color: '#c85040' }}>{rivalCount}</div>
            </div>
            <div>
              <Label>Neutral</Label>
              <div className="numeric" style={{ fontSize: 20, color: '#8b8070' }}>{neutralCount}</div>
            </div>
          </div>
          <DividerDots />
          <div>
            <Label>Treasury</Label>
            <div className="numeric gold" style={{ fontSize: 16, marginTop: 4 }}>${cash.toLocaleString()}</div>
          </div>
        </Panel>

        {exampleCost > 0 && (
          <Panel title="Example Route Cost" style={{ flexShrink: 0 }}>
            <div className="body-serif" style={{ fontSize: 12, color: '#a88238', fontStyle: 'italic', marginBottom: 8 }}>
              {exampleFrom.name} → {exampleTo.name}
            </div>
            <div className="numeric" style={{ fontSize: 20, color: cash >= exampleCost ? '#6bbf5a' : '#c85040' }}>
              ${exampleCost.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: '#8b6a30', marginTop: 4, fontFamily: 'IM Fell English SC, serif' }}>
              {cash >= exampleCost ? 'Funds available' : 'Insufficient funds'}
            </div>
          </Panel>
        )}

        <div style={{ marginTop: 'auto' }}>
          <button className="btn-brass" onClick={onBack} style={{ width: '100%' }}>← Return to Map</button>
        </div>
      </div>

      {/* Right: mini map */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div className="map-paper" style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 80px rgba(80,40,20,0.5)' }}>
          <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet"
               style={{ width: '100%', height: '100%', display: 'block' }}>

            {/* Grid */}
            <defs>
              <pattern id="tls-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#8a6a3a" strokeWidth="0.25" opacity="0.2"/>
              </pattern>
            </defs>
            <rect width="1600" height="900" fill="url(#tls-grid)"/>

            {/* Existing tracks */}
            {trackGeo.map((t, i) => {
              const colors = { player: '#8b6a30', rival: '#6a2a1a', neutral: '#5a5a4a' };
              return (
                <g key={i}>
                  <path d={t.d} fill="none" stroke={colors[t.owner] || colors.neutral} strokeWidth={t.owner === 'player' ? 4 : 3} strokeLinecap="round"/>
                  <path d={t.d} fill="none" stroke={t.owner === 'player' ? '#c49a44' : '#7a7060'} strokeWidth={t.owner === 'player' ? 1.5 : 1} strokeDasharray={t.owner === 'neutral' ? '4 4' : 'none'} strokeLinecap="round" opacity={0.6}/>
                </g>
              );
            })}

            {/* Example preview arc (den → kc) */}
            {exampleArc && (
              <path d={exampleArc.d} fill="none" stroke="#c49a44" strokeWidth="3"
                    strokeDasharray="8 4" opacity="0.85"/>
            )}

            {/* Cities */}
            {CITIES.map(city => {
              const r = city.size === 'metro' ? 7 : city.size === 'city' ? 5 : 4;
              const isExample = city.id === PREVIEW_FROM || city.id === PREVIEW_TO;
              return (
                <g key={city.id}>
                  {isExample && (
                    <circle cx={city.x} cy={city.y} r={r + 6} fill="none" stroke="#c49a44" strokeWidth="1.5" opacity="0.6"/>
                  )}
                  <circle cx={city.x} cy={city.y} r={r}
                          fill={city.size === 'metro' ? '#c49a44' : '#a88238'}
                          stroke="#1a0c08" strokeWidth="1.2"/>
                  <circle cx={city.x} cy={city.y} r={r * 0.45} fill="rgba(255,240,180,0.6)"/>
                  {isExample && (
                    <text x={city.x} y={city.y - r - 5}
                          textAnchor="middle" fontSize="11"
                          fontFamily="IM Fell English SC, serif"
                          fill="#f0d896" stroke="#1a0c08" strokeWidth="3" paintOrder="stroke">
                      {city.name}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Legend */}
            <g transform="translate(20, 820)">
              <rect width="260" height="66" rx="2" fill="rgba(26,12,8,0.8)" stroke="#c49a44" strokeWidth="0.8"/>
              <text x="12" y="18" fontSize="9" fontFamily="IM Fell English SC, serif" fill="#f0d896" letterSpacing="0.15em">LEGEND</text>
              <line x1="12" y1="28" x2="40" y2="28" stroke="#c49a44" strokeWidth="3"/>
              <text x="46" y="31" fontSize="10" fontFamily="IM Fell English SC, serif" fill="#c49a44">Your Railroad</text>
              <line x1="12" y1="44" x2="40" y2="44" stroke="#6a2a1a" strokeWidth="3"/>
              <text x="46" y="47" fontSize="10" fontFamily="IM Fell English SC, serif" fill="#a86040">Rival Railroad</text>
              <line x1="12" y1="58" x2="40" y2="58" stroke="#5a5a4a" strokeWidth="2" strokeDasharray="4 3"/>
              <text x="46" y="61" fontSize="10" fontFamily="IM Fell English SC, serif" fill="#8b8070">Neutral / Unowned</text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
