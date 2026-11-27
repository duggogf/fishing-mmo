// PROTOTYPE - NOT FOR PRODUCTION
// Little Ocean — feel prototype. Sailing 3C, automatic fishing, selling, exploration; juice first (juice-bible.md).
// Rendering reuses the GDD preview's painted-cel scene (scene/, forked). Tuning lives in config.js (window.CONFIG).
import * as THREE from './vendor/three.module.js';
import { mixPhase, withDrizzle, swellH, calm, SWELL_GLSL } from './scene/phases.js';
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
  person: '<circle cx="12" cy="7.5" r="3.2"/><path d="M5.5 20v-2.2a4.3 4.3 0 0 1 4.3-4.3h4.4a4.3 4.3 0 0 1 4.3 4.3V20"/>',
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
// harbour: entering the basin offers "Dock"; docking moors the boat and shows the whole quay (owner feedback)
const BUILDINGS = [
  { id: 'fish', name: 'Fishmonger', icon: 'fish', h: [-55, -44, 6, 7, 4.6] },
  { id: 'inn', name: 'Inn · crew board', icon: 'person', h: [-56, -33, 5.5, 6.5, 5.6] },
  { id: 'yard', name: 'Shipyard', icon: 'anchor', h: [-57, -10, 5, 6, 5.0] },
];
const DOCK_ZONE = { x: -28, z: -30, r: 30 }, BERTH = { x: -36, z: -38, yaw: -Math.PI / 2 };
const harbourCamObj = new THREE.PerspectiveCamera();   // cameras look down -z, so lookAt gives the right rotation
const HARBOUR_CAM = { pos: new THREE.Vector3(-4, 31, -20), look: new THREE.Vector3(-50, 3, -28) };
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
const hull = celHull(2.5), hullSmall = celHull(2.5, { value: 0.4 }), crewHull = celHull(2.6, undefined, 0.24);

/* ---------- boat + crew */
const boat = buildBoat(fillBoat, fillProp, hull); late.add(boat.group);
const exhaust = new THREE.Group(); boat.group.add(exhaust);
const boatBlob = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 10.5), blobMat(0.45)); boatBlob.rotation.x = -Math.PI / 2; late.add(boatBlob);
const STATIONS = { Mabel: [-0.7, 2.75, -Math.PI / 2 - 0.15, 0.0, [-2.5, 3.2]], Tomo: [-0.78, 1.05, -Math.PI / 2 + 0.12, 0.9, [-2.6, 0.7]], Pip: [0.52, -2.55, 2.05, 0.45, [4.4, -6.2]] };
const crew = {};
const P = (o) => ({ y: 0, tx: 0, ty: 0, hx: 0, hy: 0, L: [0.15, 0.08, 0.2], R: [0.15, 0.08, 0.2], lL: [0, 0], lR: [0, 0], tool: 0, ...o });
const POSE = {
  rest: P({ y: -0.12, tx: 0.2, hx: 0.15, L: [0.25, 0.1, 0.9], R: [0.25, 0.1, 0.9], lL: [1.2, 1.5], lR: [1.1, 1.4] }),
  cheer: P({ y: 0.06, tx: -0.12, hx: -0.3, L: [2.85, 0.35, 0.15], R: [2.85, 0.35, 0.15], lL: [0.15, 0.1], lR: [0, 0] }),
  look: P({ tx: -0.05, hx: -0.15, L: [0.2, 0.1, 0.3], R: [1.6, 0.2, 0.1] }),
  pullA: P({ y: -0.05, tx: -0.32, hx: 0.1, L: [1.5, 0.15, 0.6], R: [1.3, 0.15, 0.8], lL: [0.5, 0.6], lR: [-0.2, 0.1] }),
  pullB: P({ y: -0.02, tx: -0.18, hx: -0.05, L: [1.9, 0.1, 0.3], R: [1.7, 0.1, 0.4], lL: [0.4, 0.5], lR: [-0.1, 0.05] }),
  aw: P({ y: -0.06, tx: 0.38, hx: 0.45, L: [0.05, 0.05, 0.1], R: [0.05, 0.05, 0.1] }),
};
for (const name of Object.keys(CREW)) {
  const d = buildDummy(CREW[name], fillCrew, crewHull); const [x, z, ry, off, water] = STATIONS[name];
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
function fishMesh(sp, hl = hull) {
  if (sp.item) { const grp = new THREE.Group();
    if (sp.id === 'Bottle') { part(grp, new THREE.CylinderGeometry(0.09, 0.1, 0.32, 14), '#7FC8C4', 0, 0, 0, [0, 0, 0], [0.1, 0.16, 0.1], hl); part(grp, new THREE.CylinderGeometry(0.035, 0.06, 0.12, 10), '#7FC8C4', 0, 0.21, 0, [0, 0, 0], [0.06, 0.06, 0.06], hl); part(grp, new THREE.CylinderGeometry(0.035, 0.035, 0.06, 8), '#B98656', 0, 0.29, 0, [0, 0, 0], [0.04, 0.03, 0.04], hl); part(grp, new THREE.BoxGeometry(0.1, 0.18, 0.02), '#FFF6E3', 0, -0.01, 0, [0, 0, 0], [0.05, 0.09, 0.01], hl); grp.rotation.z = 1.3; }
    else { const sh = part(grp, new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#E7B7C8', 0, -0.04, 0, [0, 0, 0], [0.2, 0.1, 0.2], hl); sh.rotation.x = Math.PI; part(grp, new THREE.SphereGeometry(0.1, 16, 12), '#F7F2FB', 0, 0.04, 0, [0, 0, 0], [0.1, 0.1, 0.1], hl); }
    const outer = new THREE.Group(); outer.add(grp); return outer; }
  if (!fishGeo[sp.id]) {
    const g = new THREE.SphereGeometry(1, 12, 8); g.scale(0.09, 0.11, 0.24); inkPrep(g, sp.col, [0, 0, 0], [0.09, 0.11, 0.24]);
    { const c = g.attributes.color, p = g.attributes.position, b = new THREE.Color(sp.belly); for (let i = 0; i < p.count; i++) if (p.getY(i) < -0.04) c.setXYZ(i, b.r, b.g, b.b); }
    const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(-0.12, 0.16), new THREE.Vector2(0.12, 0.16)]); const tg = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false }); tg.translate(0, 0, -0.015); tg.rotateX(Math.PI / 2); inkPrep(tg, sp.col, [0, 0, 0.08], [0.12, 0.05, 0.1]);
    fishGeo[sp.id] = [g, tg];
  }
  const grp = new THREE.Group(); const [g, tg] = fishGeo[sp.id]; grp.add(inked(g, fillProp, hl)); const tl = inked(tg, fillProp, hl); tl.position.z = 0.2; grp.add(tl); return grp;
}
const flyingFish = [];
// square icons rendered once from each species' cel model (cargo, fishmonger, catch flights)
const thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
thumbR.setPixelRatio(1); thumbR.setSize(160, 160, false); thumbR.outputColorSpace = THREE.LinearSRGBColorSpace; thumbR.toneMapping = THREE.NoToneMapping; thumbR.setClearColor(0x000000, 0);
function makeThumbs() {
  const sc = new THREE.Scene(), tc = new THREE.PerspectiveCamera(26, 1, 0.05, 20), th = celHull(22);
  tc.position.set(0.18, 0.42, 1.5); tc.lookAt(0, 0, 0.0);
  const w = CELU.rtW.value, h = CELU.rtH.value; CELU.rtW.value = 160; CELU.rtH.value = 160;
  for (const sp of SPECIES) { const m = fishMesh(sp, th); m.rotation.set(0.15, -Math.PI / 2, 0.18); m.position.x = -0.05; sc.add(m); thumbR.render(sc, tc); sp.img = thumbR.domElement.toDataURL(); sc.remove(m); }
  CELU.rtW.value = w; CELU.rtH.value = h;
}
const fishImg = (sp, cls = '') => `<img class="${cls}" src="${sp.img}" alt="${sp.name}">`;
const stars = (r) => '★'.repeat(r + 1) + `<span style="color:#D8CBB0">${'★'.repeat(2 - r)}</span>`;
function tile(sp, o = {}) { return `<div class="tile r${sp.rarity}" data-sp="${sp.id}" ${o.size ? `data-size="${o.size}"` : ''} ${o.total != null ? `data-total="${o.total}"` : ''}>${fishImg(sp)}<span class="rs">${stars(sp.rarity)}</span>${o.badge ? `<span class="n">${o.badge}</span>` : ''}</div>`; }
// MMO-style hover card
const tip = document.createElement('div'); tip.id = 'tip'; document.body.appendChild(tip);
addEventListener('mouseover', (e) => { const el = e.target.closest && e.target.closest('.tile[data-sp]'); if (!el) { tip.style.display = 'none'; return; }
  const sp = SPECIES.find((s) => s.id === el.dataset.sp), size = el.dataset.size;
  tip.innerHTML = `<div class="th">${fishImg(sp)}<div><h5>${sp.name}</h5><div class="st">${stars(sp.rarity)} <span>${RARITY[sp.rarity]}</span></div></div></div>
    <div class="tr"><span>${sp.item ? 'Kind' : 'Size'}</span><b>${sp.item ? 'Rare find' : size && size !== '0' ? size + ' cm' : `${sp.size[0]}–${sp.size[1]} cm`}</b></div>${S.best[sp.id] ? `<div class="tr"><span>Your biggest</span><b>${S.best[sp.id]} cm</b></div>` : ''}
    <div class="tr"><span>Sells for</span><b>${price(sp)} ${ic('shell')} each</b></div><div class="tr"><span>Found in</span><b>${sp.region === 1 ? 'The Shallows' : 'The Swells'}</b></div>`;
  tip.style.display = 'block'; snd.ui(7); });
