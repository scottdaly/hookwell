import * as THREE from 'three';
import { mulberry32 } from '../game/state.js';

// Procedural "ink and wash" textures painted onto canvases.
// Every material in Hookwell comes from here so the surface language stays consistent.

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// tileable value noise
function noiseField(size, cells, rnd) {
  const g = new Float32Array(cells * cells);
  for (let i = 0; i < g.length; i++) g[i] = rnd();
  const out = new Float32Array(size * size);
  const sm = t => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const fx = x / size * cells, fy = y / size * cells;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = sm(fx - x0), ty = sm(fy - y0);
    const x1 = (x0 + 1) % cells, y1 = (y0 + 1) % cells;
    const a = g[y0 * cells + x0], b = g[y0 * cells + x1], c = g[y1 * cells + x0], d = g[y1 * cells + x1];
    out[y * size + x] = (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  }
  return out;
}
function fbm(size, rnd, octaves = [4, 8, 16, 32], weights = [0.5, 0.25, 0.15, 0.1]) {
  const out = new Float32Array(size * size);
  let tw = 0;
  octaves.forEach((c, i) => { const f = noiseField(size, c, rnd); for (let j = 0; j < out.length; j++) out[j] += f[j] * weights[i]; tw += weights[i]; });
  for (let j = 0; j < out.length; j++) out[j] /= tw;
  return out;
}

function hsl(h, s, l) { return `hsl(${h},${s}%,${l}%)`; }
function clamp01(v) { return Math.max(0, Math.min(1, v)); }

function tex(c, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// paint an fbm mottle over the canvas with the given hue/sat and lightness range
function mottle(ctx, size, rnd, { h, s, l0, l1, octaves, weights, alpha = 1 }) {
  const f = fbm(size, rnd, octaves, weights);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < size * size; i++) {
    const l = l0 + (l1 - l0) * f[i];
    const col = hslToRgb(h / 360, s / 100, l / 100);
    d[i * 4] = d[i * 4] * (1 - alpha) + col[0] * alpha;
    d[i * 4 + 1] = d[i * 4 + 1] * (1 - alpha) + col[1] * alpha;
    d[i * 4 + 2] = d[i * 4 + 2] * (1 - alpha) + col[2] * alpha;
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}
function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) r = g = b = l;
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => { t = (t + 1) % 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
    r = f(h + 1 / 3); g = f(h); b = f(h - 1 / 3);
  }
  return [r * 255, g * 255, b * 255];
}

// ---------------------------------------------------------------- materials' maps
export function plasterTex(seed = 1) {
  const S = 256, c = canvas(S, S), ctx = c.getContext('2d'), rnd = mulberry32(seed);
  ctx.fillStyle = '#f1e6cc'; ctx.fillRect(0, 0, S, S);
  mottle(ctx, S, rnd, { h: 40, s: 34, l0: 84, l1: 95, octaves: [3, 6, 12, 40], weights: [0.5, 0.3, 0.2, 0.15] });
  // limewash drips: faint vertical streaks
  for (let i = 0; i < 26; i++) {
    const x = rnd() * S, w = 1 + rnd() * 3, l = 20 + rnd() * 120;
    ctx.fillStyle = `rgba(120,90,50,${0.05 + rnd() * 0.07})`;
    ctx.fillRect(x, rnd() * S, w, l);
  }
  // speckle
  for (let i = 0; i < 350; i++) { ctx.fillStyle = `rgba(90,70,40,${0.08 + rnd() * 0.1})`; ctx.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 2, 1 + rnd() * 2); }
  return tex(c);
}

