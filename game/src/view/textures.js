// Comic-book textures painted in code on canvases: flat colours, bold dark lines, a few halftone dots.
// Used by the registry for the level (roof, walls, skyline) and for placeholder props.
// Characters and the Tripo props get their own painted textures in stage 5.

import * as THREE from 'three';

const cache = new Map();
let seed = 1;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function canvasTexture(key, w, h, paint, { repeat = null, nearest = false } = {}) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  seed = 1 + key.length * 977;
  paint(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  if (nearest) { t.magFilter = THREE.NearestFilter; }
  cache.set(key, t);
  return t;
}

// A texture with its own repeat, sharing the canvas with the cached one.
export function repeated(tex, rx, ry) {
  const t = tex.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  return t;
}

function halftone(g, x, y, w, h, color, step = 10, maxR = 2.6, dir = 1) {
  g.fillStyle = color;
  for (let yy = 0; yy < h; yy += step) {
    for (let xx = (yy / step) % 2 ? step / 2 : 0; xx < w; xx += step) {
      const k = dir > 0 ? (yy / h) : 1 - yy / h;
      const r = maxR * k;
      if (r < 0.3) continue;
      g.beginPath(); g.arc(x + xx, y + yy, r, 0, Math.PI * 2); g.fill();
    }
  }
}

// Roof top: 16 x 10 m, 64 px per metre.
export function roofTexture(width, depth) {
  const ppm = 64;
  return canvasTexture(`roof${width}x${depth}`, width * ppm, depth * ppm, (g, w, h) => {
    g.fillStyle = '#8f8b86'; g.fillRect(0, 0, w, h);
    // concrete speckle
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = rnd() < 0.5 ? 'rgba(60,55,58,0.18)' : 'rgba(255,250,240,0.14)';
      g.fillRect(rnd() * w, rnd() * h, 2, 2);
    }
    // slab panels: slightly different greys
    for (let x = 0; x < width; x += 2) for (let z = 0; z < depth; z += 2) {
      g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${0.03 + rnd() * 0.04})`;
      g.fillRect(x * ppm, z * ppm, 2 * ppm, 2 * ppm);
    }
    // tar seams
    g.strokeStyle = '#3d3739'; g.lineWidth = 5;
    for (let x = 2; x < width; x += 2) { g.beginPath(); g.moveTo(x * ppm, 0); g.lineTo(x * ppm, h); g.stroke(); }
    for (let z = 2; z < depth; z += 2) { g.beginPath(); g.moveTo(0, z * ppm); g.lineTo(w, z * ppm); g.stroke(); }
    // oil stains
    for (let i = 0; i < 7; i++) {
      const x = rnd() * w, y = rnd() * h, r = 20 + rnd() * 50;
      g.fillStyle = 'rgba(40,32,38,0.22)';
      g.beginPath(); g.ellipse(x, y, r, r * (0.5 + rnd() * 0.5), rnd() * 3, 0, Math.PI * 2); g.fill();
    }
    // faded yellow fight square in the middle (6 x 5 m), chipped paint
    const cx = w / 2, cy = h / 2 + 0.5 * ppm, sw = 6 * ppm, sh = 5 * ppm;
    g.strokeStyle = 'rgba(242,200,60,0.75)'; g.lineWidth = 0.18 * ppm; g.setLineDash([0.9 * ppm, 0.25 * ppm]);
    g.strokeRect(cx - sw / 2, cy - sh / 2, sw, sh);
    g.setLineDash([]);
    g.fillStyle = 'rgba(242,200,60,0.55)';
    g.font = `bold ${0.7 * ppm}px Impact, "Arial Black", sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('NO PARKING', cx, cy + sh / 2 - 0.55 * ppm);
    // drain grates
    for (const [gx, gz] of [[3.2, 7.4], [12.6, 3.4]]) {
      const x = gx * ppm, y = gz * ppm, s = 0.6 * ppm;
      g.fillStyle = '#2a2528'; g.fillRect(x - s / 2, y - s / 2, s, s);
      g.strokeStyle = '#6b6467'; g.lineWidth = 3;
      for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(x - s / 2 + (i * s) / 5, y - s / 2); g.lineTo(x - s / 2 + (i * s) / 5, y + s / 2); g.stroke(); }
      g.strokeStyle = '#0b0b10'; g.lineWidth = 4; g.strokeRect(x - s / 2, y - s / 2, s, s);
    }
    // halftone shading in the far corners
    halftone(g, 0, 0, w, 1.2 * ppm, 'rgba(40,30,50,0.35)', 12, 3, -1);
  });
}

