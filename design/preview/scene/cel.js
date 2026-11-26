// Little Ocean preview - "ink what acts". Two-tone cel fill (hard antialiased terminator against a world-fixed,
// mostly overhead character key; lavender shade multiply), inverted-hull Aubergine Ink line sized in render-target
// pixels, soft Wisteria contact blob. Drawn after the paint post, so cels stay crisp over the painting.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import { rgb } from './phases.js';

export const INK = '#33273B';
/** Uniforms shared by every cel (phase key, render-target size, stepped cel haze). */
export const CELU = {
  keyDir: { value: new THREE.Vector3(-0.35, 0.906, 0.24).normalize() },
  litMul: { value: new THREE.Vector3(1, 1, 1) }, shadeMul: { value: new THREE.Vector3(0.82, 0.82, 0.88) },
  termOff: { value: 0 }, rtH: { value: 720 }, rtW: { value: 1280 }, ink: { value: rgb(INK) },
  hazeColor: { value: new THREE.Vector3(1, 1, 1) }, celHazeNear: { value: 0 }, celHazeFar: { value: 0.2 },
  stripeA: { value: rgb('#2F4C8A') }, stripeB: { value: rgb('#FAF4E6') },
};
/** Phase -> cel uniforms. lit = mix(1, key, 0.5); shade = mix(1, shadeColour, 0.26) * 0.96 * lit (skill, Characters). */
export function applyCelPhase(p) {
  CELU.keyDir.value.set(...p.catDir).normalize();
  const lit = new THREE.Vector3(1, 1, 1).lerp(rgb(p.catKey), 0.5);
  CELU.litMul.value.copy(lit);
  CELU.shadeMul.value.set(1, 1, 1).lerp(rgb(p.catShade), 0.26).multiplyScalar(0.96).multiply(lit);
  CELU.termOff.value = p.termOff; CELU.hazeColor.value.copy(rgb(p.haze));
  CELU.celHazeNear.value = p.celHazeNear; CELU.celHazeFar.value = p.celHazeFar;
}

const HAZE = /* glsl */`uniform vec3 hazeColor; uniform float celHazeNear, celHazeFar;
vec3 celHaze(vec3 c, vec3 p) { float d = length(p - cameraPosition); return mix(c, hazeColor, d > 120.0 ? celHazeFar : celHazeNear); }`;

