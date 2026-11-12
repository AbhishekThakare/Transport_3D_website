// Night highway, container port, plant gate
const mk = (THREE) => {
  const add = (parent, geo, mat, x, y, z, name) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; if (name) m.name = name; parent.add(m); return m; };
  const box = (parent, sx, sy, sz, mat, x, y, z, name) => add(parent, new THREE.BoxGeometry(sx, sy, sz), mat, x, y, z, name);
  return { add, box };
};

/** Scale a geometry's UVs so a texture tiles once every `tile` metres. */
export const tileUV = (geo, w, h, tile) => {
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tile, uv.getY(i) * h / tile);
  uv.needsUpdate = true; return geo;
};
// all maps of a PBR material scroll together (each texture owns its own transform)
const scrollMaps = (mat, x) => { [mat.map, mat.normalMap, mat.roughnessMap, mat.aoMap].forEach(t => { if (t) t.offset.x = x; }); };

export function buildRoad(THREE, M) {
  const { add, box } = mk(THREE);
  const g = new THREE.Group(); g.name = 'highway';
  const W = 15, LEN = 600, AT = 3.2, GT = 7;
  const road = add(g, tileUV(new THREE.PlaneGeometry(LEN, W), LEN, W, AT), M.road, 0, 0.01, -2.0, 'road'); road.rotation.x = -Math.PI / 2; road.castShadow = false;
  const lines = add(g, new THREE.PlaneGeometry(LEN, W), M.roadLines, 0, 0.02, -2.0, 'laneMarkings'); lines.rotation.x = -Math.PI / 2; lines.castShadow = false; lines.receiveShadow = true;
  M.roadLines.map.repeat.set(LEN / 24, 1);
  [-1, 1].forEach(s => { const sh = add(g, tileUV(new THREE.PlaneGeometry(LEN, 3), LEN, 3, AT), M.asphalt, 0, 0.005, -2 + s * 9, 'shoulder'); sh.rotation.x = -Math.PI / 2; sh.castShadow = false; });
  const gr = add(g, tileUV(new THREE.PlaneGeometry(LEN, 400), LEN, 400, GT), M.grass, 0, 0, -2, 'land'); gr.rotation.x = -Math.PI / 2; gr.castShadow = false;
  // guardrail (rail static, posts recycled)
  [-11.2, 7.2].forEach(z => box(g, LEN, 0.32, 0.06, M.guardrail, 0, 0.72, z, 'guardrail'));
  const postGeo = new THREE.BoxGeometry(0.12, 0.9, 0.12);
  const posts = new THREE.InstancedMesh(postGeo, M.pole, 160); posts.castShadow = true; g.add(posts);
  // roadside scrub (recycled like the posts): low dry bushes give speed and depth at night
  const bushGeo = new THREE.IcosahedronGeometry(1, 1);
  const bushMat = new THREE.MeshStandardMaterial({ name: 'scrub', color: 0x2d3320, roughness: 1, flatShading: true });
  const bushes = new THREE.InstancedMesh(bushGeo, bushMat, 120); bushes.castShadow = true; bushes.receiveShadow = true; g.add(bushes);
  const bushSeed = Array.from({ length: 120 }, (_, i) => ({ x: i * 5.3 + Math.random() * 4, z: (i % 2 ? -1 : 1) * (14 + Math.random() * 22), s: 0.6 + Math.random() * 1.4 }));
  // street lamps
  const lamps = [];
  const SP = 42, N = 8;
  for (let i = 0; i < N; i++) {
    const l = new THREE.Group(); l.userData.dyn = true; g.add(l);
    box(l, 0.22, 10, 0.22, M.pole, 0, 5, -12.5);
    box(l, 0.14, 0.14, 4.2, M.pole, 0, 10, -10.5);
    box(l, 0.8, 0.18, 0.4, M.chassis, 0, 9.95, -8.5);
    box(l, 0.7, 0.04, 0.32, M.lampHead, 0, 9.85, -8.5);
    // (lamp light comes from 3 shared point lights in krlScene that follow the nearest lamps —
    //  a constant light count keeps one shader per material instead of one per stage)
    lamps.push(l);
  }
  // distant hills silhouette
  const hillMat = new THREE.MeshStandardMaterial({ name: 'hills', color: 0x1a1f1c, roughness: 1 });
  for (let i = 0; i < 14; i++) { const h = add(g, new THREE.SphereGeometry(40 + Math.random() * 40, 16, 8), hillMat, -300 + i * 50, -20, -170 - Math.random() * 40); h.scale.y = 0.45; h.castShadow = false; }
  // oncoming traffic (light pairs + bodies)
  const cars = [];
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Group(); c.userData.dyn = true; g.add(c);
    box(c, 4.4, 1.3, 1.8, i === 1 ? M.cabAccent : M.trailer, 0, 0.9, 0);
    box(c, 2.2, 0.6, 1.7, M.glass, 0.3, 1.8, 0);
    [-0.6, 0.6].forEach(z => box(c, 0.05, 0.14, 0.3, M.headlight, -2.22, 0.85, z));
    [-0.7, 0.7].forEach(z => box(c, 0.05, 0.12, 0.25, M.taillight, 2.22, 0.95, z));
    c.position.set(0, 0, -5.5 - (i % 2) * 3.6); cars.push({ c, off: i * 170 });
  }
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
  const update = (dist, time) => {
    M.roadLines.map.offset.x = (dist / 24) % 1;
    scrollMaps(M.road, (dist / AT) % 1); scrollMaps(M.asphalt, (dist / AT) % 1); scrollMaps(M.grass, (dist / GT) % 1);
    for (let i = 0; i < 80; i++) {
      const x = ((i * 4 - dist) % 320 + 320) % 320 - 160;
      m4.makeTranslation(x, 0.45, -11.2); posts.setMatrixAt(i, m4);
      m4.makeTranslation(x, 0.45, 7.2); posts.setMatrixAt(80 + i, m4);
    }
    posts.instanceMatrix.needsUpdate = true;
    bushSeed.forEach((b, i) => {
      const x = ((b.x - dist) % 636 + 636) % 636 - 318;
      pv.set(x, b.s * 0.35, b.z - 2); sv.set(b.s * 1.3, b.s * 0.7, b.s); m4.compose(pv, q, sv); bushes.setMatrixAt(i, m4);
    });
    bushes.instanceMatrix.needsUpdate = true;
    lamps.forEach((l, i) => { l.position.x = ((i * SP - dist) % (SP * N) + SP * N) % (SP * N) - SP * 3; });
    cars.forEach(({ c, off }) => { c.position.x = 260 - ((dist * 1.8 + time * 22 + off) % 520); });
  };
  update(0, 0);
  return { group: g, update, lamps };
}

