import * as THREE from 'three';
import { Kit, V } from './kit.js';
import { windowEl, doorEl, sealEl, chimneyEl, finialEl, hookLampEl, spoutEl, fenceEl, barrelEl, crateEl, inkJarsEl, signEl } from './elements.js';
import { mulberry32 } from '../game/state.js';

// Each builder returns a THREE.Group whose origin is the centre of the footprint on the ground,
// with the front (door side) facing +z. `o` carries { seed, lit, supplied, warped, size }.

const PLASTERS = ['plaster', 'plasterOchre', 'plasterRose'];
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];

// ------------------------------------------------------------ Apprentice Lodging
// A candle: tall, thin, tapering, jettied top with chevron band, tented roof, hook finial.
export function lodging(o) {
  const k = new Kit(); const rnd = mulberry32(o.seed * 1e6 | 0);
  const plaster = pick(rnd, PLASTERS);
  const w = 2.9, d = 2.7;
  const lit = o.lit;
  const mir = rnd() < 0.5 ? -1 : 1;       // which side the door sits
  const tall = rnd() < 0.5;               // two roof pitches
  // ground: stone
  k.frustum({ w0: w + 0.2, d0: d + 0.2, w1: w, d1: d, h: 1.9, y: 0, mat: 'ashlar', uvScale: 1.6 });
  // first floor plaster (tapering)
  k.frustum({ w0: w, d0: d, w1: w - 0.25, d1: d - 0.2, h: 2.4, y: 1.9, mat: plaster, uvScale: 1.8 });
  // jetty: top floor overhangs front and back
  const jw = w + 0.25, jd = d + 0.3, jy = 4.3;
  k.box({ w: jw, h: 0.18, d: jd, y: jy, mat: 'timberDark', uvScale: 1 });
  // chevron band on the jettied floor, front and back faces; plaster on the sides
  k.frustum({ w0: jw, d0: jd, w1: jw - 0.1, d1: jd - 0.1, h: 1.9, y: jy + 0.18, mat: 'chevron', uvScale: 1.9, top: false });
  // roof: tented, steep, slight flare
  const rh = tall ? 3.5 : 2.8;
  k.roof({ w: jw + 0.9, d: jd + 0.9, h: rh, y: jy + 2.05, mat: 'tile', curve: tall ? 0.18 : 0.1, uvScale: 1.3 });
  // eave board
  k.box({ w: jw + 0.9, h: 0.12, d: jd + 0.9, y: jy + 2.0, mat: 'timberDark', uvScale: 1 });
  finialEl(k, { x: 0, y: jy + 2.05 + rh - 0.05, z: 0, size: 1.1 });
  // windows: E e E on the first floor front; single on the top; one on each side
  const fz = d / 2 - 0.06;
  windowEl(k, { x: -0.8, y: 2.6, z: fz, w: 0.5, h: 1.0, lit });
  windowEl(k, { x: 0.8, y: 2.6, z: fz, w: 0.5, h: 1.0, lit });
  windowEl(k, { x: 0, y: 2.95, z: fz, w: 0.32, h: 0.5, shutters: false, lit });
  windowEl(k, { x: 0, y: jy + 0.75, z: jd / 2 - 0.05, w: 0.5, h: 0.85, lit, shutters: false });
  windowEl(k, { x: w / 2 - 0.12, y: 2.6, z: 0.2, rot: Math.PI / 2, w: 0.45, h: 0.9, lit, shutters: false });
  windowEl(k, { x: -(w / 2 - 0.12), y: 2.6, z: -0.2, rot: -Math.PI / 2, w: 0.45, h: 0.9, lit, shutters: false });
  // door and seal
  doorEl(k, { x: -0.45 * mir, z: (w + 0.2) / 2 + 0.05 - 0.05 - 0.1, glyph: 'A', w: 0.75, h: 1.45 });
  // lamp hook by the door
  hookLampEl(k, { x: 0.9 * mir, y: 2.05, z: fz + 0.1, lit: o.lit, size: 0.8 });
  // twin chimney at the back
  chimneyEl(k, { x: 0.5, y: jy + 2.0 + 1.2, z: -0.8, h: 1.8 });
  // gutter spouts at the front corners
  spoutEl(k, { x: (jw + 0.9) / 2 - 0.2, y: jy + 2.0, z: (jd + 0.9) / 2 - 0.1 });
  // a small yard prop: crate or barrel by the door
  const yard = rnd();
  if (yard < 0.35) barrelEl(k, { x: 1.6 * mir, z: 1.0, r: 0.25, h: 0.6 });
  else if (yard < 0.7) crateEl(k, { x: 1.55 * mir, z: 1.1, s: 0.45, rot: rnd() });
  else inkJarsEl(k, { x: 1.5 * mir, z: 1.2, n: 2, seed: rnd() });
  // washing line from the jetty to a pole: a small domestic hook
  if (rnd() < 0.5) {
    k.box({ x: -1.85 * mir, y: 0, z: 1.5, w: 0.07, h: 2.2, d: 0.07, mat: 'timber' });
    k.geom(new THREE.BoxGeometry(1.5, 0.02, 0.02), 'rope', { x: -1.1 * mir, y: 2.15, z: 1.5, rz: 0.15 * mir });
    k.box({ x: -0.9 * mir, y: 1.75, z: 1.5, w: 0.3, h: 0.4, d: 0.02, mat: 'clothBlue' });
    k.box({ x: -1.4 * mir, y: 1.78, z: 1.5, w: 0.26, h: 0.34, d: 0.02, mat: 'cream' });
  }
  return k.build();
}

