import * as THREE from 'three';
import { plasterMaps, rubbleMaps, tileMaps, oakMaps, cobbleMaps, leadedGlassTex, leafCardTex, heightToNormal, canvas, toTex } from '../tex.js';
import { groundTex } from '../../render/textures.js';
import { InkPass } from '../../render/inkpass.js';
import { mulberry32 } from '../../game/state.js';

// CROOKED REALISM. Grown-up materials and a high density of small believable things:
// oak frames with pegs and braces, brick nogging, limewash with rain streaks, clay tiles with
// real ridge tiles and eaves courses, leaded windows set back in reveals, chimney pots,
// gutters and drainpipes, setts laid one by one, ivy, geraniums, a cat. Golden-hour sun,
// environment light, normal maps, ambient occlusion. No outlines, no toon: light does the work.

const rnd = mulberry32(5);
let T = null, M = null;
function mats() {
  if (M) return M;
  T = {
    plaster: plasterMaps({ seed: 21 }), plaster2: plasterMaps({ seed: 31, hue: 42, sat: 38, light: 74 }), rubble: rubbleMaps(), tile: tileMaps({ seed: 23, hue: 215, sat: 26, light: 33 }),
    tile2: tileMaps({ seed: 33, hue: 16, sat: 45, light: 40 }), oak: oakMaps({ seed: 24, light: 28 }), oakPale: oakMaps({ seed: 34, light: 46 }), cobble: cobbleMaps(), glass: leadedGlassTex(), leaf: leafCardTex({ seed: 27 }), leaf2: leafCardTex({ seed: 37, hue: 80 }),
  };
  const std = (o) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, ...o });
  M = {
    plaster: std({ map: T.plaster.map, normalMap: T.plaster.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), color: 0xf2e6cf }),
    plasterOchre: std({ map: T.plaster2.map, normalMap: T.plaster2.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), color: 0xe9cf9c }),
    rubble: std({ map: T.rubble.map, normalMap: T.rubble.normalMap, normalScale: new THREE.Vector2(1.0, 1.0), color: 0xd9d0c0 }),
    dressed: std({ map: T.rubble.map, normalMap: T.rubble.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), color: 0xe4dccb, roughness: 0.8 }),
    brick: std({ map: T.rubble.map, normalMap: T.rubble.normalMap, normalScale: new THREE.Vector2(0.8, 0.8), color: 0xc4785c }),
    tile: std({ map: T.tile.map, normalMap: T.tile.normalMap, normalScale: new THREE.Vector2(1.0, 1.0), color: 0xd0d6e0, roughness: 0.7 }),
    tile2: std({ map: T.tile2.map, normalMap: T.tile2.normalMap, normalScale: new THREE.Vector2(1.0, 1.0), color: 0xe0c8b8, roughness: 0.75 }),
    oak: std({ map: T.oak.map, normalMap: T.oak.normalMap, color: 0xb59a7e, roughness: 0.85 }),
    oakPale: std({ map: T.oakPale.map, normalMap: T.oakPale.normalMap, color: 0xd9c8ad, roughness: 0.85 }),
    iron: std({ color: 0x2b2a2e, roughness: 0.6, metalness: 0.7 }),
    brass: std({ color: 0xb8923a, roughness: 0.35, metalness: 0.85 }),
    copper: std({ color: 0x8a5a3a, roughness: 0.5, metalness: 0.7 }),
    lead: std({ color: 0x6b6e78, roughness: 0.55, metalness: 0.6 }),
    glass: new THREE.MeshStandardMaterial({ map: T.glass, roughness: 0.25, metalness: 0.4, color: 0xdde7ee, envMapIntensity: 1.5, vertexColors: true }),
    glassLit: new THREE.MeshStandardMaterial({ map: T.glass, roughness: 0.3, metalness: 0.2, color: 0xffe2b0, emissive: 0xffb050, emissiveIntensity: 0.35, vertexColors: true }),
    cobble: std({ map: T.cobble.map, normalMap: T.cobble.normalMap, normalScale: new THREE.Vector2(1.2, 1.2), color: 0xd7cdb8 }),
    sett: std({ color: 0xa79c88, roughness: 0.85 }),
    earth: std({ map: groundTex(), color: 0xf0e8d0, roughness: 1 }),
    ley: new THREE.MeshStandardMaterial({ color: 0x2f9bb3, emissive: 0x0e5878, emissiveIntensity: 0.5, roughness: 0.15, metalness: 0.1, vertexColors: true }),
    leaf: new THREE.MeshStandardMaterial({ map: T.leaf, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9, vertexColors: true, color: 0xd8dcc0 }),
    leaf2: new THREE.MeshStandardMaterial({ map: T.leaf2, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9, vertexColors: true, color: 0xd0d8b0 }),
    canvas: std({ color: 0xc9b58a, roughness: 1 }),
    canvasStripe: std({ color: 0x8a3a34, roughness: 1 }),
    cloth: std({ color: 0x3f4a70, roughness: 1 }),
    clothDark: std({ color: 0x2a2836, roughness: 1 }),
    skin: std({ color: 0xe5c3a2, roughness: 0.8 }),
    wax: std({ color: 0x9c2a22, roughness: 0.5 }),
    bread: std({ color: 0xc78a4a, roughness: 0.9 }),
    terracotta: std({ color: 0xb5643e, roughness: 0.9 }),
    fur: std({ color: 0x3a3230, roughness: 1 }),
    sack: std({ color: 0xb9a480, roughness: 1 }),
  };
  return M;
}
// roof face with metric UVs: base edge a->b, top edge c->d (c==d for a hip apex)
function roofFace(kit, a, b, c, d, mat, texScale = 1.4) {
  const g = new THREE.BufferGeometry();
  const u = new THREE.Vector3().subVectors(b, a); const w = u.length(); u.normalize();
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), top = new THREE.Vector3().addVectors(c, d).multiplyScalar(0.5);
  const slope = new THREE.Vector3().subVectors(top, mid); const L = slope.length(); slope.normalize();
  const pts = [a, b, c, d], uvs = [[0, 0], [w / texScale, 0], [new THREE.Vector3().subVectors(c, a).dot(u) / texScale, L / texScale], [new THREE.Vector3().subVectors(d, a).dot(u) / texScale, L / texScale]];
  // correct: uv of c,d relative to a along u
  const pos = [], uv = [];
  const tri = [0, 1, 2, 0, 2, 3];
  for (const i of tri) { pos.push(pts[i].x, pts[i].y, pts[i].z); uv.push(uvs[i][0], uvs[i][1]); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
  kit.add(g, mat, {});
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function tentedRoof(kit, { x, y, z, w, d, h, ridge = 0, mat, over = 0.55, sag = 0.12 }) {
  const M = mats();
  const W = w + over * 2, D = d + over * 2;
  const b0 = V(x - W / 2, y, z + D / 2), b1 = V(x + W / 2, y, z + D / 2), b2 = V(x + W / 2, y, z - D / 2), b3 = V(x - W / 2, y, z - D / 2);
  const r0 = V(x - ridge / 2, y + h, z), r1 = V(x + ridge / 2, y + h, z);
  roofFace(kit, b0, b1, r1, r0, mat); roofFace(kit, b2, b3, r0, r1, mat); roofFace(kit, b1, b2, r1, r1, mat); roofFace(kit, b3, b0, r0, r0, mat);
  // eaves course: a row of tile ends under every edge, and a timber fascia
  const edges = [[b0, b1], [b1, b2], [b2, b3], [b3, b0]];
  for (const [p, q] of edges) {
    const len = p.distanceTo(q), dir = new THREE.Vector3().subVectors(q, p).normalize(), ang = Math.atan2(dir.x, dir.z);
    const mid = new THREE.Vector3().addVectors(p, q).multiplyScalar(0.5);
    kit.add(new THREE.BoxGeometry(0.06, 0.16, len), M.oak, { x: mid.x, y: y - 0.1, z: mid.z, ry: ang });
    const n = Math.floor(len / 0.24);
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; const px = p.x + (q.x - p.x) * t, pz = p.z + (q.z - p.z) * t; kit.add(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 10, 1, false, 0, Math.PI), mat, { x: px, y: y + 0.02, z: pz, ry: ang + Math.PI / 2, rx: Math.PI / 2 }); }
    // gutter: a half-pipe of lead just below the eave
    kit.add(new THREE.CylinderGeometry(0.08, 0.08, len, 10, 1, true, 0, Math.PI), M.lead, { x: mid.x - Math.cos(ang) * 0.05, y: y - 0.22, z: mid.z + Math.sin(ang) * 0.05, rz: Math.PI / 2, ry: ang - Math.PI / 2 });
  }
  // ridge and hip tiles: half-cylinders along the ridge and the four hips
  const hips = [[b0, r0], [b1, r1], [b2, r1], [b3, r0]];
  if (ridge > 0) hips.push([r0, r1]);
  for (const [p, q] of hips) {
    const len = p.distanceTo(q), dir = new THREE.Vector3().subVectors(q, p).normalize();
    const n = Math.floor(len / 0.34);
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; const c = new THREE.Vector3().lerpVectors(p, q, t); const yaw = Math.atan2(dir.x, dir.z), pitch = Math.asin(dir.y);
      const rq = new THREE.Quaternion().setFromEuler(new THREE.Euler(-pitch, yaw, 0, 'YXZ')); const e = new THREE.Euler().setFromQuaternion(rq);
      kit.add(new THREE.CylinderGeometry(0.13, 0.13, 0.32, 10, 1, false, Math.PI, Math.PI).rotateX(Math.PI / 2), mat, { x: c.x, y: c.y + 0.02, z: c.z, rx: e.x, ry: e.y, rz: e.z }); }
  }
  // brass hook finial with a wax bead
  const top = ridge > 0 ? r1 : r0;
  kit.add(new THREE.CylinderGeometry(0.035, 0.05, 0.7, 8), M.brass, { x: top.x, y: top.y + 0.35, z: top.z });
  kit.add(new THREE.TorusGeometry(0.2, 0.035, 8, 18, Math.PI * 1.35), M.brass, { x: top.x, y: top.y + 0.9, z: top.z, ry: 0.4 });
  kit.add(new THREE.SphereGeometry(0.06, 10, 8), M.wax, { x: top.x - 0.12, y: top.y + 0.78, z: top.z - 0.05 });
}

