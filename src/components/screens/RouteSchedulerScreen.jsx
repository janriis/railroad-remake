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
      <div className="numeric" style={{ fontSize: 16, color: accent ? '#6bbf5a' : '#f0d896' }}>{value}</div>
    </div>
  );
}

function RouteBuilder({ onDone, onCancel }) {
  const tracks          = useGameStore(s => s.tracks);
  const ownedLocomotives = useGameStore(s => s.ownedLocomotives);
  const createRoute     = useGameStore(s => s.createRoute);
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
            <span key={i} style={{ padding: '3px 10px', background: 'linear-gradient(180deg,#6a4a28,#3a1f18)', border: '1px solid #c49a44', color: '#f0d896', fontFamily: 'IM Fell English SC', fontSize: 12 }}>
              {cityById(id).name}
            </span>
          ))}
          {stops.length > 0 && <span className="gold-dim" style={{ fontSize: 18 }}>→</span>}
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
          <div className="body-serif" style={{ fontSize: 12, color: '#c85040', marginTop: 6 }}>No idle locomotives — buy one in Locomotive Works.</div>
        ) : (
          <select className="field-parchment" style={{ marginTop: 6, width: '100%' }}
                  value={locoUid} onChange={e => setLocoUid(e.target.value)}>
            <option value="">Select locomotive…</option>
            {idleLocos.map(l => <option key={l.uid} value={l.uid}>{l.name} ({l.uid})</option>)}
          </select>
        )}
      </div>

      {error && <div style={{ color: '#c85040', fontSize: 12, marginBottom: 8 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-brass" style={{ flex: 1 }} onClick={handleDispatch}>Dispatch</button>
        <button className="btn-brass" onClick={onCancel}>Cancel</button>
      </div>
    </Panel>
  );
}

export function RouteSchedulerScreen({ onBack }) {
  const routes          = useGameStore(s => s.routes);
  const trains          = useGameStore(s => s.trains);
  const suspendRoute    = useGameStore(s => s.suspendRoute);
  const [building, setBuilding] = useState(false);
  const [selectedId, setSelectedId] = useState(routes[0]?.id ?? null);

  const route = routes.find(r => r.id === selectedId);

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, background: '#0a0604' }}>
      {/* Left: route list */}
      <div className="wood-dark" style={{ width: 280, borderRight: '1px solid #1a0c08', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
        <div className="display uppercase gold" style={{ fontSize: 13, letterSpacing: '0.2em', textAlign: 'center', padding: '8px 0', borderBottom: '1px solid rgba(196,154,68,0.3)' }}>⚜ Standing Orders ⚜</div>

        {routes.map(r => (
          <div key={r.id} onClick={() => { setSelectedId(r.id); setBuilding(false); }}
               style={{ padding: 10, cursor: 'pointer', background: selectedId === r.id ? 'linear-gradient(180deg,#6a4a28,#3a1f18)' : 'linear-gradient(180deg,#3a1f18,#2a1510)', border: selectedId === r.id ? '1px solid #c49a44' : '1px solid #1a0c08' }}>
            <div className="display uppercase" style={{ fontSize: 12, color: '#f0d896', letterSpacing: '0.12em' }}>{r.name}</div>
            <div className="body-serif" style={{ fontSize: 11, color: '#a88238', fontStyle: 'italic', marginTop: 2 }}>
              {r.stops.map(id => cityById(id).name).join(' → ')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ padding: '1px 6px', background: r.status === 'running' ? '#3d5c2a' : '#6a4a28', color: '#f0d896', fontFamily: 'IM Fell English SC', fontSize: 9 }}>{r.status.toUpperCase()}</span>
              <span className="numeric" style={{ fontSize: 11, color: '#6bbf5a' }}>+${(r.revenuePerTick/1000).toFixed(1)}K/tick</span>
            </div>
          </div>
        ))}

        {routes.length === 0 && !building && (
          <div className="body-serif" style={{ fontSize: 12, color: '#a88238', fontStyle: 'italic', textAlign: 'center', padding: 12 }}>No routes yet. Buy a locomotive, then create a route.</div>
        )}

        <button className="btn-brass" style={{ marginTop: 4 }} onClick={() => { setBuilding(true); setSelectedId(null); }}>+ New Route</button>
        <button className="btn-brass" onClick={onBack} style={{ marginTop: 'auto' }}>← Return to Map</button>
      </div>

      {/* Right: detail / builder */}
      <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
        {building && (
          <RouteBuilder onDone={() => setBuilding(false)} onCancel={() => setBuilding(false)} />
        )}

        {!building && route && (
          <Panel title={route.name}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
              {(() => {
                const train = trains.find(t => t.id === route.id);
                return train ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <LocomotiveIcon color={train.color} size={56}/>
                    <div>
                      <div className="display uppercase gold" style={{ fontSize: 12 }}>{train.name}</div>
                      <div className="body-serif" style={{ fontSize: 11, color: '#a88238', fontStyle: 'italic' }}>{train.model}</div>
                    </div>
                  </div>
                ) : null;
              })()}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
                <FinStat label="Revenue/tick" value={'$' + route.revenuePerTick.toLocaleString()} accent={true}/>
              </div>
            </div>

            <DividerDots />

            {/* Schedule tape */}
            <div style={{ background: 'linear-gradient(180deg,rgba(26,12,8,0.5),rgba(42,21,16,0.5))', border: '1px solid #1a0c08', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'stretch', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 28, left: 20, right: 20, height: 4, background: 'linear-gradient(180deg,#8b6a30,#4a2a1f)' }}/>
                {route.stops.map((stopId, i) => {
                  const c = cityById(stopId);
                  return (
                    <div key={i} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%,#f0d896,#8b6a30 60%,#3a1f18)', border: '2px solid #1a0c08', margin: '20px auto 0', position: 'relative', zIndex: 1 }}/>
                      <div className="display uppercase" style={{ fontSize: 12, color: '#f0d896', letterSpacing: '0.12em', marginTop: 8 }}>{c.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DividerDots />

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-brass" onClick={() => suspendRoute(route.id)}
                      disabled={route.status === 'suspended'}>
                {route.status === 'suspended' ? 'Suspended' : 'Suspend'}
              </button>
            </div>
          </Panel>
        )}

        {!building && !route && routes.length === 0 && (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#a88238' }}>
            <div className="body-serif" style={{ fontSize: 16, fontStyle: 'italic' }}>Click "+ New Route" to create your first route.</div>
          </div>
        )}
      </div>
    </div>
  );
}
