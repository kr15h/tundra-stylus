'use strict';

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

  requestAnimationFrame(render);
}

window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  lastPayload = data;

  if (data.type === 'ping') {
    window.opener?.postMessage({ type: 'pong' }, '*');
  }
});

if (window.opener) {
  window.opener.postMessage({ type: 'projected-view-ready' }, '*');
}

render();