export function ashlarTex(seed = 2) {
  const S = 256, c = canvas(S, S), ctx = c.getContext('2d'), rnd = mulberry32(seed);
  ctx.fillStyle = '#e9e2cf'; ctx.fillRect(0, 0, S, S); // chalk joints
  const rows = 6, rowH = S / rows;
  for (let r = 0; r < rows; r++) {
    let x = (r % 2) * 22 + rnd() * 10 - 30;
    while (x < S + 20) {
      const w = 34 + rnd() * 30;
      const l = 55 + rnd() * 14, h = 34 + rnd() * 8, s = 16 + rnd() * 10;
      ctx.fillStyle = hsl(h, s, l);
      const y = r * rowH;
      const g = 2.2;
      roundRect(ctx, x + g, y + g, w - g * 2, rowH - g * 2, 2.5);
      ctx.fill();
      // block shading: darker lower edge, lighter top
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x + g, y + rowH - g - 4, w - g * 2, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(x + g, y + g, w - g * 2, 3);
      // tool marks
      for (let k = 0; k < 6; k++) { ctx.fillStyle = `rgba(60,50,40,${0.08 + rnd() * 0.08})`; ctx.fillRect(x + g + rnd() * (w - 8), y + g + rnd() * (rowH - 8), 2 + rnd() * 6, 1); }
      x += w;
    }
  }
  return tex(c);
}

export function roofTileTex(seed = 3, hue = 218) {
  const S = 256, c = canvas(S, S), ctx = c.getContext('2d'), rnd = mulberry32(seed);
  ctx.fillStyle = hsl(hue, 34, 22); ctx.fillRect(0, 0, S, S);
  const rows = 8, tw = 32, th = S / rows;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * tw / 2;
    for (let i = -1; i <= S / tw; i++) {
      const x = i * tw + off, y = r * th;
      const chipped = rnd() < 0.018;
      const l = chipped ? 56 : 34 + rnd() * 10, s = chipped ? 16 : 36 + rnd() * 10;
      const h = hue + (rnd() - 0.5) * 12;
      ctx.fillStyle = hsl(h, s, l);
      // tile with rounded lower edge
      ctx.beginPath();
      ctx.moveTo(x + 1, y);
      ctx.lineTo(x + tw - 1, y);
      ctx.lineTo(x + tw - 1, y + th - 6);
      ctx.quadraticCurveTo(x + tw / 2, y + th + 2, x + 1, y + th - 6);
      ctx.closePath(); ctx.fill();
      // glaze highlight
      const hl = ctx.createLinearGradient(0, y, 0, y + th);
      hl.addColorStop(0, `rgba(215,230,245,${0.16 + rnd() * 0.1})`); hl.addColorStop(0.45, 'rgba(215,230,245,0)');
      ctx.fillStyle = hl; ctx.fillRect(x + 2, y + 1, tw - 4, th - 4);
      // shadow under the course above
      ctx.fillStyle = 'rgba(0,0,10,0.2)';
      ctx.fillRect(x + 1, y, tw - 2, 2);
    }
  }
  return tex(c);
}