function chimney(kit, { x, y, z, h = 1.6, pots = 2, ry = 0 }) {
  const M = mats();
  kit.add(new THREE.BoxGeometry(0.95, h, 0.6), M.brick, { x, y: y + h / 2, z, ry });
  kit.add(new THREE.BoxGeometry(1.1, 0.1, 0.72), M.dressed, { x, y: y + h * 0.55, z, ry });
  kit.add(new THREE.BoxGeometry(1.12, 0.14, 0.76), M.dressed, { x, y: y + h + 0.05, z, ry });
  for (let i = 0; i < pots; i++) { const dx = (i - (pots - 1) / 2) * 0.42; const px = x + Math.cos(ry) * dx, pz = z - Math.sin(ry) * dx;
    kit.add(new THREE.CylinderGeometry(0.11, 0.13, 0.55, 12), M.terracotta, { x: px, y: y + h + 0.38, z: pz });
    kit.add(new THREE.CylinderGeometry(0.14, 0.12, 0.08, 12), M.terracotta, { x: px, y: y + h + 0.66, z: pz });
    kit.add(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 12), M.clothDark, { x: px, y: y + h + 0.69, z: pz }); }
}

// a timber-framed storey: plaster panel body, oak posts/rails/braces standing proud, pegs at the joints
function framedStorey(kit, { x, y, z, w, d, h, plaster = 'plaster', braces = true, nogging = false }) {
  const M = mats();
  kit.add(new THREE.BoxGeometry(w, h, d), nogging ? M.brick : M[plaster], { x, y: y + h / 2, z });
  const b = 0.15, p = 0.07; // beam section, proud-of-wall
  const faces = [[0, 0, d / 2, w], [Math.PI, 0, -d / 2, w], [Math.PI / 2, w / 2, 0, d], [-Math.PI / 2, -w / 2, 0, d]];
  for (const [ry, ox, oz, len] of faces) {
    const fx = Math.sin(ry), fz = Math.cos(ry);           // outward normal
    const rx = Math.cos(ry), rz = -Math.sin(ry);          // rightward along the face
    const at = (u, v) => ({ x: x + ox + fx * p + rx * u, y: y + v, z: z + oz + fz * p + rz * u });
    const beam = (u, v, bw, bh, extra = {}) => kit.add(new THREE.BoxGeometry(bw, bh, b), M.oak, { ...at(u, v), ry, ...extra });
    beam(0, h - b / 2, len + b, b); beam(0, b / 2, len + b, b);                  // top and bottom rails
    const n = Math.max(2, Math.round(len / 1.0));
    for (let i = 0; i <= n; i++) { const u = -len / 2 + i * (len / n); beam(u, h / 2, b, h); }
    if (braces) { const L = Math.hypot(0.9, 0.9); beam(-len / 2 + 0.55, 0.55, b * 0.9, L, { rz: 0.78 }); beam(len / 2 - 0.55, 0.55, b * 0.9, L, { rz: -0.78 }); }
    // pegs
    for (let i = 0; i <= n; i++) { const u = -len / 2 + i * (len / n); for (const v of [b, h - b]) { const q = at(u + 0.05, v); kit.add(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 6), M.oakPale, { x: q.x + fx * b / 2, y: q.y, z: q.z + fz * b / 2, rx: Math.PI / 2, ry }); } }
  }
}
// jetty: joist ends and a bressumer under an overhanging storey
function jetty(kit, { x, y, z, w, d, over }) {
  const M = mats();
  kit.add(new THREE.BoxGeometry(w + over * 2 + 0.2, 0.2, d + over * 2 + 0.2), M.oak, { x, y: y - 0.1, z });
  const n = Math.floor((w + over * 2) / 0.45);
  for (let i = 0; i < n; i++) { const u = -(w + over * 2) / 2 + (i + 0.5) * ((w + over * 2) / n); kit.add(new THREE.BoxGeometry(0.16, 0.16, d + over * 2 + 0.5), M.oakPale, { x: x + u, y: y - 0.3, z }); }
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) kit.add(new THREE.BoxGeometry(0.2, 0.6, 0.35), M.oak, { x: x + sx * (w / 2 - 0.05), y: y - 0.6, z: z + sz * (d / 2 + over - 0.1), rz: sx * 0.35 });
}
function windowEl(kit, { x, y, z, ry = 0, w = 0.7, h = 1.0, lit = false, shutters = false, pentice = false, mullions = 2 }) {
  const M = mats();
  const fx = Math.sin(ry), fz = Math.cos(ry), rx = Math.cos(ry), rz = -Math.sin(ry);
  const at = (u, v, out) => ({ x: x + rx * u + fx * out, y: y + v, z: z + rz * u + fz * out });
  // reveal: a dark back plate and four jambs, so the glass sits 20 cm back in the wall
  kit.add(new THREE.BoxGeometry(w + 0.1, h + 0.1, 0.06), M.clothDark, { ...at(0, 0, -0.3), ry });
  kit.add(new THREE.BoxGeometry(w + 0.1, 0.06, 0.32), M.plaster, { ...at(0, h / 2 + 0.02, -0.16), ry }); kit.add(new THREE.BoxGeometry(w + 0.1, 0.06, 0.32), M.dressed, { ...at(0, -h / 2 - 0.02, -0.16), ry });
  kit.add(new THREE.BoxGeometry(0.06, h + 0.1, 0.32), M.plaster, { ...at(-w / 2 - 0.02, 0, -0.16), ry }); kit.add(new THREE.BoxGeometry(0.06, h + 0.1, 0.32), M.plaster, { ...at(w / 2 + 0.02, 0, -0.16), ry });
  kit.add(new THREE.PlaneGeometry(w, h), lit ? M.glassLit : M.glass, { ...at(0, 0, -0.2), ry });       // leaded glass at the back
  const f = 0.07;
  kit.add(new THREE.BoxGeometry(w + 0.18, f, 0.14), M.oak, { ...at(0, h / 2 + f / 2, -0.05), ry }); kit.add(new THREE.BoxGeometry(w + 0.18, f, 0.14), M.oak, { ...at(0, -h / 2 - f / 2, -0.05), ry });
  kit.add(new THREE.BoxGeometry(f, h + 0.18, 0.14), M.oak, { ...at(-w / 2 - f / 2, 0, -0.05), ry }); kit.add(new THREE.BoxGeometry(f, h + 0.18, 0.14), M.oak, { ...at(w / 2 + f / 2, 0, -0.05), ry });
  for (let i = 1; i < mullions; i++) kit.add(new THREE.BoxGeometry(0.05, h, 0.1), M.oak, { ...at(-w / 2 + i * (w / mullions), 0, -0.1), ry });
  kit.add(new THREE.BoxGeometry(w, 0.05, 0.1), M.oak, { ...at(0, h * 0.15, -0.1), ry });
  kit.add(new THREE.BoxGeometry(w + 0.34, 0.1, 0.24), M.dressed, { ...at(0, -h / 2 - 0.12, 0.04), ry });        // stone sill
  if (shutters) for (const s of [-1, 1]) { kit.add(new THREE.BoxGeometry(w * 0.5, h + 0.1, 0.05), M.oakPale, { ...at(s * (w / 2 + 0.1 + w * 0.25), 0, 0.02), ry }); for (const v of [h * 0.35, -h * 0.35]) kit.add(new THREE.BoxGeometry(0.12, 0.04, 0.06), M.iron, { ...at(s * (w / 2 + 0.12), v, 0.04), ry }); }
  if (pentice) { kit.add(new THREE.BoxGeometry(w + 0.6, 0.06, 0.5), M.tile2, { ...at(0, h / 2 + 0.25, 0.2), ry, rx: -0.5 }); for (const s of [-1, 1]) kit.add(new THREE.BoxGeometry(0.08, 0.08, 0.4), M.oak, { ...at(s * (w / 2 + 0.2), h / 2 + 0.1, 0.18), ry, rx: 0.6 }); }
}
function doorEl(kit, { x, y = 0, z, ry = 0, w = 0.9, h = 1.9 }) {
  const M = mats();
  const fx = Math.sin(ry), fz = Math.cos(ry), rx = Math.cos(ry), rz = -Math.sin(ry);
  const at = (u, v, out) => ({ x: x + rx * u + fx * out, y: y + v, z: z + rz * u + fz * out });
  kit.add(new THREE.BoxGeometry(w + 0.1, h, 0.3), M.clothDark, { ...at(0, h / 2, -0.12), ry });
  // planks with iron straps and studs
  const n = 5; for (let i = 0; i < n; i++) kit.add(new THREE.BoxGeometry(w / n - 0.015, h - 0.05, 0.06), M.oak, { ...at(-w / 2 + (i + 0.5) * (w / n), h / 2, -0.18), ry });
  for (const v of [0.35, 1.0, 1.6]) { kit.add(new THREE.BoxGeometry(w * 0.85, 0.06, 0.03), M.iron, { ...at(0, v, -0.14), ry }); for (let i = 0; i < 4; i++) kit.add(new THREE.SphereGeometry(0.02, 6, 5), M.iron, { ...at(-w * 0.35 + i * w * 0.23, v, -0.12), ry }); }
  kit.add(new THREE.TorusGeometry(0.07, 0.015, 6, 14), M.iron, { ...at(w * 0.3, 1.0, -0.1), ry });
  // stone arch of voussoirs and jambs
  const r = w / 2 + 0.08, nv = 7;
  for (let i = 0; i < nv; i++) { const a = Math.PI * (i + 0.5) / nv; kit.add(new THREE.BoxGeometry(0.22, 0.2, 0.22), M.dressed, { ...at(Math.cos(a) * r, h - w / 2 + Math.sin(a) * r, 0.02), ry, rz: a - Math.PI / 2 }); }
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) kit.add(new THREE.BoxGeometry(0.22, (h - w / 2) / 4 - 0.02, 0.2), M.dressed, { ...at(s * (w / 2 + 0.11), (i + 0.5) * (h - w / 2) / 4, 0.02), ry });
  // worn threshold, boot scraper
  kit.add(new THREE.BoxGeometry(w + 0.7, 0.14, 0.6), M.dressed, { ...at(0, 0.07, 0.3), ry });
  kit.add(new THREE.BoxGeometry(0.3, 0.12, 0.03), M.iron, { ...at(w / 2 + 0.45, 0.2, 0.25), ry });
}
function lantern(kit, { x, y, z, ry = 0, lit = true, size = 1 }) {
  const M = mats();
  const fx = Math.sin(ry), fz = Math.cos(ry);
  kit.add(new THREE.CylinderGeometry(0.02, 0.02, 0.6 * size, 6), M.iron, { x: x + fx * 0.3 * size, y, z: z + fz * 0.3 * size, rx: Math.PI / 2, ry });
  kit.add(new THREE.TorusGeometry(0.12 * size, 0.02, 6, 12, Math.PI * 1.1), M.iron, { x: x + fx * 0.6 * size, y: y - 0.12 * size, z: z + fz * 0.6 * size, ry: ry + Math.PI / 2, rz: Math.PI / 2 });
  const lx = x + fx * 0.72 * size, lz = z + fz * 0.72 * size, ly = y - 0.55 * size;
  kit.add(new THREE.CylinderGeometry(0.012, 0.012, 0.25 * size, 5), M.iron, { x: lx, y: ly + 0.32 * size, z: lz });
  kit.add(new THREE.CylinderGeometry(0.14 * size, 0.1 * size, 0.08 * size, 8), M.iron, { x: lx, y: ly + 0.2 * size, z: lz });
  kit.add(new THREE.CylinderGeometry(0.085 * size, 0.1 * size, 0.28 * size, 8), lit ? M.glassLit : M.glass, { x: lx, y: ly, z: lz });
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; kit.add(new THREE.BoxGeometry(0.015, 0.3 * size, 0.015), M.iron, { x: lx + Math.cos(a) * 0.1 * size, y: ly, z: lz + Math.sin(a) * 0.1 * size }); }
  kit.add(new THREE.CylinderGeometry(0.11 * size, 0.09 * size, 0.05 * size, 8), M.iron, { x: lx, y: ly - 0.16 * size, z: lz });
}
function drainpipe(kit, { x, y0, y1, z }) {
  const M = mats();
  kit.add(new THREE.CylinderGeometry(0.05, 0.05, y1 - y0, 10), M.lead, { x, y: (y0 + y1) / 2, z });
  kit.add(new THREE.BoxGeometry(0.26, 0.28, 0.2), M.lead, { x, y: y1 + 0.1, z });
  for (const v of [0.25, 0.6]) kit.add(new THREE.TorusGeometry(0.06, 0.015, 6, 12), M.iron, { x, y: y0 + (y1 - y0) * v, z, rx: Math.PI / 2 });
  kit.add(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 10), M.lead, { x, y: y0 + 0.1, z: z + 0.12, rx: -1.1 });
}
function ivy(kit, { x, y, z, h, seed = 1 }) {
  const M = mats(); const r = mulberry32(seed);
  for (let i = 0; i < 26; i++) { const v = r() * h, u = (r() - 0.5) * 0.9; const s = 0.35 + r() * 0.3; kit.add(new THREE.PlaneGeometry(s, s), M.leaf2, { x: x + u, y: y + v, z: z + 0.04 + r() * 0.08, rz: r() * 6.3, tint: 0x9db070 }); }
}
function barrel(kit, { x, z, r = 0.32, h = 0.8 }) {
  const M = mats();
  const pts = []; for (let i = 0; i <= 8; i++) { const f = i / 8; pts.push(new THREE.Vector2(r * (0.85 + 0.15 * Math.sin(f * Math.PI)), f * h)); }
  kit.add(new THREE.LatheGeometry(pts, 18), M.oakPale, { x, z });
  for (const v of [0.18, 0.5, 0.82]) kit.add(new THREE.TorusGeometry(r * (0.86 + 0.15 * Math.sin(v * Math.PI)), 0.018, 6, 24), M.iron, { x, y: h * v, z, rx: Math.PI / 2 });
  kit.add(new THREE.CylinderGeometry(r * 0.85, r * 0.85, 0.03, 18), M.oak, { x, y: h, z });
}
function crate(kit, { x, z, s = 0.55, ry = 0 }) {
  const M = mats();
  kit.add(new THREE.BoxGeometry(s, s * 0.8, s), M.oakPale, { x, y: s * 0.4, z, ry });
  for (const v of [0.08, s * 0.8 - 0.08]) for (const side of [-1, 1]) { kit.add(new THREE.BoxGeometry(s + 0.02, 0.07, 0.04), M.oak, { x: x + Math.sin(ry) * side * s / 2, y: v, z: z + Math.cos(ry) * side * s / 2, ry }); kit.add(new THREE.BoxGeometry(0.04, 0.07, s + 0.02), M.oak, { x: x + Math.cos(ry) * side * s / 2, y: v, z: z - Math.sin(ry) * side * s / 2, ry }); }
}
function sack(kit, { x, z, ry = 0 }) {
  const M = mats();
  kit.add(new THREE.SphereGeometry(0.34, 14, 10), M.sack, { x, y: 0.3, z, sy: 0.85, ry });
  kit.add(new THREE.SphereGeometry(0.14, 10, 8), M.sack, { x, y: 0.66, z, sy: 0.7 });
  kit.add(new THREE.TorusGeometry(0.1, 0.015, 6, 12), M.oak, { x, y: 0.6, z, rx: Math.PI / 2 });
}
function geranium(kit, { x, y, z }) {
  const M = mats();
  kit.add(new THREE.CylinderGeometry(0.11, 0.08, 0.16, 12), M.terracotta, { x, y: y + 0.08, z });
  kit.add(new THREE.CylinderGeometry(0.12, 0.11, 0.03, 12), M.terracotta, { x, y: y + 0.16, z });
  for (let i = 0; i < 5; i++) kit.add(new THREE.SphereGeometry(0.07, 8, 6), M.leaf2, { x: x + (rnd() - 0.5) * 0.18, y: y + 0.24 + rnd() * 0.06, z: z + (rnd() - 0.5) * 0.18, tint: 0x8fa860 });
  for (let i = 0; i < 4; i++) kit.add(new THREE.SphereGeometry(0.035, 6, 5), M.wax, { x: x + (rnd() - 0.5) * 0.18, y: y + 0.34, z: z + (rnd() - 0.5) * 0.18 });
}
function cat(kit, { x, z, ry = 0 }) {
  const M = mats();
  kit.add(new THREE.CapsuleGeometry(0.11, 0.3, 6, 10), M.fur, { x, y: 0.14, z, rz: Math.PI / 2, ry });
  kit.add(new THREE.SphereGeometry(0.1, 10, 8), M.fur, { x: x + Math.cos(ry) * 0.24, y: 0.22, z: z - Math.sin(ry) * 0.24 });
  for (const s of [-1, 1]) kit.add(new THREE.ConeGeometry(0.03, 0.06, 4), M.fur, { x: x + Math.cos(ry) * 0.26 - Math.sin(ry) * s * 0.05, y: 0.31, z: z - Math.sin(ry) * 0.26 - Math.cos(ry) * s * 0.05 });
  kit.add(new THREE.TorusGeometry(0.12, 0.022, 6, 12, Math.PI), M.fur, { x: x - Math.cos(ry) * 0.2, y: 0.1, z: z + Math.sin(ry) * 0.2, ry: ry + Math.PI / 2 });
}

