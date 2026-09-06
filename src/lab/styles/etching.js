import * as THREE from 'three';
import { BUILDERS } from '../../render/buildings.js';
import { candlePine } from '../../render/props.js';
import { personMesh } from '../../render/people.js';
import { materials } from '../../render/materials.js';

// ETCHED LEDGER. The Hookwell architecture as it stands, but rendered as a copperplate
// engraving: cream paper, sepia cross-hatching that thickens in shadow, a depth line around
// forms, and a single accent kept in colour (wax seals, ley). The town as its own charter.

const post = {
  init(renderer, scene, camera) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.rt = new THREE.WebGLRenderTarget(size.x, size.y, { samples: 4, depthTexture: new THREE.DepthTexture(size.x, size.y, THREE.UnsignedIntType) });
    this.mat = new THREE.ShaderMaterial({
      uniforms: { tColor: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture }, res: { value: new THREE.Vector2(size.x, size.y) }, near: { value: camera.near }, far: { value: camera.far } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `
        uniform sampler2D tColor, tDepth; uniform vec2 res; uniform float near, far; varying vec2 vUv;
        float lin(vec2 uv){ float z = texture2D(tDepth, uv).x; float n = z*2.0-1.0; return (2.0*near*far)/(far+near-n*(far-near)); }
        float hatch(vec2 p, float ang, float period){ vec2 d = vec2(cos(ang), sin(ang)); float v = fract(dot(p, d) / period); return smoothstep(0.0, 0.18, v) * smoothstep(0.42, 0.24, v); }
        void main(){
          vec2 px = 1.0/res;
          vec3 c = texture2D(tColor, vUv).rgb;
          float lum = dot(c, vec3(0.3, 0.59, 0.11));
          lum = pow(lum, 0.8);
          vec2 p = gl_FragCoord.xy;
          float period = 5.0 * (res.x / 1440.0);
          float h = 0.0;
          h += hatch(p, 0.75, period) * smoothstep(0.7, 0.42, lum);
          h += hatch(p, -0.75, period) * smoothstep(0.5, 0.25, lum);
          h += hatch(p, 0.0, period * 0.9) * smoothstep(0.38, 0.12, lum);
          h += hatch(p, 1.45, period * 0.8) * smoothstep(0.2, 0.02, lum);
          h = clamp(h, 0.0, 1.0);
          // depth edge line
          float d = lin(vUv); float e = 0.0;
          for (int i = 0; i < 4; i++) { vec2 o = (i==0? vec2(px.x,0.0) : i==1? vec2(-px.x,0.0) : i==2? vec2(0.0,px.y) : vec2(0.0,-px.y)) * 1.4; float dd = lin(vUv + o); e += clamp((abs(dd-d) - d*0.01)/(d*0.008), 0.0, 1.0); }
          e = clamp(e, 0.0, 1.0);
          float sky = step(far*0.9, d);
          vec3 paper = vec3(0.95, 0.91, 0.82);
          vec3 ink = vec3(0.26, 0.19, 0.13);
          vec3 col = mix(paper, ink, max(h * 0.85, e) * (1.0 - sky));
          // keep one accent: strongly saturated reds and teals stay in colour
          float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)); float sat = (mx - mn) / max(mx, 0.001);
          float accent = smoothstep(0.55, 0.85, sat) * (1.0 - sky);
          vec3 tint = c / max(mx, 0.001);
          col = mix(col, mix(mix(paper, tint, 0.75), ink, h * 0.6), accent * 0.8);
          // paper grain
          float g = fract(sin(dot(floor(p * 0.5), vec2(12.9898, 78.233))) * 43758.5453);
          col *= 0.96 + 0.06 * g;
          gl_FragColor = vec4(col, 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.qs = new THREE.Scene(); this.qs.add(this.quad); this.qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  },
  resize(renderer) { const s = renderer.getDrawingBufferSize(new THREE.Vector2()); this.rt.setSize(s.x, s.y); this.mat.uniforms.res.value.set(s.x, s.y); },
  render(renderer, scene, camera) {
    renderer.setRenderTarget(this.rt); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(this.qs, this.qc);
  },
};

export const etching = {
  name: 'Etching',
  background: 0xffffff,
  post,
  resize(renderer) { post.rt && post.resize(renderer); },
  build(group, L, Kit) {
    materials();
    const a = BUILDERS.lodging({ seed: 0.31, lit: false, supplied: true, warped: false, onLey: false }); a.position.set(L.houseA.x, 0, L.houseA.z); group.add(a);
    const b = BUILDERS.bakery({ seed: 0.62, lit: false, supplied: true, warped: false, onLey: false }); b.position.set(L.houseB.x, 0, L.houseB.z); group.add(b);
    const t = candlePine(0.37); t.position.set(L.tree.x, 0, L.tree.z); group.add(t);
    const lp = BUILDERS.lamp({ supplied: true }); lp.position.set(L.lamp.x - 1.2, 0, L.lamp.z - 1.2); group.add(lp);
    const p = personMesh('journeyman', 0.3); p.position.set(L.person.x, 0, L.person.z); p.rotation.y = 0.6; group.add(p);
    const M = materials();
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(26, 20).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xe6e1cf })); ground.position.set(1.4, 0, 0.4); ground.receiveShadow = true; group.add(ground);
    const street = new THREE.Mesh(new THREE.BoxGeometry(L.street.len, 0.1, L.street.w), new THREE.MeshLambertMaterial({ color: 0xb3ab98 })); street.position.set(1.4, 0.05, L.street.z + L.street.w / 2); street.receiveShadow = true; group.add(street);
    const chan = new THREE.Mesh(new THREE.BoxGeometry(L.street.len, 0.06, 0.5), M.ley); chan.position.set(1.4, 0.12, L.street.z + 0.35); group.add(chan);
    return group;
  },
  lights(scene) {
    const sun = new THREE.DirectionalLight(0xffffff, 2.4); sun.position.set(-8, 14, 10); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -14; sun.shadow.camera.right = 14; sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -14; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 0.7));
  },
};
