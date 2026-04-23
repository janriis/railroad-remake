import { useEffect } from 'react';
import { useGameStore } from './store/gameStore.js';
import { TitleBar } from './components/chrome/TitleBar.jsx';
import { Ticker } from './components/chrome/Ticker.jsx';
import { MapView } from './components/map/MapView.jsx';
import { NEWS } from './data/news.js';

const COMPANY_STATIC = { name: 'GREAT NORTHERN & PACIFIC', founded: 1863 };

export default function App() {
  const cash     = useGameStore(s => s.cash);
  const year     = useGameStore(s => s.year);
  const month    = useGameStore(s => s.month);
  const screen   = useGameStore(s => s.screen);
  const navigate = useGameStore(s => s.navigate);
  const tickRevenue = useGameStore(s => s.tickRevenue);

  useEffect(() => {
    const id = setInterval(tickRevenue, 2000);
    return () => clearInterval(id);
  }, [tickRevenue]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TitleBar
        company={{ ...COMPANY_STATIC, cash, year, month }}
        screen={screen}
        onNav={navigate}
        hudVisible={true}
        onToggleHUD={() => {}}
      />
      {screen === 'map'   && <MapView />}
      {screen === 'depot' && <div style={{ flex: 1, color: '#f0d896', display: 'grid', placeItems: 'center' }}>Depot coming soon</div>}
      {screen === 'route' && <div style={{ flex: 1, color: '#f0d896', display: 'grid', placeItems: 'center' }}>Dispatch coming soon</div>}
      {screen === 'track' && <div style={{ flex: 1, color: '#f0d896', display: 'grid', placeItems: 'center' }}>Track screen coming soon</div>}
      <Ticker items={NEWS} />
    </div>
  );
}