// ------------------------------------------------------------ Journeyman House
// Broader, two jettied floors, hipped roof with a ridge, ochre by default, the front door under a hook lamp.
export function jhouse(o) {
  const k = new Kit(); const rnd = mulberry32(o.seed * 1e6 | 0);
  const plaster = pick(rnd, ['plasterOchre', 'plasterOchre', 'plasterRose', 'plaster']);
  const w = 3.3, d = 3.0, lit = o.lit;
  k.frustum({ w0: w + 0.2, d0: d + 0.2, w1: w, d1: d, h: 1.7, mat: 'ashlar', uvScale: 1.6 });
  k.box({ w, d, h: 2.0, y: 1.7, mat: plaster, uvScale: 1.8 });
  // jetty on front + right side
  const jw = w + 0.5, jd = d + 0.5, jy = 3.7;
  k.box({ w: jw, h: 0.2, d: jd, y: jy, x: 0.15, z: 0.15, mat: 'timberDark', uvScale: 1 });
  k.box({ w: jw, d: jd, h: 1.9, y: jy + 0.2, x: 0.15, z: 0.15, mat: 'chevron', uvScale: 2.0, top: false });
  // brackets under the jetty
  for (const bx of [-1.2, 0, 1.2]) k.box({ x: bx, y: 3.35, z: d / 2 + 0.1, w: 0.14, h: 0.4, d: 0.3, mat: 'timberDark' });
  // hipped roof with ridge
  const rh = 2.6;
  k.roof({ w: jw + 1.0, d: jd + 1.0, h: rh, x: 0.15, z: 0.15, y: jy + 2.1, ridge: 1.4, mat: 'tile', curve: 0.12 });
  k.box({ w: jw + 1.0, h: 0.12, d: jd + 1.0, x: 0.15, z: 0.15, y: jy + 2.05, mat: 'timberDark', uvScale: 1 });
  finialEl(k, { x: -0.55, y: jy + 2.1 + rh - 0.05, z: 0.15, size: 0.9 });
  finialEl(k, { x: 0.85, y: jy + 2.1 + rh - 0.05, z: 0.15, size: 0.9 });
  // windows: pair flanking small, on the middle floor; pair on the top; side windows
  const fz = d / 2;
  windowEl(k, { x: -1.0, y: 2.2, z: fz, lit, w: 0.55, h: 1.0 });
  windowEl(k, { x: 1.0, y: 2.2, z: fz, lit, w: 0.55, h: 1.0 });
  windowEl(k, { x: 0, y: 2.55, z: fz, lit, w: 0.3, h: 0.45, shutters: false });
  windowEl(k, { x: -0.7, y: jy + 0.7, z: jd / 2 + 0.15, lit, w: 0.5, h: 0.85, shutters: false });
  windowEl(k, { x: 0.9, y: jy + 0.7, z: jd / 2 + 0.15, lit, w: 0.5, h: 0.85, shutters: false });
  windowEl(k, { x: -(w / 2), y: 2.2, z: -0.3, rot: -Math.PI / 2, lit, w: 0.5, h: 0.9, shutters: false });
  doorEl(k, { x: 0, z: (w + 0.2) / 2 - 0.2 + 0.1, glyph: 'J', w: 0.85, h: 1.5 });
  hookLampEl(k, { x: -1.1, y: 1.75, z: fz + 0.05, lit, size: 0.9 });
  chimneyEl(k, { x: -1.0, y: jy + 2.1 + 1.0, z: -0.6, h: 1.9 });
  chimneyEl(k, { x: 1.3, y: jy + 2.1 + 0.8, z: 0.9, h: 1.7, single: true });
  spoutEl(k, { x: -(jw + 1.0) / 2 + 0.3, y: jy + 2.05, z: (jd + 1.0) / 2 - 0.1 });
  // a bench under the window
  k.box({ x: 1.2, y: 0.35, z: 1.85, w: 1.0, h: 0.08, d: 0.35, mat: 'timber' });
  k.box({ x: 0.8, y: 0, z: 1.85, w: 0.08, h: 0.35, d: 0.3, mat: 'timber' }); k.box({ x: 1.6, y: 0, z: 1.85, w: 0.08, h: 0.35, d: 0.3, mat: 'timber' });
  inkJarsEl(k, { x: -1.5, z: 1.7, n: 2, seed: rnd() });
  return k.build();
}

// ------------------------------------------------------------ Master's Tower
// An octagonal candle with a wider hat: the top room jetties out, the roof is steep and tall.
export function tower(o) {
  const k = new Kit(); const rnd = mulberry32(o.seed * 1e6 | 0);
  const lit = o.lit;
  const r0 = 1.55, r1 = 1.25;
  k.cyl({ r: r0 + 0.1, r2: r0, h: 3.6, seg: 8, mat: 'ashlar', ry: Math.PI / 8 });
  k.cyl({ r: r0, r2: r1, h: 5.2, y: 3.6, seg: 8, mat: pick(rnd, ['plaster', 'plasterGrey', 'plasterOchre']), ry: Math.PI / 8 });
  // brass bands
  k.cyl({ r: r0 + 0.08, r2: r0 + 0.08, h: 0.14, y: 3.55, seg: 8, mat: 'timberDark', ry: Math.PI / 8 });
  k.cyl({ r: r1 + 0.05, r2: r1 + 0.05, h: 0.14, y: 6.4, seg: 8, mat: 'timberDark', ry: Math.PI / 8 });
  // hat: jettied top room on brackets
  const hy = 8.8, hr = 2.15;
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + Math.PI / 8;
    k.box({ x: Math.cos(a) * (r1 + 0.35), y: hy - 0.7, z: Math.sin(a) * (r1 + 0.35), w: 0.18, h: 0.7, d: 0.5, rot: -a, mat: 'timberDark' });
  }
  k.cyl({ r: hr + 0.05, r2: hr + 0.05, h: 0.2, y: hy, seg: 8, mat: 'timberDark', ry: Math.PI / 8 });
  k.cyl({ r: hr, r2: hr - 0.05, h: 2.1, y: hy + 0.2, seg: 8, mat: 'chevron', ry: Math.PI / 8 });
  // eight-sided tented roof, tall
  k.cyl({ r: hr + 0.5, r2: hr + 0.5, h: 0.12, y: hy + 2.3, seg: 8, mat: 'timberDark', ry: Math.PI / 8 });
  k.cyl({ r: hr + 0.5, r2: 0.05, h: 3.9, y: hy + 2.4, seg: 8, mat: 'tile', ry: Math.PI / 8 });
  k.cyl({ r: hr + 0.75, r2: hr + 0.35, h: 0.55, y: hy + 2.4, seg: 8, mat: 'tile', ry: Math.PI / 8 });
  finialEl(k, { x: 0, y: hy + 6.25, z: 0, size: 1.4 });
  // windows: a spiral of small windows up the shaft, big paired windows in the hat
  for (let i = 0; i < 4; i++) {
    const a = i * 1.1 + 0.3; const rr = r0 - (r0 - r1) * ((1.2 + i * 1.1) / 5.2) + 0.02;
    windowEl(k, { x: Math.sin(a) * rr, y: 4.2 + i * 1.1, z: Math.cos(a) * rr, rot: a, w: 0.34, h: 0.62, shutters: false, lit, sill: false });
  }
  for (let i = 0; i < 8; i += 2) {
    const a = i / 8 * Math.PI * 2 + Math.PI / 8 + Math.PI / 8;
    windowEl(k, { x: Math.sin(a) * (hr - 0.02), y: hy + 0.85, z: Math.cos(a) * (hr - 0.02), rot: a, w: 0.55, h: 1.0, shutters: false, lit, sill: false });
  }
  doorEl(k, { x: 0, z: r0 + 0.1 - 0.12, glyph: 'M', w: 0.85, h: 1.7, steps: 3 });
  hookLampEl(k, { x: 1.1, y: 2.4, z: r0 * 0.75, lit, rot: 0.3, size: 1.0 });
  // masters keep a lantern on their own hook at the hat
  hookLampEl(k, { x: 0, y: hy + 1.9, z: hr + 0.1, lit, size: 1.1 });
  chimneyEl(k, { x: -1.0, y: hy + 3.4, z: -1.0, h: 1.4, single: true });
  return k.build();
}

