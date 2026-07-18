import * as THREE from 'three';
import { CONFIG, PAL } from './config.js';
import { Environment } from './Environment.js';
import { Player } from './Player.js';
import { BorderLine } from './BorderLine.js';
import { CrowdManager } from './CrowdManager.js';
import { PassportManager } from './Passport.js';
import { EagleManager } from './Eagle.js';
import { EffectsManager } from './Effects.js';
import { AudioManager } from './AudioManager.js';
import { UI } from './UI.js';
import { chance, clamp } from './utils.js';
import { COUNTRIES, pickTicker } from './satire.js';

/**
 * Main game orchestrator — loud arcade satire loop.
 */
export class Game {
  constructor(container) {
    this.container = container;
    this.clock = new THREE.Clock(false);
    this.running = false;
    this.paused = false;

    this.score = 0;
    this.level = 1;
    this.breaches = 0;
    this.allies = 0;
    this.combo = 0;
    this.bestCombo = 1;
    this.comboTimer = 0;
    this.throwCooldown = 0;
    this.eagleCaughtThisLevel = false;
    this.goldenCaughtThisLevel = false;
    this.levelBreaches = 0;
    this.country = COUNTRIES[0];

    this.mouse = new THREE.Vector2(0, 0);
    this.raycaster = new THREE.Raycaster();
    this._tmp = new THREE.Vector3();
    this._origin = new THREE.Vector3();
    this._landing = new THREE.Vector3();

    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._initObjects();
    this._initInput();
    this._resize();

    window.addEventListener('resize', () => this._resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this._resize(), 120));

