// Little Ocean - painted-cel preview vignette. mount(container, opts) -> {setPhase, setWeather, dispose}.
// A calm R1 sea just outside a small painted harbour; the player's Coral-hulled 8 m boat bobs on the swell with
// Mabel, Pip and Tomo fishing on deck. Ink what acts (boat, crew, buoy, gulls, VFX), paint what stays (sea, harbour,
// islands, sky). Frame order: [static sun shadow] -> environment to RT -> paint post (wobble, Kuwahara, grain,
// depth write-back) -> cels crisp on top. Raw sRGB, no tone mapping. Look-and-vibe preview only, not gameplay.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import { mixPhase, withDrizzle, swellH } from './phases.js';
import { U, applyPhase, SunShadow } from './env.js';
import { PaintPost } from './post.js';
import { bakeAll } from './paint.js';
import { CELU, applyCelPhase, celFill, celHull, blobMat, inkLineMat, blockGeo, inkPrep, inked } from './cel.js';
import { buildBoat } from './boat.js';
import { CREW, buildDummy, applyPose, TIMING, drawingAt } from './crew.js';
import { buildVFX } from './vfx.js';
import { buildWorld } from './harbour.js';

const SWELL_R1 = 0.4;                          // 09 / 02: R1 swell amplitude (m)
const TARGET = new THREE.Vector3(0, 2.8, 0);   // orbit pivot over the boat (camera never rides the cosmetic bob)

function fallback(container, why) {
  const d = document.createElement('div');
  d.className = 'lo-fallback';
  d.setAttribute('role', 'img');
  d.setAttribute('aria-label', 'Little Ocean preview unavailable: WebGL 2 is not available in this browser');
  d.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;'
    + 'background:linear-gradient(180deg,#3F9BE6 0%,#A9DBF5 55%,#4FB3BF 56%,#449BAE 100%);font:500 15px/1.45 system-ui,sans-serif;';
  d.innerHTML = '<div style="max-width:420px;background:#FFF6E3;color:#33273B;border:3px solid #6B4A35;border-radius:22px;'
    + 'box-shadow:3px 3px 0 #6E6AA8;padding:16px 20px;text-align:center"><strong style="display:block;font-size:17px;margin-bottom:4px">'
    + 'The little boat is waiting in harbour</strong>This live 3D preview needs WebGL 2, which this browser or device has turned off. '
    + 'Try a recent desktop browser with hardware acceleration enabled.</div>';
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  container.prepend(d);
  if (why) console.warn('[little-ocean] WebGL unavailable:', why && why.message ? why.message : why);
  return { setPhase() {}, setWeather() {}, dispose() { d.remove(); }, fallback: true };
}