export function timberTex(seed = 4) {
  const S = 128, c = canvas(S, S), ctx = c.getContext('2d'), rnd = mulberry32(seed);
  ctx.fillStyle = '#4a3323'; ctx.fillRect(0, 0, S, S);
  mottle(ctx, S, rnd, { h: 22, s: 34, l0: 17, l1: 28, octaves: [2, 8, 32], weights: [0.5, 0.3, 0.2] });
  for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(20,10,5,${0.15 + rnd() * 0.2})`; ctx.fillRect(0, rnd() * S, S, 1); }
  for (let i = 0; i < 20; i++) { ctx.fillStyle = `rgba(200,150,90,${0.06 + rnd() * 0.08})`; ctx.fillRect(0, rnd() * S, S, 1); }
  return tex(c);
}

// chevron timber band on plaster: used for jettied upper floors (the WZ motif)
export function chevronTex(seed = 5) {
  const S = 256, c = canvas(S, 128), ctx = c.getContext('2d'), rnd = mulberry32(seed);
  ctx.fillStyle = '#efe3c7'; ctx.fillRect(0, 0, S, 128);
  mottle(ctx, 128, rnd, { h: 40, s: 36, l0: 80, l1: 92, octaves: [3, 9], weights: [0.6, 0.4] });
  // the mottle helper only paints a 128 square; copy across
  ctx.drawImage(c, 0, 0, 128, 128, 128, 0, 128, 128);
  ctx.strokeStyle = '#3d2a1c'; ctx.lineWidth = 9; ctx.lineJoin = 'miter';
  ctx.beginPath();
  const step = 32;
  for (let x = -step; x <= S + step; x += step * 2) { ctx.lineTo(x, 100); ctx.lineTo(x + step, 28); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,230,180,0.25)'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = -step; x <= S + step; x += step * 2) { ctx.lineTo(x, 96); ctx.lineTo(x + step, 24); }
  ctx.stroke();
  // top and bottom rails
  ctx.fillStyle = '#3d2a1c'; ctx.fillRect(0, 0, S, 10); ctx.fillRect(0, 118, S, 10);
  return tex(c);
}

export function cobbleTex(seed = 6) {
  const S = 256, c = canvas(S, S), ctx = c.getContext('2d'), rnd = mulberry32(seed);
  ctx.fillStyle = '#b9a884'; ctx.fillRect(0, 0, S, S);
  mottle(ctx, S, rnd, { h: 38, s: 22, l0: 62, l1: 72, octaves: [4, 16], weights: [0.6, 0.4] });
  const cell = 13;
  for (let y = -1; y <= S / cell; y++) for (let x = -1; x <= S / cell; x++) {
    const cx = x * cell + cell / 2 + (y % 2) * cell / 2 + (rnd() - 0.5) * 4;
    const cy = y * cell + cell / 2 + (rnd() - 0.5) * 4;
    const r = cell * 0.44 + rnd() * 2;
    ctx.fillStyle = hsl(36 + rnd() * 14, 10 + rnd() * 10, 56 + rnd() * 14);
    ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.82, rnd() * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,245,220,0.18)';
    ctx.beginPath(); ctx.ellipse(cx - 1, cy - 2, r * 0.5, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(40,30,20,0.1)';
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.5, r * 0.8, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  }
  // duplicate edges for seamlessness is approximated by the wrap-around loop above
  return tex(c);
}

export function groundTex(seed = 7) {
  const S = 512, c = canvas(S, S), ctx = c.getContext('2d'), rnd = mulberry32(seed);
  ctx.fillStyle = '#d2cfb0'; ctx.fillRect(0, 0, S, S);
  mottle(ctx, S, rnd, { h: 75, s: 14, l0: 70, l1: 84, octaves: [3, 6, 14, 48], weights: [0.45, 0.3, 0.2, 0.12] });
  // darker damp patches and paler worn patches
  for (let i = 0; i < 26; i++) {
    const x = rnd() * S, y = rnd() * S, r = 20 + rnd() * 60;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = rnd() < 0.55;
    grd.addColorStop(0, dark ? 'rgba(90,110,60,0.22)' : 'rgba(235,225,190,0.26)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.ellipse(x, y, r, r * (0.5 + rnd() * 0.5), rnd() * 3, 0, 7); ctx.fill();
  }
  // grass as short ink ticks, denser in the damp patches
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * S, y = rnd() * S;
    ctx.strokeStyle = `rgba(70,90,40,${0.08 + rnd() * 0.16})`; ctx.lineWidth = 1 + rnd();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 4, y - 3 - rnd() * 6); ctx.stroke();
  }
  // a scattering of pale flowers and small stones
  for (let i = 0; i < 220; i++) { ctx.fillStyle = rnd() < 0.6 ? `rgba(245,235,205,${0.5 + rnd() * 0.4})` : `rgba(230,190,110,${0.5 + rnd() * 0.4})`; ctx.beginPath(); ctx.arc(rnd() * S, rnd() * S, 1 + rnd() * 1.5, 0, 7); ctx.fill(); }
  for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(120,118,110,${0.3 + rnd() * 0.3})`; ctx.beginPath(); ctx.ellipse(rnd() * S, rnd() * S, 1.5 + rnd() * 2, 1 + rnd(), rnd() * 3, 0, 7); ctx.fill(); }
  return tex(c);
}

