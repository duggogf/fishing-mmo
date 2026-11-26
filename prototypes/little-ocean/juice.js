// PROTOTYPE - NOT FOR PRODUCTION
// Shared juice systems (game-juice skill §6): seeded rng, synth sound in one key, pooled 2D particles,
// pop/press tweens, Bezier flights to a counter, count-ups, eased followers.

/* ---------------- rng (seeded; gameplay randomness only goes through here) */
export function makeRng(seed) { let s = (seed >>> 0) || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const ease = {
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};
export const follow = (x, target, k, dt) => x + (target - x) * (1 - Math.exp(-k * dt));

/* ---------------- sound: F major pentatonic, soft timbres */
const SCALE = [0, 2, 4, 7, 9];            // semitone steps of the pentatonic
const ROOT = 349.23;                      // F4
export const noteHz = (step, oct = 0) => ROOT * Math.pow(2, (SCALE[((step % 5) + 5) % 5] + 12 * (Math.floor(step / 5) + oct)) / 12);

export class Sound {
  constructor() { this.ctx = null; this.vol = 0.7; this.muted = false; }
  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = this.vol; this.master.connect(c.destination);
    // a little room
    this.verb = c.createConvolver(); const len = c.sampleRate * 1.6, buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    this.verb.buffer = buf; this.wet = c.createGain(); this.wet.gain.value = 0.22; this.verb.connect(this.wet).connect(this.master);
    // noise buffer
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), nd = nb.getChannelData(0);
    let b = 0; for (let i = 0; i < nd.length; i++) { const w = Math.random() * 2 - 1; b = (b + 0.02 * w) / 1.02; nd[i] = b * 3.5; }
    this.brown = nb;
    const wb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), wd = wb.getChannelData(0); for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1; this.white = wb;
    // ambience beds: sea (brown, lowpass) + wind (white, bandpass) — gains driven by speed
    const bed = (buf, type, f, q) => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(fl).connect(g).connect(this.master); s.start(); return { g, fl }; };
    this.sea = bed(this.brown, 'lowpass', 520, 0.4); this.wind = bed(this.white, 'bandpass', 900, 0.6); this.hiss = bed(this.white, 'highpass', 2600, 0.3);
  }
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = this.muted ? 0 : v; }
  toggleMute() { this.muted = !this.muted; this.setVolume(this.vol); return this.muted; }
  ambience(speedK, swellK, dt) {   // speedK, swellK in 0..1
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.sea.g.gain.setTargetAtTime(0.16 + 0.16 * swellK + 0.1 * speedK, t, 0.3);
    this.sea.fl.frequency.setTargetAtTime(420 + 500 * speedK + 200 * swellK, t, 0.3);
    this.wind.g.gain.setTargetAtTime(0.012 + 0.05 * speedK + 0.025 * swellK, t, 0.4);
    this.hiss.g.gain.setTargetAtTime(0.035 * speedK * speedK, t, 0.2);
  }
  env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  // marimba-ish: sine + 4th harmonic, fast decay
  pluck(freq, vol = 0.25, dec = 0.5, delay = 0, wet = true) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + delay;
    for (const [m, v, type] of [[1, 1, 'sine'], [4, 0.18, 'sine'], [2, 0.12, 'triangle']]) {
      const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = freq * m;
      this.env(g, t, 0.004, vol * v, dec / m); o.connect(g).connect(this.master); if (wet) g.connect(this.verb); o.start(t); o.stop(t + dec + 0.1);
    }
  }
  chime(freq, vol = 0.18, dec = 1.4, delay = 0) {   // glassy: sine + inharmonic partial
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + delay;
    for (const [m, v] of [[1, 1], [2.76, 0.35], [5.4, 0.12]]) {
      const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = freq * m;
      this.env(g, t, 0.006, vol * v, dec / Math.sqrt(m)); o.connect(g).connect(this.master); g.connect(this.verb); o.start(t); o.stop(t + dec + 0.2);
    }
  }
  noise(kind, vol, dur, f0, f1, delay = 0, q = 0.8) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = kind === 'brown' ? this.brown : this.white; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.Q.value = q; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); this.env(g, t, 0.01, vol, dur); s.connect(fl).connect(g).connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  // named sounds ----------------------------------------------------------
  click(step) { this.noise('white', 0.18, 0.05, 1800 + step * 220, 900, 0, 3); this.pluck(noteHz(step, -1), 0.1, 0.12, 0, false); }
  creak() { if (!this.ctx) return; const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.setValueAtTime(95, t); o.frequency.linearRampToValueAtTime(70 + Math.random() * 20, t + 0.35); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 6; this.env(g, t, 0.05, 0.035, 0.35); o.connect(f).connect(g).connect(this.master); o.start(t); o.stop(t + 0.5); }
  splash(size = 1) { this.noise('white', 0.12 * size, 0.35 + 0.2 * size, 2400, 500, 0, 0.7); this.noise('brown', 0.25 * size, 0.3, 600, 200); }
  slap() { this.noise('brown', 0.35, 0.22, 900, 160); this.noise('white', 0.06, 0.3, 3000, 900, 0.03); }
  bite() { this.pluck(noteHz(7), 0.16, 0.18); this.pluck(noteHz(9), 0.12, 0.18, 0.07); }
  catchNote(step) { this.pluck(noteHz(step), 0.26, 0.6); this.pluck(noteHz(step + 2), 0.12, 0.5, 0.07); }
  newSpecies() { [0, 2, 4, 7].forEach((s, i) => this.chime(noteHz(s, 1), 0.13, 1.1, i * 0.09)); }
  rare() { [0, 4, 7, 9].forEach((s, i) => this.chime(noteHz(s, 1), 0.15, 1.8, i * 0.12)); this.pluck(noteHz(0, -1), 0.2, 1.2); }
  coin(i) { this.pluck(noteHz(5 + (i % 10), 1), 0.07, 0.16, 0, false); this.noise('white', 0.03, 0.04, 5000, 3000, 0.005, 2); }
  plonk() { this.pluck(noteHz(0), 0.3, 0.9); this.pluck(noteHz(4), 0.16, 0.9, 0.06); this.chime(noteHz(7, 1), 0.08, 1.2, 0.12); }
  stamp() { this.noise('brown', 0.5, 0.18, 400, 90); this.pluck(noteHz(0, -2), 0.25, 0.25, 0, false); }
  discovery() { [0, 2, 4, 7, 9, 12].forEach((s, i) => this.chime(noteHz(s, 1), 0.12, 1.6, 0.25 + i * 0.11)); }
  region() { [0, 4, 7].forEach((s, i) => this.chime(noteHz(s), 0.1, 2.2, i * 0.18)); }
  bell() { [1, 2.0, 3.0].forEach((m, i) => this.chime(noteHz(0) * m * 0.5, 0.12, 2.4, i * 0.0)); this.chime(noteHz(0) * 0.5, 0.12, 2.4, 0.9); }
  bump() { this.noise('brown', 0.4, 0.25, 300, 80); }
  hum() { [0, 2, 4, 2, 0].forEach((s, i) => this.pluck(noteHz(s), 0.05, 0.35, i * 0.32)); }
  ui(step = 4) { this.pluck(noteHz(step, 1), 0.08, 0.12, 0, false); }
  glint() { this.chime(noteHz(9, 1), 0.05, 0.9); }
}

