// PROTOTYPE - NOT FOR PRODUCTION (forked from design/preview/scene)
// Little Ocean preview - crew (09 rule 5): faceless chunky block dummies (block head, torso, upper/lower limbs),
// each block its own inked shell with a 1-segment chamfer, 3 flat colours (body / shirt / pants), no face.
// Mabel (stern-left, wide torso, hand-net, 6 drawings), Pip (bow-right, tall beanie, rod bob-and-wait,
// 4 drawings + 2-pose hold), Tomo (mid-left, flat cap brim, Breton stripes, hand-line, 5 drawings).
// Poses are drawings held on twos (12 per second); the timing is stepped on simulation time.
import * as THREE from '../vendor/three.module.js';
import { blockGeo, inked } from './cel.js';

export const CREW = {
  Mabel: { body: '#8E5A40', shirt: '#D63F7C', pants: '#5A6B8C', torsoW: 1.3, legK: 0.8 },
  Pip: { body: '#F6D2AE', shirt: '#86C445', pants: '#4F79B0', beanie: true },
  Tomo: { body: '#C0906A', shirt: '#FAF4E6', pants: '#D8C49A', stripes: true, brim: true },
};

/** Build one dummy. Local: faces +Z, feet at y = 0. Returns {root, J (joints), hand(R/L) groups}. */
export function buildDummy(spec, fill, hull) {
  const gap = 0.022, headS = 0.28, torsoH = 0.4, torsoW = 0.32 * (spec.torsoW || 1), torsoD = 0.2;
  const legL = 0.16 * (spec.legK || 1), legW = 0.12, armL = 0.17, armW = 0.095;
  const root = new THREE.Group(), J = {};
  const blk = (parent, w, h, d, col, y, o) => { const m = inked(blockGeo(w, h, d, col, o), fill, hull); m.position.y = y; parent.add(m); return m; };
  const pivot = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const hipY = legL * 2 + gap * 2;
  J.hips = pivot(root, 0, hipY, 0);
  for (const s of [1, -1]) {
    const k = s > 0 ? 'L' : 'R';
    J['hip' + k] = pivot(J.hips, s * 0.075 * (spec.torsoW || 1), -gap * 0.5, 0);
    blk(J['hip' + k], legW, legL, 0.13, spec.pants, -legL / 2);
    J['knee' + k] = pivot(J['hip' + k], 0, -legL - gap, 0);
    blk(J['knee' + k], legW, legL, 0.13, spec.pants, -legL / 2);
  }
  J.torso = pivot(J.hips, 0, gap * 0.5, 0);
  blk(J.torso, torsoW, torsoH, torsoD, spec.stripes ? '#FAF4E6' : spec.shirt, torsoH / 2, { stripe: !!spec.stripes });
  J.neck = pivot(J.torso, 0, torsoH + gap, 0);
  blk(J.neck, headS, headS, headS, spec.body, headS / 2);
  if (spec.beanie) blk(J.neck, 0.2, 0.18, 0.2, spec.shirt, headS + 0.09 + 0.004);
  if (spec.brim) { blk(J.neck, 0.3, 0.07, 0.3, '#2F4C8A', headS + 0.035 + 0.004); const b = blk(J.neck, 0.36, 0.04, 0.36, '#2F4C8A', headS + 0.004); b.position.z = 0.07; }
  for (const s of [1, -1]) {
    const k = s > 0 ? 'L' : 'R';
    J['sh' + k] = pivot(J.torso, s * (torsoW / 2 + armW / 2 + gap), torsoH - 0.05, 0);
    blk(J['sh' + k], armW, armL, armW, spec.stripes ? '#FAF4E6' : spec.shirt, -armL / 2, { stripe: !!spec.stripes });
    J['el' + k] = pivot(J['sh' + k], 0, -armL - gap, 0);
    blk(J['el' + k], armW * 0.95, armL, armW * 0.95, spec.body, -armL / 2);
    J['hand' + k] = pivot(J['el' + k], 0, -armL, 0);
  }
  return { root, J, hipY };
}

/* ---- poses: {y, tx, ty, hx, hy, L:[shoulder fwd, shoulder out, elbow], R:[...], lL:[hip fwd, knee], lR:[...]} */
const P = (o) => ({ y: 0, tx: 0, ty: 0, hx: 0, hy: 0, L: [0.15, 0.08, 0.2], R: [0.15, 0.08, 0.2], lL: [0, 0], lR: [0, 0], tool: 0, ...o });
export function applyPose(d, p) {
  const J = d.J;
  J.hips.position.y = d.hipY + p.y;
  J.torso.rotation.set(p.tx, p.ty, 0); J.neck.rotation.set(p.hx, p.hy, 0);
  for (const [k, s] of [['L', 1], ['R', -1]]) {
    const a = p[k]; J['sh' + k].rotation.set(-a[0], 0, s * a[1]); J['el' + k].rotation.set(-a[2], 0, 0);
    const l = p['l' + k]; J['hip' + k].rotation.set(-l[0], 0, 0); J['knee' + k].rotation.set(l[1], 0, 0);
  }
}

