import * as THREE from 'three';
import { mulberry32 } from '../game/state.js';

// Small painting helpers shared by the lab styles.
export function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function toTex(c, { repeat = true, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function hsl(h, s, l, a = 1) { return `hsla(${h},${s}%,${l}%,${a})`; }

// gouache: short overlapping strokes with hue and value drift
export function brushTex({ h, s, l, drift = 8, strokes = 420, size = 256, seed = 1, len = 26, wid = 9, alpha = 0.55 }) {
  const c = canvas(size), ctx = c.getContext('2d'), rnd = mulberry32(seed);
  ctx.fillStyle = hsl(h, s, l); ctx.fillRect(0, 0, size, size);
  ctx.lineCap = 'round';
  for (let i = 0; i < strokes; i++) {
    const x = rnd() * size, y = rnd() * size, a = (rnd() - 0.5) * 0.9 + 0.3;
    ctx.strokeStyle = hsl(h + (rnd() - 0.5) * drift * 1.5, s + (rnd() - 0.5) * 12, l + (rnd() - 0.5) * drift, alpha);
    ctx.lineWidth = wid * (0.6 + rnd() * 0.8);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len * (0.5 + rnd()), y + Math.sin(a) * len * (0.5 + rnd())); ctx.stroke();
    // wrap strokes near edges for tiling
    if (x < 40) { ctx.beginPath(); ctx.moveTo(x + size, y); ctx.lineTo(x + size + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke(); }
    if (y < 40) { ctx.beginPath(); ctx.moveTo(x, y + size); ctx.lineTo(x + Math.cos(a) * len, y + size + Math.sin(a) * len); ctx.stroke(); }
  }
  return toTex(c);
}

// paper fibre: near-white with faint fibres and specks
export function paperTex({ size = 256, seed = 2, tone = '#f7f2e6' } = {}) {
  const c = canvas(size), ctx = c.getContext('2d'), rnd = mulberry32(seed);
  ctx.fillStyle = tone; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 900; i++) {
    ctx.strokeStyle = `rgba(120,100,70,${0.04 + rnd() * 0.06})`; ctx.lineWidth = 1;
    const x = rnd() * size, y = rnd() * size, a = rnd() * 6.3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6); ctx.stroke();
  }
  for (let i = 0; i < 200; i++) { ctx.fillStyle = `rgba(90,70,50,${0.05 + rnd() * 0.08})`; ctx.fillRect(rnd() * size, rnd() * size, 1, 1); }
  return toTex(c);
}

// clay: soft mottle plus a normal map of fingerprints and dents
export function clayMaps({ size = 256, seed = 3 } = {}) {
  const rnd = mulberry32(seed);
  const h = new Float32Array(size * size);
  // low-frequency dents
  for (let k = 0; k < 40; k++) {
    const cx = rnd() * size, cy = rnd() * size, r = 12 + rnd() * 30, d = (rnd() - 0.5) * 0.8;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = Math.min(Math.abs(x - cx), size - Math.abs(x - cx)), dy = Math.min(Math.abs(y - cy), size - Math.abs(y - cy));
      const q = 1 - Math.min(1, Math.hypot(dx, dy) / r);
      h[y * size + x] += d * q * q;
    }
  }
  // fingerprint ridges: concentric arcs
  for (let k = 0; k < 6; k++) {
    const cx = rnd() * size, cy = rnd() * size, rot = rnd() * 3;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy; const d = Math.hypot(dx * 0.7, dy);
      if (d > 45) continue;
      h[y * size + x] += 0.12 * Math.sin(d * 1.6 + rot) * (1 - d / 45);
    }
  }
  const col = canvas(size), cctx = col.getContext('2d'), img = cctx.createImageData(size, size);
  const nrm = canvas(size), nctx = nrm.getContext('2d'), nimg = nctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x;
    const v = 235 + h[i] * 30 + (rnd() - 0.5) * 10;
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
    const hx = h[((y) * size + (x + 1) % size)] - h[y * size + (x + size - 1) % size];
    const hy = h[((y + 1) % size) * size + x] - h[((y + size - 1) % size) * size + x];
    const n = new THREE.Vector3(-hx * 2.5, -hy * 2.5, 1).normalize();
    nimg.data[i * 4] = (n.x * 0.5 + 0.5) * 255; nimg.data[i * 4 + 1] = (n.y * 0.5 + 0.5) * 255; nimg.data[i * 4 + 2] = (n.z * 0.5 + 0.5) * 255; nimg.data[i * 4 + 3] = 255;
  }
  cctx.putImageData(img, 0, 0); nctx.putImageData(nimg, 0, 0);
  return { map: toTex(col), normalMap: toTex(nrm, { srgb: false }) };
}

