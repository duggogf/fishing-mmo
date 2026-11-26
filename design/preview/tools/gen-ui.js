#!/usr/bin/env node
// Generates the "UI screens and HUD" section of design/preview/index.html and the hero HUD overlay.
// Source of truth: design/gdd/little-ocean/10-ui-ux-and-hud.md and 11-ship-fitting-and-customisation.md.
// Usage: node design/preview/tools/gen-ui.js   (rewrites the marked regions in index.html in place)
// Every frame is authored at 1920x1080 and scaled to fit, so every px here is a 1080p px.
'use strict';
const fs = require('fs');
const path = require('path');
const PAGE = path.join(__dirname, '..', 'index.html');
const DEFS = fs.readFileSync(path.join(__dirname, 'ui-defs.svg'), 'utf8'); // painted bg + crew dummy symbols

/* ------------------------------------------------------------------ tokens */
const T = {
  ink: '#33273B', cream: '#FFF6E3', cocoa: '#6B4A35', wis: '#6E6AA8', amber: '#FF9B21', crimson: '#D02A45',
  shade: '#F3E6C8', rule: '#E4D5B7', muted: '#6A5D70',
  padA: '#5DB35E', padB: '#E0533D', padX: '#3C8CE7', padY: '#E8B92A',
};

/* ------------------------------------------------------------------ icons (24 grid, line) */
const P = {
  fish: '<path d="M3 12c3-4.5 9-5.5 14-2l3-3v10l-3-3c-5 3.5-11 2.5-14-2z"/><circle cx="14.5" cy="11" r=".9" fill="currentColor" stroke="none"/>',
  shell: '<path d="M12 20 4.6 13.6C2.6 10 4.6 5 12 5s9.4 5 7.4 8.6Z"/><path d="M12 20V6.2M12 20 8.4 6.8M12 20l3.6-13.2"/>',
  box: '<path d="M4.5 9h15v10.5h-15z"/><path d="M3 9h18l-1.8-3.5H4.8zM10 12.5h4"/>',
  anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v13M7.5 11h9M4.5 14.5C5.5 18 8.5 20 12 20s6.5-2 7.5-5.5"/>',
  harbour: '<path d="M9.5 21 10.6 9h2.8l1.1 12zM9 9h6M10.8 9V6.2h2.4V9M7.5 5.5 5.5 4.5M16.5 5.5l2-1M3 21h18"/>',
  whale: '<path d="M2.5 13.5C2.5 9.6 6.4 7.5 11 7.5c4 0 6.8 1.9 7.2 4.8L21.5 9v7.5l-3.3-2c-1 2.9-3.9 4.7-7.7 4.7-4.8 0-8-2-8-5.7z"/><circle cx="7.5" cy="12" r=".9" fill="currentColor" stroke="none"/>',
  rod: '<path d="M4 20 18.5 4.5M18.5 4.5c1.2 3 1.2 6.5.2 9M18.7 13.5v2.5"/><circle cx="7" cy="17" r="1.6"/>',
  cup: '<path d="M5.5 9h10v4.5a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4zM15.5 10.2h1.8a2.1 2.1 0 0 1 0 4.2h-1.8M8 5.5c0-1 1-1 1-2M11.5 5.5c0-1 1-1 1-2"/>',
  dots: '<circle cx="6" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18" cy="12" r="1.2" fill="currentColor"/>',
  chat: '<path d="M4 5h16v10.5H9.5L5 19.5V15.5H4z"/>',
  person: '<circle cx="12" cy="7.5" r="3.2"/><path d="M5.5 20v-2.2a4.3 4.3 0 0 1 4.3-4.3h4.4a4.3 4.3 0 0 1 4.3 4.3V20"/>',
  journal: '<path d="M5 18.5V6a2.5 2.5 0 0 1 2.5-2.5H19v13.2H7.5A2.5 2.5 0 0 0 5 19.2a2.5 2.5 0 0 0 2.5 2.3H19"/>',
  menu: '<path d="M4.5 7h15M4.5 12h15M4.5 17h15"/>',
  lock: '<rect x="6" y="11" width="12" height="9" rx="2"/><path d="M9 11V8.5a3 3 0 0 1 6 0V11"/>',
  weight: '<path d="M6.5 9.5h11l2.6 10.5H3.9z"/><circle cx="12" cy="6.2" r="2.2"/>',
  rock: '<path d="M3 18.5 7.2 11l3 2.8 4-6.3 6.8 11z"/>',
  wreck: '<path d="M3 17h13l3-5H6.5zM9 12V6l5 4"/><path d="M2 20.5c2-1.3 4-1.3 6 0s4 1.3 6 0 4-1.3 6 0" stroke-width="1.6"/>',
  check: '<path d="M5 12.5 9.5 17 19 7.5"/>',
  brush: '<path d="M14.5 4.5 19.5 9.5 11 18H6v-5z"/><path d="M12 7l5 5"/>',
  swell: '<path d="M2 15c3-4.5 6-4.5 9 0s6 4.5 9 0"/><path d="M2 9.5c3-3 6-3 9 0s6 3 9 0" stroke-width="1.6"/>',
  bunk: '<path d="M4 7v13M20 7v13M4 11h16M4 17h16M7 11V9.5h5V11"/>',
  crate: '<path d="M4 8h16v11H4zM4 13.5h16M9 8v11M15 8v11"/>',
  hatch: '<rect x="3.5" y="7" width="17" height="11" rx="2"/><path d="M8 7v11M16 7v11M10.5 12.5h3"/>',
  keel: '<path d="M3 6h18l-3.5 4.5H6.5z"/><path d="M10 10.5 9 19.5h6l-1-9"/>',
  hull: '<path d="M2.5 11h19l-3 7.5h-13z"/><path d="M8 11V7h6v4M11 7V3"/>',
  pennant: '<path d="M6 21V3.5l12 4-12 4"/>',
  sail: '<path d="M7 20V3.5l11 14H7zM4 20h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  sparkle: '<path d="M12 4v5M12 15v5M4 12h5M15 12h5"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
  dusk: '<path d="M7 16a5 5 0 0 1 10 0M3 16h18M5 20h14M12 6.5v2.5M6 9.5l1.6 1.6M18 9.5l-1.6 1.6"/>',
  cloud: '<path d="M7 18h10.5a3.8 3.8 0 0 0 .4-7.6A5.5 5.5 0 0 0 7.4 9.2 4.4 4.4 0 0 0 7 18z"/>',
  rain: '<path d="M7 14h10.5a3.5 3.5 0 0 0 .4-7A5 5 0 0 0 7.4 6 4 4 0 0 0 7 14zM8 17l-1 3M12 17l-1 3M16 17l-1 3"/>',
  back: '<path d="M14.5 6 8.5 12l6 6"/>',
  fern: '<path d="M8 21h8l1-5H7zM12 16V7M12 11c-2-1-4-1-5.5-3M12 9c2-1 4-1 5.5-3M12 13c-2-.5-3.5 0-5 1M12 12.5c2-.5 3.5 0 5 1"/>',
  vane: '<path d="M12 21V6M8 21h8M5 9h14M16 7l3 2-3 2M6 7.5 5 9l1 1.5"/><circle cx="12" cy="4.5" r="1.5"/>',
  gull: '<path d="M3 11c3-2 6-2 9 1 3-3 6-3 9-1"/><path d="M9 21h6l-1-5h-4z"/>',
  flag: '<path d="M6 21V3.5M6 4.5h12l-3 3.5 3 3.5H6"/>',
  lamp: '<path d="M9 7h6l1 9H8zM10 7V5h4v2M8 16h8v2H8zM12 3v2"/>',
  ring: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3.5"/><path d="M12 4.5v4M12 15.5v4M4.5 12h4M15.5 12h4" stroke-width="1.6"/>',
  bell: '<path d="M6.5 16.5c1-1 1.5-3 1.5-6a4 4 0 0 1 8 0c0 3 .5 5 1.5 6zM11 19.5h2M12 4V2.5"/>',
  seal: '<path d="M4 17c0-5 3-9 8-9 3 0 5 2 5 4l3-1-1 3c-1 3-4 5-8 5H4z"/><circle cx="14" cy="11" r=".9" fill="currentColor" stroke="none"/>',
  board: '<rect x="3.5" y="8" width="17" height="8" rx="2"/><path d="M7 12h10" stroke-width="1.6"/>',
};
const ic = (n, s = 24, extra = '') => `<svg class="lo-i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${P[n]}</svg>`;

/* ------------------------------------------------------------------ primitives */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const css = (o) => Object.entries(o).map(([k, v]) => `${k}:${typeof v === 'number' ? v + 'px' : v}`).join(';');
const at = (o, inner, cls = '') => `<div class="lo-abs ${cls}" style="${css(o)}">${inner}</div>`;
// Keyboard keycap or gamepad face button
const key = (k) => `<span class="lo-key${k.length > 2 ? ' lo-key--w' : ''}">${esc(k)}</span>`;
const PAD = { A: T.padA, B: T.padB, X: T.padX, Y: T.padY };
const pad = (b) => PAD[b] ? `<span class="lo-pad" style="--c:${PAD[b]}">${b}</span>` : `<span class="lo-pad lo-pad--n">${esc(b)}</span>`;
const glyph = (g) => (g.startsWith('pad:') ? pad(g.slice(4)) : g.split('+').map(key).join(''));
// Action bar: items [glyph, verb, opts]
const bar = (items, o = {}) => `<div class="lo-bar ${o.cls || ''}" style="${css(o.pos || { left: 32, bottom: 32 })}">${items.map(([g, v, f = {}]) =>
  `<span class="lo-act${f.hi ? ' lo-act--hi' : ''}${f.hover ? ' lo-act--hover' : ''}">${glyph(g)}<span>${esc(v)}</span></span>`).join('')}</div>`;
const SAIL_KB = [['W+A+S+D', 'Sail'], ['Space', 'Anchor'], ['M', 'Map'], ['F', 'Inspect (hold)'], ['Tab', 'Menu']];
const SAIL_PAD = [['pad:LS', 'Sail'], ['pad:Y', 'Anchor'], ['pad:View', 'Map'], ['pad:LB', 'Inspect (hold)'], ['pad:Menu', 'Menu']];

/* ------------------------------------------------------------------ HUD widgets */
function cargo(load, cap, o = {}) {
  const full = load >= cap;
  const w = Math.round(120 * Math.min(1, load / cap));
  return `<div class="lo-glass lo-cargo ${o.cls || ''}" style="${css(o.pos || { left: 32, top: 32 })}">${ic(full ? 'box' : 'fish')}<span class="lo-track${full ? ' lo-track--full' : ''}"><i style="width:${w}px"></i></span><b class="lo-num">${full ? 'Full' : `${load}/${cap}`}</b>${o.plus ? `<span class="lo-plus">+1</span>` : ''}</div>`;
}
const shells = (n, o = {}) => `<div class="lo-glass lo-shells ${o.cls || ''}" style="${css(o.pos || { right: 32, top: 32 })}">${ic('shell')}<b class="lo-num">${n.toLocaleString('en-US')}</b>${o.plus ? `<span class="lo-plus lo-plus--s">+${o.plus}</span>` : ''}</div>`;
// heading in degrees (0 = N); markers [{deg, icon, amber, label}]
function compass(heading, markers = [], o = {}) {
  const W = 420, span = 180, ppd = W / span; let s = '';
  for (let d = 0; d < 360; d += 15) {
    let rel = ((d - heading + 540) % 360) - 180; if (Math.abs(rel) > span / 2 - 4) continue;
    const x = W / 2 + rel * ppd;
    const L = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[d];
    s += L ? `<span class="lo-cmp-l" style="left:${x}px">${L}</span>` : `<span class="lo-cmp-t${d % 45 === 0 ? ' lo-cmp-t--m' : ''}" style="left:${x}px"></span>`;
  }
  for (const m of markers) {
    let rel = ((m.deg - heading + 540) % 360) - 180; const edge = Math.abs(rel) > span / 2 - 10;
    rel = Math.max(-span / 2 + 10, Math.min(span / 2 - 10, rel));
    s += `<span class="lo-cmp-m${m.amber ? ' lo-cmp-m--amber' : ''}" style="left:${W / 2 + rel * ppd}px">${ic(m.icon, 18)}${edge ? `<em>${rel < 0 ? '‹' : '›'}</em>` : ''}</span>`;
  }
  const sub = o.sub ? `<div class="lo-cmp-sub${o.subAmber ? ' lo-cmp-sub--amber' : ''}">${o.sub}</div>` : '';
  return `<div class="lo-cmp ${o.cls || ''}"><div class="lo-glass lo-cmp-strip">${s}</div><span class="lo-cmp-caret"></span>${sub}</div>`;
}
// Activity log. lines: [{who, text, tag, age}] newest last. open=true shows the full box.
function log(lines, o = {}) {
  const L = lines.map((l) => `<div class="lo-line${l.chat ? ' lo-line--chat' : ''}" style="${l.fade ? `opacity:${l.fade}` : ''}">${l.who ? `<b>${esc(l.who)}</b> ` : ''}${esc(l.text)}${l.tag ? ` <span class="lo-tag">${esc(l.tag)}</span>` : ''}</div>`).join('');
  if (!o.open) return `<div class="lo-log" style="${css(o.pos || { left: 32, bottom: 82 })}">${L}</div>`;
  const tabs = ['All', 'Crew', 'Chat'].map((t) => `<span class="${t === (o.tab || 'All') ? 'on' : ''}">${t}</span>`).join('');
  const input = o.input ? `<div class="lo-log-in"><span class="lo-caret">${esc(o.input)}</span><span class="lo-dim">Enter to send · Esc to close</span></div>` : '';
  return `<div class="lo-glass lo-log lo-log--open" style="${css(o.pos || { left: 32, bottom: 82 })}"><div class="lo-log-tabs">${tabs}</div><div class="lo-log-body">${L}</div>${input}</div>`;
}
const speed = (kn, notch, o = {}) => `<div class="lo-glass lo-speed" style="${css(o.pos || { right: 32, bottom: 32 })}">${o.anchored ? `${ic('anchor', 20)}<b>Anchored</b>` : `<b class="lo-num">${kn} kn</b><span class="lo-notch">${[0, 1, 2, 3, 4].map((i) => `<i class="${i < notch ? 'on' : ''}"></i>`).join('')}</span>`}</div>`;
const hint = (text, o = {}) => `<div class="lo-glass lo-hint" style="${css(o.pos || {})}">${text}</div>`;

