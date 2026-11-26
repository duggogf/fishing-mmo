// PROTOTYPE - NOT FOR PRODUCTION (forked from design/preview/scene)
// Little Ocean preview - "paint what stays". Adapted from the painted-cel skill's starter env.js: unlined
// environment materials with a soft 2-band sun ramp, coloured (never grey) shade, warm bounce, soft PCF sun
// shadow and haze; painted sky dome; backdrop rings; plus the 09 painted sea (opaque, unlit, 3-band ramp from
// swell height + scrolling daubs, distance far-tint, stepped glint path). All maths in raw sRGB.
import * as THREE from '../vendor/three.module.js';
import { rgb, sunDir, SWELL_GLSL } from './phases.js';

/** Uniforms shared by every environment material (one object, so a phase change is one write). */
export const U = {
  sunDir: { value: new THREE.Vector3(0, 1, 0) },
  keyColor: { value: new THREE.Vector3(1, 1, 1) },
  shadeMul: { value: new THREE.Vector3(0.7, 0.7, 0.8) },
  bounce: { value: new THREE.Vector3(0, 0, 0) },
  hazeColor: { value: new THREE.Vector3(1, 1, 1) },
  hazeNear: { value: 60 }, hazeFar: { value: 900 }, hazeMax: { value: 0.6 },
  shadowMap: { value: null }, shadowMatrix: { value: new THREE.Matrix4() }, shadowTexel: { value: 1 / 1024 }, shadowOn: { value: 1 },
  grainMap: { value: null },
  vertLift: { value: 0.4 },
  debugMode: { value: 0 },
  zenith: { value: new THREE.Vector3() }, horizon: { value: new THREE.Vector3() },
  sunGlow: { value: new THREE.Vector3() }, sunGlowK: { value: 0.5 },
  cloudLight: { value: new THREE.Vector3(1, 1, 1) }, cloudShade: { value: new THREE.Vector3(0.8, 0.85, 0.94) },
  backdropKey: { value: new THREE.Vector3(1, 1, 1) },
  time: { value: 0 }, wind: { value: 1 },
  windowGlow: { value: 0 }, lamp: { value: new THREE.Vector3(1, 0.85, 0.54) },
  seaGlow: { value: new THREE.Vector3(1, 0.96, 0.84) }, seaGlowK: { value: 0 },
  swellA: { value: 0.4 },
  // sea (09 R1 + harbour swatches; key/glint/saturation per LightPhase)
  wTrough: { value: rgb('#449BAE') }, wBody: { value: rgb('#4FB3BF') }, wCrest: { value: rgb('#6FC2C6') }, wFar: { value: rgb('#A6DCE8') },
  hTrough: { value: rgb('#4E9690') }, hBody: { value: rgb('#63ADA0') }, hCrest: { value: rgb('#7BBDAD') },
  harbourC: { value: new THREE.Vector2(-52, -34) },
  waterKey: { value: new THREE.Vector3(1, 1, 1) }, waterSat: { value: 1 }, glintCol: { value: rgb('#FFF6E3') }, glintK: { value: 0.35 },
  t1: { value: 0.35 }, t2: { value: 0.72 },
  curtainK: { value: 0 },
};

export function applyPhase(p) {
  U.sunDir.value.copy(sunDir(p));
  U.keyColor.value.copy(rgb(p.key));
  U.shadeMul.value.set(1, 1, 1).lerp(rgb(p.shadowTint || p.shadow), p.shadeK);
  U.bounce.value.copy(rgb(p.bounce)).multiplyScalar(p.bounceK);
  U.hazeColor.value.copy(rgb(p.haze)); U.hazeNear.value = p.hazeNear; U.hazeFar.value = p.hazeFar; U.hazeMax.value = p.hazeMax;
  U.zenith.value.copy(rgb(p.zenith)); U.horizon.value.copy(rgb(p.horizon));
  U.sunGlow.value.copy(rgb(p.sunGlow)); U.sunGlowK.value = p.sunGlowK;
  U.cloudLight.value.copy(rgb(p.cloudLight)); U.cloudShade.value.copy(rgb(p.cloudShade));
  U.backdropKey.value.copy(rgb(p.backdropKey)); U.vertLift.value = p.vertLift;
  U.windowGlow.value = p.windowGlow || 0; U.seaGlow.value.copy(rgb(p.seaGlow)); U.seaGlowK.value = p.seaGlowK;
  U.waterKey.value.copy(rgb(p.waterKey)); U.waterSat.value = p.waterSat; U.glintCol.value.copy(rgb(p.glint)); U.glintK.value = p.glintK;
}

