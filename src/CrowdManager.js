import * as THREE from 'three';
import { Person } from './Person.js';
import { CONFIG } from './config.js';
import { rand, chance } from './utils.js';

/**
 * Wave-based crowd. Level advances ONLY after the current wave fully resolves
 * (every walker delivered, breached, or otherwise done) AND delivery target met —
 * same contract as the original Documents game.
 */
export class CrowdManager {
  constructor(scene) {
    this.scene = scene;
    this.people = [];
    this.pool = [];
    this.level = 1;
    this.deliveredCount = 0;
    this.seatIndex = 0;
    this.waveActive = false;
    this.waveCooldown = 1.0;
    this.peopleInWave = 0;
    this.peopleSpawned = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 0.28;
    this.waveConfig = null;
    this.levelCompletePending = false;
    this.deliveryTargetMet = false;
    this.levelTransitionTimer = 0;
    this.vipQueued = false;

    this.onPersonDelivered = null; // (delivered, target)
    this.onLevelComplete = null; // (level)
    this.onPassportCatch = null; // (person, pos, {golden})
    this.onBreach = null; // (person, pos)
    this.onSeated = null; // (person, pos)
    this.onVipSpawn = null;
  }

  getLevelCfg() {
    return CONFIG.level(this.level);
  }

  getLevelTarget() {
    return this.getLevelCfg().goal;
  }

  getWaveConfig() {
    const cfg = this.getLevelCfg();
    // Columns scale with the +20%/level people curve (cap for lane width)
    const cols = Math.min(12, Math.max(4, Math.ceil(Math.sqrt(cfg.total * 1.35))));
    const rows = Math.ceil(cfg.total / cols);
    return { cols, rows, total: cols * rows, speed: cfg.speed };
  }

  getSeatPosition(index) {
    const side = index % 2 === 0 ? -1 : 1;
    const row = Math.floor(index / 2);
    const x = side * (2.8 + row * 1.1);
    const z = CONFIG.world.seatZ + row * 0.6;
    const rotY = side < 0 ? Math.PI * 0.35 : -Math.PI * 0.35;
    return { x, y: 0, z, rotY };
  }

  _acquire() {
    return this.pool.pop() || new Person(this.scene);
  }

  startWave() {
    this.waveConfig = this.getWaveConfig();
    this.peopleInWave = this.waveConfig.total;
    this.peopleSpawned = 0;
    this.waveActive = true;
    this.spawnTimer = 0;
    this.spawnInterval = Math.max(0.09, 0.22 - this.level * 0.018);
  }

  spawnPerson(col, row, cols) {
    const person = this._acquire();
    const spacing = 2.2;
    const maxLaneWidth = 9.5;
    const naturalWidth = (cols - 1) * spacing;
    const laneSpacing = cols > 1 && naturalWidth > maxLaneWidth
      ? maxLaneWidth / (cols - 1)
      : spacing;
    const startX = -((cols - 1) * laneSpacing) / 2;
    const x = startX + col * laneSpacing + rand(-0.2, 0.2);
    const z = CONFIG.world.spawnZ - row * spacing + rand(-0.3, 0.3);
    const vip = !this.vipQueued && chance(0.06 + this.level * 0.01);
    if (vip) this.vipQueued = true;
    person.spawn({ x, z, speed: this.waveConfig.speed, vip });
    this.people.push(person);
    if (vip && this.onVipSpawn) this.onVipSpawn(person);
    return person;
  }

  assignSeatToPerson(person) {
    if (person.state === 'seated' || person.seatTarget) return;
    const seat = this.getSeatPosition(this.seatIndex++);
    person.assignSeat(seat);
  }

  isPersonUnresolved(person) {
    return person.state === 'approach' || person.state === 'toSeat' || person.state === 'breach';
  }

  isCurrentWaveFullyComplete() {
    if (this.peopleSpawned < this.peopleInWave) return false;
    return !this.people.some((p) => this.isPersonUnresolved(p));
  }

  advanceLevel() {
    this.level++;
    this.deliveredCount = 0;
    this.seatIndex = 0;
    this.levelCompletePending = false;
    this.deliveryTargetMet = false;
    this.levelTransitionTimer = 0;
    this.waveActive = false;
    this.waveCooldown = 2.0;
    this.vipQueued = false;
    // Keep seated allies for the comedy payoff; remove unresolved leftovers.
    this.people = this.people.filter((p) => {
      if (p.state === 'seated') return true;
      p.hide();
      this.pool.push(p);
      return false;
    });
  }

  resetForNewGame() {
    this.level = 1;
    this.deliveredCount = 0;
    this.seatIndex = 0;
    this.levelCompletePending = false;
    this.deliveryTargetMet = false;
    this.levelTransitionTimer = 0;
    this.waveActive = false;
    this.waveCooldown = 1.0;
    this.peopleSpawned = 0;
    this.peopleInWave = 0;
    this.vipQueued = false;
    this.people.forEach((p) => {
      p.hide();
      this.pool.push(p);
    });
    this.people = [];
  }

