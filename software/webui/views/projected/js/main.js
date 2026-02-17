'use strict';

import * as THREE from 'three';
import { toVec3, worldQuadToUVQuad } from './plane-uv.js';
import { solveHomography4 } from './homography.js';
import { computeContentUvToProjectorHomography, surfaceWorldQuadToProjectorPixels } from './surface-fit.js';
import { buildPlaneBasis, worldToUV } from './plane-uv.js';

const canvas = document.getElementById('pv-canvas');
const ctx = canvas.getContext('2d', { alpha: false });

const sourceCanvas = document.createElement('canvas');
const sourceCtx = sourceCanvas.getContext('2d', { alpha: false });

function resizeSourceCanvas() {
  const rect = canvas.getBoundingClientRect();
  sourceCanvas.width = Math.max(2, Math.round(rect.width));
  sourceCanvas.height = Math.max(2, Math.round(rect.height));
}

function drawSurfaceFillToSource() {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  sourceCtx.fillStyle = '#000';
  sourceCtx.fillRect(0, 0, w, h);

  // Big obvious fill
  sourceCtx.fillStyle = '#ffffff';
  sourceCtx.fillRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);

  // Border
  sourceCtx.strokeStyle = '#000';
  sourceCtx.lineWidth = 10;
  sourceCtx.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
}

let lastPayload = null;

function getMarkerPixels() {
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  // spread: how far from center the markers should be (in pixels)
  // Using min(w,h) makes it stable across aspect ratios.
  const spread = Math.min(w, h) * 0.18; // tweak: 0.12 (closer) ... 0.22 (wider)
  const cx = w * 0.5;
  const cy = h * 0.5;

  const dx = spread * 0.5;
  const dy = spread * 0.5;

  return [
    { x: cx - dx, y: cy - dy }, // top-left of the inner quad
    { x: cx + dx, y: cy - dy }, // top-right
    { x: cx + dx, y: cy + dy }, // bottom-right
    { x: cx - dx, y: cy + dy }  // bottom-left
  ];
}

const calib = {
  active: false,
  showIndex: null, // 0..7
  projectorWorldPoints: [null, null, null, null], // A-D
  surfaceWorldPoints: [null, null, null, null],   // E-H
  homography: null, // H mapping plane-UV -> projector pixels (from A-D)
  contentHomography: null,  // H_contentUvToProjPx (from E-H + homography)
  planeBasis: null,
  doneProjector: false,
  doneSurface: false
};

function applyHomographyToPoint(H, x, y) {
  const d = H[6] * x + H[7] * y + H[8];
  const X = (H[0] * x + H[1] * y + H[2]) / d;
  const Y = (H[3] * x + H[4] * y + H[5]) / d;
  return { x: X, y: Y };
}

function resizeCanvasToDisplaySize() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);

  // Use *CSS pixel* size from layout
  const rect = canvas.getBoundingClientRect();
  const displayWidth = Math.round(rect.width * dpr);
  const displayHeight = Math.round(rect.height * dpr);

  // Resize drawing buffer to match display size
  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }

  // Draw in CSS pixels (so you can use rect.width/height in your math)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawBaseline() {
  const w = canvas.getBoundingClientRect().width;
  const h = canvas.getBoundingClientRect().height;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#0f0';
  ctx.font = '14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
  ctx.fillText('Projected View: ready', 12, 24);

  if (lastPayload?.type) {
    ctx.fillStyle = '#bbb';
    ctx.fillText(`last message: ${lastPayload.type}`, 12, 44);
  }
}

