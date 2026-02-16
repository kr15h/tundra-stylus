import * as THREE from 'three';

export function toVec3(pt) {
  if (Array.isArray(pt) && pt.length >= 3) {
    return new THREE.Vector3(Number(pt[0]), Number(pt[1]), Number(pt[2]));
  }
  if (pt && typeof pt === 'object') {
    return new THREE.Vector3(Number(pt.x), Number(pt.y), Number(pt.z));
  }
  return null;
}

// Builds a plane basis from 4 corners assumed in rectangle order:
// p0 (origin), p1 (+u), p2 (diag), p3 (+v)
export function buildPlaneBasis(worldPts) {
  if (!Array.isArray(worldPts) || worldPts.length < 4) return null;

  const p0 = worldPts[0];
  const p1 = worldPts[1];
  const p3 = worldPts[3];

  const uAxis = p1.clone().sub(p0);
  const vAxis = p3.clone().sub(p0);

  const width = uAxis.length();
  const height = vAxis.length();

  if (width < 1e-9 || height < 1e-9) return null;

  const uHat = uAxis.clone().multiplyScalar(1 / width);
  const vHat = vAxis.clone().multiplyScalar(1 / height);

  return { p0, uHat, vHat, width, height };
}

export function worldToUV(worldPoint, basis) {
  const d = worldPoint.clone().sub(basis.p0);
  const u = d.dot(basis.uHat) / basis.width;
  const v = d.dot(basis.vHat) / basis.height;
  return { u, v };
}

// Convenience: convert 4 world points into 4 UV points
export function worldQuadToUVQuad(worldPts) {
  const basis = buildPlaneBasis(worldPts);
  if (!basis) return null;

  return worldPts.slice(0, 4).map(p => worldToUV(p, basis));
}
