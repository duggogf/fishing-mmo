// Little Ocean preview - the player's ~8 m boat (02), Coral Hull #E8553F (09 identity colour), inked cel:
// lofted hull (cream gunwale stripe, coral topsides, wood deck, cream bulwarks), cabin, mast + pennant,
// lifebuoy, fish crates. Boat-local: bow toward -Z, waterline y = 0, metres. Also builds the small unlined
// moored boats for the harbour (same loft, painted, no ink).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import { rgb } from './phases.js';
import { blockGeo, inkPrep, inked } from './cel.js';

export const CORAL = '#E8553F', CREAM = '#FFF6E3', DECK = '#C99A68', WOOD = '#B98656';
export const HULL = { L: 8, B: 1.35, tb: 0.1 };

const prof = (s, sc) => {
  const B = HULL.B * sc;
  const b = B * (s < 0.55 ? 1 - 0.14 * Math.pow(1 - s / 0.55, 2) : Math.pow(Math.max(0, Math.cos((s - 0.55) / 0.45 * Math.PI / 2)), 0.7));
  const g = (1.0 + 0.42 * s * s) * sc, k = (-0.55 + 0.45 * s * s * s) * sc, yd = g - 0.24 * sc;
  return { b, g, k, yd, z: (HULL.L / 2 - HULL.L * s) * sc };
};
/** Point lists per segment for one side (x >= 0) at station s. */
function segments(s, sc) {
  const { b, g, k, yd } = prof(s, sc), tb = Math.min(HULL.tb * sc, b);
  const bilge = []; for (let i = 0; i <= 6; i++) { const th = i / 6 * Math.PI / 2; bilge.push([b * 0.97 * Math.cos(th), 0.15 * sc - (0.15 * sc - k) * Math.sin(th)]); }
  return {
    deck: [[0, yd], [b - tb, yd]],
    bulwark: [[b - tb, yd], [b - tb, g]],
    cap: [[b - tb, g], [b, g]],
    stripe: [[b, g], [b * 0.99, g - 0.15 * sc]],
    topsides: [[b * 0.99, g - 0.15 * sc], [b * 0.98, (g - 0.15 * sc + 0.15 * sc) / 2], ...bilge],
  };
}
/**
 * Build hull geometries. Returns {outer, inner}: outer (cap, stripe, topsides, transom) is the inked shell,
 * inner (deck, bulwark) is fill only. colours: {deck, bulwark, cap, stripe, topsides}.
 */
export function hullGeometry(sc = 1, cols = {}, rings = 40) {
  const C = { deck: DECK, bulwark: CREAM, cap: CREAM, stripe: CREAM, topsides: CORAL, ...cols };
  const out = { outer: { pos: [], col: [], idx: [] }, inner: { pos: [], col: [], idx: [] } };
  const stations = []; for (let i = 0; i <= rings; i++) stations.push(i / rings);
  const names = ['deck', 'bulwark', 'cap', 'stripe', 'topsides'];
  for (const name of names) {
    const tgt = name === 'deck' || name === 'bulwark' ? out.inner : out.outer, c = rgb(C[name]);
    for (const side of [1, -1]) {
      const base = tgt.pos.length / 3; let npts = 0;
      for (const s of stations) {
        const z = prof(s, sc).z, pts = segments(s, sc)[name]; npts = pts.length;
        for (const [x, y] of pts) { tgt.pos.push(x * side, y, z); tgt.col.push(c.x, c.y, c.z); }
      }
      for (let i = 0; i < rings; i++) for (let j = 0; j < npts - 1; j++) {
        const a = base + i * npts + j, b = a + 1, cc = a + npts, d = cc + 1;
        if (side > 0) tgt.idx.push(a, cc, b, b, cc, d); else tgt.idx.push(a, b, cc, b, d, cc);
      }
    }
  }
  // transom at s = 0 (facing +Z): fan from the section centre
  {
    const tgt = out.outer, c = rgb(C.topsides), seg = segments(0, sc), p0 = prof(0, sc);
    const ring = []; for (const n of ['cap', 'stripe', 'topsides']) for (const q of seg[n]) ring.push(q);
    const full = [[0, p0.g], ...ring, ...ring.slice().reverse().map(([x, y]) => [-x, y])];   // full-height transom plate
    const base = tgt.pos.length / 3; tgt.pos.push(0, (p0.g + p0.k) / 2, p0.z); tgt.col.push(c.x, c.y, c.z);
    for (const [x, y] of full) { tgt.pos.push(x, y, p0.z); tgt.col.push(c.x, c.y, c.z); }
    for (let i = 0; i < full.length; i++) tgt.idx.push(base, base + 1 + i, base + 1 + ((i + 1) % full.length));
  }
  const mk = (o) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(o.pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(o.col, 3)); g.setIndex(o.idx); return g; };
  const outer = mk(out.outer), inner = mk(out.inner);
  // orient every outer triangle outward (ellipsoid test), then flat-ish normals per segment
  const cen = [0, 0.35 * sc, 0], half = [1.45 * sc, 0.95 * sc, 4.1 * sc];
  inkPrep(outer, null, cen, half); inkPrep(inner, null, cen, half);
  const P = outer.attributes.position, I = outer.index.array, A = new THREE.Vector3(), B = new THREE.Vector3(), Cc = new THREE.Vector3(), n = new THREE.Vector3(), m = new THREE.Vector3();
  for (let t = 0; t < I.length; t += 3) {
    A.fromBufferAttribute(P, I[t]); B.fromBufferAttribute(P, I[t + 1]); Cc.fromBufferAttribute(P, I[t + 2]);
    n.subVectors(B, A).cross(m.subVectors(Cc, A));
    const ctr = A.clone().add(B).add(Cc).divideScalar(3);
    const e = new THREE.Vector3((ctr.x - cen[0]) / half[0] ** 2, (ctr.y - cen[1]) / half[1] ** 2, (ctr.z - cen[2]) / half[2] ** 2);
    if (n.dot(e) < 0) { const tmp = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = tmp; }
  }
  outer.computeVertexNormals(); inner.computeVertexNormals();
  return { outer, inner };
}