// ------------------------------------------------------------ Allotment
export function garden(o) {
  const k = new Kit(); const rnd = mulberry32(o.seed * 1e6 | 0);
  const strange = o.onLey;
  // beds: two long timber-edged beds
  for (const bz of [-0.9, 0.5]) {
    k.box({ x: 0, y: 0, z: bz, w: 3.0, h: 0.28, d: 1.1, mat: 'timber', uvScale: 1 });
    k.box({ x: 0, y: 0.18, z: bz, w: 2.8, h: 0.14, d: 0.9, mat: 'timberDark', tint: 0x6b4d38 });
    for (let i = 0; i < 6; i++) {
      const px = -1.2 + i * 0.48;
      if (strange) {
        k.sphere({ x: px, y: 0.5, z: bz + (rnd() - 0.5) * 0.3, r: 0.17 + rnd() * 0.08, seg: 6, mat: 'bloom', sy: 1.4 });
        k.cyl({ x: px, y: 0.3, z: bz, r: 0.03, h: 0.3, seg: 4, mat: 'bloomStalk' });
      } else {
        const veg = rnd();
        if (veg < 0.5) { k.sphere({ x: px, y: 0.42, z: bz, r: 0.16, seg: 6, mat: 'pine', tint: 0xa8c070, sy: 0.7 }); }
        else { k.cone({ x: px, y: 0.3, z: bz, r: 0.12, h: 0.45, seg: 5, mat: 'pine', tint: 0x7f9a4a }); }
      }
    }
  }
  // zigzag fence on three sides
  fenceEl(k, { x: 0, z: -1.75, len: 3.6, h: 0.6 });
  fenceEl(k, { x: -1.8, z: -0.2, len: 3.1, rot: Math.PI / 2, h: 0.6 });
  fenceEl(k, { x: 1.8, z: -0.2, len: 3.1, rot: Math.PI / 2, h: 0.6 });
  // scarecrow with a hooked hat
  k.cyl({ x: 1.2, y: 0, z: 1.3, r: 0.05, h: 1.6, seg: 5, mat: 'timber' });
  k.box({ x: 1.2, y: 1.15, z: 1.3, w: 0.9, h: 0.08, d: 0.08, mat: 'timber' });
  k.box({ x: 1.2, y: 0.75, z: 1.3, w: 0.5, h: 0.6, d: 0.25, mat: 'cloth' });
  k.sphere({ x: 1.2, y: 1.55, z: 1.3, r: 0.17, seg: 6, mat: 'waxPale' });
  k.cone({ x: 1.2, y: 1.65, z: 1.3, r: 0.22, h: 0.6, seg: 6, mat: 'hatInk' });
  // rain barrel and a tool
  barrelEl(k, { x: -1.3, z: 1.35, r: 0.27, h: 0.65 });
  k.box({ x: -0.5, y: 0, z: 1.55, w: 0.06, h: 1.2, d: 0.06, rot: 0.3, mat: 'timber' });
  k.box({ x: -0.5, y: 1.15, z: 1.55, w: 0.2, h: 0.08, d: 0.2, mat: 'ink' });
  // the mark on a little post
  k.box({ x: 0.3, y: 0, z: 1.65, w: 0.1, h: 0.9, d: 0.1, mat: 'timberDark' });
  sealEl(k, { x: 0.3, y: 0.75, z: 1.72, glyph: 'G', r: 0.14 });
  return k.build();
}

// ------------------------------------------------------------ Woodcutter's Lodge
export function woodcutter(o) {
  const k = new Kit(); const rnd = mulberry32(o.seed * 1e6 | 0);
  // low log-walled hut with a stone plinth; roof still tented
  k.box({ w: 3.0, d: 2.6, h: 0.5, y: 0, x: -0.3, mat: 'ashlarDark', uvScale: 1.4 });
  for (let i = 0; i < 6; i++) {
    const y = 0.5 + i * 0.36;
    k.box({ w: 3.0 + (i % 2) * 0.16, d: 2.6 + ((i + 1) % 2) * 0.16, h: 0.34, y, x: -0.3, mat: 'timber', uvScale: 1.2, tint: i % 2 ? 0xffffff : 0xe0c8b0 });
  }
  const ry = 0.5 + 6 * 0.36;
  k.box({ w: 3.9, d: 3.5, h: 0.12, y: ry, x: -0.3, mat: 'timberDark' });
  k.roof({ w: 3.9, d: 3.5, h: 1.9, y: ry + 0.1, x: -0.3, ridge: 0.8, mat: 'tileTeal', curve: 0.1 });
  finialEl(k, { x: -0.3, y: ry + 2.0 - 0.05, z: 0, size: 0.9 });
  chimneyEl(k, { x: -1.3, y: ry + 0.7, z: -0.6, h: 1.4, single: true });
  doorEl(k, { x: 0.2, z: 1.3, glyph: 'W', w: 0.8, h: 1.4, steps: 1, mat: 'timber' });
  windowEl(k, { x: -1.1, y: 1.4, z: 1.3, w: 0.45, h: 0.6, shutters: true, lit: o.lit });
  // lean-to log store on the right
  k.box({ x: 1.55, y: 0, z: -0.4, w: 0.1, h: 1.6, d: 0.1, mat: 'timber' }); k.box({ x: 1.55, y: 0, z: 1.0, w: 0.1, h: 1.6, d: 0.1, mat: 'timber' });
  k.poly([V(1.2, 2.5, -0.6), V(1.2, 2.5, 1.2), V(1.75, 1.6, 1.2), V(1.75, 1.6, -0.6)], 'tileTeal', { uvScale: 1.2 });
  for (let r = 0; r < 4; r++) for (let i = 0; i < 4 - r; i++) {
    k.cyl({ x: 1.5, y: 0.14 + r * 0.24, z: -0.35 + i * 0.28 + r * 0.14, r: 0.13, h: 0.7, seg: 6, mat: 'pineTrunk', rz: Math.PI / 2 });
  }
  // chopping block, axe, sawhorse
  k.cyl({ x: -1.0, y: 0, z: 2.0, r: 0.28, h: 0.5, seg: 8, mat: 'pineTrunk' });
  k.box({ x: -0.85, y: 0.5, z: 2.0, w: 0.06, h: 0.7, d: 0.06, rot: 0.4, mat: 'timber' });
  k.box({ x: -0.85, y: 1.1, z: 2.0, w: 0.28, h: 0.16, d: 0.05, mat: 'ink' });
  k.box({ x: 1.0, y: 0.55, z: 2.0, w: 1.2, h: 0.08, d: 0.08, mat: 'timber' });
  for (const dx of [-0.45, 0.45]) { k.box({ x: 1.0 + dx, y: 0, z: 1.9, w: 0.06, h: 0.55, d: 0.06, rot: 0, mat: 'timber' }); k.box({ x: 1.0 + dx, y: 0, z: 2.1, w: 0.06, h: 0.55, d: 0.06, mat: 'timber' }); }
  hookLampEl(k, { x: 1.0, y: 2.25, z: 1.35, lit: o.lit, size: 0.75 });
  return k.build();
}

// ------------------------------------------------------------ Stonecutter's Yard
export function stonecutter(o) {
  const k = new Kit(); const rnd = mulberry32(o.seed * 1e6 | 0);
  // open yard with a canopy on four posts and a hoist with a hook
  k.box({ w: 3.7, d: 3.6, h: 0.12, y: 0, mat: 'ashlar', uvScale: 1.4 });
  for (const [px, pz] of [[-1.3, -1.2], [1.3, -1.2], [-1.3, 0.6], [1.3, 0.6]]) k.box({ x: px, y: 0, z: pz, w: 0.16, h: 2.6, d: 0.16, mat: 'timber' });
  k.box({ x: 0, y: 2.6, z: -0.3, w: 3.4, h: 0.1, d: 2.6, mat: 'timberDark' });
  k.roof({ w: 3.6, d: 2.8, h: 1.2, y: 2.7, z: -0.3, ridge: 1.6, mat: 'tileTeal' });
  finialEl(k, { x: 0, y: 3.85, z: -0.3, size: 0.8 });
  // work bench with a half-cut block and chalk lines
  k.box({ x: 0, y: 0.12, z: -0.4, w: 1.8, h: 0.7, d: 1.0, mat: 'timber', uvScale: 1 });
  k.box({ x: 0.1, y: 0.82, z: -0.4, w: 0.9, h: 0.55, d: 0.7, mat: 'rock', uvScale: 1 });
  k.box({ x: 0.1, y: 1.38, z: -0.4, w: 0.92, h: 0.02, d: 0.05, mat: 'cream' });
  // stacked blocks
  for (let i = 0; i < 3; i++) k.box({ x: -1.4 + (i % 2) * 0.1, y: 0.12 + i * 0.42, z: 1.3, w: 0.8, h: 0.4, d: 0.6, mat: 'rock', uvScale: 1, rot: (i % 2) * 0.1 });
  for (let i = 0; i < 2; i++) k.box({ x: 1.3, y: 0.12 + i * 0.42, z: 1.4, w: 0.7, h: 0.4, d: 0.7, mat: 'ashlar', uvScale: 1 });
  // hoist: a post with a curled brass hook arm
  k.box({ x: 1.6, y: 0, z: -1.5, w: 0.2, h: 3.4, d: 0.2, mat: 'timberDark' });
  k.box({ x: 1.0, y: 3.2, z: -1.5, w: 1.6, h: 0.14, d: 0.14, mat: 'timberDark' });
  k.cyl({ x: 0.3, y: 2.3, z: -1.5, r: 0.02, h: 0.9, seg: 4, mat: 'rope' });
  const t = new THREE.TorusGeometry(0.15, 0.04, 5, 10, Math.PI * 1.3);
  k.geom(t, 'brass', { x: 0.3, y: 2.2, z: -1.5, rz: Math.PI * 0.6 });
  // chisels, a mallet and a seal post
  k.box({ x: -0.6, y: 0.82, z: -0.1, w: 0.25, h: 0.08, d: 0.08, mat: 'timber' });
  k.box({ x: -0.8, y: 0, z: 1.75, w: 0.1, h: 1.0, d: 0.1, mat: 'timberDark' });
  sealEl(k, { x: -0.8, y: 0.85, z: 1.82, glyph: 'S', r: 0.14 });
  barrelEl(k, { x: 1.55, z: -0.5, r: 0.25, h: 0.6 });
  return k.build();
}

