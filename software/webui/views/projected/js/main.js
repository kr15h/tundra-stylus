'use strict';
import * as THREE from 'three';

const canvas = document.getElementById('pv-canvas');
const ctx = canvas.getContext('2d', { alpha: false });

let lastPayload = null;

function resizeCanvasToDisplaySize() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  const w = Math.round(rect.width * dpr);
  const h = Math.round(rect.height * dpr);

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

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

window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  lastPayload = data;

  if (data.type === 'ping') {
    window.opener?.postMessage({ type: 'pong' }, '*');
    return;
  }

  if (data.type === 'calibration') {
    performCalibration(data.points);
    return;
  }
});

if (window.opener) {
  window.opener.postMessage({ type: 'projected-view-ready' }, '*');
}

render();
