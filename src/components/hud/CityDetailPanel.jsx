import { useGameStore } from '../../store/gameStore.js';
import { cityById } from '../../data/cities.js';
import { Panel } from '../chrome/Panel.jsx';
import { CityVignette } from '../icons/index.js';
import { Label, DividerDots } from './helpers.jsx';

export function CityDetailPanel({ cityId, onClose, onLayTrack }) {
  const city = cityById(cityId);
  const tracks = useGameStore(s => s.tracks);

  if (!city) return null;

  const connectedTracks = tracks.filter(t => t.a === cityId || t.b === cityId);

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
          <div className="display uppercase" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--accent)', letterSpacing: '0.14em' }}>
            {city.size.toUpperCase()} · {city.state}
          </div>
          <div className="body-serif" style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            Pop. {city.pop}
          </div>
        </div>
      </div>

      <DividerDots />

      <div style={{ marginBottom: 10 }}>
        <Label>Rail Connections</Label>
        <div style={{ marginTop: 4 }}>
          {connectedTracks.length === 0 ? (
            <div className="body-serif" style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-dim)', fontStyle: 'italic' }}>No rail connections</div>
          ) : (
            connectedTracks.map((t, i) => {
              const otherId = t.a === cityId ? t.b : t.a;
              const other = cityById(otherId);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', borderBottom: '1px solid rgba(26,12,8,0.3)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.owner === 'player' ? 'var(--accent)' : t.owner === 'rival' ? 'var(--red)' : 'var(--text-muted)', flexShrink: 0 }}/>
                  <span className="body-serif" style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)' }}>{other?.name ?? otherId}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 'var(--font-size-label)', color: 'var(--text-dim)', fontFamily: 'IM Fell English SC, serif' }}>{t.owner}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <button className="btn-brass" onClick={onLayTrack} style={{ width: '100%', fontSize: 'var(--font-size-sm)' }}>
        ⚒ Lay Track From Here
      </button>
    </Panel>
  );
}
