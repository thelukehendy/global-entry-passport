import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', '.face-shots');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://localhost:5173/?t=' + Date.now(), { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForFunction(() => window.__GEP);
await page.evaluate(() => {
  const g = window.__GEP;
  g.ui.els.splash?.classList.add('hidden');
  g.ui.hideStart();
  document.querySelectorAll('.overlay,#start-screen,#splash').forEach((el) => { el.style.display='none'; });
  g.audio?.init?.();
  g.start();
});
await page.waitForFunction(() => window.__GEP?.player?.introPhase === 'face');
await page.waitForFunction(() => window.__GEP?.player?.face?.material?.map?.image?.width >= 1024);
await page.waitForTimeout(700);
const info = await page.evaluate(() => {
  const f = window.__GEP.player.face;
  const pos = f.geometry.attributes.position;
  let minZ=9, maxZ=-9;
  for (let i=0;i<pos.count;i++) { const z=pos.getZ(i); minZ=Math.min(minZ,z); maxZ=Math.max(maxZ,z); }
  return {
    geo: f.geometry.type,
    verts: pos.count,
    zRange: [minZ, maxZ],
    facePos: f.position.toArray(),
    mat: f.material.type,
    headKids: window.__GEP.player.head.children.length,
  };
});
console.log(JSON.stringify(info,null,2));
await page.evaluate(() => {
  document.querySelectorAll('#ui-root,.hud,.overlay').forEach((el) => { el.style.visibility='hidden'; });
});
await page.screenshot({ path: path.join(outDir, 'intro-face-clean.png'), type: 'png' });
await browser.close();