// three-step gradient for toon shading
export function toonRamp(steps = [0.35, 0.7, 1.0]) {
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v * 255; data[i * 4 + 3] = 255; });
  const t = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true;
  return t;
}

// low-frequency vertex noise for "handmade" surfaces
export function dent(geometry, amount = 0.03, freq = 1.7) {
  const pos = geometry.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    pos.setXYZ(i, x + amount * Math.sin(y * freq + z * 2.1), y + amount * 0.6 * Math.sin(x * 2.3 + z * 1.1), z + amount * Math.sin(x * 1.9 + y * 1.3));
  }
  geometry.computeVertexNormals();
  return geometry;
}

// ---------------------------------------------------------------- weathered, relief-bearing materials
// Each returns { map, normalMap, roughnessMap? } from an albedo canvas and a height field.
export function heightToNormal(h, size, strength = 2.5) {
  const c = canvas(size), ctx = c.getContext('2d'), img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x;
    const hx = h[y * size + (x + 1) % size] - h[y * size + (x + size - 1) % size];
    const hy = h[((y + 1) % size) * size + x] - h[((y + size - 1) % size) * size + x];
    const n = new THREE.Vector3(-hx * strength, -hy * strength, 1).normalize();
    img.data[i * 4] = (n.x * 0.5 + 0.5) * 255; img.data[i * 4 + 1] = (n.y * 0.5 + 0.5) * 255; img.data[i * 4 + 2] = (n.z * 0.5 + 0.5) * 255; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return toTex(c, { srgb: false });
}
function valueNoise(size, cells, rnd) {
  const g = new Float32Array(cells * cells); for (let i = 0; i < g.length; i++) g[i] = rnd();
  const out = new Float32Array(size * size), sm = t => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const fx = x / size * cells, fy = y / size * cells, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = sm(fx - x0), ty = sm(fy - y0), x1 = (x0 + 1) % cells, y1 = (y0 + 1) % cells;
    out[y * size + x] = (g[y0 * cells + x0] * (1 - tx) + g[y0 * cells + x1] * tx) * (1 - ty) + (g[y1 * cells + x0] * (1 - tx) + g[y1 * cells + x1] * tx) * ty;
  }
  return out;
}
function fbm(size, rnd, oct = [4, 8, 16, 32, 64], w = [0.45, 0.25, 0.15, 0.1, 0.05]) {
  const out = new Float32Array(size * size); let tw = 0;
  oct.forEach((c, i) => { const f = valueNoise(size, c, rnd); for (let j = 0; j < out.length; j++) out[j] += f[j] * w[i]; tw += w[i]; });
  for (let j = 0; j < out.length; j++) out[j] /= tw; return out;
}

