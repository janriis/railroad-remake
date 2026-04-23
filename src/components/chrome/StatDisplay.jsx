export function StatDisplay({ label, value, delta, big }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div className="display uppercase" style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-dim)', letterSpacing: '0.2em' }}>{label}</div>
      <div className="numeric gold" style={{ fontSize: big ? 18 : 15, textShadow: '0 1px 0 rgba(0,0,0,0.8)', lineHeight: 1.1 }}>
        {value}
        {delta != null && (
          <span style={{ fontSize: 11, marginLeft: 6, color: delta >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {delta >= 0 ? '▲' : '▼'}{Math.abs(delta).toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}
