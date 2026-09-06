import * as THREE from 'three';
import { paperGrainTex } from './textures.js';

// Ink pass: renders colour + depth, then normals, then draws ink lines where depth or
// normals break, and lays paper grain over everything. This is what makes Hookwell read
// as a drawing rather than a mesh.

export class InkPass {
  constructor(renderer, scene, camera) {
    this.renderer = renderer; this.scene = scene; this.camera = camera;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(size.x, size.y, THREE.UnsignedIntType) });
    this.rtN = new THREE.WebGLRenderTarget(size.x, size.y, { samples: 4 });
    this.normalMat = new THREE.MeshNormalMaterial();
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture }, tNormal: { value: this.rtN.texture },
        tPaper: { value: paperGrainTex() }, res: { value: new THREE.Vector2(size.x, size.y) },
        near: { value: camera.near }, far: { value: camera.far }, ink: { value: new THREE.Color(0x1b1e33) },
        strength: { value: 0.85 }, grain: { value: 0.14 }, night: { value: 0 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `
        uniform sampler2D tColor, tDepth, tNormal, tPaper; uniform vec2 res; uniform float near, far, strength, grain, night; uniform vec3 ink;
        varying vec2 vUv;
        float lin(vec2 uv){ float z = texture2D(tDepth, uv).x; float n = z*2.0-1.0; return (2.0*near*far)/(far+near-n*(far-near)); }
        void main(){
          vec2 px = 1.0/res;
          float d = lin(vUv);
          vec3 n = texture2D(tNormal, vUv).xyz*2.0-1.0;
          float de = 0.0, ne = 0.0;
          vec2 offs[4]; offs[0]=vec2(px.x,0.0); offs[1]=vec2(-px.x,0.0); offs[2]=vec2(0.0,px.y); offs[3]=vec2(0.0,-px.y);
          for(int i=0;i<4;i++){
            float dd = lin(vUv+offs[i]);
            de += clamp((abs(dd-d) - d*0.012) / (d*0.01), 0.0, 1.0);
            vec3 nn = texture2D(tNormal, vUv+offs[i]).xyz*2.0-1.0;
            ne += smoothstep(0.30, 0.55, 1.0-dot(n,nn));
          }
          float edge = clamp(de*0.9 + ne*0.55, 0.0, 1.0);
          float fade = 1.0 - smoothstep(70.0, 160.0, d);
          vec3 col = texture2D(tColor, vUv).rgb;
          vec3 inkCol = mix(ink, col*0.35, 0.25);
          col = mix(col, inkCol, edge*strength*fade);
          float g = texture2D(tPaper, vUv*res/256.0).r;
          col *= 1.0 - grain*(1.0-night*0.6) + grain*2.0*(g-0.5);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
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
    this.mat.uniforms.near.value = this.camera.near; this.mat.uniforms.far.value = this.camera.far;
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
