import * as THREE from 'three';
import * as T from './textures.js';

// One registry of materials. Kit pieces refer to them by key so a building's
// merged meshes are one draw call per material.
let M = null;

export function materials() {
  if (M) return M;
  const plaster = T.plasterTex();
  const ashlar = T.ashlarTex();
  const tile = T.roofTileTex(3, 218);
  const tileTeal = T.roofTileTex(4, 190);
  const timber = T.timberTex();
  const chevron = T.chevronTex();
  const copper = T.copperTex();
  const bloom = T.bloomTex();
  const pine = T.foliageTex(12, 168);
  const ink = T.foliageTex(14, 228);
  const rock = T.rockTex();

  const lam = (o) => new THREE.MeshLambertMaterial({ vertexColors: true, ...o });
  const pho = (o) => new THREE.MeshPhongMaterial({ vertexColors: true, ...o });

  M = {
    plaster: lam({ map: plaster, color: 0xf6ecd8 }),
    plasterOchre: lam({ map: plaster, color: 0xe3c489 }),
    plasterRose: lam({ map: plaster, color: 0xe8c3ad }),
    plasterGrey: lam({ map: plaster, color: 0xd8d3c4 }),
    ashlar: lam({ map: ashlar, color: 0xdacfb8 }),
    ashlarDark: lam({ map: ashlar, color: 0xb3a892 }),
    tile: pho({ map: tile, color: 0xd9dcea, specular: 0x6f84b8, shininess: 42 }),
    tileTeal: pho({ map: tileTeal, color: 0xd6e2e2, specular: 0x5f9aa0, shininess: 42 }),
    timber: lam({ map: timber, color: 0xd2b090 }),
    timberDark: lam({ map: timber, color: 0x8a6a52 }),
    chevron: lam({ map: chevron }),
    brass: pho({ color: 0xb8923a, specular: 0x554422, shininess: 40 }),
    verdigris: lam({ color: 0x5f9b8c }),
    copper: pho({ map: copper, specular: 0x442211, shininess: 30 }),
    ink: lam({ color: 0x2a2c4a }),
    inkBlue: lam({ color: 0x3c4c82 }),
    wax: lam({ color: 0xb23a2e }),
    waxPale: lam({ color: 0xe9dcc0 }),
    glass: pho({ color: 0x8fb3c6, specular: 0xffffff, shininess: 80, transparent: true, opacity: 0.85 }),
    glassLit: lam({ color: 0xf6d98a, emissive: 0xb07a20, emissiveIntensity: 0.0 }),
    cream: lam({ color: 0xeee2c5 }),
    bread: lam({ color: 0xc98a3e }),
    rope: lam({ color: 0x9c8963 }),
    cloth: lam({ color: 0x8a4a3a }),
    clothBlue: lam({ color: 0x3a4a7a }),
    pine: lam({ map: pine, color: 0xc6d8c8 }),
    pineTrunk: lam({ map: timber, color: 0x9a7a60 }),
    inkwood: lam({ map: ink, color: 0x9aa4d6 }),
    inkwoodTrunk: lam({ map: T.timberTex(), color: 0xc9bca0 }),
    rock: lam({ map: rock, color: 0xd6d2c8 }),
    bloom: lam({ map: bloom, color: 0xb4a9e6 }),
    bloomStalk: lam({ color: 0xe6dcc8 }),
    ley: pho({ color: 0x3aa0b6, emissive: 0x0f4f7a, emissiveIntensity: 0.45, specular: 0xffffff, shininess: 120 }),
    leyDeep: lam({ color: 0x1d5fa8, emissive: 0x0c2f60, emissiveIntensity: 0.5 }),
    skin: lam({ color: 0xe9c9a8 }),
    skinDark: lam({ color: 0xa87858 }),
    hatInk: lam({ color: 0x232a4a }),
    hatOchre: lam({ color: 0xc99a4a }),
    hatWine: lam({ color: 0x7a2f3a }),
    capeBlue: lam({ color: 0x4a5a8a }),
    capeGrey: lam({ color: 0x8a8578 }),
    capeOchre: lam({ color: 0xb98c4a }),
    lamp: pho({ color: 0xffe9a8, emissive: 0xffc860, emissiveIntensity: 0.0 }),
    shadowCatcher: new THREE.ShadowMaterial({ opacity: 0.25 }),
  };
  for (const k in M) { if (M[k].map) { M[k].map.repeat.set(1, 1); } }
  return M;
}

// night/day interpolation for materials that glow
export function setGlow(intensity) {
  const m = materials();
  m.lamp.emissiveIntensity = intensity * 1.4;
  m.glassLit.emissiveIntensity = intensity * 0.9;
  m.ley.emissiveIntensity = 0.35 + intensity * 0.9;
}
