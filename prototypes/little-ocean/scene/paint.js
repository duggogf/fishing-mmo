// PROTOTYPE - NOT FOR PRODUCTION (forked from design/preview/scene)
// Little Ocean preview - painted textures, generated in code with Canvas 2D (no network, no SVG/blob URLs, so it
// runs under a strict CSP). Flat shapes + wobbled edges + daubs + soft-light mottle + grain: albedo only, gentle
// top-light, no cast shadows, no ink lines (the world is paint). Palette swatches are 09's harbour / R1 values.
import * as THREE from '../vendor/three.module.js';

export function rng(seed) { let s = (seed >>> 0) || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, o = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = o.clampS || o.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.wrapT = o.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.anisotropy = 4; t.premultiplyAlpha = true; t.needsUpdate = true; // shaders divide rgb by alpha
  return t;
}

/** Tiling value noise, grey; G channel mean ~= mean (grain uses g/0.83, sky brush g/0.9). */
function noiseCanvas(w, h, mean, amp, fx, fy, seed) {
  const R = rng(seed), G = 64, g = []; for (let i = 0; i < G * G; i++) g.push(R());
  const at = (x, y) => g[(((y % G) + G) % G) * G + (((x % G) + G) % G)];
  const vn = (x, y, px, py) => { const xi = Math.floor(x), yi = Math.floor(y), u = x - xi, v = y - yi, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
    const wx = (a) => ((a % px) + px) % px, wy = (a) => ((a % py) + py) % py;
    const a = at(wx(xi), wy(yi)), b = at(wx(xi + 1), wy(yi)), c = at(wx(xi), wy(yi + 1)), d = at(wx(xi + 1), wy(yi + 1));
    return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv; };
  const [cv, g2] = canvas(w, h); const im = g2.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let n = 0, k = 1, tot = 0;
    for (let o = 0; o < 4; o++) { const px = fx * (1 << o), py = fy * (1 << o); n += vn(x / w * px, y / h * py, px, py) * k; tot += k; k *= 0.55; }
    n = n / tot - 0.5 + (R() - 0.5) * 0.25;
    const v = Math.max(0, Math.min(255, Math.round(255 * (mean + n * amp))));
    const i = (y * w + x) * 4; im.data[i] = v; im.data[i + 1] = v; im.data[i + 2] = v; im.data[i + 3] = 255;
  }
  g2.putImageData(im, 0, 0);
  return cv;
}
let MOTTLE = null;
function mottle() { return MOTTLE || (MOTTLE = noiseCanvas(256, 256, 0.5, 0.9, 4, 4, 31)); }
/** soft-light a tiling mottle over a region (neutral at mid grey, so it varies without darkening the swatch). */
function mottleOver(g, w, h, alpha, scale = 1) {
  g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = alpha;
  const m = mottle(), s = 256 * scale;
  for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) g.drawImage(m, x, y, s, s);
  g.restore();
}
/** wobbly closed blob path (a painted edge, never a ruled one) */
function blob(g, cx, cy, rx, ry, R, wob = 0.14, n = 30, rot = 0) {
  const ph = [R() * 6.28, R() * 6.28, R() * 6.28];
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI * 2;
    const k = 1 + wob * (0.6 * Math.sin(a * 3 + ph[0]) + 0.3 * Math.sin(a * 5 + ph[1]) + 0.2 * Math.sin(a * 9 + ph[2]));
    const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
    const X = cx + x * Math.cos(rot) - y * Math.sin(rot), Y = cy + x * Math.sin(rot) + y * Math.cos(rot);
    i ? g.lineTo(X, Y) : g.moveTo(X, Y);
  }
  g.closePath();
}
/** wobbly rectangle (painted plank / block / window) */
function wrect(g, x, y, w, h, R, j = 1.5) {
  const p = (a, b) => [a + (R() - 0.5) * j * 2, b + (R() - 0.5) * j * 2];
  const pts = [p(x, y), p(x + w * 0.5, y), p(x + w, y), p(x + w, y + h * 0.5), p(x + w, y + h), p(x + w * 0.5, y + h), p(x, y + h), p(x, y + h * 0.5)];
  g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath();
}
function daubs(g, R, n, x0, y0, w, h, cols, size, aspect = 0.5, ang = [0, Math.PI], wrapW = 0, wrapH = 0) {
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * w, y = y0 + R() * h, s = size * (0.6 + R() * 0.8), a = ang[0] + R() * (ang[1] - ang[0]);
    g.fillStyle = cols[Math.floor(R() * cols.length)];
    const offs = [[0, 0]]; if (wrapW) offs.push([-wrapW, 0], [wrapW, 0]); if (wrapH) offs.push([0, -wrapH], [0, wrapH]);
    for (const [ox, oy] of offs) { g.beginPath(); g.ellipse(x + ox, y + oy, s, s * aspect, a, 0, Math.PI * 2); g.fill(); }
  }
}
function grainOver(g, w, h, alpha) { g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = alpha; const n = grainCanvas(); for (let y = 0; y < h; y += 512) for (let x = 0; x < w; x += 512) g.drawImage(n, x, y); g.restore(); }
let GRAINC = null; function grainCanvas() { return GRAINC || (GRAINC = noiseCanvas(512, 512, 0.5, 0.6, 64, 64, 5)); }