  _trackSeated() {
    for (const person of this.people) {
      if (person.state === 'seated' && !person.countedAsDelivered) {
        person.countedAsDelivered = true;
        this.deliveredCount++;
        if (this.onPersonDelivered) {
          this.onPersonDelivered(this.deliveredCount, this.getLevelTarget());
        }
        if (this.onSeated) {
          this.onSeated(person, person.group.position.clone());
        }
        if (this.deliveredCount >= this.getLevelTarget()) {
          this.deliveryTargetMet = true;
        }
      }
    }
  }

  _recoverStuck() {
    const borderZ = CONFIG.world.borderZ;
    for (const person of this.people) {
      if (person.state === 'toSeat' && !person.seatTarget) {
        this.assignSeatToPerson(person);
      }
      // Non-passport walkers somehow stuck near border — nudge + force breach
      if (person.state === 'approach' && person.group.position.z >= borderZ - 0.05) {
        if (this.onBreach) this.onBreach(person, person.group.position.clone());
        person.hide();
      }
      // Seated-bound people who haven't moved in a while get a kick
      if (person.state === 'toSeat' && person.seatTarget) {
        const d = person.group.position.distanceTo(person.seatTarget);
        if (d < 0.2) {
          person.state = 'seated';
        }
      }
    }
  }

  update(dt) {
    const borderZ = CONFIG.world.borderZ;
    for (const person of this.people) {
      if (!person || person.dead || person.state === 'idle') continue;
      let ev = null;
      try {
        ev = person.update(dt, borderZ);
      } catch (e) {
        console.warn('[GEP] person.update', e);
        try {
          person.hide();
        } catch {
          /* ignore */
        }
        continue;
      }
      if (ev === 'breach') {
        try {
          if (this.onBreach) this.onBreach(person, person.group.position.clone());
        } catch (e) {
          console.warn('[GEP] onBreach', e);
        }
        try {
          person.hide();
        } catch {
          /* ignore */
        }
      }
    }
    try {
      this._recoverStuck();
      this._trackSeated();
    } catch (e) {
      console.warn('[GEP] crowd bookkeeping', e);
    }

    if (this.levelCompletePending) {
      this.levelTransitionTimer += dt;
      const allResolved = !this.people.some((p) => this.isPersonUnresolved(p));
      if (allResolved && this.levelTransitionTimer >= 2.5) {
        this.advanceLevel();
        if (this.onLevelComplete) this.onLevelComplete(this.level);
      }
      return;
    }

    if (this.waveCooldown > 0) {
      this.waveCooldown -= dt;
      if (this.waveCooldown <= 0 && !this.waveActive && !this.deliveryTargetMet) {
        this.startWave();
      }
    }

    if (this.waveActive && this.peopleSpawned < this.peopleInWave) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        const { cols } = this.waveConfig;
        const idx = this.peopleSpawned;
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        try {
          this.spawnPerson(col, row, cols);
        } catch (e) {
          console.warn('[GEP] spawnPerson', e);
        }
        this.peopleSpawned++;
      }
    }

    if (this.waveActive && this.isCurrentWaveFullyComplete()) {
      this.waveActive = false;
      if (this.deliveryTargetMet && !this.levelCompletePending) {
        this.levelCompletePending = true;
        this.levelTransitionTimer = 0;
      } else if (!this.deliveryTargetMet) {
        this.waveCooldown = 2.0;
      }
    }
  }

  getAimablePeople() {
    return this.people.filter((p) => p.state === 'approach' && p.catchable);
  }

  getNearestAimable(fromX, fromZ) {
    let best = null;
    let bestD = Infinity;
    for (const p of this.getAimablePeople()) {
      const dx = p.group.position.x - fromX;
      const dz = p.group.position.z - fromZ;
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  grantPassportsToAllWalkers({ golden = false } = {}) {
    const results = [];
    for (const person of this.getAimablePeople()) {
      const pos = person.group.position.clone();
      pos.y += 1.4;
      person.setCaught(golden);
      this.assignSeatToPerson(person);
      results.push({ person, pos, golden });
      if (this.onPassportCatch) this.onPassportCatch(person, pos, { golden });
    }
    return results;
  }

  catchPerson(person, { golden = false, position = null } = {}) {
    if (!person || person.state !== 'approach') return false;
    const pos = position || person.group.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    person.setCaught(golden);
    this.assignSeatToPerson(person);
    if (this.onPassportCatch) this.onPassportCatch(person, pos, { golden });
    return true;
  }

  getProgress() {
    return this.deliveredCount / Math.max(1, this.getLevelTarget());
  }

  getDeliveryStats() {
    return { delivered: this.deliveredCount, target: this.getLevelTarget() };
  }

  get alliesSeated() {
    return this.people.filter((p) => p.state === 'seated').length;
  }
}