// ------------------------------------------------------------ Well
export function well(o) {
  const k = new Kit();
  k.cyl({ r: 1.9, r2: 1.9, h: 0.1, seg: 8, mat: 'ashlar', ry: Math.PI / 8 });
  k.cyl({ r: 1.0, r2: 0.95, h: 0.9, seg: 8, mat: 'ashlarDark', ry: Math.PI / 8 });
  k.geom(new THREE.RingGeometry(0.7, 1.08, 8), 'cream', { y: 1.04, rx: -Math.PI / 2, ry: 0 });
  k.cyl({ r: 1.05, r2: 1.05, h: 0.14, y: 0.9, seg: 8, mat: 'cream', ry: Math.PI / 8, open: true });
  k.cyl({ r: 0.72, r2: 0.72, h: 0.05, y: 0.72, seg: 8, mat: 'leyDeep' });
  // two posts, windlass, a tented cap
  for (const px of [-0.95, 0.95]) k.box({ x: px, y: 1.0, z: 0, w: 0.16, h: 1.8, d: 0.16, mat: 'timberDark' });
  k.cyl({ x: 0, y: 2.45, z: 0, r: 0.1, h: 2.0, seg: 6, mat: 'timber', rz: Math.PI / 2 });
  k.box({ x: 1.05, y: 2.45, z: 0, w: 0.1, h: 0.5, d: 0.1, mat: 'brass' });
  k.box({ x: 1.05, y: 2.65, z: 0.15, w: 0.1, h: 0.1, d: 0.35, mat: 'brass' });
  k.cyl({ x: 0, y: 1.3, z: 0, r: 0.02, h: 1.15, seg: 4, mat: 'rope' });
  k.cyl({ x: 0, y: 1.05, z: 0, r: 0.15, r2: 0.13, h: 0.25, seg: 7, mat: 'timber' });
  k.box({ x: 0, y: 2.8, z: 0, w: 2.6, h: 0.1, d: 1.8, mat: 'timberDark' });
  k.roof({ w: 2.7, d: 1.9, h: 1.1, y: 2.9, ridge: 1.0, mat: 'tile' });
  finialEl(k, { x: 0, y: 3.95, z: 0, size: 0.8 });
  // a bench and a bucket
  k.box({ x: 0, y: 0.35, z: 1.45, w: 1.4, h: 0.08, d: 0.3, mat: 'timber' });
  k.box({ x: -0.55, y: 0, z: 1.45, w: 0.08, h: 0.35, d: 0.28, mat: 'timber' }); k.box({ x: 0.55, y: 0, z: 1.45, w: 0.08, h: 0.35, d: 0.28, mat: 'timber' });
  k.cyl({ x: 1.4, y: 0.1, z: 0.9, r: 0.14, r2: 0.12, h: 0.25, seg: 7, mat: 'timber' });
  sealEl(k, { x: 0.55, y: 0.6, z: 1.0, glyph: 'V', r: 0.13 });
  return k.build();
}

// ------------------------------------------------------------ Scriptorium (2x1)
export function scriptorium(o) {
  const k = new Kit(); const rnd = mulberry32(o.seed * 1e6 | 0);
  const lit = o.lit;
  const w = 7.2, d = 3.1;
  k.frustum({ w0: w + 0.2, d0: d + 0.2, w1: w, d1: d, h: 1.3, mat: 'ashlar', uvScale: 1.6 });
  k.box({ w, d, h: 2.6, y: 1.3, mat: 'plasterGrey', uvScale: 2 });
  // a row of tall windows: E e E e E along the front, small ones between
  for (let i = -2; i <= 2; i++) {
    const big = i % 2 === 0;
    windowEl(k, { x: i * 1.35, y: big ? 1.8 : 2.2, z: d / 2, w: big ? 0.6 : 0.34, h: big ? 1.5 : 0.7, shutters: big, lit });
  }
  for (let i = -1; i <= 1; i++) windowEl(k, { x: i * 1.7, y: 2.0, z: -d / 2, rot: Math.PI, w: 0.55, h: 1.1, lit, shutters: false });
  // low hipped roof with a long ridge; timber eave; two finials
  k.box({ w: w + 0.9, h: 0.14, d: d + 0.9, y: 3.9, mat: 'timberDark' });
  k.roof({ w: w + 0.9, d: d + 0.9, h: 2.4, y: 4.0, ridge: 4.6, mat: 'tile', curve: 0.1 });
  finialEl(k, { x: -2.3, y: 6.35, z: 0, size: 1 }); finialEl(k, { x: 2.3, y: 6.35, z: 0, size: 1 });
  chimneyEl(k, { x: -2.9, y: 5.0, z: -0.6, h: 1.6 }); chimneyEl(k, { x: 2.9, y: 5.0, z: -0.6, h: 1.6 });
  // dormer-like clerestory: a small tented lantern in the middle of the ridge
  k.box({ x: 0, y: 5.5, z: 0, w: 1.4, h: 0.9, d: 1.4, mat: 'plasterGrey' });
  windowEl(k, { x: 0, y: 5.6, z: 0.7, w: 0.5, h: 0.6, shutters: false, lit, sill: false });
  k.roof({ w: 1.9, d: 1.9, h: 1.2, y: 6.4, mat: 'tileTeal' });
  finialEl(k, { x: 0, y: 7.55, z: 0, size: 0.8 });
  // door at the left end with the Q seal; sign with a quill
  doorEl(k, { x: -2.7, z: d / 2 + 0.1 - 0.05, glyph: 'Q', w: 0.85, h: 1.6, mat: 'inkBlue' });
  signEl(k, { x: -1.8, y: 2.9, z: d / 2 + 0.05, mat: 'cream', glyphMat: 'ink' });
  hookLampEl(k, { x: 2.9, y: 3.4, z: d / 2 + 0.05, lit, size: 0.9 });
  // ink jars stacked outside, a crate of paper
  inkJarsEl(k, { x: 3.0, z: 1.95, n: 4, seed: rnd() });
  crateEl(k, { x: 2.2, z: 2.0, s: 0.5, mat: 'cream' });
  spoutEl(k, { x: (w + 0.9) / 2 - 0.2, y: 3.9, z: (d + 0.9) / 2 - 0.1 });
  spoutEl(k, { x: -(w + 0.9) / 2 + 0.2, y: 3.9, z: (d + 0.9) / 2 - 0.1 });
  return k.build();
}