export function bakeAll() {
  const T = {};
  T.grain = tex(noiseCanvas(512, 512, 0.83, 0.32, 16, 16, 7));
  T.brush = tex(noiseCanvas(512, 256, 0.9, 0.22, 4, 32, 11));

  // --- water daubs: 512 px tile = 14 m world (one daub >= 0.4 m, 09 F3). G = band driver, mid 0.5.
  {
    const [c, g] = canvas(512, 512), R = rng(17);
    g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
    mottleOver(g, 512, 512, 0.9, 1);
    daubs(g, R, 150, 0, 0, 512, 512, ['#3A3A3A', '#2E2E2E', '#4A4A4A'], 22, 0.32, [-0.25, 0.25], 512, 512);
    daubs(g, R, 190, 0, 0, 512, 512, ['#D8D8D8', '#E8E8E8', '#C8C8C8'], 17, 0.3, [-0.2, 0.2], 512, 512);
    daubs(g, R, 120, 0, 0, 512, 512, ['#F4F4F4'], 9, 0.35, [-0.3, 0.3], 512, 512);
    T.daub = tex(c);
  }
  // --- land top: island green with sand daubs, 512 px = 12 m
  {
    const [c, g] = canvas(512, 512), R = rng(5);
    g.fillStyle = '#7DAA5E'; g.fillRect(0, 0, 512, 512); mottleOver(g, 512, 512, 0.55);
    daubs(g, R, 420, 0, 0, 512, 512, ['#6FA35A', '#8AB766', '#5E9450', '#97BE6E'], 9, 0.45, [-2, -1.2], 512, 512);
    daubs(g, R, 40, 0, 0, 512, 512, ['#C9CF8E', '#B4C47E'], 14, 0.5, [0, 3], 512, 512);
    grainOver(g, 512, 512, 0.25); T.grass = tex(c);
  }
  // --- rock / sand sides of the land, 512 px = 6 m
  {
    const [c, g] = canvas(512, 512), R = rng(9);
    g.fillStyle = '#A99C90'; g.fillRect(0, 0, 512, 512); mottleOver(g, 512, 512, 0.7);
    for (let i = 0; i < 46; i++) { g.fillStyle = ['#9C8F86', '#B3A79B', '#8E8380', '#C2B6A6'][i % 4]; blob(g, R() * 512, R() * 400, 26 + R() * 30, 16 + R() * 18, R, 0.25); g.fill(); }
    g.fillStyle = '#EBD9AE'; g.fillRect(0, 430, 512, 82); // sand foot at the waterline (bottom of the side band)
    g.fillStyle = '#DCCB9F'; for (let i = 0; i < 30; i++) { blob(g, R() * 512, 440 + R() * 60, 20, 6, R); g.fill(); }
    grainOver(g, 512, 512, 0.3); T.rock = tex(c);
  }
  // --- quay stone blocks #D9C9A8, 512 px = 4 m; seams are value shapes, never ink
  {
    const [c, g] = canvas(512, 512), R = rng(3);
    g.fillStyle = '#BDAE90'; g.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 6; row++) for (let i = -1; i < 5; i++) {
      const x = i * 128 + (row % 2) * 64 + 3, y = row * 86 + 3;
      g.fillStyle = ['#D9C9A8', '#D2C2A0', '#DECFAF', '#CFBF9D'][Math.floor(R() * 4)]; wrect(g, x, y, 122, 80, R, 2.5); g.fill();
    }
    mottleOver(g, 512, 512, 0.5); grainOver(g, 512, 512, 0.25); T.stone = tex(c);
  }
  // --- wood planks #B98656, 512 px = 2 m
  {
    const [c, g] = canvas(512, 512), R = rng(4);
    for (let i = 0; i < 8; i++) { g.fillStyle = ['#B98656', '#AE7C4F', '#C08E5E', '#B3814F'][i % 4]; g.fillRect(i * 64, 0, 64, 512); g.fillStyle = '#8E6442'; wrect(g, i * 64 - 2, -10, 4, 532, R, 1); g.fill(); }
    mottleOver(g, 512, 512, 0.45); grainOver(g, 512, 512, 0.3); T.wood = tex(c);
  }
  // --- house facade (painted near-white, tinted per house); windows blue-grey (dusk glow picks them up), door
  {
    const [c, g] = canvas(512, 512), R = rng(21);
    g.fillStyle = '#F4F0E8'; g.fillRect(0, 0, 512, 512); mottleOver(g, 512, 512, 0.35);
    const win = (x, y, w, h) => { g.fillStyle = '#E2DBCB'; wrect(g, x - 8, y - 8, w + 16, h + 16, R, 2); g.fill(); g.fillStyle = '#4D6A86'; wrect(g, x, y, w, h, R, 1.5); g.fill(); g.fillStyle = '#6E8AA3'; wrect(g, x + 4, y + 4, w * 0.4, h * 0.35, R, 1); g.fill(); };
    win(70, 110, 80, 96); win(360, 110, 80, 96); win(70, 300, 80, 96);
    g.fillStyle = '#6F5848'; wrect(g, 330, 290, 104, 222, R, 2); g.fill();
    g.fillStyle = '#83695A'; wrect(g, 344, 304, 76, 200, R, 1.5); g.fill();
    g.fillStyle = 'rgba(120,110,140,0.25)'; g.fillRect(0, 470, 512, 42); // damp foot (value shape)
    grainOver(g, 512, 512, 0.25); T.facade = tex(c);
  }
  // --- roof tiles (tinted slate #6F8296 etc.), 512 px = 3 m
  {
    const [c, g] = canvas(512, 512), R = rng(8);
    g.fillStyle = '#C9CED6'; g.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 10; row++) for (let i = -1; i < 9; i++) { g.fillStyle = ['#E8EBEF', '#DADFE6', '#F2F2F2'][Math.floor(R() * 3)]; wrect(g, i * 64 + (row % 2) * 32 + 2, row * 52 + 2, 60, 44, R, 2); g.fill(); }
    mottleOver(g, 512, 512, 0.5); grainOver(g, 512, 512, 0.25); T.roof = tex(c);
  }
  // --- lighthouse bands: cream + slate, 4 bands along v
  {
    const [c, g] = canvas(256, 512), R = rng(12);
    for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#6F8296' : '#F3EBDA'; wrect(g, -10, i * 86 - 4, 276, 90, R, 3); g.fill(); }
    mottleOver(g, 256, 512, 0.35); grainOver(g, 256, 512, 0.2); T.tower = tex(c);
  }
  // --- far islands strip (r = 520 ring, y -4..44 m): wraps 360 deg, bases at the waterline (canvas y ~ 469)
  const islands = (W, H, base, list, tones, seed, far) => {
    const [c, g] = canvas(W, H), R = rng(seed);
    for (const it of list) for (const dx of [-W, 0, W]) {
      const cx = it.x * W + dx, w = it.w * W, h = it.h;
      if (cx + w < -50 || cx - w > W + 50) continue;
      g.fillStyle = tones.rock; g.beginPath(); g.moveTo(cx - w * 0.55, base + 4);
      for (let i = 0; i <= 40; i++) { const u = i / 40, x = cx - w * 0.5 + u * w; const y = base - h * Math.pow(Math.sin(Math.PI * u), 0.8) * (0.85 + 0.15 * Math.sin(u * 17 + it.x * 40)) - (it.peak ? h * 0.5 * Math.exp(-Math.pow((u - it.peak) / 0.12, 2)) : 0); g.lineTo(x, y); }
      g.lineTo(cx + w * 0.55, base + 4); g.closePath(); g.fill();
      // green cap, painted over in clumps
      g.save(); g.clip();
      g.fillStyle = tones.green; g.fillRect(cx - w, base - h * 2, w * 2, h * 2 - h * 0.28);
      if (!far) {
        daubs(g, R, Math.round(w / 4), cx - w * 0.5, base - h * 1.5, w, h * 1.3, [tones.dark, tones.light, tones.green], 10, 0.6, [0, 3]);
        g.fillStyle = tones.sand; g.fillRect(cx - w, base - h * 0.16, w * 2, h);
        g.fillStyle = tones.rock; for (let i = 0; i < w / 30; i++) { blob(g, cx - w * 0.5 + R() * w, base - h * 0.12, 12 + R() * 14, 8 + R() * 8, R, 0.3); g.fill(); }
      } else { g.fillStyle = tones.dark; g.fillRect(cx - w, base - h * 0.25, w * 2, h); }
      g.restore();
    }
    // grain only where there is paint: keep the strip's alpha (a soft-light pass would otherwise tint the empty sky)
    const [mc, mg] = canvas(W, H); mg.drawImage(c, 0, 0);
    grainOver(g, W, H, 0.2);
    g.save(); g.globalCompositeOperation = 'destination-in'; g.drawImage(mc, 0, 0); g.restore();
    return tex(c, { clamp: false });
  };
  T.islandsNear = islands(4096, 512, 469, [
    { x: 0.962, w: 0.06, h: 130, peak: 0.42 }, { x: 0.012, w: 0.022, h: 50 }, { x: 0.075, w: 0.045, h: 96, peak: 0.6 }, { x: 0.29, w: 0.05, h: 80, peak: 0.6 }, { x: 0.43, w: 0.018, h: 34 }, { x: 0.56, w: 0.04, h: 70, peak: 0.35 }, { x: 0.7, w: 0.03, h: 55 },
  ], { rock: '#9C8F86', green: '#6FA35A', dark: '#5B8C4B', light: '#86B868', sand: '#EBD9AE' }, 41, false);
  T.islandsFar = islands(4096, 512, 479, [
    { x: 0.995, w: 0.08, h: 150, peak: 0.55 }, { x: 0.15, w: 0.07, h: 100, peak: 0.3 }, { x: 0.38, w: 0.08, h: 80 }, { x: 0.62, w: 0.06, h: 120, peak: 0.5 },
  ], { rock: '#8C9AB8', green: '#8FA6BE', dark: '#8094B0' }, 55, true);
  // --- clouds: painted masses, shade #C9D8F0 -> white (remapped onto the phase's cloud tones in the shader)
  {
    const W = 4096, H = 1024, [c, g] = canvas(W, H), R = rng(31);
    const cloud = (cx, cy, w, h) => {
      const puffs = []; const n = 14 + Math.round(w / 30);
      for (let i = 0; i < n; i++) { const u = R() * 2 - 1, prof = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 1.7)), 0.7); const v = Math.pow(R(), 0.8) * prof; const r = (0.12 + R() * 0.12) * w * (0.6 + 0.5 * prof) * (1 - v * 0.4); puffs.push([cx + u * w * 0.44, cy - r * 0.5 - v * h * 0.8, r]); }
      for (const dx of [-W, 0, W]) {
        g.fillStyle = '#C9D8F0'; for (const p of puffs) { blob(g, p[0] + dx, p[1], p[2], p[2] * 0.92, R, 0.08, 24); g.fill(); }
        g.fillStyle = '#E6EDF8'; for (const p of puffs) { blob(g, p[0] + dx - w * 0.02, p[1] - h * 0.05, p[2] * 0.86, p[2] * 0.8, R, 0.08, 24); g.fill(); }
        g.fillStyle = '#FFFFFF'; for (const p of puffs.filter((q, i) => i % 2 === 0)) { blob(g, p[0] + dx - w * 0.04, p[1] - h * 0.09, p[2] * 0.6, p[2] * 0.52, R, 0.1, 22); g.fill(); }
        g.fillStyle = '#C9D8F0'; g.fillRect(cx + dx - w * 0.6, cy - 2, w * 1.2, 0); // flat-ish base is implied by puff layout
      }
    };
    for (let i = 0; i < 9; i++) cloud(240 + i * 455 + R() * 140, 790 - R() * 140, 200 + R() * 220, 150 + R() * 170);
    for (let i = 0; i < 7; i++) cloud(400 + i * 590 + R() * 200, 470 - R() * 220, 150 + R() * 130, 70 + R() * 60);
    T.clouds = tex(c);
  }
  // --- rain curtain card (painted, StaysLayer): grey vertical brush streaks, ragged top
  {
    const [c, g] = canvas(512, 512), R = rng(77);
    for (let i = 0; i < 260; i++) { const x = R() * 512, y0 = 30 + R() * 140; g.fillStyle = `rgba(${150 + R() * 30 | 0},${165 + R() * 25 | 0},${185 + R() * 20 | 0},${0.35 + R() * 0.4})`; g.beginPath(); g.moveTo(x, y0); g.lineTo(x + 4 + R() * 6, y0); g.lineTo(x - 18 + R() * 8, 512); g.lineTo(x - 26, 512); g.closePath(); g.fill(); }
    // ragged, tapered sides and top so the card reads as a painted rain veil, never a rectangle
    const [mc, mg] = canvas(512, 512); mg.fillStyle = '#000';
    mg.beginPath(); mg.moveTo(0, 512); for (let i = 0; i <= 32; i++) { const x = i / 32 * 512, e = Math.sin(i / 32 * Math.PI); mg.lineTo(x, 512 - e * (330 + 120 * R()) ); } mg.lineTo(512, 512); mg.closePath(); mg.fill();
    g.save(); g.globalCompositeOperation = 'destination-in'; g.drawImage(mc, 0, 0); g.restore();
    const t = tex(c, { clampS: true }); t.wrapT = THREE.ClampToEdgeWrapping; T.rain = t;
  }
  return T;
}
