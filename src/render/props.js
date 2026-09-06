import * as THREE from 'three';
import { Kit, V } from './kit.js';
import { mulberry32 } from '../game/state.js';

// Candle-pine: tall, narrow, dark teal tiers, a drooping hooked tip.
export function candlePine(seed) {
  const k = new Kit(); const rnd = mulberry32(seed * 1e6 | 0);
  const h = 6.0 + rnd() * 3.0;
  const lean = (rnd() - 0.5) * 0.16;
  const tint = [0xffffff, 0xd8e6de, 0xc4d8cc][Math.floor(rnd() * 3)];
  const rim = 0x9fc9b4;
  // bare trunk for the lower third, then a tight column of drip-tiers
  k.cyl({ r: 0.2, r2: 0.12, h: h * 0.42, seg: 6, mat: 'pineTrunk', rz: lean * 0.4 });
  const tiers = 6 + Math.floor(rnd() * 3);
  const y0 = h * 0.3, y1 = h * 0.86;
  for (let i = 0; i < tiers; i++) {
    const f = i / (tiers - 1);
    const y = y0 + f * (y1 - y0);
    const r = (0.78 - f * 0.45) * (0.9 + rnd() * 0.25);
    const th = 1.35 - f * 0.4;
    k.cone({ r, h: th, y: y - th * 0.15, x: lean * y * 0.4, seg: 10, mat: 'pine', tint, rimTint: rim, rz: lean * 0.3 });
  }
  // the guttering tip: three small cones bending over into a hook
  const ty = y1 + 0.7, tx = lean * ty * 0.4;
  const dir = rnd() < 0.5 ? 1 : -1;
  k.cone({ r: 0.22, h: 0.9, y: ty - 0.2, x: tx, seg: 6, mat: 'pine', tint, rimTint: rim, rz: dir * 0.35 });
  k.geom(new THREE.ConeGeometry(0.16, 0.7, 6), 'pine', { x: tx + dir * 0.28, y: ty + 0.62, z: 0, rz: -dir * 0.95, tint });
  k.geom(new THREE.ConeGeometry(0.09, 0.45, 5), 'pine', { x: tx + dir * 0.55, y: ty + 0.68, z: 0, rz: -dir * 1.75, tint });
  return k.build();
}

// Inkwood: a pale trunk with a broad blue-black blobby crown.
export function inkwood(seed) {
  const k = new Kit(); const rnd = mulberry32(seed * 1e6 | 0);
  k.cyl({ r: 0.28, r2: 0.18, h: 2.4, seg: 7, mat: 'inkwoodTrunk' });
  for (let i = 0; i < 3; i++) { const a = i * 2.1 + rnd(); k.cyl({ r: 0.1, r2: 0.05, h: 1.2, y: 2.0, x: Math.cos(a) * 0.3, z: Math.sin(a) * 0.3, seg: 5, mat: 'inkwoodTrunk', rz: Math.cos(a) * 0.5, rx: -Math.sin(a) * 0.5 }); }
  const n = 5 + Math.floor(rnd() * 2);
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + rnd() * 0.4;
    const r = 0.9 + rnd() * 0.5;
    k.sphere({ x: Math.cos(a) * 0.9, y: 3.2 + rnd() * 0.5, z: Math.sin(a) * 0.9, r, seg: 8, mat: 'inkwood', sy: 0.85 });
  }
  k.sphere({ x: 0, y: 3.9, z: 0, r: 1.3, seg: 9, mat: 'inkwood', sy: 0.8 });
  for (let i = 0; i < 14; i++) { const a = rnd() * 6.3, b = rnd() * 2 - 1; const rr = 1.75; k.sphere({ x: Math.cos(a) * rr * Math.sqrt(1 - b * b), y: 3.6 + b * 1.1, z: Math.sin(a) * rr * Math.sqrt(1 - b * b), r: 0.07, seg: 4, mat: 'waxPale', tint: 0xcfd6ee }); }
  // a hook-hung lantern nobody remembers hanging
  k.cyl({ x: 1.1, y: 2.5, z: 0.6, r: 0.02, h: 0.4, seg: 4, mat: 'ink' });
  k.box({ x: 1.1, y: 2.25, z: 0.6, w: 0.18, h: 0.25, d: 0.18, mat: 'glass' });
  return k.build();
}

function raggedDisc(k, r, mat, seed, y = 0.02, tint) {
  const shape = new THREE.Shape(); const n = 14;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    const rr = r * (0.75 + 0.2 * Math.sin(a * 3 + seed * 17) + 0.12 * Math.sin(a * 5 + seed * 31));
    if (i === 0) shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const g = new THREE.ShapeGeometry(shape, 1); g.rotateX(-Math.PI / 2); g.computeVertexNormals();
  k.geom(g, mat, { y, tint });
}

