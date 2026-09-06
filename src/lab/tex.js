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