// ------------------------------------------------------------ Bakery
export function bakery(o) {
  const k = new Kit(); const rnd = mulberry32(o.seed * 1e6 | 0);
  const lit = o.lit;
  // the house: squat, plaster, with a big domed oven-house on the left carrying a double chimney
  k.frustum({ w0: 2.6, d0: 2.9, w1: 2.5, d1: 2.8, h: 1.2, x: 0.6, mat: 'ashlar', uvScale: 1.6 });
  k.box({ w: 2.5, d: 2.8, h: 2.3, y: 1.2, x: 0.6, mat: 'plasterOchre', uvScale: 1.8 });
  k.box({ w: 3.3, d: 3.6, h: 0.12, y: 3.5, x: 0.6, mat: 'timberDark' });
  k.roof({ w: 3.3, d: 3.6, h: 2.2, y: 3.6, x: 0.6, ridge: 0.6, mat: 'tile', curve: 0.1 });
  finialEl(k, { x: 0.6, y: 5.75, z: 0, size: 0.9 });
  // oven house: a squat stone dome
  k.cyl({ x: -1.15, y: 0, z: -0.3, r: 1.05, r2: 1.0, h: 1.4, seg: 10, mat: 'ashlarDark' });
  k.sphere({ x: -1.15, y: 1.4, z: -0.3, r: 1.0, seg: 10, mat: 'ashlarDark', sy: 0.75 });
  chimneyEl(k, { x: -1.15, y: 1.9, z: -0.5, h: 2.6 });
  // oven mouth with a glow
  k.box({ x: -1.15, y: 0.5, z: 0.72, w: 0.6, h: 0.5, d: 0.1, mat: lit || o.supplied ? 'lamp' : 'ink' });
  k.box({ x: -1.15, y: 0.5, z: 0.7, w: 0.8, h: 0.7, d: 0.06, mat: 'cream' });
  k.box({ x: -1.15, y: 0.5, z: 0.72, w: 0.6, h: 0.5, d: 0.08, mat: lit || o.supplied ? 'lamp' : 'ink' });
  // shop window with bread shelf
  windowEl(k, { x: 1.1, y: 1.6, z: 1.4, w: 0.9, h: 0.9, shutters: true, lit });
  k.box({ x: 1.1, y: 1.35, z: 1.6, w: 1.3, h: 0.08, d: 0.4, mat: 'timber' });
  for (let i = 0; i < 4; i++) k.sphere({ x: 0.65 + i * 0.3, y: 1.5, z: 1.62, r: 0.12, seg: 6, mat: 'bread', sy: 0.7 });
  windowEl(k, { x: 0.3, y: 2.1, z: 1.4, w: 0.34, h: 0.5, shutters: false, lit });
  doorEl(k, { x: -0.2, z: 1.4 + 0.05 - 0.05, glyph: 'B', w: 0.8, h: 1.45, steps: 1 });
  signEl(k, { x: 1.7, y: 2.9, z: 1.45, mat: 'timber', glyphMat: 'bread' });
  hookLampEl(k, { x: -0.5, y: 2.9, z: 1.45, lit, size: 0.8 });
  // flour sacks and a barrel
  k.sphere({ x: 1.9, y: 0.25, z: 2.0, r: 0.3, seg: 7, mat: 'cream', sy: 0.8 });
  k.sphere({ x: 1.6, y: 0.2, z: 2.3, r: 0.26, seg: 7, mat: 'cream', sy: 0.8 });
  barrelEl(k, { x: -1.6, z: 1.6, r: 0.24, h: 0.55 });
  return k.build();
}

// ------------------------------------------------------------ Still-house (alembic)
export function alembic(o) {
  const k = new Kit();
  const lit = o.lit;
  // stone base, a copper onion still rising through an open timber cage with chevron braces
  k.cyl({ r: 1.7, r2: 1.6, h: 1.1, seg: 8, mat: 'ashlarDark', ry: Math.PI / 8 });
  k.cyl({ r: 1.75, r2: 1.75, h: 0.12, y: 1.1, seg: 8, mat: 'cream', ry: Math.PI / 8 });
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + Math.PI / 8;
    k.box({ x: Math.cos(a) * 1.5, y: 1.2, z: Math.sin(a) * 1.5, w: 0.16, h: 3.6, d: 0.16, rot: -a, mat: 'timberDark' });
  }
  for (let i = 0; i < 8; i++) {
    const a0 = i / 8 * Math.PI * 2 + Math.PI / 8, a1 = (i + 1) / 8 * Math.PI * 2 + Math.PI / 8;
    const x0 = Math.cos(a0) * 1.5, z0 = Math.sin(a0) * 1.5, x1 = Math.cos(a1) * 1.5, z1 = Math.sin(a1) * 1.5;
    const L = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0);
    k.geom(new THREE.BoxGeometry(L, 0.1, 0.1), 'timberDark', { x: (x0 + x1) / 2, y: 4.7, z: (z0 + z1) / 2, ry: -ang });
    k.geom(new THREE.BoxGeometry(L, 0.08, 0.08), 'timberDark', { x: (x0 + x1) / 2, y: 3.0, z: (z0 + z1) / 2, ry: -ang });
    k.geom(new THREE.BoxGeometry(L * 1.05, 0.06, 0.06), 'timber', { x: (x0 + x1) / 2, y: 2.1, z: (z0 + z1) / 2, ry: -ang, rz: 0.5 * (i % 2 ? 1 : -1) });
    k.geom(new THREE.BoxGeometry(L * 1.05, 0.06, 0.06), 'timber', { x: (x0 + x1) / 2, y: 3.85, z: (z0 + z1) / 2, ry: -ang, rz: 0.5 * (i % 2 ? -1 : 1) });
  }
  // the still: a fat copper body, an onion dome, a tall neck, and a hooked swan-neck to the condenser
  k.cyl({ r: 1.05, r2: 1.15, h: 1.4, y: 1.22, seg: 12, mat: 'copper' });
  k.sphere({ r: 1.2, y: 2.9, seg: 12, mat: 'copper', sy: 0.95 });
  k.cyl({ r: 0.55, r2: 0.3, h: 1.1, y: 3.9, seg: 10, mat: 'copper' });
  k.cyl({ r: 0.22, r2: 0.18, h: 0.9, y: 5.0, seg: 8, mat: 'copper' });
  k.cyl({ r: 0.3, r2: 0.3, h: 0.1, y: 5.85, seg: 8, mat: 'brass' });
  const t = new THREE.TorusGeometry(0.5, 0.11, 6, 12, Math.PI);
  k.geom(t, 'copper', { x: 0.5, y: 5.95, z: 0, rz: 0 });
  k.cyl({ x: 1.0, y: 2.6, z: 0, r: 0.11, h: 3.35, seg: 6, mat: 'copper' });
  // condenser barrel on the platform, hooped in brass, with a ley gauge
  k.cyl({ x: 1.0, y: 1.22, z: 0.0, r: 0.42, r2: 0.42, h: 1.4, seg: 9, mat: 'verdigris' });
  k.cyl({ x: 1.0, y: 1.5, z: 0.0, r: 0.45, r2: 0.45, h: 0.06, seg: 9, mat: 'brass' });
  k.cyl({ x: 1.0, y: 2.3, z: 0.0, r: 0.45, r2: 0.45, h: 0.06, seg: 9, mat: 'brass' });
  k.box({ x: 0.45, y: 1.3, z: 1.05, w: 0.12, h: 1.2, d: 0.12, mat: 'glass' });
  k.box({ x: 0.45, y: 1.3, z: 1.05, w: 0.08, h: o.supplied ? 0.9 : 0.2, d: 0.08, mat: 'ley' });
  // a little tented cap on the neck, and the finial
  k.cone({ r: 0.55, h: 0.6, y: 6.0, seg: 8, mat: 'tileTeal' });
  finialEl(k, { x: 0, y: 6.55, z: 0, size: 0.8 });
  // bottles on a shelf by the door, seal post
  for (let i = 0; i < 5; i++) { k.cyl({ x: -1.2 + i * 0.28, y: 1.22, z: 1.55, r: 0.07, r2: 0.05, h: 0.32, seg: 6, mat: i % 2 ? 'ink' : 'glass' }); }
  k.box({ x: -0.65, y: 1.2, z: 1.55, w: 1.5, h: 0.05, d: 0.3, mat: 'timber' });
  k.box({ x: 1.3, y: 0, z: 1.75, w: 0.1, h: 1.0, d: 0.1, mat: 'timberDark' });
  sealEl(k, { x: 1.3, y: 0.85, z: 1.82, glyph: 'X', r: 0.14 });
  hookLampEl(k, { x: -1.4, y: 2.8, z: 1.0, lit, size: 0.8 });
  barrelEl(k, { x: 1.6, z: -1.2, r: 0.28, h: 0.7 });
  // steps up to the platform
  k.box({ x: 0, y: 0, z: 1.95, w: 1.2, h: 0.35, d: 0.5, mat: 'ashlar', uvScale: 1 });
  k.box({ x: 0, y: 0.35, z: 1.75, w: 1.2, h: 0.35, d: 0.5, mat: 'ashlar', uvScale: 1 });
  k.box({ x: 0, y: 0.7, z: 1.6, w: 1.2, h: 0.4, d: 0.4, mat: 'ashlar', uvScale: 1 });
  return k.build();
}

