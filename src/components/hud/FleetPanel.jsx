import { useGameStore } from '../../store/gameStore.js';
import { Panel } from '../chrome/Panel.jsx';

export function FleetPanel() {
  const trains       = useGameStore(s => s.trains);
  const focusTrainId = useGameStore(s => s.focusTrainId);
  const selectTrain  = useGameStore(s => s.selectTrain);

  return (
    <Panel title="Fleet Register" style={{ width: 280 }}>
      {trains.map(tr => (
        <div key={tr.id} onClick={() => selectTrain(tr.id)}
             style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', cursor: 'pointer', background: focusTrainId === tr.id ? 'rgba(196,154,68,0.15)' : 'transparent', borderBottom: '1px solid rgba(26,12,8,0.4)' }}>
          <div style={{ width: 4, height: 28, background: tr.color, border: '1px solid var(--border-strong)' }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="display uppercase" style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-primary)', letterSpacing: '0.14em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tr.name}</div>
            <div className="body-serif" style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{tr.id} · {tr.model}</div>
          </div>
        </div>
      ))}
    </Panel>
  );
}