const world = (img, inner, o = {}) => `<div class="lo-stage${o.cls ? ' ' + o.cls : ''}"><div class="lo-canvas">${img ? `<img class="lo-bgimg" src="shots/${img}.webp" alt="" style="${o.imgStyle || ''}">` : ''}${o.dim ? `<div class="lo-dim-world" style="opacity:${o.dim}"></div>` : ''}${inner}</div></div>`;
const fig = (inner, cap) => `<figure class="lo-fig">${inner}<figcaption class="lo-cap">${cap}</figcaption></figure>`;

/* ------------------------------------------------------------------ paper widgets */
const paper = (o, inner) => `<div class="lo-paper" style="${css(o)}">${inner}</div>`;
const head = (title, line, right = '') => `<div class="lo-ph"><h5>${esc(title)}</h5>${line ? `<q>${esc(line)}</q>` : ''}${right}</div>`;
const btn = (t, kind = '', extra = '') => `<span class="lo-btn ${kind ? 'lo-btn--' + kind : ''}"${extra}>${t}</span>`;

/* ------------------------------------------------------------------ frames */
// HUD at sea. Default = Ambient (no plates). opt.focus: list of elements in the Focused state
// ('cargo','shells','bar','compass'); opt.peek focuses everything. Shells are Hidden at sea unless focused or lifting.
function hudSailing(opt = {}) {
  const pad = opt.pad, F = (k) => (opt.peek || (opt.focus || []).includes(k) ? 'lo-focus' : '');
  const showShells = opt.peek || (opt.focus || []).includes('shells') || opt.shellsPlus;
  return `<div class="lo-amb">` + [
    cargo(opt.load ?? 23, opt.cap ?? 32, { plus: opt.plus, cls: F('cargo') }),
    compass(opt.heading ?? 35, [{ deg: 200, icon: 'harbour' }, { deg: 62, icon: 'rock' }, ...(opt.ping ? [{ deg: 52, icon: 'whale', amber: true }] : [])],
      { sub: opt.sub, subAmber: opt.subAmber, cls: F('compass') }),
    opt.clock === false ? '' : `<div class="lo-glass lo-clock ${F('clock')}">${sky(opt.time || '15:40', opt.weather || 'sun')}</div>`,
    showShells ? shells(opt.shells ?? 158, { plus: opt.shellsPlus, cls: F('shells'), pos: { right: 32, top: 84 } }) : '',
    opt.log === false ? '' : log(opt.lines || [{ who: 'Pip', text: 'landed a Harbour mackerel', tag: 'new' }], { open: opt.logOpen, tab: opt.tab, input: opt.input }),
    bar(opt.bar || (pad ? SAIL_PAD : SAIL_KB), { cls: F('bar') }),
    opt.speed ? speed(...opt.speed) : '',
    opt.hint ? hint(opt.hint) : '',
    opt.peekTag ? `<div class="lo-peektag">${key('F')} held · Inspect</div>` : '',
  ].join('') + `</div>`;
}

function heroOverlay() {
  return `<div class="lo-canvas">${hudSailing({ load: 23, cap: 32, shells: 158, heading: 35, sub: 'The Shallows', lines: [{ who: 'Mabel', text: 'landed a Sand sprat', fade: 0.55 }, { who: 'Pip', text: 'landed a Harbour mackerel', tag: 'new' }] })}</div>`;
}

/* --- Fishmonger */
function fishmonger(state) {
  const rows = [['Sand sprat', 9, 2], ['Harbour mackerel', 6, 3], ['Blue wrasse', 3, 5, 'new'], ['Ribbon eel', 1, 8], ['Sun flounder', 1, 12]];
  const total = rows.reduce((a, r) => a + r[1] * r[2], 0), n = rows.reduce((a, r) => a + r[1], 0);
  let body;
  if (state === 'summary') {
    body = `<div class="lo-sum"><div class="lo-sum-n">${ic('shell', 40)}<b>+${total}</b><span>Shells</span></div><p>${n} fish sold · 0/${32} in the hold</p></div>`;
  } else if (state === 'empty') {
    body = `<div class="lo-empty">${ic('fish', 40)}<p>Nothing to sell yet</p></div><div class="lo-pf"><span class="lo-dim2">0 fish</span>${btn('Sell all', 'off')}</div>`;
  } else {
    body = `<table class="lo-rows"><thead><tr><th></th><th>Fish</th><th class="r">Count</th><th class="r">Each</th><th class="r">Shells</th></tr></thead><tbody>${rows.map((r) =>
      `<tr><td class="ic">${ic('fish', 24)}</td><td>${r[0]}${r[3] ? ' <span class="lo-chip">new</span>' : ''}</td><td class="r">×${r[1]}</td><td class="r lo-dim2">${r[2]}</td><td class="r"><b>${r[1] * r[2]}</b></td></tr>`).join('')}</tbody></table>
      <div class="lo-pf"><span class="lo-dim2">${n} fish</span><span class="lo-total">Total <b>${total}</b> ${ic('shell', 22)}</span>${btn('Sell all', 'pri')}</div>`;
  }
  const panel = paper({ left: 660, top: 250, width: 600, height: state === 'summary' ? 300 : 420 }, head('Fishmonger', state === 'empty' ? 'Come back with a catch, dear.' : 'Fine catch today!') + body);
  const b = state === 'summary' ? bar([['Click', 'Skip']], { cls: 'lo-focus' }) : bar([['E', 'Sell all'], ['Esc', 'Back']], { cls: 'lo-focus' });
  return world('ui_bg_harbour', panel + shells(state === 'summary' ? 158 + total : 158, { plus: state === 'summary' ? total : 0, cls: 'lo-focus' }) + b, { dim: 0.32 });
}

/* --- Shipyard (Fit) */
const ITEMS = {
  crate: { name: 'Fish crate', size: 'S', kg: 40, eff: '+6 hold', icon: 'crate' },
  hold: { name: 'Fish hold', size: 'M', kg: 120, eff: '+12 hold', icon: 'hatch', price: 60 },
  bunk: { name: 'Bunk', size: 'S', kg: 60, eff: '+1 berth', icon: 'bunk', price: 40 },
  keel: { name: 'Swell keel', size: 'Keel', kg: 220, eff: 'Opens The Swells', icon: 'keel', price: 70 },
  deep: { name: 'Deep hold', size: 'L', kg: 200, eff: '+12 hold', icon: 'hatch', price: 300 },
};
// slots on the yard image (image shifted left by 220 px); x,y,w,h in frame px
const SLOTS = {
  skiff: [{ id: 'S', x: 300, y: 760, w: 130, h: 76 }, { id: 'M', x: 446, y: 740, w: 196, h: 96 }, { id: 'S', x: 1110, y: 740, w: 120, h: 70 }],
  cutter: [{ id: 'S', x: 286, y: 766, w: 104, h: 70 }, { id: 'M', x: 400, y: 744, w: 150, h: 92 }, { id: 'L', x: 560, y: 734, w: 230, h: 102 }, { id: 'M', x: 1084, y: 736, w: 116, h: 78 }, { id: 'S', x: 1210, y: 742, w: 96, h: 68 }],
};
function slotHtml(s, item, st = '') {
  const lab = item ? `${s.id} · ${ITEMS[item].name}` : `${s.id} · empty`;
  return at({ left: s.x, top: s.y, width: s.w, height: s.h }, `<span class="lo-slot-tag">${lab}</span>`, `lo-slot${item ? ' lo-slot--full' : ''}${st ? ' lo-slot--' + st : ''}`);
}
function rail(hull, rows, shellsN) {
  const hulls = [['Skiff', 'S S M · 200 kg', hull === 'skiff' ? 'In use' : 'Owned'], ['Cutter', 'S S M M L + keel · 650 kg', hull === 'cutter' ? 'In use' : '180']];
  const hullRow = hulls.map(([n, d, s]) => `<div class="lo-hull${s === 'In use' ? ' on' : ''}">${ic('hull', 28)}<div><b>${n}</b><small>${d}</small></div><em>${s === '180' ? `${ic('shell', 18)} 180` : s}</em></div>`).join('');
  const list = rows.map((r) => {
    const it = ITEMS[r.k];
    const right = r.state === 'buy' ? btn(`${ic('shell', 16)} ${it.price}`, 'sm') : `<em class="lo-st">${r.state}</em>`;
    return `<div class="lo-item${r.sel ? ' sel' : ''}${r.blocked ? ' blk' : ''}">${ic(it.icon, 28)}<div><b>${it.name}</b><small>${it.size} · ${it.kg} kg · ${it.eff}</small>${r.why ? `<small class="lo-why">${ic('lock', 14)} ${r.why}</small>` : ''}</div>${right}</div>`;
  }).join('');
  return paper({ right: 32, top: 100, width: 560, height: 880 }, `<div class="lo-rail"><h6>Hull</h6>${hullRow}<h6>Shed &amp; for sale</h6>${list}<div class="lo-rail-f">${btn('Cancel', 'sec')}${btn('Done', 'pri')}</div></div>`);
}
function loadbar(load, limit, hullName) {
  const W = 520, over = Math.max(0, load - limit), fill = Math.min(load, limit) / limit;
  return `<div class="lo-load"><div class="lo-load-h">${ic('weight', 20)}<b>Load</b><span class="lo-num">${load} / ${limit} kg</span></div>
  <div class="lo-load-t"><i style="width:${Math.round(W * fill)}px"></i>${over ? `<s style="left:${W}px;width:${Math.round(W * over / limit)}px"></s>` : ''}</div></div>`;
}
function yardTop(tab, shellsN) {
  return `<div class="lo-yard-top"><h4>Shipyard</h4><div class="lo-tabs"><span class="${tab === 'fit' ? 'on' : ''}">${ic('crate', 18)} Fit</span><span class="${tab === 'paint' ? 'on' : ''}">${ic('brush', 18)} Paint</span><span class="${tab === 'decor' ? 'on' : ''}">${ic('flag', 18)} Decor</span></div></div>` + shells(shellsN, { pos: { right: 32, top: 32 }, cls: 'lo-focus' });
}
function yardFit(state) {
  let slots, rows, load, limit, delta, reason, shellsN, ghost = '';
  if (state === 'squeeze') {
    slots = [slotHtml(SLOTS.skiff[0], null, 'bad'), slotHtml(SLOTS.skiff[1], 'hold'), slotHtml(SLOTS.skiff[2], 'bunk')];
    rows = [{ k: 'crate', state: 'In the shed', sel: true, blocked: true, why: '20 kg too heavy for the Skiff' }, { k: 'hold', state: 'Fitted' }, { k: 'bunk', state: 'Fitted' },
      { k: 'keel', state: 'buy', why: 'Needs a keel mount (Cutter)' }, { k: 'deep', state: 'buy', why: 'Needs an L slot (Cutter)' }];
    load = 220; limit = 200; shellsN = 68; delta = ''; reason = '20 kg too heavy for the Skiff. Remove the bunk or the hold, or get the Cutter.';
    ghost = at({ left: 318, top: 668, width: 92, height: 64 }, ic('crate', 56), 'lo-ghost');
  } else {
    slots = [slotHtml(SLOTS.cutter[0], 'crate'), slotHtml(SLOTS.cutter[1], 'hold'), slotHtml(SLOTS.cutter[2], null), slotHtml(SLOTS.cutter[3], null), slotHtml(SLOTS.cutter[4], 'bunk'),
      at({ left: 860, top: 962, width: 240, height: 64 }, '<span class="lo-slot-tag">Keel mount · Swell keel</span>', 'lo-slot lo-slot--full lo-slot--keel')];
    rows = [{ k: 'crate', state: 'Fitted' }, { k: 'hold', state: 'Fitted' }, { k: 'bunk', state: 'Fitted' }, { k: 'keel', state: 'Fitted', sel: true }, { k: 'deep', state: 'buy' }];
    load = 440; limit = 650; shellsN = 36; delta = 'Hold 26 → 32 · Swell keel fitted · The Swells open'; reason = '';
  }
  const info = `<div class="lo-yard-info">${loadbar(load, limit)}${delta ? `<p class="lo-delta">${ic('check', 18)} ${delta}</p>` : ''}${reason ? `<p class="lo-reason">${ic('weight', 18)} ${reason}</p>` : ''}</div>`;
  const b = bar([['Click', 'Pick'], ['Drag', 'Fit'], ['R', 'Remove'], ['Tab', 'Next tab'], ['Esc', 'Cancel'], ['Enter', 'Done']]);
  return world('ui_bg_yard', yardTop('fit', shellsN) + slots.join('') + ghost + info + rail(state === 'squeeze' ? 'skiff' : 'cutter', rows, shellsN) + b,
    { imgStyle: 'left:-220px;width:2140px;height:1204px;top:-60px', cls: 'lo-stage--yard' });
}
function yardPaint() {
  const parts = ['Hull', 'Trim', 'Sail', 'Pattern'];
  const sw = [['#E8553F', 'Coral hull', 'on'], ['#7FC8C4', 'Sea foam'], ['#4F79B0', 'Harbour blue'], ['#E9CFA0', 'Biscuit'], ['#2F5F86', 'Deep water', '40'], ['#F7CF4A', 'Lantern', '40'],
    ['#8E6FB0', 'Dusk', '40'], ['#F2F0E6', 'Sail white', '40'], ['#8A6A52', 'Wreck-wood', 'Seen: Marigold wreck'], ['#D63F7C', 'Rosehip', 'lock'], ['#86C445', 'Sprout', 'lock'], ['#33273B', 'Ink', 'lock']];
  const grid = sw.map(([c, n, s]) => `<div class="lo-sw${s === 'on' ? ' on' : ''}${s && s !== 'on' ? ' lock' : ''}"><i style="background:${c}"></i><small>${n}</small>${s && s !== 'on' ? `<em>${s === 'lock' ? ic('lock', 14) + ' Buy' : /^\d/.test(s) ? ic('shell', 14) + ' ' + s : ic('sparkle', 14) + ' ' + s}</em>` : ''}</div>`).join('');
  const r = paper({ right: 32, top: 100, width: 560, height: 880 }, `<div class="lo-rail"><div class="lo-parts">${parts.map((p, i) => `<span class="${i === 0 ? 'on' : ''}">${p}</span>`).join('')}</div><h6>Hull paint</h6><div class="lo-swg">${grid}</div>
    <p class="lo-note">Hover to try on. Owned paints are free to apply. Paint never changes how she sails.</p><div class="lo-rail-f">${btn('Cancel', 'sec')}${btn('Done', 'pri')}</div></div>`);
  const b = bar([['Click', 'Try on'], ['Tab', 'Next tab'], ['Q+E', 'Part'], ['Esc', 'Cancel'], ['Enter', 'Done']]);
  return world('ui_bg_yard', yardTop('paint', 36) + r + b, { imgStyle: 'left:-220px;width:2140px;height:1204px;top:-60px', cls: 'lo-stage--yard' });
}