// ------------------------------------------------------------------ the two buildings
function tallHouse(kit, L) {
  const M = mats(); const x = L.x, z = L.z;
  const w = 3.0, d = 2.8;
  // rubble ground floor with dressed quoins
  kit.add(new THREE.BoxGeometry(w, 2.2, d), M.rubble, { x, y: 1.1, z });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) for (let i = 0; i < 5; i++) kit.add(new THREE.BoxGeometry(i % 2 ? 0.3 : 0.42, 0.4, i % 2 ? 0.42 : 0.3), M.dressed, { x: x + sx * (w / 2 - 0.02), y: 0.22 + i * 0.44, z: z + sz * (d / 2 - 0.02) });
  kit.add(new THREE.BoxGeometry(w + 0.16, 0.12, d + 0.16), M.dressed, { x, y: 2.2, z });
  doorEl(kit, { x: x - 0.6, z: z + d / 2, ry: 0 });
  windowEl(kit, { x: x + 0.75, y: 1.35, z: z + d / 2, w: 0.6, h: 0.8, shutters: true, pentice: true });
  windowEl(kit, { x: x + w / 2, y: 1.4, z: z - 0.4, ry: Math.PI / 2, w: 0.5, h: 0.7 });
  // first storey: timber frame, jettied
  const w1 = w + 0.5, d1 = d + 0.5;
  jetty(kit, { x, y: 2.5, z, w, d, over: 0.25 });
  framedStorey(kit, { x, y: 2.5, z, w: w1, d: d1, h: 2.3 });
  windowEl(kit, { x: x - 0.85, y: 3.7, z: z + d1 / 2, w: 0.7, h: 1.0, mullions: 3 });
  windowEl(kit, { x: x + 0.85, y: 3.7, z: z + d1 / 2, w: 0.7, h: 1.0, mullions: 3, lit: true });
  windowEl(kit, { x, y: 3.9, z: z + d1 / 2, w: 0.34, h: 0.5, mullions: 1 });
  windowEl(kit, { x: x + w1 / 2, y: 3.7, z: z + 0.2, ry: Math.PI / 2, w: 0.6, h: 0.9 });
  geranium(kit, { x: x - 0.85, y: 3.2 + 0.05, z: z + d1 / 2 + 0.2 });
  // second storey: jettied again, brick nogging in a chevron of braces
  const w2 = w1 + 0.4, d2 = d1 + 0.4;
  jetty(kit, { x, y: 4.8, z, w: w1, d: d1, over: 0.2 });
  framedStorey(kit, { x, y: 4.8, z, w: w2, d: d2, h: 2.1, plaster: 'plasterOchre' });
  windowEl(kit, { x: x - 0.7, y: 5.9, z: z + d2 / 2, w: 0.55, h: 0.8 });
  windowEl(kit, { x: x + 0.7, y: 5.9, z: z + d2 / 2, w: 0.55, h: 0.8, lit: true });
  // roof, chimney, gutters, drainpipe, lantern, ivy
  tentedRoof(kit, { x, y: 6.9, z, w: w2, d: d2, h: 3.2, ridge: 0.6, mat: M.tile, sag: 0.1 });
  chimney(kit, { x: x + 0.9, y: 8.0, z: z - 0.6, h: 2.3 });
  drainpipe(kit, { x: x + w2 / 2 + 0.55, y0: 0, y1: 6.7, z: z + d2 / 2 + 0.3 });
  lantern(kit, { x: x + 0.15, y: 2.35, z: z + d / 2 + 0.05, lit: true });
  ivy(kit, { x: x - w / 2 + 0.2, y: 0.3, z: z + d / 2, h: 2.3, seed: 3 });
  // a bracket sign with a wax seal disc: the house's mark
  kit.add(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 18), M.wax, { x: x + 0.15, y: 1.6, z: z + d / 2 + 0.03, rx: Math.PI / 2 });
  kit.add(new THREE.BoxGeometry(0.42, 0.42, 0.03), M.oakPale, { x: x + 0.15, y: 1.6, z: z + d / 2 + 0.01 });
  cat(kit, { x: x - 1.2, z: z + d / 2 + 0.55, ry: 0.4 });
}
function shop(kit, L) {
  const M = mats(); const x = L.x, z = L.z;
  const w = 4.2, d = 3.2;
  kit.add(new THREE.BoxGeometry(w, 2.6, d), M.rubble, { x, y: 1.3, z });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) for (let i = 0; i < 6; i++) kit.add(new THREE.BoxGeometry(i % 2 ? 0.3 : 0.42, 0.4, i % 2 ? 0.42 : 0.3), M.dressed, { x: x + sx * (w / 2 - 0.02), y: 0.22 + i * 0.44, z: z + sz * (d / 2 - 0.02) });
  kit.add(new THREE.BoxGeometry(w + 0.2, 0.14, d + 0.2), M.dressed, { x, y: 2.6, z });
  doorEl(kit, { x: x - 1.4, z: z + d / 2, w: 0.95, h: 2.0 });
  // bow window: a curved leaded window with oak ribs, a display shelf of loaves, an awning
  const bw = 1.9, br = 1.2;
  kit.add(new THREE.CylinderGeometry(br, br, 1.3, 16, 1, true, -0.85, 1.7), M.glass, { x: x + 0.7, y: 1.35, z: z + d / 2 - br + 0.35 });
  for (let i = 0; i <= 5; i++) { const a = -0.85 + i * (1.7 / 5); kit.add(new THREE.BoxGeometry(0.06, 1.35, 0.08), M.oak, { x: x + 0.7 + Math.sin(a) * br, y: 1.35, z: z + d / 2 - br + 0.35 + Math.cos(a) * br, ry: a }); }
  kit.add(new THREE.CylinderGeometry(br + 0.04, br + 0.04, 0.1, 16, 1, false, -0.85, 1.7), M.oak, { x: x + 0.7, y: 2.05, z: z + d / 2 - br + 0.35 });
  kit.add(new THREE.CylinderGeometry(br + 0.06, br + 0.06, 0.16, 16, 1, false, -0.85, 1.7), M.dressed, { x: x + 0.7, y: 0.62, z: z + d / 2 - br + 0.35 });
  kit.add(new THREE.CylinderGeometry(br + 0.02, br + 0.02, 0.06, 16, 1, false, -0.85, 1.7), M.oak, { x: x + 0.7, y: 1.05, z: z + d / 2 - br + 0.35 });
  for (let i = 0; i < 6; i++) { const a = -0.7 + i * 0.28; kit.add(new THREE.SphereGeometry(0.13, 10, 8), M.bread, { x: x + 0.7 + Math.sin(a) * (br - 0.2), y: 1.15, z: z + d / 2 - br + 0.35 + Math.cos(a) * (br - 0.2), sy: 0.65, sz: 1.4, ry: -a }); }
  // canvas awning on iron rods, striped
  for (let i = 0; i < 8; i++) kit.add(new THREE.BoxGeometry(0.3, 0.03, 1.1), i % 2 ? M.canvasStripe : M.canvas, { x: x - 0.5 + i * 0.3, y: 2.45 - 0.25, z: z + d / 2 + 0.55, rx: 0.45 });
  for (const dx of [-0.65, 1.7]) kit.add(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), M.iron, { x: x + dx, y: 2.2 - 0.25, z: z + d / 2 + 0.55, rx: Math.PI / 2 - 0.45 });
  // hanging sign: a loaf on a board from a scrolled iron bracket
  kit.add(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 6), M.iron, { x: x - w / 2 - 0.5, y: 3.3, z: z + d / 2 + 0.1, rz: Math.PI / 2 });
  kit.add(new THREE.TorusGeometry(0.2, 0.02, 6, 14, Math.PI), M.iron, { x: x - w / 2 - 0.2, y: 3.1, z: z + d / 2 + 0.1 });
  kit.add(new THREE.BoxGeometry(0.03, 0.55, 0.9), M.oakPale, { x: x - w / 2 - 0.7, y: 2.85, z: z + d / 2 + 0.1 });
  kit.add(new THREE.SphereGeometry(0.16, 10, 8), M.bread, { x: x - w / 2 - 0.7, y: 2.85, z: z + d / 2 + 0.1, sx: 0.4, sz: 1.6 });
  // upper storey: timber frame with a dormer in the roof
  jetty(kit, { x, y: 2.9, z, w, d, over: 0.3 });
  framedStorey(kit, { x, y: 2.9, z, w: w + 0.6, d: d + 0.6, h: 2.2 });
  windowEl(kit, { x: x - 1.2, y: 4.0, z: z + (d + 0.6) / 2, w: 0.6, h: 0.9, shutters: true });
  windowEl(kit, { x: x + 0.3, y: 4.0, z: z + (d + 0.6) / 2, w: 0.6, h: 0.9, lit: true });
  windowEl(kit, { x: x + 1.5, y: 4.0, z: z + (d + 0.6) / 2, w: 0.6, h: 0.9, shutters: true });
  geranium(kit, { x: x + 1.5, y: 3.55, z: z + (d + 0.6) / 2 + 0.2 }); geranium(kit, { x: x + 1.2, y: 3.55, z: z + (d + 0.6) / 2 + 0.2 });
  tentedRoof(kit, { x, y: 5.2, z, w: w + 0.6, d: d + 0.6, h: 2.5, ridge: 1.8, mat: M.tile2 });
  // dormer
  kit.add(new THREE.BoxGeometry(1.1, 1.0, 1.2), M.plaster, { x: x + 0.3, y: 5.8, z: z + 1.2 });
  windowEl(kit, { x: x + 0.3, y: 5.85, z: z + 1.8, w: 0.5, h: 0.6, mullions: 2 });
  tentedRoof(kit, { x: x + 0.3, y: 6.3, z: z + 1.2, w: 1.1, d: 1.2, h: 0.7, mat: M.tile2, over: 0.25 });
  chimney(kit, { x: x - 1.4, y: 6.2, z: z - 0.5, h: 2.0 }); chimney(kit, { x: x + 1.6, y: 6.0, z: z - 0.4, h: 1.6, pots: 1 });
  drainpipe(kit, { x: x - w / 2 - 0.45, y0: 0, y1: 5.0, z: z + d / 2 + 0.45 });
  lantern(kit, { x: x + 2.0, y: 2.5, z: z + d / 2 + 0.05, lit: true });
  // clutter by the door
  barrel(kit, { x: x + 2.7, z: z + d / 2 + 0.6 }); crate(kit, { x: x + 2.75, z: z + d / 2 + 1.35, ry: 0.3 }); sack(kit, { x: x - 2.5, z: z + d / 2 + 0.7 });
  kit.add(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 6), M.oakPale, { x: x - 2.35, y: 0.8, z: z + d / 2 + 0.05, rz: 0.15 });
  kit.add(new THREE.CylinderGeometry(0.06, 0.02, 0.35, 8), M.sack, { x: x - 2.25, y: 0.2, z: z + d / 2 + 0.08, rz: 0.15 });
}

