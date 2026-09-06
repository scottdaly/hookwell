import * as THREE from 'three';
import { paperTex } from '../tex.js';

// PAPER-CUT DIORAMA. Everything is cardstock with visible thickness: walls are cut sheets,
// roofs are folded cards, trees are two crossed cut-outs, the ground is stacked contour layers.
// Pastel dyed papers, white cut edges, soft studio light. No outlines: the edge of the paper is the line.

const P = { cream: 0xf6efdd, mint: 0xbfe0cf, peach: 0xf5c7a5, dusk: 0x9fb8d6, butter: 0xf1dc8e, ink: 0x3c3a4c, terra: 0xd98b6c, sage: 0xa9c9a2, moss: 0x8db28a, edge: 0xfbf8f0, water: 0x7fc4d8, rose: 0xe9a9a1 };
let fibre;
const mats = {};
function mat(color) { if (!mats[color]) mats[color] = new THREE.MeshLambertMaterial({ color, map: fibre, vertexColors: true }); return mats[color]; }

// a sheet: a shape extruded by paper thickness, with a lighter edge material on the sides
function sheet(kit, shape, depth, color, opts) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  const n = g.getAttribute('normal'), pos = g.getAttribute('position');
  // split into face/edge geometries by normal z
  const face = [], edge = [];
  for (let i = 0; i < pos.count; i += 3) {
    const nz = Math.abs(n.getZ(i));
    (nz > 0.5 ? face : edge).push(i);
  }
  const pick = (idxs) => { const gg = new THREE.BufferGeometry(); const p = new Float32Array(idxs.length * 9), nn = new Float32Array(idxs.length * 9), uv = new Float32Array(idxs.length * 6);
    idxs.forEach((i, k) => { for (let j = 0; j < 3; j++) { p.set([pos.getX(i + j), pos.getY(i + j), pos.getZ(i + j)], k * 9 + j * 3); nn.set([n.getX(i + j), n.getY(i + j), n.getZ(i + j)], k * 9 + j * 3); uv.set([pos.getX(i + j) * 0.3, pos.getY(i + j) * 0.3], k * 6 + j * 2); } });
    gg.setAttribute('position', new THREE.BufferAttribute(p, 3)); gg.setAttribute('normal', new THREE.BufferAttribute(nn, 3)); gg.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return gg; };
  kit.add(pick(face), mat(color), opts);
  kit.add(pick(edge), mat(P.edge), opts);
}
const rect = (w, h, x = 0, y = 0) => { const s = new THREE.Shape(); s.moveTo(x - w / 2, y); s.lineTo(x + w / 2, y); s.lineTo(x + w / 2, y + h); s.lineTo(x - w / 2, y + h); s.closePath(); return s; };
const tri = (w, h) => { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath(); return s; };
function arch(w, h) { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(-w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, Math.PI, 0, true); s.lineTo(w / 2, 0); s.closePath(); return s; }