/* ---------------- 2D particle layer (pooled, cap ~220) */
export class Particles {
  constructor(canvas) { this.cv = canvas; this.g = canvas.getContext('2d'); this.p = []; this.cap = 240; this.resize(); }
  resize() { const r = this.cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1); this.cv.width = r.width * d; this.cv.height = r.height * d; this.d = d; }
  emit(o) { if (this.p.length >= this.cap) this.p.shift(); this.p.push({ life: 0, max: 0.8, vx: 0, vy: 0, g: 600, drag: 0.96, size: 6, rot: 0, vr: 0, col: '#FFF6E3', shape: 'dot', ...o }); }
  burst(x, y, n, o = {}, rnd = Math.random) {
    for (let i = 0; i < n; i++) { const a = (o.a0 ?? 0) + rnd() * (o.spread ?? Math.PI * 2), v = (o.v ?? 260) * (0.45 + rnd() * 0.75);
      this.emit({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, max: (o.life ?? 0.8) * (0.7 + rnd() * 0.6), size: (o.size ?? 6) * (0.6 + rnd() * 0.8), col: Array.isArray(o.col) ? o.col[Math.floor(rnd() * o.col.length)] : (o.col ?? '#FFF6E3'), g: o.g ?? 600, shape: o.shape ?? 'dot', vr: (rnd() - 0.5) * 10, drag: o.drag ?? 0.96 }); }
  }
  update(dt) {
    const g = this.g, d = this.d; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.cv.width, this.cv.height);
    const k = Math.pow(0.96, dt * 60);
    this.p = this.p.filter((p) => (p.life += dt) < p.max);
    for (const p of this.p) {
      const dk = Math.pow(p.drag, dt * 60); p.vx *= dk; p.vy = p.vy * dk + p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      const u = p.life / p.max, s = p.size * (u < 0.15 ? u / 0.15 : 1) * (1 - u * u * 0.6) * d;
      g.globalAlpha = 1 - u * u; g.fillStyle = p.col; g.setTransform(1, 0, 0, 1, p.x * d, p.y * d); g.rotate(p.rot);
      if (p.shape === 'star') { g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? s * 0.42 : s; const a = i * Math.PI / 4; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); }
      else if (p.shape === 'rect') g.fillRect(-s, -s * 0.5, s * 2, s);
      else { g.beginPath(); g.arc(0, 0, s, 0, Math.PI * 2); g.fill(); }
    }
    g.globalAlpha = 1; void k;
  }
}

