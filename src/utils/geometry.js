export function curvyPath(x1, y1, x2, y2, curvature = 0.18, seed = 0) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const nx = -dy, ny = dx;
  const len = Math.hypot(nx, ny) || 1;
  const offset = curvature * (((seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 2;
  const cx = mx + (nx / len) * offset * len * 0.25;
  const cy = my + (ny / len) * offset * len * 0.25;
  return { d: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`, cx, cy };
}

export function bezierAt(x1, y1, cx, cy, x2, y2, t) {
  const mt = 1 - t;
  const x = mt * mt * x1 + 2 * mt * t * cx + t * t * x2;
  const y = mt * mt * y1 + 2 * mt * t * cy + t * t * y2;
  const tx = 2 * mt * (cx - x1) + 2 * t * (x2 - cx);
  const ty = 2 * mt * (cy - y1) + 2 * t * (y2 - cy);
  return { x, y, angle: Math.atan2(ty, tx) * 180 / Math.PI };
}

export function buildTrackGeo(tracks, cities) {
  return tracks.map((t, i) => {
    const a = cities.find(c => c.id === t.a);
    const b = cities.find(c => c.id === t.b);
    if (!a || !b) return null;
    const geo = curvyPath(a.x, a.y, b.x, b.y, 0.22, i + 3);
    return { ...t, ax: a.x, ay: a.y, bx: b.x, by: b.y, cx: geo.cx, cy: geo.cy, d: geo.d };
  }).filter(Boolean);
}
