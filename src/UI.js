import { store, pick } from './utils.js';
import {
  START_TAGLINES,
  VO_CATCH,
  VO_BREACH,
  VO_EAGLE,
  VO_GOLDEN,
  pickTicker,
  VIP_LINES,
  levelSubtitle,
  levelCompleteSub,
  gameOverCopy,
  challengeForLevel,
  COUNTRIES,
} from './satire.js';

const HIGH_KEY = 'gep_high_score';
const SESSION_KEY = 'gep_session_best';

export class UI {
  constructor() {
    this.els = {
      splash: document.getElementById('splash'),
      start: document.getElementById('start-screen'),
      hud: document.getElementById('hud'),
      allies: document.getElementById('allies-count'),
      delivered: document.getElementById('delivered-count'),
      breachMeter: document.getElementById('breach-meter'),
      score: document.getElementById('hud-score'),
      best: document.getElementById('hud-best'),
      startBest: document.getElementById('start-best'),
      levelLabel: document.getElementById('level-label'),
      levelSub: document.getElementById('level-sub'),
      progress: document.getElementById('level-progress-fill'),
      hint: document.getElementById('hint'),
      eagleHint: document.getElementById('eagle-hint'),
      combo: document.getElementById('combo-pop'),
      challenge: document.getElementById('challenge-banner'),
      vo: document.getElementById('vo-bubble'),
      voText: document.getElementById('vo-text'),
      ticker: document.getElementById('ticker'),
      tickerText: document.getElementById('ticker-text'),
      cooldown: document.getElementById('cooldown-fill'),
      eagleBanner: document.getElementById('eagle-banner'),
      levelComplete: document.getElementById('level-complete'),
      lcTitle: document.getElementById('lc-title'),
      lcSub: document.getElementById('lc-sub'),
      lcStats: document.getElementById('lc-stats'),
      gameOver: document.getElementById('game-over'),
      overTitle: document.getElementById('over-title'),
      overRoast: document.getElementById('over-roast'),
      overStats: document.getElementById('over-stats'),
      overRecord: document.getElementById('over-record'),
      muteBtn: document.getElementById('mute-btn'),
      muteStart: document.getElementById('mute-toggle-start'),
      beginBtn: document.getElementById('begin-btn'),
      restartBtn: document.getElementById('restart-btn'),
      shareBtn: document.getElementById('share-btn'),
      tagline: document.getElementById('start-tagline'),
      rotateTip: document.getElementById('rotate-tip'),
      app: document.getElementById('app'),
    };
    this.hintHidden = false;
    this.challenge = null;
    this.challengeDone = false;
    this._voTimer = null;
    this._tickerRunning = false;
    this._comboTimer = null;
    this._onTickerIteration = () => this._advanceTicker();

    if (this.els.tickerText) {
      this.els.tickerText.addEventListener('animationiteration', this._onTickerIteration);
    }

    if (this.els.tagline) this.els.tagline.textContent = pick(START_TAGLINES);
    this.refreshBests();
  }

  getHighScore() {
    return store.getNum(HIGH_KEY, 0);
  }

  getSessionBest() {
    return store.getNum(SESSION_KEY, 0);
  }

  setHighScore(n) {
    const cur = this.getHighScore();
    if (n > cur) store.set(HIGH_KEY, n);
    if (n > this.getSessionBest()) store.set(SESSION_KEY, n);
    this.refreshBests();
    return n > cur;
  }

  refreshBests() {
    const h = this.getHighScore();
    if (this.els.best) this.els.best.textContent = String(h);
    if (this.els.startBest) this.els.startBest.textContent = String(h);
  }

  showSplashThenStart(onReady) {
    // 2s splash then fade to start
    setTimeout(() => {
      if (this.els.splash) {
        this.els.splash.style.opacity = '0';
        setTimeout(() => {
          this.els.splash.classList.add('hidden');
          this.els.splash.classList.remove('show');
          this.showStart();
          onReady && onReady();
        }, 450);
      } else {
        this.showStart();
        onReady && onReady();
      }
    }, 2000);
  }

  showStart() {
    this.els.start?.classList.remove('hidden');
    this.els.hud?.classList.add('hidden');
    this.els.gameOver?.classList.add('hidden');
    this.els.levelComplete?.classList.add('hidden');
    this.refreshBests();
    this.startTicker();
  }

