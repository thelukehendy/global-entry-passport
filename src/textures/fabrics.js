/**
 * Procedural fabric albedo maps (suit wool, cotton shirt, sari shimmer, denim).
 */
import * as THREE from 'three';

function makeCanvas(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toCanvasTexture(canvas, repeat = 2) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  return tex;
}

/**
 * Suit wool — fine herringbone / weave noise over base color.
 * @param {string} [baseColor='#1a2740']
 * @param {number} [size=512]
 */
export function createSuitWoolTexture(baseColor = '#1a2740', size = 512) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const { r, g, b } = hexToRgb(baseColor);
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const weave = ((x + y) % 4 < 2 ? 1 : -1) * 6 + ((x - y + 64) % 6 < 3 ? 3 : -2);
      const n = (hash(x * 0.37 + y * 1.13) - 0.5) * 18;
      d[i] = Math.max(0, Math.min(255, r + weave + n));
      d[i + 1] = Math.max(0, Math.min(255, g + weave + n));
      d[i + 2] = Math.max(0, Math.min(255, b + weave * 0.8 + n));
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Soft chalk stripe every ~32px
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < size; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  return toCanvasTexture(canvas, 3);
}

/**
 * Cotton shirt — soft fibers + faint grid.
 * @param {string} [baseColor='#f2f0ea']
 * @param {number} [size=256]
 */
export function createCottonShirtTexture(baseColor = '#f2f0ea', size = 256) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const { r, g, b } = hexToRgb(baseColor);
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const fiber = (hash(x * 2.1 + y * 0.4) - 0.5) * 12;
      const grid = x % 4 === 0 || y % 4 === 0 ? -4 : 0;
      d[i] = Math.max(0, Math.min(255, r + fiber + grid));
      d[i + 1] = Math.max(0, Math.min(255, g + fiber + grid));
      d[i + 2] = Math.max(0, Math.min(255, b + fiber * 0.9 + grid));
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toCanvasTexture(canvas, 4);
}

/**
 * Sari-like silk shimmer — diagonal highlights + soft color bands.
 * @param {string} [baseColor='#c43b6e']
 * @param {string} [accent='#f0c14a']
 * @param {number} [size=512]
 */
export function createSariShimmerTexture(baseColor = '#c43b6e', accent = '#f0c14a', size = 512) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, baseColor);
  grad.addColorStop(0.35, accent);
  grad.addColorStop(0.55, baseColor);
  grad.addColorStop(0.8, darkenHex(baseColor, 0.15));
  grad.addColorStop(1, accent);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Diagonal silk sheen bands
  for (let i = -size; i < size * 2; i += 18) {
    const a = 0.04 + hash(i) * 0.08;
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.lineWidth = 2 + hash(i + 3) * 3;
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();
  }

  // Gold border motif hint
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 10;
  ctx.strokeRect(16, 16, size - 32, size - 32);
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, size - 56, size - 56);
  ctx.globalAlpha = 1;

  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (hash(i * 0.01) - 0.5) * 10;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
  return toCanvasTexture(canvas, 2);
}

/**
 * Denim-ish twill weave.
 * @param {string} [baseColor='#2f4f7a']
 * @param {number} [size=512]
 */
export function createDenimTexture(baseColor = '#2f4f7a', size = 512) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const { r, g, b } = hexToRgb(baseColor);
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Diagonal twill
      const twill = ((x + y * 2) % 8 < 4 ? 10 : -8) + ((x * 2 - y) % 6 < 3 ? 4 : -3);
      const fade = (hash(x * 0.2 + y * 0.7) - 0.5) * 14;
      d[i] = Math.max(0, Math.min(255, r + twill * 0.5 + fade));
      d[i + 1] = Math.max(0, Math.min(255, g + twill * 0.55 + fade));
      d[i + 2] = Math.max(0, Math.min(255, b + twill * 0.7 + fade));
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Faint stitch lines
  ctx.strokeStyle = 'rgba(200,180,120,0.12)';
  ctx.lineWidth = 1;
  for (let y = 40; y < size; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  return toCanvasTexture(canvas, 3);
}

function darkenHex(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - amt;
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}
