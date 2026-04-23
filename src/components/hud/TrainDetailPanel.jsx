import { useGameStore } from '../../store/gameStore.js';
import { cityById } from '../../data/cities.js';
import { Panel } from '../chrome/Panel.jsx';
import { LocomotiveIcon, CarIcon } from '../icons/index.js';
import { Label, DividerDots } from './helpers.jsx';

export function TrainDetailPanel({ trainId, onClose, onOpenRoute }) {
  const train = useGameStore(s => s.trains).find(t => t.id === trainId);
  const routes = useGameStore(s => s.routes);
  const route = routes.find(r => r.id === trainId);

  if (!train) return null;

  return (
    <Panel
      title={train.name}
      style={{ width: 280 }}
      actions={
        <button className="btn-brass" onClick={onClose} style={{ fontSize: 10, padding: '2px 8px' }}>✕</button>
      }
    >
      {/* Locomotive icon + model */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <LocomotiveIcon color={train.color} size={48} />
        <div>
          <div className="display uppercase gold" style={{ fontSize: 12, letterSpacing: '0.14em' }}>{train.model}</div>
          <div className="body-serif" style={{ fontSize: 11, color: '#a88238', fontStyle: 'italic' }}>{train.id}</div>
        </div>
      </div>

      <DividerDots />

      {/* Route stops */}
      <div style={{ marginBottom: 8 }}>
        <Label>Route</Label>
        <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          {train.route.map((id, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="body-serif" style={{ fontSize: 11, color: '#f0d896' }}>
                {cityById(id)?.name ?? id}
              </span>
              {i < train.route.length - 1 && (
                <span style={{ color: '#8b6a30', fontSize: 10 }}>→</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Cars */}
      <div style={{ marginBottom: 8 }}>
        <Label>Consist</Label>
        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
          {train.cars.map((type, i) => (
            <CarIcon key={i} type={type} size={28} />
          ))}
        </div>
      </div>

      {/* Revenue (if user-created route) */}
      {route && (
        <>
          <DividerDots />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Label>Revenue/tick</Label>
              <div className="numeric" style={{ fontSize: 14, color: '#6bbf5a' }}>
                ${route.revenuePerTick.toLocaleString()}
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <span style={{ padding: '2px 8px', background: route.status === 'running' ? '#3d5c2a' : '#6a4a28', color: '#f0d896', fontFamily: 'IM Fell English SC, serif', fontSize: 10 }}>
                {route.status.toUpperCase()}
              </span>
            </div>
          </div>
          <button className="btn-brass" onClick={onOpenRoute} style={{ marginTop: 10, width: '100%', fontSize: 11 }}>
            Open in Dispatch Office
          </button>
        </>
      )}
    </Panel>
  );
}
