import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { W, H, TILE } from '../game/defs.js';
import { idx, inBounds, neighbors4 } from '../game/state.js';
import { materials } from './materials.js';
import { groundTex, cobbleTex } from './textures.js';

export const tileToWorld = (tx, ty) => [(tx - W / 2 + 0.5) * TILE, (ty - H / 2 + 0.5) * TILE];
export const worldToTile = (x, z) => [Math.floor(x / TILE + W / 2), Math.floor(z / TILE + H / 2)];

// Ground: one fine plane (1 m cells) with vertex colours: sage meadow drifting to dry straw,
// worn to bare earth along the streets and around buildings. Recoloured when the town changes.
export function makeGround(s) {
  const g = new THREE.PlaneGeometry(W * TILE, H * TILE, W * 4, H * 4);
  g.rotateX(-Math.PI / 2);
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 3), 3));
  const uv = g.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * W / 2.5, uv.getY(i) * H / 2.5);
  const m = new THREE.MeshLambertMaterial({ map: groundTex(), vertexColors: true });
  const mesh = new THREE.Mesh(g, m);
  mesh.receiveShadow = true;
  colorGround(mesh, s);
  return mesh;
}
export function colorGround(mesh, s) {
  const g = mesh.geometry, pos = g.getAttribute('position'), col = g.getAttribute('color');
  const c = new THREE.Color(), earth = new THREE.Color(0xc4ad84), rockC = new THREE.Color(0xa9aaa6);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const [tx, ty] = worldToTile(x + 0.001, z + 0.001);
    const cx = Math.min(W - 1, Math.max(0, tx)), cy = Math.min(H - 1, Math.max(0, ty));
    const t = s.tiles[idx(cx, cy)];
    const n = 0.5 + 0.28 * Math.sin(x * 0.045 + Math.sin(z * 0.07) * 1.4) + 0.22 * Math.sin(z * 0.06 + Math.cos(x * 0.05) * 1.8);
    const f = Math.max(0, Math.min(1, n * 0.8 + t.fert * 0.2));
    c.setHSL(0.235 - f * 0.06, 0.36 - f * 0.08, 0.52 + f * 0.12);
    // wear: distance to the nearest street or building tile in the 3x3 neighbourhood
    let wear = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = cx + dx, ny = cy + dy;
      if (!inBounds(nx, ny)) continue;
      const u = s.tiles[idx(nx, ny)];
      if (!u.road && !u.building) continue;
      const [wx, wz] = tileToWorld(nx, ny);
      const ddx = Math.max(0, Math.abs(x - wx) - TILE / 2), ddz = Math.max(0, Math.abs(z - wz) - TILE / 2);
      const d = Math.hypot(ddx, ddz);
      wear = Math.max(wear, 1 - Math.min(1, d / (u.road ? 1.3 : 0.9)));
    }
    if (t.terrain === 'rock') c.copy(rockC);
    c.lerp(earth, wear * wear * 0.85);
    col.setXYZ(i, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
}

let cobbleMat = null, curbMat = null;
function roadMats() {
  if (!cobbleMat) {
    cobbleMat = new THREE.MeshLambertMaterial({ map: cobbleTex(), vertexColors: true });
    curbMat = new THREE.MeshLambertMaterial({ color: 0xe6dcc3, vertexColors: true });
  }
  return [cobbleMat, curbMat];
}

// Streets: a cobbled pad per road tile with arms toward road neighbours, leaving earth verges,
// and chalk curbs along every open edge. Rebuilt on version change.
const RW = 2.9; // paved width in metres
export function makeRoads(s) {
  const quads = [], curbs = [];
  const c = new THREE.Color();
  const addQuad = (cx, cz, w, d, x, y, t) => {
    const g = new THREE.PlaneGeometry(w, d);
    g.rotateX(-Math.PI / 2);
    g.translate(cx, 0.03, cz);
    const uv = g.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w / TILE) * 1.5 + x * 0.37, (uv.getY(i) * d / TILE) * 1.5 + y * 0.53);
    const col = new Float32Array(uv.count * 3);
    c.setHSL(0.08, 0.12, 0.72 + (t.fert - 0.5) * 0.08);
    for (let i = 0; i < uv.count; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    quads.push(g);
  };
  const addCurb = (cx, cz, w, d) => {
    const cg = new THREE.BoxGeometry(w, 0.09, d); cg.translate(cx, 0.045, cz);
    cg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cg.getAttribute('position').count * 3).fill(1), 3));
    curbs.push(cg);
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = s.tiles[idx(x, y)];
    if (!t.road) continue;
    const [wx, wz] = tileToWorld(x, y);
    addQuad(wx, wz, RW, RW, x, y, t);
    const arm = (TILE - RW) / 2;
    const open = { };
    for (const [nx, ny] of neighbors4(x, y)) {
      const dx = nx - x, dz = ny - y;
      const conn = (inBounds(nx, ny) && s.tiles[idx(nx, ny)].road) || !inBounds(nx, ny);
      open[dx + ',' + dz] = conn;
      if (!conn) continue;
      // arm to the tile edge
      addQuad(wx + dx * (RW / 2 + arm / 2), wz + dz * (RW / 2 + arm / 2), dx === 0 ? RW : arm, dz === 0 ? RW : arm, x, y, t);
      // curbs along the arm's two sides
      for (const side of [-1, 1]) {
        if (dx === 0) addCurb(wx + side * (RW / 2 + 0.06), wz + dz * (RW / 2 + arm / 2), 0.14, arm);
        else addCurb(wx + dx * (RW / 2 + arm / 2), wz + side * (RW / 2 + 0.06), arm, 0.14);
      }
    }
    // curbs on the pad's closed sides, and corner stubs where two open sides meet are covered by arm curbs
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (open[dx + ',' + dz]) continue;
      if (dx === 0) addCurb(wx, wz + dz * (RW / 2 + 0.06), RW + 0.26, 0.14);
      else addCurb(wx + dx * (RW / 2 + 0.06), wz, 0.14, RW + 0.26);
    }
  }
  const group = new THREE.Group();
  const [cm, km] = roadMats();
  if (quads.length) { const m = new THREE.Mesh(mergeGeometries(quads, false), cm); m.receiveShadow = true; group.add(m); }
  if (curbs.length) { const m = new THREE.Mesh(mergeGeometries(curbs, false), km); m.receiveShadow = true; m.castShadow = false; group.add(m); }
  return group;
}