// Bloom: cobalt-violet caps on pale wax stalks, on a waxy ragged crust; size grows with level.
export function bloom(level, seed) {
  const k = new Kit(); const rnd = mulberry32(seed * 1e6 | 0);
  raggedDisc(k, 1.3 + level * 0.3, 'bloomStalk', seed, 0.02, 0xcfc4d8);
  const n = 2 + level * 3;
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, d = rnd() * (0.9 + level * 0.25);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    const h = (0.3 + rnd() * 0.5) * (0.6 + level * 0.5);
    const r = (0.2 + rnd() * 0.18) * (0.7 + level * 0.35);
    k.cyl({ x, z, r: r * 0.32, r2: r * 0.22, h, seg: 6, mat: 'bloomStalk' });
    // cap: flattened dome with a paler gill ring underneath and a wet highlight
    k.sphere({ x, y: h, z, r, seg: 8, mat: 'bloom', sy: 0.5 + rnd() * 0.25 });
    k.cyl({ x, y: h - r * 0.12, z, r: r * 0.95, r2: r * 0.7, h: r * 0.14, seg: 8, mat: 'waxPale' });
    if (rnd() < 0.7) k.sphere({ x: x + r * 0.3, y: h + r * 0.35, z: z - r * 0.2, r: r * 0.16, seg: 5, mat: 'waxPale' });
  }
  // wax drips creeping outward
  for (let i = 0; i < 3 + level; i++) { const a = rnd() * 6.3; k.sphere({ x: Math.cos(a) * (0.9 + level * 0.2), y: 0.05, z: Math.sin(a) * (0.9 + level * 0.2), r: 0.14 + rnd() * 0.1, seg: 5, mat: 'bloomStalk', sy: 0.4 }); }
  return k.build();
}

// Wax-thistle clump: the ordinary weed of Hookwell. Pale stalks, ochre buds, a few dark leaves.
export function clump(seed, seed2) {
  const k = new Kit(); const rnd = mulberry32((seed * 1e6 + seed2 * 1e3) | 0);
  const cx = (seed - 0.5) * 2.4, cz = (seed2 - 0.5) * 2.4;
  const n = 2 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const x = cx + (rnd() - 0.5) * 1.0, z = cz + (rnd() - 0.5) * 1.0;
    const h = 0.35 + rnd() * 0.5;
    k.cone({ r: 0.16 + rnd() * 0.1, h: 0.4 + rnd() * 0.3, x, z, seg: 5, mat: 'pine', tint: 0x9db07a });
    k.cyl({ x, z, r: 0.02, h, seg: 3, mat: 'bloomStalk', tint: 0xd8cfb0 });
    if (rnd() < 0.6) k.sphere({ x, y: h, z, r: 0.05 + rnd() * 0.03, seg: 5, mat: 'waxPale', tint: rnd() < 0.5 ? 0xd9c48a : 0xe9e0c8 });
  }
  if (rnd() < 0.4) k.frustum({ w0: 0.5, d0: 0.4, w1: 0.3, d1: 0.25, h: 0.25, x: cx + 0.6, z: cz - 0.4, rot: rnd() * 3, mat: 'rock', uvScale: 1 });
  return k.build();
}

// Rock outcrop tile: a few slabs.
export function rockTile(seed) {
  const k = new Kit(); const rnd = mulberry32(seed * 1e6 | 0);
  const n = 2 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const w = 1.2 + rnd() * 2.0, d = 1.0 + rnd() * 1.8, h = 0.4 + rnd() * 1.1;
    k.frustum({ w0: w, d0: d, w1: w * 0.75, d1: d * 0.7, h, x: (rnd() - 0.5) * 2.2, z: (rnd() - 0.5) * 2.2, rot: rnd() * 3, mat: 'rock', uvScale: 1.5, shear: [(rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.3] });
  }
  return k.build();
}

