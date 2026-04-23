import { useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { MapView } from '../map/MapView.jsx';
import { CompanyPanel } from '../hud/CompanyPanel.jsx';
import { FleetPanel } from '../hud/FleetPanel.jsx';
import { TrainDetailPanel } from '../hud/TrainDetailPanel.jsx';
import { CityDetailPanel } from '../hud/CityDetailPanel.jsx';

export function MapScreen({ hudVisible }) {
  const selectedCityId  = useGameStore(s => s.selectedCityId);
  const focusTrainId    = useGameStore(s => s.focusTrainId);
  const selectTrain     = useGameStore(s => s.selectTrain);
  const navigate        = useGameStore(s => s.navigate);
  const startTrackLaying = useGameStore(s => s.startTrackLaying);
  const selectCity      = useGameStore(s => s.selectCity);

  return (
    <div style={{ flex: 1, position: 'relative', display: 'flex', minHeight: 0 }}>
      <MapView />

      {hudVisible && (
        <>
          {/* Left rail */}
          <div style={{ position: 'absolute', left: 14, top: 14, bottom: 14, display: 'flex', flexDirection: 'column', gap: 12, pointerEvents: 'none' }}>
            <div style={{ pointerEvents: 'auto' }}><CompanyPanel /></div>
            <div style={{ pointerEvents: 'auto', flex: 1, minHeight: 0, overflow: 'auto' }}><FleetPanel /></div>
          </div>

          {/* Right rail */}
          <div style={{ position: 'absolute', right: 14, top: 14, bottom: 14, display: 'flex', flexDirection: 'column', gap: 12, pointerEvents: 'none' }}>
            {focusTrainId && (
              <div style={{ pointerEvents: 'auto' }}>
                <TrainDetailPanel trainId={focusTrainId} onClose={() => selectTrain(null)} onOpenRoute={() => navigate('route')} />
              </div>
            )}
            {selectedCityId && !focusTrainId && (
              <div style={{ pointerEvents: 'auto' }}>
                <CityDetailPanel cityId={selectedCityId} onClose={() => selectCity(null)}
                                 onLayTrack={() => startTrackLaying(selectedCityId)} />
              </div>
            )}
          </div>

          {/* Bottom action dock */}
          <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, padding: 8, background: 'linear-gradient(180deg, #3a1f18, #1a0c08)', border: '1px solid #1a0c08', boxShadow: 'inset 0 1px 0 rgba(255,200,140,0.15), 0 4px 12px rgba(0,0,0,0.6)' }}>
            <button className="btn-brass" onClick={() => startTrackLaying(null)}>⚿ Lay Track</button>
            <button className="btn-brass" onClick={() => navigate('depot')}>⚙ Locomotive Works</button>
            <button className="btn-brass" onClick={() => navigate('route')}>✒ Dispatch</button>
            <div style={{ width: 1, background: '#1a0c08', margin: '0 4px' }}/>
            <button className="btn-brass">▶ Play</button>
            <button className="btn-brass">⏸ Pause</button>
            <button className="btn-brass">⏩ Fast</button>
          </div>
        </>
      )}
    </div>
  );
}
