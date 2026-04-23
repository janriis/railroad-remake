import { useState, useRef, useEffect } from 'react';
import { StatDisplay } from './StatDisplay.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

function CompanyCrest() {
  return (
    <svg width="54" height="54" viewBox="0 0 54 54">
      <defs>
        <radialGradient id="crestBg"><stop offset="0%" stopColor="#6a4a28"/><stop offset="100%" stopColor="#2a1510"/></radialGradient>
        <linearGradient id="crestGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f0d896"/><stop offset="100%" stopColor="#8b6a30"/></linearGradient>
      </defs>
      <circle cx="27" cy="27" r="26" fill="url(#crestBg)" stroke="#8b6a30" strokeWidth="1.2"/>
      <circle cx="27" cy="27" r="22" fill="none" stroke="#c49a44" strokeWidth="0.5"/>
      <g fill="url(#crestGold)" stroke="#2a1510" strokeWidth="0.4">
        <rect x="14" y="26" width="22" height="8"/>
        <rect x="30" y="21" width="10" height="13"/>
        <rect x="36" y="18" width="3" height="4"/>
        <circle cx="18" cy="36" r="3"/>
        <circle cx="26" cy="36" r="3"/>
        <circle cx="35" cy="36" r="3"/>
        <path d="M14 26 L11 31 L14 31 Z"/>
      </g>
      <path d="M27 9 L28.5 13 L32.5 13 L29.5 15.5 L30.7 19.5 L27 17 L23.3 19.5 L24.5 15.5 L21.5 13 L25.5 13 Z" fill="#f0d896" stroke="#2a1510" strokeWidth="0.3"/>
      <path d="M10 32 Q14 40 22 44" fill="none" stroke="#c49a44" strokeWidth="0.8"/>
      <path d="M44 32 Q40 40 32 44" fill="none" stroke="#c49a44" strokeWidth="0.8"/>
    </svg>
  );
}

const THEMES = [
  { id: 'modern',   label: '✦ Modern' },
  { id: 'victorian', label: '⚙ Victorian' },
];

export function TitleBar({ company, onNav, screen, onToggleHUD, hudVisible }) {
  const { theme, setTheme } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!pickerOpen) return;
    function onMouseDown(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [pickerOpen]);

  const tabs = [
    { id: 'map',   label: 'Map Room' },
    { id: 'track', label: 'Track Laying' },
    { id: 'depot', label: 'Locomotive Works' },
    { id: 'route', label: 'Dispatch Office' },
  ];

  return (
    <div className="wood-dark" style={{ borderBottom: '1px solid var(--border-strong)', boxShadow: 'inset 0 -1px 0 rgba(255,200,140,0.1), 0 2px 4px rgba(0,0,0,0.6)', display: 'flex', alignItems: 'stretch', height: 72, position: 'relative' }}>
      <div style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 14, borderRight: '1px solid var(--border-strong)' }}>
        <CompanyCrest />
        <div>
          <div className="display uppercase gold" style={{ fontSize: 15, letterSpacing: '0.18em', textShadow: '0 1px 0 rgba(0,0,0,0.8)' }}>{company.name}</div>
          <div className="body-serif" style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Estab. {company.founded} · Yr. {company.year} · {company.month}</div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', padding: '0 20px' }}>
        {tabs.map(t => (
          <div key={t.id} className="tab-plate" data-active={screen === t.id} onClick={() => onNav(t.id)}
               style={{ cursor: 'pointer' }}>
            {t.label}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 24px', borderLeft: '1px solid var(--border-strong)' }}>
        <StatDisplay label="Treasury" value={'$' + company.cash.toLocaleString()} big />
        <StatDisplay label="Stock" value={'$68.25'} delta={1.75} />

        {/* Theme picker */}
        <div style={{ position: 'relative' }} ref={pickerRef}>
          <button
            className="btn-brass"
            onClick={() => setPickerOpen(v => !v)}
            style={{ fontSize: 11, padding: '6px 10px' }}
            title="Switch theme"
          >
            🎨
          </button>
          {pickerOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 4px)',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 3, padding: 6,
              boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
              minWidth: 148, zIndex: 100,
            }}>
              <div style={{ color: 'var(--text-dim)', fontSize: 'var(--font-size-label)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'IM Fell English SC, serif' }}>Theme</div>
              {THEMES.map(t => (
                <div
                  key={t.id}
                  onClick={() => { setTheme(t.id); setPickerOpen(false); }}
                  style={{
                    padding: '5px 8px', cursor: 'pointer', borderRadius: 2, marginBottom: 3,
                    background: theme === t.id ? 'rgba(196,154,68,0.15)' : 'transparent',
                    border: `1px solid ${theme === t.id ? 'var(--accent)' : 'transparent'}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    color: theme === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontSize: 'var(--font-size-sm)',
                    fontFamily: 'IM Fell English SC, serif',
                  }}
                >
                  {t.label}
                  {theme === t.id && <span style={{ color: 'var(--accent)', fontSize: 10 }}>✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="btn-brass" onClick={onToggleHUD} style={{ fontSize: 11, padding: '6px 12px' }}>
          {hudVisible ? 'Hide HUD' : 'Show HUD'}
        </button>
      </div>
    </div>
  );
}