// a paper box: four wall sheets around a footprint, front sheet gets windows/door cut-outs drawn as inset darker sheets
function paperBox(kit, { w, d, h, x, z, color, taper = 0 }) {
  const t = 0.07;
  sheet(kit, rect(w, h), t, color, { x, y: 0, z: z + d / 2 });                         // front
  sheet(kit, rect(w, h), t, color, { x, y: 0, z: z - d / 2 - t });                     // back
  sheet(kit, rect(d, h), t, color, { x: x + w / 2 + t, y: 0, z, ry: Math.PI / 2 });     // right
  sheet(kit, rect(d, h), t, color, { x: x - w / 2, y: 0, z, ry: Math.PI / 2 });         // left
}
function windowCut(kit, { x, y, z, w = 0.55, h = 0.8, ry = 0, lit = false }) {
  // a cut-out shows the dark interior sheet; a thin paper frame sits on top
  const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
  sheet(kit, rect(w, h), 0.02, lit ? P.butter : P.ink, { x: x + fwd.x * 0.08, y, z: z + fwd.z * 0.08, ry });
  const frame = rect(w + 0.18, h + 0.18); frame.holes.push(new THREE.Path().setFromPoints(rect(w, h, 0, 0.09).getPoints()));
  sheet(kit, frame, 0.03, P.edge, { x: x + fwd.x * 0.1, y: y - 0.09, z: z + fwd.z * 0.1, ry });
  // cross bar
  sheet(kit, rect(0.05, h), 0.02, P.edge, { x: x + fwd.x * 0.11, y, z: z + fwd.z * 0.11, ry });
}
function tentRoof(kit, { w, d, h, x, y, z, color, overhang = 0.5 }) {
  // a folded card pyramid; a paler, slightly larger card underneath shows the cut edge below the eave
  const W = w + overhang * 2, D = d + overhang * 2;
  const pyramid = new THREE.ConeGeometry(1, h, 4, 1, true).rotateY(Math.PI / 4);
  kit.add(pyramid, mat(color), { x, y: y + h / 2, z, sx: W / Math.SQRT2, sz: D / Math.SQRT2 });
  kit.add(pyramid, mat(P.edge), { x, y: y + h / 2 - 0.08, z, sx: W / Math.SQRT2 * 1.02, sz: D / Math.SQRT2 * 1.02 });
  // folded ridge lines: thin paper strips along the four hips
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const ax = x + sx * W / 2, az = z + sz * D / 2;
    const dx = x - ax, dz = z - az, len = Math.hypot(dx, dz, h);
    const mid = new THREE.Vector3(ax + dx / 2, y + h / 2 + 0.03, az + dz / 2);
    const g = new THREE.BoxGeometry(0.05, 0.03, len);
    const dir = new THREE.Vector3(dx, h, dz).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    const e = new THREE.Euler().setFromQuaternion(q);
    kit.add(g, mat(P.edge), { x: mid.x, y: mid.y, z: mid.z, rx: e.x, ry: e.y, rz: e.z });
  }
  // finial: a flat paper hook
  const hook = new THREE.RingGeometry(0.14, 0.24, 14, 1, 0, Math.PI * 1.35);
  kit.add(hook, mat(P.butter), { x, y: y + h + 0.3, z, ry: 0.5 });
  kit.add(new THREE.BoxGeometry(0.06, 0.4, 0.06), mat(P.butter), { x, y: y + h + 0.15, z });
}

function house(kit, L, kind) {
  const tall = kind === 'A';
  const w = tall ? 2.7 : 3.9, d = tall ? 2.5 : 3.0, h = tall ? 4.4 : 3.0;
  const color = tall ? P.peach : P.mint;
  paperBox(kit, { w, d, h, x: L.x, z: L.z, color });
  // a contrasting ground floor band (a wrapped strip of a second paper)
  paperBox(kit, { w: w + 0.16, d: d + 0.16, h: 1.2, x: L.x, z: L.z, color: P.cream });
  // roof
  tentRoof(kit, { w, d, h: tall ? 2.4 : 1.7, x: L.x, y: h, z: L.z, color: tall ? P.dusk : P.terra });
  // chimney: a small folded box with two paper flue circles
  kit.add(new THREE.BoxGeometry(0.5, 1.3, 0.4), mat(P.cream), { x: L.x + w / 2 - 0.6, y: h + 1.0, z: L.z - d / 2 + 0.6 });
  kit.add(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 10), mat(P.rose), { x: L.x + w / 2 - 0.72, y: h + 1.75, z: L.z - d / 2 + 0.6 });
  kit.add(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 10), mat(P.rose), { x: L.x + w / 2 - 0.48, y: h + 1.75, z: L.z - d / 2 + 0.6 });
  // door and windows on the front
  const fz = L.z + d / 2 + 0.07;
  sheet(kit, arch(0.8, 1.5), 0.03, P.ink, { x: L.x - (tall ? 0.6 : 1.1), y: 0, z: fz });
  const frame = arch(1.0, 1.65); frame.holes.push(new THREE.Path().setFromPoints(arch(0.8, 1.5).getPoints(24)));
  sheet(kit, frame, 0.04, P.edge, { x: L.x - (tall ? 0.6 : 1.1), y: 0, z: fz });
  if (tall) {
    windowCut(kit, { x: L.x - 0.7, y: 2.2, z: fz }); windowCut(kit, { x: L.x + 0.7, y: 2.2, z: fz });
    windowCut(kit, { x: L.x, y: 2.5, z: fz, w: 0.32, h: 0.42 });
    windowCut(kit, { x: L.x, y: 3.5, z: fz, w: 0.5, h: 0.6, lit: true });
    windowCut(kit, { x: L.x + 0.6, y: 0.5, z: fz, w: 0.45, h: 0.5 });
  } else {
    // shop: a big window with a striped awning made of alternating paper strips, and a hanging sign
    windowCut(kit, { x: L.x + 0.9, y: 0.7, z: fz, w: 1.5, h: 1.1, lit: true });
    for (let i = 0; i < 6; i++) sheet(kit, rect(0.3, 0.9), 0.03, i % 2 ? P.rose : P.cream, { x: L.x + 0.15 + i * 0.3, y: 1.95, z: fz + 0.05, rx: -0.9 });
    windowCut(kit, { x: L.x - 1.1, y: 2.1, z: fz, w: 0.5, h: 0.6 }); windowCut(kit, { x: L.x + 0.9, y: 2.2, z: fz, w: 0.5, h: 0.6 });
    kit.add(new THREE.BoxGeometry(0.06, 0.06, 0.8), mat(P.ink), { x: L.x - w / 2 - 0.05, y: 2.4, z: fz + 0.3 });
    sheet(kit, rect(0.7, 0.5), 0.04, P.butter, { x: L.x - w / 2 - 0.05, y: 1.75, z: fz + 0.65, ry: Math.PI / 2 });
    sheet(kit, new THREE.Shape().absarc(0, 0, 0.14, 0, Math.PI * 2, false), 0.03, P.rose, { x: L.x - w / 2 - 0.03, y: 2.0, z: fz + 0.65, ry: Math.PI / 2 });
  }
  // a wax seal: a paper disc
  sheet(kit, new THREE.Shape().absarc(0, 0, 0.17, 0, Math.PI * 2, false), 0.04, P.rose, { x: L.x + (tall ? 0.05 : -0.4), y: 1.0, z: fz + 0.02 });
}

