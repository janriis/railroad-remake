import { Filigree } from './Filigree.jsx';

export function Panel({ title, children, style = {}, bodyStyle = {}, actions, noPadding }) {
  return (
    <div className="wood-grain" style={{
      position: 'relative', border: '1px solid #1a0c08',
      boxShadow: 'inset 0 1px 0 rgba(255,200,140,0.15), inset 0 0 0 2px #2a1510, 0 6px 20px rgba(0,0,0,0.6)',
      display: 'flex', flexDirection: 'column', ...style,
    }}>
      {title && (
        <div className="panel-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Filigree size={18} />
            <span className="display uppercase gold" style={{ fontSize: 14, letterSpacing: '0.18em', textShadow: '0 1px 0 rgba(0,0,0,0.6)' }}>
              {title}
            </span>
          </div>
          {actions && <div style={{ display: 'flex', gap: 6 }}>{actions}</div>}
        </div>
      )}
      <div style={{ padding: noPadding ? 0 : 14, flex: 1, minHeight: 0, ...bodyStyle }}>
        {children}
      </div>
      <div style={{ position: 'absolute', top: 2, left: 2, pointerEvents: 'none' }}><Filigree size={14} /></div>
      <div style={{ position: 'absolute', top: 2, right: 2, pointerEvents: 'none' }}><Filigree size={14} rotate={90} /></div>
      <div style={{ position: 'absolute', bottom: 2, left: 2, pointerEvents: 'none' }}><Filigree size={14} rotate={-90} /></div>
      <div style={{ position: 'absolute', bottom: 2, right: 2, pointerEvents: 'none' }}><Filigree size={14} rotate={180} /></div>
    </div>
  );
}
