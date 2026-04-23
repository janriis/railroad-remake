import { Panel } from '../chrome/Panel.jsx';

export function Label({ children }) {
  return <span className="display uppercase" style={{ fontSize: 9, color: '#8b6a30', letterSpacing: '0.22em' }}>{children}</span>;
}

export function ProgressBar({ value }) {
  return (
    <div style={{ height: 6, background: '#1a0c08', border: '1px solid #1a0c08', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)', marginTop: 4 }}>
      <div style={{ width: `${value * 100}%`, height: '100%', background: 'linear-gradient(180deg, #f0d896, #8b6a30)', boxShadow: 'inset 0 1px 0 rgba(255,240,190,0.6)' }}/>
    </div>
  );
}

export function DividerDots() {
  return <div className="divider-dots" style={{ margin: '10px 0' }}/>;
}
