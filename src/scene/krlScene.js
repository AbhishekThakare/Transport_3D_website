// Scroll-driven realistic 3D truck story (ported from the <krl-scene> custom element).
// createKrlScene(container) -> { setProgress(p), hud, dispose() }
import * as THREE from 'three';
import { buildMats } from './mats';
import { buildTruck } from './truck';
import { buildWorks, buildBundle } from './works';
import { buildRoad, buildPort, buildGate, buildContainer } from './sets';
import { buildSite } from './site';

const cl = x => Math.min(1, Math.max(0, x));
const ez = x => x * x * (3 - 2 * x);
const lerp = (a, b, t) => a + (b - a) * t;

export function createKrlScene(container) {
  const self = { p: 0, ps: 0, raf: 0, ro: null, hud: { kg: 0, km: 0, fade: 0, p: 0, ready: false } };
  self.setProgress = (p) => { self.p = p; };
  const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const cv = renderer.domElement; cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  container.appendChild(cv);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 2500);
  const { M, drawLED, signTex } = buildMats(THREE, renderer);

  // sky dome
  const skyU = { top: { value: new THREE.Color() }, bot: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0.6, 0.25, 0.4).normalize() }, sunCol: { value: new THREE.Color(0xffc890) }, sunAmt: { value: 1 } };
  const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vW; void main(){ vW = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
    fragmentShader: 'uniform vec3 top; uniform vec3 bot; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunAmt; varying vec3 vW; void main(){ float h = clamp(vW.y*1.6+0.08,0.0,1.0); vec3 c = mix(bot, top, pow(h,0.7)); float s = max(dot(normalize(vW), sunDir),0.0); c += sunCol*(pow(s,600.0)*6.0 + pow(s,12.0)*0.35)*sunAmt; gl_FragColor = vec4(c,1.0);} ' });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 16), skyMat); scene.add(sky);
  const setSky = (top, bot, amt) => { skyU.top.value.set(top); skyU.bot.value.set(bot); skyU.sunAmt.value = amt; };
  // environment maps (day / night)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); const envSky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMat); envScene.add(envSky);
  setSky(0x6d8fb5, 0xf0c79c, 1); const panel = new THREE.Mesh(new THREE.PlaneGeometry(30, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); panel.position.set(0, 30, 0); panel.rotation.x = Math.PI / 2; envScene.add(panel);
  const envDay = pmrem.fromScene(envScene, 0.02).texture;
  panel.visible = false; setSky(0x050a16, 0x16203a, 0.2);
  const envNight = pmrem.fromScene(envScene, 0.04).texture;

  // lights
  const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x4a3f33, 0.6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd2a0, 3.2); sun.castShadow = true;
  sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048); const sc = sun.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 260; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun); scene.add(sun.target);
  scene.fog = new THREE.Fog(0xe8c9a6, 80, 700);

  // actors
  const truck = buildTruck(THREE, M); scene.add(truck.group);
  const heads = [-0.88, 0.88].map(z => { const s = new THREE.SpotLight(0xfff1d8, 0, 120, 0.42, 0.5, 1.4); s.position.set(15.52, 1.34, z * 1.02); s.target.position.set(60, 0, z * 3); truck.group.add(s); truck.group.add(s.target); return s; });
  const works = buildWorks(THREE, M, signTex); scene.add(works.group);
  const road = buildRoad(THREE, M); scene.add(road.group);
  const port = buildPort(THREE, M); scene.add(port.group);
  const gate = buildGate(THREE, M, signTex); scene.add(gate.group);
  const box40 = buildContainer(THREE, M); scene.add(box40);
  const site = buildSite(THREE, M, signTex); scene.add(site.group);
  const tagMat = new THREE.MeshStandardMaterial({ name: 'tagLine', color: 0xff6a00, roughness: 0.8 });
  const bundles = [0, 1, 2].map(() => { const b = buildBundle(THREE, M); scene.add(b);
    b.userData.tags = [-5.6, 5.6].map(x => { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 5), tagMat); t.geometry.translate(0, -0.5, 0); t.position.set(x, -0.2, 0); t.visible = false; b.add(t); return t; });
    return b; });
  // straps (children of truck)
  const straps = [1.3, 3.7, 6.1, 8.5, 10.9].map(x => {
    const s = new THREE.Group(); s.position.x = x; truck.group.add(s);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 1.62), M.strap); top.position.y = 2.0; s.add(top);
    [-1, 1].forEach(k => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.66), M.strap); leg.position.set(0, 1.77, k * 1.03); leg.rotation.x = k * 0.8; s.add(leg); });
    const rat = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), M.chrome); rat.position.set(0, 1.6, 1.22); s.add(rat);
    s.traverse(o => { o.castShadow = true; });
    return s;
  });

  const gc = document.createElement('canvas'); gc.width = gc.height = 128; const gx = gc.getContext('2d');
  const grd = gx.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.18, 'rgba(255,255,255,.55)'); grd.addColorStop(0.5, 'rgba(255,255,255,.12)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  gx.fillStyle = grd; gx.fillRect(0, 0, 128, 128); const glowTex = new THREE.CanvasTexture(gc);
  const glow = (color, size) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); s.scale.set(size, size, 1); return s; };
  const glows = [];
  [-0.88, 0.88].forEach(z => { const s = glow(0xfff0d8, 2.6); s.position.set(15.56, 1.34, z * 1.02); truck.group.add(s); glows.push([s, 'night']); });
  [-0.95, 0.95].forEach(z => { const s = glow(0xff2a10, 0.9); s.position.set(-0.1, 1.2, z * 1.15); truck.group.add(s); glows.push([s, 'night']); });
  road.lamps.forEach(l => { const s = glow(0xffb866, 4.5); s.position.set(0, 9.7, -8.5); l.add(s); });
  const resize = () => { const w = container.clientWidth || 1, h = container.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 52 : 38; camera.updateProjectionMatrix(); };
  self.ro = new ResizeObserver(resize); self.ro.observe(container); resize();

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const camPos = V(0, 0, 0), camLook = V(0, 0, 0);
  let lastKg = -1; const t0 = performance.now();
  const GX = gate.GX;

  let lastT = performance.now(), lastScn = null; const camCur = V(0, 0, 0), lookCur = V(0, 0, 0);
  const frame = () => {
    self.raf = requestAnimationFrame(frame);
    if (self.paused) { lastT = performance.now(); return; }
    const now = performance.now(), dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    self.ps += (self.p - self.ps) * (1 - Math.exp(-dt * 4.2));
    if (Math.abs(self.p - self.ps) < 0.00002) self.ps = self.p;
    const p = self.ps, time = (now - t0) / 1000;
    const seg = (a, b) => cl((p - a) / (b - a));
    const scn = p < 0.03 ? 'hero' : p < 0.475 ? 'yard' : p < 0.755 ? 'road' : p < 0.885 ? 'port' : p < 0.92 ? 'gate' : 'site';
    works.group.visible = scn === 'yard'; site.group.visible = scn === 'site'; road.group.visible = scn === 'road' || scn === 'hero'; port.group.visible = scn === 'port'; gate.group.visible = scn === 'gate';
    box40.visible = scn === 'port';

    // truck position & distance
    let tx = 0, dist = 0;
    if (scn === 'yard') { tx = lerp(-48, 0, ez(seg(0.034, 0.12))); dist = tx + 48; }
    const nt = seg(0.48, 0.75); if (scn === 'road') dist = 48 + nt * 2600;
    if (scn === 'gate') { tx = lerp(-70, GX - 3.2 - 15.45, ez(seg(0.889, 0.905))) + ez(seg(0.91, 0.92)) * 45; dist = tx; }
    if (scn === 'site') { tx = lerp(-42, 0, ez(seg(0.92, 0.935))); dist = tx + 42; }
    truck.group.position.x = tx;
    truck.group.position.y = scn === 'road' ? Math.sin(time * 11) * 0.006 : scn === 'hero' ? Math.sin(time * 23) * 0.0015 : 0;
    truck.wheels.forEach(w => { w.rotation.z = -dist / truck.R; });
    if (scn === 'road') road.update(dist, time); if (scn === 'hero') road.update(0, time * 0.4);

    // crane + bundles
    const L0 = 5.6, srcZ = [-4.6, -5.1, -5.6], dstZ = [-0.55, 0, 0.55], stackY = 0.35, deckY = 1.76;
    let cz = srcZ[0], hy = L0, addKg = 0;
    for (let i = 0; i < 3; i++) {
      const a = 0.16 + i * 0.08, t = seg(a, a + 0.08);
      let bx = 6.1, by = stackY, bz = srcZ[i];
      if (p >= a) {
        const from = i === 0 ? srcZ[0] : dstZ[i - 1];
        const ph = (u, v) => ez(cl((t - u) / (v - u)));
        const pick = stackY + 0.52, drop = deckY + 0.52;
        if (t < 0.2) { cz = lerp(from, srcZ[i], ph(0, 0.2)); hy = L0; }
        else if (t < 0.35) { cz = srcZ[i]; hy = lerp(L0, pick, ph(0.2, 0.35)); }
        else if (t < 0.5) { cz = srcZ[i]; hy = lerp(pick, L0, ph(0.35, 0.5)); by = hy - 0.52; }
        else if (t < 0.7) { cz = lerp(srcZ[i], dstZ[i], ph(0.5, 0.7)); hy = L0; by = hy - 0.52; bz = cz; }
        else if (t < 0.85) { cz = dstZ[i]; hy = lerp(L0, drop, ph(0.7, 0.85)); by = hy - 0.52; bz = cz; addKg += 9000 * ph(0.7, 0.85); }
        else { cz = dstZ[i]; hy = lerp(drop, L0, ph(0.85, 1)); bx = tx + 6.1; by = deckY + truck.group.position.y; bz = dstZ[i]; addKg += 9000; }
        if (p >= a + 0.08) { bx = tx + 6.1; by = deckY + truck.group.position.y; bz = dstZ[i]; }
      }
      if (i === 0 && p < a) { cz = srcZ[0]; }
      bundles[i].position.set(bx, by, bz);
      bundles[i].visible = scn !== 'port' && scn !== 'hero';
    }
    if (p > 0.4) { cz = dstZ[2]; hy = L0; }
    bundles.forEach(b => b.userData.tags.forEach(t => t.visible = false));
    let unloaded = 0, lifting = false;
    if (scn === 'site') {
      cz = -2.5; hy = L0;
      const order = [2, 1, 0];
      for (let j = 0; j < 3; j++) {
        const i = order[j], a = 0.948 + j * 0.0135, t = seg(a, a + 0.0135), b = bundles[i];
        const fromZ = j === 0 ? -2.5 : srcZ[order[j - 1]];
        const ph = (u, v) => ez(cl((t - u) / (v - u)));
        const pick = deckY + 0.52, drop = stackY + 0.52;
        let bx = 6.1, by = deckY, bz = dstZ[i], carry = false;
        if (p >= a) {
          if (t < 0.2) { cz = lerp(fromZ, dstZ[i], ph(0, 0.2)); hy = L0; }
          else if (t < 0.35) { cz = dstZ[i]; hy = lerp(L0, pick, ph(0.2, 0.35)); }
          else if (t < 0.5) { cz = dstZ[i]; hy = lerp(pick, L0, ph(0.35, 0.5)); carry = true; }
          else if (t < 0.7) { cz = lerp(dstZ[i], srcZ[i], ph(0.5, 0.7)); hy = L0; carry = true; }
          else if (t < 0.85) { cz = srcZ[i]; hy = lerp(L0, drop, ph(0.7, 0.85)); carry = true; }
          else { cz = srcZ[i]; hy = lerp(drop, L0, ph(0.85, 1)); bz = srcZ[i]; by = stackY; unloaded++; }
          if (carry) { by = hy - 0.52; bz = cz; lifting = true; b.userData.tags.forEach(tg => { tg.visible = true; tg.scale.y = Math.max(0.2, by - 0.25); }); }
        }
        b.position.set(bx + (by === deckY ? tx : 0), by, bz);
      }
    }
    if (scn === 'site') site.setCrane(cz, hy); else works.setCrane(cz, hy);
    const setup = scn === 'site' ? seg(0.932, 0.946) : 0;
    if (scn === 'site') site.update(time, { setup, lifting });
    const kg = Math.round((14820 * ez(seg(0.11, 0.15)) + addKg) / 10) * 10;
    if (kg !== lastKg && scn === 'yard') { drawLED(kg.toLocaleString('en-IN')); lastKg = kg; }
    const sp = seg(0.405, 0.465);
    const rel = seg(0.937, 0.946);
    straps.forEach((s, i) => { let v = ez(cl(sp * 3 - i * 0.5)); if (scn === 'site') v = 1 - ez(cl(rel * 3 - i * 0.5)); s.visible = v > 0.01 && scn !== 'port'; s.position.y = (1 - v) * 2.5; });

    // port container
    if (scn === 'port') {
      const ct = seg(0.785, 0.87); let z = -22.5, y = 7.3;
      if (ct < 0.25) y = lerp(7.3, 18, ez(ct / 0.25));
      else if (ct < 0.65) { y = 18; z = lerp(-22.5, 0, ez((ct - 0.25) / 0.4)); }
      else { z = 0; y = lerp(18, 1.55 + 1.3, ez((ct - 0.65) / 0.35)); }
      box40.position.set(6.1, y, z); port.setCrane(z, y);
    }
    if (scn === 'gate') gate.setBarrier(ez(seg(0.905, 0.91)));

    // lighting per scene
    const hero = scn === 'hero';
    const night = scn === 'road' || hero;
    scene.environment = night ? envNight : envDay;
    skyU.sunDir.value.set(hero ? -0.62 : 0.6, hero ? 0.05 : 0.25, hero ? -0.78 : 0.4).normalize();
    if (hero) { setSky(0x1c2346, 0xff8a4c, 1.2); scene.fog.color.set(0x5a4458); scene.fog.near = 30; scene.fog.far = 520; sun.color.set(0xff9a5a); sun.intensity = 2.2; hemi.intensity = 0.7; renderer.toneMappingExposure = 1.25; }
    else if (night) { setSky(0x03060e, 0x0f1a30, 0.0); scene.fog.color.set(0x0a1222); scene.fog.near = 40; scene.fog.far = 420; sun.color.set(0x8fa8ff); sun.intensity = 0.5; hemi.intensity = 0.22; renderer.toneMappingExposure = 1.55; }
    else if (scn === 'port') { setSky(0x7d9cc0, 0xdfe4e6, 0.6); scene.fog.color.set(0xd8dde0); scene.fog.near = 120; scene.fog.far = 900; sun.color.set(0xfff0dc); sun.intensity = 3.0; hemi.intensity = 0.7; renderer.toneMappingExposure = 1.0; }
    else { setSky(0x5d84b3, 0xf2c597, 1.0); scene.fog.color.set(0xe9c9a4); scene.fog.near = 90; scene.fog.far = 750; sun.color.set(0xffcf98); sun.intensity = 3.4; hemi.intensity = 0.55; renderer.toneMappingExposure = 1.0; }
    scene.environmentIntensity = hero ? 1.1 : night ? 0.5 : 0.9;
    heads.forEach(h => h.intensity = night ? 900 : 0);
    M.headlight.emissiveIntensity = night ? 8 : 0.4; M.taillight.emissiveIntensity = night ? 4 : 0.5;
    M.lampHead.emissiveIntensity = night ? 4 : 0;

    // camera rig
    const K = [];
    const f = (pp, pos, look) => K.push([pp, pos, look]);
    const oa = 0.42 + Math.sin(time * 0.08) * 0.22, push = ez(seg(0, 0.03));
    const narrow = camera.aspect < 1;
    const hp = V(11 + Math.cos(oa) * lerp(17, 11, push), 1.25 + push * 0.5, Math.sin(oa) * 6.2);
    const hl = narrow ? V(9, 2.3, 0) : V(6.5, 2.6, 4.6);
    f(0.0, hp, hl);
    f(0.0299, hp, hl);
    f(0.0301, V(30, 9, 30), V(-5, 3.5, -3));
    f(0.034, V(28, 7, 25), V(-2, 3, -2));
    f(0.085, V(tx + 22, 2.4, 13), V(tx + 8, 2.0, 0));
    f(0.125, V(4, 2.4, 13.5), V(-3, 2.6, 3.5));
    f(0.155, V(-6.5, 3.0, 15.5), V(-1.5, 2.4, 3.5));
    f(0.19, V(26, 9, 20), V(6, 4, -2.5));
    f(0.28, V(20, 6.5, 15), V(6, 3, -2));
    f(0.37, V(-8, 8, 13), V(6, 2.5, -1.5));
    f(0.43, V(1.5, 4.4, 8.0), V(6.5, 1.9, 0));
    f(0.472, V(22, 1.5, 7.5), V(10, 2.1, 0));
    f(0.476, V(30, 1.0, 5.5), V(12, 2.0, 0));
    f(0.53, V(9, 1.8, 7.8), V(8, 1.9, 0));
    f(0.585, V(-13, 4, 6.5), V(8, 2.2, 0));
    f(0.615, V(-6, 22, 4), V(8, 0, 0));
    f(0.75, V(7.7, 90, 1), V(7.7, 0, 0));
    f(0.756, V(58, 15, 9), V(4, 10, -10));
    f(0.82, V(38, 5.5, 3), V(6, 7, -8));
    f(0.882, V(25, 3.2, 3.8), V(7, 2.6, 0));
    f(0.886, V(GX + 14, 2.0, 11), V(GX - 6, 3, 0));
    f(0.908, V(GX + 6, 1.7, 10.5), V(GX - 6, 2.3, 0));
    f(0.919, V(GX + 30, 6, 20), V(GX + 14, 2.5, 0));
    f(0.921, V(30, 6, 26), V(tx + 4, 8, -12));
    f(0.935, V(22, 4, 18), V(6, 5, -8));
    f(0.941, V(-5.5, 3.0, 12.5), V(4, 1.4, 0));
    f(0.952, V(30, 11, 26), V(5, 9, -10));
    f(0.975, V(17, 5, 14), V(6, 3, -3));
    f(1.0, V(40, 22, 40), V(5, 10, -14));
    let k = 0; while (k < K.length - 2 && p > K[k + 1][0]) k++;
    const A = K[k], B = K[k + 1];
    const cut = (B[0] - A[0]) < 0.007;
    const u = cut ? 1 : ez(cl((p - A[0]) / (B[0] - A[0])));
    camPos.lerpVectors(A[1], B[1], u); camLook.lerpVectors(A[2], B[2], u);
    camPos.x += Math.sin(time * 0.23) * 0.35; camPos.y += Math.sin(time * 0.31) * 0.15; camPos.z += Math.cos(time * 0.19) * 0.3;
    if (night) { camPos.y += Math.sin(time * 1.7) * 0.03; camPos.z += Math.sin(time * 1.1) * 0.04; }
    if (scn !== lastScn) { camCur.copy(camPos); lookCur.copy(camLook); lastScn = scn; }
    const cd = 1 - Math.exp(-dt * 5);
    camCur.lerp(camPos, cd); lookCur.lerp(camLook, cd);
    camera.position.copy(camCur); camera.lookAt(lookCur);
    glows.forEach(([s]) => { s.visible = night; });

    // shadow follows focus
    const fx = camLook.x, fz = camLook.z;
    if (hero) sun.position.set(fx - 40, 8, fz - 52); else sun.position.set(fx + 50, 38, fz + 34); sun.target.position.set(fx, 0, fz);
    sky.position.copy(camera.position);

    const cuts = [0.03, 0.475, 0.755, 0.885, 0.92];
    self.hud.fade = Math.max(...cuts.map(c => ez(cl(1 - Math.abs(p - c) / (c === 0.03 ? 0.006 : 0.02)))));
    self.hud.p = p;
    self.hud.kg = kg; self.hud.km = Math.round(nt * 524); self.hud.scene = scn; self.hud.setup = setup; self.hud.unloaded = unloaded;
    renderer.render(scene, camera);
    if (!self.hud.ready) self.hud.ready = true;
  };
  frame();

  self.dispose = () => {
    cancelAnimationFrame(self.raf);
    if (self.ro) self.ro.disconnect();
    scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(mm => { for (const k in mm) { const v = mm[k]; if (v && v.isTexture) v.dispose(); } mm.dispose(); });
    });
    envDay.dispose(); envNight.dispose(); pmrem.dispose();
    renderer.dispose(); renderer.forceContextLoss();
    if (cv.parentNode) cv.parentNode.removeChild(cv);
  };
  return self;
}