// Expected payload shape:
// { type: 'primitives', lines: [ [ [x,y], [x,y], ... ], ... ] }
// x,y are normalized [0..1]
function drawPrimitives(payload) {
  const w = canvas.getBoundingClientRect().width;
  const h = canvas.getBoundingClientRect().height;

  const lines = payload?.lines;
  if (!Array.isArray(lines)) return;

  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 2;

  for (const line of lines) {
    if (!Array.isArray(line) || line.length < 2) continue;

    ctx.beginPath();
    for (let i = 0; i < line.length; i++) {
      const pt = line[i];
      if (!pt || pt.length < 2) continue;

      const x = pt[0] * w;
      const y = pt[1] * h;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function render() {
  resizeCanvasToDisplaySize();

  drawBaseline();
  drawMarker();
  drawSurfaceQuadOutline();

  if (calib.doneSurface) {
    drawCalibrationDone();
  }

  if (lastPayload?.type === 'primitives') {
    drawPrimitives(lastPayload);
  }

  if (lastPayload?.type === 'calibration-quad') {
    renderCalibrationQuad(lastPayload);
  }

  requestAnimationFrame(render);

  const w = canvas.getBoundingClientRect().width;
  const h = canvas.getBoundingClientRect().height;

  ctx.strokeStyle = '#f0f';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);
}

function toPoint2(pt) {
  // Accept either arrays [x, y, z?] or objects { x, y, z? }
  if (Array.isArray(pt)) {
    return { x: Number(pt[0]), y: Number(pt[1]) };
  }
  if (pt && typeof pt === 'object') {
    return { x: Number(pt.x), y: Number(pt.y) };
  }
  return null;
}

/*
function toVec3(pt) {
  // Accept arrays [x,y,z] or objects {x,y,z}
  if (Array.isArray(pt) && pt.length >= 3) {
    return new THREE.Vector3(Number(pt[0]), Number(pt[1]), Number(pt[2]));
  }
  if (pt && typeof pt === 'object') {
    return new THREE.Vector3(Number(pt.x), Number(pt.y), Number(pt.z));
  }
  return null;
}
*/

function performCalibration(pointsWorld) {
  if (!Array.isArray(pointsWorld) || pointsWorld.length < 4) return;

  const pts = pointsWorld
    .map(toVec3)
    .filter(v => v && Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z));

  if (pts.length < 4) return;

  // Minimal assumption about ordering:
  // p0 = origin corner, p1 defines +u direction, p3 defines +v direction
  // (i.e., points are [p0, p1, p2, p3] around the rectangle)
  const p0 = pts[0];
  const p1 = pts[1];
  const p3 = pts[3];

  const uAxis = p1.clone().sub(p0);
  const vAxis = p3.clone().sub(p0);

  const width = uAxis.length();
  const height = vAxis.length();
  if (width < 1e-9 || height < 1e-9) return;

  const uHat = uAxis.clone().multiplyScalar(1 / width);
  const vHat = vAxis.clone().multiplyScalar(1 / height);

  // Convert each world point to local (u,v) in rectangle coordinates
  const quad = pts.slice(0, 4).map((p) => {
    const d = p.clone().sub(p0);
    const u = d.dot(uHat) / width;   // normalized 0..1 if point lies on rectangle corners
    const v = d.dot(vHat) / height;  // normalized 0..1
    return { x: u, y: v };
  });

  // Store for rendering
  lastPayload = {
    type: 'calibration-quad',
    quad
  };
}

function renderCalibrationQuad(payload) {
  const quad = payload?.quad;
  if (!Array.isArray(quad) || quad.length < 4) return;

  const w = canvas.getBoundingClientRect().width;
  const h = canvas.getBoundingClientRect().height;

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;

  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const p = quad[i];
    const x = p.x * w;
    const y = p.y * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawSurfaceQuadOutline() {
  if (!calib.doneSurface || !calib.homography || !calib.planeBasis) return;

  const uv = calib.surfaceWorldPoints.map(p => worldToUV(p, calib.planeBasis));
  const quadPx = uv.map(p => applyHomographyToPoint(calib.homography, p.u, p.v));

  ctx.save();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 6;

  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const p = quadPx[i];
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = '16px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
  ctx.fillText('Surface quad (EFGH)', 12, 92);

  ctx.restore();
}

function enterFullscreen() {
  const el = document.documentElement;

  if (el.requestFullscreen) {
    el.requestFullscreen();
  }
}

function exitFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
}

function isFullscreen() {
  return document.fullscreenElement !== null;
}

function showFullscreenButton() {
  const fsButton = document.getElementById("button_fullscreen");
  if (fsButton.classList.contains('hidden')) {
    fsButton.classList.remove('hidden');
  }
}

function hideFullscreenButton() {
  const fsButton = document.getElementById("button_fullscreen");
  if (!fsButton.classList.contains('hidden')) {
    fsButton.classList.add('hidden');
  }
}

function drawMarker() {
  if (!calib.active || calib.done) return;
  if (calib.showIndex === null) return;

  if (calib.showIndex >= 4) {
    // Don’t draw a target marker for table corners; just show text.
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.font = '16px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    ctx.fillText(`Surface corners ${calib.showIndex - 3} / 4 (E-H)`, 12, 70);
    ctx.restore();
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  const pts = getMarkerPixels();
  const p = pts[calib.showIndex];
  if (!p) return;

  const x = p.x;
  const y = p.y;

  ctx.save();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - 28, y);
  ctx.lineTo(x + 28, y);
  ctx.moveTo(x, y - 28);
  ctx.lineTo(x, y + 28);
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = '16px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

  if (calib.showIndex <= 3) {
    ctx.fillText(`Projector calibration ${calib.showIndex + 1} / 4 (A-D)`, 12, 70);
  } else {
    ctx.fillText(`Surface corners ${calib.showIndex - 3} / 4 (E-H)`, 12, 70);
  }

  ctx.restore();
}

function drawCalibrationDone() {
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#00ff66';
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  ctx.fillStyle = '#000';
  ctx.font = '18px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
  ctx.fillText('Calibration complete', 12, 34);
  ctx.restore();
}

function computeHomographyFromBasisToScreen(basis) {
  // A-D in UV space are exactly the unit square in this basis:
  const src = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 }
  ];

  // Destination are the marker pixels you displayed for A-D (centered set)
  const dstPts = getMarkerPixels(); // your centered marker layout
  const dst = dstPts.map(p => ({ x: p.x, y: p.y }));

  return solveHomography4(src, dst);
}

