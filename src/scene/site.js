// Customer site unloading: exclusion zone, cones, beacons, PPE workers, wheel chocks, safety signage
export function buildSite(THREE, M, sign) {
  const g = new THREE.Group(); g.name = 'unloadingSafety';
  const add = (parent, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const box = (parent, sx, sy, sz, mat, x, y, z) => add(parent, new THREE.BoxGeometry(sx, sy, sz), mat, x, y, z);
  const S = o => new THREE.MeshStandardMaterial(o);
  const vest = S({ name: 'hiVis', color: 0xff7a00, emissive: 0xff5a00, emissiveIntensity: 0.25, roughness: 0.7 });
  const vestY = S({ name: 'hiVisYellow', color: 0xd9f000, emissive: 0xb8d000, emissiveIntensity: 0.2, roughness: 0.7 });
  const reflect = S({ name: 'reflective', color: 0xdddddd, roughness: 0.2, metalness: 0.6 });
  const work = S({ name: 'workwear', color: 0x1f2c44, roughness: 0.9 });
  const skin = S({ name: 'skin', color: 0x8a5a3c, roughness: 0.7 });
  const helmetW = S({ name: 'helmet', color: 0xf4f4f0, roughness: 0.35 });
  const boot = S({ name: 'boots', color: 0x2a1c12, roughness: 0.8 });
  const coneMat = S({ name: 'cone', color: 0xff4d0a, roughness: 0.55 });
  const beaconMat = S({ name: 'beacon', color: 0xffa000, emissive: 0xff9000, emissiveIntensity: 2, transparent: true, opacity: 0.9 });

  // exclusion zone floor marking (yellow/black)
  const zone = { x0: -3.2, x1: 15.8, z0: -7.4, z1: 3.0 };
  const line = (sx, sz, x, z) => { const m = box(g, sx, 0.012, sz, M.hazard, x, 0.04, z); m.castShadow = false; };
  line(zone.x1 - zone.x0, 0.22, (zone.x0 + zone.x1) / 2, zone.z0); line(zone.x1 - zone.x0, 0.22, (zone.x0 + zone.x1) / 2, zone.z1);
  line(0.22, zone.z1 - zone.z0, zone.x0, (zone.z0 + zone.z1) / 2); line(0.22, zone.z1 - zone.z0, zone.x1, (zone.z0 + zone.z1) / 2);
  for (let x = zone.x0 + 0.6; x < zone.x1; x += 1.2) { const m = box(g, 0.18, 0.013, 0.5, M.chassis, x, 0.041, zone.z1); m.rotation.y = 0.6; m.castShadow = false; }
  // cones around zone
  const coneGeo = new THREE.ConeGeometry(0.17, 0.72, 24); const bandGeo = new THREE.CylinderGeometry(0.105, 0.125, 0.12, 24); const baseGeo = new THREE.BoxGeometry(0.42, 0.04, 0.42);
  const cones = [];
  const cone = (x, z) => { const c = new THREE.Group(); c.userData.dyn = true; c.position.set(x, 0, z); g.add(c); add(c, baseGeo, coneMat, 0, 0.02, 0); add(c, coneGeo, coneMat, 0, 0.4, 0); add(c, bandGeo, M.paintWhite, 0, 0.48, 0); cones.push(c); };
  for (let x = zone.x0; x <= zone.x1 + 0.01; x += 2.375) { cone(x, zone.z1 + 0.35); cone(x, zone.z0 - 0.35); }
  for (let z = zone.z0 + 2.6; z < zone.z1; z += 2.6) { cone(zone.x0 - 0.35, z); cone(zone.x1 + 0.35, z); }
  // beacons on poles
  const beacons = [];
  [[zone.x0 - 0.8, zone.z1 + 0.8], [zone.x1 + 0.8, zone.z1 + 0.8]].forEach(([x, z]) => {
    box(g, 0.5, 0.1, 0.5, M.chassis, x, 0.05, z); box(g, 0.08, 2.4, 0.08, M.pole, x, 1.2, z);
    const b = add(g, new THREE.CylinderGeometry(0.12, 0.14, 0.24, 20), beaconMat, x, 2.52, z); beacons.push(b);
  });
  // safety sign
  const sp = new THREE.Group(); sp.position.set(-5.2, 0, 4.6); sp.rotation.y = 0.45; g.add(sp);
  box(sp, 0.08, 2.0, 0.08, M.pole, -0.7, 1.0, 0); box(sp, 0.08, 2.0, 0.08, M.pole, 0.7, 1.0, 0);
  const sgn = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.1), S({ map: sign([['UNLOADING ZONE', 78, 92], ['PPE MANDATORY', 52, 158], ['KEEP CLEAR OF SUSPENDED LOADS', 34, 214]], 1024, 256 * 1.0, '#b31612') }));
  sgn.position.set(0, 2.3, 0.05); sp.add(sgn); box(sp, 2.0, 1.2, 0.05, M.chassis, 0, 2.3, 0);

  // workers
  const person = (x, z, ry, vMat) => {
    const p = new THREE.Group(); p.position.set(x, 0, z); p.rotation.y = ry; g.add(p);
    [-0.11, 0.11].forEach(o => { box(p, 0.15, 0.82, 0.17, work, 0, 0.47, o); box(p, 0.28, 0.1, 0.17, boot, 0.05, 0.05, o); });
    box(p, 0.26, 0.6, 0.44, vMat, 0, 1.18, 0);
    box(p, 0.27, 0.05, 0.45, reflect, 0, 1.05, 0); box(p, 0.27, 0.05, 0.45, reflect, 0, 1.3, 0);
    const armL = new THREE.Group(); armL.userData.dyn = true; armL.position.set(0, 1.44, 0.28); p.add(armL); box(armL, 0.11, 0.62, 0.11, vMat, 0, -0.3, 0); box(armL, 0.09, 0.1, 0.09, skin, 0, -0.65, 0);
    const armR = new THREE.Group(); armR.userData.dyn = true; armR.position.set(0, 1.44, -0.28); p.add(armR); box(armR, 0.11, 0.62, 0.11, vMat, 0, -0.3, 0); box(armR, 0.09, 0.1, 0.09, skin, 0, -0.65, 0);
    add(p, new THREE.SphereGeometry(0.115, 20, 14), skin, 0, 1.64, 0);
    const hat = add(p, new THREE.SphereGeometry(0.135, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), helmetW, 0, 1.68, 0);
    add(p, new THREE.CylinderGeometry(0.17, 0.17, 0.015, 20), helmetW, 0.02, 1.685, 0);
    return { p, armL, armR };
  };
  const banksman = person(-1.8, 5.2, -0.9, vest);
  const tagA = person(-1.6, -2.2, 0.3, vestY);
  const tagB = person(13.8, -2.2, Math.PI - 0.3, vestY);
  const supervisor = person(16.8, 4.2, -2.4, vest);
  // wheel chocks (yellow wedges), positioned at trailer & drive axles (truck at x=0)
  const chockGeo = new THREE.BoxGeometry(0.38, 0.22, 0.3); const chocks = [];
  [[0.78, 1.25], [0.78, -1.25], [4.72, 1.25], [4.72, -1.25]].forEach(([x, z]) => { const c = add(g, chockGeo, M.hazard, x, 0.11, z); c.rotation.z = 0.35; c.userData.dyn = true; chocks.push(c); });

  // ---------- residential construction site ----------
  const tile = (geo, w, h, t) => { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / t, uv.getY(i) * h / t); return geo; };
  const gnd = add(g, tile(new THREE.PlaneGeometry(220, 160), 220, 160, 6), M.dirt, 6, -0.005, -20); gnd.rotation.x = -Math.PI / 2; gnd.castShadow = false;
  const road = add(g, tile(new THREE.PlaneGeometry(90, 6.5), 90, 6.5, 4), M.concrete, 6, 0.0, 0); road.rotation.x = -Math.PI / 2; road.castShadow = false;
  [1.5, 6.1, 10.7].forEach(x => box(g, 0.2, 0.14, 2.4, M.timber, x, 0.07, -5.1));
  // building under construction (RCC frame, 7 floors, top floors open)
  const bld = new THREE.Group(); bld.position.set(6, 0, -30); g.add(bld);
  const conc = S({ name: 'freshConcrete', color: 0xb9b4aa, roughness: 0.95 });
  const brick = M.brick;
  const FH = 3.1, BW = 30, BD = 16;
  for (let f = 0; f <= 7; f++) {
    box(bld, BW, 0.25, BD, conc, 0, f * FH + 0.12, 0);
    if (f < 7) for (let ix = 0; ix <= 5; ix++) for (let iz = 0; iz <= 2; iz++) box(bld, 0.45, FH, 0.45, conc, -BW / 2 + 0.3 + ix * (BW - 0.6) / 5, f * FH + FH / 2, -BD / 2 + 0.3 + iz * (BD - 0.6) / 2);
    if (f < 4) { const w = box(bld, BW - 0.6, FH - 0.3, 0.25, brick, 0, f * FH + FH / 2 + 0.1, BD / 2 - 0.2); tile(w.geometry, BW - 0.6, FH - 0.3, 2); }
    if (f >= 4 && f < 7) for (let ix = 0; ix < 6; ix++) box(bld, 0.02, 1.1, 0.02, M.rebar, -BW / 2 + 0.3 + ix * 5.88, 7 * FH + 0.6, BD / 2 - 0.3);
  }
  for (let ix = 0; ix <= 5; ix++) for (let iz = 0; iz <= 2; iz++) for (let r = 0; r < 4; r++) box(bld, 0.025, 1.4, 0.025, M.rebar, -BW / 2 + 0.3 + ix * (BW - 0.6) / 5 + (r % 2 - 0.5) * 0.25, 7 * FH + 0.8, -BD / 2 + 0.3 + iz * (BD - 0.6) / 2 + (r > 1 ? 0.12 : -0.12));
  // scaffolding on front face
  const scaf = S({ name: 'scaffold', color: 0x9aa0a6, roughness: 0.4, metalness: 0.8 });
  const net = S({ name: 'safetyNet', color: 0x1f6b3a, roughness: 0.9, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  for (let x = -BW / 2; x <= BW / 2 + 0.01; x += 2.5) box(bld, 0.05, 7 * FH + 1, 0.05, scaf, x, (7 * FH + 1) / 2, BD / 2 + 1.0);
  for (let y = 1.5; y < 7 * FH; y += 2) box(bld, BW, 0.05, 0.05, scaf, 0, y, BD / 2 + 1.0);
  const nt = add(bld, new THREE.PlaneGeometry(BW * 0.5, 7 * FH * 0.6), net, BW * 0.22, 7 * FH * 0.62, BD / 2 + 1.06); nt.castShadow = false;
  // site hoarding with signage
  const hoardMat = S({ name: 'hoarding', color: 0x1d4f8a, roughness: 0.6, metalness: 0.3 });
  box(g, 34, 2.4, 0.08, hoardMat, -14, 1.2, -16); box(g, 34, 2.4, 0.08, hoardMat, 28, 1.2, -16);
  const hs = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.2), S({ map: sign([['KRISHNA HEIGHTS', 96, 112], ['RESIDENTIAL PROJECT · G+12', 50, 190]], 1024, 256, '#1d4f8a') })); hs.position.set(-8, 1.25, -15.94); g.add(hs);
  // site cabins + sand + aggregate
  [[-24, -9], [-24, -5.5]].forEach(([x, z]) => { box(g, 6, 2.6, 2.6, M.paintWhite, x, 1.3, z); box(g, 1.2, 0.8, 0.05, M.glass, x + 1, 1.6, z + 1.31); });
  const sand = add(g, new THREE.ConeGeometry(3.2, 1.8, 24), S({ name: 'sand', color: 0xc9a46a, roughness: 1 }), 26, 0.9, -8); sand.castShadow = false;
  const agg = add(g, new THREE.ConeGeometry(2.6, 1.5, 24), S({ name: 'aggregate', color: 0x6e6a66, roughness: 1 }), 31, 0.75, -11); agg.castShadow = false;
  // tower crane (mast behind stack, jib along +Z over the truck)
  const tc = new THREE.Group(); tc.name = 'towerCrane'; tc.position.set(6.1, 0, -16); g.add(tc);
  const TH = 30, tY = M.craneYellow;
  box(tc, 4, 1, 4, conc, 0, 0.5, 0);
  [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].forEach(([x, z]) => box(tc, 0.18, TH, 0.18, tY, x, TH / 2 + 1, z));
  for (let y = 2; y < TH; y += 1.8) { box(tc, 1.8, 0.08, 0.08, tY, 0, y, 0.8); box(tc, 1.8, 0.08, 0.08, tY, 0, y, -0.8); box(tc, 0.08, 0.08, 1.8, tY, 0.8, y, 0); box(tc, 0.08, 0.08, 1.8, tY, -0.8, y, 0); const d = box(tc, 0.06, 2.4, 0.06, tY, 0, y + 0.9, 0.8); d.rotation.z = 0.78; }
  box(tc, 2.4, 2.2, 2.4, M.paintWhite, 1.6, TH + 1.2, 1.2);
  box(tc, 1.4, 1.1, 0.05, M.glass, 1.6, TH + 1.5, 2.42);
  const jibTop = TH + 2.6;
  [[-0.6], [0.6]].forEach(([x]) => box(tc, 0.16, 0.16, 40, tY, x, TH + 0.6, 14));
  box(tc, 0.16, 0.16, 40, tY, 0, jibTop, 14);
  for (let z = -4; z < 34; z += 1.8) { const a = box(tc, 0.06, 2.3, 0.06, tY, 0.3, TH + 1.6, z); a.rotation.x = 0.6; const b = box(tc, 0.06, 2.3, 0.06, tY, -0.3, TH + 1.6, z); b.rotation.x = 0.6; }
  box(tc, 0.16, 0.16, 14, tY, 0, TH + 0.6, -9);
  box(tc, 2.2, 1.6, 3, conc, 0, TH + 0.2, -14, 'counterweight');
  box(tc, 0.3, 6, 0.3, tY, 0, TH + 4.5, 0);
  [-1, 1].forEach(s => { const t = box(tc, 0.04, 0.04, 30, M.steelCable, 0, TH + 5, s * 0); });
  const tie1 = box(tc, 0.04, 0.04, 22, M.steelCable, 0, TH + 4.4, 10); tie1.rotation.x = 0.17;
  const tie2 = box(tc, 0.04, 0.04, 15, M.steelCable, 0, TH + 4.4, -7); tie2.rotation.x = -0.45;
  const sgnJ = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.1), S({ map: sign([['KRISHNA HEIGHTS', 110, 160]], 1024, 256, '#e8a50c') })); sgnJ.position.set(0.7, TH + 0.4, -9); sgnJ.rotation.y = Math.PI / 2; tc.add(sgnJ);
  const trolley = new THREE.Group(); trolley.userData.dyn = true; tc.add(trolley);
  box(trolley, 1.6, 0.5, 1.4, M.chassis, 0, TH + 0.15, 0);
  const cg = new THREE.CylinderGeometry(0.02, 0.02, 1, 6); cg.translate(0, -0.5, 0);
  const cables = [-0.2, 0.2].map(x => { const c = add(trolley, cg, M.steelCable, x, TH - 0.1, 0); c.userData.dyn = true; return c; });
  const hook = new THREE.Group(); hook.userData.dyn = true; trolley.add(hook);
  box(hook, 0.5, 0.6, 0.4, M.craneYellow, 0, 1.0, 0, 'hookBlock');
  box(hook, 8.6, 0.28, 0.22, M.craneYellow, 0, 0.35, 0, 'spreaderBeam');
  [[-1, 0.6], [1, 0.6]].forEach(([s]) => { const l = box(hook, 0.02, 1.0, 0.02, M.steelCable, s * 2.0, 0.72, 0); l.rotation.z = -s * 1.1; });
  const slingGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.62, 5);
  [-4.6, -1.6, 1.6, 4.6].forEach(x => [-1, 1].forEach(s => { const m = add(hook, slingGeo, M.steelCable, x, 0, s * 0.06); m.rotation.x = s * 0.25; }));
  const setCrane = (z, hookY) => { trolley.position.z = z + 16; hook.position.y = hookY; cables.forEach(c => c.scale.y = Math.max(0.1, TH - 0.1 - hookY - 1.3)); };
  setCrane(-2.5, 5.6);

  const update = (time, s) => {
    // s: {setup 0..1, lifting bool}
    const v = s.setup;
    cones.forEach((c, i) => { const k = Math.min(1, Math.max(0, v * 2.2 - (i % 12) * 0.08)); c.scale.setScalar(Math.max(0.001, k)); });
    chocks.forEach(c => { c.visible = v > 0.35; });
    beacons.forEach((b, i) => { beaconMat.emissiveIntensity = v > 0.1 ? 1.2 + Math.max(0, Math.sin(time * 9 + i)) * 4 : 0; });
    const signal = s.lifting ? Math.sin(time * 4) * 0.25 : 0;
    banksman.armL.rotation.x = s.lifting ? -2.6 + signal : -0.1;
    banksman.armR.rotation.x = s.lifting ? 1.2 : 0.1;
    [tagA, tagB].forEach(w => { w.armL.rotation.z = s.lifting ? 1.1 : 0; w.armR.rotation.z = s.lifting ? 1.1 : 0; });
    supervisor.armL.rotation.z = 0.5;
  };
  update(0, { setup: 0, lifting: false });
  return { group: g, update, beacons, setCrane };
}
