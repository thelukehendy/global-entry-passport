// Tiny math + helper grab-bag used across the game.

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (min, max) => min + Math.random() * (max - min);
export const randInt = (min, max) => Math.floor(rand(min, max + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p) => Math.random() < p;

// Smooth, framerate-independent approach toward a target.
export const damp = (current, target, lambda, dt) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

export const TAU = Math.PI * 2;

// localStorage that never throws (private mode / disabled storage).
export const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch {
      return fallback;
    }
  },
  getNum(key, fallback = 0) {
    const v = this.get(key, null);
    const n = v === null ? NaN : parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  },
  set(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      /* ignore */
    }
  },
};

export const isTouch =
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);