// Brick parapet face: one tile = 2 m wide x 0.6 m tall.
export function brickTexture() {
  return canvasTexture('brick', 256, 77, (g, w, h) => {
    g.fillStyle = '#5a2f2a'; g.fillRect(0, 0, w, h);
    const rows = 4, bh = h / rows, bw = w / 6;
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? bw / 2 : 0;
      for (let x = -bw; x < w + bw; x += bw) {
        const shade = 150 + Math.floor(rnd() * 30);
        g.fillStyle = `rgb(${shade + 20},${Math.floor(shade * 0.48)},${Math.floor(shade * 0.38)})`;
        g.fillRect(x + off + 2, r * bh + 2, bw - 4, bh - 4);
      }
    }
    halftone(g, 0, 0, w, h, 'rgba(30,10,10,0.35)', 7, 1.8, 1);
  }, { repeat: true });
}

// Building wall below the roof: windows on purple brick. One tile = 4 m wide x 3 m tall.
export function facadeTexture() {
  return canvasTexture('facade', 256, 192, (g, w, h) => {
    g.fillStyle = '#5b4f6c'; g.fillRect(0, 0, w, h);
    for (const x of [40, 150]) {
      const lit = rnd() < 0.5;
      g.fillStyle = '#0b0b10'; g.fillRect(x - 4, 40 - 4, 74, 104);
      g.fillStyle = lit ? '#ffd27a' : '#2b2a4e'; g.fillRect(x, 40, 66, 96);
      g.fillStyle = '#0b0b10'; g.fillRect(x + 31, 40, 4, 96); g.fillRect(x, 86, 66, 4);
    }
    halftone(g, 0, 0, w, h, 'rgba(20,10,30,0.3)', 9, 2.4, 1);
  }, { repeat: true });
}

// Far skyline blocks: rows of lit and dark windows.
export function skylineTexture() {
  return canvasTexture('skyline', 128, 256, (g, w, h) => {
    g.fillStyle = '#241c3a'; g.fillRect(0, 0, w, h);
    for (let y = 10; y < h - 8; y += 18) for (let x = 8; x < w - 8; x += 20) {
      if (rnd() < 0.35) { g.fillStyle = rnd() < 0.7 ? '#ffcf6b' : '#ff8f6b'; g.fillRect(x, y, 10, 9); }
    }
  }, { repeat: true });
}

// Wooden crate face, 1 x 1 m.
export function crateTexture() {
  return canvasTexture('crate', 256, 256, (g, w, h) => {
    g.fillStyle = '#c0813f'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 42) {
      g.fillStyle = rnd() < 0.5 ? '#b5763a' : '#c98b47'; g.fillRect(0, y, w, 40);
      g.fillStyle = '#5a3412'; g.fillRect(0, y + 40, w, 3);
      for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(90,52,18,0.4)'; g.fillRect(rnd() * w, y + 8 + rnd() * 24, 30 + rnd() * 50, 2); }
    }
    // battens around the edge and a diagonal brace
    g.fillStyle = '#7a4d22';
    g.fillRect(0, 0, w, 26); g.fillRect(0, h - 26, w, 26); g.fillRect(0, 0, 26, h); g.fillRect(w - 26, 0, 26, h);
    g.save(); g.translate(w / 2, h / 2); g.rotate(-Math.PI / 4); g.fillRect(-w * 0.62, -13, w * 1.24, 26); g.restore();
    g.strokeStyle = '#0b0b10'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = '#2c2f38';
    for (const [x, y] of [[13, 13], [w - 13, 13], [13, h - 13], [w - 13, h - 13]]) { g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); }
  });
}

export function fragileTexture() {
  return canvasTexture('fragile', 256, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#efe0b0';
    g.font = 'bold 54px Impact, "Arial Black", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('FRAGILE', w / 2, h / 2 + 4);
  });
}

// Riveted metal panels for the water tank, wraps around the cylinder.
export function tankTexture() {
  return canvasTexture('tank', 512, 128, (g, w, h) => {
    g.fillStyle = '#6f8fa6'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 64) {
      g.fillStyle = rnd() < 0.5 ? '#7899ae' : '#68879c'; g.fillRect(x, 0, 64, h);
      g.fillStyle = '#2c3a46'; g.fillRect(x, 0, 3, h);
      g.fillStyle = '#c8d6e0';
      for (let y = 10; y < h; y += 22) { g.beginPath(); g.arc(x + 9, y, 2.4, 0, Math.PI * 2); g.fill(); }
    }
    // rust streaks
    for (let i = 0; i < 10; i++) { g.fillStyle = 'rgba(150,80,40,0.35)'; g.fillRect(rnd() * w, rnd() * h * 0.5, 4, 20 + rnd() * 40); }
    halftone(g, 0, 0, w, h, 'rgba(20,30,40,0.3)', 8, 2, 1);
  }, { repeat: true });
}