// The spring: a rock knoll cracked open, a basin of ley, brass rods left by whoever measured it first.
export function spring() {
  const k = new Kit();
  k.cyl({ r: 2.4, r2: 2.0, h: 0.9, seg: 9, mat: 'rock' });
  k.cyl({ r: 1.5, r2: 1.5, h: 0.4, y: 0.9, seg: 9, mat: 'ashlarDark' });
  k.cyl({ r: 1.25, r2: 1.25, h: 0.12, y: 1.2, seg: 12, mat: 'ley' });
  k.cyl({ r: 0.4, r2: 0.55, h: 0.5, y: 1.25, seg: 8, mat: 'ley' });
  // four spouts, one per side, so channels can be cut in any direction
  for (const rot of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const fx = Math.sin(rot), fz = Math.cos(rot);
    k.box({ x: fx * 1.8, y: 0.7, z: fz * 1.8, w: 0.5, h: 0.25, d: 0.9, rot, mat: 'ashlarDark' });
    k.box({ x: fx * 1.8, y: 0.8, z: fz * 1.8, w: 0.28, h: 0.1, d: 0.9, rot, mat: 'ley' });
  }
  // brass survey rods with a hooked top
  k.cyl({ x: 1.6, y: 0.9, z: -1.3, r: 0.04, h: 1.6, seg: 5, mat: 'brass' });
  k.geom(new THREE.TorusGeometry(0.16, 0.035, 5, 10, Math.PI * 1.2), 'brass', { x: 1.6 - 0.16, y: 2.5, z: -1.3 });
  k.cyl({ x: -1.4, y: 0.9, z: 1.2, r: 0.04, h: 1.2, seg: 5, mat: 'brass' });
  return k.build();
}

// A little pile of "street furniture" scattered on some road tiles: a mile-seal post or a bollard.
export function milePost(seed) {
  const k = new Kit(); const rnd = mulberry32(seed * 1e6 | 0);
  k.frustum({ w0: 0.36, d0: 0.36, w1: 0.26, d1: 0.26, h: 1.1, mat: 'ashlarDark', uvScale: 1 });
  k.box({ w: 0.34, d: 0.34, h: 0.08, y: 1.1, mat: 'brass' });
  k.cone({ r: 0.2, h: 0.3, y: 1.18, seg: 4, mat: 'tile' });
  return k.build();
}

// The waymark at the old road: a crook-post with the town seal and a lantern. Every visitor passes it.
export function waymark() {
  const k = new Kit();
  k.cyl({ r: 0.5, r2: 0.42, h: 0.3, seg: 7, mat: 'ashlar', x: 0, z: 0 });
  k.cyl({ r: 0.1, r2: 0.07, h: 3.2, y: 0.3, seg: 6, mat: 'timberDark' });
  const t = new THREE.TorusGeometry(0.42, 0.07, 6, 12, Math.PI * 1.1);
  k.geom(t, 'timberDark', { x: 0.42, y: 3.45, z: 0 });
  k.cyl({ x: 0.84, y: 2.9, z: 0, r: 0.02, h: 0.4, seg: 4, mat: 'ink' });
  k.box({ x: 0.84, y: 2.55, z: 0, w: 0.26, h: 0.36, d: 0.26, mat: 'glass' });
  k.box({ x: 0.84, y: 2.9, z: 0, w: 0.32, h: 0.06, d: 0.32, mat: 'brass' });
  k.box({ x: 0.84, y: 2.5, z: 0, w: 0.32, h: 0.06, d: 0.32, mat: 'brass' });
  // the board: HOOKWELL is a seal, not a word
  k.box({ x: 0, y: 1.5, z: 0.12, w: 1.3, h: 0.7, d: 0.08, mat: 'cream' });
  k.box({ x: 0, y: 1.45, z: 0.1, w: 1.4, h: 0.06, d: 0.12, mat: 'timberDark' });
  k.box({ x: 0, y: 2.2, z: 0.1, w: 1.4, h: 0.06, d: 0.12, mat: 'timberDark' });
  k.cyl({ x: 0, y: 1.85, z: 0.17, r: 0.24, r2: 0.24, h: 0.04, seg: 14, mat: 'wax', rx: Math.PI / 2 });
  k.box({ x: -0.42, y: 1.7, z: 0.17, w: 0.28, h: 0.05, d: 0.02, mat: 'ink' });
  k.box({ x: 0.42, y: 1.7, z: 0.17, w: 0.28, h: 0.05, d: 0.02, mat: 'ink' });
  k.box({ x: -0.42, y: 1.95, z: 0.17, w: 0.28, h: 0.05, d: 0.02, mat: 'ink' });
  k.box({ x: 0.42, y: 1.95, z: 0.17, w: 0.28, h: 0.05, d: 0.02, mat: 'ink' });
  // a milestone and a dropped ink jar
  k.frustum({ w0: 0.4, d0: 0.4, w1: 0.3, d1: 0.3, h: 0.7, x: -0.9, z: 0.6, mat: 'ashlarDark', uvScale: 1 });
  k.cyl({ x: 0.7, y: 0, z: 0.9, r: 0.12, r2: 0.09, h: 0.28, seg: 6, mat: 'ink', rz: 1.2 });
  return k.build();
}