export function buildContainer(THREE, M) {
  const g = new THREE.Group(); g.name = 'container40';
  const geo = new THREE.BoxGeometry(12.19, 2.59, 2.44);
  const mats = [M.containerEnd, M.containerEnd, M.containerEnd, M.containerEnd, M.container, M.container];
  const b = new THREE.Mesh(geo, mats); b.castShadow = true; b.receiveShadow = true; g.add(b);
  const cg = new THREE.BoxGeometry(0.18, 0.12, 0.18);
  [-1, 1].forEach(sx => [-1, 1].forEach(sy => [-1, 1].forEach(sz => { const c = new THREE.Mesh(cg, M.chassis); c.position.set(sx * 6.0, sy * 1.24, sz * 1.13); g.add(c); })));
  for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.4, 0.04), M.chassis); r.position.set(6.11, 0, -0.9 + i * 0.6); g.add(r); }
  return g;
}

export function buildPort(THREE, M) {
  const { add, box } = mk(THREE);
  const g = new THREE.Group(); g.name = 'port';
  const quay = add(g, tileUV(new THREE.PlaneGeometry(220, 60), 220, 60, 4), M.concrete, 0, 0, 18, 'quay'); quay.rotation.x = -Math.PI / 2; quay.castShadow = false;
  box(g, 220, 3, 1.2, M.concrete, 0, -1.5, -11.6, 'quayEdge');
  for (let x = -100; x < 110; x += 12) box(g, 0.6, 0.5, 0.6, M.hazard, x, 0.25, -11, 'bollard');
  // water: procedural wave normal map, scrolled over time
  const wc = document.createElement('canvas'); wc.width = wc.height = 256; const wx = wc.getContext('2d'); const wd = wx.createImageData(256, 256);
  const hgt = (x, y) => Math.sin(x * 0.098 + Math.sin(y * 0.05) * 2) * 0.5 + Math.sin(y * 0.147 + x * 0.03) * 0.35 + Math.sin((x + y) * 0.21) * 0.15;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const dx = hgt(x + 1, y) - hgt(x - 1, y), dy = hgt(x, y + 1) - hgt(x, y - 1);
    const n = Math.hypot(dx, dy, 0.6); const p = (y * 256 + x) * 4;
    wd.data[p] = (-dx / n * 0.5 + 0.5) * 255; wd.data[p + 1] = (-dy / n * 0.5 + 0.5) * 255; wd.data[p + 2] = (0.6 / n * 0.5 + 0.5) * 255; wd.data[p + 3] = 255;
  }
  wx.putImageData(wd, 0, 0);
  const waterN = new THREE.CanvasTexture(wc); waterN.wrapS = waterN.wrapT = THREE.RepeatWrapping; waterN.repeat.set(40, 20);
  M.water.normalMap = waterN; M.water.normalScale = new THREE.Vector2(0.35, 0.35); M.water.roughness = 0.05; M.water.color.set(0x0b2633); M.water.needsUpdate = true;
  const water = add(g, new THREE.PlaneGeometry(600, 300), M.water, 0, -1.6, -160, 'water'); water.rotation.x = -Math.PI / 2; water.castShadow = false;
  // ship
  const ship = new THREE.Group(); ship.position.set(4, 0, -25); g.add(ship);
  box(ship, 150, 8, 26, M.hull, 0, 2, 0, 'hull'); box(ship, 150, 3, 26.05, M.hullRed, 0, -2.6, 0);
  box(ship, 14, 18, 22, M.paintWhite, 62, 15, 0, 'bridge'); box(ship, 14.1, 1.2, 22.1, M.glass, 62, 21, 0);
  const cols = [0x1f4f8a, 0x7a1d17, 0x2f6b3a, 0xc4561a, 0x8a8f96, 0x3a3f8a];
  const cmats = cols.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0.4, normalMap: M.container.normalMap, normalScale: new THREE.Vector2(1.4, 1.4), roughnessMap: M.container.roughnessMap, aoMap: M.container.aoMap, aoMapIntensity: 0.6 }));
  const cgeo = new THREE.BoxGeometry(12.0, 2.55, 2.4);
  for (let bay = 0; bay < 8; bay++) for (let row = 0; row < 9; row++) for (let tier = 0; tier < 3 + ((bay * 7 + row * 3) % 3); tier++) {
    if (bay === 4 && row === 5) continue;
    const c = new THREE.Mesh(cgeo, cmats[(bay * 5 + row * 3 + tier) % cmats.length]);
    c.position.set(-50 + bay * 13, 6 + 1.3 + tier * 2.6, -10 + row * 2.5); c.castShadow = true; ship.add(c);
  }
  // STS crane
  const crane = new THREE.Group(); crane.name = 'quayCrane'; g.add(crane);
  const legX = [-4, 16], legZ = [6, -9.5];
  legX.forEach(x => legZ.forEach(z => box(crane, 1.2, 30, 1.2, M.craneBlue, x, 15, z, 'leg')));
  legX.forEach(x => { box(crane, 1.4, 1.6, 17, M.craneBlue, x, 13, -1.75); box(crane, 1.4, 1.2, 17, M.craneBlue, x, 30, -1.75); });
  legZ.forEach(z => box(crane, 21.4, 1.4, 1.4, M.craneBlue, 6, 30.5, z, 'portalBeam'));
  [2, 10].forEach(x => box(crane, 1.6, 1.6, 75, M.craneBlue, x, 32, -14, 'boom'));
  box(crane, 10, 4, 7, M.paintWhite, 6, 34.5, 12, 'machineHouse');
  [2, 10].forEach(x => { const a = box(crane, 0.8, 16, 0.8, M.craneBlue, x, 40, 3); });
  [2, 10].forEach(x => { const s = box(crane, 0.3, 0.3, 46, M.steelCable, x, 40, -18); s.rotation.x = -0.33; });
  const trolley = new THREE.Group(); trolley.userData.dyn = true; crane.add(trolley);
  box(trolley, 10.4, 1.4, 3, M.chassis, 6, 30.9, 0, 'trolley');
  const cableGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 6); cableGeo.translate(0, -0.5, 0);
  const cables = [[2.5, -0.8], [9.5, -0.8], [2.5, 0.8], [9.5, 0.8]].map(([x, z]) => { const c = add(trolley, cableGeo, M.steelCable, x, 30.2, z); c.userData.dyn = true; return c; });
  const spreader = box(trolley, 12.2, 0.45, 2.5, M.hazard, 6, 0, 0, 'spreader'); spreader.userData.dyn = true;
  const setCrane = (z, cy) => {
    trolley.position.z = z; spreader.position.y = cy + 1.52;
    cables.forEach(c => c.scale.y = Math.max(0.1, 30.2 - cy - 1.75));
  };
  const update = (time) => { waterN.offset.set(time * 0.012, time * 0.007); };
  // yard stacks
  for (let i = 0; i < 6; i++) for (let t = 0; t < 2; t++) { const c = new THREE.Mesh(cgeo, cmats[(i + t) % cmats.length]); c.position.set(-40 + i * 13, 1.3 + t * 2.6, 22); c.castShadow = true; g.add(c); }
  return { group: g, setCrane, update };
}

