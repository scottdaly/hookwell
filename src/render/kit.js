import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { materials } from './materials.js';

// Kit: a tiny geometry accumulator for authoring buildings and props in code.
// Every piece is pushed with world-scaled UVs (texture repeats every `uvScale` metres),
// an optional vertex tint, then merged into one mesh per material.

const _c = new THREE.Color();

export class Kit {
  constructor() { this.parts = new Map(); this.extras = []; }

  _push(geom, mat, tint) {
    if (!geom.getAttribute('color')) {
      const n = geom.getAttribute('position').count;
      const col = new Float32Array(n * 3);
      _c.set(tint ?? 0xffffff);
      for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
      geom.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push(geom);
  }

  // Convex planar polygon (array of Vector3), CCW when seen from outside.
  poly(points, mat, { uvScale = 2, tint, uvOff = 0 } = {}) {
    const n = points.length;
    const a = points[0], b = points[1], c = points[n - 1];
    const e1 = new THREE.Vector3().subVectors(b, a), e2 = new THREE.Vector3().subVectors(c, a);
    const normal = new THREE.Vector3().crossVectors(e1, e2).normalize();
    // tangent basis: u along the longest edge in XZ if possible, v = n x u
    let u = e1.clone().normalize();
    if (Math.abs(normal.y) < 0.99) { u = new THREE.Vector3(0, 1, 0).cross(normal).normalize(); }
    const v = new THREE.Vector3().crossVectors(normal, u);
    const pos = [], nor = [], uv = [], idx = [];
    for (const p of points) {
      pos.push(p.x, p.y, p.z); nor.push(normal.x, normal.y, normal.z);
      uv.push((p.dot(u) + uvOff) / uvScale, (p.dot(v) + uvOff) / uvScale);
    }
    for (let i = 1; i < n - 1; i++) idx.push(0, i, i + 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    this._push(g, mat, tint);
    return this;
  }

  // Frustum/box: bottom rectangle (w0 x d0) at y, top rectangle (w1 x d1) at y+h, centred on x,z.
  // rot rotates around Y. Faces: 4 sides (+ top/bottom optional).
  frustum({ w0, d0, w1 = w0, d1 = d0, h, x = 0, y = 0, z = 0, rot = 0, mat, top = true, bottom = false, uvScale = 2, tint, shear = [0, 0], uvOff }) {
    const P = (px, py, pz) => {
      const c = Math.cos(rot), s = Math.sin(rot);
      return new THREE.Vector3(x + px * c - pz * s, y + py, z + px * s + pz * c);
    };
    const [sx, sz] = shear;
    const b0 = P(-w0 / 2, 0, -d0 / 2), b1 = P(w0 / 2, 0, -d0 / 2), b2 = P(w0 / 2, 0, d0 / 2), b3 = P(-w0 / 2, 0, d0 / 2);
    const t0 = P(-w1 / 2 + sx, h, -d1 / 2 + sz), t1 = P(w1 / 2 + sx, h, -d1 / 2 + sz), t2 = P(w1 / 2 + sx, h, d1 / 2 + sz), t3 = P(-w1 / 2 + sx, h, d1 / 2 + sz);
    const o = { uvScale, tint, uvOff: uvOff ?? (x * 0.37 + z * 0.61) };
    this.poly([b3, b2, t2, t3], mat, o); // front (+z)
    this.poly([b1, b0, t0, t1], mat, o); // back
    this.poly([b2, b1, t1, t2], mat, o); // right (+x)
    this.poly([b0, b3, t3, t0], mat, o); // left
    if (top) this.poly([t3, t2, t1, t0], mat, o);
    if (bottom) this.poly([b0, b1, b2, b3], mat, o);
    return this;
  }
  box(o) { return this.frustum({ ...o, w0: o.w, d0: o.d, w1: o.w, d1: o.d }); }

  // Tented roof: base w x d at y, ridge of length `ridge` (0 = pyramid) at y+h, oriented along X.
  roof({ w, d, h, x = 0, y = 0, z = 0, rot = 0, ridge = 0, mat, uvScale = 1.6, tint, curve = 0 }) {
    const P = (px, py, pz) => { const c = Math.cos(rot), s = Math.sin(rot); return new THREE.Vector3(x + px * c - pz * s, y + py, z + px * s + pz * c); };
    const b0 = P(-w / 2, 0, -d / 2), b1 = P(w / 2, 0, -d / 2), b2 = P(w / 2, 0, d / 2), b3 = P(-w / 2, 0, d / 2);
    const r0 = P(-ridge / 2, h, 0), r1 = P(ridge / 2, h, 0);
    const o = { uvScale, tint, uvOff: x * 0.3 };
    if (curve > 0) {
      // sagging/flared tented roof: split each face into a lower flared band and an upper steep part
      const f = 0.32; // fraction of height where the kink is
      const mw = w * (1 - f) + ridge * f, md = d * (1 - f);
      const kink = h * f - curve;
      const m0 = P(-mw / 2, kink, -md / 2), m1 = P(mw / 2, kink, -md / 2), m2 = P(mw / 2, kink, md / 2), m3 = P(-mw / 2, kink, md / 2);
      this.poly([b3, b2, m2, m3], mat, o); this.poly([b1, b0, m0, m1], mat, o);
      this.poly([b2, b1, m1, m2], mat, o); this.poly([b0, b3, m3, m0], mat, o);
      if (ridge > 0) {
        this.poly([m3, m2, r1, r0], mat, o); this.poly([m1, m0, r0, r1], mat, o);
        this.poly([m2, m1, r1], mat, o); this.poly([m0, m3, r0], mat, o);
      } else {
        this.poly([m3, m2, r0], mat, o); this.poly([m1, m0, r0], mat, o);
        this.poly([m2, m1, r0], mat, o); this.poly([m0, m3, r0], mat, o);
      }
      return this;
    }
    if (ridge > 0) {
      this.poly([b3, b2, r1, r0], mat, o); // front slope
      this.poly([b1, b0, r0, r1], mat, o); // back slope
      this.poly([b2, b1, r1], mat, o);      // right hip
      this.poly([b0, b3, r0], mat, o);      // left hip
    } else {
      this.poly([b3, b2, r0], mat, o); this.poly([b1, b0, r0], mat, o);
      this.poly([b2, b1, r0], mat, o); this.poly([b0, b3, r0], mat, o);
    }
    return this;
  }

  // Generic THREE geometry placed with a transform.
  geom(geometry, mat, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, tint } = {}) {
    const g = geometry.clone();
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
    g.applyMatrix4(m);
    if (g.index === null) { /* fine */ }
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    this._push(g, mat, tint);
    return this;
  }
  cyl({ r, r2 = r, h, x = 0, y = 0, z = 0, seg = 8, mat, tint, rx = 0, rz = 0, ry = 0, open = false, uvScale = 2 }) {
    const g = new THREE.CylinderGeometry(r2, r, h, seg, 1, open);
    const uv = g.getAttribute('uv');
    const circ = Math.PI * (r + r2);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ / uvScale + x * 0.3, uv.getY(i) * h / uvScale + y * 0.3);
    return this.geom(g, mat, { x, y: y + h / 2, z, rx, ry, rz, tint });
  }
  sphere({ r, x = 0, y = 0, z = 0, seg = 8, mat, tint, sy = 1 }) {
    return this.geom(new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2)), mat, { x, y, z, tint, sy });
  }
  cone({ r, h, x = 0, y = 0, z = 0, seg = 6, mat, tint, rimTint, rx = 0, rz = 0 }) {
    const g = new THREE.ConeGeometry(r, h, seg);
    if (rimTint !== undefined) {
      const pos = g.getAttribute('position'); const col = new Float32Array(pos.count * 3);
      const a = new THREE.Color(tint ?? 0xffffff), b = new THREE.Color(rimTint);
      for (let i = 0; i < pos.count; i++) { const f = 1 - (pos.getY(i) + h / 2) / h; const c = a.clone().lerp(b, f * f); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    return this.geom(g, mat, { x, y: y + h / 2, z, tint, rx, rz });
  }
  // brass hook: a torus segment plus a short rod. Points along -z from its root; rot around Y.
  hook({ x = 0, y = 0, z = 0, r = 0.25, tube = 0.04, rot = 0, mat = 'brass', up = true, tint }) {
    const t = new THREE.TorusGeometry(r, tube, 5, 10, Math.PI * 1.25);
    const ry = rot;
    // rod
    this.geom(new THREE.CylinderGeometry(tube, tube, r * 1.6, 5), mat, { x, y, z, rx: Math.PI / 2, ry, tint });
    const off = new THREE.Vector3(0, 0, -r * 0.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    this.geom(t, mat, { x: x + off.x, y: y - (up ? -r : r) * 0 + (up ? 0 : 0), z: z + off.z, ry: ry + Math.PI / 2, rz: up ? Math.PI * 0.75 : Math.PI * -0.25, tint });
    return this;
  }
  add(obj) { this.extras.push(obj); return this; }

  build({ shadows = true } = {}) {
    const M = materials();
    const group = new THREE.Group();
    for (const [matKey, geoms] of this.parts) {
      const merged = mergeGeometries(geoms, false);
      const mesh = new THREE.Mesh(merged, M[matKey] || M.plaster);
      mesh.castShadow = shadows; mesh.receiveShadow = shadows;
      mesh.name = matKey;
      group.add(mesh);
    }
    for (const e of this.extras) group.add(e);
    return group;
  }
}

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