// ------------------------------------------------------------ Tavern: The Hooked Lantern
export function tavern(o) {
  const k = new Kit(); const rnd = mulberry32(o.seed * 1e6 | 0);
  const lit = o.lit;
  const w = 3.5, d = 3.0;
  k.frustum({ w0: w + 0.2, d0: d + 0.2, w1: w, d1: d, h: 1.5, mat: 'ashlarDark', uvScale: 1.6 });
  k.box({ w, d, h: 1.9, y: 1.5, mat: 'plasterRose', uvScale: 1.8 });
  const jw = w + 0.6, jd = d + 0.5, jy = 3.4;
  k.box({ w: jw, h: 0.2, d: jd, y: jy, z: 0.2, mat: 'timberDark' });
  k.box({ w: jw, d: jd, h: 1.9, y: jy + 0.2, z: 0.2, mat: 'chevron', uvScale: 2.0, top: false });
  for (const bx of [-1.4, -0.5, 0.5, 1.4]) k.box({ x: bx, y: 3.0, z: d / 2 + 0.15, w: 0.14, h: 0.45, d: 0.35, mat: 'timberDark' });
  k.box({ w: jw + 1.0, h: 0.12, d: jd + 1.0, y: jy + 2.05, z: 0.2, mat: 'timberDark' });
  k.roof({ w: jw + 1.0, d: jd + 1.0, h: 2.7, y: jy + 2.1, z: 0.2, ridge: 1.2, mat: 'tile', curve: 0.14 });
  finialEl(k, { x: -0.5, y: jy + 4.75, z: 0.2, size: 1 }); finialEl(k, { x: 0.7, y: jy + 4.75, z: 0.2, size: 1 });
  chimneyEl(k, { x: -1.2, y: jy + 3.0, z: -0.5, h: 1.8 }); chimneyEl(k, { x: 1.4, y: jy + 3.0, z: -0.3, h: 1.6 });
  // ground floor: wide window with bottle shelf, door; upper: E e E windows
  windowEl(k, { x: 1.0, y: 1.9, z: d / 2, w: 1.0, h: 0.9, lit, shutters: true });
  windowEl(k, { x: -1.0, y: jy + 0.75, z: jd / 2 + 0.2, w: 0.5, h: 0.85, lit, shutters: false });
  windowEl(k, { x: 1.0, y: jy + 0.75, z: jd / 2 + 0.2, w: 0.5, h: 0.85, lit, shutters: false });
  windowEl(k, { x: 0, y: jy + 1.0, z: jd / 2 + 0.2, w: 0.3, h: 0.4, lit, shutters: false });
  doorEl(k, { x: -0.7, z: (w + 0.2) / 2 - 0.2, glyph: 'T', w: 0.95, h: 1.7, mat: 'timber' });
  // porch: a teal lean-to on two posts sheltering the door and the benches
  for (const px of [-1.6, 1.6]) k.box({ x: px, y: 0, z: 2.35, w: 0.16, h: 2.3, d: 0.16, mat: 'timberDark' });
  k.poly([V(-1.9, 2.55, 2.6), V(1.9, 2.55, 2.6), V(1.9, 3.15, d / 2 - 0.1), V(-1.9, 3.15, d / 2 - 0.1)], 'tileTeal', { uvScale: 1.2 });
  k.box({ x: 0, y: 2.45, z: 2.6, w: 3.9, h: 0.12, d: 0.14, mat: 'timberDark' });
  // the big hooked lantern sign: an oversized hook lamp swinging out over the street from the jetty
  hookLampEl(k, { x: 0.6, y: 4.2, z: jd / 2 + 0.35, lit, size: 1.7 });
  // painted sign board hanging under the porch: a lantern on a hook
  k.box({ x: -0.9, y: 1.9, z: 2.62, w: 0.9, h: 0.5, d: 0.05, mat: 'inkBlue' });
  k.box({ x: -0.9, y: 2.0, z: 2.66, w: 0.2, h: 0.28, d: 0.03, mat: 'lamp' });
  // tables and benches outside, barrels stacked
  for (const tx of [1.3]) {
    k.cyl({ x: tx, y: 0, z: 2.05, r: 0.08, h: 0.7, seg: 5, mat: 'timberDark' });
    k.cyl({ x: tx, y: 0.7, z: 2.05, r: 0.45, r2: 0.45, h: 0.06, seg: 8, mat: 'timber' });
    k.cyl({ x: tx + 0.15, y: 0.76, z: 2.1, r: 0.06, r2: 0.05, h: 0.16, seg: 6, mat: 'brass' });
    k.cyl({ x: tx - 0.15, y: 0.76, z: 1.95, r: 0.06, r2: 0.05, h: 0.16, seg: 6, mat: 'glass' });
  }
  barrelEl(k, { x: -1.7, z: 1.8, r: 0.28, h: 0.7 }); barrelEl(k, { x: -1.7, z: 1.2, r: 0.28, h: 0.7 });
  barrelEl(k, { x: -1.7, y: 0.7, z: 1.5, r: 0.28, h: 0.7 });
  return k.build();
}