  hideStart() {
    this.els.start?.classList.add('hidden');
  }

  showHud() {
    this.els.hud?.classList.remove('hidden');
    this.hintHidden = false;
    if (this.els.hint) this.els.hint.style.opacity = '1';
    this.startTicker();
  }

  hideHint() {
    if (this.hintHidden) return;
    this.hintHidden = true;
    if (this.els.hint) this.els.hint.style.opacity = '0';
  }

  showEagleHint() {
    this.els.eagleHint?.classList.remove('hidden');
  }

  hideEagleHint() {
    this.els.eagleHint?.classList.add('hidden');
  }

  setAllies(n) {
    if (this.els.allies) this.els.allies.textContent = String(n);
  }

  setDelivery(delivered, target) {
    if (this.els.delivered) {
      this.els.delivered.textContent = `${delivered} / ${target}`;
      this.els.delivered.style.color = delivered >= target ? 'var(--green)' : 'var(--green)';
    }
  }

  setBreaches(n, max = 5) {
    const stamps = this.els.breachMeter?.querySelectorAll('.stamp');
    stamps?.forEach((s, i) => s.classList.toggle('on', i < n));
  }

  setScore(n) {
    if (this.els.score) this.els.score.textContent = String(n);
  }

  setLevel(n, country) {
    if (this.els.levelLabel) this.els.levelLabel.textContent = `LEVEL ${n}`;
    const c = country || COUNTRIES[(n - 1) % COUNTRIES.length];
    if (this.els.levelSub) this.els.levelSub.textContent = levelSubtitle(c);
  }

  setProgress(p) {
    if (this.els.progress) this.els.progress.style.width = `${Math.min(100, p * 100)}%`;
  }

  setCooldown(ratio) {
    // 1 = ready, 0 = just thrown
    if (this.els.cooldown) this.els.cooldown.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
  }

  setMute(muted) {
    const label = muted ? '🔇 SOUND: OFF' : '🔊 SOUND: ON';
    const icon = muted ? '🔇' : '🔊';
    if (this.els.muteBtn) this.els.muteBtn.textContent = icon;
    if (this.els.muteStart) this.els.muteStart.textContent = label;
  }

  setChallenge(level) {
    this.challenge = challengeForLevel(level);
    this.challengeDone = false;
    const el = this.els.challenge;
    if (!el) return;
    el.classList.remove('hidden', 'done');
    el.innerHTML = `<span class="chal-label">${this.challenge.label}</span>${this.challenge.text}`;
  }

  completeChallenge() {
    if (!this.challenge || this.challengeDone) return;
    this.challengeDone = true;
    this.els.challenge?.classList.add('done');
    const el = this.els.challenge;
    if (el) el.innerHTML = `<span class="chal-label">DONE</span>${this.challenge.text}`;
  }

  showCombo(combo) {
    const el = this.els.combo;
    if (!el) return;
    el.textContent = combo >= 2 ? `x${combo} COMBO!` : 'NICE!';
    el.classList.remove('hidden', 'punch');
    void el.offsetWidth;
    el.classList.add('punch');
    clearTimeout(this._comboTimer);
    this._comboTimer = setTimeout(() => el.classList.add('hidden'), 650);
  }

  showVO(kind) {
    const pool =
      kind === 'breach' ? VO_BREACH :
      kind === 'eagle' ? VO_EAGLE :
      kind === 'golden' ? VO_GOLDEN :
      VO_CATCH;
    const text = pick(pool);
    if (this.els.voText) this.els.voText.textContent = text;
    this.els.vo?.classList.remove('hidden');
    this.els.vo?.classList.add('show');
    clearTimeout(this._voTimer);
    this._voTimer = setTimeout(() => {
      this.els.vo?.classList.remove('show');
      setTimeout(() => this.els.vo?.classList.add('hidden'), 200);
    }, 1600);
    return text;
  }

  /** Keep the breaking-news banner visible and crawling forever. */
  startTicker() {
    if (!this.els.ticker || !this.els.tickerText) return;
    this.els.ticker.classList.remove('hidden');
    if (this._tickerRunning) return;
    this._tickerRunning = true;
    this._setTickerLine(pickTicker(), true);
  }

