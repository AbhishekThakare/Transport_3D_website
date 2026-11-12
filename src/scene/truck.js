// Indian heavy-haul tractor-trailer: white cab-over 6x4 tractor (Signa-class proportions, original design)
// coupled to a 3-axle 40 ft flat platform semi-trailer.
// Metres, y-up, faces +X. Origin = rear of the trailer deck, centre line, on the ground.
// Contract used by the scene: deck top at deckY (load sits on it), wheels rotate about Z, front ≈ 15.5.
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export function buildTruck(THREE, M) {
  const g = new THREE.Group(); g.name = 'truck';
  const wheels = [];
  const P = o => new THREE.MeshPhysicalMaterial(o), S = o => new THREE.MeshStandardMaterial(o);

  // ---------- materials ----------
  const white = P({ name: 'cabWhite', color: 0xeeefeb, roughness: 0.3, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08 });
  const gloss = P({ name: 'glossBlack', color: 0x0a0b0d, roughness: 0.22, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 });
  const plastic = S({ name: 'blackPlastic', color: 0x17181a, roughness: 0.72 });
  const greyPlastic = S({ name: 'greyPlastic', color: 0x3a3d42, roughness: 0.6 });
  const trailerPaint = S({ name: 'trailerPaint', color: 0xc9cccf, roughness: 0.5, metalness: 0.35 });
  const lens = P({ name: 'lens', color: 0xe6edf2, roughness: 0.02, metalness: 0.2, clearcoat: 1, transparent: true, opacity: 0.5, depthWrite: false });
  const reflector = S({ name: 'reflector', color: 0xd6dadd, roughness: 0.1, metalness: 1 });
  const drl = S({ name: 'drl', color: 0xffffff, emissive: 0xeaf2ff, emissiveIntensity: 2.4 });
  const steelRim = S({ name: 'steelRim', color: 0xb9bdc2, roughness: 0.35, metalness: 0.8 });
  const darkHole = S({ name: 'rimHole', color: 0x050505, roughness: 1 });
  const orange = P({ name: 'stripeOrange', color: 0xe0661c, roughness: 0.3, clearcoat: 1 });
  const redLine = S({ name: 'airRed', color: 0xb3161a, roughness: 0.5 });
  const yellowLine = S({ name: 'airYellow', color: 0xe0b40f, roughness: 0.5 });
  const rubberBlack = S({ name: 'rubberSeal', color: 0x0b0b0c, roughness: 0.9 });

  // ---------- helpers ----------
  const add = (geo, mat, x, y, z, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const box = (sx, sy, sz, mat, x, y, z, parent) => add(new THREE.BoxGeometry(sx, sy, sz), mat, x, y, z, parent);
  const rbox = (sx, sy, sz, r, mat, x, y, z, parent) => add(new RoundedBoxGeometry(sx, sy, sz, 3, r), mat, x, y, z, parent);
  const cylX = (r, l, mat, x, y, z, s = 24) => { const m = add(new THREE.CylinderGeometry(r, r, l, s), mat, x, y, z); m.rotation.z = Math.PI / 2; return m; };
  const cylZ = (r, l, mat, x, y, z, s = 24) => { const m = add(new THREE.CylinderGeometry(r, r, l, s), mat, x, y, z); m.rotation.x = Math.PI / 2; return m; };
  const cylY = (r, l, mat, x, y, z, s = 20) => add(new THREE.CylinderGeometry(r, r, l, s), mat, x, y, z);
  const tube = (pts, r, mat, seg = 64) => add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 8, false), mat, 0, 0, 0);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---------- wheels (295/90 R20 radial, steel disc rims) ----------
  const R = 0.525;
  const prof = [[0.29, -0.14], [0.43, -0.152], [0.49, -0.145], [0.515, -0.12], [0.525, -0.08], [0.525, 0.08], [0.515, 0.12], [0.49, 0.145], [0.43, 0.152], [0.29, 0.14]].map(([r, y]) => new THREE.Vector2(r, y));
  const tireGeo = new THREE.LatheGeometry(prof, 56); tireGeo.rotateX(Math.PI / 2);
  const blockGeo = new THREE.BoxGeometry(0.045, 0.012, 0.085);
  const discGeo = new THREE.CylinderGeometry(0.29, 0.29, 0.22, 36); discGeo.rotateX(Math.PI / 2);
  const dishGeo = new THREE.CylinderGeometry(0.2, 0.26, 0.06, 32); dishGeo.rotateX(Math.PI / 2);
  const holeGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.23, 12); holeGeo.rotateX(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.09, 0.13, 0.1, 24); hubGeo.rotateX(Math.PI / 2);
  const nutGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.05, 6); nutGeo.rotateX(Math.PI / 2);
  const tire = (parent, o) => {
    add(tireGeo, M.rubber, 0, 0, o, parent);
    for (let i = 0; i < 44; i++) { const a = i / 44 * Math.PI * 2; [-0.05, 0.05].forEach((zz, k) => { const b = new THREE.Mesh(blockGeo, M.rubber); const aa = a + k * 0.07; b.position.set(Math.cos(aa) * 0.524, Math.sin(aa) * 0.524, o + zz); b.rotation.z = aa + Math.PI / 2; parent.add(b); }); }
  };
  const wheel = (x, z, dual) => {
    const side = Math.sign(z);
    const w = new THREE.Group(); w.userData.dyn = true; w.position.set(x, R, z); g.add(w); wheels.push(w);
    (dual ? [0, -0.32 * side] : [0]).forEach(o => tire(w, o));
    add(discGeo, steelRim, 0, 0, side * 0.01, w);
    add(dishGeo, steelRim, 0, 0, side * 0.12, w);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2; add(holeGeo, darkHole, Math.cos(a) * 0.2, Math.sin(a) * 0.2, side * 0.01, w); }
    add(hubGeo, M.chrome, 0, 0, side * 0.15, w);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; add(nutGeo, M.chrome, Math.cos(a) * 0.145, Math.sin(a) * 0.145, side * 0.16, w); }
  };

  // ======================================================================
  // TRAILER — 12.5 m flat platform, deck top at 1.55 m
  // ======================================================================
  const L = 12.5, deckY = 1.55;
  // deck plate + edge
  box(L, 0.06, 2.46, M.deck, L / 2, deckY - 0.03, 0);
  // outer side rails (C-channel look) with stake pockets, markers and reflectors
  [-1, 1].forEach(s => {
    box(L, 0.24, 0.05, trailerPaint, L / 2, deckY - 0.14, s * 1.235);
    box(L, 0.03, 0.12, trailerPaint, L / 2, deckY - 0.255, s * 1.2);
    for (let x = 0.45; x < L - 0.2; x += 0.62) { if (x > 4.9 && x < 9.9) continue; box(0.1, 0.2, 0.05, trailerPaint, x, deckY - 0.14, s * 1.27); }
    for (let x = 1.0; x < L - 0.4; x += 2.9) { box(0.12, 0.06, 0.02, M.amber, x, deckY - 0.32, s * 1.2); }
    for (let x = 1.6; x < L - 0.4; x += 1.8) if (x < 4.9 || x > 9.9) box(0.2, 0.05, 0.012, S({ name: 'reflTape', color: 0xd8e0e6, roughness: 0.15, metalness: 0.6 }), x, deckY - 0.08, s * 1.297);
    // main I-beams (web + flanges)
    box(L - 0.4, 0.42, 0.014, M.chassis, L / 2, deckY - 0.3, s * 0.5);
    box(L - 0.4, 0.016, 0.2, M.chassis, L / 2, deckY - 0.1, s * 0.5);
    box(L - 0.4, 0.016, 0.2, M.chassis, L / 2, deckY - 0.51, s * 0.5);
    // side underrun guard between landing legs and axles
    box(4.2, 0.06, 0.06, trailerPaint, 7.1, 0.75, s * 1.18); box(4.2, 0.06, 0.06, trailerPaint, 7.1, 1.0, s * 1.18);
    for (let x = 5.2; x <= 9.1; x += 1.3) box(0.05, 0.45, 0.05, M.chassis, x, 0.95, s * 1.15);
    // single long mudguard over the axle group + flaps
    box(4.2, 0.03, 0.66, plastic, 2.75, 1.16, s * 1.0);
    box(0.02, 0.5, 0.56, rubberBlack, 0.55, 0.58, s * 1.0);
  });
  // cross members
  for (let x = 0.3; x < L - 0.1; x += 0.45) box(0.08, 0.16, 2.4, M.chassis, x, deckY - 0.17, 0);
  // axles (3) with leaf-spring hangers and dual wheels
  const tAx = [1.4, 2.75, 4.1];
  tAx.forEach(x => {
    cylZ(0.07, 1.95, M.chassis, x, R, 0);
    [-1, 1].forEach(s => { box(1.1, 0.07, 0.09, M.chassis, x, 0.78, s * 0.5); box(0.12, 0.42, 0.1, M.chassis, x - 0.55, 0.88, s * 0.5); box(0.12, 0.42, 0.1, M.chassis, x + 0.55, 0.88, s * 0.5); });
    wheel(x, 1.08, true); wheel(x, -1.08, true);
  });
  // landing gear legs with sand shoes + crank
  [-1, 1].forEach(s => { box(0.13, 1.0, 0.13, trailerPaint, 9.7, 0.55, s * 0.55); box(0.36, 0.05, 0.3, M.chassis, 9.7, 0.03, s * 0.55); });
  box(0.06, 0.06, 1.1, M.chassis, 9.7, 0.7, 0); cylZ(0.02, 0.35, M.chrome, 9.7, 0.85, -0.85, 8);
  // spare wheel carrier + toolbox
  { const sp = new THREE.Group(); sp.position.set(6.4, 0.68, 0); sp.rotation.x = Math.PI / 2; g.add(sp); add(tireGeo, M.rubber, 0, 0, 0, sp); add(discGeo, steelRim, 0, 0, 0, sp); }
  rbox(0.9, 0.45, 0.45, 0.03, M.alu, 8.1, 0.95, -0.9);
  // rear end: underrun bar, light bar, chevron, number plate
  const cc = document.createElement('canvas'); cc.width = 512; cc.height = 64; const cx = cc.getContext('2d');
  cx.fillStyle = '#f2c200'; cx.fillRect(0, 0, 512, 64); cx.fillStyle = '#c4161c';
  for (let i = -2; i < 14; i++) { cx.beginPath(); cx.moveTo(i * 40, 64); cx.lineTo(i * 40 + 20, 64); cx.lineTo(i * 40 + 44, 0); cx.lineTo(i * 40 + 24, 0); cx.fill(); }
  const chev = new THREE.CanvasTexture(cc); chev.colorSpace = THREE.SRGBColorSpace;
  const chevMat = S({ name: 'chevron', map: chev, roughness: 0.3, metalness: 0.2 });
  box(0.12, 0.14, 2.3, M.chassis, 0.12, 0.55, 0); box(0.02, 0.1, 2.28, chevMat, 0.055, 0.55, 0);
  [-0.6, 0.6].forEach(z => box(0.08, 0.6, 0.08, M.chassis, 0.15, 0.85, z));
  box(0.05, 0.22, 2.4, M.chassis, 0.02, 1.22, 0);
  box(0.02, 0.12, 0.9, chevMat, -0.008, 1.22, 0);
  [-1, 1].forEach(s => {
    box(0.06, 0.16, 0.38, plastic, -0.015, 1.22, s * 0.95);
    box(0.02, 0.1, 0.1, M.taillight, -0.05, 1.22, s * 1.08); box(0.02, 0.1, 0.1, M.amber, -0.05, 1.22, s * 0.96); box(0.02, 0.1, 0.1, M.headlight, -0.05, 1.22, s * 0.84);
  });
  box(0.02, 0.15, 0.5, S({ name: 'plate', color: 0xf2c200, roughness: 0.5 }), -0.02, 0.95, 0);

  // ======================================================================
  // TRACTOR — 6x4, front axle 14.55, rear tandem 10.35 / 11.65, fifth wheel 11.25
  // ======================================================================
  const fAx = 14.55, rAx = [10.35, 11.65];
  // chassis rails + cross members
  [-1, 1].forEach(s => { box(5.3, 0.28, 0.08, M.chassis, 12.6, 0.98, s * 0.43); box(5.3, 0.03, 0.15, M.chassis, 12.6, 1.12, s * 0.43); });
  for (let x = 10.2; x < 15.2; x += 0.9) box(0.08, 0.2, 0.8, M.chassis, x, 0.98, 0);
  // fifth wheel (coupling plate) + kingpin under the trailer
  cylY(0.48, 0.07, gloss, 11.25, 1.17, 0, 32); box(1.0, 0.12, 0.8, M.chassis, 11.25, 1.08, 0);
  cylY(0.06, 0.12, M.chrome, 11.25, 1.24, 0, 12);
  box(1.6, 0.04, 2.2, M.chassis, 11.6, deckY - 0.53, 0); // trailer's upper coupler plate
  // axles + wheels
  rAx.forEach(x => { cylZ(0.08, 1.9, M.chassis, x, R, 0); cylY(0.18, 0.25, M.chassis, x, R, 0, 16); wheel(x, 1.07, true); wheel(x, -1.07, true); });
  cylZ(0.07, 1.95, M.chassis, fAx, R, 0); wheel(fAx, 1.08, false); wheel(fAx, -1.08, false);
  [-1, 1].forEach(s => {
    // leaf springs
    rAx.forEach(x => box(1.0, 0.07, 0.1, M.chassis, x, 0.8, s * 0.45));
    box(1.2, 0.07, 0.1, M.chassis, fAx, 0.82, s * 0.45);
    // rear quarter fenders over the tandem + flaps
    box(2.2, 0.03, 0.62, plastic, 11.0, 1.16, s * 1.0);
    box(0.03, 0.12, 0.62, plastic, 9.9, 1.1, s * 1.0); box(0.03, 0.12, 0.62, plastic, 12.1, 1.1, s * 1.0);
    box(0.02, 0.45, 0.55, rubberBlack, 9.75, 0.6, s * 1.0);
  });
  // fuel tank (left), battery box + air tanks (right), DEF tank
  cylX(0.33, 1.1, M.alu, 12.75, 0.82, 0.9, 40); [12.3, 13.2].forEach(x => box(0.04, 0.05, 0.72, M.chassis, x, 1.14, 0.9));
  cylY(0.06, 0.1, M.chrome, 12.95, 1.18, 0.9, 12);
  rbox(0.75, 0.5, 0.5, 0.03, M.chassis, 12.8, 0.88, -0.92);
  cylX(0.13, 0.9, M.chassis, 10.2, 0.68, 0.72); cylX(0.13, 0.9, M.chassis, 10.2, 0.68, -0.72);
  rbox(0.4, 0.42, 0.35, 0.04, S({ name: 'defTank', color: 0x2f5aa8, roughness: 0.5 }), 13.35, 0.9, -0.9);
  // exhaust + heat shield (right, behind cab)
  cylX(0.07, 1.2, M.chassis, 12.2, 0.62, -0.72, 16);
  // air intake snorkel behind cab (left)
  cylY(0.13, 1.9, plastic, 13.05, 2.4, 1.0, 24); rbox(0.36, 0.22, 0.3, 0.05, plastic, 13.08, 3.42, 1.0);
  // catwalk deck plate behind cab
  box(0.55, 0.04, 1.6, M.plate, 13.0, 1.3, 0);
  // air + electric lines cab -> trailer (coiled suzies)
  const coil = (z, mat, ph) => { const pts = []; for (let i = 0; i <= 60; i++) { const t = i / 60; const x = 13.05 - t * 0.55; const y = 1.75 - Math.sin(t * Math.PI) * 0.25 - t * 0.18; pts.push(V(x + Math.cos(t * 26 + ph) * 0.05, y + Math.sin(t * 26 + ph) * 0.05, z)); } tube(pts, 0.012, mat, 260); };
  coil(-0.25, redLine, 0); coil(0, yellowLine, 1.5); coil(0.25, plastic, 3);

  // ---------- cab body (smooth, rounded panels) ----------
  const sh = new THREE.Shape();
  sh.moveTo(13.25, 1.45); sh.lineTo(15.34, 1.45); sh.lineTo(15.38, 2.22);
  sh.lineTo(15.23, 3.03); sh.quadraticCurveTo(15.18, 3.24, 14.96, 3.25);
  sh.lineTo(13.42, 3.25); sh.quadraticCurveTo(13.25, 3.25, 13.25, 3.08); sh.lineTo(13.25, 1.45);
  const cabGeo = new THREE.ExtrudeGeometry(sh, { depth: 2.28, bevelEnabled: true, bevelThickness: 0.11, bevelSize: 0.11, bevelSegments: 8, curveSegments: 20 });
  cabGeo.translate(0, 0, -1.14);
  add(cabGeo, white, 0, 0, 0);
  // front surface helper: x on the windscreen plane for a given height
  const rake = Math.atan2(15.38 - 15.23, 3.03 - 2.22); // ~0.183 rad
  const fx = (y) => 15.49 - (y - 2.22) * Math.tan(rake);
  // windscreen (one piece) + black surround + wipers
  const ws = box(0.03, 0.74, 2.2, M.glass, fx(2.64) + 0.012, 2.64, 0); ws.rotation.z = rake;
  const wsr = box(0.025, 0.84, 2.32, rubberBlack, fx(2.64) + 0.002, 2.64, 0); wsr.rotation.z = rake;
  [-0.55, 0.45].forEach(z => { const w = box(0.02, 0.85, 0.022, plastic, fx(2.3) + 0.03, 2.3, z + 0.3); w.rotation.set(1.3, 0, rake); });
  // sun visor + roof marker lamps + roof air horns
  const vis = rbox(0.34, 0.06, 2.42, 0.02, gloss, fx(3.15) + 0.05, 3.2, 0); vis.rotation.z = -0.12;
  [-0.85, -0.45, 0.45, 0.85].forEach(z => box(0.05, 0.05, 0.12, M.amber, fx(3.15) + 0.2, 3.18, z));
  [-0.3, 0.3].forEach(z => cylX(0.035, 0.45, M.chrome, 14.3, 3.4, z, 12));
  // black A-pillar / corner deflectors
  [-1, 1].forEach(s => { const d = box(0.3, 0.86, 0.06, gloss, fx(2.66) - 0.12, 2.66, s * 1.2); d.rotation.z = rake; });
  // lower front: grille band with chrome bars + KRL diamond, upper body-colour panel with name
  const mc = document.createElement('canvas'); mc.width = 256; mc.height = 64; const mx = mc.getContext('2d');
  mx.fillStyle = '#08090a'; mx.fillRect(0, 0, 256, 64); mx.fillStyle = '#2a2d31';
  for (let y = 0; y < 64; y += 6) for (let x = (y / 6) % 2 * 3; x < 256; x += 6) mx.fillRect(x, y, 3, 3);
  const meshT = new THREE.CanvasTexture(mc); meshT.colorSpace = THREE.SRGBColorSpace; meshT.wrapS = meshT.wrapT = THREE.RepeatWrapping; meshT.repeat.set(4, 1.4);
  rbox(0.06, 0.52, 1.84, 0.02, S({ name: 'grilleMesh', map: meshT, roughness: 0.6, metalness: 0.4 }), 15.5, 1.9, 0);
  [1.74, 1.9, 2.06].forEach(y => rbox(0.03, 0.035, 1.7, 0.01, M.chrome, 15.535, y, 0));
  const em = box(0.04, 0.17, 0.17, orange, 15.55, 1.9, 0); em.rotation.x = Math.PI / 4;
  add(new THREE.TorusGeometry(0.14, 0.014, 8, 32), M.chrome, 15.555, 1.9, 0).rotation.y = Math.PI / 2;
  // black lower-corner panels framing the grille
  [-1, 1].forEach(s => rbox(0.06, 0.6, 0.3, 0.03, gloss, 15.49, 1.86, s * 1.08));
  // bumper with headlamp clusters
  rbox(0.32, 0.5, 2.5, 0.06, greyPlastic, 15.46, 1.2, 0);
  box(0.02, 0.04, 2.3, M.chrome, 15.625, 1.43, 0);
  [-1, 1].forEach(s => {
    rbox(0.06, 0.24, 0.5, 0.03, gloss, 15.6, 1.32, s * 0.88);
    box(0.03, 0.17, 0.2, reflector, 15.62, 1.32, s * 0.78); box(0.03, 0.17, 0.18, reflector, 15.62, 1.32, s * 0.99);
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 24), M.headlight, 15.64, 1.32, s * 0.78).rotation.z = Math.PI / 2;
    box(0.02, 0.1, 0.12, M.headlight, 15.64, 1.32, s * 0.99);
    box(0.03, 0.19, 0.46, lens, 15.635, 1.32, s * 0.88);
    box(0.02, 0.022, 0.44, drl, 15.645, 1.44, s * 0.88);
    box(0.03, 0.08, 0.07, M.amber, 15.63, 1.32, s * 1.17);
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 20), M.headlight, 15.625, 1.06, s * 0.95).rotation.z = Math.PI / 2;
    rbox(0.05, 0.12, 0.16, 0.02, gloss, 15.6, 1.06, s * 0.95);
  });
  box(0.02, 0.15, 0.5, S({ name: 'plate', color: 0xf2c200, roughness: 0.5 }), 15.63, 1.07, 0);
  box(0.25, 0.1, 2.0, M.chassis, 15.35, 0.9, 0); // front underrun
  rbox(0.05, 0.12, 0.6, 0.02, greyPlastic, 15.6, 0.95, 0); // tow pin cover
  // wheel arches (black) over the front axle
  const arch = new THREE.CylinderGeometry(0.66, 0.66, 0.42, 32, 1, true, 0, Math.PI);
  [-1, 1].forEach(s => { const a = add(arch, plastic, fAx, R + 0.02, s * 1.06); a.rotation.set(Math.PI / 2, 0, -Math.PI / 2); });

  // ---------- cab sides: windows, panel lines, handles, steps, mirrors ----------
  const gap = S({ name: 'panelGap', color: 0x2c2f33, roughness: 0.8 });
  [-1, 1].forEach(s => {
    const z = s * 1.252;
    // door window (front edge follows the rake) + quarter window
    const dw = new THREE.Shape(); dw.moveTo(0, 0); dw.lineTo(0.95, 0); dw.lineTo(0.95 + 0.12, 0.66); dw.lineTo(0, 0.66); dw.closePath();
    const dwg = new THREE.ShapeGeometry(dw); dwg.translate(14.12, 2.36, 0);
    // plane faces +Z; mirroring with scale.z = -1 makes the left-hand copy face -Z
    const win = add(dwg, M.glass, 0, 0, z + s * 0.004); win.scale.z = s;
    const surround = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.76), rubberBlack); surround.position.set(14.64, 2.69, z + s * 0.002); surround.rotation.y = s < 0 ? Math.PI : 0; g.add(surround);
    box(0.42, 0.5, 0.012, M.glass, 13.62, 2.72, z);
    // door panel gaps, handle, grab handle, mirror-arm base
    box(0.012, 1.65, 0.012, gap, 13.98, 2.15, z); box(0.012, 1.0, 0.012, gap, 15.12, 1.85, z);
    box(1.15, 0.012, 0.012, gap, 14.55, 1.36, z);
    box(0.16, 0.04, 0.04, M.chrome, 14.1, 2.2, z + s * 0.02);
    box(0.03, 0.75, 0.03, M.chrome, 13.92, 2.05, z + s * 0.035);
    // orange stripe + logo decal on the door
    box(2.0, 0.045, 0.012, orange, 14.2, 2.28, z + s * 0.003);
    // steps behind the front wheel
    box(0.42, 0.04, 0.24, M.plate, 13.6, 0.62, s * 1.12); box(0.42, 0.04, 0.24, M.plate, 13.6, 1.0, s * 1.12);
    box(0.04, 0.48, 0.24, plastic, 13.38, 0.8, s * 1.12); box(0.04, 0.48, 0.24, plastic, 13.82, 0.8, s * 1.12);
    // side indicator + mirrors on long arms
    box(0.08, 0.05, 0.02, M.amber, 15.1, 1.62, z + s * 0.01);
    box(0.03, 0.03, 0.42, plastic, 15.15, 3.0, s * 1.42); box(0.03, 0.03, 0.42, plastic, 15.15, 2.1, s * 1.42);
    box(0.03, 1.0, 0.03, plastic, 15.17, 2.55, s * 1.62);
    rbox(0.14, 0.52, 0.27, 0.03, plastic, 15.22, 2.75, s * 1.62); box(0.01, 0.46, 0.22, M.chrome, 15.145, 2.75, s * 1.62);
    rbox(0.13, 0.24, 0.24, 0.03, plastic, 15.22, 2.28, s * 1.62); box(0.01, 0.2, 0.2, M.chrome, 15.145, 2.28, s * 1.62);
  });
  // company logo decals on cab doors
  const logoTex = new THREE.TextureLoader().load('/assets/logo-full.png'); logoTex.colorSpace = THREE.SRGBColorSpace; logoTex.anisotropy = 8;
  const decal = S({ name: 'logoDecal', map: logoTex, transparent: true, roughness: 0.35, alphaTest: 0.05 });
  [-1, 1].forEach(s => { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.66), decal); p.position.set(14.55, 1.8, s * 1.258); p.rotation.y = s < 0 ? Math.PI : 0; g.add(p); });
  // name on the upper front panel
  const c3 = document.createElement('canvas'); c3.width = 512; c3.height = 64; const x3 = c3.getContext('2d');
  x3.font = 'bold 40px Arial'; x3.fillStyle = '#2b2d31'; x3.textAlign = 'center'; x3.fillText('KRISHNA ROADLINES', 256, 46);
  const t3 = new THREE.CanvasTexture(c3); t3.colorSpace = THREE.SRGBColorSpace;
  const fp = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.17), S({ map: t3, transparent: true })); fp.position.set(fx(2.22) + 0.004, 2.2, 0); fp.scale.set(0.75, 0.75, 1); fp.rotation.y = Math.PI / 2; g.add(fp);
  // trailer side lettering on the rails
  const c2 = document.createElement('canvas'); c2.width = 1024; c2.height = 64; const x4 = c2.getContext('2d');
  x4.fillStyle = '#1d2a3a'; x4.font = 'bold 42px Arial'; x4.fillText('KRISHNA ROADLINES  ·  PAN INDIA  ·  GJ 01 KR 4021', 10, 46);
  const t2 = new THREE.CanvasTexture(c2); t2.colorSpace = THREE.SRGBColorSpace;
  const txt = S({ map: t2, transparent: true });
  [-1, 1].forEach(s => { const p = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.14), txt); p.position.set(7.4, deckY - 0.14, s * 1.262); p.rotation.y = s < 0 ? Math.PI : 0; g.add(p); });

  return { group: g, wheels, deckY, R, front: 15.6 };
}