export function mount(container, opts = {}) {
  const o = { phase: 'day', weather: 'clear', autoOrbit: true, distance: 18, pitch: 0.12, yaw: 0.62, maxW: 1280, maxH: 720, dprCap: 1.5, ...opts };
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!o.preserveDrawingBuffer });
    if (!renderer.capabilities.isWebGL2) throw new Error('WebGL 2 required');
  } catch (e) { try { renderer && renderer.dispose(); } catch (_) {} return fallback(container, e); }

  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  const canvas = renderer.domElement;
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab;outline:none';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Little Ocean preview: a coral fishing boat with three blocky crew bobbing on a painted sea outside a small harbour. Drag to orbit.');
  container.prepend(canvas);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;   // shaders write raw sRGB numbers; nothing converts them
  renderer.toneMapping = THREE.NoToneMapping;

  const cam = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 3200); // 60 deg horizontal at 16:9 (02 / 09 F2)
  const env = new THREE.Scene(), late = new THREE.Scene();
  const T = bakeAll(); U.grainMap.value = T.grain; U.swellA.value = SWELL_R1;
  const world = buildWorld(env, T);

  /* ---------------------------------------------------------------- cels */
  const fillCrew = celFill(-0.30), fillBoat = celFill(-0.42), fillProp = celFill(-0.12);   // hull: only the bilge turns to shade (nearly flat cel)
  const hull = celHull(2.5), hullSmall = celHull(2.5, { value: 0.4 });
  const boat = buildBoat(fillBoat, fillProp, hull); late.add(boat.group);
  const boatBlob = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 10.5), blobMat(0.45)); boatBlob.rotation.x = -Math.PI / 2; late.add(boatBlob);

  const crew = {};
  const STATIONS = { Mabel: [-0.7, 2.75, -Math.PI / 2 - 0.15, 0.0], Tomo: [-0.78, 1.05, -Math.PI / 2 + 0.12, 0.9], Pip: [0.52, -2.55, 2.05, 0.45] };
  for (const name of Object.keys(CREW)) {
    const d = buildDummy(CREW[name], fillCrew, hull);
    const [x, z, ry, off] = STATIONS[name];
    d.root.position.set(x, boat.deckY(z), z); d.root.rotation.y = ry; boat.group.add(d.root);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.5), blobMat(0.45)); b.rotation.x = -Math.PI / 2; b.position.set(x, boat.deckY(z) + 0.012, z); boat.group.add(b);
    crew[name] = { d, off, cur: -1, loopSeen: -1 };
  }
  // Pip's rod + line + bobber
  const rod = new THREE.Group(); rod.rotation.x = 2.2; crew.Pip.d.J.handR.add(rod);
  { const g = blockGeo(0.035, 2.0, 0.035, '#6B4A35', { r: 0.008 }); g.translate(0, 1.0, 0); rod.add(inked(g, fillProp, hull)); }
  const bobberG = new THREE.SphereGeometry(0.09, 12, 8); inkPrep(bobberG, '#FFF6E3', [0, 0, 0], [0.09, 0.09, 0.09]);
  { const c = bobberG.attributes.color, p = bobberG.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < 0.0) c.setXYZ(i, 0xB8 / 255, 0x3A / 255, 0x4B / 255); }
  const bobber = inked(bobberG, fillProp, hull); late.add(bobber);
  // Mabel's hand-net: pole + hoop + bag
  const net = new THREE.Group(); net.rotation.x = 2.0; crew.Mabel.d.J.handR.add(net);
  { const g = blockGeo(0.04, 1.5, 0.04, '#B98656', { r: 0.01 }); g.translate(0, 0.75, 0); net.add(inked(g, fillProp, hull));
    const hoop = new THREE.TorusGeometry(0.24, 0.03, 6, 16); inkPrep(hoop, '#6B4A35', [0, 0, 0], [0.27, 0.27, 0.05]); hoop.setAttribute('smoothN', hoop.attributes.normal.clone());
    const h = inked(hoop, fillProp, hull); h.position.set(0, 1.74, 0); h.rotation.x = Math.PI / 2; net.add(h);
    const bag = new THREE.ConeGeometry(0.22, 0.42, 10); bag.rotateX(Math.PI); inkPrep(bag, '#D8CDB4', [0, 0, 0], [0.24, 0.24, 0.24]);
    const bg = inked(bag, fillProp, hull); bg.position.set(0, 1.74, -0.22); bg.rotation.x = -Math.PI / 2; net.add(bg); }
  // fishing lines (thin ink)
  const lineMat = inkLineMat();
  const mkLine = (n) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); const l = new THREE.Line(g, lineMat); l.frustumCulled = false; late.add(l); return l; };
  const pipLine = mkLine(12), tomoLine = mkLine(8);

  // zone buoy (inked: it bobs and reacts) + gulls (inked ambient)
  const buoy = new THREE.Group(); late.add(buoy);
  {
    const part = (g, col, y, c, h) => { inkPrep(g, col, c, h); const m = inked(g, fillProp, hull); m.position.y = y; buoy.add(m); };
    part(new THREE.CylinderGeometry(0.55, 0.7, 1.1, 18), '#B83A4B', 0.2, [0, 0, 0], [0.7, 0.6, 0.7]);
    part(new THREE.CylinderGeometry(0.5, 0.55, 0.3, 18), '#FFF6E3', 0.9, [0, 0, 0], [0.55, 0.2, 0.55]);
    part(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8), '#6B4A35', 1.6, [0, 0, 0], [0.07, 0.6, 0.07]);
    part(new THREE.ConeGeometry(0.3, 0.45, 12), '#B83A4B', 2.3, [0, 0, 0], [0.3, 0.25, 0.3]);
  }
  const buoyPos = new THREE.Vector3(9, 0, -15);
  const buoyBlob = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), blobMat(0.45)); buoyBlob.rotation.x = -Math.PI / 2; late.add(buoyBlob);
  const gulls = [];
  for (let i = 0; i < 2; i++) {
    const g = new THREE.Group(), add = (geo, x, y, z, par = g) => { const m = inked(geo, fillProp, hullSmall); m.position.set(x, y, z); par.add(m); return m; };
    add(blockGeo(0.2, 0.18, 0.55, '#F4F1EA'), 0, 0, 0); add(blockGeo(0.15, 0.14, 0.16, '#F4F1EA'), 0, 0.08, -0.3); add(blockGeo(0.05, 0.04, 0.1, '#E0A458'), 0, 0.06, -0.42);
    const wl = new THREE.Group(), wr = new THREE.Group(); wl.position.set(0.1, 0.05, -0.02); wr.position.set(-0.1, 0.05, -0.02); g.add(wl, wr);
    add(blockGeo(0.62, 0.035, 0.24, '#B9B6CC'), 0.31, 0, 0, wl); add(blockGeo(0.62, 0.035, 0.24, '#B9B6CC'), -0.31, 0, 0, wr);
    late.add(g); gulls.push({ g, wl, wr, r: 20 + i * 7, h: 11 + i * 3.5, c: new THREE.Vector3(-6 + i * 10, 0, -8 - i * 6), w: 0.22 - i * 0.05, ph: i * 2.4 });
  }
  const fx = buildVFX(late);
  // catch-pop fish (cel)
  const fishG = new THREE.SphereGeometry(1, 12, 8); fishG.scale(0.09, 0.11, 0.24); inkPrep(fishG, '#7FA7C9', [0, 0, 0], [0.09, 0.11, 0.24]);
  { const c = fishG.attributes.color, p = fishG.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < -0.04) c.setXYZ(i, 0xEE / 255, 0xE8 / 255, 0xD6 / 255); }
  const fish = new THREE.Group(); fish.add(inked(fishG, fillProp, hull));
  { const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(-0.12, 0.16), new THREE.Vector2(0.12, 0.16)]); const tg = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false }); tg.translate(0, 0, -0.015); tg.rotateX(Math.PI / 2); inkPrep(tg, '#5F86AD', [0, 0, 0.08], [0.12, 0.05, 0.1]); const tl = inked(tg, fillProp, hull); tl.position.z = 0.2; fish.add(tl); }
  fish.visible = false; late.add(fish);

  /* ---------------------------------------------------------------- post, shadow, sizing */
  const post = new PaintPost(T.grain);
  const shadow = new SunShadow(1024, 75); shadow.target.set(-52, 0, -38);

  let rtW = 1280, rtH = 720;
  function resize() {
    const r = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, o.dprCap);
    let w = Math.max(64, r.width * dpr), h = Math.max(36, r.height * dpr);
    const s = Math.min(1, o.maxW / w, o.maxH / h); w = Math.round(w * s); h = Math.round(h * s);
    if (w === rtW && h === rtH && renderer.getSize(new THREE.Vector2()).x === w) return;
    rtW = w; rtH = h;
    renderer.setSize(w, h, false); post.setSize(w, h);
    CELU.rtW.value = w; CELU.rtH.value = h;
    cam.aspect = w / h; cam.updateProjectionMatrix();
    if (!running) renderFrame(0);
  }

  /* ---------------------------------------------------------------- phase / weather (blended, ~1.5 s) */
  let phaseK = o.phase === 'dusk' ? 1 : 0, phaseT = phaseK, wxK = o.weather === 'drizzle' ? 1 : 0, wxT = wxK, applied = '';
  function applyLook() {
    const key = phaseK.toFixed(3) + '|' + wxK.toFixed(3); if (key === applied) return; applied = key;
    const P = withDrizzle(mixPhase('day', 'dusk', phaseK), wxK);
    applyPhase(P); applyCelPhase(P);
    U.curtainK.value = 0.7 * wxK;
    fx.rain.visible = wxK > 0.02; fx.rain.geometry.instanceCount = Math.round(fx.rainN * Math.min(1, wxK * 2));
    fx.ripples.visible = wxK > 0.3; fx.ripples.geometry.instanceCount = Math.round(fx.rippleN * Math.min(1, wxK));
  }

  /* ---------------------------------------------------------------- orbit camera */
  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  let reduced = mq.matches;
  const onMq = () => { reduced = mq.matches; };
  mq.addEventListener && mq.addEventListener('change', onMq);
  const orbit = { yaw: o.yaw, pitch: o.pitch, dist: o.distance, vel: 0 };
  let dragging = null, lastInput = -1e9;
  const onDown = (e) => { dragging = { id: e.pointerId, x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch' }; canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; lastInput = performance.now(); };
  const onMove = (e) => {
    if (!dragging || e.pointerId !== dragging.id) return;
    const dx = e.clientX - dragging.x, dy = e.clientY - dragging.y; dragging.x = e.clientX; dragging.y = e.clientY;
    orbit.yaw -= dx * 0.006; if (!dragging.touch) orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + dy * 0.004, 0.06, 0.8);
    lastInput = performance.now(); kick();
  };
  const onUp = (e) => { if (dragging && e.pointerId === dragging.id) { dragging = null; canvas.style.cursor = 'grab'; lastInput = performance.now(); } };
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
  function placeCamera() {
    const cp = Math.cos(orbit.pitch);
    cam.position.set(TARGET.x + Math.sin(orbit.yaw) * cp * orbit.dist, TARGET.y + Math.sin(orbit.pitch) * orbit.dist, TARGET.z + Math.cos(orbit.yaw) * cp * orbit.dist);
    cam.lookAt(TARGET); cam.updateMatrixWorld();
  }

  /* ---------------------------------------------------------------- simulation (sea + bob smooth on ones; drawings on twos) */
  let t = 0, lastSplash = -9, prevH = 0, prevRise = false, splashT = -9, splashSide = 1, catchT = -9, lastYaw = orbit.yaw;
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const toWorld = (x, z) => { const yaw = boat.group.rotation.y, c = Math.cos(yaw), s = Math.sin(yaw); return [x * c + z * s, -x * s + z * c]; };
  function simulate(dt) {
    t += dt; U.time.value = t;
    const tw = Math.floor(t * 12);                         // drawing clock, 12 per second (twos)
    const A = U.swellA.value, mot = reduced ? 0.25 : 1;    // 02 "Reduce motion": cosmetic bob x0.25
    // boat cosmetic heave / pitch / roll sampled from the same swell as the sea
    const yaw = 0.05 * Math.sin(t * 0.13);
    const h0 = swellH(0, 0, t, A), hB = swellH(0, -3.4, t, A), hS = swellH(0, 3.4, t, A), hP = swellH(-1.2, 0, t, A), hSt = swellH(1.2, 0, t, A);
    boat.group.position.set(0, h0 * 0.9, 0);
    boat.group.rotation.set(Math.atan((hB - hS) / 6.8) * 0.8 * mot, yaw, -Math.atan((hP - hSt) / 2.4) * 0.7 * mot, 'YXZ');
    boatBlob.position.set(0, h0 + 0.05, 0.1); boatBlob.rotation.set(-Math.PI / 2, 0, -yaw);
    // pennant flaps on twos (3 drawings)
    const pd = Math.floor(tw / 2) % 3; boat.pennant.rotation.y = [-0.35, -0.55, -0.25][pd]; boat.pennant.scale.set([1, 0.92, 1.04][pd], [1, 1.08, 0.95][pd], 1);
    // crew drawings
    for (const name of Object.keys(crew)) {
      const c = crew[name], dr = drawingAt(TIMING[name], t, c.off);
      if (dr.i !== c.cur) {
        c.cur = dr.i; applyPose(c.d, TIMING[name][dr.i][0]);
        if (name === 'Pip' && dr.i === 5 && dr.loop % 2 === 0 && dr.loop !== c.loopSeen) { c.loopSeen = dr.loop; catchT = t; }
      }
    }
    boat.group.updateMatrixWorld(true);
    // Pip's line: rod tip -> bobber on the swell, sagging
    const [bx, bz] = toWorld(4.4, -6.2);
    const by = swellH(bx, bz, t, A);
    bobber.position.set(bx, by + 0.02, bz); bobber.rotation.z = 0.15 * Math.sin(t * 1.3);
    rod.children[0].localToWorld(tmp.set(0, 2.0, 0));
    { const p = pipLine.geometry.attributes.position, n = p.count; for (let i = 0; i < n; i++) { const u = i / (n - 1); p.setXYZ(i, tmp.x + (bx - tmp.x) * u, tmp.y + (by + 0.08 - tmp.y) * u - Math.sin(u * Math.PI) * 0.35, tmp.z + (bz - tmp.z) * u); } p.needsUpdate = true; }
    // Tomo's hand-line: hand -> over the rail -> water
    crew.Tomo.d.J.handR.localToWorld(tmp.set(0, -0.04, 0));
    { const [wx, wz] = toWorld(-2.6, 0.7), wy = swellH(wx, wz, t, A), p = tomoLine.geometry.attributes.position, n = p.count;
      const [rx, rz] = toWorld(-1.36, 1.0); const ry = boat.group.position.y + boat.deckY(1.0) + 0.26;
      for (let i = 0; i < n; i++) { const u = i / (n - 1); const a = u < 0.35 ? u / 0.35 : (u - 0.35) / 0.65; if (u < 0.35) p.setXYZ(i, tmp.x + (rx - tmp.x) * a, tmp.y + (ry - tmp.y) * a, tmp.z + (rz - tmp.z) * a); else p.setXYZ(i, rx + (wx - rx) * a, ry + (wy - ry) * a, rz + (wz - rz) * a); }
      p.needsUpdate = true; }
    // VFX: foam collar + drift wake (3 drawings, each held 2 twos), hull splash at heave peaks, catch pop
    const fd = Math.floor(tw / 2) % 3;
    for (const m of [fx.collar, fx.wake]) { m.material.uniforms.uDraw.value = fd; m.material.uniforms.uYaw.value = yaw; m.material.uniforms.uOrigin.value.set(0, 0, 0); }
    const rise = h0 > prevH; if (prevRise && !rise && t - lastSplash > 1.5) { lastSplash = t; splashT = t; splashSide = -splashSide; } prevRise = rise; prevH = h0;
    const sk = Math.floor((t - splashT) * 12);
    if (sk >= 0 && sk < 4) {
      const [sx, sz] = toWorld(splashSide * 1.42, -0.6 - splashSide * 0.9);
      fx.splash.visible = true; fx.splash.material.uniforms.uDraw.value = sk; fx.splash.material.uniforms.uOrigin.value.set(sx, swellH(sx, sz, t, A) - 0.05, sz);
    } else fx.splash.visible = false;
    const ck = Math.floor((t - catchT) * 12);
    if (ck >= 0 && ck < 6) {
      fx.ring.visible = true; fx.ring.material.uniforms.uDraw.value = ck; fx.ring.material.uniforms.uOrigin.value.set(bx, by + 0.7, bz);
      crew.Pip.d.root.localToWorld(tmp2.set(0.1, 0.6, 0.35));
      const u = (ck + 0.5) / 6; fish.visible = true;
      fish.position.set(bx + (tmp2.x - bx) * u, by + (tmp2.y - by) * u + 2.4 * 4 * u * (1 - u), bz + (tmp2.z - bz) * u);
      fish.rotation.set(-1.2 + ck * 0.55, Math.atan2(tmp2.x - bx, tmp2.z - bz), ck % 2 ? 0.3 : -0.3);
    } else { fx.ring.visible = false; fish.visible = false; }
    // drizzle: rain streaks + ripples on twos, 3-drawing loops
    const rd = tw % 3;
    fx.rain.material.uniforms.uDraw.value = rd; fx.ripples.material.uniforms.uDraw.value = rd;
    if (fx.ripples.visible && rd !== fx._rd) {
      fx._rd = rd; let s = tw * 7919 + 13; const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < fx.rippleN; i++) { let x, z; do { x = (R() - 0.5) * 44; z = (R() - 0.5) * 44; } while (Math.abs(x) < 2.2 && Math.abs(z) < 5); fx.rippleOff.set([x, z, 0], i * 3); }
      fx.ripples.geometry.attributes.iOff.needsUpdate = true;
    }
    // buoy bob + tilt, gulls (path smooth, wings on twos), moored dinghies sway, clouds drift
    { const hb = swellH(buoyPos.x, buoyPos.z, t, A), hx = swellH(buoyPos.x + 0.8, buoyPos.z, t, A), hz = swellH(buoyPos.x, buoyPos.z + 0.8, t, A);
      buoy.position.set(buoyPos.x, hb - 0.35, buoyPos.z); buoy.rotation.set((hz - hb) * 1.6 * mot, 0, -(hx - hb) * 1.6 * mot);
      buoyBlob.position.set(buoyPos.x, hb + 0.04, buoyPos.z); }
    for (const g of gulls) {
      const a = t * g.w + g.ph; g.g.position.set(g.c.x + Math.cos(a) * g.r, g.h + Math.sin(a * 2.1) * 0.8, g.c.z + Math.sin(a) * g.r);
      g.g.rotation.set(0, Math.atan2(Math.sin(a), -Math.cos(a)) + Math.PI, Math.sin(a * 2.1) * 0.15 - 0.25);
      const wd = Math.floor(tw / 2 + g.ph * 3) % 4, wa = [0.55, 0.05, -0.45, 0.05][wd]; g.wl.rotation.z = wa; g.wr.rotation.z = -wa;
    }
    for (const m of world.moored) { const h = swellH(m.x, m.z, t, A * 0.35); m.m.position.y = h; m.m.rotation.set(0, m.ry, 0.04 * Math.sin(t * 0.9 + m.ph) * mot); }
    world.clouds.rotation.y = t * 0.0015;
  }

  function renderFrame(dt) {
    // blends
    const step = dt / 1.5;
    phaseK += THREE.MathUtils.clamp(phaseT - phaseK, -step, step); wxK += THREE.MathUtils.clamp(wxT - wxK, -step, step);
    applyLook();
    // camera
    const now = performance.now();
    if (o.autoOrbit && !reduced && !dragging && now - lastInput > 3000) orbit.yaw += dt * 0.055;
    placeCamera();
    const angSpeed = Math.abs(orbit.yaw - lastYaw) / Math.max(dt, 1e-3); lastYaw = orbit.yaw;
    post.mat.uniforms.wob.value = 1.8 * (1 - 0.65 * THREE.MathUtils.smoothstep(angSpeed, 0.15, 1.2));   // ease wobble on fast moves
    simulate(dt);
    shadow.update(renderer, env, world.casters);
    renderer.setRenderTarget(post.rt); renderer.clear(); renderer.render(env, cam);
    post.render(renderer);
    renderer.autoClear = false; renderer.render(late, cam); renderer.autoClear = true;
  }

  /* ---------------------------------------------------------------- run / pause */
  let raf = 0, running = false, visible = true, disposed = false, last = 0, readyFired = false;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    renderFrame(dt);
    if (!readyFired) { readyFired = true; o.onReady && o.onReady(); }
  }
  function update() {
    const want = !o.manual && !disposed && visible && !document.hidden;
    if (want && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
    else if (!want && running) { running = false; cancelAnimationFrame(raf); }
  }
  function kick() { if (!running && !disposed) renderFrame(0); }
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; update(); }, { threshold: 0.01 }) : null;
  io && io.observe(container);
  const ro = 'ResizeObserver' in window ? new ResizeObserver(() => resize()) : null;
  ro ? ro.observe(container) : window.addEventListener('resize', resize);
  const onVis = () => update();
  document.addEventListener('visibilitychange', onVis);
  const onLost = (e) => { e.preventDefault(); running = false; cancelAnimationFrame(raf); };
  canvas.addEventListener('webglcontextlost', onLost);

  resize(); applyLook(); placeCamera(); simulate(0.0001);
  update();

  return {
    setPhase(p) { phaseT = p === 'dusk' ? 1 : 0; if (reduced || !running) { phaseK = phaseT; kick(); } },
    setWeather(w) { wxT = w === 'drizzle' ? 1 : 0; if (reduced || !running) { wxK = wxT; kick(); } },
    dispose() {
      if (disposed) return; disposed = true; running = false; cancelAnimationFrame(raf);
      io && io.disconnect(); ro ? ro.disconnect() : window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis); mq.removeEventListener && mq.removeEventListener('change', onMq);
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp); canvas.removeEventListener('webglcontextlost', onLost);
      const seen = new Set();
      for (const sc of [env, late]) sc.traverse((ob) => {
        if (ob.geometry && !seen.has(ob.geometry)) { seen.add(ob.geometry); ob.geometry.dispose(); }
        const ms = Array.isArray(ob.material) ? ob.material : ob.material ? [ob.material] : [];
        for (const m of ms) if (!seen.has(m)) { seen.add(m); m.dispose(); }
      });
      for (const k of Object.keys(T)) T[k].dispose();
      post.dispose(); shadow.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    },
    debug: { CELU, U, hull, post, late, env, fx },
    /** Deterministic still for capture/tests: sim time t (s), orbit yaw/pitch (rad), distance (m). */
    renderAt(tt, yaw = orbit.yaw, pitch = orbit.pitch, dist = orbit.dist) {
      orbit.yaw = yaw; orbit.pitch = pitch; orbit.dist = dist; lastYaw = yaw; lastInput = performance.now() + 1e9;
      phaseK = phaseT; wxK = wxT; t = tt - 1 / 60; renderFrame(1 / 60);
    },
  };
}
