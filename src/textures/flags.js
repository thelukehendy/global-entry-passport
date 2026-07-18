/**
 * Flag textures — US Stars and Stripes (and helpers).
 * Prefer loading public/textures/us-flag.png for high-res; canvas generator is fallback.
 */
import * as THREE from 'three';

const US_BLUE = '#002868';
const US_RED = '#BF0A30';
const US_WHITE = '#FFFFFF';

function drawStar(ctx, cx, cy, outerR) {
  const spikes = 5;
  const innerR = outerR * 0.382;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = -Math.PI / 2 + (i * Math.PI) / spikes;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw a proper US Stars and Stripes flag onto a 2D context.
 * Aspect ≈ 1.9:1. Blue canton + 50 white stars + 13 red/white stripes.
 * NOT a Chinese flag (no yellow stars on red field).
 */
export function drawUSFlag(ctx, width, height) {
  const stripeH = height / 13;

  // 13 horizontal stripes, starting with red at the top
  for (let i = 0; i < 13; i++) {
    ctx.fillStyle = i % 2 === 0 ? US_RED : US_WHITE;
    ctx.fillRect(0, i * stripeH, width, stripeH + 0.5);
  }

  // Canton: height = 7 stripes, width = 0.76 × hoist
  const cantonH = stripeH * 7;
  const cantonW = height * 0.76;
  ctx.fillStyle = US_BLUE;
  ctx.fillRect(0, 0, cantonW, cantonH);

  // 50 white five-pointed stars in 9 staggered rows (6-5-6-5-6-5-6-5-6)
  ctx.fillStyle = US_WHITE;
  const starR = Math.min(cantonW / 12, cantonH / 10) * 0.35;
  const hGap = cantonW / 12;
  const vGap = cantonH / 10;
  let starIndex = 0;

  for (let row = 0; row < 9; row++) {
    const isSix = row % 2 === 0;
    const count = isSix ? 6 : 5;
    const y = vGap * (row + 1);
    for (let col = 0; col < count; col++) {
      const x = isSix ? hGap * (2 * col + 1) : hGap * (2 * col + 2);
      drawStar(ctx, x, y, starR);
      starIndex++;
    }
  }

  if (starIndex !== 50) {
    console.warn(`[flags] expected 50 stars, drew ${starIndex}`);
  }
}

/**
 * Create a canvas-generated US flag THREE.CanvasTexture.
 * @param {number} [width=1900]
 * @param {number} [height=1000]
 * @returns {THREE.CanvasTexture}
 */
export function createUSFlagTexture(width = 1900, height = 1000) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  drawUSFlag(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Load the high-res pre-baked PNG at /textures/us-flag.png.
 * Falls back to canvas Stars and Stripes if the image fails.
 * @param {THREE.LoadingManager} [manager]
 * @returns {Promise<THREE.Texture>}
 */
export function loadUSFlagTexture(manager) {
  return new Promise((resolve) => {
    const loader = new THREE.TextureLoader(manager);
    loader.load(
      '/textures/us-flag.png',
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        tex.needsUpdate = true;
        resolve(tex);
      },
      undefined,
      () => resolve(createUSFlagTexture())
    );
  });
}
