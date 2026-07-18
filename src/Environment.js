import * as THREE from 'three';
import { CONFIG, PAL } from './config.js';
import { rand, pick } from './utils.js';
import { COUNTRIES } from './satire.js';
import {
  buildingTexture,
  signTexture,
  createPlazaGroundTexture,
  createConcreteTexture,
  loadUSFlagTexture,
  createUSFlagTexture,
} from './textures.js';

export class Environment {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.flags = [];
    this.signs = [];
    this.palms = [];
    this.archLights = [];
    this.t = 0;
    this._flagTex = createUSFlagTexture(760, 400); // sync fallback immediately
    this._flagMats = [];

    this._sky();
    this._lights();
    this._ground();
    this._stage();
    this._arch();
    this._buildings();
    this._decor();

    // Prefer high-res PNG when available
    loadUSFlagTexture().then((tex) => {
      this._flagTex = tex;
      this._flagMats.forEach((m) => {
        m.map = tex;
        m.needsUpdate = true;
      });
    });
  }

  _sky() {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0.0, '#8fd4ff');
    g.addColorStop(0.45, '#bfe6ff');
    g.addColorStop(0.75, '#e8f6ff');
    g.addColorStop(1.0, '#dfeaf5');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 256);
    const tex = new THREE.CanvasTexture(c);
    this.scene.background = tex;
    this.scene.fog = new THREE.Fog(0xc9e2f5, 32, 85);
  }

  _lights() {
    const hemi = new THREE.HemisphereLight(0xdff1ff, 0x6a6558, 0.75);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff4e0, 1.65);
    key.position.set(-8, 22, 10);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 80;
    const s = 28;
    key.shadow.camera.left = -s;
    key.shadow.camera.right = s;
    key.shadow.camera.top = s;
    key.shadow.camera.bottom = -s;
    key.shadow.bias = -0.00035;
    key.shadow.normalBias = 0.025;
    this.scene.add(key);
    this.key = key;

    const fill = new THREE.DirectionalLight(0xbcd8ff, 0.5);
    fill.position.set(12, 10, 6);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffcf33, 0.45);
    rim.position.set(0, 8, -20);
    this.scene.add(rim);
  }

  _ground() {
    const tex = createPlazaGroundTexture({ size: 512, repeat: 10 });
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.92,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 90), mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -6;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Lighter concrete under the stage / walk lane
    const laneTex = createConcreteTexture({ size: 512, tiles: 8, repeat: 4 });
    const lane = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 40),
      new THREE.MeshStandardMaterial({ map: laneTex, roughness: 0.88 })
    );
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(0, 0.01, -8);
    lane.receiveShadow = true;
    this.scene.add(lane);
  }

  _stage() {
    const geo = new THREE.CylinderGeometry(4.6, 4.9, 0.35, 48);
    const mat = new THREE.MeshStandardMaterial({ color: 0xb9b3a8, roughness: 0.9 });
    const disc = new THREE.Mesh(geo, mat);
    disc.position.set(0, 0.17, CONFIG.world.podiumZ - 0.2);
    disc.receiveShadow = true;
    disc.castShadow = true;
    this.scene.add(disc);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.09, 12, 60),
      new THREE.MeshStandardMaterial({
        color: PAL.gold,
        emissive: 0x5a3b00,
        roughness: 0.4,
        metalness: 0.7,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.36, CONFIG.world.podiumZ - 0.2);
    this.scene.add(ring);
  }

  _arch() {
    const g = new THREE.Group();
    const z = CONFIG.world.spawnZ + 2.5;
    const navy = new THREE.MeshStandardMaterial({
      color: PAL.navy,
      roughness: 0.55,
      metalness: 0.25,
    });

    const legGeo = new THREE.BoxGeometry(1.1, 7.5, 1.1);
    [-6.4, 6.4].forEach((x) => {
      const leg = new THREE.Mesh(legGeo, navy);
      leg.position.set(x, 3.75, z);
      leg.castShadow = true;
      g.add(leg);
    });

    // Wider beam so GLOBAL ENTRY sign never clips
    const beam = new THREE.Mesh(new THREE.BoxGeometry(15.2, 1.9, 1.7), navy);
    beam.position.set(0, 7.65, z);
    beam.castShadow = true;
    g.add(beam);

    const signMat = new THREE.MeshStandardMaterial({
      map: signTexture('GLOBAL ENTRY', '#0a1a3f', '#ffffff', '#37b6ff'),
      emissive: 0x0a1a3f,
      emissiveIntensity: 0.35,
      roughness: 0.45,
    });
    // Sign sits clearly in front of the beam; sized to show full text
    const sign = new THREE.Mesh(new THREE.BoxGeometry(13.2, 1.7, 0.28), signMat);
    sign.position.set(0, 7.65, z + 1.05);
    g.add(sign);
    this.archSign = sign;

    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(13.5, 0.18, 0.18),
      new THREE.MeshBasicMaterial({ color: PAL.electric })
    );
    glow.position.set(0, 6.55, z + 0.85);
    g.add(glow);
    this.archLights.push(glow);

    this.scene.add(g);
    this.arch = g;
  }

  _buildings() {
    const rows = 5;
    const startZ = CONFIG.world.spawnZ + 4;
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < rows; i++) {
        const h = rand(7, 13);
        const w = rand(3.5, 5);
        const tex = buildingTexture(
          pick(['#2c4a72', '#274166', '#33507a', '#22344f']),
          pick(['#8fd0ff', '#ffe08a', '#bfe6ff'])
        );
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat);
        const z = startZ + i * 5.2;
        b.position.set(side * rand(11, 13.5), h / 2, z);
        b.castShadow = true;
        b.receiveShadow = true;
        this.scene.add(b);

        if (i < 3) {
          const country = COUNTRIES[(i + (side > 0 ? 3 : 0)) % COUNTRIES.length];
          const signMat = new THREE.MeshBasicMaterial({
            map: signTexture(country, '#0a1a3f', '#ffffff', '#ffcf33'),
            transparent: true,
          });
          const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.0), signMat);
          sign.position.set(side * 9.2, h * 0.62, z);
          sign.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
          this.scene.add(sign);
          this.signs.push({ mesh: sign, mat: signMat });
        }
      }
    }
  }

  _palm(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.22, 2.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.9 })
    );
    trunk.position.y = 1.3;
    trunk.castShadow = true;
    g.add(trunk);
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x2ecc71,
      roughness: 0.8,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.9, 4), leafMat);
      const a = (i / 7) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 0.5, 2.6, Math.sin(a) * 0.5);
      leaf.rotation.z = Math.cos(a) * 0.9;
      leaf.rotation.x = Math.sin(a) * 0.9;
      leaf.castShadow = true;
      g.add(leaf);
    }
    g.position.set(x, 0, z);
    this.scene.add(g);
    this.palms.push(g);
  }

  _flag(x, z) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.055, 4.2, 10),
      new THREE.MeshStandardMaterial({ color: 0xd0d0d0, metalness: 0.7, roughness: 0.35 })
    );
    pole.position.y = 2.1;
    pole.castShadow = true;
    g.add(pole);

    // Ball finial
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 10, 8),
      new THREE.MeshStandardMaterial({ color: PAL.gold, metalness: 0.8, roughness: 0.3 })
    );
    ball.position.y = 4.25;
    g.add(ball);

    // Full Stars & Stripes texture on a waving plane — NO solid red / yellow emblem
    const flagMat = new THREE.MeshStandardMaterial({
      map: this._flagTex,
      side: THREE.DoubleSide,
      roughness: 0.65,
      metalness: 0.0,
    });
    this._flagMats.push(flagMat);

    // ALL flags hang to +X (viewer-right) with the same wind. Pole is the
    // attached edge (local x = −0.95); free edge billows toward +X.
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.0, 16, 8), flagMat);
    flag.position.set(0.95, 3.55, 0);
    flag.castShadow = true;
    g.add(flag);

    g.position.set(x, 0, z);
    this.scene.add(g);
    this.flags.push({ group: g, flag });
  }

  _decor() {
    this._palm(-7.5, -10);
    this._palm(7.5, -10);
    this._palm(-8.5, -3);
    this._palm(8.5, -3);
    this._palm(-6.5, -16);
    this._palm(6.5, -16);
    // Clear of arch pillars: forward (z↑) and outside the legs
    this._flag(-9.4, CONFIG.world.spawnZ + 12);
    this._flag(9.4, CONFIG.world.spawnZ + 12);
    this._flag(-5.5, 0);
    this._flag(5.5, 0);
  }

  update(dt) {
    this.t += dt;
    const pulse = 0.6 + 0.4 * Math.sin(this.t * 3);
    (this.archLights || []).forEach((m) => {
      if (m?.material?.color) {
        m.material.color.setRGB(0.2 * pulse, 0.6 * pulse + 0.2, pulse);
      }
    });
    // Shared +X wind: amplitude 0 at hoist (local x=-0.95), max at fly end (+0.95)
    (this.flags || []).forEach(({ flag }, i) => {
      const pos = flag?.geometry?.attributes?.position;
      if (!pos) return;
      for (let v = 0; v < pos.count; v++) {
        const x = pos.getX(v);
        const y = pos.getY(v);
        const along = (x + 0.95) / 1.9; // 0 at pole → 1 at free edge
        const wave =
          Math.sin(this.t * 5.5 + x * 2.8 + y * 1.2 + i * 0.7) * 0.14 * along +
          Math.sin(this.t * 3.1 + x * 1.4 + i) * 0.04 * along;
        pos.setZ(v, wave);
      }
      pos.needsUpdate = true;
      flag.geometry.computeVertexNormals();
    });
    (this.signs || []).forEach(({ mesh }, i) => {
      if (mesh) mesh.position.y += Math.sin(this.t * 1.5 + i) * 0.0006;
    });
  }
}