// ------------------------------------------------------------------ street, ground, tree, lamp, person
function street(kit, L, group) {
  const M = mats();
  const z0 = L.street.z, w = L.street.w, len = L.street.len;
  kit.add(new THREE.BoxGeometry(len, 0.16, w - 0.75), M.cobble, { x: 1.4, y: 0.06, z: z0 + 0.75 + (w - 0.75) / 2 });
  // setts laid one by one on the crown of the street
  const sett = new THREE.SphereGeometry(0.16, 8, 6); sett.scale(1, 0.4, 0.85);
  sett.setAttribute('color', new THREE.BufferAttribute(new Float32Array(sett.getAttribute('position').count * 3).fill(1), 3));
  const inst = new THREE.InstancedMesh(sett, M.sett, 1400);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(); let n = 0;
  for (let i = 0; i < 1400; i++) {
    const px = -7.5 + rnd() * 16, pz = z0 + 0.95 + rnd() * (w - 1.1);
    m.compose(new THREE.Vector3(px, 0.12 + rnd() * 0.02, pz), q.setFromEuler(new THREE.Euler(0, rnd() * 3, 0)), new THREE.Vector3(0.9 + rnd() * 0.5, 0.8 + rnd() * 0.6, 0.9 + rnd() * 0.4));
    inst.setMatrixAt(n, m); c.setHSL(0.08 + rnd() * 0.04, 0.08 + rnd() * 0.1, 0.42 + rnd() * 0.22); inst.setColorAt(n, c); n++;
  }
  inst.castShadow = true; inst.receiveShadow = true; group.add(inst);
  // kerbs and the stone-lined ley channel
  for (let i = 0; i < len / 0.6; i++) { const px = -7.7 + i * 0.6; kit.add(new THREE.BoxGeometry(0.58, 0.18, 0.28), M.dressed, { x: px + 1.4, y: 0.16, z: z0 + w + 0.1, ry: (rnd() - 0.5) * 0.03 }); kit.add(new THREE.BoxGeometry(0.58, 0.16, 0.24), M.dressed, { x: px + 1.4, y: 0.14, z: z0 + 0.62 + (rnd() - 0.5) * 0.01 }); kit.add(new THREE.BoxGeometry(0.58, 0.16, 0.24), M.dressed, { x: px + 1.4, y: 0.14, z: z0 - 0.02 }); }
  kit.add(new THREE.BoxGeometry(len, 0.12, 0.5), M.clothDark, { x: 1.4, y: 0.0, z: z0 + 0.3 });
  kit.add(new THREE.PlaneGeometry(len, 0.44), M.ley, { x: 1.4, y: 0.08, z: z0 + 0.3, rx: -Math.PI / 2 });
  // a drain grate and a weed or two
  kit.add(new THREE.BoxGeometry(0.5, 0.04, 0.32), M.iron, { x: 3.5, y: 0.15, z: z0 + 1.0 });
  for (let i = 0; i < 4; i++) kit.add(new THREE.BoxGeometry(0.34, 0.02, 0.04), M.clothDark, { x: 3.5, y: 0.18, z: z0 + 0.88 + i * 0.08 });
}
function ground(kit, L) {
  const M = mats();
  const g = new THREE.PlaneGeometry(90, 70, 120, 90).rotateX(-Math.PI / 2);
  const pos = g.getAttribute('position'); const col = new Float32Array(pos.count * 3); const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, 0.08 * Math.sin(x * 0.5 + 1) * Math.cos(z * 0.4) - 0.05 + 0.02 * Math.sin(x * 3.1) * Math.sin(z * 2.7));
    // moss-green meadow drifting to straw, worn to earth along the street and under the buildings
    const drift = 0.5 + 0.3 * Math.sin(x * 0.21 + Math.sin(z * 0.3)) + 0.2 * Math.sin(z * 0.27 + Math.cos(x * 0.17));
    c.setHSL(0.22 - drift * 0.05, 0.38 - drift * 0.1, 0.30 + drift * 0.14);
    const dz = Math.max(0, Math.abs(z - 0.4 - (L.street.z + L.street.w / 2)) - L.street.w / 2);
    const nearBuild = Math.max(0, Math.hypot(Math.max(0, Math.abs(x - 1.4) - 6.5), Math.max(0, Math.abs(z - 0.4 + 1.6) - 2.2)));
    const wear = Math.max(1 - dz / 1.4, 1 - nearBuild / 1.1);
    if (wear > 0) c.lerp(new THREE.Color(0x8f7b5c), Math.min(1, wear) * 0.85);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals(); const uv = g.getAttribute('uv'); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 20, uv.getY(i) * 15);
  kit.add(g, M.earth, { x: 1.4, y: 0, z: 0.4 });
  // grass tufts as leaf cards along the verge
  for (let i = 0; i < 700; i++) { const x = -20 + rnd() * 44, z = -14 + rnd() * 30; if (Math.abs(z - (L.street.z + L.street.w / 2)) < L.street.w / 2 + 0.2) continue; if (Math.abs(x - 1.4) < 6.6 && z > -4.2 && z < 0.5) continue; const s = 0.25 + rnd() * 0.35; kit.add(new THREE.PlaneGeometry(s, s), M.leaf2, { x, y: s * 0.4, z, ry: rnd() * 3, tint: rnd() < 0.5 ? 0x8fa860 : 0xb7bd74 }); }
}
function tree(kit, L, group) {
  const M = mats(); const x = L.tree.x, z = L.tree.z;
  kit.add(new THREE.CylinderGeometry(0.22, 0.42, 3.2, 14), M.oak, { x, y: 1.6, z, tint: 0x8a7a68 });
  const limbs = [[0.5, 3.0, 0.2, 0.9], [-0.6, 2.8, -0.3, 1.0], [0.1, 3.3, -0.7, 0.8], [0.2, 3.1, 0.7, 0.7]];
  for (const [dx, y, dz, l] of limbs) { const dir = new THREE.Vector3(dx, 1, dz).normalize(); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); const e = new THREE.Euler().setFromQuaternion(q); kit.add(new THREE.CylinderGeometry(0.07, 0.15, l * 1.6, 8), M.oak, { x: x + dir.x * l * 0.8, y: y + dir.y * l * 0.8, z: z + dir.z * l * 0.8, rx: e.x, ry: e.y, rz: e.z, tint: 0x8a7a68 }); }
  // foliage: leaf cards in an ellipsoid crown, darker inside, lit on top
  const card = new THREE.PlaneGeometry(1.15, 1.15);
  card.setAttribute('color', new THREE.BufferAttribute(new Float32Array(card.getAttribute('position').count * 3).fill(1), 3));
  const N = 120; const inst = new THREE.InstancedMesh(card, M.leaf, N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const u = rnd() * 2 - 1, a = rnd() * 6.28, r = Math.cbrt(rnd());
    const px = x + Math.cos(a) * Math.sqrt(1 - u * u) * r * 2.1, py = 4.4 + u * r * 1.7, pz = z + Math.sin(a) * Math.sqrt(1 - u * u) * r * 2.0;
    m.compose(new THREE.Vector3(px, py, pz), q.setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3)), new THREE.Vector3(0.8 + rnd() * 0.5, 0.8 + rnd() * 0.5, 1));
    inst.setMatrixAt(i, m); const depth = r; c.setHSL(0.24 + rnd() * 0.04, 0.35, 0.28 + depth * 0.22 + (py - 4.4) * 0.05); inst.setColorAt(i, c);
  }
  inst.castShadow = true; inst.receiveShadow = true;
  inst.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: T.leaf, alphaTest: 0.5, side: THREE.DoubleSide });
  group.add(inst);
}
function lamp(kit, L) {
  const M = mats(); const x = L.lamp.x, z = L.lamp.z;
  kit.add(new THREE.BoxGeometry(0.5, 0.3, 0.5), M.dressed, { x, y: 0.15, z });
  kit.add(new THREE.CylinderGeometry(0.07, 0.11, 3.0, 12), M.iron, { x, y: 1.8, z });
  for (const v of [0.6, 1.4]) kit.add(new THREE.TorusGeometry(0.1, 0.02, 6, 14), M.iron, { x, y: v, z, rx: Math.PI / 2 });
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 3.2, z), new THREE.Vector3(x, 3.6, z), new THREE.Vector3(x - 0.2, 3.95, z), new THREE.Vector3(x - 0.6, 4.0, z), new THREE.Vector3(x - 0.9, 3.75, z)]);
  kit.add(new THREE.TubeGeometry(curve, 24, 0.045, 8, false), M.iron, {});
  lantern(kit, { x: x - 0.9, y: 3.62, z, ry: 0, size: 1.25 });
  // a small brass sip-pipe from the channel up the post
  kit.add(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 6), M.copper, { x: x + 0.1, y: 0.9, z: z + 0.02 });
}
function person(kit, L) {
  const M = mats(); const x = L.person.x, z = L.person.z, ry = 0.5;
  const c = Math.cos(ry), sn = Math.sin(ry);
  const at = (u, v, w) => ({ x: x + c * u + sn * w, y: v, z: z - sn * u + c * w });
  // robe: a lathe with a swing at the hem and folds
  const pts = []; for (let i = 0; i <= 14; i++) { const f = i / 14; pts.push(new THREE.Vector2(0.42 - f * 0.24 + 0.025 * Math.sin(f * 22), f * 1.35)); }
  kit.add(new THREE.LatheGeometry(pts, 20), M.cloth, { x, z, ry });
  // shoulders and a hooded cloak over them
  kit.add(new THREE.CapsuleGeometry(0.2, 0.34, 4, 12), M.cloth, { x, y: 1.45, z, ry });
  kit.add(new THREE.LatheGeometry([new THREE.Vector2(0.01, 0), new THREE.Vector2(0.34, 0), new THREE.Vector2(0.3, 0.35), new THREE.Vector2(0.14, 0.5)], 16), M.clothDark, { x, y: 1.3, z, ry, tint: 0x7a6a8a });
  for (const s of [-1, 1]) { kit.add(new THREE.CapsuleGeometry(0.075, 0.55, 4, 10), M.cloth, { ...at(s * 0.3, 1.2, 0), rz: s * 0.3, ry }); kit.add(new THREE.SphereGeometry(0.06, 10, 8), M.skin, { ...at(s * 0.4, 0.88, 0.04) }); }
  kit.add(new THREE.SphereGeometry(0.19, 16, 14), M.skin, { x, y: 1.76, z, sy: 1.1 });
  kit.add(new THREE.SphereGeometry(0.09, 10, 8), M.cloth, { ...at(0, 1.6, 0.14), tint: 0xd8d0c0, sy: 1.3, sz: 0.7 });   // beard
  // hat: wide brim, tall crown, brass band, hooked tip
  kit.add(new THREE.CylinderGeometry(0.46, 0.5, 0.05, 20), M.clothDark, { x, y: 1.93, z, rx: 0.08 });
  kit.add(new THREE.CylinderGeometry(0.09, 0.26, 0.8, 16), M.clothDark, { x, y: 2.34, z, rx: 0.08 });
  const tip = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 2.7, z), new THREE.Vector3(x, 2.95, z), new THREE.Vector3(x - 0.14, 3.12, z), new THREE.Vector3(x - 0.4, 3.06, z)]);
  kit.add(new THREE.TubeGeometry(tip, 14, 0.085, 8, false), M.clothDark, {});
  kit.add(new THREE.TorusGeometry(0.27, 0.025, 8, 20), M.brass, { x, y: 1.99, z, rx: Math.PI / 2 + 0.08 });
  // satchel and a crook staff
  kit.add(new THREE.BoxGeometry(0.3, 0.26, 0.12), M.oakPale, { ...at(0.34, 0.95, 0.05), ry });
  kit.add(new THREE.BoxGeometry(0.02, 0.9, 0.02), M.cloth, { ...at(0.32, 1.4, 0.02), rz: -0.35, ry });
  const st = at(-0.45, 0, 0.1);
  kit.add(new THREE.CylinderGeometry(0.025, 0.035, 2.2, 8), M.oak, { x: st.x, y: 1.1, z: st.z });
  kit.add(new THREE.TorusGeometry(0.12, 0.025, 8, 14, Math.PI * 1.3), M.brass, { x: st.x, y: 2.28, z: st.z, ry: 0.5 });
}

