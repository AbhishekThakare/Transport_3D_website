// Materials + procedural canvas textures (real-world PBR-ish values)
export function buildMats(THREE, renderer, pbr) {
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (cv, rx = 1, ry = 1, srgb = true) => {
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = aniso;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const noise = (ctx, w, h, base, amp, n, size = 1) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      const v = (Math.random() - 0.5) * amp;
      ctx.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, size * (0.5 + Math.random()), size * (0.5 + Math.random()));
    }
  };

  // road lane markings (transparent overlay; the asphalt itself is a real PBR scan)
  const rc = canvas(1024, 512), rx = rc.getContext('2d');
  rx.fillStyle = 'rgba(235,235,225,.85)';
  rx.fillRect(0, 24, 1024, 8); rx.fillRect(0, 480, 1024, 8);
  rx.fillStyle = 'rgba(240,200,60,.85)'; rx.fillRect(0, 250, 1024, 6); rx.fillRect(0, 260, 1024, 6);
  rx.fillStyle = 'rgba(235,235,225,.8)';
  for (let x = 0; x < 1024; x += 256) { rx.fillRect(x, 136, 150, 6); rx.fillRect(x, 372, 150, 6); }
  // worn paint: punch random holes into the markings
  rx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 9000; i++) { rx.fillStyle = `rgba(0,0,0,${Math.random() * 0.6})`; rx.fillRect(Math.random() * 1024, Math.random() * 512, 1 + Math.random() * 3, 1 + Math.random() * 2); }
  rx.globalCompositeOperation = 'source-over';
  const roadMap = tex(rc, 1, 1); roadMap.wrapT = THREE.ClampToEdgeWrapping;

  // checker plate
  const pc = canvas(256, 256), px = pc.getContext('2d');
  noise(px, 256, 256, '#6d7074', 0.15, 8000, 1.5);
  for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 32) {
    px.save(); px.translate(x + 16 + ((y / 32) % 2) * 0, y + 16); px.rotate(((x + y) / 32) % 2 ? 0.785 : -0.785);
    px.fillStyle = 'rgba(210,210,215,.5)'; px.fillRect(-9, -2.5, 18, 5); px.restore();
  }
  const plateMap = tex(pc, 1, 1);

  // corrugated container side
  const ctc = (color, text) => {
    const c = canvas(1024, 256), x = c.getContext('2d');
    x.fillStyle = color; x.fillRect(0, 0, 1024, 256);
    for (let i = 0; i < 1024; i += 16) { const g = x.createLinearGradient(i, 0, i + 16, 0); g.addColorStop(0, 'rgba(0,0,0,.28)'); g.addColorStop(.5, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(0,0,0,.28)'); x.fillStyle = g; x.fillRect(i, 0, 16, 256); }
    noise(x, 0, 0, color, 0, 0); for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(60,30,10,${Math.random() * .12})`; x.fillRect(Math.random() * 1024, Math.random() * 256, 2, 2 + Math.random() * 8); }
    x.font = 'bold 54px Arial'; x.fillStyle = 'rgba(255,255,255,.92)'; x.fillText(text, 60, 96);
    x.font = 'bold 22px monospace'; x.fillText('KRLU 402118 4  · 45G1', 62, 132);
    return tex(c, 1, 1);
  };
  const containerMap = ctc('#c4561a', 'KRISHNA ROADLINES');

  // tyre tread (normal-ish via bump)
  const tc = canvas(64, 512), tx = tc.getContext('2d');
  tx.fillStyle = '#888'; tx.fillRect(0, 0, 64, 512); tx.fillStyle = '#222';
  for (let y = 0; y < 512; y += 16) { tx.fillRect(4, y, 22, 7); tx.fillRect(38, y + 8, 22, 7); }
  tx.fillRect(29, 0, 6, 512);
  const treadBump = tex(tc, 1, 1, false);

  // sign
  const signTex = (lines, w = 1024, h = 256, bg = '#0f3d2a') => {
    const c = canvas(w, h), x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, w, h); x.strokeStyle = '#fff'; x.lineWidth = 8; x.strokeRect(14, 14, w - 28, h - 28);
    x.fillStyle = '#fff'; x.textAlign = 'center';
    lines.forEach((l, i) => { x.font = `bold ${l[1]}px Arial`; x.fillText(l[0], w / 2, l[2]); });
    return tex(c);
  };

  // LED display (redrawable)
  const ledCanvas = canvas(512, 160), ledCtx = ledCanvas.getContext('2d');
  const ledTex = new THREE.CanvasTexture(ledCanvas); ledTex.colorSpace = THREE.SRGBColorSpace;
  const drawLED = (val, label = 'GROSS WT  KG') => {
    ledCtx.fillStyle = '#060606'; ledCtx.fillRect(0, 0, 512, 160);
    ledCtx.font = '20px monospace'; ledCtx.fillStyle = '#ff9a3c'; ledCtx.fillText(label, 22, 34);
    ledCtx.font = 'bold 96px monospace'; ledCtx.textAlign = 'right';
    ledCtx.fillStyle = 'rgba(255,60,30,.12)'; ledCtx.fillText('88888', 492, 132);
    ledCtx.fillStyle = '#ff4a22'; ledCtx.shadowColor = '#ff3a10'; ledCtx.shadowBlur = 18;
    ledCtx.fillText(String(val).padStart(5, ' '), 492, 132); ledCtx.shadowBlur = 0; ledCtx.textAlign = 'left';
    ledTex.needsUpdate = true;
  };
  drawLED(0);

  const S = (o) => new THREE.MeshStandardMaterial(o);
  const P = (o) => new THREE.MeshPhysicalMaterial(o);
  const M = {
    asphalt: S({ name: 'asphalt', roughness: 1, metalness: 0 }),
    road: S({ name: 'road', roughness: 1, metalness: 0 }),
    roadLines: S({ name: 'roadLines', map: roadMap, transparent: true, depthWrite: false, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -2 }),
    concrete: S({ name: 'concrete', roughness: 1 }),
    plate: S({ name: 'checkerPlate', map: plateMap, roughness: 0.55, metalness: 0.75 }),
    dirt: S({ name: 'dirt', roughness: 1 }),
    cabPaint: P({ name: 'cabPaint', color: 0xb8bcc2, roughness: 0.32, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08 }),
    cabAccent: P({ name: 'cabAccent', color: 0xd2621a, roughness: 0.35, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 }),
    glass: P({ name: 'glass', color: 0x10161b, roughness: 0.02, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 }),
    chrome: S({ name: 'chrome', color: 0xe8e8e8, roughness: 0.08, metalness: 1 }),
    alu: S({ name: 'aluminium', color: 0xc9ccd0, roughness: 0.28, metalness: 1 }),
    chassis: S({ name: 'chassis', color: 0x16181b, roughness: 0.6, metalness: 0.5 }),
    trailer: S({ name: 'trailerSteel', color: 0x2b2f35, roughness: 0.55, metalness: 0.6 }),
    deck: S({ name: 'deckPlate', map: plateMap, color: 0x8a8d91, roughness: 0.6, metalness: 0.7 }),
    rubber: S({ name: 'tyre', color: 0x111111, roughness: 0.92, metalness: 0, bumpMap: treadBump, bumpScale: 2 }),
    rim: S({ name: 'rim', color: 0xb9bcc0, roughness: 0.3, metalness: 1 }),
    plastic: S({ name: 'blackPlastic', color: 0x0c0c0d, roughness: 0.7 }),
    headlight: S({ name: 'headlight', color: 0xffffff, emissive: 0xfff3dc, emissiveIntensity: 0.2, roughness: 0.1 }),
    taillight: S({ name: 'taillight', color: 0x5a0000, emissive: 0xff1a0a, emissiveIntensity: 0.4, roughness: 0.3 }),
    amber: S({ name: 'amber', color: 0x7a4000, emissive: 0xff8a00, emissiveIntensity: 0.4, roughness: 0.3 }),
    rebar: S({ name: 'rebar', color: 0x55504b, roughness: 0.48, metalness: 0.92 }),
    wire: S({ name: 'bindingWire', color: 0x8a8a86, roughness: 0.4, metalness: 1 }),
    timber: S({ name: 'timber', color: 0x6e4a2a, roughness: 0.9 }),
    craneYellow: S({ name: 'craneYellow', color: 0xe8a50c, roughness: 0.45, metalness: 0.35 }),
    craneBlue: S({ name: 'craneBlue', color: 0x1f4f8a, roughness: 0.45, metalness: 0.35 }),
    steelCable: S({ name: 'cable', color: 0x2a2a2a, roughness: 0.4, metalness: 0.9 }),
    strap: S({ name: 'strap', color: 0xf2b600, roughness: 0.75 }),
    hazard: S({ name: 'hazard', color: 0xe8b400, roughness: 0.5 }),
    container: S({ name: 'container', map: containerMap, roughness: 0.55, metalness: 0.45 }),
    containerEnd: S({ name: 'containerEnd', color: 0xb44d17, roughness: 0.55, metalness: 0.45 }),
    hull: S({ name: 'hull', color: 0x1d2a3a, roughness: 0.6, metalness: 0.4 }),
    hullRed: S({ name: 'hullRed', color: 0x7a1d17, roughness: 0.7, metalness: 0.2 }),
    water: P({ name: 'water', color: 0x0e2430, roughness: 0.08, metalness: 0.1, clearcoat: 1 }),
    grass: S({ name: 'grass', roughness: 1 }),
    brick: S({ name: 'brick', roughness: 1 }),
    corrugated: S({ name: 'corrugated', roughness: 1, metalness: 0.6 }),
    paintWhite: S({ name: 'paintWhite', color: 0xe9e9e4, roughness: 0.6 }),
    lampHead: S({ name: 'lampHead', color: 0xfff1d0, emissive: 0xffc070, emissiveIntensity: 3 }),
    pole: S({ name: 'pole', color: 0x8c9096, roughness: 0.4, metalness: 0.8 }),
    led: S({ name: 'led', map: ledTex, emissive: 0xffffff, emissiveMap: ledTex, emissiveIntensity: 1.4 }),
    guardrail: S({ name: 'guardrail', color: 0xb0b4b8, roughness: 0.3, metalness: 1 }),
    red: S({ name: 'red', color: 0xc21b17, roughness: 0.5 }),
  };
  if (pbr) {
    // Real-world scanned surfaces. Repeats are tuned per mesh by each set (see sets/works/site).
    pbr.apply(M.asphalt, 'asphalt', [1, 1], { color: 0xb8b0a4 });
    pbr.apply(M.road, 'asphalt', [1, 1], { color: 0x8c8c8c });
    pbr.apply(M.concrete, 'concrete', [1, 1], { color: 0xd9d4cc });
    pbr.apply(M.dirt, 'ground', [1, 1], { color: 0xc9b49a });
    pbr.apply(M.grass, 'ground', [1, 1], { color: 0x9a8f72 });
    pbr.apply(M.brick, 'brick', [1, 1], { normal: 1.2 });
    pbr.apply(M.corrugated, 'corrugated', [1, 1], { metal: true, color: 0xc2c6ca });
    // corrugation relief on painted containers, keeping the brand paint
    pbr.apply(M.container, 'container', [3, 1], { map: false, normal: 1.4, roughness: 0.9, ao: 0.6 });
    pbr.apply(M.containerEnd, 'container', [1, 1], { map: false, normal: 1.0, roughness: 0.9, ao: 0.6 });
  }
  return { M, drawLED, signTex, tex, canvas };
}
