import { useGameStore } from '../../store/gameStore.js';
import { cityById } from '../../data/cities.js';
import { GOODS } from '../../data/goods.js';
import { Panel } from '../chrome/Panel.jsx';
import { CityVignette } from '../icons/index.js';
import { Label, DividerDots } from './helpers.jsx';

function DemandBar({ good, level }) {
  const colour = level >= 80 ? '#c85040' : level >= 40 ? '#c49a44' : '#5a5a4a';
  const label  = level >= 80 ? 'HIGH' : level >= 40 ? 'MED' : 'LOW';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 72, fontSize: 11, color: '#d9c698' }}>{good.emoji} {good.label}</span>
      <div style={{ flex: 1, height: 7, background: '#2a1510', borderRadius: 3 }}>
        <div style={{ width: `${level}%`, height: '100%', background: colour, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 10, color: colour, width: 32, textAlign: 'right' }}>{label}</span>
    </div>
  );
}

export function CityDetailPanel({ cityId, onClose, onLayTrack }) {
  const city      = cityById(cityId);
  const tracks    = useGameStore(s => s.tracks);
  const cityDemand = useGameStore(s => s.cityDemand);

  if (!city) return null;

  const connectedTracks = tracks.filter(t => t.a === cityId || t.b === cityId);
  const demandLevels    = cityDemand[cityId] ?? {};
  const demandedGoods   = GOODS.filter(g => demandLevels[g.id] !== undefined);

  return (
    <Panel
      title={city.name}
      style={{ width: 280 }}
      actions={
        <button className="btn-brass" onClick={onClose} style={{ fontSize: 10, padding: '2px 8px' }}>✕</button>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <CityVignette size={city.size} style={{ flexShrink: 0 }} />
        <div>
          <div className="display uppercase" style={{ fontSize: 12, color: '#c49a44', letterSpacing: '0.14em' }}>
            {city.size.toUpperCase()} · {city.state}
          </div>
          <div className="body-serif" style={{ fontSize: 11, color: '#a88238', fontStyle: 'italic' }}>
            Pop. {city.pop}
          </div>
        </div>
      </div>

      <DividerDots />

      {city.produces?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <Label>Produces</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
            {city.produces.map(gid => {
              const g = GOODS.find(x => x.id === gid);
              return g ? (
                <span key={gid} style={{ padding: '2px 8px', background: g.bg, color: g.text, fontSize: 11, border: '1px solid rgba(255,255,255,0.1)' }}>
                  {g.emoji} {g.label}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}

      {demandedGoods.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <Label>Demand</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 5 }}>
            {demandedGoods.map(g => (
              <DemandBar key={g.id} good={g} level={demandLevels[g.id]} />
            ))}
          </div>
        </div>
      )}

      <DividerDots />

      <div style={{ marginBottom: 10 }}>
        <Label>Rail Connections</Label>
        <div style={{ marginTop: 4 }}>
          {connectedTracks.length === 0 ? (
            <div className="body-serif" style={{ fontSize: 11, color: '#8b6a30', fontStyle: 'italic' }}>No rail connections</div>
          ) : (
            connectedTracks.map((t, i) => {
              const otherId = t.a === cityId ? t.b : t.a;
              const other   = cityById(otherId);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', borderBottom: '1px solid rgba(26,12,8,0.3)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.owner === 'player' ? '#c49a44' : t.owner === 'rival' ? '#c85040' : '#8b8070', flexShrink: 0 }} />
                  <span className="body-serif" style={{ fontSize: 11, color: '#d9c698' }}>{other?.name ?? otherId}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 9, color: '#8b6a30', fontFamily: 'IM Fell English SC, serif' }}>{t.owner}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <button className="btn-brass" onClick={onLayTrack} style={{ width: '100%', fontSize: 12 }}>
        ⚒ Lay Track From Here
      </button>
    </Panel>
  );
}