function yardDecor() {
  const pts = [['Masthead', 1000, 238, 'Pennant'], ['Roof', 958, 592, null, 1], ['Rail', 372, 748, 'Brass lamp'], ['Rail', 700, 738, null], ['Rail', 1150, 722, 'Life ring'], ['Figurehead', 1290, 772, null], ['Stern', 250, 800, 'Name board']];
  const rings = pts.map(([n, x, y, v, sel]) => at({ left: x - 22, top: y - 22, width: 44, height: 44 }, sel ? `<span class="lo-dp-tag">${n} · Potted fern (preview)</span>` : '', `lo-dp${sel ? ' lo-dp--sel' : ''}${v ? ' lo-dp--full' : ''}`)).join('');
  const ghost = at({ left: 930, top: 530, width: 56, height: 56 }, ic('fern', 48), 'lo-dp-ghost');
  const objs = [['fern', 'Potted fern', 'Roof', ['buy', 30], 'sel'], ['vane', 'Weathervane', 'Roof', ['buy', 45]], ['gull', 'Gull statue', 'Roof', ['earn', 'Seen: the lighthouse']], ['close', 'Nothing', 'Roof', ['txt', 'Keep it bare']]];
  const list = objs.map(([i, n, k, [m, v], s]) => `<div class="lo-item${s ? ' sel' : ''}">${ic(i, 28)}<div><b>${n}</b><small>${k} point · looks only</small>${m === 'earn' ? `<small class="lo-why">${ic('sparkle', 14)} ${v}</small>` : ''}</div>${m === 'buy' ? btn(`${ic('shell', 16)} ${v}`, 'sm') : m === 'txt' ? `<em class="lo-st">${v}</em>` : `<em class="lo-st">${ic('lock', 14)} Earned</em>`}</div>`).join('');
  const r = paper({ right: 32, top: 100, width: 560, height: 880 }, `<div class="lo-rail"><h6>Roof point</h6>${list}
    <h6>On this boat</h6><p class="lo-note" style="margin-top:0">Masthead: Pennant · Rail: Brass lamp, Life ring · Stern: Name board <b>"Marigold II"</b> · 3 points empty</p>
    <p class="lo-note">Cutter: 7 decor points · Skiff: 5. Decor has no weight and never uses gear slots.</p><div class="lo-rail-f">${btn('Cancel', 'sec')}${btn('Done', 'pri')}</div></div>`);
  const b = bar([['Click', 'Pick point'], ['Click', 'Place'], ['R', 'Remove'], ['Tab', 'Next tab'], ['Esc', 'Cancel'], ['Enter', 'Done']]);
  return world('ui_bg_yard', yardTop('decor', 36) + rings + ghost + r + b, { imgStyle: 'left:-220px;width:2140px;height:1204px;top:-60px', cls: 'lo-stage--yard' });
}

/* --- Inn crew board */
function crewBoard(state) {
  const aboard = [['Mabel', 1], ['Pip', 2]];
  const berths = state === 'nobunk' ? 2 : 3;
  const cards = aboard.map(([n, i]) => `<div class="lo-cb">${dummy(n, 40)}<b>${n}</b><small>#${i} · aboard</small></div>`).join('') +
    (berths === 3 ? `<div class="lo-cb lo-cb--empty"><span class="lo-berth">${ic('bunk', 28)}</span><b>Free berth</b><small>#3</small></div>` : '');
  const cand = `<div class="lo-cand">${dummy('Tomo', 56)}<div><b>Tomo</b><q>Points at whales before anyone else sees them.</q><small>Steady hands · one-off fee, no wages</small></div>
    <div class="lo-cand-r">${state === 'nobunk' ? `${btn('Hire', 'off')}<small class="lo-why">${ic('bunk', 14)} No free bunk. The shipyard can fit one.</small>` : `${btn(`Hire · ${ic('shell', 16)} 50`, 'pri')}`}</div></div>`;
  const panel = paper({ left: 640, top: 250, width: 640, height: state === 'nobunk' ? 392 : 370 }, head('Crew board', '', `<span class="lo-ph-r">Berths ${aboard.length} / ${berths}</span>`) + `<div class="lo-cbrow">${cards}</div><h6 class="lo-h6p">Looking for a boat</h6>${cand}`);
  return world('ui_bg_harbour', panel + shells(68, { cls: 'lo-focus' }) + bar(state === 'nobunk' ? [['Esc', 'Back']] : [['E', 'Hire'], ['Esc', 'Back']]), { dim: 0.32, imgStyle: 'left:-300px;width:2400px;height:1350px;top:-150px' });
}
const dummy = (n, h) => `<svg class="lo-dummy" width="${h * 0.75}" height="${h}" viewBox="0 0 48 64" aria-hidden="true"><use href="#lo-d-${n}"/></svg>`;

/* --- Crew panel + journal */
function crewPanel() {
  const crew = [['Mabel', 1, 'rod', 'Fishing', 'Steady hands', 'Hums and taps her foot'], ['Pip', 2, 'rod', 'Fishing', 'Quick hands', 'Waves at gulls'], ['Tomo', 3, 'dots', 'Not in a fishing spot', 'Steady hands', 'Points at whales']];
  const rows = crew.map(([n, i, g, s, e, f]) => `<div class="lo-crow">${dummy(n, 48)}<div class="lo-crow-n"><b>${n}</b><small>#${i} · ${f}</small></div><div class="lo-crow-s">${ic(g, 20)}<span>${s}</span><small>${e}</small></div></div>`).join('');
  return paper({ left: 700, top: 240, width: 520, height: 330 }, head('Crew', '', '<span class="lo-ph-r">At sea · read only</span>') + rows);
}
function journal() {
  const fish = [['Sand sprat', 'The Shallows', 1], ['Harbour mackerel', 'The Shallows', 1], ['Blue wrasse', 'The Shallows', 1], ['Ribbon eel', 'The Shallows', 1], [null], [null]];
  const cells = fish.map(([n, r]) => n ? `<div class="lo-jc">${ic('fish', 40)}<b>${n}</b><small>${r}</small></div>` : `<div class="lo-jc lo-jc--sil"><span>${ic('fish', 40)}</span><b>Not seen yet</b><small>&nbsp;</small></div>`).join('');
  return paper({ left: 600, top: 220, width: 720, height: 400 }, head('Journal', '', '<div class="lo-ptabs"><span class="on">Fish · 7 of 11 seen</span><span>Places · 2 of 5</span></div>') + `<div class="lo-jg">${cells}</div>`);
}

/* --- Pause + settings */
function pauseSettings() {
  const menu = paper({ left: 96, top: 200, width: 360, height: 420 }, `<div class="lo-menu"><h5>Paused</h5>${['Resume', 'Settings', 'Companion window', 'Controls', 'Quit to desktop'].map((m, i) => `<span class="${i === 1 ? 'on' : ''}">${m}${i === 2 ? ' <kbd>F9</kbd>' : ''}</span>`).join('')}<small>The sea keeps going while you are here.</small></div>`);
  const row = (l, ctl) => `<div class="lo-set"><span>${l}</span>${ctl}</div>`;
  const seg = (opts, on) => `<span class="lo-seg2">${opts.map((o) => `<i class="${o === on ? 'on' : ''}">${o}</i>`).join('')}</span>`;
  const slider = (v, lab) => `<span class="lo-sl"><i style="width:${v}%"></i><b style="left:${v}%"></b></span><em>${lab}</em>`;
  const set = paper({ left: 488, top: 200, width: 720, height: 500 }, `<div class="lo-ptabs lo-ptabs--set"><span class="on">Display</span><span>Audio</span><span>Controls</span><span>Accessibility</span></div>
    ${row('UI scale', slider(29, '100%'))}${row('HUD fade when idle', seg(['Off', '8 s', '20 s'], '8 s'))}${row('Action bar', seg(['Full', 'Context', 'Off'], 'Full'))}
    ${row('Activity log lines', slider(50, '12 s'))}${row('HUD style', seg(['Ambient', 'Always backed'], 'Ambient'))}${row('Button prompts', seg(['Auto', 'Keyboard', 'Xbox', 'PlayStation'], 'Auto'))}<p class="lo-note">Changes preview live behind this panel.</p>`);
  return world('ui_bg_day', menu + set + bar([['Esc', 'Back'], ['Enter', 'Select']], { cls: 'lo-focus' }), { dim: 0.42 });
}

