import { Game } from './Game.js';

const container = document.getElementById('canvas-container');
const game = new Game(container);

// Splash (2s) → start screen → play
game.ui.showSplashThenStart(() => {
  game.ui.refreshBests();
  // Soft setup ONLY — must NOT create AudioContext here (iOS Safari)
  game.audio.init();
  if (game.audio.needsGesture) game.audio.promptIfNeeded();
});

/**
 * Sync unlock from a trusted click/touch handler.
 * Do not await — keep the iOS user-gesture chain intact.
 */
function unlockFromGesture(startMusic = false, forceUnmute = false) {
  game.audio.unlock({ startMusic, forceUnmute });
}

document.getElementById('begin-btn')?.addEventListener('click', () => {
  // Force unmute on first Begin so stale gep_muted=1 can't silence a fresh session
  unlockFromGesture(true, true);
  game.ui.setMute(false);
  game.start();
});

document.getElementById('restart-btn')?.addEventListener('click', () => {
  unlockFromGesture(true, false);
  game.start();
});

document.getElementById('mute-btn')?.addEventListener('click', () => {
  // HUD mute: unlock happens inside toggleMute when unmuting (same sync tap)
  game.toggleMute();
});

document.getElementById('mute-toggle-start')?.addEventListener('click', () => {
  // Unmute path must unlock in THIS sync handler
  game.toggleMute();
});

document.getElementById('share-btn')?.addEventListener('click', async () => {
  const text = `I rallied ${game.allies} allies in TRUMP'S PASSPORT PATROL — score ${game.score}! #PassportPatrol`;
  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById('share-btn');
    if (btn) {
      const prev = btn.textContent;
      btn.textContent = '✓ COPIED';
      setTimeout(() => (btn.textContent = prev), 1400);
    }
  } catch {
    /* ignore */
  }
});

// First user gesture unlocks audio even if they don't press begin yet.
// Keep listening on pointerdown + touchend — iOS treats both as gestures.
const unlockOnce = () => {
  unlockFromGesture(false, false);
};
window.addEventListener('pointerdown', unlockOnce, { once: true, passive: true });
window.addEventListener('touchend', unlockOnce, { once: true, passive: true });

export { game };
if (typeof window !== 'undefined') window.__GEP = game;
