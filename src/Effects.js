import * as THREE from 'three';
import { PAL } from './config.js';

/** Lightweight procedural particles + big catch feedback rings / +1 pops. */
export class EffectsManager {
  constructor(scene) {
    this.scene = scene;
    this.bursts = [];
    this.rings = [];
    this.labels = [];
  }

  spawnCatch(x, y, z, golden = false) {
    this._burst({
      x,
      y,
      z,
      count: golden ? 36 : 22,
      color: golden ? PAL.gold : PAL.green,
      speed: 5.5,
      life: 0.65,
      size: golden ? 0.18 : 0.14,
      gravity: 3,
    });
    // BIG unmistakable green catch ring
    this._ring(x, y + 0.2, z, golden ? PAL.gold : PAL.green, 1.4);
    // Secondary flash burst
    this._burst({
      x,
      y: y + 0.3,
      z,
      count: 12,
      color: 0xffffff,
      speed: 3.5,
      life: 0.3,
      size: 0.1,
      gravity: 0,
    });
  }

  /** Floating "+1" / "+N" sprite in world space. */
  spawnPlusOne(x, y, z, text = '+1', color = PAL.green) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 128);
    ctx.font = '900 72px Archivo Black, Arial Black, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 10;
    ctx.strokeText(text, 128, 64);
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.fillText(text, 128, 64);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    });
    const spr = new THREE.Sprite(mat);
    spr.position.set(x, y + 0.8, z);
    spr.scale.set(1.6, 0.8, 1);
    this.scene.add(spr);
    this.labels.push({ spr, mat, tex, age: 0, life: 0.9 });
  }

  spawnSeat(x, y, z) {
    this._burst({
      x,
      y: y + 0.5,
      z,
      count: 10,
      color: PAL.gold,
      speed: 2.2,
      life: 0.7,
      size: 0.1,
      gravity: 1.5,
    });
  }

  spawnBreach(x, y, z) {
    this._burst({
      x,
      y: y + 1,
      z,
      count: 30,
      color: PAL.red,
      speed: 5.5,
      life: 0.8,
      size: 0.18,
      gravity: 1,
      smoke: true,
    });
  }

  spawnEagleFanfare(x, y, z) {
    this._burst({
      x,
      y,
      z,
      count: 50,
      color: PAL.gold,
      speed: 7,
      life: 1.1,
      size: 0.2,
      gravity: 2,
    });
    this._burst({
      x,
      y,
      z,
      count: 30,
      color: PAL.electric,
      speed: 5,
      life: 0.9,
      size: 0.14,
      gravity: 2.5,
    });
    this._ring(x, y, z, PAL.gold, 2.2);
  }

  spawnFlash(x, y, z) {
    this._burst({
      x,
      y,
      z,
      count: 8,
      color: 0xffffff,
      speed: 3,
      life: 0.25,
      size: 0.08,
      gravity: 0,
    });
  }

  _ring(x, y, z, color, maxScale = 1.5) {
    const geo = new THREE.RingGeometry(0.4, 0.65, 32);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.rings.push({ mesh, mat, age: 0, life: 0.55, maxScale });
  }

  _burst({ x, y, z, count, color, speed, life, size, gravity, smoke = false }) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 1.4 + 0.2,
        Math.random() * 2 - 1
      ).normalize();
      velocities.push(dir.multiplyScalar(speed * (0.5 + Math.random())));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size,
      transparent: true,
      opacity: smoke ? 0.55 : 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    this.bursts.push({ pts, velocities, life, age: 0, gravity, mat });
  }

  _disposeBurst(b) {
    try {
      this.scene.remove(b.pts);
    } catch {
      /* ignore */
    }
    try {
      b.pts?.geometry?.dispose?.();
    } catch {
      /* ignore */
    }
    try {
      b.mat?.dispose?.();
    } catch {
      /* ignore */
    }
  }

  _disposeRing(r) {
    try {
      this.scene.remove(r.mesh);
    } catch {
      /* ignore */
    }
    try {
      r.mesh?.geometry?.dispose?.();
    } catch {
      /* ignore */
    }
    try {
      r.mat?.dispose?.();
    } catch {
      /* ignore */
    }
  }

  _disposeLabel(l) {
    try {
      this.scene.remove(l.spr);
    } catch {
      /* ignore */
    }
    try {
      l.tex?.dispose?.();
    } catch {
      /* ignore */
    }
    try {
      l.mat?.dispose?.();
    } catch {
      /* ignore */
    }
  }

  update(dt) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      try {
        if (!b?.pts?.geometry?.attributes?.position) {
          this.bursts.splice(i, 1);
          continue;
        }
        b.age += dt;
        const pos = b.pts.geometry.attributes.position;
        for (let j = 0; j < b.velocities.length; j++) {
          const v = b.velocities[j];
          v.y -= b.gravity * dt;
          pos.array[j * 3] += v.x * dt;
          pos.array[j * 3 + 1] += v.y * dt;
          pos.array[j * 3 + 2] += v.z * dt;
        }
        pos.needsUpdate = true;
        if (b.mat) {
          b.mat.opacity =
            Math.max(0, 1 - b.age / b.life) * (b.mat.opacity > 0.7 ? 0.95 : 0.55);
        }
        if (b.age >= b.life) {
          this._disposeBurst(b);
          this.bursts.splice(i, 1);
        }
      } catch (e) {
        console.warn('[GEP] burst', e);
        this._disposeBurst(b);
        this.bursts.splice(i, 1);
      }
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      try {
        if (!r?.mesh) {
          this.rings.splice(i, 1);
          continue;
        }
        r.age += dt;
        const t = r.age / r.life;
        const s = 0.5 + t * r.maxScale;
        r.mesh.scale.set(s, s, s);
        if (r.mat) r.mat.opacity = Math.max(0, 1 - t);
        if (r.age >= r.life) {
          this._disposeRing(r);
          this.rings.splice(i, 1);
        }
      } catch (e) {
        console.warn('[GEP] ring', e);
        this._disposeRing(r);
        this.rings.splice(i, 1);
      }
    }

    for (let i = this.labels.length - 1; i >= 0; i--) {
      const l = this.labels[i];
      try {
        if (!l?.spr) {
          this.labels.splice(i, 1);
          continue;
        }
        l.age += dt;
        const t = l.age / l.life;
        l.spr.position.y += dt * 1.8;
        if (l.mat) l.mat.opacity = Math.max(0, 1 - t);
        const s = 1.2 + t * 0.6;
        l.spr.scale.set(1.6 * s, 0.8 * s, 1);
        if (l.age >= l.life) {
          this._disposeLabel(l);
          this.labels.splice(i, 1);
        }
      } catch (e) {
        console.warn('[GEP] label', e);
        this._disposeLabel(l);
        this.labels.splice(i, 1);
      }
    }
  }

  clear() {
    this.bursts.forEach((b) => this._disposeBurst(b));
    this.bursts = [];
    this.rings.forEach((r) => this._disposeRing(r));
    this.rings = [];
    this.labels.forEach((l) => this._disposeLabel(l));
    this.labels = [];
  }
}