function tree(kit, L) {
  // two crossed scalloped cut-outs on a strip trunk
  const crown = new THREE.Shape();
  const n = 9;
  for (let i = 0; i <= n * 2; i++) { const a = i / (n * 2) * Math.PI * 2; const r = 1.5 + (i % 2 ? 0.25 : 0); const px = Math.cos(a) * r, py = Math.sin(a) * r * 1.25 + 3.6; if (i === 0) crown.moveTo(px, py); else crown.lineTo(px, py); }
  crown.closePath();
  sheet(kit, crown, 0.08, P.moss, { x: L.x, y: 0, z: L.z });
  sheet(kit, crown, 0.08, P.sage, { x: L.x, y: 0, z: L.z, ry: Math.PI / 2 });
  sheet(kit, rect(0.3, 2.4), 0.08, P.terra, { x: L.x, y: 0, z: L.z + 0.04 });
  sheet(kit, rect(0.3, 2.4), 0.08, P.terra, { x: L.x, y: 0, z: L.z, ry: Math.PI / 2 });
  // a few paper leaves on the ground
  for (let i = 0; i < 5; i++) kit.add(new THREE.CircleGeometry(0.16, 8), mat(P.sage), { x: L.x + Math.cos(i * 1.3) * 1.6, y: 0.2, z: L.z + Math.sin(i * 1.3) * 1.3, rx: -Math.PI / 2 });
}

function lamp(kit, L) {
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(L.x, 0, L.z), new THREE.Vector3(L.x, 2.8, L.z), new THREE.Vector3(L.x - 0.1, 3.4, L.z), new THREE.Vector3(L.x - 0.5, 3.55, L.z), new THREE.Vector3(L.x - 0.8, 3.3, L.z)]);
  kit.add(new THREE.TubeGeometry(curve, 24, 0.06, 4, false), mat(P.ink), { x: 0 });
  kit.add(new THREE.BoxGeometry(0.34, 0.42, 0.34), mat(P.butter), { x: L.x - 0.8, y: 2.85, z: L.z });
  sheet(kit, rect(0.4, 0.06), 0.4, P.ink, { x: L.x - 0.8, y: 3.05, z: L.z - 0.2 });
  kit.add(new THREE.CylinderGeometry(0.35, 0.35, 0.16, 12), mat(P.cream), { x: L.x, y: 0.08, z: L.z });
}

