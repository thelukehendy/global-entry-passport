/**
 * Toy Story / Pixar–soft Trump face + hair textures.
 * Warm peach skin, big friendly eyes with catchlights — no orange-corpse uncanny.
 */
import * as THREE from 'three';

/**
 * Kept for API compat; Toy Story path uses procedural cute faces only.
 * @returns {Promise<{neutral: THREE.Texture, smile: THREE.Texture, celebrate: THREE.Texture}>}
 */
export function loadTrumpFaceTextures() {
  return Promise.resolve({
    neutral: createTrumpFaceTexture({ expression: 'neutral', size: 512 }),
    smile: createTrumpFaceTexture({ expression: 'smile', size: 512 }),
    celebrate: createTrumpFaceTexture({ expression: 'smile', size: 512 }),
  });
}

function makeCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function soft(ctx, cx, cy, rx, ry, color) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
  g.addColorStop(0, color);
  g.addColorStop(0.55, color.replace(/[\d.]+\)$/, (a) => `${parseFloat(a) * 0.4})`));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * @param {object} [opts]
 * @param {'neutral'|'smile'|'scowl'|'shout'} [opts.expression='neutral']
 * @param {number} [opts.size=512]
 * @returns {THREE.CanvasTexture}
 */
export function createTrumpFaceTexture(opts = {}) {
  const expression = opts.expression || 'neutral';
  const size = opts.size || 512;
  const smile = expression === 'smile' || expression === 'neutral';
  const shout = expression === 'shout';
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  const S = size / 512;

  // Soft warm peach / light tan (Pixar toy skin — NOT scary orange)
  const base = ctx.createRadialGradient(256 * S, 200 * S, 30 * S, 256 * S, 280 * S, 320 * S);
  base.addColorStop(0, '#ffe0c4');
  base.addColorStop(0.45, '#f5c9a0');
  base.addColorStop(0.8, '#e8b088');
  base.addColorStop(1, '#d49870');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // Soft cheek blush
  soft(ctx, 145 * S, 320 * S, 70 * S, 50 * S, 'rgba(240,140,120,0.28)');
  soft(ctx, 367 * S, 320 * S, 70 * S, 50 * S, 'rgba(240,140,120,0.28)');
  // Gentle forehead highlight
  soft(ctx, 256 * S, 120 * S, 100 * S, 55 * S, 'rgba(255,248,235,0.55)');

  const eyeY = 215 * S;
  const eyeLX = 178 * S;
  const eyeRX = 334 * S;

  // Soft arched brows (friendly, not furrowed angry)
  const drawBrow = (cx, flip) => {
    const bg = ctx.createLinearGradient(cx - 50 * S, 0, cx + 50 * S, 0);
    bg.addColorStop(0, '#e8c86a');
    bg.addColorStop(0.5, '#f0d878');
    bg.addColorStop(1, '#d4b050');
    ctx.fillStyle = bg;
    ctx.beginPath();
    const y = 168 * S;
    ctx.moveTo(cx + flip * -48 * S, y + 10 * S);
    ctx.quadraticCurveTo(cx, y - 14 * S, cx + flip * 48 * S, y + 6 * S);
    ctx.quadraticCurveTo(cx, y + 8 * S, cx + flip * -48 * S, y + 18 * S);
    ctx.closePath();
    ctx.fill();
  };
  drawBrow(eyeLX, 1);
  drawBrow(eyeRX, -1);

  // Big friendly Pixar eyes
  const drawEye = (cx) => {
    const eyeW = 38 * S;
    const eyeH = shout ? 36 * S : 42 * S;

    // Soft under-eye (very subtle — no bags)
    soft(ctx, cx, eyeY + 28 * S, 28 * S, 12 * S, 'rgba(210,150,120,0.18)');

    // White sclera
    ctx.fillStyle = '#fffaf4';
    ctx.beginPath();
    ctx.ellipse(cx, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,60,45,0.25)';
    ctx.lineWidth = 2 * S;
    ctx.stroke();

    // Soft upper lid shadow
    soft(ctx, cx, eyeY - eyeH * 0.55, eyeW * 0.9, eyeH * 0.35, 'rgba(180,120,90,0.2)');

    // Blue iris
    const irisR = eyeW * 0.62;
    const ig = ctx.createRadialGradient(cx - 4 * S, eyeY - 4 * S, 2, cx, eyeY, irisR);
    ig.addColorStop(0, '#c8ecff');
    ig.addColorStop(0.35, '#5eb0ef');
    ig.addColorStop(0.75, '#2a78c8');
    ig.addColorStop(1, '#1a4a7a');
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.ellipse(cx, eyeY + 2 * S, irisR, irisR * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#1a1520';
    ctx.beginPath();
    ctx.ellipse(cx, eyeY + 2 * S, irisR * 0.42, irisR * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

    // Catchlights (Pixar sparkle)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - irisR * 0.28, eyeY - irisR * 0.22, irisR * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + irisR * 0.22, eyeY + irisR * 0.18, irisR * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Soft lids (friendly arcs)
    ctx.strokeStyle = 'rgba(120,75,55,0.45)';
    ctx.lineWidth = 3 * S;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - eyeW, eyeY - 2 * S);
    ctx.quadraticCurveTo(cx, eyeY - eyeH - 6 * S, cx + eyeW, eyeY - 2 * S);
    ctx.stroke();
  };
  drawEye(eyeLX);
  drawEye(eyeRX);

  // Soft rounded nose (painted blush, not hard ink)
  soft(ctx, 256 * S, 275 * S, 22 * S, 18 * S, 'rgba(235,170,130,0.45)');
  soft(ctx, 256 * S, 255 * S, 10 * S, 28 * S, 'rgba(255,235,210,0.4)');
  ctx.fillStyle = 'rgba(180,120,95,0.35)';
  ctx.beginPath();
  ctx.ellipse(240 * S, 288 * S, 6 * S, 5 * S, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(272 * S, 288 * S, 6 * S, 5 * S, -0.2, 0, Math.PI * 2);
  ctx.fill();

  const mouthY = 355 * S;

  if (shout) {
    ctx.fillStyle = '#4a2820';
    ctx.beginPath();
    ctx.ellipse(256 * S, mouthY + 8 * S, 42 * S, 32 * S, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff8f0';
    ctx.beginPath();
    ctx.moveTo(220 * S, mouthY - 2 * S);
    ctx.quadraticCurveTo(256 * S, mouthY - 12 * S, 292 * S, mouthY - 2 * S);
    ctx.lineTo(286 * S, mouthY + 8 * S);
    ctx.quadraticCurveTo(256 * S, mouthY + 2 * S, 226 * S, mouthY + 8 * S);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,90,80,0.7)';
    ctx.lineWidth = 4 * S;
    ctx.beginPath();
    ctx.ellipse(256 * S, mouthY + 8 * S, 44 * S, 34 * S, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Warm closed-mouth friendly smile (gentle curve)
    ctx.strokeStyle = 'rgba(160,80,70,0.85)';
    ctx.lineWidth = 5 * S;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(195 * S, mouthY);
    ctx.quadraticCurveTo(256 * S, mouthY + (smile ? 28 : 18) * S, 317 * S, mouthY);
    ctx.stroke();
    // Soft lip tint
    soft(ctx, 256 * S, mouthY + 6 * S, 55 * S, 18 * S, 'rgba(230,130,120,0.35)');
    // Tiny smile dimples
    soft(ctx, 185 * S, mouthY + 4 * S, 12 * S, 10 * S, 'rgba(210,130,110,0.25)');
    soft(ctx, 327 * S, mouthY + 4 * S, 12 * S, 10 * S, 'rgba(210,130,110,0.25)');
  }

  // Soft chin shadow (no hard double-chin ink)
  soft(ctx, 256 * S, 440 * S, 90 * S, 30 * S, 'rgba(190,130,100,0.22)');

  // Soft vignette into peach
  const vig = ctx.createRadialGradient(256 * S, 250 * S, 180 * S, 256 * S, 270 * S, 290 * S);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(200,140,100,0.2)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Soft toy-plastic blonde hair albedo (chunky, not stringy).
 * @param {number} [size=512]
 * @returns {THREE.CanvasTexture}
 */
export function createTrumpHairTexture(size = 512) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');

  const g = ctx.createLinearGradient(0, size, 0, 0);
  g.addColorStop(0, '#c9a040');
  g.addColorStop(0.35, '#e8c858');
  g.addColorStop(0.7, '#f5dc78');
  g.addColorStop(1, '#fff2b0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // Soft broad bands (molded toy look) instead of hundreds of strands
  for (let i = 0; i < 18; i++) {
    const y = (i / 18) * size;
    const bright = i % 3 === 0;
    ctx.strokeStyle = bright ? 'rgba(255,245,200,0.35)' : 'rgba(180,140,50,0.22)';
    ctx.lineWidth = 14 + (i % 4) * 4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(size * 0.45, y - 30, size, y + 10);
    ctx.stroke();
  }

  const sheen = ctx.createLinearGradient(0, size * 0.15, 0, size * 0.45);
  sheen.addColorStop(0, 'rgba(255,255,240,0)');
  sheen.addColorStop(0.5, 'rgba(255,255,240,0.35)');
  sheen.addColorStop(1, 'rgba(255,255,240,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, size * 0.15, size, size * 0.3);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}