    this.ui.setMute(this.audio.isMuted);
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    const lowEnd = (navigator.hardwareConcurrency || 4) <= 4;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1.5 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);
    this.canvas = this.renderer.domElement;
  }

  _initScene() {
    this.scene = new THREE.Scene();
  }

  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 150);
    this._cameraBase = { x: 0, y: 6.2, z: 13.5, lookY: 2.4, lookZ: -5, fov: 50 };
    this._punch = 0;
    this._applyCameraLayout();
  }

  _applyCameraLayout() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const portrait = h > w;
    if (portrait) {
      this._cameraBase = { x: 0, y: 7.4, z: 16.5, lookY: 1.9, lookZ: -6.2, fov: 58 };
    } else {
      this._cameraBase = { x: 0, y: 6.2, z: 12.0, lookY: 2.4, lookZ: -5, fov: 47 };
    }
    this.camera.fov = this._cameraBase.fov;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.position.set(this._cameraBase.x, this._cameraBase.y, this._cameraBase.z);
    this.camera.lookAt(0, this._cameraBase.lookY, this._cameraBase.lookZ);
    this.camera.updateProjectionMatrix();
  }

  _initObjects() {
    this.ui = new UI();
    this.audio = new AudioManager();
    this.environment = new Environment(this.scene, this.renderer);
    this.player = new Player(this.scene);
    this.border = new BorderLine(this.scene, CONFIG.world.borderZ);
    this.effects = new EffectsManager(this.scene);
    this.passports = new PassportManager(this.scene);
    this.crowd = new CrowdManager(this.scene);
    this.eagle = new EagleManager(this.scene);

    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.crowd.onPassportCatch = (person, pos, meta = {}) => {
      this._onCatch(person, pos, meta);
    };
    this.crowd.onBreach = (person, pos) => {
      this._onBreach(person, pos);
    };
    this.crowd.onSeated = (person, pos) => {
      this.allies = this.crowd.alliesSeated;
      this.ui.setAllies(this.allies);
      this.score += CONFIG.score.seat;
      this.ui.setScore(this.score);
      this.effects.spawnSeat(pos.x, 1.2, pos.z);
      this.audio.seat();
      this._checkChallenges();
    };
    this.crowd.onPersonDelivered = (delivered, target) => {
      this.ui.setDelivery(delivered, target);
      this.ui.setProgress(delivered / Math.max(1, target));
    };
    this.crowd.onLevelComplete = (lvl) => {
      this.level = lvl;
      this.country = COUNTRIES[(lvl - 1) % COUNTRIES.length];
      this.ui.hideLevelComplete();
      this.ui.setLevel(lvl, this.country);
      this.ui.setChallenge(lvl);
      this.eagleCaughtThisLevel = false;
      this.goldenCaughtThisLevel = false;
      this.levelBreaches = 0;
      const stats = this.crowd.getDeliveryStats();
      this.ui.setDelivery(0, stats.target);
      this.ui.setProgress(0);
      this.audio.levelUp();
      this.player.startLevelIntro();
      this.ui.flashTicker(pickTicker());
    };
    this.crowd.onVipSpawn = () => {
      this.ui.showVipCallout();
    };

    this.passports.onCatch = (person, meta) => {
      this.crowd.catchPerson(person, meta);
    };

    this.eagle.onAppear = () => {
      this.audio.eagleFanfare();
      this.ui.showEagleBanner();
      this.ui.showEagleHint();
      this.ui.showVO('eagle');
    };
    this.eagle.onCatch = (pos) => this._handleEagleCatch(pos);
  }

  _initInput() {
    const updatePointer = (cx, cy) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((cx - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((cy - rect.top) / rect.height) * 2 + 1;
      this._lastClient = { x: cx, y: cy };
    };

    const handleThrow = () => {
      if (!this.running) return;
      // Soft resume only if suspended — never full unlock/prime/music on every throw
      this.audio.ensureForThrow();
      if (this.player.isIntroActive) return;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      try {
        if (this.eagle.tryClick(this.raycaster)) return;
      } catch (e) {
        console.warn('[GEP] eagle click', e);
      }
      this._throw();
    };

    this.canvas.addEventListener('mousemove', (e) => updatePointer(e.clientX, e.clientY));
    this.canvas.addEventListener('click', (e) => {
      updatePointer(e.clientX, e.clientY);
      handleThrow();
    });

    let touchStart = null;
    this.canvas.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        if (!e.touches.length) return;
        const t = e.touches[0];
        touchStart = { x: t.clientX, y: t.clientY, time: Date.now() };
        updatePointer(t.clientX, t.clientY);
      },
      { passive: false }
    );
    this.canvas.addEventListener(
      'touchend',
      (e) => {
        e.preventDefault();
        if (!touchStart || !e.changedTouches.length) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - touchStart.x;
        const dy = t.clientY - touchStart.y;
        const elapsed = Date.now() - touchStart.time;
        updatePointer(t.clientX, t.clientY);
        touchStart = null;
        if (elapsed < 450 && dx * dx + dy * dy < 900) handleThrow();
      },
      { passive: false }
    );
  }

  /**
   * Exact world point under the cursor on the ground plane.
   * Primary trajectory MUST honor this — no pre-aim magnet.
   */
  _getAimPoint() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const groundHit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, groundHit)) {
      // Fallback: project along ray to a far plane
      const dir = this.raycaster.ray.direction.clone();
      groundHit.copy(this.raycaster.ray.origin).addScaledVector(dir, 20);
      groundHit.y = 0;
    }
    // Clamp to plaza bounds so throws stay in play
    groundHit.x = clamp(groundHit.x, -12, 12);
    groundHit.z = clamp(groundHit.z, CONFIG.world.spawnZ + 1, CONFIG.world.borderZ + 2);
    groundHit.y = 0;
    return groundHit;
  }

  _throw() {
    if (this.throwCooldown > 0 || this.player.isIntroActive) return;
    const landing = this._getAimPoint();
    this.player.getThrowOrigin(this._origin);
    const dirX = landing.x - this._origin.x;

    const golden = chance(CONFIG.passport.goldenChance);
    this.passports.throw(this._origin, landing, golden);
    this.player.triggerThrow();
    // dirX / mouse already inverted inside Player.setAim
    this.player.setAim(clamp(dirX / 8, -1, 1));
    this.throwCooldown = CONFIG.player.throwCooldown;

    try {
      this.audio.whip();
    } catch {
      /* ignore */
    }
    this.ui.hideHint();
    this.ui.cameraPunch();
    this._punch = 0.08;
    try {
      this.effects.spawnFlash(this._origin.x, this._origin.y, this._origin.z - 0.5);
    } catch (e) {
      console.warn('[GEP] flash', e);
    }
  }

  _onCatch(person, pos, meta = {}) {
    const golden = !!meta.golden;
    this.comboTimer = 1.6;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);

    let points = golden ? CONFIG.score.golden : CONFIG.score.catch;
    points += Math.max(0, this.combo - 1) * CONFIG.score.comboStep;
    this.score += points;
    this.ui.setScore(this.score);

    // LARGE unmistakable catch feedback
    this.effects.spawnCatch(pos.x, pos.y, pos.z, golden);
    this.effects.spawnPlusOne(
      pos.x,
      pos.y + 0.4,
      pos.z,
      golden ? `+${points}` : '+1',
      golden ? PAL.gold : PAL.green
    );
    this.ui.cameraPunch();
    this._punch = 0.1;

    if (golden) {
      this.goldenCaughtThisLevel = true;
      this.audio.golden();
      this.audio.vo('golden');
      this.ui.showVO('golden');
      this.ui.flashGold();
    } else {
      this.audio.catch(this.combo);
      if (this.combo >= 2 || chance(0.35)) {
        this.audio.vo('catch');
        this.ui.showVO('catch');
      }
    }
    if (this.combo >= 2) this.ui.showCombo(this.combo);

    if (this._lastClient) {
      this.ui.floatScore(this._lastClient.x, this._lastClient.y - 20, points, golden || this.combo >= 3);
    }
    this._checkChallenges();
  }

  _onBreach(person, pos) {
    this.breaches += 1;
    this.levelBreaches += 1;
    this.combo = 0;
    this.ui.setBreaches(this.breaches, CONFIG.breach.max);
    this.effects.spawnBreach(pos.x, pos.y, pos.z);
    this.audio.breach();
    this.audio.vo('breach');
    this.ui.showVO('breach');
    this.ui.flashRed();
    this.ui.cameraPunch();
    this._punch = 0.13;

    if (this.breaches >= CONFIG.breach.max) {
      this.endGame();
    }
  }

  _handleEagleCatch(pos) {
    this.eagleCaughtThisLevel = true;
    this.ui.hideEagleHint();
    const grants = this.crowd.grantPassportsToAllWalkers();
    this.effects.spawnEagleFanfare(pos.x, pos.y, pos.z);
    this.audio.eagleFanfare();
    this.audio.vo('eagle');
    this.ui.showVO('eagle');
    this.ui.showEagleBanner();
    this.ui.flashGold();
    this.score += CONFIG.score.catch * Math.max(1, grants.length);
    this.ui.setScore(this.score);
    this._checkChallenges();
  }

  _checkChallenges() {
    const c = this.ui.challenge;
    if (!c || this.ui.challengeDone) return;
    const done =
      (c.id === 'noBreach' && this.crowd.deliveryTargetMet && this.levelBreaches === 0) ||
      (c.id === 'rally' && this.allies >= 5 + this.level) ||
      (c.id === 'combo' && this.bestCombo >= 4) ||
      (c.id === 'eagle' && this.eagleCaughtThisLevel) ||
      (c.id === 'golden' && this.goldenCaughtThisLevel);
    if (done) {
      this.ui.completeChallenge();
      this.score += 200;
      this.ui.setScore(this.score);
    }
  }

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this._applyCameraLayout();
    this.renderer.setSize(w, h, false);
    this.ui.updateRotateTip();
  }

  start() {
    // Unlock inside the Begin/Restart click gesture (iOS Safari).
    // forceUnmute on first Begin is handled by main.js; restart keeps mute preference.
    this.audio.unlock({ startMusic: true });

    this.running = true;
    this.score = 0;
    this.level = 1;
    this.breaches = 0;
    this.allies = 0;
    this.combo = 0;
    this.bestCombo = 1;
    this.throwCooldown = 0;
    this.eagleCaughtThisLevel = false;
    this.goldenCaughtThisLevel = false;
    this.levelBreaches = 0;
    this.country = COUNTRIES[0];

    this.crowd.resetForNewGame();
    this.eagle.reset();
    this.passports.clear();
    this.effects.clear();
    this.ui.hideEagleHint();

    this.ui.hideStart();
    this.ui.hideGameOver();
    this.ui.hideLevelComplete();
    this.ui.showHud();
    this.ui.setAllies(0);
    this.ui.setBreaches(0, CONFIG.breach.max);
    this.ui.setScore(0);
    this.ui.setLevel(1, this.country);
    this.ui.setChallenge(1);
    this.ui.refreshBests();
    const stats = this.crowd.getDeliveryStats();
    this.ui.setDelivery(0, stats.target);
    this.ui.setProgress(0);

    this.player.startLevelIntro();

    this.clock.start();
    if (!this._looping) {
      this._looping = true;
      this.loop();
    }
  }

  endGame() {
    if (!this.running) return;
    this.running = false;
    this.eagle.reset();
    this.ui.hideEagleHint();
    this.audio.stopMusic();
    const isRecord = this.ui.setHighScore(this.score);
    this.ui.showGameOver({
      level: this.level,
      allies: this.allies,
      breaches: this.breaches,
      bestCombo: this.bestCombo,
      score: this.score,
      best: this.ui.getHighScore(),
      isRecord,
    });
  }

  _safe(label, fn) {
    try {
      fn();
    } catch (e) {
      console.warn(`[GEP] ${label}`, e);
    }
  }

  update() {
    if (!this.running) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.elapsedTime;

    if (this.throwCooldown > 0) this.throwCooldown = Math.max(0, this.throwCooldown - dt);
    this.ui.setCooldown(1 - this.throwCooldown / CONFIG.player.throwCooldown);

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    this._safe('player', () => this.player.update(dt));
    this._safe('environment', () => this.environment.update(dt));
    this._safe('border', () => this.border.update(dt, time));
    this._safe('crowd', () => this.crowd.update(dt));

    // Eagle: ONLY when walkers are actively approaching (not idle / level-complete)
    let walkersApproaching = false;
    this._safe('aimable', () => {
      walkersApproaching = this.crowd.getAimablePeople().length > 0;
    });
    this.eagle.canSpawn =
      this.running &&
      walkersApproaching &&
      !this.crowd.levelCompletePending;
    this._safe('eagle', () => this.eagle.update(dt));

    this._safe('passports', () =>
      this.passports.update(dt, this.crowd.getAimablePeople())
    );
    this._safe('effects', () => this.effects.update(dt));

    if (!this.player.isIntroActive) {
      this.player.setAim(this.mouse.x);
    }

    if (this.crowd.levelCompletePending && !this._lcShowing) {
      this._lcShowing = true;
      this.player.celebrate();
      this._safe('audio.levelUp', () => this.audio.levelUp());
      this.score += CONFIG.score.levelClear;
      this.ui.setScore(this.score);
      this.ui.showLevelComplete(this.crowd.level, {
        allies: this.allies,
        breaches: this.levelBreaches,
        score: this.score,
      });
      this.ui.flashTicker(pickTicker());
    }
    if (!this.crowd.levelCompletePending) this._lcShowing = false;

    const cam = this._cameraBase;
    if (this._punch > 0) this._punch = Math.max(0, this._punch - dt);
    const punchOff = this._punch * 0.16;

    // Level intro: pull in for a face-cam beat, then ease back as he turns
    if (this.player.introPhase === 'face' || this.player.introPhase === 'turn') {
      const head = this.player.head;
      const hp = this._introHeadPos || (this._introHeadPos = new THREE.Vector3());
      if (head) head.getWorldPosition(hp);
      else hp.set(0, 3.5, CONFIG.world.podiumZ);
      const faceAmt =
        this.player.introPhase === 'face'
          ? 1
          : 1 - Math.min(1, this.player.introT / 0.5);
      const eased = faceAmt * faceAmt * (3 - 2 * faceAmt);
      // Face-cam: friendly toy close-up (readable smile/eyes, not telephoto horror)
      const faceCam = {
        x: hp.x,
        y: hp.y + 0.05,
        z: hp.z + 3.6,
        lookY: hp.y - 0.12,
        lookZ: hp.z,
      };
      this.camera.position.x = THREE.MathUtils.lerp(cam.x, faceCam.x, eased);
      this.camera.position.y = THREE.MathUtils.lerp(cam.y, faceCam.y, eased);
      this.camera.position.z = THREE.MathUtils.lerp(cam.z, faceCam.z, eased);
      this.camera.lookAt(
        0,
        THREE.MathUtils.lerp(cam.lookY, faceCam.lookY, eased),
        THREE.MathUtils.lerp(cam.lookZ, faceCam.lookZ, eased)
      );
      this.camera.fov = THREE.MathUtils.lerp(cam.fov, 52, eased);
      this.camera.updateProjectionMatrix();
    } else {
      this._introHeadPos = null;
      this.camera.position.x = cam.x + Math.sin(time * 0.3) * 0.25 + (Math.random() - 0.5) * punchOff;
      this.camera.position.y = cam.y + Math.sin(time * 0.5) * 0.1;
      this.camera.position.z = cam.z + punchOff * 1.2;
      this.camera.lookAt(0, cam.lookY, cam.lookZ);
      if (this.camera.fov !== cam.fov) {
        this.camera.fov = cam.fov;
        this.camera.updateProjectionMatrix();
      }
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    // Last-resort: one bad entity must never kill the RAF loop
    try {
      this.update();
    } catch (e) {
      console.warn('[GEP] update fatal', e);
    }
    try {
      this.render();
    } catch (e) {
      console.warn('[GEP] render fatal', e);
    }
  }

  toggleMute() {
    const muted = this.audio.toggleMute();
    this.ui.setMute(muted);
    if (!muted) {
      // Unmute MUST unlock+resume+prime in this same tap handler (iOS Safari)
      this.audio.unlock({ startMusic: this.running });
    }
    return muted;
  }
}
