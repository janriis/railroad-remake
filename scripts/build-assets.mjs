/* global console, Buffer */
// Builds src/ui/assets/atlas.png + atlas.json from assets/raw/*.png (gitignored GPT Image output).
// Terrain: 64x64, made seamless when opposite edges disagree. Sprites: halo removed, 1px dark rim,
// trimmed, fitted into 128px. Run with `npm run assets`.
import { readdirSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import sharp from 'sharp';

const RAW = 'assets/raw';
const OUT = 'src/ui/assets';
const TERRAIN_PX = 64;
const SPRITE_PX = 128;
const ATLAS_W = 512;
const PAD = 1;
const RIM = [38, 30, 26];
/** Opposite-edge difference relative to normal neighbour difference above which we blend. */
const SEAM_RATIO = 1.5;

const files = readdirSync(RAW)
  .filter((f) => f.endsWith('.png'))
  .sort();
const frames = [];
const report = [];

async function rawRgba(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: Buffer.from(data), w: info.width, h: info.height };
}

function seamStats(d, w, h) {
  let edge = 0;
  let inner = 0;
  let n = 0;
  for (let i = 0; i < h; i++)
    for (let c = 0; c < 3; c++) {
      edge += Math.abs(d[i * w * 4 + c] - d[(i * w + w - 1) * 4 + c]);
      inner += Math.abs(d[(i * w + (w >> 1)) * 4 + c] - d[(i * w + (w >> 1) + 1) * 4 + c]);
      n++;
    }
  for (let i = 0; i < w; i++)
    for (let c = 0; c < 3; c++) {
      edge += Math.abs(d[i * 4 + c] - d[((h - 1) * w + i) * 4 + c]);
      inner += Math.abs(d[((h >> 1) * w + i) * 4 + c] - d[(((h >> 1) + 1) * w + i) * 4 + c]);
      n++;
    }
  edge /= n;
  inner /= n;
  return { edge, inner, ratio: edge / Math.max(inner, 0.5) };
}

/** Offset-blend: border bands come from the half-shifted image, whose own borders are adjacent pixels. */
function makeSeamless(d, w, h) {
  const out = Buffer.from(d);
  const band = 0.3; // fraction of the tile per side that is blended
  const ramp = (t) => {
    // t in [0,1] distance from edge as a fraction; 0 at edge -> 0, >=band -> 1
    const k = Math.min(1, t / band);
    return k * k * (3 - 2 * k);
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = Math.min(x, w - 1 - x) / w;
      const dy = Math.min(y, h - 1 - y) / h;
      const wt = ramp(dx) * ramp(dy);
      const sx = (x + (w >> 1)) % w;
      const sy = (y + (h >> 1)) % h;
      for (let c = 0; c < 3; c++)
        out[(y * w + x) * 4 + c] = Math.round(
          d[(y * w + x) * 4 + c] * wt + d[(sy * w + sx) * 4 + c] * (1 - wt),
        );
    }
  return out;
}

async function terrain(file) {
  const name = file.replace('.png', '');
  const { data } = await sharp(`${RAW}/${file}`)
    .resize(TERRAIN_PX, TERRAIN_PX, { kernel: 'lanczos3' })
    .removeAlpha()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let d = Buffer.from(data);
  const before = seamStats(d, TERRAIN_PX, TERRAIN_PX);
  let how = 'untouched';
  if (before.ratio > SEAM_RATIO) {
    d = makeSeamless(d, TERRAIN_PX, TERRAIN_PX);
    how = 'offset-blended';
  }
  const after = seamStats(d, TERRAIN_PX, TERRAIN_PX);
  report.push(`${name}: ${how} (edge/inner ratio ${before.ratio.toFixed(2)} -> ${after.ratio.toFixed(2)})`);
  frames.push({ name, w: TERRAIN_PX, h: TERRAIN_PX, data: d, extrude: true });
}

