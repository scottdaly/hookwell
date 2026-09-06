import * as THREE from 'three';
import { Kit, V } from './kit.js';
import { materials } from './materials.js';
import { sealTex } from '../render/textures.js';

// Shared architectural elements. Every building is composed from these so the
// hooks, seals, windows and chimneys are the same family across the city.

// A tall four-pane window. Placed on a wall facing `rot` (0 = +z), at wall surface.
export function windowEl(k, { x, y, z, rot = 0, w = 0.55, h = 0.95, shutters = true, lit = false, sill = true }) {
  const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  const at = (dx, dy, dz) => ({ x: x + right.x * dx + fwd.x * dz, y: y + dy, z: z + right.z * dx + fwd.z * dz });
  // frame
  k.box({ ...at(0, -0.08, 0.0), w: w + 0.16, h: h + 0.16, d: 0.05, rot, mat: 'cream', uvScale: 1 });
  // glass (proud of the frame) and mullions in a cross: four panes
  k.box({ ...at(0, 0, 0.05), w, h, d: 0.03, rot, mat: lit ? 'glassLit' : 'glass' });
  k.box({ ...at(0, 0, 0.08), w: 0.05, h, d: 0.02, rot, mat: 'ink' });
  k.box({ ...at(0, h * 0.58, 0.08), w, h: 0.05, d: 0.02, rot, mat: 'ink' });
  if (sill) k.box({ ...at(0, -0.14, 0.06), w: w + 0.3, h: 0.08, d: 0.16, rot, mat: 'ashlar', uvScale: 1 });
  if (shutters) {
    for (const side of [-1, 1]) {
      const sx = side * (w / 2 + 0.24);
      k.box({ ...at(sx, -0.02, 0.02), w: 0.3, h: h + 0.05, d: 0.05, rot, mat: 'inkBlue' });
      // Z brace: two rails and a diagonal, in chalk
      k.box({ ...at(sx, h * 0.82, 0.05), w: 0.26, h: 0.04, d: 0.02, rot, mat: 'cream' });
      k.box({ ...at(sx, h * 0.12, 0.05), w: 0.26, h: 0.04, d: 0.02, rot, mat: 'cream' });
      const q = at(sx, h / 2, 0.06);
      k.geom(new THREE.BoxGeometry(0.04, h * 0.75, 0.02), 'cream', { x: q.x, y: q.y, z: q.z, ry: rot, rz: side * 0.32 });
    }
  }
}

// Round-arched door with two steps and the wax seal plate beside it.
export function doorEl(k, { x, y = 0, z, rot = 0, w = 0.8, h = 1.5, glyph = 'A', steps = 2, seal = true, mat = 'timberDark' }) {
  const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  const at = (dx, dy, dz) => ({ x: x + right.x * dx + fwd.x * dz, y: y + dy, z: z + right.z * dx + fwd.z * dz });
  // door surround: herringbone-ish arch approximated by a chalk surround
  k.box({ ...at(0, h / 2 + 0.05, 0.02), w: w + 0.36, h: h + 0.2, d: 0.05, rot, mat: 'cream' });
  k.box({ ...at(0, h / 2, 0.05), w, h, d: 0.04, rot, mat });
  k.cyl({ ...at(0, h - 0.02, 0.05), r: w / 2, h: 0.04, seg: 12, mat, rx: Math.PI / 2 });
  k.cyl({ ...at(0, h, 0.03), r: w / 2 + 0.16, h: 0.05, seg: 14, mat: 'cream', rx: Math.PI / 2 });
  // planks: vertical ink lines
  for (let i = -1; i <= 1; i++) k.box({ ...at(i * w / 3, h / 2, 0.075), w: 0.03, h: h - 0.1, d: 0.01, rot, mat: 'ink' });
  // handle
  k.sphere({ ...at(w * 0.3, h * 0.45, 0.1), r: 0.05, mat: 'brass', seg: 6 });
  for (let i = 0; i < steps; i++) k.box({ ...at(0, 0.09 * (steps - i) - 0.09, 0.2 * (i + 1) + 0.05), w: w + 0.6 + i * 0.25, h: 0.18 - i * 0.03, d: 0.4, rot, mat: 'ashlar', uvScale: 1 });
  if (seal) sealEl(k, { ...at(w / 2 + 0.45, h * 0.62, 0.02), rot, glyph });
}

export function sealEl(k, { x, y, z, rot = 0, glyph = 'A', r = 0.17 }) {
  const M = materials();
  const key = 'seal_' + glyph;
  if (!M[key]) M[key] = new THREE.MeshLambertMaterial({ map: sealTex(glyph), transparent: true, alphaTest: 0.4, vertexColors: true });
  const g = new THREE.PlaneGeometry(r * 2, r * 2);
  k.geom(g, key, { x, y, z, ry: rot });
  // small plaque behind
  const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  k.box({ x: x - fwd.x * 0.04, y: y - r * 1.15, z: z - fwd.z * 0.04, w: r * 2.3, h: r * 2.3, d: 0.03, rot, mat: 'cream' });
}