// limewashed plaster: warm, patchy, streaked under the sills, hairline cracks, crumbling to show brick at the base
export function plasterMaps({ size = 512, seed = 21, hue = 38, sat = 30, light = 82 } = {}) {
  const rnd = mulberry32(seed), c = canvas(size), ctx = c.getContext('2d');
  const n = fbm(size, rnd), h = new Float32Array(size * size);
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const l = light - 10 + n[i] * 16;
    const [r, g, b] = hslRgb(hue + (n[i] - 0.5) * 8, sat, l);
    img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
    h[i] = n[i] * 0.6;
  }
  ctx.putImageData(img, 0, 0);
  // stains: rain streaks and damp blooms
  for (let k = 0; k < 18; k++) {
    const x = rnd() * size, y = rnd() * size, w = 4 + rnd() * 18, len = 60 + rnd() * 200;
    const g = ctx.createLinearGradient(0, y, 0, y + len); g.addColorStop(0, `rgba(90,70,40,${0.18 + rnd() * 0.18})`); g.addColorStop(1, 'rgba(90,70,40,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, len);
  }
  for (let k = 0; k < 10; k++) { const x = rnd() * size, y = rnd() * size, r = 30 + rnd() * 80; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(70,80,60,${0.12 + rnd() * 0.15})`); g.addColorStop(1, 'rgba(70,80,60,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  // hairline cracks
  ctx.strokeStyle = 'rgba(60,45,30,0.55)'; ctx.lineWidth = 1;
  for (let k = 0; k < 14; k++) { let x = rnd() * size, y = rnd() * size; ctx.beginPath(); ctx.moveTo(x, y); for (let s = 0; s < 12; s++) { x += (rnd() - 0.5) * 30; y += 8 + rnd() * 14; ctx.lineTo(x, y); const xi = Math.floor(((x % size) + size) % size), yi = Math.floor(((y % size) + size) % size); h[yi * size + xi] -= 0.6; } ctx.stroke(); }
  // flaking patches showing brick underneath
  for (let k = 0; k < 5; k++) {
    const x = rnd() * size, y = size * 0.6 + rnd() * size * 0.4, w = 30 + rnd() * 60, hh = 20 + rnd() * 40;
    ctx.fillStyle = 'rgba(160,95,70,0.9)'; ctx.beginPath(); for (let a = 0; a < 6.3; a += 0.5) ctx.lineTo(x + Math.cos(a) * w * (0.7 + rnd() * 0.4), y + Math.sin(a) * hh * (0.7 + rnd() * 0.4)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(235,225,205,0.6)'; ctx.lineWidth = 1.5; for (let r = 0; r < hh; r += 8) { ctx.beginPath(); ctx.moveTo(x - w, y - hh / 2 + r); ctx.lineTo(x + w, y - hh / 2 + r); ctx.stroke(); }
  }
  return { map: toTex(c), normalMap: heightToNormal(h, size, 1.6) };
}

// rubble stone: irregular courses, deep mortar joints, lichen
export function rubbleMaps({ size = 512, seed = 22 } = {}) {
  const rnd = mulberry32(seed), c = canvas(size), ctx = c.getContext('2d');
  const h = new Float32Array(size * size).fill(0.1);
  ctx.fillStyle = '#9b8f7c'; ctx.fillRect(0, 0, size, size); // mortar
  const rows = 7, rowH = size / rows;
  for (let r = 0; r < rows; r++) {
    let x = -rnd() * 40;
    const y0 = r * rowH + (rnd() - 0.5) * 6;
    while (x < size + 10) {
      const w = 40 + rnd() * 70, hh = rowH * (0.8 + rnd() * 0.25), g = 4 + rnd() * 3;
      const [cr, cg, cb] = hslRgb(30 + rnd() * 30, 8 + rnd() * 12, 52 + rnd() * 20);
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.beginPath(); const px = x + g, py = y0 + g, pw = w - g * 2, ph = hh - g * 2;
      ctx.moveTo(px + 4, py); ctx.lineTo(px + pw - 3, py + 1); ctx.lineTo(px + pw, py + ph - 4); ctx.lineTo(px + 2, py + ph); ctx.closePath(); ctx.fill();
      // tool marks and lichen
      for (let k = 0; k < 8; k++) { ctx.fillStyle = `rgba(40,35,30,${0.08 + rnd() * 0.12})`; ctx.fillRect(px + rnd() * pw, py + rnd() * ph, 2 + rnd() * 8, 1); }
      if (rnd() < 0.35) { ctx.fillStyle = `rgba(150,170,90,${0.25 + rnd() * 0.3})`; ctx.beginPath(); ctx.arc(px + rnd() * pw, py + rnd() * ph, 3 + rnd() * 8, 0, 7); ctx.fill(); }
      // height: block raised, edges rounded
      for (let yy = Math.max(0, Math.floor(py)); yy < Math.min(size, py + ph); yy++) for (let xx = Math.max(0, Math.floor(px)); xx < Math.min(size, px + pw); xx++) {
        const ex = Math.min(xx - px, px + pw - xx), ey = Math.min(yy - py, py + ph - yy);
        h[yy * size + xx] = 0.5 + 0.5 * Math.min(1, Math.min(ex, ey) / 6) + (rnd() - 0.5) * 0.05;
      }
      x += w;
    }
  }
  return { map: toTex(c), normalMap: heightToNormal(h, size, 3.0) };
}

// clay roof tiles: overlapping courses, each tile with a rounded lower edge, moss in the valleys
export function tileMaps({ size = 512, seed = 23, hue = 215, sat = 30, light = 34 } = {}) {
  const rnd = mulberry32(seed), c = canvas(size), ctx = c.getContext('2d');
  const h = new Float32Array(size * size);
  ctx.fillStyle = '#1e2430'; ctx.fillRect(0, 0, size, size);
  const rows = 10, tw = 52, th = size / rows;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * tw / 2;
    for (let i = -1; i <= size / tw + 1; i++) {
      const x = i * tw + off + (rnd() - 0.5) * 3, y = r * th + (rnd() - 0.5) * 2;
      const [cr, cg, cb] = hslRgb(hue + (rnd() - 0.5) * 14, sat + (rnd() - 0.5) * 12, light + (rnd() - 0.5) * 16);
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.beginPath(); ctx.moveTo(x + 1, y); ctx.lineTo(x + tw - 1, y); ctx.lineTo(x + tw - 1, y + th * 1.15 - 8); ctx.quadraticCurveTo(x + tw / 2, y + th * 1.15 + 4, x + 1, y + th * 1.15 - 8); ctx.closePath(); ctx.fill();
      // weathering: pale mineral streaks and moss near the lower edge
      ctx.fillStyle = `rgba(200,210,220,${rnd() * 0.12})`; ctx.fillRect(x + 4, y + 4, tw - 8, 2);
      if (rnd() < 0.3) { ctx.fillStyle = `rgba(120,140,70,${0.2 + rnd() * 0.3})`; ctx.beginPath(); ctx.arc(x + rnd() * tw, y + th * 0.9, 3 + rnd() * 6, 0, 7); ctx.fill(); }
      for (let yy = Math.max(0, Math.floor(y)); yy < Math.min(size, y + th * 1.15); yy++) for (let xx = Math.max(0, Math.floor(x)); xx < Math.min(size, x + tw); xx++) {
        const f = (yy - y) / (th * 1.15);
        const curl = 1 - Math.pow(Math.abs((xx - x) / tw - 0.5) * 2, 3) * 0.3;
        const v = (0.35 + f * 0.65) * curl;
        h[yy * size + xx] = Math.max(h[yy * size + xx], v);
      }
    }
  }
  return { map: toTex(c), normalMap: heightToNormal(h, size, 4.0) };
}

// oak: long grain, a knot or two, silvered with age
export function oakMaps({ size = 256, seed = 24, light = 30 } = {}) {
  const rnd = mulberry32(seed), c = canvas(size), ctx = c.getContext('2d');
  const h = new Float32Array(size * size);
  const img = ctx.createImageData(size, size);
  const n = fbm(size, rnd, [2, 6, 40], [0.5, 0.3, 0.2]);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x;
    const grain = Math.sin((x * 0.09 + n[i] * 6) * 3.1) * 0.5 + 0.5;
    const l = light - 6 + grain * 10 + (n[i] - 0.5) * 10;
    const [r, g, b] = hslRgb(26 + (n[i] - 0.5) * 8, 30 - grain * 8, l);
    img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
    h[i] = grain * 0.5;
  }
  ctx.putImageData(img, 0, 0);
  for (let k = 0; k < 3; k++) { const x = rnd() * size, y = rnd() * size; for (let r = 12; r > 0; r -= 2) { ctx.strokeStyle = `rgba(40,25,15,${0.35})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, r * 0.6, r, 0, 0, 7); ctx.stroke(); } }
  return { map: toTex(c), normalMap: heightToNormal(h, size, 1.2) };
}