const LIGHT_PARS = /* glsl */`
uniform vec3 sunDir, keyColor, shadeMul, bounce, hazeColor;
uniform float hazeNear, hazeFar, hazeMax, shadowTexel, shadowOn, debugMode, vertLift;
uniform sampler2D shadowMap, grainMap;
uniform mat4 shadowMatrix;
uniform vec3 seaGlow, lamp; uniform float seaGlowK, windowGlow, time, wind;
const vec2 PD[12] = vec2[12](vec2(-0.326,-0.406), vec2(-0.840,-0.074), vec2(-0.696,0.457), vec2(-0.203,0.621), vec2(0.962,-0.195), vec2(0.473,-0.480),
  vec2(0.519,0.767), vec2(0.185,-0.893), vec2(0.507,0.064), vec2(0.896,0.412), vec2(-0.322,-0.933), vec2(-0.792,-0.598));
float sunShadow(vec3 p, vec3 n, float soft) {
  if (shadowOn < 0.5) return 1.0;
  vec4 sc = shadowMatrix * vec4(p + n * 0.08, 1.0);
  vec3 c = sc.xyz / sc.w;
  if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0 || c.z > 1.0) return 1.0;
  float s = 0.0;
  float a = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.2832;
  mat2 r = mat2(cos(a), sin(a), -sin(a), cos(a));
  for (int i = 0; i < 12; i++) { float d = texture2D(shadowMap, c.xy + r * PD[i] * shadowTexel * soft).r; s += step(c.z - 0.002, d); }
  return s / 12.0;
}
float grainAt(vec3 p, vec3 n) {
  vec3 an = abs(n);
  vec2 g = an.y > 0.6 ? p.xz : (an.x > an.z ? p.zy : p.xy);
  return texture2D(grainMap, g * 0.31).g;
}
vec3 hazeIt(vec3 c, vec3 p) {
  float L = length(p - cameraPosition);
  return mix(c, hazeColor, hazeMax * smoothstep(hazeNear, hazeFar, L));
}
vec3 envShade(vec3 alb, vec3 n, vec3 p, float shadowSoft, float twoSided) {
  float ndl = dot(n, sunDir);
  if (twoSided > 0.5) ndl = abs(ndl) * 0.8 + 0.1;
  float ramp = smoothstep(-0.04, 0.16, ndl);
  float vert0 = 1.0 - abs(n.y);
  float sh = ramp > 0.0 ? sunShadow(p, n, shadowSoft * mix(1.0, 0.4, vert0)) : 1.0;
  sh = mix(sh, smoothstep(0.32, 0.68, sh), step(0.5, vert0));
  sh = mix(1.0, sh, smoothstep(0.08, 0.3, ndl));
  float lit = ramp * sh;
  float vert = 1.0 - abs(n.y);
  vec3 b = bounce * vert * (1.0 - smoothstep(0.0, 1.7, p.y - 1.0));
  vec3 sm = mix(shadeMul, vec3(1.0), vertLift * vert * (0.55 + 0.45 * smoothstep(5.0, 0.0, p.y)));
  vec3 light = mix(sm + b, keyColor, lit);
  if (debugMode > 1.5) return hazeIt(alb, p);
  if (debugMode > 0.5) return vec3(1.0 - lit, 0.0, 0.0);
  return hazeIt(alb * light, p);
}
`;

