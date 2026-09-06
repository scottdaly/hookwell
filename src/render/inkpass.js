import * as THREE from 'three';
import { paperGrainTex } from './textures.js';

// Ink pass: renders colour + depth, then view-space normals, then in one composite:
//  - screen-space ambient occlusion from depth + normals (grounds every object)
//  - ink lines where depth or normals break
//  - a painted sky gradient where there is no geometry
//  - a gentle wash grade, vignette and paper grain
// This is what makes Hookwell read as a drawing rather than a mesh.

function makeKernel(n) {
  const out = [];
  let seed = 3;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd()).normalize();
    let s = (i + 1) / n; s = 0.15 + 0.85 * s * s;   // cluster near the origin
    v.multiplyScalar(rnd() * s);
    out.push(v);
  }
  return out;
}

export class InkPass {
  constructor(renderer, scene, camera) {
    this.renderer = renderer; this.scene = scene; this.camera = camera;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(size.x, size.y, THREE.UnsignedIntType) });
    this.rtN = new THREE.WebGLRenderTarget(size.x, size.y, { samples: 4 });
    this.normalMat = new THREE.MeshNormalMaterial();
    const N = 12;
    this.mat = new THREE.ShaderMaterial({
      defines: { N_SAMPLES: N },
      uniforms: {
        tColor: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture }, tNormal: { value: this.rtN.texture },
        tPaper: { value: paperGrainTex() }, res: { value: new THREE.Vector2(size.x, size.y) },
        near: { value: camera.near }, far: { value: camera.far }, ink: { value: new THREE.Color(0x1b1e33) },
        proj: { value: new THREE.Matrix4() }, projInv: { value: new THREE.Matrix4() },
        kernel: { value: makeKernel(N) }, aoRadius: { value: 1.6 }, aoStrength: { value: 0.75 },
        strength: { value: 0.85 }, grain: { value: 0.11 }, night: { value: 0 }, lineW: { value: 1 },
        skyTop: { value: new THREE.Color(0xcfd9df) }, skyBot: { value: new THREE.Color(0xeadfc6) },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `
        uniform sampler2D tColor, tDepth, tNormal, tPaper; uniform vec2 res; uniform float near, far, strength, grain, night, aoRadius, aoStrength, lineW;
        uniform vec3 ink, skyTop, skyBot; uniform mat4 proj, projInv; uniform vec3 kernel[N_SAMPLES];
        varying vec2 vUv;
        float lin(vec2 uv){ float z = texture2D(tDepth, uv).x; float n = z*2.0-1.0; return (2.0*near*far)/(far+near-n*(far-near)); }
        vec3 viewPos(vec2 uv){ float z = texture2D(tDepth, uv).x; vec4 c = projInv * vec4(uv*2.0-1.0, z*2.0-1.0, 1.0); return c.xyz / c.w; }
        float ign(vec2 p){ return fract(52.9829189 * fract(0.06711056*p.x + 0.00583715*p.y)); }
        void main(){
          vec2 px = lineW/res;
          float d = lin(vUv);
          float sky = step(far*0.9, d);
          vec3 n = normalize(texture2D(tNormal, vUv).xyz*2.0-1.0);
          // ---- ink lines
          float de = 0.0, ne = 0.0;
          vec2 offs[4]; offs[0]=vec2(px.x,0.0); offs[1]=vec2(-px.x,0.0); offs[2]=vec2(0.0,px.y); offs[3]=vec2(0.0,-px.y);
          for(int i=0;i<4;i++){
            float dd = lin(vUv+offs[i]);
            de += clamp((abs(dd-d) - d*0.012) / (d*0.01), 0.0, 1.0);
            vec3 nn = texture2D(tNormal, vUv+offs[i]).xyz*2.0-1.0;
            ne += smoothstep(0.30, 0.55, 1.0-dot(n,nn));
          }
          float edge = clamp(de*0.9 + ne*0.55, 0.0, 1.0) * (1.0 - sky);
          float fade = 1.0 - smoothstep(70.0, 160.0, d);
          // ---- ambient occlusion
          float ao = 1.0;
          if (sky < 0.5) {
            vec3 p = viewPos(vUv);
            float a = ign(gl_FragCoord.xy) * 6.2831853;
            vec3 rv = vec3(cos(a), sin(a), 0.0);
            vec3 t = normalize(rv - n * dot(rv, n));
            vec3 b = cross(n, t);
            mat3 tbn = mat3(t, b, n);
            float occ = 0.0;
            float radius = aoRadius * (1.0 + d * 0.01);
            for (int i = 0; i < N_SAMPLES; i++) {
              vec3 sp = p + tbn * kernel[i] * radius;
              vec4 c = proj * vec4(sp, 1.0);
              vec2 suv = c.xy / c.w * 0.5 + 0.5;
              if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) continue;
              float sceneZ = -viewPos(suv).z;
              float sampleZ = -sp.z;
              float range = smoothstep(0.0, 1.0, radius / abs((-p.z) - sceneZ));
              occ += (sceneZ < sampleZ - 0.04 ? 1.0 : 0.0) * range;
            }
            ao = 1.0 - aoStrength * occ / float(N_SAMPLES);
          }
          // ---- compose
          vec3 col = texture2D(tColor, vUv).rgb;
          col *= mix(1.0, ao, 1.0 - night*0.4);
          vec3 inkCol = mix(ink, col*0.35, 0.25);
          col = mix(col, inkCol, edge*strength*fade);
          // sky where there is no geometry
          vec3 skyCol = mix(skyBot, skyTop, smoothstep(0.30, 1.0, vUv.y));
          col = mix(col, skyCol, sky);
          float g = texture2D(tPaper, vUv*res/256.0).r;
          col *= 1.0 - grain*(1.0-night*0.6) + grain*2.0*(g-0.5);
          gl_FragColor = vec4(max(col, 0.0), 1.0);
          #include <colorspace_fragment>
          // wash grade in display space: a touch of saturation and contrast, warm shadows, vignette
          vec3 c = gl_FragColor.rgb;
          float luma = dot(c, vec3(0.299, 0.587, 0.114));
          c = mix(vec3(luma), c, 1.1);
          c = (c - 0.5) * 1.05 + 0.5;
          c += (1.0 - luma) * vec3(0.02, 0.008, -0.01) * (1.0 - night);
          float v = length((vUv - 0.5) * vec2(1.0, res.y/res.x) * 1.4);
          c *= 1.0 - 0.14 * smoothstep(0.5, 1.1, v);
          gl_FragColor.rgb = clamp(c, 0.0, 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.quadScene = new THREE.Scene(); this.quadScene.add(this.quad);
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  setSize(w, h) {
    this.rt.setSize(w, h); this.rtN.setSize(w, h);
    this.mat.uniforms.res.value.set(w, h);
  }
  render() {
    const r = this.renderer;
    const u = this.mat.uniforms;
    u.near.value = this.camera.near; u.far.value = this.camera.far;
    u.proj.value.copy(this.camera.projectionMatrix); u.projInv.value.copy(this.camera.projectionMatrixInverse);
    r.shadowMap.needsUpdate = true;
    r.setRenderTarget(this.rt); r.render(this.scene, this.camera);
    const bg = this.scene.background; const fog = this.scene.fog;
    this.scene.background = null; this.scene.fog = null;
    this.scene.overrideMaterial = this.normalMat;
    r.setRenderTarget(this.rtN); r.setClearColor(0x8080ff, 1); r.render(this.scene, this.camera);
    this.scene.overrideMaterial = null; this.scene.background = bg; this.scene.fog = fog;
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCam);
  }
}