// cobbles: rounded setts in a sandy bed, worn tops, weeds in the joints
export function cobbleMaps({ size = 512, seed = 25 } = {}) {
  const rnd = mulberry32(seed), c = canvas(size), ctx = c.getContext('2d');
  const h = new Float32Array(size * size);
  ctx.fillStyle = '#8a7d66'; ctx.fillRect(0, 0, size, size);
  const cell = 34;
  for (let y = -1; y <= size / cell + 1; y++) for (let x = -1; x <= size / cell + 1; x++) {
    const cx = x * cell + cell / 2 + (y % 2) * cell / 2 + (rnd() - 0.5) * 6, cy = y * cell + cell / 2 + (rnd() - 0.5) * 6;
    const rx = cell * 0.46 + rnd() * 3, ry = cell * 0.4 + rnd() * 3, rot = (rnd() - 0.5) * 0.6;
    const [cr, cg, cb] = hslRgb(30 + rnd() * 20, 8 + rnd() * 12, 44 + rnd() * 22);
    ctx.fillStyle = `rgb(${cr},${cg},${cb})`; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, rot, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,245,225,0.14)'; ctx.beginPath(); ctx.ellipse(cx - 3, cy - 4, rx * 0.5, ry * 0.35, rot, 0, 7); ctx.fill();
    if (rnd() < 0.12) { ctx.fillStyle = `rgba(110,140,60,${0.4 + rnd() * 0.3})`; ctx.beginPath(); ctx.arc(cx + rx * 0.9, cy + ry * 0.8, 3 + rnd() * 4, 0, 7); ctx.fill(); }
    for (let yy = Math.max(0, Math.floor(cy - ry)); yy < Math.min(size, cy + ry); yy++) for (let xx = Math.max(0, Math.floor(cx - rx)); xx < Math.min(size, cx + rx); xx++) {
      const dx = (xx - cx) / rx, dy = (yy - cy) / ry, d = dx * dx + dy * dy;
      if (d < 1) h[yy * size + xx] = Math.max(h[yy * size + xx], Math.sqrt(1 - d) * 0.9 + 0.1);
    }
  }
  return { map: toTex(c), normalMap: heightToNormal(h, size, 3.5) };
}