// Ley fluid shader: turquoise with cobalt depth and highlights that travel along the flow.
export function leyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, glow: { value: 0.0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float time; uniform float glow; varying vec2 vUv;
      void main(){
        float band = sin(vUv.x*6.2832 - time*3.0 + sin(vUv.y*9.0)*0.6)*0.5+0.5;
        band = smoothstep(0.55, 0.95, band);
        float edge = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
        vec3 deep = vec3(0.10, 0.28, 0.46);
        vec3 body = vec3(0.19, 0.50, 0.62);
        vec3 foam = vec3(0.62, 0.86, 0.86);
        vec3 col = mix(deep, body, edge);
        col = mix(col, foam, band*0.6*edge + (1.0-edge)*0.2*band);
        col += glow * vec3(0.15, 0.35, 0.45);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

// Channels: for each channelled tile, a trench slab, chalk lips, and fluid strips toward each connected neighbour.
export function makeChannels(s, leyMat) {
  const M = materials();
  const trench = [], lips = [], fluid = [], pools = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = s.tiles[idx(x, y)];
    if (!t.road || !t.channel) continue;
    const [wx, wz] = tileToWorld(x, y);
    const live = t.ley >= 0;
    const conns = [];
    for (const [nx, ny] of neighbors4(x, y)) {
      const u = inBounds(nx, ny) ? s.tiles[idx(nx, ny)] : null;
      if (!u) continue;
      const isSource = u.terrain === 'spring' || (u.building && s.buildings.get(u.building) && s.buildings.get(u.building).type === 'leywell');
      if ((u.road && u.channel) || isSource) conns.push([nx - x, ny - y, isSource ? -1 : u.ley]);
    }
    // central pad
    const pad = new THREE.BoxGeometry(0.9, 0.05, 0.9); pad.translate(wx, 0.045, wz); trench.push(pad);
    if (conns.length === 0) { const dead = new THREE.BoxGeometry(1.4, 0.05, 1.4); dead.translate(wx, 0.045, wz); trench.push(dead); }
    for (const [dx, dz, nl] of conns) {
      const len = TILE / 2, wid = 0.8;
      const sg = new THREE.BoxGeometry(dx === 0 ? wid : len, 0.05, dz === 0 ? wid : len);
      sg.translate(wx + dx * len / 2, 0.045, wz + dz * len / 2);
      trench.push(sg);
      // chalk lips either side of the segment
      for (const side of [-1, 1]) {
        const lg = new THREE.BoxGeometry(dx === 0 ? 0.12 : len, 0.07, dz === 0 ? 0.12 : len);
        lg.translate(wx + dx * len / 2 + (dx === 0 ? side * (wid / 2 + 0.06) : 0), 0.06, wz + dz * len / 2 + (dz === 0 ? side * (wid / 2 + 0.06) : 0));
        lips.push(lg);
      }
      if (live) {
        // fluid strip with uv.x pointing along the flow (away from the source)
        const fg = new THREE.PlaneGeometry(len, wid * 0.56);
        const outward = nl === -1 ? false : nl > t.ley; // flow goes toward neighbour if neighbour is farther from source
        let ang = Math.atan2(dx, dz) + Math.PI / 2; // plane width along direction
        if (!outward) ang += Math.PI;
        fg.rotateX(-Math.PI / 2); fg.rotateY(ang);
        fg.translate(wx + dx * len / 2, 0.075, wz + dz * len / 2);
        fluid.push(fg);
      }
    }
    if (live) {
      const cg = new THREE.CircleGeometry(0.24, 10); cg.rotateX(-Math.PI / 2); cg.translate(wx, 0.075, wz); fluid.push(cg);
    }
    if (t.deadEnd && live) {
      // a spreading pool with a waxy rim, growing with pool time
      const f = Math.min(1, t.pool / 30);
      const pg = new THREE.CircleGeometry(0.6 + f * 1.1, 12); pg.rotateX(-Math.PI / 2); pg.translate(wx, 0.08, wz); pools.push(pg);
      const rim = new THREE.TorusGeometry(0.62 + f * 1.1, 0.09, 5, 16); rim.rotateX(-Math.PI / 2); rim.translate(wx, 0.07, wz); lips.push(rim);
    }
  }
  const group = new THREE.Group();
  const tint = g => { const n = g.getAttribute('position').count; g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3)); return g; };
  if (trench.length) { const m = new THREE.Mesh(mergeGeometries(trench.map(tint), false), M.ashlarDark); m.receiveShadow = true; group.add(m); }
  if (lips.length) { const m = new THREE.Mesh(mergeGeometries(lips.map(tint), false), M.cream); m.receiveShadow = true; group.add(m); }
  if (fluid.length) { const m = new THREE.Mesh(mergeGeometries(fluid, false), leyMat); group.add(m); }
  if (pools.length) { const m = new THREE.Mesh(mergeGeometries(pools, false), leyMat); group.add(m); }
  return group;
}
