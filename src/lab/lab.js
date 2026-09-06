// Style lab: the same vignette authored in several unrelated visual languages.
//   /lab.html?style=paper | gouache | glass | clay | etching
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { STYLES } from './styles/index.js';

const params = new URLSearchParams(location.search);
const styleKey = params.get('style') || 'paper';
const style = STYLES[styleKey];

// ---- tiny accumulator: geometry + material instance -> merged meshes
export class LabKit {
  constructor() { this.parts = new Map(); this.extras = []; }
  add(geometry, material, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, tint, order = 'XYZ' } = {}) {
    const g0 = geometry.clone();
    g0.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, order)), new THREE.Vector3(sx, sy, sz)));
    const g = g0.index ? g0.toNonIndexed() : g0;
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
    if (!g.getAttribute('color')) {
      const n = g.getAttribute('position').count, col = new Float32Array(n * 3), c = new THREE.Color(tint ?? 0xffffff);
      for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    if (!this.parts.has(material)) this.parts.set(material, []);
    this.parts.get(material).push(g);
    return this;
  }
  build({ shadows = true } = {}) {
    const group = new THREE.Group();
    for (const [mat, geoms] of this.parts) {
      const m = new THREE.Mesh(mergeGeometries(geoms, false), mat);
      m.castShadow = shadows; m.receiveShadow = shadows; group.add(m);
    }
    for (const e of this.extras) group.add(e);
    return group;
  }
}

// ---- shared vignette layout
export const LAYOUT = {
  houseA: { x: -3.2, z: -1.6, ry: 0 },
  houseB: { x: 2.6, z: -1.6, ry: 0 },
  tree: { x: 6.6, z: -2.2 },
  lamp: { x: -0.2, z: 0.9 },
  person: { x: -1.2, z: 2.8 },
  prop: { x: 5.2, z: 0.6 },
  street: { z: 2.6, w: 3.0, len: 18 },
};

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 1, 200);
const cam = { yaw: 0.55, pitch: 0.48, dist: 24, x: 1.4, z: 0.2, ...(style.camera || {}) };
function placeCamera() {
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  camera.position.set(cam.x + Math.sin(cam.yaw) * cp * cam.dist, sp * cam.dist, cam.z + Math.cos(cam.yaw) * cp * cam.dist);
  camera.lookAt(cam.x, 1.2, cam.z);
}
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); style.resize && style.resize(renderer); }
addEventListener('resize', resize);

const world = style.build(new THREE.Group(), LAYOUT, LabKit);
scene.add(world);
style.lights(scene, renderer);
if (style.background !== undefined) scene.background = new THREE.Color(style.background);
if (style.post) style.post.init(renderer, scene, camera);
resize();

document.getElementById('hud').innerHTML = Object.keys(STYLES).map(k => `<a href="?style=${k}" style="${k === styleKey ? 'font-weight:bold' : ''}">${STYLES[k].name}</a>`).join('');

let last = performance.now(), clock = 0;
let drag = null;
canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; });
addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointermove', e => { if (!drag) return; cam.yaw -= (e.clientX - drag.x) * 0.006; cam.pitch = Math.max(0.15, Math.min(1.4, cam.pitch + (e.clientY - drag.y) * 0.004)); drag = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('wheel', e => { cam.dist *= Math.exp(e.deltaY * 0.001); });
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now; clock += dt;
  placeCamera();
  style.update && style.update(clock, dt);
  if (style.post) style.post.render(renderer, scene, camera); else renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__lab = { cam, style: styleKey, setCamera: (o) => Object.assign(cam, o) };
