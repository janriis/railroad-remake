export function Ticker({ items }) {
  const doubled = [...items, ...items];
  return (
    <div style={{ borderTop: '1px solid var(--border-strong)', borderBottom: '1px solid var(--border-strong)', background: 'var(--bg-surface)', height: 26, overflow: 'hidden', display: 'flex', alignItems: 'center', position: 'relative' }}>
      <div style={{ padding: '0 14px', background: 'var(--bg-elevated)', height: '100%', display: 'flex', alignItems: 'center', borderRight: '1px solid var(--border-strong)', boxShadow: 'inset 0 1px 0 rgba(255,200,140,0.15)', flexShrink: 0 }}>
        <span className="display uppercase" style={{ fontSize: 11, color: 'var(--text-primary)', letterSpacing: '0.18em' }}>⚜ Telegraph ⚜</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div className="ticker-track" style={{ padding: '0 20px' }}>
          {doubled.map((item, i) => (
            <span key={i} className="body-serif gold-dim" style={{ fontSize: 13, padding: '0 40px', whiteSpace: 'nowrap' }}>{item}</span>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 60, background: `linear-gradient(90deg, transparent, var(--bg-base))`, pointerEvents: 'none' }}/>
    </div>
  );
}
