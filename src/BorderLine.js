import * as THREE from 'three';
import { CONFIG, PAL } from './config.js';

/** Neon hazard strip with pulsing segments and warning posts. */
export class BorderLine {
  constructor(scene, z = CONFIG.world.borderZ) {
    this.z = z;
    this.group = new THREE.Group();
    this.segments = [];
    this._build(scene);
  }

  _build(scene) {
    const width = 36;

    // Hot yellow hazard base
    const yellow = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.28, 0.22),
      new THREE.MeshStandardMaterial({
        color: PAL.hotYellow,
        emissive: 0xaa8800,
        emissiveIntensity: 0.55,
        roughness: 0.45,
      })
    );
    yellow.position.set(0, 0.16, this.z);
    yellow.receiveShadow = true;
    this.group.add(yellow);

    // Hazard chevrons painted as alternating dark strips
    for (let i = 0; i < 18; i++) {
      if (i % 2) continue;
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.3, 0.24),
        new THREE.MeshStandardMaterial({ color: 0x1a1400, roughness: 0.8 })
      );
      stripe.position.set(-width / 2 + 1 + i * 2, 0.17, this.z);
      this.group.add(stripe);
    }

    // Glowing electric-blue segments that pulse
    const segCount = 14;
    const segWidth = width / segCount - 0.25;
    for (let i = 0; i < segCount; i++) {
      const x = -width / 2 + (i + 0.5) * (width / segCount);
      const mat = new THREE.MeshStandardMaterial({
        color: PAL.electric,
        emissive: PAL.blue,
        emissiveIntensity: 0.9,
        roughness: 0.25,
        metalness: 0.3,
      });
      const seg = new THREE.Mesh(new THREE.BoxGeometry(segWidth, 0.38, 0.28), mat);
      seg.position.set(x, 0.24, this.z);
      seg.userData.base = 0.7 + (i % 3) * 0.15;
      seg.userData.phase = i * 0.45;
      this.segments.push(seg);
      this.group.add(seg);
    }

    // Warning posts + red bulbs
    for (const x of [-width / 2 + 0.6, width / 2 - 0.6]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.11, 1.3, 6),
        new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.55, roughness: 0.35 })
      );
      post.position.set(x, 0.65, this.z);
      post.castShadow = true;
      this.group.add(post);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 10, 8),
        new THREE.MeshStandardMaterial({
          color: PAL.red,
          emissive: 0xff0000,
          emissiveIntensity: 0.85,
        })
      );
      bulb.position.set(x, 1.35, this.z);
      this.group.add(bulb);
      this.segments.push(bulb); // reuse for pulse
      bulb.userData.base = 0.9;
      bulb.userData.phase = x > 0 ? 1.2 : 0;
      bulb.userData.isBulb = true;
    }

    scene.add(this.group);
  }

  update(dt, time) {
    this.segments.forEach((seg) => {
      if (!seg.material || seg.material.emissiveIntensity === undefined) return;
      const pulse = Math.sin(time * 3.2 + (seg.userData.phase || 0)) * 0.35 + 0.7;
      seg.material.emissiveIntensity = (seg.userData.base || 0.8) * pulse;
    });
  }

  hasCrossed(z) {
    return z >= this.z - 0.3;
  }
}
