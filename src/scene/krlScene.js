// Scroll-driven cinematic 3D truck story.
// createKrlScene(container) -> { setProgress(p), hud, dispose() }
//
// Realism: HDRI sky lighting + photographic backdrops, scanned PBR surfaces, weathering shader,
//          ambient occlusion, bloom, AgX filmic tone mapping, SMAA, vignette and film grain.
// Speed:   static geometry merged per material (~2,700 meshes -> ~150 draw calls), adaptive
//          resolution + effect tiers driven by measured frame time, rendering paused off-screen.
import * as THREE from 'three';
import {
  EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode,
  SMAAEffect, SMAAPreset, VignetteEffect, NoiseEffect, BlendFunction,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { buildMats } from './mats';
import { buildTruck } from './truck';
import { buildWorks, buildBundle } from './works';
import { buildRoad, buildPort, buildGate, buildContainer } from './sets';
import { buildSite } from './site';
import { bakeStatic } from './optimize';
import { createSkyLoader, createPBR, addGrime } from './assets';

const cl = x => Math.min(1, Math.max(0, x));
const ez = x => x * x * (3 - 2 * x);
const lerp = (a, b, t) => a + (b - a) * t;
const Y = new THREE.Vector3(0, 1, 0);

// Look per stage: which sky, where its sun should sit, and exposure/light balance.
const LOOKS = {
  hero: { sky: 'dusk', sunAz: [-0.62, -0.78], exposure: 0.95, env: 0.8, bg: 1.0, sun: [0xffa468, 3.0], fog: [120, 900], night: true },
  yard: { sky: 'day', sunAz: [0.6, 0.4], exposure: 0.95, env: 1.0, bg: 1.0, sun: [0xffdcb4, 3.4], fog: [120, 900] },
  road: { sky: 'night', sunAz: [0.6, 0.4], exposure: 1.15, env: 0.45, bg: 1.6, sun: [0x9fb4ff, 0.25], fog: [60, 520], night: true },
  port: { sky: 'port', sunAz: [0.6, 0.4], exposure: 0.95, env: 1.0, bg: 1.0, sun: [0xfff2e0, 3.3], fog: [160, 1100] },
  gate: { sky: 'day', sunAz: [0.6, 0.4], exposure: 0.95, env: 1.0, bg: 1.0, sun: [0xffdcb4, 3.4], fog: [120, 900] },
  site: { sky: 'day', sunAz: [0.6, 0.4], exposure: 0.95, env: 1.0, bg: 1.0, sun: [0xffdcb4, 3.4], fog: [140, 1000] },
};

export function createKrlScene(container) {
  const self = { p: 0, ps: 0, raf: 0, ro: null, paused: false, hud: { kg: 0, km: 0, fade: 0, p: 0, ready: false, progress: 0 } };
  self.setProgress = (p) => { self.p = p; };
  const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const tier = isTouch ? 1 : 2;

  // ---------- renderer + post-processing ----------
  // dev-only switch for benchmarking pipelines: ?fx=full|nohalf|noao|none
  const fx = (process.env.NODE_ENV !== 'production' && new URLSearchParams(window.location.search).get('fx')) || 'full';
  const usePost = fx !== 'none';
  const fixedQ = process.env.NODE_ENV !== 'production' && new URLSearchParams(window.location.search).has('fixed');
  const renderer = new THREE.WebGLRenderer({ antialias: !usePost, stencil: false, powerPreference: 'high-performance' });
  const maxPR = Math.min(window.devicePixelRatio || 1, tier === 2 ? 1.5 : 1.25);
  let pr = Math.min(maxPR, tier === 2 ? 1.25 : 1);
  renderer.setPixelRatio(pr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = usePost ? THREE.NoToneMapping : THREE.AgXToneMapping; // AgX in post when post is on
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const cv = renderer.domElement; cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  container.appendChild(cv);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e1116);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 2500);

  const stubPass = { enabled: false, setSize() {}, dispose() {}, configuration: {} };
  let composer, ao = stubPass, bloom = { intensity: 0 }, grain = { blendMode: { opacity: { value: 0 } } };
  if (usePost) {
    composer = new EffectComposer(renderer, { frameBufferType: fx === 'nohalf' ? THREE.UnsignedByteType : THREE.HalfFloatType });
    composer.addPass(new RenderPass(scene, camera));
    if (fx !== 'noao') {
      ao = new N8AOPostPass(scene, camera, 512, 512);
      ao.setQualityMode(tier === 2 ? 'Medium' : 'Performance');
      Object.assign(ao.configuration, { aoRadius: 2.2, distanceFalloff: 1.2, intensity: 2.6, halfRes: true, depthAwareUpsampling: true, gammaCorrection: false, color: new THREE.Color(0x000000) });
      ao.enabled = tier === 2;
      composer.addPass(ao);
    }
    bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, intensity: 0.7, radius: 0.6 });
    const toneMap = new ToneMappingEffect({ mode: ToneMappingMode.AGX });
    composer.addPass(new EffectPass(camera, bloom, toneMap));
    const vignette = new VignetteEffect({ offset: 0.28, darkness: 0.58 });
    grain = new NoiseEffect({ premultiply: true, blendFunction: BlendFunction.OVERLAY });
    grain.blendMode.opacity.value = 0.14;
    composer.addPass(new EffectPass(camera, new SMAAEffect({ preset: tier === 2 ? SMAAPreset.HIGH : SMAAPreset.MEDIUM }), vignette, grain));
  } else {
    composer = { render: () => renderer.render(scene, camera), setSize() {}, dispose() {}, passes: [] };
  }

  // ---------- assets ----------
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_u, done, total) => { self.hud.progress = total ? done / total : 0; };
  const pbr = createPBR(THREE, renderer, manager);
  const skies = createSkyLoader(THREE, renderer, manager, tier === 2 ? 768 : 512);
  const loadedSkies = {};
  const loadSky = (n) => skies.load(n).then(s => { loadedSkies[n] = s; return s; });
  let texturesReady = false;
  const { M, drawLED, signTex } = buildMats(THREE, renderer, pbr);
  // only the hero's sky blocks the loader; the rest stream in while the visitor reads the hero
  const initial = Promise.all([loadSky('dusk'), new Promise(res => { manager.onLoad = res; })]);
  self.timing = { start: performance.now() };
  initial.then(() => { self.timing.assets = Math.round(performance.now() - self.timing.start); texturesReady = true; loadSky('day').then(() => loadSky('night')).then(() => loadSky('port')); })
    .catch(e => { console.error('krl assets', e); texturesReady = true; });

  // ---------- lights ----------
  const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x4a3f33, 0.0); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd2a0, 3.2); sun.castShadow = true;
  const sm = tier === 2 ? 2048 : 1024;
  sun.shadow.mapSize.set(sm, sm); const sc = sun.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 300;
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.035;
  scene.add(sun); scene.add(sun.target);
  scene.fog = new THREE.Fog(0xe8c9a6, 80, 700);

  // ---------- actors ----------
  const truck = buildTruck(THREE, M); scene.add(truck.group);
  const heads = [-0.88, 0.88].map(z => { const s = new THREE.SpotLight(0xfff1d8, 0, 120, 0.42, 0.5, 1.4); s.position.set(15.66, 1.32, z * 0.9); s.target.position.set(60, 0, z * 3); truck.group.add(s); truck.group.add(s.target); return s; });
  const works = buildWorks(THREE, M, signTex); scene.add(works.group);
  const road = buildRoad(THREE, M); scene.add(road.group);
  const port = buildPort(THREE, M); scene.add(port.group);
  const gate = buildGate(THREE, M, signTex); scene.add(gate.group);
  const box40 = buildContainer(THREE, M); scene.add(box40);
  const site = buildSite(THREE, M, signTex); scene.add(site.group);
  const tagMat = new THREE.MeshStandardMaterial({ name: 'tagLine', color: 0xff6a00, roughness: 0.8 });
  const bundles = [0, 1, 2].map(() => {
    const b = buildBundle(THREE, M); scene.add(b);
    b.userData.tags = [-5.6, 5.6].map(x => { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 5), tagMat); t.geometry.translate(0, -0.5, 0); t.position.set(x, -0.2, 0); t.visible = false; t.userData.dyn = true; b.add(t); return t; });
    return b;
  });
  // straps (children of truck)
  const straps = [1.3, 3.7, 6.1, 8.5, 10.9].map(x => {
    const s = new THREE.Group(); s.userData.dyn = true; s.position.x = x; truck.group.add(s);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 1.62), M.strap); top.position.y = 2.0; s.add(top);
    [-1, 1].forEach(k => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.66), M.strap); leg.position.set(0, 1.77, k * 1.03); leg.rotation.x = k * 0.8; s.add(leg); });
    const rat = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), M.chrome); rat.position.set(0, 1.6, 1.22); s.add(rat);
    s.traverse(o => { o.castShadow = true; });
    return s;
  });

  // glows (light sources seen directly) — bloom turns these into real lens glow
  const gc = document.createElement('canvas'); gc.width = gc.height = 128; const gx = gc.getContext('2d');
  const grd = gx.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.18, 'rgba(255,255,255,.55)'); grd.addColorStop(0.5, 'rgba(255,255,255,.12)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  gx.fillStyle = grd; gx.fillRect(0, 0, 128, 128); const glowTex = new THREE.CanvasTexture(gc);
  const glow = (color, size, k = 1) => { const m = new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }); m.color.multiplyScalar(k); const s = new THREE.Sprite(m); s.scale.set(size, size, 1); return s; };
  const glows = [];
  [-0.88, 0.88].forEach(z => { const s = glow(0xfff0d8, 0.9, 2.2); s.position.set(15.68, 1.32, z * 0.9); truck.group.add(s); glows.push(s); });
  [-0.95, 0.95].forEach(z => { const s = glow(0xff2a10, 0.7, 2.2); s.position.set(-0.08, 1.22, z * 1.08); truck.group.add(s); glows.push(s); });
  road.lamps.forEach(l => { const s = glow(0xffb866, 2.2, 1.8); s.position.set(0, 9.75, -8.5); l.add(s); });
  // 3 shared sodium-lamp lights that jump to the lamps nearest the camera focus (constant light count)
  const lampLights = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xffb366, 0, 38, 1.6); scene.add(l); return l; });

  // volumetric headlight beams (night): additive cones that fade with distance and at the edges
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { uI: { value: 0 } },
    vertexShader: 'varying float vL; varying float vD; varying vec3 vN; varying vec3 vV; void main(){ vL = uv.y; vec4 mv = modelViewMatrix*vec4(position,1.0); vD = length(mv.xyz); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform float uI; varying float vL; varying float vD; varying vec3 vN; varying vec3 vV; void main(){ float edge = pow(abs(dot(vN, vV)), 1.6); float fall = pow(vL, 2.2); float near = smoothstep(4.0, 14.0, vD); gl_FragColor = vec4(vec3(1.0,0.93,0.8) * edge * fall * near * uI, 1.0); }',
  });
  const beamGeo = new THREE.CylinderGeometry(0.08, 3.4, 26, 32, 1, true); beamGeo.translate(0, -13, 0); beamGeo.rotateZ(Math.PI / 2);
  const beams = [-0.88, 0.88].map(z => { const b = new THREE.Mesh(beamGeo, beamMat); b.position.set(15.66, 1.32, z * 0.9); b.rotation.z = -0.045; b.userData.dyn = true; b.frustumCulled = false; b.visible = false; truck.group.add(b); return b; });

  // floating dust in daylight shots (catches the low sun)
  const dustN = tier === 2 ? 900 : 300;
  const dustGeo = new THREE.BufferGeometry(); const dp = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) { dp[i * 3] = (Math.random() - 0.5) * 40; dp[i * 3 + 1] = Math.random() * 10; dp[i * 3 + 2] = (Math.random() - 0.5) * 30; }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ map: glowTex, size: 0.06, color: 0xffe2c0, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  dust.frustumCulled = false; scene.add(dust);

  // weathering on painted / structural steel (kills the "plastic toy" look)
  const grime = {
    bodyRed: { height: 1.1, amount: 0.35 }, chassis: { height: 1.2, amount: 0.5 }, trailerSteel: { height: 1.0, amount: 0.4 }, trailerPaint: { height: 1.3, amount: 0.45, noise: 0.3 }, greyPlastic: { height: 1.0, amount: 0.3 },
    blackPlastic: { height: 1.0, amount: 0.4 }, cabWhite: { height: 1.7, amount: 0.22, noise: 0.12 }, pole: { height: 1.0, amount: 0.35 },
    craneYellow: { height: 2.0, amount: 0.45, noise: 0.3 }, craneBlue: { height: 3.0, amount: 0.35, noise: 0.3 }, paintWhite: { height: 1.5, amount: 0.4, noise: 0.25 },
    hull: { height: 2.0, amount: 0.3 }, container: { height: 1.0, amount: 0.35, noise: 0.25 }, containerEnd: { height: 1.0, amount: 0.35, noise: 0.25 },
    hazard: { height: 0.6, amount: 0.3 }, freshConcrete: { height: 1.0, amount: 0.25, noise: 0.25 }, scaffold: { height: 1.0, amount: 0.3 },
    guardrail: { height: 0.8, amount: 0.35 }, shed: { height: 3, amount: 0.35 }, corrugated: { height: 3, amount: 0.3, noise: 0.3 },
  };
  const seen = new Set();
  scene.traverse(o => { if (o.isMesh && !Array.isArray(o.material) && !seen.has(o.material)) { seen.add(o.material); const g = grime[o.material.name]; if (g && o.material.isMeshStandardMaterial) addGrime(o.material, g); } });

  // merge static geometry: thousands of meshes -> one per material per object
  // every mesh receives shadows: one shader variant instead of two (and better contact shading)
  scene.traverse(o => { if (o.isMesh && !o.material.isShaderMaterial && !o.material.transparent) o.receiveShadow = true; });
  [truck.group, works.group, road.group, port.group, gate.group, site.group, box40, ...bundles].forEach(g => bakeStatic(THREE, g));

  const resize = () => {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false); composer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w / h < 1 ? 52 : 38; camera.updateProjectionMatrix();
  };
  self.ro = new ResizeObserver(resize); self.ro.observe(container); resize();

  // ---------- sky / look switching ----------
  let curLook = null, curSky = null;
  const sunWorld = new THREE.Vector3(0.6, 0.25, 0.4).normalize();
  const applyLook = (name) => {
    const L = LOOKS[name];
    const s = loadedSkies[L.sky] || loadedSkies.day || loadedSkies.dusk;
    if (curLook === name && curSky === s) return;
    curLook = name;
    if (s) {
      curSky = s;
      // rotate the photo so its sun lands where this shot's lighting was designed
      const theta = Math.atan2(s.sunDir.z, s.sunDir.x) - Math.atan2(L.sunAz[1], L.sunAz[0]);
      scene.background = s.bg; scene.environment = s.env;
      scene.backgroundRotation.set(0, theta, 0); scene.environmentRotation.set(0, theta, 0);
      sunWorld.copy(s.sunDir).applyAxisAngle(Y, theta);
      if (sunWorld.y < 0.1) { sunWorld.y = 0.1; } sunWorld.normalize();
      scene.fog.color.copy(s.horizon);
    }
    scene.backgroundIntensity = L.bg; scene.environmentIntensity = L.env;
    renderer.toneMappingExposure = L.exposure;
    sun.color.set(L.sun[0]); sun.intensity = L.sun[1];
    scene.fog.near = L.fog[0]; scene.fog.far = L.fog[1];
    hemi.intensity = L.night ? 0.08 : 0;
  };

  // ---------- adaptive quality ----------
  // Measured against the display's own refresh interval (vsync), ignoring one-off hitches.
  // Steps down: resolution -> ambient occlusion -> bloom/grain. Steps back up when there is headroom.
  // Decisions are slow and sticky: every change of resolution reallocates all render buffers,
  // so oscillating would itself cause stutter.
  let ftAvg = 16.7, ftN = 0, refresh = 1000, good = 0, bad = 0, changes = 0, lastChange = 0;
  let quality = tier === 2 ? 3 : 2; // 3: AO+bloom, 2: bloom, 1: minimal
  let ceiling = 3;
  const setQuality = (q) => { quality = q; ao.enabled = q >= 3; grain.blendMode.opacity.value = q >= 2 ? 0.14 : 0; };
  setQuality(quality);
  const setPR = (v) => { pr = v; renderer.setPixelRatio(pr); resize(); };
  const adapt = (dtMs, now) => {
    if (fixedQ || dtMs > 70 || changes >= 8) return; // fixed (benchmark), a stall (decode/compile), or settled
    refresh = Math.min(refresh * 1.0005, Math.max(4, dtMs));
    ftAvg += (dtMs - ftAvg) * 0.05; if (++ftN < 60) return; ftN = 0;
    if (now - lastChange < 2000) return;
    const slow = ftAvg > refresh * 1.4 + 2, fast = ftAvg < refresh * 1.1 + 0.5;
    if (slow && ++bad >= 2) {
      bad = 0; good = 0; changes++; lastChange = now;
      if (quality === 3 && ao.enabled) { ceiling = 2; setQuality(2); }          // AO is the most expensive effect
      else if (pr > 0.75) setPR(Math.max(0.75, +(pr - 0.25).toFixed(2)));
      else if (quality > 1) { ceiling = quality - 1; setQuality(quality - 1); }
    } else if (fast && ++good >= 3) {
      good = 0; bad = 0;
      if (pr < maxPR - 0.01) { changes++; lastChange = now; setPR(Math.min(maxPR, +(pr + 0.25).toFixed(2))); }
      else if (quality < ceiling) { changes++; lastChange = now; setQuality(quality + 1); }
    } else if (!slow) bad = 0;
  };

  // ---------- stage visibility + warm-up ----------
  const showStage = (scn) => {
    works.group.visible = scn === 'yard'; site.group.visible = scn === 'site'; road.group.visible = scn === 'road' || scn === 'hero'; port.group.visible = scn === 'port'; gate.group.visible = scn === 'gate';
    box40.visible = scn === 'port';
  };
  // Behind the loading screen: compile every shader for every stage in ONE pass (the light setup is
  // identical in all stages, and compile includes hidden objects), in parallel on the browser's
  // compiler threads; then upload textures. The first scroll through the story has no hitches.
  let warmed = false, warming = false;
  const warmAll = async () => {
    warming = true; const tw = performance.now();
    applyLook('hero');
    try { await renderer.compileAsync(scene, camera); } catch (e) { renderer.compile(scene, camera); }
    self.timing.compile = Math.round(performance.now() - tw);
    const tex = new Set();
    scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { for (const k in m) { const v = m[k]; if (v && v.isTexture) tex.add(v); } }); });
    tex.forEach(t => renderer.initTexture(t));
    // render each stage once (shadow-depth shaders + post-processing for both light setups)
    for (const s of ['yard', 'road', 'hero']) { showStage(s); curLook = null; applyLook(s); composer.render(0); await new Promise(r => requestAnimationFrame(r)); }
    curLook = null; warmed = true;
    self.timing.ready = Math.round(performance.now() - self.timing.start);
  };

  // ---------- camera rig ----------
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const camPos = V(0, 0, 0), camLook = V(0, 0, 0), tmpA = V(0, 0, 0), tmpB = V(0, 0, 0);
  const catmull = (out, p0, p1, p2, p3, t) => {
    const t2 = t * t, t3 = t2 * t;
    for (const c of ['x', 'y', 'z']) out[c] = 0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3);
    return out;
  };
  let lastKg = -1; const t0 = performance.now();
  const GX = gate.GX;

  let lastT = performance.now(), lastScn = null; const camCur = V(0, 0, 0), lookCur = V(0, 0, 0);
  const frame = () => {
    self.raf = requestAnimationFrame(frame);
    if (self.paused) { lastT = performance.now(); return; }
    const now = performance.now(), dtMs = now - lastT, dt = Math.min(0.1, dtMs / 1000); lastT = now;
    if (!warmed) { if (texturesReady && !warming) warmAll(); return; }
    if (self.hud.ready) adapt(dtMs, now);
    self.ps += (self.p - self.ps) * (1 - Math.exp(-dt * 5.5));
    if (Math.abs(self.p - self.ps) < 0.00002) self.ps = self.p;
    const p = self.ps, time = (now - t0) / 1000;
    const seg = (a, b) => cl((p - a) / (b - a));
    const scn = p < 0.03 ? 'hero' : p < 0.475 ? 'yard' : p < 0.755 ? 'road' : p < 0.885 ? 'port' : p < 0.92 ? 'gate' : 'site';
    showStage(scn);

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
    if (scn === 'port') port.update(time);

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
    applyLook(scn);
    const night = !!LOOKS[scn].night;
    bloom.intensity = quality >= 2 ? (night ? 0.8 : 0.35) : 0;
    heads.forEach(h => h.intensity = night ? 900 : 0);
    M.headlight.emissiveIntensity = night ? 14 : 0.4; M.taillight.emissiveIntensity = night ? 6 : 0.5;
    M.lampHead.emissiveIntensity = night ? 8 : 0;
    beams.forEach(b => { b.visible = night; }); beamMat.uniforms.uI.value = scn === 'hero' ? 0.05 : 0.09;
    glows.forEach(s => { s.visible = night; });

    // camera rig: keyframes joined by a Catmull-Rom spline (continuous velocity, no stop-start)
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
    const isCut = (i) => i >= 0 && i + 1 < K.length && (K[i + 1][0] - K[i][0]) < 0.007;
    if (isCut(k)) { camPos.copy(B[1]); camLook.copy(B[2]); }
    else {
      const u = cl((p - A[0]) / (B[0] - A[0]));
      const P = K[k - 1] && !isCut(k - 1) ? K[k - 1] : null, N = K[k + 2] && !isCut(k + 1) ? K[k + 2] : null;
      // ease into the first / out of the last segment of a shot, glide through the rest
      const uu = !P && !N ? ez(u) : !P ? u * u * (2 - u) : !N ? u * (1 + u - u * u) : u;
      catmull(camPos, P ? P[1] : tmpA.copy(A[1]).multiplyScalar(2).sub(B[1]), A[1], B[1], N ? N[1] : tmpB.copy(B[1]).multiplyScalar(2).sub(A[1]), uu);
      const lp = P ? P[2] : tmpA.copy(A[2]).multiplyScalar(2).sub(B[2]), ln = N ? N[2] : tmpB.copy(B[2]).multiplyScalar(2).sub(A[2]);
      catmull(camLook, lp, A[2], B[2], ln, uu);
    }
    // handheld drift
    camPos.x += Math.sin(time * 0.23) * 0.3; camPos.y += Math.sin(time * 0.31) * 0.12; camPos.z += Math.cos(time * 0.19) * 0.25;
    if (night) { camPos.y += Math.sin(time * 1.7) * 0.025; camPos.z += Math.sin(time * 1.1) * 0.035; }
    if (scn !== lastScn) { camCur.copy(camPos); lookCur.copy(camLook); lastScn = scn; }
    const cd = 1 - Math.exp(-dt * 7);
    camCur.lerp(camPos, cd); lookCur.lerp(camLook, cd);
    camera.position.copy(camCur); camera.lookAt(lookCur);

    // sun + shadow frustum follow the focus point
    const fx = camLook.x, fz = camLook.z;
    sun.position.set(fx + sunWorld.x * 120, sunWorld.y * 120, fz + sunWorld.z * 120); sun.target.position.set(fx, 0, fz);

    // street-lamp lighting: move the 3 shared lights onto the lamps nearest the focus
    const lit = road.group.visible && night;
    if (lit) {
      const near = road.lamps.slice().sort((a, b) => Math.abs(a.position.x - fx) - Math.abs(b.position.x - fx));
      lampLights.forEach((l, i) => { l.position.set(near[i].position.x, 9.4, -8.5); l.intensity = 180; });
    } else lampLights.forEach(l => { l.intensity = 0; });

    // dust floats around the focus in daylight
    dust.visible = !night && scn !== 'port';
    if (dust.visible) { dust.position.set(fx, 0, fz); dust.rotation.y = time * 0.01; dust.position.y = Math.sin(time * 0.3) * 0.2; }

    const cuts = [0.03, 0.475, 0.755, 0.885, 0.92];
    self.hud.fade = Math.max(...cuts.map(c => ez(cl(1 - Math.abs(p - c) / (c === 0.03 ? 0.006 : 0.02)))));
    self.hud.p = p;
    self.hud.kg = kg; self.hud.km = Math.round(nt * 524); self.hud.scene = scn; self.hud.setup = setup; self.hud.unloaded = unloaded;
    composer.render(dt);
    if (!self.hud.ready) self.hud.ready = true;
  };
  self.renderer = renderer; self.scene = scene; self.composer = composer; self.skies = loadedSkies; self.ao = ao;
  self.quality = () => ({ pr, quality, ftAvg: +ftAvg.toFixed(1), refresh: +refresh.toFixed(1), changes });
  frame();

  self.dispose = () => {
    cancelAnimationFrame(self.raf);
    if (self.ro) self.ro.disconnect();
    scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(mm => { for (const k in mm) { const v = mm[k]; if (v && v.isTexture) v.dispose(); } mm.dispose(); });
    });
    skies.dispose(); composer.dispose();
    renderer.dispose(); renderer.forceContextLoss();
    if (cv.parentNode) cv.parentNode.removeChild(cv);
  };
  return self;
}
