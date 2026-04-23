import { create } from 'zustand';
import { CITIES, cityById } from '../data/cities';
import { INITIAL_TRACKS } from '../data/tracks';
import { INITIAL_TRAINS } from '../data/trains';
import { LOCOMOTIVES } from '../data/locomotives';

const TRACK_COST_PER_PIXEL = 1990;
const TRAIN_COLORS = ['#c49a44', '#8b2818', '#3d5c2a', '#1e3a5c', '#6b4a88', '#2a6b5c'];

let _routeCounter = 1;
let _locoCounter = 1;

export function hydrateCounters(state) {
  if (!state) return;
  const maxRoute = (state.routes ?? []).reduce((max, r) => {
    const n = parseInt(r.id.replace('R-', ''), 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);
  const maxLoco = (state.ownedLocomotives ?? []).reduce((max, l) => {
    const n = parseInt(l.uid.replace('L-', ''), 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);
  _routeCounter = maxRoute + 1;
  _locoCounter = maxLoco + 1;
}

export const INITIAL_STATE = {
  tracks: INITIAL_TRACKS.map(t => ({ ...t })),
  trains: INITIAL_TRAINS.map(t => ({ ...t })),
  ownedLocomotives: [],
  routes: [],
  cash: 428_650,
  netWorth: 2_840_000,
  year: 1875,
  month: 'April',
  screen: 'map',
  selectedCityId: null,
  focusTrainId: null,
  trackLayingFrom: null,
  version: 1,
};

export const useGameStore = create((set, get) => ({
  ...INITIAL_STATE,

  navigate: (screen) => set({ screen, selectedCityId: null, focusTrainId: null }),
  selectCity: (id) => set({ selectedCityId: id, focusTrainId: null }),
  selectTrain: (id) => set({ focusTrainId: id, selectedCityId: null }),
  startTrackLaying: (fromId) => set({ trackLayingFrom: fromId, selectedCityId: null }),
  cancelTrackLaying: () => set({ trackLayingFrom: null }),

  trackCost: (fromId, toId) => {
    const a = cityById(fromId);
    const b = cityById(toId);
    if (!a || !b) return 0;
    return Math.round(Math.hypot(b.x - a.x, b.y - a.y) * TRACK_COST_PER_PIXEL);
  },

  layTrack: (fromId, toId) => {
    const { tracks, cash, trackCost } = get();
    const cost = trackCost(fromId, toId);
    const duplicate = tracks.some(t =>
      (t.a === fromId && t.b === toId) || (t.a === toId && t.b === fromId)
    );
    if (duplicate || cash < cost) return false;
    set(s => ({
      tracks: [...s.tracks, { a: fromId, b: toId, owner: 'player' }],
      cash: s.cash - cost,
      trackLayingFrom: null,
    }));
    return true;
  },

  buyLocomotive: (catalogId, qty = 1) => {
    const { cash, ownedLocomotives } = get();
    const loco = LOCOMOTIVES.find(l => l.id === catalogId);
    if (!loco || loco.availability !== 'Available' || cash < loco.price * qty) return null;
    const uids = [];
    const newLocos = [];
    for (let i = 0; i < qty; i++) {
      const uid = `L-${_locoCounter++}`;
      uids.push(uid);
      newLocos.push({
        uid,
        catalogId,
        name: loco.name,
        color: TRAIN_COLORS[(ownedLocomotives.length + i) % TRAIN_COLORS.length],
        assignedRouteId: null,
      });
    }
    set(s => ({
      cash: s.cash - loco.price * qty,
      ownedLocomotives: [...s.ownedLocomotives, ...newLocos],
    }));
    return uids;
  },

  createRoute: (stops, locomotiveUid) => {
    const { tracks, ownedLocomotives } = get();
    for (let i = 0; i < stops.length - 1; i++) {
      const ok = tracks.some(t =>
        t.owner === 'player' &&
        ((t.a === stops[i] && t.b === stops[i + 1]) ||
         (t.a === stops[i + 1] && t.b === stops[i]))
      );
      if (!ok) return null;
    }
    const loco = ownedLocomotives.find(l => l.uid === locomotiveUid && l.assignedRouteId === null);
    if (!loco) return null;
    const routeId = `R-${_routeCounter++}`;
    const newTrain = {
      id: routeId,
      name: loco.name,
      model: LOCOMOTIVES.find(l => l.id === loco.catalogId)?.name ?? loco.name,
      route: stops,
      leg: 0,
      progress: 0,
      speed: 0.00042,
      cars: ['passenger', 'mail'],
      color: loco.color,
    };
    set(s => ({
      routes: [...s.routes, {
        id: routeId,
        name: `Route #${_routeCounter - 1}`,
        stops,
        locomotiveUid,
        status: 'running',
        revenuePerTick: stops.length * 800,
      }],
      trains: [...s.trains, newTrain],
      ownedLocomotives: s.ownedLocomotives.map(l =>
        l.uid === locomotiveUid ? { ...l, assignedRouteId: routeId } : l
      ),
    }));
    return routeId;
  },

  suspendRoute: (routeId) => {
    set(s => ({
      routes: s.routes.map(r => r.id === routeId ? { ...r, status: 'suspended' } : r),
    }));
  },

  tickRevenue: () => {
    set(s => {
      const earned = s.routes
        .filter(r => r.status === 'running')
        .reduce((acc, r) => acc + r.revenuePerTick, 0);
      return earned > 0 ? { cash: s.cash + earned } : s;
    });
  },
}));