addEventListener('mousemove', (e) => { if (tip.style.display !== 'block') return; const r = tip.getBoundingClientRect(); tip.style.left = Math.min(innerWidth - r.width - 12, e.clientX + 18) + 'px'; tip.style.top = Math.min(innerHeight - r.height - 12, e.clientY + 14) + 'px'; });

/* ---------- golden beam (flat inked cel, not bloom) for rare finds */
const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, 14, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#FFD45A', transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide }));
beam.frustumCulled = false; late.add(beam);

/* ---------- inked props helper */
const part = (grp, g, col, x, y, z, c = [0, 0, 0], h = [0.5, 0.5, 0.5], hl = hull) => { inkPrep(g, col, c, h); const m = inked(g, fillProp, hl); m.position.set(x, y, z); grp.add(m); return m; };

/* ---------- the anchor (inked iron) and its chain */
const anchor = new THREE.Group(); anchor.scale.setScalar(1.6); late.add(anchor);
{ const iron = '#4E4A56';
  part(anchor, new THREE.BoxGeometry(0.09, 0.95, 0.09), iron, 0, 0, 0, [0, 0, 0], [0.05, 0.48, 0.05]);
  part(anchor, new THREE.BoxGeometry(0.62, 0.09, 0.09), iron, 0, -0.42, 0, [0, 0, 0], [0.31, 0.05, 0.05]);
  for (const s of [-1, 1]) { const f = part(anchor, new THREE.BoxGeometry(0.1, 0.26, 0.09), iron, s * 0.31, -0.3, 0, [0, 0, 0], [0.05, 0.13, 0.05]); f.rotation.z = -s * 0.5; }
  part(anchor, new THREE.BoxGeometry(0.5, 0.07, 0.07), '#8A6A52', 0, 0.36, 0, [0, 0, 0], [0.25, 0.04, 0.04]);
  const ring = new THREE.TorusGeometry(0.09, 0.025, 6, 12); inkPrep(ring, iron, [0, 0, 0], [0.1, 0.1, 0.03]); ring.setAttribute('smoothN', ring.attributes.normal.clone()); const rm = inked(ring, fillProp, hull); rm.position.y = 0.53; anchor.add(rm); }
const anc = { state: 'stowed', t: 0, bit: false, world: new THREE.Vector3(), from: new THREE.Vector3() };
const chain = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(10 * 3), 3)); const l = new THREE.Line(g, inkLineMat()); l.frustumCulled = false; l.visible = false; late.add(l); return l; })();
const HAWSE = () => boatPoint(0.42, boat.deckY(-3.75) + 0.1, -3.95);          // chain comes out here (bow, starboard)
const STOW = () => boatPoint(0.5, boat.deckY(-3.75) - 0.75, -4.12);           // anchor hangs outside the hull at the bow
function updateAnchor(dt) {
  anc.t += dt; const A = U.swellA.value;
  if (anc.state === 'stowed') { anchor.position.copy(STOW()); anchor.quaternion.copy(boat.group.quaternion); anchor.rotateY(0.25); anchor.rotateX(-0.12 + 0.05 * Math.sin(S.t * 2.1) + S.ps.x * 2); chain.visible = false; return; }
  if (anc.state === 'drop') {                                        // falls straight down off the bow
    const k = Math.min(1, anc.t / 0.32), s = STOW(), wp = s.clone(); wp.y = swellH(s.x, s.z, S.t, A);
    if (!anc.splashed) { anchor.position.set(s.x, lerp(s.y, wp.y - 0.2, k * k), s.z); anchor.quaternion.copy(boat.group.quaternion); anchor.rotateY(0.25 + k * 0.6); }
    if (k >= 1 && !anc.splashed) { anc.splashed = true; anc.world.copy(wp); snd.splash(1.1); snd.noise('brown', 0.35, 0.4, 500, 120); splash3(wp, 22, 1.1); }
    if (anc.splashed) anchor.position.set(anc.world.x, anc.world.y - 0.3 - (anc.t - 0.32) * 3, anc.world.z);
    if (anc.t > 0.55 && !anc.bit) { anc.bit = true; anc.state = 'down'; anc.t = 0;   // bites: the bow is pulled down and forward
      const f = Math.min(1, Math.abs(S.speed) / C('maxSpeed')); S.ps.v -= 0.15 + 0.5 * f; S.trauma = Math.min(C('traumaMax'), S.trauma + 0.08 + 0.18 * f); if (f > 0.25) { snd.creak(); splash3(boatPoint(0, 0, -4.1).setY(swellH(S.x, S.z, S.t, A)), 14, 0.9); } }
    chain.visible = true;
  }
  if (anc.state === 'down') { anchor.position.set(anc.world.x, swellH(anc.world.x, anc.world.z, S.t, A) - 1.5 - Math.min(2, anc.t * 3), anc.world.z); chain.visible = true; }
  if (anc.state === 'raise') {                                       // whips up and slams into its place at the bow
    const k = Math.min(1, anc.t / 0.28), e = k * k * k, s = STOW();
    anchor.position.set(lerp(anc.from.x, s.x, Math.min(1, k * 2)), lerp(anc.from.y, s.y, e), lerp(anc.from.z, s.z, Math.min(1, k * 2))); anchor.quaternion.copy(boat.group.quaternion);
    if (k >= 1) { anc.state = 'stowed'; chain.visible = false; S.ps.v -= 0.55; snd.noise('brown', 0.6, 0.16, 350, 90); snd.pluck(110, 0.2, 0.2, 0, false); S.trauma = Math.min(C('traumaMax'), S.trauma + 0.12); splash3(s.clone().setY(s.y - 0.4), 10, 0.6); }
    chain.visible = k < 1;
  }
  if (chain.visible) { const r = HAWSE(), a = anchor.position, p = chain.geometry.attributes.position; for (let i = 0; i < 10; i++) { const u = i / 9; p.setXYZ(i, lerp(r.x, a.x, u), lerp(r.y, a.y + 0.6, u) - Math.sin(u * Math.PI) * 0.15, lerp(r.z, a.z, u)); } p.needsUpdate = true; }
}

{ part(exhaust, new THREE.CylinderGeometry(0.08, 0.08, 0.7, 10), '#4E4A56', 0.78, boat.deckY(3.2) + 0.95, 3.25, [0, 0, 0], [0.08, 0.35, 0.08]); part(exhaust, new THREE.CylinderGeometry(0.11, 0.09, 0.12, 10), '#33273B', 0.78, boat.deckY(3.2) + 1.32, 3.25, [0, 0, 0], [0.11, 0.06, 0.11]); }

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

