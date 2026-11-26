// Little Ocean preview - drawn VFX (09 rule 6 / skill VFX): every effect is a drawing - hard-edged, cream core +
// one colour + ink edge (1.25 px @1080p), on twos, ending by breaking into dots. No particles, glow or alpha fades.
// Shapes are signed-distance drawings on quads: flat on the swell (foam collar, drift wake, drizzle ripples) or
// camera-facing (hull splash, catch-pop ring). Rain streaks are hard two-tone cards in a camera-wrapped volume.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import { rgb, SWELL_GLSL } from './phases.js';
import { U } from './env.js';
import { CELU } from './cel.js';

const SDF_FRAG = /* glsl */`
uniform float uDraw, uKind, rtH; uniform vec3 uCore, uTint, uEdge, hazeColor; uniform float celHazeNear;
varying vec2 vQ; varying vec3 vP;
float ell(vec2 p, vec2 c, vec2 r, float a) { p -= c; float s = sin(a), co = cos(a); p = vec2(co * p.x + s * p.y, -s * p.x + co * p.y); return (length(p / r) - 1.0) * min(r.x, r.y); }
float wob(float a, float D) { return sin(a * 7.0 + D * 2.1) * 0.5 + sin(a * 13.0 + D * 4.7) * 0.3 + sin(a * 23.0 + D * 1.3) * 0.2; }
void main() {
  vec2 q = vQ; float D = uDraw; float d = 1e3, core = 1e3;
  if (uKind < 0.5) {                       // 0 foam collar round the waterline (hull hides the inside)
    float a = atan(q.x, q.y * 0.35);
    float ext = q.y < 0.0 ? 3.75 : 4.05;
    float f = pow(pow(abs(q.x) / 1.32, 2.3) + pow(abs(q.y) / ext, 2.3), 1.0 / 2.3);
    float dh = (f - 1.0) * 1.32;
    float w = 0.34 + 0.1 * wob(a, D) + 0.22 * smoothstep(-2.2, -3.6, q.y) + 0.12 * smoothstep(2.8, 4.0, q.y);
    d = max(dh - w, -dh - 0.4);
    core = dh - w * 0.45;
  } else if (uKind < 1.5) {                // 1 drift wake: two arms off the stern, breaking into dots
    float L = 3.6;
    for (int s = 0; s < 2; s++) {
      float sg = s == 0 ? 1.0 : -1.0;
      vec2 a0 = vec2(sg * 1.05, 4.0), dir = normalize(vec2(sg * 0.36, 1.0));
      vec2 p = q - a0; float t = clamp(dot(p, dir) / L, 0.0, 1.0);
      float perp = dot(p, vec2(dir.y, -dir.x)) + 0.06 * sin(t * 11.0 + D * 2.0);
      float w = 0.2 * (1.0 - 0.55 * t);
      float da = length(vec2(max(abs(dot(p, dir) - L * 0.5 * 0.62) - L * 0.5 * 0.62, 0.0), perp)) - w;
      float along = dot(p, dir); float cell = along / 0.5 + D * 0.33;
      float r = 0.13 * (1.0 - t) + 0.03;
      float dd = length(vec2((fract(cell) - 0.5) * 0.5, perp)) - r;
      if (along > L * 0.62 && along < L) da = min(da, dd);
      d = min(d, da); core = min(core, da + w * 0.5);
    }
  } else if (uKind < 2.5) {                // 2 hull splash crown (camera-facing), 4 drawings
    vec2 b = vec2(0.0, 0.0);
    float len = D < 0.5 ? 0.24 : (D < 1.5 ? 0.5 : 0.36), lift = D < 1.5 ? 0.0 : 0.26, wd = D < 0.5 ? 0.1 : (D < 1.5 ? 0.085 : 0.07);
    for (int i = 0; i < 3; i++) {
      float an = (float(i) - 1.0) * 0.75; vec2 dir = vec2(sin(an), cos(an));
      float di = D < 2.5 ? ell(q, b + dir * (len * 0.5 + lift), vec2(wd, len * 0.5), -an) : length(q - (b + dir * 0.72)) - 0.06;
      d = min(d, di); core = min(core, di + wd * 0.45);
    }
    if (D < 0.5) { float base = ell(q, vec2(0.0, 0.02), vec2(0.42, 0.09), 0.0); d = min(d, base); core = min(core, base + 0.04); }
  } else if (uKind < 3.5) {                // 3 catch-pop ring: cream + Beacon Amber, breaks into 3 dots
    float r = length(q), an = atan(q.y, q.x);
    float R = D < 0.5 ? 0.0 : (D < 1.5 ? 0.5 : (D < 2.5 ? 0.75 : 0.9));
    if (D < 0.5) { d = r - 0.34; core = r - 0.2; }
    else if (D < 3.5) {
      float th = D < 1.5 ? 0.16 : (D < 2.5 ? 0.11 : 0.09);
      d = abs(r - R) - th; core = abs(r - R + th * 0.3) - th * 0.45;
      if (D > 2.5) { float g = abs(fract((an + 0.5) / 6.2832 * 3.0) - 0.5); d = max(d, 0.09 - g * 0.6); }
    } else {
      float rr = D < 4.5 ? 0.09 : 0.06, RR = D < 4.5 ? 1.0 : 1.1;
      for (int i = 0; i < 3; i++) { float a = float(i) * 2.094 + 0.5; float di = length(q - RR * vec2(cos(a), sin(a))) - rr; d = min(d, di); core = min(core, di + rr * 0.5); }
    }
  } else {                                 // 4 drizzle ripple ring on the water (3 drawings)
    float r = length(q * vec2(1.0, 1.0)); float R = 0.1 + 0.1 * D;
    d = abs(r - R) - 0.035; core = d + 0.02;
  }
  float px = max(1.0, 1.25 * rtH / 1080.0) * max(length(fwidth(vQ)) * 0.7071, 1e-5);   // metres per pixel from the smooth quad coords (fwidth(d) spikes at shape seams)
  if (d > px) discard;
  vec3 c = d > 0.0 ? uEdge : (core < 0.0 ? uCore : uTint);
  float dist = length(vP - cameraPosition);
  gl_FragColor = vec4(mix(c, hazeColor, celHazeNear), 1.0);
}`;

