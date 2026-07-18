/**
 * Shared texture helpers.
 * Procedural art + US flag live in ./textures/ — this file keeps game-specific
 * utilities (passport / buildings / signs) and re-exports the factory.
 */
import * as THREE from 'three';

export {
  drawUSFlag,
  createUSFlagTexture,
  loadUSFlagTexture,
  createFaceTexture,
  createSmileFaceTexture,
  createMaleFaceTexture,
  createFemaleFaceTexture,
  createSuitWoolTexture,
  createCottonShirtTexture,
  createSariShimmerTexture,
  createDenimTexture,
  SKIN_TONES,
  createSkinTexture,
  createSkinPresetTexture,
  createAsphaltTexture,
  createConcreteTexture,
  createPlazaGroundTexture,
  createWheelchairMetalTexture,
  createTireTreadTexture,
  createWheelchairSeatTexture,
  createTrumpFaceTexture,
  createTrumpHairTexture,
  loadTrumpFaceTextures,
} from './textures/index.js';

import { createFaceTexture, createPlazaGroundTexture } from './textures/index.js';

function makeCanvas(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

/** @deprecated Prefer createPlazaGroundTexture — kept for callers. */
export function groundTexture() {
  return createPlazaGroundTexture({ size: 512, repeat: 8 });
}

export function buildingTexture(baseColor = '#2c4a72', litColor = '#8fd0ff') {
  const c = makeCanvas(256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 256);
  const cols = 5;
  const rows = 8;
  const mx = 22;
  const my = 14;
  const w = (256 - mx * (cols + 1)) / cols;
  const h = (256 - my * (rows + 1)) / rows;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const lit = Math.random() > 0.55;
      ctx.fillStyle = lit ? litColor : '#16283f';
      const x = mx + col * (w + mx);
      const y = my + r * (h + my);
      ctx.fillRect(x, y, w, h);
      if (lit) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(x, y, w, h * 0.35);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Billboard / arch sign — text fully fits inside with padding. */
export function signTexture(text, bg = '#0a1a3f', fg = '#ffffff', accent = '#37b6ff') {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 256);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 14;
  ctx.strokeRect(14, 14, 996, 228);

  // Fit text without clipping
  let fontSize = 96;
  ctx.font = `900 ${fontSize}px Archivo Black, Arial Black, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  while (fontSize > 36 && ctx.measureText(text).width > 920) {
    fontSize -= 4;
    ctx.font = `900 ${fontSize}px Archivo Black, Arial Black, Arial, sans-serif`;
  }
  ctx.fillStyle = fg;
  ctx.fillText(text, 512, 132);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Face wrapper matching older call signature. */
export function faceTexture(skin = '#f1c27d', happy = false) {
  return createFaceTexture({
    skin,
    smile: happy,
    gender: happy ? 'female' : 'neutral',
    size: 256,
    seed: Math.floor(Math.random() * 1000),
  });
}

export function passportTexture(golden = false) {
  const c = makeCanvas(256);
  c.width = 200;
  c.height = 280;
  const ctx = c.getContext('2d');
  ctx.fillStyle = golden ? '#c9971a' : '#123a8f';
  ctx.fillRect(0, 0, 200, 280);
  ctx.strokeStyle = golden ? '#fff2b0' : '#ffcf33';
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, 176, 256);
  ctx.fillStyle = golden ? '#fff2b0' : '#ffcf33';
  ctx.beginPath();
  ctx.arc(100, 118, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = golden ? '#c9971a' : '#123a8f';
  ctx.font = '900 26px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', 100, 120);
  ctx.fillStyle = golden ? '#fff2b0' : '#ffcf33';
  ctx.font = '900 20px Arial';
  ctx.fillText('GLOBAL', 100, 190);
  ctx.fillText('ENTRY', 100, 216);
  ctx.font = '700 12px Arial';
  ctx.fillText('★ ★ ★ ★ ★', 100, 244);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
