import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, INITIAL_STATE, hydrateCounters } from './gameStore';
import { INITIAL_TRACKS } from '../data/tracks';
import { INITIAL_TRAINS } from '../data/trains';
import { CITIES } from '../data/cities';

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
    useGameStore.setState({ ...INITIAL_STATE });
    hydrateCounters({ routes: [], ownedLocomotives: [] });
    useGameStore.getState().buyLocomotive('americ');
  });

  it('creates running route with schedule, loadingPolicy, maxWaitDays (no revenuePerTick)', () => {
    const uid = useGameStore.getState().ownedLocomotives[0].uid;
    const routeId = useGameStore.getState().createRoute(['sf', 'sac', 'slc'], uid);
    const s = useGameStore.getState();
    expect(routeId).toBeTruthy();
    expect(s.routes[0].status).toBe('running');
    expect(s.routes[0].schedule[0]).toEqual(['passenger', 'mail']);
    expect(s.routes[0].loadingPolicy).toBe('express');
    expect(s.routes[0].maxWaitDays).toBe(2);
    expect(s.routes[0].revenuePerTick).toBeUndefined();
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

describe('suspendRoute + resumeRoute', () => {
  beforeEach(() => {
    useGameStore.setState({ ...INITIAL_STATE });
    hydrateCounters({ routes: [], ownedLocomotives: [] });
    useGameStore.getState().buyLocomotive('americ');
    const uid = useGameStore.getState().ownedLocomotives[0].uid;
    useGameStore.getState().createRoute(['sf', 'sac'], uid);
  });

  it('suspendRoute sets status to suspended', () => {
    const id = useGameStore.getState().routes[0].id;
    useGameStore.getState().suspendRoute(id);
    expect(useGameStore.getState().routes[0].status).toBe('suspended');
  });

  it('resumeRoute sets status back to running', () => {
    const id = useGameStore.getState().routes[0].id;
    useGameStore.getState().suspendRoute(id);
    useGameStore.getState().resumeRoute(id);
    expect(useGameStore.getState().routes[0].status).toBe('running');
  });
});

describe('setStopCars', () => {
  beforeEach(() => {
    useGameStore.setState({ ...INITIAL_STATE });
    hydrateCounters({ routes: [], ownedLocomotives: [] });
    useGameStore.getState().buyLocomotive('americ');
    const uid = useGameStore.getState().ownedLocomotives[0].uid;
    useGameStore.getState().createRoute(['sf', 'sac', 'slc'], uid);
  });

  it('sets car consist for a specific stop index', () => {
    const id = useGameStore.getState().routes[0].id;
    useGameStore.getState().setStopCars(id, 2, ['coal', 'freight']);
    expect(useGameStore.getState().routes[0].schedule[2]).toEqual(['coal', 'freight']);
  });

  it('rejects consist that exceeds loco maxTons (American = 36t; coal+freight+coal = 46t)', () => {
    const id = useGameStore.getState().routes[0].id;
    // coal=16t, freight=14t, coal=16t → 46t > 36t
    const ok = useGameStore.getState().setStopCars(id, 0, ['coal', 'freight', 'coal']);
    expect(ok).toBe(false);
    expect(useGameStore.getState().routes[0].schedule[0]).toEqual(['passenger', 'mail']);
  });
});

describe('setLoadingPolicy', () => {
  beforeEach(() => {
    useGameStore.setState({ ...INITIAL_STATE });
    hydrateCounters({ routes: [], ownedLocomotives: [] });
    useGameStore.getState().buyLocomotive('americ');
    const uid = useGameStore.getState().ownedLocomotives[0].uid;
    useGameStore.getState().createRoute(['sf', 'sac'], uid);
  });

  it('updates loadingPolicy and maxWaitDays', () => {
    const id = useGameStore.getState().routes[0].id;
    useGameStore.getState().setLoadingPolicy(id, 'fullLoad', 4);
    const r = useGameStore.getState().routes[0];
    expect(r.loadingPolicy).toBe('fullLoad');
    expect(r.maxWaitDays).toBe(4);
  });

  it('defaults maxWaitDays to 2 when not provided', () => {
    const id = useGameStore.getState().routes[0].id;
    useGameStore.getState().setLoadingPolicy(id, 'fullLoad');
    expect(useGameStore.getState().routes[0].maxWaitDays).toBe(2);
  });
});

describe('hydrateCounters', () => {
  beforeEach(() => {
    reset();
    hydrateCounters({ routes: [], ownedLocomotives: [] });
  });

  it('sets _routeCounter above the max existing route ID', () => {
    hydrateCounters({ routes: [{ id: 'R-3' }, { id: 'R-7' }], ownedLocomotives: [] });
    useGameStore.getState().buyLocomotive('americ');
    const uid = useGameStore.getState().ownedLocomotives[0].uid;
    const routeId = useGameStore.getState().createRoute(['sf', 'sac'], uid);
    expect(routeId).toBe('R-8');
  });

  it('sets _locoCounter above the max existing loco UID', () => {
    hydrateCounters({ routes: [], ownedLocomotives: [{ uid: 'L-5' }, { uid: 'L-2' }] });
    const uids = useGameStore.getState().buyLocomotive('americ');
    expect(uids[0]).toBe('L-6');
  });

  it('defaults counters to 1 when state has no routes or locos', () => {
    hydrateCounters({ routes: [], ownedLocomotives: [] });
    const uids = useGameStore.getState().buyLocomotive('americ');
    expect(uids[0]).toBe('L-1');
  });

  it('handles null/undefined state gracefully', () => {
    expect(() => hydrateCounters(null)).not.toThrow();
    expect(() => hydrateCounters(undefined)).not.toThrow();
  });
});

describe('tickDemand', () => {
  beforeEach(() => {
    useGameStore.setState({ ...INITIAL_STATE });
    hydrateCounters({ routes: [], ownedLocomotives: [] });
  });

  it('increases demand by DEMAND_RECOVERY_RATE for every demanded good at every city', () => {
    const before = useGameStore.getState().cityDemand;
    useGameStore.getState().tickDemand();
    const after = useGameStore.getState().cityDemand;
    // San Francisco demands freight — verify it rose
    expect(after['sf']['freight']).toBe(before['sf']['freight'] + 3);
  });

  it('caps demand at 100', () => {
    useGameStore.setState({
      cityDemand: { sf: { freight: 99, coal: 100, cattle: 98 } },
    });
    useGameStore.getState().tickDemand();
    const d = useGameStore.getState().cityDemand;
    expect(d['sf']['freight']).toBe(100);
    expect(d['sf']['coal']).toBe(100);
    expect(d['sf']['cattle']).toBe(100);
  });

  it('initial cityDemand starts all demanded goods at 50', () => {
    const d = useGameStore.getState().cityDemand;
    // Chicago demands passenger, mail, cattle
    expect(d['chi']['passenger']).toBe(50);
    expect(d['chi']['mail']).toBe(50);
    expect(d['chi']['cattle']).toBe(50);
    // Chicago does not demand coal — should have no key
    expect(d['chi']['coal']).toBeUndefined();
  });
});
