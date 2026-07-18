/**
 * Optional wheelchair reference textures — brushed metal + rubber tire tread.
 */
import * as THREE from 'three';

function makeCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Brushed chrome / steel for wheelchair frame.
 * @param {number} [size=256]
 * @returns {THREE.CanvasTexture}
 */
export function createWheelchairMetalTexture(size = 256) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const brush = Math.sin(x * 0.35 + hash(y * 0.1) * 4) * 18;
      const n = (hash(x * 0.2 + y * 3.1) - 0.5) * 10;
      const v = 160 + brush + n;
      d[i] = clamp(v);
      d[i + 1] = clamp(v + 2);
      d[i + 2] = clamp(v + 6);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Specular streak
  const g = ctx.createLinearGradient(0, 0, size, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.2)');
  g.addColorStop(0.55, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = 4;
  return tex;
}

/**
 * Rubber tire with circumferential tread grooves.
 * Intended for a cylinder/torus UV (U around, V across tread).
 * @param {number} [width=512]
 * @param {number} [height=128]
 * @returns {THREE.CanvasTexture}
 */
export function createTireTreadTexture(width = 512, height = 128) {
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a1a1c';
  ctx.fillRect(0, 0, width, height);

  // Circumferential grooves (horizontal bands in UV)
  for (let y = 8; y < height; y += 14) {
    ctx.fillStyle = '#0c0c0e';
    ctx.fillRect(0, y, width, 5);
    ctx.fillStyle = 'rgba(60,60,65,0.35)';
    ctx.fillRect(0, y, width, 1);
  }

  // Block tread chevrons
  ctx.fillStyle = '#222226';
  for (let x = 0; x < width; x += 28) {
    for (let row = 0; row < 3; row++) {
      const y = 20 + row * 36;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 12, y + 8);
      ctx.lineTo(x + 12, y + 18);
      ctx.lineTo(x, y + 10);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 14, y + 8);
      ctx.lineTo(x + 26, y);
      ctx.lineTo(x + 26, y + 10);
      ctx.lineTo(x + 14, y + 18);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Micro rubber noise
  const img = ctx.getImageData(0, 0, width, height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (hash(i * 0.05) - 0.5) * 12;
    d[i] = clamp(d[i] + n);
    d[i + 1] = clamp(d[i + 1] + n);
    d[i + 2] = clamp(d[i + 2] + n);
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  tex.anisotropy = 4;
  return tex;
}

/**
 * Dark fabric / vinyl seat pad.
 * @param {string} [color='#2a2a32']
 * @param {number} [size=256]
 */
export function createWheelchairSeatTexture(color = '#2a2a32', size = 256) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 800; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.01 + hash(i) * 0.03})`;
    ctx.fillRect(hash(i * 2) * size, hash(i * 3) * size, 1, 1);
  }
  // Quilt seams
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo((size * i) / 4, 0);
    ctx.lineTo((size * i) / 4, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, (size * i) / 4);
    ctx.lineTo(size, (size * i) / 4);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function clamp(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}
