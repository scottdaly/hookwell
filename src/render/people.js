import * as THREE from 'three';
import { Kit } from './kit.js';
import { mulberry32 } from '../game/state.js';

// Inhabitants: chunky, big-headed, ink-lined. Three ranks, three silhouettes.
// apprentice: hooded short cape, book under arm. journeyman: hook-hat, satchel. master: tall hook-hat, lantern on the hook.

export function person(rank, seed) {
  const k = new Kit(); const rnd = mulberry32(seed * 1e6 | 0);
  const skin = rnd() < 0.5 ? 'skin' : 'skinDark';
  const S = 0.62; // overall scale: ~1.5m tall
  const cape = rank === 'apprentice' ? ['capeGrey', 'capeBlue'][Math.floor(rnd() * 2)] : rank === 'journeyman' ? ['capeBlue', 'capeOchre'][Math.floor(rnd() * 2)] : 'hatInk';
  // body: a tapered robe
  k.cyl({ r: 0.42 * S, r2: 0.3 * S, h: 1.2 * S, seg: 7, mat: cape });
  // head
  k.sphere({ r: 0.36 * S, y: 1.42 * S, seg: 8, mat: skin });
  // feet
  k.box({ x: -0.15 * S, y: 0, z: 0.05 * S, w: 0.2 * S, h: 0.12 * S, d: 0.34 * S, mat: 'ink' });
  k.box({ x: 0.15 * S, y: 0, z: 0.05 * S, w: 0.2 * S, h: 0.12 * S, d: 0.34 * S, mat: 'ink' });
  if (rank === 'apprentice') {
    // hood
    k.sphere({ r: 0.42 * S, y: 1.5 * S, z: -0.08 * S, seg: 8, mat: cape, sy: 0.9 });
    k.sphere({ r: 0.3 * S, y: 1.42 * S, z: 0.16 * S, seg: 7, mat: skin });
    // a book under the arm
    k.box({ x: 0.42 * S, y: 0.75 * S, z: 0.05 * S, w: 0.14 * S, h: 0.36 * S, d: 0.3 * S, mat: 'wax' });
  } else {
    const hat = rank === 'master' ? 'hatInk' : ['hatOchre', 'hatWine', 'hatInk'][Math.floor(rnd() * 3)];
    const hh = rank === 'master' ? 1.25 * S : 0.85 * S;
    k.cyl({ r: 0.5 * S, r2: 0.5 * S, h: 0.06 * S, y: 1.65 * S, seg: 9, mat: hat });
    k.cyl({ r: 0.34 * S, r2: 0.16 * S, h: hh, y: 1.68 * S, seg: 7, mat: hat });
    // the hook at the tip
    const t = new THREE.TorusGeometry(0.18 * S, 0.06 * S, 5, 9, Math.PI * 1.1);
    k.geom(t, hat, { x: -0.16 * S, y: 1.68 * S + hh + 0.02 * S, z: 0, rz: 0 });
    // hat band in brass
    k.cyl({ r: 0.36 * S, r2: 0.36 * S, h: 0.1 * S, y: 1.7 * S, seg: 7, mat: 'brass' });
    if (rank === 'master') {
      // lantern hanging from the hook
      k.cyl({ x: -0.34 * S, y: 1.68 * S + hh - 0.25 * S, r: 0.015 * S, h: 0.3 * S, seg: 3, mat: 'ink' });
      k.box({ x: -0.34 * S, y: 1.68 * S + hh - 0.5 * S, w: 0.18 * S, h: 0.26 * S, d: 0.18 * S, mat: 'lamp' });
      k.box({ x: -0.34 * S, y: 1.68 * S + hh - 0.52 * S, w: 0.22 * S, h: 0.04 * S, d: 0.22 * S, mat: 'brass' });
      // a beard
      k.cone({ r: 0.2 * S, h: 0.5 * S, y: 0.95 * S, z: 0.22 * S, seg: 5, mat: 'cream' });
    } else {
      // satchel
      k.box({ x: 0.4 * S, y: 0.6 * S, z: 0, w: 0.16 * S, h: 0.3 * S, d: 0.34 * S, mat: 'timber' });
    }
  }
  const g = k.build({ shadows: true, groundAO: false, wobble: 0 });
  // beards and lanterns flipped make masters look like they are facing +z already; nothing to do.
  return g;
}

// A tiny pool of prefabs per rank/variant so hundreds of people are cheap.
const cache = new Map();
export function personMesh(rank, seed) {
  const variant = Math.floor(seed * 4);
  const key = rank + variant;
  if (!cache.has(key)) cache.set(key, person(rank, 0.13 + variant * 0.21 + (rank === 'master' ? 0.5 : 0)));
  return cache.get(key).clone();
}
