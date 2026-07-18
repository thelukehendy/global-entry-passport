import * as THREE from 'three';
import { CONFIG, PAL } from './config.js';
import { rand, pick, chance } from './utils.js';
import {
  createFaceTexture,
  createSkinTexture,
  createSuitWoolTexture,
  createCottonShirtTexture,
  createSariShimmerTexture,
  createDenimTexture,
  createWheelchairMetalTexture,
  createTireTreadTexture,
  createWheelchairSeatTexture,
  SKIN_TONES,
} from './textures.js';

const VARIANTS = ['walk', 'walk', 'walk', 'wheelchair', 'crutches', 'amputee'];
const HAIR_COLORS = [0x1a1a1a, 0x3a2a1a, 0x5a3a22, 0x8a5a2a, 0x888888, 0x1c0a05, 0xc8a060];
const IRIS = ['#3a5f8a', '#5a7a4a', '#6a4a2a', '#2a3a4a', '#4a6a5a'];

function hexCss(n) {
  return '#' + n.toString(16).padStart(6, '0');
}

/**
 * Diverse approaching guest with detailed faces, fabric textures, hair volume,
 * jewelry, and a real wheelchair (frame, spokes, casters, seat, footrests).
 */
export class Person {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.state = 'idle';
    this.catchable = true;
    this.speed = 1;
    this.variant = 'walk';
    this.t = Math.random() * 10;
    this.seatTarget = null;
    this.threat = false;
    this.golden = false;
    this.vip = false;
    this.dead = false;
    this.countedAsDelivered = false;
    this._built = false;
    this.catchPulse = 0;
    this.passportSnap = null;
  }

  spawn({ x, z, speed, vip = false }) {
    this.reset();
    this.vip = vip;
    this.variant = vip ? 'vip' : pick(VARIANTS);
    this.speed = speed * (vip ? 0.6 : rand(0.9, 1.1));
    this._build();
    this.group.position.set(x, 0, z);
    this.group.rotation.y = 0;
    this.state = 'approach';
    this.catchable = true;
    this.dead = false;
    this.countedAsDelivered = false;
    this.scene.add(this.group);
  }

  reset() {
    while (this.group.children.length) {
      const c = this.group.children.pop();
      try {
        c.traverse?.((o) => {
          if (o.geometry) {
            try {
              o.geometry.dispose?.();
            } catch {
              /* ignore */
            }
          }
        });
      } catch {
        /* ignore */
      }
    }
    this.threat = false;
    this.seatTarget = null;
    this.golden = false;
    this.catchPulse = 0;
    this.passportSnap = null;
    this.pushArms = null;
    this.arms = [];
    this.legs = [];
    this.wheels = [];
    this.marker = null;
    this.face = null;
    this.body = null;
    this.catchRing = null;
    this.wheelchair = null;
    this.t = Math.random() * 10;
  }

  _pickClothes(clothHex) {
    const css = hexCss(clothHex);
    const roll = Math.random();
    if (this.vip) {
      return new THREE.MeshStandardMaterial({
        map: createSuitWoolTexture('#c9971a', 256),
        roughness: 0.45,
        metalness: 0.35,
      });
    }
    if (roll < 0.28) {
      return new THREE.MeshStandardMaterial({
        map: createDenimTexture(css, 256),
        roughness: 0.8,
      });
    }
    if (roll < 0.48) {
      return new THREE.MeshStandardMaterial({
        map: createSariShimmerTexture(css, '#f0c14a', 256),
        roughness: 0.4,
        metalness: 0.15,
      });
    }
    if (roll < 0.7) {
      return new THREE.MeshStandardMaterial({
        map: createCottonShirtTexture(css, 256),
        roughness: 0.7,
      });
    }
    return new THREE.MeshStandardMaterial({
      map: createSuitWoolTexture(css, 256),
      roughness: 0.75,
    });
  }

  _build() {
    const presetKeys = Object.keys(SKIN_TONES);
    const preset = pick(presetKeys);
    const tone = SKIN_TONES[preset];
    const skinHex = pick(PAL.skinTones);
    const skinCss = tone.base;
    const clothHex = this.vip ? PAL.gold : pick(PAL.clothes);
    const gender = chance(0.55) ? 'female' : 'male';
    const seed = Math.floor(Math.random() * 9999);

    const clothMat = this._pickClothes(clothHex);
    const skinTex = createSkinTexture({
      preset,
      size: 256,
      seed,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      map: skinTex,
      roughness: 0.65,
    });
    const pantMat = new THREE.MeshStandardMaterial({
      map: createDenimTexture(
        hexCss(pick([0x2a2a3a, 0x2f4f7a, 0x3a2a1a, 0x1a1a22])),
        256
      ),
      roughness: 0.82,
    });

    this.neutralTex = createFaceTexture({
      skin: skinCss,
      gender,
      smile: false,
      iris: pick(IRIS),
      size: 384,
      seed,
      highContrast: true,
    });
    this.happyTex = createFaceTexture({
      skin: skinCss,
      gender,
      smile: true,
      iris: pick(IRIS),
      size: 384,
      seed: seed + 1,
      highContrast: true,
    });

    const body = new THREE.Group();

    // Torso with slight bulk variation
    const torsoW = 0.5 + rand(0, 0.12);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(torsoW, 0.72, 0.36), clothMat);
    torso.position.y = 1.18;
    torso.castShadow = true;
    body.add(torso);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.18, 10), skinMat);
    neck.position.y = 1.52;
    body.add(neck);

    // Larger rounded head (readable at arcade camera distance)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 22, 18), skinMat);
    head.position.y = 1.82;
    head.scale.set(0.98, 1.06, 0.96);
    head.castShadow = true;
    body.add(head);

    // Curved face shell hugging the head front
    const faceGeo = new THREE.PlaneGeometry(0.5, 0.52, 8, 8);
    {
      const p = faceGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i) / 0.25;
        const y = p.getY(i) / 0.26;
        p.setZ(i, -(x * x + y * y) * 0.07);
      }
      faceGeo.computeVertexNormals();
    }
    const face = new THREE.Mesh(
      faceGeo,
      new THREE.MeshStandardMaterial({
        map: this.neutralTex,
        roughness: 0.48,
        emissive: 0x221108,
        emissiveIntensity: 0.08,
      })
    );
    face.position.set(0, 1.82, 0.22);
    body.add(face);
    this.face = face;

    // Small nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), skinMat);
    nose.position.set(0, 1.8, 0.28);
    nose.scale.set(0.9, 1.2, 1.1);
    body.add(nose);

    // Ears
    [-0.27, 0.27].forEach((x) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), skinMat);
      ear.position.set(x, 1.81, 0);
      ear.scale.set(0.6, 1.1, 0.9);
      body.add(ear);
    });

    // Hair volume / styles
    this._addHair(body, gender);

    // Arms — standing/walking variants only. Wheelchair builds dedicated
    // shoulder-pivoted push-arms so both hands can propel the wheels.
    this.arms = [];
    this.pushArms = null;
    if (this.variant !== 'wheelchair') {
      [-0.38, 0.38].forEach((x, i) => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.16), clothMat);
        arm.position.set(x, 1.15, 0);
        arm.castShadow = true;
        body.add(arm);
        this.arms.push(arm);
        const hand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), skinMat);
        hand.position.set(x, 0.78, 0);
        body.add(hand);
      });
    }

    // Jewelry / accessories
    if (chance(0.45)) this._addJewelry(body, gender);

    // Variant lower body
    this.legs = [];
    this.wheels = [];
    if (this.variant === 'wheelchair') {
      this._buildWheelchair(body, clothMat, skinMat, pantMat);
    } else if (this.variant === 'amputee') {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.9, 0.2), pantMat);
      leg.position.set(-0.14, 0.45, 0);
      leg.castShadow = true;
      body.add(leg);
      this.legs.push({ mesh: leg, x: -0.14 });
      const pros = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.075, 0.92, 10),
        new THREE.MeshStandardMaterial({
          map: createWheelchairMetalTexture(128),
          metalness: 0.75,
          roughness: 0.3,
        })
      );
      pros.position.set(0.14, 0.45, 0);
      pros.castShadow = true;
      body.add(pros);
      this.legs.push({ mesh: pros, x: 0.14 });
      // Shoe on remaining foot
      const shoe = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.1, 0.28),
        new THREE.MeshStandardMaterial({ color: 0x222018, roughness: 0.6 })
      );
      shoe.position.set(-0.14, 0.05, 0.04);
      body.add(shoe);
    } else if (this.variant === 'crutches') {
      [-0.16, 0.16].forEach((x) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.9, 0.2), pantMat);
        leg.position.set(x, 0.45, 0);
        leg.castShadow = true;
        body.add(leg);
        this.legs.push({ mesh: leg, x });
      });
      this._buildCrutches(body);
    } else {
      [-0.16, 0.16].forEach((x) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.9, 0.22), pantMat);
        leg.position.set(x, 0.45, 0);
        leg.castShadow = true;
        body.add(leg);
        this.legs.push({ mesh: leg, x });
        const shoe = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.1, 0.3),
          new THREE.MeshStandardMaterial({ color: pick([0x222018, 0x8a4a28, 0x111111]), roughness: 0.55 })
        );
        shoe.position.set(x, 0.05, 0.04);
        body.add(shoe);
      });
    }

    if (this.vip) {
      const shades = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.1, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.6, roughness: 0.2 })
      );
      shades.position.set(0, 1.84, 0.26);
      body.add(shades);
      const aura = new THREE.Mesh(
        new THREE.SphereGeometry(0.95, 12, 12),
        new THREE.MeshBasicMaterial({ color: PAL.gold, transparent: true, opacity: 0.14 })
      );
      aura.position.y = 1.2;
      body.add(aura);
    }

    // Threat marker
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.4, 20),
      new THREE.MeshBasicMaterial({
        color: PAL.red,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.y = 2.35;
    body.add(marker);
    this.marker = marker;

    // Catch feedback ring (hidden until catch)
    const catchRing = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.7, 32),
      new THREE.MeshBasicMaterial({
        color: PAL.green,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    catchRing.rotation.x = -Math.PI / 2;
    catchRing.position.y = 1.3;
    body.add(catchRing);
    this.catchRing = catchRing;

    this.body = body;
    this.group.add(body);
    this._built = true;
  }

  _addHair(body, gender) {
    const hairColor = pick(HAIR_COLORS);
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.7 });
    const style = Math.floor(Math.random() * 4);
    const hy = 2.08; // sits on larger head

    if (style === 0 || gender === 'male') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), hairMat);
      cap.position.y = hy;
      cap.scale.set(1.0, 0.55, 1.0);
      body.add(cap);
      for (let i = 0; i < 3; i++) {
        const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.08), hairMat);
        fringe.position.set(-0.14 + i * 0.14, hy - 0.06, 0.2);
        body.add(fringe);
      }
    } else if (style === 1) {
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), hairMat);
      top.position.y = hy + 0.02;
      top.scale.set(1.05, 0.7, 1.0);
      body.add(top);
      [-0.28, 0.28].forEach((x) => {
        const side = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.36), hairMat);
        side.position.set(x, 1.88, 0);
        body.add(side);
      });
    } else if (style === 2) {
      const base = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), hairMat);
      base.position.y = hy;
      base.scale.set(1.0, 0.5, 1.0);
      body.add(base);
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), hairMat);
      bun.position.set(0, hy + 0.18, -0.1);
      body.add(bun);
    } else {
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), hairMat);
      top.position.y = hy;
      top.scale.set(1.0, 0.55, 1.0);
      body.add(top);
      for (let i = 0; i < 4; i++) {
        const strand = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.55 + rand(0, 0.2), 0.08),
          hairMat
        );
        strand.position.set(-0.18 + i * 0.12, 1.68, -0.12);
        body.add(strand);
      }
    }
  }

  _addJewelry(body, gender) {
    const gold = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.25,
    });
    if (chance(0.6)) {
      // Necklace
      const neck = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.015, 6, 16), gold);
      neck.position.set(0, 1.52, 0.12);
      neck.rotation.x = Math.PI / 2.4;
      body.add(neck);
    }
    if (gender === 'female' || chance(0.4)) {
      [-0.22, 0.22].forEach((x) => {
        const earring = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), gold);
        earring.position.set(x, 1.68, 0.05);
        body.add(earring);
      });
    }
    if (chance(0.35)) {
      // Watch / bracelet on wrist
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.07, 0.012, 6, 12),
        gold
      );
      band.position.set(0.38, 0.85, 0);
      band.rotation.z = Math.PI / 2;
      body.add(band);
    }
  }

  /**
   * Real hospital/manual wheelchair: chrome tubular frame, thick rear tires with
   * spokes + bright handrims, front casters, canvas seat/back, footrests, brakes.
   * Person seated correctly with BOTH arms as shoulder-pivoted push-arms whose
   * hands grip the handrims and propel in sync with wheel rotation.
   */
  _buildWheelchair(body, clothMat, skinMat, pantMat) {
    const metalTex = createWheelchairMetalTexture(256);
    const tireTex = createTireTreadTexture(512, 128);
    const seatTex = createWheelchairSeatTexture('#2a2a32', 256);

    const metal = new THREE.MeshStandardMaterial({
      map: metalTex,
      metalness: 0.88,
      roughness: 0.25,
      color: 0xd8e0ea,
    });
    const chromeBright = new THREE.MeshStandardMaterial({
      color: 0xf2f8ff,
      metalness: 0.98,
      roughness: 0.12,
      emissive: 0x5a7ba8,
      emissiveIntensity: 0.4,
    });
    const tire = new THREE.MeshStandardMaterial({
      map: tireTex,
      roughness: 0.9,
      metalness: 0.06,
      color: 0x2a2a2e,
    });
    const seatMat = new THREE.MeshStandardMaterial({
      map: seatTex,
      roughness: 0.75,
    });

    const chair = new THREE.Group();

    // Seat + backrest
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.08, 0.52), seatMat);
    seat.position.set(0, 0.62, 0);
    seat.castShadow = true;
    chair.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.52, 0.06), seatMat);
    back.position.set(0, 0.92, -0.24);
    back.castShadow = true;
    chair.add(back);

    // Tubular side frames
    [-0.3, 0.3].forEach((x) => {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.55, 10), metal);
      rail.position.set(x, 0.72, 0);
      rail.rotation.x = Math.PI / 2;
      chair.add(rail);
      const upright = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.72, 10), metal);
      upright.position.set(x, 0.86, -0.22);
      chair.add(upright);
      // Armrest pad
      const armrest = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.045, 0.42), metal);
      armrest.position.set(x, 1.0, 0.02);
      chair.add(armrest);
      // Brake lever
      const brake = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.14), chromeBright);
      brake.position.set(x * 1.05, 0.78, 0.18);
      brake.rotation.x = -0.4;
      chair.add(brake);
    });

    // Cross-brace under seat (X-frame suggestion)
    const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.58, 8), metal);
    brace.position.set(0, 0.48, 0);
    brace.rotation.z = Math.PI / 2;
    chair.add(brace);
    const brace2 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 6), metal);
    brace2.position.set(0, 0.42, 0.05);
    brace2.rotation.set(0.2, 0, Math.PI / 2.4);
    chair.add(brace2);

    // Large rear wheels — thicker tires, spokes, bright handrims
    this.wheelGroups = [];
    [-0.38, 0.38].forEach((x) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(x, 0.42, -0.05);

      // Thick tire (torus tube radius reads clearly at arcade distance)
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.13, 14, 36), tire);
      rim.rotation.y = Math.PI / 2;
      rim.castShadow = true;
      wheelGroup.add(rim);

      // Chrome inner rim band inside the tire so the wheel reads as a real wheel.
      const rimBand = new THREE.Mesh(
        new THREE.TorusGeometry(0.33, 0.028, 10, 32),
        chromeBright
      );
      rimBand.rotation.y = Math.PI / 2;
      wheelGroup.add(rimBand);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.09, 16), chromeBright);
      hub.rotation.z = Math.PI / 2;
      wheelGroup.add(hub);

      // Thicker, brighter spokes that catch light.
      for (let i = 0; i < 12; i++) {
        const spoke = new THREE.Mesh(
          new THREE.CylinderGeometry(0.013, 0.013, 0.66, 6),
          chromeBright
        );
        spoke.rotation.z = (i / 12) * Math.PI * 2;
        wheelGroup.add(spoke);
      }

      // Bright chrome handrim — larger tube, stands off the tire, very visible.
      const handrim = new THREE.Mesh(
        new THREE.TorusGeometry(0.37, 0.03, 10, 32),
        chromeBright
      );
      handrim.rotation.y = Math.PI / 2;
      handrim.position.x = x > 0 ? 0.09 : -0.09;
      wheelGroup.add(handrim);

      chair.add(wheelGroup);
      this.wheels.push(wheelGroup);
      this.wheelGroups.push(wheelGroup);
      this.legs.push({ mesh: wheelGroup, roll: true, x });
    });

    // Front casters (swivel forks + small wheels)
    [-0.22, 0.22].forEach((x) => {
      const fork = new THREE.Group();
      fork.position.set(x, 0.22, 0.3);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 8), metal);
      stem.position.y = 0.08;
      fork.add(stem);
      const forkArm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.05), metal);
      forkArm.position.y = -0.04;
      fork.add(forkArm);
      const caster = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.04, 8, 16), tire);
      caster.position.y = -0.1;
      caster.rotation.y = Math.PI / 2;
      caster.castShadow = true;
      fork.add(caster);
      chair.add(fork);
      this.wheels.push(caster);
    });

    // Footrests
    [-0.14, 0.14].forEach((x) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 6), metal);
      post.position.set(x, 0.35, 0.38);
      post.rotation.x = 0.4;
      chair.add(post);
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.14), metal);
      plate.position.set(x, 0.18, 0.5);
      chair.add(plate);
    });

    // Seated person: hips in seat, thighs forward, shins down onto footrests
    body.position.y = -0.08;
    [-0.14, 0.14].forEach((x) => {
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.42), pantMat);
      thigh.position.set(x, 0.72, 0.12);
      body.add(thigh);
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.35, 0.14), pantMat);
      shin.position.set(x, 0.44, 0.4);
      body.add(shin);
      const shoe = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.08, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x222018, roughness: 0.55 })
      );
      shoe.position.set(x, 0.22, 0.52);
      body.add(shoe);
    });

    this.group.add(chair);
    this.wheelchair = chair;

    // BOTH arms as shoulder-pivoted push-arms gripping the handrims
    this._buildPushArms(body, clothMat, skinMat);
  }

  /**
   * Shoulder → elbow → hand chain in GROUP space (shares the chair's frame).
   * A 2-bone analytic IK solve keeps both hands physically ON the handrims
   * throughout the push cycle (no T-pose / floating residual). Segment
   * lengths are clean (L1 shoulder→elbow, L2 elbow→hand) and every joint
   * rotates purely about X so the whole arm stays in the wheel's Y-Z plane.
   */
  _buildPushArms(body, clothMat, skinMat) {
    this.pushArms = [];
    const handMat = skinMat.clone();
    handMat.emissive = new THREE.Color(0x4a2010);
    handMat.emissiveIntensity = 0.25;

    // Arm segment lengths (must match the geometry offsets below).
    this._armL1 = 0.4; // shoulder → elbow
    this._armL2 = 0.38; // elbow → hand
    // Shoulder pivot in group space (Y-Z used by the IK solver).
    this._shoulderY = 1.36;
    this._shoulderZ = 0.06;
    // Rear-wheel handrim geometry (group space) the hand must grip.
    this._rimCenterY = 0.42;
    this._rimCenterZ = -0.05;
    this._rimGripR = 0.36; // hand centre wraps onto the bright handrim (r≈0.37)

    [-1, 1].forEach((side) => {
      const shoulder = new THREE.Group();
      // Nearly over the handrim plane so the arm stays planar (x ≈ handrim x).
      shoulder.position.set(side * 0.44, this._shoulderY, this._shoulderZ);

      // Deltoid cap bridges the gap from torso side to the offset shoulder.
      const deltoid = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), clothMat);
      deltoid.scale.set(1, 0.85, 1);
      deltoid.castShadow = true;
      shoulder.add(deltoid);

      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.16), clothMat);
      upper.position.y = -0.2;
      upper.castShadow = true;
      shoulder.add(upper);

      const elbow = new THREE.Group();
      elbow.position.y = -this._armL1;
      const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, 0.14), clothMat);
      forearm.position.y = -0.18;
      forearm.castShadow = true;
      elbow.add(forearm);

      // Wrist cuff (shirt) so the skin hand reads as a gripping fist.
      const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.075, 0.06, 10), handMat);
      wrist.position.y = -0.34;
      elbow.add(wrist);

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), handMat);
      // Clean on-axis hand so L2 is exact for the IK solve.
      hand.position.set(0, -this._armL2, 0);
      hand.scale.set(1, 0.85, 1.15); // slightly flattened curled fist
      hand.castShadow = true;
      elbow.add(hand);

      shoulder.add(elbow);
      this.group.add(shoulder);

      this.pushArms.push({ shoulder, elbow, hand, side });
    });

    // Seat the hands on the rim immediately so the very first frame isn't a T-pose.
    this._posePushArms(0);
  }

  /**
   * Analytic 2-bone IK (planar, rotating about X) that lands the hand exactly
   * on a target point (ty, tz) in group space. Returns {a, e} joint angles.
   */
  _solveArmIK(ty, tz) {
    const L1 = this._armL1;
    const L2 = this._armL2;
    const dz = tz - this._shoulderZ;
    const dy = ty - this._shoulderY;
    // Planar coords aligned with the chain's "down = -Y" rest direction.
    const Z = -dz;
    const Y = -dy;
    let d2 = Z * Z + Y * Y;
    const dMax = (L1 + L2) * 0.999;
    const dMin = Math.abs(L1 - L2) + 0.001;
    let d = Math.sqrt(d2);
    d = Math.min(dMax, Math.max(dMin, d));
    d2 = d * d;
    let cosE = (d2 - L1 * L1 - L2 * L2) / (2 * L1 * L2);
    cosE = Math.min(1, Math.max(-1, cosE));
    const e = Math.acos(cosE); // elbow flex (positive → elbow leads forward)
    const a = Math.atan2(Z, Y) - Math.atan2(L2 * Math.sin(e), L1 + L2 * Math.cos(e));
    return { a, e };
  }

  /**
   * Drive the push cycle: the grip contact walks along the top arc of the
   * handrim (front reach → drive back), IK keeping hands welded to the rim.
   */
  _posePushArms(phase) {
    if (!this.pushArms?.length) return;
    if (
      this._armL1 == null ||
      this._rimCenterY == null ||
      this._rimGripR == null
    ) {
      return;
    }
    // β: contact angle off rim top. Front reach (+) → push to the back (−).
    const beta = 0.12 - 0.62 * Math.sin(phase);
    const ty = this._rimCenterY + this._rimGripR * Math.cos(beta);
    const tz = this._rimCenterZ + this._rimGripR * Math.sin(beta);
    const { a, e } = this._solveArmIK(ty, tz);
    this.pushArms.forEach((pa) => {
      if (!pa?.shoulder || !pa?.elbow) return;
      pa.shoulder.rotation.set(a, 0, 0);
      pa.elbow.rotation.set(e, 0, 0);
    });
  }

  _buildCrutches(body) {
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.7 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    const pad = new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.8 });

    [-0.45, 0.45].forEach((x) => {
      const g = new THREE.Group();
      // Main shaft
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 1.35, 8), wood);
      shaft.position.y = 0.7;
      g.add(shaft);
      // Underarm pad
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.22), pad);
      top.position.y = 1.4;
      g.add(top);
      // Hand grip
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8), rubber);
      grip.rotation.z = Math.PI / 2;
      grip.position.set(0, 0.95, 0);
      g.add(grip);
      // Tip
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.08, 8), rubber);
      tip.position.y = 0.04;
      g.add(tip);

      g.position.set(x, 0, 0.12);
      g.rotation.z = x > 0 ? -0.1 : 0.1;
      body.add(g);
    });

    // Optional cane for variety
    if (chance(0.3)) {
      const cane = new THREE.Group();
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.022, 1.1, 8),
        wood
      );
      shaft.position.y = 0.55;
      cane.add(shaft);
      const handle = new THREE.Mesh(
        new THREE.TorusGeometry(0.06, 0.018, 6, 12, Math.PI),
        wood
      );
      handle.position.set(0.05, 1.12, 0);
      handle.rotation.z = Math.PI / 2;
      cane.add(handle);
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.06, 8), rubber);
      tip.position.y = 0.03;
      cane.add(tip);
      cane.position.set(0.5, 0, 0.05);
      body.add(cane);
    }
  }

  setCaught(golden) {
    if (this.state !== 'approach') return;
    this.state = 'toSeat';
    this.catchable = false;
    this.golden = golden;
    this.threat = false;
    if (this.marker?.material) this.marker.material.opacity = 0;
    if (this.face?.material && this.happyTex) {
      this.face.material.map = this.happyTex;
      this.face.material.needsUpdate = true;
    }
    this.joyT = 0;
    this.catchPulse = 1;
    // Snap a passport visual onto the chest
    try {
      this._snapPassportToChest(golden);
    } catch (e) {
      console.warn('[GEP] snapPassport', e);
    }
  }

  _snapPassportToChest(golden) {
    if (!this.body) return;
    if (this.passportSnap) {
      try {
        this.body.remove(this.passportSnap);
      } catch {
        /* already removed */
      }
      this.passportSnap = null;
    }
    const mat = new THREE.MeshStandardMaterial({
      color: golden ? PAL.gold : PAL.passportBlue,
      emissive: golden ? 0x6a4d00 : 0x0a1f52,
      emissiveIntensity: 0.8,
      roughness: 0.4,
    });
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.38, 0.06), mat);
    book.position.set(0.12, 1.25, 0.22);
    book.rotation.z = -0.15;
    this.body.add(book);
    this.passportSnap = book;
  }

  assignSeat(v) {
    if (!v) return;
    this.seatTarget =
      v instanceof THREE.Vector3 ? v : new THREE.Vector3(v.x, v.y || 0, v.z);
    this.seatRotY = v.rotY || 0;
    if (this.state === 'approach') {
      this.catchable = false;
      this.threat = false;
      if (this.marker?.material) this.marker.material.opacity = 0;
      if (this.face?.material && this.happyTex) {
        this.face.material.map = this.happyTex;
        this.face.material.needsUpdate = true;
      }
      this.joyT = 0;
      this.catchPulse = 1;
      try {
        this._snapPassportToChest(this.golden);
      } catch (e) {
        console.warn('[GEP] snapPassport', e);
      }
    }
    this.state = 'toSeat';
    this.catchable = false;
  }

  update(dt, borderZ) {
    if (this.state === 'idle' || this.dead || !this.group) return null;
    this.t += dt;

    // Catch pulse: green ring + body scale pop
    if (this.catchPulse > 0) {
      this.catchPulse = Math.max(0, this.catchPulse - dt * 1.8);
      const p = this.catchPulse;
      if (this.catchRing?.material) {
        this.catchRing.material.opacity = Math.min(1, p * 1.4);
        const s = 1 + (1 - p) * 1.8;
        this.catchRing.scale.set(s, s, s);
      }
      if (this.body) {
        const pop = 1 + Math.sin((1 - p) * Math.PI) * 0.12;
        this.body.scale.setScalar(pop);
      }
      if (this.passportSnap) {
        const pop = 1 + Math.sin((1 - p) * Math.PI) * 0.4;
        this.passportSnap.scale.setScalar(pop);
      }
    } else if (this.catchRing?.material && this.catchRing.material.opacity > 0) {
      this.catchRing.material.opacity = 0;
      if (this.body) this.body.scale.setScalar(1);
    }

    if (this.state === 'approach') {
      this.group.position.z += this.speed * dt;
      this._walkAnim(dt);
      const dist = borderZ - this.group.position.z;
      const near = dist < 4 && dist > -0.2;
      this._setThreat(near);
      if (this.group.position.z >= borderZ) {
        this.state = 'breach';
        return 'breach';
      }
      return null;
    }

    if (this.state === 'toSeat') {
      this.joyT = (this.joyT || 0) + dt;
      const target = this.seatTarget || new THREE.Vector3(0, 0, CONFIG.world.seatZ);
      const dir = new THREE.Vector3().subVectors(target, this.group.position);
      dir.y = 0;
      const d = dir.length();
      if (d < 0.15) {
        this.state = 'seated';
        this.group.position.x = target.x;
        this.group.position.z = target.z;
        this.group.position.y = 0;
        this.group.rotation.y = this.seatRotY || (target.x < 0 ? 0.5 : -0.5);
        return 'seated';
      }
      dir.normalize();
      // Passport holders sprint to their seats (+50% vs prior 2.9× / 4.2 floor)
      const spd = Math.max(this.speed * 4.35, 6.3);
      this.group.position.addScaledVector(dir, spd * dt);
      this.group.rotation.y = Math.atan2(dir.x, dir.z);
      this._walkAnim(dt, 2.4);
      this.group.position.y = Math.abs(Math.sin(this.joyT * 10)) * 0.12;
      return null;
    }

    if (this.state === 'seated') {
      this.group.position.y = Math.abs(Math.sin(this.t * 3)) * 0.06;
      if (this.body) this.body.rotation.z = Math.sin(this.t * 2) * 0.05;
      return null;
    }

    return null;
  }

  _walkAnim(dt, mult = 1) {
    // Wheelchair: IK keeps both hands gripping the handrims while they cycle
    // in sync with the rolling wheels.
    if (this.pushArms && this.pushArms.length) {
      try {
        const cycle = this.t * 5.2 * mult;
        this._posePushArms(cycle);
        (this.legs || []).forEach((l) => {
          if (l?.roll && l.mesh) l.mesh.rotation.x += this.speed * dt * 5.2 * mult;
        });
      } catch (e) {
        console.warn('[GEP] wheelchair anim', e);
      }
      return;
    }

    const swing = Math.sin(this.t * 8 * mult) * 0.5;
    (this.legs || []).forEach((l, i) => {
      if (!l?.mesh) return;
      if (l.roll) {
        l.mesh.rotation.x += this.speed * dt * 4;
      } else {
        l.mesh.rotation.x = swing * (i % 2 === 0 ? 1 : -1);
      }
    });
    if (this.arms) {
      this.arms.forEach((a, i) => {
        if (a) a.rotation.x = swing * (i % 2 === 0 ? -0.6 : 0.6);
      });
    }
  }

  _setThreat(on) {
    if (this.threat === on) return;
    this.threat = on;
    if (this.marker?.material) this.marker.material.opacity = on ? 0.9 : 0;
  }

  hide() {
    try {
      this.scene.remove(this.group);
    } catch {
      /* already removed */
    }
    this.state = 'idle';
    this.dead = true;
    this.catchable = false;
  }
}