// ------------------------------------------------------------ Chancery (2x2): the landmark
export function chancery(o) {
  const k = new Kit();
  const lit = o.lit;
  // a hall (7 x 5) with a tall central pavilion (4 x 4) rising through the roof, all tented
  const hw = 7.0, hd = 5.4;
  k.frustum({ w0: hw + 0.3, d0: hd + 0.3, w1: hw, d1: hd, h: 2.0, mat: 'ashlar', uvScale: 1.8 });
  k.box({ w: hw, d: hd, h: 3.0, y: 2.0, mat: 'plaster', uvScale: 2.2 });
  k.box({ w: hw + 0.9, d: hd + 0.9, h: 0.16, y: 5.0, mat: 'timberDark' });
  k.roof({ w: hw + 0.9, d: hd + 0.9, h: 2.4, y: 5.1, ridge: 3.0, mat: 'tile', curve: 0.1 });
  // pavilion
  const pw = 3.6;
  k.box({ w: pw, d: pw, h: 4.6, y: 4.0, mat: 'plasterGrey', uvScale: 2 });
  k.box({ w: pw + 0.5, d: pw + 0.5, h: 0.5, y: 8.6, mat: 'timberDark' });
  k.box({ w: pw + 0.4, d: pw + 0.4, h: 1.6, y: 9.1, mat: 'chevron', uvScale: 1.9, top: false });
  k.box({ w: pw + 1.2, d: pw + 1.2, h: 0.14, y: 10.7, mat: 'timberDark' });
  k.roof({ w: pw + 1.2, d: pw + 1.2, h: 3.4, y: 10.8, mat: 'tile', curve: 0.2 });
  finialEl(k, { x: 0, y: 14.15, z: 0, size: 1.8 });
  // four corner finials on the hall roof hips
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) finialEl(k, { x: sx * (hw / 2 + 0.2), y: 5.05, z: sz * (hd / 2 + 0.2), size: 0.7 });
  // the great seal: a big wax disc on the pavilion front, and a clock-like brass ring
  k.cyl({ x: 0, y: 6.9, z: pw / 2 + 0.05, r: 0.95, r2: 0.95, h: 0.12, seg: 16, mat: 'brass', rx: Math.PI / 2 });
  sealEl(k, { x: 0, y: 6.9, z: pw / 2 + 0.14, glyph: 'H', r: 0.8 });
  // windows: E e E e E along the hall, tall arched pairs on the pavilion
  for (let i = -2; i <= 2; i++) {
    const big = i % 2 === 0;
    windowEl(k, { x: i * 1.5, y: big ? 2.6 : 3.0, z: hd / 2, w: big ? 0.6 : 0.34, h: big ? 1.5 : 0.7, shutters: big, lit });
    windowEl(k, { x: i * 1.5, y: big ? 2.6 : 3.0, z: -hd / 2, rot: Math.PI, w: big ? 0.6 : 0.34, h: big ? 1.5 : 0.7, shutters: false, lit });
  }
  for (const rot of [Math.PI / 2, -Math.PI / 2, Math.PI, 0]) {
    const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
    for (const dx of [-0.7, 0.7]) windowEl(k, { x: fwd.x * (pw / 2) + right.x * dx, y: 9.4, z: fwd.z * (pw / 2) + right.z * dx, rot, w: 0.5, h: 1.0, shutters: false, lit, sill: false });
    if (rot !== 0) windowEl(k, { x: fwd.x * (pw / 2) + right.x * 0, y: 6.4, z: fwd.z * (pw / 2), rot, w: 0.6, h: 1.4, shutters: false, lit, sill: false });
  }
  // grand door with three steps and twin hook lamps
  doorEl(k, { x: 0, z: (hw + 0.3) / 2 - 0.15 + 0.1 - 0.1, glyph: 'H', w: 1.3, h: 2.3, steps: 3, mat: 'wax' });
  hookLampEl(k, { x: -1.6, y: 3.6, z: hd / 2 + 0.05, lit, size: 1.1 }); hookLampEl(k, { x: 1.6, y: 3.6, z: hd / 2 + 0.05, lit, size: 1.1 });
  chimneyEl(k, { x: -2.6, y: 6.0, z: -1.2, h: 1.8 }); chimneyEl(k, { x: 2.6, y: 6.0, z: -1.2, h: 1.8 });
  // flag pole with a pennant, ledger crates
  k.cyl({ x: 3.2, y: 0, z: 3.0, r: 0.06, h: 5.5, seg: 6, mat: 'brass' });
  k.poly([V(3.2, 5.4, 3.0), V(3.2, 4.7, 3.0), V(4.4, 5.05, 3.0)], 'wax');
  crateEl(k, { x: -3.0, z: 3.0, s: 0.55, mat: 'cream' }); inkJarsEl(k, { x: -2.3, z: 3.1, n: 3, seed: 0.4 });
  spoutEl(k, { x: (hw + 0.9) / 2 - 0.2, y: 5.0, z: (hd + 0.9) / 2 - 0.1 }); spoutEl(k, { x: -(hw + 0.9) / 2 + 0.2, y: 5.0, z: (hd + 0.9) / 2 - 0.1 });
  return k.build();
}

// ------------------------------------------------------------ Observatory (2x2)
export function observatory(o) {
  const k = new Kit();
  const lit = o.lit;
  // a low square wing and a tall drum with a cobalt dome split by a brass slit
  k.frustum({ w0: 7.2, d0: 4.0, w1: 7.0, d1: 3.8, h: 1.6, z: 1.6, mat: 'ashlar', uvScale: 1.8 });
  k.box({ w: 7.0, d: 3.8, h: 2.0, y: 1.6, z: 1.6, mat: 'plasterGrey', uvScale: 2 });
  k.box({ w: 7.8, d: 4.6, h: 0.14, y: 3.6, z: 1.6, mat: 'timberDark' });
  k.roof({ w: 7.8, d: 4.6, h: 1.8, y: 3.7, z: 1.6, ridge: 3.5, mat: 'tile' });
  finialEl(k, { x: -1.75, y: 5.45, z: 1.6, size: 0.8 }); finialEl(k, { x: 1.75, y: 5.45, z: 1.6, size: 0.8 });
  for (let i = -2; i <= 2; i++) windowEl(k, { x: i * 1.3, y: 2.0, z: 3.5, w: i % 2 ? 0.34 : 0.55, h: i % 2 ? 0.6 : 1.1, shutters: i % 2 === 0, lit });
  doorEl(k, { x: 0, z: 3.5 + 0.05, glyph: 'O', w: 1.0, h: 1.8, steps: 2, mat: 'inkBlue' });
  // drum
  k.cyl({ r: 2.6, r2: 2.4, h: 6.5, y: 0, z: -1.4, seg: 12, mat: 'ashlarDark' });
  k.cyl({ r: 2.5, r2: 2.5, h: 0.5, y: 6.5, z: -1.4, seg: 12, mat: 'timberDark' });
  k.cyl({ r: 2.7, r2: 2.7, h: 0.3, y: 7.0, z: -1.4, seg: 12, mat: 'brass' });
  k.sphere({ r: 2.6, y: 7.2, z: -1.4, seg: 14, mat: 'tile', sy: 0.85 });
  k.box({ x: 0, y: 7.2, z: -1.4, w: 0.5, h: 3.0, d: 5.4, mat: 'brass' });
  // telescope poking out
  k.cyl({ x: 0.2, y: 8.6, z: -0.2, r: 0.28, r2: 0.2, h: 2.4, seg: 8, mat: 'copper', rx: -1.0 });
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; windowEl(k, { x: Math.sin(a) * 2.5, y: 3.2, z: -1.4 + Math.cos(a) * 2.5, rot: a, w: 0.4, h: 1.2, shutters: false, lit, sill: false }); }
  finialEl(k, { x: 0, y: 9.4, z: -1.4, size: 1.2 });
  hookLampEl(k, { x: -1.4, y: 3.0, z: 3.55, lit, size: 0.9 }); hookLampEl(k, { x: 1.4, y: 3.0, z: 3.55, lit, size: 0.9 });
  chimneyEl(k, { x: 2.8, y: 4.3, z: 0.8, h: 1.5 });
  inkJarsEl(k, { x: 2.8, z: 3.8, n: 3, seed: 0.7 });
  return k.build();
}

