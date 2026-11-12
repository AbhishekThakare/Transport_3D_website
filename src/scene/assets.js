// Real-world assets: HDRI skies (lighting + backdrop) and PBR surface textures (all CC0, polyhaven.com).
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

export const SKY_FILES = { dusk: 'dusk', night: 'night', day: 'day', port: 'port' };

/**
 * Loads a sky: 1k HDR -> PMREM environment (real lighting/reflections), 2.5k JPG -> visible backdrop.
 * Also measures the sun direction and the horizon colour from the photo so lights and fog match it.
 */
export function createSkyLoader(THREE, renderer, manager, faceSize = 768) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const hdr = new HDRLoader(manager);
  const img = new THREE.TextureLoader(manager);
  const cache = {};

  const analyse = (image) => {
    const w = 256, h = 128;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(image, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data;
    // sun = centroid of the brightest pixels in the upper hemisphere
    let best = 0;
    for (let y = 0; y < h / 2; y++) for (let i = 0; i < w; i++) { const p = (y * w + i) * 4; best = Math.max(best, d[p] + d[p + 1] + d[p + 2]); }
    let sx = 0, sy = 0, sn = 0;
    for (let y = 0; y < h / 2; y++) for (let i = 0; i < w; i++) {
      const p = (y * w + i) * 4; if (d[p] + d[p + 1] + d[p + 2] >= best - 6) { sx += Math.cos(i / w * Math.PI * 2); sy += Math.sin(i / w * Math.PI * 2); sn++; }
    }
    let sunV = 0; for (let y = 0; y < h / 2; y++) for (let i = 0; i < w; i++) { const p = (y * w + i) * 4; if (d[p] + d[p + 1] + d[p + 2] >= best - 6) sunV += y; }
    const u = ((Math.atan2(sy, sx) / (Math.PI * 2)) + 1) % 1;
    const v = sunV / Math.max(1, sn) / h;
    // horizon colour: average band just above the horizon line
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = Math.floor(h * 0.44); y < Math.floor(h * 0.5); y++) for (let i = 0; i < w; i++) { const p = (y * w + i) * 4; r += d[p]; g += d[p + 1]; b += d[p + 2]; n++; }
    const horizon = new THREE.Color(r / n / 255, g / n / 255, b / n / 255).convertSRGBToLinear();
    // three.js equirect mapping: u = atan(dir.z, dir.x) / 2PI + 0.5, v = asin(dir.y) / PI + 0.5 (v=1 top)
    const phi = (u - 0.5) * Math.PI * 2, theta = (0.5 - v) * Math.PI;
    const sunDir = new THREE.Vector3(Math.cos(theta) * Math.cos(phi), Math.sin(theta), Math.cos(theta) * Math.sin(phi)).normalize();
    return { sunDir, horizon, brightness: best / 765 };
  };

  const load = (name) => {
    if (cache[name]) return cache[name];
    const p = Promise.all([
      new Promise((res, rej) => hdr.load(`/env/${name}.hdr`, res, undefined, rej)),
      new Promise((res, rej) => img.load(`/env/${name}.jpg`, res, undefined, rej)),
    ]).then(([h, bg]) => {
      h.mapping = THREE.EquirectangularReflectionMapping;
      const env = pmrem.fromEquirectangular(h).texture; h.dispose();
      bg.mapping = THREE.EquirectangularReflectionMapping; bg.colorSpace = THREE.SRGBColorSpace;
      const info = analyse(bg.image);
      // convert the backdrop to a cubemap now, so switching skies mid-scroll never stalls a frame
      const rt = new THREE.WebGLCubeRenderTarget(faceSize, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
      rt.fromEquirectangularTexture(renderer, bg); bg.dispose();
      return { name, env, bg: rt.texture, rt, ...info };
    });
    cache[name] = p;
    return p;
  };
  const dispose = () => { pmrem.dispose(); Object.values(cache).forEach(p => p.then(s => { s.env.dispose(); s.rt.dispose(); }).catch(() => {})); };
  return { load, dispose };
}

/** PBR set: diffuse, normal (GL), ARM (ao/rough/metal). Each map keeps its own repeat/offset. */
export function createPBR(THREE, renderer, manager) {
  const tl = new THREE.TextureLoader(manager);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const cache = {};
  const tex = (url, srgb) => {
    const t = tl.load(url);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  /** Apply a PBR set to a material. repeat = [u, v]. */
  const apply = (mat, name, repeat = [1, 1], opts = {}) => {
    const set = cache[name] || (cache[name] = { diff: `/tex/${name}_diff.webp`, nor: `/tex/${name}_nor.webp`, arm: `/tex/${name}_arm.webp` });
    const t = (k, srgb) => { const x = tex(set[k], srgb); x.repeat.set(repeat[0], repeat[1]); return x; };
    if (opts.map !== false) { mat.map = t('diff', true); }
    mat.normalMap = t('nor', false);
    mat.normalScale = new THREE.Vector2(opts.normal ?? 1, opts.normal ?? 1);
    const arm = t('arm', false);
    mat.aoMap = arm; mat.aoMapIntensity = opts.ao ?? 1;
    mat.roughnessMap = arm; mat.roughness = opts.roughness ?? 1;
    if (opts.metal) { mat.metalnessMap = arm; mat.metalness = 1; }
    if (opts.color !== undefined) mat.color.set(opts.color); else if (opts.map !== false) mat.color.set(0xffffff);
    mat.needsUpdate = true;
    return mat;
  };
  return { apply, tex };
}

/**
 * Weathering: darkens and roughens surfaces near the ground and adds world-space grime noise.
 * Cheap, no extra textures — removes the "fresh plastic toy" look from procedural models.
 */
export function addGrime(mat, { height = 1.2, amount = 0.45, tint = 0x3b2f24, noise = 0.35, scale = 1.6 } = {}) {
  if (mat.userData.grime) return mat;
  mat.userData.grime = true;
  const tintCol = { r: ((tint >> 16) & 255) / 255, g: ((tint >> 8) & 255) / 255, b: (tint & 255) / 255 };
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.gH = { value: height }; sh.uniforms.gA = { value: amount }; sh.uniforms.gN = { value: noise }; sh.uniforms.gS = { value: scale };
    sh.uniforms.gT = { value: [tintCol.r ** 2.2, tintCol.g ** 2.2, tintCol.b ** 2.2] };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvGW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vGW; uniform float gH, gA, gN, gS; uniform vec3 gT;
float gHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float gNoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(gHash(i), gHash(i+vec3(1,0,0)), f.x), mix(gHash(i+vec3(0,1,0)), gHash(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(gHash(i+vec3(0,0,1)), gHash(i+vec3(1,0,1)), f.x), mix(gHash(i+vec3(0,1,1)), gHash(i+vec3(1,1,1)), f.x), f.y), f.z); }
float gFbm(vec3 p){ return gNoise(p) * 0.55 + gNoise(p * 2.7) * 0.3 + gNoise(p * 7.1) * 0.15; }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
float gF = gFbm(vGW * gS);
float gLow = 1.0 - smoothstep(0.0, gH, vGW.y + (gF - 0.5) * gH * 0.8);
float gMask = clamp(gLow * gA + (gF - 0.55) * gN, 0.0, 1.0);
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * gT * 2.2, gMask);
roughnessFactor = mix(roughnessFactor, 0.95, gMask * 0.8);`);
  };
  // constant key: every weathered material of the same type shares ONE compiled program
  // (the per-material values above are uniforms, so they don't need their own shader)
  mat.customProgramCacheKey = () => 'grime';
  mat.needsUpdate = true;
  return mat;
}
