import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { W, H, TILE, BUILDINGS } from '../game/defs.js';
import { idx, inBounds, buildingCells, footprint } from '../game/state.js';
import { doorTile } from '../game/sim.js';
import { materials, setGlow } from './materials.js';
import { makeGround, makeRoads, makeChannels, leyMaterial, tileToWorld, worldToTile } from './terrain.js';
import { BUILDERS } from './buildings.js';
import { candlePine, inkwood, bloom, rockTile, spring, milePost, clump, waymark } from './props.js';
import { personMesh } from './people.js';
import { mulberry32 } from '../game/state.js';
import { InkPass } from './inkpass.js';

const PAPER = new THREE.Color(0xe9e2cf);

// packed-earth apron so buildings sit in worn ground instead of floating on meadow
let apronMat = null;
export function apron(w, d, seed) {
  if (!apronMat) apronMat = new THREE.MeshLambertMaterial({ color: 0xb09a72, vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2 });
  const shape = new THREE.Shape();
  const n = 22;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    // superellipse-ish rounded rectangle with noisy radius
    const cx = Math.cos(a), cz = Math.sin(a);
    const rx = (w / 2 + 0.45) / Math.max(Math.abs(cx), 0.001), rz = (d / 2 + 0.45) / Math.max(Math.abs(cz), 0.001);
    let r = Math.min(rx, rz);
    r *= 0.9 + 0.13 * Math.sin(a * 3 + seed * 20) + 0.08 * Math.sin(a * 7 + seed * 40);
    const px = cx * r, pz = cz * r;
    if (i === 0) shape.moveTo(px, pz); else shape.lineTo(px, pz);
  }
  const g = new THREE.ShapeGeometry(shape, 1);
  g.rotateX(Math.PI / 2); // shape is in xy; put it flat with y up (winding flipped by rotation, fix normals below)
  g.scale(1, 1, -1);
  g.computeVertexNormals();
  const pos = g.getAttribute('position'); const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { const l = 0.9 + 0.1 * Math.sin(pos.getX(i) * 2.3 + pos.getZ(i) * 1.7 + seed * 9); col[i * 3] = l; col[i * 3 + 1] = l; col[i * 3 + 2] = l; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, apronMat); m.position.y = 0.012; m.receiveShadow = true;
  return m;
}

function nearBuilt(s, x, y) {
  for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) {
    if (!inBounds(xx, yy)) continue; const u = s.tiles[idx(xx, yy)]; if (u.road || u.building) return true;
  }
  return false;
}

export class View {
  constructor(canvas, state) {
    this.state = state;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.scene = new THREE.Scene();
    this.scene.background = PAPER.clone();
    this.scene.fog = new THREE.Fog(PAPER.clone(), 90, 220);
    this.camera = new THREE.PerspectiveCamera(32, 1, 2, 400);
    this.cam = { x: 0, z: 0, yaw: 0.6, pitch: 0.82, dist: 46 };
    materials();

    // lights
    this.sun = new THREE.DirectionalLight(0xffffff, 2.0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.sun.shadow.camera.near = 10; this.sun.shadow.camera.far = 220;
    this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.04;
    this.sun.shadow.radius = 5;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xe9e4d3, 0xc9b48c, 0.9);
    this.scene.add(this.hemi);
    this.moon = new THREE.DirectionalLight(0x9fb4ff, 0);
    this.scene.add(this.moon);
    this.lampLights = [];

    // static world
    this.scene.add(makeGround(state));
    this.static = new THREE.Group(); this.scene.add(this.static);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = state.tiles[idx(x, y)];
      const [wx, wz] = tileToWorld(x, y);
      if (t.terrain === 'rock') { const m = rockTile(t.fert); m.position.set(wx, 0, wz); this.static.add(m); }
      if (t.terrain === 'spring') { const m = spring(); m.position.set(wx, 0, wz); this.static.add(m); }
    }
    { const [wx, wz] = tileToWorld(3, state.entry.y); const m = waymark(); m.position.set(wx + 0.3, 0, wz - 1.75); m.rotation.y = 0.2; this.static.add(m); }
    this.leyMat = leyMaterial();
    this.tufts = this.makeTufts(); this.scene.add(this.tufts);
    this.roads = null; this.channels = null;
    this.tileObjs = new Map();     // idx -> {key, obj}
    this.buildingObjs = new Map(); // id -> {key, obj}
    this.peopleObjs = new Map();
    this.dyn = new THREE.Group(); this.scene.add(this.dyn);
    this.peopleGroup = new THREE.Group(); this.scene.add(this.peopleGroup);
    this.lastVersion = -1;
    this.lastNight = null;

