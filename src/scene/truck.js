// Modern Indian rigid platform truck (cab-over, twin-steer 10-wheeler) — original design, realistic proportions.
// Meters, y-up, faces +X, origin = rear of platform body, centre, on ground.
export function buildTruck(THREE, M) {
  const g = new THREE.Group(); g.name = 'truck';
  const wheels = [];
  const P = o => new THREE.MeshPhysicalMaterial(o), S = o => new THREE.MeshStandardMaterial(o);
  const white = P({ name: 'cabWhite', color: 0xf1f1ec, roughness: 0.28, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.06 });
  const gloss = P({ name: 'glossBlack', color: 0x0b0c0e, roughness: 0.18, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 });
  const plastic = S({ name: 'textPlastic', color: 0x2a2c30, roughness: 0.75 });
  const orange = P({ name: 'stripeOrange', color: 0xe0661c, roughness: 0.3, clearcoat: 1 });
  const bodyRed = S({ name: 'bodyRed', color: 0x9e3a1c, roughness: 0.55, metalness: 0.4 });
  const lens = P({ name: 'lens', color: 0xdfe6ea, roughness: 0.02, metalness: 0.1, transmission: 0.6, thickness: 0.02, transparent: true, opacity: 0.85 });
  const reflector = S({ name: 'reflector', color: 0xcfd3d6, roughness: 0.12, metalness: 1 });
  const drl = S({ name: 'drl', color: 0xffffff, emissive: 0xeaf2ff, emissiveIntensity: 2.2 });
  const steelRim = S({ name: 'steelRim', color: 0xa9adb2, roughness: 0.38, metalness: 0.85 });
  const darkHole = S({ name: 'rimHole', color: 0x050505, roughness: 1 });
  const add = (geo, mat, x, y, z, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const box = (sx, sy, sz, mat, x, y, z, parent) => add(new THREE.BoxGeometry(sx, sy, sz), mat, x, y, z, parent);
  const cylX = (r, l, mat, x, y, z, s = 24) => { const m = add(new THREE.CylinderGeometry(r, r, l, s), mat, x, y, z); m.rotation.z = Math.PI / 2; return m; };
  const cylZ = (r, l, mat, x, y, z, s = 24) => { const m = add(new THREE.CylinderGeometry(r, r, l, s), mat, x, y, z); m.rotation.x = Math.PI / 2; return m; };

  // ---------- wheels ----------
  const R = 0.525;
  const prof = [[0.29, -0.14], [0.43, -0.152], [0.49, -0.145], [0.515, -0.12], [0.525, -0.08], [0.525, 0.08], [0.515, 0.12], [0.49, 0.145], [0.43, 0.152], [0.29, 0.14]].map(([r, y]) => new THREE.Vector2(r, y));
  const tireGeo = new THREE.LatheGeometry(prof, 56); tireGeo.rotateX(Math.PI / 2);
  const blockGeo = new THREE.BoxGeometry(0.045, 0.012, 0.085);
  const discGeo = new THREE.CylinderGeometry(0.29, 0.29, 0.22, 36); discGeo.rotateX(Math.PI / 2);
  const holeGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.23, 12); holeGeo.rotateX(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.09, 0.13, 0.1, 24); hubGeo.rotateX(Math.PI / 2);
  const nutGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.05, 6); nutGeo.rotateX(Math.PI / 2);
  const tire = (parent, o) => {
    add(tireGeo, M.rubber, 0, 0, o, parent);
    for (let i = 0; i < 44; i++) { const a = i / 44 * Math.PI * 2; [-0.05, 0.05].forEach((zz, k) => { const b = new THREE.Mesh(blockGeo, M.rubber); const aa = a + k * 0.07; b.position.set(Math.cos(aa) * 0.524, Math.sin(aa) * 0.524, o + zz); b.rotation.z = aa + Math.PI / 2; parent.add(b); }); }
  };
  const wheel = (x, z, dual) => {
    const side = Math.sign(z);
    const w = new THREE.Group(); w.position.set(x, R, z); g.add(w); wheels.push(w);
    const offs = dual ? [0, -0.32 * side] : [0];
    offs.forEach(o => tire(w, o));
    const disc = add(discGeo, steelRim, 0, 0, side * 0.01, w);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2; add(holeGeo, darkHole, Math.cos(a) * 0.2, Math.sin(a) * 0.2, side * 0.01, w); }
    add(hubGeo, M.chrome, 0, 0, side * 0.12, w);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; add(nutGeo, M.chrome, Math.cos(a) * 0.145, Math.sin(a) * 0.145, side * 0.13, w); }
    return w;
  };

  // ---------- chassis ----------
  [-1, 1].forEach(s => { box(14.6, 0.3, 0.08, M.chassis, 7.5, 0.98, s * 0.43); box(14.6, 0.03, 0.16, M.chassis, 7.5, 1.13, s * 0.43); });
  for (let x = 1; x < 14.5; x += 1.6) box(0.1, 0.22, 0.8, M.chassis, x, 0.98, 0);
  const axles = [[4.7, true], [6.05, true], [11.75, false], [14.15, false]];
  axles.forEach(([x, d]) => { cylZ(0.075, 1.9, M.chassis, x, R, 0); box(0.9, 0.08, 0.12, M.chassis, x, 0.78, 0.5); box(0.9, 0.08, 0.12, M.chassis, x, 0.78, -0.5); wheel(x, d ? 1.07 : 1.06, d); wheel(x, d ? -1.07 : -1.06, d); });

  // ---------- platform body (12.2 m) ----------
  const L = 12.2, deckY = 1.55;
  box(L, 0.1, 2.5, M.deck, L / 2, deckY - 0.05, 0);
  [-1, 1].forEach(s => {
    box(L, 0.22, 0.07, bodyRed, L / 2, deckY - 0.11, s * 1.235);
    for (let x = 0.35; x < L - 0.2; x += 0.7) box(0.07, 0.2, 0.05, bodyRed, x, deckY - 0.11, s * 1.285);
    box(L - 0.4, 0.28, 0.06, bodyRed, L / 2, 1.27, s * 0.62);
    // side underrun guard
    box(4.0, 0.07, 0.05, M.hazard, 8.9, 0.68, s * 1.17); box(4.0, 0.07, 0.05, M.hazard, 8.9, 0.95, s * 1.17);
    for (let x = 7.0; x <= 10.9; x += 1.3) box(0.05, 0.36, 0.05, M.chassis, x, 0.82, s * 1.14);
    // mudguards + flaps
    const mg = add(new THREE.CylinderGeometry(0.6, 0.6, 0.66, 28, 1, true, 0, Math.PI), plastic, 5.38, R, s * 1.0); mg.rotation.set(Math.PI / 2, 0, -Math.PI / 2); mg.scale.set(1, 1, 1);
    box(2.0, 0.03, 0.66, plastic, 5.38, 1.14, s * 1.0);
    box(0.02, 0.48, 0.5, plastic, 3.85, 0.52, s * 0.98); box(0.02, 0.48, 0.5, plastic, 11.0, 0.52, s * 1.0);
    // rear lamps
    box(0.06, 0.16, 0.36, plastic, -0.02, 1.2, s * 0.98);
    box(0.02, 0.1, 0.1, M.taillight, -0.055, 1.2, s * 1.1); box(0.02, 0.1, 0.1, M.amber, -0.055, 1.2, s * 0.98); box(0.02, 0.1, 0.1, M.headlight, -0.055, 1.2, s * 0.86);
  });
  for (let x = 0.4; x < L - 0.2; x += 0.55) box(0.07, 0.12, 2.36, M.trailer, x, 1.38, 0);
  // rear chevron panel + underrun bar
  const cc = document.createElement('canvas'); cc.width = 512; cc.height = 64; const cx = cc.getContext('2d');
  cx.fillStyle = '#f2c200'; cx.fillRect(0, 0, 512, 64); cx.fillStyle = '#c4161c';
  for (let i = -2; i < 14; i++) { cx.beginPath(); cx.moveTo(i * 40, 64); cx.lineTo(i * 40 + 20, 64); cx.lineTo(i * 40 + 44, 0); cx.lineTo(i * 40 + 24, 0); cx.fill(); }
  const chev = new THREE.CanvasTexture(cc); chev.colorSpace = THREE.SRGBColorSpace;
  box(0.03, 0.2, 1.4, S({ name: 'chevron', map: chev, roughness: 0.3, metalness: 0.2 }), -0.02, 1.43, 0);
  box(0.12, 0.14, 2.3, M.chassis, 0.1, 0.52, 0); box(0.02, 0.1, 2.3, S({ map: chev, roughness: 0.3 }), 0.035, 0.52, 0);
  // headboard (ladder rack)
  [-1.18, 1.18].forEach(z => box(0.1, 1.35, 0.1, bodyRed, L - 0.12, deckY + 0.67, z));
  box(0.1, 0.1, 2.46, bodyRed, L - 0.12, deckY + 1.33, 0);
  for (let z = -0.9; z <= 0.91; z += 0.3) box(0.05, 1.25, 0.04, bodyRed, L - 0.12, deckY + 0.63, z);
  // fuel tank, battery box, air tanks behind cab
  cylX(0.3, 1.3, M.alu, 10.1, 0.82, -0.88, 36); box(1.3, 0.04, 0.05, M.chassis, 10.1, 1.12, -0.88);
  box(0.8, 0.5, 0.55, M.chassis, 10.1, 0.86, 0.92);
  cylX(0.14, 1.1, M.chassis, 8.6, 0.72, 0.85); cylX(0.14, 1.1, M.chassis, 8.6, 0.72, -0.85);
  const ex = add(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 16), M.chassis, 12.55, 0.7, -0.75); ex.rotation.z = Math.PI / 2;

  // ---------- cab ----------
  const sh = new THREE.Shape();
  sh.moveTo(12.72, 1.18); sh.lineTo(15.22, 1.18); sh.lineTo(15.27, 2.45);
  sh.lineTo(15.2, 3.55); sh.quadraticCurveTo(15.18, 3.74, 14.95, 3.76); sh.lineTo(12.85, 3.76); sh.quadraticCurveTo(12.72, 3.76, 12.72, 3.62); sh.lineTo(12.72, 1.18);
  const cabGeo = new THREE.ExtrudeGeometry(sh, { depth: 2.26, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 6, curveSegments: 16 });
  cabGeo.translate(0, 0, -1.13);
  add(cabGeo, white, 0, 0, 0);
  // windscreen — large, near-vertical
  const ws = box(0.04, 1.12, 2.24, M.glass, 15.335, 3.0, 0); ws.rotation.z = 0.064;
  const wsr = box(0.035, 1.2, 2.34, gloss, 15.322, 3.0, 0); wsr.rotation.z = 0.064;
  [-0.5, 0.42].forEach(z => { const wp = box(0.02, 0.9, 0.02, plastic, 15.37, 2.62, z); wp.rotation.set(1.25, 0, 0.064); });
  // roof visor with marker lamps
  box(0.3, 0.07, 2.4, white, 15.2, 3.68, 0);
  [-0.95, 0.95].forEach(z => box(0.04, 0.05, 0.14, M.amber, 15.36, 3.66, z));
  // white upper fascia + louvre under the screen
  box(0.05, 0.36, 2.36, white, 15.31, 2.25, 0);
  for (let i = 0; i < 5; i++) box(0.04, 0.025, 0.42, gloss, 15.34, 2.17 + i * 0.045, 0);
  [-0.78, 0.78].forEach(z => box(0.055, 0.85, 0.012, gloss, 15.3, 1.95, z));
  // black mesh grille band + own emblem
  const mc = document.createElement('canvas'); mc.width = 256; mc.height = 64; const mx = mc.getContext('2d');
  mx.fillStyle = '#0a0b0c'; mx.fillRect(0, 0, 256, 64); mx.fillStyle = '#2b2e33';
  for (let y = 0; y < 64; y += 6) for (let x = (y / 6) % 2 * 3; x < 256; x += 6) mx.fillRect(x, y, 3, 3);
  const meshT = new THREE.CanvasTexture(mc); meshT.colorSpace = THREE.SRGBColorSpace; meshT.wrapS = meshT.wrapT = THREE.RepeatWrapping; meshT.repeat.set(3, 1);
  box(0.05, 0.3, 1.5, S({ name: 'grilleMesh', map: meshT, roughness: 0.6, metalness: 0.4 }), 15.33, 1.88, 0);
  const em = box(0.03, 0.15, 0.15, orange, 15.37, 2.03, 0); em.rotation.x = Math.PI / 4;
  add(new THREE.TorusGeometry(0.13, 0.014, 8, 32), M.chrome, 15.365, 2.03, 0).rotation.y = Math.PI / 2;
  // side cheek panels
  [-1, 1].forEach(s => { box(0.05, 0.55, 0.42, white, 15.3, 1.86, s * 1.0); box(0.03, 0.04, 0.4, gloss, 15.33, 1.62, s * 1.0); });
  // black bumper with rectangular lamp units
  box(0.3, 0.48, 2.5, plastic, 15.33, 1.3, 0);
  box(0.02, 0.05, 2.3, gloss, 15.485, 1.52, 0);
  [-1, 1].forEach(s => {
    box(0.04, 0.2, 0.44, gloss, 15.48, 1.34, s * 0.9);
    box(0.03, 0.15, 0.18, reflector, 15.495, 1.34, s * 0.8); box(0.03, 0.15, 0.16, reflector, 15.495, 1.34, s * 1.0);
    add(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 24), M.headlight, 15.51, 1.34, s * 0.8).rotation.z = Math.PI / 2;
    box(0.02, 0.1, 0.1, M.headlight, 15.51, 1.34, s * 1.0);
    box(0.03, 0.16, 0.42, lens, 15.505, 1.34, s * 0.9);
    box(0.02, 0.02, 0.4, drl, 15.515, 1.45, s * 0.9);
    box(0.03, 0.08, 0.06, M.amber, 15.5, 1.34, s * 1.16);
    add(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 20), M.headlight, 15.49, 1.14, s * 0.92).rotation.z = Math.PI / 2;
  });
  box(0.02, 0.15, 0.5, S({ name: 'plate', color: 0xf2c200, roughness: 0.5 }), 15.49, 1.13, 0);
  box(0.25, 0.1, 1.6, plastic, 15.28, 0.98, 0);
  // wheel arches
  const arch = new THREE.CylinderGeometry(0.67, 0.67, 0.5, 32, 1, true, 0, Math.PI);
  [-1, 1].forEach(s => { const a = add(arch, plastic, 14.15, R, s * 1.04); a.rotation.set(Math.PI / 2, 0, -Math.PI / 2); });
  // cab sides
  [-1, 1].forEach(s => {
    const z = s * 1.232;
    box(1.3, 0.8, 0.03, M.glass, 14.5, 2.98, z);
    box(1.35, 0.86, 0.025, gloss, 14.5, 2.98, s * 1.228);
    box(0.35, 0.45, 0.03, M.glass, 13.1, 3.05, z);
    box(0.012, 2.1, 0.012, gloss, 13.72, 2.3, s * 1.234); box(1.6, 0.012, 0.012, gloss, 14.55, 1.3, s * 1.234);
    box(0.16, 0.04, 0.04, plastic, 13.95, 2.45, s * 1.25);
    box(2.55, 0.05, 0.02, orange, 14.0, 2.42, s * 1.233);
    box(0.04, 0.9, 0.04, M.chrome, 13.62, 2.35, s * 1.27);
    box(0.4, 0.08, 0.26, plastic, 13.3, 0.95, s * 1.12); box(0.4, 0.08, 0.26, plastic, 13.3, 0.58, s * 1.12);
    box(0.04, 0.5, 0.04, plastic, 13.12, 0.78, s * 1.22); box(0.04, 0.5, 0.04, plastic, 13.48, 0.78, s * 1.22);
    box(0.05, 0.06, 0.12, M.amber, 15.1, 1.62, s * 1.25);
    // mirrors
    box(0.03, 0.03, 0.42, plastic, 15.25, 3.45, s * 1.42); box(0.03, 0.03, 0.42, plastic, 15.25, 2.2, s * 1.42);
    box(0.03, 1.28, 0.03, plastic, 15.27, 2.82, s * 1.62);
    box(0.14, 0.56, 0.26, plastic, 15.33, 3.1, s * 1.62); box(0.01, 0.5, 0.21, M.chrome, 15.26, 3.1, s * 1.62);
    box(0.13, 0.3, 0.24, plastic, 15.33, 2.48, s * 1.62); box(0.01, 0.25, 0.2, M.chrome, 15.26, 2.48, s * 1.62);
  });
  // roof marker lights + sun visor
  
  // company logo decals on cab doors
  const logoTex = new THREE.TextureLoader().load('/assets/logo-full.png'); logoTex.colorSpace = THREE.SRGBColorSpace; logoTex.anisotropy = 8;
  const decal = S({ name: 'logoDecal', map: logoTex, transparent: true, roughness: 0.35, alphaTest: 0.05 });
  [-1, 1].forEach(s => { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.78), decal); p.position.set(14.35, 1.82, s * 1.247); p.rotation.y = s < 0 ? Math.PI : 0; g.add(p); });
  const c3 = document.createElement('canvas'); c3.width = 512; c3.height = 64; const x3 = c3.getContext('2d');
  x3.font = 'bold 40px Arial'; x3.fillStyle = '#f1f1ec'; x3.textAlign = 'center'; x3.fillText('KRISHNA ROADLINES', 256, 46);
  const t3 = new THREE.CanvasTexture(c3); t3.colorSpace = THREE.SRGBColorSpace;
  const fp = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.17), S({ map: t3, transparent: true })); fp.position.set(15.34, 2.38, 0); fp.scale.set(0.7, 0.7, 1); fp.rotation.y = Math.PI / 2; g.add(fp);
  const c2 = document.createElement('canvas'); c2.width = 1024; c2.height = 64; const x4 = c2.getContext('2d');
  x4.fillStyle = '#f1f1ec'; x4.font = 'bold 42px Arial'; x4.fillText('KRISHNA ROADLINES  ·  PAN INDIA  ·  GJ 01 KR 4021', 10, 46);
  const t2 = new THREE.CanvasTexture(c2); t2.colorSpace = THREE.SRGBColorSpace;
  const txt = S({ map: t2, transparent: true });
  [-1, 1].forEach(s => { const p = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 0.15), txt); p.position.set(6.1, 1.44, s * 1.272); p.rotation.y = s < 0 ? Math.PI : 0; g.add(p); });

  return { group: g, wheels, deckY, R, front: 15.47 };
}