/* ---------- 3D particles: cel droplets + exhaust smoke, depth-tested against the boat and the sea */
function spriteTex(draw) { const c = document.createElement('canvas'); c.width = c.height = 64; draw(c.getContext('2d')); const tx = new THREE.CanvasTexture(c); return tx; }
const TEX = {
  drop: spriteTex((g) => { g.fillStyle = '#33273B'; g.beginPath(); g.arc(32, 32, 28, 0, 7); g.fill(); g.fillStyle = '#F4FBFA'; g.beginPath(); g.arc(32, 32, 22, 0, 7); g.fill(); g.fillStyle = '#BFE6E2'; g.beginPath(); g.arc(38, 38, 12, 0, 7); g.fill(); }),
  smoke: spriteTex((g) => { g.fillStyle = 'rgba(51,39,59,.18)'; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill(); g.fillStyle = '#F2EEE8'; g.beginPath(); g.arc(32, 32, 27, 0, 7); g.fill(); g.fillStyle = '#C9C2D6'; g.beginPath(); g.arc(40, 40, 16, 0, 7); g.fill(); g.fillStyle = '#F2EEE8'; g.beginPath(); g.arc(28, 27, 15, 0, 7); g.fill(); }),
};
const p3 = []; for (let i = 0; i < 380; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.drop, transparent: true, depthWrite: false })); s.visible = false; late.add(s); p3.push({ s, life: 0, max: 1 }); }
let p3i = 0;
function emit3(kind, pos, vel, o = {}) { const p = p3[p3i++ % p3.length]; p.kind = kind; p.s.material.map = TEX[kind === 'smoke' ? 'smoke' : 'drop']; p.s.visible = true;
  Object.assign(p, { x: pos.x, y: pos.y, z: pos.z, vx: vel.x, vy: vel.y, vz: vel.z, life: 0, max: o.life ?? 0.9, s0: o.s0 ?? 0.15, s1: o.s1 ?? 0.08, g: o.g ?? (kind === 'smoke' ? -1.0 : 9.8), op: o.op ?? 1, drag: o.drag ?? 0.99 }); }
function splash3(pos, n, power = 1) { for (let i = 0; i < n; i++) { const a = rng() * Math.PI * 2, r = (1.5 + rng() * 2.5) * power; emit3('drop', pos, { x: Math.cos(a) * r, y: (3.5 + rng() * 4.5) * power, z: Math.sin(a) * r }, { life: 0.9 + rng() * 0.5, s0: 0.12 + rng() * 0.14 * power, s1: 0.05 }); } }
function updateP3(dt) {
  const A = U.swellA.value;
  for (const p of p3) { if (!p.s.visible) continue; p.life += dt; const u = p.life / p.max; if (u >= 1) { p.s.visible = false; continue; }
    const dk = Math.pow(p.drag, dt * 60); p.vx *= dk; p.vz *= dk; p.vy -= p.g * dt; if (p.kind === 'smoke') p.vy *= dk;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.kind === 'drop' && p.vy < 0 && p.y < swellH(p.x, p.z, S.t, A)) { p.s.visible = false; continue; }
    const sc = lerp(p.s0, p.s1, ease.out(u)); p.s.position.set(p.x, p.y, p.z); p.s.scale.setScalar(sc * 2); p.s.material.opacity = p.op * (p.kind === 'smoke' ? (1 - u) * Math.min(1, u * 6) : 1 - u * u * 0.5); }
}

/* ---------- speed gauge: a minimal line painted onto the water surface beside the boat (decal-style: the quad is
   displaced by the same swell as the sea, so waves carry it instead of covering it). Bow end = top speed; 20% up from
   the stern end = parked; below that = reverse. A dot rides the line with the speed number beside it. */
const gaugeCv = document.createElement('canvas'); gaugeCv.width = 512; gaugeCv.height = 1024; const gctx = gaugeCv.getContext('2d');
const gaugeTex = new THREE.CanvasTexture(gaugeCv); gaugeTex.anisotropy = 4;
const GAUGE = { w: 5.6, len: 7.5, x: -4.6, z: 0.4 };
const gaugeGeo = new THREE.PlaneGeometry(GAUGE.w, GAUGE.len, 4, 40); gaugeGeo.rotateX(-Math.PI / 2); gaugeGeo.translate(GAUGE.x, 0, GAUGE.z);
const gaugeMat = new THREE.ShaderMaterial({
  uniforms: { map: { value: gaugeTex }, opacity: { value: 0 }, uOrigin: { value: new THREE.Vector3() }, uYaw: { value: 0 }, time: U.time, swellA: U.swellA },
  vertexShader: `uniform vec3 uOrigin; uniform float uYaw, time; varying vec2 vUv;
${SWELL_GLSL}
void main() { vUv = uv; float c = cos(uYaw), s = sin(uYaw); vec2 l = position.xz;
  vec2 w = uOrigin.xz + vec2(c * l.x + s * l.y, -s * l.x + c * l.y); vec2 g; float h = swellH(w, time, g);
  gl_Position = projectionMatrix * viewMatrix * vec4(w.x, h + 0.06, w.y, 1.0); }`,
  fragmentShader: `uniform sampler2D map; uniform float opacity; varying vec2 vUv; void main() { vec4 c = texture2D(map, vUv); gl_FragColor = vec4(c.rgb, c.a * opacity); }`,
  transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
});
const gauge = new THREE.Mesh(gaugeGeo, gaugeMat); gauge.frustumCulled = false; gauge.renderOrder = 3; late.add(gauge);
let gaugeKey = '', gaugeK = 0;
function drawGauge(ms) {
  const g = gctx, W = 512, H = 1024, x = 60, top = 40, bot = H - 40, len = bot - top, zero = bot - len * 0.2;
  g.clearRect(0, 0, W, H); g.lineCap = 'round';
  g.strokeStyle = 'rgba(255,246,227,.55)'; g.lineWidth = 7; g.beginPath(); g.moveTo(x, top); g.lineTo(x, bot); g.stroke();   // the line
  g.strokeStyle = 'rgba(255,246,227,.8)'; g.lineWidth = 7; g.beginPath(); g.moveTo(x - 16, zero); g.lineTo(x + 16, zero); g.stroke();   // parked mark
  const f = ms >= 0 ? 0.2 + 0.8 * clamp(ms / C('maxSpeed'), 0, 1) : 0.2 * (1 - clamp(-ms / C('reverseSpeed'), 0, 1)), y = bot - len * f;
  g.fillStyle = '#FFF6E3'; g.beginPath(); g.arc(x, y, 24, 0, 7); g.fill();
  g.font = '600 150px Fredoka, Nunito, sans-serif'; g.textBaseline = 'middle'; g.fillText((Math.abs(ms) * 1.944).toFixed(1), x + 50, y + 6);
  gaugeTex.needsUpdate = true;
}
function updateGauge(dt) {
  const active = !S.harbour && !S.screen && !S.anchored && (Math.abs(S.speed) > 0.3 || S.t - (S.notchT || -9) < 3);
  gaugeK = follow(gaugeK, active ? 1 : 0, active ? 5 : 1.2, dt); gauge.visible = gaugeK > 0.01; if (!gauge.visible) return;
  const key = S.speed.toFixed(2); if (key !== gaugeKey) { gaugeKey = key; drawGauge(S.speed); }
  gaugeMat.uniforms.uOrigin.value.set(S.x, 0, S.z); gaugeMat.uniforms.uYaw.value = S.yaw; gaugeMat.uniforms.opacity.value = gaugeK * 0.9;
}

/* ============================================================ state */
const S = {
  x: BERTH.x, z: BERTH.z, yaw: BERTH.yaw, speed: 0, notch: 0, rudder: 0, yawVel: 0, anchored: false, anchorK: 0,
  t: 0, hour: C('startHour'), cargo: [], shells: 0, best: {}, seen: new Set(), places: new Set(), firstSale: false,
  region: 0, regionShownAt: -99, lastInput: 0, idleK: 0, trauma: 0, wasAway: false, hintShown: {}, notchHold: 0,
  docked: null, screen: null, ps: { x: 0, v: 0 }, harbour: null, canDock: false, leftHarbour: false, hb: 0, cine: null, inspect: false, pitchK: 0, rollK: 0, prevSpeed: 0, heave: 0, bumpCD: 0,
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
  if (e.code === 'KeyE' && S.canDock) enterHarbour();
  if (e.code === 'KeyM') openMap();
  if (e.code === 'Tab') openMenu('cargo');
  if (e.code === 'KeyN') setMuteIcon(snd.toggleMute());
  if (e.code === 'KeyF') setInspect(true);
  if (S.harbour && !['KeyF', 'KeyN'].includes(e.code)) return harbourKey(e.code);
});
addEventListener('keyup', (e) => { keys.delete(e.code); if (e.code === 'KeyF') setInspect(false); });
const cv = renderer.domElement;
cv.addEventListener('pointerdown', (e) => { S.lastInput = S.t; if (S.harbour) { if (S.hoverB) openBuilding(S.hoverB); return; } S.dragging = { x: e.clientX, y: e.clientY }; });
addEventListener('pointerup', () => { S.dragging = false; });
addEventListener('pointermove', (e) => { S.mouse = [e.clientX, e.clientY]; S.mouseMoved = true; if (!S.dragging) return; S.orbitYaw -= (e.clientX - S.dragging.x) * 0.005; S.orbitPitch = clamp(S.orbitPitch + (e.clientY - S.dragging.y) * 0.003, -0.15, 0.55); S.dragging = { x: e.clientX, y: e.clientY }; S.lastInput = S.t; });
addEventListener('wheel', (e) => { if (S.screen) return; S.zoomI = clamp(S.zoomI + Math.sign(e.deltaY), 0, 2); S.zoom = [0.68, 1, 1.55][S.zoomI]; S.lastInput = S.t; }, { passive: true });

