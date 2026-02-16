'use strict';
import * as THREE from 'three';
import { toVec3, worldQuadToUVQuad } from './plane-uv.js';
import { solveHomography4 } from './homography.js';

const canvas = document.getElementById('pv-canvas');
const ctx = canvas.getContext('2d', { alpha: false });

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
  showIndex: null,
  worldPoints: [null, null, null, null],
  homography: null,
  done: false
};

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

  ctx.strokeStyle = '#fff';
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

  if (calib.done) {
    drawCalibrationDone();
  }

  if (lastPayload?.type === 'primitives') {
    drawPrimitives(lastPayload);
  }

  if (lastPayload?.type === 'calibration-quad') {
    renderCalibrationQuad(lastPayload);
  }

  requestAnimationFrame(render);
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
  ctx.fillText(`Touch point ${calib.showIndex + 1} / 4`, 12, 70);

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

function computeHomographyFromWorldToScreen(worldPoints) {
  const uv = worldQuadToUVQuad(worldPoints);
  if (!uv) return null;

  const src = uv.map(p => ({ x: p.u, y: p.v }));

  const dstPts = getMarkerPixels();
  const dst = dstPts.map(p => ({ x: p.x, y: p.y }));

  return solveHomography4(src, dst);
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
  if (e.key === 'f' && !isFullscreen()) {
    enterFullscreen();
  } else {
    exitFullscreen();
  }
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
    calib.done = false;
    calib.showIndex = null;
    calib.worldPoints = [null, null, null, null];
    calib.homography = null;
    return;
  }

  if (data.type === 'calibration-show') {
    calib.active = true;
    calib.showIndex = Number(data.index);
    return;
  }

  if (data.type === 'calibration-world-point') {
    const i = Number(data.index);
    if (i >= 0 && i < 4) {
      calib.worldPoints[i] = toVec3(data.point); // you already have toVec3() :contentReference[oaicite:5]{index=5}
    }

    if (calib.worldPoints.every(p => p)) {
      // Next step: compute homography here and mark done
      calib.homography = computeHomographyFromWorldToScreen(calib.worldPoints);
      calib.done = true;
      calib.active = false;

      // Optional: tell host we’re done
      window.opener?.postMessage({
        type: 'calibration-finished',
        homography: calib.homography
      }, '*');
    }
    return;
  }

  lastPayload = data;
});


if (window.opener) {
  window.opener.postMessage({ type: 'projected-view-ready' }, '*');
}

render();
