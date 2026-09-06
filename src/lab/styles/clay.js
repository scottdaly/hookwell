import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clayMaps, dent } from '../tex.js';

// CLAY STOP-MOTION. Everything is modelled in soft matte clay: big radii, sausage chimneys,
// thumb-pressed windows, fingerprints in a normal map, dents that never quite line up.
// Lit like a table-top set: a large soft key, a cool fill, a warm rim, a paper backdrop.

let maps;
const M = {};
function clayMat(key, color, extra = {}) {
  if (!M[key]) M[key] = new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, map: maps.map, normalMap: maps.normalMap, normalScale: new THREE.Vector2(0.55, 0.55), vertexColors: true, ...extra });
  return M[key];
}
const C = { terra: 0xc9755a, sage: 0x9cad86, butter: 0xe8cf7e, cream: 0xf0e4cc, slate: 0x6b7490, brown: 0x8a6650, blue: 0x7fa6c9, red: 0xb64a3e, grey: 0xb5aa98, green: 0x6f9a60, dark: 0x4a4a55, skin: 0xe9c3a5, water: 0x5fb0c4 };

function softRoof(w, h) {
  // a squat four-sided lathe with a rounded apex: clay pinched to a point then smoothed
  const pts = [];
  for (let i = 0; i <= 10; i++) { const f = i / 10; const r = (1 - Math.pow(f, 1.35)) * w * 0.74; pts.push(new THREE.Vector2(r + 0.001, f * h)); }
  return dent(new THREE.LatheGeometry(pts, 4).rotateY(Math.PI / 4), 0.035, 1.3);
}
function house(kit, L, kind) {
  const tall = kind === 'A';
  const w = tall ? 2.9 : 4.0, d = tall ? 2.7 : 3.1, h = tall ? 4.0 : 2.8;
  const wall = tall ? clayMat('wallA', C.cream) : clayMat('wallB', C.butter);
  const roof = tall ? clayMat('roofA', C.slate) : clayMat('roofB', C.terra);
  kit.add(dent(new RoundedBoxGeometry(w + 0.35, 1.3, d + 0.35, 4, 0.35), 0.03), clayMat('stone', C.grey), { x: L.x, y: 0.6, z: L.z });
  kit.add(dent(new RoundedBoxGeometry(w, h - 1.0, d, 4, 0.32), 0.035), wall, { x: L.x, y: 1.1 + (h - 1.0) / 2, z: L.z });
  kit.add(dent(new RoundedBoxGeometry(w + 0.8, 0.34, d + 0.8, 3, 0.16), 0.02), clayMat('eave', C.brown), { x: L.x, y: h + 0.1, z: L.z });
  kit.add(softRoof(Math.max(w, d) + 0.8, tall ? 2.5 : 1.8), roof, { x: L.x, y: h + 0.2, z: L.z, sz: (d + 0.8) / (Math.max(w, d) + 0.8) });
  // sausage chimney with a thumb-pressed cap
  kit.add(dent(new THREE.CapsuleGeometry(0.32, 1.3, 6, 12), 0.03), clayMat('stone', C.grey), { x: L.x + w * 0.28, y: h + 1.2, z: L.z - d * 0.25 });
  kit.add(new THREE.SphereGeometry(0.42, 12, 8), clayMat('cap', C.red), { x: L.x + w * 0.28, y: h + 1.95, z: L.z - d * 0.25, sy: 0.45 });
  // hook finial: a rolled clay coil
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(0.05, 0.8, 0), new THREE.Vector3(0.3, 0.95, 0), new THREE.Vector3(0.5, 0.75, 0)]);
  kit.add(new THREE.TubeGeometry(curve, 16, 0.08, 8, false), clayMat('brass', 0xc9a24a, { roughness: 0.6, metalness: 0.25 }), { x: L.x, y: h + (tall ? 2.5 : 1.8) + 0.1, z: L.z });
  // windows pressed into the wall; frames rolled from cream clay
  const win = (x, y, w2 = 0.6, h2 = 0.8, lit = false) => {
    kit.add(dent(new RoundedBoxGeometry(w2 + 0.3, h2 + 0.3, 0.22, 3, 0.12), 0.015), clayMat('frame', C.cream), { x, y, z: L.z + d / 2 + 0.02 });
    kit.add(new RoundedBoxGeometry(w2, h2, 0.1, 2, 0.06), lit ? clayMat('lit', 0xf3d98a, { emissive: 0xc9962a, emissiveIntensity: 0.35 }) : clayMat('pane', C.blue, { roughness: 0.4 }), { x, y, z: L.z + d / 2 + 0.14 });
    kit.add(new THREE.CapsuleGeometry(0.035, h2 - 0.1, 3, 6), clayMat('dark', C.dark), { x, y, z: L.z + d / 2 + 0.2 });
    kit.add(new THREE.CapsuleGeometry(0.035, w2 - 0.1, 3, 6), clayMat('dark', C.dark), { x, y: y + h2 * 0.1, z: L.z + d / 2 + 0.2, rz: Math.PI / 2 });
    // shutters: two flattened sausages
    if (!lit) for (const s of [-1, 1]) kit.add(dent(new RoundedBoxGeometry(0.28, h2 + 0.1, 0.1, 2, 0.05), 0.01), clayMat('shutter', C.blue), { x: x + s * (w2 / 2 + 0.32), y, z: L.z + d / 2 + 0.08 });
  };
  const door = (x) => {
    kit.add(new THREE.CapsuleGeometry(0.46, 0.9, 6, 12), clayMat('frame', C.cream), { x, y: 0.9, z: L.z + d / 2 + 0.02, sz: 0.3 });
    kit.add(new THREE.CapsuleGeometry(0.36, 0.85, 6, 12), clayMat('door', C.brown), { x, y: 0.85, z: L.z + d / 2 + 0.14, sz: 0.3 });
    kit.add(new THREE.SphereGeometry(0.07, 10, 8), clayMat('brass', 0xc9a24a, { roughness: 0.6, metalness: 0.25 }), { x: x + 0.2, y: 0.9, z: L.z + d / 2 + 0.5 });
    kit.add(dent(new RoundedBoxGeometry(1.4, 0.32, 0.8, 3, 0.14), 0.02), clayMat('stone', C.grey), { x, y: 0.16, z: L.z + d / 2 + 0.45 });
    kit.add(new THREE.SphereGeometry(0.2, 12, 8), clayMat('wax', C.red), { x: x + 0.75, y: 1.05, z: L.z + d / 2 + 0.1, sz: 0.35 });
  };
  if (tall) { door(L.x - 0.6); win(L.x - 0.8, 2.3); win(L.x + 0.8, 2.3); win(L.x, 2.6, 0.34, 0.42, true); win(L.x, 3.5, 0.55, 0.6, true); }
  else {
    door(L.x - 1.3); win(L.x + 0.8, 1.0, 1.6, 1.0, true); win(L.x - 1.1, 2.15, 0.5, 0.6); win(L.x + 0.8, 2.2, 0.5, 0.6);
    kit.add(dent(new RoundedBoxGeometry(1.9, 0.14, 0.45, 2, 0.06), 0.01), clayMat('eave', C.brown), { x: L.x + 0.8, y: 0.42, z: L.z + d / 2 + 0.32 });
    for (let i = 0; i < 4; i++) kit.add(new THREE.SphereGeometry(0.17, 10, 8), clayMat('bread', 0xd39a5c), { x: L.x + 0.2 + i * 0.4, y: 0.6, z: L.z + d / 2 + 0.32, sy: 0.7 });
    // an awning: a slab of clay on two coils
    kit.add(dent(new RoundedBoxGeometry(2.2, 0.16, 1.0, 3, 0.07), 0.02), clayMat('awning', C.red), { x: L.x + 0.8, y: 1.9, z: L.z + d / 2 + 0.5, rx: 0.25 });
    for (const dx of [-0.9, 0.9]) kit.add(new THREE.CapsuleGeometry(0.06, 1.7, 3, 8), clayMat('dark', C.dark), { x: L.x + 0.8 + dx, y: 0.95, z: L.z + d / 2 + 0.9 });
  }
}
function tree(kit, L) {
  kit.add(dent(new THREE.CapsuleGeometry(0.32, 2.2, 6, 12), 0.05), clayMat('bark', C.brown), { x: L.x, y: 1.4, z: L.z });
  const blobs = [[0, 3.5, 0, 1.5], [0.9, 2.9, 0.4, 1.0], [-0.9, 3.0, -0.3, 1.1], [0.3, 4.3, -0.6, 1.0], [-0.4, 2.8, 0.9, 0.9]];
  blobs.forEach(([x, y, z, r], i) => kit.add(dent(new THREE.SphereGeometry(r, 14, 12), 0.08, 2.2), i % 2 ? clayMat('leaf', C.green) : clayMat('leaf2', C.sage), { x: L.x + x, y, z: L.z + z }));
  // a red clay bird
  kit.add(new THREE.SphereGeometry(0.16, 10, 8), clayMat('wax', C.red), { x: L.x + 0.9, y: 4.5, z: L.z + 0.3, sz: 1.4 });
}
function lamp(kit, L) {
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(L.x, 0, L.z), new THREE.Vector3(L.x, 2.6, L.z), new THREE.Vector3(L.x - 0.05, 3.3, L.z), new THREE.Vector3(L.x - 0.5, 3.6, L.z), new THREE.Vector3(L.x - 0.95, 3.35, L.z)]);
  kit.add(dent(new THREE.TubeGeometry(curve, 30, 0.1, 10, false), 0.015), clayMat('dark', C.dark), {});
  kit.add(new RoundedBoxGeometry(0.44, 0.58, 0.44, 3, 0.12), clayMat('lit', 0xf3d98a, { emissive: 0xc9962a, emissiveIntensity: 0.35 }), { x: L.x - 0.95, y: 2.85, z: L.z });
  kit.add(new RoundedBoxGeometry(0.54, 0.1, 0.54, 2, 0.04), clayMat('brass', 0xc9a24a, { roughness: 0.6, metalness: 0.25 }), { x: L.x - 0.95, y: 3.18, z: L.z });
  kit.add(new THREE.SphereGeometry(0.45, 12, 8), clayMat('stone', C.grey), { x: L.x, y: 0.05, z: L.z, sy: 0.45 });
}
function person(kit, L) {
  kit.add(dent(new THREE.CapsuleGeometry(0.36, 0.7, 6, 12), 0.02), clayMat('robe', 0x5a6f9c), { x: L.x, y: 0.7, z: L.z });
  kit.add(new THREE.SphereGeometry(0.32, 14, 12), clayMat('skin', C.skin), { x: L.x, y: 1.42, z: L.z });
  kit.add(new THREE.SphereGeometry(0.05, 6, 6), clayMat('dark', C.dark), { x: L.x - 0.1, y: 1.48, z: L.z + 0.28 });
  kit.add(new THREE.SphereGeometry(0.05, 6, 6), clayMat('dark', C.dark), { x: L.x + 0.1, y: 1.48, z: L.z + 0.28 });
  kit.add(new THREE.SphereGeometry(0.44, 12, 8), clayMat('hat', 0xc98b3a), { x: L.x, y: 1.66, z: L.z, sy: 0.18 });
  const tip = new THREE.CatmullRomCurve3([new THREE.Vector3(L.x, 2.2, L.z), new THREE.Vector3(L.x, 2.5, L.z), new THREE.Vector3(L.x - 0.12, 2.72, L.z), new THREE.Vector3(L.x - 0.38, 2.7, L.z)]);
  kit.add(new THREE.ConeGeometry(0.4, 0.75, 12), clayMat('hat', 0xc98b3a), { x: L.x, y: 2.0, z: L.z });
  kit.add(new THREE.TubeGeometry(tip, 12, 0.11, 8, false), clayMat('hat', 0xc98b3a), {});
  kit.add(new THREE.SphereGeometry(0.16, 8, 6), clayMat('wax', C.red), { x: L.x + 0.32, y: 0.8, z: L.z + 0.2 });
}
function ground(kit, L) {
  const g = new THREE.PlaneGeometry(26, 20, 52, 40).rotateX(-Math.PI / 2);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, 0.14 * Math.sin(x * 0.7 + 1) * Math.cos(z * 0.6) + 0.05 * Math.sin(x * 2.1) * Math.sin(z * 1.7) - 0.05); }
  g.computeVertexNormals();
  const uv = g.getAttribute('uv'); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 6, uv.getY(i) * 5);
  kit.add(g, clayMat('grass', C.sage), { x: 1.4, y: 0, z: 0.4 });
  kit.add(dent(new RoundedBoxGeometry(L.street.len, 0.3, L.street.w, 4, 0.14), 0.02), clayMat('cobble', C.grey), { x: 1.4, y: 0.14, z: L.street.z + L.street.w / 2 });
  kit.add(new RoundedBoxGeometry(L.street.len, 0.14, 0.7, 2, 0.06), clayMat('trench', 0x6d6355), { x: 1.4, y: 0.3, z: L.street.z + 0.35 });
  kit.add(new RoundedBoxGeometry(L.street.len, 0.1, 0.5, 2, 0.05), clayMat('water', C.water, { roughness: 0.3 }), { x: 1.4, y: 0.34, z: L.street.z + 0.35 });
  // pressed cobbles along the edge and clay bushes
  for (let i = 0; i < 24; i++) kit.add(new THREE.SphereGeometry(0.18 + (i % 3) * 0.04, 8, 6), clayMat('cobble2', 0xa89c8a), { x: -7 + i * 0.75, y: 0.3, z: L.street.z + L.street.w - 0.2 + (i % 2) * 0.15, sy: 0.45 });
  for (let i = 0; i < 5; i++) kit.add(dent(new THREE.SphereGeometry(0.4 + (i % 3) * 0.1, 12, 10), 0.06, 2.5), clayMat('bush', C.green), { x: -6 + i * 3.1, y: 0.25, z: L.street.z + L.street.w + 0.7, sy: 0.7 });
}
export const clay = {
  name: 'Clay',
  background: 0xd9cfbf,
  camera: { pitch: 0.42, dist: 23 },
  build(group, L, Kit) {
    maps = clayMaps();
    const kit = new Kit();
    ground(kit, L); house(kit, L.houseA, 'A'); house(kit, L.houseB, 'B'); tree(kit, L.tree); lamp(kit, L.lamp); person(kit, L.person);
    kit.add(dent(new THREE.CapsuleGeometry(0.34, 0.5, 6, 12), 0.02), clayMat('barrel', C.brown), { x: L.prop.x, y: 0.42, z: L.prop.z });
    kit.add(new THREE.TorusGeometry(0.36, 0.04, 6, 14), clayMat('brass', 0xc9a24a, { roughness: 0.6, metalness: 0.25 }), { x: L.prop.x, y: 0.5, z: L.prop.z, rx: Math.PI / 2 });
    group.add(kit.build());
    return group;
  },
  lights(scene, renderer) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    const key = new THREE.DirectionalLight(0xfff1de, 2.6); key.position.set(-7, 12, 9); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -14; key.shadow.camera.right = 14; key.shadow.camera.top = 14; key.shadow.camera.bottom = -14; key.shadow.radius = 9; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.04;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xbcd0f0, 0.9); fill.position.set(9, 6, 4); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffd9a8, 1.1); rim.position.set(4, 8, -10); scene.add(rim);
    scene.add(new THREE.HemisphereLight(0xe0e6ee, 0xb59a7a, 0.7));
  },
};
