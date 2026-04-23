import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, INITIAL_STATE } from './gameStore';
import { INITIAL_TRACKS } from '../data/tracks';
import { INITIAL_TRAINS } from '../data/trains';

function reset() {
  useGameStore.setState({
    tracks: INITIAL_TRACKS.map(t => ({ ...t })),
    trains: INITIAL_TRAINS.map(t => ({ ...t })),
    ownedLocomotives: [],
    routes: [],
    cash: 428_650,
    netWorth: 2_840_000,
    trackLayingFrom: null,
    selectedCityId: null,
    focusTrainId: null,
    screen: 'map',
  });
}

describe('layTrack', () => {
  beforeEach(reset);

  it('adds a player track and deducts cost', () => {
    const before = useGameStore.getState().cash;
    const ok = useGameStore.getState().layTrack('sf', 'lax');
    const s = useGameStore.getState();
    expect(ok).toBe(true);
    expect(s.tracks.some(t => t.a === 'sf' && t.b === 'lax' && t.owner === 'player')).toBe(true);
    expect(s.cash).toBeLessThan(before);
  });

  it('rejects duplicate track', () => {
    const ok = useGameStore.getState().layTrack('sf', 'sac');
    expect(ok).toBe(false);
    expect(useGameStore.getState().tracks.filter(t =>
      (t.a === 'sf' && t.b === 'sac') || (t.a === 'sac' && t.b === 'sf')
    )).toHaveLength(1);
  });

  it('rejects if insufficient funds', () => {
    useGameStore.setState({ cash: 0 });
    expect(useGameStore.getState().layTrack('sf', 'lax')).toBe(false);
    expect(useGameStore.getState().cash).toBe(0);
  });

  it('clears trackLayingFrom on success', () => {
    useGameStore.setState({ trackLayingFrom: 'sf' });
    useGameStore.getState().layTrack('sf', 'lax');
    expect(useGameStore.getState().trackLayingFrom).toBeNull();
  });
});

describe('buyLocomotive', () => {
  beforeEach(reset);

  it('adds loco and deducts $18,500 for American', () => {
    const before = useGameStore.getState().cash;
    const uids = useGameStore.getState().buyLocomotive('americ');
    const s = useGameStore.getState();
    expect(uids).toHaveLength(1);
    expect(s.ownedLocomotives).toHaveLength(1);
    expect(s.ownedLocomotives[0].catalogId).toBe('americ');
    expect(s.cash).toBe(before - 18500);
  });

  it('buys qty=2 and deducts double price', () => {
    const before = useGameStore.getState().cash;
    useGameStore.getState().buyLocomotive('americ', 2);
    expect(useGameStore.getState().ownedLocomotives).toHaveLength(2);
    expect(useGameStore.getState().cash).toBe(before - 37000);
  });

  it('rejects era-locked Atlantic', () => {
    const uids = useGameStore.getState().buyLocomotive('atlan');
    expect(uids).toBeNull();
    expect(useGameStore.getState().ownedLocomotives).toHaveLength(0);
  });

  it('rejects when cash < price', () => {
    useGameStore.setState({ cash: 100 });
    expect(useGameStore.getState().buyLocomotive('americ')).toBeNull();
  });
});

describe('createRoute', () => {
  beforeEach(() => {
    reset();
    useGameStore.getState().buyLocomotive('americ');
  });

  it('creates running route, adds train, marks loco assigned', () => {
    const uid = useGameStore.getState().ownedLocomotives[0].uid;
    const routeId = useGameStore.getState().createRoute(['sf', 'sac', 'slc'], uid);
    const s = useGameStore.getState();
    expect(routeId).toBeTruthy();
    expect(s.routes[0].status).toBe('running');
    expect(s.routes[0].revenuePerTick).toBe(3 * 800);
    expect(s.trains.some(t => t.id === routeId)).toBe(true);
    expect(s.ownedLocomotives[0].assignedRouteId).toBe(routeId);
  });

  it('rejects stops not connected by player track', () => {
    const uid = useGameStore.getState().ownedLocomotives[0].uid;
    expect(useGameStore.getState().createRoute(['sf', 'nyc'], uid)).toBeNull();
  });

  it('rejects already-assigned loco', () => {
    const uid = useGameStore.getState().ownedLocomotives[0].uid;
    useGameStore.getState().createRoute(['sf', 'sac'], uid);
    expect(useGameStore.getState().createRoute(['sf', 'sac'], uid)).toBeNull();
  });
});

describe('tickRevenue', () => {
  beforeEach(reset);

  it('adds revenuePerTick for running routes', () => {
    useGameStore.setState({ routes: [{ id: 'R-1', status: 'running', revenuePerTick: 2400 }] });
    const before = useGameStore.getState().cash;
    useGameStore.getState().tickRevenue();
    expect(useGameStore.getState().cash).toBe(before + 2400);
  });

  it('skips suspended routes', () => {
    useGameStore.setState({ routes: [{ id: 'R-1', status: 'suspended', revenuePerTick: 2400 }] });
    const before = useGameStore.getState().cash;
    useGameStore.getState().tickRevenue();
    expect(useGameStore.getState().cash).toBe(before);
  });
});
