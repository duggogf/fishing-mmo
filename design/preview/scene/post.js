// Paint post copied from the painted-cel skill starter (unchanged apart from the import and dispose()).
// Paint post (plan §3.2). The environment renders to a target with depth; this pass
// (1) displaces the lookup by low-frequency noise so every polygon edge wobbles like the
// kit's k-rough filter, (2) runs a 4-sector Kuwahara (radius 2) that turns texture into flat
// daubs and softens 3D edges into paint edges, (3) adds paper grain, and (4) writes the
// (displaced) scene depth so characters drawn afterwards still sort against the world.
// Characters render after it, so cels stay crisp: printed characters, painted world.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';

function noiseTex(size = 128, seed = 3) {
  const d = new Uint8Array(size * size * 4); let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const g = []; for (let i = 0; i < 16 * 16 * 2; i++) g.push(r());
  const at = (x, y, c) => g[((((y % 16) + 16) % 16) * 16 + (((x % 16) + 16) % 16)) * 2 + c];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const fx = x / size * 16, fy = y / size * 16, xi = Math.floor(fx), yi = Math.floor(fy), u = fx - xi, v = fy - yi;
    const sm = (t) => t * t * (3 - 2 * t), su = sm(u), sv = sm(v);
    for (let c = 0; c < 2; c++) {
      const a = at(xi, yi, c), b = at(xi + 1, yi, c), cc = at(xi, yi + 1, c), dd = at(xi + 1, yi + 1, c);
      d[(y * size + x) * 4 + c] = Math.round(255 * (a + (b - a) * su + (cc - a) * sv + (a - b - cc + dd) * su * sv));
    }
    d[(y * size + x) * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(d, size, size); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
  return t;
}

export class PaintPost {
  constructor(grain) {
    this.rt = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: true });
    this.rt.depthTexture = new THREE.DepthTexture(4, 4, THREE.UnsignedIntType);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { tColor: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture }, tNoise: { value: noiseTex() }, tGrain: { value: grain },
        res: { value: new THREE.Vector2(4, 4) }, sense: { value: 0 }, wob: { value: 1.8 }, kuw: { value: 1 }, grainK: { value: 0.1 }, scale: { value: 1 } },
      vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */`
        uniform sampler2D tColor, tDepth, tNoise, tGrain; uniform vec2 res; uniform float wob, kuw, grainK, scale, sense;
        varying vec2 vUv;
        vec3 S(vec2 uv){ return texture2D(tColor, uv).rgb; }
        void main(){
          vec2 px = 1.0 / res;
          vec2 q = vUv * res / scale;
          vec2 n = (texture2D(tNoise, q / 260.0).rg - 0.5) * 1.6 + (texture2D(tNoise, q / 70.0 + 0.37).rg - 0.5) * 0.7;
          vec2 uv = vUv + n * wob * scale * px;
          vec3 col;
          float upright = texture2D(tColor, uv).a < 0.75 ? 1.0 : 0.0;  // plaster and boards keep flat shapes and hard accents
          if (kuw > 0.5 && upright < 0.5) {
            vec3 m[4]; float v[4];
            for (int k = 0; k < 4; k++) {
              vec2 o = vec2(k == 1 || k == 3 ? 0.0 : -1.0, k >= 2 ? 0.0 : -1.0);
              vec3 sum = vec3(0.0), sq = vec3(0.0);
              for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) {
                vec3 c = S(uv + (o + vec2(float(i), float(j))) * px * scale);
                sum += c; sq += c * c;
              }
              m[k] = sum / 4.0; vec3 var = sq / 4.0 - m[k] * m[k]; v[k] = var.r + var.g + var.b;
            }
            col = m[0]; float best = v[0];
            for (int k = 1; k < 4; k++) if (v[k] < best) { best = v[k]; col = m[k]; }
          } else col = S(uv);
          // Whisker Sense: the world drops to lavender-grey (hud.md §3.2; art bible mood table); cats draw after, at full colour
          if (sense > 0.0) { float l = dot(col, vec3(0.3, 0.59, 0.11)); col = mix(col, mix(vec3(0.36, 0.33, 0.46), vec3(0.88, 0.86, 0.94), l), 0.62 * sense); }
          float g = texture2D(tGrain, gl_FragCoord.xy / 512.0).g;
          col *= mix(1.0, g / 0.83, grainK);
          gl_FragColor = vec4(col, 1.0);
          gl_FragDepth = texture2D(tDepth, uv).r;
        }`,
      depthTest: true, depthWrite: true,
    });
    this.mat.depthFunc = THREE.AlwaysDepth;
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat); this.quad.frustumCulled = false;
    this.scene = new THREE.Scene(); this.scene.add(this.quad);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  setSize(w, h) {
    this.rt.setSize(w, h); this.rt.depthTexture.image.width = w; this.rt.depthTexture.image.height = h;
    this.mat.uniforms.res.value.set(w, h); this.mat.uniforms.scale.value = Math.max(1, h / 1080);
  }
  render(renderer) { renderer.setRenderTarget(null); renderer.render(this.scene, this.cam); }
}
PaintPost.prototype.dispose = function () { this.rt.dispose(); this.rt.depthTexture.dispose(); this.mat.uniforms.tNoise.value.dispose(); this.mat.dispose(); this.quad.geometry.dispose(); };