function notch(d, held = false) {
  if (S.harbour) return;
  if (S.anchored) { if (!held && anc.state === 'down') toggleAnchor(); return; }   // a fresh W or S raises the anchor; holding never does
  if (anc.state === 'raise') return;
  S.notchT = S.t;
  const n = clamp(S.notch + d, -1, 4); if (n === S.notch) return;
  S.notch = n; snd.click(n + 1); pop($('bar').children[0], 1.06, 220);
  if (n > 0 && d > 0) S.pitchK += 0.04;
}
function toggleAnchor() {
  if (S.harbour || anc.state === 'raise') return;
  if (!S.anchored) { if (anc.state !== 'stowed') return; S.anchored = true; S.notch = 0; anc.state = 'drop'; anc.t = 0; anc.bit = false; anc.splashed = false; snd.creak(); snd.noise('white', 0.08, 0.5, 1800, 900); log('Anchor down.'); }
  else { if (anc.state !== 'down') return; S.anchored = false; anc.state = 'raise'; anc.t = 0; anc.from = anchor.position.clone(); snd.noise('brown', 0.3, 0.25, 250, 1100); log('Anchor up.'); }
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
  else if (S.harbour) items = [['Click', 'Visit'], [['A', 'D'], 'Choose'], ['E', 'Open'], ['W', 'Set sail'], ['Tab', 'Menu']];
  else items = [[['W', 'A', 'S', 'D'], 'Sail'], ['Space', S.anchored ? 'Raise anchor' : 'Anchor'], ['M', 'Map'], ['F', 'Inspect (hold)'], ['Tab', 'Menu']];
  if (!S.screen && !S.harbour && S.canDock) items.unshift(['E', 'Dock', 'hi']);
  $('bar').innerHTML = items.map(([k, v, h]) => `<span class="act ${h || ''}">${(Array.isArray(k) ? k : [k]).map((x) => `<span class="key">${x}</span>`).join('')}<span>${v}</span></span>`).join('');
  $('bar').classList.toggle('focus', !!S.screen || !!S.harbour);
  const dockAct = $('bar').querySelector('.act.hi'); if (dockAct) dockAct.onclick = () => enterHarbour();
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
  $('shells').classList.toggle('show', on || !!S.screen); $('shells').classList.toggle('focus', on && !S.screen); $('shellsN').textContent = S.shells.toLocaleString('en-US');
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
// finds: rare non-fish catches (sold at the Fishmonger like fish)
const FINDS = [
  { id: 'Bottle', name: 'Message in a bottle', region: 1, rarity: 2, w: 0, value: 45, size: [0, 0], col: '#9FD8D6', belly: '#E9F7F4', item: true },
  { id: 'Pearl', name: 'Moon pearl', region: 2, rarity: 2, w: 0, value: 80, size: [0, 0], col: '#F3EEF8', belly: '#E6DDF2', item: true },
];
SPECIES.push(...FINDS);
const FISH_N = SPECIES.filter((s) => !s.item).length;
const SKILL = { Mabel: 1.0, Pip: 0.6, Tomo: 1.3 };            // crew experience (prototype stand-in for 04 Efficiency)
const price = (sp) => Math.round(sp.value * C('valueScale'));
function rollCatch(region) {
  if (S.forceRare) { S.forceRare = false; return SPECIES.find((s) => s.region === region && s.rarity === 2 && !s.item); }   // test hook
  if (S.forceFind) { S.forceFind = false; return FINDS.find((s) => s.region === region); }
  if (rng() < C('findChance')) return FINDS.find((s) => s.region === region);
  const pool = SPECIES.filter((s) => s.region === region && !s.item), W = pool.reduce((a, s) => a + s.w, 0); let r = rng() * W;
  for (const s of pool) { if ((r -= s.w) < 0) return s; } return pool[0];
}
function inSpot() { for (const s of spots) if (Math.hypot(S.x - s.x, S.z - s.z) < C('spotRadius')) return s; return null; }
function crewWater(c) { const [lx, lz] = c.water; return boatPoint(lx, 0, lz).setY(0); }
const headOf = (c) => c.d.J.neck.localToWorld(new THREE.Vector3(0, 0.75, 0));
function bubble(c, txt, cls = '', life = 0) {
  removeAnchor(c.bang); c.bang = anchorEl(`<div class="bang ${cls}">${txt}</div>`, () => headOf(c), 'wl', life); c.bang.dx = -48;
  c.bang.el.firstChild.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.3)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 300, easing: 'cubic-bezier(.34,1.56,.64,1)' });
}
function startBite(c) {
  const spot = inSpot(); c.region = spot ? spot.region : (S.x > C('regionSwellsX') ? 2 : 1); c.sp = rollCatch(c.region);
  c.state = 'bite'; c.stateT = 0; snd.bite();
  if (c.sp.rarity === 2 && !S.rareCine) { bubble(c, '!!', 'gold'); startRareCine(c); } else bubble(c, '!');
}
function startFight(c) {
  const sp = c.sp, diff = sp.rarity + (c.region - 1) + (sp.item ? 0.5 : 0);
  const esc = clamp(C('escapeBase') + C('escapePerTier') * diff - 0.06 * SKILL[c.name], 0, 0.65);
  c.fight = { t: 0, dur: C('fightBase') + diff * C('fightPerTier') + rng() * 1.2, p: 0, escape: rng() < esc, escAt: 0.45 + rng() * 0.4 };
  c.state = 'fight'; c.stateT = 0; removeAnchor(c.bang); c.bang = null;
  c.fightEl = anchorEl(`<div class="fight ${sp.rarity === 2 ? 'gold' : ''}"><i></i></div>`, () => headOf(c)); c.fightEl.dx = 0;
}
function updateFight(c, dt) {
  const f = c.fight; f.t += dt;
  const surge = Math.sin(f.t * 6.5) * Math.sin(f.t * 2.3);          // the fish pulls in surges: progress can slip back
  f.p = clamp(f.p + dt / f.dur * (1.15 + 0.9 * surge), 0, 1);
  if (S.t - (c.lastThrash || 0) > 0.3 + rng() * 0.35) { c.lastThrash = S.t; const w = crewWater(c); splash3(w.setY(swellH(w.x, w.z, S.t, U.swellA.value)), 5 + c.sp.rarity * 4, 0.7); snd.splash(0.3 + 0.15 * c.sp.rarity); }
  if (S.t - (c.lastTick || 0) > 0.09 + (surge < 0 ? 0.12 : 0)) { c.lastTick = S.t; snd.reel(surge); }
  const bar = c.fightEl.el.firstChild; bar.firstChild.style.width = `${f.p * 100}%`; bar.style.transform = `translate(${(rng() - 0.5) * 4 * (1 + c.sp.rarity)}px,${(rng() - 0.5) * 3}px)`; bar.classList.toggle('slip', surge < -0.3);
  if (f.escape && f.p > f.escAt) return escape(c);
  if (f.p >= 1) { removeAnchor(c.fightEl); c.fightEl = null; c.state = 'reel'; c.stateT = 0; landFish(c); }
}
function escape(c) {
  removeAnchor(c.fightEl); c.fightEl = null; c.state = 'aw'; c.stateT = 0; snd.snap();
  const w = crewWater(c); splash3(w.setY(swellH(w.x, w.z, S.t, U.swellA.value)), 16, 1.1);
  const lab = anchorEl(`<div class="lab lost">It got away…</div>`, () => headOf(c), 'wl', 2.0); lab.el.firstChild.animate([{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 260, easing: 'ease-out' });
  if (c.sp.rarity > 0) log(`The ${c.sp.name.toLowerCase()} got away from <b>${c.name}</b>.`);
  if (S.rareCine && S.rareCine.c === c) { endRareCine(); snd.aw(); }
}
/* rare bite: letterbox, push-in on the line, rising tension; then a slow-motion leap, confetti and fanfare */
function startRareCine(c) {
  S.rareCine = { c, t: 0, focus: crewWater(c) }; document.body.classList.add('cine'); snd.rumble();
  beam.position.copy(crewWater(c)).setY(6); beamT = -99;   // beam held faint while the tension builds
}
function endRareCine() { if (!S.rareCine) return; S.rareCine = null; document.body.classList.remove('cine'); beamT = 1.6; }
function landFish(c) {
  const sp = c.sp, [a, b] = sp.size, size = sp.item ? 0 : Math.round(a + (b - a) * Math.pow(rng(), 1.6));
  const w = crewWater(c), m = fishMesh(sp), rare = sp.rarity === 2 && S.rareCine && S.rareCine.c === c;
  m.scale.setScalar((sp.item ? 2.2 : clamp(size / (sp.size[0] + sp.size[1]) * 2.2, 0.8, 2.6)) * (rare ? 1.8 : 1)); late.add(m);
  flyingFish.push({ m, c, sp, size, u: 0, from: w, rare, celebrated: false });
  snd.splash(0.8 + sp.rarity * 0.3); fx.ring.visible = true; fxRingT = 0; fxRingPos.copy(w).setY(swellH(w.x, w.z, S.t, U.swellA.value) + 0.6);
  splash3(fxRingPos.clone().setY(fxRingPos.y - 0.6), 16 + sp.rarity * 10, 1.2);
  if (sp.rarity === 2) { beam.position.set(w.x, 6, w.z); beamT = 0; }
}
const activeLabels = new Set(); let fxRingT = 9, beamT = 9; const fxRingPos = new THREE.Vector3();
function celebrate(f) {   // at the apex of a rare leap
  f.celebrated = true; snd.fanfare(); S.trauma = Math.min(C('traumaMax'), S.trauma + 0.08);
  const p = toScreen(f.m.position);
  for (let i = 0; i < 3; i++) setTimeout(() => fxp.burst(innerWidth * (0.25 + 0.25 * i), innerHeight * 0.08, 40, { col: ['#FF9B21', '#FFE7A6', '#E8553F', '#6E6AA8', '#86C445', '#FFF6E3'], shape: 'rect', v: 420, g: 520, size: 7, a0: Math.PI * 0.15, spread: Math.PI * 0.7, life: 1.8, drag: 0.985 }, rng), i * 90);
  if (p) fxp.burst(p.x, p.y, 36, { col: ['#FFE7A6', '#FFF6E3', '#FF9B21'], shape: 'star', v: 380, g: 120, size: 8, life: 1.1 }, rng);
  const t = $('rareTitle'); $('rareH').textContent = f.sp.item ? 'A rare find!' : 'A rare catch!'; $('rareP').textContent = f.sp.name;
  t.animate([{ opacity: 0, transform: 'translateX(-50%) scale(1.6)' }, { opacity: 1, transform: 'translateX(-50%) scale(1)', offset: 0.18 }, { opacity: 1, offset: 0.8 }, { opacity: 0, transform: 'translateX(-50%) scale(.96)' }], { duration: 2600, easing: 'cubic-bezier(.22,1,.36,1)' });
}
function fishArrived(f) {
  const { c, sp, size } = f; late.remove(f.m);
  c.state = 'cheer'; c.stateT = 0; removeAnchor(c.bang); c.bang = null;
  const isNew = !S.seen.has(sp.id), best = S.best[sp.id] || 0, pb = !sp.item && size > best && best > 0;
  S.seen.add(sp.id); if (!sp.item) S.best[sp.id] = Math.max(best, size);
  c.streak = S.t - (c.lastCatch || -99) < 40 ? c.streak + 1 : 0; c.lastCatch = S.t;
  snd.catchNote(globalStreak());
  const head = () => c.d.J.neck.localToWorld(new THREE.Vector3(0, 0.7, 0));
  for (const o of activeLabels) { o.dy0 = (o.dy0 || 0) + 46; if (o.life > 1.2 + (S.t - o.born)) o.life = Math.max(S.t - o.born + 0.6, 1.2); }
  const lab = anchorEl(`<div class="lab">${fishImg(sp, 'li')}<span>${sp.name}${sp.item ? '' : ` <em>· ${size} cm</em>`}</span><span class="plus">+1</span></div>`, head, 'wl', 2.4); activeLabels.add(lab); setTimeout(() => activeLabels.delete(lab), 2500);
  lab.el.firstChild.animate([{ transform: 'scale(.5)', opacity: 0 }, { transform: 'scale(1.12)', opacity: 1, offset: 0.55 }, { transform: 'scale(1)', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  const hp = toScreen(head());
  if (hp) { fxp.burst(hp.x, hp.y - 20, 8 + sp.rarity * 14, { col: sp.rarity ? ['#FFE7A6', '#FFF6E3', '#FF9B21'] : ['#FFF6E3'], shape: sp.rarity ? 'star' : 'dot', v: 200, g: 150, size: sp.rarity ? 7 : 4, life: 0.9 }, rng);
    flyTo($('fly'), fishImg(sp, 'fi'), hp.x + 60, hp.y - 30, $('cargo'), 0.55, () => { S.cargo.push({ id: sp.id, size }); updateCargoHUD(true); snd.ui(cargoCount() % 5); checkFull(); }, rng, 'fly fish'); }
  else { S.cargo.push({ id: sp.id, size }); updateCargoHUD(true); checkFull(); }
  if (isNew || sp.rarity > 0 || pb) card(sp, size, isNew, pb);
  if (isNew) { setTimeout(() => snd.newSpecies(), 120); log(`<b>${c.name}</b> landed a ${sp.name}<span class="tag">new</span>`); }
  else if (sp.rarity) log(`<b>${c.name}</b> landed a ${sp.name}<span class="tag">${RARITY[sp.rarity].toLowerCase()}</span>`);
  if (f.rare) setTimeout(endRareCine, 900);
}
const globalStreak = () => Math.min(9, Object.values(crew).reduce((a, c) => Math.max(a, c.streak), 0) + 2);
function card(sp, size, isNew, pb) {
  const el = document.createElement('div'); el.className = 'card' + (sp.rarity === 2 ? ' plus' : '');
  el.innerHTML = `${isNew ? '<span class="ribbon">NEW!</span>' : pb ? '<span class="ribbon">Biggest yet!</span>' : ''}<img class="fishpic" src="${sp.img}" alt="">
    <h4>${sp.name}</h4><p>${sp.item ? '<span class="size">Find</span>' : `<span class="size">${size} cm</span>`} · <span class="stars">${stars(sp.rarity)}</span> ${RARITY[sp.rarity]}</p>`;
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
    if (c.state === 'aw' && c.stateT > 1.4) c.state = 'idle';
    if (c.state === 'look' && c.stateT > 2.2) c.state = 'idle';
    const fishing = spot && !full;
    if (c.state === 'idle' && fishing && !S.rareCine) { c.timer -= dt * slow; if (c.timer <= 0) { startBite(c); c.timer = C('catchMin') + rng() * (C('catchMax') - C('catchMin')); } }
    if (c.state === 'idle' && !fishing && c.timer <= 0) c.timer = 2 + rng() * 4;
    if (c.state === 'bite' && c.stateT > (c.sp.rarity === 2 && S.rareCine ? 2.2 : C('biteLead'))) startFight(c);
    if (c.state === 'fight') updateFight(c, dt);
    c.mode = full ? 'rest' : spot ? 'fish' : 'idle';
  }
  if (S.rareCine) { S.rareCine.t += dt; if (beamT < 0) beam.material.opacity = Math.min(0.3, S.rareCine.t * 0.12) * (0.8 + 0.2 * Math.sin(S.t * 9)); }
  for (let i = flyingFish.length - 1; i >= 0; i--) {
    const f = flyingFish[i], to = f.c.d.root.localToWorld(new THREE.Vector3(0.1, 0.7, 0.4));
    const slowmo = f.rare && f.u > 0.28 && f.u < 0.62 ? C('slowmo') : 1;   // local slow motion: only the fish
    f.u = Math.min(1, f.u + dt / (f.rare ? 0.9 : 0.55) * slowmo);
    if (f.rare && !f.celebrated && f.u > 0.4) celebrate(f);
    const y0 = swellH(f.from.x, f.from.z, S.t, U.swellA.value), H = f.rare ? 6 : 3.2;
    f.m.position.set(lerp(f.from.x, to.x, f.u), lerp(y0, to.y, f.u) + H * 4 * f.u * (1 - f.u), lerp(f.from.z, to.z, f.u));
    f.m.rotation.set(-1.2 + f.u * 4.5, Math.atan2(to.x - f.from.x, to.z - f.from.z), Math.sin(S.t * (slowmo < 1 ? 8 : 30)) * 0.3);
    if (f.rare && S.rareCine) S.rareCine.focus.copy(f.m.position);
    if (f.u >= 1) { flyingFish.splice(i, 1); fishArrived(f); }
  }
}

/* ============================================================ docking + selling + shipyard */
// building outlines: a house-shaped shell drawn behind each building (black; white on hover) + a name pill
const raycaster = new THREE.Raycaster(); const outlineMeshes = [];
for (const bd of BUILDINGS) {
  const [x, z, w, d, h] = bd.h, rise = (w / 2) * Math.tan(THREE.MathUtils.degToRad(33));
  const sh = new THREE.Shape([new THREE.Vector2(-w / 2 - 0.25, -0.3), new THREE.Vector2(w / 2 + 0.25, -0.3), new THREE.Vector2(w / 2 + 0.7, h - 0.05), new THREE.Vector2(0, h + rise + 0.45), new THREE.Vector2(-w / 2 - 0.7, h - 0.05)]);
  const g = new THREE.ExtrudeGeometry(sh, { depth: d + 0.9, bevelEnabled: false }); g.translate(0, 0, -(d + 0.9) / 2);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#1E1726', side: THREE.BackSide })); m.position.set(x, 1.6, z); m.rotation.y = Math.PI / 2; m.visible = false; m.userData.b = bd; late.add(m); outlineMeshes.push(m); bd.mesh = m;
  bd.label = anchorEl(`<div class="bld"><span class="bi">${ic(bd.icon)}</span><span>${bd.name}</span></div>`, () => new THREE.Vector3(x, 1.6 + h * 0.6, z), 'wl bldw');
  bd.label.el.style.visibility = 'hidden'; bd.label.el.firstChild.onclick = () => openBuilding(bd);
  bd.label.el.firstChild.onmouseenter = () => hoverBuilding(bd);
}
function hoverBuilding(bd) {
  if (S.hoverB === bd) return; S.hoverB = bd; if (bd) snd.ui(BUILDINGS.indexOf(bd) + 3);
  for (const b of BUILDINGS) { const on = b === bd; b.mesh.material.color.set(on ? '#FFF6E3' : '#1E1726'); b.label.el.firstChild.classList.toggle('hov', on); }
  cv.style.cursor = bd ? 'pointer' : '';
}
function updateHarbour(dt) {
  // offer docking inside the basin
  const inZone = Math.hypot(S.x - DOCK_ZONE.x, S.z - DOCK_ZONE.z) < DOCK_ZONE.r;
  if (!inZone) S.leftHarbour = false;
  const can = inZone && !S.harbour && !S.leftHarbour && !S.screen;
  if (can !== S.canDock) { S.canDock = can; renderBar(); if (can) { snd.ui(3); pop($('bar').firstElementChild, 1.12, 320); hint('dock', 'Press E to dock', 5); } }
  S.hb = follow(S.hb, S.harbour ? 1 : 0, 2.4, dt);
  if (!S.harbour) return;
  S.harbour.t += dt; const k = ease.inOut(Math.min(1, S.harbour.t / 1.3)), f = S.harbour.from;
  S.x = lerp(f.x, BERTH.x, k); S.z = lerp(f.z, BERTH.z, k); S.yaw = f.yaw + angDiff(BERTH.yaw, f.yaw) * k; S.speed = 0; S.notch = 0; S.yawVel = 0;
  if (!S.screen && S.mouse && S.harbour.t > 0.8) {   // hover by mouse (keyboard / pad selection via A / D)
    const r = cv.getBoundingClientRect(); raycaster.setFromCamera(new THREE.Vector2((S.mouse[0] - r.left) / r.width * 2 - 1, -((S.mouse[1] - r.top) / r.height) * 2 + 1), cam);
    const hit = raycaster.intersectObjects(outlineMeshes)[0]; if (hit) hoverBuilding(hit.object.userData.b); else if (S.mouseMoved) hoverBuilding(null);
  }
}
function enterHarbour() {
  if (S.harbour) return; S.harbour = { t: 0, from: { x: S.x, z: S.z, yaw: S.yaw } }; S.canDock = false;
  if (S.anchored) { S.anchored = false; anc.state = 'stowed'; }
  for (const b of BUILDINGS) { b.mesh.visible = true; b.label.el.style.visibility = 'visible'; b.label.el.firstChild.animate([{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 380, delay: 700 + BUILDINGS.indexOf(b) * 90, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }); }
  $('leave').classList.add('show'); snd.noise('brown', 0.25, 0.6, 300, 120); setTimeout(() => snd.chime(349.23 * 1.5, 0.08, 1.4), 500);
  renderBar(); hint('visit', 'Click a building to visit it', 6);
  if (S.started2) log('Docked at the harbour.'); S.started2 = true;
}
function leaveHarbour() {
  if (!S.harbour || S.screen) return; S.harbour = null; S.leftHarbour = true; hoverBuilding(null);
  for (const b of BUILDINGS) { b.mesh.visible = false; b.label.el.style.visibility = 'hidden'; }
  $('leave').classList.remove('show'); S.notch = 1; snd.click(2); snd.creak(); renderBar();
  setTimeout(() => hint('sail', 'Tap W for more speed · sail out to the buoy rings to fish', 7), 900);
}
function harbourKey(code) {
  if (code === 'KeyW' || code === 'ArrowUp' || code === 'Escape') return leaveHarbour();
  if (code === 'KeyA' || code === 'KeyD' || code === 'ArrowLeft' || code === 'ArrowRight') { const i = BUILDINGS.indexOf(S.hoverB), n = BUILDINGS.length; hoverBuilding(BUILDINGS[(i < 0 ? 0 : i + (code === 'KeyD' || code === 'ArrowRight' ? 1 : n - 1)) % n]); S.mouseMoved = false; }
  if ((code === 'KeyE' || code === 'Enter') && S.hoverB) openBuilding(S.hoverB);
  if (code === 'Tab') openMenu('cargo');
  if (code === 'KeyM') openMap();
}
function openBuilding(bd) {
  if (!S.harbour || S.screen) return; press(bd.label.el.firstChild); snd.ui(2);
  if (bd.id === 'fish') openFishmonger(); else openYard(bd.id);
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
  const list = Object.entries(groups).map(([id, fs]) => { const sp = SPECIES.find((s) => s.id === id); return { sp, n: fs.length, total: fs.length * price(sp), big: Math.max(...fs.map((f) => f.size)) }; }).sort((a, b) => b.sp.rarity - a.sp.rarity || b.total - a.total);
  $('fmLine').textContent = list.length ? 'Fine catch today!' : 'Come back with a catch, dear.';
  $('fmCount').textContent = `${S.cargo.length} fish`; $('fmTotal').textContent = '0'; $('sellBtn').disabled = !list.length; $('sellBtn').textContent = 'Sell all';
  if (!list.length) { rows.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:calc(var(--u)*240);color:#8A7D86;font-size:calc(var(--u)*20)">Nothing to sell yet</div>`; }
  else { rows.innerHTML = `<div class="tiles">${list.map((r) => tile(r.sp, { badge: '×' + r.n, size: r.big, total: r.total })).join('')}</div>`;
    [...rows.querySelectorAll('.tile')].forEach((el, i) => { el.animate([{ opacity: 0, transform: 'translateY(16px) scale(.8)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: 60 + i * 60, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }); setTimeout(() => snd.ui(i), 60 + i * 60); }); }
  $('sellBtn').onclick = () => { if (selling) return; if (!S.cargo.length) return closeScreen(); sellAll(list); };
}
async function sellAll(list) {
  selling = true; press($('sellBtn')); $('sellBtn').disabled = true; tip.style.display = 'none';
  const tiles = [...$('fmRows').querySelectorAll('.tile')], total = list.reduce((a, r) => a + r.total, 0), totalEl = $('fmTotal');
  let running = 0, tick = 0;
  for (const [i, el] of tiles.entries()) {           // each tile: its fish hop into the crate, its value adds to the sum
    const r = el.getBoundingClientRect(); pop(el, 1.12, 200);
    for (let k = 0; k < Math.min(3, list[i].n); k++) setTimeout(() => flyTo($('fly'), fishImg(list[i].sp), r.left + r.width / 2, r.top + r.height / 2, $('crate'), 0.38, () => { snd.pluck(440 + tick * 30, 0.06, 0.1); pop($('crate'), 1.08, 200); }, rng), k * 60);
    const from = running; running += list[i].total;
    await countUp(totalEl, from, running, 0.22, () => { snd.coin(tick++); });
    el.classList.add('gone'); pop(totalEl, 1.15, 240); await sleep(0.06);
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
  $('fmLine').textContent = S.firstSale ? 'Lovely. Come again!' : 'Your first sale! Come again soon.';
  log(`Sold ${S.cargo.length} fish for <b>${total} Shells</b>`);
  S.cargo = []; S.fullAnnounced = false; updateCargoHUD(true);
  if (!S.firstSale) { S.firstSale = true; setTimeout(() => hint('yard', 'The shipyard can fit a bigger hold'), 1500); }
  $('sellBtn').textContent = 'Done'; $('sellBtn').disabled = false; $('sellBtn').onclick = () => closeScreen(); selling = false;
}
function openYard(kind = 'yard') {
  openScreen('yard'); $('yardTitle').textContent = kind === 'inn' ? 'Inn · crew board' : 'Shipyard';
  if (kind === 'inn') { $('yardBody').innerHTML = `<p style="margin:0 0 12px;color:#6A5D70">Berths 2 / 2 · a Bunk from the Shipyard frees a berth.</p><div class="row" style="grid-template-columns:1fr auto;padding:0 4px"><span><b>Tomo</b><br><small style="color:#6A5D70">Points at whales before anyone else sees them · steady hands</small></span><button class="btn" data-p="1">${ic('shell')} 50</button></div>`; $('yardBody').querySelector('button').onclick = (e) => { press(e.currentTarget); e.currentTarget.textContent = 'Preview only'; }; $('yardClose').onclick = closeScreen; return; }
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
  if (tab === 'cargo') {
    const slots = Array.from({ length: C('cargoCapacity') }, (_, i) => { const f = S.cargo[i]; if (!f) return '<div class="tile empty"></div>'; const sp = SPECIES.find((s) => s.id === f.id); return tile(sp, { badge: sp.item ? '★' : f.size + '', size: f.size }); }).join('');
    b.innerHTML = `<p style="margin:0 0 4px;color:#6A5D70">Hold <b style="color:#33273B">${cargoCount()} / ${C('cargoCapacity')}</b> · hover a fish for details · sell at the Fishmonger in the harbour.</p><div class="tiles" style="padding-left:0">${slots}</div>`; }
  if (tab === 'journal') b.innerHTML = `<p style="margin:0 0 10px;color:#6A5D70">Fish · ${[...S.seen].filter((id) => !SPECIES.find((s) => s.id === id).item).length} of ${FISH_N} seen &nbsp;·&nbsp; Places · ${S.places.size} of ${PLACES.length}</p><div class="jg">` + SPECIES.filter((sp) => !sp.item).map((sp) => S.seen.has(sp.id) ? `<div class="jc"><span style="color:${sp.col}">${ic('fish')}</span><b>${sp.name}</b><small>best ${S.best[sp.id]} cm</small></div>` : `<div class="jc sil">${ic('fish')}<b>Not seen yet</b><small>&nbsp;</small></div>`).join('') + '</div><div class="jg" style="margin-top:12px">' + PLACES.map((p) => S.places.has(p.id) ? `<div class="jc">${ic(p.icon)}<b>${p.short}</b><small>seen</small></div>` : `<div class="jc sil">${ic(p.icon)}<b>Not seen yet</b><small>&nbsp;</small></div>`).join('') + '</div>';
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
    <text x="112" y="100" style="font:800 17px Nunito,sans-serif;fill:#fff;opacity:.92">Places ${S.places.size} / ${PLACES.length}  ·  Fish ${[...S.seen].filter((id) => !SPECIES.find((s) => s.id === id).item).length} / ${FISH_N}</text>
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
  if (!S.screen && !S.cine && !S.harbour) {
    for (const [k, d] of [['KeyW', 1], ['KeyS', -1]]) if (keys.has(k)) { S.notchHold += dt; if (S.notchHold > C('notchRepeat') * 1.6) { S.notchHold -= C('notchRepeat'); notch(d, true); } }
  }
  const inputSteer = S.screen || S.harbour ? 0 : steer;
  S.rudder = follow(S.rudder, inputSteer, C('rudderEase'), dt);
  if (Math.abs(S.rudder) > 0.85 && Math.abs(S.speed) > 3 && S.t - (S.lastCreak || 0) > 2.5) { S.lastCreak = S.t; snd.creak(); }
  // speed toward the notch
  const target = S.anchored ? 0 : S.notch >= 0 ? S.notch / 4 * C('maxSpeed') : -C('reverseSpeed');
  const a = target > S.speed ? C('accel') : (S.anchored ? C('anchorBrake') * (anc.bit ? 2.2 : 1) : C('decel'));
  S.speed += clamp(target - S.speed, -a * dt, a * dt);
  if (S.anchored && anc.bit) S.speed *= Math.exp(-3 * dt);
  // surf: the wave slope along the hull pushes the boat (down a face = faster)
  const [fx_, fz_] = fwd(), A = U.swellA.value;
  const hb = swellH(S.x + fx_ * 3.4, S.z + fz_ * 3.4, S.t, A), hs = swellH(S.x - fx_ * 3.4, S.z - fz_ * 3.4, S.t, A), slope = (hb - hs) / 6.8;
  if (!S.anchored) S.speed += -slope * C('surfK') * dt * 9.8 * 0.12;
  if (S.anchored) S.yawVel *= Math.exp(-2 * dt);
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
  S.pitchK = follow(S.pitchK, clamp(accelNow * C('noseUpK'), -0.07, 0.06), 4, dt);
  const lean = clamp(-S.yawVel * S.speed * C('leanK'), -C('leanMax'), C('leanMax'));
  S.rollK = follow(S.rollK, lean, 3, dt);
  const h0 = swellH(S.x, S.z, S.t, A), [rx, rz] = [-fz_, fx_];
  const hp = swellH(S.x + rx * 1.2, S.z + rz * 1.2, S.t, A), hst = swellH(S.x - rx * 1.2, S.z - rz * 1.2, S.t, A);
  const wavePitch = Math.atan((hb - hs) / 6.8) * 0.85, waveRoll = -Math.atan((hp - hst) / 2.4) * 0.7;
  const prevHeave = S.heave; S.heave = h0 * 0.9;
  boat.group.position.set(S.x, S.heave, S.z);
  S.ps.v += (-90 * S.ps.x - 7 * S.ps.v) * dt; S.ps.x += S.ps.v * dt;      // brake / impact spring (nose dip, rebound)
  boat.group.rotation.set(wavePitch + S.pitchK + S.ps.x, S.yaw, waveRoll + S.rollK, 'YXZ');
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
  // bow spray: depth-tested 3D droplets thrown off both sides of the stem
  if (k > 0.35) { S.sprayAcc = (S.sprayAcc || 0) + dt * 60 * (k - 0.3) * (1 + A * 0.6);
    while (S.sprayAcc > 1) { S.sprayAcc -= 1; const s = rng() < 0.5 ? -1 : 1, p = boatPoint(s * 0.55, 0, -3.7 - rng() * 0.3); p.y = swellH(p.x, p.z, S.t, A) + 0.15;
      emit3('drop', p, { x: rx * s * (2 + 3 * k) + fx_ * sp * 0.5, y: 2.2 + rng() * 2.5 * k, z: rz * s * (2 + 3 * k) + fz_ * sp * 0.5 }, { life: 0.6 + rng() * 0.3, s0: 0.1 + rng() * 0.1, s1: 0.04 }); } }
  // exhaust: puffs from the stern pipe, more with throttle
  if (!S.anchored && S.notch !== 0) { S.smokeAcc = (S.smokeAcc || 0) + dt * (1.6 + 1.4 * Math.abs(S.notch)); while (S.smokeAcc > 1) { S.smokeAcc -= 1; const p = boatPoint(0.78, boat.deckY(3.2) + 1.35, 3.25);
    emit3('smoke', p, { x: fx_ * sp * 0.75 + (rng() - 0.5) * 0.3, y: 2.4 + rng() * 0.8, z: fz_ * sp * 0.75 + (rng() - 0.5) * 0.3 }, { life: 1.6 + rng() * 0.6, s0: 0.1, s1: 0.32 + 0.1 * k, op: 0.6, drag: 0.97 }); } }
  fx.collar.visible = false; fx.wake.visible = false;
  fx.ripples.material.uniforms.uOrigin.value.set(S.x, 0, S.z);
  snd.ambience(k, smooth(0.45, 1.35, A), dt);
}
function splashAt(v, n) { splash3(v.clone().setY(swellH(v.x, v.z, S.t, U.swellA.value)), n, 1); return; const p = toScreen(v); p && fxp.burst(p.x, p.y, n, { col: ['#FFFFFF', '#CFEFEA', '#9FD8D6'], v: 300, g: 800, size: 5, a0: -Math.PI, spread: Math.PI }, rng); }
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
  if (S.rareCine) { const fo = S.rareCine.focus, w = Math.min(1, S.rareCine.t / 0.8);
    const toYaw = Math.atan2(-(fo.x - S.x), -(fo.z - S.z)) + 0.5; wantYaw = wantYaw + angDiff(toYaw, wantYaw) * w * 0.7;
    tx = lerp(tx, fo.x, w * 0.8); tz = lerp(tz, fo.z, w * 0.8); ty = lerp(ty, fo.y + 1, w); dist *= 1 - 0.55 * w; pitch -= 0.08 * w; }
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
  if (S.hb > 0.001) { const q0 = cam.quaternion.clone(); const hc = harbourCamObj; hc.position.copy(HARBOUR_CAM.pos); hc.lookAt(HARBOUR_CAM.look); const w = ease.inOut(S.hb);
    cam.position.lerp(HARBOUR_CAM.pos, w); cam.quaternion.copy(q0).slerp(hc.quaternion, w); camS.fov = lerp(camS.fov, 40, w); }
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
    if (c.state === 'cheer') pose = POSE.cheer; else if (c.state === 'look') pose = POSE.look; else if (c.state === 'aw') pose = POSE.aw;
    else if (c.state === 'fight') pose = Math.floor(S.t * (c.sp && c.sp.rarity === 2 ? 8 : 5)) % 2 ? POSE.pullA : POSE.pullB;
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
  pipLine.visible = bobber.visible = fishing || crew.Pip.state === 'fight'; rod.rotation.x = 2.2 + (crew.Pip.state === 'fight' ? -0.35 + 0.15 * Math.sin(S.t * 13) : 0); tomoLine.visible = crew.Tomo.mode === 'fish';
  if (fishing) { const w = crewWater(crew.Pip), by = swellH(w.x, w.z, S.t, A) + (crew.Pip.state === 'bite' ? -0.25 + 0.12 * Math.sin(S.t * 40) : crew.Pip.state === 'fight' ? -0.35 + 0.2 * Math.sin(S.t * 17) : 0);
    bobber.position.set(w.x, by + 0.02, w.z); rod.children[0].localToWorld(tmp.set(0, 2.0, 0));
    const p = pipLine.geometry.attributes.position, n = p.count; for (let i = 0; i < n; i++) { const u = i / (n - 1); p.setXYZ(i, tmp.x + (w.x - tmp.x) * u, tmp.y + (by + 0.08 - tmp.y) * u - Math.sin(u * Math.PI) * (crew.Pip.state === 'bite' ? 0.05 : 0.35), tmp.z + (w.z - tmp.z) * u); } p.needsUpdate = true; }
  if (tomoLine.visible) { crew.Tomo.d.J.handR.localToWorld(tmp.set(0, -0.04, 0)); const w = crewWater(crew.Tomo), wy = swellH(w.x, w.z, S.t, A), r = boatPoint(-1.36, boat.deckY(1.0) + 0.26, 1.0);
    const p = tomoLine.geometry.attributes.position, n = p.count; for (let i = 0; i < n; i++) { const u = i / (n - 1); const a = u < 0.35 ? u / 0.35 : (u - 0.35) / 0.65; if (u < 0.35) p.setXYZ(i, tmp.x + (r.x - tmp.x) * a, tmp.y + (r.y - tmp.y) * a, tmp.z + (r.z - tmp.z) * a); else p.setXYZ(i, r.x + (w.x - r.x) * a, r.y + (wy - r.y) * a, r.z + (w.z - r.z) * a); } p.needsUpdate = true; }
  // drizzle: rain streaks and ripples step their 3-drawing loops (twos), ripples re-scatter each drawing
  { const rd = tw % 3; fx.rain.material.uniforms.uDraw.value = rd; fx.ripples.material.uniforms.uDraw.value = rd;
    if (fx.ripples.visible && rd !== fx._rd) { fx._rd = rd; let s = tw * 7919 + 13; const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < fx.rippleN; i++) { let x, z; do { x = (R() - 0.5) * 44; z = (R() - 0.5) * 44; } while (Math.abs(x) < 2.2 && Math.abs(z) < 5); fx.rippleOff.set([x, z, 0], i * 3); }
      fx.ripples.geometry.attributes.iOff.needsUpdate = true; } }
  // catch ring + beam
  fxRingT += dt; const ck = Math.floor(fxRingT * 12); fx.ring.visible = ck < 6; if (fx.ring.visible) { fx.ring.material.uniforms.uDraw.value = ck; fx.ring.material.uniforms.uOrigin.value.copy(fxRingPos); }
  if (beamT >= 0) { beamT += dt; beam.material.opacity = beamT < 1.6 ? 0.55 * Math.sin(Math.min(1, beamT / 1.6) * Math.PI) : 0; } beam.scale.set(1 + 0.1 * Math.sin(S.t * 8), 1, 1 + 0.1 * Math.sin(S.t * 8));
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
  if (started) { updateHarbour(dt); updateBoat(dt); updateFishing(dt); updateExploration(); }
  else { S.yaw += dt * 0.0; updateBoat(dt); }
  updateCamera(dt); updateAnchor(dt); updateCrew(dt); updateP3(dt); updateGauge(dt); updateCompass(); updateAnchors(); fxp.update(dt);
  post.mat.uniforms.wob.value = 1.8 * (1 - 0.5 * smooth(0.2, 1.2, Math.abs(S.yawVel) + Math.abs(camS.yaw - (S.lastCamYaw ?? camS.yaw)) / Math.max(dt, 1e-3))); S.lastCamYaw = camS.yaw;
  shadow.update(renderer, env, world.casters);
  renderer.setRenderTarget(post.rt); renderer.clear(); renderer.render(env, cam);
  post.render(renderer);
  renderer.autoClear = false; renderer.render(late, cam); renderer.autoClear = true;
}
updateCargoHUD(); renderBar(); updateTime(0); makeThumbs();
requestAnimationFrame(frame);
$('start').addEventListener('click', () => {
  if (started) return; started = true; snd.start(); snd.setVolume(C('volume')); S.lastInput = S.t;
  $('start').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: 'forwards' }); setTimeout(() => $('start').remove(), 620);
  snd.chime(349.23, 0.12, 1.6); enterHarbour();
  log('Mabel, Pip and Tomo are aboard.');
});
// test hooks (capture / QA only)
$('leave').onclick = () => leaveHarbour();
window.__lo = { S, crew, step, rareBite: (n = 'Pip') => { S.forceRare = true; startBite(crew[n]); }, findBite: (n = 'Tomo') => { S.forceFind = true; startBite(crew[n]); }, anc, enterHarbour, leaveHarbour, openBuilding: (i) => openBuilding(BUILDINGS[i]), hoverBuilding: (i) => hoverBuilding(BUILDINGS[i]), toggleAnchor, discover: (i) => discover(PLACES[i]), give: (n) => { for (let i = 0; i < n; i++) S.cargo.push({ id: SPECIES[i % 6].id, size: 20 }); updateCargoHUD(true); }, openFishmonger, openMap, openMenu, start: () => $('start').click(), land: (name = 'Pip') => { crew[name].sp = rollCatch(1); crew[name].region = 1; landFish(crew[name]); }, spots, PLACES };
