import * as THREE from 'three';
import { CONFIG, PAL } from './config.js';
import { passportTexture } from './textures.js';

const _v = new THREE.Vector3();
const _tmp = new THREE.Vector3();

function makePassportMesh(golden) {
  const g = new THREE.Group();
  const coverTex = passportTexture(golden);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: golden ? PAL.gold : PAL.passportBlue,
    emissive: golden ? 0x6a4d00 : 0x0a1f52,
    emissiveIntensity: 0.6,
    roughness: 0.4,
    metalness: golden ? 0.6 : 0.2,
  });
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.14), bodyMat);
  g.add(book);
  const faceMat = new THREE.MeshStandardMaterial({
    map: coverTex,
    emissive: 0x111133,
    emissiveIntensity: 0.25,
  });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), faceMat);
  front.position.z = 0.071;
  g.add(front);
  const back = front.clone();
  back.position.z = -0.071;
  back.rotation.y = Math.PI;
  g.add(back);
  const pages = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.64, 0.15),
    new THREE.MeshStandardMaterial({ color: 0xfff8e0, roughness: 0.9 })
  );
  pages.position.x = 0.02;
  g.add(pages);
  g.children.forEach((c) => {
    if (c.isMesh) c.castShadow = true;
  });

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 12, 12),
    new THREE.MeshBasicMaterial({
      color: golden ? PAL.gold : PAL.electric,
      transparent: true,
      opacity: 0.18,
    })
  );
  g.add(halo);
  return g;
}

/**
 * Passport projectiles fly on a ballistic arc that LANDS at the clicked
 * world point. Soft magnet only applies after a near-miss (close approach).
 */
export class PassportManager {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
    this.pool = [];
    this.onCatch = null;
    this.onMiss = null;
  }

  _acquire(golden) {
    const idx = this.pool.findIndex((p) => p.userData.golden === golden);
    if (idx >= 0) {
      const m = this.pool.splice(idx, 1)[0];
      m.visible = true;
      return m;
    }
    const m = makePassportMesh(golden);
    m.userData.golden = golden;
    return m;
  }

  /**
   * @param {THREE.Vector3} origin
   * @param {THREE.Vector3} landing - world ground point under the cursor
   * @param {boolean} golden
   */
  throw(origin, landing, golden = false) {
    const mesh = this._acquire(golden);
    mesh.position.copy(origin);
    this.scene.add(mesh);

    const target = landing.clone();
    target.y = 0;
    const dx = target.x - origin.x;
    const dz = target.z - origin.z;
    const flatDist = Math.hypot(dx, dz) || 0.01;
    // Flight time scales with distance so the arc always feels readable
    const flightTime = Math.max(0.35, Math.min(1.35, flatDist / CONFIG.passport.speed));
    const arcHeight = CONFIG.passport.arcHeight + flatDist * 0.04;

    this.active.push({
      mesh,
      golden,
      origin: origin.clone(),
      landing: target,
      flightTime,
      arcHeight,
      spin: (Math.random() * 2 - 1) * 8 + 10,
      life: 0,
      magnetApplied: false,
      velXZ: new THREE.Vector2(dx / flightTime, dz / flightTime),
    });
  }

  _release(item) {
    this.scene.remove(item.mesh);
    item.mesh.userData.golden = item.golden;
    this.pool.push(item.mesh);
  }

  update(dt, people) {
    const list = people || [];
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      if (!p?.mesh) {
        this.active.splice(i, 1);
        continue;
      }
      p.life += dt;
      const t = Math.min(1, p.life / p.flightTime);

      // Soft magnet ONLY when near-missing a person (after close approach)
      if (!p.magnetApplied && t > 0.35) {
        let nearest = null;
        let bestD = CONFIG.player.nearMissRadius;
        for (const person of list) {
          if (!person?.catchable || !person.group) continue;
          const d = Math.hypot(
            person.group.position.x - p.mesh.position.x,
            person.group.position.z - p.mesh.position.z
          );
          if (d < bestD) {
            bestD = d;
            nearest = person;
          }
        }
        if (nearest && CONFIG.player.nearMissMagnet > 0) {
          const pull = CONFIG.player.nearMissMagnet;
          p.landing.x = THREE.MathUtils.lerp(
            p.landing.x,
            nearest.group.position.x,
            pull
          );
          p.landing.z = THREE.MathUtils.lerp(
            p.landing.z,
            nearest.group.position.z,
            pull
          );
          // Recompute remaining velocity toward new landing
          const remain = Math.max(0.08, p.flightTime - p.life);
          p.velXZ.set(
            (p.landing.x - p.mesh.position.x) / remain,
            (p.landing.z - p.mesh.position.z) / remain
          );
          p.origin.copy(p.mesh.position);
          p.origin.y = p.mesh.position.y;
          p.flightTime = remain;
          p.life = 0;
          p.magnetApplied = true;
        }
      }

      // Primary trajectory: honor landing (click point)
      if (p.magnetApplied) {
        p.mesh.position.x += p.velXZ.x * dt;
        p.mesh.position.z += p.velXZ.y * dt;
        const t2 = Math.min(1, p.life / p.flightTime);
        p.mesh.position.y = Math.max(0.3, p.origin.y * (1 - t2) + Math.sin(t2 * Math.PI) * p.arcHeight);
      } else {
        p.mesh.position.x = THREE.MathUtils.lerp(p.origin.x, p.landing.x, t);
        p.mesh.position.z = THREE.MathUtils.lerp(p.origin.z, p.landing.z, t);
        // Parabolic arc peaking mid-flight, landing near ground at click
        const startY = p.origin.y;
        const endY = 1.1; // chest height at catch zone
        p.mesh.position.y =
          THREE.MathUtils.lerp(startY, endY, t) + Math.sin(t * Math.PI) * p.arcHeight;
      }

      p.mesh.rotation.y += p.spin * dt;
      p.mesh.rotation.x += p.spin * 0.4 * dt;

      // Catch vs nearest eligible walker
      let caught = null;
      let bestDist = CONFIG.passport.catchRadius;
      for (const person of list) {
        if (!person?.catchable || !person.group) continue;
        _v.copy(person.group.position);
        _v.y = p.mesh.position.y;
        // Prefer chest height for distance check
        const chestY = person.group.position.y + 1.25;
        _tmp.set(person.group.position.x, chestY, person.group.position.z);
        const d = _tmp.distanceTo(p.mesh.position);
        if (d < bestDist) {
          bestDist = d;
          caught = person;
        }
      }
      if (caught) {
        try {
          this.onCatch &&
            this.onCatch(caught, {
              golden: p.golden,
              position: p.mesh.position.clone(),
            });
        } catch (e) {
          console.warn('[GEP] passport catch', e);
        }
        this._release(p);
        this.active.splice(i, 1);
        continue;
      }

      // Expire after landing / timeout / off-map
      if (
        t >= 1 ||
        p.mesh.position.z < CONFIG.world.spawnZ - 2 ||
        Math.abs(p.mesh.position.x) > 16 ||
        p.life > 3.5
      ) {
        this.onMiss && this.onMiss(p.mesh.position.clone());
        this._release(p);
        this.active.splice(i, 1);
      }
    }
  }

  clear() {
    this.active.forEach((p) => this.scene.remove(p.mesh));
    this.active = [];
  }
}