/* ---------------- DOM tweens */
export function pop(el, scale = 1.18, dur = 320) { if (!el) return; el.animate([{ transform: 'scale(1)' }, { transform: `scale(${scale})`, offset: 0.35 }, { transform: 'scale(1)' }], { duration: dur, easing: 'cubic-bezier(.34,1.56,.64,1)' }); }
export function press(el) { el && el.animate([{ transform: 'scale(1)' }, { transform: 'scale(.92)', offset: 0.3 }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.34,1.56,.64,1)' }); }
export function shine(el) { if (!el) return; el.classList.remove('shine'); void el.offsetWidth; el.classList.add('shine'); }

/** Fly a small DOM icon from (x,y) along a curved path to the centre of `to`; calls onArrive. */
export function flyTo(layer, html, x, y, to, dur, onArrive, rnd = Math.random, cls = 'fly') {
  const r = to.getBoundingClientRect(), tx = r.left + r.width / 2, ty = r.top + r.height / 2;
  const el = document.createElement('div'); el.className = cls; el.innerHTML = html; layer.appendChild(el);
  const cx = x + (tx - x) * 0.3 + (rnd() - 0.5) * 220, cy = Math.min(y, ty) - 80 - rnd() * 140;
  const t0 = performance.now(), D = dur * 1000;
  const step = (now) => {
    const u = Math.min(1, (now - t0) / D), e = ease.inOut(u), a = 1 - e;
    const px = a * a * x + 2 * a * e * cx + e * e * tx, py = a * a * y + 2 * a * e * cy + e * e * ty;
    el.style.transform = `translate(${px}px,${py}px) translate(-50%,-50%) scale(${1 - 0.35 * e})`;
    if (u < 1) requestAnimationFrame(step); else { el.remove(); onArrive && onArrive(); }
  };
  requestAnimationFrame(step);
}

/** Roll a number from a to b over dur seconds; onTick(i) fires on every integer step (for rising ticks). */
export function countUp(el, a, b, dur, onTick, fmt = (n) => n.toLocaleString('en-US')) {
  const t0 = performance.now(); let last = a;
  return new Promise((res) => {
    const step = (now) => { const u = Math.min(1, (now - t0) / (dur * 1000)), v = Math.round(a + (b - a) * ease.out(u)); if (v !== last) { const ticks = v - last; last = v; onTick && onTick(v, ticks); } el.textContent = fmt(v); if (u < 1) requestAnimationFrame(step); else res(); };
    requestAnimationFrame(step);
  });
}
export const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