// Each drawing: [pose, hold in twos (1 = 1/12 s)]. Loops.
export const TIMING = {
  Pip: [ // rod: 2-pose breathing hold, then the 4-drawing bob-and-wait (flick on drawing 2 = catch-pop sync point)
    [P({ tx: 0.06, hx: 0.12, R: [1.05, 0.1, 0.55], L: [0.85, -0.18, 0.95], lL: [0.12, 0.12], lR: [-0.08, 0.05] }), 8],
    [P({ y: -0.012, tx: 0.1, hx: 0.16, hy: 0.25, R: [1.0, 0.1, 0.6], L: [0.8, -0.18, 1.0], lL: [0.14, 0.16], lR: [-0.08, 0.08] }), 8],
    [P({ tx: 0.06, hx: 0.12, R: [1.05, 0.1, 0.55], L: [0.85, -0.18, 0.95], lL: [0.12, 0.12], lR: [-0.08, 0.05] }), 8],
    [P({ y: -0.012, tx: 0.1, hx: 0.16, hy: -0.2, R: [1.0, 0.1, 0.6], L: [0.8, -0.18, 1.0], lL: [0.14, 0.16], lR: [-0.08, 0.08] }), 8],
    [P({ tx: 0.12, hx: 0.2, R: [0.75, 0.1, 0.35], L: [0.65, -0.18, 0.7], lL: [0.12, 0.15], lR: [-0.06, 0.05], tool: 1 }), 3],
    [P({ tx: -0.12, hx: -0.1, R: [1.7, 0.12, 1.0], L: [1.4, -0.2, 1.3], lL: [0.25, 0.3], lR: [-0.12, 0.05], tool: 2 }), 3],
    [P({ tx: -0.06, hx: 0.0, R: [1.5, 0.1, 0.8], L: [1.2, -0.18, 1.1], lL: [0.2, 0.25], lR: [-0.1, 0.05], tool: 2 }), 4],
    [P({ tx: 0.04, hx: 0.1, R: [1.1, 0.1, 0.6], L: [0.9, -0.18, 0.95], lL: [0.14, 0.14], lR: [-0.08, 0.05] }), 6],
  ],
  Mabel: [ // hand-net over the rail: reach, scoop, haul, lift, swing in, tip; then a 2-pose breathing hold
    [P({ y: -0.05, tx: 0.65, hx: 0.2, R: [1.25, 0.05, 0.2], L: [1.05, -0.05, 0.4], lL: [0.35, 0.45], lR: [-0.1, 0.2] }), 4],
    [P({ y: -0.06, tx: 0.75, hx: 0.25, R: [1.05, 0.05, 0.15], L: [0.9, -0.05, 0.3], lL: [0.4, 0.5], lR: [-0.1, 0.25] }), 3],
    [P({ y: -0.03, tx: 0.35, hx: 0.05, R: [1.6, 0.05, 0.7], L: [1.4, -0.05, 0.9], lL: [0.25, 0.3], lR: [-0.05, 0.1] }), 3],
    [P({ y: 0.0, tx: -0.08, hx: -0.15, R: [2.4, 0.1, 0.5], L: [2.2, -0.1, 0.7], lL: [0.1, 0.05], lR: [0, 0.05] }), 4],
    [P({ y: 0.0, tx: 0.0, ty: 0.7, hx: 0.0, R: [2.0, 0.1, 0.7], L: [1.8, -0.1, 0.9], lL: [0.1, 0.05], lR: [0, 0.05] }), 3],
    [P({ y: -0.02, tx: 0.2, ty: 1.0, hx: 0.25, R: [1.4, 0.1, 0.4], L: [1.3, -0.1, 0.6], lL: [0.15, 0.1], lR: [0, 0.1] }), 5],
    [P({ tx: 0.05, ty: 0.2, hx: 0.05, hy: -0.4, R: [0.9, 0.05, 0.6], L: [0.8, -0.05, 0.7], lL: [0.08, 0.05], lR: [-0.05, 0.05] }), 9],
    [P({ y: -0.012, tx: 0.08, ty: 0.15, hx: 0.08, hy: -0.55, R: [0.85, 0.05, 0.65], L: [0.75, -0.05, 0.75], lL: [0.08, 0.08], lR: [-0.05, 0.08] }), 9],
  ],
  Tomo: [ // hand-line over the side: hand over hand, 5 drawings, plus a look at the horizon
    [P({ tx: 0.3, hx: 0.25, R: [1.3, 0.05, 0.3], L: [0.7, -0.05, 1.2], lL: [0.2, 0.3], lR: [-0.05, 0.15] }), 3],
    [P({ tx: 0.22, hx: 0.2, R: [0.7, 0.1, 1.3], L: [1.0, -0.05, 0.8], lL: [0.2, 0.3], lR: [-0.05, 0.15] }), 3],
    [P({ tx: 0.28, hx: 0.22, R: [0.9, 0.08, 1.0], L: [1.35, -0.05, 0.3], lL: [0.2, 0.3], lR: [-0.05, 0.15] }), 3],
    [P({ tx: 0.22, hx: 0.2, R: [1.25, 0.05, 0.35], L: [0.75, -0.08, 1.25], lL: [0.2, 0.3], lR: [-0.05, 0.15] }), 3],
    [P({ tx: 0.12, hx: -0.05, hy: 0.5, R: [1.0, 0.05, 0.6], L: [0.9, -0.05, 0.7], lL: [0.15, 0.2], lR: [-0.05, 0.1] }), 10],
  ],
};

/** Stepped player: which drawing is up at sim time t (seconds), on twos. Returns {i, start (s), len (s)}. */
export function drawingAt(timing, t, offset = 0) {
  const total = timing.reduce((a, d) => a + d[1], 0);
  let k = Math.floor((t + offset) * 12) % total; if (k < 0) k += total;
  const loop = Math.floor((t + offset) * 12 / total);
  for (let i = 0; i < timing.length; i++) { if (k < timing[i][1]) return { i, loop }; k -= timing[i][1]; }
  return { i: 0, loop };
}
