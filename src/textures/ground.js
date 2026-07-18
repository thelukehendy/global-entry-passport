/**
 * Plaza asphalt / concrete ground albedo textures.
 */
import * as THREE from 'three';

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function toTex(canvas, repeat = 4) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  return tex;
}

/**
 * Worn plaza asphalt with fine grit and faint cracks.
 * @param {object} [options]
 * @param {number} [options.size=512]
 * @param {string} [options.base='#4a4a4c']
 * @param {number} [options.repeat=6]
 * @returns {THREE.CanvasTexture}
 */
export function createAsphaltTexture(options = {}) {
  const size = options.size || 512;
  const base = options.base || '#4a4a4c';
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const grit = (hash(x * 0.9 + y * 1.3) - 0.5) * 28;
      const lump = (hash(Math.floor(x / 8) + Math.floor(y / 8) * 17) - 0.5) * 12;
      const v = 74 + grit + lump;
      d[i] = clamp(v);
      d[i + 1] = clamp(v - 1);
      d[i + 2] = clamp(v + 1);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Cracks
  ctx.strokeStyle = 'rgba(20,20,22,0.35)';
  ctx.lineWidth = 1;
  for (let c = 0; c < 8; c++) {
    let x = hash(c * 11) * size;
    let y = hash(c * 19 + 3) * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 12; s++) {
      x += (hash(c * 5 + s) - 0.5) * 40;
      y += (hash(c * 7 + s + 1) - 0.35) * 36;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Oil / wear blotches
  for (let i = 0; i < 10; i++) {
    const x = hash(i * 3.3) * size;
    const y = hash(i * 5.7) * size;
    const r = 20 + hash(i) * 40;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  return toTex(canvas, options.repeat ?? 6);
}

/**
 * Light concrete plaza tiles with grout.
 * @param {object} [options]
 * @param {number} [options.size=512]
 * @param {number} [options.tiles=6]
 * @param {number} [options.repeat=3]
 * @returns {THREE.CanvasTexture}
 */
export function createConcreteTexture(options = {}) {
  const size = options.size || 512;
  const tiles = options.tiles || 6;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const step = size / tiles;

  for (let ty = 0; ty < tiles; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      const shade = 190 + Math.floor((hash(tx * 13 + ty * 29) - 0.5) * 24);
      ctx.fillStyle = `rgb(${shade},${shade - 2},${shade - 4})`;
      ctx.fillRect(tx * step, ty * step, step + 1, step + 1);

      // Aggregate speckles
      for (let i = 0; i < 40; i++) {
        const a = 0.04 + hash(i + tx + ty) * 0.08;
        ctx.fillStyle = `rgba(80,80,70,${a})`;
        ctx.fillRect(
          tx * step + hash(i * 2 + tx) * step,
          ty * step + hash(i * 3 + ty) * step,
          1 + (hash(i) > 0.7 ? 1 : 0),
          1
        );
      }
    }
  }

  // Grout
  ctx.strokeStyle = 'rgba(120,118,110,0.85)';
  ctx.lineWidth = 3;
  for (let i = 0; i <= tiles; i++) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, size);
    ctx.moveTo(0, i * step);
    ctx.lineTo(size, i * step);
    ctx.stroke();
  }

  return toTex(canvas, options.repeat ?? 3);
}

/**
 * Default plaza ground — asphalt with a hint of concrete dust.
 * @param {object} [options]
 * @returns {THREE.CanvasTexture}
 */
export function createPlazaGroundTexture(options = {}) {
  return createAsphaltTexture(options);
}

function clamp(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}
