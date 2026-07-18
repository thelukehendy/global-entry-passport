/**
 * High-detail procedural face albedo textures (RGB canvas → THREE.CanvasTexture).
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

function softEllipse(ctx, cx, cy, rx, ry, color) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawEye(ctx, cx, cy, opts) {
  const {
    eyeW = 14,
    eyeH = 9,
    iris = '#3a5f8a',
    pupil = '#12100e',
    lashes = true,
    browY = -14,
    browArch = 0.35,
    browThick = 2.4,
    browColor = '#2a1a12',
  } = opts;

  // Socket shade
  softEllipse(ctx, cx, cy + 1, eyeW * 1.35, eyeH * 1.6, 'rgba(80,40,30,0.18)');

  // Sclera
  ctx.fillStyle = '#f7f4ee';
  ctx.beginPath();
  ctx.ellipse(cx, cy, eyeW, eyeH, 0, 0, Math.PI * 2);
  ctx.fill();

  // Iris
  const irisR = Math.min(eyeW, eyeH) * 0.72;
  const ig = ctx.createRadialGradient(cx - 1, cy - 1, 1, cx, cy, irisR);
  ig.addColorStop(0, lighten(iris, 0.25));
  ig.addColorStop(0.55, iris);
  ig.addColorStop(1, darken(iris, 0.35));
  ctx.fillStyle = ig;
  ctx.beginPath();
  ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
  ctx.fill();

  // Pupil
  ctx.fillStyle = pupil;
  ctx.beginPath();
  ctx.arc(cx, cy + 0.3, irisR * 0.42, 0, Math.PI * 2);
  ctx.fill();

  // Specular highlight
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(cx - irisR * 0.28, cy - irisR * 0.32, irisR * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.arc(cx + irisR * 0.22, cy + irisR * 0.15, irisR * 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Upper lid line
  ctx.strokeStyle = 'rgba(40,20,15,0.55)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(cx, cy, eyeW, eyeH, 0, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();

  if (lashes) {
    ctx.strokeStyle = browColor;
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const x = cx - eyeW + t * eyeW * 2;
      ctx.beginPath();
      ctx.moveTo(x, cy - eyeH * 0.85);
      ctx.lineTo(x + (t - 0.5) * 2, cy - eyeH * 0.85 - 3 - hash(i + cx) * 2);
      ctx.stroke();
    }
  }

  // Brow
  ctx.strokeStyle = browColor;
  ctx.lineWidth = browThick;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - eyeW * 1.15, cy + browY + browArch * 2);
  ctx.quadraticCurveTo(cx, cy + browY - browArch * 6, cx + eyeW * 1.15, cy + browY + 1);
  ctx.stroke();
}

function lighten(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${clamp(r + amt * 255)},${clamp(g + amt * 255)},${clamp(b + amt * 255)})`;
}

function darken(hex, amt) {
  return lighten(hex, -amt);
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function clamp(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function drawNose(ctx, cx, cy, skin) {
  softEllipse(ctx, cx, cy + 4, 10, 16, 'rgba(0,0,0,0.08)');
  softEllipse(ctx, cx - 5, cy + 10, 5, 4, 'rgba(0,0,0,0.12)');
  softEllipse(ctx, cx + 5, cy + 10, 5, 4, 'rgba(0,0,0,0.12)');
  softEllipse(ctx, cx - 2, cy - 2, 4, 8, lighten(skin, 0.08).replace('rgb', 'rgba').replace(')', ',0.35)'));
}

function drawLips(ctx, cx, cy, smile, lipColor, scale = 1) {
  const s = scale;
  ctx.fillStyle = lipColor;
  ctx.beginPath();
  if (smile) {
    ctx.moveTo(cx - 16 * s, cy);
    ctx.quadraticCurveTo(cx - 8 * s, cy - 3 * s, cx, cy - 1 * s);
    ctx.quadraticCurveTo(cx + 8 * s, cy - 3 * s, cx + 16 * s, cy);
    ctx.quadraticCurveTo(cx + 8 * s, cy + 10 * s, cx, cy + 9 * s);
    ctx.quadraticCurveTo(cx - 8 * s, cy + 10 * s, cx - 16 * s, cy);
  } else {
    ctx.moveTo(cx - 14 * s, cy + 1);
    ctx.quadraticCurveTo(cx, cy - 2 * s, cx + 14 * s, cy + 1);
    ctx.quadraticCurveTo(cx, cy + 7 * s, cx - 14 * s, cy + 1);
  }
  ctx.closePath();
  ctx.fill();

  // Lip highlight / parting
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 10 * s, cy + 1);
  ctx.quadraticCurveTo(cx, cy - 1, cx + 10 * s, cy + 1);
  ctx.stroke();
  ctx.strokeStyle = darken(lipColor, 0.25);
  ctx.lineWidth = 1.1 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 11 * s, cy + 3 * s);
  ctx.quadraticCurveTo(cx, cy + 4.5 * s, cx + 11 * s, cy + 3 * s);
  ctx.stroke();
}

function drawEarsHint(ctx, skin, size) {
  softEllipse(ctx, 10, size * 0.48, 12, 18, darken(skin, 0.06));
  softEllipse(ctx, size - 10, size * 0.48, 12, 18, darken(skin, 0.06));
  softEllipse(ctx, 12, size * 0.48, 6, 10, lighten(skin, 0.04));
  softEllipse(ctx, size - 12, size * 0.48, 6, 10, lighten(skin, 0.04));
}

/**
 * @typedef {'male'|'female'|'neutral'} FaceGender
 * @typedef {{
 *   skin?: string,
 *   gender?: FaceGender,
 *   smile?: boolean,
 *   iris?: string,
 *   lipColor?: string,
 *   browColor?: string,
 *   size?: number,
 *   seed?: number,
 * }} FaceOptions
 */