const STD_VERT = /* glsl */`
varying vec2 vUv; varying vec3 vN; varying vec3 vP; varying vec3 vC;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vP = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); vUv = uv;
#ifdef USE_COLOR
  vC = color;
#else
  vC = vec3(1.0);
#endif
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const STD_FRAG = /* glsl */`
uniform sampler2D map; uniform float hasMap, alphaCut, grainK, premul, shadowSoft, twoSided, glass, emit; uniform vec3 tint;
varying vec2 vUv; varying vec3 vN; varying vec3 vP; varying vec3 vC;
${LIGHT_PARS}
void main() {
  vec4 t = hasMap > 0.5 ? texture2D(map, vUv) : vec4(1.0);
  if (t.a < alphaCut) discard;
  if (premul > 0.5) t.rgb /= max(t.a, 0.001);
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 alb = t.rgb * tint * vC;
  alb *= mix(1.0, grainAt(vP, n) / 0.83, grainK);
  float macro = texture2D(grainMap, vec2(vP.x + vP.z, vP.y * 2.0 + vP.z * 0.3) * 0.021).g * 0.6 + texture2D(grainMap, (vP.xz + vP.y) * 0.0071 + 0.31).g * 0.4;
  alb *= mix(vec3(1.0), vec3(macro / 0.83) * vec3(1.0, 0.985, 1.02), 0.35);
  vec3 col = envShade(alb, n, vP, shadowSoft, twoSided);
  if (glass > 0.0 && debugMode < 0.5) { float g = smoothstep(0.04, 0.12, t.b - t.r) * step(dot(t.rgb, vec3(0.333)), 0.6); col = mix(col, lamp, g * windowGlow * glass); }
  if (emit > 0.0 && debugMode < 0.5) col = mix(col, vec3(1.0, 0.93, 0.72), emit * max(windowGlow, 0.15));
  gl_FragColor = vec4(col, abs(n.y) < 0.5 ? 0.5 : 1.0);
}`;

/** Standard painted environment material. o: {map, tint, grain, alphaCut, side, vertexColors, shadowSoft, glass, emit} */
export function envMat(o = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: { ...U, map: { value: o.map || null }, hasMap: { value: o.map ? 1 : 0 }, tint: { value: rgb(o.tint || '#FFFFFF') },
      alphaCut: { value: o.alphaCut || 0 }, grainK: { value: o.grain == null ? (o.map ? 0.15 : 0.6) : o.grain },
      premul: { value: o.map && o.map.premultiplyAlpha ? 1 : 0 }, shadowSoft: { value: o.shadowSoft || 2.6 }, twoSided: { value: o.twoSided ? 1 : 0 },
      glass: { value: o.glass || 0 }, emit: { value: o.emit || 0 } },
    vertexShader: STD_VERT, fragmentShader: STD_FRAG, side: o.side || THREE.FrontSide, vertexColors: !!o.vertexColors,
  });
  m.userData.alphaCut = o.alphaCut || 0;
  return m;
}

/* ---------------------------------------------------------------- the painted sea (09 rule 2) */
const WATER_VERT = /* glsl */`
uniform float time; varying vec3 vP; varying float vH; varying vec2 vG;
${SWELL_GLSL}
void main() {
  vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
  vec2 g; float h = swellH(p.xz, time, g);
  p.y += h; vP = p; vH = h; vG = g;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const WATER_FRAG = /* glsl */`
uniform sampler2D daub; uniform float swellA, t1, t2, glintK, waterSat;
uniform vec3 wTrough, wBody, wCrest, wFar, hTrough, hBody, hCrest, waterKey, glintCol; uniform vec2 harbourC;
varying vec3 vP; varying float vH; varying vec2 vG;
${LIGHT_PARS}
void main() {
  // two slow-scrolling painted daub layers (they choose the band; they are not lighting normals)
  vec2 q = vP.xz;
  float d1 = texture2D(daub, q / 14.0 + vec2(0.0, time * 0.010)).g;
  float d2 = texture2D(daub, vec2(q.x * 0.8 - q.y * 0.6, q.x * 0.6 + q.y * 0.8) / 9.5 + vec2(time * 0.008, -time * 0.005)).g;
  float dv = d1 * 0.6 + d2 * 0.4;
  float hn = clamp(vH / max(swellA * 1.6, 0.01) * 0.5 + 0.5, 0.0, 1.0);
  float waveN = 0.6 * hn + 0.4 * dv;                    // 09 F6
  float e = 0.05;
  float tr = 1.0 - smoothstep(t1 - e, t1 + e, waveN), cr = smoothstep(t2 - e, t2 + e, waveN);
  float hb = 1.0 - smoothstep(22.0, 70.0, distance(q, harbourC));   // calm jade near the harbour
  vec3 T = mix(wTrough, hTrough, hb), B = mix(wBody, hBody, hb), C = mix(wCrest, hCrest, hb);
  vec3 col = mix(mix(B, T, tr), C, cr);
  float dist = length(q - cameraPosition.xz);
  col = mix(col, wFar, smoothstep(40.0, 700.0, dist) * 0.8);
  // glint path: cream daubs toward the sun, view-dependent but stepped into 2 bands (never a specular)
  vec3 V = normalize(vP - cameraPosition);
  vec3 n = normalize(vec3(-vG.x * 1.5 + (d1 - 0.5) * 0.18, 1.0, -vG.y * 1.5 + (d2 - 0.5) * 0.18));
  vec3 r = reflect(V, n);
  float s = dot(normalize(r), sunDir);
  float band = step(0.955, s) * 0.55 + step(0.988, s) * 0.45;
  col = mix(col, glintCol, glintK * band * step(0.5, dv));
  col *= waterKey;
  float l = dot(col, vec3(0.299, 0.587, 0.114)); col = mix(vec3(l), col, waterSat);
  if (debugMode > 0.5) col = vec3(0.0);
  gl_FragColor = vec4(hazeIt(col, vP), 1.0);
}`;
export function waterMat(daub) {
  return new THREE.ShaderMaterial({ uniforms: { ...U, daub: { value: daub } }, vertexShader: WATER_VERT, fragmentShader: WATER_FRAG });
}
/** Polar sea grid centred on the boat: dense near, geometric rings out to ~2.4 km. */
export function seaGeometry(seg = 160, rings = 112) {
  const pos = [], idx = [];
  const R = (i) => 1.2 * (Math.pow(1.071, i) - 1);
  pos.push(0, 0, 0);
  for (let i = 1; i <= rings; i++) for (let j = 0; j < seg; j++) { const a = j / seg * Math.PI * 2, r = R(i); pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); }
  for (let j = 0; j < seg; j++) idx.push(0, 1 + ((j + 1) % seg), 1 + j);
  for (let i = 1; i < rings; i++) for (let j = 0; j < seg; j++) {
    const a = 1 + (i - 1) * seg + j, b = 1 + (i - 1) * seg + ((j + 1) % seg), c = a + seg, d = b + seg;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 3000);
  return g;
}