function person(kit, L) {
  // a flat paper figure: robe triangle, head disc, hooked hat; and a second thin sheet behind for thickness
  const robe = new THREE.Shape(); robe.moveTo(-0.32, 0); robe.lineTo(0.32, 0); robe.lineTo(0.18, 1.0); robe.lineTo(-0.18, 1.0); robe.closePath();
  sheet(kit, robe, 0.1, P.dusk, { x: L.x, y: 0, z: L.z, ry: 0.5 });
  sheet(kit, new THREE.Shape().absarc(0, 1.22, 0.24, 0, Math.PI * 2, false), 0.1, P.peach, { x: L.x, y: 0, z: L.z, ry: 0.5 });
  const hat = new THREE.Shape(); hat.moveTo(-0.34, 1.4); hat.lineTo(0.34, 1.4); hat.lineTo(0.08, 2.1); hat.quadraticCurveTo(0.05, 2.35, -0.2, 2.25); hat.lineTo(-0.1, 2.05); hat.closePath();
  sheet(kit, hat, 0.1, P.ink, { x: L.x, y: 0, z: L.z, ry: 0.5 });
  sheet(kit, rect(0.14, 0.3), 0.05, P.rose, { x: L.x + 0.28, y: 0.55, z: L.z, ry: 0.5 });
}

function ground(kit, L) {
  // stacked contour layers with wavy edges
  const layer = (r, y, color, seed) => {
    const s = new THREE.Shape(); const n = 40;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const rr = r * (1 + 0.08 * Math.sin(a * 3 + seed) + 0.05 * Math.sin(a * 7 + seed * 2)); const px = Math.cos(a) * rr * 1.5, py = Math.sin(a) * rr; if (i === 0) s.moveTo(px, py); else s.lineTo(px, py); }
    s.closePath();
    sheet(kit, s, 0.1, color, { x: 1.4, y: y, z: 0.4, rx: -Math.PI / 2 });
  };
  layer(9.5, 0, P.sage, 1); layer(8.2, 0.1, P.moss, 2.3); layer(6.4, 0.2, P.sage, 4.1);
  // the street: a darker strip with a water channel strip, laid on top
  sheet(kit, rect(L.street.len, L.street.w), 0.06, P.cream, { x: 1.4, y: 0.3, z: L.street.z + L.street.w / 2, rx: -Math.PI / 2 });
  sheet(kit, rect(L.street.len, 0.5), 0.05, P.water, { x: 1.4, y: 0.36, z: L.street.z + 0.25, rx: -Math.PI / 2 });
  // cobble dots: a printed pattern of paper circles
  for (let i = 0; i < 60; i++) { const px = -7.5 + (i % 20) * 0.8, pz = L.street.z + 0.9 + Math.floor(i / 20) * 0.6; kit.add(new THREE.CircleGeometry(0.16, 8), mat(P.edge), { x: px + 1.4, y: 0.38, z: pz + (i % 2) * 0.1, rx: -Math.PI / 2 }); }
}

export const paper = {
  name: 'Paper-cut',
  background: 0xe8e0cf,
  build(group, L, Kit) {
    fibre = paperTex();
    const kit = new Kit();
    ground(kit, L);
    house(kit, L.houseA, 'A'); house(kit, L.houseB, 'B');
    tree(kit, L.tree); lamp(kit, L.lamp); person(kit, L.person);
    // prop: a stack of paper crates
    kit.add(new THREE.BoxGeometry(0.6, 0.5, 0.6), mat(P.butter), { x: L.prop.x, y: 0.55, z: L.prop.z });
    kit.add(new THREE.BoxGeometry(0.5, 0.45, 0.5), mat(P.rose), { x: L.prop.x + 0.1, y: 1.02, z: L.prop.z, ry: 0.3 });
    group.add(kit.build());
    // raise everything above the base layer
    group.position.y = 0.05;
    return group;
  },
  lights(scene) {
    const sun = new THREE.DirectionalLight(0xfff4e2, 2.2); sun.position.set(-8, 14, 10); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -14; sun.shadow.camera.right = 14; sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -14; sun.shadow.radius = 6; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0xdfe8f2, 0xc9b99a, 1.1));
  },
};
