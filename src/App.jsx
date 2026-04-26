import { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore.js';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { TitleBar } from './components/chrome/TitleBar.jsx';
import { Ticker } from './components/chrome/Ticker.jsx';
import { MapScreen } from './components/screens/MapScreen.jsx';
import { DepotScreen } from './components/screens/DepotScreen.jsx';
import { RouteSchedulerScreen } from './components/screens/RouteSchedulerScreen.jsx';
import { TrackLayingScreen } from './components/screens/TrackLayingScreen.jsx';
import { NEWS } from './data/news.js';

const COMPANY_STATIC = { name: 'GREAT NORTHERN & PACIFIC', founded: 1863 };

function AppInner() {
  const cash             = useGameStore(s => s.cash);
  const year             = useGameStore(s => s.year);
  const month            = useGameStore(s => s.month);
  const screen           = useGameStore(s => s.screen);
  const navigate         = useGameStore(s => s.navigate);
  const settleAllRoutes  = useGameStore(s => s.settleAllRoutes);
  const tickDemand       = useGameStore(s => s.tickDemand);

  const [hudVisible, setHudVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      settleAllRoutes();
      tickDemand();
    }, 2000);
    return () => clearInterval(id);
  }, [settleAllRoutes, tickDemand]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TitleBar
        company={{ ...COMPANY_STATIC, cash, year, month }}
        screen={screen}
        onNav={navigate}
        hudVisible={hudVisible}
        onToggleHUD={() => setHudVisible(v => !v)}
      />
      {screen === 'map'   && <MapScreen hudVisible={hudVisible} />}
      {screen === 'depot' && <DepotScreen onBack={() => navigate('map')} />}
      {screen === 'route' && <RouteSchedulerScreen onBack={() => navigate('map')} />}
      {screen === 'track' && <TrackLayingScreen onBack={() => navigate('map')} />}
      <Ticker items={NEWS} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
