import { type DragState, type Ui } from '../state';
import { humanError, routeList, stationNameAt, trainName } from '../format';
import { btn } from '../dom';
import { cancelRouting, finishPicking, saveRoute, undoStop } from '../tools/route';
import { sameCoord, type Coord } from '../../sim/types';

export function renderPicking(ui: Ui): void {
  const r = ui.routing!;
  const train = ui.game.train(r.trainId);
  const n = r.stops.length;
  ui.setSheet(
    `<div class="sheet-title">Add stops for ${train ? trainName(ui, train) : 'train'}</div>` +
      (n
        ? `<div>${routeList(ui, r.stops)}</div>`
        : '<div>Tap stations on the map in the order the train should visit them.</div>') +
      `<div class="sub">${n < 2 ? 'Pick at least two stations.' : 'Tap more stations, or press Done to review the route.'}</div>` +
      `<div class="btns">${btn('cancel', 'Cancel')}${btn('undo', 'Undo last', '', n === 0)}${btn('done', 'Done', 'primary', n < 2)}</div>`,
    { cancel: () => cancelRouting(ui), undo: () => undoStop(ui), done: () => finishPicking(ui) },
  );
}
export function renderRouteEditor(ui: Ui): void {
  const r = ui.routing!;
  const train = ui.game.train(r.trainId);
  if (!train) return;
  const owned = train.owned.passengerCars + train.owned.freightCars;
  const n = r.stops.length;
  const acts: Record<string, () => void> = {
    cancel: () => cancelRouting(ui),
    add: () => {
      r.picker = r.picker === n ? null : n;
      ui.renderSheet();
    },
    'close-picker': () => {
      r.picker = null;
      ui.renderSheet();
    },
    save: () => saveRoute(ui),
  };
  const dups = duplicateStops(r.stops);
  const edit = (fn: () => void) => () => {
    fn();
    r.error = null;
    ui.renderSheet();
    ui.renderRoster();
    ui.requestDraw();
  };
  const swap = (i: number, j: number) => {
    [r.stops[i], r.stops[j]] = [r.stops[j]!, r.stops[i]!];
    [r.orders[i], r.orders[j]] = [r.orders[j] ?? null, r.orders[i] ?? null];
  };
  const small = (act: string, label: string, aria: string, disabled = false) =>
    `<button type="button" class="mini" data-act="${act}" aria-label="${aria}"${disabled ? ' disabled' : ''}>${label}</button>`;
  const pickerHtml = (at: number): string => {
    const prev = r.stops[(at - 1 + n) % n];
    const next = r.stops[at % n];
    let h = '<div class="picker" role="group" aria-label="Choose a station to insert">';
    [...ui.game.stations.values()].forEach((st, k) => {
      const clash = (prev && n > 0 && sameCoord(prev, st.at)) || (next && n > 0 && sameCoord(next, st.at));
      acts[`pick-${k}`] = () => {
        if (clash) return;
        r.stops.splice(at, 0, { ...st.at });
        r.orders.splice(at, 0, null);
        r.picker = null;
        r.error = null;
        ui.renderSheet();
        ui.renderRoster();
        ui.requestDraw();
      };
      h += `<button type="button" class="segbtn" data-act="pick-${k}"${clash ? ' disabled' : ''}>${stationNameAt(ui, st.at)}</button>`;
    });
    return h + `<button type="button" class="mini txt" data-act="close-picker">Close</button></div>`;
  };
  const slot = (at: number, label: string): string =>
    r.picker === at
      ? pickerHtml(at)
      : `<button type="button" class="insertslot" data-act="ins-${at}" aria-label="${label}"><span>+</span></button>`;
  let list = '';
  r.stops.forEach((c, i) => {
    const name = stationNameAt(ui, c);
    acts[`ins-${i}`] = () => {
      r.picker = i;
      ui.renderSheet();
    };
    const o = r.orders[i] ?? null;
    acts[`up-${i}`] = edit(() => swap(i, i - 1));
    acts[`down-${i}`] = edit(() => swap(i, i + 1));
    acts[`rm-${i}`] = edit(() => {
      r.stops.splice(i, 1);
      r.orders.splice(i, 1);
    });
    acts[`keep-${i}`] = edit(() => {
      r.orders[i] = null;
    });
    acts[`split-${i}`] = edit(() => {
      r.orders[i] = { ...train.owned };
    });
    acts[`none-${i}`] = edit(() => {
      r.orders[i] = { passengerCars: 0, freightCars: 0 };
    });
    // Any mix up to the cars the train owns; the rest ride along as spares.
    const set = (p: number, f: number) =>
      edit(() => {
        const q = Math.max(0, Math.min(owned, p));
        r.orders[i] = { passengerCars: q, freightCars: Math.max(0, Math.min(owned - q, f)) };
      });
    const op = o?.passengerCars ?? 0;
    const of = o?.freightCars ?? 0;
    acts[`p--${i}`] = set(op - 1, of);
    acts[`p+-${i}`] = set(op + 1, of);
    acts[`f--${i}`] = set(op, of - 1);
    acts[`f+-${i}`] = set(op, of + 1);
    let cars: string;
    if (owned === 0) cars = '<div class="sub">This train has no cars to arrange.</div>';
    else {
      cars =
        `<div class="seg" role="group" aria-label="Cars at ${name}">` +
        `<button type="button" class="segbtn${o ? '' : ' on'}" data-act="keep-${i}" aria-pressed="${!o}">Keep cars</button>` +
        `<button type="button" class="segbtn${o ? ' on' : ''}" data-act="split-${i}" aria-pressed="${!!o}">Set cars here</button></div>`;
      const none = !!o && o.passengerCars + o.freightCars === 0;
      if (o) {
        const st = (label: string, dnAct: string, upAct: string, n2: number, dn: boolean, up: boolean) =>
          `<div class="stepper"><span>${label}</span><span class="ctl">` +
          `<button type="button" data-act="${dnAct}-${i}" aria-label="Fewer ${label} at ${name}"${dn ? '' : ' disabled'}>−</button>` +
          `<output>${n2}</output>` +
          `<button type="button" data-act="${upAct}-${i}" aria-label="More ${label} at ${name}"${up ? '' : ' disabled'}>+</button></span></div>`;
        const room = o.passengerCars + o.freightCars < owned;
        const spare = owned - o.passengerCars - o.freightCars;
        cars +=
          st('Passenger', 'p-', 'p+', o.passengerCars, o.passengerCars > 0, room) +
          st('Freight', 'f-', 'f+', o.freightCars, o.freightCars > 0, room) +
          `<div class="sub">${none ? 'The locomotive runs alone from here.' : spare > 0 ? `${spare} spare car${spare === 1 ? '' : 's'} ride along uncoupled.` : 'All cars coupled.'}` +
          (none ? '' : ` <button type="button" class="mini txt" data-act="none-${i}">No cars</button>`) +
          '</div>';
      }
    }
    list +=
      `<div class="stoprow${dups.has(i) ? ' clash' : ''}" data-row="${i}">` +
      slot(i, `Insert a stop before ${name}`) +
      `<div class="stoptop"><span class="grip" data-grip="${i}" aria-hidden="true">⠿</span><b>${i + 1}. ${name}</b><span class="minis">` +
      small(`up-${i}`, '↑', `Move ${name} up`, i === 0) +
      small(`down-${i}`, '↓', `Move ${name} down`, i === n - 1) +
      small(`rm-${i}`, '✕', `Remove ${name}`) +
      `</span></div>${cars}</div>`;
  });
  ui.setSheet(
    `<div class="sheet-title">Route for ${trainName(ui, train)}</div>` +
      `<div class="editor-scroll">` +
      (n ? list : '<div class="sub">No stops yet. Add at least two stations.</div>') +
      (r.picker === n && n > 0 ? pickerHtml(n) : '') +
      `<button type="button" class="btn addstop" data-act="add">Add stop</button></div>` +
      `<div class="sub">${n < 2 ? 'A route needs at least two stops.' : 'Drag ⠿ to reorder, tap + to insert, or tap a station on the map to add it at the end.'}</div>` +
      (dups.size
        ? `<div class="warn">Neighbouring stops are the same station: ${[...dups]
            .sort((a, b) => a - b)
            .map((i) => `${i + 1}. ${stationNameAt(ui, r.stops[i]!)}`)
            .join(', ')}. The route loops, so last and first count too.</div>`
        : '') +
      (r.error ? `<div class="err">${humanError(r.error)}</div>` : '') +
      `<div class="btns">${btn('cancel', 'Cancel')}${btn('save', 'Save route', 'primary', n < 2 || dups.size > 0)}</div>`,
    acts,
    true,
  );
}
/** Indices of stops that equal the next stop (the route loops, so last -> first counts). */
export function duplicateStops(stops: Coord[]): Set<number> {
  const out = new Set<number>();
  const n = stops.length;
  if (n < 2) return out;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (i !== j && sameCoord(stops[i]!, stops[j]!)) {
      out.add(i);
      out.add(j);
    }
  }
  return out;
}
export function moveStop(ui: Ui, from: number, to: number): void {
  const r = ui.routing;
  if (!r || from === to) return;
  const [c] = r.stops.splice(from, 1);
  const [o] = r.orders.splice(from, 1);
  r.stops.splice(to, 0, c!);
  r.orders.splice(to, 0, o ?? null);
  r.error = null;
  r.picker = null;
}
export const dragApply = (d: DragState): void => {
  const dy = d.clientY - d.startY + (d.sc.scrollTop - d.startScroll);
  const mid = d.centers[d.from]! + dy;
  let to = 0;
  d.centers.forEach((c, j) => {
    if (j !== d.from && c < mid) to++;
  });
  d.to = to;
  const h = d.heights[d.from]!;
  d.rows.forEach((row, j) => {
    if (j === d.from) {
      row.style.transform = `translateY(${dy}px)`;
      return;
    }
    let shift = 0;
    if (to > d.from && j > d.from && j <= to) shift = -h;
    else if (to < d.from && j >= to && j < d.from) shift = h;
    row.style.transform = shift ? `translateY(${shift}px)` : '';
  });
};
export const dragTick = (ui: Ui): void => {
  const d = ui.drag;
  if (!d) return;
  const rect = d.sc.getBoundingClientRect();
  const edge = 48;
  let v = 0;
  if (d.clientY < rect.top + edge) v = -Math.ceil(((rect.top + edge - d.clientY) / edge) * 14);
  else if (d.clientY > rect.bottom - edge) v = Math.ceil(((d.clientY - (rect.bottom - edge)) / edge) * 14);
  if (v) {
    d.sc.scrollTop += v;
    dragApply(d);
  }
  d.raf = requestAnimationFrame(() => dragTick(ui));
};
export const dragEnd = (ui: Ui, commit: boolean): void => {
  const d = ui.drag;
  if (!d) return;
  ui.drag = null;
  cancelAnimationFrame(d.raf);
  ui.dragStop = null;
  if (commit && d.to !== d.from) {
    moveStop(ui, d.from, d.to);
    ui.renderSheet();
    ui.renderRoster();
  } else {
    d.rows.forEach((row) => {
      row.style.transform = '';
      row.classList.remove('lifted', 'dragging-row');
    });
    d.sc.classList.remove('dragging');
  }
  ui.requestDraw();
};