/* ---------------------------------------------------------------- sky dome */
export function skyDome(brush) {
  const m = new THREE.ShaderMaterial({
    uniforms: { ...U, brush: { value: brush } },
    vertexShader: /* glsl */`varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform vec3 zenith, horizon, sunDir, sunGlow; uniform float sunGlowK; uniform sampler2D brush; varying vec3 vD;
      void main(){
        vec3 d = normalize(vD);
        float e = asin(clamp(d.y, -1.0, 1.0)) * 57.2958;
        vec3 deep = mix(zenith, vec3(0.118, 0.373, 0.753), 0.18);
        vec3 mid = mix(zenith, horizon, 0.72);
        float t = clamp(e / 22.0, 0.0, 1.0);
        vec3 c = t < 0.2 ? mix(horizon, mid, t / 0.2) : (t < 0.58 ? mix(mid, zenith, (t - 0.2) / 0.38) : mix(zenith, deep, (t - 0.58) / 0.42));
        if (e < 0.0) c = horizon;
        float az = atan(d.x, -d.z);
        float b = texture2D(brush, vec2(az / 6.2832 * 3.0, e / 40.0)).g;   // whole repeats round the dome: no seam
        c *= mix(1.0, b / 0.9, 0.18);
        float g = max(dot(d, normalize(sunDir)), 0.0);
        c = mix(c, sunGlow, sunGlowK * (pow(g, 6.0) * 0.6 + pow(g, 40.0) * 0.4));
        gl_FragColor = vec4(c, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), m);
  mesh.renderOrder = -10; mesh.frustumCulled = false;
  return mesh;
}

/* ---------------------------------------------------------------- backdrop rings (islands, clouds, rain curtain) */
const BACK_FRAG = /* glsl */`
uniform sampler2D map; uniform float haze, cloud, keyK, opacity; uniform vec3 horizon, backdropKey, cloudLight, cloudShade, hazeColor;
varying vec2 vUv; varying vec3 vP;
void main(){
  vec4 t = texture2D(map, vUv);
  float a = t.a * opacity;
  if (a < 0.02) discard;
  vec3 c = t.rgb / max(t.a, 0.001);
  if (cloud > 0.5) { float l = clamp((dot(c, vec3(0.3, 0.5, 0.2)) - 0.80) / 0.2, 0.0, 1.0); c = mix(cloudShade, cloudLight, l); }
  else c *= mix(vec3(1.0), backdropKey, keyK);
  c = mix(c, mix(hazeColor, horizon, 0.5), haze);
  gl_FragColor = vec4(c, a);
}`;
export function backdropMat(map, o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { ...U, map: { value: map }, haze: { value: o.haze || 0 }, cloud: { value: o.cloud ? 1 : 0 }, keyK: { value: o.keyK ?? 1 }, opacity: o.opacity || { value: 1 } },
    vertexShader: /* glsl */`varying vec2 vUv; varying vec3 vP; void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position,1.0); vP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: BACK_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
}
/** Cylindrical ring strip: azimuth a0..a1 (deg; 0 = -Z, +90 = +X), heights y0..y1, radius r. v=1 at the top. */
export function ringGeometry(r, a0, a1, y0, y1, seg = 64) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, a = THREE.MathUtils.degToRad(a0 + (a1 - a0) * u), x = Math.sin(a) * r, z = -Math.cos(a) * r;
    pos.push(x, y0, z, x, y1, z); uv.push(u, 0, u, 1);
    if (i < seg) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  return g;
}