/** Cel fill. Geometry: position, normal (flat face normal), color; optional stripe (0 = none, 1..2 = band coordinate). */
export function celFill(term = -0.06) {
  return new THREE.ShaderMaterial({
    uniforms: { ...CELU, term: { value: term } },
    vertexColors: true, side: THREE.DoubleSide,
    vertexShader: /* glsl */`attribute float stripe; varying vec3 vC; varying vec3 vN; varying vec3 vP; varying float vS;
      void main(){ vC = color; vS = stripe; vec4 wp = modelMatrix * vec4(position, 1.0); vP = wp.xyz; vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */`uniform vec3 keyDir, litMul, shadeMul, stripeA, stripeB; uniform float term, termOff; ${HAZE}
      varying vec3 vC; varying vec3 vN; varying vec3 vP; varying float vS;
      void main(){
        vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
        float ndl = dot(n, keyDir), t = term + termOff;
        float aa = max(fwidth(ndl) * 0.75, 1e-4);
        float sh = 1.0 - smoothstep(t - aa, t + aa, ndl);          // two tones, hard terminator
        vec3 base = vC;
        if (vS > 0.5) base = mod(floor((vS - 1.0) * 6.0), 2.0) > 0.5 ? stripeA : stripeB;   // Breton stripes: borderless flat bands
        gl_FragColor = vec4(celHaze(base * mix(litMul, shadeMul, sh), vP), 1.0);
      }`,
  });
}
/** Inverted hull: back faces pushed out along smoothN in clip space, width in render-target px (2.5 @1080p, top of 09 F1 range). */
export function celHull(widthPx = 2.5, lineScale) {
  return new THREE.ShaderMaterial({
    uniforms: { ...CELU, width: { value: widthPx }, lineScale: lineScale || { value: 1 } },
    side: THREE.BackSide,
    vertexShader: /* glsl */`uniform float width, rtH, rtW, lineScale; attribute vec3 smoothN; varying vec3 vP;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0); vP = wp.xyz;
        vec4 cp = projectionMatrix * viewMatrix * wp;
        vec3 nv = normalize(mat3(viewMatrix) * normalize(mat3(modelMatrix) * smoothN));
        vec2 res = vec2(rtW, rtH);
        vec2 dir = normalize(vec2(projectionMatrix[0][0] * nv.x, projectionMatrix[1][1] * nv.y) * res + 1e-6);
        float px = max(1.0, width * lineScale * rtH / 1080.0);
        cp.xy += dir * px * 2.0 / res * cp.w;
        gl_Position = cp;
      }`,
    fragmentShader: /* glsl */`uniform vec3 ink; ${HAZE} varying vec3 vP; void main(){ gl_FragColor = vec4(celHaze(ink, vP), 1.0); }`,
  });
}
/** Contact blob: feathered Shadow Wisteria ellipse at ~45%. */
export function blobMat(alpha = 0.45) {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: rgb('#6E6AA8') }, uAlpha: { value: alpha } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uCol; uniform float uAlpha; varying vec2 vUv; void main(){ float r = length(vUv); float a = uAlpha * (1.0 - smoothstep(0.45, 1.0, r)); if (a < 0.003) discard; gl_FragColor = vec4(uCol, a); }',
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  });
}
/** Thin ink line (fishing line): flat ink, hazed like the cels. */
export function inkLineMat() {
  return new THREE.ShaderMaterial({ uniforms: { ...CELU },
    vertexShader: 'varying vec3 vP; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: `uniform vec3 ink; ${HAZE} varying vec3 vP; void main(){ gl_FragColor = vec4(celHaze(ink, vP), 1.0); }` });
}

/**
 * A chamfered block (09: every crew block a separate shell with a 1-segment chamfer). Flat face normals for the fill;
 * smoothN = the chamfer-rounding direction, shared by coincident vertices, so the hull line stays even at corners.
 */
export function blockGeo(w, h, d, col, o = {}) {
  const g = new THREE.BoxGeometry(w, h, d, 2, 2, 2);
  const r = o.r ?? Math.min(w, h, d) * 0.18, P = g.attributes.position, n = P.count;
  const sm = new Float32Array(n * 3), cl = new Float32Array(n * 3), st = new Float32Array(n), c = rgb(col);
  const hx = w / 2, hy = h / 2, hz = d / 2, v = new THREE.Vector3(), inner = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(P, i);
    inner.set(THREE.MathUtils.clamp(v.x, -hx + r, hx - r), THREE.MathUtils.clamp(v.y, -hy + r, hy - r), THREE.MathUtils.clamp(v.z, -hz + r, hz - r));
    const dir = v.clone().sub(inner); const L = dir.length() || 1; dir.divideScalar(L);
    v.copy(inner).addScaledVector(dir, r * (L > 1e-6 ? 1 : 0)); if (L <= 1e-6) v.fromBufferAttribute(P, i);
    P.setXYZ(i, v.x, v.y, v.z);
    sm.set([dir.x, dir.y, dir.z], i * 3); cl.set([c.x, c.y, c.z], i * 3);
    st[i] = o.stripe ? 1 + (v.y + hy) / h : 0;
  }
  g.setAttribute('smoothN', new THREE.BufferAttribute(sm, 3));
  g.setAttribute('color', new THREE.BufferAttribute(cl, 3));
  g.setAttribute('stripe', new THREE.BufferAttribute(st, 1));
  return g;
}
/** Ellipsoid-gradient smooth normal for an arbitrary inked shape (hull line direction), plus a flat colour. */
export function inkPrep(g, col, centre, half) {
  const P = g.attributes.position, n = P.count, sm = new Float32Array(n * 3), st = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (P.getX(i) - centre[0]) / (half[0] * half[0]), y = (P.getY(i) - centre[1]) / (half[1] * half[1]), z = (P.getZ(i) - centre[2]) / (half[2] * half[2]);
    const l = Math.hypot(x, y, z) || 1; sm.set([x / l, y / l, z / l], i * 3);
  }
  g.setAttribute('smoothN', new THREE.BufferAttribute(sm, 3));
  if (col) { const c = rgb(col), cl = new Float32Array(n * 3); for (let i = 0; i < n; i++) cl.set([c.x, c.y, c.z], i * 3); g.setAttribute('color', new THREE.BufferAttribute(cl, 3)); }
  if (!g.attributes.stripe) g.setAttribute('stripe', new THREE.BufferAttribute(st, 1));
  return g;
}
/** Fill + ink pair as a group (each shell its own hull, so overlaps read as interior lines). */
export function inked(geo, fill, hull) {
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(geo, fill));
  if (hull) grp.add(new THREE.Mesh(geo, hull));
  return grp;
}