/* --- Menu (Tab): Cargo · Ship · Crew · Journal · Map · System */
const MENU_TABS = [['cargo', 'Cargo', 'fish'], ['ship', 'Ship', 'hull'], ['crew', 'Crew', 'person'], ['journal', 'Journal', 'journal'], ['map', 'Map', 'pennant'], ['system', 'System', 'gear']];
function menuFrame(tab, body, o = {}) {
  const tabs = MENU_TABS.map(([k, n, i]) => `<span class="${k === tab ? 'on' : ''}">${ic(i, 18)} ${n}</span>`).join('');
  const panel = paper({ left: 320, top: 190, width: 1280, height: 640 }, `<div class="lo-mtabs">${tabs}<span class="lo-mt-hint">${key('Q')} ${key('E')}</span></div><div class="lo-mbody">${body}</div>`);
  const b = bar(o.bar || [['Q+E', 'Tab'], ['Tab', 'Close']], { cls: 'lo-focus' });
  return world(o.bg || 'ui_bg_day', panel + shells(158, { cls: 'lo-focus' }) + b, { dim: 0.42 });
}
function tabCargo() {
  const rows = [['Sand sprat', 9], ['Harbour mackerel', 6], ['Blue wrasse', 3, 'new'], ['Ribbon eel', 1], ['Sun flounder', 1, 'uncommon'], ['Silver darter', 3]];
  return `<div class="lo-mcols"><div><h6 class="lo-mh">In the hold</h6><table class="lo-rows"><tbody>${rows.map((r) => `<tr><td class="ic">${ic('fish', 24)}</td><td>${r[0]}${r[2] ? ` <span class="lo-chip">${r[2]}</span>` : ''}</td><td class="r"><b>×${r[1]}</b></td></tr>`).join('')}</tbody></table></div>
  <div class="lo-mside"><h6 class="lo-mh">Hold</h6><div class="lo-big">23 <small>/ 32</small></div><span class="lo-track lo-track--paper lo-track--wide"><i style="width:${Math.round(360 * 23 / 32)}px"></i></span>
  <p class="lo-note">The crew keep fishing until the hold is full. Sell at the Fishmonger in the harbour.</p></div></div>`;
}
function tabShip() {
  const slots = [['S', 'empty', ''], ['M', 'Fish hold', '120 kg · +12 hold'], ['S', 'Bunk', '60 kg · +1 berth']];
  return `<div class="lo-mcols"><div><h6 class="lo-mh">Skiff · "Marigold II"</h6>${slots.map(([s, n, d]) => `<div class="lo-item">${ic(n === 'empty' ? 'crate' : n === 'Bunk' ? 'bunk' : 'hatch', 28)}<div><b>${s} slot · ${n}</b><small>${d || 'Free slot'}</small></div></div>`).join('')}
  <h6 class="lo-mh" style="margin-top:18px">Decor</h6><p class="lo-note" style="margin-top:0">Masthead: Pennant · Rail: Brass lamp · 3 points empty</p></div>
  <div class="lo-mside"><h6 class="lo-mh">Load</h6><div class="lo-big">180 <small>/ 200 kg</small></div><span class="lo-track lo-track--paper lo-track--wide"><i style="width:${Math.round(360 * 180 / 200)}px"></i></span>
  <p class="lo-note">Hold 26 · Crew berths 3 · No keel</p><p class="lo-note">${ic('harbour', 18, ' style="display:inline;vertical-align:-3px"')} Change her at the Shipyard.</p></div></div>`;
}
function tabCrew() {
  const crew = [['Mabel', 1, 'rod', 'Fishing', 'Steady hands', 'Hums and taps her foot'], ['Pip', 2, 'rod', 'Fishing', 'Quick hands', 'Waves at gulls'], ['Tomo', 3, 'dots', 'Not in a fishing spot', 'Steady hands', 'Points at whales']];
  return crew.map(([n, i, g, s, e, f]) => `<div class="lo-crow">${dummy(n, 56)}<div class="lo-crow-n"><b>${n}</b><small>#${i} · ${f}</small></div><div class="lo-crow-s">${ic(g, 20)}<span>${s}</span><small>${e}</small></div></div>`).join('');
}
function tabJournal() {
  const fish = [['Sand sprat', 'The Shallows'], ['Harbour mackerel', 'The Shallows'], ['Blue wrasse', 'The Shallows'], ['Ribbon eel', 'The Shallows'], ['Sun flounder', 'The Shallows'], ['Silver darter', 'The Shallows'], ['Bream', 'The Shallows'], [null], [null], [null], [null]];
  const cells = fish.map(([n, r]) => n ? `<div class="lo-jc">${ic('fish', 36)}<b>${n}</b><small>${r}</small></div>` : `<div class="lo-jc lo-jc--sil"><span>${ic('fish', 36)}</span><b>Not seen yet</b><small>&nbsp;</small></div>`).join('');
  return `<div class="lo-ptabs" style="margin:0 0 12px"><span class="on">Fish · 7 of 11 seen</span><span>Places · 3 of 5</span></div><div class="lo-jg lo-jg--4">${cells}</div>`;
}
function tabSystem() {
  const row = (l, ctl) => `<div class="lo-set"><span>${l}</span>${ctl}</div>`;
  const seg = (opts, on) => `<span class="lo-seg2">${opts.map((o) => `<i class="${o === on ? 'on' : ''}">${o}</i>`).join('')}</span>`;
  const slider = (v, lab) => `<span class="lo-sl"><i style="width:${v}%"></i><b style="left:${v}%"></b></span><em>${lab}</em>`;
  const side = `<div class="lo-menu">${['Resume', 'Settings', 'Companion window', 'Controls', 'Quit to desktop'].map((m, i) => `<span class="${i === 1 ? 'on' : ''}">${m}${i === 2 ? ' <kbd>F9</kbd>' : ''}</span>`).join('')}<small>The sea keeps going while you are here.</small></div>`;
  const set = `<div><div class="lo-ptabs lo-ptabs--set" style="padding-top:0"><span class="on">Display</span><span>Audio</span><span>Controls</span><span>Accessibility</span></div>
    ${row('UI scale', slider(29, '100%'))}${row('Action bar', seg(['Full', 'Context', 'Off'], 'Full'))}${row('Activity log lines', slider(50, '12 s'))}
    ${row('HUD style', seg(['Ambient', 'Outlined', 'Always backed'], 'Ambient'))}${row('Button prompts', seg(['Auto', 'Keyboard', 'Xbox', 'PlayStation'], 'Auto'))}<p class="lo-note">Changes preview live behind this panel.</p></div>`;
  return `<div class="lo-mcols lo-mcols--sys">${side}${set}</div>`;
}