    // ghost / cursor
    this.ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x4fb37a, transparent: true, opacity: 0.35, depthWrite: false }));
    this.ghost.visible = false; this.scene.add(this.ghost);
    this.ghostRing = new THREE.Mesh(new THREE.RingGeometry(1, 1.1, 32), new THREE.MeshBasicMaterial({ color: 0x4fb37a, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
    this.ghostRing.rotation.x = -Math.PI / 2; this.ghostRing.visible = false; this.scene.add(this.ghostRing);

    this.ink = new InkPass(this.renderer, this.scene, this.camera);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.clock = 0;
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    const s = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.ink.setSize(s.x, s.y);
    this.ink.mat.uniforms.lineW.value = Math.max(1, s.x / 1500);
  }

  // ------------------------------------------------------------ camera
  updateCamera() {
    const c = this.cam;
    const limit = (W / 2) * TILE + 10;
    c.x = Math.max(-limit, Math.min(limit, c.x)); c.z = Math.max(-limit, Math.min(limit, c.z));
    c.dist = Math.max(14, Math.min(120, c.dist));
    const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    this.camera.position.set(c.x + Math.sin(c.yaw) * cp * c.dist, sp * c.dist, c.z + Math.cos(c.yaw) * cp * c.dist);
    this.camera.lookAt(c.x, 0, c.z);
    // shadow frustum follows the camera target
    const sc = this.sun.shadow.camera;
    const ext = Math.max(28, c.dist * 0.95);
    sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.updateProjectionMatrix();
    this.sun.target.position.set(c.x, 0, c.z);
  }

  pickTile(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const p = new THREE.Vector3();
    if (!ray.ray.intersectPlane(plane, p)) return null;
    const [tx, ty] = worldToTile(p.x, p.z);
    if (!inBounds(tx, ty)) return null;
    return [tx, ty];
  }

  setGhost(cells, ok, height = 1) {
    if (!cells) { this.ghost.visible = false; this.ghostRing.visible = false; return; }
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    for (const [x, y] of cells) { minx = Math.min(minx, x); miny = Math.min(miny, y); maxx = Math.max(maxx, x); maxy = Math.max(maxy, y); }
    const [ax, az] = tileToWorld(minx, miny), [bx, bz] = tileToWorld(maxx, maxy);
    this.ghost.visible = true;
    this.ghost.scale.set((maxx - minx + 1) * TILE - 0.4, height, (maxy - miny + 1) * TILE - 0.4);
    this.ghost.position.set((ax + bx) / 2, height / 2 + 0.05, (az + bz) / 2);
    this.ghost.material.color.set(ok ? 0x4fb37a : 0xb8342a);
    this.ghostRing.visible = false;
  }
  setGhostRadius(x, y, r, color = 0xd9a441) {
    const [wx, wz] = tileToWorld(x, y);
    this.ghostRing.visible = true;
    this.ghostRing.position.set(wx, 0.12, wz);
    this.ghostRing.scale.set(r * TILE, r * TILE, 1);
    this.ghostRing.material.color.set(color);
  }

  // ------------------------------------------------------------ sync from state
  isNight() { const t = this.state.time; return t < 0.26 || t > 0.74; }

  sync(force = false) {
    const s = this.state;
    const night = this.isNight();
    if (!force && s.version === this.lastVersion && night === this.lastNight) return;
    this.lastVersion = s.version; this.lastNight = night;
    // roads and channels: rebuild wholesale (cheap)
    if (this.roads) this.dyn.remove(this.roads);
    this.roads = makeRoads(s); this.dyn.add(this.roads);
    this.rebuildChannels();
    this.refreshTufts();
    // tiles: trees, bloom
    const seen = new Set();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = s.tiles[idx(x, y)], i = idx(x, y);
      let key = null;
      if (t.tree === 1) key = 'pine' + t.treeSeed.toFixed(3);
      else if (t.tree === 2) key = 'ink' + t.treeSeed.toFixed(3);
      else if (t.bloom) key = 'bloom' + t.bloom;
      else if (t.road && !t.channel && t.fert > 0.93 && !t.building) key = 'post';
      else if (!t.road && !t.building && t.terrain === 'grass' && t.fert > 0.62 && nearBuilt(s, x, y)) key = 'clump' + Math.floor(t.fert * 100);
      if (!key) continue;
      seen.add(i);
      const cur = this.tileObjs.get(i);
      if (cur && cur.key === key) continue;
      if (cur) this.dyn.remove(cur.obj);
      const [wx, wz] = tileToWorld(x, y);
      let obj;
      if (t.tree === 1) obj = candlePine(t.treeSeed);
      else if (t.tree === 2) obj = inkwood(t.treeSeed);
      else if (t.bloom) obj = bloom(t.bloom, t.fert);
      else if (key.startsWith('clump')) obj = clump(t.fert, t.treeSeed);
      else { obj = milePost(t.fert); obj.position.set(1.3, 0, -1.3); const g = new THREE.Group(); g.add(obj); obj = g; }
      obj.position.x += wx; obj.position.z += wz;
      if (t.tree) { obj.position.x += (t.fert - 0.5) * 1.2; obj.position.z += (t.treeSeed - 0.5) * 1.2; obj.rotation.y = t.treeSeed * 6.28; }
      this.dyn.add(obj);
      this.tileObjs.set(i, { key, obj });
    }
    for (const [i, cur] of this.tileObjs) if (!seen.has(i)) { this.dyn.remove(cur.obj); this.tileObjs.delete(i); }
    // buildings
    const seenB = new Set();
    for (const b of s.buildings.values()) {
      seenB.add(b.id);
      const def = BUILDINGS[b.type];
      const occupied = (b.residents.length + b.workers.length) > 0 || (!def.housing && !def.jobs);
      const lit = night && occupied;
      const key = [b.type, lit ? 1 : 0, b.supplied ? 1 : 0, b.warped ? 1 : 0, b.onLey ? 1 : 0].join('|');
      const cur = this.buildingObjs.get(b.id);
      if (cur && cur.key === key) continue;
      if (cur) this.dyn.remove(cur.obj);
      const obj = BUILDERS[b.type]({ seed: b.seed, lit, supplied: b.supplied, warped: b.warped, onLey: b.onLey });
      const cells = buildingCells(s, b);
      if (!def.onChannel) obj.add(apron(def.size[0] * TILE - 0.3, def.size[1] * TILE - 0.3, b.seed));
      const [ax, az] = tileToWorld(b.x, b.y), [bx, bz] = tileToWorld(b.x + def.size[0] - 1, b.y + def.size[1] - 1);
      const cx = (ax + bx) / 2, cz = (az + bz) / 2;
      obj.position.set(cx, 0, cz);
      // face the door tile
      const d = doorTile(s, b);
      if (d && !def.onChannel) {
        const [dx, dz] = tileToWorld(d[0], d[1]);
        const vx = dx - cx, vz = dz - cz;
        if (Math.abs(vz) >= Math.abs(vx)) obj.rotation.y = vz > 0 ? 0 : Math.PI;
        else obj.rotation.y = vx > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else if (!def.onChannel) obj.rotation.y = Math.floor(b.seed * 4) * Math.PI / 2;
      if (b.warped) {
        // bloom creeping up the walls: a few violet caps at the base
        const bl = bloom(1, b.seed); bl.scale.set(0.6, 0.6, 0.6); bl.position.set(1.2, 0, -1.2); obj.add(bl);
      }
      this.dyn.add(obj);
      this.buildingObjs.set(b.id, { key, obj });
    }
    for (const [id, cur] of this.buildingObjs) if (!seenB.has(id)) { this.dyn.remove(cur.obj); this.buildingObjs.delete(id); }
    // lamp point lights
    for (const l of this.lampLights) this.scene.remove(l);
    this.lampLights = [];
    if (night) {
      let n = 0;
      for (const b of s.buildings.values()) {
        if (b.type !== 'lamp' || !b.supplied) continue;
        if (n++ > 40) break;
        const [wx, wz] = tileToWorld(b.x, b.y);
        const l = new THREE.PointLight(0xffc36a, 14, 16, 1.6);
        l.position.set(wx + 0.4, 3.0, wz + 1.2);
        this.scene.add(l); this.lampLights.push(l);
      }
    }
  }

  makeTufts() {
    // low pale tufts: a squat cone with a lighter tip, one draw call for the whole meadow
    const g = new THREE.SphereGeometry(0.2, 6, 4); g.scale(1, 0.55, 1); g.translate(0, 0.08, 0);
    const pos = g.getAttribute('position'); const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { const f = 0.8 + 0.3 * Math.max(0, pos.getY(i) / 0.2); col[i * 3] = f; col[i * 3 + 1] = f; col[i * 3 + 2] = f * 0.9; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.MeshLambertMaterial({ color: 0xc2c98a, vertexColors: true });
    const mesh = new THREE.InstancedMesh(g, m, 2600);
    mesh.receiveShadow = true; mesh.castShadow = false; mesh.frustumCulled = false;
    return mesh;
  }
  refreshTufts() {
    const s = this.state, mesh = this.tufts;
    const rnd = mulberry32(99); const mat = new THREE.Matrix4(); const q = new THREE.Quaternion(); const e = new THREE.Euler();
    const col = new THREE.Color();
    let n = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = s.tiles[idx(x, y)];
      const [wx, wz] = tileToWorld(x, y);
      for (let k = 0; k < 2; k++) {
        const ox = (rnd() - 0.5) * 3.6, oz = (rnd() - 0.5) * 3.6, ry = rnd() * 6.28, sc = 0.6 + rnd() * 0.8;
        if (t.road || t.building || t.terrain !== 'grass' || t.bloom || t.tree || rnd() < 0.35) continue;
        if (n >= mesh.count) break;
        mat.compose(new THREE.Vector3(wx + ox, 0, wz + oz), q.setFromEuler(e.set(0, ry, 0)), new THREE.Vector3(sc, sc * (0.8 + t.fert * 0.5), sc));
        mesh.setMatrixAt(n, mat);
        col.setHSL(0.17 - t.fert * 0.04, 0.34, 0.6 + rnd() * 0.15); mesh.setColorAt(n, col);
        n++;
      }
    }
    for (let i = n; i < mesh.count; i++) { mat.makeScale(0, 0, 0); mesh.setMatrixAt(i, mat); }
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  rebuildChannels() {
    if (this.channels) this.dyn.remove(this.channels);
    this.channels = makeChannels(this.state, this.leyMat); this.dyn.add(this.channels);
  }

  syncPeople() {
    const s = this.state;
    const seen = new Set();
    for (const p of s.people) {
      seen.add(p.id);
      let o = this.peopleObjs.get(p.id);
      if (!o) { o = personMesh(p.rank, p.seed); this.peopleGroup.add(o); this.peopleObjs.set(p.id, o); }
      o.visible = p.visible;
      if (!p.visible) continue;
      const [wx, wz] = tileToWorld(p.x, p.y);
      o.position.set(wx, 0, wz);
      if (p.heading !== undefined) o.rotation.y = p.heading;
      // little bob while walking
      o.position.y = p.path ? Math.abs(Math.sin(this.clock * 9 + p.id)) * 0.06 : 0;
    }
    for (const [id, o] of this.peopleObjs) if (!seen.has(id)) { this.peopleGroup.remove(o); this.peopleObjs.delete(id); }
  }

  // ------------------------------------------------------------ light and time
  updateLighting() {
    const t = this.state.time;
    // sun elevation: rises 0.22, peaks 0.5, sets 0.8
    const ang = (t - 0.22) / 0.58 * Math.PI;
    const dayRaw = Math.max(0, Math.sin(ang));
    const dayF = Math.pow(dayRaw, 0.55);   // broad daylight; a long golden dusk
    const el = Math.max(0.05, Math.sin(ang)) * 1.1 + 0.15;
    const az = -0.9 + (t - 0.5) * 1.8;
    this.sun.position.set(Math.cos(az) * 70, el * 130, Math.sin(az) * 70).add(this.sun.target.position);
    const warm = new THREE.Color(1.0, 0.96, 0.9), gold = new THREE.Color(1.0, 0.72, 0.45);
    const lowSun = 1 - Math.min(1, dayRaw * 1.6);
    this.sun.color.copy(warm).lerp(gold, lowSun);
    this.sun.intensity = 2.6 * dayF + 0.0;
    const night = 1 - Math.min(1, dayF * 1.6);
    const skyDay = new THREE.Color(0xe9e4d3), skyNight = new THREE.Color(0x1f2440), skyDusk = new THREE.Color(0xe7c7a0);
    const sky = skyDay.clone().lerp(skyDusk, lowSun * (1 - night)).lerp(skyNight, night);
    const zenith = new THREE.Color(0xc9d6de).lerp(new THREE.Color(0xd8b48c), lowSun * (1 - night)).lerp(new THREE.Color(0x141a30), night);
    this.scene.background.copy(sky); this.scene.fog.color.copy(sky);
    this.ink.mat.uniforms.skyBot.value.copy(sky); this.ink.mat.uniforms.skyTop.value.copy(zenith);
    this.hemi.color.copy(sky).lerp(new THREE.Color(0xffffff), 0.2);
    this.hemi.groundColor.set(0xc9b48c).lerp(new THREE.Color(0x151a30), night);
    this.hemi.intensity = 0.95 - night * 0.55;
    this.moon.intensity = night * 0.5;
    this.moon.position.set(-40, 60, 30);
    setGlow(Math.min(1, night * 1.4 + lowSun * 0.3));
    this.leyMat.uniforms.glow.value = night * 0.5;
    this.ink.mat.uniforms.night.value = night;
    this.ink.mat.uniforms.ink.value.set(0x1b1e33).lerp(new THREE.Color(0x0a0c18), night);
    this.ink.mat.uniforms.strength.value = 0.85 - night * 0.3;
  }

  render(dt) {
    this.clock += dt;
    this.leyMat.uniforms.time.value = this.clock;
    this.updateCamera();
    this.updateLighting();
    this.sync();
    this.syncPeople();
    this.ink.render();
  }
}
