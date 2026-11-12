// Weighbridge yard, gantry crane, steel rod bundles
const mk = (THREE) => {
  const add = (parent, geo, mat, x, y, z, name) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; if (name) m.name = name; parent.add(m); return m; };
  const box = (parent, sx, sy, sz, mat, x, y, z, name) => add(parent, new THREE.BoxGeometry(sx, sy, sz), mat, x, y, z, name);
  return { add, box };
};

export function buildBundle(THREE, M, len = 11.6) {
  const g = new THREE.Group(); g.name = 'rebarBundle';
  const r = 0.016, step = 0.0345, R = 0.21;
  const pts = [];
  for (let y = -R; y <= R; y += step * 0.866) {
    const row = Math.round((y + R) / (step * 0.866));
    for (let z = -R; z <= R; z += step) { const zz = z + (row % 2) * step / 2; if (y * y + zz * zz <= R * R) pts.push([y, zz]); }
  }
  const geo = new THREE.CylinderGeometry(r, r, len, 7); geo.rotateZ(Math.PI / 2);
  const inst = new THREE.InstancedMesh(geo, M.rebar, pts.length); inst.castShadow = true; inst.receiveShadow = true; inst.name = 'rebars';
  const m4 = new THREE.Matrix4();
  pts.forEach((p, i) => { m4.makeTranslation((Math.random() - 0.5) * 0.12, p[0] * 0.92, p[1]); inst.setMatrixAt(i, m4); });
  g.add(inst);
  const ring = new THREE.TorusGeometry(R + 0.012, 0.008, 6, 32); ring.rotateY(Math.PI / 2);
  [-4.6, -1.6, 1.6, 4.6].forEach(x => { const w = new THREE.Mesh(ring, M.wire); w.position.x = x; w.scale.y = 0.92; g.add(w); });
  return g;
}