function pixelsHomographyToUvHomography(Hpx) {
  // Convert mapping from source UV -> pixel to source UV -> screen UV by scaling pixels by 1/width, 1/height.
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  // Left-multiply by normalization matrix N:
  // [1/w  0   0]
  // [ 0  1/h  0]
  // [ 0   0   1]
  const N = [
    1 / w, 0, 0,
    0, 1 / h, 0,
    0, 0, 1
  ];

  return mul3x3(N, Hpx);
}

function mul3x3(A, B) {
  const out = new Array(9);
  out[0] = A[0]*B[0] + A[1]*B[3] + A[2]*B[6];
  out[1] = A[0]*B[1] + A[1]*B[4] + A[2]*B[7];
  out[2] = A[0]*B[2] + A[1]*B[5] + A[2]*B[8];

  out[3] = A[3]*B[0] + A[4]*B[3] + A[5]*B[6];
  out[4] = A[3]*B[1] + A[4]*B[4] + A[5]*B[7];
  out[5] = A[3]*B[2] + A[4]*B[5] + A[5]*B[8];

  out[6] = A[6]*B[0] + A[7]*B[3] + A[8]*B[6];
  out[7] = A[6]*B[1] + A[7]*B[4] + A[8]*B[7];
  out[8] = A[6]*B[2] + A[7]*B[5] + A[8]*B[8];
  return out;
}

document.addEventListener('fullscreenchange', () => {
  if (!isFullscreen()) {
    showFullscreenButton();
    resizeCanvasToDisplaySize();
  } else {
    hideFullscreenButton();
    resizeCanvasToDisplaySize();
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'f' && !isFullscreen()) enterFullscreen();
  if (e.key === 'q' && isFullscreen()) exitFullscreen();
});

window.addEventListener('resize', () => {
  resizeCanvasToDisplaySize();
});

const fsButton = document.getElementById("button_fullscreen");
fsButton.addEventListener('click', (e) => {
  enterFullscreen();
});

window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'ping') {
    window.opener?.postMessage({ type: 'pong' }, '*');
    return;
  }

  if (data.type === 'calibration-start') {
    calib.active = true;
    calib.showIndex = null;

    calib.projectorWorldPoints = [null, null, null, null];
    calib.surfaceWorldPoints = [null, null, null, null];

    calib.homography = null;
    calib.contentHomography = null;
    calib.doneProjector = false;
    calib.doneSurface = false;
    return;
  }

  if (data.type === 'calibration-show') {
    calib.active = true;
    calib.showIndex = Number(data.index);
    return;
  }

  if (data.type === 'calibration-world-point') {
    const i = Number(data.index);

    // A-D (0..3): store points
    if (i >= 0 && i < 4) {
      calib.projectorWorldPoints[i] = toVec3(data.point);

      // Once A-D are all present, compute plane basis + projector homography ONCE
      if (calib.projectorWorldPoints.every(p => p) && !calib.doneProjector) {
        calib.planeBasis = buildPlaneBasis(calib.projectorWorldPoints);
        if (!calib.planeBasis) return;

        // This homography maps plane-UV (defined by A-D basis) -> projector pixels (marker quad)
        calib.homography = computeHomographyFromBasisToScreen(calib.planeBasis);
        calib.doneProjector = true;

        window.opener?.postMessage({
          type: 'calibration-finished',
          homography: calib.homography
        }, '*');
      }

      return;
    }

    // E-H (4..7): store points
    if (i >= 4 && i < 8) {
      calib.surfaceWorldPoints[i - 4] = toVec3(data.point);

      if (calib.surfaceWorldPoints.every(p => p) && !calib.doneSurface) {
        calib.doneSurface = true;

        // IMPORTANT: use the SAME plane basis from A-D
        const uv = calib.surfaceWorldPoints.map(p => worldToUV(p, calib.planeBasis));
        const dst = uv.map(p => applyHomographyToPoint(calib.homography, p.u, p.v));

        // Content unit square -> surface quad pixels
        const srcUnit = [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 0, y: 1 }
        ];

        calib.contentHomography = solveHomography4(srcUnit, dst);

        window.opener?.postMessage({
          type: 'surface-fit-finished',
          contentHomography: calib.contentHomography
        }, '*');
      }

      return;
    }

    return;
  }
});

if (window.opener) {
  window.opener.postMessage({ type: 'projected-view-ready' }, '*');
}

render();