// Twin chimney stack: a stone stack with two flues topped with brass caps.
export function chimneyEl(k, { x, y, z, h = 1.4, rot = 0, single = false }) {
  k.box({ x, y, z, w: single ? 0.5 : 0.95, h, d: 0.5, rot, mat: 'ashlarDark', uvScale: 1.2 });
  k.box({ x, y: y + h, z, w: single ? 0.62 : 1.07, h: 0.12, d: 0.62, rot, mat: 'cream' });
  const c = Math.cos(rot), s = Math.sin(rot);
  const flues = single ? [0] : [-0.22, 0.22];
  for (const dx of flues) {
    k.cyl({ x: x + dx * c, y: y + h + 0.1, z: z + dx * s, r: 0.12, h: 0.35, seg: 7, mat: 'wax' });
    k.cone({ x: x + dx * c, y: y + h + 0.45, z: z + dx * s, r: 0.18, h: 0.16, seg: 7, mat: 'brass' });
  }
}

// Brass hook finial at a roof apex (the J).
export function finialEl(k, { x, y, z, size = 1, rot = 0 }) {
  size *= 1.35;
  k.cyl({ x, y, z, r: 0.06 * size, h: 0.6 * size, seg: 6, mat: 'brass' });
  k.sphere({ x, y: y + 0.6 * size, z, r: 0.12 * size, seg: 6, mat: 'brass' });
  const t = new THREE.TorusGeometry(0.26 * size, 0.06 * size, 5, 12, Math.PI * 1.35);
  k.geom(t, 'brass', { x, y: y + 0.72 * size + 0.05 * size, z, ry: rot, rz: 0, rx: 0 });
  k.sphere({ x: x + Math.cos(rot) * 0.26 * size * Math.cos(Math.PI * 1.35), y: y + 0.77 * size + Math.sin(Math.PI * 1.35) * 0.26 * size, z: z - Math.sin(rot) * 0.26 * size * Math.cos(Math.PI * 1.35), r: 0.07 * size, seg: 5, mat: 'wax' });
}

// Hook-lamp bracket: a curled brass arm holding a hanging lantern.
export function hookLampEl(k, { x, y, z, rot = 0, lit = false, size = 1 }) {
  const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  const at = (dx, dy, dz) => ({ x: x + right.x * dx + fwd.x * dz, y: y + dy, z: z + right.z * dx + fwd.z * dz });
  // arm out, then the hook curl
  k.cyl({ ...at(0, 0, 0.25 * size), r: 0.035 * size, h: 0.5 * size, seg: 5, mat: 'brass', rx: Math.PI / 2, ry: rot });
  const t = new THREE.TorusGeometry(0.16 * size, 0.035 * size, 5, 10, Math.PI * 1.1);
  const p = at(0, -0.14 * size, 0.5 * size);
  k.geom(t, 'brass', { x: p.x, y: p.y, z: p.z, ry: rot + Math.PI / 2, rz: Math.PI * 0.5 });
  // lantern hanging from the hook tip
  const l = at(0, -0.34 * size, 0.62 * size);
  k.cyl({ x: l.x, y: l.y - 0.32 * size, z: l.z, r: 0.03 * size, h: 0.12 * size, seg: 4, mat: 'ink' });
  k.box({ x: l.x, y: l.y - 0.36 * size, z: l.z, w: 0.22 * size, h: 0.06 * size, d: 0.22 * size, rot, mat: 'brass' });
  k.box({ x: l.x, y: l.y - 0.6 * size, z: l.z, w: 0.18 * size, h: 0.26 * size, d: 0.18 * size, rot, mat: lit ? 'lamp' : 'glass' });
  k.box({ x: l.x, y: l.y - 0.66 * size, z: l.z, w: 0.24 * size, h: 0.06 * size, d: 0.24 * size, rot, mat: 'brass' });
  for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const q = at(dx * 0.09 * size, -0.34 * size - 0.36 * size, 0.62 * size + dz * 0.09 * size);
    k.box({ x: q.x, y: q.y + 0.1 * size, z: q.z, w: 0.025 * size, h: 0.26 * size, d: 0.025 * size, rot, mat: 'ink' });
  }
}

