import * as THREE from 'three';
import { mulberry32 } from '../../game/state.js';

// STAINED GLASS. Every surface is a mosaic of flat faceted panes in jewel colours, held in
// dark lead. Light comes from within: panes glow faintly, windows blaze. Ground is a
// warm amber mosaic; the sky is a deep plum so the glass reads.

const rnd = mulberry32(11);
const paneMat = new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 70, specular: 0xffffff });
const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
const leadMat = new THREE.ShaderMaterial({
  uniforms: { thick: { value: 0.075 }, col: { value: new THREE.Color(0x1a141c) } },
  vertexShader: `uniform float thick; void main(){ vec3 p = position + normal * thick; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
  fragmentShader: `uniform vec3 col;
void main(){
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`,
  side: THREE.BackSide,
});
// colour each triangle as its own pane: base hue with jitter in hue, saturation and value
function panes(geometry, h, s, l, jitter = 0.05, lJitter = 0.12) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = g.getAttribute('position'); const col = new Float32Array(pos.count * 3); const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    c.setHSL((h + (rnd() - 0.5) * jitter + 1) % 1, Math.min(1, s * 1.15 + (rnd() - 0.5) * 0.15), Math.min(0.85, Math.max(0.12, l * 0.95 + (rnd() - 0.5) * lJitter)));
    for (let j = 0; j < 3; j++) { col[(i + j) * 3] = c.r; col[(i + j) * 3 + 1] = c.g; col[(i + j) * 3 + 2] = c.b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
// facet a geometry: jitter vertices a little so every panel catches light differently
function facet(g, amt = 0.05) {
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) + (rnd() - 0.5) * amt, pos.getY(i) + (rnd() - 0.5) * amt, pos.getZ(i) + (rnd() - 0.5) * amt);
  g.computeVertexNormals();
  return g;
}
const HUES = { ruby: 0.985, amber: 0.09, emerald: 0.38, sapphire: 0.62, violet: 0.78, cream: 0.12, teal: 0.5 };

function house(kit, L, kind) {
  const tall = kind === 'A';
  const w = tall ? 2.8 : 3.9, d = tall ? 2.6 : 3.0, h = tall ? 4.3 : 3.0;
  const wallHue = tall ? HUES.amber : HUES.emerald;
  // walls: a box subdivided into many panes
  const body = panes(facet(new THREE.BoxGeometry(w, h, d, 5, 8, 5), 0.04), wallHue, tall ? 0.7 : 0.45, tall ? 0.55 : 0.42, 0.03, 0.18);
  kit.add(body, paneMat, { x: L.x, y: h / 2, z: L.z });
  kit.add(body, leadMat, { x: L.x, y: h / 2, z: L.z });
  // base band in dark sapphire stone
  const base = panes(facet(new THREE.BoxGeometry(w + 0.25, 1.1, d + 0.25, 6, 2, 6), 0.03), HUES.sapphire, 0.5, 0.3, 0.03, 0.12);
  kit.add(base, paneMat, { x: L.x, y: 0.55, z: L.z }); kit.add(base, leadMat, { x: L.x, y: 0.55, z: L.z });
  // roof: a faceted cone in ruby (home) or sapphire (shop)
  const roof = panes(facet(new THREE.ConeGeometry(Math.max(w, d) * 0.78, tall ? 2.8 : 2.0, 8, 4), 0.06), tall ? HUES.ruby : HUES.sapphire, 0.75, 0.42, 0.03, 0.16);
  kit.add(roof, paneMat, { x: L.x, y: h + (tall ? 1.4 : 1.0), z: L.z, ry: Math.PI / 8 }); kit.add(roof, leadMat, { x: L.x, y: h + (tall ? 1.4 : 1.0), z: L.z, ry: Math.PI / 8 });
  const eave = panes(new THREE.CylinderGeometry(Math.max(w, d) * 0.8, Math.max(w, d) * 0.72, 0.25, 8), HUES.amber, 0.7, 0.5, 0.02, 0.1);
  kit.add(eave, paneMat, { x: L.x, y: h + 0.05, z: L.z, ry: Math.PI / 8 }); kit.add(eave, leadMat, { x: L.x, y: h + 0.05, z: L.z, ry: Math.PI / 8 });
  // finial: a lead hook with a ruby bead
  kit.add(new THREE.TorusGeometry(0.26, 0.05, 6, 14, Math.PI * 1.3), new THREE.MeshPhongMaterial({ color: 0x2a2130, shininess: 60 }), { x: L.x, y: h + (tall ? 2.8 : 2.0) + 0.45, z: L.z });
  kit.add(panes(new THREE.IcosahedronGeometry(0.14, 0), HUES.ruby, 0.9, 0.5), glowMat, { x: L.x + 0.22, y: h + (tall ? 2.8 : 2.0) + 0.3, z: L.z });
  // chimney: a sapphire prism with two glowing amber flues
  const ch = panes(facet(new THREE.BoxGeometry(0.7, 1.5, 0.5, 2, 3, 2), 0.03), HUES.sapphire, 0.5, 0.35, 0.03, 0.14);
  kit.add(ch, paneMat, { x: L.x + w * 0.28, y: h + 1.1, z: L.z - d * 0.25 }); kit.add(ch, leadMat, { x: L.x + w * 0.28, y: h + 1.1, z: L.z - d * 0.25 });
  for (const dx of [-0.16, 0.16]) kit.add(panes(new THREE.CylinderGeometry(0.1, 0.1, 0.35, 6), HUES.amber, 0.9, 0.6), glowMat, { x: L.x + w * 0.28 + dx, y: h + 2.0, z: L.z - d * 0.25 });
  // windows: blazing amber panes in a lead grid; door: a violet arch
  const win = (x, y, w2 = 0.6, h2 = 0.8) => {
    const g = panes(new THREE.BoxGeometry(w2, h2, 0.08, 2, 3, 1), HUES.amber, 0.95, 0.62, 0.02, 0.15);
    kit.add(g, glowMat, { x, y, z: L.z + d / 2 + 0.06 }); kit.add(g, leadMat, { x, y, z: L.z + d / 2 + 0.06 });
  };
  const door = (x) => {
    const g = panes(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 10, 1, false, 0, Math.PI), HUES.violet, 0.6, 0.35, 0.03, 0.12);
    kit.add(g, paneMat, { x, y: 1.35, z: L.z + d / 2 + 0.06, rx: Math.PI / 2 }); kit.add(g, leadMat, { x, y: 1.35, z: L.z + d / 2 + 0.06, rx: Math.PI / 2 });
    const b = panes(new THREE.BoxGeometry(0.84, 1.35, 0.12, 2, 3, 1), HUES.violet, 0.6, 0.35, 0.03, 0.12);
    kit.add(b, paneMat, { x, y: 0.675, z: L.z + d / 2 + 0.06 }); kit.add(b, leadMat, { x, y: 0.675, z: L.z + d / 2 + 0.06 });
  };
  if (tall) { door(L.x - 0.6); win(L.x - 0.75, 2.4); win(L.x + 0.75, 2.4); win(L.x, 2.7, 0.34, 0.42); win(L.x, 3.6, 0.55, 0.6); }
  else { door(L.x - 1.2); win(L.x + 0.8, 1.0, 1.7, 1.1); win(L.x - 1.1, 2.2, 0.5, 0.6); win(L.x + 0.8, 2.25, 0.5, 0.6);
    const sign = panes(new THREE.CircleGeometry(0.4, 8), HUES.ruby, 0.8, 0.45, 0.02, 0.1);
    kit.add(sign, glowMat, { x: L.x - w / 2 - 0.2, y: 2.2, z: L.z + d / 2 + 0.4, ry: Math.PI / 2 }); }
}
function tree(kit, L) {
  kit.add(panes(facet(new THREE.CylinderGeometry(0.18, 0.3, 2.6, 6), 0.04), HUES.amber, 0.4, 0.25, 0.02, 0.1), paneMat, { x: L.x, y: 1.3, z: L.z });
  const crowns = [[0, 3.6, 0, 1.6], [0.9, 3.0, 0.5, 1.0], [-1.0, 3.2, -0.3, 1.1], [0.2, 4.6, -0.5, 0.9]];
  for (const [x, y, z, r] of crowns) { const g = panes(facet(new THREE.IcosahedronGeometry(r, 1), 0.08), HUES.emerald, 0.8, 0.38, 0.05, 0.2); kit.add(g, paneMat, { x: L.x + x, y, z: L.z + z }); kit.add(g, leadMat, { x: L.x + x, y, z: L.z + z }); }
}
function lamp(kit, L) {
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(L.x, 0, L.z), new THREE.Vector3(L.x, 2.7, L.z), new THREE.Vector3(L.x - 0.05, 3.3, L.z), new THREE.Vector3(L.x - 0.5, 3.55, L.z), new THREE.Vector3(L.x - 0.9, 3.3, L.z)]);
  kit.add(new THREE.TubeGeometry(curve, 24, 0.06, 6, false), new THREE.MeshPhongMaterial({ color: 0x2a2130, shininess: 60 }), {});
  const lant = panes(new THREE.OctahedronGeometry(0.36, 0), HUES.amber, 0.95, 0.62, 0.02, 0.15);
  kit.add(lant, glowMat, { x: L.x - 0.9, y: 2.85, z: L.z, sy: 1.3 }); kit.add(lant, leadMat, { x: L.x - 0.9, y: 2.85, z: L.z, sy: 1.3 });
}
function person(kit, L) {
  const body = panes(facet(new THREE.ConeGeometry(0.4, 1.2, 7), 0.03), HUES.sapphire, 0.7, 0.4, 0.03, 0.15);
  kit.add(body, paneMat, { x: L.x, y: 0.6, z: L.z }); kit.add(body, leadMat, { x: L.x, y: 0.6, z: L.z });
  kit.add(panes(new THREE.IcosahedronGeometry(0.3, 1), HUES.cream, 0.5, 0.75, 0.02, 0.08), paneMat, { x: L.x, y: 1.45, z: L.z });
  const hat = panes(new THREE.ConeGeometry(0.42, 0.9, 6), HUES.ruby, 0.8, 0.4, 0.02, 0.12);
  kit.add(hat, paneMat, { x: L.x, y: 2.05, z: L.z, rz: -0.25 }); kit.add(hat, leadMat, { x: L.x, y: 2.05, z: L.z, rz: -0.25 });
}
function ground(kit, L) {
  const g = panes(facet(new THREE.PlaneGeometry(26, 20, 26, 20).rotateX(-Math.PI / 2), 0.06), HUES.amber, 0.5, 0.5, 0.03, 0.12);
  kit.add(g, paneMat, { x: 1.4, y: 0, z: 0.4 }); kit.add(g, leadMat, { x: 1.4, y: 0, z: 0.4 });
  const st = panes(facet(new THREE.BoxGeometry(L.street.len, 0.2, L.street.w, 18, 1, 3), 0.03), HUES.amber, 0.35, 0.4, 0.02, 0.12);
  kit.add(st, paneMat, { x: 1.4, y: 0.1, z: L.street.z + L.street.w / 2 }); kit.add(st, leadMat, { x: 1.4, y: 0.1, z: L.street.z + L.street.w / 2 });
  const ch = panes(new THREE.BoxGeometry(L.street.len, 0.1, 0.5, 18, 1, 1), HUES.teal, 0.9, 0.55, 0.02, 0.2);
  kit.add(ch, glowMat, { x: 1.4, y: 0.24, z: L.street.z + 0.35 }); kit.add(ch, leadMat, { x: 1.4, y: 0.24, z: L.street.z + 0.35 });
}
export const glass = {
  name: 'Stained glass',
  background: 0x2b2434,
  build(group, L, Kit) {
    const kit = new Kit();
    ground(kit, L); house(kit, L.houseA, 'A'); house(kit, L.houseB, 'B'); tree(kit, L.tree); lamp(kit, L.lamp); person(kit, L.person);
    const gem = panes(facet(new THREE.DodecahedronGeometry(0.5, 0), 0.05), HUES.violet, 0.7, 0.45, 0.03, 0.15);
    kit.add(gem, paneMat, { x: L.prop.x, y: 0.5, z: L.prop.z }); kit.add(gem, leadMat, { x: L.prop.x, y: 0.5, z: L.prop.z });
    group.add(kit.build());
    return group;
  },
  lights(scene) {
    const key = new THREE.DirectionalLight(0xfff0dc, 2.4); key.position.set(-8, 14, 9); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -14; key.shadow.camera.right = 14; key.shadow.camera.top = 14; key.shadow.camera.bottom = -14; key.shadow.radius = 3; key.shadow.bias = -0.0005;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fb8ff, 0.8); rim.position.set(8, 6, -10); scene.add(rim);
    scene.add(new THREE.HemisphereLight(0xb9a8d0, 0x4a3a40, 1.2));
  },
};
