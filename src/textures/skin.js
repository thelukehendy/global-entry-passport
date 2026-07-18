/**
 * Multi-tone skin albedo with subtle pores / noise (RGB canvas).
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

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mix(a, b, t) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

/** Preset skin undertones (hex). */
export const SKIN_TONES = {
  fair: { base: '#f0d0b4', undertone: '#e8b8a0', deep: '#d4a088' },
  light: { base: '#e8b989', undertone: '#d9a070', deep: '#c48960' },
  medium: { base: '#c68642', undertone: '#b06e38', deep: '#8f5528' },
  tan: { base: '#a56c3a', undertone: '#8f572c', deep: '#6e4020' },
  deep: { base: '#6b3f24', undertone: '#563018', deep: '#3d2210' },
  rich: { base: '#3b2214', undertone: '#2a160c', deep: '#1a0e08' },
};

/**
 * Create a multi-tone skin albedo texture with pores and soft variation.
 * @param {object} [options]
 * @param {string} [options.base='#e8b989']
 * @param {string} [options.undertone]
 * @param {string} [options.deep]
 * @param {keyof typeof SKIN_TONES} [options.preset]
 * @param {number} [options.size=512]
 * @param {number} [options.seed=1]
 * @param {number} [options.poreAmount=1]
 * @returns {THREE.CanvasTexture}
 */
export function createSkinTexture(options = {}) {
  const preset = options.preset ? SKIN_TONES[options.preset] : null;
  const baseHex = options.base || preset?.base || '#e8b989';
  const underHex = options.undertone || preset?.undertone || '#d9a070';
  const deepHex = options.deep || preset?.deep || '#c48960';
  const size = options.size || 512;
  const seed = options.seed ?? 1;
  const poreAmount = options.poreAmount ?? 1;

  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const base = hexToRgb(baseHex);
  const under = hexToRgb(underHex);
  const deep = hexToRgb(deepHex);

  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const nx = x / size;
      const ny = y / size;

      // Soft large-scale tone zones
      const zone =
        0.55 * hash(seed + nx * 3.1 + ny * 2.7) +
        0.3 * hash(seed * 2 + nx * 8.3 + ny * 7.1) +
        0.15 * hash(seed * 3 + nx * 21 + ny * 19);

      let col = mix(base, under, zone);
      // Cheek / edge cooling toward deep
      const edge = Math.pow(Math.hypot(nx - 0.5, ny - 0.45) * 1.4, 1.6);
      col = mix(col, deep, Math.min(0.45, edge * 0.35));

      // Pore / micro detail
      const pore = (hash(x * 1.7 + y * 2.3 + seed * 9) - 0.5) * 16 * poreAmount;
      const speck = hash(x * 5.1 + y * 4.2 + seed) > 0.97 ? -10 * poreAmount : 0;

      d[i] = clamp(col.r + pore + speck);
      d[i + 1] = clamp(col.g + pore * 0.85 + speck);
      d[i + 2] = clamp(col.b + pore * 0.7 + speck * 0.8);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Very soft subsurface blush wash
  const blush = ctx.createRadialGradient(size * 0.35, size * 0.55, 0, size * 0.35, size * 0.55, size * 0.25);
  blush.addColorStop(0, 'rgba(210,90,90,0.08)');
  blush.addColorStop(1, 'rgba(210,90,90,0)');
  ctx.fillStyle = blush;
  ctx.fillRect(0, 0, size, size);
  const blush2 = ctx.createRadialGradient(size * 0.65, size * 0.55, 0, size * 0.65, size * 0.55, size * 0.25);
  blush2.addColorStop(0, 'rgba(210,90,90,0.08)');
  blush2.addColorStop(1, 'rgba(210,90,90,0)');
  ctx.fillStyle = blush2;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Create skin texture from a named preset.
 * @param {keyof typeof SKIN_TONES} preset
 * @param {object} [extra]
 */
export function createSkinPresetTexture(preset, extra = {}) {
  return createSkinTexture({ ...extra, preset });
}

function clamp(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}
