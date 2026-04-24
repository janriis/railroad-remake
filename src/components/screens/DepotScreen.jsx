import { useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { Panel } from '../chrome/Panel.jsx';
import { LocomotiveIcon, BigLocomotiveEngraving } from '../icons/index.js';
import { Label, DividerDots } from '../hud/helpers.jsx';
import { LOCOMOTIVES } from '../../data/locomotives.js';
import grasshopperImg from '../../images/grashopper.png';
import mogulImg from '../../images/mogul.png';

const LOCO_PHOTOS = {
  grasshop: grasshopperImg,
  mogul:    mogulImg,
};

function Spec({ label, value }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <Label>{label}</Label>
      <div className="numeric" style={{ fontSize: 14, color: '#f0d896', marginTop: 2 }}>{value}</div>
    </div>
  );
}

export function DepotScreen({ onBack }) {
  const buyLocomotive = useGameStore(s => s.buyLocomotive);
  const cash          = useGameStore(s => s.cash);
  const [selectedId, setSelectedId] = useState(LOCOMOTIVES[0].id);
  const [qty, setQty]     = useState(1);
  const [ordered, setOrdered] = useState(false);

  const loco = LOCOMOTIVES.find(l => l.id === selectedId);
  const available = loco.availability === 'Available';
  const canAfford = cash >= loco.price * qty;

  function handleOrder() {
    const uids = buyLocomotive(loco.id, qty);
    if (uids) {
      setOrdered(true);
      setTimeout(() => setOrdered(false), 1500);
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, background: '#0a0604' }}>
      {/* Left: locomotive list */}
      <div className="wood-dark" style={{ width: 300, borderRight: '1px solid #1a0c08', padding: 14, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' }}>
        <div className="display uppercase gold" style={{ fontSize: 13, letterSpacing: '0.2em', textAlign: 'center', padding: '8px 0', borderBottom: '1px solid rgba(196,154,68,0.3)' }}>
          ⚙ Locomotive Catalogue ⚙
        </div>

        {LOCOMOTIVES.map(l => {
          const isSelected = l.id === selectedId;
          const isAvailable = l.availability === 'Available';
          return (
            <div key={l.id}
                 onClick={() => { setSelectedId(l.id); setQty(1); setOrdered(false); }}
                 style={{
                   padding: 10, cursor: 'pointer',
                   background: isSelected ? 'linear-gradient(180deg,#6a4a28,#3a1f18)' : 'linear-gradient(180deg,#3a1f18,#2a1510)',
                   border: isSelected ? '1px solid #c49a44' : '1px solid #1a0c08',
                   opacity: isAvailable ? 1 : 0.6,
                 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LocomotiveIcon color={isAvailable ? '#c49a44' : '#6a6a5a'} size={32} catalogId={l.id} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="display uppercase" style={{ fontSize: 11, color: isAvailable ? '#f0d896' : '#8b8070', letterSpacing: '0.12em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.name}
                  </div>
                  <div className="body-serif" style={{ fontSize: 10, color: '#a88238', fontStyle: 'italic' }}>{l.years}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="numeric" style={{ fontSize: 12, color: isAvailable ? '#6bbf5a' : '#c85040' }}>
                    ${l.price.toLocaleString()}
                  </div>
                  {!isAvailable && (
                    <div style={{ fontSize: 9, color: '#c85040', fontFamily: 'IM Fell English SC, serif' }}>
                      {l.availability}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: 'auto', paddingTop: 12 }}>
          <button className="btn-brass" onClick={onBack} style={{ width: '100%' }}>← Return to Map</button>
        </div>
      </div>

      {/* Right: detail */}
      <div style={{ flex: 1, padding: 24, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Panel title={loco.name}>
          {/* Hero image or engraving */}
          <div style={{ marginBottom: 16, borderRadius: 2, overflow: 'hidden', background: 'rgba(0,0,0,0.3)' }}>
            {LOCO_PHOTOS[loco.id] ? (
              <img
                src={LOCO_PHOTOS[loco.id]}
                alt={loco.name}
                style={{ width: '100%', height: 200, objectFit: 'cover', objectPosition: 'center', display: 'block', opacity: available ? 1 : 0.5 }}
              />
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}>
                <BigLocomotiveEngraving color={available ? '#c49a44' : '#6a6a5a'} catalogId={loco.id} />
              </div>
            )}
          </div>

          {/* Era badge + years */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ padding: '3px 12px', background: available ? '#3d5c2a' : '#6a4a28', color: '#f0d896', fontFamily: 'IM Fell English SC, serif', fontSize: 11, letterSpacing: '0.14em' }}>
              {loco.era}
            </span>
            <span className="body-serif" style={{ fontSize: 13, color: '#a88238', fontStyle: 'italic' }}>{loco.years}</span>
            {!available && (
              <span style={{ padding: '2px 8px', background: '#4a1a1a', color: '#c85040', fontFamily: 'IM Fell English SC, serif', fontSize: 10 }}>
                {loco.availability}
              </span>
            )}
          </div>

          {/* Specs grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, padding: '12px 0', borderTop: '1px solid rgba(196,154,68,0.2)', borderBottom: '1px solid rgba(196,154,68,0.2)', marginBottom: 12 }}>
            <Spec label="Price" value={'$' + loco.price.toLocaleString()} />
            <Spec label="Max Speed" value={loco.maxSpeed + ' mph'} />
            <Spec label="Power" value={loco.power} />
            <Spec label="Reliability" value={loco.reliability} />
            <Spec label="Best For" value={loco.best} />
          </div>

          {/* Description */}
          <div className="body-serif" style={{ fontSize: 13, fontStyle: 'italic', color: '#d9c698', marginBottom: 16, lineHeight: 1.6 }}>
            {loco.description}
          </div>

          <DividerDots />

          {/* Purchase section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <Label>Quantity</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <button className="btn-brass" style={{ padding: '4px 10px', fontSize: 14 }}
                        onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                <input value={qty} readOnly className="field-parchment"
                       style={{ width: 40, textAlign: 'center', margin: '0 4px' }}/>
                <button className="btn-brass" style={{ padding: '4px 10px', fontSize: 14 }}
                        onClick={() => setQty(q => q + 1)}>+</button>
              </div>
            </div>

            <div>
              <Label>Total Cost</Label>
              <div className="numeric" style={{ fontSize: 18, color: canAfford && available ? '#f0d896' : '#c85040', marginTop: 4 }}>
                ${(loco.price * qty).toLocaleString()}
              </div>
            </div>

            <div>
              <Label>Treasury</Label>
              <div className="numeric" style={{ fontSize: 14, color: '#a88238', marginTop: 4 }}>
                ${cash.toLocaleString()}
              </div>
            </div>

            <div style={{ marginLeft: 'auto' }}>
              <button className="btn-brass"
                      style={{ fontSize: 15, padding: '10px 24px' }}
                      disabled={!available || !canAfford}
                      onClick={handleOrder}>
                {ordered ? '✓ Ordered!' : !available ? 'Unavailable' : !canAfford ? 'Insufficient Funds' : 'Place Order'}
              </button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