  /**
   * @param {string} line
   * @param {boolean} [restart=true] restart CSS marquee (inject / first start)
   */
  _setTickerLine(line, restart = true) {
    const el = this.els.tickerText;
    if (!el) return;
    const text = line || pickTicker();
    el.textContent = text;
    // Longer headlines crawl a bit longer so they stay readable.
    const duration = Math.max(12, Math.min(28, 10 + text.length * 0.14));
    if (!restart) {
      el.style.animationDuration = `${duration}s`;
      return;
    }
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = `ticker-scroll ${duration}s linear infinite`;
  }

  /** Swap headline when the current crawl loop finishes (still on-screen banner). */
  _advanceTicker() {
    if (!this._tickerRunning) return;
    // Don't restart animation here — iteration fires at the seamless loop point.
    this._setTickerLine(pickTicker(), false);
  }

  /** Inject a headline into the live crawl (no hide / no gap). */
  flashTicker(line) {
    this.startTicker();
    this._setTickerLine(line || pickTicker(), true);
  }

  showVipCallout() {
    this.flashTicker(pick(VIP_LINES));
    this.showVO('catch');
  }

  showEagleBanner() {
    const el = this.els.eagleBanner;
    if (!el) return;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 1600);
  }

  showLevelComplete(level, stats) {
    if (this.els.lcTitle) this.els.lcTitle.innerHTML = `LEVEL ${level}<br />COMPLETE`;
    if (this.els.lcSub) this.els.lcSub.textContent = levelCompleteSub(stats);
    if (this.els.lcStats) {
      this.els.lcStats.innerHTML = `
        <div class="lc-chip"><b>${stats.allies || 0}</b>ALLIES</div>
        <div class="lc-chip"><b>${stats.breaches || 0}</b>BREACHES</div>
        <div class="lc-chip"><b>${stats.score || 0}</b>SCORE</div>
      `;
    }
    this.els.levelComplete?.classList.remove('hidden');
  }

  hideLevelComplete() {
    this.els.levelComplete?.classList.add('hidden');
  }

  showGameOver(stats) {
    const { title, roast } = gameOverCopy(stats);
    if (this.els.overTitle) this.els.overTitle.textContent = title;
    if (this.els.overRoast) this.els.overRoast.textContent = roast;
    if (this.els.overRecord) {
      this.els.overRecord.classList.toggle('hidden', !stats.isRecord);
    }
    if (this.els.overStats) {
      this.els.overStats.innerHTML = `
        <div class="os-chip"><div class="os-label">LEVEL</div><div class="os-value">${stats.level}</div></div>
        <div class="os-chip"><div class="os-label">ALLIES</div><div class="os-value">${stats.allies}</div></div>
        <div class="os-chip"><div class="os-label">BREACHES</div><div class="os-value">${stats.breaches}</div></div>
        <div class="os-chip"><div class="os-label">BEST COMBO</div><div class="os-value">x${stats.bestCombo || 1}</div></div>
        <div class="os-chip"><div class="os-label">SCORE</div><div class="os-value">${stats.score}</div></div>
        <div class="os-chip"><div class="os-label">HIGH SCORE</div><div class="os-value">${stats.best}</div></div>
      `;
    }
    this.els.gameOver?.classList.remove('hidden');
  }

  hideGameOver() {
    this.els.gameOver?.classList.add('hidden');
  }

  floatScore(clientX, clientY, points, fancy = true) {
    const el = document.createElement('div');
    el.className = fancy ? 'float-score' : 'float-score plain';
    el.textContent = `+${points}`;
    el.style.left = `${clientX}px`;
    el.style.top = `${clientY}px`;
    document.getElementById('app')?.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  cameraPunch() {
    this.els.app?.classList.remove('shake');
    void this.els.app?.offsetWidth;
    this.els.app?.classList.add('shake');
  }

  flashGold() {
    this.els.app?.classList.remove('flash-gold', 'flash-red');
    void this.els.app?.offsetWidth;
    this.els.app?.classList.add('flash-gold');
  }

  flashRed() {
    this.els.app?.classList.remove('flash-gold', 'flash-red');
    void this.els.app?.offsetWidth;
    this.els.app?.classList.add('flash-red');
  }

  updateRotateTip() {
    const tip = this.els.rotateTip;
    if (!tip) return;
    const portrait = window.innerHeight > window.innerWidth;
    const narrow = window.innerWidth < 480;
    tip.classList.toggle('hidden', !(portrait && narrow));
  }
}
