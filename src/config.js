// Central tunables for the whole game. Tweak here for feel.

export const CONFIG = {
  // World geometry (Z grows toward the camera / player podium)
  world: {
    borderZ: 1.5,
    podiumZ: 5.8,
    spawnZ: -28.0,
    laneHalfWidth: 7.5,
    seatZ: 4.2,
  },

  player: {
    throwCooldown: 0.245,
    // Soft magnet ONLY when passport is already near a person (near-miss assist).
    // Primary aim always honors the click/raycast ground point.
    aimMagnet: 0.0,
    nearMissMagnet: 0.55,
    nearMissRadius: 2.4,
  },

  passport: {
    speed: 36.0, // +50% to stay snappy vs faster walkers
    goldenChance: 0.08,
    catchRadius: 1.35,
    arcHeight: 1.8,
  },

  breach: {
    max: 5,
  },

  eagle: {
    // Randomized interval windows (seconds). First flyby uses firstWindow.
    firstWindow: [12, 22],
    intervalWindow: [20, 40],
    lifetime: 7,
    dualChance: 0.12,
  },

  score: {
    catch: 100,
    golden: 250,
    seat: 50,
    breachPenalty: 0,
    comboStep: 25,
    levelClear: 500,
  },

  level(n) {
    // Walk speed: FLAT at former L1 pace (no per-level scaling).
    // Before: base=(1.725+0.18n−0.06g), speed=base×1.35  (sped up each level)
    // After:  speed = 1.725×1.35 ≈ 2.329  (constant for all levels)
    const WALK_SPEED = 1.725 * 1.35;
    // People: each level ≈ +20% vs previous (compound).
    // Before: total = 6 + floor(n×2.6)  → L1=8, L2=11, L3=13, L4=16, L5=19
    // After:  total = round(8 × 1.2^(n−1)) → L1=8, L2=10, L3=12, L4=14, L5=17…
    const total = Math.max(1, Math.round(8 * Math.pow(1.2, n - 1)));
    return {
      goal: 3 + Math.floor(n * 1.7),
      waveSize: Math.min(Math.max(4, Math.round(4 * Math.pow(1.2, n - 1))), 14),
      total,
      speed: WALK_SPEED,
      nonPassportRatio: clamp01(0.18 + n * 0.05),
      spawnInterval: Math.max(2.0 - n * 0.14, 0.75),
    };
  },
};

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

export const PAL = {
  navy: 0x0a1a3f,
  navyDeep: 0x05122e,
  blue: 0x1e6bff,
  electric: 0x37b6ff,
  passportBlue: 0x123a8f,
  gold: 0xffcf33,
  goldDeep: 0xffb300,
  hotYellow: 0xffe600,
  red: 0xff3b3b,
  green: 0x35e07a,
  // More lifelike skin hex ints (crowd still picks variation via SKIN_TONES presets too)
  skinTones: [0xf0d0b4, 0xe8b989, 0xd4a574, 0xc68642, 0xa56c3a, 0x6b3f24, 0x3b2214],
  clothes: [0xff6b3d, 0x8e44ad, 0x2ecc71, 0xe84393, 0x00b8d4, 0xf39c12, 0x6c5ce7, 0xd63031, 0x2f4f7a, 0xc43b6e],
  ground: 0x4a4a4c,
  groundAlt: 0x3e3e40,
  trumpSkin: 0xe8a060,
  trumpHair: 0xf0d44a,
  trumpSuit: 0x1a2740,
  trumpTie: 0xc41e3a,
};