export function buildGate(THREE, M, sign) {
  const { add, box } = mk(THREE);
  const g = new THREE.Group(); g.name = 'plantGate';
  const GX = 24;
  const ground = add(g, tileUV(new THREE.PlaneGeometry(260, 140), 260, 140, 4), M.concrete, 20, 0, -20); ground.rotation.x = -Math.PI / 2; ground.castShadow = false;
  [-1, 1].forEach(s => box(g, 1.0, 7.5, 1.0, M.paintWhite, GX, 3.75, s * 6.5, 'pillar'));
  box(g, 1.2, 1.6, 14.4, M.paintWhite, GX, 8.1, 0, 'archBeam');
  const sm = new THREE.MeshStandardMaterial({ map: sign([['STEEL WORKS · GATE 02', 92, 120], ['INWARD — HEAVY VEHICLES', 52, 200]], 1024, 256, '#1b2a3a') });
  const sp = new THREE.Mesh(new THREE.PlaneGeometry(12, 1.4), sm); sp.position.set(GX - 0.61, 8.1, 0); sp.rotation.y = -Math.PI / 2; g.add(sp);
  // barrier
  const bc = document.createElement('canvas'); bc.width = 512; bc.height = 16; const bx = bc.getContext('2d');
  for (let i = 0; i < 8; i++) { bx.fillStyle = i % 2 ? '#f2f2ee' : '#c21b17'; bx.fillRect(i * 64, 0, 64, 16); }
  const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace;
  const pivot = new THREE.Group(); pivot.userData.dyn = true; pivot.position.set(GX - 1.4, 1.05, -5.6); g.add(pivot);
  box(g, 0.5, 1.1, 0.5, M.hazard, GX - 1.4, 0.55, -5.6, 'barrierBase');
  const arm = box(pivot, 0.12, 0.14, 10.6, new THREE.MeshStandardMaterial({ map: bt, roughness: 0.5 }), 0, 0, 5.3, 'barrierArm');
  // guard cabin
  const cab = new THREE.Group(); cab.position.set(GX + 3, 0, -9.5); g.add(cab);
  box(cab, 3.4, 2.8, 3, M.paintWhite, 0, 1.4, 0); box(cab, 3.8, 0.2, 3.4, M.trailer, 0, 2.9, 0);
  box(cab, 0.05, 1.0, 2.2, M.glass, -1.72, 1.7, 0);
  // fence + plant buildings
  [-1, 1].forEach(s => {
    for (let z = 7.5; z < 70; z += 3) box(g, 0.08, 2.4, 0.08, M.pole, GX, 1.2, s * z);
    box(g, 0.05, 0.05, 62, M.pole, GX, 2.35, s * 38.5); box(g, 0.05, 0.05, 62, M.pole, GX, 0.2, s * 38.5);
  });
  const shedMat = M.corrugated;
  box(g, 60, 18, 30, shedMat, GX + 55, 9, -40, 'millShed').geometry = tileUV(new THREE.BoxGeometry(60, 18, 30), 30, 9, 1);
  box(g, 40, 14, 26, shedMat, GX + 60, 7, 30).geometry = tileUV(new THREE.BoxGeometry(40, 14, 26), 20, 7, 1);
  box(g, 61, 0.6, 31, M.trailer, GX + 55, 18.3, -40); box(g, 41, 0.6, 27, M.trailer, GX + 60, 14.3, 30);
  [0, 1, 2].forEach(i => add(g, new THREE.CylinderGeometry(1.6, 2.0, 42, 24), M.paintWhite, GX + 40 + i * 9, 21, -64, 'chimney'));
  const setBarrier = t => { pivot.rotation.x = -t * 1.45; };
  return { group: g, setBarrier, GX };
}