// ------------------------------------------------------------ Ley infrastructure
export function lamp(o) {
  const k = new Kit();
  // crook-pole: a tall post curling into a hook, lantern hanging; a small stone foot with a sip-pipe
  k.cyl({ r: 0.32, r2: 0.28, h: 0.35, seg: 8, mat: 'ashlar', x: 1.2, z: 1.2 });
  k.cyl({ r: 0.09, r2: 0.06, h: 3.6, y: 0.35, seg: 7, mat: 'ink', x: 1.2, z: 1.2 });
  const t = new THREE.TorusGeometry(0.42, 0.06, 6, 14, Math.PI * 1.15);
  k.geom(t, 'ink', { x: 1.2 - 0.42, y: 3.95, z: 1.2, rz: 0 });
  // lantern hanging from the hook tip
  const lx = 1.2 - 0.82, ly = 3.7;
  k.cyl({ x: lx, y: ly - 0.2, z: 1.2, r: 0.025, h: 0.25, seg: 4, mat: 'ink' });
  k.box({ x: lx, y: ly - 0.25, z: 1.2, w: 0.34, h: 0.07, d: 0.34, mat: 'brass' });
  k.box({ x: lx, y: ly - 0.62, z: 1.2, w: 0.26, h: 0.38, d: 0.26, mat: o.supplied ? 'lamp' : 'glass' });
  for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.box({ x: lx + dx * 0.13, y: ly - 0.62, z: 1.2 + dz * 0.13, w: 0.03, h: 0.4, d: 0.03, mat: 'ink' });
  k.box({ x: lx, y: ly - 0.7, z: 1.2, w: 0.34, h: 0.08, d: 0.34, mat: 'brass' });
  k.cone({ x: lx, y: ly - 0.85, z: 1.2, r: 0.1, h: 0.16, seg: 5, mat: 'brass' });
  // sip pipe from the channel up the pole
  k.cyl({ x: 1.32, y: 0.0, z: 1.2, r: 0.03, h: 1.0, seg: 4, mat: 'copper' });
  k.cyl({ x: 1.32, y: 0.05, z: 1.2 - 0.3, r: 0.03, h: 0.6, seg: 4, mat: 'copper', rx: Math.PI / 2 });
  return k.build();
}

export function cistern(o) {
  const k = new Kit();
  // a tall stone tank with a copper lid, a gauge glass, and a hooked inlet from the street
  k.cyl({ r: 1.5, r2: 1.4, h: 2.4, seg: 8, mat: 'ashlarDark', ry: Math.PI / 8 });
  k.cyl({ r: 1.45, r2: 1.45, h: 0.18, y: 1.1, seg: 8, mat: 'brass', ry: Math.PI / 8 });
  k.cyl({ r: 1.55, r2: 1.55, h: 0.14, y: 2.4, seg: 8, mat: 'cream', ry: Math.PI / 8 });
  k.cyl({ r: 1.5, r2: 0.3, h: 1.0, y: 2.54, seg: 8, mat: 'copper', ry: Math.PI / 8 });
  finialEl(k, { x: 0, y: 3.5, z: 0, size: 0.8 });
  k.box({ x: 1.45, y: 0.3, z: 0.4, w: 0.14, h: 2.0, d: 0.14, mat: 'glass' });
  k.box({ x: 1.45, y: 0.3, z: 0.4, w: 0.09, h: o.onLey ? 1.6 : 0.3, d: 0.09, mat: 'ley' });
  // inlet: a copper pipe from the front edge curling over the rim
  k.cyl({ x: 0, y: 0.1, z: 1.6, r: 0.08, h: 2.2, seg: 6, mat: 'copper' });
  const t = new THREE.TorusGeometry(0.3, 0.08, 6, 10, Math.PI);
  k.geom(t, 'copper', { x: 0, y: 2.3, z: 1.3, ry: Math.PI / 2, rz: 0 });
  k.cyl({ x: 0, y: 0.0, z: 1.9, r: 0.08, h: 0.6, seg: 6, mat: 'copper', rx: Math.PI / 2 });
  sealEl(k, { x: -0.6, y: 1.7, z: 1.42, glyph: 'C', r: 0.15 });
  return k.build();
}

export function wardstone(o) {
  const k = new Kit();
  // a tall standing stone, leaning slightly, hooped in brass, with a big wax seal
  k.cyl({ r: 1.3, r2: 1.3, h: 0.12, seg: 8, mat: 'ashlar', ry: Math.PI / 8 });
  k.frustum({ w0: 1.2, d0: 0.8, w1: 0.7, d1: 0.5, h: 3.6, y: 0.1, mat: 'rock', uvScale: 1.2, shear: [0.12, 0.05] });
  k.frustum({ w0: 1.28, d0: 0.88, w1: 1.2, d1: 0.8, h: 0.14, y: 1.4, mat: 'brass', shear: [0.04, 0.02] });
  k.frustum({ w0: 1.0, d0: 0.66, w1: 0.95, d1: 0.62, h: 0.12, y: 2.8, mat: 'brass', shear: [0.09, 0.04] });
  sealEl(k, { x: 0.02, y: 2.1, z: 0.36, glyph: 'D', r: 0.28 });
  // candles melted on the base
  for (let i = 0; i < 4; i++) { const a = i * 1.7; k.cyl({ x: Math.cos(a) * 0.85, y: 0.12, z: Math.sin(a) * 0.85, r: 0.06, h: 0.15 + (i % 2) * 0.12, seg: 6, mat: 'waxPale' }); }
  k.cyl({ x: 0.5, y: 0.12, z: 0.9, r: 0.06, h: 0.25, seg: 6, mat: 'wax' });
  return k.build();
}

export function leywell(o) {
  const k = new Kit();
  // a square stone wellhead with a brass pump, copper pipes curling into a small basin of ley
  k.box({ w: 3.2, d: 3.2, h: 0.14, mat: 'ashlar', uvScale: 1.4 });
  k.frustum({ w0: 2.2, d0: 2.2, w1: 2.0, d1: 2.0, h: 1.0, y: 0.14, mat: 'ashlarDark', uvScale: 1.2 });
  k.box({ w: 2.15, d: 2.15, h: 0.12, y: 1.14, mat: 'cream' });
  k.cyl({ r: 0.75, r2: 0.75, h: 0.08, y: 1.2, seg: 10, mat: 'ley' });
  // pump
  k.cyl({ x: -0.6, y: 1.26, z: -0.6, r: 0.16, h: 1.4, seg: 8, mat: 'brass' });
  k.cyl({ x: -0.6, y: 2.66, z: -0.6, r: 0.22, r2: 0.05, h: 0.4, seg: 8, mat: 'brass' });
  k.box({ x: -0.2, y: 2.4, z: -0.6, w: 1.1, h: 0.08, d: 0.08, rot: 0, mat: 'brass' });
  const t = new THREE.TorusGeometry(0.3, 0.07, 6, 10, Math.PI);
  k.geom(t, 'copper', { x: 0.1, y: 2.0, z: -0.6, rz: 0 });
  k.cyl({ x: 0.4, y: 1.2, z: -0.6, r: 0.07, h: 0.8, seg: 6, mat: 'copper' });
  // outlet spouts toward the streets on four sides
  for (const rot of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) spoutEl(k, { x: Math.sin(rot) * 1.1, y: 1.05, z: Math.cos(rot) * 1.1, rot });
  sealEl(k, { x: 0.5, y: 0.7, z: 1.12, glyph: 'Y', r: 0.16 });
  finialEl(k, { x: 0.8, y: 1.26, z: 0.8, size: 0.7 });
  return k.build();
}

export const BUILDERS = { lodging, jhouse, tower, garden, woodcutter, stonecutter, well, scriptorium, bakery, alembic, tavern, chancery, observatory, lamp, cistern, wardstone, leywell };