/**
 * Create a detailed face albedo texture.
 * @param {FaceOptions} [options]
 * @returns {THREE.CanvasTexture}
 */
export function createFaceTexture(options = {}) {
  const {
    skin = '#e8b989',
    gender = 'neutral',
    smile = false,
    iris = gender === 'female' ? '#5a7a4a' : '#3a5f8a',
    lipColor = gender === 'female' ? '#c45a6a' : '#b06a5a',
    browColor = gender === 'female' ? '#3a2418' : '#1e140e',
    size = 256,
    seed = 1,
    highContrast = false,
  } = options;

  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const hc = highContrast ? 1.55 : 1;

  // Base skin
  const base = ctx.createRadialGradient(size * 0.5, size * 0.42, size * 0.1, size * 0.5, size * 0.5, size * 0.7);
  base.addColorStop(0, lighten(skin, 0.06));
  base.addColorStop(0.55, skin);
  base.addColorStop(1, darken(skin, 0.12));
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // Subtle freckle / pore noise
  for (let i = 0; i < 220; i++) {
    const x = hash(seed * 17 + i) * size;
    const y = hash(seed * 31 + i * 3) * size;
    const a = 0.03 + hash(i + seed) * 0.05;
    ctx.fillStyle = `rgba(90,50,30,${a})`;
    ctx.fillRect(x, y, 1 + (hash(i) > 0.7 ? 1 : 0), 1);
  }

  // Cheek blush
  softEllipse(ctx, size * 0.28, size * 0.58, size * 0.12, size * 0.08, 'rgba(220,90,90,0.12)');
  softEllipse(ctx, size * 0.72, size * 0.58, size * 0.12, size * 0.08, 'rgba(220,90,90,0.12)');

  drawEarsHint(ctx, skin, size);

  const eyeY = size * 0.42;
  const eyeOpts = {
    iris,
    browColor: highContrast ? darken(browColor, 0.28) : browColor,
    browThick: (gender === 'male' ? 3.2 : gender === 'female' ? 2.1 : 2.6) * hc,
    browArch: gender === 'female' ? 0.6 : 0.28,
    eyeW: size * (gender === 'female' ? 0.062 : 0.06) * (highContrast ? 1.32 : 1),
    eyeH: size * (gender === 'female' ? 0.042 : 0.04) * (highContrast ? 1.28 : 1),
  };
  // Wider-set eyes for stronger read at distance.
  const eyeSpread = highContrast ? 0.155 : 0.14;
  drawEye(ctx, size * (0.5 - eyeSpread), eyeY, eyeOpts);
  drawEye(ctx, size * (0.5 + eyeSpread), eyeY, eyeOpts);

  drawNose(ctx, size * 0.5, size * 0.52, skin);
  // Larger, higher-contrast lips when in billboard mode.
  const lipScale = highContrast ? 1.3 : 1;
  drawLips(
    ctx,
    size * 0.5,
    size * 0.68,
    smile,
    highContrast ? darken(lipColor, 0.12) : lipColor,
    lipScale
  );

  // Soft chin shade
  softEllipse(ctx, size * 0.5, size * 0.86, size * 0.22, size * 0.1, 'rgba(0,0,0,0.06)');

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Convenience: smiling female face. */
export function createSmileFaceTexture(skin = '#e8b989') {
  return createFaceTexture({ skin, gender: 'female', smile: true });
}

/** Convenience: neutral male face. */
export function createMaleFaceTexture(skin = '#d4a574') {
  return createFaceTexture({ skin, gender: 'male', smile: false });
}

/** Convenience: neutral female face. */
export function createFemaleFaceTexture(skin = '#f0c9a0') {
  return createFaceTexture({ skin, gender: 'female', smile: false });
}