/** The player's boat (inked). Returns {group, deckY(z), stations, pennant} */
export function buildBoat(fillBoat, fillProp, hull) {
  const group = new THREE.Group(); group.name = 'boat';
  const { outer, inner } = hullGeometry(1);
  group.add(inked(outer, fillBoat, hull));
  group.add(new THREE.Mesh(inner, fillBoat));
  const deckY = (z) => prof((HULL.L / 2 - z) / HULL.L, 1).yd;
  const add = (geo, x, y, z, ink = true, ry = 0) => { const m = inked(geo, fillProp, ink ? hull : null); m.position.set(x, y, z); m.rotation.y = ry; group.add(m); return m; };
  // cabin (wheelhouse) forward of the working deck
  const cz = -0.7, cy = deckY(cz);
  add(blockGeo(1.5, 1.2, 1.9, CREAM, { r: 0.05 }), 0, cy + 0.6, cz);
  add(blockGeo(1.78, 0.13, 2.2, CORAL, { r: 0.04 }), 0, cy + 1.26, cz + 0.05);
  // windows: flat panes on an inked object (detail, no own line)
  const pane = (w, h, x, y, z, ry) => { const m = new THREE.Mesh(blockGeo(w, h, 0.03, '#3E5A78', { r: 0.008 }), fillProp); m.position.set(x, y, z); m.rotation.y = ry; group.add(m); };
  pane(0.52, 0.42, -0.36, cy + 0.82, cz - 0.965, 0); pane(0.52, 0.42, 0.36, cy + 0.82, cz - 0.965, 0);
  pane(0.6, 0.38, 0.765, cy + 0.84, cz - 0.25, Math.PI / 2); pane(0.6, 0.38, -0.765, cy + 0.84, cz - 0.25, Math.PI / 2);
  pane(0.5, 0.36, 0, cy + 0.84, cz + 0.965, 0);
  // mast, crossbar
  add(blockGeo(0.09, 2.7, 0.09, WOOD, { r: 0.02 }), 0, cy + 1.32 + 1.35, cz - 0.4);
  add(blockGeo(1.1, 0.07, 0.07, WOOD, { r: 0.015 }), 0, cy + 3.2, cz - 0.4);
  // pennant: a flat coral wedge, flaps on twos (3 drawings)
  const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0, -0.34), new THREE.Vector2(0.78, -0.15)]);
  const pg = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false }); pg.translate(0, 0, -0.015);
  inkPrep(pg, CORAL, [0.26, -0.16, 0], [0.4, 0.2, 0.25]);
  const pennant = inked(pg, fillProp, hull); pennant.position.set(0, cy + 4.0, cz - 0.4); pennant.rotation.y = Math.PI * 0.5; group.add(pennant);
  // lifebuoy on the cabin side
  const tg = new THREE.TorusGeometry(0.26, 0.075, 8, 18); inkPrep(tg, CREAM, [0, 0, 0], [0.33, 0.33, 0.08]); tg.setAttribute('smoothN', tg.attributes.normal.clone());
  const lb = add(tg, 0.79, cy + 0.62, cz + 0.35); lb.rotation.y = Math.PI / 2;
  // fish crates on the aft deck
  add(blockGeo(0.56, 0.3, 0.42, WOOD, { r: 0.03 }), 0.6, deckY(2.4) + 0.15, 2.4);
  add(blockGeo(0.56, 0.3, 0.42, '#A9784C', { r: 0.03 }), 0.58, deckY(2.4) + 0.45, 2.38, true, 0.25);
  add(blockGeo(0.56, 0.3, 0.42, WOOD, { r: 0.03 }), 0.62, deckY(1.8) + 0.15, 1.85, true, -0.1);
  return { group, deckY, pennant };
}

/** Painted moored dinghy for the harbour (unlined StaysLayer, sways). */
export function mooredBoatGeo(sc, hullCol) {
  const { outer, inner } = hullGeometry(sc, { topsides: hullCol, stripe: '#EFE6D2', cap: '#EFE6D2', bulwark: '#E4DCC8', deck: '#B98656' }, 20);
  const g = new THREE.BufferGeometry();
  const merge = (a, b, name, n) => { const A = a.attributes[name].array, B = b.attributes[name].array, o = new Float32Array(A.length + B.length); o.set(A); o.set(B, A.length); g.setAttribute(name, new THREE.BufferAttribute(o, n)); };
  merge(outer, inner, 'position', 3); merge(outer, inner, 'normal', 3); merge(outer, inner, 'color', 3);
  const off = outer.attributes.position.count; g.setIndex([...outer.index.array, ...Array.from(inner.index.array, (i) => i + off)]);
  const uv = new Float32Array(g.attributes.position.count * 2); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