// Hooked gutter spout at an eave corner, dripping toward the street.
export function spoutEl(k, { x, y, z, rot = 0 }) {
  const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  k.cyl({ x: x + fwd.x * 0.15, y: y - 0.05, z: z + fwd.z * 0.15, r: 0.05, h: 0.4, seg: 6, mat: 'copper', rx: Math.PI / 2, ry: rot });
  const t = new THREE.TorusGeometry(0.12, 0.05, 5, 8, Math.PI);
  k.geom(t, 'copper', { x: x + fwd.x * 0.35, y: y - 0.17, z: z + fwd.z * 0.35, ry: rot + Math.PI / 2, rz: Math.PI });
}

// Zigzag fence segment along +x of length len at x,z.
export function fenceEl(k, { x, y = 0, z, len, rot = 0, h = 0.7 }) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const n = Math.max(2, Math.round(len / 0.7));
  const step = len / n;
  for (let i = 0; i <= n; i++) {
    const px = x + (i * step - len / 2) * c, pz = z + (i * step - len / 2) * s;
    k.box({ x: px, y, z: pz, w: 0.09, h: h + (i % 2) * 0.12, d: 0.09, rot, mat: 'timber', uvScale: 1 });
  }
  // zigzag rail: alternate diagonals
  for (let i = 0; i < n; i++) {
    const ax = (i * step - len / 2), bx = ((i + 1) * step - len / 2);
    const ay = i % 2 ? h * 0.85 : h * 0.35, by = i % 2 ? h * 0.35 : h * 0.85;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const L = Math.hypot(bx - ax, by - ay);
    const ang = Math.atan2(by - ay, bx - ax);
    k.geom(new THREE.BoxGeometry(L, 0.06, 0.05), 'timber', { x: x + mx * c, y: y + my, z: z + mx * s, ry: -rot, rz: ang });
  }
  k.geom(new THREE.BoxGeometry(len, 0.05, 0.05), 'timber', { x, y: y + h * 0.95, z, ry: -rot });
}

export function barrelEl(k, { x, y = 0, z, r = 0.3, h = 0.7 }) {
  k.cyl({ x, y, z, r: r * 0.9, r2: r * 0.9, h, seg: 9, mat: 'timber' });
  k.cyl({ x, y: y + h * 0.45, z, r, r2: r, h: h * 0.4, seg: 9, mat: 'timber' });
  k.cyl({ x, y: y + h * 0.18, z, r: r * 0.97, r2: r * 0.97, h: 0.05, seg: 9, mat: 'brass' });
  k.cyl({ x, y: y + h * 0.75, z, r: r * 0.97, r2: r * 0.97, h: 0.05, seg: 9, mat: 'brass' });
}

export function crateEl(k, { x, y = 0, z, s = 0.5, rot = 0, mat = 'timber' }) {
  k.box({ x, y, z, w: s, h: s * 0.8, d: s, rot, mat, uvScale: 0.6 });
  k.box({ x, y: y + s * 0.8, z, w: s * 1.02, h: 0.03, d: s * 1.02, rot, mat: 'ink' });
}

export function inkJarsEl(k, { x, y = 0, z, n = 3, seed = 0 }) {
  for (let i = 0; i < n; i++) {
    const a = seed * 6 + i * 2.1;
    const px = x + Math.cos(a) * 0.22 * (i ? 1 : 0), pz = z + Math.sin(a) * 0.22 * (i ? 1 : 0);
    k.cyl({ x: px, y, z: pz, r: 0.13, r2: 0.1, h: 0.3, seg: 7, mat: 'ink' });
    k.cyl({ x: px, y: y + 0.3, z: pz, r: 0.07, r2: 0.08, h: 0.06, seg: 7, mat: 'wax' });
  }
}

export function signEl(k, { x, y, z, rot = 0, mat = 'cream', glyphMat = 'wax' }) {
  const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  const at = (dx, dy, dz) => ({ x: x + right.x * dx + fwd.x * dz, y: y + dy, z: z + right.z * dx + fwd.z * dz });
  k.cyl({ ...at(0, 0, 0.3), r: 0.035, h: 0.6, seg: 5, mat: 'brass', rx: Math.PI / 2, ry: rot });
  const t = new THREE.TorusGeometry(0.1, 0.03, 5, 8, Math.PI);
  const p = at(0, -0.1, 0.58);
  k.geom(t, 'brass', { x: p.x, y: p.y, z: p.z, ry: rot + Math.PI / 2, rz: Math.PI * 0.5 });
  const b = at(0, -0.5, 0.58);
  k.box({ x: b.x, y: b.y, z: b.z, w: 0.6, h: 0.45, d: 0.05, rot: rot + Math.PI / 2, mat });
  k.box({ x: b.x, y: b.y + 0.12, z: b.z, w: 0.34, h: 0.2, d: 0.07, rot: rot + Math.PI / 2, mat: glyphMat });
}
