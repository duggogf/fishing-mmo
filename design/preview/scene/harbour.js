// Little Ocean preview - the painted, unlined world (StaysLayer): a small harbour to the west of the boat
// (coast, stone quay, wooden pier, houses, lighthouse on the headland, rubble breakwater, moored dinghies),
// the painted sea, sky dome, drifting cloud ring, two island backdrop rings and the R2 rain-curtain card.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import { U, envMat, skyDome, backdropMat, ringGeometry, waterMat, seaGeometry } from './env.js';
import { mooredBoatGeo } from './boat.js';
import { rng } from './paint.js';

function boxUV(geo, w, h, d, tile) {
  const uv = geo.attributes.uv, size = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * size[f][0] / tile, uv.getY(k) * size[f][1] / tile); }
  return geo;
}

export function buildWorld(env, T) {
  const casters = new Set(), moored = [], R = rng(23);
  const add = (m, cast = true) => { env.add(m); if (cast) casters.add(m); return m; };
  const box = (w, h, d, mat, x, y, z, tile = 0, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (tile) boxUV(g, w, h, d, tile); const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.rotation.y = ry; return m; };

  /* sky, clouds, islands, rain curtain */
  env.add(skyDome(T.brush));
  const ring = (r, a0, a1, y0, y1, map, o, order) => { const m = new THREE.Mesh(ringGeometry(r, a0, a1, y0, y1, 128), backdropMat(map, o)); m.renderOrder = order; m.frustumCulled = false; env.add(m); return m; };
  const clouds = ring(940, 0, 360, 20, 420, T.clouds, { cloud: true, haze: 0.12 }, -9);
  ring(880, 0, 360, -6, 74, T.islandsFar, { haze: 0.36 }, -8);
  ring(520, 0, 360, -4, 44, T.islandsNear, { haze: 0.16 }, -7);
  ring(430, -50, 25, -3, 120, T.rain, { haze: 0.3, keyK: 0.4, opacity: U.curtainK }, -6);

  /* the sea */
  const sea = new THREE.Mesh(seaGeometry(), waterMat(T.daub)); sea.frustumCulled = false; env.add(sea);

  /* coast (extruded painted land), west of the boat */
  {
    const pts = [[-47, 220], [-47.5, 120], [-48, 60], [-47.5, 22], [-47, 2], [-47, -52], [-46, -64], [-40, -74], [-34, -80], [-36, -90], [-46, -98], [-62, -112], [-90, -140], [-150, -170], [-420, -220], [-420, 260]];
    const shape = new THREE.Shape();
    pts.forEach(([x, z], i) => { const j = i > 0 && i < pts.length - 2 && !(z <= 2 && z >= -52) ? 1.6 : 0; const X = x + (R() - 0.5) * j, Y = -z; i ? shape.lineTo(X, Y) : shape.moveTo(X, Y); });
    const g = new THREE.ExtrudeGeometry(shape, { depth: 3.0, bevelEnabled: false, curveSegments: 4 });
    g.rotateX(-Math.PI / 2); g.translate(0, -1.4, 0);
    const P = g.attributes.position, uv = g.attributes.uv, N = g.attributes.normal;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      if (Math.abs(N.getY(i)) > 0.5) uv.setXY(i, x / 12, z / 12); else uv.setXY(i, (x + z) / 6, (y + 0.25) / 3.0);
    }
    const m = new THREE.Mesh(g, [envMat({ map: T.grass, grain: 0.1 }), envMat({ map: T.rock, grain: 0.12 })]);
    add(m);
  }
  const top = 1.6;
  /* stone quay along the straight coast, wooden pier into the sea, bollards */
  const stone = envMat({ map: T.stone, grain: 0.12 }), wood = envMat({ map: T.wood, grain: 0.12 });
  add(box(3.2, 3.3, 54, stone, -46.6, 0.12, -25, 4));
  add(box(20, 0.24, 3, wood, -35.2, 1.32, -26, 2));
  for (let x = -44; x <= -26; x += 3.3) for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 3.6, 10), wood); p.position.set(x, -0.6, -26 + s * 1.35); add(p); }
  for (const z of [-48, -38, -14, -4]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.5, 10), envMat({ tint: '#6F6A7A', grain: 0.5 })); b.position.set(-45.4, 2.0, z); add(b); }
  // crates and barrels on the quay (painted set dressing)
  add(box(1.0, 0.8, 1.0, wood, -47.4, 2.17, -9, 2, 0.3)); add(box(0.9, 0.7, 0.9, wood, -47.6, 2.92, -9.1, 2, 0.1)); add(box(1.0, 0.8, 1.0, envMat({ tint: '#9FB2C2', grain: 0.5 }), -47.0, 2.17, -11, 0, -0.2));

  /* houses behind the quay */
  const house = (x, z, w, d, h, tint, roofTint, ry) => {
    const grp = new THREE.Group(); grp.position.set(x, top, z); grp.rotation.y = ry; env.add(grp);
    const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), envMat({ map: T.facade, tint, grain: 0.1, glass: 1 })); walls.position.y = h / 2; grp.add(walls); casters.add(walls);
    const th = THREE.MathUtils.degToRad(33), half = w / 2 + 0.35, len = half / Math.cos(th), rise = (w / 2) * Math.tan(th);
    const rm = envMat({ map: T.roof, tint: roofTint, grain: 0.1 });
    for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(len, 0.18, d + 0.6); boxUV(g, len, 0.18, d + 0.6, 3); const r = new THREE.Mesh(g, rm); r.position.set(s * half / 2, h + (rise - 0.35 * Math.tan(th)) / 2 + 0.1, 0); r.rotation.z = -s * th; grp.add(r); casters.add(r); }
    const tri = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, rise)]);
    const gm = envMat({ tint, grain: 0.4, side: THREE.DoubleSide });
    for (const s of [-1, 1]) { const gg = new THREE.Mesh(new THREE.ShapeGeometry(tri), gm); gg.position.set(0, h, s * d / 2); grp.add(gg); casters.add(gg); }
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, 0.6), envMat({ tint: '#B9A796', grain: 0.6 })); ch.position.set(w * 0.22, h + rise * 0.7, -d * 0.2); grp.add(ch); casters.add(ch);
  };
  house(-55, -44, 6, 7, 4.6, '#EFE3C8', '#6F8296', Math.PI / 2);
  house(-56, -33, 5.5, 6.5, 5.6, '#C9D3D6', '#B27A62', Math.PI / 2);
  house(-55.5, -22, 6.5, 7, 4.4, '#E9D3B4', '#5D6E84', Math.PI / 2);
  house(-57, -10, 5, 6, 5.0, '#D3E0CB', '#6F8296', Math.PI / 2);
  house(-66, -38, 6, 6, 6.2, '#EADFD0', '#8E6F80', Math.PI / 2 + 0.1);
  house(-67, -18, 5.5, 7, 5.2, '#EFE3C8', '#6F8296', Math.PI / 2 - 0.08);
  house(-65, 2, 6, 6, 4.4, '#C9D3D6', '#B27A62', Math.PI / 2);

  /* lighthouse on the headland (painted, discovery = StaysLayer) */
  {
    const x = -39, z = -82, rock = envMat({ map: T.rock, grain: 0.15 });
    const rk = new THREE.Mesh(new THREE.IcosahedronGeometry(5.5, 1), rock); rk.scale.set(1.3, 0.55, 1.1); rk.position.set(x, 0.6, z); add(rk);
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.9, 13, 24, 1, false), envMat({ map: T.tower, grain: 0.08 })); tw.position.set(x, 3.5 + 6.5, z); add(tw);
    const slate = envMat({ tint: '#6F8296', grain: 0.4 });
    const gal = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.32, 24), slate); gal.position.set(x, 16.6, z); add(gal);
    const lan = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.6, 16), envMat({ tint: '#FFF0C8', grain: 0.2, emit: 1 })); lan.position.set(x, 17.6, z); add(lan);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.45, 1.4, 16), slate); cap.position.set(x, 19.1, z); add(cap);
  }
  /* rubble breakwater with a little light post */
  {
    const rock = envMat({ map: T.rock, grain: 0.15 });
    for (let i = 0; i < 14; i++) { const t = i / 13, x = -46 + t * 21, z = 9 + t * 5 + (R() - 0.5); const r = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4 + R() * 0.6, 0), rock); r.scale.set(1.2, 0.7, 1); r.position.set(x, 0.2, z); r.rotation.set(R(), R() * 3, R()); add(r); }
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 3.2, 10), envMat({ tint: '#F1E8D6', grain: 0.3 })); post.position.set(-25, 1.8, 14); add(post);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.5, 10), envMat({ tint: '#6F8296', grain: 0.3 })); lamp.position.set(-25, 3.6, 14); add(lamp);
  }
  /* moored dinghies by the pier: painted, unlined, they sway like foliage */
  for (const [x, z, sc, col, ry] of [[-33.5, -22.6, 0.55, '#6F9AA3', 1.62], [-37.5, -29.6, 0.5, '#E3D7BE', 1.5], [-42, -22.8, 0.45, '#8E8FB5', 1.7]]) {
    const m = new THREE.Mesh(mooredBoatGeo(sc, col), envMat({ vertexColors: true, grain: 0.3 })); m.position.set(x, 0, z); m.rotation.y = ry; env.add(m);
    moored.push({ m, x, z, ry, ph: R() * 6 });
  }
  return { casters, moored, clouds, sea };
}