// gentle hand-drawn lean on the merged building meshes so nothing is perfectly straight
function lean(group, amt = 0.035) {
  group.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh) return;
    const pos = o.geometry.getAttribute('position'); if (!pos) return;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); const k = amt * Math.min(2, y * 0.25); pos.setXYZ(i, x + k * Math.sin(y * 1.3 + z * 0.9), y, z + k * Math.sin(x * 1.1 + y * 0.7 + 2)); }
    pos.needsUpdate = true;
  });
}

let post = null;
export const crooked = {
  name: 'Crooked realism',
  background: 0xe3d6c0,
  camera: { pitch: 0.36, dist: 26, yaw: 0.55, x: 1.6, z: 0.2 },
  build(group, L, Kit) {
    mats();
    const kit = new Kit();
    ground(kit, L); street(kit, L, group); tallHouse(kit, L.houseA); shop(kit, L.houseB); tree(kit, L, group); lamp(kit, L); person(kit, L);
    const built = kit.build(); lean(built); group.add(built);
    return group;
  },
  lights(scene, renderer) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const sun = new THREE.DirectionalLight(0xffcf9a, 3.6); sun.position.set(-12, 6.5, 10); sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096); sun.shadow.camera.left = -15; sun.shadow.camera.right = 15; sun.shadow.camera.top = 15; sun.shadow.camera.bottom = -15; sun.shadow.camera.near = 1; sun.shadow.camera.far = 60; sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3;
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0x9fb6d6, 0x6f6250, 0.6));
    // environment: a painted sky sphere baked into a PMREM so brass, glass and ley reflect something
    const sky = new THREE.Scene();
    const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: {}, vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = mix(vec3(0.95,0.82,0.62), vec3(0.55,0.68,0.85), smoothstep(-0.05, 0.6, h)); c = mix(vec3(0.35,0.3,0.25), c, smoothstep(-0.3, 0.0, h)); vec3 sd = normalize(vec3(-0.6, 0.5, 0.7)); c += vec3(1.0,0.85,0.6) * pow(max(dot(normalize(vP), sd), 0.0), 40.0) * 2.0; gl_FragColor = vec4(c, 1.0); }` });
    sky.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMat));
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(sky, 0.04).texture; scene.environmentIntensity = 0.55;
    scene.fog = new THREE.Fog(0xe3d6c0, 22, 60);
  },
  post: {
    init(renderer, scene, camera) { post = new InkPass(renderer, scene, camera); const u = post.mat.uniforms; u.strength.value = 0.0; u.grain.value = 0.02; u.dof.value = 0.35; u.aoStrength.value = 0.85; u.aoRadius.value = 0.9; u.skyBot.value.set(0xe3d6c0); u.skyTop.value.set(0x9fb6d6); },
    render(renderer, scene, camera) { const bg = scene.background; scene.background = null; post.render(); scene.background = bg; },
  },
  resize(renderer) { if (post) { const s = renderer.getDrawingBufferSize(new THREE.Vector2()); post.setSize(s.x, s.y); post.mat.uniforms.lineW.value = Math.max(1, s.x / 1500); } },
};
