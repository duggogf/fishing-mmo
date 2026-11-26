// PROTOTYPE - NOT FOR PRODUCTION
// Little Ocean — feel prototype. Sailing 3C, automatic fishing, selling, exploration; juice first (juice-bible.md).
// Rendering reuses the GDD preview's painted-cel scene (scene/, forked). Tuning lives in config.js (window.CONFIG).
import * as THREE from './vendor/three.module.js';
import { mixPhase, withDrizzle, swellH, calm } from './scene/phases.js';
import { U, applyPhase, SunShadow, envMat } from './scene/env.js';
import { PaintPost } from './scene/post.js';
import { bakeAll } from './scene/paint.js';
import { CELU, applyCelPhase, celFill, celHull, blobMat, inkLineMat, blockGeo, inkPrep, inked } from './scene/cel.js';
import { buildBoat } from './scene/boat.js';
import { CREW, buildDummy, applyPose, TIMING, drawingAt } from './scene/crew.js';
import { buildVFX } from './scene/vfx.js';
import { buildWorld } from './scene/harbour.js';
import { makeRng, follow, Sound, Particles, pop, press, shine, flyTo, countUp, sleep, ease } from './juice.js';

const C = window.C, rng = makeRng(window.CONFIG.seed);
const $ = (id) => document.getElementById(id);
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/* ============================================================ icons (24 grid, line) */
const PATHS = {
  fish: '<path d="M3 12c3-4.5 9-5.5 14-2l3-3v10l-3-3c-5 3.5-11 2.5-14-2z"/><circle cx="14.5" cy="11" r=".9" fill="currentColor" stroke="none"/>',
  shell: '<path d="M12 20 4.6 13.6C2.6 10 4.6 5 12 5s9.4 5 7.4 8.6Z"/><path d="M12 20V6.2M12 20 8.4 6.8M12 20l3.6-13.2"/>',
  box: '<path d="M4.5 9h15v10.5h-15z"/><path d="M3 9h18l-1.8-3.5H4.8zM10 12.5h4"/>',
  anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v13M7.5 11h9M4.5 14.5C5.5 18 8.5 20 12 20s6.5-2 7.5-5.5"/>',
  light: '<path d="M9.5 21 10.6 9h2.8l1.1 12zM9 9h6M10.8 9V6.2h2.4V9M7.5 5.5 5.5 4.5M16.5 5.5l2-1M3 21h18"/>',
  rock: '<path d="M3 18.5 7.2 11l3 2.8 4-6.3 6.8 11z"/>',
  wreck: '<path d="M3 17h13l3-5H6.5zM9 12V6l5 4"/><path d="M2 20.5c2-1.3 4-1.3 6 0s4 1.3 6 0 4-1.3 6 0" stroke-width="1.6"/>',
  arch: '<path d="M3 20V11c0-4 4-7 9-7s9 3 9 7v9h-5v-7a4 4 0 0 0-8 0v7z"/>',
  bell: '<path d="M6.5 16.5c1-1 1.5-3 1.5-6a4 4 0 0 1 8 0c0 3 .5 5 1.5 6zM11 19.5h2M12 4V2.5"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
  dusk: '<path d="M7 16a5 5 0 0 1 10 0M3 16h18M5 20h14M12 6.5v2.5M6 9.5l1.6 1.6M18 9.5l-1.6 1.6"/>',
  cloud: '<path d="M7 18h10.5a3.8 3.8 0 0 0 .4-7.6A5.5 5.5 0 0 0 7.4 9.2 4.4 4.4 0 0 0 7 18z"/>',
  rain: '<path d="M7 14h10.5a3.5 3.5 0 0 0 .4-7A5 5 0 0 0 7.4 6 4 4 0 0 0 7 14zM8 17l-1 3M12 17l-1 3M16 17l-1 3"/>',
  sound: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4zM16 9.5l5 5M21 9.5l-5 5"/>',
  back: '<path d="M14.5 6 8.5 12l6 6"/>',
  journal: '<path d="M5 18.5V6a2.5 2.5 0 0 1 2.5-2.5H19v13.2H7.5A2.5 2.5 0 0 0 5 19.2a2.5 2.5 0 0 0 2.5 2.3H19"/>',
};
const ic = (n, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${PATHS[n]}</svg>`;

/* ============================================================ data (GDD 04 species; prototype world layout) */
const SPECIES = [
  // id, name, region, rarity(0 common,1 uncommon,2 plus), weight, value, size cm [min,max], colour [body, belly]
  ['SandSprat', 'Sand sprat', 1, 0, 40, 2, [8, 14], '#B9C6CF', '#F1EBDD'],
  ['HarbourMackerel', 'Harbour mackerel', 1, 0, 30, 3, [22, 36], '#5F86AD', '#EEE8D6'],
  ['BlueWrasse', 'Blue wrasse', 1, 0, 15, 5, [18, 30], '#4F79B0', '#9FD8D6'],
  ['RibbonEel', 'Ribbon eel', 1, 1, 8, 8, [40, 75], '#8E6FB0', '#E2D6EE'],
  ['SunFlounder', 'Sun flounder', 1, 1, 5, 12, [28, 46], '#E0A458', '#FFF1D2'],
  ['LanternPuffer', 'Lantern puffer', 1, 2, 2, 25, [16, 26], '#F7CF4A', '#FFF6E3'],
  ['SwellBream', 'Swell bream', 2, 0, 35, 5, [26, 40], '#7A93A8', '#E8ECEE'],
  ['KelpPollock', 'Kelp pollock', 2, 0, 30, 6, [35, 60], '#6E8B5E', '#E6EBD8'],
  ['StripeBonito', 'Stripe bonito', 2, 0, 20, 8, [40, 70], '#3E5F7E', '#DDE6EE'],
  ['MoonSnapper', 'Moon snapper', 2, 1, 10, 13, [30, 55], '#D6705E', '#FBE3DA'],
  ['GlassSquid', 'Glass squid', 2, 1, 4, 20, [25, 45], '#BFD8E6', '#FFFFFF'],
  ['PearlTuna', 'Pearl tuna', 2, 2, 1, 40, [90, 160], '#4C6E9C', '#F3EEF8'],
].map(([id, name, region, rarity, w, value, size, col, belly]) => ({ id, name, region, rarity, w, value, size, col, belly }));
const RARITY = ['Common', 'Uncommon', 'Rare find'];

// world: +x is "north" (out to sea from the west-coast harbour), +z is "east". Positions in metres.
const DOCKS = [
  { id: 'fish', name: 'Fishmonger', pos: [-31, -33], r: 10, label: 'Fishmonger' },
  { id: 'yard', name: 'Shipyard', pos: [-40.5, -8], r: 8, label: 'Shipyard' },
];
const PLACES = [
  { id: 'gull', name: 'Gull Point Lighthouse', short: 'Gull Point', pos: [-4, 150], icon: 'light', top: 24 },
  { id: 'wreck', name: 'Wreck of the Marigold', short: 'Marigold wreck', pos: [150, -78], icon: 'wreck', top: 9 },
  { id: 'turtle', name: 'Turtle Rock', short: 'Turtle Rock', pos: [272, 205], icon: 'rock', top: 11 },
  { id: 'arch', name: 'Thunder Arch', short: 'Thunder Arch', pos: [520, -190], icon: 'arch', top: 30 },
  { id: 'bell', name: 'Lantern Bell Buoy', short: 'Bell Buoy', pos: [600, 95], icon: 'bell', top: 5 },
];
const SPOTS = [[92, 28], [205, -150], [190, 140], [470, -40], [575, 215]];
const BOUNDS = { x0: -44, x1: 690, z0: -330, z1: 330 };
const HARBOUR = [-40, -20];

/* ============================================================ renderer + scenes */
const host = $('game');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: /capture/.test(location.search) });
renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
host.appendChild(renderer.domElement);
const cam = new THREE.PerspectiveCamera(C('fovBase'), 16 / 9, 0.1, 3200);
const env = new THREE.Scene(), late = new THREE.Scene();
const T = bakeAll(); U.grainMap.value = T.grain; U.swellA.value = C('swellShallows');
const world = buildWorld(env, T);
const post = new PaintPost(T.grain);
const shadow = new SunShadow(1024, 75); shadow.target.set(-52, 0, -38);
const fx = buildVFX(late);
const fillCrew = celFill(-0.30), fillBoat = celFill(-0.42), fillProp = celFill(-0.12);
const hull = celHull(2.5), hullSmall = celHull(2.5, { value: 0.4 });

/* ---------- boat + crew */
const boat = buildBoat(fillBoat, fillProp, hull); late.add(boat.group);
const boatBlob = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 10.5), blobMat(0.45)); boatBlob.rotation.x = -Math.PI / 2; late.add(boatBlob);
const STATIONS = { Mabel: [-0.7, 2.75, -Math.PI / 2 - 0.15, 0.0, [-2.5, 3.2]], Tomo: [-0.78, 1.05, -Math.PI / 2 + 0.12, 0.9, [-2.6, 0.7]], Pip: [0.52, -2.55, 2.05, 0.45, [4.4, -6.2]] };
const crew = {};
const P = (o) => ({ y: 0, tx: 0, ty: 0, hx: 0, hy: 0, L: [0.15, 0.08, 0.2], R: [0.15, 0.08, 0.2], lL: [0, 0], lR: [0, 0], tool: 0, ...o });
const POSE = {
  rest: P({ y: -0.12, tx: 0.2, hx: 0.15, L: [0.25, 0.1, 0.9], R: [0.25, 0.1, 0.9], lL: [1.2, 1.5], lR: [1.1, 1.4] }),
  cheer: P({ y: 0.06, tx: -0.12, hx: -0.3, L: [2.85, 0.35, 0.15], R: [2.85, 0.35, 0.15], lL: [0.15, 0.1], lR: [0, 0] }),
  look: P({ tx: -0.05, hx: -0.15, L: [0.2, 0.1, 0.3], R: [1.6, 0.2, 0.1] }),
};
for (const name of Object.keys(CREW)) {
  const d = buildDummy(CREW[name], fillCrew, hull); const [x, z, ry, off, water] = STATIONS[name];
  d.root.position.set(x, boat.deckY(z), z); d.root.rotation.y = ry; boat.group.add(d.root);
  const b = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.5), blobMat(0.45)); b.rotation.x = -Math.PI / 2; b.position.set(x, boat.deckY(z) + 0.012, z); boat.group.add(b);
  crew[name] = { name, d, off, ry, cur: -1, water, timer: 0, state: 'idle', stateT: 0, mode: 'fish', bang: null, streak: 0 };
}
const rod = new THREE.Group(); rod.rotation.x = 2.2; crew.Pip.d.J.handR.add(rod);
{ const g = blockGeo(0.035, 2.0, 0.035, '#6B4A35', { r: 0.008 }); g.translate(0, 1.0, 0); rod.add(inked(g, fillProp, hull)); }
const bobberG = new THREE.SphereGeometry(0.11, 12, 8); inkPrep(bobberG, '#FFF6E3', [0, 0, 0], [0.11, 0.11, 0.11]);
{ const c = bobberG.attributes.color, p = bobberG.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < 0.0) c.setXYZ(i, 0xB8 / 255, 0x3A / 255, 0x4B / 255); }
const bobber = inked(bobberG, fillProp, hull); late.add(bobber);
const net = new THREE.Group(); net.rotation.x = 2.0; crew.Mabel.d.J.handR.add(net);
{ const g = blockGeo(0.04, 1.5, 0.04, '#B98656', { r: 0.01 }); g.translate(0, 0.75, 0); net.add(inked(g, fillProp, hull));
  const hoop = new THREE.TorusGeometry(0.24, 0.03, 6, 16); inkPrep(hoop, '#6B4A35', [0, 0, 0], [0.27, 0.27, 0.05]); hoop.setAttribute('smoothN', hoop.attributes.normal.clone());
  const h = inked(hoop, fillProp, hull); h.position.set(0, 1.74, 0); h.rotation.x = Math.PI / 2; net.add(h); }
const lineMat = inkLineMat();
const mkLine = (n) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); const l = new THREE.Line(g, lineMat); l.frustumCulled = false; late.add(l); return l; };
const pipLine = mkLine(12), tomoLine = mkLine(8);

/* ---------- fish meshes per species (cached), a small pool of flying fish */
const fishGeo = {};
function fishMesh(sp) {
  if (!fishGeo[sp.id]) {
    const g = new THREE.SphereGeometry(1, 12, 8); g.scale(0.09, 0.11, 0.24); inkPrep(g, sp.col, [0, 0, 0], [0.09, 0.11, 0.24]);
    { const c = g.attributes.color, p = g.attributes.position, b = new THREE.Color(sp.belly); for (let i = 0; i < p.count; i++) if (p.getY(i) < -0.04) c.setXYZ(i, b.r, b.g, b.b); }
    const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(-0.12, 0.16), new THREE.Vector2(0.12, 0.16)]); const tg = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false }); tg.translate(0, 0, -0.015); tg.rotateX(Math.PI / 2); inkPrep(tg, sp.col, [0, 0, 0.08], [0.12, 0.05, 0.1]);
    fishGeo[sp.id] = [g, tg];
  }
  const grp = new THREE.Group(); const [g, tg] = fishGeo[sp.id]; grp.add(inked(g, fillProp, hull)); const tl = inked(tg, fillProp, hull); tl.position.z = 0.2; grp.add(tl); return grp;
}
const flyingFish = [];

/* ---------- golden beam (flat inked cel, not bloom) for rare finds */
const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, 14, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#FFD45A', transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide }));
beam.frustumCulled = false; late.add(beam);

/* ---------- inked props helper */
const part = (grp, g, col, x, y, z, c = [0, 0, 0], h = [0.5, 0.5, 0.5], hl = hull) => { inkPrep(g, col, c, h); const m = inked(g, fillProp, hl); m.position.set(x, y, z); grp.add(m); return m; };

/* ---------- fishing spots: a ring of little buoys + circling gulls + shimmer */
const spots = SPOTS.map(([x, z], i) => {
  const grp = new THREE.Group(); late.add(grp); const buoys = [];
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + i, b = new THREE.Group(); grp.add(b);
    part(b, new THREE.CylinderGeometry(0.32, 0.42, 0.6, 12), '#E8553F', 0, 0.1, 0, [0, 0, 0], [0.42, 0.3, 0.42]);
    part(b, new THREE.CylinderGeometry(0.3, 0.32, 0.18, 12), '#FFF6E3', 0, 0.48, 0, [0, 0, 0], [0.32, 0.1, 0.32]);
    buoys.push({ b, x: x + Math.cos(a) * C('spotRadius'), z: z + Math.sin(a) * C('spotRadius'), ph: k }); }
  const gulls = [];
  for (let k = 0; k < 2; k++) { const g = new THREE.Group(), add = (geo, gx, gy, gz, par = g) => { const m = inked(geo, fillProp, hullSmall); m.position.set(gx, gy, gz); par.add(m); return m; };
    add(blockGeo(0.2, 0.18, 0.55, '#F4F1EA'), 0, 0, 0); add(blockGeo(0.15, 0.14, 0.16, '#F4F1EA'), 0, 0.08, -0.3); add(blockGeo(0.05, 0.04, 0.1, '#E0A458'), 0, 0.06, -0.42);
    const wl = new THREE.Group(), wr = new THREE.Group(); wl.position.set(0.1, 0.05, -0.02); wr.position.set(-0.1, 0.05, -0.02); g.add(wl, wr);
    add(blockGeo(0.62, 0.035, 0.24, '#B9B6CC'), 0.31, 0, 0, wl); add(blockGeo(0.62, 0.035, 0.24, '#B9B6CC'), -0.31, 0, 0, wr); late.add(g); gulls.push({ g, wl, wr, r: 9 + k * 6, h: 7 + k * 2.5, w: 0.35 - k * 0.08, ph: k * 2.4 + i }); }
  return { x, z, grp, buoys, gulls, region: x > C('regionSwellsX') ? 2 : 1 };
});

/* ---------- discoveries (paint what stays: envMat; ink what acts) */
const rockMat = envMat({ map: T.rock, grain: 0.12 }), grassMat = envMat({ map: T.grass, grain: 0.1 }), white = envMat({ tint: '#F3EEE4', grain: 0.4 }), stripe = envMat({ tint: '#4E5D8C', grain: 0.4 }), woodM = envMat({ map: T.wood, grain: 0.12 });
const colliders = [];
function rockBlob(x, z, rx, ry, rz, seed, mat = rockMat) {
  const g = new THREE.IcosahedronGeometry(1, 3), p = g.attributes.position, s = seed * 1.37;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i);   // smooth lumps: same corner -> same offset
    const k = 0.9 + 0.1 * Math.sin(x * 3.1 + s) * Math.cos(y * 2.3 + s * 0.7) + 0.06 * Math.sin(z * 4.7 + s * 1.9) + 0.04 * Math.sin((x + z) * 7 + s);
    p.setXYZ(i, x * rx * k, Math.max(y, -0.4) * ry * k, z * rz * k); }
  g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.position.set(x, 0, z); env.add(m); return m;
}
{ // Gull Point lighthouse on an islet
  const [x, z] = PLACES[0].pos; rockBlob(x, z, 15, 5, 13, 11); rockBlob(x + 4, z - 3, 10, 6.5, 9, 12, grassMat); colliders.push([x, z, 15]);
  for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(2.1 - i * 0.12, 2.2 - i * 0.12, 3, 16), i % 2 ? stripe : white); c.position.set(x + 3, 6 + i * 3, z - 2); env.add(c); }
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2, 12), envMat({ tint: '#FFE7A6', grain: 0.2, emit: 1 })); lamp.position.set(x + 3, 23, z - 2); env.add(lamp);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 2, 12), envMat({ tint: '#D9735F', grain: 0.3 })); roof.position.set(x + 3, 25, z - 2); env.add(roof);
}
const wreck = new THREE.Group(); late.add(wreck);
{ const [x, z] = PLACES[1].pos; wreck.position.set(x, 0, z);
  part(wreck, new THREE.CylinderGeometry(0.22, 0.28, 11, 8), '#8A6A52', 0, 3.4, 0, [0, 0, 0], [0.3, 5.5, 0.3]).rotation.z = 0.32;
  part(wreck, new THREE.BoxGeometry(3.2, 0.18, 0.18), '#8A6A52', -1.4, 6.6, 0, [0, 0, 0], [1.6, 0.1, 0.1]).rotation.z = 0.32;
  const hulk = part(wreck, new THREE.BoxGeometry(3.4, 1.4, 9), '#5E4A3E', 0.5, -0.3, 0.5, [0, 0, 0], [1.7, 0.7, 4.5]); hulk.rotation.set(0.12, 0.4, 0.28);
  colliders.push([x, z, 4]); }
{ const [x, z] = PLACES[2].pos; rockBlob(x, z, 13, 5.5, 10, 21); rockBlob(x + 9, z + 6, 4, 4.5, 3.5, 22); rockBlob(x - 7, z - 8, 3, 1.5, 3, 23); rockBlob(x + 6, z - 8, 3, 1.5, 3, 24); colliders.push([x, z, 13]); }
{ const [x, z] = PLACES[3].pos; rockBlob(x - 8, z, 6, 22, 7, 31); rockBlob(x + 8, z, 6, 20, 7, 32); const top = rockBlob(x, z, 13, 5, 7, 33); top.position.y = 18; colliders.push([x - 8, z, 7], [x + 8, z, 7]);
  rockBlob(x - 20, z + 14, 6, 12, 6, 34); colliders.push([x - 20, z + 14, 6]); }
const bellBuoy = new THREE.Group(); late.add(bellBuoy);
{ part(bellBuoy, new THREE.CylinderGeometry(1.4, 1.8, 2.2, 18), '#B83A4B', 0, 0.3, 0, [0, 0, 0], [1.8, 1.1, 1.8]);
  part(bellBuoy, new THREE.CylinderGeometry(1.2, 1.4, 0.5, 18), '#FFF6E3', 0, 1.7, 0, [0, 0, 0], [1.4, 0.3, 1.4]);
  for (const s of [-1, 1]) part(bellBuoy, new THREE.CylinderGeometry(0.08, 0.08, 3.2, 6), '#6B4A35', s * 0.8, 3.4, 0, [0, 0, 0], [0.1, 1.6, 0.1]);
  part(bellBuoy, new THREE.BoxGeometry(2.0, 0.2, 0.3), '#6B4A35', 0, 5.0, 0, [0, 0, 0], [1, 0.1, 0.15]);
  part(bellBuoy, new THREE.CylinderGeometry(0.35, 0.6, 0.8, 12), '#E0A458', 0, 4.3, 0, [0, 0, 0], [0.6, 0.4, 0.6]);
  colliders.push([PLACES[4].pos[0], PLACES[4].pos[1], 2.5]); }

/* ---------- wake trail: pooled flat foam puffs (late, inked look via cream fill + darker rim ring) */
const puffGeo = new THREE.CircleGeometry(1, 14); puffGeo.rotateX(-Math.PI / 2);
const puffMat = new THREE.MeshBasicMaterial({ color: '#EAF8F5', transparent: true, depthWrite: false });
const puffs = []; for (let i = 0; i < 320; i++) { const m = new THREE.Mesh(puffGeo, puffMat.clone()); m.visible = false; m.renderOrder = 2; late.add(m); puffs.push({ m, life: 0, max: 1, vx: 0, vz: 0, s0: 0.3, s1: 1 }); }
let puffI = 0;
function puff(x, z, vx, vz, s0, s1, life, op = 0.85) { const p = puffs[puffI++ % puffs.length]; Object.assign(p, { x, z, vx, vz, s0, s1, life: 0, max: life, op }); p.m.visible = true; }

/* ============================================================ state */
const S = {
  x: -14, z: -22, yaw: -Math.PI / 2, speed: 0, notch: 0, rudder: 0, yawVel: 0, anchored: false, anchorK: 0,
  t: 0, hour: C('startHour'), cargo: [], shells: 0, best: {}, seen: new Set(), places: new Set(), firstSale: false,
  region: 0, regionShownAt: -99, lastInput: 0, idleK: 0, trauma: 0, wasAway: false, hintShown: {}, notchHold: 0,
  docked: null, screen: null, cine: null, inspect: false, pitchK: 0, rollK: 0, prevSpeed: 0, heave: 0, bumpCD: 0,
  glintSeen: new Set(), lastSlap: -9, orbitYaw: 0, orbitPitch: 0, zoom: 1, zoomI: 1, dragging: false,
};
const cargoCount = () => S.cargo.length;
const fwd = (yaw = S.yaw) => [-Math.sin(yaw), -Math.cos(yaw)];   // boat bow is local -z
const bearing = (dx, dz) => Math.atan2(dz, dx);                   // 0 = north (+x), +pi/2 = east (+z)

/* ============================================================ input */
const keys = new Set();
const snd = new Sound(); snd.setVolume(C('volume'));
let started = false;
addEventListener('keydown', (e) => {
  if (['Tab', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  if (!started) return; if (e.repeat && !['KeyW', 'KeyS'].includes(e.code)) return;
  keys.add(e.code); S.lastInput = S.t;
  if (S.screen) return screenKey(e.code);
  if (e.code === 'KeyW' || e.code === 'ArrowUp') { if (!e.repeat) { notch(+1); S.notchHold = 0; } }
  if (e.code === 'KeyS' || e.code === 'ArrowDown') { if (!e.repeat) { notch(-1); S.notchHold = 0; } }
  if (e.code === 'Space') toggleAnchor();
  if (e.code === 'KeyE' && S.docked) openDock(S.docked);
  if (e.code === 'KeyM') openMap();
  if (e.code === 'Tab') openMenu('cargo');
  if (e.code === 'KeyN') setMuteIcon(snd.toggleMute());
  if (e.code === 'KeyF') setInspect(true);
});
addEventListener('keyup', (e) => { keys.delete(e.code); if (e.code === 'KeyF') setInspect(false); });
const cv = renderer.domElement;
cv.addEventListener('pointerdown', (e) => { S.dragging = { x: e.clientX, y: e.clientY }; S.lastInput = S.t; });
addEventListener('pointerup', () => { S.dragging = false; });
addEventListener('pointermove', (e) => { if (!S.dragging) return; S.orbitYaw -= (e.clientX - S.dragging.x) * 0.005; S.orbitPitch = clamp(S.orbitPitch + (e.clientY - S.dragging.y) * 0.003, -0.15, 0.55); S.dragging = { x: e.clientX, y: e.clientY }; S.lastInput = S.t; });
addEventListener('wheel', (e) => { if (S.screen) return; S.zoomI = clamp(S.zoomI + Math.sign(e.deltaY), 0, 2); S.zoom = [0.68, 1, 1.55][S.zoomI]; S.lastInput = S.t; }, { passive: true });

function notch(d) {
  if (S.anchored) { if (d > 0) toggleAnchor(); return; }
  const n = clamp(S.notch + d, -1, 4); if (n === S.notch) return;
  S.notch = n; snd.click(n + 1); pop($('bar').children[0], 1.06, 220);
  if (n > 0 && d > 0) S.pitchK -= 0.04;
}
function toggleAnchor() {
  S.anchored = !S.anchored;
  if (S.anchored) { S.notch = 0; snd.noise('brown', 0.4, 0.5, 500, 120); snd.splash(0.6); log('Anchor down.'); const p = toScreen(boatPoint(0, 0, 3)); p && fxp.burst(p.x, p.y, 18, { col: ['#FFF6E3', '#CFEFEA'], v: 220, g: 500, size: 5 }, rng); }
  else { snd.creak(); snd.noise('brown', 0.25, 0.4, 300, 600); log('Anchor up.'); }
  renderBar();
}

/* ============================================================ HUD helpers */
const fxp = new Particles($('fx'));
addEventListener('resize', () => { fxp.resize(); resize(); });
$('cargoIco').innerHTML = ic('fish'); $('shellsIco').innerHTML = ic('shell'); $('fmShell').innerHTML = ic('shell');
const setMuteIcon = (m) => { $('mute').innerHTML = ic(m ? 'mute' : 'sound'); };
setMuteIcon(false); $('mute').onclick = () => setMuteIcon(snd.toggleMute());
function renderBar() {
  let items;
  if (S.screen === 'fish') items = [['E', 'Sell all'], ['Esc', 'Back']];
  else if (S.screen) items = [['Esc', 'Close']];
  else items = [[['W', 'A', 'S', 'D'], 'Sail'], ['Space', S.anchored ? 'Raise anchor' : 'Anchor'], ['M', 'Map'], ['F', 'Inspect (hold)'], ['Tab', 'Menu']];
  if (!S.screen && S.docked) items.unshift(['E', 'Talk · ' + S.docked.name, 'hi']);
  $('bar').innerHTML = items.map(([k, v, h]) => `<span class="act ${h || ''}">${(Array.isArray(k) ? k : [k]).map((x) => `<span class="key">${x}</span>`).join('')}<span>${v}</span></span>`).join('');
  $('bar').classList.toggle('focus', !!S.screen);
}
function log(html) {
  const el = document.createElement('div'); el.innerHTML = html; $('log').appendChild(el);
  el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 0.93, transform: 'none' }], { duration: 260, easing: 'ease-out' });
  while ($('log').children.length > 5) $('log').firstChild.remove();
  setTimeout(() => { el.style.opacity = 0; setTimeout(() => el.remove(), 1000); }, 12000);
}
let hintTO = 0;
function hint(key, text, sec = 6) { if (S.hintShown[key]) return; S.hintShown[key] = true; const h = $('hint'); h.textContent = text; h.classList.add('show'); clearTimeout(hintTO); hintTO = setTimeout(() => h.classList.remove('show'), sec * 1000); }
function updateCargoHUD(bump) {
  const n = cargoCount(), cap = C('cargoCapacity'), full = n >= cap;
  $('cargoN').textContent = full ? 'Full' : `${n}/${cap}`; $('cargoFill').style.width = `${Math.min(1, n / cap) * 100}%`;
  $('cargoTrack').classList.toggle('full', full); $('cargoIco').innerHTML = ic(full ? 'box' : 'fish');
  if (bump) pop($('cargo'), 1.12, 300);
}
function setInspect(on) {
  S.inspect = on;
  for (const id of ['cargo', 'clock', 'bar']) $(id).classList.toggle('focus', on || (id === 'bar' && !!S.screen));
  $('shells').classList.toggle('show', on || !!S.screen); $('shellsN').textContent = S.shells.toLocaleString('en-US');
  $('region').style.opacity = on ? 0.95 : $('region').dataset.op || 0;
}
const toScreen = (v) => { const p = v.clone().project(cam); if (p.z > 1) return null; const r = cv.getBoundingClientRect(); return { x: (p.x + 1) / 2 * r.width, y: (1 - p.y) / 2 * r.height }; };
const boatPoint = (lx, ly, lz) => boat.group.localToWorld(new THREE.Vector3(lx, ly, lz));

// world-anchored DOM labels
const wl = $('wl'); const anchors = new Set();
function anchorEl(html, getPos, cls = 'wl', life = 0) {
  const el = document.createElement('div'); el.className = cls; el.innerHTML = html; wl.appendChild(el);
  const a = { el, getPos, born: S.t, life, dy: 0 }; anchors.add(a); return a;
}
function removeAnchor(a) { if (!a) return; anchors.delete(a); a.el.remove(); }
function updateAnchors() {
  for (const a of anchors) { const p = toScreen(a.getPos()); if (!p) { a.el.style.display = 'none'; continue; } a.el.style.display = ''; a.el.style.transform = `translate(${p.x + (a.dx || 0)}px,${p.y - a.dy - (a.dy0 || 0)}px) translate(-50%,-100%)`;
    if (a.life) { const u = (S.t - a.born) / a.life; a.dy = 40 * ease.out(Math.min(1, u)); a.el.style.opacity = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1; if (u >= 1) removeAnchor(a); } }
}

/* ============================================================ fishing */
function rollSpecies(region) {
  if (S.forceRare) { S.forceRare = false; return SPECIES.find((s) => s.region === region && s.rarity === 2); }   // test hook
  const pool = SPECIES.filter((s) => s.region === region), W = pool.reduce((a, s) => a + s.w, 0); let r = rng() * W;
  for (const s of pool) { if ((r -= s.w) < 0) return s; } return pool[0];
}
function inSpot() { for (const s of spots) if (Math.hypot(S.x - s.x, S.z - s.z) < C('spotRadius')) return s; return null; }
function crewWater(c) { const [lx, lz] = c.water; return boatPoint(lx, 0, lz).setY(0); }
function startBite(c) {
  c.state = 'bite'; c.stateT = 0; snd.bite();
  removeAnchor(c.bang); const head = () => c.d.J.neck.localToWorld(new THREE.Vector3(0, 0.75, 0));
  c.bang = anchorEl('<div class="bang">!</div>', head); c.bang.dx = -48; c.bang.el.firstChild.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.3)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 300, easing: 'cubic-bezier(.34,1.56,.64,1)' });
}
function landFish(c) {
  const spot = inSpot(); const region = spot ? spot.region : (S.x > C('regionSwellsX') ? 2 : 1);
  const sp = rollSpecies(region), [a, b] = sp.size, size = Math.round(a + (b - a) * Math.pow(rng(), 1.6));
  const w = crewWater(c), m = fishMesh(sp); m.scale.setScalar(clamp(size / (sp.size[0] + sp.size[1]) * 2.2, 0.8, 2.6)); late.add(m);
  flyingFish.push({ m, c, sp, size, t: 0, from: w, hold: sp.rarity === 2 ? 0.7 : 0 });
  snd.splash(0.8 + sp.rarity * 0.3); fx.ring.visible = true; fxRingT = 0; fxRingPos.copy(w).setY(swellH(w.x, w.z, S.t, U.swellA.value) + 0.6);
  const p = toScreen(w); p && fxp.burst(p.x, p.y, 16 + sp.rarity * 10, { col: ['#FFF6E3', '#CFEFEA', '#9FD8D6'], v: 260, g: 700, size: 5, a0: -Math.PI, spread: Math.PI }, rng);
  if (sp.rarity === 2) { beam.position.set(w.x, 6, w.z); beamT = 0; snd.rare(); }
}
const activeLabels = new Set(); let fxRingT = 9, beamT = 9; const fxRingPos = new THREE.Vector3();
function fishArrived(f) {
  const { c, sp, size } = f; late.remove(f.m);
  c.state = 'cheer'; c.stateT = 0; removeAnchor(c.bang); c.bang = null;
  const isNew = !S.seen.has(sp.id), best = S.best[sp.id] || 0, pb = size > best && best > 0;
  S.seen.add(sp.id); S.best[sp.id] = Math.max(best, size);
  c.streak = S.t - (c.lastCatch || -99) < 14 ? c.streak + 1 : 0; c.lastCatch = S.t;
  snd.catchNote(globalStreak());
  const head = () => c.d.J.neck.localToWorld(new THREE.Vector3(0, 0.7, 0));
  for (const o of activeLabels) { o.dy0 = (o.dy0 || 0) + 46; if (o.life > 1.2 + (S.t - o.born)) o.life = Math.max(S.t - o.born + 0.6, 1.2); }
  const lab = anchorEl(`<div class="lab">${ic('fish')}<span>${sp.name} <em>· ${size} cm</em></span><span class="plus">+1</span></div>`, head, 'wl', 2.2); activeLabels.add(lab); setTimeout(() => activeLabels.delete(lab), 2300);
  lab.el.firstChild.animate([{ transform: 'scale(.5)', opacity: 0 }, { transform: 'scale(1.12)', opacity: 1, offset: 0.55 }, { transform: 'scale(1)', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  const hp = toScreen(head());
  if (hp) { fxp.burst(hp.x, hp.y - 20, 8 + sp.rarity * 14, { col: sp.rarity ? ['#FFE7A6', '#FFF6E3', '#FF9B21'] : ['#FFF6E3'], shape: sp.rarity ? 'star' : 'dot', v: 200, g: 150, size: sp.rarity ? 7 : 4, life: 0.9 }, rng);
    flyTo($('fly'), ic('fish'), hp.x + 60, hp.y - 30, $('cargo'), 0.55, () => { S.cargo.push({ id: sp.id, size }); updateCargoHUD(true); snd.ui(cargoCount() % 5); checkFull(); }, rng, 'fly fish'); }
  else { S.cargo.push({ id: sp.id, size }); updateCargoHUD(true); checkFull(); }
  if (isNew || sp.rarity > 0 || pb) card(sp, size, isNew, pb);
  if (isNew) { setTimeout(() => snd.newSpecies(), 120); log(`<b>${c.name}</b> landed a ${sp.name}<span class="tag">new</span>`); }
  else if (sp.rarity) log(`<b>${c.name}</b> landed a ${sp.name}<span class="tag">${RARITY[sp.rarity].toLowerCase()}</span>`);
}
const globalStreak = () => Math.min(9, Object.values(crew).reduce((a, c) => a + (S.t - (c.lastCatch || -99) < 14 ? 1 : 0), 0) + Object.values(crew).reduce((a, c) => Math.max(a, c.streak), 0));
function card(sp, size, isNew, pb) {
  const el = document.createElement('div'); el.className = 'card' + (sp.rarity === 2 ? ' plus' : '');
  const stars = '★'.repeat(sp.rarity + 1) + `<span style="color:#D8CBB0">${'★'.repeat(2 - sp.rarity)}</span>`;
  el.innerHTML = `${isNew ? '<span class="ribbon">NEW!</span>' : pb ? '<span class="ribbon">Biggest yet!</span>' : ''}<svg class="fishpic" viewBox="0 0 72 42"><path d="M4 21c10-14 32-17 48-6l11-9v30l-11-9c-16 11-38 8-48-6z" fill="${sp.col}" stroke="#33273B" stroke-width="2.5" stroke-linejoin="round"/><path d="M8 24c12 8 30 9 44 3" fill="none" stroke="${sp.belly}" stroke-width="4" stroke-linecap="round"/><circle cx="44" cy="18" r="2.6" fill="#33273B"/></svg>
    <h4>${sp.name}</h4><p><span class="size">${size} cm</span> · <span class="stars">${stars}</span> ${RARITY[sp.rarity]}</p>`;
  $('cards').prepend(el); while ($('cards').children.length > 3) $('cards').lastChild.remove();
  el.animate([{ transform: 'translateX(120%) rotate(6deg)' }, { transform: 'translateX(-6%) rotate(-1deg)', offset: 0.7 }, { transform: 'none' }], { duration: 460, easing: 'cubic-bezier(.22,1,.36,1)' });
  if (sp.rarity) { const r = el.getBoundingClientRect(); setTimeout(() => fxp.burst(r.left + r.width * 0.3, r.top + 20, 18 + sp.rarity * 10, { col: ['#FFE7A6', '#FF9B21', '#FFF6E3'], shape: 'star', v: 260, g: 300, size: 7 }, rng), 280); }
  setTimeout(() => { el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(40px)' }], { duration: 400, fill: 'forwards' }); setTimeout(() => el.remove(), 420); }, sp.rarity === 2 ? 5200 : 3600);
}
function checkFull() {
  if (cargoCount() < C('cargoCapacity')) return;
  if (S.fullAnnounced) return; S.fullAnnounced = true;
  $('cargo').classList.add('focus'); setTimeout(() => !S.inspect && $('cargo').classList.remove('focus'), 6000);
  log("Hold full. The crew's resting."); hint('full', 'Head home to sell', 7); snd.plonk();
}
function updateFishing(dt) {
  const spot = inSpot(), full = cargoCount() >= C('cargoCapacity');
  const slow = S.anchored || Math.abs(S.speed) < 2.5 ? C('slowBonus') : Math.abs(S.speed) > 6 ? 0.6 : 1;
  for (const c of Object.values(crew)) {
    c.stateT += dt;
    if (c.state === 'cheer' && c.stateT > 0.9) c.state = 'idle';
    if (c.state === 'look' && c.stateT > 2.2) c.state = 'idle';
    const fishing = spot && !full;
    if (c.state === 'idle' && fishing) { c.timer -= dt * slow; if (c.timer <= 0) { startBite(c); c.timer = C('catchMin') + rng() * (C('catchMax') - C('catchMin')); } }
    if (c.state === 'idle' && !fishing && c.timer <= 0) c.timer = 1 + rng() * 3;
    if (c.state === 'bite' && c.stateT > C('biteLead')) { c.state = 'reel'; c.stateT = 0; landFish(c); }
    c.mode = full ? 'rest' : spot ? 'fish' : 'idle';
  }
  for (let i = flyingFish.length - 1; i >= 0; i--) {
    const f = flyingFish[i]; const to = f.c.d.root.localToWorld(new THREE.Vector3(0.1, 0.7, 0.4));
    let u; if (f.hold > 0 && f.t >= 0.5 * 0.55 && f.t < 0.5 * 0.55 + f.hold) { u = 0.5; f.t += dt; } else { f.t += dt; u = Math.min(1, (f.t - (f.t > 0.275 ? f.hold : 0)) / 0.55); }
    const y0 = swellH(f.from.x, f.from.z, S.t, U.swellA.value);
    f.m.position.set(lerp(f.from.x, to.x, u), lerp(y0, to.y, u) + 3.2 * 4 * u * (1 - u), lerp(f.from.z, to.z, u));
    f.m.rotation.set(-1.2 + u * 4.5, Math.atan2(to.x - f.from.x, to.z - f.from.z), Math.sin(f.t * 30) * 0.3);
    if (u >= 1) { flyingFish.splice(i, 1); fishArrived(f); }
  }
}

/* ============================================================ docking + selling + shipyard */
function nearDock() { for (const d of DOCKS) if (Math.hypot(S.x - d.pos[0], S.z - d.pos[1]) < d.r && Math.abs(S.speed) < 3) return d; return null; }
function openDock(d) {
  snd.ui(2); S.notch = 0; S.speed *= 0.3;
  if (d.id === 'fish') openFishmonger(); else openYard();
}
function openScreen(id) { S.screen = id; $(id + 'Screen').classList.add('open'); renderBar(); setInspect(S.inspect); $('shells').classList.toggle('big', id !== 'map'); $('shells').classList.toggle('show', id !== 'map'); $('shellsN').textContent = S.shells.toLocaleString('en-US'); pop($(id + 'Screen').firstElementChild, 1.03, 260); }
function closeScreen() { if (!S.screen) return; $(S.screen + 'Screen').classList.remove('open'); S.screen = null; $('shells').classList.remove('big', 'show'); renderBar(); snd.ui(0); }
function screenKey(code) {
  if (code === 'Escape' || (code === 'Tab' && S.screen === 'menu') || (code === 'KeyM' && S.screen === 'map')) return closeScreen();
  if (S.screen === 'fish' && code === 'KeyE') $('sellBtn').click();
  if (S.screen === 'menu' && (code === 'KeyQ' || code === 'KeyE')) { const i = MENU.findIndex((m) => m[0] === menuTab); openMenu(MENU[(i + (code === 'KeyE' ? 1 : MENU.length - 1)) % MENU.length][0]); }
}
let selling = false;
function openFishmonger() {
  openScreen('fish'); const rows = $('fmRows'); rows.innerHTML = '';
  const groups = {}; for (const f of S.cargo) (groups[f.id] = groups[f.id] || []).push(f);
  const list = Object.entries(groups).map(([id, fs]) => { const sp = SPECIES.find((s) => s.id === id); return { sp, n: fs.length, total: fs.length * sp.value }; }).sort((a, b) => b.total - a.total);
  $('fmLine').textContent = list.length ? 'Fine catch today!' : 'Come back with a catch, dear.';
  $('fmCount').textContent = `${S.cargo.length} fish`; $('fmTotal').textContent = '0'; $('sellBtn').disabled = !list.length; $('sellBtn').textContent = 'Sell all';
  if (!list.length) rows.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:calc(var(--u)*240);color:#8A7D86;font-size:calc(var(--u)*20)">Nothing to sell yet</div>`;
  list.forEach((r, i) => { const el = document.createElement('div'); el.className = 'row'; el.innerHTML = `${ic('fish')}<span>${r.sp.name}${r.sp.rarity ? ` <span class="tag" style="background:#E9E6F7;color:#4A4680">${RARITY[r.sp.rarity].toLowerCase()}</span>` : ''}</span><span class="r">×${r.n}</span><span class="r d">${r.sp.value}</span><span class="r"><b>${r.total}</b></span>`;
    el.querySelector('svg').style.color = r.sp.col; rows.appendChild(el); el.dataset.total = r.total;
    el.animate([{ opacity: 0, transform: 'translateX(40px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: 60 + i * 70, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }); setTimeout(() => snd.ui(i), 60 + i * 70); });
  $('sellBtn').onclick = () => { if (selling) return; if (!S.cargo.length) return closeScreen(); sellAll(list); };
}
async function sellAll(list) {
  selling = true; press($('sellBtn')); $('sellBtn').disabled = true;
  const rows = [...$('fmRows').children], total = list.reduce((a, r) => a + r.total, 0), totalEl = $('fmTotal'), crate = $('crate').getBoundingClientRect();
  let running = 0, tick = 0;
  for (const [i, row] of rows.entries()) {          // each row: fish hop into the crate, row total adds to the sum
    const r = row.getBoundingClientRect(); row.animate([{ background: '#FFF1C9' }, { background: 'transparent' }], { duration: 500 });
    for (let k = 0; k < Math.min(3, list[i].n); k++) setTimeout(() => flyTo($('fly'), ic('fish'), r.left + 40, r.top + r.height / 2, $('crate'), 0.38, () => { snd.pluck(440 + tick * 30, 0.06, 0.1); pop($('crate'), 1.08, 200); }, rng, 'fly fish'), k * 60);
    const from = running; running += list[i].total;
    await countUp(totalEl, from, running, 0.22, () => { snd.coin(tick++); });
    pop(totalEl, 1.15, 240); await sleep(0.08);
  }
  shine(totalEl.parentElement); snd.plonk(); await sleep(0.25);
  // shell-coins pour along curves into the Shells counter, rising ticks; the total counts down as it pours
  const tr = totalEl.getBoundingClientRect(), n = Math.round(clamp(total / 3, 8, C('coinsPerSale'))), per = total / n, start = S.shells;
  let landed = 0;
  await new Promise((res) => { for (let k = 0; k < n; k++) setTimeout(() => {
    flyTo($('fly'), ic('shell'), tr.left + tr.width / 2 + (rng() - 0.5) * 30, tr.top + tr.height / 2, $('shells'), C('coinFlight'), () => {
      landed++; const v = Math.round(start + per * landed); $('shellsN').textContent = v.toLocaleString('en-US'); totalEl.textContent = Math.max(0, Math.round(total - per * landed));
      snd.coin(landed); if (landed % 3 === 0) pop($('shells'), 1.08, 160);
      const sr = $('shells').getBoundingClientRect(); fxp.burst(sr.left + sr.width * 0.35, sr.top + sr.height / 2, 3, { col: ['#FFE7A6', '#FFF6E3'], v: 160, g: 400, size: 4, life: 0.5 }, rng);
      if (landed === n) res();
    }, rng); }, k * (C('countUp') * 1000 / n)); });
  // settle: soft plonk, shine, +N
  S.shells = start + total; $('shellsN').textContent = S.shells.toLocaleString('en-US'); totalEl.textContent = total;
  snd.plonk(); shine($('shells')); pop($('shells'), 1.12, 420);
  const sp = $('shellsPlus'); sp.textContent = `+${total}`; sp.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none', offset: 0.25 }, { opacity: 1, offset: 0.8 }, { opacity: 0, transform: 'translateY(-14px)' }], { duration: 1800, easing: 'ease-out' });
  const sr = $('shells').getBoundingClientRect(); fxp.burst(sr.left + sr.width / 2, sr.top + sr.height / 2, 26, { col: ['#FFE7A6', '#FF9B21', '#FFF6E3'], shape: 'star', v: 320, g: 500, size: 6 }, rng);
  rows.forEach((row, i) => row.animate([{ opacity: 1 }, { opacity: 0.35 }], { duration: 300, delay: i * 40, fill: 'forwards' }));
  $('fmLine').textContent = S.firstSale ? 'Lovely. Come again!' : 'Your first sale! Come again soon.';
  log(`Sold ${S.cargo.length} fish for <b>${total} Shells</b>`);
  S.cargo = []; S.fullAnnounced = false; updateCargoHUD(true);
  if (!S.firstSale) { S.firstSale = true; setTimeout(() => hint('yard', 'The shipyard can fit a bigger hold'), 1500); }
  $('sellBtn').textContent = 'Done'; $('sellBtn').disabled = false; $('sellBtn').onclick = () => closeScreen(); selling = false;
}
function openYard() {
  openScreen('yard');
  const items = [['Fish crate', 'S · 40 kg · +6 hold', 'Fitted'], ['Fish hold', 'M · 120 kg · +12 hold', '60'], ['Bunk', 'S · 60 kg · +1 berth (hire Tomo at the Inn)', '40'], ['Swell keel', 'Keel mount · 220 kg · needs the Cutter', '70'], ['Cutter (hull)', 'S S M M L + keel mount · 650 kg', '180']];
  $('yardBody').innerHTML = `<p style="margin:0 0 12px;color:#6A5D70">Load <b style="color:#33273B">40 / 200 kg</b> · the Skiff can carry two of crate, hold and bunk. Fitting, paint and decor live here in the full game (doc 11).</p>` + items.map(([n, d, s]) => `<div class="row" style="grid-template-columns:1fr auto;padding:0 4px"><span><b>${n}</b><br><small style="color:#6A5D70">${d}</small></span><button class="btn ${s === 'Fitted' ? 'sec' : ''}" ${s === 'Fitted' ? 'disabled' : ''} data-p="1">${s === 'Fitted' ? 'Fitted' : ic('shell') + ' ' + s}</button></div>`).join('');
  $('yardBody').querySelectorAll('button[data-p]').forEach((b) => (b.onclick = () => { press(b); snd.ui(1); b.textContent = 'Preview only'; }));
  $('yardClose').onclick = closeScreen;
}

/* ============================================================ menu (Tab) + map (M) */
const MENU = [['cargo', 'Cargo'], ['journal', 'Journal'], ['ship', 'Ship'], ['system', 'System']];
let menuTab = 'cargo';
function openMenu(tab) {
  if (S.screen !== 'menu') openScreen('menu'); menuTab = tab; snd.ui(MENU.findIndex((m) => m[0] === tab));
  $('menuTabs').innerHTML = MENU.map(([k, n]) => `<span data-k="${k}" class="${k === tab ? 'on' : ''}">${n}</span>`).join('') + `<span style="margin-left:auto;cursor:default"><span class="key">Q</span> <span class="key">E</span></span>`;
  $('menuTabs').querySelectorAll('[data-k]').forEach((s) => (s.onclick = () => openMenu(s.dataset.k)));
  const b = $('menuBody');
  if (tab === 'cargo') { const g = {}; S.cargo.forEach((f) => (g[f.id] = (g[f.id] || 0) + 1));
    b.innerHTML = `<p style="margin:0 0 10px;color:#6A5D70">Hold <b style="color:#33273B">${cargoCount()} / ${C('cargoCapacity')}</b>. Sell at the Fishmonger in the harbour.</p>` + (Object.keys(g).length ? Object.entries(g).map(([id, n]) => { const sp = SPECIES.find((s) => s.id === id); return `<div class="row" style="grid-template-columns:40px 1fr 80px"><span style="color:${sp.col}">${ic('fish')}</span><span>${sp.name}</span><span class="r"><b>×${n}</b></span></div>`; }).join('') : '<p style="color:#8A7D86">The hold is empty.</p>'); }
  if (tab === 'journal') b.innerHTML = `<p style="margin:0 0 10px;color:#6A5D70">Fish · ${S.seen.size} of ${SPECIES.length} seen &nbsp;·&nbsp; Places · ${S.places.size} of ${PLACES.length}</p><div class="jg">` + SPECIES.map((sp) => S.seen.has(sp.id) ? `<div class="jc"><span style="color:${sp.col}">${ic('fish')}</span><b>${sp.name}</b><small>best ${S.best[sp.id]} cm</small></div>` : `<div class="jc sil">${ic('fish')}<b>Not seen yet</b><small>&nbsp;</small></div>`).join('') + '</div><div class="jg" style="margin-top:12px">' + PLACES.map((p) => S.places.has(p.id) ? `<div class="jc">${ic(p.icon)}<b>${p.short}</b><small>seen</small></div>` : `<div class="jc sil">${ic(p.icon)}<b>Not seen yet</b><small>&nbsp;</small></div>`).join('') + '</div>';
  if (tab === 'ship') b.innerHTML = `<p style="color:#6A5D70;margin-top:0">Skiff · "Marigold II" — read-only here; change her at the Shipyard (preview).</p><div class="row" style="grid-template-columns:1fr auto"><span>S slot · Fish crate</span><span class="d">40 kg · +6 hold</span></div><div class="row" style="grid-template-columns:1fr auto"><span>S slot · empty</span><span class="d">—</span></div><div class="row" style="grid-template-columns:1fr auto"><span>M slot · empty</span><span class="d">—</span></div><p style="color:#6A5D70">Decor: Pennant · Brass lamp</p>`;
  if (tab === 'system') b.innerHTML = `<p style="margin-top:0">Volume</p><input id="vol" type="range" min="0" max="1" step="0.05" value="${snd.vol}" style="width:60%;pointer-events:auto"><p style="color:#6A5D70">Controls: W/S throttle notches (hold to step) · A/D steer · Space anchor · E talk · M map · Tab menu · hold F inspect · drag to look · wheel to zoom · N mute.</p><p style="color:#6A5D70">Tuning: every value lives in config.js.</p>`;
  const v = $('vol'); if (v) v.oninput = () => snd.setVolume(+v.value);
}
// map: cozy hand-drawn chart (doc 10 §Map). world x (north) -> up, z (east) -> right.
const MS = 1.32, MX = (z) => 960 + z * MS, MY = (x) => 1010 - (x + 60) * MS;
function blobPath(pts) { const n = pts.length; let d = `M ${pts[0][0]} ${pts[0][1]}`; for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]; d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`; } return d + ' Z'; }
const isle = (x, z, r, k = 1) => blobPath(Array.from({ length: 7 }, (_, i) => { const a = i / 7 * Math.PI * 2; return [MX(z + Math.cos(a) * r * (0.85 + 0.15 * Math.sin(i * 2.3 + k))), MY(x + Math.sin(a) * r * (0.85 + 0.15 * Math.cos(i * 1.7 + k)))]; }));
function openMap() {
  openScreen('map'); snd.noise('white', 0.08, 0.35, 3000, 1500); // paper rustle
  const land = (d) => `<path d="${d}" fill="#CFEFEA" stroke="#CFEFEA" stroke-width="30" stroke-linejoin="round" opacity=".9" filter="url(#wob)"/><path d="${d}" fill="#E9C994" stroke="#C99E6A" stroke-width="3" filter="url(#wob)"/>`;
  const coast = blobPath([[MX(-400), MY(-46)], [MX(-200), MY(-47)], [MX(-60), MY(-46)], [MX(-30), MY(-44)], [MX(-10), MY(-47)], [MX(160), MY(-46)], [MX(400), MY(-47)], [MX(420), MY(-300)], [MX(-420), MY(-300)]]);
  const seen = (id) => S.places.has(id);
  const badge = (p) => { const [x, z] = p.pos; return `<g transform="translate(${MX(z)} ${MY(x)})"><circle r="24" fill="#FFF6E3" stroke="#fff" stroke-width="3" filter="url(#soft)"/><g transform="translate(-13 -13) scale(1.08)" color="#5B4A3E">${ic(p.icon, 'm')}</g><text y="44" text-anchor="middle" class="ml">${p.short}</text></g>`; };
  const [fx_, fz_] = fwd(); const hd = Math.atan2(fz_, fx_) * 180 / Math.PI;
  const waves = Array.from({ length: 26 }, (_, i) => { const x = -40 + ((i * 197) % 720), z = -320 + ((i * 263) % 640); return `<path d="M ${MX(z)} ${MY(x)} q 9 -7 18 0 t 18 0" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="2.2" stroke-linecap="round"/>`; }).join('');
  const sx = C('regionSwellsX');
  $('mapSvg').innerHTML = `<defs><filter id="wob" x="-50%" y="-50%" width="200%" height="200%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="9"/></filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="9"/><feColorMatrix values="0 0 0 0 .35  0 0 0 0 .3  0 0 0 0 .25  0 0 0 .09 0"/></filter>
    <filter id="wash" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".006" numOctaves="3" seed="2"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .22 -.05"/></filter>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#2F5F86" flood-opacity=".28"/></filter>
    <linearGradient id="seaG" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#6CC3C6"/><stop offset="${(MY(-60) - MY(sx)) / 1080}" stop-color="#5FB4C4"/><stop offset="${(MY(-60) - MY(sx + 60)) / 1080}" stop-color="#5A9FC0"/><stop offset="1" stop-color="#4C86AE"/></linearGradient>
    <style>.ml{font:800 18px Nunito,sans-serif;fill:#5B4A3E;paint-order:stroke;stroke:#FFF6E3;stroke-width:4px}.mr{font:600 34px Fredoka,sans-serif;fill:#fff;opacity:.85;letter-spacing:.06em}.m{width:24px;height:24px}</style></defs>
    <rect width="1920" height="1080" fill="url(#seaG)"/><rect width="1920" height="1080" filter="url(#wash)"/>
    <path d="M 0 ${MY(sx)} ${Array.from({ length: 24 }, () => 'q 40 -14 80 0').join(' ')}" fill="none" stroke="#fff" stroke-width="3" opacity=".55"/>
    <path d="M 0 ${MY(sx + 45)} ${Array.from({ length: 24 }, () => 'q 40 -14 80 0').join(' ')}" fill="none" stroke="#fff" stroke-width="2" opacity=".35"/>${waves}
    ${land(isle(-4, 150, 16, 1))}${land(isle(272, 205, 14, 2))}${land(isle(520, -196, 9, 3))}${land(isle(500, -176, 6, 4))}${land(coast)}
    <path d="M ${MX(-27)} ${MY(-44)} V ${MY(-26)}" stroke="#B98656" stroke-width="8" stroke-linecap="round"/>
    ${[[-30, -60], [-10, -70], [-40, -90], [10, -75], [-55, -75]].map(([z, x], i) => `<g transform="translate(${MX(z)} ${MY(x)})"><path d="M-9 4 V-5 L0 -12 L9 -5 V4 Z" fill="#FFF6E3" stroke="#8E6A4E" stroke-width="1.6"/><path d="M-10 -5 L0 -13 L10 -5" fill="none" stroke="${['#D9735F', '#6E8FC0', '#7FB07A'][i % 3]}" stroke-width="3" stroke-linecap="round"/></g>`).join('')}
    <text x="${MX(-300)}" y="${MY(160)}" class="mr">The Shallows</text><text x="${MX(-300)}" y="${MY(470)}" class="mr">The Swells</text>
    <g transform="translate(${MX(-20)} ${MY(-36)})"><circle r="22" fill="#FFF6E3" stroke="#fff" stroke-width="3" filter="url(#soft)"/><g transform="translate(-12 -12)" color="#5B4A3E">${ic('anchor', 'm')}</g><text x="30" y="6" class="ml">Harbour</text></g>
    ${PLACES.filter((p) => seen(p.id)).map(badge).join('')}
    <g transform="translate(${MX(S.z)} ${MY(S.x)})"><circle r="26" fill="#E8553F" stroke="#fff" stroke-width="3.5" filter="url(#soft)"/><g transform="rotate(${hd})"><path d="M0 -14 L9 10 L0 5 L-9 10 Z" fill="#FFF6E3"/></g></g>
    <rect width="1920" height="1080" filter="url(#grain)"/>
    <g transform="translate(40 34)"><rect width="56" height="44" rx="22" fill="rgba(255,246,227,.85)"/><g transform="translate(16 10)" color="#5B4A3E">${ic('back', 'm')}</g></g>
    <text x="112" y="66" style="font:600 30px Fredoka,sans-serif;fill:#fff">The Little Ocean</text>
    <text x="112" y="100" style="font:800 17px Nunito,sans-serif;fill:#fff;opacity:.92">Places ${S.places.size} / ${PLACES.length}  ·  Fish ${S.seen.size} / ${SPECIES.length}</text>
    <text x="1800" y="68" text-anchor="end" style="font:600 30px Fredoka,sans-serif;fill:#fff">${clockText()}</text><g transform="translate(1812 44)" color="#FFD45A">${ic(weatherIcon(), 'm')}</g>`;
  $('mapSvg').querySelectorAll('svg.m').forEach((s) => { s.setAttribute('width', 26); s.setAttribute('height', 26); });
  $('mapSvg').animate([{ opacity: 0, transform: 'scale(1.04)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' });
}

/* ============================================================ exploration */
function discover(p) {
  S.places.add(p.id); const n = S.places.size;
  S.cine = { t: 0, p, dur: C('letterbox') };
  document.body.classList.add('cine');
  if (snd.master) { const t = snd.ctx.currentTime; snd.master.gain.setTargetAtTime(snd.vol * 0.45, t, 0.15); snd.master.gain.setTargetAtTime(snd.muted ? 0 : snd.vol, t + 1.3, 0.4); }
  snd.discovery();
  setTimeout(() => {   // the stamp lands with dust
    $('stampIco').innerHTML = ic(p.icon); $('stampH').textContent = p.name; $('stampP').textContent = `Discovered · ${n} of ${PLACES.length}`;
    const st = $('stamp'); st.style.opacity = 1;
    st.animate([{ transform: 'translate(-50%,-50%) scale(2.1) rotate(-8deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1) rotate(-3deg)', opacity: 1, offset: 0.7 }, { transform: 'translate(-50%,-50%) scale(1.04) rotate(-3deg)', offset: 0.85 }, { transform: 'translate(-50%,-50%) scale(1) rotate(-3deg)', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.55,0,1,.45)', fill: 'forwards' });
    setTimeout(() => { snd.stamp(); const r = $('stampIco').getBoundingClientRect(); fxp.burst(r.left + r.width / 2, r.top + r.height * 0.9, 34, { col: ['#FFF6E3', '#E9C994', '#CFEFEA'], v: 340, g: 260, size: 5, a0: Math.PI * 1.05, spread: Math.PI * 0.9, life: 0.9 }, rng); fxp.burst(r.left + r.width / 2, r.top + r.height / 2, 16, { col: ['#FFE7A6', '#FFF6E3'], shape: 'star', v: 420, g: 0, size: 7, life: 0.8 }, rng); }, 300);
    setTimeout(() => { st.animate([{ opacity: 1 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(.96) rotate(-3deg)' }], { duration: 500, fill: 'forwards' }); }, 2900);
  }, 420);
  log(`Discovered <b>${p.name}</b>`);
  removeAnchor(glints[p.id]); delete glints[p.id];
}
const glints = {};
function updateExploration() {
  for (const p of PLACES) {
    if (S.places.has(p.id)) continue; const d = Math.hypot(S.x - p.pos[0], S.z - p.pos[1]);
    if (d < C('discoverRadius') && !S.cine) { discover(p); continue; }
    if (d < C('glintRadius') && !glints[p.id]) {
      glints[p.id] = anchorEl('<div class="glint"></div>', () => new THREE.Vector3(p.pos[0], p.top + 2, p.pos[1]));
      glints[p.id].el.firstChild.animate([{ transform: 'translate(-50%,-50%) scale(.6) rotate(0)', opacity: 0.5 }, { transform: 'translate(-50%,-50%) scale(1.15) rotate(45deg)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(.6) rotate(90deg)', opacity: 0.5 }], { duration: 1800, iterations: Infinity, easing: 'ease-in-out' });
      if (!S.glintSeen.has(p.id)) { S.glintSeen.add(p.id); snd.glint(); const c = crew.Tomo; c.state = 'look'; c.stateT = 0; c.lookAt = p; removeAnchor(c.bang); c.bang = anchorEl('<div class="bang q">?</div>', () => c.d.J.neck.localToWorld(new THREE.Vector3(0, 0.75, 0)), 'wl', 2.4); c.bang.dx = -48; }
    } else if (d >= C('glintRadius') + 20 && glints[p.id]) { removeAnchor(glints[p.id]); delete glints[p.id]; }
  }
  // regions
  const r = S.x > C('regionSwellsX') ? 2 : S.x > -30 || Math.hypot(S.x - HARBOUR[0], S.z - HARBOUR[1]) > 70 ? 1 : 0;
  if (r !== S.region) { const prev = S.region; S.region = r;
    if (r > 0 && S.t - S.regionShownAt > 25) { S.regionShownAt = S.t; regionTitle(r); }
    if (r === 0 && prev > 0) homecoming();
    $('region').textContent = ['The Harbour', 'The Shallows', 'The Swells'][r]; $('region').dataset.op = 0.93; $('region').style.opacity = 0.93; setTimeout(() => { $('region').dataset.op = 0; if (!S.inspect) $('region').style.opacity = 0; }, 6000); }
}
function regionTitle(r) {
  $('titleH').textContent = ['', 'The Shallows', 'The Swells'][r]; $('titleP').textContent = ['', 'Calm water · Tier 1', 'Rolling swell · Tier 2'][r];
  $('title').animate([{ opacity: 0, transform: 'translateX(-50%) translateY(14px)', letterSpacing: '.3em' }, { opacity: 1, transform: 'translateX(-50%)', offset: 0.2 }, { opacity: 1, offset: 0.78 }, { opacity: 0, transform: 'translateX(-50%) translateY(-8px)' }], { duration: 4200, easing: 'ease-out' });
  snd.region();
}
function homecoming() { if (cargoCount() < C('cargoCapacity') * 0.6) return; snd.bell(); homeGlow = 1; log('Home again. The harbour bell rings.'); }
let homeGlow = 0;

/* ============================================================ time + weather */
const clockText = () => { const h = Math.floor(S.hour), m = Math.floor((S.hour - h) * 60 / 10) * 10; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; };
let wxK = 0, phaseK = 0, applied = '';
const weatherIcon = () => (wxK > 0.5 ? 'rain' : phaseK > 0.5 ? 'dusk' : S.x > C('regionSwellsX') ? 'cloud' : 'sun');
function updateTime(dt) {
  S.hour += dt * 15 / (C('dayMinutes') * 60); if (S.hour >= 21) S.hour = 6;
  phaseK = smooth(17.4, 19.4, S.hour) * (1 - smooth(20.6, 21, S.hour));
  const swells = smooth(C('regionSwellsX') - C('bandWidth') / 2, C('regionSwellsX') + C('bandWidth') / 2, S.x);
  const cyc = C('drizzleClear') + C('drizzleWet'), wet = (S.t % cyc) > C('drizzleClear') ? 1 : 0;
  wxK = follow(wxK, wet * swells, 0.5, dt);
  const key = phaseK.toFixed(3) + '|' + wxK.toFixed(3);
  if (key !== applied) { applied = key; const Pp = withDrizzle(mixPhase('day', 'dusk', phaseK), wxK); applyPhase(Pp); applyCelPhase(Pp); U.curtainK.value = 0.7 * wxK;
    fx.rain.visible = wxK > 0.02; fx.rain.geometry.instanceCount = Math.round(fx.rainN * Math.min(1, wxK * 2)); fx.ripples.visible = wxK > 0.3; fx.ripples.geometry.instanceCount = Math.round(fx.rippleN * Math.min(1, wxK)); }
  homeGlow = follow(homeGlow, 0, 0.25, dt); U.windowGlow.value = Math.max(U.windowGlow.value, homeGlow * 0.8);
  U.swellA.value = lerp(C('swellShallows'), C('swellSwells'), swells);
  // the Swells water reads cooler
  U.wBody.value.set(lerp(0x4F / 255, 0x4A / 255, swells), lerp(0xB3 / 255, 0x92 / 255, swells), lerp(0xBF / 255, 0xB8 / 255, swells));
  U.wTrough.value.set(lerp(0x44 / 255, 0x3A / 255, swells), lerp(0x9B / 255, 0x76 / 255, swells), lerp(0xAE / 255, 0xA2 / 255, swells));
  $('clockT').textContent = clockText(); const wi = weatherIcon(); if ($('clockW').dataset.w !== wi) { $('clockW').dataset.w = wi; $('clockW').innerHTML = ic(wi); pop($('clockW'), 1.2, 300); }
}

/* ============================================================ sailing physics */
const tmp = new THREE.Vector3();
function updateBoat(dt) {
  const steer = (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) - (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0);
  if (!S.screen && !S.cine) {
    for (const [k, d] of [['KeyW', 1], ['KeyS', -1]]) if (keys.has(k)) { S.notchHold += dt; if (S.notchHold > C('notchRepeat') * 1.6) { S.notchHold -= C('notchRepeat'); notch(d); } }
  }
  const inputSteer = S.screen ? 0 : steer;
  S.rudder = follow(S.rudder, inputSteer, C('rudderEase'), dt);
  if (Math.abs(S.rudder) > 0.85 && Math.abs(S.speed) > 3 && S.t - (S.lastCreak || 0) > 2.5) { S.lastCreak = S.t; snd.creak(); }
  // speed toward the notch
  const target = S.anchored ? 0 : S.notch >= 0 ? S.notch / 4 * C('maxSpeed') : -C('reverseSpeed');
  const a = target > S.speed ? C('accel') : (S.anchored ? C('anchorBrake') : C('decel'));
  S.speed += clamp(target - S.speed, -a * dt, a * dt);
  // surf: the wave slope along the hull pushes the boat (down a face = faster)
  const [fx_, fz_] = fwd(), A = U.swellA.value;
  const hb = swellH(S.x + fx_ * 3.4, S.z + fz_ * 3.4, S.t, A), hs = swellH(S.x - fx_ * 3.4, S.z - fz_ * 3.4, S.t, A), slope = (hb - hs) / 6.8;
  if (!S.anchored) S.speed += -slope * C('surfK') * dt * 9.8 * 0.12;
  // turning: needs way on; a little pivot at rest
  const sf = clamp(0.2 + Math.abs(S.speed) / 4, 0, 1), turn = C('turnRate') * lerp(C('turnAtRest'), 1, sf) * Math.sign(S.speed || 1);
  S.yawVel = follow(S.yawVel, S.rudder * turn, C('yawInertia'), dt);
  S.yaw += S.yawVel * dt;
  // move
  let nx = S.x + fx_ * S.speed * dt, nz = S.z + fz_ * S.speed * dt;
  [nx, nz] = collide(nx, nz);
  S.x = nx; S.z = nz;
  // pose: heave/pitch/roll from the swell + lean + nose-up
  const accelNow = (S.speed - S.prevSpeed) / Math.max(dt, 1e-3); S.prevSpeed = S.speed;
  S.pitchK = follow(S.pitchK, -accelNow * C('noseUpK'), 4, dt);
  const lean = clamp(-S.yawVel * S.speed * C('leanK'), -C('leanMax'), C('leanMax'));
  S.rollK = follow(S.rollK, lean, 3, dt);
  const h0 = swellH(S.x, S.z, S.t, A), [rx, rz] = [-fz_, fx_];
  const hp = swellH(S.x + rx * 1.2, S.z + rz * 1.2, S.t, A), hst = swellH(S.x - rx * 1.2, S.z - rz * 1.2, S.t, A);
  const wavePitch = Math.atan((hb - hs) / 6.8) * 0.85, waveRoll = -Math.atan((hp - hst) / 2.4) * 0.7;
  const prevHeave = S.heave; S.heave = h0 * 0.9;
  boat.group.position.set(S.x, S.heave, S.z);
  boat.group.rotation.set(wavePitch + S.pitchK, S.yaw, waveRoll + S.rollK, 'YXZ');
  boatBlob.position.set(S.x, h0 + 0.05, S.z); boatBlob.rotation.set(-Math.PI / 2, 0, S.yaw);
  // bow slap on big swells: splash + a little trauma
  const vy = (S.heave - prevHeave) / Math.max(dt, 1e-3);
  if (vy < -0.9 * A && S.t - S.lastSlap > 1.2 && Math.abs(S.speed) > 2 && A > 0.8) { S.lastSlap = S.t; snd.slap(); S.trauma = Math.min(C('traumaMax'), S.trauma + 0.12 + 0.12 * (A - 0.8)); splashAt(boatPoint(0, 0, -3.8), 14); }
  // wake: two arms of foam puffs from the stern + a bow wave, rate and size scale with speed
  const sp = Math.abs(S.speed), k = sp / C('maxSpeed');
  if (sp > 0.4 && !S.anchored) {
    S.wakeAcc = (S.wakeAcc || 0) + dt * (6 + 34 * k);
    while (S.wakeAcc > 1) { S.wakeAcc -= 1;
      for (const s of [-1, 1]) { const p = boatPoint(s * (0.9 + rng() * 0.35), 0, 3.5 + rng() * 0.4); const out = (0.7 + 1.3 * k) * 0.6;
        puff(p.x, p.z, rx * s * out - fx_ * 0.4, rz * s * out - fz_ * 0.4, 0.12 + 0.06 * k, 0.24 + 0.36 * k * (0.6 + rng() * 0.8), 1.4 + 1.6 * k, Math.min(0.6, 0.3 + 0.3 * k)); }
      if (k > 0.3 && rng() < 0.6) { const p = boatPoint(0, 0, -3.95); const s = rng() < 0.5 ? -1 : 1; puff(p.x + rx * s * 0.5, p.z + rz * s * 0.5, rx * s * 3 * k, rz * s * 3 * k, 0.12, 0.45 * k + 0.1, 0.7, 0.75); }
    }
  }
  // bow spray particles at speed
  if (k > 0.6 && rng() < (k - 0.6) * 0.9) { const p = toScreen(boatPoint(0, 0.3, -3.9)); p && fxp.burst(p.x, p.y, 2, { col: ['#FFFFFF', '#E6F6F3'], v: 180, g: 520, size: 3.5, a0: -Math.PI * 0.9, spread: Math.PI * 0.8, life: 0.6 }, rng); }
  // foam collar + drift wake (preview SDF) on the boat
  for (const m of [fx.collar, fx.wake]) { m.material.uniforms.uOrigin.value.set(S.x, 0, S.z); m.material.uniforms.uYaw.value = S.yaw; }
  fx.wake.visible = sp > 0.3 && sp < 1.5 && !S.anchored;
  fx.ripples.material.uniforms.uOrigin.value.set(S.x, 0, S.z);
  snd.ambience(k, smooth(0.45, 1.35, A), dt);
}
function splashAt(v, n) { const p = toScreen(v); p && fxp.burst(p.x, p.y, n, { col: ['#FFFFFF', '#CFEFEA', '#9FD8D6'], v: 300, g: 800, size: 5, a0: -Math.PI, spread: Math.PI }, rng); }
function collide(nx, nz) {
  let hit = false; const [fx_, fz_] = fwd();
  for (const off of [3.4, 0, -3.4]) {
    let px = nx + fx_ * off, pz = nz + fz_ * off;
    if (px < BOUNDS.x0 + (Math.abs(pz + 25) < 3.5 && px < -24 ? 18 : 0)) { /* coast or pier */ }
    if (px < -44.5) { nx += -44.5 - px; hit = true; }
    if (pz > -27.6 && pz < -24.4 && px < -25 && px > -45) { const d = pz > -26 ? -24.4 - pz : -27.6 - pz; nz += d; hit = true; }
    for (const [cx, cz, r] of colliders) { const dx = px - cx, dz = pz - cz, d = Math.hypot(dx, dz), rr = r + 1.6; if (d < rr) { nx += dx / d * (rr - d); nz += dz / d * (rr - d); hit = true; } }
    if (px > BOUNDS.x1) { nx -= (px - BOUNDS.x1) * 0.2; hit = hit || px > BOUNDS.x1 + 6; }
    if (pz < BOUNDS.z0) { nz += (BOUNDS.z0 - pz) * 0.2; hit = hit || pz < BOUNDS.z0 - 6; }
    if (pz > BOUNDS.z1) { nz -= (pz - BOUNDS.z1) * 0.2; hit = hit || pz > BOUNDS.z1 + 6; }
  }
  if (hit && S.t > S.bumpCD) { S.bumpCD = S.t + 0.8; if (Math.abs(S.speed) > 1.2) { snd.bump(); S.trauma = Math.min(C('traumaMax'), S.trauma + 0.12); splashAt(boatPoint(0, 0, -3.6), 12); } S.speed *= 0.35; if (S.notch > 1) S.notch = 1; }
  return [nx, nz];
}

/* ============================================================ camera (3C) */
const camS = { yaw: S.yaw + Math.PI, dist: C('camDist'), fov: C('fovBase'), tx: S.x, tz: S.z, ty: 2.8 };
function updateCamera(dt) {
  const k = Math.abs(S.speed) / C('maxSpeed');
  // idle drift: after a while with no input, widen slowly and orbit a touch
  const idle = S.t - S.lastInput > C('idleWiden') && !S.screen; S.idleK = follow(S.idleK, idle ? 1 : 0, 0.25, dt);
  if (idle && S.t - (S.lastHum || -99) > 45) { S.lastHum = S.t; snd.hum(); }
  { const away = S.t - S.lastInput > 60 && !S.screen; $('bar').style.opacity = away ? 0 : ''; $('log').style.opacity = away ? 0 : ''; }
  if (!S.dragging && S.t - S.lastInput > 1.6) { S.orbitYaw = follow(S.orbitYaw, 0, 1.2, dt); S.orbitPitch = follow(S.orbitPitch, 0, 1.2, dt); }
  let wantYaw = S.yaw + S.yawVel * C('camLeadTurn') + S.orbitYaw + S.idleK * 0.6 * Math.sin(S.t * 0.05);
  const [fx_, fz_] = fwd();
  let tx = S.x + fx_ * C('camLeadAhead') * S.speed, tz = S.z + fz_ * C('camLeadAhead') * S.speed, ty = 4.4;
  let dist = (C('camDist') + C('camSpeedPull') * Math.abs(S.speed)) * S.zoom * (1 + 0.45 * S.idleK), pitch = C('camHeight') + S.orbitPitch + 0.06 * S.idleK;
  if (S.cine) { // discovery push-in: frame the landmark between boat and camera, steering stays live
    const c = S.cine, u = c.t / c.dur, w = Math.sin(Math.min(1, u) * Math.PI) ** 0.7, [px, pz] = c.p.pos;
    const toYaw = Math.atan2(-(px - S.x), -(pz - S.z));   // look from behind the boat toward the place
    wantYaw = wantYaw + angDiff(toYaw, wantYaw) * w; tx = lerp(tx, (S.x + px) / 2, w * 0.55); tz = lerp(tz, (S.z + pz) / 2, w * 0.55); ty = lerp(ty, c.p.top * 0.45, w);
    dist *= 1 - 0.18 * w; pitch -= 0.06 * w;
    c.t += dt; if (c.t > c.dur) { S.cine = null; document.body.classList.remove('cine'); }
  }
  camS.yaw += angDiff(wantYaw, camS.yaw) * (1 - Math.exp(-C('camYawFollow') * dt));
  camS.tx = follow(camS.tx, tx, 3.5, dt); camS.tz = follow(camS.tz, tz, 3.5, dt); camS.ty = follow(camS.ty, ty + S.heave * 0.35, 3, dt);
  camS.dist = follow(camS.dist, dist, 2.2, dt);
  camS.fov = follow(camS.fov, C('fovBase') + C('fovSpeed') * k, 2, dt);
  const cp = Math.cos(pitch);
  cam.position.set(camS.tx + Math.sin(camS.yaw) * cp * camS.dist, camS.ty + Math.sin(pitch) * camS.dist, camS.tz + Math.cos(camS.yaw) * cp * camS.dist);
  cam.lookAt(camS.tx, camS.ty, camS.tz);
  // trauma shake (roll-dominant, squared, smooth noise)
  S.trauma = Math.max(0, S.trauma - C('traumaDecay') * dt * 0.5); const sh = S.trauma * S.trauma;
  cam.rotateZ(sh * 0.042 * Math.sin(S.t * 23.1)); cam.rotateX(sh * 0.02 * Math.sin(S.t * 17.3 + 1)); cam.rotateY(sh * 0.02 * Math.sin(S.t * 19.7 + 2));
  // gentle breathing bob
  cam.position.y += Math.sin(S.t * 0.6) * 0.08;
  cam.fov = camS.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  // the far world follows the boat (sea grid, sky, backdrop rings)
  world.sea.position.set(Math.round(S.x / 4) * 4, 0, Math.round(S.z / 4) * 4);
  for (const f of world.followers) f.position.set(S.x, f.position.y, S.z);
}

/* ============================================================ crew + props animation */
let fxRingTT = 0;
function updateCrew(dt) {
  const tw = Math.floor(S.t * 12), A = U.swellA.value;
  for (const c of Object.values(crew)) {
    let pose;
    if (c.state === 'cheer') pose = POSE.cheer; else if (c.state === 'look') pose = POSE.look;
    else if (c.mode === 'rest') pose = POSE.rest;
    else { const dr = drawingAt(TIMING[c.name], S.t, c.off); pose = TIMING[c.name][dr.i][0]; }
    if (c.poseRef !== pose) { c.poseRef = pose; applyPose(c.d, pose); }
    // head turns toward a glint
    if (c.state === 'look' && c.lookAt) { const wp = c.d.root.getWorldPosition(tmp); const a = Math.atan2(c.lookAt.pos[0] - wp.x, c.lookAt.pos[1] - wp.z); c.d.J.neck.rotation.y = clamp(angDiff(a, S.yaw + c.ry + Math.PI), -1.2, 1.2); } else c.d.J.neck.rotation.y *= 0.9;
    if (c.state === 'cheer') { c.d.root.position.y = boat.deckY(STATIONS[c.name][1]) + Math.abs(Math.sin(c.stateT * 9)) * 0.16; } else c.d.root.position.y = boat.deckY(STATIONS[c.name][1]);
  }
  const pd = Math.floor(tw / 2) % 3, wind = 1 + Math.abs(S.speed) / C('maxSpeed');
  boat.pennant.rotation.y = [-0.35, -0.55, -0.25][pd] * wind; boat.pennant.scale.set([1, 0.92, 1.04][pd], [1, 1.08, 0.95][pd], 1);
  boat.group.updateMatrixWorld(true);
  // Pip's bobber + line (lines out only while fishing)
  const fishing = crew.Pip.mode === 'fish';
  pipLine.visible = bobber.visible = fishing; tomoLine.visible = crew.Tomo.mode === 'fish';
  if (fishing) { const w = crewWater(crew.Pip), by = swellH(w.x, w.z, S.t, A) + (crew.Pip.state === 'bite' ? -0.25 + 0.12 * Math.sin(S.t * 40) : 0);
    bobber.position.set(w.x, by + 0.02, w.z); rod.children[0].localToWorld(tmp.set(0, 2.0, 0));
    const p = pipLine.geometry.attributes.position, n = p.count; for (let i = 0; i < n; i++) { const u = i / (n - 1); p.setXYZ(i, tmp.x + (w.x - tmp.x) * u, tmp.y + (by + 0.08 - tmp.y) * u - Math.sin(u * Math.PI) * (crew.Pip.state === 'bite' ? 0.05 : 0.35), tmp.z + (w.z - tmp.z) * u); } p.needsUpdate = true; }
  if (tomoLine.visible) { crew.Tomo.d.J.handR.localToWorld(tmp.set(0, -0.04, 0)); const w = crewWater(crew.Tomo), wy = swellH(w.x, w.z, S.t, A), r = boatPoint(-1.36, boat.deckY(1.0) + 0.26, 1.0);
    const p = tomoLine.geometry.attributes.position, n = p.count; for (let i = 0; i < n; i++) { const u = i / (n - 1); const a = u < 0.35 ? u / 0.35 : (u - 0.35) / 0.65; if (u < 0.35) p.setXYZ(i, tmp.x + (r.x - tmp.x) * a, tmp.y + (r.y - tmp.y) * a, tmp.z + (r.z - tmp.z) * a); else p.setXYZ(i, r.x + (w.x - r.x) * a, r.y + (wy - r.y) * a, r.z + (w.z - r.z) * a); } p.needsUpdate = true; }
  // catch ring + beam
  fxRingT += dt; const ck = Math.floor(fxRingT * 12); fx.ring.visible = ck < 6; if (fx.ring.visible) { fx.ring.material.uniforms.uDraw.value = ck; fx.ring.material.uniforms.uOrigin.value.copy(fxRingPos); }
  beamT += dt; beam.material.opacity = beamT < 1.6 ? 0.55 * Math.sin(Math.min(1, beamT / 1.6) * Math.PI) : 0; beam.scale.set(1 + 0.1 * Math.sin(S.t * 8), 1, 1 + 0.1 * Math.sin(S.t * 8));
  // spots: buoys bob, gulls circle; discoveries bob
  for (const s of spots) { const near = Math.hypot(S.x - s.x, S.z - s.z) < 220; s.grp.visible = near;
    if (!near) continue;
    for (const b of s.buoys) { const h = swellH(b.x, b.z, S.t, A); b.b.position.set(b.x, h - 0.15, b.z); b.b.rotation.set(Math.sin(S.t * 1.3 + b.ph) * 0.15, 0, Math.cos(S.t * 1.1 + b.ph) * 0.15); }
    for (const g of s.gulls) { const a = S.t * g.w + g.ph; g.g.position.set(s.x + Math.cos(a) * g.r, g.h + Math.sin(a * 2.1) * 0.8, s.z + Math.sin(a) * g.r); g.g.rotation.set(0, Math.atan2(Math.sin(a), -Math.cos(a)) + Math.PI, Math.sin(a * 2.1) * 0.15 - 0.25); const wd = Math.floor(tw / 2 + g.ph * 3) % 4, wa = [0.55, 0.05, -0.45, 0.05][wd]; g.wl.rotation.z = wa; g.wr.rotation.z = -wa; }
    // fish shimmer: little white flicks on the water
    if (rng() < dt * 2.5) { const a = rng() * Math.PI * 2, r = rng() * C('spotRadius') * 0.8; puff(s.x + Math.cos(a) * r, s.z + Math.sin(a) * r, 0, 0, 0.1, 0.7, 0.6, 0.9); }
  }
  { const [x, z] = PLACES[4].pos, h = swellH(x, z, S.t, A); bellBuoy.position.set(x, h - 0.3, z); bellBuoy.rotation.set(Math.sin(S.t * 0.9) * 0.08, 0, Math.cos(S.t * 0.7) * 0.08); }
  { const [x, z] = PLACES[1].pos; wreck.position.y = swellH(x, z, S.t, A) * 0.15 - 0.3; }
  for (const m of world.moored) { const h = swellH(m.x, m.z, S.t, A * 0.35); m.m.position.y = h; m.m.rotation.set(0, m.ry, 0.04 * Math.sin(S.t * 0.9 + m.ph)); }
  world.clouds.rotation.y = S.t * 0.0015;
  // wake puffs
  for (const p of puffs) { if (!p.m.visible) continue; p.life += dt; const u = p.life / p.max; if (u >= 1) { p.m.visible = false; continue; }
    p.x += p.vx * dt; p.z += p.vz * dt; p.vx *= 0.985; p.vz *= 0.985; const s = lerp(p.s0, p.s1, ease.out(u));
    p.m.position.set(p.x, swellH(p.x, p.z, S.t, A) + 0.06, p.z); p.m.scale.setScalar(s); p.m.material.opacity = p.op * (1 - u) * (u < 0.1 ? u / 0.1 : 1); }
}

/* ============================================================ compass + docks HUD */
function updateCompass() {
  const [fx_, fz_] = fwd(), hdg = bearing(fx_, fz_) * 180 / Math.PI, W = $('compass').clientWidth, ppd = W / 180;
  let h = '';
  for (let d = 0; d < 360; d += 15) { const rel = ((d - hdg + 540) % 360) - 180; if (Math.abs(rel) > 86) continue; const x = W / 2 + rel * ppd, L = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[d]; h += L ? `<span style="left:${x}px">${L}</span>` : `<i class="${d % 45 ? '' : 'm'}" style="left:${x}px"></i>`; }
  const mark = (dx, dz, icon, cls = '') => { let rel = ((bearing(dx, dz) * 180 / Math.PI - hdg + 540) % 360) - 180; rel = clamp(rel, -82, 82); h += `<b class="${cls}" style="left:${W / 2 + rel * ppd}px">${ic(icon)}</b>`; };
  const full = cargoCount() >= C('cargoCapacity');
  mark(HARBOUR[0] - S.x, HARBOUR[1] - S.z, 'anchor', full ? 'glow' : '');
  for (const p of PLACES) if (S.places.has(p.id) || glints[p.id]) mark(p.pos[0] - S.x, p.pos[1] - S.z, p.icon, S.places.has(p.id) ? '' : 'amber');
  $('compass').innerHTML = h;
}
const dockLabels = DOCKS.map((d) => anchorEl(`<div class="lab" style="font-size:calc(var(--u)*16);opacity:.9">${ic(d.id === 'fish' ? 'fish' : 'anchor')}${d.label}</div>`, () => new THREE.Vector3(d.pos[0] + 2, 6, d.pos[1])));
function updateDocks() {
  const d = nearDock(); if (d !== S.docked) { S.docked = d; renderBar(); if (d) { snd.ui(3); pop($('bar').firstElementChild, 1.12, 320); hint('dock', `Press E to talk to the ${d.name.toLowerCase()}`, 5); } }
  for (const [i, a] of dockLabels.entries()) { const dd = Math.hypot(S.x - DOCKS[i].pos[0], S.z - DOCKS[i].pos[1]); a.el.style.visibility = dd < 90 ? 'visible' : 'hidden'; }
}

/* ============================================================ frame */
let rtW = 0, rtH = 0;
function resize() {
  const w0 = innerWidth, h0 = innerHeight, s = Math.min(1, 1280 / w0, 720 / h0), w = Math.round(w0 * s), h = Math.round(h0 * s);
  if (w === rtW && h === rtH) return; rtW = w; rtH = h; renderer.setSize(w, h, false); post.setSize(w, h); CELU.rtW.value = w; CELU.rtH.value = h; cam.aspect = w / h; cam.updateProjectionMatrix();
}
resize();
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.066, (now - last) / 1000); last = now; step(dt);
}
function step(dt) {
  S.t += dt; U.time.value = S.t;
  updateTime(dt);
  if (started) { updateBoat(dt); updateFishing(dt); updateExploration(); updateDocks(); }
  else { S.yaw += dt * 0.0; updateBoat(dt); }
  updateCamera(dt); updateCrew(dt); updateCompass(); updateAnchors(); fxp.update(dt);
  post.mat.uniforms.wob.value = 1.8 * (1 - 0.5 * smooth(0.2, 1.2, Math.abs(S.yawVel) + Math.abs(camS.yaw - (S.lastCamYaw ?? camS.yaw)) / Math.max(dt, 1e-3))); S.lastCamYaw = camS.yaw;
  shadow.update(renderer, env, world.casters);
  renderer.setRenderTarget(post.rt); renderer.clear(); renderer.render(env, cam);
  post.render(renderer);
  renderer.autoClear = false; renderer.render(late, cam); renderer.autoClear = true;
}
updateCargoHUD(); renderBar(); updateTime(0);
requestAnimationFrame(frame);
$('start').addEventListener('click', () => {
  if (started) return; started = true; snd.start(); snd.setVolume(C('volume')); S.lastInput = S.t;
  $('start').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: 'forwards' }); setTimeout(() => $('start').remove(), 620);
  snd.chime(349.23, 0.12, 1.6); setTimeout(() => hint('sail', 'Tap W to set the throttle · sail out to the buoy rings to fish', 7), 900);
  log('Mabel, Pip and Tomo are aboard.');
});
// test hooks (capture / QA only)
window.__lo = { S, crew, step, discover: (i) => discover(PLACES[i]), give: (n) => { for (let i = 0; i < n; i++) S.cargo.push({ id: SPECIES[i % 6].id, size: 20 }); updateCargoHUD(true); }, openFishmonger, openMap, openMenu, start: () => $('start').click(), land: (name = 'Pip') => landFish(crew[name]), spots, PLACES };
