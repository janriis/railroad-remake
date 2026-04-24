export function Ticker({ items }) {
  const doubled = [...items, ...items];
  return (
    <div style={{ borderTop: '1px solid #1a0c08', borderBottom: '1px solid #1a0c08', background: 'linear-gradient(180deg, #2a1510, #1a0c08)', height: 26, overflow: 'hidden', display: 'flex', alignItems: 'center', position: 'relative' }}>
      <div style={{ padding: '0 14px', background: 'linear-gradient(180deg, #6a4a28, #3a1f18)', height: '100%', display: 'flex', alignItems: 'center', borderRight: '1px solid #1a0c08', boxShadow: 'inset 0 1px 0 rgba(255,200,140,0.15)', flexShrink: 0 }}>
        <span className="display uppercase" style={{ fontSize: 11, color: '#f0d896', letterSpacing: '0.18em' }}>⚜ Telegraph ⚜</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div className="ticker-track" style={{ padding: '0 20px' }}>
          {doubled.map((item, i) => (
            <span key={i} className="body-serif gold-dim" style={{ fontSize: 13, padding: '0 40px', whiteSpace: 'nowrap' }}>{item}</span>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 60, background: 'linear-gradient(90deg, transparent, #1a0c08)', pointerEvents: 'none' }}/>
    </div>
  );
}
