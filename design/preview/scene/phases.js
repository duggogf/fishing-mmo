// Little Ocean preview - LightPhase keys (09 §4). Sky / key / shadow / cloud / glow / character-key values are
// the painted-cel skill's Day and Dusk tables, unchanged; the ocean fields (water key, glint, haze in metres,
// cel haze) and the R2 Drizzle overlay are 09's. Colours are raw sRGB numbers end to end (no colour management).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';

export const PHASES = {
  day: {
    zenith: '#3F9BE6', horizon: '#A9DBF5', key: '#FFFBEF', shadow: '#6E6AA8',
    sunEl: 58, sunAz: -62,               // degrees; azimuth 0 = north (-Z), +90 = east (+X)
    shadeK: 0.6, shadowTint: '#6F6CC4',
    bounce: '#FFD9A0', bounceK: 0.22,
    haze: '#D6ECF6', hazeMax: 0.62, hazeNear: 60, hazeFar: 900,
    cloudLight: '#FFFFFF', cloudShade: '#C9D8F0', backdropKey: '#FFFFFF',
    sunGlow: '#FFF6D8', sunGlowK: 0.55,
    catKey: '#FFFBEF', catShade: '#6E6AA8', catDir: [-0.35, 0.906, 0.24], termOff: 0.0,
    windowGlow: 0, seaGlow: '#FFF6DE', seaGlowK: 0, vertLift: 0.5,
    waterKey: '#FFFFFF', glint: '#FFF6E3', glintK: 0.35, waterSat: 1,
    celHazeNear: 0, celHazeFar: 0.2,
  },
  dusk: {
    zenith: '#8E6FB0', horizon: '#F7A45A', key: '#FFC27A', shadow: '#7A4E8C',
    sunEl: 16, sunAz: 3,
    shadeK: 0.62, shadowTint: '#7A4E8C',
    bounce: '#FFB070', bounceK: 0.2,
    haze: '#F4B98C', hazeMax: 0.7, hazeNear: 50, hazeFar: 800,
    cloudLight: '#FFD9A6', cloudShade: '#B88FBE', backdropKey: '#FFD2A0',
    sunGlow: '#FFE0A0', sunGlowK: 0.9,
    catKey: '#FFC27A', catShade: '#7A4E8C', catDir: [0.45, 0.8, 0.3], termOff: 0.04,
    windowGlow: 0.9, seaGlow: '#FFD79A', seaGlowK: 0, vertLift: 0.35,
    waterKey: '#FFD2A8', glint: '#FFD98A', glintK: 0.5, waterSat: 1,
    celHazeNear: 0, celHazeFar: 0.25,
  },
};

/** R2 Drizzle overlay (09 §4): cooler water key, -10% water saturation, overcast sky lerp, lighter haze. */
export function withDrizzle(p, w) {
  if (w <= 0) return p;
  const o = { ...p }, L = (a, b, k) => lerpHex(a, b, k);
  o.zenith = L(p.zenith, '#9DB6CC', 0.4 * w); o.horizon = L(p.horizon, '#D9E3EA', 0.4 * w);
  o.haze = L(p.haze, '#C8D6E0', w); o.hazeNear = p.hazeNear + (40 - p.hazeNear) * w; o.hazeFar = p.hazeFar + (500 - p.hazeFar) * w;
  o.hazeMax = p.hazeMax + (0.6 - p.hazeMax) * w;
  o.waterKey = L(p.waterKey, '#E6EEF2', w); o.waterSat = 1 - 0.1 * w; o.glintK = p.glintK * (1 - w);
  o.cloudLight = L(p.cloudLight, '#E4E9EE', 0.6 * w); o.cloudShade = L(p.cloudShade, '#9EABBC', 0.6 * w);
  o.sunGlowK = p.sunGlowK * (1 - 0.8 * w); o.key = L(p.key, '#E6EEF2', 0.5 * w); o.catKey = L(p.catKey, '#E6EEF2', 0.5 * w);
  o.backdropKey = L(p.backdropKey, '#D9E3EA', 0.5 * w);
  o.celHazeNear = p.celHazeNear + (0.1 - p.celHazeNear) * w; o.celHazeFar = p.celHazeFar + (0.3 - p.celHazeFar) * w;
  return o;
}

/** Phase between two keys: colours lerp in sRGB, numbers and directions lerp. */
export function mixPhase(a, b, k) {
  const A = PHASES[a] || a, B = PHASES[b] || b, o = {};
  for (const key of Object.keys(A)) {
    const x = A[key], y = B[key] ?? x;
    if (typeof x === 'string' && x[0] === '#') o[key] = lerpHex(x, y, k);
    else if (typeof x === 'number') o[key] = x + (y - x) * k;
    else if (Array.isArray(x)) o[key] = x.map((v, i) => v + (y[i] - v) * k);
    else o[key] = k < 0.5 ? x : y;
  }
  return o;
}
export function lerpHex(a, b, k) {
  const p = rgb(a), q = rgb(b); p.lerp(q, k);
  return '#' + [p.x, p.y, p.z].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
}
/** Raw sRGB triple (no colour management) for shader uniforms. */
export function rgb(hex) { const n = parseInt(hex.slice(1), 16); return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); }
/** Direction toward the sun (world). */
export function sunDir(ph) {
  const el = THREE.MathUtils.degToRad(ph.sunEl), az = THREE.MathUtils.degToRad(ph.sunAz);
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
}

/* ---- the sea: 3 summed sine swells, rolling south (+Z) toward the shore. Same function on CPU (boat bob) and GPU. */
export const WAVES = [ // dir (x,z) unit, wavelength m, relative amplitude, phase
  { d: [0.16, 0.987], L: 62, a: 0.58, p: 0.0 },
  { d: [-0.42, 0.907], L: 34, a: 0.3, p: 1.7 },
  { d: [0.62, 0.785], L: 19, a: 0.12, p: 4.1 },
];
WAVES.forEach((w) => { w.k = 2 * Math.PI / w.L; w.w = Math.sqrt(9.81 * w.k) * 0.8; });
export function swellH(x, z, t, A) {
  let h = 0, r = Math.hypot(x, z);
  for (const w of WAVES) { const att = 1 - smooth(3 * w.L, 6 * w.L, r); h += w.a * att * Math.sin(w.k * (w.d[0] * x + w.d[1] * z) - w.w * t + w.p); }
  return h * A;
}
function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
export const SWELL_GLSL = /* glsl */`
uniform float swellA;
float swellH(vec2 xz, float t, out vec2 g) {
  float h = 0.0; g = vec2(0.0); float r = length(xz);
${WAVES.map((w) => `  { float att = 1.0 - smoothstep(${(3 * w.L).toFixed(1)}, ${(6 * w.L).toFixed(1)}, r); vec2 d = vec2(${w.d[0]}, ${w.d[1]});
    float ph = ${w.k.toFixed(5)} * dot(d, xz) - ${w.w.toFixed(5)} * t + ${w.p.toFixed(3)};
    h += ${w.a} * att * sin(ph); g += ${w.a} * att * cos(ph) * ${w.k.toFixed(5)} * d; }`).join('\n')}
  g *= swellA; return h * swellA;
}`;
