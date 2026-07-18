import * as THREE from 'three';
import { CONFIG, PAL } from './config.js';
import { chance, rand } from './utils.js';

const FLIGHT_Y = 7.4;
const FLIGHT_Z = 2.0;
const X_START = -18;
const X_END = 18;

function rollInterval(window) {
  const [a, b] = window;
  return rand(a, b);
}

/**
 * Freedom Eagle — ONLY flies when walkers are actively approaching the border.
 * Randomized intervals (first 12–22s, then 20–40s). Never a perfect metronome.
 */
export class EagleManager {
  constructor(scene) {
    this.scene = scene;
    this.eagles = [];
    this.spawnTimer = rollInterval(CONFIG.eagle.firstWindow);
    this.active = false;
    this.onAppear = null;
    this.onCatch = null;
    this.t = 0;
    /** Set each frame by Game: true when approach walkers exist and not in level-complete pause */
    this.canSpawn = false;
  }

  reset() {
    this.spawnTimer = rollInterval(CONFIG.eagle.firstWindow);
    this._clearAll();
  }

  _buildEagle() {
    const group = new THREE.Group();
    const hitMeshes = [];
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.75 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
    const beakMat = new THREE.MeshStandardMaterial({
      color: PAL.gold,
      roughness: 0.4,
      metalness: 0.5,
    });
    const trailMat = new THREE.MeshBasicMaterial({
      color: PAL.gold,
      transparent: true,
      opacity: 0.55,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.48, 0.58), bodyMat);
    body.castShadow = true;
    group.add(body);
    hitMeshes.push(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), headMat);
    head.position.set(0.58, 0.2, 0);
    head.castShadow = true;
    group.add(head);
    hitMeshes.push(head);

    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 4), beakMat);
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(0.82, 0.2, 0);
    group.add(beak);

    const wingGeo = new THREE.BoxGeometry(0.85, 0.08, 0.5);
    const leftWing = new THREE.Mesh(wingGeo, bodyMat);
    leftWing.position.set(-0.05, 0.14, 0.48);
    leftWing.rotation.x = -0.35;
    leftWing.castShadow = true;
    group.add(leftWing);
    hitMeshes.push(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, bodyMat);
    rightWing.position.set(-0.05, 0.14, -0.48);
    rightWing.rotation.x = 0.35;
    rightWing.castShadow = true;
    group.add(rightWing);
    hitMeshes.push(rightWing);

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.06, 0.32), bodyMat);
    tail.position.set(-0.6, 0.05, 0);
    tail.rotation.z = 0.2;
    group.add(tail);

    const pass = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.48, 0.08),
      new THREE.MeshStandardMaterial({
        color: PAL.passportBlue,
        emissive: 0x2244aa,
        emissiveIntensity: 0.7,
      })
    );
    pass.position.set(0.1, -0.55, 0);
    group.add(pass);

    const trail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.18), trailMat);
    trail.position.set(-1.2, 0, 0);
    group.add(trail);

    // Tight body-only hit collider (was 3.6 — covered most of the screen).
    // Local radius ~0.72 ≈ bird body; group scale 1.55 → ~1.1 world units.
    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 10, 10),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    group.add(hit);
    hitMeshes.push(hit);

    const aura = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 12, 12),
      new THREE.MeshBasicMaterial({ color: PAL.gold, transparent: true, opacity: 0.16 })
    );
    group.add(aura);

    group.scale.set(1.55, 1.55, 1.55);
    return { group, leftWing, rightWing, hitMeshes };
  }

  _spawnOne(offsetY = 0) {
    const built = this._buildEagle();
    const direction = Math.random() > 0.5 ? 1 : -1;
    const startX = direction > 0 ? X_START : X_END;
    built.group.position.set(startX, FLIGHT_Y + offsetY, FLIGHT_Z);
    built.group.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
    this.scene.add(built.group);
    this.eagles.push({
      ...built,
      direction,
      flightTime: 0,
      offsetY,
    });
  }

  _spawn() {
    this._clearAll();
    this.active = true;
    this._spawnOne(0);
    if (chance(CONFIG.eagle.dualChance)) {
      this._spawnOne(1.8);
    }
    if (this.onAppear) this.onAppear();
  }

  _clearAll() {
    this.eagles.forEach((e) => {
      try {
        this.scene.remove(e.group);
      } catch {
        /* ignore */
      }
      try {
        e.group?.traverse((c) => {
          if (c.geometry) {
            try {
              c.geometry.dispose();
            } catch {
              /* ignore */
            }
          }
        });
      } catch {
        /* ignore */
      }
    });
    this.eagles = [];
    this.active = false;
  }

  _nextInterval() {
    return rollInterval(CONFIG.eagle.intervalWindow);
  }

  update(dt) {
    this.t += dt;
    if (!this.active) {
      // Only tick / spawn when walkers are on the field attempting entry
      if (!this.canSpawn) return;
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        try {
          this._spawn();
        } catch (e) {
          console.warn('[GEP] eagle spawn', e);
          this.active = false;
          this.spawnTimer = this._nextInterval();
        }
      }
      return;
    }

    for (let i = this.eagles.length - 1; i >= 0; i--) {
      const e = this.eagles[i];
      try {
        if (!e?.group) {
          this.eagles.splice(i, 1);
          continue;
        }
        e.flightTime += dt;
        const t = Math.min(1, e.flightTime / CONFIG.eagle.lifetime);
        const x = THREE.MathUtils.lerp(
          e.direction > 0 ? X_START : X_END,
          e.direction > 0 ? X_END : X_START,
          t
        );
        const bob = Math.sin(this.t * 8) * 0.28;
        e.group.position.set(x, FLIGHT_Y + e.offsetY + bob, FLIGHT_Z);

        const flap = Math.sin(this.t * 14) * 0.5;
        if (e.leftWing) e.leftWing.rotation.x = -0.35 + flap;
        if (e.rightWing) e.rightWing.rotation.x = 0.35 - flap;

        if (e.flightTime >= CONFIG.eagle.lifetime) {
          try {
            this.scene.remove(e.group);
          } catch {
            /* ignore */
          }
          this.eagles.splice(i, 1);
        }
      } catch (err) {
        console.warn('[GEP] eagle update', err);
        try {
          this.scene.remove(e.group);
        } catch {
          /* ignore */
        }
        this.eagles.splice(i, 1);
      }
    }

    if (this.eagles.length === 0) {
      this.active = false;
      this.spawnTimer = this._nextInterval();
    }
  }

  tryClick(raycaster) {
    if (!this.active || !raycaster) return false;
    for (const e of this.eagles) {
      if (!e?.hitMeshes?.length || !e.group) continue;
      let hits = [];
      try {
        hits = raycaster.intersectObjects(e.hitMeshes, false);
      } catch {
        continue;
      }
      if (hits.length === 0) continue;
      const pos = e.group.position.clone();
      if (this.onCatch) {
        try {
          this.onCatch(pos);
        } catch (err) {
          console.warn('[GEP] eagle onCatch', err);
        }
      }
      this._clearAll();
      this.spawnTimer = this._nextInterval();
      return true;
    }
    return false;
  }
}
