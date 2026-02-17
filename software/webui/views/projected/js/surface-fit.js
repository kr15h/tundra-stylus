import { worldQuadToUVQuad } from './plane-uv.js';
import { solveHomography4 } from './homography.js';

export function applyHomographyToPoint(H, x, y) {
  const d = H[6] * x + H[7] * y + H[8];
  const X = (H[0] * x + H[1] * y + H[2]) / d;
  const Y = (H[3] * x + H[4] * y + H[5]) / d;
  return { x: X, y: Y };
}

// Convert a world quad (E-H) into projector pixels using the existing planeUV->projPx homography.
export function surfaceWorldQuadToProjectorPixels(surfaceWorldPts, H_planeUvToProjPx) {
  if (!H_planeUvToProjPx) return null;

  const uvQuad = worldQuadToUVQuad(surfaceWorldPts);
  if (!uvQuad) return null;

  return uvQuad.map(p => applyHomographyToPoint(H_planeUvToProjPx, p.u, p.v));
}

// Compute a content-fit homography that maps the unit square to the surface quad in projector pixels.
export function computeContentUvToProjectorHomography(surfaceWorldPts, H_planeUvToProjPx) {
  const dstQuadPx = surfaceWorldQuadToProjectorPixels(surfaceWorldPts, H_planeUvToProjPx);
  if (!dstQuadPx) return null;

  const srcUnit = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 }
  ];

  return solveHomography4(srcUnit, dstQuadPx);
}