export function rockTex(seed = 8) {
  const S = 256, c = canvas(S, S), ctx = c.getContext('2d'), rnd = mulberry32(seed);
  ctx.fillStyle = '#8f8c86'; ctx.fillRect(0, 0, S, S);
  mottle(ctx, S, rnd, { h: 210, s: 8, l0: 46, l1: 62, octaves: [3, 7, 20], weights: [0.5, 0.3, 0.2] });
  for (let i = 0; i < 60; i++) {
    ctx.strokeStyle = `rgba(230,228,220,${0.15 + rnd() * 0.2})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); const x = rnd() * S, y = rnd() * S; ctx.moveTo(x, y); ctx.lineTo(x + 10 + rnd() * 30, y + (rnd() - 0.5) * 8); ctx.stroke();
  }
  return tex(c);
}

export function paperGrainTex(seed = 9) {
  const S = 256, c = canvas(S, S), ctx = c.getContext('2d'), rnd = mulberry32(seed);
  const img = ctx.createImageData(S, S);
  const f = fbm(S, rnd, [8, 32, 128], [0.4, 0.3, 0.3]);
  for (let i = 0; i < S * S; i++) { const v = 128 + (f[i] - 0.5) * 90 + (rnd() - 0.5) * 30; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  ctx.putImageData(img, 0, 0);
  const t = tex(c); t.colorSpace = THREE.NoColorSpace; return t;
}

export function copperTex(seed = 10) {
  const S = 128, c = canvas(S, S), ctx = c.getContext('2d'), rnd = mulberry32(seed);
  ctx.fillStyle = '#9a6a3a'; ctx.fillRect(0, 0, S, S);
  mottle(ctx, S, rnd, { h: 24, s: 48, l0: 36, l1: 50, octaves: [3, 9, 30], weights: [0.5, 0.3, 0.2] });
  // verdigris patches
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = `rgba(80,160,140,${0.25 + rnd() * 0.3})`;
    ctx.beginPath(); ctx.ellipse(rnd() * S, rnd() * S, 6 + rnd() * 14, 4 + rnd() * 8, rnd() * 3, 0, Math.PI * 2); ctx.fill();
  }
  return tex(c);
}

export function bloomTex(seed = 11) {
  const S = 128, c = canvas(S, S), ctx = c.getContext('2d'), rnd = mulberry32(seed);
  ctx.fillStyle = '#5a3d8a'; ctx.fillRect(0, 0, S, S);
  mottle(ctx, S, rnd, { h: 262, s: 40, l0: 32, l1: 52, octaves: [3, 8, 24], weights: [0.5, 0.3, 0.2] });
  for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(230,220,255,${0.2 + rnd() * 0.3})`; ctx.beginPath(); ctx.arc(rnd() * S, rnd() * S, 1 + rnd() * 3, 0, 7); ctx.fill(); }
  return tex(c);
}

export function foliageTex(seed = 12, hue = 170) {
  const S = 128, c = canvas(S, S), ctx = c.getContext('2d'), rnd = mulberry32(seed);
  ctx.fillStyle = '#2f4f45'; ctx.fillRect(0, 0, S, S);
  mottle(ctx, S, rnd, { h: hue, s: 26, l0: 18, l1: 34, octaves: [4, 12, 40], weights: [0.45, 0.35, 0.2] });
  for (let i = 0; i < 260; i++) {
    ctx.strokeStyle = `rgba(20,30,25,${0.2 + rnd() * 0.3})`; ctx.lineWidth = 1;
    const x = rnd() * S, y = rnd() * S; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 4, y + 3 + rnd() * 5); ctx.stroke();
  }
  for (let i = 0; i < 120; i++) { ctx.fillStyle = `rgba(150,200,170,${0.15 + rnd() * 0.2})`; ctx.fillRect(rnd() * S, rnd() * S, 2, 1); }
  return tex(c);
}

export function sealTex(glyph, seed = 13) {
  // wax seal disc with a stamped glyph, used as a decal plane
  const S = 64, c = canvas(S, S), ctx = c.getContext('2d'), rnd = mulberry32(seed + glyph.charCodeAt(0));
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = '#a9281f';
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 2; a += 0.25) { const r = 28 + rnd() * 3; ctx.lineTo(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r); }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(60,10,10,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(S / 2, S / 2, 21, 0, 7); ctx.stroke();
  ctx.fillStyle = 'rgba(255,200,180,0.35)'; ctx.beginPath(); ctx.arc(S / 2 - 8, S / 2 - 9, 6, 0, 7); ctx.fill();
  ctx.fillStyle = '#5a0d0d'; ctx.font = 'bold 30px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(glyph, S / 2, S / 2 + 2);
  const t = tex(c, false); return t;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
