import { useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { Panel } from '../chrome/Panel.jsx';
import { LocomotiveIcon } from '../icons/index.js';
import { Label, DividerDots } from '../hud/helpers.jsx';
import { CITIES, cityById } from '../../data/cities.js';
import { LOCOMOTIVES } from '../../data/locomotives.js';

function FinStat({ label, value, accent }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <Label>{label}</Label>
      <div className="numeric" style={{ fontSize: 16, color: accent ? 'var(--green)' : 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

function RouteBuilder({ onDone, onCancel }) {
  const tracks           = useGameStore(s => s.tracks);
  const ownedLocomotives = useGameStore(s => s.ownedLocomotives);
  const createRoute      = useGameStore(s => s.createRoute);
  const [stops, setStops]   = useState([]);
  const [locoUid, setLocoUid] = useState('');
  const [error, setError]   = useState('');

  const idleLocos = ownedLocomotives.filter(l => l.assignedRouteId === null);

  function reachableCities(fromId) {
    return CITIES.filter(c =>
      c.id !== fromId &&
      !stops.includes(c.id) &&
      tracks.some(t =>
        t.owner === 'player' &&
        ((t.a === fromId && t.b === c.id) || (t.a === c.id && t.b === fromId))
      )
    );
  }

  const nextOptions = stops.length === 0 ? CITIES.filter(c =>
    tracks.some(t => t.owner === 'player' && (t.a === c.id || t.b === c.id))
  ) : reachableCities(stops[stops.length - 1]);

  function handleDispatch() {
    if (stops.length < 2) { setError('Add at least 2 stops.'); return; }
    if (!locoUid) { setError('Assign a locomotive.'); return; }
    const id = createRoute(stops, locoUid);
    if (!id) { setError('Route invalid — check track connections and loco availability.'); return; }
    onDone();
  }

  return (
    <Panel title="New Route">
      <div style={{ marginBottom: 12 }}>
        <Label>Stops</Label>
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {stops.map((id, i) => (
            <span key={i} style={{ padding: '3px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--accent)', color: 'var(--text-primary)', fontFamily: 'IM Fell English SC', fontSize: 12 }}>
              {cityById(id)?.name ?? id}
            </span>
          ))}
          {stops.length > 0 && <span style={{ color: 'var(--accent)', fontSize: 18 }}>→</span>}
          <select className="field-parchment" style={{ minWidth: 160 }}
                  value="" onChange={e => { if (e.target.value) setStops(s => [...s, e.target.value]); }}>
            <option value="">Add stop…</option>
            {nextOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {stops.length > 0 && (
            <button className="btn-brass" style={{ fontSize: 11, padding: '4px 8px' }}
                    onClick={() => setStops(s => s.slice(0, -1))}>↩ Undo</button>
          )}
        </div>
      </div>

      <DividerDots />

      <div style={{ marginBottom: 12 }}>
        <Label>Locomotive</Label>
        {idleLocos.length === 0 ? (
          <div className="body-serif" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--red)', marginTop: 6 }}>No idle locomotives — buy one in Locomotive Works.</div>
        ) : (
          <select className="field-parchment" style={{ marginTop: 6, width: '100%' }}
                  value={locoUid} onChange={e => setLocoUid(e.target.value)}>
            <option value="">Select locomotive…</option>
            {idleLocos.map(l => <option key={l.uid} value={l.uid}>{l.name} ({l.uid})</option>)}
          </select>
        )}
      </div>

      {error && <div style={{ color: 'var(--red)', fontSize: 'var(--font-size-sm)', marginBottom: 8 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-brass" style={{ flex: 1 }} onClick={handleDispatch}>Dispatch</button>
        <button className="btn-brass" onClick={onCancel}>Cancel</button>
      </div>
    </Panel>
  );
}

export function RouteSchedulerScreen({ onBack }) {
  const routes           = useGameStore(s => s.routes);
  const trains           = useGameStore(s => s.trains);
  const suspendRoute     = useGameStore(s => s.suspendRoute);
  const ownedLocomotives = useGameStore(s => s.ownedLocomotives);
  const [building, setBuilding] = useState(false);
  const [selectedId, setSelectedId] = useState(routes[0]?.id ?? null);

  const route = routes.find(r => r.id === selectedId);

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, background: 'var(--bg-base)' }}>
      <div className="wood-dark" style={{ width: 280, borderRight: '1px solid var(--border-strong)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
        <div className="display uppercase gold" style={{ fontSize: 13, letterSpacing: '0.2em', textAlign: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>⚜ Standing Orders ⚜</div>

        {routes.map(r => (
          <div key={r.id} onClick={() => { setSelectedId(r.id); setBuilding(false); }}
               style={{ padding: 10, cursor: 'pointer', background: selectedId === r.id ? 'var(--bg-elevated)' : 'var(--bg-surface)', border: selectedId === r.id ? '1px solid var(--accent)' : '1px solid var(--border-strong)' }}>
            <div className="display uppercase" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', letterSpacing: '0.12em' }}>{r.name}</div>
            <div className="body-serif" style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 2 }}>
              {r.stops.map(id => cityById(id)?.name ?? id).join(' → ')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ padding: '1px 6px', background: r.status === 'running' ? '#3d5c2a' : '#6a4a28', color: 'var(--text-primary)', fontFamily: 'IM Fell English SC', fontSize: 9 }}>{r.status.toUpperCase()}</span>
              <span className="numeric" style={{ fontSize: 'var(--font-size-label)', color: 'var(--green)' }}>+${(r.revenuePerTick/1000).toFixed(1)}K/tick</span>
            </div>
          </div>
        ))}

        {routes.length === 0 && !building && (
          <div className="body-serif" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: 12 }}>No routes yet. Buy a locomotive, then create a route.</div>
        )}

        <button className="btn-brass" style={{ marginTop: 4 }} onClick={() => { setBuilding(true); setSelectedId(null); }}>+ New Route</button>
        <button className="btn-brass" onClick={onBack} style={{ marginTop: 'auto' }}>← Return to Map</button>
      </div>

      <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
        {building && (
          <RouteBuilder onDone={() => setBuilding(false)} onCancel={() => setBuilding(false)} />
        )}

        {!building && route && (
          <Panel title={route.name}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
              {(() => {
                const train = trains.find(t => t.id === route.id);
                const locoOwned = ownedLocomotives.find(l => l.uid === route.locomotiveUid);
                return train ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <LocomotiveIcon color={train.color} size={56} catalogId={locoOwned?.catalogId ?? 'americ'}/>
                    <div>
                      <div className="display uppercase gold" style={{ fontSize: 'var(--font-size-sm)' }}>{train.name}</div>
                      <div className="body-serif" style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{train.model}</div>
                    </div>
                  </div>
                ) : null;
              })()}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
                <FinStat label="Revenue/tick" value={'$' + route.revenuePerTick.toLocaleString()} accent={true}/>
              </div>
            </div>

            <DividerDots />

            <div style={{ marginBottom: 12 }}>
              <Label>Stops</Label>
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {route.stops.map((id, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ padding: '3px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'IM Fell English SC', fontSize: 12 }}>
                      {cityById(id)?.name ?? id}
                    </span>
                    {i < route.stops.length - 1 && <span style={{ color: 'var(--accent)', fontSize: 16 }}>→</span>}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-brass"
                      style={{ flex: 1 }}
                      disabled={route.status === 'suspended'}
                      onClick={() => suspendRoute(route.id)}>
                ⏸ Suspend Route
              </button>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