export function buildWorks(THREE, M, sign) {
  const { add, box } = mk(THREE);
  const g = new THREE.Group(); g.name = 'weighbridgeYard';
  // yard + weighbridge
  const yard = add(g, new THREE.PlaneGeometry(160, 70), M.concrete, 4, 0, -10, 'yard'); yard.rotation.x = -Math.PI / 2; yard.castShadow = false;
  { const uv = yard.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 40, uv.getY(i) * 17.5); }
  box(g, 18.5, 0.06, 3.4, M.plate, 7.0, 0.0, 0, 'weighDeck');
  M.plate.map.repeat.set(1, 1);
  [-1, 1].forEach(s => {
    box(g, 18.5, 0.16, 0.18, M.hazard, 7.0, 0.06, s * 1.8, 'curb');
    for (let x = -2; x < 16.2; x += 0.8) box(g, 0.4, 0.165, 0.185, M.chassis, x + 0.2, 0.06, s * 1.8);
  });
  for (let x = -1.5; x < 16.4; x += 3.0) box(g, 0.02, 0.07, 3.4, M.chassis, x, 0.01, 0);
  // LED display on posts
  const disp = new THREE.Group(); disp.position.set(-4.5, 0, 5.0); disp.rotation.y = 0.3; g.add(disp);
  box(disp, 0.1, 2.6, 0.1, M.pole, -0.75, 1.3, 0); box(disp, 0.1, 2.6, 0.1, M.pole, 0.75, 1.3, 0);
  box(disp, 1.9, 0.7, 0.18, M.chassis, 0, 2.8, 0, 'displayHousing');
  const led = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.56), M.led); led.position.set(0, 2.8, 0.095); disp.add(led);
  // weigh office
  const off = new THREE.Group(); off.position.set(-9, 0, -7); g.add(off);
  box(off, 5, 3, 3.5, M.paintWhite, 0, 1.5, 0, 'office'); box(off, 5.4, 0.2, 3.9, M.trailer, 0, 3.1, 0);
  box(off, 2.2, 1.1, 0.05, M.glass, 0.6, 1.8, 1.76); box(off, 0.9, 2.0, 0.05, M.trailer, -1.5, 1.0, 1.76);
  const st = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.6), new THREE.MeshStandardMaterial({ map: sign([['WEIGHBRIDGE · 80 T', 120, 170]], 1024, 256, '#183a6b') })); st.position.set(0, 2.65, 1.78); off.add(st);

  // gantry crane (two box girders along Z)
  const crane = new THREE.Group(); crane.name = 'gantryCrane'; g.add(crane);
  const H = 9.0, z0 = -9.5, z1 = 3.8, xs = [-0.6, 12.8];
  xs.forEach(x => {
    box(crane, 0.7, 1.0, z1 - z0 + 0.8, M.craneYellow, x, H, (z0 + z1) / 2, 'girder');
    box(crane, 0.75, 0.08, z1 - z0 + 0.8, M.chassis, x, H + 0.54, (z0 + z1) / 2, 'rail');
    [z0, z1].forEach(z => {
      box(crane, 0.55, H - 0.5, 0.55, M.craneYellow, x, (H - 0.5) / 2, z, 'leg');
      box(crane, 0.9, 0.6, 1.8, M.craneYellow, x, 0.3, z, 'endTruck');
      for (let i = 0; i < 6; i++) { const y = 1 + i * 1.3; box(crane, 0.12, 0.12, 0.12, M.chassis, x, y, z + 0.33); }
    });
    box(crane, 0.3, 0.3, z1 - z0, M.craneYellow, x, 1.0, (z0 + z1) / 2, 'sill');
  });
  [z0, z1].forEach(z => box(crane, xs[1] - xs[0], 0.5, 0.5, M.craneYellow, (xs[0] + xs[1]) / 2, H + 0.1, z, 'endTie'));
  [z0, z1].forEach(z => box(crane, xs[1] - xs[0], 0.06, 0.06, M.chassis, (xs[0] + xs[1]) / 2, 0.0, z));
  // trolley bridge (moves in Z)
  const trolley = new THREE.Group(); trolley.name = 'trolley'; trolley.userData.dyn = true; crane.add(trolley);
  box(trolley, xs[1] - xs[0] + 0.8, 0.55, 0.9, M.craneBlue, (xs[0] + xs[1]) / 2, H + 0.85, 0, 'trolleyBeam');
  box(trolley, 2.4, 1.1, 1.4, M.craneBlue, (xs[0] + xs[1]) / 2, H + 1.4, 0, 'hoist');
  box(trolley, 1.0, 0.8, 0.9, M.craneYellow, (xs[0] + xs[1]) / 2 + 1.8, H + 1.3, 0, 'motor');
  // cables + spreader
  const cableGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 6); cableGeo.translate(0, -0.5, 0);
  const cables = [2.6, 9.6].map(x => { const c = add(trolley, cableGeo, M.steelCable, x, H + 0.5, 0); c.userData.dyn = true; return c; });
  const hook = new THREE.Group(); hook.name = 'spreader'; hook.userData.dyn = true; trolley.add(hook);
  box(hook, 8.6, 0.32, 0.26, M.craneYellow, 6.1, 0.35, 0, 'spreaderBeam');
  [2.6, 9.6].forEach(x => { box(hook, 0.35, 0.5, 0.3, M.chassis, x, 0.7, 0, 'sheave'); });
  const slingGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.62, 5);
  [1.5, 4.5, 7.7, 10.7].forEach(x => { [-1, 1].forEach(s => { const m = add(hook, slingGeo, M.steelCable, x, 0.0, s * 0.06); m.rotation.x = s * 0.25; }); });
  const setCrane = (z, hookY) => {
    trolley.position.z = z;
    hook.position.y = hookY;
    cables.forEach(c => { c.scale.y = Math.max(0.1, H + 0.5 - hookY - 0.85); });
  };
  setCrane(-5.1, 5.5);

  // stack dunnage
  [1.5, 6.1, 10.7].forEach(x => box(g, 0.2, 0.14, 2.4, M.timber, x, 0.07, -5.1, 'dunnage'));
  // lamp mast + misc yard props
  box(g, 0.25, 14, 0.25, M.pole, -12, 7, 4, 'mast');
  box(g, 2.2, 0.4, 0.6, M.chassis, -12, 14, 4);
  // steel stockyard in the background: stacked bundles, coils and plates (sells the "steel plant" story)
  const coilGeo = new THREE.TorusGeometry(0.75, 0.38, 14, 28);
  for (let i = 0; i < 7; i++) { const c = add(g, coilGeo, M.rebar, -26 + i * 2.1, 1.13, -22 - (i % 2) * 0.4, 'coil'); c.rotation.y = Math.PI / 2; }
  for (let i = 0; i < 5; i++) for (let t = 0; t < 1 + (i % 3); t++) box(g, 12, 0.5, 2.2, M.rebar, 30 + (i % 2) * 1.5, 0.25 + t * 0.52, -20 - i * 3, 'barStack');
  for (let t = 0; t < 6; t++) box(g, 6, 0.08, 2.4, M.trailer, -24, 0.04 + t * 0.09, -32, 'plateStack');
  // perimeter wall + mill shed silhouette
  box(g, 160, 2.6, 0.3, M.paintWhite, 4, 1.3, -44, 'wall');
  const shed = box(g, 70, 20, 30, M.corrugated, 10, 10, -66, 'millShed');
  { const uv = shed.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 35, uv.getY(i) * 10); }
  box(g, 71, 0.6, 31, M.trailer, 10, 20.3, -66);
  [0, 1].forEach(i => add(g, new THREE.CylinderGeometry(1.4, 1.8, 34, 20), M.paintWhite, 30 + i * 8, 17, -78, 'chimney'));
  return { group: g, setCrane, H, disp, off };
}
