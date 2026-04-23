import { useState, useEffect, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { CITIES, cityById } from '../../data/cities.js';
import { curvyPath, bezierAt, buildTrackGeo } from '../../utils/geometry.js';

const TERRAIN = [
  { x: 180, y: 260, r: 40 }, { x: 190, y: 350, r: 30 }, { x: 200, y: 420, r: 34 },
  { x: 210, y: 520, r: 32 }, { x: 220, y: 610, r: 28 }, { x: 240, y: 700, r: 26 },
  { x: 440, y: 300, r: 30 }, { x: 480, y: 370, r: 36 }, { x: 510, y: 440, r: 40 },
  { x: 540, y: 510, r: 36 }, { x: 560, y: 580, r: 30 }, { x: 580, y: 650, r: 28 },
  { x: 600, y: 720, r: 26 }, { x: 940, y: 560, r: 22 }, { x: 970, y: 590, r: 20 },
  { x: 1200, y: 450, r: 22 }, { x: 1230, y: 500, r: 24 }, { x: 1250, y: 560, r: 22 },
  { x: 1270, y: 610, r: 20 }, { x: 1290, y: 660, r: 18 },
];

const RIVERS = [
  'M 890 280 Q 920 380 950 470 Q 980 560 1020 640 Q 1050 700 1060 780',
  'M 700 320 Q 780 400 850 460 Q 900 500 950 530',
  'M 1260 440 Q 1180 480 1100 510 Q 1030 540 960 540',
  'M 470 400 Q 420 510 380 620 Q 340 700 310 780',
  'M 1450 300 Q 1455 340 1450 410 Q 1455 460 1460 500',
];

export function MapView() {
  const tracks      = useGameStore(s => s.tracks);
  const trains      = useGameStore(s => s.trains);
  const selectedCityId  = useGameStore(s => s.selectedCityId);
  const focusTrainId    = useGameStore(s => s.focusTrainId);
  const trackLayingFrom = useGameStore(s => s.trackLayingFrom);
  const selectCity      = useGameStore(s => s.selectCity);
  const selectTrain     = useGameStore(s => s.selectTrain);
  const layTrack        = useGameStore(s => s.layTrack);
  const cancelTrackLaying = useGameStore(s => s.cancelTrackLaying);
  const trackCost       = useGameStore(s => s.trackCost);
  const cash            = useGameStore(s => s.cash);

  const [hover, setHover]           = useState(null);
  const [now, setNow]               = useState(0);
  const [layPreviewTo, setLayPreviewTo] = useState(null);

  // rAF timer for train animation
  useEffect(() => {
    let raf, last = performance.now();
    const tick = (t) => { setNow(n => n + t - last); last = t; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // clear lay preview when mode exits
  useEffect(() => { if (!trackLayingFrom) setLayPreviewTo(null); }, [trackLayingFrom]);

  // Escape cancels track laying
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { cancelTrackLaying(); setLayPreviewTo(null); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cancelTrackLaying]);

  const trackGeo = useMemo(() => buildTrackGeo(tracks, CITIES), [tracks]);

  function trackBetween(aId, bId) {
    return trackGeo.find(t => (t.a === aId && t.b === bId) || (t.a === bId && t.b === aId));
  }

  const trainPositions = useMemo(() => {
    return trains.map(tr => {
      const legCount = tr.route.length - 1;
      if (legCount <= 0) return { ...tr, visible: false };
      const total = tr.progress + (now / 1000) * tr.speed * 1000;
      const legIdx = (tr.leg + Math.floor(total)) % legCount;
      const prog = total - Math.floor(total);
      const aId = tr.route[legIdx], bId = tr.route[legIdx + 1];
      const trk = trackBetween(aId, bId);
      if (!trk) return { ...tr, visible: false };
      const t2 = trk.a === aId ? prog : 1 - prog;
      const pos = bezierAt(trk.ax, trk.ay, trk.cx, trk.cy, trk.bx, trk.by, t2);
      return { ...tr, x: pos.x, y: pos.y, angle: pos.angle, visible: true };
    });
  }, [now, trains, trackGeo]);

  const previewGeo = useMemo(() => {
    if (!trackLayingFrom || !layPreviewTo || trackLayingFrom === layPreviewTo) return null;
    const a = cityById(trackLayingFrom), b = cityById(layPreviewTo);
    return curvyPath(a.x, a.y, b.x, b.y, 0.15, 99);
  }, [trackLayingFrom, layPreviewTo]);

  const previewCost = useMemo(() => {
    if (!trackLayingFrom || !layPreviewTo) return 0;
    return trackCost(trackLayingFrom, layPreviewTo);
  }, [trackLayingFrom, layPreviewTo, trackCost]);

  function handleCityClick(cityId) {
    if (!trackLayingFrom) { selectCity(cityId); return; }
    if (cityId === trackLayingFrom) { cancelTrackLaying(); return; }
    setLayPreviewTo(cityId);
  }

  function handleBreakGround() {
    if (trackLayingFrom && layPreviewTo) { layTrack(trackLayingFrom, layPreviewTo); setLayPreviewTo(null); }
  }

  const cityRadius = (size) => size === 'metro' ? 7 : size === 'city' ? 5 : 4;

  return (
    <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
      <div className="map-paper" style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 120px rgba(80,40,20,0.5)' }}>
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', display: 'block' }}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#8a6a3a" strokeWidth="0.25" opacity="0.25"/>
            </pattern>
            <filter id="paperRough">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/>
              <feColorMatrix values="0 0 0 0 0.6  0 0 0 0 0.4  0 0 0 0 0.2  0 0 0 0.08 0"/>
              <feComposite in2="SourceGraphic" operator="in"/>
            </filter>
          </defs>

          <rect width="1600" height="900" fill="url(#grid)"/>

          {/* Lat/lng lines */}
          <g stroke="#8a6a3a" strokeWidth="0.4" opacity="0.3" fill="none">
            {[200,400,600].map(y => <line key={'lat'+y} x1="0" y1={y} x2="1600" y2={y} strokeDasharray="1 4"/>)}
            {[400,800,1200].map(x => <line key={'lng'+x} x1={x} y1="0" x2={x} y2="900" strokeDasharray="1 4"/>)}
          </g>

          {/* Coastlines */}
          <path d="M 80 200 Q 100 300 120 400 Q 110 500 140 600 Q 160 700 180 800" fill="none" stroke="#6a4220" strokeWidth="1.8" opacity="0.65"/>
          <path d="M 1560 280 Q 1510 340 1500 410 Q 1490 500 1450 560 Q 1400 640 1360 700 Q 1300 760 1240 790" fill="none" stroke="#6a4220" strokeWidth="1.8" opacity="0.65"/>
          <path d="M 900 780 Q 1000 800 1100 790 Q 1200 780 1280 790" fill="none" stroke="#6a4220" strokeWidth="1.8" opacity="0.65"/>

          {/* Rivers */}
          <g fill="none" stroke="#4a6a8a" strokeWidth="1.2" opacity="0.45">
            {RIVERS.map((d, i) => <path key={i} d={d}/>)}
          </g>

          {/* Mountain terrain */}
          <g fill="none" stroke="#8a7060" strokeWidth="0.6" opacity="0.35">
            {TERRAIN.map((t, i) => (
              <g key={i}>
                <path d={`M ${t.x - t.r} ${t.y} L ${t.x} ${t.y - t.r * 1.1} L ${t.x + t.r} ${t.y}`}/>
                <path d={`M ${t.x - t.r * 0.6} ${t.y} L ${t.x + t.r * 0.1} ${t.y - t.r * 0.7} L ${t.x + t.r * 0.7} ${t.y}`} opacity="0.7"/>
              </g>
            ))}
          </g>

          {/* Tracks */}
          {trackGeo.map((t, i) => {
            const colors = { player: '#8b6a30', rival: '#6a2a1a', neutral: '#5a5a4a' };
            const stroke = colors[t.owner] || colors.neutral;
            return (
              <g key={i}>
                <path d={t.d} fill="none" stroke={stroke} strokeWidth={t.owner === 'player' ? 4 : 3} strokeLinecap="round"/>
                <path d={t.d} fill="none" stroke={t.owner === 'player' ? '#c49a44' : '#8a8070'} strokeWidth={t.owner === 'player' ? 1.5 : 1} strokeDasharray={t.owner === 'neutral' ? '4 4' : 'none'} strokeLinecap="round" opacity={0.7}/>
              </g>
            );
          })}

          {/* Preview arc when laying track */}
          {previewGeo && (
            <path d={previewGeo.d} fill="none" stroke="#c49a44" strokeWidth="3" strokeDasharray="8 4" opacity="0.8"/>
          )}

          {/* Cities */}
          {CITIES.map(city => {
            const r = cityRadius(city.size);
            const isFrom = city.id === trackLayingFrom;
            const isHover = hover === city.id;
            const isSelected = selectedCityId === city.id;
            return (
              <g key={city.id}
                 style={{ cursor: trackLayingFrom ? 'crosshair' : 'pointer' }}
                 onClick={() => handleCityClick(city.id)}
                 onMouseEnter={() => setHover(city.id)}
                 onMouseLeave={() => setHover(null)}>
                {(isFrom || isSelected) && (
                  <circle cx={city.x} cy={city.y} r={r + 6} fill="none" stroke="#c49a44" strokeWidth="1.5" opacity="0.6"/>
                )}
                <circle cx={city.x} cy={city.y} r={r}
                        fill={isFrom ? '#f0d896' : city.size === 'metro' ? '#c49a44' : '#a88238'}
                        stroke="#1a0c08" strokeWidth="1.2"/>
                <circle cx={city.x} cy={city.y} r={r * 0.45} fill="rgba(255,240,180,0.6)"/>
                {(isHover || isSelected || isFrom) && (
                  <text x={city.x} y={city.y - r - 5}
                        textAnchor="middle" fontSize="10"
                        fontFamily="IM Fell English SC, serif"
                        fill="#f0d896" stroke="#1a0c08" strokeWidth="3" paintOrder="stroke">
                    {city.name}
                  </text>
                )}
              </g>
            );
          })}

          {/* Trains */}
          {trainPositions.filter(tr => tr.visible).map(tr => (
            <g key={tr.id}
               transform={`translate(${tr.x},${tr.y}) rotate(${tr.angle})`}
               style={{ cursor: 'pointer' }}
               onClick={() => selectTrain(tr.id)}>
              <rect x="-10" y="-4" width="20" height="8" rx="2" fill={tr.color} stroke="#1a0c08" strokeWidth="1"/>
              <rect x="-4" y="-7" width="8" height="4" rx="1" fill={tr.color} stroke="#1a0c08" strokeWidth="0.8"/>
              <circle cx="-7" cy="4" r="2.5" fill="#2a2a2a" stroke="#1a0c08" strokeWidth="0.8"/>
              <circle cx="5" cy="4" r="2.5" fill="#2a2a2a" stroke="#1a0c08" strokeWidth="0.8"/>
              {tr.id === focusTrainId && (
                <circle cx="0" cy="0" r="14" fill="none" stroke="#c49a44" strokeWidth="1.5" opacity="0.7"/>
              )}
            </g>
          ))}

          {/* Compass rose */}
          <g transform="translate(1540, 60)">
            <circle r="28" fill="rgba(26,12,8,0.7)" stroke="#c49a44" strokeWidth="0.8"/>
            <path d="M0,-24 L3,-8 L0,-12 L-3,-8 Z" fill="#f0d896"/>
            <path d="M0,24 L3,8 L0,12 L-3,8 Z" fill="#8b6a30"/>
            <path d="M-24,0 L-8,3 L-12,0 L-8,-3 Z" fill="#8b6a30"/>
            <path d="M24,0 L8,3 L12,0 L8,-3 Z" fill="#8b6a30"/>
            <text y="-16" textAnchor="middle" fontSize="8" fontFamily="IM Fell English SC,serif" fill="#f0d896">N</text>
          </g>
        </svg>

        {/* Track cost bar */}
        {trackLayingFrom && layPreviewTo && (
          <div style={{ position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', background: 'linear-gradient(180deg,#3a1f18,#1a0c08)', border: '1px solid #c49a44', boxShadow: '0 4px 16px rgba(0,0,0,0.7)' }}>
            <span className="display uppercase" style={{ fontSize: 11, color: '#a88238', letterSpacing: '0.18em' }}>Cost to Build</span>
            <span className="numeric gold" style={{ fontSize: 18 }}>${previewCost.toLocaleString()}</span>
            <span className="body-serif" style={{ fontSize: 11, color: cash >= previewCost ? '#6bbf5a' : '#c85040', fontStyle: 'italic' }}>
              {cash >= previewCost ? 'Funds available' : 'Insufficient funds'}
            </span>
            <button className="btn-brass" onClick={handleBreakGround} disabled={cash < previewCost}>
              ⚒ Break Ground
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