const FLAT_VERT = /* glsl */`
uniform vec3 uOrigin; uniform float uYaw, uLift, time; attribute vec3 iOff; varying vec2 vQ; varying vec3 vP;
${SWELL_GLSL}
void main() {
  vec2 l = position.xz + iOff.xy;
  float c = cos(uYaw), s = sin(uYaw);
  vec2 w = uOrigin.xz + vec2(c * l.x + s * l.y, -s * l.x + c * l.y);
  vec2 g; float h = swellH(w, time, g);
  vQ = position.xz * (iOff.z > 0.0 ? iOff.z : 1.0) ;
  vec3 p = vec3(w.x, h + uLift, w.y); vP = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const BILL_VERT = /* glsl */`
uniform vec3 uOrigin; uniform float uSize, uSpherical; varying vec2 vQ; varying vec3 vP;
void main() {
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  if (uSpherical < 0.5) { right = normalize(vec3(right.x, 0.0, right.z)); up = vec3(0.0, 1.0, 0.0); }
  vQ = position.xy;
  vec3 p = uOrigin + (right * position.x + up * position.y) * uSize; vP = p;
  vec4 cp = projectionMatrix * viewMatrix * vec4(p, 1.0);
  gl_Position = cp;
}`;

function sdfMat(kind, vert, o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uDraw: { value: 0 }, uKind: { value: kind }, rtH: CELU.rtH, hazeColor: CELU.hazeColor, celHazeNear: CELU.celHazeNear,
      uCore: { value: rgb(o.core || '#FFF6E3') }, uTint: { value: rgb(o.tint || '#6FC2C6') }, uEdge: { value: rgb(o.edge || '#33273B') },
      uOrigin: { value: new THREE.Vector3() }, uYaw: { value: 0 }, uLift: { value: o.lift ?? 0.07 }, uSize: { value: o.size || 1 }, uSpherical: { value: o.spherical ? 1 : 0 },
      time: U.time, swellA: U.swellA,
    },
    vertexShader: vert, fragmentShader: SDF_FRAG, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
}
function flatPlane(w, d, sx, sz, cx = 0, cz = 0) { const g = new THREE.PlaneGeometry(w, d, sx, sz); g.rotateX(-Math.PI / 2); g.translate(cx, 0, cz); g.setAttribute('iOff', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3)); return g; }

export function buildVFX(late) {
  const fx = {};
  // foam collar + drift wake follow the boat on the water
  fx.collar = new THREE.Mesh(flatPlane(4.4, 10.4, 22, 52), sdfMat(0, FLAT_VERT, { tint: '#6FC2C6', lift: 0.08 }));
  fx.wake = new THREE.Mesh(flatPlane(5.4, 5.0, 18, 18, 0, 6.0), sdfMat(1, FLAT_VERT, { tint: '#6FC2C6', lift: 0.07 }));
  // hull splash: camera-facing crown at the waterline (4 drawings, max 1 per 1.5 s)
  fx.splash = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.1).translate(0, 0.45, 0), sdfMat(2, BILL_VERT, { tint: '#6FC2C6', size: 1.25 }));
  // catch pop ring (6 drawings), cream + Beacon Amber
  fx.ring = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), sdfMat(3, BILL_VERT, { tint: '#FF9B21', size: 0.9, spherical: true }));
  for (const k of ['collar', 'wake', 'splash', 'ring']) { fx[k].frustumCulled = false; late.add(fx[k]); }
  fx.splash.visible = false; fx.ring.visible = false;

  // drizzle ripples: instanced flat rings near the boat, positions re-drawn per drawing (3-drawing loop)
  {
    const N = 70, base = new THREE.PlaneGeometry(0.8, 0.8); base.rotateX(-Math.PI / 2);
    const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.attributes.position = base.attributes.position;
    const off = new Float32Array(N * 3); g.setAttribute('iOff', new THREE.InstancedBufferAttribute(off, 3)); g.instanceCount = N;
    const m = sdfMat(4, FLAT_VERT, { core: '#E6EEF2', tint: '#E6EEF2', edge: '#6E6AA8', lift: 0.06 });
    fx.ripples = new THREE.Mesh(g, m); fx.ripples.frustumCulled = false; fx.ripples.visible = false; late.add(fx.ripples);
    fx.rippleOff = off; fx.rippleN = N;
  }
  // rain streaks: hard two-tone cards (#E6EEF2 + wisteria edge) in a camera-wrapped volume; behind every cel
  {
    const N = 620, base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.attributes.position = base.attributes.position;
    const R = (() => { let s = 99; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
    const mk = () => { const a = new Float32Array(N * 3); for (let i = 0; i < N; i++) a.set([R() * 40, R() * 26, R() * 40], i * 3); return new THREE.InstancedBufferAttribute(a, 3); };
    g.setAttribute('iA', mk()); g.setAttribute('iB', mk()); g.setAttribute('iC', mk()); g.instanceCount = N;
    const m = new THREE.ShaderMaterial({
      uniforms: { uDraw: { value: 0 }, uBox: { value: new THREE.Vector3(40, 26, 40) }, uFall: { value: new THREE.Vector3(0.28, -1, 0.12) }, uCore: { value: rgb('#E6EEF2') }, uEdge: { value: rgb('#6E6AA8') } },
      vertexShader: /* glsl */`attribute vec3 iA, iB, iC; uniform float uDraw; uniform vec3 uBox, uFall; varying float vU;
        void main() {
          vec3 o = uDraw < 0.5 ? iA : (uDraw < 1.5 ? iB : iC);
          vec3 c = cameraPosition;
          vec3 p = c + mod(o - c, uBox) - uBox * 0.5;
          vec3 axis = normalize(uFall), toCam = normalize(c - p), side = normalize(cross(axis, toCam));
          float dc = length(c - p);
          vec3 wp = p + axis * position.y * 0.7 + side * position.x * 0.03 * max(1.0, dc / 14.0);
          vU = position.x + 0.5;
          gl_Position = dc < 6.5 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * viewMatrix * vec4(wp, 1.0);
        }`,
      fragmentShader: /* glsl */`uniform vec3 uCore, uEdge; varying float vU; void main(){ gl_FragColor = vec4(vU < 0.38 ? uEdge : uCore, 1.0); }`,
      depthWrite: false,
    });
    fx.rain = new THREE.Mesh(g, m); fx.rain.frustumCulled = false; fx.rain.renderOrder = -5; fx.rain.visible = false; late.add(fx.rain);
    fx.rainN = N;
  }
  fx.mats = [fx.collar, fx.wake, fx.splash, fx.ring, fx.ripples, fx.rain].map((m) => m.material);
  return fx;
}
