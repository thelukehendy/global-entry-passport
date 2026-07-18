/**
 * Generate a proper US Stars and Stripes PNG (no external deps).
 * Writes public/textures/us-flag.png
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '../public/textures/us-flag.png');

const WIDTH = 1900;
const HEIGHT = 1000;

const RED = [191, 10, 48];
const WHITE = [255, 255, 255];
const BLUE = [0, 40, 104];

function setPixel(data, x, y, rgb) {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const i = (y * WIDTH + x) * 3;
  data[i] = rgb[0];
  data[i + 1] = rgb[1];
  data[i + 2] = rgb[2];
}

function fillRect(data, x0, y0, w, h, rgb) {
  const x1 = Math.min(WIDTH, Math.floor(x0 + w));
  const y1 = Math.min(HEIGHT, Math.floor(y0 + h));
  for (let y = Math.max(0, Math.floor(y0)); y < y1; y++) {
    for (let x = Math.max(0, Math.floor(x0)); x < x1; x++) {
      setPixel(data, x, y, rgb);
    }
  }
}

function drawStar(data, cx, cy, outerR, rgb) {
  const spikes = 5;
  const innerR = outerR * 0.382;
  // Rasterize via even-odd fill on a small bbox
  const points = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = -Math.PI / 2 + (i * Math.PI) / spikes;
    points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  const minX = Math.floor(Math.min(...points.map((p) => p[0])) - 1);
  const maxX = Math.ceil(Math.max(...points.map((p) => p[0])) + 1);
  const minY = Math.floor(Math.min(...points.map((p) => p[1])) - 1);
  const maxY = Math.ceil(Math.max(...points.map((p) => p[1])) + 1);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (pointInPoly(x + 0.5, y + 0.5, points)) setPixel(data, x, y, rgb);
    }
  }
}

function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0];
    const yi = pts[i][1];
    const xj = pts[j][0];
    const yj = pts[j][1];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crcData = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(crcData));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(rgb, w, h) {
  // RGB raw with filter byte 0 per row
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const rowStart = y * (w * 3 + 1);
    raw[rowStart] = 0;
    rgb.copy(raw, rowStart + 1, y * w * 3, (y + 1) * w * 3);
  }
  const compressed = deflateSync(raw, { level: 9 });
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Draw flag ---
const rgb = Buffer.alloc(WIDTH * HEIGHT * 3);
const stripeH = HEIGHT / 13;

for (let i = 0; i < 13; i++) {
  fillRect(rgb, 0, i * stripeH, WIDTH, stripeH + 1, i % 2 === 0 ? RED : WHITE);
}

const cantonH = stripeH * 7;
const cantonW = HEIGHT * 0.76;
fillRect(rgb, 0, 0, cantonW, cantonH, BLUE);

const starR = Math.min(cantonW / 12, cantonH / 10) * 0.35;
const hGap = cantonW / 12;
const vGap = cantonH / 10;
let stars = 0;
for (let row = 0; row < 9; row++) {
  const isSix = row % 2 === 0;
  const count = isSix ? 6 : 5;
  const y = vGap * (row + 1);
  for (let col = 0; col < count; col++) {
    const x = isSix ? hGap * (2 * col + 1) : hGap * (2 * col + 2);
    drawStar(rgb, x, y, starR, WHITE);
    stars++;
  }
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, encodePNG(rgb, WIDTH, HEIGHT));

// Sanity samples
const canton = [rgb[0], rgb[1], rgb[2]];
const midStripeX = Math.floor(WIDTH * 0.7);
const midStripeI = midStripeX * 3;
const topStripe = [rgb[midStripeI], rgb[midStripeI + 1], rgb[midStripeI + 2]];
console.log(`Wrote ${outPath}`);
console.log(`Size ${WIDTH}x${HEIGHT}, stars=${stars}`);
console.log(`Canton RGB=${canton.join(',')} (expect blue)`);
console.log(`Top stripe RGB=${topStripe.join(',')} (expect red)`);
if (stars !== 50) throw new Error(`Expected 50 stars, got ${stars}`);
if (!(canton[2] > canton[0] && canton[2] > canton[1])) throw new Error('Canton not blue');
if (!(topStripe[0] > topStripe[1] && topStripe[0] > topStripe[2])) throw new Error('Stripe not red');
console.log('US Stars & Stripes verified.');
