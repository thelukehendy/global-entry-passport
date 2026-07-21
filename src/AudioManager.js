// Audio: Web Audio synth music + HTMLAudio SFX (iOS-reliable).
// CRITICAL: Never create AudioContext on page load. Only inside a trusted
// user gesture (Begin Defense / unmute / TAP FOR SOUND / throw).
import { store, pick } from './utils.js';
import { assetUrl } from './assetUrl.js';

const OPTIONAL_CLIPS = {
  whip: assetUrl('audio/whip.mp3'),
  byeBye: assetUrl('audio/trump-bye-bye.mp3'),
  fired: assetUrl('audio/trump-youre-fired.mp3'),
  beautiful: assetUrl('audio/trump-beautiful.mp3'),
  eagle: assetUrl('audio/eagle-sound.mp3'),
};

const DEBUG_AUDIO =
  typeof window !== 'undefined' &&
  (window.location.search.includes('debugAudio=1') ||
    store.get('gep_debug_audio', '0') === '1');

function audioLog(...args) {
  if (DEBUG_AUDIO) console.log('[GEP audio]', ...args);
}

function isIOSLike() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1)
  );
}

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    // Default unmuted. Only '1' mutes — never treat missing key as muted.
    this.muted = store.get('gep_muted', '0') === '1';
    this.musicOn = true;
    this.buffers = {};
    this.musicTimer = null;
    this.musicStep = 0;
    this._started = false;
    this._hidden = false;
    this._wasPlayingBeforeHide = false;
    this._htmlAudios = [];
    this._htmlByKey = {};
    this._visibilityBound = false;
    this._unlocked = false;
    this._unlocking = null;
    this._primed = false;
    this._soundPromptEl = null;
    this._debugEl = null;
    this._onUnlockChange = null;
    this._musicBed = null;
    this._useHtmlSfx = true; // prefer HTMLAudio for short clips on all platforms
    this._clipsReady = false;
    this._lastWhipAt = 0;
    this._sfxVolume = 1;
  }

  /**
   * Soft setup only — NO AudioContext creation.
   * Safe to call on page load.
   */
  init() {
    this._ensureHtmlClips();
    this._bindVisibility();
    this._ensureDebugHud();
    this._tickDebugHud();
  }

  /**
   * Lazy-create AudioContext. Call ONLY from a sync user-gesture handler.
   */
  ensureContext() {
    if (this.ctx) return this.ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.32;
      this.musicGain.connect(this.master);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1.0;
      this.sfxGain.connect(this.master);

      this._ensureHtmlClips();
      this._bindVisibility();
      // Decode is best-effort backup; HTMLAudio is primary for SFX on iOS
      this._loadOptionalClips();
      audioLog('ensureContext', 'state=', this.ctx.state);
      this._tickDebugHud();
      return this.ctx;
    } catch (e) {
      console.warn('Audio unavailable', e);
      return null;
    }
  }

  /**
   * Call from EVERY trusted user gesture that should enable sound.
   * MUST stay fully synchronous through resume() + silent prime + HTML prime.
   * Do NOT await before calling this. Music starts only after resume resolves.
   *
   * @param {{ startMusic?: boolean, forceUnmute?: boolean }} opts
   */
  unlock(opts = {}) {
    const startMusic = !!opts.startMusic;
    if (opts.forceUnmute && this.muted) {
      this.muted = false;
      store.set('gep_muted', '0');
      if (this.master && this.ctx) this.master.gain.value = 0.9;
    }

    // --- SYNC GESTURE CHAIN (iOS Safari) ---
    const ctx = this.ensureContext();
    if (!ctx) {
      this._maybeShowSoundPrompt();
      return Promise.resolve(false);
    }

    audioLog('unlock()', 'state=', ctx.state, 'muted=', this.muted, 'startMusic=', startMusic);

    // 1) resume() first — fire and forget; do NOT await in this stack
    let resumeP = null;
    try {
      if (ctx.state !== 'running') {
        resumeP = ctx.resume();
      }
    } catch {
      /* ignore */
    }

    // 2) silent buffer IMMEDIATELY in the same sync turn (to destination)
    this._primeSilentBuffer();

    // 3) prime HTMLAudio with audible-but-tiny volume (muted=true does NOT unlock iOS)
    // Only once — re-priming every throw leaves volume at 0.01 and pauses mid-SFX
    this._primeHtmlAudios();

    this._tickDebugHud();

    const finish = (ok) => {
      const running = this.ctx && this.ctx.state === 'running';
      this._unlocked = !!(ok || running);
      if (this._unlocked) this._hideSoundPrompt();
      else this._maybeShowSoundPrompt();

      // Music ONLY after confirmed running — never schedule while suspended
      if (startMusic && this._unlocked && !this.muted && !this.isHidden) {
        this.startMusic();
      }

      if (typeof this._onUnlockChange === 'function') {
        try {
          this._onUnlockChange(this._unlocked);
        } catch {
          /* ignore */
        }
      }
      this._tickDebugHud();
      audioLog('unlock done', 'state=', this.ctx?.state, 'unlocked=', this._unlocked);
      return this._unlocked;
    };

    if (ctx.state === 'running') {
      return Promise.resolve(finish(true));
    }

    if (!resumeP || typeof resumeP.then !== 'function') {
      // Some older webkits resume sync
      return Promise.resolve(finish(ctx.state === 'running'));
    }

    this._unlocking = resumeP
      .then(() => finish(this.ctx.state === 'running'))
      .catch(() => finish(false))
      .finally(() => {
        this._unlocking = null;
      });
    return this._unlocking;
  }

  /**
   * Lightweight throw-path audio wake-up.
   * Only resumes + silent-primes when the context is suspended.
   * Never re-primes HTMLAudio or restarts music (avoids desktop silence + mobile glitch).
   */
  ensureForThrow() {
    if (this.muted || this.isHidden) return;
    if (!this.ctx) {
      // No context yet — full unlock once (Begin Defense should have done this)
      this.unlock({ startMusic: false });
      return;
    }
    if (this.ctx.state === 'running') {
      this._unlocked = true;
      this._restoreHtmlVolumes();
      return;
    }

    // Suspended (e.g. after background): resume + silent buffer in this gesture only
    let resumeP = null;
    try {
      resumeP = this.ctx.resume();
    } catch {
      /* ignore */
    }
    this._primeSilentBuffer();
    this._tickDebugHud();

    const finish = () => {
      const running = this.ctx && this.ctx.state === 'running';
      this._unlocked = !!running;
      if (this._unlocked) this._hideSoundPrompt();
      else this._maybeShowSoundPrompt();
      this._tickDebugHud();
    };

    if (resumeP && typeof resumeP.then === 'function') {
      resumeP.then(finish).catch(finish);
    } else {
      finish();
    }
  }

  get needsGesture() {
    if (this.muted) return false;
    if (!this.ctx) return true;
    return this.ctx.state !== 'running';
  }

  /** Show one-time mobile prompt when context is still suspended. */
  promptIfNeeded() {
    this._maybeShowSoundPrompt();
  }

  setUnlockChangeHandler(fn) {
    this._onUnlockChange = fn;
  }

  _ensureHtmlClips() {
    if (this._clipsReady || typeof Audio === 'undefined') return;
    for (const [key, url] of Object.entries(OPTIONAL_CLIPS)) {
      if (this._htmlByKey[key]) continue;
      try {
        const a = new Audio();
        a.preload = 'auto';
        a.playsInline = true;
        a.setAttribute('playsinline', '');
        a.setAttribute('webkit-playsinline', '');
        // Same-origin /audio — no CORS needed, but set for decode parity
        try {
          a.crossOrigin = 'anonymous';
        } catch {
          /* ignore */
        }
        a.src = url;
        a.setAttribute('aria-hidden', 'true');
        a.style.cssText = 'display:none;position:absolute;width:0;height:0';
        try {
          document.body?.appendChild(a);
        } catch {
          /* optional */
        }
        // Warm the network cache
        try {
          a.load();
        } catch {
          /* ignore */
        }
        this._htmlByKey[key] = a;
        this._htmlAudios.push(a);
      } catch {
        /* optional */
      }
    }
    this._clipsReady = true;
  }

  /** Restore all SFX HTMLAudio elements to audible playback levels. */
  _restoreHtmlVolumes() {
    const vol = this._sfxVolume;
    for (const a of this._htmlAudios) {
      if (a === this._musicBed) continue;
      try {
        a.muted = false;
        // Fix stuck post-prime volume (0.01) without stomping an active play
        if (a.paused || a.volume < 0.05) a.volume = vol;
      } catch {
        /* ignore */
      }
    }
  }

  /** Tiny audible play-pause — unlocks HTMLAudio pipeline on iOS (muted play does NOT). */
  _primeHtmlAudios(force = false) {
    if (this._primed && !force) {
      this._restoreHtmlVolumes();
      return;
    }
    this._ensureHtmlClips();
    const targetVol = this._sfxVolume;
    for (const a of this._htmlAudios) {
      if (a === this._musicBed) continue;
      try {
        a.muted = false;
        a.volume = 0.01;
        const p = a.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            try {
              a.pause();
              a.currentTime = 0;
              a.muted = false;
              a.volume = targetVol;
            } catch {
              /* ignore */
            }
          }).catch((err) => {
            audioLog('html prime rejected', err?.name || err);
            try {
              a.muted = false;
              a.volume = targetVol;
            } catch {
              /* ignore */
            }
          });
        } else {
          try {
            a.pause();
            a.currentTime = 0;
            a.muted = false;
            a.volume = targetVol;
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* ignore */
      }
    }
    this._primed = true;
  }

  /** Classic iOS WebAudio unlock — silent buffer straight to destination. */
  _primeSilentBuffer() {
    if (!this.ctx) return;
    try {
      const rate = 22050;
      const buf = this.ctx.createBuffer(1, 1, rate);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.ctx.destination);
      src.start(0);
    } catch {
      /* ignore */
    }
  }

  _bindVisibility() {
    if (this._visibilityBound) return;
    this._visibilityBound = true;

    const onHide = () => this.pauseForBackground();
    const onShow = () => this.resumeFromBackground();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) onHide();
      else onShow();
    });
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);
    document.addEventListener('freeze', onHide);
  }

  /** Pause/stop ALL audio when tab is hidden / closing. */
  pauseForBackground() {
    this._hidden = true;
    this._wasPlayingBeforeHide = !!this.musicTimer;
    this.stopMusic();
    this._stopMusicBed();
    if (this.ctx && this.ctx.state === 'running') {
      try {
        this.ctx.suspend();
      } catch {
        /* ignore */
      }
    }
    document.querySelectorAll('audio').forEach((a) => {
      try {
        a.pause();
        a.currentTime = 0;
      } catch {
        /* ignore */
      }
    });
    this._htmlAudios.forEach((a) => {
      try {
        a.pause();
      } catch {
        /* ignore */
      }
    });
    this._unlocked = false;
    // Allow HTML re-prime on next gesture unlock after background
    this._primed = false;
    this._tickDebugHud();
    this._maybeShowSoundPrompt();
  }

  /**
   * On return from background: do NOT call resume() without a gesture on iOS.
   * Show TAP FOR SOUND; next tap re-unlocks.
   */
  resumeFromBackground(opts = {}) {
    if (!this._hidden && document.hidden) return;
    this._hidden = false;
    if (document.hidden) return;
    if (this.muted) return;
    // Never auto-unlock without a gesture on iOS — it fails and can confuse state
    if (opts.forceMusic && this._wasPlayingBeforeHide && !isIOSLike()) {
      this.unlock({ startMusic: true });
    } else {
      this._maybeShowSoundPrompt();
    }
    this._tickDebugHud();
  }

  async _loadOptionalClips() {
    if (!this.ctx) return;
    for (const [key, url] of Object.entries(OPTIONAL_CLIPS)) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const arr = await res.arrayBuffer();
        this.buffers[key] = await this.ctx.decodeAudioData(arr.slice(0));
        audioLog('decoded', key);
      } catch {
        /* optional — HTMLAudio is primary */
      }
    }
  }

  resume() {
    if (!this.ctx) return;
    try {
      if (this.ctx.state !== 'running') {
        const p = this.ctx.resume();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    } catch {
      /* blocked */
    }
  }

  get isMuted() {
    return this.muted;
  }

  get isHidden() {
    return this._hidden || (typeof document !== 'undefined' && document.hidden);
  }

  get isUnlocked() {
    return this._unlocked && this.ctx && this.ctx.state === 'running';
  }

  toggleMute() {
    this.muted = !this.muted;
    store.set('gep_muted', this.muted ? '1' : '0');
    if (this.master && this.ctx) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 0.9, t + 0.15);
    }
    if (this.muted) {
      this.stopMusic();
      this._stopMusicBed();
      this._hideSoundPrompt();
    }
    this._tickDebugHud();
    return this.muted;
  }

  now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  _ensureContextRunning() {
    if (!this.ctx || this.ctx.state === 'running') return;
    this.resume();
  }

  _osc(type, freq, t, dur, gain, dest) {
    if (!this.ctx || this.isHidden || !this.sfxGain) return;
    if (this.ctx.state !== 'running') return;
    try {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(dest || this.sfxGain);
      o.start(t);
      o.stop(t + dur + 0.05);
      return { o, g };
    } catch {
      return undefined;
    }
  }

  _noise(t, dur, gain, filterType = 'highpass', freq = 1000, dest) {
    if (!this.ctx || this.isHidden) return;
    if (this.ctx.state !== 'running') return;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = filterType;
    filt.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(dest || this.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.02);
    return { src, g, filt };
  }

  _playHtml(key, gain = 1) {
    const a = this._htmlByKey[key];
    if (!a || this.isHidden || this.muted) return false;
    try {
      a.muted = false;
      a.volume = Math.max(0.7, Math.min(1, gain));
      try {
        a.currentTime = 0;
      } catch {
        /* ignore */
      }
      const p = a.play();
      if (p && typeof p.then === 'function') {
        p.catch((err) => {
          audioLog('html play rejected', key, err?.name || err);
        });
      }
      return true;
    } catch {
      return false;
    }
  }

  /** Clone HTMLAudio per play so overlaps don't restart/cancel the shared element. */
  _playHtmlOneShot(key, gain = 1) {
    const proto = this._htmlByKey[key];
    if (!proto || this.isHidden || this.muted) return false;
    try {
      const a = proto.cloneNode(true);
      a.muted = false;
      a.volume = Math.max(0.7, Math.min(1, gain));
      a.playsInline = true;
      a.setAttribute('playsinline', '');
      a.setAttribute('webkit-playsinline', '');
      const cleanup = () => {
        try {
          a.pause();
          a.removeAttribute('src');
          a.load();
          a.remove();
        } catch {
          /* ignore */
        }
      };
      a.addEventListener('ended', cleanup, { once: true });
      a.addEventListener('error', cleanup, { once: true });
      try {
        document.body?.appendChild(a);
      } catch {
        /* optional */
      }
      const p = a.play();
      if (p && typeof p.then === 'function') {
        p.catch((err) => {
          audioLog('html oneshot rejected', key, err?.name || err);
          cleanup();
        });
      }
      // Safety cleanup if ended never fires
      setTimeout(cleanup, 4000);
      return true;
    } catch {
      return this._playHtml(key, gain);
    }
  }

  /** WebAudio buffer one-shot — clean overlaps, reliable volume. */
  _playBufferSource(key, gain = 1) {
    if (this.isHidden || this.muted) return false;
    if (!this.ctx || this.ctx.state !== 'running' || !this.buffers[key] || !this.sfxGain) {
      return false;
    }
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = this.buffers[key];
      const g = this.ctx.createGain();
      g.gain.value = gain;
      src.connect(g);
      g.connect(this.sfxGain);
      src.start();
      return true;
    } catch {
      return false;
    }
  }

  _playBuffer(key, gain = 1) {
    if (this.isHidden || this.muted) return false;
    // Prefer HTMLAudio for short SFX — far more reliable on iOS Safari
    if (this._useHtmlSfx && this._htmlByKey[key]) {
      if (this._playHtml(key, gain)) return true;
    }
    if (this._playBufferSource(key, gain)) return true;
    return this._playHtml(key, gain);
  }

  /** Throw SFX — loud, clear, overlap-safe. Prefer decoded buffer; else HTML clone. */
  whip() {
    if (this.muted || this.isHidden) return;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // Light throttle: throw cooldown is ~245ms; block crackle from double-fires
    if (now - this._lastWhipAt < 70) return;
    this._lastWhipAt = now;

    this._restoreHtmlVolumes();

    // WebAudio one-shot first when buffer is ready (clean on desktop + iOS)
    if (this._playBufferSource('whip', 0.95)) return;

    // HTMLAudio clone — overlapping throws don't cancel each other
    if (this._playHtmlOneShot('whip', 0.95)) return;

    // Shared HTML element last resort
    if (this._playHtml('whip', 0.95)) return;

    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.now();
    const { o } = this._osc('sawtooth', 1800, t, 0.14, 0.18) || {};
    if (o) o.frequency.exponentialRampToValueAtTime(300, t + 0.13);
    this._noise(t, 0.12, 0.14, 'bandpass', 2600);
  }

  catch(combo = 1) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.now();
    const base = 520 + Math.min(combo, 8) * 40;
    this._osc('triangle', base, t, 0.22, 0.35);
    this._osc('sine', base * 1.5, t + 0.04, 0.18, 0.26);
    this._osc('sine', base * 2, t + 0.08, 0.16, 0.2);
    this._noise(t, 0.08, 0.12, 'bandpass', 1800);
  }

  golden() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.now();
    [660, 880, 1100, 1320].forEach((f, i) =>
      this._osc('triangle', f, t + i * 0.05, 0.22, 0.26)
    );
  }

  seat() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.now();
    this._osc('sine', 880, t, 0.14, 0.2);
    this._osc('sine', 1320, t + 0.05, 0.12, 0.14);
  }

  breach() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.now();
    const { o } = this._osc('sine', 130, t, 0.5, 0.5) || {};
    if (o) o.frequency.exponentialRampToValueAtTime(45, t + 0.45);
    this._noise(t, 0.4, 0.3, 'lowpass', 700);
    this.duck(0.6, 0.9);
  }

  levelUp() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.now();
    [523, 659, 784, 1046].forEach((f, i) =>
      this._osc('square', f, t + i * 0.09, 0.2, 0.18)
    );
  }

  eagleFanfare() {
    if (this._htmlByKey.eagle || this.buffers.eagle) this._playBuffer('eagle', 0.7);
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.now();
    [392, 523, 659, 784, 1046].forEach((f, i) => {
      this._osc('sawtooth', f, t + i * 0.08, 0.35, 0.16);
      this._osc('square', f * 0.5, t + i * 0.08, 0.35, 0.08);
    });
    const { o } = this._osc('sawtooth', 2200, t, 0.5, 0.1) || {};
    if (o) o.frequency.exponentialRampToValueAtTime(900, t + 0.45);
    this.duck(0.7, 1.4);
  }

  uiClick() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.now();
    this._osc('square', 440, t, 0.06, 0.14);
  }

  vo(kind) {
    const map = {
      breach: ['fired', 'byeBye'],
      catch: ['beautiful'],
      eagle: ['eagle'],
      golden: ['beautiful'],
    };
    const options = (map[kind] || []).filter(
      (k) => this._htmlByKey[k] || this.buffers[k]
    );
    if (options.length) {
      this.duck(0.5, 1.3);
      this._playBuffer(pick(options), 0.95);
      return;
    }
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.now();
    this.duck(0.55, 0.9);
    const notes = kind === 'breach' ? [220, 175, 140] : [330, 415, 494];
    notes.forEach((f, i) => this._osc('sawtooth', f, t + i * 0.11, 0.16, 0.12));
  }

  duck(amount = 0.5, seconds = 1.0) {
    if (!this.musicGain || !this.ctx || this.ctx.state !== 'running') return;
    const t = this.now();
    const base = 0.32;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
    this.musicGain.gain.linearRampToValueAtTime(base * (1 - amount), t + 0.08);
    this.musicGain.gain.linearRampToValueAtTime(base, t + seconds);
    if (this._musicBed && !this._musicBed.paused) {
      const v = 0.18 * (1 - amount * 0.7);
      try {
        this._musicBed.volume = Math.max(0.02, v);
        setTimeout(() => {
          try {
            if (this._musicBed) this._musicBed.volume = 0.18;
          } catch {
            /* ignore */
          }
        }, seconds * 1000);
      } catch {
        /* ignore */
      }
    }
  }

  /**
   * Start synth music ONLY when AudioContext is running.
   * Falls back to a quiet looping HTMLAudio bed on iOS if synth can't start.
   */
  startMusic() {
    if (this.muted || this.isHidden) return;
    if (!this.ctx) return;

    if (this.ctx.state !== 'running') {
      audioLog('startMusic blocked — context', this.ctx.state);
      // Do not create timers / oscillators while suspended
      this._startMusicBedFallback();
      return;
    }

    if (this.musicTimer) return;

    const bpm = 112;
    const stepDur = 60 / bpm / 2;
    this.musicStep = 0;

    const bassA = [130.81, 130.81, 196.0, 164.81, 174.61, 174.61, 146.83, 196.0];
    const bassB = [174.61, 174.61, 220.0, 196.0, 146.83, 164.81, 130.81, 196.0];
    const leadA = [523.25, 0, 587.33, 523.25, 659.25, 0, 587.33, 466.16];
    const leadB = [698.46, 659.25, 587.33, 0, 784.0, 698.46, 659.25, 523.25];
    const counterA = [0, 392.0, 0, 0, 440.0, 0, 349.23, 0];
    const counterB = [0, 523.25, 0, 466.16, 0, 0, 440.0, 392.0];

    const tick = () => {
      if (!this.ctx || this.muted || this.isHidden) return;
      if (this.ctx.state !== 'running') return;
      const t = this.now() + 0.02;
      const step = this.musicStep;
      const inB = Math.floor(step / 32) % 2 === 1;
      const s = step % 8;
      const bar = Math.floor(step / 8) % 8;

      const bass = inB ? bassB : bassA;
      const lead = inB ? leadB : leadA;
      const counter = inB ? counterB : counterA;

      const bassGain = s % 2 === 0 ? 0.15 : 0.1;
      this._osc('triangle', bass[s], t, stepDur * 0.88, bassGain, this.musicGain);

      if (s === 0 && bar % 2 === 0) {
        const root = bass[0];
        this._osc('sine', root * 2, t, stepDur * 7.5, 0.035, this.musicGain);
        this._osc('sine', root * 3, t, stepDur * 7.5, 0.022, this.musicGain);
      }

      if (lead[s]) {
        const leadGain = inB ? 0.055 : 0.045;
        this._osc('square', lead[s], t, stepDur * 0.55, leadGain, this.musicGain);
      }

      if (bar % 2 === 1 && counter[s]) {
        this._osc('triangle', counter[s], t, stepDur * 0.7, 0.03, this.musicGain);
      }

      if (s % 2 === 0 && !(bar === 3 && s === 6)) {
        this._noise(t, 0.035, 0.028, 'highpass', 5500, this.musicGain);
      }
      const local = step % 32;
      if (local >= 28 && local <= 31) {
        this._noise(t, 0.05, 0.04, 'bandpass', 2200, this.musicGain);
        if (local === 30) {
          this._osc('sawtooth', 196, t, stepDur * 1.5, 0.06, this.musicGain);
        }
      }

      this.musicStep++;
    };
    tick();
    this.musicTimer = setInterval(tick, stepDur * 1000);
    this._stopMusicBed();
    audioLog('startMusic synth');
  }

  /** Quiet looping whip as HTMLAudio music bed when WebAudio music can't run. */
  _startMusicBedFallback() {
    if (this.muted || this.isHidden) return;
    this._ensureHtmlClips();
    const whip = this._htmlByKey.whip;
    if (!whip) return;
    try {
      if (!this._musicBed) {
        const bed = new Audio(whip.src || assetUrl('audio/whip.mp3'));
        bed.preload = 'auto';
        bed.loop = true;
        bed.playsInline = true;
        bed.setAttribute('playsinline', '');
        bed.setAttribute('webkit-playsinline', '');
        bed.volume = 0.12;
        try {
          document.body?.appendChild(bed);
        } catch {
          /* ignore */
        }
        this._musicBed = bed;
        // Do NOT push into _htmlAudios — priming/pause loops would glitch SFX
      }
      // Prime+play in the current gesture if possible
      this._musicBed.muted = false;
      this._musicBed.volume = 0.12;
      const p = this._musicBed.play();
      if (p && typeof p.catch === 'function') {
        p.catch((err) => audioLog('music bed rejected', err?.name || err));
      }
      audioLog('startMusic HTML bed');
    } catch {
      /* ignore */
    }
  }

  _stopMusicBed() {
    if (!this._musicBed) return;
    try {
      this._musicBed.pause();
      this._musicBed.currentTime = 0;
    } catch {
      /* ignore */
    }
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this._stopMusicBed();
  }

  _isCoarsePointer() {
    try {
      return (
        (typeof window !== 'undefined' &&
          window.matchMedia &&
          window.matchMedia('(pointer: coarse)').matches) ||
        (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
      );
    } catch {
      return false;
    }
  }

  _bindSoundPrompt(el) {
    if (!el || el.dataset.gepBound === '1') return;
    el.dataset.gepBound = '1';
    const go = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Sync unlock inside this tap
      this.unlock({ startMusic: true, forceUnmute: true });
    };
    el.addEventListener('click', go, { passive: false });
    el.addEventListener('touchend', go, { passive: false });
  }

  _maybeShowSoundPrompt() {
    if (this.muted) return;
    // Show on coarse pointers OR any iOS-like device
    if (!this._isCoarsePointer() && !isIOSLike()) return;
    if (this.ctx && this.ctx.state === 'running') {
      this._hideSoundPrompt();
      return;
    }
    let el = this._soundPromptEl || document.getElementById('sound-prompt');
    if (!el) {
      el = document.createElement('button');
      el.id = 'sound-prompt';
      el.type = 'button';
      el.className = 'sound-prompt';
      el.textContent = 'TAP FOR SOUND';
      el.setAttribute('aria-label', 'Tap to enable sound');
      (document.getElementById('app') || document.body).appendChild(el);
    }
    this._bindSoundPrompt(el);
    el.classList.remove('hidden');
    this._soundPromptEl = el;
  }

  _hideSoundPrompt() {
    const el = this._soundPromptEl || document.getElementById('sound-prompt');
    if (el) el.classList.add('hidden');
  }

  _shouldShowDebug() {
    if (DEBUG_AUDIO) return true;
    // Briefly show on iOS so users can confirm unlock without a query flag
    return isIOSLike();
  }

  _ensureDebugHud() {
    if (!this._shouldShowDebug()) return;
    if (this._debugEl) return;
    let el = document.getElementById('audio-debug');
    if (!el) {
      el = document.createElement('div');
      el.id = 'audio-debug';
      el.className = 'audio-debug';
      (document.getElementById('app') || document.body).appendChild(el);
    }
    this._debugEl = el;
  }

  _tickDebugHud() {
    if (!this._shouldShowDebug()) return;
    this._ensureDebugHud();
    if (!this._debugEl) return;
    const st = this.ctx ? this.ctx.state : 'no-ctx';
    this._debugEl.textContent = `audio: ${st} | muted=${this.muted ? 1 : 0} | unlocked=${this._unlocked ? 1 : 0}`;
    this._debugEl.classList.remove('hidden');
    // Auto-hide after a few seconds on iOS unless ?debugAudio=1
    if (!DEBUG_AUDIO) {
      clearTimeout(this._debugHideTimer);
      this._debugHideTimer = setTimeout(() => {
        this._debugEl?.classList.add('hidden');
      }, 8000);
    }
  }
}
