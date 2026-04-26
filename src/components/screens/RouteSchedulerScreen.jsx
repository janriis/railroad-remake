import { useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { Panel } from '../chrome/Panel.jsx';
import { LocomotiveIcon } from '../icons/index.js';
import { Label, DividerDots } from '../hud/helpers.jsx';
import { CITIES, cityById } from '../../data/cities.js';
import { LOCOMOTIVES } from '../../data/locomotives.js';
import { GOODS } from '../../data/goods.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function resolveConsist(schedule, stopIndex) {
  for (let i = stopIndex; i >= 0; i--) {
    if (schedule[i] !== undefined) return schedule[i];
  }
  return ['passenger', 'mail'];
}

function consistTons(cars) {
  return cars.reduce((s, t) => s + (GOODS.find(g => g.id === t)?.weight ?? 0), 0);
}

// ─── RouteBuilder (new route creation) ─────────────────────────────────────

function RouteBuilder({ onDone, onCancel }) {
  const tracks           = useGameStore(s => s.tracks);
  const ownedLocomotives = useGameStore(s => s.ownedLocomotives);
  const createRoute      = useGameStore(s => s.createRoute);
  const [stops, setStops]     = useState([]);
  const [locoUid, setLocoUid] = useState('');
  const [error, setError]     = useState('');

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

  const nextOptions = stops.length === 0
    ? CITIES.filter(c => tracks.some(t => t.owner === 'player' && (t.a === c.id || t.b === c.id)))
    : reachableCities(stops[stops.length - 1]);

  function handleDispatch() {
    if (stops.length < 2) { setError('Add at least 2 stops.'); return; }
    if (!locoUid) { setError('Assign a locomotive.'); return; }
    const id = createRoute(stops, locoUid);
    if (!id) { setError('Route invalid — check track connections and loco availability.'); return; }
    onDone(id);
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

// ─── CarPicker ──────────────────────────────────────────────────────────────

function CarPicker({ onPick, maxTons, currentTons }) {
  const free = maxTons - currentTons;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 0' }}>
      {GOODS.map(g => {
        const fits = g.weight <= free;
        return (
          <button key={g.id} onClick={() => fits && onPick(g.id)} disabled={!fits}
                  style={{ padding: '5px 10px', background: fits ? g.bg : 'rgba(42,21,16,0.4)', color: fits ? g.text : '#3a2a18', border: `1px solid ${fits ? 'rgba(255,255,255,0.15)' : '#1a0c08'}`, fontSize: 11, cursor: fits ? 'pointer' : 'not-allowed', fontFamily: 'IM Fell English SC, serif' }}>
            {g.emoji} {g.label} <span style={{ fontSize: 10, opacity: 0.7 }}>{g.weight}t</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main screen ────────────────────────────────────────────────────────────

export function RouteSchedulerScreen({ onBack }) {
  const routes           = useGameStore(s => s.routes);
  const ownedLocomotives = useGameStore(s => s.ownedLocomotives);
  const cityDemand       = useGameStore(s => s.cityDemand);
  const setStopCars      = useGameStore(s => s.setStopCars);
  const setLoadingPolicy = useGameStore(s => s.setLoadingPolicy);
  const suspendRoute     = useGameStore(s => s.suspendRoute);
  const resumeRoute      = useGameStore(s => s.resumeRoute);

  const [selectedRouteId,  setSelectedRouteId]  = useState(routes[0]?.id ?? null);
  const [selectedStopIdx,  setSelectedStopIdx]  = useState(0);
  const [building,         setBuilding]         = useState(false);
  const [addingCar,        setAddingCar]        = useState(false);

  const route        = routes.find(r => r.id === selectedRouteId);
  const selectedCity = route ? cityById(route.stops[selectedStopIdx]) : null;

  const owned = route ? ownedLocomotives.find(o => o.uid === route.locomotiveUid) : null;
  const loco  = owned ? LOCOMOTIVES.find(l => l.id === owned.catalogId) : null;
  const maxTons = loco?.maxTons ?? 36;

  const currentConsist = route ? resolveConsist(route.schedule, selectedStopIdx) : [];
  const currentTons    = consistTons(currentConsist);
  const maintenanceCost = route && loco
    ? (() => {
        let max = 0;
        for (let i = 0; i < route.stops.length; i++) {
          const t = consistTons(resolveConsist(route.schedule, i));
          if (t > max) max = t;
        }
        return (loco.maintenanceBase ?? 80) + max * 12;
      })()
    : 0;

  const demandLevels  = selectedCity ? (cityDemand[selectedCity.id] ?? {}) : {};
  const demandedGoods = GOODS.filter(g => demandLevels[g.id] !== undefined);

  function handleRemoveCar(idx) {
    if (!route) return;
    const newCars = currentConsist.filter((_, i) => i !== idx);
    setStopCars(route.id, selectedStopIdx, newCars);
    setAddingCar(false);
  }

  function handleAddCar(goodId) {
    if (!route) return;
    setStopCars(route.id, selectedStopIdx, [...currentConsist, goodId]);
    setAddingCar(false);
  }

  function selectRoute(id) {
    setSelectedRouteId(id);
    setSelectedStopIdx(0);
    setBuilding(false);
    setAddingCar(false);
  }

  // ── Column 1: route list ────────────────────────────────────────────────
  const col1 = (
    <div className="wood-dark" style={{ width: 200, borderRight: '1px solid #1a0c08', padding: 10, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'auto' }}>
      <div className="display uppercase gold" style={{ fontSize: 11, letterSpacing: '0.18em', textAlign: 'center', padding: '6px 0', borderBottom: '1px solid rgba(196,154,68,0.2)' }}>⚜ Standing Orders</div>

      {routes.map(r => (
        <div key={r.id} onClick={() => selectRoute(r.id)}
             style={{ padding: 8, cursor: 'pointer', background: selectedRouteId === r.id && !building ? 'linear-gradient(180deg,#6a4a28,#3a1f18)' : 'linear-gradient(180deg,#3a1f18,#2a1510)', border: selectedRouteId === r.id && !building ? '1px solid #c49a44' : '1px solid #1a0c08' }}>
          <div className="display uppercase" style={{ fontSize: 11, color: '#f0d896', letterSpacing: '0.1em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
          <div className="body-serif" style={{ fontSize: 10, color: '#a88238', fontStyle: 'italic', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.stops.map(id => cityById(id)?.name).join(' → ')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <span style={{ padding: '1px 5px', background: r.status === 'running' ? '#3d5c2a' : '#6a4a28', color: '#f0d896', fontFamily: 'IM Fell English SC', fontSize: 9 }}>{r.status.toUpperCase()}</span>
          </div>
        </div>
      ))}

      {routes.length === 0 && !building && (
        <div className="body-serif" style={{ fontSize: 11, color: '#a88238', fontStyle: 'italic', textAlign: 'center', padding: 10 }}>No routes yet.</div>
      )}

      <button className="btn-brass" style={{ marginTop: 4 }} onClick={() => { setBuilding(true); setSelectedRouteId(null); }}>+ New Route</button>
      <button className="btn-brass" onClick={onBack} style={{ marginTop: 'auto' }}>← Map</button>
    </div>
  );

  // ── Column 2: stop timeline ─────────────────────────────────────────────
  const col2 = building ? null : (
    <div style={{ width: 200, borderRight: '1px solid #1a0c08', padding: 10, display: 'flex', flexDirection: 'column', background: '#0e0804', overflow: 'auto' }}>
      {route ? (
        <>
          <div className="display uppercase" style={{ fontSize: 10, color: '#c49a44', letterSpacing: '0.15em', paddingBottom: 6, borderBottom: '1px solid rgba(196,154,68,0.15)', marginBottom: 8 }}>SCHEDULE</div>

          <div style={{ flex: 1 }}>
            {route.stops.map((stopId, i) => {
              const city    = cityById(stopId);
              const hasOverride = route.schedule[i] !== undefined;
              const consist = resolveConsist(route.schedule, i);
              const isSelected = i === selectedStopIdx;
              return (
                <div key={i} style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 18 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: hasOverride ? '#c49a44' : '#a88238', border: `2px solid ${hasOverride ? '#c49a44' : '#1a0c08'}`, marginTop: 4, flexShrink: 0, boxShadow: hasOverride ? '0 0 5px rgba(196,154,68,0.5)' : 'none' }} />
                    {i < route.stops.length - 1 && <div style={{ width: 2, flex: 1, background: '#3a2010', minHeight: 20 }} />}
                  </div>
                  <div onClick={() => { setSelectedStopIdx(i); setAddingCar(false); }}
                       style={{ flex: 1, padding: '2px 0 10px 7px', cursor: 'pointer', background: isSelected ? 'rgba(196,154,68,0.06)' : 'transparent', borderRight: isSelected ? '2px solid #c49a44' : '2px solid transparent', borderRadius: '0 2px 2px 0' }}>
                    <div style={{ fontSize: 11, color: '#f0d896' }}>
                      {city?.name}
                      {hasOverride && <span style={{ fontSize: 9, color: '#c49a44', marginLeft: 4 }}>✦</span>}
                    </div>
                    {hasOverride ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 3 }}>
                        {consist.map((t, j) => {
                          const g = GOODS.find(x => x.id === t);
                          return g ? <span key={j} style={{ padding: '1px 4px', background: g.bg, color: g.text, fontSize: 9 }}>{g.emoji}</span> : null;
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: 9, color: '#4a3a18', fontStyle: 'italic', marginTop: 2 }}>← inherited</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <DividerDots />

          <div>
            <Label>Loading Policy</Label>
            <div style={{ display: 'flex', gap: 0, marginTop: 4 }}>
              {['express', 'fullLoad'].map(p => (
                <div key={p} onClick={() => setLoadingPolicy(route.id, p)}
                     style={{ flex: 1, padding: '4px 0', background: route.loadingPolicy === p ? '#3d5c2a' : '#2a1510', border: `1px solid ${route.loadingPolicy === p ? '#5a9a3a' : '#1a0c08'}`, color: route.loadingPolicy === p ? '#d0f0a0' : '#6a5030', fontSize: 10, textAlign: 'center', cursor: 'pointer', fontFamily: 'IM Fell English SC, serif' }}>
                  {p === 'express' ? 'Express' : 'Full Load'}
                </div>
              ))}
            </div>
            {route.loadingPolicy === 'fullLoad' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <Label>Max wait</Label>
                <input type="number" min={1} max={30} value={route.maxWaitDays}
                       onChange={e => setLoadingPolicy(route.id, 'fullLoad', Number(e.target.value))}
                       className="field-parchment" style={{ width: 48, fontSize: 12, padding: '2px 6px' }} />
                <span style={{ fontSize: 10, color: '#8b6a30' }}>days</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {route.status === 'running'
              ? <button className="btn-brass" style={{ flex: 1, fontSize: 10 }} onClick={() => suspendRoute(route.id)}>Suspend</button>
              : <button className="btn-brass" style={{ flex: 1, fontSize: 10 }} onClick={() => resumeRoute(route.id)}>Resume</button>
            }
          </div>
        </>
      ) : (
        <div className="body-serif" style={{ fontSize: 12, color: '#6a5020', fontStyle: 'italic', padding: 10 }}>Select a route to see its schedule.</div>
      )}
    </div>
  );

  // ── Column 3: car editor + demand ───────────────────────────────────────
  const col3 = (
    <div style={{ flex: 1, padding: 14, background: '#080402', overflow: 'auto' }}>
      {building && (
        <RouteBuilder
          onDone={(id) => { setBuilding(false); setSelectedRouteId(id); setSelectedStopIdx(0); }}
          onCancel={() => setBuilding(false)}
        />
      )}

      {!building && route && selectedCity && (
        <>
          <div className="display uppercase" style={{ fontSize: 10, color: '#c49a44', letterSpacing: '0.18em', paddingBottom: 6, borderBottom: '1px solid rgba(196,154,68,0.15)', marginBottom: 10 }}>
            {selectedCity.name.toUpperCase()} — CAR CONSIST & DEMAND
          </div>

          {/* Tonnage bar */}
          {loco && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: '#a88238', fontFamily: 'IM Fell English SC, serif', flexShrink: 0 }}>{loco.name}</span>
              <div style={{ flex: 1, height: 6, background: '#2a1510', borderRadius: 3 }}>
                <div style={{ width: `${Math.min(100, (currentTons / maxTons) * 100)}%`, height: '100%', background: currentTons / maxTons > 0.85 ? '#c85040' : currentTons / maxTons > 0.6 ? '#c49a44' : '#6bbf5a', borderRadius: 3, transition: 'width 0.2s' }} />
              </div>
              <span style={{ fontSize: 10, color: '#a88238', fontFamily: 'monospace', flexShrink: 0 }}>{currentTons} / {maxTons} t</span>
            </div>
          )}

          {/* Car slots */}
          <Label>Cars at this stop</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0 14px' }}>
            {currentConsist.map((t, i) => {
              const g = GOODS.find(x => x.id === t);
              return g ? (
                <div key={i} title="Click to remove" onClick={() => handleRemoveCar(i)}
                     style={{ width: 70, padding: '7px 5px', background: g.bg, border: `1px solid rgba(255,255,255,0.15)`, textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ fontSize: 18 }}>{g.emoji}</div>
                  <div style={{ color: g.text, fontSize: 10, marginTop: 2 }}>{g.label}</div>
                  <div style={{ color: g.text, fontSize: 9, opacity: 0.7 }}>{g.weight} t</div>
                </div>
              ) : null;
            })}

            {!addingCar && (
              <div onClick={() => setAddingCar(true)}
                   style={{ width: 70, padding: '7px 5px', background: 'rgba(196,154,68,0.06)', border: '1px dashed rgba(196,154,68,0.25)', textAlign: 'center', cursor: currentTons < maxTons ? 'pointer' : 'not-allowed', opacity: currentTons < maxTons ? 1 : 0.4 }}>
                <div style={{ fontSize: 20, color: '#3a2a10' }}>+</div>
                <div style={{ color: '#3a2a10', fontSize: 9, marginTop: 2 }}>{maxTons - currentTons} t free</div>
              </div>
            )}
          </div>

          {addingCar && (
            <div style={{ marginBottom: 14, padding: 8, background: 'rgba(42,21,16,0.5)', border: '1px solid #1a0c08' }}>
              <div style={{ fontSize: 10, color: '#a88238', marginBottom: 6 }}>Pick a car to add ({maxTons - currentTons} t remaining):</div>
              <CarPicker onPick={handleAddCar} maxTons={maxTons} currentTons={currentTons} />
              <button className="btn-brass" style={{ fontSize: 10, marginTop: 6 }} onClick={() => setAddingCar(false)}>Cancel</button>
            </div>
          )}

          {/* Maintenance */}
          <div style={{ marginBottom: 14, padding: '6px 10px', background: 'rgba(42,21,16,0.4)', border: '1px solid #1a0c08', fontSize: 10, color: '#8b6a30' }}>
            ⚙ Maintenance: ${maintenanceCost.toLocaleString()}/tick
          </div>

          {/* Demand bars */}
          {demandedGoods.length > 0 && (
            <>
              <Label>{selectedCity.name} Demand</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
                {demandedGoods.map(g => {
                  const level  = demandLevels[g.id];
                  const colour = level >= 80 ? '#c85040' : level >= 40 ? '#c49a44' : '#5a5a4a';
                  const label  = level >= 80 ? 'HIGH' : level >= 40 ? 'MED' : 'LOW';
                  return (
                    <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 76, fontSize: 11, color: '#d9c698' }}>{g.emoji} {g.label}</span>
                      <div style={{ flex: 1, height: 7, background: '#2a1510', borderRadius: 3 }}>
                        <div style={{ width: `${level}%`, height: '100%', background: colour, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 10, color: colour, width: 32, textAlign: 'right' }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {selectedCity.produces?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Label>Produces at {selectedCity.name}</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                {selectedCity.produces.map(gid => {
                  const g = GOODS.find(x => x.id === gid);
                  return g ? (
                    <span key={gid} style={{ padding: '2px 8px', background: g.bg, color: g.text, fontSize: 11 }}>
                      {g.emoji} {g.label}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </>
      )}

      {!building && !route && (
        <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
          <div className="body-serif" style={{ fontSize: 15, color: '#6a5020', fontStyle: 'italic' }}>Select a route or create a new one.</div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, background: '#0a0604' }}>
      {col1}
      {col2}
      {col3}
    </div>
  );
}
