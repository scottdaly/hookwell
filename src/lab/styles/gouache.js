import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { brushTex, toonRamp, dent } from '../tex.js';

// GOUACHE STORYBOOK. Chunky rounded forms, bulging roofs, fat chimneys, brush-stroke paint,
// three-step toon light with a cool shadow and no outlines at all. Ghibli-adjacent warmth.

let ramp;
const M = {};
function paint(key, h, s, l, extra = {}) {
  if (!M[key]) M[key] = new THREE.MeshToonMaterial({ map: brushTex({ h, s, l, seed: key.length * 7 + h, ...extra.tex }), gradientMap: ramp, vertexColors: true, ...extra.mat });
  return M[key];
}
// a curved four-sided roof: a lathe with 4 segments and a sagging profile
function bulgeRoof(w, h, sag = 0.18) {
  const pts = [];
  const N = 8;
  for (let i = 0; i <= N; i++) { const f = i / N; const r = (1 - f) * w * 0.72 * (1 + sag * Math.sin(f * Math.PI) * 0.8); pts.push(new THREE.Vector2(r + (i === N ? 0.02 : 0), f * h + sag * 0.5 * (1 - Math.cos(f * Math.PI)) * 0)); }
  const g = new THREE.LatheGeometry(pts, 4).rotateY(Math.PI / 4);
  g.computeVertexNormals();
  return g;
}
function house(kit, L, kind) {
  const tall = kind === 'A';
  const w = tall ? 2.9 : 4.0, d = tall ? 2.7 : 3.1, h = tall ? 4.2 : 2.9;
  const wall = tall ? paint('wallA', 40, 45, 84) : paint('wallB', 52, 42, 80);
  const stone = paint('stone', 32, 18, 62, { tex: { drift: 10 } });
  const roofM = tall ? paint('roofA', 12, 55, 48) : paint('roofB', 200, 28, 42);
  const timber = paint('timber', 24, 36, 32);
  // body: a rounded, slightly pinched box on a fat stone base
  kit.add(dent(new RoundedBoxGeometry(w + 0.3, 1.3, d + 0.3, 3, 0.22), 0.02), stone, { x: L.x, y: 0.65, z: L.z });
  const body = new RoundedBoxGeometry(w, h - 1.2, d, 3, 0.2); dent(body, 0.03);
  kit.add(body, wall, { x: L.x, y: 1.2 + (h - 1.2) / 2, z: L.z, sx: 1, sy: 1, sz: 1 });
  // eaves: a fat rounded band, then the bulging roof
  kit.add(new RoundedBoxGeometry(w + 0.9, 0.3, d + 0.9, 2, 0.12), timber, { x: L.x, y: h + 0.05, z: L.z });
  const roof = bulgeRoof(Math.max(w, d) + 0.9, tall ? 2.6 : 1.9);
  kit.add(roof, roofM, { x: L.x, y: h + 0.15, z: L.z, sz: (d + 0.9) / (Math.max(w, d) + 0.9) });
  // chunky chimney with a rounded cap
  kit.add(new RoundedBoxGeometry(0.7, 1.6, 0.6, 2, 0.15), stone, { x: L.x + w * 0.28, y: h + 1.2, z: L.z - d * 0.25 });
  kit.add(new RoundedBoxGeometry(0.9, 0.22, 0.8, 2, 0.1), paint('cap', 40, 30, 88), { x: L.x + w * 0.28, y: h + 2.05, z: L.z - d * 0.25 });
  // a brass hook finial, rounded
  const hook = new THREE.TorusGeometry(0.28, 0.07, 8, 16, Math.PI * 1.3);
  kit.add(hook, paint('brass', 42, 60, 55), { x: L.x, y: h + (tall ? 2.6 : 1.9) + 0.45, z: L.z });
  kit.add(new THREE.CylinderGeometry(0.06, 0.08, 0.6, 8), paint('brass', 42, 60, 55), { x: L.x, y: h + (tall ? 2.6 : 1.9) + 0.35, z: L.z });
  // windows: fat cream frames with sky-blue panes, slightly sunk
  const win = (x, y, w2 = 0.6, h2 = 0.8, lit = false) => {
    kit.add(new RoundedBoxGeometry(w2 + 0.24, h2 + 0.24, 0.14, 2, 0.08), paint('cream', 40, 30, 92), { x, y, z: L.z + d / 2 + 0.02 });
    kit.add(new RoundedBoxGeometry(w2, h2, 0.1, 2, 0.05), lit ? paint('lit', 45, 80, 78) : paint('pane', 205, 45, 72), { x, y, z: L.z + d / 2 + 0.09 });
    kit.add(new THREE.BoxGeometry(0.06, h2, 0.04), timber, { x, y, z: L.z + d / 2 + 0.15 });
    kit.add(new THREE.BoxGeometry(w2, 0.06, 0.04), timber, { x, y: y + h2 * 0.1, z: L.z + d / 2 + 0.15 });
  };
  const door = (x) => {
    kit.add(new THREE.CapsuleGeometry(0.42, 0.9, 4, 10), paint('doorFrame', 40, 30, 92), { x, y: 0.9, z: L.z + d / 2 + 0.02, sz: 0.25 });
    kit.add(new THREE.CapsuleGeometry(0.34, 0.85, 4, 10), timber, { x, y: 0.85, z: L.z + d / 2 + 0.1, sz: 0.25 });
    kit.add(new THREE.SphereGeometry(0.06, 8, 6), paint('brass', 42, 60, 55), { x: x + 0.2, y: 0.9, z: L.z + d / 2 + 0.45 });
    // fat step
    kit.add(new RoundedBoxGeometry(1.3, 0.3, 0.7, 2, 0.12), stone, { x, y: 0.15, z: L.z + d / 2 + 0.4 });
  };
  if (tall) { door(L.x - 0.6); win(L.x - 0.75, 2.4); win(L.x + 0.75, 2.4); win(L.x, 2.7, 0.34, 0.42); win(L.x, 3.6, 0.55, 0.6, true); win(L.x + 0.7, 0.75, 0.45, 0.5); }
  else {
    door(L.x - 1.2); win(L.x + 0.8, 1.0, 1.6, 1.0, true); win(L.x - 1.1, 2.2, 0.5, 0.6); win(L.x + 0.8, 2.25, 0.5, 0.6);
    // bread on a shelf, a rounded sign on a hook
    kit.add(new RoundedBoxGeometry(1.8, 0.1, 0.4, 1, 0.04), timber, { x: L.x + 0.8, y: 0.45, z: L.z + d / 2 + 0.3 });
    for (let i = 0; i < 4; i++) kit.add(new THREE.SphereGeometry(0.16, 10, 8), paint('bread', 30, 55, 58), { x: L.x + 0.2 + i * 0.4, y: 0.62, z: L.z + d / 2 + 0.3, sy: 0.7 });
    kit.add(new THREE.TorusGeometry(0.16, 0.04, 6, 12, Math.PI), paint('brass', 42, 60, 55), { x: L.x - w / 2 - 0.2, y: 2.6, z: L.z + d / 2 + 0.3, rz: 0 });
    kit.add(new RoundedBoxGeometry(0.8, 0.55, 0.08, 2, 0.06), paint('sign', 48, 70, 70), { x: L.x - w / 2 - 0.2, y: 2.1, z: L.z + d / 2 + 0.3 });
  }
  // wax seal: a fat red disc
  kit.add(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 14), paint('wax', 6, 65, 45), { x: L.x + (tall ? 0.1 : -0.5), y: 1.05, z: L.z + d / 2 + 0.06, rx: Math.PI / 2 });
}
function tree(kit, L) {
  const leaf = paint('leaf', 95, 38, 42, { tex: { drift: 14 } });
  const leaf2 = paint('leaf2', 85, 40, 50, { tex: { drift: 14 } });
  kit.add(dent(new THREE.CapsuleGeometry(0.3, 2.2, 4, 10), 0.04), paint('bark', 24, 30, 30), { x: L.x, y: 1.4, z: L.z });
  const blobs = [[0, 3.6, 0, 1.5], [0.9, 3.0, 0.4, 1.0], [-0.9, 3.1, -0.3, 1.1], [0.3, 4.4, -0.6, 1.0], [-0.4, 2.9, 0.9, 0.9]];
  blobs.forEach(([x, y, z, r], i) => kit.add(dent(new THREE.SphereGeometry(r, 12, 10), 0.06, 2.5), i % 2 ? leaf : leaf2, { x: L.x + x, y, z: L.z + z }));
}
function lamp(kit, L) {
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(L.x, 0, L.z), new THREE.Vector3(L.x, 2.6, L.z), new THREE.Vector3(L.x - 0.05, 3.3, L.z), new THREE.Vector3(L.x - 0.5, 3.6, L.z), new THREE.Vector3(L.x - 0.95, 3.35, L.z)]);
  kit.add(new THREE.TubeGeometry(curve, 30, 0.09, 8, false), paint('iron', 230, 15, 22), {});
  kit.add(new RoundedBoxGeometry(0.42, 0.55, 0.42, 2, 0.1), paint('lit', 45, 80, 78), { x: L.x - 0.95, y: 2.85, z: L.z });
  kit.add(new RoundedBoxGeometry(0.5, 0.08, 0.5, 1, 0.03), paint('brass', 42, 60, 55), { x: L.x - 0.95, y: 3.15, z: L.z });
  kit.add(new RoundedBoxGeometry(0.5, 0.08, 0.5, 1, 0.03), paint('brass', 42, 60, 55), { x: L.x - 0.95, y: 2.55, z: L.z });
  kit.add(new THREE.CylinderGeometry(0.4, 0.45, 0.25, 12), paint('stone', 32, 18, 62), { x: L.x, y: 0.12, z: L.z });
}
function person(kit, L) {
  kit.add(new THREE.CapsuleGeometry(0.34, 0.75, 4, 10), paint('robe', 215, 35, 45), { x: L.x, y: 0.7, z: L.z });
  kit.add(new THREE.SphereGeometry(0.3, 12, 10), paint('skin', 28, 50, 78), { x: L.x, y: 1.4, z: L.z });
  kit.add(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 14), paint('hat', 30, 60, 48), { x: L.x, y: 1.62, z: L.z });
  const tip = new THREE.CatmullRomCurve3([new THREE.Vector3(L.x, 2.2, L.z), new THREE.Vector3(L.x, 2.5, L.z), new THREE.Vector3(L.x - 0.12, 2.72, L.z), new THREE.Vector3(L.x - 0.38, 2.7, L.z)]);
  kit.add(new THREE.ConeGeometry(0.4, 0.75, 12), paint('hat', 30, 60, 48), { x: L.x, y: 2.0, z: L.z });
  kit.add(new THREE.TubeGeometry(tip, 12, 0.11, 8, false), paint('hat', 30, 60, 48), {});
  kit.add(new THREE.SphereGeometry(0.16, 8, 6), paint('wax', 6, 65, 45), { x: L.x + 0.3, y: 0.8, z: L.z + 0.2 });
}
function ground(kit, L) {
  const g = new THREE.PlaneGeometry(26, 20, 40, 32).rotateX(-Math.PI / 2);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, 0.12 * Math.sin(x * 0.6) * Math.cos(z * 0.5) - 0.04); }
  g.computeVertexNormals();
  const uv = g.getAttribute('uv'); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 5, uv.getY(i) * 4);
  kit.add(g, paint('grass', 92, 36, 52, { tex: { drift: 12, strokes: 700 } }), { x: 1.4, y: 0, z: 0.4 });
  // street: a soft flat slab and a rounded channel
  kit.add(new RoundedBoxGeometry(L.street.len, 0.24, L.street.w, 2, 0.1), paint('cobble', 36, 18, 66, { tex: { drift: 10, len: 8, wid: 7, strokes: 900 } }), { x: 1.4, y: 0.12, z: L.street.z + L.street.w / 2 });
  kit.add(new RoundedBoxGeometry(L.street.len, 0.12, 0.7, 2, 0.05), paint('trench', 36, 14, 44), { x: 1.4, y: 0.26, z: L.street.z + 0.35 });
  kit.add(new RoundedBoxGeometry(L.street.len, 0.1, 0.5, 2, 0.05), paint('water', 192, 55, 62, { tex: { drift: 10, len: 30, wid: 5 } }), { x: 1.4, y: 0.29, z: L.street.z + 0.35 });
  // bushes by the road
  for (let i = 0; i < 5; i++) kit.add(dent(new THREE.SphereGeometry(0.35 + (i % 3) * 0.1, 10, 8), 0.05, 3), paint('bush', 100, 34, 40), { x: -6 + i * 3.1, y: 0.25, z: L.street.z + L.street.w + 0.6, sy: 0.75 });
}
export const gouache = {
  name: 'Gouache',
  background: 0xcfe0ee,
  build(group, L, Kit) {
    ramp = toonRamp([0.42, 0.7, 1.0]);
    const kit = new Kit();
    ground(kit, L); house(kit, L.houseA, 'A'); house(kit, L.houseB, 'B'); tree(kit, L.tree); lamp(kit, L.lamp); person(kit, L.person);
    kit.add(new THREE.CylinderGeometry(0.34, 0.3, 0.75, 12), paint('barrel', 26, 40, 40), { x: L.prop.x, y: 0.38, z: L.prop.z });
    kit.add(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 12), paint('brass', 42, 60, 55), { x: L.prop.x, y: 0.5, z: L.prop.z });
    group.add(kit.build());
    return group;
  },
  lights(scene) {
    const sun = new THREE.DirectionalLight(0xffe9c4, 2.4); sun.position.set(-9, 13, 8); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -14; sun.shadow.camera.right = 14; sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -14; sun.shadow.radius = 4; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05;
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0xa9c6e6, 0xd8c8a0, 1.3));
  },
};