/* ---------------------------------------------------------------- sun shadow pass (static harbour: re-rendered only when the sun moves) */
export class SunShadow {
  constructor(size = 1024, extent = 60) {
    this.rt = new THREE.WebGLRenderTarget(size, size, { depthBuffer: true });
    this.rt.depthTexture = new THREE.DepthTexture(size, size, THREE.UnsignedIntType);
    this.rt.depthTexture.minFilter = this.rt.depthTexture.magFilter = THREE.NearestFilter;
    this.cam = new THREE.OrthographicCamera(-extent, extent, extent, -extent, 1, 400);
    this.target = new THREE.Vector3();
    this.depthMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    U.shadowMap.value = this.rt.depthTexture; U.shadowTexel.value = 1 / size;
    this.bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this.last = new THREE.Vector3();
  }
  update(renderer, scene, casters) {
    const d = U.sunDir.value;
    if (this.last.distanceToSquared(d) < 1e-8) return;
    this.last.copy(d);
    this.cam.position.copy(this.target).addScaledVector(d, 200); this.cam.up.set(0, 1, 0);
    this.cam.lookAt(this.target); this.cam.updateMatrixWorld(); this.cam.updateProjectionMatrix();
    U.shadowMatrix.value.copy(this.bias).multiply(this.cam.projectionMatrix).multiply(this.cam.matrixWorldInverse);
    renderer.setRenderTarget(this.rt); renderer.clear();
    const saved = [];
    scene.traverse((o) => { if (o.isMesh) saved.push([o, o.material, o.visible]); });
    for (const [o] of saved) { if (!casters.has(o)) o.visible = false; else o.material = this.depthMat; }
    renderer.render(scene, this.cam);
    for (const [o, m, v] of saved) { o.material = m; o.visible = v; }
    renderer.setRenderTarget(null);
  }
  dispose() { this.rt.dispose(); this.rt.depthTexture.dispose(); this.depthMat.dispose(); }
}