export function initRouteDrag(ui: Ui): void {
  ui.sheetMsg.addEventListener('pointerdown', (e) => {
    const grip = (e.target as HTMLElement).closest<HTMLElement>('[data-grip]');
    if (!grip || !ui.routing || ui.routing.picking || ui.drag) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const sc = ui.sheetMsg.querySelector<HTMLElement>('.editor-scroll');
    if (!sc) return;
    e.preventDefault();
    const rows = [...sc.querySelectorAll<HTMLElement>('.stoprow')];
    const sr = sc.getBoundingClientRect();
    const from = Number(grip.dataset.grip);
    if (!rows[from]) return;
    grip.setPointerCapture(e.pointerId);
    ui.drag = {
      pid: e.pointerId,
      from,
      to: from,
      startY: e.clientY,
      clientY: e.clientY,
      startScroll: sc.scrollTop,
      sc,
      rows,
      centers: rows.map((row) => {
        const b = row.getBoundingClientRect();
        return b.top - sr.top + sc.scrollTop + b.height / 2;
      }),
      heights: rows.map((row) => row.offsetHeight),
      raf: 0,
    };
    sc.classList.add('dragging');
    rows[from].classList.add('lifted');
    ui.dragStop = from;
    ui.requestDraw();
    ui.drag.raf = requestAnimationFrame(() => dragTick(ui));
  });
  ui.sheetMsg.addEventListener('pointermove', (e) => {
    if (!ui.drag || e.pointerId !== ui.drag.pid) return;
    ui.drag.clientY = e.clientY;
    dragApply(ui.drag);
  });
  ui.sheetMsg.addEventListener('pointerup', (e) => {
    if (ui.drag && e.pointerId === ui.drag.pid) dragEnd(ui, true);
  });
  ui.sheetMsg.addEventListener('pointercancel', (e) => {
    if (ui.drag && e.pointerId === ui.drag.pid) dragEnd(ui, false);
  });
}