// leaded glass: a diamond lattice of small quarries, some warped and darker
export function leadedGlassTex({ size = 256, seed = 26 } = {}) {
  const rnd = mulberry32(seed), c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#6d7f8a'; ctx.fillRect(0, 0, size, size);
  const s = 32;
  for (let y = 0; y < size; y += s) for (let x = 0; x < size; x += s) {
    const [r, g, b] = hslRgb(200 + rnd() * 20, 18 + rnd() * 14, 44 + rnd() * 24);
    ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.beginPath(); ctx.moveTo(x + s / 2, y); ctx.lineTo(x + s, y + s / 2); ctx.lineTo(x + s / 2, y + s); ctx.lineTo(x, y + s / 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(230,240,250,${rnd() * 0.25})`; ctx.beginPath(); ctx.moveTo(x + s / 2, y + 4); ctx.lineTo(x + s - 6, y + s / 2); ctx.lineTo(x + s / 2, y + s / 2); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 3;
  for (let y = -s; y <= size + s; y += s) { ctx.beginPath(); ctx.moveTo(-s, y); ctx.lineTo(size + s, y + size + s); ctx.stroke(); ctx.beginPath(); ctx.moveTo(size + s, y); ctx.lineTo(-s, y + size + s); ctx.stroke(); }
  return toTex(c);
}

// leaf cluster card with alpha: a sprig of overlapping leaves
export function leafCardTex({ size = 256, seed = 27, hue = 95 } = {}) {
  const rnd = mulberry32(seed), c = canvas(size), ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  for (let k = 0; k < 26; k++) {
    const x = size * 0.5 + (rnd() - 0.5) * size * 0.7, y = size * 0.5 + (rnd() - 0.5) * size * 0.7, a = rnd() * 6.3, len = 34 + rnd() * 30, wid = 12 + rnd() * 10;
    const [r, g, b] = hslRgb(hue + (rnd() - 0.5) * 24, 34 + rnd() * 20, 26 + rnd() * 22);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(wid, len * 0.4, 0, len); ctx.quadraticCurveTo(-wid, len * 0.4, 0, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(20,40,15,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, len - 3); ctx.stroke();
    ctx.restore();
  }
  const t = toTex(c, { repeat: false }); return t;
}

function hslRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360; s /= 100; l /= 100;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = (t + 1) % 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255].map(Math.round);
}
