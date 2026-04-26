import { useGameStore } from '../../store/gameStore.js';
import { Panel } from '../chrome/Panel.jsx';
import { Label } from './helpers.jsx';

function LedgerRow({ label, value, delta }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="numeric gold" style={{ fontSize: 15 }}>
        {value}
        {delta != null && (
          <span style={{ fontSize: 11, marginLeft: 4, color: delta >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {delta >= 0 ? '▲' : '▼'}{Math.abs(delta).toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}

export function CompanyPanel() {
  const cash     = useGameStore(s => s.cash);
  const netWorth = useGameStore(s => s.netWorth);
  return (
    <Panel title="Ledger" style={{ width: 280 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <LedgerRow label="Treasury" value={'$' + cash.toLocaleString()}/>
        <LedgerRow label="Net Worth" value={'$' + (netWorth/1e6).toFixed(2) + 'M'}/>
      </div>
      <div className="divider-dots" style={{ margin: '10px 0' }}/>
      <div className="body-serif" style={{ fontSize: 'var(--font-size-base)', fontStyle: 'italic', color: 'var(--text-secondary)', textAlign: 'center' }}>
        "A railroad is a ribbon of steel binding the Republic."
      </div>
    </Panel>
  );
}