/* --- Map (M): cozy hand-drawn chart. World x[-800,800], y[-200,1400] (doc 03) */
function chart(o = {}) {
  const S = 0.62, cx = 980, cy = 560, my = 560;
  const X = (x) => cx + x * S, Y = (y) => cy - (y - my) * S;
  const P = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join(' ') + ' Z';
  // smooth closed blob through points (Catmull-Rom → cubic)
  const blob = (pts) => { const n = pts.length; let d = `M ${X(pts[0][0]).toFixed(1)} ${Y(pts[0][1]).toFixed(1)}`;
    for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C ${X(c1[0]).toFixed(1)} ${Y(c1[1]).toFixed(1)} ${X(c2[0]).toFixed(1)} ${Y(c2[1]).toFixed(1)} ${X(p2[0]).toFixed(1)} ${Y(p2[1]).toFixed(1)}`; }
    return d + ' Z'; };
  const main = blob([[-1700, -40], [-1100, -70], [-760, -20], [-560, 30], [-470, 110], [-410, 55], [-300, 15], [-160, 5], [-125, -50], [-60, -150], [60, -150], [125, -50], [160, 5], [330, 20], [470, 45], [560, 25], [760, 40], [1100, -30], [1700, -60], [1700, -900], [-1700, -900]]);
  const isles = [blob([[580, 160], [620, 215], [675, 195], [670, 150], [620, 140]]), blob([[-330, 1010], [-290, 1050], [-250, 1015], [-275, 975], [-320, 975]]),
    blob([[520, 1250], [600, 1300], [690, 1270], [660, 1210], [570, 1215]]), blob([[-690, 620], [-650, 660], [-610, 630], [-640, 600]])];
  const land = (d, k) => `<path d="${d}" fill="#CFEFEA" stroke="#CFEFEA" stroke-width="34" stroke-linejoin="round" opacity=".9" filter="url(#lo-wob)"/><path d="${d}" fill="#E9C994" stroke="#C99E6A" stroke-width="3" stroke-linejoin="round" filter="url(#lo-wob)"/>`;
  const town = [[-110, -200], [-60, -215], [-5, -205], [50, -218], [105, -198], [-150, -255], [150, -250], [0, -265]].map(([x, y], i) => `<g transform="translate(${X(x).toFixed(1)} ${Y(y).toFixed(1)})"><path d="M-9 4 V-5 L0 -12 L9 -5 V4 Z" fill="${['#F3EEE4', '#FFF6E3', '#EAE3F2'][i % 3]}" stroke="#8E6A4E" stroke-width="1.6" stroke-linejoin="round"/><path d="M-10 -5 L0 -13 L10 -5" fill="none" stroke="${['#D9735F', '#6E8FC0', '#7FB07A'][i % 3]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>`).join('');
  const grass = `<path d="${blob([[-1500, -140], [-700, -110], [-420, -70], [-200, -80], [-170, -170], [170, -170], [200, -80], [440, -50], [760, -80], [1500, -150], [1500, -800], [-1500, -800]])}" fill="#B9DC95" opacity=".9" filter="url(#lo-wob)"/>`;
  const trees = [[-560, -170], [-520, -140], [-600, -220], [470, -150], [520, -190], [430, -210], [-330, -230], [330, -260]].map(([x, y]) => `<circle cx="${X(x).toFixed(1)}" cy="${Y(y).toFixed(1)}" r="9" fill="#8CC274" stroke="#6E9E5B" stroke-width="1.5"/>`).join('');
  const waves = (y0, y1, n, col) => Array.from({ length: n }, (_, i) => { const x = -680 + ((i * 397) % 1360), y = y0 + ((i * 173) % (y1 - y0)); return `<path d="M ${X(x).toFixed(1)} ${Y(y).toFixed(1)} q 9 -7 18 0 t 18 0" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round"/>`; }).join('');
  const badge = (x, y, i, n, col = '#FFF6E3', up) => `<g transform="translate(${X(x).toFixed(1)} ${Y(y).toFixed(1)})"><circle r="21" fill="${col}" stroke="#FFFFFF" stroke-width="3" filter="url(#lo-soft)"/><g transform="translate(-12 -12)" color="#5B4A3E">${ic(i, 24)}</g>${n ? `<text y="${up ? -32 : 40}" text-anchor="middle" class="lo-chart-l">${n}</text>` : ''}</g>`;
  const boat = (x, y, deg) => `<g transform="translate(${X(x).toFixed(1)} ${Y(y).toFixed(1)})"><circle r="24" fill="#E8553F" stroke="#FFFFFF" stroke-width="3.5" filter="url(#lo-soft)"/><g transform="rotate(${deg})"><path d="M0 -13 L8 9 L0 4 L-8 9 Z" fill="#FFF6E3" stroke="#FFF6E3" stroke-width="1.5" stroke-linejoin="round"/></g></g>`;
  const ping = `<g transform="translate(${X(330).toFixed(1)} ${Y(350).toFixed(1)})"><circle r="34" fill="#FF9B21" opacity=".18"/><circle r="34" fill="none" stroke="#FF9B21" stroke-width="3" stroke-dasharray="150 64" transform="rotate(-90)"/>${badge(0, my, 'whale', '', '#FFE3BE').replace(/translate\([^)]*\)/, 'translate(0 0)')}</g>`;
  const pin = `<g transform="translate(${X(150).toFixed(1)} ${Y(1060).toFixed(1)})"><path d="M0 0 C -15 -18 -15 -36 0 -36 C 15 -36 15 -18 0 0 Z" fill="#8E86D6" stroke="#FFFFFF" stroke-width="3" filter="url(#lo-soft)"/><circle cy="-24" r="5" fill="#FFFFFF"/></g>`;
  const buoys = Array.from({ length: 15 }, (_, i) => `<circle cx="${X(-700 + i * 100).toFixed(1)}" cy="${Y(500).toFixed(1)}" r="4" fill="#FFFFFF" stroke="#D27B5E" stroke-width="2"/>`).join('');
  return `<svg class="lo-bg" viewBox="0 0 1920 1080" aria-hidden="true"><defs>
  <filter id="lo-wob" x="-50%" y="-50%" width="200%" height="200%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="9"/></filter>
  <filter id="lo-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="9"/><feColorMatrix values="0 0 0 0 .35  0 0 0 0 .3  0 0 0 0 .25  0 0 0 .09 0"/></filter>
  <filter id="lo-wash" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".006" numOctaves="3" seed="2"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .22 -.05"/></filter>
  <filter id="lo-soft" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#2F5F86" flood-opacity=".28"/></filter>
  <linearGradient id="lo-seaG" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#6CC3C6"/><stop offset=".42" stop-color="#5FB4C4"/><stop offset=".5" stop-color="#5A9FC0"/><stop offset="1" stop-color="#4C86AE"/></linearGradient></defs>
  <rect width="1920" height="1080" fill="url(#lo-seaG)"/><rect width="1920" height="1080" filter="url(#lo-wash)"/>
  <path d="M 0 ${Y(575).toFixed(1)} ${Array.from({ length: 24 }, (_, i) => `q 40 -14 80 0`).join(' ')}" fill="none" stroke="#FFFFFF" stroke-width="3" opacity=".55" stroke-linecap="round"/>
  <path d="M 0 ${Y(640).toFixed(1)} ${Array.from({ length: 24 }, (_, i) => `q 40 -14 80 0`).join(' ')}" fill="none" stroke="#FFFFFF" stroke-width="2" opacity=".35" stroke-linecap="round"/>
  ${waves(700, 1300, 18, 'rgba(255,255,255,.45)')}${waves(60, 480, 10, 'rgba(255,255,255,.35)')}
  ${buoys}
  ${isles.map((d) => land(d)).join('')}${land(main)}${grass}${trees}${town}
  <text x="${X(-560).toFixed(1)}" y="${Y(300).toFixed(1)}" class="lo-chart-r">The Shallows</text>
  <text x="${X(-560).toFixed(1)}" y="${Y(880).toFixed(1)}" class="lo-chart-r">The Swells</text>
  <g transform="translate(${X(-560).toFixed(1)} ${(Y(880) + 22).toFixed(1)})" color="#FFFFFF"><g transform="scale(.8)">${ic('keel', 24)}</g><text x="26" y="15" class="lo-chart-w">Needs a keel</text></g>
  ${badge(-450, 80, 'harbour', 'Gull Point', '#FFF6E3', 1)}${badge(250, 300, 'wreck', 'Marigold wreck')}${badge(625, 180, 'rock', 'Turtle Rock')}${badge(0, -95, 'anchor', 'Harbour', '#FFF6E3')}
  ${ping}${boat(100, 235, 32)}${pin}
  <rect width="1920" height="1080" filter="url(#lo-grain)"/></svg>`;
}
function sky(time, w) { const icn = { sun: 'sun', dusk: 'dusk', cloud: 'cloud', rain: 'rain' }[w]; return `${time} ${ic(icn, 26)}`; }
function mapFull() {
  const top = `<div class="lo-map-back">${ic('back', 26)}</div><div class="lo-map-title">The Little Ocean</div>
  <div class="lo-map-sub">${ic('journal', 18)} Places 3 / 5 &nbsp; ${ic('fish', 18)} Fish 7 / 11</div>
  <div class="lo-map-clock">${sky('15:40', 'sun')}</div>
  <div class="lo-map-zoom"><span>+</span><i><b></b></i><span>−</span></div>`;
  return world(null, chart() + top + bar([['Click', 'Pin'], ['R', 'Clear pin'], ['F', 'Centre'], ['M', 'Close']], { cls: 'lo-focus' }), {});
}

/* --- Companion 512x320 */
function companion() {
  return `<div class="lo-stage lo-stage--512"><div class="lo-canvas lo-canvas--512"><img class="lo-bgimg" src="shots/ui_bg_day.webp" alt="" style="left:-250px;top:-210px;width:1024px;height:576px">
  <div class="lo-cbar">${ic('fish', 20)}<span class="lo-track lo-track--paper"><i style="width:${Math.round(150 * 23 / 32)}px"></i></span><b class="lo-num">23/32</b><span class="lo-cbtn on" title="Always on top">${ic('pennant', 18)}</span><span class="lo-cbtn" title="Mute">${ic('swell', 18)}</span><span class="lo-cbtn" title="Back to full view">${ic('sparkle', 18)}</span></div></div></div>`;
}

/* ------------------------------------------------------------------ page section */
const SPEC = (rows) => `<div class="lo-tw"><table class="lo-table"><tbody>${rows.map(([a, b]) => `<tr><td class="lo-q">${a}</td><td>${b}</td></tr>`).join('')}</tbody></table></div>`;
const screen = (id, idx, title, purpose, body) => `<article class="lo-screen" id="lo-s-${id}"><div class="lo-screen-head"><span class="lo-idx">${idx}</span><h3 class="lo-h3">${title}</h3></div><p class="lo-purpose">${purpose}</p>${body}</article>`;

function kit() {
  const sw = [[T.ink, 'Aubergine ink', 'Text on paper; Ink Glass base'], [T.cream, 'Paper cream', 'Panels; text on Ink Glass'], [T.cocoa, 'Cocoa', 'Frames, primary button, bar fill'],
    [T.wis, 'Wisteria', 'Focus ring, selection'], [T.amber, 'Beacon amber', 'Ping only'], [T.crimson, 'Collar crimson', 'Confirm button only']];
  const swatches = sw.map(([c, n, u]) => `<div class="lo-ksw"><i style="background:${c}"></i><div><b>${n}</b><code>${c}</code><small>${u}</small></div></div>`).join('');
  const type = [['Screen title', '28 / 600', 'Fishmonger, Shipyard'], ['Heading', '22 / 600', 'Section titles in panels'], ['Body', '20 / 600', 'Rows, names, buttons'], ['Small (floor)', '18 / 600', 'HUD, log, secondary lines'], ['Glyph', '13–15 / 800', 'Inside keycaps and pad discs only']];
  const surf = world(null, `<img class="lo-bgimg" src="shots/ui_bg_day.webp" alt="" style="left:0;top:-560px">` +
    at({ left: 60, top: 60 }, `<div class="lo-glass lo-kdemo">${ic('fish')}<span class="lo-track"><i style="width:80px"></i></span><b class="lo-num">23/32</b></div><small class="lo-klab">Ink Glass · HUD over the world</small>`) +
    at({ left: 60, top: 190 }, bar([['E', 'Talk', { hi: 1 }], ['C', 'Crew'], ['pad:A', 'Confirm'], ['pad:B', 'Back'], ['pad:X', 'Remove'], ['pad:Y', 'Paint']], { pos: { left: 0, top: 0 } }) + `<small class="lo-klab" style="top:52px">Action bar · keycaps and pad discs (letter inside, never colour alone)</small>`) +
    at({ left: 1060, top: 60 }, paper({ left: 0, top: 0, width: 560, height: 250 }, head('Paper', 'Screens and dialogs') + `<div class="lo-kbtns">${btn('Primary', 'pri')}${btn('Secondary', 'sec')}${btn('Confirm', 'conf')}${btn('Disabled', 'off')}</div>`)),
    { cls: 'lo-stage--strip', });
  return `<div class="lo-kit2"><div><h4 class="lo-h4">Colour tokens (game UI, never themed)</h4><div class="lo-kswg">${swatches}</div></div>
  <div><h4 class="lo-h4">Type scale at 1080p (XAG 101 PC floor 18 px)</h4><table class="lo-table"><thead><tr><th>Style</th><th>Size / weight</th><th>Use</th></tr></thead><tbody>${type.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table>
  <p class="lo-muted" style="font-size:13.5px">Mock fonts: Fredoka for titles, Nunito for everything else (doc 09 picks the shipping pair). Old draft: 40 / 32 / 28 (TV scale).</p></div></div>
  <h4 class="lo-h4" style="margin-top:18px">Two surfaces</h4>${surf}
  <h4 class="lo-h4" style="margin-top:18px">Icons (24 px grid, 2 px line, one weight)</h4><div class="lo-icons">${Object.keys(P).filter((k) => !['close', 'sparkle', 'gear'].includes(k)).map((k) => `<span>${ic(k, 28)}<small>${k}</small></span>`).join('')}</div>`;
}

function section() {
  const changed = `<details class="lo-fig lo-changes" open><summary class="lo-h4">What changed in this pass (owner UX feedback, 2026-11-26)</summary><ul>
<li><b>Desktop scale.</b> Body text 20 px, floor 18 px at 1080p (Xbox guideline 101 for PC), was 32 / 28 (a TV-distance value). Panels are 30–50% smaller. The always-visible HUD now covers 2.2% of the screen, down from 7.5%.</li>
<li><b>Only what helps right now.</b> The crew list is gone from the HUD. You see the crew on deck, in the activity log and in the crew panel (C). The region name shows only when you enter a region. Speed shows only while you change the throttle.</li>
<li><b>Action bar</b> of key prompts at the bottom left. Every prompt is also a mouse button, and it switches to pad glyphs on a gamepad. It changes with context (E Talk at a counter; screen prompts inside screens).</li>
<li><b>Activity log + chat</b> above the bar. There is no box when idle. Lines fade after 12 s. Hover or L opens it with tabs. Routine catches are not logged.</li>
<li><b>One place, one verb.</b> The Fishmonger sells, the Shipyard fits and paints, the Inn crew board hires. The "Second Hand" upgrade is gone.</li>
<li><b>Ship fitting (new doc 11).</b> Hulls have S/M/L slots, a keel mount and a load limit. The Skiff can't carry the crate, hold and bunk together. The Swell keel needs the Cutter.</li>
<li><b>Action bar</b>: Sail · Anchor · Map (M) · Inspect (hold F) · Menu (Tab). <b>Menu</b> has tabs Cargo · Ship · Crew · Journal · Map · System. <b>Map</b> is a full-screen painted chart.</li>
<li><b>Paint and Decor.</b> Colours and hull patterns, plus small objects (flag, roof decor, lamps, figurehead, name board) on the decor points of each hull frame: Skiff 5, Cutter 7. Looks only.</li></ul>
<p class="lo-muted">Lessons and checklists: <code>design/ux/ui-knowledge.md</code>. Spec: docs 10 and 11. Backgrounds are 1080p renders of the live preview scene, so the scale is true.</p></details>`;

  const s1 = screen('hud', 1, 'Sailing HUD (The Shallows)', 'Attention follows relevance (<code>/clean-ui</code>). At rest everything is Ambient: no plates and no outlines, so the text sits in the scene rather than on top of it, and Shells are hidden. Keycaps stay solid. An element gains its plate and grows only while it matters, then settles back by itself.',
    fig(world('ui_bg_day', hudSailing({ sub: 'The Shallows', lines: [{ who: 'Mabel', text: 'landed a Sand sprat', fade: 0.5 }, { who: 'Pip', text: 'landed a Harbour mackerel', tag: 'new' }] })),
      '<b>A. Resting state.</b> Cargo, compass and key prompts are Ambient (plain cream text, solid keycaps); Shells are hidden at sea; two log lines drift up and fade. The region name shows for 6 s on entry. Nothing on screen has a backing block.') +
    `<div class="lo-row2">${fig(world('ui_bg_dusk', hudSailing({ load: 32, cap: 32, heading: 210, bar: SAIL_PAD, pad: true, focus: ['cargo'], time: '18:40', weather: 'dusk',
      lines: [{ text: "Hold full. The crew's resting." }], speed: [6, 4], hint: 'Head home to sell' })), '<b>B. Hold full (decision moment).</b> Cargo is Focused for 6 s (plate, 1.2×), then returns to Ambient. Dusk + gamepad (Y = anchor).')}
    ${fig(world('ui_bg_day', hudSailing({ heading: 40, ping: true, sub: '<b>Whale pod</b> · NE · 240 m', subAmber: true, lines: [{ who: 'Ana', text: 'whales by the lighthouse!', chat: 1 }, { who: 'Kai', text: 'on my way', chat: 1 }], logOpen: true, tab: 'Chat', input: 'omw, see you there', speed: [0, 0, { anchored: true }] })),
      '<b>C. Enter pressed: chat opens.</b> The box, history and input appear only now (Focused). Esc or send returns to bare fading lines. The ping marker is the one amber thing on the compass.')}</div>` +
    `<div class="lo-row2">${fig(world('ui_bg_day', hudSailing({ peek: true, peekTag: true, sub: 'The Shallows', shells: 158, lines: [{ who: 'Pip', text: 'landed a Harbour mackerel', tag: 'new' }] })),
      '<b>D. Inspect (hold F / LB).</b> Everything Focused, including Shells, for as long as it is held. Hiding never withholds information.')}
    ${fig(world('ui_bg_day', hudSailing({ shellsPlus: 84, shells: 242, focus: [], lines: [{ text: 'Sold 20 fish for 84 Shells' }] })),
      '<b>E. Value change.</b> After a sale the Shells counter appears for a moment with "+84", then fades away again at sea.')}</div>` +
    SPEC([['States', 'Hidden · Ambient (no plate, no outline or shadow: cream glyphs at 92%, printed into the scene) · Focused (Ink Glass 70% plate, 1.2×, 150 ms ease) · Interruptive: none in normal play'],
      ['Cargo', 'Ambient top-left · Focused 6 s when the hold fills, and in the Fishmonger'], ['Shells', 'Hidden at sea · "+N" lift on change · Focused (plate, 1.2×) in Fishmonger, Shipyard, Inn · peek'],
      ['Compass', 'Ambient ticks + letters, no strip · ping marker amber · region pill 6 s on entry'], ['Prompts', 'Ambient strip, keycaps always solid cream · Focused inside screens (screen prompts) · Settings: Full / Context / Off'],
      ['Log + chat', 'Ambient lines fade 12 s, no box · hover/L = history (Focused) · Enter = chat box + input (Focused) · Esc closes'], ['Inspect', 'hold F / LB: all Focused while held'], ['Speed', 'Ambient, only while the throttle changes (+3 s) or anchored'], ['Time + weather', 'top-right, Ambient: in-game time + one icon (sun, dusk, cloud, rain) · Focused on Inspect · Hidden inside screens (Shells take the corner)']]));

  const s2 = screen('fish', 2, 'Fishmonger: sell', 'Selling only. One button sells the whole hold at fixed prices. Close with Esc. There is no ✕ button.',
    fig(fishmonger('rows'), '<b>A.</b> Docked, E pressed: the catch table and Sell all. The bar shows the screen\'s own prompts.') +
    `<div class="lo-row2">${fig(fishmonger('summary'), '<b>B.</b> After the sale: 1.5 s summary with count-up, then it closes itself (click skips).')}${fig(fishmonger('empty'), '<b>C.</b> Empty hold: a plain line, Sell all disabled.')}</div>` +
    SPEC([['Panel', 'Paper 600×440 centred · world dimmed 32%'], ['Rows', '40 px · fish icon 24 · 20/600 · numbers right-aligned tabular · "new" chip for first sale of a species'], ['Depth', 'E → Sell all = 2 presses; no confirm (05)']]));

  const s3 = screen('yard', 3, 'Shipyard: fit', 'A dedicated fitting screen. The boat is the interface: slots sit on the deck, the only meter is load, and every change is free to undo until Done. Buying gear happens here too, next to where it goes.',
    fig(yardFit('squeeze'), '<b>A.</b> Skiff with the Fish hold and Bunk fitted. Dragging the Fish crate back to the S slot is refused: 220 / 200 kg, with the reason in words. Keel and Deep hold show why they cannot fit before you buy them.') +
    fig(yardFit('cutter'), '<b>B.</b> Cutter bought: 5 slots and a keel mount. The Swell keel is fitted and the delta line shows only what changed. 440 / 650 kg leaves room for the Deep hold later.') +
    SPEC([['Layout', 'boat view left (orbit with RMB) · rail right 560×888 · tabs top-left · Shells top-right'], ['Fitting', 'drag item → slot, or click/A item then click/A slot · invalid slots dim + reason on hover · R removes to shed'],
      ['Load', 'one bar 520×10, cocoa on cream; overflow drawn hatched past the end + words'], ['Rail', 'Hull row (Skiff / Cutter) · one list = shed + for sale · each row: icon, name, size · kg · effect, state or price, reason line'],
      ['Commit', 'Done saves; Cancel reverts fits (purchases stay in the shed) · ≥100 Shells buys ask once (D8)']]));

  const s4 = screen('paint', 4, 'Shipyard: paint and decor', 'Same yard, same boat view. Paint picks colours and a hull pattern from a curated palette. Decor places small objects on the decor points of this hull frame. Some are bought with Shells, and the best ones are earned by discovering places. Neither changes how she sails.',
    fig(yardDecor(), '<b>A.</b> Decor tab on the Cutter: 7 decor points shown as rings, only in this tab. The roof point is selected, and the Potted fern previews in place. The rail lists only objects that fit a roof point.') +
    fig(yardPaint(), '<b>B.</b> Paint tab, Hull: hover previews on the boat; locked swatches show their price or the discovery that earns them. Pattern is its own part tab.') +
    SPEC([['Decor points', 'Skiff 5 (masthead, roof, rail ×2, small bow) · Cutter 7 (masthead, roof, rail ×3, figurehead, stern)'], ['Objects', '13 + name board · one per point · curated styles, no free placement · lamps light at dusk'],
      ['Rings', '44 px outline at each point; selected = solid + label; filled = small dot · visible in the Decor tab only'], ['Paint', 'Hull · Trim · Sail · Pattern (Plain, Waterline stripe, Waves, Scales) · 56 px swatches'],
      ['Rule', 'no stats, no weight, never real money (brief §11) · hull switch: matching points refill, the rest go to the decor chest']]));

  const s5 = screen('inn', 5, 'Inn crew board: hire', 'Hiring a person is its own moment, away from the gear. A berth on the boat is the only requirement, which links crew to fitting without a crew economy.',
    `<div class="lo-row2">${fig(crewBoard('ok'), '<b>A.</b> Bunk fitted, so berth #3 is free. Hire Tomo for 50 Shells (one-off, no wages).')}${fig(crewBoard('nobunk'), '<b>B.</b> No free berth: Hire disabled, with one line saying where to get a bunk. It is not repeated anywhere else.')}</div>` +
    SPEC([['Panel', 'Paper 640×420 · aboard row (dummy + name + slot) · free berths · candidates'], ['Rules', 'fee 50 · needs a berth · crew without a berth wait at the Inn, never lost (04, 11)']]));

  const s6 = screen('menu', 6, 'Menu (Tab): cargo, ship, crew, journal, map, system', 'One door for everything that is not a harbour job. Tabs switch with Q / E (LB / RB); C and J still jump straight to their tabs. Read-only at sea: the Ship tab shows her, the Shipyard changes her. The world keeps running behind it.',
    `<div class="lo-row2">${fig(menuFrame('cargo', tabCargo()), '<b>A.</b> Cargo: what is in the hold, by species. No prices at sea (the Fishmonger shows value).')}${fig(menuFrame('ship', tabShip()), '<b>B.</b> Ship: hull, fitted items, load, decor and name, read-only, with a pointer to the Shipyard.')}</div>` +
    `<div class="lo-row2">${fig(menuFrame('crew', tabCrew()), '<b>C.</b> Crew: name + slot number + state glyph and word; efficiency as words, never a number.')}${fig(menuFrame('journal', tabJournal()), '<b>D.</b> Journal: what you have seen; silhouettes for the rest; no percentages.')}</div>` +
    fig(menuFrame('system', tabSystem(), { bar: [['Q+E', 'Tab'], ['Enter', 'Select'], ['Tab', 'Close']] }), '<b>E.</b> System (Esc at sea opens here): resume, settings, companion window, controls, quit. Display settings include the action bar mode and HUD style (Ambient / Outlined / Always backed).') +
    SPEC([['Frame', 'Paper 1280×760 centred · tab row 56 px · world dimmed 42% · Shells Focused top-right'], ['Tabs', 'Cargo · Ship · Crew · Journal · Map · System · Q/E or LB/RB · C, J, M, Esc jump to a tab'], ['Never here', 'sell, fit, paint, decorate, hire (harbour places only)']]));

  const s7 = screen('map', 7, 'Map (M): the big chart', 'A full-screen painted chart, not a minimap: where am I, where is home, where have I not been. It shows only what you have seen, with no question marks and no completion percentage.',
    fig(mapFull(), '<b>A.</b> Whole-sea view: your boat (coral arrow) heading north-east past the Marigold wreck, an active whale ping (amber ring thinning as it expires), the swell-buoy line and the hatched transition band. The Swells are named with "Needs a keel". One pin, which also shows on the compass. R2 places stay off the chart until seen.') +
    SPEC([['Shows', 'boat + heading · harbour · region names · seen places (28 px icons, name on hover) · active ping · one pin'], ['Never', 'undiscovered places, fish spots, completion %, other players (solo)'],
      ['Input', 'drag / RS pan · wheel / triggers zoom (whole sea, region) · F / RS click centre · Click / A pin · R clear · M / Esc close'], ['Scale', '1600 m → 900 px at whole-sea (0.56 px/m); region zoom 1.5× · positions from doc 03']]));

  const s8 = screen('swell', 8, 'Swell gate (no keel yet)', 'Show "not yet", never "game over". One hint, one log line, and the reason points at the Shipyard.',
    fig(world('ui_bg_day', hudSailing({ heading: 2, weather: 'cloud', time: '11:20', lines: [{ who: 'Mabel', text: "says the swell's too big for the Skiff" }], hint: "The swell's too big for the Skiff. A keel would help.", speed: [2, 2] }), { imgStyle: 'filter:saturate(.9) brightness(.96)' }),
      '<b>A.</b> Pushed back at the R2 edge: one hint per sail-out and one log line (the bark as a caption). The compass still shows the way home.'));

  const s9 = screen('compact', 9, 'Companion window (512×320, actual size)', 'The desk-corner view. The control bar shrank from 64 to 40 DIP, so the sea gets 280 of the 320 px.',
    `<div class="lo-comp">${fig(companion(), '<b>A.</b> Hold, pin (always on top), mute, back to full view. No Shells, no chat, no prompts (08).')}<div class="lo-spec2">${SPEC([['Size', '512×320 DIP (08 owns) · bar 40 tall'], ['Bar', 'fish 20 · bar 150×8 · count 18/700 · 3 buttons 32×32 (WCAG 2.2 ≥24)'], ['Surface', 'Paper strip, 2 px top rule, no frame']])}</div></div>`);

  const s10 = screen('ftue', 10, 'First 10 minutes', 'The action bar already shows every key, so hints only explain why: "Sail out to find fish", not "press W".',
    SPEC([['0:00 docked', 'hint "Sail out to find fish" · bar shows WASD Sail'], ['1:30 enter R1', 'region name 6 s · hint "Your crew fishes on their own. Enjoy the view."'], ['~1:42 first fish', 'cargo +1 · log "Mabel landed a Sand sprat · new"'],
      ['~5:56 hold full', 'cargo "Full" · log line · hint "Head home to sell" · harbour marker pulses once'], ['~6:41 docked', 'bar inserts E Talk (highlighted) at the Fishmonger'], ['~6:56 first sale', 'Shells +84 · hint "The shipyard can fit a bigger hold" (once)'],
      ['~7–10 Shipyard', 'Fish hold auto-proposed into the M slot · Swell keel reads "Needs a keel mount (Cutter) · opens The Swells"']]));

  return `<section id="ui-screens" class="lo-sec" aria-labelledby="lo-ui-title">
<!-- GENERATED by design/preview/tools/gen-ui.js — edit the generator, not this block. -->
<style>${STYLE}</style>
<div class="lo-intro"><h2 class="lo-h2" id="lo-ui-title">UI screens and HUD</h2>
<p class="lo-purpose">Implementation mocks for the Little Ocean UMG pass. Every frame is authored at 1920×1080 and scaled to fit, so every px in the specs is a 1080p px. Open a frame at full size to judge the scale as a player would.</p>${changed}</div>
${DEFS}
${screen('kit', 0, 'UI kit', 'Tokens, type, the two surfaces, input glyphs and icons every screen is built from.', kit())}
${s1}${s2}${s3}${s4}${s5}${s6}${s7}${s8}${s9}${s10}
<script>(function(){if(window.__loScale)return;window.__loScale=1;try{if(window.CSS&&CSS.supports('transform','scale(tan(atan2(1px, 2px)))'))return}catch(e){}function f(){var cs=document.querySelectorAll('.lo-canvas');for(var i=0;i<cs.length;i++){var c=cs[i],p=c.parentElement;if(p&&c.offsetWidth)c.style.transform='scale('+(p.clientWidth/c.offsetWidth)+')'}}if(window.ResizeObserver){var ro=new ResizeObserver(f);document.querySelectorAll('.lo-stage,.lo-hud').forEach(function(s){ro.observe(s)})}addEventListener('resize',f);f()})();</script>
</section>`;
}

/* ------------------------------------------------------------------ styles */
const STYLE = `
#ui-screens{--fg:var(--text);display:block;max-width:100%;min-width:0;overflow-x:clip;color:var(--fg,#33273B);font-family:"Nunito",system-ui,sans-serif;font-size:15px;line-height:1.5}
.lo-sec *,.lo-hud *{box-sizing:border-box}
.lo-intro{max-width:80ch}
.lo-h2{font-family:"Fredoka","Nunito",system-ui,sans-serif;font-weight:600;font-size:clamp(26px,4vw,40px);line-height:1.1;margin:0 0 8px;color:var(--fg)}
.lo-h3{font-family:"Fredoka","Nunito",system-ui,sans-serif;font-weight:600;font-size:clamp(20px,2.6vw,28px);line-height:1.2;margin:0;color:var(--fg)}
.lo-h4{font-family:"Fredoka","Nunito",system-ui,sans-serif;font-weight:600;font-size:16px;margin:0 0 6px;color:var(--fg)}
.lo-muted,.lo-purpose,.lo-cap{color:var(--muted,#6B5F72)}
.lo-purpose{margin:4px 0 14px;max-width:80ch}
.lo-changes{margin:14px 0 0;padding:12px 16px;border:1px solid var(--rule,#DCCBA9);border-radius:12px;background:var(--panel-2,#F8EBD0)}
.lo-changes summary{cursor:pointer;display:list-item}.lo-changes ul{margin:8px 0 6px;padding-left:20px}.lo-changes li{margin:4px 0}
.lo-screen{margin:56px 0 0;min-width:0}
.lo-screen-head{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap}
.lo-idx{font-family:"Fredoka",system-ui,sans-serif;font-weight:600;font-size:14px;padding:2px 10px;border-radius:999px;border:1.5px solid currentColor;color:var(--muted)}
.lo-fig{margin:0 0 14px;min-width:0}.lo-cap{font-size:13.5px;margin:6px 2px 0}.lo-cap b{color:var(--fg)}
.lo-row2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:16px}
.lo-tw{overflow-x:auto;margin:6px 0 0}.lo-table{border-collapse:collapse;width:100%;font-size:14px}.lo-table td,.lo-table th{padding:6px 10px;border-bottom:1px solid var(--rule,#DCCBA9);text-align:left;vertical-align:top}
.lo-table th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}.lo-q{white-space:nowrap;font-weight:700;width:1%}
.lo-kit2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:20px}
.lo-kswg{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}.lo-ksw{display:flex;gap:10px;align-items:flex-start;font-size:13px}.lo-ksw i{flex:none;width:36px;height:36px;border-radius:8px;border:1px solid rgba(0,0,0,.2)}
.lo-ksw b{display:block}.lo-ksw code{font-size:12px}.lo-ksw small{display:block;color:var(--muted)}
.lo-icons{display:flex;flex-wrap:wrap;gap:6px}.lo-icons span{display:flex;flex-direction:column;align-items:center;gap:2px;width:74px;padding:8px 2px;border-radius:10px;background:#FFF6E3;color:#33273B;font-size:11px}
.lo-comp{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start}.lo-comp>.lo-fig{flex:0 1 512px;width:512px;max-width:100%}.lo-spec2{flex:1 1 280px}
/* stage + canvas (fixed game palette, never themed) */
.lo-stage{position:relative;width:100%;aspect-ratio:16/9;container-type:inline-size;overflow:hidden;border-radius:12px;background:#4FB3BF;isolation:isolate}
.lo-stage--strip{aspect-ratio:1920/360}.lo-stage--512{width:min(512px,100%);aspect-ratio:512/320;border-radius:8px}
.lo-canvas{position:absolute;left:0;top:0;width:1920px;height:1080px;transform-origin:0 0;transform:scale(tan(atan2(100cqw,1920px)));font-family:"Nunito",system-ui,sans-serif;font-weight:600;font-size:20px;line-height:1.25;color:#33273B;text-align:left;-webkit-font-smoothing:antialiased}
.lo-canvas--512{width:512px;height:320px;transform:scale(tan(atan2(100cqw,512px)))}
.lo-canvas svg{max-width:none;flex:none}
.lo-bgimg{position:absolute;left:0;top:0;width:1920px;height:1080px;max-width:none;object-fit:cover}
.lo-dim-world{position:absolute;inset:0;background:#1E1726}
.lo-abs{position:absolute}
.lo-hud{container-type:inline-size;overflow:hidden;pointer-events:none;z-index:2}
.lo-i{display:block}
.lo-num{font-variant-numeric:tabular-nums}
/* Ink Glass HUD */
.lo-glass{position:absolute;background:rgba(51,39,59,.70);color:#FFF6E3;border-radius:10px}
.lo-cargo{height:40px;display:flex;align-items:center;gap:10px;padding:0 14px 0 12px;font-size:18px;font-weight:700}
.lo-track{position:relative;display:block;width:120px;height:8px;border-radius:4px;background:rgba(255,246,227,.22);overflow:hidden}
.lo-track>i{position:absolute;left:0;top:0;bottom:0;background:#FFF6E3;border-radius:4px}
.lo-track--full>i{width:100%!important;background:repeating-linear-gradient(-45deg,#FFF6E3 0 6px,#CBBFA8 6px 10px)}
.lo-track--paper{background:#E9DCC0}.lo-track--paper>i{background:#6B4A35}
.lo-plus{position:absolute;left:100%;margin-left:8px;top:6px;font-size:18px;font-weight:800;color:#FFF6E3;text-shadow:0 1px 3px rgba(0,0,0,.5)}
.lo-plus--s{top:6px}
.lo-shells{height:40px;display:flex;align-items:center;gap:8px;padding:0 16px 0 12px;font-size:20px;font-weight:700}
.lo-shells .lo-plus{left:auto;right:100%;margin:0 8px 0 0}
.lo-cmp{position:absolute;left:750px;top:32px;width:420px}
.lo-cmp-strip{position:relative;width:420px;height:28px;border-radius:14px;overflow:hidden}
.lo-cmp-l{position:absolute;top:2px;transform:translateX(-50%);font-size:15px;font-weight:800;line-height:24px}
.lo-cmp-t{position:absolute;bottom:0;width:2px;height:6px;border-radius:1px;background:rgba(255,246,227,.55);transform:translateX(-50%)}.lo-cmp-t--m{height:10px}
.lo-cmp-m{position:absolute;top:5px;transform:translateX(-50%);color:#FFF6E3;display:flex;align-items:center}.lo-cmp-m em{font-style:normal;font-size:16px;margin-left:2px}
.lo-cmp-m--amber{color:#FFB04D}
.lo-cmp-caret{position:absolute;left:210px;top:30px;transform:translateX(-50%);border:5px solid transparent;border-top:6px solid #FFF6E3;filter:drop-shadow(0 1px 1px rgba(0,0,0,.4))}
.lo-cmp-sub{position:absolute;left:50%;top:44px;transform:translateX(-50%);white-space:nowrap;padding:3px 14px;border-radius:14px;background:rgba(51,39,59,.70);color:#FFF6E3;font-size:18px;font-weight:700}
.lo-cmp-sub--amber b{color:#FFB04D}
.lo-bar{position:absolute;display:flex;align-items:center;gap:6px;height:40px;padding:0 8px;border-radius:10px;background:rgba(51,39,59,.70);color:#FFF6E3;font-size:18px;font-weight:700;white-space:nowrap}
.lo-act{display:inline-flex;align-items:center;gap:8px;height:32px;padding:0 8px;border-radius:7px}
.lo-act--hi{background:#FFF6E3;color:#33273B}.lo-act--hi .lo-key{background:#33273B;color:#FFF6E3;box-shadow:none}
.lo-act--hover{background:rgba(255,246,227,.16)}
.lo-key{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;padding:0 6px;border-radius:5px;background:#FFF6E3;color:#33273B;font-size:13px;font-weight:800;box-shadow:inset 0 -2px 0 #CDBE9F;letter-spacing:.02em}
.lo-key+.lo-key{margin-left:-4px}
.lo-key--w{padding:0 8px}
.lo-pad{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;border:2px solid var(--c);color:var(--c);background:rgba(0,0,0,.18);font-size:14px;font-weight:800;font-family:"Fredoka","Nunito",sans-serif}
.lo-pad--n{width:auto;min-width:26px;padding:0 6px;border-radius:13px;border-color:#CFC5D6;color:#FFF6E3;font-size:12px}
.lo-log{position:absolute;width:440px;display:flex;flex-direction:column;align-items:flex-start;gap:4px;font-size:18px;font-weight:600;line-height:24px}
.lo-log .lo-line{max-width:440px;padding:3px 10px;border-radius:8px;background:rgba(51,39,59,.70);color:#FFF6E3}
.lo-line b{font-weight:800}.lo-tag{display:inline-block;padding:0 7px;margin-left:2px;border-radius:9px;background:#FFF6E3;color:#33273B;font-size:14px;font-weight:800;line-height:18px;vertical-align:1px}
.lo-line--chat b{color:#C9C4F2}
.lo-log--open{display:block;padding:6px 6px 8px}
.lo-log--open .lo-line{background:none;padding:1px 8px}
.lo-log-tabs{display:flex;gap:4px;padding:0 2px 6px;margin-bottom:4px;border-bottom:1px solid rgba(255,246,227,.18);font-size:16px;font-weight:700}
.lo-log-tabs span{padding:2px 10px;border-radius:7px;color:rgba(255,246,227,.75)}.lo-log-tabs span.on{background:rgba(255,246,227,.16);color:#FFF6E3}
.lo-log-in{display:flex;justify-content:space-between;gap:10px;margin:6px 2px 0;padding:6px 10px;border-radius:7px;background:rgba(255,246,227,.12);font-size:18px}
.lo-caret::after{content:"";display:inline-block;width:2px;height:18px;margin-left:2px;vertical-align:-3px;background:#FFF6E3}
.lo-dim{color:rgba(255,246,227,.72);font-size:15px}
.lo-speed{height:40px;display:flex;align-items:center;gap:10px;padding:0 14px;font-size:18px;font-weight:700}
.lo-notch{display:flex;gap:3px;align-items:flex-end}.lo-notch i{width:6px;height:14px;border-radius:2px;background:rgba(255,246,227,.25)}.lo-notch i.on{background:#FFF6E3}
.lo-hint{left:50%;bottom:112px;transform:translateX(-50%);padding:8px 20px;border-radius:20px;font-size:20px;font-weight:700;white-space:nowrap}
/* Attention states (clean-ui): Ambient = no plate, outlined glyphs; Focused = plate + 1.2x */
.lo-amb{position:absolute;inset:0}
.lo-amb .lo-glass:not(.lo-focus):not(.lo-log--open):not(.lo-hint),.lo-amb .lo-bar:not(.lo-focus),.lo-amb .lo-cmp:not(.lo-focus) .lo-cmp-strip,.lo-amb .lo-cmp:not(.lo-focus) .lo-cmp-sub,.lo-amb .lo-log:not(.lo-log--open) .lo-line{background:none}
.lo-amb .lo-glass:not(.lo-focus):not(.lo-log--open):not(.lo-hint),.lo-amb .lo-bar:not(.lo-focus),.lo-amb .lo-cmp:not(.lo-focus),.lo-amb .lo-log:not(.lo-log--open){text-shadow:none;opacity:.92}
.lo-amb .lo-glass:not(.lo-focus):not(.lo-log--open):not(.lo-hint) svg,.lo-amb .lo-bar:not(.lo-focus) svg,.lo-amb .lo-cmp:not(.lo-focus) svg{filter:none}
.lo-amb .lo-cmp:not(.lo-focus) .lo-cmp-t,.lo-amb .lo-glass:not(.lo-focus) .lo-track{box-shadow:none}
.lo-amb .lo-glass:not(.lo-focus) .lo-track{background:rgba(255,246,227,.32)}
.lo-amb .lo-cmp:not(.lo-focus) .lo-cmp-strip{border-radius:0;overflow:visible}
.lo-amb .lo-bar:not(.lo-focus) .lo-key{text-shadow:none}
.lo-amb .lo-bar:not(.lo-focus) .lo-pad{background:rgba(28,20,36,.25)}
.lo-amb .lo-bar:not(.lo-focus) .lo-pad--n{border-color:#FFF6E3}
.lo-focus{transform:scale(1.2)}
.lo-amb .lo-cmp.lo-focus .lo-cmp-strip{background:rgba(51,39,59,.70);text-shadow:none;opacity:1}
.lo-cargo.lo-focus{transform-origin:0 0}.lo-shells.lo-focus{transform-origin:100% 0}.lo-clock.lo-focus{transform-origin:100% 0}
.lo-clock{right:32px;top:32px;height:40px;display:flex;align-items:center;gap:8px;padding:0 12px 0 14px;font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}.lo-bar.lo-focus{transform-origin:0 100%}.lo-cmp.lo-focus{transform:none}
.lo-peektag{position:absolute;left:50%;bottom:112px;transform:translateX(-50%);display:flex;gap:8px;align-items:center;color:#FFF6E3;font-size:18px;font-weight:700}
/* Paper */
.lo-paper{position:absolute;background:#FFF6E3;border:2px solid #6B4A35;border-radius:14px;box-shadow:0 4px 16px rgba(51,39,59,.25);color:#33273B;overflow:hidden}
.lo-ph{display:flex;align-items:baseline;gap:14px;padding:18px 24px 12px;border-bottom:1px solid #E4D5B7}
.lo-ph h5{margin:0;font-family:"Fredoka","Nunito",sans-serif;font-weight:600;font-size:28px;line-height:1.1}
.lo-ph q{font-style:italic;font-weight:600;font-size:18px;color:#6A5D70}.lo-ph q::before,.lo-ph q::after{content:""}
.lo-ph-r{margin-left:auto;font-size:18px;color:#6A5D70}
.lo-rows{width:100%;border-collapse:collapse;font-size:20px}.lo-rows th{font-size:16px;font-weight:700;color:#6A5D70;text-align:left;padding:10px 6px 4px}
.lo-rows td{height:40px;padding:0 6px;border-bottom:1px solid #EFE3C9}.lo-rows .r{text-align:right}.lo-rows .ic{width:44px;padding-left:24px;color:#6B4A35}.lo-rows tr>*:last-child{padding-right:24px}
.lo-chip{display:inline-block;padding:0 8px;border-radius:9px;background:#E9E6F7;color:#4A4680;font-size:14px;font-weight:800;line-height:20px;vertical-align:2px}
.lo-dim2{color:#6A5D70}
.lo-pf{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;gap:20px;padding:16px 24px;border-top:1px solid #E4D5B7;background:#FBF0DA}
.lo-total{margin-left:auto;display:inline-flex;align-items:center;gap:6px;font-size:20px}.lo-total b{font-size:24px}
.lo-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:40px;padding:0 20px;border-radius:10px;font-size:18px;font-weight:800;white-space:nowrap}
.lo-btn--pri{background:#6B4A35;color:#FFF6E3}.lo-btn--sec{border:1.5px solid #6B4A35;color:#6B4A35}.lo-btn--conf{background:#D02A45;color:#FFF6E3}.lo-btn--off{background:#E9DDC4;color:#8A7D86}
.lo-btn--sm{height:32px;padding:0 12px;font-size:16px;background:#6B4A35;color:#FFF6E3}
.lo-kbtns{display:flex;gap:12px;padding:24px}
.lo-sum{display:flex;flex-direction:column;align-items:center;justify-content:center;height:220px;gap:6px}.lo-sum-n{display:flex;align-items:center;gap:10px;color:#6B4A35}.lo-sum-n b{font-size:48px;font-family:"Fredoka",sans-serif;font-weight:600;color:#33273B}.lo-sum-n span{font-size:22px;color:#33273B}.lo-sum p{margin:0;color:#6A5D70;font-size:18px}
.lo-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:280px;color:#9C8F86}.lo-empty p{margin:8px 0 0;color:#6A5D70;font-size:20px}
/* Shipyard */
.lo-yard-top{position:absolute;left:32px;top:28px;display:flex;align-items:center;gap:20px}
.lo-yard-top h4{margin:0;padding:4px 16px;border-radius:10px;background:rgba(51,39,59,.70);color:#FFF6E3;font-family:"Fredoka",sans-serif;font-weight:600;font-size:28px}
.lo-tabs{display:flex;gap:4px;padding:4px;border-radius:12px;background:rgba(51,39,59,.70)}
.lo-tabs span{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 16px;border-radius:9px;color:#FFF6E3;font-size:18px;font-weight:700}.lo-tabs span.on{background:#FFF6E3;color:#33273B}
.lo-slot{border:2.5px dashed rgba(255,246,227,.95);border-radius:12px;background:rgba(255,246,227,.10)}
.lo-slot--full{border-style:solid;border-color:#FFF6E3;background:rgba(255,246,227,.06)}
.lo-slot--bad{border-color:#FFB04D;background:rgba(255,155,33,.16)}
.lo-slot--keel{border-style:solid;border-radius:0 0 40px 40px}
.lo-slot-tag{position:absolute;left:50%;bottom:100%;margin-bottom:6px;transform:translateX(-50%);white-space:nowrap;padding:2px 10px;border-radius:8px;background:rgba(51,39,59,.80);color:#FFF6E3;font-size:16px;font-weight:700}
.lo-slot--keel .lo-slot-tag{bottom:auto;top:100%;margin:6px 0 0}
.lo-ghost{display:flex;align-items:center;justify-content:center;border-radius:10px;background:#FFF6E3;color:#6B4A35;box-shadow:0 8px 18px rgba(0,0,0,.3);transform:rotate(-6deg)}
.lo-yard-info{position:absolute;left:32px;top:110px;width:560px;padding:14px 18px;border-radius:12px;background:rgba(51,39,59,.70);color:#FFF6E3}
.lo-load-h{display:flex;align-items:center;gap:8px;font-size:18px;font-weight:700}.lo-load-h .lo-num{margin-left:auto;font-size:20px}
.lo-load-t{position:relative;width:520px;height:10px;margin-top:10px;border-radius:5px;background:rgba(255,246,227,.22)}
.lo-load-t i{position:absolute;left:0;top:0;bottom:0;border-radius:5px;background:#FFF6E3}
.lo-load-t s{position:absolute;top:-3px;height:16px;border-radius:0 6px 6px 0;background:repeating-linear-gradient(-45deg,#FFB04D 0 5px,transparent 5px 9px);border:2px solid #FFB04D;border-left:0}
.lo-delta,.lo-reason{display:flex;align-items:flex-start;gap:8px;margin:12px 0 0;font-size:18px;font-weight:700}.lo-reason{color:#FFD49A}
.lo-rail{display:flex;flex-direction:column;height:100%;padding:16px 20px}
.lo-rail h6{margin:10px 0 8px;font-size:16px;font-weight:800;color:#6A5D70;text-transform:uppercase;letter-spacing:.05em}
.lo-hull,.lo-item{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;color:#33273B}
.lo-hull{border:1.5px solid #E4D5B7;margin-bottom:6px}.lo-hull.on{border-color:#6B4A35;background:#F8EBD0}
.lo-hull b,.lo-item b{display:block;font-size:20px}.lo-hull small,.lo-item small{display:block;font-size:16px;color:#6A5D70;font-weight:600}
.lo-hull em,.lo-st{margin-left:auto;font-style:normal;font-size:16px;font-weight:700;color:#6A5D70;white-space:nowrap;display:inline-flex;align-items:center;gap:4px}
.lo-item{border-bottom:1px solid #EFE3C9;border-radius:0}.lo-item>.lo-btn{margin-left:auto}
.lo-item.sel{outline:2px solid #6E6AA8;outline-offset:-2px;border-radius:10px;background:#F1EFFB}
.lo-item .lo-why,.lo-cand .lo-why{display:flex;align-items:center;gap:4px;color:#8A4B12;font-weight:700}
.lo-item>svg,.lo-hull>svg{color:#6B4A35}
.lo-rail-f{margin-top:auto;display:flex;justify-content:flex-end;gap:12px;padding-top:12px;border-top:1px solid #E4D5B7}
.lo-parts{display:flex;gap:4px;flex-wrap:wrap;padding-bottom:8px;border-bottom:1px solid #E4D5B7}.lo-parts span{padding:6px 12px;border-radius:8px;font-size:18px;font-weight:700;color:#6A5D70}.lo-parts span.on{background:#33273B;color:#FFF6E3}
.lo-swg{display:grid;grid-template-columns:repeat(4,1fr);gap:12px 10px}
.lo-sw{display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px;border-radius:10px;text-align:center}
.lo-sw i{width:56px;height:56px;border-radius:12px;border:2px solid rgba(51,39,59,.25)}
.lo-sw small{font-size:15px;font-weight:700;line-height:1.1}.lo-sw em{font-style:normal;font-size:13px;font-weight:700;color:#6A5D70;display:inline-flex;gap:3px;align-items:center;line-height:1.1}
.lo-sw.on{background:#F1EFFB;outline:2px solid #6E6AA8}.lo-sw.lock i{opacity:.75}
.lo-note{margin:14px 0 0;font-size:16px;color:#6A5D70}
/* Menu + map */
.lo-mtabs{display:flex;align-items:center;gap:4px;height:56px;padding:0 16px;border-bottom:1px solid #E4D5B7;background:#FBF0DA}
.lo-mtabs span{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 16px;border-radius:9px;font-size:18px;font-weight:700;color:#6A5D70}
.lo-mtabs span.on{background:#33273B;color:#FFF6E3}.lo-mtabs span.lo-mt-hint{margin-left:auto;gap:4px;padding:0}
.lo-mbody{padding:20px 28px;height:580px;overflow:hidden}
.lo-mcols{display:grid;grid-template-columns:1fr 420px;gap:40px}.lo-mcols--sys{grid-template-columns:320px 1fr}
.lo-mh{margin:0 0 10px;font-size:16px;font-weight:800;color:#6A5D70;text-transform:uppercase;letter-spacing:.05em}
.lo-mside{padding:20px 24px;border-radius:12px;background:#F8EBD0;align-self:start}
.lo-big{font-family:"Fredoka",sans-serif;font-weight:600;font-size:48px;line-height:1.1;color:#33273B}.lo-big small{font-size:24px;color:#6A5D70}
.lo-track--wide{width:360px;height:10px;margin:10px 0 4px}
.lo-jg--4{grid-template-columns:repeat(4,1fr);padding:0}
.lo-mbody .lo-crow{padding:12px 4px}
.lo-mbody .lo-menu{padding:0}
.lo-chart-l{font:800 17px "Nunito",sans-serif;fill:#5B4A3E;paint-order:stroke;stroke:#FFF6E3;stroke-width:4px;stroke-linejoin:round}
.lo-chart-w{font:800 17px "Nunito",sans-serif;fill:#FFFFFF;opacity:.9}
.lo-chart-r{font:600 34px "Fredoka","Nunito",sans-serif;fill:#FFFFFF;opacity:.85;letter-spacing:.06em}
.lo-map-back{position:absolute;left:40px;top:36px;width:56px;height:44px;border-radius:22px;background:rgba(255,246,227,.85);color:#5B4A3E;display:flex;align-items:center;justify-content:center}
.lo-map-title{position:absolute;left:112px;top:34px;font-family:"Fredoka",sans-serif;font-weight:600;font-size:30px;color:#FFFFFF}
.lo-map-sub{position:absolute;left:112px;top:78px;display:flex;align-items:center;gap:6px;color:#FFFFFF;font-size:17px;font-weight:700;opacity:.92;padding-top:4px;border-top:2px dashed rgba(255,255,255,.6)}
.lo-map-clock{position:absolute;right:44px;top:36px;display:flex;align-items:center;gap:10px;color:#FFFFFF;font-family:"Fredoka",sans-serif;font-weight:600;font-size:30px}.lo-map-clock svg{color:#FFD45A}
.lo-map-zoom{position:absolute;left:52px;top:330px;display:flex;flex-direction:column;align-items:center;gap:8px;color:#FFFFFF;font-size:26px;font-weight:700}
.lo-map-zoom i{position:relative;width:12px;height:240px;border-radius:6px;background:rgba(255,246,227,.55)}.lo-map-zoom b{position:absolute;left:50%;top:60%;width:30px;height:30px;margin:-15px;border-radius:50%;background:#FFFFFF;box-shadow:0 2px 4px rgba(47,95,134,.35)}
/* Decor points */
.lo-dp{border-radius:50%;border:2.5px solid rgba(255,246,227,.9);background:rgba(51,39,59,.18);box-shadow:0 0 0 1px rgba(51,39,59,.35)}
.lo-dp--full::after{content:"";position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px;border-radius:50%;background:#FFF6E3}
.lo-dp--sel{border-color:#FFF6E3;background:rgba(255,246,227,.35);box-shadow:0 0 0 3px #6E6AA8}
.lo-dp-tag{position:absolute;left:50%;bottom:100%;margin-bottom:72px;transform:translateX(-50%);white-space:nowrap;padding:2px 10px;border-radius:8px;background:rgba(51,39,59,.85);color:#FFF6E3;font-size:16px;font-weight:700}
.lo-dp-ghost{display:flex;align-items:center;justify-content:center;color:#2F6B3A;filter:drop-shadow(0 0 2px #FFF6E3) drop-shadow(0 0 2px #FFF6E3);opacity:.92}
/* Crew board */
.lo-cbrow{display:flex;gap:12px;padding:16px 24px}
.lo-cb{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;width:120px;height:110px;padding:8px;border-radius:12px;background:#F8EBD0}
.lo-cb b{font-size:18px}.lo-cb small{font-size:15px;color:#6A5D70}
.lo-cb--empty{background:none;border:2px dashed #CDB993}.lo-berth{color:#6B4A35;margin-bottom:8px}
.lo-h6p{margin:0;padding:4px 24px;font-size:16px;font-weight:800;color:#6A5D70;text-transform:uppercase;letter-spacing:.05em}
.lo-cand{display:flex;align-items:center;gap:16px;margin:6px 24px;padding:12px 16px;border-radius:12px;border:1.5px solid #E4D5B7}
.lo-cand b{display:block;font-size:22px}.lo-cand q{display:block;font-style:italic;font-size:18px;color:#33273B}.lo-cand q::before,.lo-cand q::after{content:""}.lo-cand small{display:block;font-size:16px;color:#6A5D70}
.lo-cand-r{margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:6px;max-width:200px;text-align:right}.lo-cand-r .lo-why{font-size:15px;line-height:1.2}
/* Crew panel / journal */
.lo-crow{display:flex;align-items:center;gap:14px;padding:10px 24px;border-bottom:1px solid #EFE3C9}
.lo-crow-n b{display:block;font-size:20px}.lo-crow-n small{display:block;font-size:16px;color:#6A5D70}
.lo-crow-s{margin-left:auto;display:grid;grid-template-columns:auto auto;column-gap:8px;align-items:center;justify-items:start;font-size:18px;color:#33273B}.lo-crow-s small{grid-column:2;font-size:16px;color:#6A5D70}.lo-crow-s svg{color:#6B4A35}
.lo-ptabs{margin-left:auto;display:flex;gap:4px}.lo-ptabs span{padding:4px 12px;border-radius:8px;font-size:17px;font-weight:700;color:#6A5D70}.lo-ptabs span.on{background:#33273B;color:#FFF6E3}
.lo-ptabs--set{margin:0;padding:16px 20px 10px;border-bottom:1px solid #E4D5B7}
.lo-jg{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:18px 24px}
.lo-jc{display:flex;flex-direction:column;align-items:center;gap:2px;padding:14px 8px;border-radius:12px;background:#F8EBD0;color:#6B4A35}
.lo-jc b{font-size:18px;color:#33273B}.lo-jc small{font-size:15px;color:#6A5D70}
.lo-jc--sil{background:#EFE6D3}.lo-jc--sil span{color:#BFAF92}.lo-jc--sil b{color:#8A7D86}
/* Menu + settings */
.lo-menu{display:flex;flex-direction:column;padding:20px 16px}.lo-menu h5{margin:0 8px 12px;font-family:"Fredoka",sans-serif;font-weight:600;font-size:28px}
.lo-menu span{display:flex;align-items:center;justify-content:space-between;height:48px;padding:0 14px;border-radius:10px;font-size:20px;font-weight:700}.lo-menu span.on{background:#33273B;color:#FFF6E3}
.lo-menu kbd{font:800 13px "Nunito",sans-serif;padding:2px 6px;border-radius:5px;background:#F3E6C8;color:#33273B}
.lo-menu small{margin:auto 8px 0;padding-top:24px;font-size:16px;color:#6A5D70}
.lo-set{display:flex;align-items:center;gap:16px;height:60px;padding:0 24px;border-bottom:1px solid #EFE3C9;font-size:20px}.lo-set>span:first-child{flex:1}
.lo-set em{width:56px;font-style:normal;font-weight:800;text-align:right;font-size:18px}
.lo-seg2{display:inline-flex;padding:3px;border-radius:10px;background:#F3E6C8}.lo-seg2 i{font-style:normal;padding:5px 14px;border-radius:8px;font-size:17px;font-weight:700;color:#6A5D70}.lo-seg2 i.on{background:#6B4A35;color:#FFF6E3}
.lo-sl{position:relative;width:260px;height:6px;border-radius:3px;background:#E4D5B7}.lo-sl i{position:absolute;left:0;top:0;bottom:0;border-radius:3px;background:#6B4A35}.lo-sl b{position:absolute;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:#FFF6E3;border:2px solid #6B4A35}
.lo-set+.lo-note{padding:0 24px}
/* Companion */
.lo-cbar{position:absolute;left:0;right:0;bottom:0;height:40px;display:flex;align-items:center;gap:8px;padding:0 6px 0 12px;background:#FFF6E3;border-top:2px solid #6B4A35;color:#33273B;font-size:18px;font-weight:700}
.lo-cbar>svg{color:#6B4A35}.lo-cbar .lo-track{width:150px}.lo-cbar .lo-num{margin-right:auto}
.lo-cbtn{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;color:#6B4A35}.lo-cbtn.on{background:#6B4A35;color:#FFF6E3}
/* Kit demo */
.lo-kdemo{position:relative;display:inline-flex;align-items:center;gap:10px;height:40px;padding:0 14px;font-size:18px;font-weight:700}
.lo-klab{position:absolute;left:0;top:48px;white-space:nowrap;padding:2px 10px;border-radius:6px;background:rgba(255,246,227,.9);font-size:16px;color:#33273B}
.lo-kit2 .lo-table td{font-size:14px}
`;

/* ------------------------------------------------------------------ write */
let html = fs.readFileSync(PAGE, 'utf8');
const sStart = html.indexOf('<section id="ui-screens"');
const sEnd = html.indexOf('</section>', sStart) + '</section>'.length;
if (sStart < 0) throw new Error('ui-screens section not found');
html = html.slice(0, sStart) + section() + html.slice(sEnd);
// hero overlay: replace the inner of <div class="lo-hud" ...> up to the scale script
const hStart = html.indexOf('aria-label="Sailing HUD">');
const hEnd = html.indexOf('<script>(function(){if(window.__loScale)', hStart);
if (hStart < 0 || hEnd < 0) throw new Error('hero HUD markers not found');
html = html.slice(0, hStart + 'aria-label="Sailing HUD">'.length) + '\n' + heroOverlay() + '\n' + html.slice(hEnd);
fs.writeFileSync(PAGE, html);
console.log('ui-screens + hero HUD regenerated', html.length, 'bytes');
