// Draw-call reduction: merges every static mesh under a group into one mesh per material.
// Anything that moves, scales, toggles visibility or is an instanced mesh must be marked
// with `obj.userData.dyn = true`; such objects are left in place and baked recursively on their own.
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const KEEP = ['position', 'normal', 'uv'];

function prepare(THREE, geo, matrix) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const name of Object.keys(g.attributes)) if (!KEEP.includes(name)) g.deleteAttribute(name);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  g.clearGroups();
  g.morphAttributes = {};
  g.applyMatrix4(matrix);
  return g;
}

/**
 * Merge static meshes of `root` (in root-local space). Returns number of meshes removed.
 */
export function bakeStatic(THREE, root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const victims = [];
  const nested = [];

  const visit = (obj) => {
    for (const child of obj.children) {
      if (child.userData.dyn || child.isInstancedMesh || child.isLight || child.isSprite || child.isPoints || child.isLine) {
        if (child.userData.dyn && child.children.length) nested.push(child);
        continue;
      }
      if (child.isMesh) {
        const mat = child.material;
        if (Array.isArray(mat) || !child.visible) { continue; }
        const key = mat.uuid + '|' + (child.castShadow ? 1 : 0) + (child.receiveShadow ? 1 : 0);
        if (!buckets.has(key)) buckets.set(key, { mat, cast: child.castShadow, recv: child.receiveShadow, geos: [] });
        const m = new THREE.Matrix4().multiplyMatrices(inv, child.matrixWorld);
        buckets.get(key).geos.push(prepare(THREE, child.geometry, m));
        victims.push(child);
      }
      if (child.children.length) visit(child);
    }
  };
  visit(root);

  // detach baked meshes; keep any (non-mesh) children they had by re-parenting to root
  for (const v of victims) {
    const kids = v.children.slice();
    for (const k of kids) root.attach(k);
    v.parent.remove(v);
  }
  // remove groups that became empty
  const prune = (obj) => { for (const c of obj.children.slice()) { prune(c); if (c.isGroup && !c.children.length && !c.userData.dyn) obj.remove(c); } };
  prune(root);

  for (const { mat, cast, recv, geos } of buckets.values()) {
    if (!geos.length) continue;
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    geos.forEach(g => { if (g !== merged) g.dispose(); });
    if (!merged) continue;
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = cast; mesh.receiveShadow = recv; mesh.name = 'baked:' + (mat.name || 'mat');
    root.add(mesh);
  }
  for (const n of nested) bakeStatic(THREE, n);
  return victims.length;
}

/** Mark objects as dynamic (excluded from baking). */
export const dyn = (...objs) => { objs.forEach(o => { if (o) o.userData.dyn = true; }); return objs[0]; };