async function sprite(file) {
  const name = file.replace('.png', '');
  const { data, w, h } = await rawRgba(`${RAW}/${file}`);
  // Kill the glow: drop faint alpha, stretch the rest so the edge is crisp.
  const LO = 110;
  const HI = 200;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    data[i] = a <= LO ? 0 : a >= HI ? 255 : Math.round(((a - LO) / (HI - LO)) * 255);
  }
  const trimmed = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .png()
    .toBuffer();
  const resized = await sharp(trimmed)
    .resize(SPRITE_PX - 2, SPRITE_PX - 2, { fit: 'inside', kernel: 'lanczos3' })
    .extend({ top: 1, bottom: 1, left: 1, right: 1, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rw = resized.info.width;
  const rh = resized.info.height;
  const d = resized.data;
  // 1px rim: transparent pixels next to a mostly-opaque pixel get the rim colour; partial-alpha edge
  // pixels are composited over the rim so no light fringe survives.
  const out = Buffer.from(d);
  const A = (x, y) => (x < 0 || y < 0 || x >= rw || y >= rh ? 0 : d[(y * rw + x) * 4 + 3]);
  for (let y = 0; y < rh; y++)
    for (let x = 0; x < rw; x++) {
      const i = (y * rw + x) * 4;
      const a = d[i + 3];
      if (a >= 250) continue;
      const near = Math.max(
        A(x - 1, y),
        A(x + 1, y),
        A(x, y - 1),
        A(x, y + 1),
        A(x - 1, y - 1),
        A(x + 1, y - 1),
        A(x - 1, y + 1),
        A(x + 1, y + 1),
      );
      if (near < 128 && a === 0) continue;
      const ra = Math.max(a, near >= 128 ? 255 : 0) / 255;
      const sa = a / 255;
      for (let c = 0; c < 3; c++) out[i + c] = Math.round(d[i + c] * sa + RIM[c] * (1 - sa));
      out[i + 3] = Math.round(ra * 255 * (near >= 128 || a > 0 ? 1 : 0));
      if (a === 0 && near >= 128) out[i + 3] = 200;
    }
  frames.push({ name, w: rw, h: rh, data: out, extrude: false });
  report.push(`${name}: sprite ${rw}x${rh}`);
}

for (const f of files) {
  if (f.startsWith('terrain-')) await terrain(f);
  else await sprite(f);
}

// Shelf packing, tallest first.
frames.sort((a, b) => b.h - a.h || a.name.localeCompare(b.name));
let x = PAD;
let y = PAD;
let rowH = 0;
for (const f of frames) {
  const pw = f.w + PAD * 2;
  if (x + pw > ATLAS_W) {
    x = PAD;
    y += rowH + PAD * 2;
    rowH = 0;
  }
  f.x = x + 0;
  f.y = y;
  x += pw;
  rowH = Math.max(rowH, f.h);
}
const atlasH = y + rowH + PAD;
const atlas = Buffer.alloc(ATLAS_W * atlasH * 4);
const put = (px, py, r, g, b, a) => {
  const i = (py * ATLAS_W + px) * 4;
  atlas[i] = r;
  atlas[i + 1] = g;
  atlas[i + 2] = b;
  atlas[i + 3] = a;
};
for (const f of frames) {
  for (let yy = 0; yy < f.h; yy++)
    for (let xx = 0; xx < f.w; xx++) {
      const i = (yy * f.w + xx) * 4;
      put(f.x + xx, f.y + yy, f.data[i], f.data[i + 1], f.data[i + 2], f.data[i + 3]);
    }
  if (f.extrude) {
    // Repeat the opposite edge into the padding so scaled sampling wraps like a tile.
    for (let k = 0; k < f.w; k++) {
      const top = ((f.h - 1) * f.w + k) * 4;
      const bot = k * 4;
      put(f.x + k, f.y - 1, f.data[top], f.data[top + 1], f.data[top + 2], 255);
      put(f.x + k, f.y + f.h, f.data[bot], f.data[bot + 1], f.data[bot + 2], 255);
    }
    for (let k = 0; k < f.h; k++) {
      const l = (k * f.w + f.w - 1) * 4;
      const r = k * f.w * 4;
      put(f.x - 1, f.y + k, f.data[l], f.data[l + 1], f.data[l + 2], 255);
      put(f.x + f.w, f.y + k, f.data[r], f.data[r + 1], f.data[r + 2], 255);
    }
  }
}
mkdirSync(OUT, { recursive: true });
await sharp(atlas, { raw: { width: ATLAS_W, height: atlasH, channels: 4 } })
  .png({ palette: true, quality: 90, effort: 10, colours: 256, dither: 0.6 })
  .toFile(`${OUT}/atlas.png`);
const json = { width: ATLAS_W, height: atlasH, frames: {} };
for (const f of frames.sort((a, b) => a.name.localeCompare(b.name)))
  json.frames[f.name] = { x: f.x, y: f.y, w: f.w, h: f.h };
writeFileSync(`${OUT}/atlas.json`, JSON.stringify(json, null, 1) + '\n');
console.log(report.join('\n'));
console.log(`atlas ${ATLAS_W}x${atlasH}, ${(statSync(`${OUT}/atlas.png`).size / 1024).toFixed(1)} KiB`);
